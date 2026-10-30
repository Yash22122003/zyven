import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, signToken, setAuthCookie } from '@/lib/auth';
import { UserRole, MerchantStatus, SubscriptionPaymentStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();

    if (user.role !== UserRole.MERCHANT && user.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { razorpayOrderId, reason } = await req.json().catch(() => ({}));

    const business = await prisma.business.findFirst({
      where: { ownerId: user.userId },
    });

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Do NOT duplicate account; retain business and plan, mark status as PAYMENT_FAILED
    await prisma.$transaction(async (tx) => {
      await tx.business.update({
        where: { id: business.id },
        data: { status: MerchantStatus.PAYMENT_FAILED },
      });

      if (razorpayOrderId) {
        await tx.subscriptionPayment.updateMany({
          where: { razorpayOrderId },
          data: { status: SubscriptionPaymentStatus.FAILED },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: user.userId,
          businessId: business.id,
          action: 'MERCHANT_SUBSCRIPTION_PAYMENT_FAILED',
          entityType: 'BUSINESS',
          entityId: business.id,
          metadataJson: {
            reason: reason || 'Payment cancelled or failed by user',
            razorpayOrderId,
          },
        },
      });
    });

    // Update cookie with PAYMENT_FAILED
    const token = signToken({
      userId: user.userId,
      email: user.email,
      phone: user.phone,
      role: user.role,
      fullName: user.fullName,
      merchantStatus: MerchantStatus.PAYMENT_FAILED,
    });
    await setAuthCookie(token);

    return NextResponse.json({
      success: true,
      status: 'PAYMENT_FAILED',
      message: 'Subscription payment failed or was cancelled. You can retry safely.',
    });
  } catch (err: unknown) {
    console.error('Payment failed report error:', err);
    return NextResponse.json({ error: 'Failed to record payment failure' }, { status: 500 });
  }
}
