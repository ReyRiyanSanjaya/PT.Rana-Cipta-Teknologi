import React, { useEffect, useState } from 'react';
import client from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import {
  Plus, Tag, Percent, Gift, Package, ShoppingBag, Loader2, Trash2,
  ToggleLeft, ToggleRight, Calendar, Code, Sparkles
} from 'lucide-react';

const PROMO_TYPES = [
  { value: 'PERCENTAGE', label: 'Diskon %', icon: Percent, color: 'text-green-600 bg-green-50' },
  { value: 'FIXED', label: 'Potongan Rp', icon: Tag, color: 'text-blue-600 bg-blue-50' },
  { value: 'BUY_X_GET_Y', label: 'Beli X Gratis Y', icon: Gift, color: 'text-purple-600 bg-purple-50' },
  { value: 'BUNDLE', label: 'Bundle Deal', icon: Package, color: 'text-orange-600 bg-orange-50' },
  { value: 'MIN_QTY_DISCOUNT', label: 'Min Qty Discount', icon: ShoppingBag, color: 'text-teal-600 bg-teal-50' },
  { value: 'FREE_ITEM', label: 'Free Item', icon: Sparkles, color: 'text-pink-600 bg-pink-50' },
];

export default function Promotions() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<any[]>([]);

  const [form, setForm] = useState({
    name: '', code: '', type: 'PERCENTAGE', value: '', minOrderAmount: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    description: '',
    buyQty: '3', freeQty: '1', freeProductName: '',
    bundlePrice: '', minQty: '', discountPerUnit: '',
    freeItemThreshold: '', freeItemProductName: '',
    maxUsage: '',
  });

  useEffect(() => { fetchData(); }, [filter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pRes, prodRes] = await Promise.all([
        client.get(`/distributor/promotions${filter !== 'all' ? `?status=${filter}` : ''}`),
        client.get('/distributor/products'),
      ]);
      setData(pRes.data.data);
      setProducts(prodRes.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.type) { alert('Nama dan tipe wajib diisi'); return; }
    try {
      setSaving(true);
      const payload: any = {
        name: form.name, code: form.code || undefined, type: form.type,
        startDate: form.startDate, endDate: form.endDate, description: form.description,
      };
      if (form.type === 'PERCENTAGE' || form.type === 'FIXED') {
        payload.value = form.value;
        payload.minOrderAmount = form.minOrderAmount || undefined;
      } else if (form.type === 'BUY_X_GET_Y') {
        payload.buyQty = form.buyQty; payload.freeQty = form.freeQty;
        payload.freeProductName = form.freeProductName || undefined;
      } else if (form.type === 'BUNDLE') {
        payload.bundlePrice = form.bundlePrice;
        payload.bundleItems = []; // simplified
      } else if (form.type === 'MIN_QTY_DISCOUNT') {
        payload.minQty = form.minQty; payload.discountPerUnit = form.discountPerUnit;
      } else if (form.type === 'FREE_ITEM') {
        payload.freeItemThreshold = form.freeItemThreshold;
        payload.freeItemProductName = form.freeItemProductName;
      }
      if (form.maxUsage) payload.maxUsage = parseInt(form.maxUsage);

      await client.post('/distributor/promotions', payload);
      setModal(false);
      fetchData();
    } catch (err: any) { alert(err.response?.data?.message || 'Gagal'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (id: string, currentActive: boolean) => {
    try {
      await client.put(`/distributor/promotions/${id}`, { isActive: !currentActive });
      fetchData();
    } catch (e: any) { alert('Gagal'); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus promosi ini?')) return;
    try { await client.delete(`/distributor/promotions/${id}`); fetchData(); }
    catch (e: any) { alert('Gagal'); }
  };

  const fmt = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-teal-600" /></div>;

  const promos = data?.promotions || [];
  const summary = data?.summary || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Promosi & Diskon</h1>
          <p className="text-slate-500 dark:text-slate-400">Kelola promosi untuk merchant dan marketplace</p>
        </div>
        <Button onClick={() => setModal(true)}><Plus className="w-4 h-4 mr-2" />Buat Promosi</Button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-slate-900 dark:text-white">{summary.total || 0}</p><p className="text-xs text-slate-500">Total</p></CardContent></Card>
        <Card className="border-l-4 border-l-green-500"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-600">{summary.active || 0}</p><p className="text-xs text-slate-500">Active</p></CardContent></Card>
        <Card className="border-l-4 border-l-blue-500"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-600">{summary.upcoming || 0}</p><p className="text-xs text-slate-500">Upcoming</p></CardContent></Card>
        <Card className="border-l-4 border-l-slate-400"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-slate-400">{summary.expired || 0}</p><p className="text-xs text-slate-500">Expired</p></CardContent></Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['all', 'active', 'upcoming', 'expired'].map(f => (
          <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      {/* Promo List */}
      {promos.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><Tag className="w-12 h-12 mx-auto text-slate-300 mb-3" /><p className="text-slate-500">Belum ada promosi</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {promos.map((promo: any) => {
            const typeInfo = PROMO_TYPES.find(t => t.value === promo.type) || PROMO_TYPES[0];
            const Icon = typeInfo.icon;
            return (
              <Card key={promo.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl ${typeInfo.color}`}><Icon className="w-5 h-5" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-900 dark:text-white truncate">{promo.name}</h4>
                        <Badge variant={promo.status === 'ACTIVE' ? 'success' : promo.status === 'UPCOMING' ? 'default' : 'warning'} className="text-[10px]">{promo.status}</Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{promo.description || typeInfo.label}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        {promo.code && <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">{promo.code}</span>}
                        <span className="text-[10px] text-slate-400 flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(promo.endDate).toLocaleDateString('id-ID')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleToggle(promo.id, promo.isActive !== false)}>
                        {promo.isActive !== false ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5 text-slate-400" />}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(promo.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={modal} onClose={() => setModal(false)} title="Buat Promosi Baru" className="max-w-2xl">
        <form onSubmit={handleCreate} className="space-y-4">
          {/* Type Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tipe Promosi</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PROMO_TYPES.map(t => (
                <label key={t.value} className={`p-3 rounded-lg border-2 cursor-pointer text-center transition-all ${form.type === t.value ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}>
                  <input type="radio" className="sr-only" value={t.value} checked={form.type === t.value} onChange={() => setForm({ ...form, type: t.value })} />
                  <t.icon className={`w-5 h-5 mx-auto mb-1 ${form.type === t.value ? 'text-teal-600' : 'text-slate-400'}`} />
                  <p className="text-xs font-medium">{t.label}</p>
                </label>
              ))}
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><label className="text-sm font-medium">Nama Promosi *</label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Promo Akhir Bulan" required /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Kode Promo</label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="DISKON10" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><label className="text-sm font-medium">Mulai</label><Input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} required /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Berakhir</label><Input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} required /></div>
          </div>

          {/* Type-specific fields */}
          {(form.type === 'PERCENTAGE' || form.type === 'FIXED') && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><label className="text-sm font-medium">{form.type === 'PERCENTAGE' ? 'Diskon (%)' : 'Potongan (Rp)'}</label><Input type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} placeholder={form.type === 'PERCENTAGE' ? '10' : '5000'} required /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Min Order (Rp)</label><Input type="number" value={form.minOrderAmount} onChange={e => setForm({ ...form, minOrderAmount: e.target.value })} placeholder="100000" /></div>
            </div>
          )}
          {form.type === 'BUY_X_GET_Y' && (
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2"><label className="text-sm font-medium">Beli (qty)</label><Input type="number" value={form.buyQty} onChange={e => setForm({ ...form, buyQty: e.target.value })} required /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Gratis (qty)</label><Input type="number" value={form.freeQty} onChange={e => setForm({ ...form, freeQty: e.target.value })} required /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Produk Gratis</label><Input value={form.freeProductName} onChange={e => setForm({ ...form, freeProductName: e.target.value })} placeholder="Same product" /></div>
            </div>
          )}
          {form.type === 'MIN_QTY_DISCOUNT' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><label className="text-sm font-medium">Min Qty</label><Input type="number" value={form.minQty} onChange={e => setForm({ ...form, minQty: e.target.value })} placeholder="10" required /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Diskon/Unit (Rp)</label><Input type="number" value={form.discountPerUnit} onChange={e => setForm({ ...form, discountPerUnit: e.target.value })} placeholder="500" required /></div>
            </div>
          )}
          {form.type === 'FREE_ITEM' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><label className="text-sm font-medium">Min Order (Rp)</label><Input type="number" value={form.freeItemThreshold} onChange={e => setForm({ ...form, freeItemThreshold: e.target.value })} placeholder="500000" required /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Produk Gratis</label><Input value={form.freeItemProductName} onChange={e => setForm({ ...form, freeItemProductName: e.target.value })} placeholder="Tote Bag" required /></div>
            </div>
          )}
          {form.type === 'BUNDLE' && (
            <div className="space-y-2"><label className="text-sm font-medium">Harga Bundle (Rp)</label><Input type="number" value={form.bundlePrice} onChange={e => setForm({ ...form, bundlePrice: e.target.value })} placeholder="150000" required /></div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><label className="text-sm font-medium">Max Penggunaan</label><Input type="number" value={form.maxUsage} onChange={e => setForm({ ...form, maxUsage: e.target.value })} placeholder="Unlimited" /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Deskripsi</label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Opsional" /></div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t"><Button type="button" variant="ghost" onClick={() => setModal(false)}>Batal</Button><Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Buat Promosi'}</Button></div>
        </form>
      </Modal>
    </div>
  );
}
