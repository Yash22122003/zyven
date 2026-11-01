'use client';

import React, { useEffect, useState } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, CheckCircle2, Sparkles, Shield, Clock, AlertCircle } from 'lucide-react';

export default function MerchantSubscriptionPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/merchant/subscription')
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-3xl space-y-4">
        <div className="h-8 w-48 bg-zinc-200 rounded animate-pulse" />
        <div className="h-64 bg-zinc-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  const { subscription, payments } = data || {};

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
          SaaS Subscription & Billing
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          Manage your ZYVEN platform subscription, introductory promo status, and billing history.
        </p>
      </div>

      {/* Active Plan Card */}
      {subscription ? (
        <Card className="p-6 sm:p-8 border-zinc-300 shadow-sm relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-zinc-100">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="brand" size="sm" className="bg-zinc-950 text-white font-mono">
                  {subscription.code}
                </Badge>
                <Badge variant="success" size="sm">
                  Active Subscription
                </Badge>
              </div>

              <h2 className="text-2xl font-extrabold text-zinc-950 mt-2">
                {subscription.planName}
              </h2>

              <p className="text-xs text-zinc-500 mt-1">
                Full-featured commerce infrastructure with dedicated storefront route and inventory sync.
              </p>
            </div>

            <div className="text-left sm:text-right">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-zinc-950">
                  {formatCurrency(subscription.priceInr ?? subscription.price ?? 0)}
                </span>
                <span className="text-xs text-zinc-500 font-medium">/ month</span>
              </div>
              {subscription.isIntroductory && (
                <div className="text-[11px] text-emerald-700 font-semibold mt-1">
                  Introductory Offer (Month {subscription.introMonthsConsumed} of {subscription.maxIntroMonths})
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-6 border-b border-zinc-100 text-xs">
            <div className="space-y-2">
              <div className="flex justify-between text-zinc-600">
                <span>Current Billing Cycle:</span>
                <span className="font-semibold text-zinc-900">
                  {formatDate(subscription.currentPeriodStart)} – {formatDate(subscription.currentPeriodEnd)}
                </span>
              </div>

              <div className="flex justify-between text-zinc-600">
                <span>Next Renewal Date:</span>
                <span className="font-semibold text-zinc-900">
                  {formatDate(subscription.currentPeriodEnd)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-zinc-600">
                <span>Commission on Orders:</span>
                <span className="font-bold text-emerald-700">0% (Keep 100% Sales)</span>
              </div>

              <div className="flex justify-between text-zinc-600">
                <span>Standard Post-Promo Rate:</span>
                <span className="font-semibold text-zinc-900">
                  {formatCurrency(subscription.standardRenewalPrice ?? 299)} / month
                </span>
              </div>
            </div>
          </div>

          <div className="pt-5 flex items-center justify-between text-xs text-zinc-500">
            <div className="flex items-center gap-1.5 text-zinc-600">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span>Includes 7-day grace period on all automated renewals.</span>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-8 text-center text-zinc-500">
          <AlertCircle className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
          No active subscription record found.
        </Card>
      )}

      {/* Payment History Log */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
          Billing & Payment Receipts
        </h3>

        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 font-medium">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Transaction Reference</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {payments && payments.length > 0 ? (
                payments.map((p: any) => (
                  <tr key={p.id} className="hover:bg-zinc-50/50">
                    <td className="py-3 px-4 text-zinc-600">{formatDate(p.createdAt)}</td>
                    <td className="py-3 px-4 font-bold text-zinc-950">
                      {formatCurrency(p.amount ?? 0)}
                    </td>
                    <td className="py-3 px-4 text-zinc-700">{p.paymentMethod}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-zinc-500">
                      {p.gatewayTransactionId || 'TXN-DIRECT'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Badge variant="success" size="sm">
                        {p.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-zinc-400">
                    No billing history yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
