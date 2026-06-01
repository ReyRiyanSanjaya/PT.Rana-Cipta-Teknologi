import React, { useEffect, useState } from 'react';
import client from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import {
  Plus, ShoppingBag, Loader2, Trash2, DollarSign, MapPin, CheckCircle,
  Package, ClipboardList, ArrowRight
} from 'lucide-react';

interface Product {
  id: string; name: string; unit: string; stockQuantity: number;
  pricingTiers: { minQty: number; price: number }[];
}

interface OrderItem {
  productId: string; productName: string; quantity: number; unitPrice: number;
}

export default function SalesVisitOrder() {
  const [visits, setVisits] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderModal, setOrderModal] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [vRes, pRes, oRes] = await Promise.all([
        client.get('/distributor/sfa/visits?status=IN_PROGRESS'),
        client.get('/distributor/products'),
        client.get('/distributor/sales/all-orders?type=visit&limit=10'),
      ]);
      // Also get planned visits
      const plannedRes = await client.get('/distributor/sfa/visits?status=PLANNED');
      const allVisits = [...(vRes.data.data.visits || []), ...(plannedRes.data.data.visits || [])];
      // Filter only today's and in-progress
      const today = new Date().toISOString().split('T')[0];
      const relevant = allVisits.filter(v => v.status === 'IN_PROGRESS' || (v.status === 'PLANNED' && v.date === today));
      setVisits(relevant);
      setProducts(pRes.data.data || []);
      setRecentOrders(oRes.data.data.orders || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const openOrderModal = (visit: any) => {
    setSelectedVisit(visit);
    setItems([]);
    setPaymentMethod('COD');
    setNotes('');
    setOrderModal(true);
  };

  const addItem = () => {
    setItems([...items, { productId: '', productName: '', quantity: 1, unitPrice: 0 }]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    if (field === 'productId') {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[index].productName = product.name;
        newItems[index].unitPrice = product.pricingTiers?.[0]?.price || 0;
      }
    }
    setItems(newItems);
  };

  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) { alert('Tambahkan minimal 1 item'); return; }
    const invalid = items.filter(i => !i.productId || i.quantity <= 0 || i.unitPrice <= 0);
    if (invalid.length > 0) { alert('Semua item harus valid'); return; }

    try {
      setSaving(true);
      await client.post('/distributor/sales/visit-order', {
        visitId: selectedVisit?.id,
        merchantId: selectedVisit?.merchantId,
        items: items.map(i => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
        paymentMethod,
        notes,
      });
      setOrderModal(false);
      fetchData();
      alert('Order berhasil dibuat!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal membuat order');
    } finally { setSaving(false); }
  };

  const fmt = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-teal-600" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Order dari Kunjungan</h1>
        <p className="text-slate-500 dark:text-slate-400">Buat pesanan langsung saat kunjungan sales ke merchant</p>
      </div>

      {/* Active Visits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-teal-600" />
            Kunjungan Aktif Hari Ini
          </CardTitle>
        </CardHeader>
        <CardContent>
          {visits.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">Tidak ada kunjungan aktif</p>
              <p className="text-xs text-slate-400 mt-1">Buat kunjungan di Sales Force terlebih dahulu</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visits.map(visit => (
                <div key={visit.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-teal-300 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white">{visit.merchantName}</h4>
                      <p className="text-xs text-slate-500">{visit.salesName} · {visit.objective}</p>
                    </div>
                    <Badge variant={visit.status === 'IN_PROGRESS' ? 'default' : 'warning'} className="text-[10px]">
                      {visit.status === 'IN_PROGRESS' ? 'Sedang Visit' : 'Planned'}
                    </Badge>
                  </div>
                  <Button size="sm" className="w-full" onClick={() => openOrderModal(visit)} disabled={visit.orderCreated}>
                    {visit.orderCreated ? (
                      <><CheckCircle className="w-3.5 h-3.5 mr-1.5" />Order Dibuat</>
                    ) : (
                      <><Plus className="w-3.5 h-3.5 mr-1.5" />Buat Order</>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Visit Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-indigo-600" />
            Order Terbaru dari Kunjungan
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-center text-slate-400 py-6">Belum ada order dari kunjungan</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 dark:bg-slate-800/50">
                    <th className="text-left py-2.5 px-3 font-medium text-slate-500">No. Order</th>
                    <th className="text-left py-2.5 px-3 font-medium text-slate-500">Merchant</th>
                    <th className="text-left py-2.5 px-3 font-medium text-slate-500">Items</th>
                    <th className="text-right py-2.5 px-3 font-medium text-slate-500">Total</th>
                    <th className="text-center py-2.5 px-3 font-medium text-slate-500">Payment</th>
                    <th className="text-center py-2.5 px-3 font-medium text-slate-500">Status</th>
                    <th className="text-left py-2.5 px-3 font-medium text-slate-500">Tanggal</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o: any) => (
                    <tr key={o.id} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-2.5 px-3 font-mono text-xs">{o.orderNumber}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">{o.customerName}</td>
                      <td className="py-2.5 px-3 text-xs text-slate-500">{o.items?.map((i: any) => `${i.wholesaleProduct?.name} (${i.quantity})`).join(', ')}</td>
                      <td className="py-2.5 px-3 text-right font-bold">{fmt(o.totalAmount)}</td>
                      <td className="py-2.5 px-3 text-center"><Badge variant="default" className="text-[10px]">{o.paymentMethod}</Badge></td>
                      <td className="py-2.5 px-3 text-center"><Badge variant={o.status === 'DELIVERED' ? 'success' : 'warning'} className="text-[10px]">{o.status}</Badge></td>
                      <td className="py-2.5 px-3 text-xs text-slate-500">{new Date(o.createdAt).toLocaleDateString('id-ID')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Modal */}
      <Modal isOpen={orderModal} onClose={() => setOrderModal(false)} title={`Order untuk ${selectedVisit?.merchantName || ''}`} className="max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Visit Info */}
          <div className="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-100 dark:border-teal-800">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-teal-600" />
              <span className="font-medium text-teal-700 dark:text-teal-300">{selectedVisit?.merchantName}</span>
              <span className="text-teal-500">·</span>
              <span className="text-teal-600 text-xs">{selectedVisit?.salesName}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Metode Pembayaran</label>
            <div className="flex gap-3">
              {[{ label: 'COD (Bayar Langsung)', value: 'COD' }, { label: 'Transfer', value: 'TRANSFER' }, { label: 'Kredit/Tempo', value: 'CREDIT' }].map(pm => (
                <label key={pm.value} className={`flex-1 p-3 rounded-lg border-2 cursor-pointer text-center text-sm transition-all ${paymentMethod === pm.value ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                  <input type="radio" className="sr-only" value={pm.value} checked={paymentMethod === pm.value} onChange={e => setPaymentMethod(e.target.value)} />
                  {pm.label}
                </label>
              ))}
            </div>
          </div>

          {/* Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold">Item Pesanan</label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="w-3.5 h-3.5 mr-1" />Tambah</Button>
            </div>

            {items.length === 0 && (
              <div className="text-center py-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-400">Klik "Tambah" untuk menambahkan produk</p>
              </div>
            )}

            {items.map((item, idx) => (
              <div key={idx} className="flex gap-3 items-end p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-slate-500">Produk</label>
                  <select className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" value={item.productId} onChange={e => updateItem(idx, 'productId', e.target.value)} required>
                    <option value="">Pilih produk</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} (stok: {p.stockQuantity} {p.unit})</option>)}
                  </select>
                </div>
                <div className="w-20 space-y-1">
                  <label className="text-xs text-slate-500">Qty</label>
                  <Input type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)} />
                </div>
                <div className="w-32 space-y-1">
                  <label className="text-xs text-slate-500">Harga/unit</label>
                  <Input type="number" min="0" value={item.unitPrice} onChange={e => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)} />
                </div>
                <div className="w-24 text-right">
                  <p className="text-xs text-slate-500">Subtotal</p>
                  <p className="text-sm font-bold">{fmt(item.quantity * item.unitPrice)}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(idx)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
              </div>
            ))}

            {items.length > 0 && (
              <div className="flex justify-end p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800">
                <div className="text-right">
                  <p className="text-xs text-emerald-600">Total Order</p>
                  <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{fmt(totalAmount)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Catatan</label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Catatan tambahan (opsional)" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setOrderModal(false)}>Batal</Button>
            <Button type="submit" disabled={saving || items.length === 0}>
              {saving ? 'Memproses...' : 'Buat Order'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
