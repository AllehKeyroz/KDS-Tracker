
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    console.log('Webhook payload received:', payload);

    return NextResponse.json({
      message: 'Webhook received successfully',
      payload: payload,
    }, { status: 200 });
  } catch (error) {
    console.error('Error parsing webhook payload:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({
      message: 'Error processing webhook',
      error: errorMessage,
    }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Webhook endpoint is active. Use POST to send data.' }, { status: 200 });
}
