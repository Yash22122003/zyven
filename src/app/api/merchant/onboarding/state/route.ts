import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireAuth();

    if (user.role !== UserRole.MERCHANT && user.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const business = await prisma.business.findFirst({
      where: { ownerId: user.userId },
      include: {
        selectedPlan: true,
        subscription: {
          include: { plan: true },
        },
        subscriptionPayments: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!business) {
      return NextResponse.json({ error: 'No business found for this merchant' }, { status: 404 });
    }

    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { priceInr: 'asc' },
    });

    return NextResponse.json({
      business: {
        id: business.id,
        name: business.name,
        slug: business.slug,
        status: business.status,
        isActive: business.isActive,
        selectedPlan: business.selectedPlan
          ? {
              id: business.selectedPlan.id,
              name: business.selectedPlan.name,
              code: business.selectedPlan.code,
              priceInr: Number(business.selectedPlan.priceInr),
              billingIntervalMonths: business.selectedPlan.billingIntervalMonths,
              isIntroductory: business.selectedPlan.isIntroductory,
              introDurationMonths: business.selectedPlan.introDurationMonths,
            }
          : null,
        subscription: business.subscription
          ? {
              id: business.subscription.id,
              status: business.subscription.status,
              planName: business.subscription.plan.name,
              priceInr: Number(business.subscription.plan.priceInr),
              currentPeriodEnd: business.subscription.currentPeriodEnd,
            }
          : null,
      },
      plans: plans.map((p) => ({
        id: p.id,
        name: p.name,
        code: p.code,
        priceInr: Number(p.priceInr),
        billingIntervalMonths: p.billingIntervalMonths,
        isIntroductory: p.isIntroductory,
        introDurationMonths: p.introDurationMonths,
      })),
    });
  } catch (err: unknown) {
    console.error('Onboarding state fetch error:', err);
    return NextResponse.json({ error: 'Unauthorized or failed to fetch state' }, { status: 401 });
  }
}
