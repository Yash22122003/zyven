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

export interface RazorpayErrorInfo {
  statusCode: number;
  errorMessage: string;
  errorCode?: string;
  isAuthError: boolean;
  stack?: string;
}

/**
 * Extracts normalized error information from Razorpay SDK rejections or generic errors.
 * Ensures that non-Error objects thrown by the SDK are properly parsed.
 */
export function extractRazorpayErrorInfo(err: unknown): RazorpayErrorInfo {
  let statusCode = 500;
  let errorMessage = 'Failed to process Razorpay payment';
  let errorCode: string | undefined;
  let stack: string | undefined;

  if (err && typeof err === 'object') {
    const anyErr = err as any;

    if (typeof anyErr.statusCode === 'number') {
      statusCode = anyErr.statusCode;
    }

    if (anyErr.error && typeof anyErr.error === 'object') {
      if (typeof anyErr.error.description === 'string') {
        errorMessage = anyErr.error.description;
      }
      if (typeof anyErr.error.code === 'string') {
        errorCode = anyErr.error.code;
      }
    } else if (typeof anyErr.message === 'string') {
      errorMessage = anyErr.message;
    }

    if (typeof anyErr.stack === 'string') {
      stack = anyErr.stack;
    }
  } else if (typeof err === 'string') {
    errorMessage = err;
  }

  const isAuthError =
    statusCode === 401 ||
    errorMessage.toLowerCase().includes('authentication') ||
    errorMessage.toLowerCase().includes('unauthorized');

  if (isAuthError) {
    statusCode = 401;
    errorMessage =
      'Razorpay authentication failed: Invalid or revoked API credentials in RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET';
  }

  return { statusCode, errorMessage, errorCode, isAuthError, stack };
}

export function getRazorpayClient(): Razorpay {
  const rawKeyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
  const rawSecret = process.env.RAZORPAY_KEY_SECRET || '';

  const key_id = rawKeyId.trim();
  const key_secret = rawSecret.trim();

  if (!key_id || !key_secret) {
    console.error('[Razorpay Backend Stage 3] Missing API credentials in environment variables');
    throw new Error('Razorpay API keys not configured. Please verify RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
  }

  if (key_id.includes('placeholder') || key_secret.includes('placeholder')) {
    console.error('[Razorpay Backend Stage 3] Placeholder keys detected in environment variables');
    throw new Error('Razorpay credentials contain placeholder values. Please set active Test Mode keys in .env');
  }

  console.log('[Razorpay Backend Stage 3] Razorpay client initialized:', {
    keyIdPrefix: key_id.slice(0, 8) + '...',
    isTestMode: key_id.startsWith('rzp_test_'),
  });

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
  if (amountInPaise < 100) {
    throw new Error('Razorpay requires a minimum transaction amount of ₹1.00 (100 paise)');
  }

  console.log('[Razorpay Backend Stage 4] Razorpay order creation attempted:', {
    receipt,
    amountInPaise,
    currency,
  });

  try {
    const rzp = getRazorpayClient();
    const order = await rzp.orders.create({
      amount: amountInPaise,
      currency,
      receipt: receipt.slice(0, 40),
      notes,
    });

    console.log('[Razorpay Backend Stage 5] Razorpay response received:', {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
    });

    return {
      id: order.id,
      amount: Number(order.amount),
      currency: order.currency,
    };
  } catch (err: unknown) {
    const errInfo = extractRazorpayErrorInfo(err);
    console.error('[Razorpay Backend Stage 4 Error] Razorpay order creation failed:', {
      statusCode: errInfo.statusCode,
      errorCode: errInfo.errorCode,
      message: errInfo.errorMessage,
      stack: errInfo.stack || (err instanceof Error ? err.stack : undefined),
    });
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

