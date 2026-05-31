import React, { useEffect, useState, useMemo } from 'react';
import client from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import {
  Package, Search, ArrowDownToLine, ArrowUpFromLine, RefreshCw, Loader2,
  AlertTriangle, CheckCircle, XCircle, Filter, History, DollarSign, Boxes, ClipboardList
} from 'lucide-react';

interface StockProduct {
  id: string;
  name: string;
  unit: string;
  category: string;
  stockQuantity: number;
  moq: number;
  basePrice: number;
  stockValue: number;
  status: string;
  updatedAt: string;
}

interface StockSummary {
  totalItems: number;
  totalUnits: number;
  totalValue: number;
  outOfStock: number;
  lowStock: number;
}

interface Movement {
  id: string;
  date: string;
  type: string;
  productName: string;
  unit: string;
  quantity: number;
  reference: string;
  customer: string;
  amount: number;
}

type TabType = 'inventory' | 'movements' | 'adjust';

export default function WarehouseStock() {
  const [products, setProducts] = useState<StockProduct[]>([]);
  const [summary, setSummary] = useState<StockSummary | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('inventory');
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('');

  // Adjust modal
  const [adjustModal, setAdjustModal] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<StockProduct | null>(null);
  const [adjustType, setAdjustType] = useState<'IN' | 'OUT' | 'CORRECTION'>('IN');
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  useEffect(() => { fetchStock(); }, [stockFilter]);
  useEffect(() => { if (activeTab === 'movements') fetchMovements(); }, [activeTab]);

  const fetchStock = async () => {
    try {
      setLoading(true);
      const res = await client.get('/distributor/warehouses/stock', {
        params: { stockStatus: stockFilter || undefined }
      });
      setProducts(res.data.data.products || []);
      setSummary(res.data.data.summary || null);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchMovements = async () => {
    try {
      const res = await client.get('/distributor/warehouses/stock/movements');
      setMovements(res.data.data.movements || []);
    } catch (e) { console.error(e); }
  };

  const openAdjust = (product: StockProduct) => {
    setAdjustProduct(product);
    setAdjustType('IN');
    setAdjustQty(0);
    setAdjustReason('');
    setAdjustModal(true);
  };

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustProduct || adjustQty <= 0) return;
    try {
      setAdjusting(true);
      await client.post('/distributor/warehouses/stock/adjust', {
        productId: adjustProduct.id,
        type: adjustType,
        quantity: adjustQty,
        reason: adjustReason
      });
      setAdjustModal(false);
      fetchStock();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menyesuaikan stok');
    } finally { setAdjusting(false); }
  };

  const filteredProducts = useMemo(() => {
    if (!search) return products;
    return products.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
    );
  }, [products, search]);

  const formatCurrency = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OUT_OF_STOCK': return <Badge variant="destructive">Habis</Badge>;
      case 'LOW': return <Badge variant="warning">Rendah</Badge>;
      default: return <Badge variant="success">Aman</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Stok Gudang</h1>
          <p className="text-slate-500 dark:text-slate-400">Manajemen barang masuk, keluar, dan koreksi stok</p>
        </div>
        <Button variant="outline" onClick={fetchStock} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="p-4 text-center">
              <Boxes className="w-5 h-5 mx-auto text-teal-600 mb-1" />
              <p className="text-xl font-bold text-slate-900 dark:text-white">{summary.totalItems}</p>
              <p className="text-[10px] text-slate-500">Jenis Produk</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Package className="w-5 h-5 mx-auto text-indigo-600 mb-1" />
              <p className="text-xl font-bold text-slate-900 dark:text-white">{summary.totalUnits.toLocaleString()}</p>
              <p className="text-[10px] text-slate-500">Total Unit</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
              <p className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(summary.totalValue)}</p>
              <p className="text-[10px] text-slate-500">Nilai Stok</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-5 h-5 mx-auto text-amber-600 mb-1" />
              <p className="text-xl font-bold text-amber-600">{summary.lowStock}</p>
              <p className="text-[10px] text-slate-500">Stok Rendah</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <XCircle className="w-5 h-5 mx-auto text-red-600 mb-1" />
              <p className="text-xl font-bold text-red-600">{summary.outOfStock}</p>
              <p className="text-[10px] text-slate-500">Habis</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="-mb-px flex space-x-6">
          {[
            { id: 'inventory' as TabType, label: 'Inventaris', icon: ClipboardList },
            { id: 'movements' as TabType, label: 'Riwayat Pergerakan', icon: History },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <>
          {/* Filters */}
          <Card>
            <CardContent className="p-3">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    className="pl-9"
                    placeholder="Cari produk..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <select
                  className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900"
                  value={stockFilter}
                  onChange={e => setStockFilter(e.target.value)}
                >
                  <option value="">Semua Status</option>
                  <option value="healthy">Stok Aman</option>
                  <option value="low">Stok Rendah</option>
                  <option value="out">Habis</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Product Table */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-teal-600" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                        <th className="text-left py-3 px-4 font-medium text-slate-500">Produk</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-500">Kategori</th>
                        <th className="text-right py-3 px-4 font-medium text-slate-500">Stok</th>
                        <th className="text-right py-3 px-4 font-medium text-slate-500">MOQ</th>
                        <th className="text-right py-3 px-4 font-medium text-slate-500">Harga</th>
                        <th className="text-right py-3 px-4 font-medium text-slate-500">Nilai Stok</th>
                        <th className="text-center py-3 px-4 font-medium text-slate-500">Status</th>
                        <th className="text-center py-3 px-4 font-medium text-slate-500">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.length === 0 ? (
                        <tr><td colSpan={8} className="py-12 text-center text-slate-400">Tidak ada produk ditemukan</td></tr>
                      ) : filteredProducts.map(p => (
                        <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="py-3 px-4">
                            <span className="font-medium text-slate-900 dark:text-white">{p.name}</span>
                            <span className="text-xs text-slate-400 ml-1">({p.unit})</span>
                          </td>
                          <td className="py-3 px-4 text-slate-500">{p.category}</td>
                          <td className="py-3 px-4 text-right">
                            <span className={`font-bold ${p.status === 'OUT_OF_STOCK' ? 'text-red-600' : p.status === 'LOW' ? 'text-amber-600' : 'text-slate-900 dark:text-white'}`}>
                              {p.stockQuantity.toLocaleString()}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-slate-500">{p.moq}</td>
                          <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-300">{formatCurrency(p.basePrice)}</td>
                          <td className="py-3 px-4 text-right font-medium text-slate-900 dark:text-white">{formatCurrency(p.stockValue)}</td>
                          <td className="py-3 px-4 text-center">{getStatusBadge(p.status)}</td>
                          <td className="py-3 px-4 text-center">
                            <Button variant="outline" size="sm" onClick={() => openAdjust(p)}>
                              Adjust
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Movements Tab */}
      {activeTab === 'movements' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="w-5 h-5 text-teal-600" /> Riwayat Pergerakan Stok (30 Hari)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Tanggal</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Tipe</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Produk</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-500">Qty</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Referensi</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Pelanggan</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-500">Nilai</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.length === 0 ? (
                    <tr><td colSpan={7} className="py-12 text-center text-slate-400">Belum ada pergerakan stok</td></tr>
                  ) : movements.map(m => (
                    <tr key={m.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4 text-xs text-slate-500">{new Date(m.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td className="py-3 px-4">
                        <Badge variant={m.type === 'SALE_ECOSYSTEM' ? 'success' : 'default'} className="text-[10px]">
                          {m.type === 'SALE_ECOSYSTEM' ? 'Ekosistem' : 'Eksternal'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{m.productName}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-red-600 font-medium">-{m.quantity} {m.unit}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-500">{m.reference}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{m.customer}</td>
                      <td className="py-3 px-4 text-right font-medium text-slate-900 dark:text-white">{formatCurrency(m.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Adjust Stock Modal */}
      <Modal isOpen={adjustModal} onClose={() => setAdjustModal(false)} title={`Adjust Stok: ${adjustProduct?.name || ''}`} className="max-w-md">
        <form onSubmit={handleAdjust} className="space-y-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-300">Stok saat ini:</span>
            <span className="text-lg font-bold text-slate-900 dark:text-white">{adjustProduct?.stockQuantity} {adjustProduct?.unit}</span>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Tipe Penyesuaian</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'IN' as const, label: 'Masuk', icon: ArrowDownToLine, color: 'text-emerald-600 border-emerald-200 bg-emerald-50' },
                { value: 'OUT' as const, label: 'Keluar', icon: ArrowUpFromLine, color: 'text-red-600 border-red-200 bg-red-50' },
                { value: 'CORRECTION' as const, label: 'Koreksi', icon: RefreshCw, color: 'text-indigo-600 border-indigo-200 bg-indigo-50' },
              ]).map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setAdjustType(t.value)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-xs font-medium transition-all ${
                    adjustType === t.value ? t.color : 'border-slate-200 dark:border-slate-700 text-slate-500'
                  }`}
                >
                  <t.icon className="w-4 h-4" />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {adjustType === 'CORRECTION' ? 'Stok Baru (Set Exact)' : `Jumlah ${adjustType === 'IN' ? 'Masuk' : 'Keluar'}`}
            </label>
            <Input type="number" min="0" value={adjustQty} onChange={e => setAdjustQty(parseInt(e.target.value) || 0)} required />
            {adjustType !== 'CORRECTION' && adjustProduct && (
              <p className="text-xs text-slate-500">
                Stok setelah: <strong>{adjustType === 'IN' ? adjustProduct.stockQuantity + adjustQty : Math.max(0, adjustProduct.stockQuantity - adjustQty)}</strong> {adjustProduct.unit}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Alasan (opsional)</label>
            <Input value={adjustReason} onChange={e => setAdjustReason(e.target.value)} placeholder="Restock dari supplier, koreksi fisik, dll" />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setAdjustModal(false)}>Batal</Button>
            <Button type="submit" disabled={adjusting || adjustQty <= 0}>
              {adjusting ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
