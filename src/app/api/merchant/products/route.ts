import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireMerchant } from '@/lib/auth';
import { productSchema } from '@/lib/validations';
import { slugify } from '@/lib/utils';
import { MovementType } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { businessId } = await requireMerchant();

    const products = await prisma.product.findMany({
      where: { businessId },
      include: {
        inventory: true,
        category: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        sku: p.sku,
        barcode: p.barcode,
        price: Number(p.price),
        compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
        imageUrl: p.imageUrl,
        isActive: p.isActive,
        category: p.category ? { id: p.category.id, name: p.category.name } : null,
        inventory: p.inventory
          ? {
              quantityOnHand: p.inventory.quantityOnHand,
              quantityReserved: p.inventory.quantityReserved,
              available: Math.max(0, p.inventory.quantityOnHand - p.inventory.quantityReserved),
              lowStockThreshold: p.inventory.lowStockThreshold,
            }
          : null,
        createdAt: p.createdAt,
      })),
    });
  } catch (err: unknown) {
    console.error('Merchant products error:', err);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 403 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, businessId } = await requireMerchant();
    const body = await req.json();
    const parsed = productSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid product details', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const {
      name,
      description,
      sku,
      price,
      compareAtPrice,
      imageUrl,
      categoryId,
      isActive,
      initialStock,
      lowStockThreshold,
    } = parsed.data;

    let productSlug = slugify(name);
    // Ensure slug unique per business
    const existing = await prisma.product.findUnique({
      where: {
        businessId_slug: {
          businessId,
          slug: productSlug,
        },
      },
    });

    if (existing) {
      productSlug = `${productSlug}-${Math.floor(100 + Math.random() * 900)}`;
    }

    const created = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          businessId,
          categoryId: categoryId || null,
          name,
          slug: productSlug,
          description: description || null,
          sku: sku || null,
          price,
          compareAtPrice: compareAtPrice || null,
          imageUrl: imageUrl || null,
          isActive,
        },
      });

      const inv = await tx.inventory.create({
        data: {
          businessId,
          productId: product.id,
          quantityOnHand: initialStock,
          quantityReserved: 0,
          lowStockThreshold,
        },
      });

      if (initialStock > 0) {
        await tx.inventoryMovement.create({
          data: {
            businessId,
            productId: product.id,
            actorId: user.userId,
            changeQuantity: initialStock,
            newQuantityOnHand: initialStock,
            movementType: MovementType.INITIAL_STOCK,
            reason: 'Initial stock on product creation',
          },
        });
      }

      return { product, inventory: inv };
    });

    return NextResponse.json({
      success: true,
      product: {
        id: created.product.id,
        name: created.product.name,
        slug: created.product.slug,
        price: Number(created.product.price),
        inventory: created.inventory,
      },
    });
  } catch (err: unknown) {
    console.error('Create product error:', err);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 400 });
  }
}
