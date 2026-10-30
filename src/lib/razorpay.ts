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

  return new Razorpay({
    key_id,
    key_secret,
  });
}

/**
 * Creates a Razorpay Order via the official SDK
 * Falls back to deterministic mock ID only when placeholder keys are active during local tests
 */
export async function createRazorpayOrder({
  amountInPaise,
  currency = 'INR',
  receipt,
  notes = {},
}: CreateOrderParams): Promise<{ id: string; amount: number; currency: string }> {
  const key_id = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
  const key_secret = process.env.RAZORPAY_KEY_SECRET || '';

  // If using placeholder test keys without network connectivity, simulate order creation
  if (key_id.includes('placeholder') || key_secret.includes('placeholder')) {
    return {
      id: `order_${receipt.replace(/[^a-zA-Z0-9]/g, '')}_${Date.now()}`,
      amount: amountInPaise,
      currency,
    };
  }

  const rzp = getRazorpayClient();
  const order = await rzp.orders.create({
    amount: amountInPaise,
    currency,
    receipt,
    notes,
  });

  return {
    id: order.id,
    amount: Number(order.amount),
    currency: order.currency,
  };
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

  if (secret.includes('placeholder')) {
    // In local test placeholder mode, accept non-empty signatures
    return Boolean(razorpayOrderId && razorpayPaymentId && razorpaySignature);
  }

  if (!secret) return false;

  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  return expectedSignature === razorpaySignature;
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

  if (webhookSecret.includes('placeholder')) {
    return Boolean(rawBody && signature);
  }

  if (!webhookSecret || !signature) return false;

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf8'),
      Buffer.from(signature, 'utf8')
    );
  } catch {
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
    return { order, alreadyPaid: true };
  }

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

