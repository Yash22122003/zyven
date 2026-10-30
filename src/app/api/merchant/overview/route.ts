import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireMerchant, getOnboardingRedirectUrl } from '@/lib/auth';
import { OrderStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { businessId } = await requireMerchant();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      business,
      todayOrders,
      pendingOrdersCount,
      allProducts,
      recentOrders,
      subscription,
    ] = await Promise.all([
      prisma.business.findUnique({
        where: { id: businessId },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          isOpenManually: true,
          isVerified: true,
          estimatedPrepTimeMinutes: true,
        },
      }),
      prisma.order.findMany({
        where: {
          businessId,
          createdAt: { gte: todayStart },
        },
        select: {
          totalAmount: true,
          status: true,
        },
      }),
      prisma.order.count({
        where: {
          businessId,
          status: OrderStatus.PENDING,
        },
      }),
      prisma.product.findMany({
        where: { businessId, isActive: true },
        include: {
          inventory: true,
        },
      }),
      prisma.order.findMany({
        where: { businessId },
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: {
          items: true,
        },
      }),
      prisma.businessSubscription.findUnique({
        where: { businessId },
        include: { plan: true },
      }),
    ]);

    // Compute metrics
    const todaySales = todayOrders
      .filter((o) => o.status !== OrderStatus.REJECTED && o.status !== OrderStatus.CANCELLED)
      .reduce((sum, o) => sum + Number(o.totalAmount), 0);

    let lowStockCount = 0;
    for (const p of allProducts) {
      if (p.inventory) {
        const available = p.inventory.quantityOnHand - p.inventory.quantityReserved;
        if (available <= p.inventory.lowStockThreshold) {
          lowStockCount++;
        }
      }
    }

    return NextResponse.json({
      business,
      metrics: {
        todayOrderCount: todayOrders.length,
        todaySales,
        pendingOrdersCount,
        activeProductsCount: allProducts.length,
        lowStockCount,
      },
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        status: o.status,
        totalAmount: Number(o.totalAmount),
        itemCount: o.items.length,
        createdAt: o.createdAt,
      })),
      subscription: subscription
        ? {
            planName: subscription.plan.name,
            code: subscription.plan.code,
            price: Number(subscription.plan.priceInr),
            isIntroductory: subscription.plan.isIntroductory,
            introMonthsConsumed: subscription.introMonthsConsumed,
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd,
          }
        : null,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith('INACTIVE_MERCHANT:')) {
      const status = err.message.split(':')[1] as any;
      return NextResponse.json(
        {
          error: 'Merchant subscription is inactive. Please complete onboarding payment.',
          status,
          redirectUrl: getOnboardingRedirectUrl(status),
        },
        { status: 403 }
      );
    }
    console.error('Merchant overview error:', err);
    return NextResponse.json({ error: 'Unauthorized or failed to load overview' }, { status: 403 });
  }
}
