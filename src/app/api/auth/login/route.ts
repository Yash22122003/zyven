import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { comparePassword, signToken, setAuthCookie } from '@/lib/auth';
import { loginSchema } from '@/lib/validations';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid email or password format', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        businesses: {
          select: {
            id: true,
            name: true,
            slug: true,
            isVerified: true,
            isActive: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Your account has been deactivated. Contact support.' }, { status: 403 });
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      fullName: user.fullName,
    });

    await setAuthCookie(token);

    const defaultRedirect =
      user.role === 'SUPER_ADMIN'
        ? '/admin'
        : user.role === 'CUSTOMER'
        ? '/account'
        : '/dashboard';

    return NextResponse.json({
      success: true,
      redirectUrl: defaultRedirect,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        business: user.businesses[0] || null,
      },
    });
  } catch (err: unknown) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Internal server error during login' }, { status: 500 });
  }
}
