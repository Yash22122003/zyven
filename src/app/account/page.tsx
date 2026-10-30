'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { OrderStatusPill } from '@/components/ui/status-pill';
import {
  ShoppingBag,
  Store,
  Clock,
  MapPin,
  ArrowRight,
  PackageCheck,
  Search,
  ExternalLink,
  RefreshCw,
  Phone,
  Mail,
  User,
  ShieldCheck,
  CheckCircle2,
  LogOut,
  Settings,
  Heart,
  ChevronRight,
  Edit2,
  Check,
  X,
  CreditCard,
} from 'lucide-react';
import { OrderStatus } from '@prisma/client';

export default function CustomerDashboardPage() {
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Edit profile state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');

  const fetchProfile = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch('/api/customer/profile');
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login?redirect=/account');
          return;
        }
        throw new Error('Failed to load customer profile');
      }
      const json = await res.json();
      setData(json);
      setEditName(json.user?.fullName || '');
      setEditPhone(json.user?.phone || '');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching account');
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSuccessMsg('');
    setError('');

    try {
      const res = await fetch('/api/customer/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: editName, phone: editPhone }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to update profile');
      }

      setData((prev: any) => ({
        ...prev,
        user: { ...prev.user, fullName: editName, phone: editPhone },
      }));
      setProfileSuccessMsg('Profile updated successfully');
      setIsEditingProfile(false);
      setTimeout(() => setProfileSuccessMsg(''), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex-1 w-full space-y-6">
        <div className="h-32 rounded-2xl bg-zinc-100 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-28 rounded-xl bg-zinc-100 animate-pulse" />
          <div className="h-28 rounded-xl bg-zinc-100 animate-pulse" />
          <div className="h-28 rounded-xl bg-zinc-100 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-4 flex-1">
        <User className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-zinc-950">Unable to load account</h2>
        <p className="text-xs text-zinc-600 mt-1">{error || 'Please sign in again to access your account.'}</p>
        <Link href="/login" className="mt-5 inline-block">
          <Button size="sm">Go to Sign in</Button>
        </Link>
      </div>
    );
  }

  const { user, stats, activeOrders, recentOrders, savedStores } = data;
  const firstName = user.fullName ? user.fullName.split(' ')[0] : 'Customer';

  return (
    <div className="flex-1 bg-zinc-50/60 pb-20">
      {/* Customer Header Ribbon */}
      <div className="bg-white border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Customer Account</span>
                </span>
                <span className="text-xs text-zinc-400">•</span>
                <span className="text-xs text-zinc-500 font-mono">Member since {formatDate(user.createdAt)}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950">
                Hi, {firstName}! <span className="text-zinc-500 font-normal">Welcome back, Customer.</span>
              </h1>
              <p className="text-xs sm:text-sm text-zinc-600">
                Track pickup orders, discover local stores, and manage your buyer account.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchProfile(true)}
                isLoading={refreshing}
                className="gap-1.5 text-xs h-9"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </Button>

              <Link href="/explore">
                <Button size="sm" className="gap-1.5 text-xs h-9 font-medium shadow-xs">
                  <Store className="w-3.5 h-3.5" />
                  <span>Browse Stores</span>
                </Button>
              </Link>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-zinc-500 hover:text-zinc-900 text-xs h-9"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-zinc-100">
            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80">
              <div className="text-[11px] font-medium text-zinc-500">Active Pickups</div>
              <div className="text-xl sm:text-2xl font-extrabold text-zinc-950 font-mono mt-0.5">
                {stats.activeOrdersCount}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80">
              <div className="text-[11px] font-medium text-zinc-500">Completed Orders</div>
              <div className="text-xl sm:text-2xl font-extrabold text-zinc-950 font-mono mt-0.5">
                {stats.completedOrdersCount}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80">
              <div className="text-[11px] font-medium text-zinc-500">Total Spend</div>
              <div className="text-xl sm:text-2xl font-extrabold text-zinc-950 font-mono mt-0.5">
                {formatCurrency(stats.totalSpent)}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80">
              <div className="text-[11px] font-medium text-zinc-500">Favorite Shops</div>
              <div className="text-xl sm:text-2xl font-extrabold text-zinc-950 font-mono mt-0.5">
                {savedStores.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
        {profileSuccessMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{profileSuccessMsg}</span>
          </div>
        )}

        {/* 1. Active In-Store Pickups Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-emerald-600" />
              <h2 className="text-base sm:text-lg font-bold text-zinc-950">Active Store Pickups</h2>
              {activeOrders.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </div>
            <Link
              href="/account/orders"
              className="text-xs font-medium text-zinc-600 hover:text-zinc-950 flex items-center gap-1"
            >
              <span>View All Orders</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {activeOrders.length === 0 ? (
            <Card className="p-6 text-center bg-white border-zinc-200/80">
              <ShoppingBag className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-zinc-900">No active pickups right now</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Order online from nearby shops and collect when ready without delivery fees.
              </p>
              <Link href="/explore" className="mt-3.5 inline-block">
                <Button size="sm" variant="outline" className="text-xs">
                  Discover Stores
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeOrders.map((o: any) => (
                <Card
                  key={o.id}
                  className="p-5 bg-white border-zinc-200/90 hover:border-zinc-300 shadow-xs transition-all space-y-3.5"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-zinc-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-zinc-950">#{o.orderNumber}</span>
                        <Badge
                          variant={o.paymentStatus === 'PAID' ? 'success' : 'neutral'}
                          size="sm"
                          className="text-[10px]"
                        >
                          {o.paymentStatus === 'PAID' ? 'Paid via UPI' : 'Payment Pending'}
                        </Badge>
                      </div>
                      <div className="text-xs text-zinc-500 mt-0.5">Placed on {formatDate(o.createdAt)}</div>
                    </div>
                    <OrderStatusPill status={o.status} />
                  </div>

                  <div className="space-y-1.5 text-xs text-zinc-600">
                    <div className="flex items-center gap-2 font-semibold text-zinc-900">
                      <Store className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{o.business.name}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                      <span className="truncate">{o.business.addressLine1}, {o.business.city}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-xs">
                    <div className="font-mono font-extrabold text-sm text-zinc-950">
                      {formatCurrency(o.totalAmount)}
                    </div>

                    <Link href={`/${o.business.slug}/orders/${o.orderNumber}`}>
                      <Button size="sm" className="gap-1 text-xs h-8 px-3">
                        <span>Track Live Status</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* 2. Customer Profile Card & Account Settings */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-7">
            <Card className="p-5 sm:p-6 bg-white border-zinc-200/90 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-zinc-700" />
                  <h2 className="font-bold text-sm text-zinc-950">Customer Profile Card</h2>
                </div>
                {!isEditingProfile && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingProfile(true)}
                    className="text-xs gap-1 text-zinc-600 h-8"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Info</span>
                  </Button>
                )}
              </div>

              {isEditingProfile ? (
                <form onSubmit={handleUpdateProfile} className="space-y-3.5 pt-1">
                  <Input
                    label="Full Name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />

                  <Input
                    label="Registered Mobile Number"
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+91 98765 00000"
                  />

                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">
                      Email Address (Managed by Auth)
                    </label>
                    <input
                      type="email"
                      value={user.email || ''}
                      disabled
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 text-xs text-zinc-500 cursor-not-allowed"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingProfile(false)}
                      className="text-xs h-8"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" isLoading={savingProfile} className="text-xs h-8">
                      Save Changes
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-zinc-50">
                    <span className="text-zinc-500 font-medium">Full Name</span>
                    <span className="font-semibold text-zinc-950">{user.fullName}</span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-zinc-50">
                    <span className="text-zinc-500 font-medium">Registered Phone</span>
                    <span className="font-mono text-zinc-900">{user.phone || 'Not provided'}</span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-zinc-50">
                    <span className="text-zinc-500 font-medium">Email Address</span>
                    <span className="font-mono text-zinc-900">{user.email || 'Not provided'}</span>
                  </div>

                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-zinc-500 font-medium">Platform Role</span>
                    <Badge variant="neutral" size="sm" className="font-semibold text-emerald-800 bg-emerald-50 border-emerald-200">
                      Verified Customer
                    </Badge>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Quick Shortcuts & Saved Stores */}
          <div className="md:col-span-5 space-y-4">
            <Card className="p-5 sm:p-6 bg-white border-zinc-200/90 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-500" />
                  <h2 className="font-bold text-sm text-zinc-950">Favorite Local Shops</h2>
                </div>
                <Link href="/explore" className="text-xs text-zinc-500 hover:text-zinc-900">
                  Explore
                </Link>
              </div>

              <div className="space-y-2.5">
                {savedStores.map((store: any) => (
                  <Link
                    key={store.id}
                    href={`/${store.slug}`}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-100 hover:border-zinc-300 hover:bg-zinc-50 transition-all text-xs group"
                  >
                    <div className="flex items-center gap-2.5 truncate pr-2">
                      <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-700 font-bold shrink-0">
                        {store.name.charAt(0)}
                      </div>
                      <div className="truncate">
                        <div className="font-semibold text-zinc-950 group-hover:text-zinc-900 truncate">
                          {store.name}
                        </div>
                        <div className="text-[11px] text-zinc-500 truncate">{store.city}</div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1 font-medium text-zinc-900">
                      <span>Shop</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* 3. Recent Orders Summary */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-bold text-zinc-950">Recent Order History</h2>
            <Link
              href="/account/orders"
              className="text-xs font-medium text-zinc-600 hover:text-zinc-950 flex items-center gap-1"
            >
              <span>Full Order History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <Card className="p-6 text-center bg-white border-zinc-200">
              <p className="text-xs text-zinc-500">No past orders found.</p>
            </Card>
          ) : (
            <Card className="overflow-hidden border-zinc-200/90 shadow-xs bg-white">
              <div className="divide-y divide-zinc-100 text-xs">
                {recentOrders.map((o: any) => (
                  <div key={o.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-50/50 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-zinc-950">#{o.orderNumber}</span>
                        <OrderStatusPill status={o.status} />
                      </div>
                      <div className="text-zinc-500 text-[11px]">
                        <span>{o.business.name}</span> • <span>{formatDate(o.createdAt)}</span> • <span>{o.itemsCount} item(s)</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div className="font-mono font-bold text-zinc-950 text-sm">
                        {formatCurrency(o.totalAmount)}
                      </div>
                      <Link href={`/${o.business.slug}/orders/${o.orderNumber}`}>
                        <Button variant="outline" size="sm" className="text-xs h-7 px-3">
                          View Receipt
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
