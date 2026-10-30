'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OrderStatusPill } from '@/components/ui/status-pill';
import {
  ShoppingBag,
  Package,
  Layers,
  ArrowRight,
  Check,
  X,
  Sparkles,
  QrCode,
  User,
} from 'lucide-react';
import { OrderStatus } from '@prisma/client';

export default function DashboardOverviewPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);

  const fetchOverview = async () => {
    try {
      const res = await fetch('/api/merchant/overview');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleOrderAction = async (orderId: string, toStatus: string) => {
    setProcessingOrderId(orderId);
    try {
      const res = await fetch('/api/orders/transition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, toStatus }),
      });

      if (res.ok) {
        await fetchOverview();
      }
    } catch {
      // Ignore
    } finally {
      setProcessingOrderId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-7 w-44 bg-zinc-200 rounded animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-zinc-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const { business, metrics, recentOrders, subscription } = data || {};

  return (
    <div className="space-y-6">
      {/* Top Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950">
            {business?.name || 'Seller Dashboard'}
          </h1>
          <p className="text-xs text-zinc-600 mt-0.5">
            Real-time storefront overview, live pickup orders, and stock synchronization.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/dashboard/products">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
              <Package className="w-3.5 h-3.5" />
              <span>Products</span>
            </Button>
          </Link>
          <Link href="/dashboard/inventory">
            <Button variant="primary" size="sm" className="gap-1.5 text-xs h-8">
              <Layers className="w-3.5 h-3.5" />
              <span>Stock Control</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Subscription Promo Banner */}
      {subscription && subscription.isIntroductory && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-zinc-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-emerald-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold flex items-center gap-2">
                <span>Introductory Plan: ₹1/month</span>
                <Badge variant="success" size="sm" className="bg-emerald-950 text-emerald-300 border-emerald-800 text-[10px] py-0">
                  Month {subscription.introMonthsConsumed} of 3
                </Badge>
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">
                0% sales commission. Next billing: {formatDate(subscription.currentPeriodEnd)}.
              </div>
            </div>
          </div>

          <Link href="/dashboard/subscription" className="self-start sm:self-auto">
            <Button variant="secondary" size="sm" className="text-xs h-7 px-3">
              Plan Details
            </Button>
          </Link>
        </div>
      )}

      {/* Metric Cards Grid - Touch Friendly & Concise */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card className="p-4 sm:p-5">
          <div className="text-[11px] sm:text-xs text-zinc-600 font-medium">Today's Orders</div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-extrabold text-zinc-950">{metrics?.todayOrderCount || 0}</span>
            <span className="text-[10px] text-zinc-600">pickup</span>
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="text-[11px] sm:text-xs text-zinc-600 font-medium">Today's GMV</div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-extrabold text-zinc-950 font-mono">
              {formatCurrency(metrics?.todaySales || 0)}
            </span>
          </div>
        </Card>

        <Card className={`p-4 sm:p-5 ${metrics?.pendingOrdersCount > 0 ? 'border-amber-400 bg-amber-50/20' : ''}`}>
          <div className="text-[11px] sm:text-xs text-zinc-600 font-medium flex items-center justify-between">
            <span>Pending Action</span>
            {metrics?.pendingOrdersCount > 0 && (
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-extrabold text-zinc-950">
              {metrics?.pendingOrdersCount || 0}
            </span>
            <span className="text-[10px] text-amber-700 font-semibold">orders</span>
          </div>
        </Card>

        <Card className={`p-4 sm:p-5 ${metrics?.lowStockCount > 0 ? 'border-rose-300 bg-rose-50/20' : ''}`}>
          <div className="text-[11px] sm:text-xs text-zinc-600 font-medium">Low Stock Items</div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-extrabold text-zinc-950">{metrics?.lowStockCount || 0}</span>
            <span className="text-[10px] text-zinc-600">skus</span>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 col-span-2 sm:col-span-1">
          <div className="text-[11px] sm:text-xs text-zinc-600 font-medium">Active Catalogue</div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-extrabold text-zinc-950">
              {metrics?.activeProductsCount || 0}
            </span>
            <span className="text-[10px] text-zinc-600">products</span>
          </div>
        </Card>
      </div>

      {/* Orders Pipeline Section */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-zinc-950">Recent Pickup Orders</h2>
            <p className="text-xs text-zinc-600">Live order queue for fulfillment</p>
          </div>
          <Link href="/dashboard/orders">
            <Button variant="ghost" size="sm" className="text-xs h-7 gap-1">
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        {recentOrders && recentOrders.length === 0 ? (
          <Card className="p-10 text-center text-zinc-500 text-xs">
            <ShoppingBag className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
            No pickup orders placed yet. Share your storefront link to start receiving orders!
          </Card>
        ) : (
          <>
            {/* Mobile View: Clean concise cards */}
            <div className="space-y-2.5 sm:hidden">
              {recentOrders.map((order: any) => (
                <Card key={order.id} className="p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Link
                      href="/dashboard/orders"
                      className="font-mono font-bold text-xs text-zinc-950 hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                    <OrderStatusPill status={order.status} />
                  </div>

                  <div className="flex items-center justify-between text-xs text-zinc-600">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3 h-3 text-zinc-400" />
                      <span className="font-semibold text-zinc-900">{order.customerName}</span>
                    </div>
                    <span className="font-mono font-bold text-zinc-950">
                      {formatCurrency(order.totalAmount)}
                    </span>
                  </div>

                  {/* Quick Action Button for Mobile */}
                  <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                    <span className="text-[10px] text-zinc-600 font-mono">
                      {order.itemCount} items • {formatDate(order.createdAt)}
                    </span>

                    {order.status === OrderStatus.PENDING && (
                      <Button
                        size="sm"
                        variant="primary"
                        className="h-7 text-xs px-3 bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => handleOrderAction(order.id, OrderStatus.ACCEPTED)}
                        isLoading={processingOrderId === order.id}
                      >
                        Accept
                      </Button>
                    )}
                    {order.status === OrderStatus.ACCEPTED && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 text-xs px-3"
                        onClick={() => handleOrderAction(order.id, OrderStatus.PREPARING)}
                        isLoading={processingOrderId === order.id}
                      >
                        Preparing
                      </Button>
                    )}
                    {order.status === OrderStatus.PREPARING && (
                      <Button
                        size="sm"
                        variant="primary"
                        className="h-7 text-xs px-3 bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => handleOrderAction(order.id, OrderStatus.READY_FOR_PICKUP)}
                        isLoading={processingOrderId === order.id}
                      >
                        Ready
                      </Button>
                    )}
                    {order.status === OrderStatus.READY_FOR_PICKUP && (
                      <Button
                        size="sm"
                        variant="primary"
                        className="h-7 text-xs px-3 bg-zinc-950 hover:bg-zinc-800"
                        onClick={() => handleOrderAction(order.id, OrderStatus.COLLECTED)}
                        isLoading={processingOrderId === order.id}
                      >
                        Collected
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            {/* Desktop View: Clean Table */}
            <div className="hidden sm:block bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 font-medium">
                    <tr>
                      <th className="py-3 px-4">Order Number</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Items</th>
                      <th className="py-3 px-4">Total</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Placed</th>
                      <th className="py-3 px-4 text-right">Quick Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {recentOrders.map((order: any) => (
                      <tr key={order.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-semibold text-zinc-950">
                          <Link href="/dashboard/orders" className="hover:underline hover:text-zinc-600">
                            {order.orderNumber}
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-zinc-900">{order.customerName}</div>
                          <div className="text-[11px] text-zinc-400 font-mono">{order.customerPhone}</div>
                        </td>
                        <td className="py-3 px-4 text-zinc-600 font-medium">
                          {order.itemCount} item(s)
                        </td>
                        <td className="py-3 px-4 font-bold text-zinc-950 font-mono">
                          {formatCurrency(order.totalAmount)}
                        </td>
                        <td className="py-3 px-4">
                          <OrderStatusPill status={order.status} />
                        </td>
                        <td className="py-3 px-4 text-zinc-400 text-[11px]">
                          {formatDate(order.createdAt)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {order.status === OrderStatus.PENDING && (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="primary"
                                className="h-7 text-xs px-2.5 bg-emerald-600 hover:bg-emerald-700"
                                onClick={() => handleOrderAction(order.id, OrderStatus.ACCEPTED)}
                                isLoading={processingOrderId === order.id}
                              >
                                <Check className="w-3 h-3 mr-1" />
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs px-2 text-rose-600 hover:bg-rose-50"
                                onClick={() => handleOrderAction(order.id, OrderStatus.REJECTED)}
                                disabled={processingOrderId === order.id}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                          {order.status === OrderStatus.ACCEPTED && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-7 text-xs px-2.5"
                              onClick={() => handleOrderAction(order.id, OrderStatus.PREPARING)}
                              isLoading={processingOrderId === order.id}
                            >
                              Preparing
                            </Button>
                          )}
                          {order.status === OrderStatus.PREPARING && (
                            <Button
                              size="sm"
                              variant="primary"
                              className="h-7 text-xs px-2.5 bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => handleOrderAction(order.id, OrderStatus.READY_FOR_PICKUP)}
                              isLoading={processingOrderId === order.id}
                            >
                              Ready
                            </Button>
                          )}
                          {order.status === OrderStatus.READY_FOR_PICKUP && (
                            <Button
                              size="sm"
                              variant="primary"
                              className="h-7 text-xs px-2.5 bg-zinc-950 hover:bg-zinc-800"
                              onClick={() => handleOrderAction(order.id, OrderStatus.COLLECTED)}
                              isLoading={processingOrderId === order.id}
                            >
                              Collected
                            </Button>
                          )}
                          {order.status === OrderStatus.COLLECTED && (
                            <span className="text-[11px] text-zinc-400 font-medium">Fulfilled</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
