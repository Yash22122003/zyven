import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyWebhookSignature, markOrderAsPaidAndCompleted, activateMerchantSubscription } from '@/lib/razorpay';
import { MerchantStatus, SubscriptionPaymentStatus } from '@prisma/client';

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

    console.log('[Razorpay Backend] Webhook event received:', {
      event: eventType,
      eventId: event.id,
      containsSignature: Boolean(signature),
    });

    const paymentEntity = event.payload?.payment?.entity;
    const orderEntity = event.payload?.order?.entity;

    const paymentId = paymentEntity?.id;
    const rzpOrderId = paymentEntity?.order_id || orderEntity?.id;
    const orderType = paymentEntity?.notes?.type || orderEntity?.notes?.type;
    const businessId = paymentEntity?.notes?.businessId || orderEntity?.notes?.businessId;
    const orderNumber = paymentEntity?.notes?.orderNumber || orderEntity?.notes?.orderNumber;

    // Handle payment.captured or order.paid
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      console.log('[Razorpay Backend] Processing verified payment webhook event:', {
        eventType,
        orderType,
        orderNumber,
        rzpOrderId,
        paymentId,
      });

      // Check if this is a merchant subscription
      let isSubscription = orderType === 'MERCHANT_SUBSCRIPTION';
      if (!isSubscription && rzpOrderId) {
        const subPayment = await prisma.subscriptionPayment.findFirst({
          where: { razorpayOrderId: rzpOrderId },
        });
        if (subPayment) isSubscription = true;
      }

      if (isSubscription) {
        console.log('[Razorpay Backend] Activating merchant subscription via webhook:', {
          rzpOrderId,
          paymentId,
          businessId,
        });

        await activateMerchantSubscription({
          businessId,
          razorpayOrderId: rzpOrderId,
          razorpayPaymentId: paymentId || `pay_verified_${Date.now()}`,
          source: 'WEBHOOK',
        });
      } else if (paymentId || rzpOrderId) {
        // Customer pickup order
        await markOrderAsPaidAndCompleted({
          orderNumber,
          razorpayOrderId: rzpOrderId,
          razorpayPaymentId: paymentId || `pay_verified_${Date.now()}`,
          source: 'WEBHOOK',
        });
      }
    } else if (eventType === 'payment.failed') {
      console.log('[Razorpay Backend] Processing payment failure webhook:', {
        eventType,
        rzpOrderId,
        paymentId,
      });

      if (rzpOrderId) {
        // If it was a subscription payment, mark it as failed
        const subPayment = await prisma.subscriptionPayment.findFirst({
          where: { razorpayOrderId: rzpOrderId },
          include: { business: true },
        });

        if (subPayment) {
          await prisma.$transaction([
            prisma.subscriptionPayment.update({
              where: { id: subPayment.id },
              data: { status: SubscriptionPaymentStatus.FAILED },
            }),
            prisma.business.update({
              where: { id: subPayment.businessId },
              data: { status: MerchantStatus.PAYMENT_FAILED },
            }),
            prisma.auditLog.create({
              data: {
                businessId: subPayment.businessId,
                action: 'MERCHANT_SUBSCRIPTION_PAYMENT_FAILED',
                entityType: 'BUSINESS',
                entityId: subPayment.businessId,
                metadataJson: {
                  source: 'WEBHOOK',
                  razorpayOrderId: rzpOrderId,
                  paymentId,
                  reason: paymentEntity?.error_description || 'Payment failed',
                },
              },
            }),
          ]);
        }
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (err: unknown) {
    console.error('Razorpay webhook processing error:', err);
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 });
  }
}
