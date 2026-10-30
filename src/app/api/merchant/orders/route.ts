import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireMerchant } from '@/lib/auth';
import { OrderStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { businessId } = await requireMerchant();
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status');
    const search = searchParams.get('q');

    const where: any = { businessId };

    if (statusFilter && statusFilter !== 'ALL') {
      where.status = statusFilter as OrderStatus;
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search } },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        customerEmail: o.customerEmail,
        subtotal: Number(o.subtotal),
        taxAmount: Number(o.taxAmount),
        totalAmount: Number(o.totalAmount),
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        upiTransactionRef: o.upiTransactionRef,
        pickupNotes: o.pickupNotes,
        estimatedPickupTime: o.estimatedPickupTime,
        rejectionReason: o.rejectionReason,
        expiresAt: o.expiresAt,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
        items: o.items.map((i) => ({
          id: i.id,
          productName: i.productName,
          productSku: i.productSku,
          unitPrice: Number(i.unitPrice),
          quantity: i.quantity,
          totalPrice: Number(i.totalPrice),
        })),
        timeline: o.statusHistory.map((h) => ({
          id: h.id,
          fromStatus: h.fromStatus,
          toStatus: h.toStatus,
          note: h.note,
          createdAt: h.createdAt,
        })),
      })),
    });
  } catch (err: unknown) {
    console.error('Merchant orders fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 403 });
  }
}
