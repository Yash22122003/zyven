import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireMerchant } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { businessId } = await requireMerchant();

    const [sub, payments, standardPlan] = await Promise.all([
      prisma.businessSubscription.findUnique({
        where: { businessId },
        include: { plan: true },
      }),
      prisma.subscriptionPayment.findMany({
        where: { businessId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.subscriptionPlan.findUnique({
        where: { code: 'STANDARD_MONTHLY' },
      }),
    ]);

    return NextResponse.json({
      subscription: sub
        ? {
            id: sub.id,
            status: sub.status,
            planName: sub.plan?.name ?? 'Standard Plan',
            code: sub.plan?.code ?? 'STANDARD',
            price: Number(sub.plan?.priceInr ?? 0),
            priceInr: Number(sub.plan?.priceInr ?? 0),
            isIntroductory: sub.plan?.isIntroductory ?? false,
            introMonthsConsumed: sub.introMonthsConsumed ?? 0,
            maxIntroMonths: sub.plan?.introDurationMonths ?? 3,
            startedAt: sub.startedAt,
            currentPeriodStart: sub.currentPeriodStart,
            currentPeriodEnd: sub.currentPeriodEnd,
            standardRenewalPrice: standardPlan ? Number(standardPlan.priceInr ?? 299) : 299.00,
          }
        : null,
      payments: payments.map((p) => ({
        id: p.id,
        amount: Number(p.amount ?? 0),
        currency: p.currency,
        status: p.status,
        gatewayTransactionId: p.gatewayTransactionId,
        paymentMethod: p.paymentMethod,
        createdAt: p.createdAt,
      })),
    });
  } catch (err: unknown) {
    console.error('Subscription fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch subscription details' }, { status: 403 });
  }
}
