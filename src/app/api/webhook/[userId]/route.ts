

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, query, where, getDocs, writeBatch } from 'firebase/firestore';

interface Lead {
  receivedAt: any; 
  dateCreated: string;
  leadName: string;
  leadPhone: string;
  origin: string;
  medium: string;
  source: string;
  campaign: string;
  adId: string;
  mediaType: string;
  adLink: string;
  adThumbnail: string;
  adVideo: string;
  adTitle: string;
  adDescription: string;
  ctwaClickId: string;
  workflow: string;
  rawPayload: any;
  metaApiResponse: any;
  metaApiRequestUrl: string;
  userId: string; 
  contactId: string;
  status: 'Aberto' | 'Ganho' | 'Perdido' | 'Abandonado';
}

const get = (obj: any, path: string, defaultValue: any = '') => {
  const keys = path.split('.');
  let result = obj;
  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = result[key];
    } else {
      return defaultValue;
    }
  }
  return result ?? defaultValue;
};

interface CampaignInfo {
    name: string;
    apiResponses: any[];
    requestUrls: string[];
}

async function getCampaignName(adId: string, accessToken: string): Promise<CampaignInfo> {
  const apiVersion = 'v20.0';
  const apiResponses: any[] = [];
  const requestUrls: string[] = [];

  const createErrorResponse = (name: string, error: any) => ({
    name,
    apiResponses: [...apiResponses, error],
    requestUrls,
  });
  
  const defaultCampaignName = "Não disponível (falha na API)";

  if (!adId) {
    return createErrorResponse('Não disponível (sem Ad ID)', { error: 'Ad ID não fornecido.' });
  }
  if (!accessToken) {
    console.error('META_ACCESS_TOKEN não está configurado para este usuário.');
    return createErrorResponse('Erro de configuração do servidor', { error: 'META_ACCESS_TOKEN não está configurado para este usuário.' });
  }

  try {
    const adSetUrl = `https://graph.facebook.com/${apiVersion}/${adId}?fields=adset_id&access_token=${accessToken}`;
    requestUrls.push(adSetUrl);
    console.log(`Buscando Ad Set para Ad ID: ${adId}`);
    const adSetResponse = await fetch(adSetUrl);
    const adSetData = await adSetResponse.json();
    apiResponses.push({ step: 1, url: adSetUrl, response: adSetData });
    if (!adSetResponse.ok || !adSetData.adset_id) {
      console.error('Erro ao buscar Ad Set:', adSetData);
      return createErrorResponse(defaultCampaignName, adSetData);
    }
    const adSetId = adSetData.adset_id;

    const campaignIdUrl = `https://graph.facebook.com/${apiVersion}/${adSetId}?fields=campaign_id&access_token=${accessToken}`;
    requestUrls.push(campaignIdUrl);
    console.log(`Buscando Campaign ID para Ad Set ID: ${adSetId}`);
    const campaignIdResponse = await fetch(campaignIdUrl);
    const campaignIdData = await campaignIdResponse.json();
    apiResponses.push({ step: 2, url: campaignIdUrl, response: campaignIdData });
    if (!campaignIdResponse.ok || !campaignIdData.campaign_id) {
      console.error('Erro ao buscar Campaign ID:', campaignIdData);
      return createErrorResponse(defaultCampaignName, campaignIdData);
    }
    const campaignId = campaignIdData.campaign_id;
    
    const campaignNameUrl = `https://graph.facebook.com/${apiVersion}/${campaignId}?fields=name&access_token=${accessToken}`;
    requestUrls.push(campaignNameUrl);
    console.log(`Buscando Campaign Name para Campaign ID: ${campaignId}`);
    const campaignNameResponse = await fetch(campaignNameUrl);
    const campaignNameData = await campaignNameResponse.json();
    apiResponses.push({ step: 3, url: campaignNameUrl, response: campaignNameData });
    if (!campaignNameResponse.ok || !campaignNameData.name) {
      console.error('Erro ao buscar Campaign Name:', campaignNameData);
      return createErrorResponse(defaultCampaignName, campaignNameData);
    }

    return {
        name: campaignNameData.name,
        apiResponses,
        requestUrls,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Falha na conexão com a API do Graph:', error);
    return createErrorResponse(defaultCampaignName, { error: 'Falha na requisição fetch.', details: errorMessage });
  }
}

async function getUserAccessToken(userId: string): Promise<string | null> {
    if (!userId) {
        return null;
    }
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
        const userData = userDoc.data();
        return userData.metaAccessToken || null;
    }
    return null;
}

const translateStatus = (status: string): Lead['status'] => {
    switch (status.toLowerCase()) {
        case 'won': return 'Ganho';
        case 'lost': return 'Perdido';
        case 'abandoned': return 'Abandonado';
        case 'open': return 'Aberto';
        default: return 'Aberto';
    }
};

