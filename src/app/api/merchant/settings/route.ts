import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireMerchant } from '@/lib/auth';
import { storeSettingsSchema } from '@/lib/validations';
import { isValidSlug } from '@/lib/reserved-slugs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { businessId } = await requireMerchant();

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: {
        category: true,
        operatingHours: {
          orderBy: { dayOfWeek: 'asc' },
        },
      },
    });

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    return NextResponse.json({ business });
  } catch (err: unknown) {
    console.error('Settings fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 403 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { businessId } = await requireMerchant();
    const body = await req.json();

    const parsed = storeSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid settings input', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const current = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!current) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const {
      name,
      slug,
      description,
      phone,
      email,
      addressLine1,
      addressLine2,
      city,
      state,
      pincode,
      isOpenManually,
      stockDisplayMode,
      pickupInstructions,
      estimatedPrepTimeMinutes,
      upiId,
      upiName,
      enableUpiQr,
    } = parsed.data;

    // Check slug uniqueness if changed
    const targetSlug = slug.toLowerCase();
    if (targetSlug !== current.slug) {
      const slugCheck = isValidSlug(targetSlug);
      if (!slugCheck.valid) {
        return NextResponse.json({ error: slugCheck.error }, { status: 400 });
      }

      const existing = await prisma.business.findUnique({
        where: { slug: targetSlug },
      });

      if (existing && existing.id !== businessId) {
        return NextResponse.json(
          { error: `The storefront route "zyven.me/${targetSlug}" is already taken by another store.` },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.business.update({
      where: { id: businessId },
      data: {
        name,
        slug: targetSlug,
        description: description || null,
        phone,
        email: email || null,
        addressLine1,
        addressLine2: addressLine2 || null,
        city,
        state,
        pincode,
        isOpenManually,
        stockDisplayMode,
        pickupInstructions: pickupInstructions || null,
        estimatedPrepTimeMinutes,
        upiId: upiId ? upiId.trim() : null,
        upiName: upiName ? upiName.trim() : null,
        enableUpiQr: enableUpiQr ?? true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Store settings updated successfully',
      business: updated,
    });
  } catch (err: unknown) {
    console.error('Settings update error:', err);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 400 });
  }
}
