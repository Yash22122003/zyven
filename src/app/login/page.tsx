'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Store, Shield } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to sign in');
      }

      if (data.user.role === 'SUPER_ADMIN') {
        router.push(redirectPath || '/admin');
      } else {
        router.push(redirectPath || '/dashboard');
      }
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid login credentials';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (testEmail: string) => {
    setEmail(testEmail);
    setPassword('Zyven@2026');
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center space-y-1">
        <Link href="/" className="inline-flex items-center gap-2 group mb-2">
          <div className="w-7 h-7 rounded-lg bg-zinc-950 flex items-center justify-center text-white font-bold text-xs tracking-wider">
            Z
          </div>
          <span className="font-extrabold text-lg tracking-tight text-zinc-950">ZYVEN</span>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950">Welcome back</h1>
        <p className="text-xs text-zinc-500">Sign in to manage your digital storefront</p>
      </div>

      <Card className="p-6 border-zinc-200/90 shadow-sm">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              label="Email Address"
              type="email"
              placeholder="you@store.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" size="lg" className="w-full font-semibold" isLoading={loading}>
            Sign In to Dashboard
          </Button>
        </form>

        {/* Quick test accounts for pairing review */}
        <div className="mt-6 pt-5 border-t border-zinc-100">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2.5">
            Quick Test Profiles (Demo)
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@zyven.me')}
              className="p-2 text-left rounded-lg border border-zinc-200 hover:border-zinc-400 bg-zinc-50/50 transition-colors flex items-center gap-2"
            >
              <Shield className="w-3.5 h-3.5 text-zinc-700 shrink-0" />
              <div className="truncate">
                <div className="font-medium text-zinc-900 truncate">Super Admin</div>
                <div className="text-[10px] text-zinc-400">Platform Op</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('sharma@store.com')}
              className="p-2 text-left rounded-lg border border-zinc-200 hover:border-zinc-400 bg-zinc-50/50 transition-colors flex items-center gap-2"
            >
              <Store className="w-3.5 h-3.5 text-zinc-700 shrink-0" />
              <div className="truncate">
                <div className="font-medium text-zinc-900 truncate">Sharma Store</div>
                <div className="text-[10px] text-zinc-400">Grocery</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('anita@fashionhub.com')}
              className="p-2 text-left rounded-lg border border-zinc-200 hover:border-zinc-400 bg-zinc-50/50 transition-colors flex items-center gap-2"
            >
              <Store className="w-3.5 h-3.5 text-zinc-700 shrink-0" />
              <div className="truncate">
                <div className="font-medium text-zinc-900 truncate">Fashion Hub</div>
                <div className="text-[10px] text-zinc-400">Apparel</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('vikram@mobileworld.com')}
              className="p-2 text-left rounded-lg border border-zinc-200 hover:border-zinc-400 bg-zinc-50/50 transition-colors flex items-center gap-2"
            >
              <Store className="w-3.5 h-3.5 text-zinc-700 shrink-0" />
              <div className="truncate">
                <div className="font-medium text-zinc-900 truncate">Mobile World</div>
                <div className="text-[10px] text-zinc-400">Electronics</div>
              </div>
            </button>
          </div>
        </div>
      </Card>

      <p className="text-center text-xs text-zinc-500">
        Want to launch a digital store?{' '}
        <Link href="/register" className="font-semibold text-zinc-900 hover:underline">
          Register for ₹1/month
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6 bg-zinc-50/50">
      <Suspense fallback={<div className="text-xs text-zinc-400">Loading sign in...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
