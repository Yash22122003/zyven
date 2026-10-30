'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCart } from '@/hooks/useCart';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StockAvailabilityPill } from '@/components/ui/status-pill';
import {
  Store,
  ShieldCheck,
  MapPin,
  Phone,
  Clock,
  ShoppingBag,
  Plus,
  Minus,
  ArrowRight,
  Info,
  AlertTriangle,
  QrCode,
} from 'lucide-react';

interface ProductItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sku: string | null;
  price: number;
  compareAtPrice: number | null;
  imageUrl: string | null;
  category: { id: string; name: string } | null;
  stock: {
    available: number;
    isAvailable: boolean;
    isLowStock: boolean;
    displayMode: 'EXACT_COUNT' | 'AVAILABILITY_STATUS';
    exactCount: number | null;
  };
}

interface StoreData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  phone: string;
  email: string | null;
  address: string;
  city: string;
  pickupInstructions: string | null;
  estimatedPrepTimeMinutes: number;
  isVerified: boolean;
  isOpen: boolean;
  scheduleNote: string;
  category: { id: string; name: string };
  upiId?: string | null;
  upiName?: string | null;
  enableUpiQr?: boolean;
}

export default function StorefrontPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [store, setStore] = useState<StoreData | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [conflictModal, setConflictModal] = useState<{ existingBusinessName: string; pendingItem: any } | null>(null);

  const { cart, addItem, updateQuantity, clearCart, totalCount, subtotal } = useCart();

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/storefront/${slug}`)
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Store not found');
        }
        return res.json();
      })
      .then((data) => {
        setStore(data.store);
        setProducts(data.products || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex-1 w-full space-y-5">
        <div className="h-44 rounded-2xl bg-zinc-100 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-60 rounded-xl bg-zinc-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-4">
        <Store className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
        <h1 className="text-xl font-bold text-zinc-950">Store Not Available</h1>
        <p className="text-xs text-zinc-600 mt-1">
          {error || 'The requested storefront could not be located.'}
        </p>
        <Link href="/" className="mt-5 inline-block">
          <Button variant="outline" size="sm">
            Back to Marketplace
          </Button>
        </Link>
      </div>
    );
  }

  const handleAddToCart = (product: ProductItem) => {
    const itemData = {
      productId: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      sku: product.sku,
      maxAvailable: product.stock.available,
    };

    const res = addItem(itemData, store.slug, store.name, 1);
    if (!res.success && res.conflict) {
      setConflictModal({
        existingBusinessName: res.conflict.existingBusinessName,
        pendingItem: itemData,
      });
    }
  };

  const handleResolveConflict = () => {
    if (conflictModal) {
      clearCart();
      addItem(conflictModal.pendingItem, store.slug, store.name, 1);
      setConflictModal(null);
    }
  };

  const categories = Array.from(
    new Set(products.map((p) => p.category?.name).filter(Boolean))
  ) as string[];

  const filteredProducts = products.filter(
    (p) => selectedCategory === 'all' || p.category?.name === selectedCategory
  );

  return (
    <div className="flex-1 pb-24 sm:pb-28">
      {/* Store Banner & Profile Header */}
      <div className="relative bg-white border-b border-zinc-200">
        {/* Panoramic Store Banner */}
        <div className="h-36 sm:h-52 w-full bg-zinc-100 overflow-hidden relative">
          {store.bannerUrl ? (
            <img
              src={store.bannerUrl}
              alt={store.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-100 text-zinc-300">
              <Store className="w-12 h-12 sm:w-16 sm:h-16" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        </div>

        {/* Store Profile Section */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-5">
          {/* Avatar & Badges Row (Avatar overlaps banner, badges align cleanly on right) */}
          <div className="flex items-end justify-between -mt-10 sm:-mt-14 mb-3.5">
            {/* Store Avatar Logo */}
            <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl bg-white p-1.5 shadow-md border-4 border-white ring-1 ring-zinc-200/80 shrink-0 overflow-hidden">
              {store.logoUrl ? (
                <img
                  src={store.logoUrl}
                  alt={store.name}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <div className="w-full h-full rounded-xl bg-zinc-950 flex items-center justify-center text-white font-bold text-2xl">
                  {store.name.charAt(0)}
                </div>
              )}
            </div>

            {/* Operating Status & Payment Badges */}
            <div className="flex flex-wrap items-center justify-end gap-2 pb-1">
              {store.enableUpiQr && store.upiId && (
                <Badge
                  variant="neutral"
                  size="sm"
                  className="gap-1.5 bg-emerald-50 text-emerald-800 border-emerald-200 font-medium shadow-xs"
                >
                  <QrCode className="w-3.5 h-3.5 text-emerald-700" />
                  <span>UPI Accepted</span>
                </Badge>
              )}

              {store.isOpen ? (
                <Badge variant="success" size="sm" className="gap-1.5 font-medium shadow-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Open for Pickup
                </Badge>
              ) : (
                <Badge variant="error" size="sm" className="shadow-xs">
                  Closed
                </Badge>
              )}
            </div>
          </div>

          {/* Lower-Level Title & Identity: 100% on clean white background */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-950">
                {store.name}
              </h1>
              {store.isVerified && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Verified Store
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <span className="font-mono text-zinc-800 font-semibold bg-zinc-100 px-2 py-0.5 rounded text-[11px]">
                zyven.me/{store.slug}
              </span>
              <span>•</span>
              <span className="font-medium text-zinc-700">{store.category.name}</span>
              {store.description && (
                <>
                  <span>•</span>
                  <span className="text-zinc-600 line-clamp-1">{store.description}</span>
                </>
              )}
            </div>
          </div>

          {/* Store Info Ribbon */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4 pt-3.5 border-t border-zinc-100 text-xs text-zinc-600">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span className="truncate">{store.address}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span>{store.scheduleNote} (~{store.estimatedPrepTimeMinutes}m prep)</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <a href={`tel:${store.phone}`} className="hover:text-zinc-900 transition-colors">
                {store.phone}
              </a>
            </div>
          </div>

          {/* Pickup Instructions */}
          {store.pickupInstructions && (
            <div className="mt-3 p-2.5 rounded-lg bg-zinc-50 border border-zinc-200/80 text-[11px] sm:text-xs text-zinc-700 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong className="text-zinc-900">Pickup Note: </strong>
                <span>{store.pickupInstructions}</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Product Catalogue Section */}
      <div className="max-w-6xl mx-auto px-3.5 sm:px-6 pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-950">Store Products</h2>
            <p className="text-xs text-zinc-600 mt-0.5">
              {filteredProducts.length} items ready for in-store collection
            </p>
          </div>

          {/* Category Tabs */}
          {categories.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                  selectedCategory === 'all'
                    ? 'bg-zinc-950 text-white'
                    : 'bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-950'
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-zinc-950 text-white'
                      : 'bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-950'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Responsive Mobile-First Product Grid (2 cols on mobile, 3 cols on desktop) */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-zinc-200">
            <ShoppingBag className="w-10 h-10 mx-auto text-zinc-300 mb-2" />
            <p className="text-sm font-semibold text-zinc-900">No products available in this category</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
            {filteredProducts.map((product) => {
              const inCart = cart.items.find((i) => i.productId === product.id);
              const isAvailable = product.stock.isAvailable;

              return (
                <Card
                  key={product.id}
                  className="p-0 overflow-hidden flex flex-col justify-between hover:border-zinc-300 hover:shadow-xs transition-all"
                >
                  <div>
                    {/* Product Image */}
                    <div className="h-32 sm:h-48 w-full bg-zinc-100 relative overflow-hidden">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-100 text-zinc-300">
                          <ShoppingBag className="w-8 h-8 sm:w-10 sm:h-10" />
                        </div>
                      )}

                      {/* Stock availability indicator */}
                      <div className="absolute top-2 right-2">
                        <StockAvailabilityPill
                          quantityOnHand={product.stock.available}
                          quantityReserved={0}
                          lowStockThreshold={5}
                          mode={product.stock.displayMode}
                        />
                      </div>
                    </div>

                    {/* Product Details */}
                    <div className="p-3 sm:p-4">
                      <h3 className="font-semibold text-xs sm:text-sm text-zinc-950 line-clamp-1">
                        {product.name}
                      </h3>
                      {product.sku && (
                        <span className="text-[9px] sm:text-[10px] text-zinc-600 font-mono">
                          {product.sku}
                        </span>
                      )}
                      <p className="text-[11px] sm:text-xs text-zinc-600 mt-1 line-clamp-2 leading-relaxed">
                        {product.description || 'Quality product ready for pickup.'}
                      </p>
                    </div>
                  </div>

                  {/* Price & Action Bar */}
                  <div className="p-3 sm:p-4 pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="font-bold text-sm sm:text-base text-zinc-950 font-mono">
                          {formatCurrency(product.price)}
                        </span>
                        {product.compareAtPrice && product.compareAtPrice > product.price && (
                          <span className="text-[10px] sm:text-xs text-zinc-600 line-through font-mono">
                            {formatCurrency(product.compareAtPrice)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Add / Quantity Controller */}
                    <div>
                      {!isAvailable ? (
                        <Button variant="secondary" size="sm" disabled className="text-xs h-7 px-2 w-full sm:w-auto">
                          Sold Out
                        </Button>
                      ) : inCart ? (
                        <div className="flex items-center justify-center gap-1.5 border border-zinc-200 rounded-lg bg-zinc-50 p-0.5">
                          <button
                            onClick={() => updateQuantity(product.id, inCart.quantity - 1)}
                            className="w-6 h-6 flex items-center justify-center text-zinc-700 hover:text-zinc-950 hover:bg-white rounded transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold text-zinc-900 w-5 text-center">
                            {inCart.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(product.id, inCart.quantity + 1)}
                            disabled={inCart.quantity >= product.stock.available}
                            className="w-6 h-6 flex items-center justify-center text-zinc-700 hover:text-zinc-950 hover:bg-white rounded disabled:opacity-40 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleAddToCart(product)}
                          className="gap-1 text-xs h-7 px-3 w-full sm:w-auto"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Bottom Cart Bar */}
      {cart.businessSlug === store.slug && cart.items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-zinc-200 shadow-xl px-4 py-3 sm:py-3.5">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-zinc-950 text-white flex items-center justify-center font-bold text-xs sm:text-sm">
                {totalCount}
              </div>
              <div>
                <div className="text-[10px] text-zinc-600">Store Pickup Cart</div>
                <div className="font-extrabold text-sm sm:text-base text-zinc-950 font-mono">
                  {formatCurrency(subtotal)}
                </div>
              </div>
            </div>

            <Link href={`/${store.slug}/checkout`}>
              <Button size="md" className="gap-1.5 font-semibold shadow-sm h-10 px-5">
                <span>Pickup Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Single-Store Conflict Modal */}
      {conflictModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-5 space-y-3.5 shadow-xl">
            <div className="flex items-start gap-3 text-amber-600">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-sm text-zinc-950">Replace Current Cart?</h3>
                <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                  Your cart currently has items from{' '}
                  <span className="font-semibold text-zinc-900">
                    {conflictModal.existingBusinessName}
                  </span>
                  . Since each order is picked up from an individual shop, you can order from one store at a time.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setConflictModal(null)}>
                Keep Current
              </Button>
              <Button variant="destructive" size="sm" onClick={handleResolveConflict}>
                Start New Cart
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
