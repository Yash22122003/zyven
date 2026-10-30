'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCart } from '@/hooks/useCart';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Store,
  MapPin,
  ArrowLeft,
  ShoppingBag,
  AlertCircle,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Smartphone,
  ChevronRight,
} from 'lucide-react';

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const { cart, clearCart, subtotal, totalCount, isLoaded } = useCart();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'UPI_ONLINE' | 'PAY_AT_STORE'>('UPI_ONLINE');
  const [pickupNotes, setPickupNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [storeInfo, setStoreInfo] = useState<any>(null);

  // Pre-fill customer details if logged in
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.authenticated && data.user) {
          if (data.user.fullName) setCustomerName(data.user.fullName);
          if (data.user.phone) setCustomerPhone(data.user.phone);
          if (data.user.email) setCustomerEmail(data.user.email);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/storefront/${slug}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.store) {
          setStoreInfo(data.store);
          // If store does not have UPI enabled, fallback to cash
          if (!data.store.enableUpiQr) {
            setPaymentMethod('PAY_AT_STORE');
          }
        }
      })
      .catch(() => {});
  }, [slug]);

  if (!isLoaded) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 flex-1 w-full space-y-4">
        <div className="h-8 w-48 bg-zinc-200 animate-pulse rounded-lg" />
        <div className="h-64 bg-zinc-100 animate-pulse rounded-xl" />
      </div>
    );
  }

  if (cart.items.length === 0 || cart.businessSlug !== slug) {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-4 flex-1">
        <ShoppingBag className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-zinc-950">Your cart is empty</h2>
        <p className="text-xs text-zinc-600 mt-1">
          Add items from {storeInfo?.name || 'the storefront'} to place a pickup order.
        </p>
        <Link href={`/${slug}`} className="mt-5 inline-block">
          <Button variant="outline" size="sm">
            Browse Store Products
          </Button>
        </Link>
      </div>
    );
  }

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        businessSlug: slug,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        paymentMethod,
        pickupNotes: pickupNotes.trim() || undefined,
        items: cart.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
      };

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to place pickup order');
      }

      // Order placed! Clear cart and redirect to live order tracker
      clearCart();
      router.push(data.trackingUrl || `/${slug}/orders/${data.orderNumber}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Checkout failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-3.5 sm:px-6 py-6 sm:py-10 flex-1 w-full pb-28 md:pb-12">
      {/* Back button */}
      <Link
        href={`/${slug}`}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-950 mb-4 sm:mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to {storeInfo?.name || 'Storefront'}</span>
      </Link>

      <div className="mb-5 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950">
          Store Pickup Checkout
        </h1>
        <p className="text-xs text-zinc-600 mt-0.5">
          Order online and collect physically from the shop counter.
        </p>
      </div>

      {/* Prominent BOPIS Store Pickup Notice */}
      <div className="mb-6 p-3.5 sm:p-4 rounded-xl bg-amber-50/80 border border-amber-200/90 text-amber-900 text-xs flex items-start gap-2.5 sm:gap-3">
        <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-0.5 leading-relaxed">
          <div className="font-bold text-xs sm:text-sm text-amber-950">
            Physical In-Store Pickup Only (No Delivery)
          </div>
          <p className="text-[11px] sm:text-xs">
            Prepare to collect at <span className="font-semibold">{storeInfo?.name || 'the shop'}</span>.
            Home delivery is not provided.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmitOrder}>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-8">
          {/* Left Column: Customer Details & Payment Options */}
          <div className="md:col-span-7 space-y-5">
            {/* 1. Customer Details */}
            <Card className="p-4 sm:p-6 space-y-3.5">
              <h2 className="font-bold text-sm text-zinc-950 flex items-center justify-between pb-2 border-b border-zinc-100">
                <span>1. Contact & Pickup Info</span>
                <span className="text-[11px] text-zinc-600 font-normal">Step 1 of 2</span>
              </h2>

              <div className="space-y-3">
                <Input
                  label="Your Full Name"
                  placeholder="e.g. Priya Verma"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                />

                <Input
                  label="Mobile Number (For pickup notifications)"
                  placeholder="+91 98765 00000"
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  required
                />

                <Input
                  label="Email (Optional digital receipt)"
                  placeholder="you@example.com"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                />

                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Pickup Note / Estimated Arrival (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Will collect around 5:30 PM after office"
                    value={pickupNotes}
                    onChange={(e) => setPickupNotes(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 p-2.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-950"
                  />
                </div>
              </div>
            </Card>

            {/* 2. Payment Method Selector */}
            <Card className="p-4 sm:p-6 space-y-3">
              <h2 className="font-bold text-sm text-zinc-950 pb-2 border-b border-zinc-100 flex items-center justify-between">
                <span>2. Select Payment Method</span>
                <Badge variant="success" size="sm">0% Fee</Badge>
              </h2>

              <div className="space-y-2.5 pt-1">
                {/* Option 1: UPI QR Payment */}
                <label
                  onClick={() => setPaymentMethod('UPI_ONLINE')}
                  className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                    paymentMethod === 'UPI_ONLINE'
                      ? 'border-zinc-950 bg-zinc-50/80 ring-1 ring-zinc-950 shadow-xs'
                      : 'border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-zinc-950 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-zinc-950">
                        Instant UPI QR Code
                      </span>
                      <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Recommended
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-600 mt-0.5 leading-relaxed">
                      Scan or tap to pay via Google Pay, PhonePe, Paytm, or CRED.
                    </p>
                    {storeInfo?.upiId && (
                      <div className="mt-2 text-[10px] font-mono text-zinc-600 bg-white px-2 py-0.5 rounded border border-zinc-200 inline-block">
                        Store UPI: {storeInfo.upiId}
                      </div>
                    )}
                  </div>
                </label>

                {/* Option 2: Pay at Store */}
                <label
                  onClick={() => setPaymentMethod('PAY_AT_STORE')}
                  className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                    paymentMethod === 'PAY_AT_STORE'
                      ? 'border-zinc-950 bg-zinc-50/80 ring-1 ring-zinc-950 shadow-xs'
                      : 'border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Store className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-zinc-950">
                        Cash on Pickup (Pay at Counter)
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-600 mt-0.5 leading-relaxed">
                      Hand cash directly to the cashier when collecting your prepared bag.
                    </p>
                  </div>
                </label>
              </div>
            </Card>
          </div>

          {/* Right Column: Order Summary */}
          <div className="md:col-span-5 space-y-5">
            <Card className="p-4 sm:p-6 md:sticky md:top-24 space-y-4">
              <h2 className="font-bold text-sm text-zinc-950 pb-2.5 border-b border-zinc-100 flex items-center justify-between">
                <span>Order Summary</span>
                <span className="text-xs font-normal text-zinc-600 font-mono">{totalCount} item(s)</span>
              </h2>

              {/* Items List */}
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {cart.items.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between text-xs py-1">
                    <div className="flex items-center gap-2.5 truncate pr-2">
                      <div className="w-9 h-9 rounded-lg bg-zinc-100 shrink-0 overflow-hidden border border-zinc-200/60">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-400 font-bold text-xs">
                            {item.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="truncate">
                        <div className="font-semibold text-zinc-950 truncate">{item.name}</div>
                        <div className="text-[11px] text-zinc-600 font-mono">
                          {item.quantity} × {formatCurrency(item.price)}
                        </div>
                      </div>
                    </div>
                    <div className="font-bold text-zinc-950 font-mono shrink-0">
                      {formatCurrency(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Price Calculation */}
              <div className="pt-3 border-t border-zinc-100 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-zinc-600">
                  <span>Subtotal</span>
                  <span className="font-mono">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-zinc-600">
                  <span>In-Store Pickup</span>
                  <span className="text-emerald-700 font-medium">FREE</span>
                </div>
                <div className="flex items-center justify-between text-sm sm:text-base font-extrabold text-zinc-950 pt-2 border-t border-zinc-200">
                  <span>Total Due</span>
                  <span className="font-mono">{formatCurrency(subtotal)}</span>
                </div>
              </div>

              {/* Shop Pickup Address Preview */}
              {storeInfo && (
                <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200/80 text-[11px] text-zinc-600 space-y-1">
                  <div className="font-semibold text-zinc-900 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Pickup Address:</span>
                  </div>
                  <p className="leading-relaxed line-clamp-2">{storeInfo.address}</p>
                </div>
              )}

              {/* Desktop Submit Button */}
              <div className="hidden md:block pt-2">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full font-semibold shadow-sm h-11"
                  isLoading={loading}
                >
                  Place Pickup Order ({formatCurrency(subtotal)})
                </Button>
                <p className="text-[10px] text-zinc-600 text-center mt-2">
                  Atomic stock reservation active • Guaranteed inventory
                </p>
              </div>
            </Card>
          </div>
        </div>

        {/* Mobile Fixed Sticky Bottom Action Bar */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-zinc-200 px-4 py-3 shadow-2xl flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] text-zinc-600">Total Due on Pickup</div>
            <div className="text-base font-extrabold text-zinc-950 font-mono">
              {formatCurrency(subtotal)}
            </div>
          </div>

          <Button
            type="submit"
            size="md"
            className="flex-1 max-w-[200px] font-semibold h-10 shadow-sm"
            isLoading={loading}
          >
            <span>Confirm Order</span>
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </form>
    </div>
  );
}
