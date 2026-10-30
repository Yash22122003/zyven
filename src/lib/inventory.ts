import { Prisma, MovementType } from '@prisma/client';
import { prisma } from './db';

export interface CartItemInput {
  productId: string;
  quantity: number;
}

export interface InventoryCheckResult {
  success: boolean;
  error?: string;
  failedProductId?: string;
}

/**
 * Atomically validates available stock and reserves it inside a Prisma transaction.
 * Uses PostgreSQL row-level locks (FOR UPDATE) to prevent overselling under concurrent checkouts.
 */
export async function validateAndReserveStock(
  tx: Prisma.TransactionClient,
  businessId: string,
  items: CartItemInput[],
  orderNumber: string
): Promise<InventoryCheckResult> {
  for (const item of items) {
    if (item.quantity <= 0) {
      return { success: false, error: 'Quantity must be at least 1' };
    }

    // Acquire exclusive row lock on the inventory record for this product
    const inventoryRows = await tx.$queryRaw<
      Array<{
        id: string;
        productId: string;
        quantityOnHand: number;
        quantityReserved: number;
      }>
    >`
      SELECT id, "productId", "quantityOnHand", "quantityReserved"
      FROM inventory
      WHERE "productId" = ${item.productId} AND "businessId" = ${businessId}
      FOR UPDATE;
    `;

    if (!inventoryRows || inventoryRows.length === 0) {
      return {
        success: false,
        error: `Product inventory record not found`,
        failedProductId: item.productId,
      };
    }

    const currentInv = inventoryRows[0];
    const available = currentInv.quantityOnHand - currentInv.quantityReserved;

    if (available < item.quantity) {
      return {
        success: false,
        error: `Insufficient stock for product. Available: ${Math.max(0, available)}, Requested: ${item.quantity}`,
        failedProductId: item.productId,
      };
    }

    // Reserve stock atomically
    await tx.inventory.update({
      where: { id: currentInv.id },
      data: {
        quantityReserved: { increment: item.quantity },
      },
    });

    // Record inventory movement
    await tx.inventoryMovement.create({
      data: {
        businessId,
        productId: item.productId,
        changeQuantity: item.quantity,
        newQuantityOnHand: currentInv.quantityOnHand,
        movementType: MovementType.ORDER_RESERVED,
        referenceId: orderNumber,
        reason: `Reserved for pickup order #${orderNumber}`,
      },
    });
  }

  return { success: true };
}

/**
 * Releases reserved stock back into available inventory when an order is cancelled/rejected/expired.
 */
export async function releaseReservedStock(
  tx: Prisma.TransactionClient,
  businessId: string,
  orderId: string,
  orderNumber: string
): Promise<void> {
  const items = await tx.orderItem.findMany({
    where: { orderId },
  });

  for (const item of items) {
    const inv = await tx.inventory.findUnique({
      where: { productId: item.productId },
    });

    if (inv) {
      const releaseQty = Math.min(inv.quantityReserved, item.quantity);
      await tx.inventory.update({
        where: { id: inv.id },
        data: {
          quantityReserved: { decrement: releaseQty },
        },
      });

      await tx.inventoryMovement.create({
        data: {
          businessId,
          productId: item.productId,
          changeQuantity: -releaseQty,
          newQuantityOnHand: inv.quantityOnHand,
          movementType: MovementType.ORDER_RELEASED,
          referenceId: orderNumber,
          reason: `Released reservation from order #${orderNumber}`,
        },
      });
    }
  }
}

/**
 * Deducts physical quantity on hand and clears reservation when an order is fulfilled (COLLECTED).
 */
export async function fulfillOrderStock(
  tx: Prisma.TransactionClient,
  businessId: string,
  orderId: string,
  orderNumber: string
): Promise<void> {
  const items = await tx.orderItem.findMany({
    where: { orderId },
  });

  for (const item of items) {
    const inv = await tx.inventory.findUnique({
      where: { productId: item.productId },
    });

    if (inv) {
      const fulfillQty = item.quantity;
      const newOnHand = Math.max(0, inv.quantityOnHand - fulfillQty);
      const newReserved = Math.max(0, inv.quantityReserved - fulfillQty);

      await tx.inventory.update({
        where: { id: inv.id },
        data: {
          quantityOnHand: newOnHand,
          quantityReserved: newReserved,
        },
      });

      await tx.inventoryMovement.create({
        data: {
          businessId,
          productId: item.productId,
          changeQuantity: -fulfillQty,
          newQuantityOnHand: newOnHand,
          movementType: MovementType.ORDER_FULFILLED,
          referenceId: orderNumber,
          reason: `Fulfilled pickup order #${orderNumber}`,
        },
      });
    }
  }
}

/**
 * Merchant manual adjustment of physical inventory.
 */
export async function adjustInventoryOnHand(
  businessId: string,
  productId: string,
  newOnHand: number,
  reason: string,
  actorId?: string
) {
  return prisma.$transaction(async (tx) => {
    const inv = await tx.inventory.findFirst({
      where: { businessId, productId },
    });

    if (!inv) {
      throw new Error('Inventory record not found for this product');
    }

    const delta = newOnHand - inv.quantityOnHand;

    const updated = await tx.inventory.update({
      where: { id: inv.id },
      data: { quantityOnHand: newOnHand },
    });

    await tx.inventoryMovement.create({
      data: {
        businessId,
        productId,
        actorId,
        changeQuantity: delta,
        newQuantityOnHand: newOnHand,
        movementType: MovementType.MANUAL_ADJUSTMENT,
        reason,
      },
    });

    return updated;
  });
}
