'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Store,
  ShieldCheck,
  TrendingUp,
  ShoppingBag,
  CreditCard,
  Users,
  ArrowRight,
} from 'lucide-react';

export default function AdminOverviewPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/overview')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => setData(json))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-zinc-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-zinc-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const { metrics, recentBusinesses } = data || {};

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
            Platform Operator Overview
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Global metrics, SaaS subscription health, and merchant network activity across ZYVEN.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/businesses">
            <Button size="sm" variant="outline" className="text-xs gap-1.5">
              <Store className="w-3.5 h-3.5" />
              <span>Businesses</span>
            </Button>
          </Link>
          <Link href="/admin/plans">
            <Button size="sm" className="text-xs gap-1.5 font-semibold">
              <CreditCard className="w-3.5 h-3.5" />
              <span>Configure Pricing</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="text-xs text-zinc-500 font-medium">Total Registered Businesses</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-zinc-950">
              {metrics?.totalBusinesses || 0}
            </span>
            <span className="text-xs text-emerald-600 font-medium">
              ({metrics?.verifiedBusinesses || 0} verified)
            </span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-xs text-zinc-500 font-medium">Total Pickup Orders Processed</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-zinc-950">
              {metrics?.totalOrders || 0}
            </span>
            <span className="text-xs text-zinc-400">orders</span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-xs text-zinc-500 font-medium">Total Merchant GMV (Zero Take Rate)</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-zinc-950">
              {formatCurrency(metrics?.totalGMV || 0)}
            </span>
          </div>
        </Card>

        <Card className="p-5 border-zinc-900 bg-zinc-950 text-white">
          <div className="text-xs text-zinc-400 font-medium">Monthly Recurring Revenue (MRR)</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {formatCurrency(metrics?.platformMRR || 0)}
            </span>
            <span className="text-xs text-emerald-400">
              ({metrics?.activeSubscriptionsCount || 0} active subs)
            </span>
          </div>
        </Card>
      </div>

      {/* Recent Onboarded Stores */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-zinc-950">Recently Onboarded Businesses</h2>
            <p className="text-xs text-zinc-500">Live storefronts registered on the platform</p>
          </div>
          <Link href="/admin/businesses">
            <Button variant="ghost" size="sm" className="text-xs gap-1">
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 font-medium">
                <tr>
                  <th className="py-3 px-4">Business</th>
                  <th className="py-3 px-4">Storefront Route</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Owner</th>
                  <th className="py-3 px-4">Products</th>
                  <th className="py-3 px-4">Orders</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {recentBusinesses &&
                  recentBusinesses.map((b: any) => (
                    <tr key={b.id} className="hover:bg-zinc-50/50">
                      <td className="py-3 px-4 font-semibold text-zinc-950">{b.name}</td>
                      <td className="py-3 px-4 font-mono text-zinc-500">
                        <a
                          href={`/${b.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline hover:text-zinc-900"
                        >
                          zyven.me/{b.slug}
                        </a>
                      </td>
                      <td className="py-3 px-4 text-zinc-600">{b.category}</td>
                      <td className="py-3 px-4 text-zinc-700">
                        <div>{b.ownerName}</div>
                        <div className="text-[10px] text-zinc-400">{b.ownerEmail}</div>
                      </td>
                      <td className="py-3 px-4 font-medium text-zinc-900">{b.productCount}</td>
                      <td className="py-3 px-4 font-medium text-zinc-900">{b.orderCount}</td>
                      <td className="py-3 px-4">
                        {b.isVerified ? (
                          <Badge variant="success" size="sm">
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="warning" size="sm">
                            Unverified
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-zinc-400">
                        {formatDate(b.createdAt)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
