import Razorpay from 'razorpay';
import crypto from 'crypto';
import { prisma } from './db';
import { OrderStatus, PaymentStatus, NotificationType } from '@prisma/client';

export interface CreateOrderParams {
  amountInPaise: number;
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}

export function getRazorpayClient(): Razorpay {
  const key_id = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
  const key_secret = process.env.RAZORPAY_KEY_SECRET || '';

  if (!key_id || !key_secret) {
    console.error('[Razorpay Backend] Missing API credentials in environment variables');
    throw new Error('Razorpay API keys not configured. Please verify RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
  }

  console.log('[Razorpay Backend] Razorpay client initialized with Key ID:', `${key_id.slice(0, 8)}...`);

  return new Razorpay({
    key_id,
    key_secret,
  });
}

/**
 * Creates an authentic Razorpay Order via the official SDK
 * Strictly calls Razorpay API without any mock order ID fallbacks
 */
export async function createRazorpayOrder({
  amountInPaise,
  currency = 'INR',
  receipt,
  notes = {},
}: CreateOrderParams): Promise<{ id: string; amount: number; currency: string }> {
  console.log('[Razorpay Backend] Razorpay order creation started:', {
    receipt,
    amountInPaise,
    currency,
  });

  try {
    const rzp = getRazorpayClient();
    const order = await rzp.orders.create({
      amount: amountInPaise,
      currency,
      receipt,
      notes,
    });

    console.log('[Razorpay Backend] Razorpay order creation successful:', {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });

    return {
      id: order.id,
      amount: Number(order.amount),
      currency: order.currency,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown Razorpay error';
    console.error('[Razorpay Backend] Razorpay order creation failed:', errorMsg);
    throw err;
  }
}

/**
 * Validates Razorpay payment signature from client checkout callback
 * Rule: HMAC_SHA256(order_id + "|" + payment_id, secret) === signature
 */
export function verifyPaymentSignature({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET || '';

  if (!secret) {
    console.error('[Razorpay Backend] Cannot verify payment signature: RAZORPAY_KEY_SECRET is missing');
    return false;
  }

  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  const isValid = expectedSignature === razorpaySignature;
  console.log('[Razorpay Backend] Client signature verification result:', {
    razorpayOrderId,
    razorpayPaymentId,
    verified: isValid,
  });

  return isValid;
}

/**
 * Validates Razorpay Webhook signature (source of truth)
 * Header: X-Razorpay-Signature
 */
export function verifyWebhookSignature({
  rawBody,
  signature,
}: {
  rawBody: string;
  signature: string;
}): boolean {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || '';

  if (!webhookSecret || !signature) {
    console.error('[Razorpay Backend] Webhook signature verification failed: Missing secret or signature header');
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  try {
    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf8'),
      Buffer.from(signature, 'utf8')
    );

    console.log('[Razorpay Backend] Webhook signature verification result:', {
      verified: isValid,
    });

    return isValid;
  } catch {
    console.error('[Razorpay Backend] Webhook signature comparison error (timingSafeEqual failed)');
    return false;
  }
}

/**
 * Idempotent order payment completion helper
 * Ensures duplicate callbacks or webhooks do not duplicate status changes
 */
export async function markOrderAsPaidAndCompleted({
  orderNumber,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  source = 'CALLBACK',
}: {
  orderNumber?: string;
  razorpayOrderId?: string;
  razorpayPaymentId: string;
  razorpaySignature?: string;
  source?: 'WEBHOOK' | 'CALLBACK';
}) {
  const order = await prisma.order.findFirst({
    where: {
      OR: [
        ...(orderNumber ? [{ orderNumber }] : []),
        ...(razorpayOrderId ? [{ razorpayOrderId }] : []),
      ],
    },
    include: {
      business: true,
    },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  // Idempotency: If already paid, return early without double updating
  if (order.paymentStatus === PaymentStatus.PAID) {
    console.log('[Razorpay Backend] Idempotency check: Order already marked as PAID, skipping update:', {
      orderNumber: order.orderNumber,
      paymentId: order.razorpayPaymentId,
    });
    return { order, alreadyPaid: true };
  }

  console.log('[Razorpay Backend] Marking order as PAID and transitioning status:', {
    orderNumber: order.orderNumber,
    paymentId: razorpayPaymentId,
    source,
    amount: Number(order.totalAmount),
  });

  const updatedOrder = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: PaymentStatus.PAID,
        status: order.status === OrderStatus.PENDING ? OrderStatus.ACCEPTED : order.status,
        razorpayPaymentId,
        razorpayOrderId: razorpayOrderId || order.razorpayOrderId,
        razorpaySignature: razorpaySignature || order.razorpaySignature,
        upiTransactionRef: razorpayPaymentId,
      },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        fromStatus: order.status,
        toStatus: updated.status,
        note: `Payment verified via Razorpay UPI (${source}). Payment ID: ${razorpayPaymentId}. Amount: ₹${Number(order.totalAmount).toFixed(2)}.`,
      },
    });

    await tx.notification.create({
      data: {
        recipientUserId: order.business.ownerId,
        businessId: order.business.id,
        title: `Payment Received for #${order.orderNumber}`,
        message: `Customer paid ₹${Number(order.totalAmount).toFixed(2)} via Razorpay UPI (ID: ${razorpayPaymentId}).`,
        type: NotificationType.ORDER_STATUS_CHANGE,
        link: `/dashboard/orders/${order.id}`,
      },
    });

    return updated;
  });

  return { order: updatedOrder, alreadyPaid: false };
}

