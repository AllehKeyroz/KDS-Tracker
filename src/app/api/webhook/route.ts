
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    console.log('Webhook payload received:', payload);

    // Store the payload in Firestore
    await addDoc(collection(db, 'webhooks'), {
      payload: payload,
      receivedAt: serverTimestamp(),
    });

    return NextResponse.json({
      message: 'Webhook received and stored successfully',
      payload: payload,
    }, { status: 200 });
  } catch (error) {
    console.error('Error processing webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    // Also store errors if needed (optional)
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
