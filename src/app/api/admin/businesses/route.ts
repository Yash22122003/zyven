import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('q');
    const statusFilter = searchParams.get('status');

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { owner: { fullName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (statusFilter && statusFilter !== 'ALL') {
      if (statusFilter === 'ACTIVE') {
        where.status = 'ACTIVE';
      } else if (statusFilter === 'PENDING') {
        where.status = { in: ['REGISTERED', 'PLAN_SELECTED', 'PAYMENT_PENDING'] };
      } else if (statusFilter === 'FAILED') {
        where.status = 'PAYMENT_FAILED';
      } else if (statusFilter === 'SUSPENDED') {
        where.status = 'SUSPENDED';
      }
    }

    const businesses = await prisma.business.findMany({
      where,
      include: {
        owner: { select: { id: true, fullName: true, email: true, phone: true } },
        category: { select: { id: true, name: true } },
        selectedPlan: true,
        subscription: {
          include: { plan: true },
        },
        subscriptionPayments: {
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
        _count: {
          select: { products: true, orders: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      businesses: businesses.map((b) => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        owner: b.owner,
        category: b.category.name,
        city: b.city,
        state: b.state,
        phone: b.phone,
        isVerified: b.isVerified,
        isActive: b.isActive,
        status: b.status,
        isOpenManually: b.isOpenManually,
        productCount: b._count.products,
        orderCount: b._count.orders,
        selectedPlan: b.selectedPlan
          ? {
              id: b.selectedPlan.id,
              name: b.selectedPlan.name,
              code: b.selectedPlan.code,
              price: Number(b.selectedPlan.priceInr ?? 0),
              priceInr: Number(b.selectedPlan.priceInr ?? 0),
            }
          : null,
        subscription: b.subscription
          ? {
              id: b.subscription.id,
              planName: b.subscription.plan?.name ?? 'Standard Plan',
              code: b.subscription.plan?.code ?? 'STANDARD',
              price: Number(b.subscription.plan?.priceInr ?? 0),
              priceInr: Number(b.subscription.plan?.priceInr ?? 0),
              status: b.subscription.status,
              currentPeriodEnd: b.subscription.currentPeriodEnd,
            }
          : null,
        payments: b.subscriptionPayments.map((p) => ({
          id: p.id,
          amount: Number(p.amount ?? 0),
          status: p.status,
          method: p.paymentMethod,
          createdAt: p.createdAt,
        })),
        createdAt: b.createdAt,
      })),
    });
  } catch (err: unknown) {
    console.error('Admin businesses fetch error:', err);
    return NextResponse.json({ error: 'Unauthorized or forbidden' }, { status: 403 });
  }
}
