'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '../ui/button';
import { Store, User, LogOut, LayoutDashboard, Shield } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{
    fullName: string;
    role: string;
    business?: { slug: string; name: string } | null;
  } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.authenticated) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {});
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setCurrentUser(null);
    router.push('/');
    router.refresh();
  };

  // Hide global navbar on dashboard and admin layouts
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 bg-white/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-zinc-950 flex items-center justify-center text-white font-bold text-sm tracking-wider shadow-xs group-hover:scale-105 transition-transform">
            Z
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight text-zinc-950 leading-none">
              ZYVEN
            </span>
            <span className="text-[10px] text-zinc-600 font-medium tracking-tight">
              zyven.me
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-600">
          <Link href="/explore" className="hover:text-zinc-950 transition-colors">
            Explore Stores
          </Link>
          <Link href="/sharma-store" className="hover:text-zinc-950 transition-colors">
            Demo Store
          </Link>
          <a
            href="#pricing"
            onClick={(e) => {
              if (pathname !== '/') {
                e.preventDefault();
                router.push('/#pricing');
              }
            }}
            className="hover:text-zinc-950 transition-colors"
          >
            Pricing (₹1/mo)
          </a>
        </nav>

        {/* User CTA actions */}
        <div className="flex items-center gap-2.5">
          {currentUser ? (
            <div className="flex items-center gap-2">
              {currentUser.role === 'SUPER_ADMIN' ? (
                <Link href="/admin">
                  <Button variant="secondary" size="sm" className="gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-zinc-700" />
                    Admin Console
                  </Button>
                </Link>
              ) : (
                <Link href="/dashboard">
                  <Button variant="secondary" size="sm" className="gap-1.5">
                    <LayoutDashboard className="w-3.5 h-3.5 text-zinc-700" />
                    Seller Dashboard
                  </Button>
                </Link>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-zinc-500 hover:text-zinc-900"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="primary" size="sm" className="gap-1.5">
                  <Store className="w-3.5 h-3.5" />
                  Open Store (₹1)
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
