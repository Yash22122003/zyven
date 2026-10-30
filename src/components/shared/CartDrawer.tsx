'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/hooks/useCart';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  ShoppingBag,
  X,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  Store,
  AlertCircle,
} from 'lucide-react';

export function CartDrawer() {
  const router = useRouter();
  const {
    cart,
    isCartOpen,
    closeCart,
    updateQuantity,
    removeItem,
    clearCart,
    totalCount,
    subtotal,
  } = useCart();

  // Prevent background scrolling when cart drawer is open
  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isCartOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCartOpen) {
        closeCart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCartOpen, closeCart]);

  if (!isCartOpen) return null;

  const handleCheckoutClick = () => {
    closeCart();
    if (cart.businessSlug) {
      router.push(`/${cart.businessSlug}/checkout`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-zinc-200 animate-slide-left">
          {/* Header */}
          <div className="px-5 py-4 border-b border-zinc-200/80 flex items-center justify-between bg-zinc-50/70">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-zinc-950 text-white flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-sm text-zinc-950">Store Pickup Cart</h2>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-200/80 text-zinc-800">
                    {totalCount} {totalCount === 1 ? 'item' : 'items'}
                  </span>
                </div>
                {cart.businessName && (
                  <div className="flex items-center gap-1 text-[11px] text-zinc-600 mt-0.5">
                    <Store className="w-3 h-3 text-zinc-400" />
                    <span className="truncate max-w-[200px] font-medium">{cart.businessName}</span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={closeCart}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/60 transition-colors"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* BOPIS Pickup Advisory */}
          {cart.items.length > 0 && (
            <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200/80 text-amber-900 text-[11px] flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>Physical in-store pickup only. No home delivery.</span>
            </div>
          )}

          {/* Body: Items List or Empty State */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-16 px-4">
                <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400 mb-3">
                  <ShoppingBag className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-base text-zinc-950">Your cart is empty</h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-xs leading-relaxed">
                  Browse independent local storefronts on ZYVEN and add products for in-store pickup.
                </p>
                <div className="mt-6 flex flex-col gap-2 w-full max-w-xs">
                  <Link href="/explore" onClick={closeCart}>
                    <Button variant="primary" size="md" className="w-full">
                      Explore Stores
                    </Button>
                  </Link>
                  <Link href="/sharma-store" onClick={closeCart}>
                    <Button variant="outline" size="sm" className="w-full">
                      View Demo Store
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {cart.items.map((item) => (
                  <div
                    key={item.productId}
                    className="p-3 rounded-xl border border-zinc-200/90 bg-white hover:border-zinc-300 transition-colors flex gap-3"
                  >
                    {/* Item Image */}
                    <div className="w-16 h-16 rounded-lg bg-zinc-100 border border-zinc-200/60 shrink-0 overflow-hidden flex items-center justify-center">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ShoppingBag className="w-5 h-5 text-zinc-300" />
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-semibold text-xs sm:text-sm text-zinc-950 truncate max-w-[190px]">
                            {item.name}
                          </h4>
                          <div className="text-[11px] font-mono text-zinc-500 mt-0.5">
                            {formatCurrency(item.price)} each
                          </div>
                        </div>

                        <button
                          onClick={() => removeItem(item.productId)}
                          className="text-zinc-400 hover:text-rose-600 transition-colors p-1"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Quantity Controls & Item Total */}
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-1 border border-zinc-200 rounded-lg bg-zinc-50 p-0.5">
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="w-6 h-6 flex items-center justify-center text-zinc-600 hover:text-zinc-950 hover:bg-white rounded transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold text-zinc-900 w-6 text-center font-mono">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            disabled={item.quantity >= item.maxAvailable}
                            className="w-6 h-6 flex items-center justify-center text-zinc-600 hover:text-zinc-950 hover:bg-white rounded disabled:opacity-30 transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <span className="font-bold text-xs sm:text-sm text-zinc-950 font-mono">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer: Price Summary & Checkout Action */}
          {cart.items.length > 0 && (
            <div className="p-4 border-t border-zinc-200 bg-zinc-50/80 space-y-3">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-zinc-600">
                  <span>Subtotal</span>
                  <span className="font-mono text-zinc-900 font-medium">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>In-Store Pickup</span>
                  <span className="text-emerald-700 font-medium">FREE</span>
                </div>
                <div className="pt-2 border-t border-zinc-200/80 flex justify-between text-sm font-bold text-zinc-950">
                  <span>Estimated Total</span>
                  <span className="font-mono text-base">{formatCurrency(subtotal)}</span>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <Button
                  size="lg"
                  className="w-full gap-2 font-semibold shadow-sm"
                  onClick={handleCheckoutClick}
                >
                  <span>Proceed to Pickup Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>

                <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                  <button
                    onClick={clearCart}
                    className="hover:text-rose-600 transition-colors"
                  >
                    Clear Cart
                  </button>
                  <Link
                    href="/cart"
                    onClick={closeCart}
                    className="hover:text-zinc-900 transition-colors underline"
                  >
                    View Full Cart Page
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
