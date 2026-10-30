import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, signToken, setAuthCookie } from '@/lib/auth';
import { UserRole, MerchantStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();

    if (user.role !== UserRole.MERCHANT && user.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { planId } = await req.json();

    if (!planId) {
      return NextResponse.json({ error: 'Plan selection is required' }, { status: 400 });
    }

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId, isActive: true },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Selected plan not found or inactive' }, { status: 404 });
    }

    const business = await prisma.business.findFirst({
      where: { ownerId: user.userId },
    });

    if (!business) {
      return NextResponse.json({ error: 'No business attached to this merchant' }, { status: 404 });
    }

    // Update business to PLAN_SELECTED status
    const updated = await prisma.$transaction(async (tx) => {
      const b = await tx.business.update({
        where: { id: business.id },
        data: {
          selectedPlanId: plan.id,
          status: MerchantStatus.PLAN_SELECTED,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.userId,
          businessId: business.id,
          action: 'MERCHANT_PLAN_SELECTED',
          entityType: 'BUSINESS',
          entityId: business.id,
          metadataJson: {
            planId: plan.id,
            planName: plan.name,
            code: plan.code,
            priceInr: Number(plan.priceInr),
          },
        },
      });

      return b;
    });

    // Refresh JWT cookie with updated status
    const token = signToken({
      userId: user.userId,
      email: user.email,
      phone: user.phone,
      role: user.role,
      fullName: user.fullName,
      merchantStatus: MerchantStatus.PLAN_SELECTED,
    });
    await setAuthCookie(token);

    return NextResponse.json({
      success: true,
      message: 'Plan selected successfully',
      redirectUrl: '/onboarding/checkout',
      business: {
        id: updated.id,
        status: updated.status,
        selectedPlanId: updated.selectedPlanId,
      },
    });
  } catch (err: unknown) {
    console.error('Plan selection error:', err);
    return NextResponse.json({ error: 'Failed to select plan' }, { status: 500 });
  }
}
