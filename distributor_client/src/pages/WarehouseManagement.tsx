import React, { useEffect, useState } from 'react';
import client from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Warehouse, Plus, Edit2, Trash2, MapPin, Package, Loader2, Star, AlertCircle } from 'lucide-react';

interface WarehouseData {
  id: string;
  name: string;
  address: string;
  isPrimary: boolean;
  productCount: number;
  totalStock: number;
  createdAt: string;
}

export default function WarehouseManagement() {
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
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
      setWarehouses(res.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
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
      alert(err.response?.data?.message || 'Gagal menyimpan');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus gudang ini?')) return;
    try {
      await client.delete(`/distributor/warehouses/${id}`);
      fetchWarehouses();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menghapus');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Manajemen Gudang</h1>
          <p className="text-slate-500 dark:text-slate-400">Kelola lokasi gudang dan distribusi stok</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Tambah Gudang
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400">
              <Warehouse className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Gudang</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{warehouses.length}</p>
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
              <p className="text-xl font-bold text-slate-900 dark:text-white">{warehouses.reduce((s, w) => s + w.productCount, 0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Stok</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{warehouses.reduce((s, w) => s + w.totalStock, 0).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warehouse List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-teal-600" /></div>
      ) : warehouses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Warehouse className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">Belum ada gudang. Tambahkan gudang pertama Anda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {warehouses.map(wh => (
            <Card key={wh.id} className={`relative ${wh.isPrimary ? 'border-teal-200 dark:border-teal-800 ring-1 ring-teal-100 dark:ring-teal-900/30' : ''}`}>
              <CardContent className="p-5">
                {wh.isPrimary && (
                  <div className="absolute top-3 right-3">
                    <Badge variant="success" className="text-[10px] flex items-center gap-1"><Star className="w-3 h-3" /> Utama</Badge>
                  </div>
                )}
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    <Warehouse className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{wh.name}</h3>
                    <div className="flex items-center gap-1.5 mt-1 text-sm text-slate-500">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{wh.address}</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-center">
                    <p className="text-lg font-bold text-slate-900 dark:text-white">{wh.productCount}</p>
                    <p className="text-[10px] text-slate-500">Produk</p>
                  </div>
                  <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-center">
                    <p className="text-lg font-bold text-slate-900 dark:text-white">{wh.totalStock.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-500">Total Stok</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(wh)}>
                    <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                  </Button>
                  {!wh.isPrimary && (
                    <Button variant="outline" size="sm" onClick={() => handleDelete(wh.id)} className="text-red-500 border-red-200 hover:bg-red-50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : editing ? 'Update' : 'Tambah'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
