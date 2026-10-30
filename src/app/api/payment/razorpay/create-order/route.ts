import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createRazorpayOrder, getRazorpayClient, extractRazorpayErrorInfo } from '@/lib/razorpay';
import { OrderStatus, PaymentStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let orderNumber: string | undefined;

  try {
    // Stage 1: Request received & payload parsing
    let body: any;
    try {
      body = await req.json();
    } catch {
      console.warn('[Razorpay Backend Stage 1] Request received with malformed or missing JSON body');
      return NextResponse.json(
        { error: 'Malformed or missing JSON request body', code: 'INVALID_PAYLOAD' },
        { status: 400 }
      );
    }

    orderNumber = body?.orderNumber;
    console.log('[Razorpay Backend Stage 1] Request received:', { orderNumber });

    if (!orderNumber || typeof orderNumber !== 'string' || !orderNumber.trim()) {
      console.warn('[Razorpay Backend Stage 1] Missing or invalid orderNumber parameter');
      return NextResponse.json(
        { error: 'A valid orderNumber string is required', code: 'MISSING_ORDER_NUMBER' },
        { status: 400 }
      );
    }

    orderNumber = orderNumber.trim();

    // Stage 2: Order validated (existence, business relation, eligibility, amount)
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        business: true,
        items: true,
      },
    });

    if (!order) {
      console.warn('[Razorpay Backend Stage 2] Order lookup failed (not found):', orderNumber);
      return NextResponse.json(
        { error: `Order #${orderNumber} could not be found`, code: 'ORDER_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Business existence & active state check
    if (!order.business || !order.business.isActive) {
      console.warn('[Razorpay Backend Stage 2] Store is inactive or closed:', {
        orderNumber,
        businessSlug: order.business?.slug,
      });
      return NextResponse.json(
        {
          error: `The store "${order.business?.name || 'Unknown'}" is currently inactive or closed for orders`,
          code: 'STORE_INACTIVE',
        },
        { status: 400 }
      );
    }

    // Eligibility check: Already paid
    if (order.paymentStatus === PaymentStatus.PAID) {
      console.log('[Razorpay Backend Stage 2] Order is already marked as PAID:', orderNumber);
      return NextResponse.json({
        success: true,
        alreadyPaid: true,
        paymentStatus: PaymentStatus.PAID,
        orderNumber: order.orderNumber,
        message: 'Order is already paid',
      });
    }

    // Eligibility check: Terminal non-payable states
    if (
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.REJECTED ||
      order.status === OrderStatus.EXPIRED
    ) {
      console.warn('[Razorpay Backend Stage 2] Order in terminal state cannot accept payment:', {
        orderNumber,
        status: order.status,
      });
      return NextResponse.json(
        {
          error: `Order #${orderNumber} is marked as ${order.status.toLowerCase()} and cannot accept payment`,
          code: 'ORDER_TERMINAL',
        },
        { status: 400 }
      );
    }

    // Expiry date check
    if (order.expiresAt && new Date(order.expiresAt) < new Date()) {
      console.warn('[Razorpay Backend Stage 2] Order has expired:', {
        orderNumber,
        expiresAt: order.expiresAt,
      });
      return NextResponse.json(
        {
          error: `Order #${orderNumber} has expired. Please initiate a new order from the store.`,
          code: 'ORDER_EXPIRED',
        },
        { status: 400 }
      );
    }

    // Amount validation
    const totalAmount = Number(order.totalAmount);
    if (isNaN(totalAmount) || totalAmount <= 0) {
      console.error('[Razorpay Backend Stage 2] Invalid order total amount:', {
        orderNumber,
        totalAmount: order.totalAmount,
      });
      return NextResponse.json(
        { error: 'Order payable amount is invalid or zero', code: 'INVALID_AMOUNT' },
        { status: 400 }
      );
    }

    const amountInPaise = Math.round(totalAmount * 100);
    if (amountInPaise < 100) {
      console.error('[Razorpay Backend Stage 2] Amount in paise below minimum threshold (100 paise):', {
        orderNumber,
        amountInPaise,
      });
      return NextResponse.json(
        {
          error: 'Razorpay UPI requires a minimum payable amount of ₹1.00 (100 paise)',
          code: 'AMOUNT_TOO_LOW',
        },
        { status: 400 }
      );
    }

    console.log('[Razorpay Backend Stage 2] Order validated successfully:', {
      orderNumber: order.orderNumber,
      businessId: order.businessId,
      businessSlug: order.business.slug,
      totalAmount,
      amountInPaise,
      status: order.status,
      paymentStatus: order.paymentStatus,
    });

    // Stage 3: Razorpay client initialized (verifies env credentials)
    const rzp = getRazorpayClient();

    let validRzpOrderId = order.razorpayOrderId;

    // Stage 4: Check existing Razorpay order ID or create fresh authentic order
    if (validRzpOrderId) {
      try {
        console.log('[Razorpay Backend Stage 4] Fetching existing Razorpay order:', { validRzpOrderId });
        const existing = await rzp.orders.fetch(validRzpOrderId);
        console.log('[Razorpay Backend Stage 5] Existing Razorpay order response received:', {
          orderId: existing.id,
          status: existing.status,
          amount: existing.amount,
        });

        if (existing.status === 'paid') {
          // Already paid on Razorpay
          return NextResponse.json({
            success: true,
            alreadyPaid: true,
            paymentStatus: PaymentStatus.PAID,
            orderNumber: order.orderNumber,
            message: 'Order has already been paid on Razorpay',
          });
        }
      } catch (fetchErr: unknown) {
        const fetchErrInfo = extractRazorpayErrorInfo(fetchErr);

        if (fetchErrInfo.isAuthError) {
          // Auth errors must NOT be swallowed as a missing order ID
          console.error('[Razorpay Backend Stage 4 Error] Authentication failed while fetching order from Razorpay:', {
            orderId: validRzpOrderId,
            error: fetchErrInfo.errorMessage,
          });
          throw fetchErr;
        }

        console.warn('[Razorpay Backend Stage 4] Existing Razorpay order ID invalid or unreachable, creating fresh order:', {
          oldOrderId: validRzpOrderId,
          statusCode: fetchErrInfo.statusCode,
          error: fetchErrInfo.errorMessage,
        });
        validRzpOrderId = null;
      }
    }

    if (!validRzpOrderId) {
      // Create authentic Razorpay order via SDK
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

      // Persist authentic Razorpay order ID to PostgreSQL
      await prisma.order.update({
        where: { id: order.id },
        data: { razorpayOrderId: validRzpOrderId },
      });

      console.log('[Razorpay Backend Stage 5] Fresh Razorpay order linked to PostgreSQL order:', {
        orderNumber: order.orderNumber,
        razorpayOrderId: validRzpOrderId,
      });
    }

    const keyId = (process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '').trim();

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
    const errorInfo = extractRazorpayErrorInfo(err);

    console.error('[Razorpay Backend Error] Exception during payment preparation:', {
      orderNumber,
      statusCode: errorInfo.statusCode,
      errorCode: errorInfo.errorCode,
      message: errorInfo.errorMessage,
      stack: errorInfo.stack || (err instanceof Error ? err.stack : undefined),
    });

    return NextResponse.json(
      {
        error: errorInfo.errorMessage,
        code: errorInfo.errorCode || (errorInfo.isAuthError ? 'AUTH_FAILED' : 'ORDER_PREPARATION_FAILED'),
      },
      { status: errorInfo.statusCode }
    );
  }
}
