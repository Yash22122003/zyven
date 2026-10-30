'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OrderStatusPill } from '@/components/ui/status-pill';
import { UpiPaymentCard } from '@/components/shared/UpiPaymentCard';
import {
  MapPin,
  Phone,
  Store,
  ShoppingBag,
  PackageCheck,
  RefreshCw,
  ArrowLeft,
  AlertCircle,
  Copy,
  Check,
  QrCode,
} from 'lucide-react';
import { OrderStatus } from '@prisma/client';

export default function OrderTrackingPage() {
  const params = useParams();
  const slug = params.slug as string;
  const orderNumber = params.orderNumber as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchOrder = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch(`/api/orders/${orderNumber}`);
      if (!res.ok) {
        throw new Error('Order not found');
      }
      const json = await res.json();
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching order');
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    // Poll every 10 seconds for real-time order status
    const interval = setInterval(() => {
      fetchOrder();
    }, 10000);
    return () => clearInterval(interval);
  }, [orderNumber]);

  const handleCopyOrderNumber = () => {
    navigator.clipboard.writeText(orderNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpiRefSubmitted = async (ref: string) => {
    const res = await fetch(`/api/orders/${orderNumber}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ upiTransactionRef: ref }),
    });

    if (!res.ok) {
      throw new Error('Failed to submit UPI reference');
    }

    await fetchOrder();
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 flex-1 w-full space-y-5">
        <div className="h-10 w-44 bg-zinc-100 rounded animate-pulse" />
        <div className="h-60 bg-zinc-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-4 flex-1">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h1 className="text-xl font-bold text-zinc-950">Order Not Found</h1>
        <p className="text-xs text-zinc-600 mt-1">
          {error || 'The requested order reference could not be found.'}
        </p>
        <Link href={`/${slug}`} className="mt-5 inline-block">
          <Button variant="outline" size="sm">
            Back to Store
          </Button>
        </Link>
      </div>
    );
  }

  const { order, business, items, timeline } = data;

  const stepOrder = [
    OrderStatus.PENDING,
    OrderStatus.ACCEPTED,
    OrderStatus.PREPARING,
    OrderStatus.READY_FOR_PICKUP,
    OrderStatus.COLLECTED,
  ];

  const currentStepIdx = stepOrder.indexOf(order.status);
  const isTerminalFailure = [
    OrderStatus.REJECTED,
    OrderStatus.CANCELLED,
    OrderStatus.EXPIRED,
  ].includes(order.status);

  return (
    <div className="max-w-3xl mx-auto px-3.5 sm:px-6 py-6 sm:py-10 flex-1 w-full pb-20">
      {/* Top Bar Navigation & Refresh */}
      <div className="flex items-center justify-between mb-5">
        <Link
          href={`/${slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-950 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to {business.name}</span>
        </Link>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchOrder(true)}
          isLoading={refreshing}
          className="gap-1.5 text-xs h-8"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Main Order Status Card */}
      <div className="bg-white rounded-2xl border border-zinc-200/90 p-4 sm:p-7 shadow-xs mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-zinc-100">
          <div>
            <div className="text-[11px] text-zinc-600 font-medium">Pickup Order Reference</div>
            <div className="flex items-center gap-2 mt-0.5">
              <h1 className="text-lg sm:text-2xl font-mono font-bold text-zinc-950">
                {order.orderNumber}
              </h1>
              <button
                onClick={handleCopyOrderNumber}
                className="p-1 rounded text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                title="Copy order number"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div className="text-[11px] text-zinc-600 mt-0.5">
              Placed {formatDate(order.createdAt)}
            </div>
          </div>

          <div className="self-start sm:self-auto">
            <OrderStatusPill status={order.status} />
          </div>
        </div>

        {/* Dynamic Visual Progress Timeline */}
        {!isTerminalFailure ? (
          <div className="py-6 sm:py-8">
            <div className="relative flex items-center justify-between">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-zinc-200 w-full z-0" />
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-emerald-500 z-0 transition-all duration-500"
                style={{
                  width: `${Math.max(0, (currentStepIdx / (stepOrder.length - 1)) * 100)}%`,
                }}
              />

              {stepOrder.map((step, idx) => {
                const isPassed = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;

                return (
                  <div key={step} className="relative z-10 flex flex-col items-center">
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-[11px] sm:text-xs transition-colors ${
                        isPassed
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white border-2 border-zinc-300 text-zinc-400'
                      }`}
                    >
                      {isPassed ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                    </div>
                    <span
                      className={`text-[9px] sm:text-[10px] mt-1.5 font-medium tracking-tight whitespace-nowrap text-center ${
                        isCurrent ? 'text-zinc-950 font-bold' : isPassed ? 'text-zinc-700' : 'text-zinc-600'
                      }`}
                    >
                      {step === OrderStatus.PENDING && 'Placed'}
                      {step === OrderStatus.ACCEPTED && 'Accepted'}
                      {step === OrderStatus.PREPARING && 'Packing'}
                      {step === OrderStatus.READY_FOR_PICKUP && 'Ready'}
                      {step === OrderStatus.COLLECTED && 'Collected'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="my-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            <div className="font-bold">Order {order.status}</div>
            <p className="mt-0.5">
              {order.rejectionReason || 'This order was declined or expired. Reserved stock has been released.'}
            </p>
          </div>
        )}

        {/* Current Stage Instruction Banner */}
        <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 text-xs text-zinc-700">
          {order.status === OrderStatus.PENDING && (
            <p className="leading-relaxed">
              <span className="font-semibold text-zinc-950">Awaiting Store Acceptance: </span>
              Your pickup order is placed and items are reserved. The shop will confirm and begin packing.
            </p>
          )}
          {order.status === OrderStatus.ACCEPTED && (
            <p className="leading-relaxed">
              <span className="font-semibold text-zinc-950">Store Confirmed: </span>
              The merchant confirmed your order and is queuing it for preparation (~{business.estimatedPrepTimeMinutes}m).
            </p>
          )}
          {order.status === OrderStatus.PREPARING && (
            <p className="leading-relaxed">
              <span className="font-semibold text-zinc-950">Packing Your Order: </span>
              Items are being assembled at the counter. Estimated prep time: ~{business.estimatedPrepTimeMinutes} minutes.
            </p>
          )}
          {order.status === OrderStatus.READY_FOR_PICKUP && (
            <div className="space-y-1">
              <div className="font-bold text-emerald-800 text-xs sm:text-sm flex items-center gap-1.5">
                <PackageCheck className="w-4 h-4" />
                <span>Your Order is Ready for Pickup!</span>
              </div>
              <p className="leading-relaxed text-zinc-700">
                Please visit the store counter now. Quote reference number:{' '}
                <strong className="font-mono text-zinc-950">{order.orderNumber}</strong>.
              </p>
            </div>
          )}
          {order.status === OrderStatus.COLLECTED && (
            <p className="leading-relaxed">
              <span className="font-semibold text-zinc-950">Collected & Fulfilled: </span>
              Order was collected in person and payment was completed at the counter. Thank you!
            </p>
          )}
        </div>
      </div>

      {/* UPI QR Payment Section (If store has UPI enabled and order not collected/paid) */}
      {business.enableUpiQr && business.upiId && order.status !== OrderStatus.REJECTED && order.status !== OrderStatus.CANCELLED && (
        <div className="mb-5">
          <UpiPaymentCard
            upiId={business.upiId}
            payeeName={business.upiName || business.name}
            amount={Number(order.totalAmount)}
            orderNumber={order.orderNumber}
            upiTransactionRef={order.upiTransactionRef}
            onReferenceSubmitted={handleUpiRefSubmitted}
            variant="customer"
          />
        </div>
      )}

      {/* Two Columns: Pickup Location & Order Receipt */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Pickup Location Details */}
        <Card className="p-4 sm:p-5">
          <h2 className="font-bold text-xs sm:text-sm text-zinc-950 mb-3 pb-2 border-b border-zinc-100 flex items-center gap-2">
            <Store className="w-4 h-4 text-zinc-500" />
            <span>Pickup Location</span>
          </h2>

          <div className="space-y-2.5 text-xs text-zinc-600">
            <div>
              <div className="font-semibold text-zinc-950 text-sm">{business.name}</div>
              <div className="text-zinc-600 font-mono text-[11px] mt-0.5">zyven.me/{business.slug}</div>
            </div>

            <div className="flex items-start gap-2 pt-0.5">
              <MapPin className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">
                {business.addressLine1}
                {business.addressLine2 ? `, ${business.addressLine2}` : ''}, {business.city}, {business.state} - {business.pincode}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-zinc-400 shrink-0" />
              <span>Contact: {business.phone}</span>
            </div>

            {business.pickupInstructions && (
              <div className="mt-2.5 p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-700 text-[11px]">
                <strong className="text-zinc-900">Instructions: </strong>
                <span>{business.pickupInstructions}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Order Receipt */}
        <Card className="p-4 sm:p-5">
          <h2 className="font-bold text-xs sm:text-sm text-zinc-950 mb-3 pb-2 border-b border-zinc-100 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-zinc-500" />
              <span>Items Summary</span>
            </span>
            <span className="text-xs text-zinc-600 font-normal">{items.length} item(s)</span>
          </h2>

          <div className="space-y-2 text-xs">
            {items.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between py-1">
                <div className="truncate pr-2">
                  <div className="font-semibold text-zinc-900 truncate">{item.productName}</div>
                  <div className="text-[11px] text-zinc-600 font-mono">
                    {item.quantity} × {formatCurrency(item.unitPrice)}
                  </div>
                </div>
                <div className="font-bold text-zinc-950 font-mono shrink-0">
                  {formatCurrency(item.totalPrice)}
                </div>
              </div>
            ))}

            <div className="pt-2.5 border-t border-zinc-100 space-y-1">
              <div className="flex items-center justify-between text-zinc-600 text-[11px]">
                <span>Subtotal</span>
                <span className="font-mono">{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-zinc-600 text-[11px]">
                <span>In-Store Pickup</span>
                <span className="text-emerald-700 font-medium">FREE</span>
              </div>
              <div className="flex items-center justify-between text-sm font-extrabold text-zinc-950 pt-1.5 border-t border-zinc-200">
                <span>Total Due</span>
                <span className="font-mono">{formatCurrency(order.totalAmount)}</span>
              </div>
            </div>

            <div className="mt-3 pt-2 text-[11px] text-zinc-600 flex items-center justify-between">
              <span>Payment:</span>
              <span className="font-medium text-zinc-900">
                {order.paymentMethod === 'UPI_ONLINE' ? 'UPI QR Code' : 'Pay at Store'}
                {' • '}
                <strong className={order.paymentStatus === 'PAID' ? 'text-emerald-700' : 'text-amber-700'}>
                  {order.paymentStatus === 'PAID' ? 'PAID' : 'Pending Payment'}
                </strong>
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Activity Timeline */}
      {timeline && timeline.length > 0 && (
        <div className="mt-5">
          <h3 className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-2">
            Order Activity History
          </h3>
          <div className="bg-white rounded-xl border border-zinc-200 p-3.5 space-y-2.5 text-xs">
            {timeline.map((entry: any) => (
              <div key={entry.id} className="flex items-start gap-2.5 text-zinc-600">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 mt-1.5 shrink-0" />
                <div className="flex-1">
                  <div className="text-zinc-900 font-medium text-[11px] sm:text-xs">{entry.note}</div>
                  <div className="text-[10px] text-zinc-600 font-mono mt-0.5">
                    {formatDate(entry.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
