'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ShieldCheck,
  CreditCard,
  QrCode,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Sparkles,
  Lock,
  RefreshCw,
} from 'lucide-react';

function OnboardingCheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialFailed = searchParams.get('status') === 'failed';

  const [state, setState] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paymentInitiating, setPaymentInitiating] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState(initialFailed ? 'Previous payment was not completed or failed.' : '');
  const [sdkLoaded, setSdkLoaded] = useState(false);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Load Razorpay Checkout SDK
  useEffect(() => {
    if ((window as any).Razorpay) {
      setSdkLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setSdkLoaded(true);
    script.onerror = () => setPaymentError('Failed to load secure Razorpay Checkout SDK.');
    document.body.appendChild(script);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const fetchState = async () => {
    try {
      const res = await fetch('/api/merchant/onboarding/state');
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login?redirect=/onboarding/checkout');
          return;
        }
        throw new Error('Failed to load merchant onboarding state');
      }
      const data = await res.json();
      setState(data);

      if (data.business?.status === 'ACTIVE') {
        setPaymentSuccess(true);
        setTimeout(() => router.push('/dashboard'), 1500);
      } else if (!data.business?.selectedPlan) {
        router.push('/onboarding/plan');
      } else if (data.business?.status === 'PAYMENT_FAILED') {
        setPaymentError('Previous payment attempt failed. You can safely retry below.');
      }
    } catch (err: unknown) {
      setPaymentError(err instanceof Error ? err.message : 'Error loading checkout');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  // Cross-device status polling when payment is in progress
  const startStatusPolling = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/merchant/onboarding/state');
        if (res.ok) {
          const data = await res.json();
          if (data.business?.status === 'ACTIVE') {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setPaymentSuccess(true);
            setTimeout(() => router.push('/dashboard'), 1500);
          }
        }
      } catch {
        // Ignore polling error
      }
    }, 2000);
  };

  const handleLaunchPayment = async () => {
    setPaymentError('');
    setPaymentInitiating(true);

    try {
      const res = await fetch('/api/merchant/onboarding/create-subscription-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to prepare subscription order');
      }

      const { razorpay } = data;
      if (!razorpay || !razorpay.orderId) {
        throw new Error('Razorpay order initialization failed');
      }

      startStatusPolling();

      const options = {
        key: razorpay.keyId,
        amount: razorpay.amount,
        currency: razorpay.currency,
        name: razorpay.name,
        description: razorpay.description,
        order_id: razorpay.orderId,
        notes: {
          businessId: state.business.id,
        },
        modal: {
          ondismiss: async () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setPaymentInitiating(false);
            setPaymentError('Payment window was dismissed. You can retry payment at any time.');
            await fetch('/api/merchant/onboarding/payment-failed', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ razorpayOrderId: razorpay.orderId, reason: 'Modal closed' }),
            }).catch(() => {});
          },
        },
        handler: async (response: any) => {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setVerifying(true);

          try {
            const verifyRes = await fetch('/api/merchant/onboarding/verify-subscription', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              throw new Error(verifyData.error || 'Payment verification failed');
            }

            setPaymentSuccess(true);
            setTimeout(() => {
              router.push('/dashboard');
            }, 1200);
          } catch (verErr: unknown) {
            setPaymentError(verErr instanceof Error ? verErr.message : 'Cryptographic verification failed');
          } finally {
            setVerifying(false);
            setPaymentInitiating(false);
          }
        },
        theme: {
          color: '#09090b',
        },
      };

      const rzpInstance = new (window as any).Razorpay(options);
      rzpInstance.open();
    } catch (err: unknown) {
      setPaymentError(err instanceof Error ? err.message : 'Error launching payment');
      setPaymentInitiating(false);
    }
  };

  const { business } = state || {};
  const plan = business?.selectedPlan;

  if (loading || (!plan && !paymentSuccess)) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 space-y-4">
        <div className="h-8 w-48 bg-zinc-200 rounded animate-pulse" />
        <div className="h-72 bg-zinc-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4 bg-white border-emerald-200 shadow-xl">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
          </div>
          <h2 className="text-2xl font-extrabold text-zinc-950">Store Activated!</h2>
          <p className="text-xs text-zinc-600 leading-relaxed">
            Your subscription payment is cryptographically verified. Entering your merchant operations console...
          </p>
          <div className="pt-2">
            <Button size="sm" onClick={() => router.push('/dashboard')} className="w-full">
              Enter Merchant Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-zinc-50/60 py-12 px-4 sm:px-6 flex flex-col justify-center">
      <div className="max-w-xl mx-auto w-full space-y-6">
        {/* Stepper Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <span>Step 2 of 2: Order Summary & Activation</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950">
            Confirm Subscription Order
          </h1>
          <p className="text-xs text-zinc-500">
            Activate live inventory sync, store pickup processing, and your dedicated storefront.
          </p>
        </div>

        {/* Failure / Dismissal Alert */}
        {paymentError && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{paymentError}</p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Your store registration and details are safe. Click below to retry.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Order Summary Card */}
        <Card className="p-6 bg-white border-zinc-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
            <div>
              <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                Store Registration
              </div>
              <h3 className="font-bold text-base text-zinc-950 mt-0.5">{business.name}</h3>
              <span className="font-mono text-xs text-zinc-400">zyven.me/{business.slug}</span>
            </div>
            <Badge variant="neutral" size="sm" className="bg-zinc-100 text-zinc-700">
              Pending Activation
            </Badge>
          </div>

          {/* Plan Breakdown */}
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-zinc-900">{plan.name}</span>
                <span className="text-zinc-500 ml-1">
                  ({plan.billingIntervalMonths === 12 ? 'Annual Billing' : 'Monthly Billing'})
                </span>
              </div>
              <span className="font-mono font-bold text-zinc-900">
                {formatCurrency(plan.priceInr ?? plan.price ?? 0)}
              </span>
            </div>

            <div className="flex items-center justify-between text-zinc-500">
              <span>Platform SaaS Fee</span>
              <span className="font-mono">{formatCurrency(plan.priceInr ?? plan.price ?? 0)}</span>
            </div>

            <div className="flex items-center justify-between text-zinc-500">
              <span>Taxes & GST (Included)</span>
              <span className="font-mono">₹0.00</span>
            </div>

            <div className="flex items-center justify-between text-emerald-700 font-semibold bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-100">
              <span>ZYVEN Sales Commission</span>
              <span>0% (You keep 100%)</span>
            </div>

            <div className="pt-3 border-t border-zinc-200 flex items-baseline justify-between">
              <span className="font-bold text-sm text-zinc-950">Total Payable Now</span>
              <div className="text-right">
                <span className="text-2xl font-extrabold font-mono text-zinc-950">
                  {formatCurrency(plan.priceInr ?? plan.price ?? 0)}
                </span>
                <div className="text-[10px] text-zinc-400">
                  {plan.isIntroductory ? 'Introductory promo for month 1' : 'Inclusive of all charges'}
                </div>
              </div>
            </div>
          </div>

          {/* Payment CTA */}
          <div className="pt-3 space-y-3">
            <Button
              size="lg"
              onClick={handleLaunchPayment}
              isLoading={paymentInitiating || verifying}
              disabled={!sdkLoaded}
              className="w-full font-bold h-12 gap-2 shadow-md"
            >
              <CreditCard className="w-4 h-4" />
              <span>
                {verifying
                  ? 'Verifying Payment Cryptography...'
                  : paymentInitiating
                  ? 'Opening Razorpay UPI...'
                  : `Pay ${formatCurrency(plan.priceInr ?? plan.price ?? 0)} & Activate Store`}
              </span>
            </Button>

            <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
              <Link
                href="/onboarding/plan"
                className="hover:text-zinc-950 hover:underline flex items-center gap-1 font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Change Plan</span>
              </Link>

              <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                <Lock className="w-3 h-3 text-emerald-600" />
                <span>Razorpay Secured UPI</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function OnboardingCheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto px-4 py-16 space-y-4">
          <div className="h-8 w-48 bg-zinc-200 rounded animate-pulse" />
          <div className="h-72 bg-zinc-100 rounded-2xl animate-pulse" />
        </div>
      }
    >
      <OnboardingCheckoutContent />
    </Suspense>
  );
}
