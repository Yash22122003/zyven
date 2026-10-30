import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireMerchant } from '@/lib/auth';
import { adjustInventoryOnHand } from '@/lib/inventory';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { businessId } = await requireMerchant();

    const items = await prisma.inventory.findMany({
      where: { businessId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            price: true,
            imageUrl: true,
            isActive: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const movements = await prisma.inventoryMovement.findMany({
      where: { businessId },
      include: {
        product: {
          select: { name: true, sku: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({
      inventory: items.map((inv) => ({
        id: inv.id,
        productId: inv.productId,
        productName: inv.product.name,
        sku: inv.product.sku,
        imageUrl: inv.product.imageUrl,
        price: Number(inv.product.price),
        isActive: inv.product.isActive,
        quantityOnHand: inv.quantityOnHand,
        quantityReserved: inv.quantityReserved,
        available: Math.max(0, inv.quantityOnHand - inv.quantityReserved),
        lowStockThreshold: inv.lowStockThreshold,
        isLowStock: (inv.quantityOnHand - inv.quantityReserved) <= inv.lowStockThreshold,
        updatedAt: inv.updatedAt,
      })),
      movements: movements.map((m) => ({
        id: m.id,
        productName: m.product.name,
        changeQuantity: m.changeQuantity,
        newQuantityOnHand: m.newQuantityOnHand,
        type: m.movementType,
        reason: m.reason,
        referenceId: m.referenceId,
        createdAt: m.createdAt,
      })),
    });
  } catch (err: unknown) {
    console.error('Inventory fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 403 });
  }
}

const adjustSchema = z.object({
  productId: z.string().uuid(),
  newOnHand: z.number().int().min(0, 'Quantity cannot be negative'),
  reason: z.string().min(2, 'Please provide a reason for adjustment'),
});

export async function POST(req: NextRequest) {
  try {
    const { user, businessId } = await requireMerchant();
    const body = await req.json();
    const parsed = adjustSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid adjustment payload', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { productId, newOnHand, reason } = parsed.data;

    const updated = await adjustInventoryOnHand(
      businessId,
      productId,
      newOnHand,
      reason,
      user.userId
    );

    return NextResponse.json({
      success: true,
      message: 'Inventory updated successfully',
      inventory: updated,
    });
  } catch (err: unknown) {
    console.error('Inventory adjust error:', err);
    const msg = err instanceof Error ? err.message : 'Adjustment failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
