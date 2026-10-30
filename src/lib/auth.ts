import { cookies } from 'next/headers';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import { prisma } from './db';
import { UserRole, MerchantStatus } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'zyven-production-fallback-key-2026';
export const AUTH_COOKIE_NAME = 'zyven_auth_token';

export interface TokenPayload {
  userId: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  fullName: string;
  merchantStatus?: MerchantStatus | null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export async function setAuthCookie(token: string) {
  const cookieStore = cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}

export async function clearAuthCookie() {
  const cookieStore = cookies();
  cookieStore.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export async function getCurrentUser(): Promise<TokenPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireAuth(): Promise<TokenPayload> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}

export function getOnboardingRedirectUrl(status: MerchantStatus): string {
  switch (status) {
    case MerchantStatus.REGISTERED:
      return '/onboarding/plan';
    case MerchantStatus.PLAN_SELECTED:
    case MerchantStatus.PAYMENT_PENDING:
      return '/onboarding/checkout';
    case MerchantStatus.PAYMENT_FAILED:
      return '/onboarding/checkout?status=failed';
    case MerchantStatus.SUSPENDED:
      return '/onboarding/suspended';
    case MerchantStatus.EXPIRED:
      return '/onboarding/plan?expired=true';
    case MerchantStatus.ACTIVE:
    default:
      return '/dashboard';
  }
}

export async function requireMerchant(): Promise<{
  user: TokenPayload;
  businessId: string;
  status: MerchantStatus;
}> {
  const user = await requireAuth();
  if (user.role !== UserRole.MERCHANT && user.role !== UserRole.SUPER_ADMIN) {
    throw new Error('FORBIDDEN_NOT_MERCHANT');
  }

  // Find the primary business owned by this merchant
  const business = await prisma.business.findFirst({
    where: { ownerId: user.userId },
    select: { id: true, isActive: true, status: true },
  });

  if (!business) {
    throw new Error('NO_BUSINESS_ATTACHED');
  }

  // Only ACTIVE status merchants get access to business operations
  if (user.role !== UserRole.SUPER_ADMIN && business.status !== MerchantStatus.ACTIVE) {
    throw new Error(`INACTIVE_MERCHANT:${business.status}`);
  }

  return { user, businessId: business.id, status: business.status };
}

export async function requireSuperAdmin(): Promise<TokenPayload> {
  const user = await requireAuth();
  if (user.role !== UserRole.SUPER_ADMIN) {
    throw new Error('FORBIDDEN_NOT_ADMIN');
  }
  return user;
}
