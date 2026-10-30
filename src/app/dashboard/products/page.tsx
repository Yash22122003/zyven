'use client';

import React, { useEffect, useState } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  Plus,
  Search,
  ExternalLink,
  Edit2,
  Check,
  X,
  ShoppingBag,
} from 'lucide-react';

interface ProductData {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  price: number;
  compareAtPrice: number | null;
  imageUrl: string | null;
  isActive: boolean;
  inventory: {
    quantityOnHand: number;
    quantityReserved: number;
    available: number;
    lowStockThreshold: number;
  } | null;
}

export default function MerchantProductsPage() {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    price: '',
    compareAtPrice: '',
    imageUrl: '',
    initialStock: '10',
    lowStockThreshold: '5',
  });

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/merchant/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleToggleActive = async (id: string, currentState: boolean) => {
    try {
      const res = await fetch(`/api/merchant/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentState }),
      });

      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, isActive: !currentState } : p))
        );
      }
    } catch {
      // Ignore
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        sku: formData.sku.trim() || undefined,
        price: parseFloat(formData.price),
        compareAtPrice: formData.compareAtPrice ? parseFloat(formData.compareAtPrice) : null,
        imageUrl: formData.imageUrl.trim() || undefined,
        initialStock: parseInt(formData.initialStock, 10) || 0,
        lowStockThreshold: parseInt(formData.lowStockThreshold, 10) || 5,
        isActive: true,
      };

      const res = await fetch('/api/merchant/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create product');
      }

      setModalOpen(false);
      setFormData({
        name: '',
        description: '',
        sku: '',
        price: '',
        compareAtPrice: '',
        imageUrl: '',
        initialStock: '10',
        lowStockThreshold: '5',
      });
      await fetchProducts();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Error creating product');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
            Product Catalogue
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Add items, manage selling prices, and control storefront visibility.
          </p>
        </div>

        <Button
          size="sm"
          className="gap-1.5 self-start sm:self-auto font-semibold shadow-xs"
          onClick={() => setModalOpen(true)}
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </Button>
      </div>

      {/* Search Bar */}
      <div className="w-full sm:w-72 relative">
        <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-zinc-400" />
        <input
          type="text"
          placeholder="Filter products or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-9 pl-9 pr-3 rounded-lg border border-zinc-200 bg-white text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-950"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-zinc-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-16 text-center text-zinc-500">
          <Package className="w-10 h-10 text-zinc-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-zinc-900">No products found</p>
          <p className="text-xs text-zinc-400 mt-1">
            Get started by adding your first product listing.
          </p>
        </Card>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 font-medium">
                <tr>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Compare At</th>
                  <th className="py-3 px-4">Available Stock</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Visibility</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map((prod) => (
                  <tr key={prod.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded bg-zinc-100 shrink-0 overflow-hidden">
                          {prod.imageUrl ? (
                            <img
                              src={prod.imageUrl}
                              alt={prod.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-300">
                              <ShoppingBag className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <div className="font-semibold text-zinc-950 truncate max-w-xs">
                          {prod.name}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-500 text-[11px]">
                      {prod.sku || '—'}
                    </td>
                    <td className="py-3 px-4 font-bold text-zinc-950">
                      {formatCurrency(prod.price)}
                    </td>
                    <td className="py-3 px-4 text-zinc-400 font-mono text-[11px] line-through">
                      {prod.compareAtPrice ? formatCurrency(prod.compareAtPrice) : '—'}
                    </td>
                    <td className="py-3 px-4 font-medium">
                      {prod.inventory ? (
                        <span
                          className={
                            prod.inventory.available <= prod.inventory.lowStockThreshold
                              ? 'text-amber-600 font-bold'
                              : 'text-zinc-700'
                          }
                        >
                          {prod.inventory.available} units
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {prod.isActive ? (
                        <Badge variant="success" size="sm">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">
                          Hidden
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleToggleActive(prod.id, prod.isActive)}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                          prod.isActive
                            ? 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {prod.isActive ? 'Hide from Store' : 'Publish to Store'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h3 className="font-bold text-base text-zinc-950">Add Product to Storefront</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateProduct} className="space-y-3.5">
              <Input
                label="Product Name"
                placeholder="e.g. Organic Basmati Rice (5kg)"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Selling Price (₹)"
                  type="number"
                  step="0.01"
                  placeholder="499.00"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
                <Input
                  label="Compare At Price (MRP / Optional)"
                  type="number"
                  step="0.01"
                  placeholder="580.00"
                  value={formData.compareAtPrice}
                  onChange={(e) => setFormData({ ...formData, compareAtPrice: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="SKU / Item Code"
                  placeholder="e.g. RIC-001"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                />
                <Input
                  label="Initial Stock On-Hand"
                  type="number"
                  placeholder="25"
                  value={formData.initialStock}
                  onChange={(e) => setFormData({ ...formData, initialStock: e.target.value })}
                  required
                />
              </div>

              <Input
                label="Product Image URL (Optional)"
                placeholder="https://images.unsplash.com/..."
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              />

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Detailed product specifications..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-lg border border-zinc-200 p-2.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-950"
                />
              </div>

              <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={submitting}>
                  Save Product
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
