'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UpiPaymentCard } from '@/components/shared/UpiPaymentCard';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Layers,
  Settings,
  CreditCard,
  ExternalLink,
  LogOut,
  Store,
  Power,
  QrCode,
  X,
} from 'lucide-react';

interface BusinessSummary {
  id: string;
  name: string;
  slug: string;
  isOpenManually: boolean;
  isVerified: boolean;
  upiId?: string | null;
  upiName?: string | null;
  enableUpiQr?: boolean;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [business, setBusiness] = useState<BusinessSummary | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [togglingOpen, setTogglingOpen] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  useEffect(() => {
    fetch('/api/merchant/overview')
      .then((res) => {
        if (!res.ok) {
          router.push('/login?redirect=/dashboard');
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.business) {
          setBusiness(data.business);
          setIsOpen(data.business.isOpenManually);
        }
      })
      .catch(() => {});
  }, [pathname, router]);

  // Also fetch settings to get upiId if not on business summary
  useEffect(() => {
    fetch('/api/merchant/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.business) {
          setBusiness((prev) => (prev ? { ...prev, ...data.business } : data.business));
        }
      })
      .catch(() => {});
  }, []);

  const handleToggleStoreOpen = async () => {
    if (!business) return;
    setTogglingOpen(true);
    const newState = !isOpen;

    try {
      const res = await fetch('/api/merchant/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: business.name,
          slug: business.slug,
          isOpenManually: newState,
          addressLine1: 'Shop Address',
          city: 'City',
          state: 'State',
          pincode: '000000',
          phone: '+919999999999',
          stockDisplayMode: 'AVAILABILITY_STATUS',
          estimatedPrepTimeMinutes: 20,
        }),
      });

      if (res.ok) {
        setIsOpen(newState);
      }
    } catch {
      // Ignore
    } finally {
      setTogglingOpen(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const navLinks = [
    { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Orders', href: '/dashboard/orders', icon: ShoppingBag },
    { label: 'Products', href: '/dashboard/products', icon: Package },
    { label: 'Inventory', href: '/dashboard/inventory', icon: Layers },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings },
    { label: 'Plans', href: '/dashboard/subscription', icon: CreditCard },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-zinc-50/50">
      {/* Mobile Top App Bar */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur-md border-b border-zinc-200">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-zinc-950 flex items-center justify-center text-white font-bold text-xs">
            Z
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-xs text-zinc-950 leading-tight">
              {business ? business.name : 'ZYVEN'}
            </span>
            <span className="text-[10px] text-zinc-600 font-mono">
              zyven.me/{business?.slug || ''}
            </span>
          </div>
        </Link>

        {/* Mobile quick actions: Store QR & Open/Pause switch */}
        <div className="flex items-center gap-1.5">
          {business?.upiId && (
            <button
              onClick={() => setShowQrModal(true)}
              className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition-colors"
              title="Show Store UPI QR"
            >
              <QrCode className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handleToggleStoreOpen}
            disabled={togglingOpen}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 transition-colors ${
              isOpen
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
            <span>{isOpen ? 'Open' : 'Paused'}</span>
          </button>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col justify-between sticky top-0 h-screen w-64 bg-white border-r border-zinc-200 p-5 shrink-0">
        <div className="space-y-6">
          {/* Brand & Store Profile Card */}
          <div>
            <Link href="/" className="inline-flex items-center gap-2 group mb-5">
              <div className="w-7 h-7 rounded-lg bg-zinc-950 flex items-center justify-center text-white font-bold text-xs">
                Z
              </div>
              <span className="font-extrabold text-base tracking-tight text-zinc-950">ZYVEN</span>
            </Link>

            {business && (
              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/90 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-xs text-zinc-950 truncate pr-1">
                    {business.name}
                  </div>
                  {business.isVerified && (
                    <Badge variant="success" size="sm" className="text-[10px] px-1.5 py-0">
                      Verified
                    </Badge>
                  )}
                </div>

                <a
                  href={`/${business.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] font-mono text-zinc-500 hover:text-zinc-900 transition-colors"
                >
                  <span className="truncate">zyven.me/{business.slug}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>

                {/* Counter UPI QR Quick Button */}
                {business.upiId && (
                  <button
                    onClick={() => setShowQrModal(true)}
                    type="button"
                    className="w-full py-1.5 px-2.5 rounded-lg bg-white border border-zinc-200 text-[11px] font-semibold text-zinc-800 hover:bg-zinc-100 flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <QrCode className="w-3.5 h-3.5 text-zinc-700" />
                    <span>Counter UPI QR</span>
                  </button>
                )}

                {/* Quick Store Open / Pause Toggle */}
                <div className="pt-2 border-t border-zinc-200/60 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-600 font-medium">Store Status</span>
                  <button
                    onClick={handleToggleStoreOpen}
                    disabled={togglingOpen}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                      isOpen
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                    }`}
                  >
                    <Power className="w-3 h-3" />
                    <span>{isOpen ? 'Open' : 'Paused'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Links */}
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
                      ? 'bg-zinc-950 text-white shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile & Sign out */}
        <div className="pt-4 border-t border-zinc-100 flex items-center justify-between">
          <Link
            href={`/${business?.slug || ''}`}
            target="_blank"
            className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1"
          >
            <Store className="w-3.5 h-3.5" />
            <span>Storefront</span>
          </Link>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-xs text-zinc-500 hover:text-zinc-950 gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </Button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 p-3.5 sm:p-6 md:p-8 max-w-7xl mx-auto w-full pb-24 md:pb-8">
        {children}
      </main>

      {/* Fixed Mobile Bottom App Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-zinc-200 shadow-lg px-2 py-1.5">
        <div className="grid grid-cols-5 gap-1">
          {navLinks.slice(0, 5).map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center justify-center py-1.5 rounded-lg transition-colors ${
                  isActive ? 'text-zinc-950 font-bold' : 'text-zinc-400 hover:text-zinc-600'
                }`}
              >
                <div
                  className={`p-1 rounded-md transition-all ${
                    isActive ? 'bg-zinc-100 text-zinc-950 scale-105' : 'text-zinc-500'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Merchant Walk-in Counter UPI QR Modal */}
      {showQrModal && business?.upiId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-white rounded-2xl p-5 shadow-2xl space-y-3 relative">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-zinc-400 hover:text-zinc-700 bg-zinc-100"
            >
              <X className="w-4 h-4" />
            </button>
            <UpiPaymentCard
              upiId={business.upiId}
              payeeName={business.upiName || business.name}
              variant="merchant_counter"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowQrModal(false)}
              className="w-full text-xs"
            >
              Close Counter QR
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
