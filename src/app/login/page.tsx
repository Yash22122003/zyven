'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Store, Shield, ShoppingBag, ArrowRight, Lock, CheckCircle2 } from 'lucide-react';

type RoleTab = 'CUSTOMER' | 'MERCHANT' | 'SUPER_ADMIN';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect');

  const [selectedRole, setSelectedRole] = useState<RoleTab>('CUSTOMER');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoAllowed, setDemoAllowed] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  // Check server-side if local dev demo login is explicitly enabled
  React.useEffect(() => {
    fetch('/api/auth/demo-login')
      .then((res) => {
        if (res.ok) {
          setDemoAllowed(true);
        }
      })
      .catch(() => {});
  }, []);

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

      // Automatic intelligent role-based redirect
      const targetUrl = redirectPath || data.redirectUrl || (
        data.user.role === 'SUPER_ADMIN'
          ? '/admin'
          : data.user.role === 'CUSTOMER'
          ? '/account'
          : '/dashboard'
      );

      router.push(targetUrl);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid login credentials';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDevDemoLogin = async (role: RoleTab) => {
    setError('');
    setDemoLoading(true);

    try {
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Demo login failed');
      }

      router.push(redirectPath || data.redirectUrl);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Demo login unavailable');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg space-y-6">
      {/* Brand & Greeting Header */}
      <div className="text-center space-y-1">
        <Link href="/" className="inline-flex items-center gap-2 group mb-2">
          <div className="w-8 h-8 rounded-lg bg-zinc-950 flex items-center justify-center text-white font-bold text-sm tracking-wider shadow-xs">
            Z
          </div>
          <span className="font-extrabold text-xl tracking-tight text-zinc-950">ZYVEN</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950">
          Sign In to ZYVEN
        </h1>
        <p className="text-xs text-zinc-500">
          One unified login with automatic redirection to your dedicated portal.
        </p>
      </div>

      {/* Role Visual Switcher Tabs */}
      <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-zinc-100 rounded-xl border border-zinc-200/80 text-xs">
        <button
          type="button"
          onClick={() => setSelectedRole('CUSTOMER')}
          className={`py-2 px-3 rounded-lg font-medium transition-all flex flex-col items-center gap-1 ${
            selectedRole === 'CUSTOMER'
              ? 'bg-white text-zinc-950 shadow-xs font-semibold'
              : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <ShoppingBag className="w-4 h-4 text-emerald-600" />
          <span>Customer</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedRole('MERCHANT')}
          className={`py-2 px-3 rounded-lg font-medium transition-all flex flex-col items-center gap-1 ${
            selectedRole === 'MERCHANT'
              ? 'bg-white text-zinc-950 shadow-xs font-semibold'
              : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <Store className="w-4 h-4 text-zinc-900" />
          <span>Merchant</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedRole('SUPER_ADMIN')}
          className={`py-2 px-3 rounded-lg font-medium transition-all flex flex-col items-center gap-1 ${
            selectedRole === 'SUPER_ADMIN'
              ? 'bg-white text-zinc-950 shadow-xs font-semibold'
              : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <Shield className="w-4 h-4 text-purple-600" />
          <span>Super Admin</span>
        </button>
      </div>

      {/* Role Guidance Banner */}
      <div className="p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 bg-white border-zinc-200">
        <div className="flex items-center gap-2.5">
          {selectedRole === 'CUSTOMER' && <ShoppingBag className="w-4 h-4 text-emerald-600 shrink-0" />}
          {selectedRole === 'MERCHANT' && <Store className="w-4 h-4 text-zinc-800 shrink-0" />}
          {selectedRole === 'SUPER_ADMIN' && <Shield className="w-4 h-4 text-purple-600 shrink-0" />}
          <div>
            <span className="font-semibold text-zinc-900">
              {selectedRole === 'CUSTOMER' && 'Customer Portal'}
              {selectedRole === 'MERCHANT' && 'Merchant Operations Dashboard'}
              {selectedRole === 'SUPER_ADMIN' && 'Super Admin Platform Control'}
            </span>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {selectedRole === 'CUSTOMER' && 'Track in-store pickups, favorite shops, and order history.'}
              {selectedRole === 'MERCHANT' && 'Manage your storefront (zyven.me/[slug]), products, live stock & orders.'}
              {selectedRole === 'SUPER_ADMIN' && 'Full platform telemetry, merchant approvals, revenue, and governance.'}
            </p>
          </div>
        </div>
      </div>

      <Card className="p-6 border-zinc-200/90 shadow-sm bg-white">
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
              placeholder={
                selectedRole === 'CUSTOMER'
                  ? 'customer@example.com'
                  : selectedRole === 'MERCHANT'
                  ? 'merchant@example.com'
                  : 'admin@example.com'
              }
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-zinc-700">Password</label>
              <Link
                href="/reset-password"
                className="text-[11px] font-medium text-zinc-500 hover:text-zinc-950 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" size="lg" className="w-full font-semibold h-11" isLoading={loading}>
            <Lock className="w-4 h-4 mr-1.5" />
            <span>
              {selectedRole === 'CUSTOMER'
                ? 'Sign In to Customer Account'
                : selectedRole === 'MERCHANT'
                ? 'Sign In to Merchant Console'
                : 'Sign In to Admin Console'}
            </span>
          </Button>
        </form>

        {/* Local Dev Demo Login (Rendered ONLY when server allows via ENABLE_DEMO_LOGIN=true in development) */}
        {demoAllowed && (
          <div className="mt-6 pt-5 border-t border-amber-200/60 bg-amber-50/50 -mx-6 -mb-6 p-4 rounded-b-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-amber-800 tracking-wider uppercase">
                ⚡ Local Dev Demo Login (ENABLE_DEMO_LOGIN=true)
              </span>
              <span className="text-[10px] text-amber-700 font-mono">Dev Mode Only</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleDevDemoLogin('CUSTOMER')}
                disabled={demoLoading}
                className="py-1.5 px-2 bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-800 rounded text-xs font-semibold shadow-2xs transition-colors"
              >
                Customer
              </button>
              <button
                type="button"
                onClick={() => handleDevDemoLogin('MERCHANT')}
                disabled={demoLoading}
                className="py-1.5 px-2 bg-white hover:bg-zinc-100 border border-zinc-300 text-zinc-900 rounded text-xs font-semibold shadow-2xs transition-colors"
              >
                Merchant
              </button>
              <button
                type="button"
                onClick={() => handleDevDemoLogin('SUPER_ADMIN')}
                disabled={demoLoading}
                className="py-1.5 px-2 bg-white hover:bg-purple-50 border border-purple-300 text-purple-900 rounded text-xs font-semibold shadow-2xs transition-colors"
              >
                Super Admin
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Role-Specific Sign-up Alternatives */}
      <div className="text-center text-xs text-zinc-500 space-y-1.5">
        <p>
          Need a customer account to order online?{' '}
          <Link href="/register?role=customer" className="font-semibold text-zinc-900 hover:underline">
            Register as Customer
          </Link>
        </p>
        <p>
          Own a local shop?{' '}
          <Link href="/register?role=merchant" className="font-semibold text-zinc-900 hover:underline">
            Open store for ₹1/month (0% commission)
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6 bg-zinc-50/50 min-h-[calc(100vh-4rem)]">
      <Suspense fallback={<div className="text-xs text-zinc-400">Loading sign in...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
