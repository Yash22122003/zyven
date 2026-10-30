import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = params;

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
      },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
            phone: true,
            email: true,
            addressLine1: true,
            addressLine2: true,
            city: true,
            state: true,
            pincode: true,
            pickupInstructions: true,
            estimatedPrepTimeMinutes: true,
            enableUpiQr: true,
            upiId: true,
            upiName: true,
            logoUrl: true,
            category: { select: { name: true } },
          },
        },
        items: {
          include: {
            product: {
              select: {
                imageUrl: true,
                slug: true,
              },
            },
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Strict customer isolation check: customer can ONLY see their own orders
    const isOwner =
      order.customerId === user.userId ||
      (user.email && order.customerEmail?.toLowerCase() === user.email.toLowerCase()) ||
      (user.phone && order.customerPhone === user.phone) ||
      user.role === 'SUPER_ADMIN';

    if (!isOwner) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to view this order' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerEmail: order.customerEmail,
        subtotal: Number(order.subtotal),
        taxAmount: Number(order.taxAmount),
        totalAmount: Number(order.totalAmount),
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        upiTransactionRef: order.upiTransactionRef,
        pickupNotes: order.pickupNotes,
        estimatedPickupTime: order.estimatedPickupTime,
        rejectionReason: order.rejectionReason,
        createdAt: order.createdAt,
        expiresAt: order.expiresAt,
        business: order.business,
        items: order.items.map((i) => ({
          id: i.id,
          productId: i.productId,
          productName: i.productName,
          productSku: i.productSku,
          unitPrice: Number(i.unitPrice),
          quantity: i.quantity,
          totalPrice: Number(i.totalPrice),
          imageUrl: i.product?.imageUrl || null,
        })),
        statusHistory: order.statusHistory.map((h) => ({
          id: h.id,
          fromStatus: h.fromStatus,
          toStatus: h.toStatus,
          note: h.note,
          createdAt: h.createdAt,
        })),
      },
    });
  } catch (err: unknown) {
    console.error('Customer order detail error:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve order details' },
      { status: 500 }
    );
  }
}
