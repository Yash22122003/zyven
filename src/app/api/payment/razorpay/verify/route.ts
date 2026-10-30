import { NextRequest, NextResponse } from 'next/server';
import { verifyPaymentSignature, markOrderAsPaidAndCompleted } from '@/lib/razorpay';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      orderNumber,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = body;

    if (!razorpay_payment_id || !razorpay_order_id) {
      return NextResponse.json(
        { error: 'Missing required Razorpay payment parameters' },
        { status: 400 }
      );
    }

    // Verify cryptographic signature
    const isValid = verifyPaymentSignature({
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature || '',
    });

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid Razorpay payment signature' },
        { status: 400 }
      );
    }

    // Idempotently mark order as paid & completed
    const result = await markOrderAsPaidAndCompleted({
      orderNumber,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      source: 'CALLBACK',
    });

    return NextResponse.json({
      success: true,
      alreadyPaid: result.alreadyPaid,
      orderNumber: result.order.orderNumber,
      paymentStatus: 'PAID',
      paymentId: razorpay_payment_id,
    });
  } catch (err: unknown) {
    console.error('Razorpay verify error:', err);
    const message = err instanceof Error ? err.message : 'Payment verification failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
