import Razorpay from 'razorpay';
import crypto from 'crypto';
import { prisma } from './db';
import { OrderStatus, PaymentStatus, NotificationType, MerchantStatus, SubscriptionStatus, SubscriptionPaymentStatus } from '@prisma/client';

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

/**
 * Idempotent merchant subscription activation helper
 * Ensures duplicate callbacks, webhooks, or retries do not duplicate status changes
 */
export async function activateMerchantSubscription({
  businessId,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  source = 'CALLBACK',
}: {
  businessId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId: string;
  razorpaySignature?: string;
  source?: 'WEBHOOK' | 'CALLBACK' | 'SUPER_ADMIN';
}) {
  // Look up subscription payment by razorpayOrderId or businessId
  const payment = await prisma.subscriptionPayment.findFirst({
    where: {
      OR: [
        ...(razorpayOrderId ? [{ razorpayOrderId }] : []),
        ...(businessId ? [{ businessId }] : []),
      ],
    },
    include: {
      business: {
        include: {
          selectedPlan: true,
          subscription: true,
        },
      },
      subscription: {
        include: { plan: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const targetBusinessId = businessId || payment?.businessId;
  if (!targetBusinessId) {
    throw new Error('Merchant business not found for subscription payment');
  }

  const business = await prisma.business.findUnique({
    where: { id: targetBusinessId },
    include: {
      selectedPlan: true,
      subscription: {
        include: { plan: true },
      },
    },
  });

  if (!business) {
    throw new Error('Business not found');
  }

  // Idempotency check: If business is already ACTIVE and subscription is ACTIVE, return early
  if (business.status === MerchantStatus.ACTIVE && business.subscription?.status === SubscriptionStatus.ACTIVE) {
    console.log('[Razorpay Backend] Subscription idempotency check: Business already ACTIVE, skipping:', {
      businessId: business.id,
      paymentId: razorpayPaymentId,
    });
    return { business, alreadyActive: true };
  }

  // Determine plan: selectedPlan -> existing subscription plan -> default intro plan
  const plan =
    business.selectedPlan ||
    business.subscription?.plan ||
    (await prisma.subscriptionPlan.findFirst({ where: { isActive: true }, orderBy: { priceInr: 'asc' } }));

  if (!plan) {
    throw new Error('No subscription plan found to activate');
  }

  const now = new Date();
  const intervalMonths = plan.billingIntervalMonths || 1;
  const periodEnd = new Date(now.getTime() + intervalMonths * 30 * 24 * 60 * 60 * 1000);

  const result = await prisma.$transaction(async (tx) => {
    // 1. Upsert or update BusinessSubscription
    const sub = await tx.businessSubscription.upsert({
      where: { businessId: business.id },
      create: {
        businessId: business.id,
        planId: plan.id,
        status: SubscriptionStatus.ACTIVE,
        startedAt: now,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        introMonthsConsumed: plan.isIntroductory ? 1 : 0,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
      },
      update: {
        planId: plan.id,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        introMonthsConsumed: plan.isIntroductory ? { increment: 1 } : undefined,
        razorpayOrderId: razorpayOrderId || undefined,
        razorpayPaymentId,
        razorpaySignature,
      },
    });

    // 2. Update or create SubscriptionPayment
    if (payment) {
      await tx.subscriptionPayment.update({
        where: { id: payment.id },
        data: {
          status: SubscriptionPaymentStatus.SUCCESS,
          gatewayTransactionId: razorpayPaymentId,
          razorpayPaymentId,
          razorpaySignature,
        },
      });
    } else {
      await tx.subscriptionPayment.create({
        data: {
          subscriptionId: sub.id,
          businessId: business.id,
          amount: plan.priceInr,
          currency: 'INR',
          status: SubscriptionPaymentStatus.SUCCESS,
          gatewayTransactionId: razorpayPaymentId,
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,
          paymentMethod: 'RAZORPAY_UPI',
        },
      });
    }

    // 3. Activate Business
    const updatedBiz = await tx.business.update({
      where: { id: business.id },
      data: {
        status: MerchantStatus.ACTIVE,
        isActive: true,
      },
    });

    // 4. Audit Log
    await tx.auditLog.create({
      data: {
        actorId: business.ownerId,
        businessId: business.id,
        action: 'MERCHANT_SUBSCRIPTION_ACTIVATED',
        entityType: 'BUSINESS',
        entityId: business.id,
        metadataJson: {
          source,
          planId: plan.id,
          planName: plan.name,
          priceInr: Number(plan.priceInr),
          razorpayOrderId,
          razorpayPaymentId,
          currentPeriodEnd: periodEnd,
        },
      },
    });

    return updatedBiz;
  });

  return { business: result, alreadyActive: false };
}

