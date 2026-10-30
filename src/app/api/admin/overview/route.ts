import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireSuperAdmin();

    const [
      totalBusinesses,
      verifiedBusinesses,
      activeBusinesses,
      totalOrders,
      ordersAggregate,
      subscriptions,
      recentBusinesses,
    ] = await Promise.all([
      prisma.business.count(),
      prisma.business.count({ where: { isVerified: true } }),
      prisma.business.count({ where: { isActive: true } }),
      prisma.order.count(),
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { status: { notIn: ['REJECTED', 'CANCELLED'] } },
      }),
      prisma.businessSubscription.findMany({
        include: { plan: true },
      }),
      prisma.business.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          owner: { select: { fullName: true, email: true } },
          category: { select: { name: true } },
          _count: { select: { products: true, orders: true } },
        },
      }),
    ]);

    // Calculate Platform MRR from active subscriptions
    const platformMRR = subscriptions.reduce((acc, sub) => {
      if (sub.status === 'ACTIVE') {
        return acc + Number(sub.plan.priceInr);
      }
      return acc;
    }, 0);

    return NextResponse.json({
      metrics: {
        totalBusinesses,
        verifiedBusinesses,
        activeBusinesses,
        totalOrders,
        totalGMV: Number(ordersAggregate._sum.totalAmount || 0),
        platformMRR,
        activeSubscriptionsCount: subscriptions.filter((s) => s.status === 'ACTIVE').length,
      },
      recentBusinesses: recentBusinesses.map((b) => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        ownerName: b.owner.fullName,
        ownerEmail: b.owner.email,
        category: b.category.name,
        city: b.city,
        isVerified: b.isVerified,
        isActive: b.isActive,
        productCount: b._count.products,
        orderCount: b._count.orders,
        createdAt: b.createdAt,
      })),
    });
  } catch (err: unknown) {
    console.error('Admin overview error:', err);
    return NextResponse.json({ error: 'Unauthorized or forbidden' }, { status: 403 });
  }
}
