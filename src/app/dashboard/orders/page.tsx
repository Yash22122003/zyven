'use client';

import React, { useEffect, useState } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OrderStatusPill } from '@/components/ui/status-pill';
import { UpiPaymentCard } from '@/components/shared/UpiPaymentCard';
import {
  ShoppingBag,
  Search,
  Check,
  PackageCheck,
  Clock,
  Phone,
  User,
  RefreshCw,
  QrCode,
  Copy,
  X,
  Store,
} from 'lucide-react';
import { OrderStatus } from '@prisma/client';

export default function MerchantOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ orderId: string; orderNumber: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('Out of stock in shop');
  const [qrModalOrder, setQrModalOrder] = useState<any | null>(null);
  const [businessSettings, setBusinessSettings] = useState<any | null>(null);
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      const url = new URL('/api/merchant/orders', window.location.origin);
      if (statusFilter !== 'ALL') url.searchParams.set('status', statusFilter);
      if (search.trim()) url.searchParams.set('q', search.trim());

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetch('/api/merchant/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.business) {
          setBusinessSettings(data.business);
        }
      })
      .catch(() => {});
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  const handleTransition = async (orderId: string, toStatus: string, reason?: string) => {
    setProcessingId(orderId);
    try {
      const res = await fetch('/api/orders/transition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, toStatus, reason }),
      });

      if (res.ok) {
        setRejectModal(null);
        await fetchOrders();
      }
    } catch {
      // Ignore
    } finally {
      setProcessingId(null);
    }
  };

  const handleCopyUtr = (utr: string) => {
    navigator.clipboard.writeText(utr);
    setCopiedUtr(utr);
    setTimeout(() => setCopiedUtr(null), 2000);
  };

  const statusTabs = [
    { label: 'All Orders', value: 'ALL' },
    { label: 'Pending', value: OrderStatus.PENDING },
    { label: 'Accepted', value: OrderStatus.ACCEPTED },
    { label: 'Preparing', value: OrderStatus.PREPARING },
    { label: 'Ready for Pickup', value: OrderStatus.READY_FOR_PICKUP },
    { label: 'Collected', value: OrderStatus.COLLECTED },
    { label: 'Declined', value: OrderStatus.REJECTED },
  ];

  return (
    <div className="space-y-5 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950">
            Order Fulfillment Pipeline
          </h1>
          <p className="text-xs text-zinc-600 mt-0.5">
            Accept incoming orders, verify UPI/cash payments, and complete customer pickups.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {businessSettings?.upiId && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                setQrModalOrder({
                  orderNumber: 'STORE-COUNTER',
                  totalAmount: 0,
                })
              }
              className="gap-1.5 text-xs h-8"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Counter QR</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchOrders()}
            className="gap-1.5 text-xs h-8"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-200 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                statusFilter === tab.value
                  ? 'bg-zinc-950 text-white shadow-xs'
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-950'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-64 shrink-0">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search order # or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8 pl-9 pr-3 rounded-lg border border-zinc-200 bg-white text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-950"
          />
        </form>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-xl bg-zinc-100 animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <Card className="p-12 sm:p-16 text-center text-zinc-500">
          <ShoppingBag className="w-10 h-10 text-zinc-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-zinc-900">No orders found</p>
          <p className="text-xs text-zinc-600 mt-0.5">
            Incoming orders matching this filter will update in real time.
          </p>
        </Card>
      ) : (
        <div className="space-y-3.5">
          {orders.map((order) => (
            <Card key={order.id} className="p-4 sm:p-5 transition-all hover:border-zinc-300 space-y-3.5">
              {/* Header row: Order #, Status, Payment Type & Total */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-zinc-100">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-bold text-sm sm:text-base text-zinc-950">
                    {order.orderNumber}
                  </span>
                  <OrderStatusPill status={order.status} />

                  {/* Payment Method Badge */}
                  {order.paymentMethod === 'UPI_ONLINE' ? (
                    <Badge variant="neutral" size="sm" className="gap-1 bg-emerald-50 text-emerald-800 border-emerald-200">
                      <QrCode className="w-3 h-3 text-emerald-700" />
                      UPI QR
                    </Badge>
                  ) : (
                    <Badge variant="neutral" size="sm" className="gap-1 text-zinc-700 bg-zinc-100">
                      <Store className="w-3 h-3" />
                      Cash
                    </Badge>
                  )}

                  {/* Payment Status Pill */}
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      order.paymentStatus === 'PAID'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {order.paymentStatus === 'PAID' ? 'PAID' : 'PAYMENT PENDING'}
                  </span>
                </div>

                <div className="flex items-baseline justify-between sm:justify-end gap-2">
                  <span className="text-[11px] text-zinc-600 sm:hidden">Total Due:</span>
                  <span className="text-base sm:text-lg font-extrabold text-zinc-950 font-mono">
                    {formatCurrency(order.totalAmount)}
                  </span>
                </div>
              </div>

              {/* Customer and Contact Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 text-zinc-700">
                  <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span className="font-semibold text-zinc-900">{order.customerName}</span>
                  <span className="text-zinc-600 font-mono">({order.customerPhone})</span>
                </div>

                {order.pickupNotes && (
                  <div className="flex items-center gap-1.5 text-zinc-600 italic truncate">
                    <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="truncate">"{order.pickupNotes}"</span>
                  </div>
                )}
              </div>

              {/* UPI Reference Note if submitted by customer */}
              {order.upiTransactionRef && (
                <div className="p-2.5 rounded-lg bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>Customer UPI Reference / UTR: <strong className="font-mono">{order.upiTransactionRef}</strong></span>
                  </div>
                  <button
                    onClick={() => handleCopyUtr(order.upiTransactionRef)}
                    className="p-1 rounded text-emerald-700 hover:bg-emerald-100"
                    title="Copy UTR"
                  >
                    {copiedUtr === order.upiTransactionRef ? <Check className="w-3.5 h-3.5 text-emerald-800" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}

              {/* Line items concise summary */}
              <div className="py-1">
                <div className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider mb-1.5">
                  Order Items ({order.items.length})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {order.items.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-xs py-1 px-2.5 rounded bg-zinc-50 border border-zinc-100"
                    >
                      <span className="font-medium text-zinc-900 truncate pr-2">{item.productName}</span>
                      <span className="text-zinc-600 font-mono text-[11px] shrink-0">
                        {item.quantity} × {formatCurrency(item.unitPrice)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="pt-3 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-2.5">
                <div className="text-[11px] text-zinc-600">
                  {order.status === OrderStatus.PENDING && 'Awaiting merchant acceptance'}
                  {order.status === OrderStatus.ACCEPTED && 'Accepted • Begin preparation'}
                  {order.status === OrderStatus.PREPARING && 'Packing in progress'}
                  {order.status === OrderStatus.READY_FOR_PICKUP && 'Packed • Waiting for customer pickup'}
                  {order.status === OrderStatus.COLLECTED && 'Order fulfilled & collected at store'}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {/* Show QR button for order */}
                  {businessSettings?.upiId && order.status !== OrderStatus.COLLECTED && order.status !== OrderStatus.REJECTED && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 gap-1.5"
                      onClick={() => setQrModalOrder(order)}
                    >
                      <QrCode className="w-3.5 h-3.5 text-zinc-700" />
                      <span>Show QR</span>
                    </Button>
                  )}

                  {order.status === OrderStatus.PENDING && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 text-rose-600 hover:bg-rose-50"
                        onClick={() =>
                          setRejectModal({
                            orderId: order.id,
                            orderNumber: order.orderNumber,
                          })
                        }
                      >
                        Decline
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 gap-1.5"
                        onClick={() => handleTransition(order.id, OrderStatus.ACCEPTED)}
                        isLoading={processingId === order.id}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept</span>
                      </Button>
                    </>
                  )}

                  {order.status === OrderStatus.ACCEPTED && (
                    <Button
                      size="sm"
                      variant="primary"
                      className="text-xs h-8"
                      onClick={() => handleTransition(order.id, OrderStatus.PREPARING)}
                      isLoading={processingId === order.id}
                    >
                      <span>Start Preparing</span>
                    </Button>
                  )}

                  {order.status === OrderStatus.PREPARING && (
                    <Button
                      size="sm"
                      variant="primary"
                      className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 gap-1.5"
                      onClick={() => handleTransition(order.id, OrderStatus.READY_FOR_PICKUP)}
                      isLoading={processingId === order.id}
                    >
                      <PackageCheck className="w-3.5 h-3.5" />
                      <span>Mark Ready</span>
                    </Button>
                  )}

                  {order.status === OrderStatus.READY_FOR_PICKUP && (
                    <Button
                      size="sm"
                      variant="primary"
                      className="text-xs h-8 bg-zinc-950 hover:bg-zinc-800 gap-1.5"
                      onClick={() => handleTransition(order.id, OrderStatus.COLLECTED)}
                      isLoading={processingId === order.id}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm Collected & Paid</span>
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Order Specific QR Modal */}
      {qrModalOrder && businessSettings?.upiId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-white rounded-2xl p-5 shadow-2xl space-y-3 relative">
            <button
              onClick={() => setQrModalOrder(null)}
              className="absolute top-4 right-4 p-1 rounded-lg text-zinc-400 hover:text-zinc-700 bg-zinc-100"
            >
              <X className="w-4 h-4" />
            </button>

            <UpiPaymentCard
              upiId={businessSettings.upiId}
              payeeName={businessSettings.upiName || businessSettings.name}
              amount={qrModalOrder.totalAmount > 0 ? Number(qrModalOrder.totalAmount) : undefined}
              orderNumber={qrModalOrder.orderNumber !== 'STORE-COUNTER' ? qrModalOrder.orderNumber : undefined}
              variant="merchant_counter"
            />

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setQrModalOrder(null)}
              className="w-full text-xs"
            >
              Done
            </Button>
          </div>
        </div>
      )}

      {/* Reject Order Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 space-y-4">
            <div>
              <h3 className="font-bold text-base text-zinc-950">
                Decline Order #{rejectModal.orderNumber}?
              </h3>
              <p className="text-xs text-zinc-600 mt-1">
                Declining this order will automatically release all reserved stock back to your available inventory.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                Reason for Rejection
              </label>
              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full h-9 rounded-lg border border-zinc-200 bg-white px-3 text-xs text-zinc-900"
              >
                <option value="Out of stock in shop">Out of stock in shop</option>
                <option value="Shop closing early today">Shop closing early today</option>
                <option value="Item temporarily damaged">Item temporarily damaged</option>
                <option value="Cannot fulfill requested quantity">Cannot fulfill requested quantity</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setRejectModal(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleTransition(rejectModal.orderId, OrderStatus.REJECTED, rejectReason)}
                isLoading={processingId === rejectModal.orderId}
              >
                Confirm Rejection
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
