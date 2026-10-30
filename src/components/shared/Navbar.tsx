'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCart } from '@/hooks/useCart';
import { Button } from '../ui/button';
import { Store, User, LogOut, LayoutDashboard, Shield, ShoppingBag, PackageCheck } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { totalCount, toggleCart } = useCart();
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
        } else {
          setCurrentUser(null);
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
          {!currentUser && (
            <Link
              href="/login?role=merchant"
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 border border-zinc-200/80 rounded-md px-2.5 py-1 transition-colors"
            >
              Merchant Portal
            </Link>
          )}
        </nav>

        {/* User CTA actions & Cart */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Universal Cart Trigger Button */}
          <button
            onClick={toggleCart}
            className="relative p-2 rounded-xl text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 transition-colors flex items-center justify-center"
            aria-label="View shopping cart"
          >
            <ShoppingBag className="w-5 h-5" />
            {totalCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-zinc-950 text-white text-[11px] font-bold flex items-center justify-center shadow-xs animate-scale-in">
                {totalCount}
              </span>
            )}
          </button>

          {currentUser ? (
            <div className="flex items-center gap-2">
              {currentUser.role === 'SUPER_ADMIN' ? (
                <Link href="/admin">
                  <Button variant="secondary" size="sm" className="gap-1.5 border-purple-200 bg-purple-50 text-purple-900 hover:bg-purple-100">
                    <Shield className="w-3.5 h-3.5 text-purple-700" />
                    <span className="font-semibold text-xs">Super Admin</span>
                  </Button>
                </Link>
              ) : currentUser.role === 'CUSTOMER' ? (
                <div className="flex items-center gap-1.5">
                  <Link href="/account">
                    <Button variant="secondary" size="sm" className="gap-1.5 border-blue-200 bg-blue-50/80 text-blue-900 hover:bg-blue-100">
                      <User className="w-3.5 h-3.5 text-blue-700" />
                      <span className="text-xs font-semibold truncate max-w-[120px]">
                        {currentUser.fullName ? currentUser.fullName.split(' ')[0] : 'Account'}
                      </span>
                      <span className="hidden sm:inline text-[10px] font-normal text-blue-600 bg-blue-100/80 px-1.5 py-0.2 rounded-full">
                        Customer
                      </span>
                    </Button>
                  </Link>
                  <Link href="/account/orders" className="hidden sm:inline-block">
                    <Button variant="ghost" size="sm" className="text-xs text-zinc-600 hover:text-zinc-950 gap-1 px-2">
                      <PackageCheck className="w-3.5 h-3.5" />
                      <span>Orders</span>
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Link href="/dashboard">
                    <Button variant="secondary" size="sm" className="gap-1.5 border-emerald-200 bg-emerald-50/80 text-emerald-900 hover:bg-emerald-100">
                      <LayoutDashboard className="w-3.5 h-3.5 text-emerald-700" />
                      <span className="text-xs font-semibold truncate max-w-[130px]">
                        {currentUser.business?.name || 'Seller Dashboard'}
                      </span>
                      <span className="hidden sm:inline text-[10px] font-normal text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded-full">
                        Merchant
                      </span>
                    </Button>
                  </Link>
                  {currentUser.business?.slug && (
                    <Link
                      href={`/${currentUser.business.slug}`}
                      className="hidden md:inline-flex text-xs text-zinc-500 hover:text-zinc-900 font-mono items-center gap-1 px-2 py-1 rounded hover:bg-zinc-100 transition-colors"
                      title="View live storefront"
                    >
                      <span>Storefront</span>
                    </Link>
                  )}
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-zinc-400 hover:text-zinc-900 px-2"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-xs font-medium">
                  Sign in
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="primary" size="sm" className="gap-1.5 text-xs font-medium">
                  <Store className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Open Store (₹1)</span>
                  <span className="sm:hidden">Join</span>
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
