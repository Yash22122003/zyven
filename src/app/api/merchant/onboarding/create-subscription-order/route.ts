import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, signToken, setAuthCookie } from '@/lib/auth';
import { getRazorpayClient, extractRazorpayErrorInfo } from '@/lib/razorpay';
import { UserRole, MerchantStatus, SubscriptionStatus, SubscriptionPaymentStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();

    if (user.role !== UserRole.MERCHANT && user.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const business = await prisma.business.findFirst({
      where: { ownerId: user.userId },
      include: { selectedPlan: true },
    });

    if (!business) {
      return NextResponse.json({ error: 'No business found for this merchant' }, { status: 404 });
    }

    const plan = business.selectedPlan;
    if (!plan) {
      return NextResponse.json(
        { error: 'No plan selected. Please select a subscription plan first.' },
        { status: 400 }
      );
    }

    const amountInPaise = Math.round(Number(plan.priceInr) * 100);
    if (amountInPaise < 100) {
      return NextResponse.json(
        { error: 'Invalid subscription amount. Minimum is ₹1.00 (100 paise)' },
        { status: 400 }
      );
    }

    console.log('[Razorpay Backend] Initiating merchant subscription order:', {
      businessId: business.id,
      planCode: plan.code,
      amountInPaise,
    });

    const razorpay = getRazorpayClient();
    const receipt = `SUB-${business.id.slice(0, 8)}-${Date.now()}`;

    const rzpOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt,
      notes: {
        type: 'MERCHANT_SUBSCRIPTION',
        businessId: business.id,
        planId: plan.id,
        ownerId: user.userId,
      },
    });

    console.log('[Razorpay Backend] Subscription order created successfully:', {
      orderId: rzpOrder.id,
      amount: rzpOrder.amount,
    });

    const now = new Date();
    const periodEnd = new Date(now.getTime() + (plan.billingIntervalMonths || 1) * 30 * 24 * 60 * 60 * 1000);

    // Save PENDING subscription and payment record in atomic transaction
    await prisma.$transaction(async (tx) => {
      // 1. Update business to PAYMENT_PENDING
      await tx.business.update({
        where: { id: business.id },
        data: { status: MerchantStatus.PAYMENT_PENDING },
      });

      // 2. Upsert business subscription as PENDING
      const sub = await tx.businessSubscription.upsert({
        where: { businessId: business.id },
        create: {
          businessId: business.id,
          planId: plan.id,
          status: SubscriptionStatus.PENDING,
          startedAt: now,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          introMonthsConsumed: 0,
          razorpayOrderId: rzpOrder.id,
        },
        update: {
          planId: plan.id,
          status: SubscriptionStatus.PENDING,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          razorpayOrderId: rzpOrder.id,
        },
      });

      // 3. Create SubscriptionPayment as PENDING
      await tx.subscriptionPayment.create({
        data: {
          subscriptionId: sub.id,
          businessId: business.id,
          amount: plan.priceInr,
          currency: 'INR',
          status: SubscriptionPaymentStatus.PENDING,
          razorpayOrderId: rzpOrder.id,
          paymentMethod: 'RAZORPAY_UPI',
        },
      });

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          actorId: user.userId,
          businessId: business.id,
          action: 'MERCHANT_SUBSCRIPTION_ORDER_CREATED',
          entityType: 'BUSINESS',
          entityId: business.id,
          metadataJson: {
            planId: plan.id,
            planName: plan.name,
            amountInPaise,
            razorpayOrderId: rzpOrder.id,
          },
        },
      });
    });

    // Update cookie with PAYMENT_PENDING
    const token = signToken({
      userId: user.userId,
      email: user.email,
      phone: user.phone,
      role: user.role,
      fullName: user.fullName,
      merchantStatus: MerchantStatus.PAYMENT_PENDING,
    });
    await setAuthCookie(token);

    return NextResponse.json({
      success: true,
      razorpay: {
        keyId: process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
        orderId: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        name: 'ZYVEN Commerce Platform',
        description: `${plan.name} (Store Activation)`,
      },
    });
  } catch (err: unknown) {
    const errInfo = extractRazorpayErrorInfo(err);
    console.error('[Razorpay Backend Error] Create subscription order failed:', errInfo);
    return NextResponse.json(
      { error: errInfo.errorMessage, code: errInfo.errorCode },
      { status: errInfo.statusCode >= 400 && errInfo.statusCode < 600 ? errInfo.statusCode : 500 }
    );
  }
}
