import React, { useEffect, useState } from 'react';
import client from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import {
  Plus, ShoppingBag, Globe, Layers, Loader2, Trash2, DollarSign, User, Phone, FileText
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  unit: string;
  stockQuantity: number;
  pricingTiers: { minQty: number; price: number }[];
}

interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface ExternalSale {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  shippingAddress: { customerName?: string; customerPhone?: string; notes?: string };
  items: { quantity: number; unitPrice: number; subtotal: number; wholesaleProduct: { name: string; unit: string } }[];
}

export default function Sales() {
  const [sales, setSales] = useState<ExternalSale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [comparison, setComparison] = useState({ external: 0, ecosystem: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<SaleItem[]>([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [salesRes, productsRes] = await Promise.all([
        client.get('/distributor/external-sales'),
        client.get('/distributor/products')
      ]);
      setSales(salesRes.data.data.sales || []);
      setComparison(salesRes.data.data.comparison || { external: 0, ecosystem: 0 });
      setProducts(productsRes.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const openModal = () => {
    setCustomerName('');
    setCustomerPhone('');
    setNotes('');
    setItems([]);
    setIsModalOpen(true);
  };

  const addItem = () => {
    setItems([...items, { productId: '', productName: '', quantity: 1, unitPrice: 0 }]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;

    // Auto-fill price when product selected
    if (field === 'productId') {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[index].productName = product.name;
        const basePrice = product.pricingTiers?.[0]?.price || 0;
        newItems[index].unitPrice = basePrice;
      }
    }
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || items.length === 0) {
      alert('Nama pelanggan dan minimal 1 item diperlukan');
      return;
    }
    const invalidItems = items.filter(i => !i.productId || i.quantity <= 0 || i.unitPrice <= 0);
    if (invalidItems.length > 0) {
      alert('Semua item harus memiliki produk, jumlah, dan harga yang valid');
      return;
    }

    try {
      setSaving(true);
      await client.post('/distributor/external-sales', {
        customerName,
        customerPhone,
        notes,
        items: items.map(i => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice }))
      });
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menyimpan penjualan');
    } finally { setSaving(false); }
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);
  const totalExternal = sales.reduce((s, sale) => s + sale.totalAmount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Penjualan</h1>
          <p className="text-slate-500 dark:text-slate-400">Catat penjualan dari ekosistem maupun luar ekosistem</p>
        </div>
        <Button onClick={openModal}>
          <Plus className="w-4 h-4 mr-2" /> Catat Penjualan Eksternal
        </Button>
      </div>

      {/* Comparison Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Ekosistem (Kulakan)</p>
              <p className="text-xl font-bold text-teal-600">{comparison.ecosystem}</p>
              <p className="text-[10px] text-slate-400">orders dari merchant</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Luar Ekosistem</p>
              <p className="text-xl font-bold text-indigo-600">{comparison.external}</p>
              <p className="text-[10px] text-slate-400">penjualan manual</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Revenue Eksternal</p>
              <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalExternal)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingBag className="w-5 h-5 text-teal-600" /> Riwayat Penjualan Eksternal
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-teal-600" /></div>
          ) : sales.length === 0 ? (
            <div className="text-center py-12">
              <Globe className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">Belum ada penjualan eksternal</p>
              <p className="text-xs text-slate-400 mt-1">Catat penjualan di luar ekosistem untuk tracking lengkap</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="text-left py-3 px-3 font-medium text-slate-500">No. Order</th>
                    <th className="text-left py-3 px-3 font-medium text-slate-500">Pelanggan</th>
                    <th className="text-left py-3 px-3 font-medium text-slate-500">Items</th>
                    <th className="text-right py-3 px-3 font-medium text-slate-500">Total</th>
                    <th className="text-left py-3 px-3 font-medium text-slate-500">Tanggal</th>
                    <th className="text-center py-3 px-3 font-medium text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map(sale => (
                    <tr key={sale.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-3 font-mono text-xs font-medium text-slate-900 dark:text-white">{sale.orderNumber}</td>
                      <td className="py-3 px-3">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{sale.shippingAddress?.customerName || '-'}</p>
                          {sale.shippingAddress?.customerPhone && (
                            <p className="text-xs text-slate-400">{sale.shippingAddress.customerPhone}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                        {sale.items.map(i => `${i.wholesaleProduct?.name} (${i.quantity})`).join(', ')}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">{formatCurrency(sale.totalAmount)}</td>
                      <td className="py-3 px-3 text-slate-500 text-xs">{new Date(sale.createdAt).toLocaleDateString('id-ID')}</td>
                      <td className="py-3 px-3 text-center">
                        <Badge variant="success">Selesai</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create External Sale Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Catat Penjualan Eksternal" className="max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Customer Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-400" /> Nama Pelanggan *</label>
              <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Nama toko/pelanggan" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" /> Telepon</label>
              <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="08xxxxxxxxxx" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-slate-400" /> Catatan</label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Catatan tambahan (opsional)" />
          </div>

          {/* Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold">Item Penjualan</label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Item
              </Button>
            </div>

            {items.length === 0 && (
              <div className="text-center py-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                <ShoppingBag className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-400">Klik "Tambah Item" untuk menambahkan produk</p>
              </div>
            )}

            {items.map((item, idx) => (
              <div key={idx} className="flex gap-3 items-end p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-slate-500">Produk</label>
                  <select
                    className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                    value={item.productId}
                    onChange={e => updateItem(idx, 'productId', e.target.value)}
                    required
                  >
                    <option value="">Pilih produk</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (stok: {p.stockQuantity} {p.unit})</option>
                    ))}
                  </select>
                </div>
                <div className="w-24 space-y-1">
                  <label className="text-xs text-slate-500">Qty</label>
                  <Input type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)} />
                </div>
                <div className="w-36 space-y-1">
                  <label className="text-xs text-slate-500">Harga/unit</label>
                  <Input type="number" min="0" value={item.unitPrice} onChange={e => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)} />
                </div>
                <div className="w-28 text-right">
                  <p className="text-xs text-slate-500 mb-1">Subtotal</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(item.quantity * item.unitPrice)}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(idx)} className="text-red-500 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}

            {items.length > 0 && (
              <div className="flex justify-end p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-100 dark:border-teal-800">
                <div className="text-right">
                  <p className="text-xs text-teal-600">Total Penjualan</p>
                  <p className="text-xl font-bold text-teal-700 dark:text-teal-300">{formatCurrency(totalAmount)}</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" disabled={saving || items.length === 0}>
              {saving ? 'Menyimpan...' : 'Simpan Penjualan'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
