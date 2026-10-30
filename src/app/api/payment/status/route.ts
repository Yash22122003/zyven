import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderNumber = searchParams.get('orderNumber');
    const orderId = searchParams.get('orderId');
    const razorpayOrderId = searchParams.get('razorpayOrderId');

    if (!orderNumber && !orderId && !razorpayOrderId) {
      return NextResponse.json({ error: 'Order identifier required' }, { status: 400 });
    }

    const order = await prisma.order.findFirst({
      where: {
        OR: [
          ...(orderNumber ? [{ orderNumber }] : []),
          ...(orderId ? [{ id: orderId }] : []),
          ...(razorpayOrderId ? [{ razorpayOrderId }] : []),
        ],
      },
      include: {
        business: {
          select: {
            slug: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      razorpayPaymentId: order.razorpayPaymentId,
      razorpayOrderId: order.razorpayOrderId,
      trackingUrl: `/${order.business.slug}/orders/${order.orderNumber}`,
    });
  } catch (err: unknown) {
    console.error('Payment status error:', err);
    return NextResponse.json({ error: 'Failed to retrieve payment status' }, { status: 500 });
  }
}
