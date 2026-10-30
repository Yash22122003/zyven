import { NextResponse } from 'next/server';
import { clearAuthCookie, getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST() {
  await clearAuthCookie();
  return NextResponse.json({ success: true, message: 'Logged out successfully' });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: {
      id: true,
      email: true,
      phone: true,
      fullName: true,
      role: true,
      businesses: {
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          isVerified: true,
        },
      },
    },
  });

  return NextResponse.json({
    authenticated: true,
    user: dbUser,
  });
}
