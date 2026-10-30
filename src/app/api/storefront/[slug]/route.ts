import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isReservedSlug } from '@/lib/reserved-slugs';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug?.toLowerCase();
    if (!slug || isReservedSlug(slug)) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const business = await prisma.business.findUnique({
      where: { slug },
      include: {
        category: {
          select: { id: true, name: true, slug: true, icon: true },
        },
        operatingHours: {
          orderBy: { dayOfWeek: 'asc' },
        },
        products: {
          where: { isActive: true },
          include: {
            inventory: {
              select: {
                quantityOnHand: true,
                quantityReserved: true,
                lowStockThreshold: true,
              },
            },
            category: {
              select: { id: true, name: true, slug: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!business || !business.isActive) {
      return NextResponse.json({ error: 'Storefront unavailable' }, { status: 404 });
    }

    // Determine current open/closed status
    const now = new Date();
    const currentDay = now.getDay();
    const currentHourMin = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const todaySchedule = business.operatingHours.find((h) => h.dayOfWeek === currentDay);

    let isScheduleOpen = false;
    if (todaySchedule && !todaySchedule.isClosed) {
      isScheduleOpen = currentHourMin >= todaySchedule.openTime && currentHourMin <= todaySchedule.closeTime;
    }

    const isStoreOpen = business.isOpenManually && isScheduleOpen;

    // Transform products with computed availability
    const transformedProducts = business.products.map((p) => {
      const inv = p.inventory;
      const onHand = inv ? inv.quantityOnHand : 0;
      const reserved = inv ? inv.quantityReserved : 0;
      const available = Math.max(0, onHand - reserved);
      const isLowStock = available > 0 && available <= (inv?.lowStockThreshold || 5);

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        sku: p.sku,
        price: Number(p.price),
        compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
        imageUrl: p.imageUrl,
        category: p.category,
        stock: {
          available,
          isAvailable: available > 0,
          isLowStock,
          displayMode: business.stockDisplayMode,
          // Show exact count only if merchant selected EXACT_COUNT
          exactCount: business.stockDisplayMode === 'EXACT_COUNT' ? available : null,
        },
      };
    });

    return NextResponse.json({
      store: {
        id: business.id,
        name: business.name,
        slug: business.slug,
        description: business.description,
        logoUrl: business.logoUrl,
        bannerUrl: business.bannerUrl,
        phone: business.phone,
        email: business.email,
        address: `${business.addressLine1}${business.addressLine2 ? ', ' + business.addressLine2 : ''}, ${business.city}, ${business.state} - ${business.pincode}`,
        city: business.city,
        pickupInstructions: business.pickupInstructions,
        estimatedPrepTimeMinutes: business.estimatedPrepTimeMinutes,
        isVerified: business.isVerified,
        isOpen: isStoreOpen,
        scheduleNote: todaySchedule
          ? todaySchedule.isClosed
            ? 'Closed today'
            : `Open today from ${todaySchedule.openTime} to ${todaySchedule.closeTime}`
          : 'Hours not specified',
        operatingHours: business.operatingHours,
        category: business.category,
        upiId: business.enableUpiQr ? business.upiId : null,
        upiName: business.enableUpiQr ? (business.upiName || business.name) : null,
        enableUpiQr: business.enableUpiQr && !!business.upiId,
      },
      products: transformedProducts,
    });
  } catch (err: unknown) {
    console.error('Storefront error:', err);
    return NextResponse.json({ error: 'Internal server error loading storefront' }, { status: 500 });
  }
}
