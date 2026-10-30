import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('q');

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { owner: { fullName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const businesses = await prisma.business.findMany({
      where,
      include: {
        owner: { select: { id: true, fullName: true, email: true, phone: true } },
        category: { select: { id: true, name: true } },
        subscription: {
          include: { plan: true },
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
        isOpenManually: b.isOpenManually,
        productCount: b._count.products,
        orderCount: b._count.orders,
        subscription: b.subscription
          ? {
              planName: b.subscription.plan.name,
              code: b.subscription.plan.code,
              price: Number(b.subscription.plan.priceInr),
              status: b.subscription.status,
              currentPeriodEnd: b.subscription.currentPeriodEnd,
            }
          : null,
        createdAt: b.createdAt,
      })),
    });
  } catch (err: unknown) {
    console.error('Admin businesses fetch error:', err);
    return NextResponse.json({ error: 'Unauthorized or forbidden' }, { status: 403 });
  }
}
