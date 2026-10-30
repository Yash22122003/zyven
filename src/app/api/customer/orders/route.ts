import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { OrderStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status')?.toUpperCase() || 'ALL';

    // Build customer isolation condition
    const orConditions: any[] = [{ customerId: user.userId }];
    if (user.email) {
      orConditions.push({ customerEmail: { equals: user.email.toLowerCase(), mode: 'insensitive' } });
    }
    if (user.phone) {
      orConditions.push({ customerPhone: user.phone });
    }

    // Status filtering mapping
    let statusFilter: any = undefined;
    if (statusParam === 'ACTIVE') {
      statusFilter = {
        in: [
          OrderStatus.PENDING,
          OrderStatus.ACCEPTED,
          OrderStatus.PREPARING,
          OrderStatus.READY_FOR_PICKUP,
        ],
      };
    } else if (statusParam === 'COMPLETED' || statusParam === 'DELIVERED') {
      statusFilter = OrderStatus.COLLECTED;
    } else if (statusParam === 'CANCELLED') {
      statusFilter = {
        in: [OrderStatus.CANCELLED, OrderStatus.REJECTED, OrderStatus.EXPIRED],
      };
    } else if (statusParam === 'PENDING') {
      statusFilter = OrderStatus.PENDING;
    } else if (statusParam === 'CONFIRMED' || statusParam === 'ACCEPTED') {
      statusFilter = OrderStatus.ACCEPTED;
    } else if (statusParam === 'SHIPPED' || statusParam === 'READY' || statusParam === 'READY_FOR_PICKUP') {
      statusFilter = OrderStatus.READY_FOR_PICKUP;
    }

    // Fetch customer's orders strictly isolated to their account
    const orders = await prisma.order.findMany({
      where: {
        OR: orConditions,
        ...(statusFilter ? { status: statusFilter } : {}),
      },
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
            pickupInstructions: true,
            enableUpiQr: true,
            upiId: true,
          },
        },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Compute customer summary stats
    const allCustomerOrders = await prisma.order.findMany({
      where: { OR: orConditions },
      select: { status: true },
    });

    const stats = {
      total: allCustomerOrders.length,
      active: allCustomerOrders.filter((o) =>
        ([
          OrderStatus.PENDING,
          OrderStatus.ACCEPTED,
          OrderStatus.PREPARING,
          OrderStatus.READY_FOR_PICKUP,
        ] as OrderStatus[]).includes(o.status)
      ).length,
      readyForPickup: allCustomerOrders.filter((o) => o.status === OrderStatus.READY_FOR_PICKUP).length,
      completed: allCustomerOrders.filter((o) => o.status === OrderStatus.COLLECTED).length,
      cancelled: allCustomerOrders.filter((o) =>
        ([OrderStatus.CANCELLED, OrderStatus.REJECTED, OrderStatus.EXPIRED] as OrderStatus[]).includes(o.status)
      ).length,
    };

    return NextResponse.json({
      success: true,
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        totalAmount: Number(o.totalAmount),
        subtotal: Number(o.subtotal),
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        pickupNotes: o.pickupNotes,
        estimatedPickupTime: o.estimatedPickupTime,
        createdAt: o.createdAt,
        expiresAt: o.expiresAt,
        itemsCount: o.items.reduce((acc, i) => acc + i.quantity, 0),
        business: o.business,
        items: o.items.map((item) => ({
          id: item.id,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
        })),
      })),
      stats,
    });
  } catch (err: unknown) {
    console.error('Customer orders error:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve customer orders' },
      { status: 500 }
    );
  }
}
