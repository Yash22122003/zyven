'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { UpiPaymentCard } from '@/components/shared/UpiPaymentCard';
import {
  Check,
  AlertCircle,
  QrCode,
  Smartphone,
  ShieldCheck,
  Store,
  MapPin,
  Clock,
} from 'lucide-react';

export default function MerchantSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    phone: '',
    email: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    isOpenManually: true,
    stockDisplayMode: 'AVAILABILITY_STATUS' as 'AVAILABILITY_STATUS' | 'EXACT_COUNT',
    pickupInstructions: '',
    estimatedPrepTimeMinutes: 20,
    upiId: '',
    upiName: '',
    enableUpiQr: true,
  });

  useEffect(() => {
    fetch('/api/merchant/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.business) {
          const b = data.business;
          setForm({
            name: b.name || '',
            slug: b.slug || '',
            description: b.description || '',
            phone: b.phone || '',
            email: b.email || '',
            addressLine1: b.addressLine1 || '',
            addressLine2: b.addressLine2 || '',
            city: b.city || '',
            state: b.state || '',
            pincode: b.pincode || '',
            isOpenManually: b.isOpenManually,
            stockDisplayMode: b.stockDisplayMode || 'AVAILABILITY_STATUS',
            pickupInstructions: b.pickupInstructions || '',
            estimatedPrepTimeMinutes: b.estimatedPrepTimeMinutes || 20,
            upiId: b.upiId || '',
            upiName: b.upiName || '',
            enableUpiQr: b.enableUpiQr ?? true,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError('');

    try {
      const res = await fetch('/api/merchant/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          estimatedPrepTimeMinutes: parseInt(form.estimatedPrepTimeMinutes.toString(), 10),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update store settings');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Settings error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl space-y-4">
        <div className="h-8 w-40 bg-zinc-200 rounded animate-pulse" />
        <div className="h-96 bg-zinc-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6 pb-20 md:pb-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950">Store Settings</h1>
        <p className="text-xs text-zinc-600 mt-0.5">
          Configure storefront route, UPI QR payments, stock display, and shop pickup instructions.
        </p>
      </div>

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Store settings & UPI QR configuration successfully updated!</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Identity & Slug */}
        <Card className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900 uppercase tracking-wider">
            <Store className="w-4 h-4 text-zinc-600" />
            <span>1. Store Identity & Route</span>
          </div>

          <div className="space-y-3">
            <Input
              label="Store Display Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Storefront Route Slug (zyven.me/your-slug)
              </label>
              <div className="flex items-center">
                <span className="inline-flex items-center px-3 h-9 rounded-l-lg border border-r-0 border-zinc-200 bg-zinc-50 text-xs text-zinc-600 font-mono">
                  zyven.me/
                </span>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().trim() })}
                  className="flex h-9 w-full rounded-r-lg border border-zinc-200 bg-white px-3 text-xs font-mono text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-950"
                  required
                />
              </div>
              <p className="text-[11px] text-zinc-600 mt-1">
                Share this unique route with your customers on WhatsApp, Instagram, or business cards.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                About the Store
              </label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-lg border border-zinc-200 p-2.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-950"
                placeholder="Short description shown to customers..."
              />
            </div>
          </div>
        </Card>

        {/* Section 2: UPI QR & Digital Payment Setup */}
        <Card className="p-5 sm:p-6 space-y-5 border-zinc-300">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-zinc-950 text-white flex items-center justify-center">
                <QrCode className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-sm text-zinc-950">2. Merchant UPI QR Code Payment</h2>
                <p className="text-[11px] text-zinc-600">Accept direct payments via GPay, PhonePe, Paytm, and BHIM</p>
              </div>
            </div>

            <Badge variant="success" size="sm" className="gap-1">
              <ShieldCheck className="w-3 h-3" />
              0% Take Rate
            </Badge>
          </div>

          {/* Enable UPI Toggle */}
          <div className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/70 flex items-center justify-between">
            <div>
              <div className="font-semibold text-xs text-zinc-950">Accept UPI QR Payments</div>
              <div className="text-[11px] text-zinc-600">
                Display your dynamic UPI QR code on checkout & customer order receipts.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...form, enableUpiQr: !form.enableUpiQr })}
              className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                form.enableUpiQr ? 'bg-emerald-600' : 'bg-zinc-300'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                  form.enableUpiQr ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {form.enableUpiQr && (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Merchant UPI ID / VPA"
                  placeholder="e.g. sharmastore@upi or 9876543210@paytm"
                  value={form.upiId}
                  onChange={(e) => setForm({ ...form, upiId: e.target.value })}
                  required={form.enableUpiQr}
                />
                <Input
                  label="Merchant Payee Name"
                  placeholder="e.g. Sharma Grocery Store"
                  value={form.upiName}
                  onChange={(e) => setForm({ ...form, upiName: e.target.value })}
                />
              </div>

              {/* Live Interactive QR Preview */}
              {form.upiId ? (
                <div className="mt-4 pt-4 border-t border-zinc-100">
                  <div className="text-xs font-semibold text-zinc-900 mb-2 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Live Merchant QR Preview (Test on your phone)</span>
                  </div>
                  <div className="max-w-xs mx-auto">
                    <UpiPaymentCard
                      upiId={form.upiId}
                      payeeName={form.upiName || form.name || 'Store Merchant'}
                      amount={100}
                      orderNumber="PREVIEW-DEMO"
                      variant="merchant_counter"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                  Enter your Merchant UPI ID above to generate and test your live store QR code.
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Section 3: Availability & Stock Preferences */}
        <Card className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900 uppercase tracking-wider">
            <Clock className="w-4 h-4 text-zinc-600" />
            <span>3. Store Availability & Stock Preferences</span>
          </div>

          <div className="space-y-3">
            {/* Manual Open/Close Switch */}
            <div className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/70 flex items-center justify-between">
              <div>
                <div className="font-semibold text-xs text-zinc-950">Store Open for Orders</div>
                <div className="text-[11px] text-zinc-600">
                  Quick pause button if your shop is currently crowded or closing early.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setForm({ ...form, isOpenManually: !form.isOpenManually })}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                  form.isOpenManually ? 'bg-emerald-600' : 'bg-zinc-300'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                    form.isOpenManually ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Stock display mode */}
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                Customer Stock Display Preference
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, stockDisplayMode: 'AVAILABILITY_STATUS' })}
                  className={`p-3 rounded-lg border text-left text-xs transition-all ${
                    form.stockDisplayMode === 'AVAILABILITY_STATUS'
                      ? 'border-zinc-950 bg-zinc-50 font-semibold ring-1 ring-zinc-950'
                      : 'border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <div className="text-zinc-950">Availability Status (Recommended)</div>
                  <div className="text-[11px] text-zinc-600 font-normal mt-0.5">
                    Displays "In Stock", "Few Left", "Out of Stock" (hides exact counts).
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setForm({ ...form, stockDisplayMode: 'EXACT_COUNT' })}
                  className={`p-3 rounded-lg border text-left text-xs transition-all ${
                    form.stockDisplayMode === 'EXACT_COUNT'
                      ? 'border-zinc-950 bg-zinc-50 font-semibold ring-1 ring-zinc-950'
                      : 'border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <div className="text-zinc-950">Exact Quantity Count</div>
                  <div className="text-[11px] text-zinc-600 font-normal mt-0.5">
                    Displays precise available count: "12 in stock" or "Only 3 left".
                  </div>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Estimated Order Preparation Time (Minutes)"
                type="number"
                min="5"
                max="180"
                value={form.estimatedPrepTimeMinutes}
                onChange={(e) => setForm({ ...form, estimatedPrepTimeMinutes: parseInt(e.target.value) || 20 })}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                Pickup Instructions for Customers
              </label>
              <textarea
                rows={2}
                value={form.pickupInstructions}
                onChange={(e) => setForm({ ...form, pickupInstructions: e.target.value })}
                placeholder="e.g. Please collect from billing counter #2. Show order number on arrival."
                className="w-full rounded-lg border border-zinc-200 p-2.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-950"
              />
            </div>
          </div>
        </Card>

        {/* Section 4: Contact & Physical Shop Address */}
        <Card className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900 uppercase tracking-wider">
            <MapPin className="w-4 h-4 text-zinc-600" />
            <span>4. Physical Shop Location & Contact</span>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Contact Phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
              <Input
                label="Contact Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <Input
              label="Shop Address Line 1"
              value={form.addressLine1}
              onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
              required
            />

            <Input
              label="Shop Address Line 2 (Optional landmark)"
              value={form.addressLine2}
              onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
            />

            <div className="grid grid-cols-3 gap-2">
              <Input
                label="City"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                required
              />
              <Input
                label="State"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                required
              />
              <Input
                label="Pincode"
                value={form.pincode}
                onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                required
              />
            </div>
          </div>
        </Card>

        {/* Sticky Mobile / Desktop Action Bar */}
        <div className="flex items-center justify-end pt-2">
          <Button
            type="submit"
            size="lg"
            isLoading={saving}
            className="w-full sm:w-auto font-semibold shadow-sm h-11"
          >
            Save Store Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
