
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Interface para definir a estrutura do Lead processado
interface Lead {
  receivedAt: any; // Usará serverTimestamp
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
  rawPayload: any; // Para depuração, guardamos o payload original
}

// Função para extrair dados aninhados de forma segura
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

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    console.log('Webhook payload received:', payload);

    // Mapeia o payload cru para a estrutura de Lead
    const leadData: Omit<Lead, 'receivedAt'> = {
      dateCreated: get(payload, 'date_created', new Date().toISOString()),
      leadName: get(payload, 'full_name', 'Nome não disponível'),
      leadPhone: get(payload, 'phone', 'Telefone não disponível'),
      origin: get(payload, 'contact.lastAttributionSource.sessionSource', 'Não disponível'),
      medium: get(payload, 'contact.lastAttributionSource.medium', 'Não disponível'),
      source: 'Instagram/Facebook', // Inferido
      campaign: get(payload, 'contact.lastAttributionSource.adName', 'Não disponível'),
      adId: get(payload, 'customData.Ad / Post Id', 'Não disponível'),
      mediaType: get(payload, 'customData.Medya Type Of Ad / Post', 'Não disponível'),
      adLink: get(payload, 'customData.Ad / Post URL', '#'),
      adThumbnail: get(payload, 'customData.Thumbnail Url Of Ad / Post', ''),
      adVideo: get(payload, 'customData.Video Url Of Ad / Post', ''),
      adTitle: get(payload, 'customData.Head Line Of Ad / Post', 'Não disponível'),
      adDescription: get(payload, 'customData.Body Of Ad / Post', 'Não disponível'),
      ctwaClickId: get(payload, 'customData.Click-To-Whatsapp Click ID', 'Não disponível'),
      workflow: `${get(payload, 'workflow.name', 'N/A')} (${get(payload, 'workflow.id', 'N/A')})`,
      rawPayload: payload,
    };

    // Adiciona o lead processado ao Firestore na coleção 'leads'
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
    
    // Log de erros
    try {
      await addDoc(collection(db, 'webhook_errors'), {
        error: errorMessage,
        receivedAt: serverTimestamp(),
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

export async function GET() {
  return NextResponse.json({ message: 'Webhook endpoint is active. Use POST to send data.' }, { status: 200 });
}
