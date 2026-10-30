import React from 'react';
import { OrderStatus, StockDisplayMode } from '@prisma/client';
import { Badge } from './badge';
import { Clock, CheckCircle2, PackageCheck, Ban, AlertCircle, ShoppingBag } from 'lucide-react';

export function OrderStatusPill({ status }: { status: OrderStatus }) {
  switch (status) {
    case OrderStatus.PENDING:
      return (
        <Badge variant="warning" className="gap-1">
          <Clock className="w-3 h-3 animate-pulse" />
          Pending Acceptance
        </Badge>
      );
    case OrderStatus.ACCEPTED:
      return (
        <Badge variant="neutral" className="gap-1 bg-sky-50 text-sky-700 border-sky-200">
          <CheckCircle2 className="w-3 h-3" />
          Accepted
        </Badge>
      );
    case OrderStatus.PREPARING:
      return (
        <Badge variant="neutral" className="gap-1 bg-indigo-50 text-indigo-700 border-indigo-200">
          <ShoppingBag className="w-3 h-3" />
          Preparing Order
        </Badge>
      );
    case OrderStatus.READY_FOR_PICKUP:
      return (
        <Badge variant="success" className="gap-1 font-semibold">
          <PackageCheck className="w-3 h-3" />
          Ready for Pickup
        </Badge>
      );
    case OrderStatus.COLLECTED:
      return (
        <Badge variant="neutral" className="gap-1 bg-zinc-100 text-zinc-700 border-zinc-200">
          <CheckCircle2 className="w-3 h-3" />
          Collected & Paid
        </Badge>
      );
    case OrderStatus.REJECTED:
      return (
        <Badge variant="error" className="gap-1">
          <Ban className="w-3 h-3" />
          Declined by Store
        </Badge>
      );
    case OrderStatus.CANCELLED:
      return (
        <Badge variant="error" className="gap-1">
          <AlertCircle className="w-3 h-3" />
          Cancelled
        </Badge>
      );
    case OrderStatus.EXPIRED:
      return (
        <Badge variant="error" className="gap-1">
          <Clock className="w-3 h-3" />
          Expired
        </Badge>
      );
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
}

export function StockAvailabilityPill({
  quantityOnHand,
  quantityReserved,
  lowStockThreshold = 5,
  mode = StockDisplayMode.AVAILABILITY_STATUS,
}: {
  quantityOnHand: number;
  quantityReserved: number;
  lowStockThreshold?: number;
  mode?: StockDisplayMode;
}) {
  const available = Math.max(0, quantityOnHand - quantityReserved);

  if (available <= 0) {
    return <Badge variant="error">Out of Stock</Badge>;
  }

  if (mode === StockDisplayMode.EXACT_COUNT) {
    if (available <= lowStockThreshold) {
      return <Badge variant="warning">{available} units remaining</Badge>;
    }
    return <Badge variant="success">{available} in stock</Badge>;
  }

  // AVAILABILITY_STATUS mode
  if (available <= lowStockThreshold) {
    return <Badge variant="warning">Few Left</Badge>;
  }

  return <Badge variant="success">In Stock</Badge>;
}
