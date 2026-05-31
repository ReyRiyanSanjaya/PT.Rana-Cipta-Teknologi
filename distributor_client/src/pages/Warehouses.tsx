import React, { useEffect, useState } from 'react';
import client from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Warehouse, Plus, Edit, Trash2, MapPin, Package, Loader2, Star, Boxes } from 'lucide-react';

interface WarehouseData {
  id: string;
  name: string;
  address: string;
  isPrimary: boolean;
  createdAt: string;
}

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
  const [summary, setSummary] = useState({ totalWarehouses: 0, totalProducts: 0, totalStock: 0 });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<WarehouseData | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', isPrimary: false });

  useEffect(() => { fetchWarehouses(); }, []);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const res = await client.get('/distributor/warehouses');
      setWarehouses(res.data.data.warehouses);
      setSummary(res.data.data.summary);
    } catch (e) {
      console.error('Failed to fetch warehouses:', e);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', address: '', isPrimary: false });
    setIsModalOpen(true);
  };

  const openEdit = (wh: WarehouseData) => {
    setEditing(wh);
    setForm({ name: wh.name, address: wh.address, isPrimary: wh.isPrimary });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.address) return;
    try {
      setSaving(true);
      if (editing) {
        await client.put(`/distributor/warehouses/${editing.id}`, form);
      } else {
        await client.post('/distributor/warehouses', form);
      }
      setIsModalOpen(false);
      fetchWarehouses();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menyimpan gudang');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus gudang ini?')) return;
    try {
      await client.delete(`/distributor/warehouses/${id}`);
      fetchWarehouses();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menghapus gudang');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Gudang</h1>
          <p className="text-slate-500 dark:text-slate-400">Kelola gudang dan lokasi penyimpanan</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Tambah Gudang
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400">
              <Warehouse className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Gudang</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{summary.totalWarehouses}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Produk</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{summary.totalProducts}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Stok</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{summary.totalStock.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warehouse List */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {warehouses.map(wh => (
          <Card key={wh.id} className="hover:border-teal-200 dark:hover:border-teal-800 transition-colors">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
                    <Warehouse className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{wh.name}</h3>
                    {wh.isPrimary && <Badge variant="success" className="text-[10px] mt-0.5">Utama</Badge>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(wh)} className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600">
                    <Edit className="w-4 h-4" />
                  </button>
                  {!wh.isPrimary && (
                    <button onClick={() => handleDelete(wh.id)} className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-2 text-sm text-slate-500 dark:text-slate-400">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{wh.address}</span>
              </div>
              <p className="text-xs text-slate-400 mt-3">
                Dibuat {new Date(wh.createdAt).toLocaleDateString('id-ID')}
              </p>
            </CardContent>
          </Card>
        ))}
        {warehouses.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-400">
            <Warehouse className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Belum ada gudang. Tambahkan gudang pertama Anda.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? 'Edit Gudang' : 'Tambah Gudang'} className="max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nama Gudang</label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Gudang Utama" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Alamat</label>
            <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Jl. Contoh No. 123, Kota" required />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="isPrimary" checked={form.isPrimary} onChange={e => setForm({ ...form, isPrimary: e.target.checked })} className="rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
            <label htmlFor="isPrimary" className="text-sm">Jadikan gudang utama</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : editing ? 'Update' : 'Tambah'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
