import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Edge-compatible JWT claims decoder
 * Parses the base64url payload without external crypto dependencies
 */
function getJwtClaims(token: string): { role?: string; merchantStatus?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload);
    return {
      role: parsed.role || null,
      merchantStatus: parsed.merchantStatus || null,
    };
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('zyven_auth_token')?.value;
  const claims = token ? getJwtClaims(token) : null;
  const role = claims?.role;
  const merchantStatus = claims?.merchantStatus;

  // 1. Protect Super Admin routes (/admin/*)
  if (pathname.startsWith('/admin')) {
    if (!token) {
      const url = new URL('/login', request.url);
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }

    if (role !== 'SUPER_ADMIN') {
      if (role === 'MERCHANT') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      return NextResponse.redirect(new URL('/account', request.url));
    }
  }

  // 2. Protect Merchant Dashboard routes (/dashboard/*)
  if (pathname.startsWith('/dashboard')) {
    if (!token) {
      const url = new URL('/login', request.url);
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }

    // Customers must not access merchant business dashboards
    if (role === 'CUSTOMER') {
      return NextResponse.redirect(new URL('/account', request.url));
    }

    // Subscription-Gated Activation Check for Merchants
    if (role === 'MERCHANT' && merchantStatus && merchantStatus !== 'ACTIVE') {
      if (merchantStatus === 'REGISTERED') {
        return NextResponse.redirect(new URL('/onboarding/plan', request.url));
      }
      if (merchantStatus === 'PLAN_SELECTED' || merchantStatus === 'PAYMENT_PENDING') {
        return NextResponse.redirect(new URL('/onboarding/checkout', request.url));
      }
      if (merchantStatus === 'PAYMENT_FAILED') {
        return NextResponse.redirect(new URL('/onboarding/checkout?status=failed', request.url));
      }
      if (merchantStatus === 'SUSPENDED') {
        return NextResponse.redirect(new URL('/onboarding/suspended', request.url));
      }
      return NextResponse.redirect(new URL('/onboarding/plan', request.url));
    }
  }

  // 3. Protect Merchant Onboarding routes (/onboarding/*)
  if (pathname.startsWith('/onboarding')) {
    if (!token) {
      const url = new URL('/login', request.url);
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }

    if (role === 'CUSTOMER') {
      return NextResponse.redirect(new URL('/account', request.url));
    }

    if (role === 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }

    // If merchant is already ACTIVE, send them straight to their dashboard
    if (role === 'MERCHANT' && merchantStatus === 'ACTIVE') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // 4. Protect Customer Account routes (/account/*)
  if (pathname.startsWith('/account')) {
    if (!token) {
      const url = new URL('/login', request.url);
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/account/:path*', '/onboarding/:path*'],
};
