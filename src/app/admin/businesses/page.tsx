'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Store,
  Search,
  ShieldCheck,
  ShieldAlert,
  Ban,
  Check,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

interface BusinessItem {
  id: string;
  name: string;
  slug: string;
  owner: { id: string; fullName: string; email: string; phone: string };
  category: string;
  city: string;
  state: string;
  phone: string;
  isVerified: boolean;
  isActive: boolean;
  status: string;
  isOpenManually: boolean;
  productCount: number;
  orderCount: number;
  selectedPlan: {
    id: string;
    name: string;
    code: string;
    price?: number;
    priceInr?: number;
  } | null;
  subscription: {
    id?: string;
    planName: string;
    code: string;
    price?: number;
    priceInr?: number;
    status: string;
    currentPeriodEnd?: string | Date;
  } | null;
  payments: Array<{
    id: string;
    amount: number;
    status: string;
    method: string;
    createdAt: string | Date;
  }>;
  createdAt: string | Date;
}

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<'ALL' | 'ACTIVE' | 'PENDING' | 'FAILED' | 'SUSPENDED'>('ALL');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchBusinesses = async () => {
    try {
      const url = new URL('/api/admin/businesses', window.location.origin);
      if (search.trim()) url.searchParams.set('q', search.trim());
      if (statusTab !== 'ALL') url.searchParams.set('status', statusTab);

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setBusinesses(data.businesses || []);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, [statusTab]);

  const handleManualActivate = async (id: string) => {
    const reason = window.prompt('Enter mandatory audit reason for manual Super Admin activation:', 'Super Admin manual onboarding verification');
    if (reason === null) return;

    setProcessingId(id);
    try {
      const res = await fetch(`/api/admin/businesses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ACTIVATE', reason }),
      });

      if (res.ok) {
        setBusinesses((prev) =>
          prev.map((b) => (b.id === id ? { ...b, status: 'ACTIVE', isActive: true } : b))
        );
      }
    } catch {
      // Ignore
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggleVerification = async (id: string, currentState: boolean) => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/admin/businesses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVerified: !currentState }),
      });

      if (res.ok) {
        setBusinesses((prev) =>
          prev.map((b) => (b.id === id ? { ...b, isVerified: !currentState } : b))
        );
      }
    } catch {
      // Ignore
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggleSuspension = async (id: string, currentActive: boolean) => {
    const reason = window.prompt(
      `Enter reason to ${currentActive ? 'SUSPEND' : 'REACTIVATE'} this merchant:`,
      currentActive ? 'Store compliance investigation' : 'Compliance resolved'
    );
    if (reason === null) return;

    setProcessingId(id);
    try {
      const res = await fetch(`/api/admin/businesses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: currentActive ? 'SUSPEND' : 'ACTIVATE',
          reason,
        }),
      });

      if (res.ok) {
        setBusinesses((prev) =>
          prev.map((b) =>
            b.id === id
              ? {
                  ...b,
                  status: currentActive ? 'SUSPENDED' : 'ACTIVE',
                  isActive: !currentActive,
                }
              : b
          )
        );
      }
    } catch {
      // Ignore
    } finally {
      setProcessingId(null);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBusinesses();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
            Business Governance & Moderation
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Audit merchant storefronts, grant verification badges, and govern store availability.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchBusinesses()}
          className="gap-1.5 text-xs self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Search & Status Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 rounded-xl border border-zinc-200 text-xs overflow-x-auto">
          {(['ALL', 'ACTIVE', 'PENDING', 'FAILED', 'SUSPENDED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusTab(tab)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 ${
                statusTab === tab
                  ? 'bg-white text-zinc-950 shadow-xs font-semibold'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              {tab === 'ALL' && 'All Merchants'}
              {tab === 'ACTIVE' && 'Active Stores'}
              {tab === 'PENDING' && 'Pending Activation'}
              {tab === 'FAILED' && 'Failed Payments'}
              {tab === 'SUSPENDED' && 'Suspended'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="w-full sm:w-72 relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-zinc-400" />
          <input
            type="text"
            placeholder="Search stores or owners..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-zinc-200 bg-white text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-950"
          />
        </form>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-zinc-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : businesses.length === 0 ? (
        <Card className="p-16 text-center text-zinc-500">
          <Store className="w-10 h-10 text-zinc-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-zinc-900">No businesses found</p>
        </Card>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 font-medium">
                <tr>
                  <th className="py-3 px-4">Business</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Route Slug</th>
                  <th className="py-3 px-4">Owner & Contact</th>
                  <th className="py-3 px-4">Plan & Billing</th>
                  <th className="py-3 px-4">Verification</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {businesses.map((b) => (
                  <tr key={b.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-zinc-950 flex items-center gap-1.5">
                        <span>{b.name}</span>
                        {b.isVerified && (
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        {b.city}, {b.state} • {b.category}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          b.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : b.status === 'PAYMENT_PENDING' || b.status === 'PLAN_SELECTED'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : b.status === 'PAYMENT_FAILED'
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : b.status === 'SUSPENDED'
                            ? 'bg-red-100 text-red-900 border border-red-300'
                            : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            b.status === 'ACTIVE'
                              ? 'bg-emerald-500'
                              : b.status === 'PAYMENT_FAILED'
                              ? 'bg-rose-500'
                              : b.status === 'SUSPENDED'
                              ? 'bg-red-600'
                              : 'bg-amber-500'
                          }`}
                        />
                        <span>{b.status}</span>
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono">
                      <a
                        href={`/${b.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-zinc-600 hover:text-zinc-950 hover:underline flex items-center gap-1"
                      >
                        <span>/{b.slug}</span>
                        <ExternalLink className="w-3 h-3 text-zinc-400" />
                      </a>
                    </td>

                    <td className="py-3 px-4 text-zinc-700">
                      <div className="font-medium text-zinc-900">{b.owner.fullName}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">{b.phone}</div>
                    </td>

                    <td className="py-3 px-4">
                      {b.subscription ? (
                        <div>
                          <Badge variant="neutral" size="sm" className="font-mono text-[10px]">
                            {b.subscription.code}
                          </Badge>
                          <div className="text-[10px] text-zinc-500 mt-0.5">
                            {formatCurrency(b.subscription.priceInr ?? b.subscription.price ?? 0)}/mo
                          </div>
                        </div>
                      ) : b.selectedPlan ? (
                        <div>
                          <Badge variant="neutral" size="sm" className="font-mono text-[10px] bg-amber-50 text-amber-800 border-amber-200">
                            {b.selectedPlan.code} (Selected)
                          </Badge>
                          <div className="text-[10px] text-zinc-400 mt-0.5">
                            Pending {formatCurrency(b.selectedPlan.priceInr ?? b.selectedPlan.price ?? 0)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-zinc-400">No plan chosen</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleVerification(b.id, b.isVerified)}
                        disabled={processingId === b.id}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                          b.isVerified
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-zinc-100 text-zinc-600 border border-zinc-200 hover:bg-zinc-200'
                        }`}
                      >
                        {b.isVerified ? 'Verified' : 'Click to Verify'}
                      </button>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {b.status !== 'ACTIVE' && (
                          <button
                            onClick={() => handleManualActivate(b.id)}
                            disabled={processingId === b.id}
                            className="px-2 py-1 rounded text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs transition-colors"
                            title="Activate store with mandatory audit log"
                          >
                            Activate (Audit)
                          </button>
                        )}

                        <button
                          onClick={() => handleToggleSuspension(b.id, b.isActive)}
                          disabled={processingId === b.id}
                          className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                            b.isActive
                              ? 'text-rose-700 hover:bg-rose-50 border border-rose-200'
                              : 'text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
                          }`}
                        >
                          {b.isActive ? 'Suspend' : 'Reactivate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
