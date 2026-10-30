'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Store, ShieldCheck, Clock, Search, ChevronRight } from 'lucide-react';

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

export default function ExplorePage() {
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

  const filtered = stores.filter((s) => {
    const matchesCat = selectedCategory === 'all' || s.category.toLowerCase().includes(selectedCategory.toLowerCase());
    const matchesQuery =
      searchQuery.trim() === '' ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.city.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 flex-1 w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950">
          Explore Local Storefronts
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Support neighborhood businesses. Order online and collect safely in-store.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-8">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 scrollbar-none">
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
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.name)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                selectedCategory === c.name
                  ? 'bg-zinc-950 text-white'
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-950'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-72 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
          <input
            type="text"
            placeholder="Search stores or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-lg border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-950"
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-xl bg-zinc-100 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-zinc-200">
          <Store className="w-12 h-12 mx-auto text-zinc-300 mb-3" />
          <p className="text-base font-semibold text-zinc-900">No stores match your criteria</p>
          <p className="text-xs text-zinc-500 mt-1">Try another search or select "All".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filtered.map((store) => (
            <Link key={store.id} href={`/${store.slug}`} className="group">
              <Card className="h-full p-0 overflow-hidden hover:border-zinc-400 hover:shadow-md transition-all flex flex-col justify-between">
                <div>
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
    </div>
  );
}
