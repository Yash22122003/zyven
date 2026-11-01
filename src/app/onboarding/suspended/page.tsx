'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Ban, Mail, Phone, ArrowLeft, LogOut } from 'lucide-react';

export default function SuspendedStorePage() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-zinc-50/60">
      <Card className="max-w-md w-full p-8 text-center space-y-4 bg-white border-rose-200 shadow-xl">
        <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
          <Ban className="w-8 h-8" />
        </div>

        <h1 className="text-xl font-extrabold text-zinc-950">Store Account Suspended</h1>

        <p className="text-xs text-zinc-600 leading-relaxed">
          Your merchant digital store has been placed on administrative hold by ZYVEN compliance. Public storefront browsing and order operations are temporarily paused.
        </p>

        <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200/80 text-xs text-zinc-600 text-left space-y-1.5">
          <div className="font-semibold text-zinc-900">Resolve with Support:</div>
          <div className="flex items-center gap-2 text-zinc-700">
            <Mail className="w-3.5 h-3.5 text-zinc-400" />
            <span>yashagrahari1995@gmail.com</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-700">
            <Phone className="w-3.5 h-3.5 text-zinc-400" />
            <span>+91 98914 56914 (Priority Merchant Desk)</span>
          </div>
        </div>

        <div className="pt-2 flex items-center gap-2">
          <Link href="/" className="flex-1">
            <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Marketplace</span>
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-xs text-zinc-500">
            <LogOut className="w-3.5 h-3.5 mr-1" />
            <span>Sign Out</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}
