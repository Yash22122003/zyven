import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireMerchant } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { businessId } = await requireMerchant();

    const sub = await prisma.businessSubscription.findUnique({
      where: { businessId },
      include: {
        plan: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    const standardPlan = await prisma.subscriptionPlan.findUnique({
      where: { code: 'STANDARD_MONTHLY' },
    });

    return NextResponse.json({
      subscription: sub
        ? {
            id: sub.id,
            status: sub.status,
            planName: sub.plan.name,
            code: sub.plan.code,
            price: Number(sub.plan.priceInr),
            isIntroductory: sub.plan.isIntroductory,
            introMonthsConsumed: sub.introMonthsConsumed,
            maxIntroMonths: sub.plan.introDurationMonths,
            startedAt: sub.startedAt,
            currentPeriodStart: sub.currentPeriodStart,
            currentPeriodEnd: sub.currentPeriodEnd,
            standardRenewalPrice: standardPlan ? Number(standardPlan.priceInr) : 299.00,
          }
        : null,
      payments: sub?.payments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        currency: p.currency,
        status: p.status,
        gatewayTransactionId: p.gatewayTransactionId,
        paymentMethod: p.paymentMethod,
        createdAt: p.createdAt,
      })) || [],
    });
  } catch (err: unknown) {
    console.error('Subscription fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch subscription details' }, { status: 403 });
  }
}
