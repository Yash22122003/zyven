'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/hooks/useCart';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  Store,
  AlertCircle,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';

export default function CartPage() {
  const router = useRouter();
  const {
    cart,
    isLoaded,
    updateQuantity,
    removeItem,
    clearCart,
    totalCount,
    subtotal,
  } = useCart();

  if (!isLoaded) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 flex-1 w-full space-y-4">
        <div className="h-8 w-48 bg-zinc-200 animate-pulse rounded-lg" />
        <div className="h-48 bg-zinc-100 animate-pulse rounded-xl" />
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-4 flex-1">
        <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400 mx-auto mb-4">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950">Your Cart is Empty</h1>
        <p className="text-xs text-zinc-600 mt-1.5 max-w-sm mx-auto leading-relaxed">
          Looks like you haven't added any items to your pickup cart yet. Explore neighborhood shops on ZYVEN.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <Link href="/explore">
            <Button variant="primary" size="md">
              Explore Local Stores
            </Button>
          </Link>
          <Link href="/sharma-store">
            <Button variant="outline" size="md">
              Demo Store
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1 w-full">
      {/* Back Link */}
      {cart.businessSlug && (
        <Link
          href={`/${cart.businessSlug}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-950 mb-4 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to {cart.businessName || 'Storefront'}</span>
        </Link>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-6 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950">
            Store Pickup Cart
          </h1>
          <p className="text-xs text-zinc-600 mt-0.5">
            You have <span className="font-semibold text-zinc-900">{totalCount} items</span> ready for in-store collection
          </p>
        </div>

        {cart.businessName && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-100 border border-zinc-200 text-xs font-medium text-zinc-800">
            <Store className="w-3.5 h-3.5 text-zinc-500" />
            <span>Store: {cart.businessName}</span>
          </div>
        )}
      </div>

      {/* BOPIS Store Pickup Notice */}
      <div className="my-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200/90 text-amber-900 text-xs flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <div className="font-bold text-amber-950">In-Store Counter Pickup Only</div>
          <p className="text-[11px] sm:text-xs">
            Items will be reserved atomically and prepared by <span className="font-semibold">{cart.businessName || 'the merchant'}</span>. Home delivery is not provided.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8">
        {/* Left: Cart Items List */}
        <div className="md:col-span-8 space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-600 pb-1">
            <span>Items ({cart.items.length})</span>
            <button
              onClick={clearCart}
              className="text-zinc-400 hover:text-rose-600 transition-colors"
            >
              Clear Cart
            </button>
          </div>

          <div className="space-y-2.5">
            {cart.items.map((item) => (
              <Card key={item.productId} className="p-3.5 sm:p-4 flex gap-3.5 items-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-zinc-100 border border-zinc-200/80 shrink-0 overflow-hidden flex items-center justify-center">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <ShoppingBag className="w-6 h-6 text-zinc-300" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-zinc-950 truncate">
                        {item.name}
                      </h3>
                      <div className="text-xs font-mono text-zinc-500 mt-0.5">
                        {formatCurrency(item.price)} each
                      </div>
                    </div>

                    <button
                      onClick={() => removeItem(item.productId)}
                      className="text-zinc-400 hover:text-rose-600 p-1 transition-colors"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-3">
                    <div className="flex items-center gap-1.5 border border-zinc-200 rounded-lg bg-zinc-50 p-0.5">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="w-7 h-7 flex items-center justify-center text-zinc-700 hover:text-zinc-950 hover:bg-white rounded transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs sm:text-sm font-bold text-zinc-900 w-7 text-center font-mono">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        disabled={item.quantity >= item.maxAvailable}
                        className="w-7 h-7 flex items-center justify-center text-zinc-700 hover:text-zinc-950 hover:bg-white rounded disabled:opacity-30 transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="font-extrabold text-sm sm:text-base text-zinc-950 font-mono">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Right: Order Summary */}
        <div className="md:col-span-4">
          <Card className="p-5 sticky top-24 space-y-4">
            <h2 className="font-bold text-sm text-zinc-950 pb-2 border-b border-zinc-100">
              Pickup Order Summary
            </h2>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-zinc-600">
                <span>Items Subtotal</span>
                <span className="font-mono text-zinc-900 font-semibold">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>In-Store Collection Fee</span>
                <span className="text-emerald-700 font-semibold">FREE</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Estimated Taxes</span>
                <span className="font-mono text-zinc-900">₹0.00</span>
              </div>

              <div className="pt-3 border-t border-zinc-200 flex justify-between text-base font-extrabold text-zinc-950">
                <span>Total Amount</span>
                <span className="font-mono">{formatCurrency(subtotal)}</span>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full gap-2 font-semibold shadow-sm"
              onClick={() => {
                if (cart.businessSlug) {
                  router.push(`/${cart.businessSlug}/checkout`);
                }
              }}
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </Button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-500 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Direct merchant payment (UPI or Cash)</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
