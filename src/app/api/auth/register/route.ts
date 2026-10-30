import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword, signToken, setAuthCookie } from '@/lib/auth';
import { registerSchema } from '@/lib/validations';
import { slugify } from '@/lib/utils';
import { isValidSlug } from '@/lib/reserved-slugs';
import { UserRole, SubscriptionStatus } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid registration details', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const {
      fullName,
      email,
      phone,
      password,
      businessName,
      categorySlug,
      city,
      state,
      address,
      pincode,
    } = parsed.data;

    // Check existing user
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: email.toLowerCase() }, { phone }],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email or phone number already exists' },
        { status: 409 }
      );
    }

    // Generate and validate slug
    let generatedSlug = slugify(businessName);
    const slugCheck = isValidSlug(generatedSlug);
    if (!slugCheck.valid) {
      generatedSlug = `${generatedSlug}-${Math.floor(100 + Math.random() * 900)}`;
    }

    // Ensure uniqueness
    const existingBusiness = await prisma.business.findUnique({
      where: { slug: generatedSlug },
    });
    if (existingBusiness) {
      generatedSlug = `${generatedSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // Lookup category
    const category = await prisma.category.findUnique({
      where: { slug: categorySlug },
    });
    if (!category) {
      return NextResponse.json({ error: 'Selected business category not found' }, { status: 400 });
    }

    // Lookup introductory plan
    const introPlan = await prisma.subscriptionPlan.findUnique({
      where: { code: 'INTRO_PROMO' },
    });

    const hashedPassword = await hashPassword(password);

    // Create user and business in transaction
    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          fullName,
          email: email.toLowerCase(),
          phone,
          passwordHash: hashedPassword,
          role: UserRole.MERCHANT,
        },
      });

      const newBusiness = await tx.business.create({
        data: {
          ownerId: newUser.id,
          categoryId: category.id,
          name: businessName,
          slug: generatedSlug,
          phone,
          email: email.toLowerCase(),
          addressLine1: address,
          city,
          state,
          pincode,
          isVerified: true, // Default verified for pilot or toggleable
          isActive: true,
          isOpenManually: true,
          estimatedPrepTimeMinutes: 20,
        },
      });

      // Default operating hours Mon-Sun 09:00 - 21:00
      for (let day = 0; day <= 6; day++) {
        await tx.operatingHour.create({
          data: {
            businessId: newBusiness.id,
            dayOfWeek: day,
            openTime: '09:00',
            closeTime: '21:00',
            isClosed: false,
          },
        });
      }

      // Assign ₹1 introductory plan
      if (introPlan) {
        const now = new Date();
        const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        await tx.businessSubscription.create({
          data: {
            businessId: newBusiness.id,
            planId: introPlan.id,
            status: SubscriptionStatus.ACTIVE,
            startedAt: now,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            introMonthsConsumed: 1,
          },
        });
      }

      return { user: newUser, business: newBusiness };
    });

    const token = signToken({
      userId: result.user.id,
      email: result.user.email,
      phone: result.user.phone,
      role: result.user.role,
      fullName: result.user.fullName,
    });

    await setAuthCookie(token);

    return NextResponse.json({
      success: true,
      message: 'Business registered successfully on ZYVEN',
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.fullName,
        role: result.user.role,
        business: {
          id: result.business.id,
          name: result.business.name,
          slug: result.business.slug,
        },
      },
    });
  } catch (err: unknown) {
    console.error('Registration error:', err);
    return NextResponse.json({ error: 'Internal server error during registration' }, { status: 500 });
  }
}
