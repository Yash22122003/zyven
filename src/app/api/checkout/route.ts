import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createRazorpayOrder, extractRazorpayErrorInfo } from '@/lib/razorpay';
import { checkoutSchema } from '@/lib/validations';
import { validateAndReserveStock } from '@/lib/inventory';
import { generateOrderNumber } from '@/lib/utils';
import { OrderStatus, PaymentMethod, PaymentStatus, NotificationType } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid checkout payload', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const {
      businessSlug,
      customerName,
      customerPhone,
      customerEmail,
      paymentMethod,
      upiTransactionRef,
      pickupNotes,
      items,
    } = parsed.data;

    console.log('[Razorpay Backend] Payment request received at /api/checkout:', {
      businessSlug,
      customerName,
      itemsCount: items.length,
      paymentMethod,
    });

    // Verify business exists and is active
    const business = await prisma.business.findUnique({
      where: { slug: businessSlug.toLowerCase() },
      include: { owner: true },
    });

    if (!business || !business.isActive) {
      return NextResponse.json({ error: 'This business is currently unavailable for orders' }, { status: 400 });
    }

    const productIds = items.map((i) => i.productId);

    // Fetch products belonging to this business
    const dbProducts = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        businessId: business.id,
        isActive: true,
      },
    });

    if (dbProducts.length !== items.length) {
      return NextResponse.json(
        { error: 'One or more items are invalid or belong to a different store' },
        { status: 400 }
      );
    }

    // Build product map for price and name snapshots
    const productMap = new Map(dbProducts.map((p) => [p.id, p]));
    let subtotal = 0;
    const orderItemsData = items.map((item) => {
      const prod = productMap.get(item.productId)!;
      const unitPrice = Number(prod.price);
      const totalItemPrice = unitPrice * item.quantity;
      subtotal += totalItemPrice;
      return {
        productId: prod.id,
        productName: prod.name,
        productSku: prod.sku,
        unitPrice,
        quantity: item.quantity,
        totalPrice: totalItemPrice,
      };
    });

    const taxAmount = 0.00;
    const totalAmount = subtotal + taxAmount;
    const orderNumber = generateOrderNumber();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 mins expiry

    // Lookup logged in user or matching customer account
    const currentUser = await getCurrentUser();
    let customerId = currentUser?.userId || null;

    if (!customerId) {
      const matchedUser = await prisma.user.findFirst({
        where: {
          OR: [
            ...(customerEmail ? [{ email: customerEmail.toLowerCase() }] : []),
            { phone: customerPhone },
          ],
        },
        select: { id: true },
      });
      if (matchedUser) {
        customerId = matchedUser.id;
      }
    }

    // Create Razorpay Order with locked amount in paise
    const amountInPaise = Math.round(totalAmount * 100);
    const rzpOrder = await createRazorpayOrder({
      amountInPaise,
      currency: 'INR',
      receipt: orderNumber,
      notes: {
        orderNumber,
        businessId: business.id,
        businessSlug: business.slug,
      },
    });

    // Run atomic stock reservation and order creation inside a transaction
    const createdOrder = await prisma.$transaction(async (tx) => {
      // 1. Validate and acquire atomic row lock on inventory
      const reservationResult = await validateAndReserveStock(
        tx,
        business.id,
        items,
        orderNumber
      );

      if (!reservationResult.success) {
        throw new Error(reservationResult.error || 'Stock validation failed');
      }

      // 2. Create Order record with Razorpay Order ID
      const order = await tx.order.create({
        data: {
          orderNumber,
          businessId: business.id,
          customerId,
          customerName,
          customerPhone,
          customerEmail: customerEmail || null,
          status: OrderStatus.PENDING,
          subtotal,
          taxAmount,
          totalAmount,
          paymentMethod: PaymentMethod.RAZORPAY_UPI,
          paymentStatus: PaymentStatus.PENDING,
          razorpayOrderId: rzpOrder.id,
          upiTransactionRef: null,
          pickupNotes: pickupNotes || null,
          expiresAt,
          items: {
            create: orderItemsData.map((i) => ({
              productId: i.productId,
              productName: i.productName,
              productSku: i.productSku,
              unitPrice: i.unitPrice,
              quantity: i.quantity,
              totalPrice: i.totalPrice,
            })),
          },
          statusHistory: {
            create: {
              fromStatus: null,
              toStatus: OrderStatus.PENDING,
              note: `Order placed with Razorpay UPI (Order: ${rzpOrder.id}). Stock atomically reserved.`,
            },
          },
        },
        include: {
          items: true,
        },
      });

      // 3. Create Notification for merchant
      await tx.notification.create({
        data: {
          recipientUserId: business.ownerId,
          businessId: business.id,
          title: `New Pickup Order #${orderNumber}`,
          message: `${customerName} initiated a pickup order for ₹${totalAmount.toFixed(2)} (${items.length} items). Awaiting payment confirmation.`,
          type: NotificationType.NEW_ORDER,
          link: `/dashboard/orders/${order.id}`,
        },
      });

      return order;
    });

    console.log('[Razorpay Backend] Order created and Razorpay payload prepared:', {
      orderNumber: createdOrder.orderNumber,
      razorpayOrderId: rzpOrder.id,
      amountInPaise: rzpOrder.amount,
      currency: rzpOrder.currency,
    });

    return NextResponse.json({
      success: true,
      orderNumber: createdOrder.orderNumber,
      orderId: createdOrder.id,
      totalAmount: Number(createdOrder.totalAmount),
      pickupInstructions: business.pickupInstructions,
      storeAddress: `${business.addressLine1}, ${business.city}`,
      trackingUrl: `/${business.slug}/orders/${createdOrder.orderNumber}`,
      razorpay: {
        keyId: process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
        orderId: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        name: business.name,
        description: `Order #${createdOrder.orderNumber}`,
      },
    });
  } catch (err: unknown) {
    const errInfo = extractRazorpayErrorInfo(err);
    console.error('[Razorpay Backend Error] Checkout failed:', {
      statusCode: errInfo.statusCode,
      errorCode: errInfo.errorCode,
      message: errInfo.errorMessage,
      stack: errInfo.stack || (err instanceof Error ? err.stack : undefined),
    });
    return NextResponse.json(
      { error: errInfo.errorMessage, code: errInfo.errorCode },
      { status: errInfo.statusCode >= 400 && errInfo.statusCode < 600 ? errInfo.statusCode : 500 }
    );
  }
}
