'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Check,
  Store,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Clock,
  Layers,
  HelpCircle,
} from 'lucide-react';

interface PlanItem {
  id: string;
  name: string;
  code: string;
  priceInr: number;
  billingIntervalMonths: number;
  isIntroductory: boolean;
  introDurationMonths: number;
}

export default function OnboardingPlanPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [businessName, setBusinessName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/merchant/onboarding/state')
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 401) {
            router.push('/login?redirect=/onboarding/plan');
            return null;
          }
          throw new Error('Failed to load onboarding status');
        }
        return res.json();
      })
      .then((data) => {
        if (data) {
          if (data.business?.status === 'ACTIVE') {
            router.push('/dashboard');
            return;
          }
          setBusinessName(data.business?.name || 'Your Store');
          setPlans(data.plans || []);
          if (data.business?.selectedPlan?.id) {
            setSelectedPlanId(data.business.selectedPlan.id);
          } else if (data.plans && data.plans.length > 0) {
            // Default to introductory plan or first plan
            const intro = data.plans.find((p: PlanItem) => p.isIntroductory);
            setSelectedPlanId(intro ? intro.id : data.plans[0].id);
          }
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [router]);

  const handleSelectPlan = async () => {
    if (!selectedPlanId) return;
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/merchant/onboarding/select-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: selectedPlanId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to select plan');
      }

      router.push(data.redirectUrl || '/onboarding/checkout');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error proceeding to checkout');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 space-y-6">
        <div className="h-10 w-64 bg-zinc-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-96 bg-zinc-100 rounded-2xl animate-pulse" />
          <div className="h-96 bg-zinc-100 rounded-2xl animate-pulse" />
          <div className="h-96 bg-zinc-100 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-zinc-50/60 py-12 px-4 sm:px-6 flex flex-col justify-center">
      <div className="max-w-4xl mx-auto w-full space-y-8">
        {/* Onboarding Stepper Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <span>Step 1 of 2: Select Subscription Plan</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-950">
            Activate Digital Storefront for {businessName}
          </h1>
          <p className="text-sm text-zinc-600 max-w-xl mx-auto">
            Choose a predictable SaaS tier. ZYVEN never charges commissions on your sales—you keep 100% of your earnings.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium text-center">
            {error}
          </div>
        )}

        {/* Plan Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isSelected = selectedPlanId === plan.id;

            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlanId(plan.id)}
                className={`relative rounded-2xl p-6 bg-white border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-zinc-950 ring-2 ring-zinc-950/10 shadow-lg'
                    : 'border-zinc-200 hover:border-zinc-300 shadow-xs'
                }`}
              >
                {plan.isIntroductory && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-xs flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Introductory Special
                    </span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg text-zinc-950">{plan.name}</h3>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        isSelected
                          ? 'border-zinc-950 bg-zinc-950 text-white'
                          : 'border-zinc-300'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold tracking-tight text-zinc-950">
                      {formatCurrency(plan.priceInr)}
                    </span>
                    <span className="text-xs text-zinc-500 font-medium">
                      /{plan.billingIntervalMonths === 12 ? 'year' : 'month'}
                    </span>
                  </div>

                  {plan.isIntroductory ? (
                    <p className="mt-1 text-xs text-emerald-700 font-semibold">
                      ₹1/month for your first {plan.introDurationMonths} months, then ₹299/mo
                    </p>
                  ) : plan.billingIntervalMonths === 12 ? (
                    <p className="mt-1 text-xs text-emerald-700 font-semibold">
                      Save ₹589/year vs monthly billing
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-zinc-500">Billed monthly, cancel anytime</p>
                  )}

                  {/* Feature Checklist */}
                  <ul className="mt-6 space-y-2.5 text-xs text-zinc-700">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Dedicated branded storefront (zyven.me/slug)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span><strong>0% Sales Commission</strong> (Keep 100%)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Instant Razorpay UPI & QR payments</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Real-time stock reservation engine</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>In-store pickup order queue & alerts</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-8 pt-4 border-t border-zinc-100">
                  <Button
                    type="button"
                    variant={isSelected ? 'primary' : 'outline'}
                    size="sm"
                    className="w-full font-semibold"
                  >
                    {isSelected ? 'Selected Plan' : 'Select Plan'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-zinc-200">
          <div className="text-xs text-zinc-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Encrypted payment processing via Razorpay. Zero hidden fees.</span>
          </div>

          <Button
            size="lg"
            onClick={handleSelectPlan}
            isLoading={submitting}
            className="w-full sm:w-auto h-11 px-8 font-semibold gap-2 shadow-sm"
          >
            <span>Continue to Order Summary</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
