import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { orderNumber: string } }
) {
  try {
    const orderNumber = params.orderNumber;
    if (!orderNumber) {
      return NextResponse.json({ error: 'Order number is required' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber },
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
            upiId: true,
            upiName: true,
            enableUpiQr: true,
          },
        },
        items: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({
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
        razorpayOrderId: order.razorpayOrderId,
        razorpayPaymentId: order.razorpayPaymentId,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
        upiTransactionRef: order.upiTransactionRef,
        pickupNotes: order.pickupNotes,
        estimatedPickupTime: order.estimatedPickupTime,
        rejectionReason: order.rejectionReason,
        expiresAt: order.expiresAt,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
      business: order.business,
      items: order.items.map((i) => ({
        id: i.id,
        productName: i.productName,
        productSku: i.productSku,
        unitPrice: Number(i.unitPrice),
        quantity: i.quantity,
        totalPrice: Number(i.totalPrice),
      })),
      timeline: order.statusHistory.map((h) => ({
        id: h.id,
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        note: h.note,
        createdAt: h.createdAt,
      })),
    });
  } catch (err: unknown) {
    console.error('Order query error:', err);
    return NextResponse.json({ error: 'Failed to retrieve order' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { orderNumber: string } }
) {
  try {
    const orderNumber = params.orderNumber;
    const body = await req.json();
    const { upiTransactionRef } = body;

    if (!orderNumber || !upiTransactionRef) {
      return NextResponse.json({ error: 'Missing transaction reference' }, { status: 400 });
    }

    const updated = await prisma.order.update({
      where: { orderNumber },
      data: {
        upiTransactionRef: upiTransactionRef.trim(),
        paymentMethod: 'UPI_ONLINE',
      },
    });

    // Add status history note
    await prisma.orderStatusHistory.create({
      data: {
        orderId: updated.id,
        fromStatus: updated.status,
        toStatus: updated.status,
        note: `Customer submitted UPI payment reference: ${upiTransactionRef.trim()}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'UPI reference saved successfully',
      upiTransactionRef: updated.upiTransactionRef,
    });
  } catch (err: unknown) {
    console.error('Update UPI ref error:', err);
    return NextResponse.json({ error: 'Failed to update transaction reference' }, { status: 500 });
  }
}
