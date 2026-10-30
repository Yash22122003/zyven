import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword, signToken, setAuthCookie } from '@/lib/auth';
import { registerSchema, customerRegisterSchema } from '@/lib/validations';
import { slugify } from '@/lib/utils';
import { isValidSlug } from '@/lib/reserved-slugs';
import { UserRole, MerchantStatus } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 0. Super Admin accounts can NEVER be registered via public registration
    if (body.role === 'SUPER_ADMIN' || body.role === UserRole.SUPER_ADMIN) {
      return NextResponse.json(
        { error: 'Public registration for Super Admin accounts is strictly forbidden.' },
        { status: 403 }
      );
    }

    // 1. Handle Customer Registration (no store / business creation needed)
    if (body.role === 'CUSTOMER' || (!body.businessName && !body.categorySlug)) {
      const parsed = customerRegisterSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid registration details', details: parsed.error.format() },
          { status: 400 }
        );
      }

      const { fullName, email, phone, password } = parsed.data;

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

      const hashedPassword = await hashPassword(password);

      const newUser = await prisma.user.create({
        data: {
          fullName,
          email: email.toLowerCase(),
          phone,
          passwordHash: hashedPassword,
          role: UserRole.CUSTOMER,
        },
      });

      const token = signToken({
        userId: newUser.id,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        fullName: newUser.fullName,
      });

      await setAuthCookie(token);

      return NextResponse.json({
        success: true,
        user: {
          id: newUser.id,
          email: newUser.email,
          fullName: newUser.fullName,
          role: newUser.role,
          business: null,
        },
      });
    }

    // 2. Handle Merchant / Store Owner Registration
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
          isVerified: false,
          isActive: false, // Inactive until subscription payment verified
          status: MerchantStatus.REGISTERED,
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

      // Audit log entry for registration
      await tx.auditLog.create({
        data: {
          actorId: newUser.id,
          businessId: newBusiness.id,
          action: 'MERCHANT_REGISTERED',
          entityType: 'BUSINESS',
          entityId: newBusiness.id,
          metadataJson: {
            status: MerchantStatus.REGISTERED,
            businessName,
            slug: generatedSlug,
          },
        },
      });

      return { user: newUser, business: newBusiness };
    });

    const token = signToken({
      userId: result.user.id,
      email: result.user.email,
      phone: result.user.phone,
      role: result.user.role,
      fullName: result.user.fullName,
      merchantStatus: MerchantStatus.REGISTERED,
    });

    await setAuthCookie(token);

    return NextResponse.json({
      success: true,
      message: 'Business registered successfully on ZYVEN. Please select a subscription plan to activate.',
      redirectUrl: '/onboarding/plan',
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.fullName,
        role: result.user.role,
        merchantStatus: MerchantStatus.REGISTERED,
        business: {
          id: result.business.id,
          name: result.business.name,
          slug: result.business.slug,
          status: result.business.status,
        },
      },
    });
  } catch (err: unknown) {
    console.error('Registration error:', err);
    return NextResponse.json({ error: 'Internal server error during registration' }, { status: 500 });
  }
}
