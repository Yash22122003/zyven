import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireSuperAdmin();

    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: { priceInr: 'asc' },
      include: {
        _count: { select: { subscriptions: true } },
      },
    });

    return NextResponse.json({
      plans: plans.map((p) => ({
        id: p.id,
        name: p.name,
        code: p.code,
        priceInr: Number(p.priceInr),
        billingIntervalMonths: p.billingIntervalMonths,
        isIntroductory: p.isIntroductory,
        introDurationMonths: p.introDurationMonths,
        isActive: p.isActive,
        activeSubscriptionsCount: p._count.subscriptions,
        updatedAt: p.updatedAt,
      })),
    });
  } catch (err: unknown) {
    console.error('Admin plans fetch error:', err);
    return NextResponse.json({ error: 'Unauthorized or forbidden' }, { status: 403 });
  }
}
