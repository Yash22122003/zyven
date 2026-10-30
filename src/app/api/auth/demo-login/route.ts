import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { signToken, setAuthCookie } from '@/lib/auth';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

function isDemoAllowed(): boolean {
  // Demo login is allowed only in local dev, controlled by ENABLE_DEMO_LOGIN (default false).
  // Force it OFF when NODE_ENV=production, even if set.
  if (process.env.NODE_ENV === 'production') return false;
  return process.env.ENABLE_DEMO_LOGIN === 'true';
}

export async function GET() {
  if (!isDemoAllowed()) {
    return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
  }

  return NextResponse.json({
    enabled: true,
    roles: [UserRole.CUSTOMER, UserRole.MERCHANT, UserRole.SUPER_ADMIN],
  });
}

export async function POST(req: NextRequest) {
  if (!isDemoAllowed()) {
    return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
  }

  try {
    const { role } = await req.json();

    if (!role || !Object.values(UserRole).includes(role)) {
      return NextResponse.json({ error: 'Invalid demo role requested' }, { status: 400 });
    }

    // Find first active user with this role
    const demoUser = await prisma.user.findFirst({
      where: { role, isActive: true },
      include: {
        businesses: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!demoUser) {
      return NextResponse.json({ error: `No active ${role} user available for demo` }, { status: 404 });
    }

    const token = signToken({
      userId: demoUser.id,
      email: demoUser.email,
      phone: demoUser.phone,
      role: demoUser.role,
      fullName: demoUser.fullName,
    });

    await setAuthCookie(token);

    let redirectUrl = '/account';
    if (demoUser.role === UserRole.SUPER_ADMIN) {
      redirectUrl = '/admin';
    } else if (demoUser.role === UserRole.MERCHANT) {
      const biz = demoUser.businesses[0];
      if (!biz || biz.status !== 'ACTIVE') {
        redirectUrl = '/onboarding/plan';
      } else {
        redirectUrl = '/dashboard';
      }
    }

    return NextResponse.json({
      success: true,
      role: demoUser.role,
      redirectUrl,
    });
  } catch (err: unknown) {
    console.error('Demo login error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