export async function POST(req: NextRequest, { params }: { params: { userId: string } }) {
  const { userId } = params;
  if (!userId) {
    return NextResponse.json({ message: 'User ID is missing' }, { status: 400 });
  }

  try {
    const payload = await req.json();
    const leadNameForLog = get(payload, 'full_name', 'Nome não disponível');

    // Save log regardless of what happens next
    await addDoc(collection(db, 'webhook_logs'), {
      userId,
      leadName: leadNameForLog,
      payload: payload,
      receivedAt: serverTimestamp(),
    });

    const accessToken = await getUserAccessToken(userId);
    if (!accessToken) {
        return NextResponse.json({ message: 'User configuration not found or incomplete.' }, { status: 403 });
    }
    
    const contactId = get(payload, 'contact.id', get(payload, 'contact_id', ''));
    const status = get(payload, 'customData.Status', '');

    // Handle status update
    if (contactId && status) {
        const leadsRef = collection(db, "leads");
        const q = query(leadsRef, where("contactId", "==", contactId), where("userId", "==", userId));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const batch = writeBatch(db);
            querySnapshot.forEach(doc => {
                batch.update(doc.ref, { status: translateStatus(status) });
            });
            await batch.commit();
            return NextResponse.json({ message: `Status updated for contact ${contactId}` }, { status: 200 });
        } else {
             console.log(`Contact ID ${contactId} not found for status update. Treating as new lead.`);
        }
    }

    const payloadSource = get(payload, 'source', '');
    const contactSource = get(payload, 'contact_source', '');
    const mediumValue = get(payload, 'contact.lastAttributionSource.medium', get(payload, 'contact.attributionSource.medium', get(payload, 'attributionSource.medium', 'Não disponível')));
    const customContactSource = get(payload, 'customData.Contact Source', '');
    
    let originValue;
    if (customContactSource === 'Bio Insta') {
      originValue = 'Bio Insta';
    } else if (payloadSource.toLowerCase().includes('widget') || contactSource.toLowerCase().includes('widget') || mediumValue.toLowerCase().includes('widget')) {
      originValue = 'Site';
    } else {
      const sessionSource = get(payload, 'contact.lastAttributionSource.sessionSource', get(payload, 'contact.attributionSource.sessionSource', get(payload, 'attributionSource.sessionSource', 'Não disponível')));
      if (sessionSource.toLowerCase() === 'paid social') {
        originValue = 'Mídia Paga';
      } else {
        originValue = sessionSource;
      }
    }

    const isOrganic = originValue === 'Bio Insta' || originValue === 'Site';

    let adId = isOrganic ? '' : get(payload, 'contact.lastAttributionSource.adId', get(payload, 'customData.Ad / Post Id', ''));
    
    const campaignInfo = await getCampaignName(adId, accessToken);
    
    const leadData: Omit<Lead, 'receivedAt'> = {
      dateCreated: get(payload, 'date_created', new Date().toISOString()),
      leadName: get(payload, 'full_name', 'Nome não disponível'),
      leadPhone: get(payload, 'phone', 'Telefone não disponível'),
      origin: originValue,
      medium: mediumValue,
      source: 'Instagram/Facebook',
      campaign: isOrganic ? 'Orgânico' : campaignInfo.name,
      adId: adId,
      mediaType: isOrganic ? 'Não disponível' : get(payload, 'customData.Medya Type Of Ad / Post', 'Não disponível'),
      adLink: isOrganic ? '#' : get(payload, 'customData.Ad / Post URL', '#'),
      adThumbnail: isOrganic ? '' : get(payload, 'customData.Thumbnail Url Of Ad / Post', ''),
      adVideo: isOrganic ? '' : get(payload, 'customData.Video Url Of Ad / Post', ''),
      adTitle: isOrganic ? 'Não disponível' : get(payload, 'customData.Head Line Of Ad / Post', 'Não disponível'),
      adDescription: isOrganic ? 'Não disponível' : get(payload, 'customData.Body Of Ad / Post', 'Não disponível'),
      ctwaClickId: isOrganic ? 'Não disponível' : get(payload, 'contact.lastAttributionSource.ctwa_clid', get(payload, 'customData.Click-To-Whatsapp Click ID', 'Não disponível')),
      workflow: `${get(payload, 'workflow.name', 'N/A')} (${get(payload, 'workflow.id', 'N/A')})`,
      rawPayload: payload,
      metaApiResponse: campaignInfo.apiResponses,
      metaApiRequestUrl: JSON.stringify(campaignInfo.requestUrls, null, 2),
      userId: userId,
      contactId: contactId,
      status: status ? translateStatus(status) : 'Aberto',
    };

    await addDoc(collection(db, 'leads'), {
      ...leadData,
      receivedAt: serverTimestamp(),
    });

    return NextResponse.json({
      message: 'Lead received and stored successfully',
    }, { status: 200 });
  } catch (error) {
    console.error('Error processing webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    try {
      await addDoc(collection(db, 'webhook_errors'), {
        error: errorMessage,
        receivedAt: serverTimestamp(),
        payload: await req.text(),
        userId: userId,
      });
    } catch (dbError) {
      console.error('Failed to log webhook error to Firestore:', dbError);
    }
    
    return NextResponse.json({
      message: 'Error processing webhook',
      error: errorMessage,
    }, { status: 400 });
  }
}

export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
  const { userId } = params;
  if (!userId) {
    return NextResponse.json({ message: 'User ID is missing' }, { status: 400 });
  }
  
  const VERIFY_TOKEN = "um_token_secreto_para_verificacao";

  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log(`Webhook verification successful for user ${userId}!`);
    return new NextResponse(challenge, { status: 200 });
  } else {
    console.error(`Webhook verification failed for user ${userId}.`);
    return new NextResponse('Forbidden', { status: 403 });
  }
}
