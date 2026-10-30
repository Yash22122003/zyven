'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { useParams, useRouter } from 'next/navigation';
import { useCart } from '@/hooks/useCart';
import { formatCurrency } from '@/lib/utils';
import { loadRazorpayCheckoutScript } from '@/lib/razorpay-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  MapPin,
  ArrowLeft,
  ShoppingBag,
  AlertCircle,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Smartphone,
  RefreshCw,
  Lock,
} from 'lucide-react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const { cart, clearCart, subtotal, totalCount, isLoaded } = useCart();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [pickupNotes, setPickupNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [storeInfo, setStoreInfo] = useState<any>(null);

  // Razorpay state
  const [razorpayReady, setRazorpayReady] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const rzpInstanceRef = useRef<any>(null);

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
        }
      })
      .catch(() => {});
  }, [slug]);

  // Clean up polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

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

  // Starts polling payment status (detects when customer scans QR from another phone)
  const startCrossDevicePolling = (orderNumber: string, trackingUrl: string) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/payment/status?orderNumber=${encodeURIComponent(orderNumber)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.paymentStatus === 'PAID') {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
            }
            if (rzpInstanceRef.current) {
              try {
                rzpInstanceRef.current.close();
              } catch {}
            }
            clearCart();
            router.push(`${trackingUrl}?paid=true`);
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000);
  };

  // Verifies payment signature on direct client callback
  const handlePaymentSuccess = async (
    orderNumber: string,
    response: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    },
    trackingUrl: string
  ) => {
    setIsVerifying(true);
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    try {
      const verifyRes = await fetch('/api/payment/razorpay/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verifyData.error || 'Signature verification failed');
      }

      clearCart();
      router.push(`${trackingUrl}?paid=true`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Payment verification failed';
      setError(msg);
      setIsVerifying(false);
    }
  };

  // Launch Razorpay Checkout Modal
  const launchRazorpayModal = async (orderData: any) => {
    console.log('[Razorpay Frontend] launchRazorpayModal called for order:', orderData?.orderNumber);

    const scriptLoaded = await loadRazorpayCheckoutScript();
    if (!scriptLoaded || typeof window === 'undefined' || !window.Razorpay) {
      console.error('[Razorpay Frontend] Razorpay SDK is not available on window');
      setError('Payment gateway is loading. Please try again in a moment.');
      return;
    }

    const { razorpay, orderNumber, trackingUrl } = orderData;

    console.log('[Razorpay Frontend] Opening Razorpay modal with order_id:', {
      order_id: razorpay.orderId,
      amountInPaise: razorpay.amount,
      keyId: razorpay.keyId ? `${razorpay.keyId.slice(0, 8)}...` : 'MISSING',
    });

    const options = {
      key: razorpay.keyId,
      amount: razorpay.amount,
      currency: razorpay.currency || 'INR',
      name: razorpay.name || storeInfo?.name || 'ZYVEN Store',
      description: razorpay.description || `Order #${orderNumber}`,
      order_id: razorpay.orderId,
      prefill: {
        name: customerName.trim(),
        email: customerEmail.trim() || undefined,
        contact: customerPhone.trim(),
      },
      notes: {
        orderNumber,
      },
      theme: {
        color: '#09090b',
      },
      config: {
        display: {
          blocks: {
            upi: {
              name: 'Pay with UPI / QR',
              instruments: [
                {
                  method: 'upi',
                },
              ],
            },
          },
          sequence: ['block.upi'],
          preferences: {
            show_default_blocks: true,
          },
        },
      },
      handler: async function (response: any) {
        console.log('[Razorpay Frontend] Payment success callback received from Razorpay modal:', {
          razorpay_order_id: response?.razorpay_order_id,
          razorpay_payment_id: response?.razorpay_payment_id,
          hasSignature: Boolean(response?.razorpay_signature),
        });
        await handlePaymentSuccess(orderNumber, response, trackingUrl);
      },
      modal: {
        ondismiss: function () {
          console.log('[Razorpay Frontend] Razorpay modal dismissed by user');
          setPendingOrder(orderData);
        },
      },
    };

    try {
      const rzp = new window.Razorpay(options);
      rzpInstanceRef.current = rzp;

      // Handle payment failures from within Razorpay
      rzp.on('payment.failed', function (resp: any) {
        const reason = resp.error?.description || 'Payment failed';
        console.warn('[Razorpay Frontend] Payment failure callback received from modal:', {
          code: resp.error?.code,
          description: resp.error?.description,
          reason: resp.error?.reason,
          step: resp.error?.step,
        });
        setError(`Payment could not be completed: ${reason}`);
        setPendingOrder(orderData);
      });

      rzp.open();
      console.log('[Razorpay Frontend] Razorpay modal opened successfully on screen');

      // Start cross-device QR scanning detection
      startCrossDevicePolling(orderNumber, trackingUrl);
    } catch (err: unknown) {
      console.error('[Razorpay Frontend] Error initializing Razorpay instance:', err);
      setError('Could not open payment window. Please retry.');
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    console.log('[Razorpay Frontend] Payment button clicked (Checkout flow)', {
      businessSlug: slug,
      customerName: customerName.trim(),
      itemsCount: cart.items.length,
      subtotal,
    });

    try {
      // Ensure checkout script is loaded early
      loadRazorpayCheckoutScript();

      const payload = {
        businessSlug: slug,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        paymentMethod: 'RAZORPAY_UPI',
        pickupNotes: pickupNotes.trim() || undefined,
        items: cart.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
      };

      console.log('[Razorpay Frontend] Sending checkout order creation request to /api/checkout');
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error('[Razorpay Frontend] /api/checkout returned error status:', res.status, data.error);
        throw new Error(data.error || 'Failed to place pickup order');
      }

      console.log('[Razorpay Frontend] Checkout order placed, launching Razorpay modal:', {
        orderNumber: data.orderNumber,
        razorpayOrderId: data.razorpay?.orderId,
      });

      setPendingOrder(data);
      await launchRazorpayModal(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Checkout failed';
      console.error('[Razorpay Frontend] Checkout flow failed:', message);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-3.5 sm:px-6 py-6 sm:py-10 flex-1 w-full pb-28 md:pb-12">
      {/* Razorpay Checkout Official Script */}
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setRazorpayReady(true)}
      />

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
          Order online with instant UPI payment and collect physically from the shop counter.
        </p>
      </div>

      {/* BOPIS Store Pickup Notice */}
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

      {/* Verifying Payment Banner */}
      {isVerifying && (
        <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-3">
          <RefreshCw className="w-4 h-4 text-blue-700 animate-spin" />
          <div>
            <div className="font-bold text-sm">Verifying UPI Payment...</div>
            <p className="text-[11px] text-blue-700 mt-0.5">
              Confirming cryptographic transaction signature with Razorpay. Please do not close this window.
            </p>
          </div>
        </div>
      )}

      {/* Pending / Retry Payment State */}
      {pendingOrder && !isVerifying && (
        <div className="mb-6 p-4 rounded-xl bg-zinc-950 text-white text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
          <div className="space-y-1">
            <div className="font-bold text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Payment Pending for #{pendingOrder.orderNumber}</span>
            </div>
            <p className="text-zinc-400 text-[11px]">
              Stock is reserved. Scan QR code or tap to complete payment with any UPI app.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => launchRazorpayModal(pendingOrder)}
            className="bg-white text-zinc-950 hover:bg-zinc-100 font-semibold text-xs shrink-0"
          >
            Retry UPI Payment ({formatCurrency(subtotal)})
          </Button>
        </div>
      )}

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
                  label="Email (For digital receipt)"
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

            {/* 2. Razorpay UPI Payment Card (Only Payment Method) */}
            <Card className="p-4 sm:p-6 space-y-3">
              <h2 className="font-bold text-sm text-zinc-950 pb-2 border-b border-zinc-100 flex items-center justify-between">
                <span>2. Payment Method</span>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[11px] text-emerald-700 font-semibold">Razorpay Verified</span>
                </div>
              </h2>

              <div className="pt-1">
                <div className="p-4 rounded-xl border border-zinc-950 bg-zinc-50/80 ring-1 ring-zinc-950 shadow-xs space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-950 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <QrCode className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-zinc-950">
                            Instant UPI & Dynamic QR Code
                          </span>
                          <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Sole Gateway
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-600 mt-0.5">
                          Pay directly with any UPI App or scan on-screen QR from another phone.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Badges for Supported UPI Providers */}
                  <div className="pt-2 border-t border-zinc-200/80 flex flex-wrap items-center gap-2 text-[11px] text-zinc-600">
                    <span className="px-2 py-0.5 rounded-md bg-white border border-zinc-200 font-medium">Google Pay</span>
                    <span className="px-2 py-0.5 rounded-md bg-white border border-zinc-200 font-medium">PhonePe</span>
                    <span className="px-2 py-0.5 rounded-md bg-white border border-zinc-200 font-medium">Paytm</span>
                    <span className="px-2 py-0.5 rounded-md bg-white border border-zinc-200 font-medium">CRED</span>
                    <span className="px-2 py-0.5 rounded-md bg-white border border-zinc-200 font-medium">Any UPI App</span>
                  </div>

                  {/* Cross-device scanning assurance */}
                  <div className="p-2.5 rounded-lg bg-white border border-zinc-200/80 text-[11px] text-zinc-600 flex items-start gap-2">
                    <Smartphone className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                    <span>
                      <strong>Cross-device scanning supported:</strong> If you scan the QR code from another phone, this checkout screen will automatically detect payment success via webhook and proceed without manual refresh.
                    </span>
                  </div>
                </div>
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
                  className="w-full font-semibold shadow-sm h-11 gap-2"
                  isLoading={loading || isVerifying}
                >
                  <Lock className="w-4 h-4" />
                  <span>Pay {formatCurrency(subtotal)} via UPI</span>
                </Button>
                <p className="text-[10px] text-zinc-500 text-center mt-2 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>Atomic stock reservation • Razorpay 256-bit encrypted</span>
                </p>
              </div>
            </Card>
          </div>
        </div>

        {/* Mobile Sticky Bottom Checkout Bar */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-zinc-200 shadow-xl p-3 md:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] text-zinc-500">Payable Total</div>
              <div className="font-extrabold text-base text-zinc-950 font-mono">
                {formatCurrency(subtotal)}
              </div>
            </div>

            <Button
              type="submit"
              size="md"
              className="gap-2 font-semibold shadow-sm h-10 px-5"
              isLoading={loading || isVerifying}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Pay via UPI</span>
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
