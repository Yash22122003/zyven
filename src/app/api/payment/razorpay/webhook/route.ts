import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature, markOrderAsPaidAndCompleted } from '@/lib/razorpay';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature') || '';

    // Verify webhook signature (source of truth)
    const isValid = verifyWebhookSignature({ rawBody, signature });
    if (!isValid) {
      console.error('Invalid Razorpay webhook signature');
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event;

    // Handle payment.captured or order.paid
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = event.payload?.payment?.entity;
      const orderEntity = event.payload?.order?.entity;

      const paymentId = paymentEntity?.id;
      const rzpOrderId = paymentEntity?.order_id || orderEntity?.id;
      const orderNumber =
        paymentEntity?.notes?.orderNumber ||
        orderEntity?.notes?.orderNumber ||
        undefined;

      if (paymentId || rzpOrderId) {
        await markOrderAsPaidAndCompleted({
          orderNumber,
          razorpayOrderId: rzpOrderId,
          razorpayPaymentId: paymentId || `pay_verified_${Date.now()}`,
          source: 'WEBHOOK',
        });
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (err: unknown) {
    console.error('Razorpay webhook processing error:', err);
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 });
  }
}
