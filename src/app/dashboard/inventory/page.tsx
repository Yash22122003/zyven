'use client';

import React, { useEffect, useState } from 'react';
import { formatDate } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Layers,
  Search,
  RefreshCw,
  Edit,
  History,
  X,
} from 'lucide-react';

export default function MerchantInventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [adjustModal, setAdjustModal] = useState<any | null>(null);
  const [newStockVal, setNewStockVal] = useState('');
  const [reasonVal, setReasonVal] = useState('Physical stock count verification');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchInventory = async () => {
    try {
      const res = await fetch('/api/merchant/inventory');
      if (res.ok) {
        const data = await res.json();
        setItems(data.inventory || []);
        setMovements(data.movements || []);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleOpenAdjust = (item: any) => {
    setAdjustModal(item);
    setNewStockVal(item.quantityOnHand.toString());
    setReasonVal('Restock arrival');
    setError('');
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModal) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/merchant/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: adjustModal.productId,
          newOnHand: parseInt(newStockVal, 10),
          reason: reasonVal.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update inventory');
      }

      setAdjustModal(null);
      await fetchInventory();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Adjustment error');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = items.filter(
    (i) =>
      i.productName.toLowerCase().includes(search.toLowerCase()) ||
      (i.sku && i.sku.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-5 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950">
            Inventory & Stock Control
          </h1>
          <p className="text-xs text-zinc-600 mt-0.5">
            Monitor live on-hand quantities, order reservations, and record stock adjustments.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchInventory()}
          className="gap-1.5 text-xs h-8 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Stock</span>
        </Button>
      </div>

      {/* Filter and Search */}
      <div className="w-full sm:w-72 relative">
        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
        <input
          type="text"
          placeholder="Filter stock by name or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-8 pl-9 pr-3 rounded-lg border border-zinc-200 bg-white text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-950"
        />
      </div>

      {/* Inventory Listings */}
      {loading ? (
        <div className="space-y-2.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-zinc-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-zinc-500">
          <Layers className="w-10 h-10 text-zinc-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-zinc-900">No matching items found</p>
        </Card>
      ) : (
        <>
          {/* Mobile Concise Card View */}
          <div className="space-y-2.5 sm:hidden">
            {filtered.map((item) => (
              <Card key={item.id} className="p-3.5 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-xs text-zinc-950 leading-snug">
                      {item.productName}
                    </div>
                    {item.sku && (
                      <span className="text-[10px] text-zinc-600 font-mono">SKU: {item.sku}</span>
                    )}
                  </div>

                  <div>
                    {item.available <= 0 ? (
                      <Badge variant="error" size="sm">Out of Stock</Badge>
                    ) : item.isLowStock ? (
                      <Badge variant="warning" size="sm">Low Stock</Badge>
                    ) : (
                      <Badge variant="success" size="sm">In Stock</Badge>
                    )}
                  </div>
                </div>

                {/* Numbers row */}
                <div className="grid grid-cols-3 gap-2 p-2 rounded-lg bg-zinc-50 border border-zinc-100 text-center text-xs">
                  <div>
                    <div className="text-[10px] text-zinc-600">On-Hand</div>
                    <div className="font-bold text-zinc-950">{item.quantityOnHand}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-600">Reserved</div>
                    <div className="font-mono text-amber-700 font-semibold">{item.quantityReserved}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-600">Available</div>
                    <div className="font-extrabold text-zinc-950">{item.available}</div>
                  </div>
                </div>

                <div className="pt-1 flex justify-end">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 text-xs px-3 gap-1 w-full"
                    onClick={() => handleOpenAdjust(item)}
                  >
                    <Edit className="w-3 h-3" />
                    <span>Quick Adjust Stock</span>
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 font-medium">
                  <tr>
                    <th className="py-3 px-4">Item</th>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4">Physical On-Hand</th>
                    <th className="py-3 px-4">Reserved in Orders</th>
                    <th className="py-3 px-4">Available for Sale</th>
                    <th className="py-3 px-4">Stock Health</th>
                    <th className="py-3 px-4 text-right">Adjustment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-zinc-950">
                        {item.productName}
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-400 text-[11px]">
                        {item.sku || '—'}
                      </td>
                      <td className="py-3 px-4 font-bold text-zinc-950">
                        {item.quantityOnHand}
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-600">
                        {item.quantityReserved > 0 ? (
                          <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            {item.quantityReserved} reserved
                          </span>
                        ) : (
                          '0'
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold text-base text-zinc-950">
                        {item.available}
                      </td>
                      <td className="py-3 px-4">
                        {item.available <= 0 ? (
                          <Badge variant="error" size="sm">
                            Out of Stock
                          </Badge>
                        ) : item.isLowStock ? (
                          <Badge variant="warning" size="sm">
                            Low Stock (≤{item.lowStockThreshold})
                          </Badge>
                        ) : (
                          <Badge variant="success" size="sm">
                            Adequate
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 text-xs px-2.5 gap-1"
                          onClick={() => handleOpenAdjust(item)}
                        >
                          <Edit className="w-3 h-3" />
                          <span>Adjust</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Movement Audit Trail Section */}
      <div className="space-y-3 pt-5 border-t border-zinc-200">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-zinc-500" />
          <h2 className="font-bold text-xs sm:text-sm text-zinc-950">Inventory Audit Trail</h2>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 font-medium">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Change</th>
                  <th className="py-3 px-4">New On-Hand</th>
                  <th className="py-3 px-4">Reason / Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-zinc-50/50">
                    <td className="py-3 px-4 text-zinc-400 font-mono text-[11px]">
                      {formatDate(m.createdAt)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-zinc-900">
                      {m.productName}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[10px] text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded">
                        {m.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold font-mono">
                      {m.changeQuantity > 0 ? (
                        <span className="text-emerald-700">+{m.changeQuantity}</span>
                      ) : (
                        <span className="text-rose-600">{m.changeQuantity}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-zinc-950">
                      {m.newQuantityOnHand}
                    </td>
                    <td className="py-3 px-4 text-zinc-600 text-[11px]">
                      {m.reason || m.referenceId || 'Manual update'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Adjust Modal */}
      {adjustModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-5 sm:p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h3 className="font-bold text-sm sm:text-base text-zinc-950">
                Adjust Physical Stock: {adjustModal.productName}
              </h3>
              <button onClick={() => setAdjustModal(null)} className="text-zinc-400 hover:text-zinc-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {error}
              </div>
            )}

            <form onSubmit={handleAdjustSubmit} className="space-y-3.5">
              <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 text-xs text-zinc-600 space-y-1">
                <div className="flex justify-between">
                  <span>Current Physical On-Hand:</span>
                  <span className="font-bold text-zinc-950">{adjustModal.quantityOnHand} units</span>
                </div>
                <div className="flex justify-between">
                  <span>Reserved in Orders:</span>
                  <span className="font-mono text-amber-700 font-semibold">{adjustModal.quantityReserved} units</span>
                </div>
              </div>

              <Input
                label="New Total Physical On-Hand"
                type="number"
                min="0"
                value={newStockVal}
                onChange={(e) => setNewStockVal(e.target.value)}
                required
              />

              <Input
                label="Adjustment Reason (Logged for audit)"
                placeholder="e.g. Restock shipment from supplier"
                value={reasonVal}
                onChange={(e) => setReasonVal(e.target.value)}
                required
              />

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setAdjustModal(null)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={submitting}>
                  Save Adjustment
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
