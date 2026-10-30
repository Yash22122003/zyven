'use client';

import React, { useEffect, useState } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Edit2, Check, X, Sparkles } from 'lucide-react';

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [priceVal, setPriceVal] = useState('');
  const [durationVal, setDurationVal] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/admin/plans');
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || []);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleEditClick = (plan: any) => {
    setEditingPlan(plan);
    setPriceVal(plan.priceInr.toString());
    setDurationVal(plan.introDurationMonths.toString());
    setError('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/plans/${editingPlan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceInr: parseFloat(priceVal),
          introDurationMonths: parseInt(durationVal, 10),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update plan');
      }

      setEditingPlan(null);
      setSuccess(`Plan ${data.plan.name} updated successfully!`);
      setTimeout(() => setSuccess(''), 3000);
      await fetchPlans();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error updating plan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
          SaaS Subscription Pricing & Promotion Controls
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          Configure introductory promotional pricing (₹1/month), offer duration, and standard post-promo rates.
        </p>
      </div>

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-zinc-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`p-6 flex flex-col justify-between ${
                plan.isIntroductory ? 'border-2 border-zinc-950 bg-zinc-50/40' : ''
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <Badge
                    variant={plan.isIntroductory ? 'brand' : 'neutral'}
                    size="sm"
                    className="font-mono text-[10px]"
                  >
                    {plan.code}
                  </Badge>
                  {plan.isIntroductory && (
                    <Badge variant="warning" size="sm" className="gap-1">
                      <Sparkles className="w-3 h-3" />
                      Promo Offer
                    </Badge>
                  )}
                </div>

                <h3 className="font-bold text-base text-zinc-950 mt-3">{plan.name}</h3>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-zinc-950">
                    {formatCurrency(plan.priceInr)}
                  </span>
                  <span className="text-xs text-zinc-500">
                    / {plan.billingIntervalMonths === 12 ? 'year' : 'month'}
                  </span>
                </div>

                {plan.isIntroductory && (
                  <p className="text-xs text-zinc-600 mt-2">
                    Valid for first <span className="font-semibold">{plan.introDurationMonths} months</span> for new stores.
                  </p>
                )}

                <div className="mt-4 pt-3 border-t border-zinc-100 text-xs text-zinc-600">
                  <span className="font-semibold text-zinc-950">{plan.activeSubscriptionsCount}</span> active businesses on this tier
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-100">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs gap-1.5"
                  onClick={() => handleEditClick(plan)}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Configure Price & Rules</span>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Plan Dialog */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h3 className="font-bold text-base text-zinc-950">
                Configure Plan: {editingPlan.name}
              </h3>
              <button
                onClick={() => setEditingPlan(null)}
                className="text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <Input
                label="Subscription Price in INR (₹)"
                type="number"
                step="0.01"
                min="0"
                value={priceVal}
                onChange={(e) => setPriceVal(e.target.value)}
                required
              />

              {editingPlan.isIntroductory && (
                <Input
                  label="Introductory Period Duration (Months)"
                  type="number"
                  min="1"
                  max="12"
                  value={durationVal}
                  onChange={(e) => setDurationVal(e.target.value)}
                  required
                />
              )}

              <p className="text-[11px] text-zinc-400">
                Changes apply immediately to newly registered businesses. Existing subscriptions adhere to their current period terms.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingPlan(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={submitting}>
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
