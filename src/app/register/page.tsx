'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { slugify } from '@/lib/utils';
import { Store, ShoppingBag, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get('role') === 'customer' ? 'customer' : 'merchant';
  const redirectPath = searchParams.get('redirect');

  const [role, setRole] = useState<'customer' | 'merchant'>(initialRole);
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([]);

  // Customer form state
  const [customerData, setCustomerData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
  });

  // Merchant form state
  const [merchantData, setMerchantData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    businessName: '',
    categorySlug: 'grocery-essentials',
    address: '',
    city: '',
    state: '',
    pincode: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/marketplace/stores')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.categories) {
          setCategories(data.categories);
        }
      })
      .catch(() => {});
  }, []);

  const handleCustomerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomerData({ ...customerData, [e.target.name]: e.target.value });
  };

  const handleMerchantChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setMerchantData({ ...merchantData, [e.target.name]: e.target.value });
  };

  const previewSlug = slugify(merchantData.businessName || 'your-store');

  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'CUSTOMER',
          ...customerData,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      router.push(redirectPath || '/account');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleMerchantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'MERCHANT',
          ...merchantData,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      router.push(redirectPath || '/dashboard');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-1">
        <Link href="/" className="inline-flex items-center gap-2 group mb-2">
          <div className="w-7 h-7 rounded-lg bg-zinc-950 flex items-center justify-center text-white font-bold text-xs tracking-wider">
            Z
          </div>
          <span className="font-extrabold text-lg tracking-tight text-zinc-950">ZYVEN</span>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
          Create Your ZYVEN Account
        </h1>
        <p className="text-xs text-zinc-500">
          {role === 'customer'
            ? 'Sign up to track and manage your local in-store pickup orders'
            : 'Establish your independent digital storefront route with live inventory'}
        </p>
      </div>

      {/* Role Segment Toggle */}
      <div className="flex rounded-xl bg-zinc-100 p-1 border border-zinc-200">
        <button
          type="button"
          onClick={() => {
            setRole('customer');
            setError('');
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
            role === 'customer'
              ? 'bg-white text-zinc-950 shadow-xs'
              : 'text-zinc-600 hover:text-zinc-950'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Customer Account</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setRole('merchant');
            setError('');
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
            role === 'merchant'
              ? 'bg-white text-zinc-950 shadow-xs'
              : 'text-zinc-600 hover:text-zinc-950'
          }`}
        >
          <Store className="w-3.5 h-3.5" />
          <span>Open Store (₹1/mo)</span>
        </button>
      </div>

      <Card className="p-6 sm:p-8 border-zinc-200/90 shadow-sm">
        {error && (
          <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        {role === 'customer' ? (
          /* Customer Registration Form */
          <form onSubmit={handleCustomerSubmit} className="space-y-4">
            <div className="space-y-3">
              <Input
                label="Full Name"
                name="fullName"
                placeholder="e.g. Priya Verma"
                value={customerData.fullName}
                onChange={handleCustomerChange}
                required
              />
              <Input
                label="Email Address"
                type="email"
                name="email"
                placeholder="priya@example.com"
                value={customerData.email}
                onChange={handleCustomerChange}
                required
              />
              <Input
                label="Mobile Number (for pickup SMS updates)"
                name="phone"
                placeholder="+91 98765 43210"
                value={customerData.phone}
                onChange={handleCustomerChange}
                required
              />
              <Input
                label="Password"
                type="password"
                name="password"
                placeholder="Minimum 6 characters"
                value={customerData.password}
                onChange={handleCustomerChange}
                required
              />
            </div>

            <div className="pt-3">
              <Button
                type="submit"
                size="lg"
                className="w-full font-semibold gap-2 shadow-sm"
                isLoading={loading}
              >
                <span>Create Customer Account</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-zinc-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Instant order status tracking & pickup verification</span>
            </div>
          </form>
        ) : (
          /* Merchant / Business Registration Form */
          <form onSubmit={handleMerchantSubmit} className="space-y-4">
            {/* ₹1 Offer Banner */}
            <div className="mb-4 p-3.5 rounded-xl bg-zinc-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <div className="text-xs">
                  <span className="font-bold text-sm">₹1 / month</span>
                  <span className="text-zinc-400 ml-1.5 font-medium">Introductory Offer</span>
                </div>
              </div>
              <Badge variant="neutral" size="sm" className="bg-zinc-800 text-zinc-200 border-zinc-700">
                0% Commission
              </Badge>
            </div>

            <div className="border-b border-zinc-100 pb-4 mb-4">
              <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider mb-3">
                1. Merchant Profile
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Your Full Name"
                  name="fullName"
                  placeholder="e.g. Ramesh Sharma"
                  value={merchantData.fullName}
                  onChange={handleMerchantChange}
                  required
                />
                <Input
                  label="Email Address"
                  type="email"
                  name="email"
                  placeholder="ramesh@sharmastore.com"
                  value={merchantData.email}
                  onChange={handleMerchantChange}
                  required
                />
                <Input
                  label="Mobile Number (WhatsApp)"
                  name="phone"
                  placeholder="+91 98765 43210"
                  value={merchantData.phone}
                  onChange={handleMerchantChange}
                  required
                />
                <Input
                  label="Password"
                  type="password"
                  name="password"
                  placeholder="Minimum 6 characters"
                  value={merchantData.password}
                  onChange={handleMerchantChange}
                  required
                />
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider mb-3">
                2. Business & Storefront Details
              </h3>
              <div className="space-y-3">
                <Input
                  label="Business Name"
                  name="businessName"
                  placeholder="e.g. Sharma Grocery Store"
                  value={merchantData.businessName}
                  onChange={handleMerchantChange}
                  required
                />

                {/* Slug Preview */}
                <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-zinc-500 font-medium">Your Storefront Route:</span>
                  <span className="font-mono font-semibold text-zinc-900">
                    zyven.me/{previewSlug}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                    Retail Category
                  </label>
                  <select
                    name="categorySlug"
                    value={merchantData.categorySlug}
                    onChange={handleMerchantChange}
                    className="flex h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
                  >
                    {categories.length > 0 ? (
                      categories.map((c) => (
                        <option key={c.id} value={c.slug}>
                          {c.name}
                        </option>
                      ))
                    ) : (
                      <option value="grocery-essentials">Grocery & Essentials</option>
                    )}
                  </select>
                </div>

                <Input
                  label="Physical Shop Address"
                  name="address"
                  placeholder="Shop No., Market / Complex, Street"
                  value={merchantData.address}
                  onChange={handleMerchantChange}
                  required
                />

                <div className="grid grid-cols-3 gap-2">
                  <Input
                    label="City"
                    name="city"
                    placeholder="e.g. Noida"
                    value={merchantData.city}
                    onChange={handleMerchantChange}
                    required
                  />
                  <Input
                    label="State"
                    name="state"
                    placeholder="e.g. UP"
                    value={merchantData.state}
                    onChange={handleMerchantChange}
                    required
                  />
                  <Input
                    label="Pincode"
                    name="pincode"
                    placeholder="e.g. 201301"
                    value={merchantData.pincode}
                    onChange={handleMerchantChange}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                size="lg"
                className="w-full font-semibold gap-2 shadow-sm"
                isLoading={loading}
              >
                <span>Create Storefront for ₹1</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </form>
        )}
      </Card>

      <p className="text-center text-xs text-zinc-500">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-zinc-900 hover:underline">
          Sign in here
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="flex-1 py-12 px-4 sm:px-6 bg-zinc-50/50 flex items-center justify-center">
      <Suspense fallback={<div className="text-xs text-zinc-400">Loading registration...</div>}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
