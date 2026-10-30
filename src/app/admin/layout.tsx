'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Shield,
  LayoutDashboard,
  Store,
  CreditCard,
  LogOut,
  ExternalLink,
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const navLinks = [
    { label: 'Platform Overview', href: '/admin', icon: LayoutDashboard },
    { label: 'Businesses & Governance', href: '/admin/businesses', icon: Store },
    { label: 'Subscription Plans', href: '/admin/plans', icon: CreditCard },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-zinc-50/50">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-zinc-950 text-white p-5 flex flex-col justify-between shrink-0 md:min-h-screen">
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-white text-zinc-950 flex items-center justify-center font-bold text-xs">
                Z
              </div>
              <span className="font-extrabold text-base tracking-tight">ZYVEN</span>
            </div>
            <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-1.5 pl-9">
              <Shield className="w-3 h-3 text-emerald-400" />
              <span>Super Admin Console</span>
            </div>
          </div>

          <nav className="space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-zinc-800 text-white font-semibold'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-zinc-800 flex items-center justify-between text-xs">
          <Link
            href="/"
            className="text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Public Site</span>
          </Link>

          <button
            onClick={handleLogout}
            className="text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main Admin Area */}
      <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full">{children}</main>
    </div>
  );
}
