import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { OrderStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        email: true,
        phone: true,
        fullName: true,
        role: true,
        createdAt: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Build customer isolation condition
    const orConditions: any[] = [{ customerId: dbUser.id }];
    if (dbUser.email) {
      orConditions.push({ customerEmail: { equals: dbUser.email.toLowerCase(), mode: 'insensitive' } });
    }
    if (dbUser.phone) {
      orConditions.push({ customerPhone: dbUser.phone });
    }

    // Fetch customer's orders
    const orders = await prisma.order.findMany({
      where: { OR: orConditions },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
            phone: true,
            addressLine1: true,
            city: true,
            logoUrl: true,
            category: { select: { name: true } },
            isOpenManually: true,
          },
        },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const activeStatuses: OrderStatus[] = [
      OrderStatus.PENDING,
      OrderStatus.ACCEPTED,
      OrderStatus.PREPARING,
      OrderStatus.READY_FOR_PICKUP,
    ];

    const activeOrders = orders.filter((o) => activeStatuses.includes(o.status));

    const completedOrders = orders.filter((o) => o.status === OrderStatus.COLLECTED);

    const totalSpent = orders
      .filter((o) => o.paymentStatus === 'PAID')
      .reduce((sum, o) => sum + Number(o.totalAmount), 0);

    // Get favorite/frequently ordered stores
    const storeMap = new Map<string, any>();
    orders.forEach((o) => {
      if (o.business && !storeMap.has(o.business.id)) {
        storeMap.set(o.business.id, o.business);
      }
    });

    // If customer has few or no past stores, include featured active stores
    if (storeMap.size < 3) {
      const featuredStores = await prisma.business.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
          phone: true,
          addressLine1: true,
          city: true,
          logoUrl: true,
          category: { select: { name: true } },
          isOpenManually: true,
        },
        take: 4,
      });

      featuredStores.forEach((s) => {
        if (!storeMap.has(s.id)) {
          storeMap.set(s.id, s);
        }
      });
    }

    return NextResponse.json({
      user: dbUser,
      stats: {
        activeOrdersCount: activeOrders.length,
        completedOrdersCount: completedOrders.length,
        totalOrdersCount: orders.length,
        totalSpent,
      },
      activeOrders: activeOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        totalAmount: Number(o.totalAmount),
        paymentStatus: o.paymentStatus,
        createdAt: o.createdAt,
        expiresAt: o.expiresAt,
        pickupNotes: o.pickupNotes,
        business: o.business,
        itemsCount: o.items.length,
      })),
      recentOrders: orders.slice(0, 5).map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        totalAmount: Number(o.totalAmount),
        paymentStatus: o.paymentStatus,
        createdAt: o.createdAt,
        business: o.business,
        itemsCount: o.items.length,
      })),
      savedStores: Array.from(storeMap.values()).slice(0, 4),
    });
  } catch (err: unknown) {
    console.error('[Customer Profile API] Error fetching profile:', err);
    return NextResponse.json({ error: 'Failed to retrieve customer profile' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { fullName, phone } = body;

    if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.userId },
      data: {
        fullName: fullName.trim(),
        phone: phone ? phone.trim() : undefined,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (err: unknown) {
    console.error('[Customer Profile API] Error updating profile:', err);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
