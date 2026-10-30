'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { OrderStatus } from '@prisma/client';

interface CustomerOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  subtotal: number;
  paymentMethod: 'PAY_AT_STORE' | 'UPI_ONLINE';
  paymentStatus: 'PENDING' | 'PAID' | 'REFUNDED';
  pickupNotes: string | null;
  estimatedPickupTime: string | null;
  createdAt: string;
  expiresAt: string;
  itemsCount: number;
  business: {
    id: string;
    name: string;
    slug: string;
    phone: string;
    addressLine1: string;
    city: string;
    logoUrl: string | null;
    pickupInstructions: string | null;
    enableUpiQr: boolean;
    upiId: string | null;
  };
  items: {
    id: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
}

interface OrderStats {
  total: number;
  active: number;
  readyForPickup: number;
  completed: number;
  cancelled: number;
}

export default function CustomerOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [stats, setStats] = useState<OrderStats>({
    total: 0,
    active: 0,
    readyForPickup: 0,
    completed: 0,
    cancelled: 0,
  });
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchOrders = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch(`/api/customer/orders?status=${activeTab}`);
      if (res.status === 401) {
        router.push('/login?redirect=/account/orders');
        return;
      }
      if (!res.ok) {
        throw new Error('Failed to load orders');
      }
      const data = await res.json();
      setOrders(data.orders || []);
      if (data.stats) setStats(data.stats);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [activeTab]);

  const filteredOrders = orders.filter((order) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      order.orderNumber.toLowerCase().includes(q) ||
      order.business.name.toLowerCase().includes(q) ||
      order.items.some((i) => i.productName.toLowerCase().includes(q))
    );
  });

  const renderStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return (
          <Badge variant="warning" size="sm" className="gap-1 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Pending Confirmation
          </Badge>
        );
      case OrderStatus.ACCEPTED:
        return (
          <Badge variant="info" size="sm" className="gap-1 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Confirmed
          </Badge>
        );
      case OrderStatus.PREPARING:
        return (
          <Badge variant="info" size="sm" className="gap-1 font-medium bg-indigo-50 text-indigo-700 border-indigo-200">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            Preparing
          </Badge>
        );
      case OrderStatus.READY_FOR_PICKUP:
        return (
          <Badge variant="success" size="sm" className="gap-1.5 font-semibold bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            Ready for Pickup
          </Badge>
        );
      case OrderStatus.COLLECTED:
        return (
          <Badge variant="neutral" size="sm" className="gap-1 font-medium bg-zinc-100 text-zinc-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Collected / Delivered
          </Badge>
        );
      case OrderStatus.REJECTED:
      case OrderStatus.CANCELLED:
      case OrderStatus.EXPIRED:
        return (
          <Badge variant="error" size="sm" className="font-medium">
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  return (
    <div className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-zinc-950 text-white flex items-center justify-center shadow-xs">
              <PackageCheck className="w-4 h-4" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950">
              My Orders
            </h1>
          </div>
          <p className="text-xs text-zinc-600 mt-1">
            Track and manage your local in-store pickup orders from neighborhood stores.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/account">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs text-zinc-700 hover:text-zinc-950"
            >
              <span>Customer Overview</span>
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchOrders(true)}
            isLoading={refreshing}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </Button>

          <Link href="/explore">
            <Button variant="primary" size="sm" className="gap-1.5 text-xs">
              <Store className="w-3.5 h-3.5" />
              <span>Explore Stores</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setActiveTab('ALL')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'ALL'
              ? 'bg-zinc-950 text-white border-zinc-950 shadow-sm'
              : 'bg-white border-zinc-200/90 text-zinc-900 hover:border-zinc-300'
          }`}
        >
          <div className="text-[11px] opacity-75 font-medium">Total Orders</div>
          <div className="text-xl sm:text-2xl font-extrabold font-mono mt-0.5">{stats.total}</div>
        </div>

        <div
          onClick={() => setActiveTab('ACTIVE')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'ACTIVE'
              ? 'bg-zinc-950 text-white border-zinc-950 shadow-sm'
              : 'bg-white border-zinc-200/90 text-zinc-900 hover:border-zinc-300'
          }`}
        >
          <div className="text-[11px] opacity-75 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Active Orders</span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold font-mono mt-0.5">{stats.active}</div>
        </div>

        <div
          onClick={() => setActiveTab('COMPLETED')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'COMPLETED'
              ? 'bg-zinc-950 text-white border-zinc-950 shadow-sm'
              : 'bg-white border-zinc-200/90 text-zinc-900 hover:border-zinc-300'
          }`}
        >
          <div className="text-[11px] opacity-75 font-medium">Completed</div>
          <div className="text-xl sm:text-2xl font-extrabold font-mono mt-0.5">{stats.completed}</div>
        </div>

        <div
          onClick={() => setActiveTab('CANCELLED')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'CANCELLED'
              ? 'bg-zinc-950 text-white border-zinc-950 shadow-sm'
              : 'bg-white border-zinc-200/90 text-zinc-900 hover:border-zinc-300'
          }`}
        >
          <div className="text-[11px] opacity-75 font-medium">Cancelled</div>
          <div className="text-xl sm:text-2xl font-extrabold font-mono mt-0.5">{stats.cancelled}</div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl border border-zinc-200/80">
          {(['ALL', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === tab
                  ? 'bg-white text-zinc-950 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              {tab === 'ALL' && 'All'}
              {tab === 'ACTIVE' && `Active (${stats.active})`}
              {tab === 'COMPLETED' && 'Completed'}
              {tab === 'CANCELLED' && 'Cancelled'}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by order # or store..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 pl-8 pr-3 py-1.5 text-xs rounded-xl border border-zinc-200 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-950"
          />
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-zinc-100 animate-pulse" />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card className="py-16 px-4 text-center border-dashed">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400 mx-auto mb-3">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-base text-zinc-950">No orders found</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'No orders match your search query.'
              : activeTab === 'ACTIVE'
              ? 'You have no active orders in preparation.'
              : 'You have not placed any pickup orders yet. Support your local stores on ZYVEN.'}
          </p>
          <div className="mt-5">
            <Link href="/explore">
              <Button size="sm">Browse Neighborhood Stores</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card
              key={order.id}
              className="p-4 sm:p-5 hover:border-zinc-300 transition-all space-y-4 shadow-xs"
            >
              {/* Order Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200 overflow-hidden shrink-0 flex items-center justify-center">
                    {order.business.logoUrl ? (
                      <img
                        src={order.business.logoUrl}
                        alt={order.business.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Store className="w-5 h-5 text-zinc-400" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/${order.business.slug}`}
                        className="font-bold text-sm sm:text-base text-zinc-950 hover:underline flex items-center gap-1"
                      >
                        <span>{order.business.name}</span>
                        <ExternalLink className="w-3 h-3 text-zinc-400" />
                      </Link>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                      <span className="font-mono font-medium text-zinc-700">{order.orderNumber}</span>
                      <span>•</span>
                      <span>{formatDate(order.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                  {renderStatusBadge(order.status)}

                  <Badge
                    variant={order.paymentStatus === 'PAID' ? 'success' : 'neutral'}
                    size="sm"
                    className="text-[11px]"
                  >
                    {order.paymentMethod === 'UPI_ONLINE'
                      ? order.paymentStatus === 'PAID'
                        ? 'UPI Paid'
                        : 'UPI Pending'
                      : 'Pay at Store'}
                  </Badge>
                </div>
              </div>

              {/* Order Items Preview */}
              <div className="text-xs text-zinc-600 bg-zinc-50/70 p-3 rounded-xl border border-zinc-100 space-y-1.5">
                <div className="font-semibold text-zinc-900 flex items-center justify-between pb-1 border-b border-zinc-200/60">
                  <span>Items Ordered ({order.itemsCount})</span>
                  <span className="font-mono font-bold text-zinc-950 text-sm">
                    {formatCurrency(order.totalAmount)}
                  </span>
                </div>
                <div className="space-y-1 pt-0.5">
                  {order.items.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-[11px] sm:text-xs">
                      <span className="truncate max-w-[70%]">
                        {item.productName} × <strong className="text-zinc-900">{item.quantity}</strong>
                      </span>
                      <span className="font-mono text-zinc-700">
                        {formatCurrency(item.totalPrice)}
                      </span>
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <div className="text-[11px] text-zinc-500 pt-0.5">
                      + {order.items.length - 3} more items
                    </div>
                  )}
                </div>
              </div>

              {/* In-Store Pickup Details & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2 text-xs text-zinc-600">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span className="truncate max-w-md">
                    {order.business.addressLine1}, {order.business.city}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Link href={`/${order.business.slug}/orders/${order.orderNumber}`}>
                    <Button variant="outline" size="sm" className="gap-1 text-xs h-8">
                      <span>Live Tracker</span>
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </Link>

                  <Link href={`/account/orders/${order.orderNumber}`}>
                    <Button variant="primary" size="sm" className="gap-1 text-xs h-8">
                      <span>View Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
