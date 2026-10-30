'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Footer() {
  const pathname = usePathname();

  // Hide on dashboard and admin layouts
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <footer className="border-t border-zinc-200 bg-white py-12 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-zinc-500">
        <div className="flex flex-col items-center md:items-start gap-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-950 tracking-tight">ZYVEN</span>
            <span className="text-zinc-300">•</span>
            <span className="text-zinc-600 font-medium">zyven.me</span>
          </div>
          <p className="text-zinc-600">Local Businesses. Digital Possibilities.</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-zinc-600 font-medium">
          <Link href="/explore" className="hover:text-zinc-950 transition-colors">
            Discover Shops
          </Link>
          <Link href="/sharma-store" className="hover:text-zinc-950 transition-colors">
            Sharma Store (Demo)
          </Link>
          <Link href="/fashion-hub" className="hover:text-zinc-950 transition-colors">
            Fashion Hub
          </Link>
          <Link href="/mobile-world" className="hover:text-zinc-950 transition-colors">
            Mobile World
          </Link>
          <Link href="/register" className="hover:text-zinc-950 transition-colors">
            SaaS Onboarding (₹1/mo)
          </Link>
          <Link href="/login" className="hover:text-zinc-950 transition-colors">
            Seller Login
          </Link>
        </div>

        <div className="text-zinc-600 text-center md:text-right">
          © {new Date().getFullYear()} ZYVEN Inc. All rights reserved. Built for local commerce.
        </div>
      </div>
    </footer>
  );
}
