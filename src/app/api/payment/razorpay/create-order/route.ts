import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createRazorpayOrder, getRazorpayClient } from '@/lib/razorpay';
import { PaymentStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderNumber } = body;

    console.log('[Razorpay Backend] Payment order preparation request received:', { orderNumber });

    if (!orderNumber) {
      return NextResponse.json({ error: 'Order number is required' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: { business: true },
    });

    if (!order) {
      console.warn('[Razorpay Backend] Order not found for preparation:', orderNumber);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.paymentStatus === PaymentStatus.PAID) {
      console.log('[Razorpay Backend] Order is already paid:', orderNumber);
      return NextResponse.json({
        success: true,
        alreadyPaid: true,
        paymentStatus: 'PAID',
        orderNumber: order.orderNumber,
      });
    }

    let validRzpOrderId = order.razorpayOrderId;
    const amountInPaise = Math.round(Number(order.totalAmount) * 100);

    // Verify existing Razorpay order ID if present
    if (validRzpOrderId) {
      try {
        const rzp = getRazorpayClient();
        const existing = await rzp.orders.fetch(validRzpOrderId);
        if (existing && existing.status !== 'paid' && existing.status !== 'attempted') {
          console.log('[Razorpay Backend] Verified existing open Razorpay order:', {
            orderId: validRzpOrderId,
            status: existing.status,
          });
        }
      } catch (err: unknown) {
        console.warn('[Razorpay Backend] Existing Razorpay order ID invalid or unreachable, regenerating fresh order:', {
          oldOrderId: validRzpOrderId,
          error: err instanceof Error ? err.message : String(err),
        });
        validRzpOrderId = null;
      }
    }

    // Create fresh authentic Razorpay order if needed
    if (!validRzpOrderId) {
      const freshRzpOrder = await createRazorpayOrder({
        amountInPaise,
        currency: 'INR',
        receipt: order.orderNumber,
        notes: {
          orderNumber: order.orderNumber,
          businessId: order.businessId,
          businessSlug: order.business.slug,
        },
      });

      validRzpOrderId = freshRzpOrder.id;

      // Persist the real Razorpay order ID to PostgreSQL
      await prisma.order.update({
        where: { id: order.id },
        data: { razorpayOrderId: validRzpOrderId },
      });

      console.log('[Razorpay Backend] Fresh Razorpay order linked to database order:', {
        orderNumber: order.orderNumber,
        razorpayOrderId: validRzpOrderId,
      });
    }

    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';

    return NextResponse.json({
      success: true,
      alreadyPaid: false,
      razorpay: {
        keyId,
        orderId: validRzpOrderId,
        amount: amountInPaise,
        currency: 'INR',
        name: order.business.name,
        description: `Order #${order.orderNumber}`,
      },
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to prepare Razorpay payment';
    console.error('[Razorpay Backend] Error preparing Razorpay payment:', errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
