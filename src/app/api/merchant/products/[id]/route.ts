import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireMerchant } from '@/lib/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { businessId } = await requireMerchant();
    const productId = params.id;
    const body = await req.json();

    // Verify product belongs to this business (Tenant Isolation)
    const existing = await prisma.product.findFirst({
      where: { id: productId, businessId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Product not found or access denied' }, { status: 404 });
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        name: body.name !== undefined ? body.name : undefined,
        description: body.description !== undefined ? body.description : undefined,
        price: body.price !== undefined ? body.price : undefined,
        compareAtPrice: body.compareAtPrice !== undefined ? body.compareAtPrice : undefined,
        sku: body.sku !== undefined ? body.sku : undefined,
        imageUrl: body.imageUrl !== undefined ? body.imageUrl : undefined,
        isActive: body.isActive !== undefined ? body.isActive : undefined,
        categoryId: body.categoryId !== undefined ? body.categoryId : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      product: {
        id: updated.id,
        name: updated.name,
        price: Number(updated.price),
        isActive: updated.isActive,
      },
    });
  } catch (err: unknown) {
    console.error('Update product error:', err);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 400 });
  }
}
