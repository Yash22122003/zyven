'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Store,
  MapPin,
  Phone,
  Clock,
  ExternalLink,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  QrCode,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { OrderStatus } from '@prisma/client';

export default function CustomerOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrderDetail = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch(`/api/customer/orders/${id}`);
      if (res.status === 401) {
        router.push(`/login?redirect=/account/orders/${id}`);
        return;
      }
      if (res.status === 403) {
        throw new Error('You do not have permission to view this order.');
      }
      if (!res.ok) {
        throw new Error('Order not found.');
      }
      const data = await res.json();
      setOrder(data.order);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading order');
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrderDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 flex-1 w-full space-y-4">
        <div className="h-6 w-32 bg-zinc-200 animate-pulse rounded" />
        <div className="h-10 w-64 bg-zinc-200 animate-pulse rounded-lg" />
        <div className="h-48 bg-zinc-100 animate-pulse rounded-2xl" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-4 flex-1">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h1 className="text-xl font-bold text-zinc-950">Access Restricted</h1>
        <p className="text-xs text-zinc-600 mt-1.5 leading-relaxed">
          {error || 'The requested order could not be loaded or belongs to another user.'}
        </p>
        <Link href="/account/orders" className="mt-5 inline-block">
          <Button variant="outline" size="sm">
            Back to My Orders
          </Button>
        </Link>
      </div>
    );
  }

  const steps = [
    { key: 'PENDING', label: 'Order Placed', desc: 'Awaiting store confirmation' },
    { key: 'ACCEPTED', label: 'Confirmed', desc: 'Shop verified order' },
    { key: 'PREPARING', label: 'Preparing', desc: 'Packing items' },
    { key: 'READY_FOR_PICKUP', label: 'Ready for Pickup', desc: 'At shop billing counter' },
    { key: 'COLLECTED', label: 'Collected', desc: 'Order completed' },
  ];

  const getStepIndex = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return 0;
      case OrderStatus.ACCEPTED:
        return 1;
      case OrderStatus.PREPARING:
        return 2;
      case OrderStatus.READY_FOR_PICKUP:
        return 3;
      case OrderStatus.COLLECTED:
        return 4;
      default:
        return -1;
    }
  };

  const currentStep = getStepIndex(order.status);
  const isCancelled = ['CANCELLED', 'REJECTED', 'EXPIRED'].includes(order.status);

  return (
    <div className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10 w-full space-y-6">
      {/* Back Link */}
      <Link
        href="/account/orders"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-950 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to My Orders</span>
      </Link>

      {/* Order Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 font-mono">
              {order.orderNumber}
            </h1>
            <Badge
              variant={
                order.status === 'READY_FOR_PICKUP'
                  ? 'success'
                  : isCancelled
                  ? 'error'
                  : 'info'
              }
              size="md"
              className="font-semibold"
            >
              {order.status === 'READY_FOR_PICKUP'
                ? 'Ready for In-Store Pickup'
                : order.status === 'COLLECTED'
                ? 'Order Collected'
                : order.status === 'ACCEPTED'
                ? 'Confirmed by Store'
                : order.status === 'PREPARING'
                ? 'Preparing Order'
                : order.status === 'PENDING'
                ? 'Pending Store Confirmation'
                : 'Order Cancelled'}
            </Badge>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Placed on {formatDate(order.createdAt)} • Pickup at{' '}
            <strong className="text-zinc-800">{order.business.name}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchOrderDetail(true)}
            isLoading={refreshing}
            className="text-xs h-8 gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </Button>

          <Link href={`/${order.business.slug}/orders/${order.orderNumber}`}>
            <Button variant="primary" size="sm" className="text-xs h-8 gap-1.5">
              <span>Public Live Tracker</span>
              <ExternalLink className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Progress Timeline Stepper */}
      <Card className="p-5 sm:p-6">
        <h2 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider mb-5">
          Order Progress Timeline
        </h2>

        {isCancelled ? (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Order Cancelled</div>
              <p className="mt-0.5 text-[11px] sm:text-xs">
                {order.rejectionReason || 'This order was rejected or expired.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {steps.map((step, idx) => {
              const isPast = currentStep > idx;
              const isCurrent = currentStep === idx;

              return (
                <div
                  key={step.key}
                  className={`p-3 rounded-xl border text-center relative transition-all ${
                    isCurrent
                      ? 'bg-zinc-950 text-white border-zinc-950 shadow-sm'
                      : isPast
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                      : 'bg-zinc-50 border-zinc-200/80 text-zinc-400'
                  }`}
                >
                  <div className="flex items-center justify-center mb-1.5">
                    {isPast ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : isCurrent ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    ) : (
                      <div className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
                    )}
                  </div>
                  <div className="font-bold text-xs">{step.label}</div>
                  <div className={`text-[10px] mt-0.5 ${isCurrent ? 'text-zinc-300' : 'text-zinc-500'}`}>
                    {step.desc}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left: Ordered Items Table */}
        <div className="md:col-span-8 space-y-5">
          <Card className="p-5 space-y-4">
            <h2 className="font-bold text-sm text-zinc-950 pb-2 border-b border-zinc-100 flex items-center justify-between">
              <span>Items in this Order ({order.items.length})</span>
              <span className="text-xs font-mono font-normal text-zinc-500">
                Total Units: {order.items.reduce((acc: number, i: any) => acc + i.quantity, 0)}
              </span>
            </h2>

            <div className="divide-y divide-zinc-100">
              {order.items.map((item: any) => (
                <div key={item.id} className="py-3 flex items-center gap-3.5 first:pt-0 last:pb-0">
                  <div className="w-14 h-14 rounded-xl bg-zinc-100 border border-zinc-200 overflow-hidden shrink-0 flex items-center justify-center">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                    ) : (
                      <ShoppingBag className="w-5 h-5 text-zinc-300" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-xs sm:text-sm text-zinc-950 truncate">
                      {item.productName}
                    </h3>
                    {item.productSku && (
                      <div className="text-[10px] text-zinc-400 font-mono">
                        SKU: {item.productSku}
                      </div>
                    )}
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {formatCurrency(item.unitPrice)} × {item.quantity}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-xs sm:text-sm text-zinc-950 font-mono">
                      {formatCurrency(item.totalPrice)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Price Breakdown */}
            <div className="pt-4 border-t border-zinc-200 space-y-1.5 text-xs">
              <div className="flex justify-between text-zinc-600">
                <span>Items Subtotal</span>
                <span className="font-mono text-zinc-900 font-medium">
                  {formatCurrency(order.subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>In-Store Collection Fee</span>
                <span className="text-emerald-700 font-medium">FREE</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Taxes & Platform Fees</span>
                <span className="font-mono text-zinc-900">₹0.00</span>
              </div>
              <div className="pt-2 border-t border-zinc-200 flex justify-between text-sm sm:text-base font-extrabold text-zinc-950">
                <span>Total Amount</span>
                <span className="font-mono">{formatCurrency(order.totalAmount)}</span>
              </div>
            </div>
          </Card>

          {/* Status History Audit Log */}
          {order.statusHistory && order.statusHistory.length > 0 && (
            <Card className="p-5 space-y-3">
              <h3 className="font-bold text-xs text-zinc-900 uppercase tracking-wider">
                Status History Log
              </h3>
              <div className="space-y-2 text-xs">
                {order.statusHistory.map((h: any) => (
                  <div key={h.id} className="flex items-start gap-2.5 pb-2 border-b border-zinc-100 last:border-0">
                    <div className="w-2 h-2 rounded-full bg-zinc-400 mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <div className="font-semibold text-zinc-900">{h.toStatus}</div>
                      {h.note && <p className="text-[11px] text-zinc-500 mt-0.5">{h.note}</p>}
                    </div>
                    <span className="text-[10px] text-zinc-400 font-mono shrink-0">
                      {formatDate(h.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right: In-Store Pickup Details & Merchant Contact */}
        <div className="md:col-span-4 space-y-5">
          <Card className="p-5 space-y-4 bg-zinc-50/70 border-zinc-200">
            <h2 className="font-bold text-sm text-zinc-950 pb-2 border-b border-zinc-200">
              In-Store Pickup Guide
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-zinc-500 block text-[11px]">Pickup Location:</span>
                <div className="font-bold text-zinc-950 mt-0.5 flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-zinc-700 shrink-0" />
                  <Link href={`/${order.business.slug}`} className="hover:underline">
                    {order.business.name}
                  </Link>
                </div>
                <div className="text-zinc-600 mt-1 pl-5">
                  {order.business.addressLine1}
                  {order.business.addressLine2 && `, ${order.business.addressLine2}`}
                  <br />
                  {order.business.city}, {order.business.state} {order.business.pincode}
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-200/80">
                <span className="text-zinc-500 block text-[11px]">Merchant Contact:</span>
                <div className="flex items-center gap-2 mt-1">
                  <Phone className="w-3.5 h-3.5 text-zinc-500" />
                  <a
                    href={`tel:${order.business.phone}`}
                    className="font-medium text-zinc-900 hover:underline"
                  >
                    {order.business.phone}
                  </a>
                </div>
              </div>

              {order.business.pickupInstructions && (
                <div className="pt-2 border-t border-zinc-200/80">
                  <span className="text-zinc-500 block text-[11px]">Counter Instructions:</span>
                  <div className="mt-1 p-2 rounded-lg bg-white border border-zinc-200/90 text-zinc-700 text-[11px] leading-relaxed">
                    {order.business.pickupInstructions}
                  </div>
                </div>
              )}

              {order.pickupNotes && (
                <div className="pt-2 border-t border-zinc-200/80">
                  <span className="text-zinc-500 block text-[11px]">Your Note to Merchant:</span>
                  <p className="mt-0.5 text-zinc-700 italic text-[11px]">
                    &ldquo;{order.pickupNotes}&rdquo;
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Payment Summary */}
          <Card className="p-5 space-y-3">
            <h3 className="font-bold text-sm text-zinc-950 pb-2 border-b border-zinc-100 flex items-center justify-between">
              <span>Payment Details</span>
              <Badge
                variant={order.paymentStatus === 'PAID' ? 'success' : 'neutral'}
                size="sm"
              >
                {order.paymentStatus}
              </Badge>
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Method</span>
                <span className="font-semibold text-zinc-900">
                  {order.paymentMethod === 'UPI_ONLINE' ? 'UPI QR Code' : 'Pay at Store (Cash)'}
                </span>
              </div>

              {order.upiTransactionRef && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">UTR / Ref</span>
                  <span className="font-mono text-zinc-900">{order.upiTransactionRef}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-zinc-500">Total Charged</span>
                <span className="font-mono font-bold text-zinc-950">
                  {formatCurrency(order.totalAmount)}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
