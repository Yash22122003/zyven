import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, signToken, setAuthCookie } from '@/lib/auth';
import {
  verifyPaymentSignature,
  activateMerchantSubscription,
  getRazorpayClient,
  extractRazorpayErrorInfo,
} from '@/lib/razorpay';
import { UserRole, MerchantStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();

    if (user.role !== UserRole.MERCHANT && user.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = await req.json();

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json(
        { error: 'Missing required Razorpay payment verification parameters' },
        { status: 400 }
      );
    }

    console.log('[Razorpay Backend] Verifying merchant subscription payment:', {
      razorpayOrderId,
      razorpayPaymentId,
      containsSignature: Boolean(razorpaySignature),
    });

    // 1. Verify cryptographic HMAC-SHA256 signature
    const isSignatureValid = verifyPaymentSignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (!isSignatureValid) {
      console.error('[Razorpay Backend] Invalid payment signature for subscription');
      return NextResponse.json(
        { error: 'Cryptographic signature verification failed' },
        { status: 400 }
      );
    }

    // 2. Fetch payment directly from Razorpay API to confirm capture status
    const razorpay = getRazorpayClient();
    const payment = await razorpay.payments.fetch(razorpayPaymentId);

    if (!payment || (payment.status !== 'captured' && payment.status !== 'authorized')) {
      console.error('[Razorpay Backend] Payment not captured on Razorpay:', payment?.status);
      return NextResponse.json(
        { error: `Payment status is ${payment?.status || 'unknown'}. Verification failed.` },
        { status: 400 }
      );
    }

    // 3. Find business
    const business = await prisma.business.findFirst({
      where: { ownerId: user.userId },
    });

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // 4. Activate merchant subscription in atomic transaction
    await activateMerchantSubscription({
      businessId: business.id,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      source: 'CALLBACK',
    });

    // 5. Update auth cookie with ACTIVE status
    const token = signToken({
      userId: user.userId,
      email: user.email,
      phone: user.phone,
      role: user.role,
      fullName: user.fullName,
      merchantStatus: MerchantStatus.ACTIVE,
    });
    await setAuthCookie(token);

    return NextResponse.json({
      success: true,
      status: 'ACTIVE',
      message: 'Subscription payment verified. Store activated successfully!',
      redirectUrl: '/dashboard',
    });
  } catch (err: unknown) {
    const errInfo = extractRazorpayErrorInfo(err);
    console.error('[Razorpay Backend Error] Subscription verification error:', errInfo);
    return NextResponse.json(
      { error: errInfo.errorMessage, code: errInfo.errorCode },
      { status: errInfo.statusCode >= 400 && errInfo.statusCode < 600 ? errInfo.statusCode : 500 }
    );
  }
}
