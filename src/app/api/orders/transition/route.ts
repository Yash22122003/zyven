import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { orderTransitionSchema } from '@/lib/validations';
import {
  canTransitionOrder,
  shouldReleaseStockOnTransition,
  shouldFulfillStockOnTransition,
} from '@/lib/order-machine';
import { releaseReservedStock, fulfillOrderStock } from '@/lib/inventory';
import { OrderStatus, UserRole, NotificationType } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const parsed = orderTransitionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid transition payload', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { orderId, toStatus, reason } = parsed.data;

    // Load order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        business: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Authorization: User must be Super Admin or the owner of this business
    if (user.role !== UserRole.SUPER_ADMIN && order.business.ownerId !== user.userId) {
      return NextResponse.json({ error: 'Unauthorized to modify this order' }, { status: 403 });
    }

    // Validate transition
    const isValidTransition = canTransitionOrder(order.status, toStatus as OrderStatus);
    if (!isValidTransition) {
      return NextResponse.json(
        {
          error: `Cannot transition order from status "${order.status}" to "${toStatus}"`,
        },
        { status: 400 }
      );
    }

    // Execute transition in database transaction
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Stock reconciliation
      if (shouldReleaseStockOnTransition(order.status, toStatus as OrderStatus)) {
        await releaseReservedStock(tx, order.businessId, order.id, order.orderNumber);
      } else if (shouldFulfillStockOnTransition(order.status, toStatus as OrderStatus)) {
        await fulfillOrderStock(tx, order.businessId, order.id, order.orderNumber);
      }

      // 2. Update order record
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: toStatus as OrderStatus,
          rejectionReason: toStatus === OrderStatus.REJECTED ? reason || 'Declined by merchant' : null,
          paymentStatus: toStatus === OrderStatus.COLLECTED ? 'PAID' : order.paymentStatus,
          updatedAt: new Date(),
        },
      });

      // 3. Record timeline history
      let defaultNote = `Status changed to ${toStatus}`;
      if (toStatus === OrderStatus.ACCEPTED) defaultNote = 'Order accepted by store. Preparation will begin shortly.';
      if (toStatus === OrderStatus.PREPARING) defaultNote = 'Store is packing the ordered items.';
      if (toStatus === OrderStatus.READY_FOR_PICKUP) defaultNote = 'Order is packed and ready for in-store pickup.';
      if (toStatus === OrderStatus.COLLECTED) defaultNote = 'Customer collected items and completed payment at store.';
      if (toStatus === OrderStatus.REJECTED) defaultNote = `Order rejected: ${reason || 'Item unavailable'}. Reserved stock released.`;
      if (toStatus === OrderStatus.CANCELLED) defaultNote = `Order cancelled: ${reason || 'Customer or merchant requested cancellation'}. Reserved stock released.`;

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus,
          actorId: user.userId,
          note: reason || defaultNote,
        },
      });

      return updatedOrder;
    });

    return NextResponse.json({
      success: true,
      message: `Order #${order.orderNumber} transitioned to ${toStatus}`,
      order: {
        id: updated.id,
        orderNumber: updated.orderNumber,
        status: updated.status,
      },
    });
  } catch (err: unknown) {
    console.error('Transition error:', err);
    const message = err instanceof Error ? err.message : 'Order transition failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
