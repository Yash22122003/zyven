import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const q = searchParams.get('q');

    const where: any = {
      isActive: true,
      isVerified: true,
    };

    if (category && category !== 'all') {
      where.category = { slug: category };
    }

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [stores, categories] = await Promise.all([
      prisma.business.findMany({
        where,
        include: {
          category: true,
          _count: {
            select: { products: { where: { isActive: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.category.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' },
      }),
    ]);

    return NextResponse.json({
      stores: stores.map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        description: s.description,
        logoUrl: s.logoUrl,
        bannerUrl: s.bannerUrl,
        city: s.city,
        state: s.state,
        category: s.category.name,
        categorySlug: s.category.slug,
        productCount: s._count.products,
        isOpenManually: s.isOpenManually,
        estimatedPrepTimeMinutes: s.estimatedPrepTimeMinutes,
        upiId: s.upiId,
        enableUpiQr: s.enableUpiQr,
      })),
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        icon: c.icon,
      })),
    });
  } catch (err: unknown) {
    console.error('Marketplace API error:', err);
    return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 });
  }
}
