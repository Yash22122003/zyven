import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Edge-compatible JWT role decoder
 * Parses the base64url payload without external crypto dependencies
 */
function getJwtRole(token: string): string | null {
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
    return parsed.role || null;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('zyven_auth_token')?.value;
  const role = token ? getJwtRole(token) : null;

  // 1. Protect Super Admin routes (/admin/*)
  if (pathname.startsWith('/admin')) {
    if (!token) {
      const url = new URL('/login', request.url);
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }

    if (role !== 'SUPER_ADMIN') {
      // Unauthorized role redirection
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
  }

  // 3. Protect Customer Account routes (/account/*)
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
  matcher: ['/dashboard/:path*', '/admin/:path*', '/account/:path*'],
};
