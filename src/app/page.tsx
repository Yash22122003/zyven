'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Store,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  ShoppingBag,
  Package,
  Layers,
  ChevronRight,
  Search,
} from 'lucide-react';

interface StoreItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  city: string;
  state: string;
  category: string;
  productCount: number;
  isOpenManually: boolean;
  estimatedPrepTimeMinutes: number;
}

export default function HomePage() {
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/marketplace/stores')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.stores) {
          setStores(data.stores);
          setCategories(data.categories || []);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const filteredStores = stores.filter((s) => {
    const matchesCat = selectedCategory === 'all' || s.category.toLowerCase().includes(selectedCategory.toLowerCase());
    const matchesQuery =
      searchQuery.trim() === '' ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.city.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero Section */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-32 px-4 sm:px-6 overflow-hidden border-b border-zinc-200/80 bg-white">
        <div className="max-w-5xl mx-auto text-center flex flex-col items-center">
          {/* Introductory badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-800 text-xs font-medium mb-6">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Introductory Offer: ₹1/month for your first 3 months</span>
            <span className="text-zinc-400">•</span>
            <span className="text-zinc-600">0% Commission</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-zinc-950 max-w-4xl leading-[1.08]">
            Local Businesses.{' '}
            <span className="text-zinc-500">Digital Possibilities.</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-zinc-600 max-w-2xl font-normal leading-relaxed">
            ZYVEN is the modern commerce infrastructure platform powering independent neighborhood stores.
            Launch your own digital storefront, sync live inventory, and accept store pickup orders effortlessly.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/register">
              <Button size="lg" className="h-12 px-7 text-sm font-semibold shadow-md gap-2">
                <Store className="w-4 h-4" />
                Launch Store for ₹1/month
              </Button>
            </Link>
            <a href="#discover">
              <Button variant="outline" size="lg" className="h-12 px-6 text-sm font-medium gap-2">
                Explore Local Stores
                <ArrowRight className="w-4 h-4 text-zinc-500" />
              </Button>
            </a>
          </div>

          {/* Clean URL demonstration bar */}
          <div className="mt-12 inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200/90 text-xs text-zinc-600 font-mono shadow-xs">
            <span className="text-zinc-400">Your Storefront URL:</span>
            <span className="text-zinc-900 font-semibold bg-white px-2 py-0.5 rounded border border-zinc-200">
              zyven.me/your-store
            </span>
            <Badge variant="success" size="sm">
              Ready to Share
            </Badge>
          </div>
        </div>
      </section>

      {/* Discovery / Marketplace Section */}
      <section id="discover" className="py-16 md:py-24 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1">
              <ShoppingBag className="w-3.5 h-3.5" />
              Live Marketplace
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950">
              Discover Neighborhood Stores
            </h2>
            <p className="text-sm text-zinc-500 mt-1">
              Browse products, view real-time stock availability, and collect orders directly from the shop.
            </p>
          </div>

          {/* Search Bar */}
          <div className="w-full md:w-80 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
            <input
              type="text"
              placeholder="Search store or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-lg border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-950 transition-all"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-none mb-6">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-zinc-950 text-white shadow-xs'
                : 'bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.name)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                selectedCategory === cat.name
                  ? 'bg-zinc-950 text-white shadow-xs'
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Stores Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 rounded-xl bg-zinc-100 animate-pulse" />
            ))}
          </div>
        ) : filteredStores.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-zinc-200">
            <Store className="w-10 h-10 mx-auto text-zinc-300 mb-3" />
            <p className="text-base font-semibold text-zinc-900">No stores found</p>
            <p className="text-xs text-zinc-500 mt-1">Try searching for a different keyword or category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredStores.map((store) => (
              <Link key={store.id} href={`/${store.slug}`} className="group">
                <Card className="h-full p-0 overflow-hidden hover:border-zinc-400 hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    {/* Store Banner */}
                    <div className="h-36 w-full bg-zinc-100 relative overflow-hidden">
                      {store.bannerUrl ? (
                        <img
                          src={store.bannerUrl}
                          alt={store.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-100 text-zinc-400">
                          <Store className="w-8 h-8" />
                        </div>
                      )}
                      <div className="absolute top-3 right-3">
                        <Badge variant="brand" size="sm" className="bg-white/90 text-zinc-900 border border-zinc-200 shadow-xs">
                          {store.category}
                        </Badge>
                      </div>
                    </div>

                    {/* Store Header & Info */}
                    <div className="p-5">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-base text-zinc-950 group-hover:text-zinc-700 transition-colors">
                          {store.name}
                        </h3>
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      </div>

                      <div className="text-xs text-zinc-600 font-mono mt-0.5">
                        zyven.me/{store.slug}
                      </div>

                      <p className="text-xs text-zinc-600 mt-2 line-clamp-2 leading-relaxed">
                        {store.description || 'Visit our storefront to browse available items and place pickup orders.'}
                      </p>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="px-5 py-3.5 bg-zinc-50/70 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-600">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Prep ~{store.estimatedPrepTimeMinutes}m</span>
                    </div>

                    <div className="flex items-center gap-1 font-semibold text-zinc-900 group-hover:translate-x-0.5 transition-transform">
                      <span>Visit Store</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Value Pillars Section */}
      <section className="py-20 bg-zinc-900 text-white px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              The ZYVEN Infrastructure
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Designed for Shopkeepers, Built for Scalability
            </h3>
            <p className="text-sm text-zinc-400 mt-3">
              Everything local merchants need to operate digitally without commission deductions or website maintenance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-zinc-800/60 border border-zinc-700/60 rounded-xl p-6 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-zinc-700 flex items-center justify-center text-white mb-4">
                  <Store className="w-5 h-5" />
                </div>
                <h4 className="font-semibold text-base text-zinc-100">Dedicated Storefront</h4>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                  Every business receives its own branded URL (zyven.me/your-store) to share via WhatsApp, Instagram, or business cards.
                </p>
              </div>
            </div>

            <div className="bg-zinc-800/60 border border-zinc-700/60 rounded-xl p-6 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-zinc-700 flex items-center justify-center text-white mb-4">
                  <Layers className="w-5 h-5" />
                </div>
                <h4 className="font-semibold text-base text-zinc-100">Live Inventory Sync</h4>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                  Avoid physical overselling. Our atomic reservation engine reserves items during customer checkout and updates stock live.
                </p>
              </div>
            </div>

            <div className="bg-zinc-800/60 border border-zinc-700/60 rounded-xl p-6 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-zinc-700 flex items-center justify-center text-white mb-4">
                  <Package className="w-5 h-5" />
                </div>
                <h4 className="font-semibold text-base text-zinc-100">Physical Store Pickup</h4>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                  No delivery fleet overhead, lost packages, or rider commissions. Customers order online and collect in person from your shop.
                </p>
              </div>
            </div>

            <div className="bg-zinc-800/60 border border-zinc-700/60 rounded-xl p-6 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-zinc-700 flex items-center justify-center text-white mb-4">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h4 className="font-semibold text-base text-zinc-100">0% Sales Commission</h4>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                  Keep 100% of your customer order value. Transparent, predictable SaaS pricing with no hidden per-transaction cuts.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 bg-white border-b border-zinc-200">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <Badge variant="warning" className="mb-3">
            Limited Launch Promotion
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-950 tracking-tight">
            Transparent, Predictable SaaS Pricing
          </h2>
          <p className="text-sm text-zinc-600 mt-2">
            No setup fees, no lock-in contracts, and zero commission on product orders.
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <Card className="p-8 border-2 border-zinc-950 relative shadow-lg">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-zinc-950 text-white text-[11px] font-semibold tracking-wide uppercase">
              Introductory Launch Offer
            </div>

            <div className="text-center mt-2">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-extrabold text-zinc-950">₹1</span>
                <span className="text-zinc-500 font-medium">/ month</span>
              </div>
              <p className="text-xs text-zinc-600 mt-1">
                Introductory rate for your first 3 months. Renews at standard ₹299/month afterward.
              </p>
            </div>

            <div className="mt-8 space-y-3.5 text-sm text-zinc-700">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Dedicated storefront route (zyven.me/your-store)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Unlimited product catalogue & image uploads</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Live inventory sync & atomic oversell prevention</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Online orders for physical in-store pickup</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Mobile-first merchant management dashboard</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold text-zinc-950">Zero commission on all sales</span>
              </div>
            </div>

            <div className="mt-8">
              <Link href="/register" className="w-full block">
                <Button size="lg" className="w-full font-semibold shadow-sm">
                  Get Started for ₹1
                </Button>
              </Link>
            </div>

            <p className="text-[11px] text-zinc-400 text-center mt-3">
              Instant activation • No credit card required to explore
            </p>
          </Card>
        </div>
      </section>
    </div>
  );
}
