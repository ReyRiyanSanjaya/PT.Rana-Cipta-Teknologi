import React, { useEffect, useState, useCallback } from 'react';
import api from '../api';
import { Image, Plus, Trash2, Edit2, ToggleLeft, ToggleRight, Upload, GripVertical, CheckCircle, XCircle } from 'lucide-react';

const ACTION_TYPES = [
  { value: 'NONE', label: 'Tidak Ada Aksi' },
  { value: 'URL', label: 'Buka URL' },
  { value: 'FLASHSALE', label: 'Flash Sale' },
  { value: 'PROMO', label: 'Promo Hub' },
  { value: 'SUPPORT', label: 'Support' },
];

const emptyForm = {
  title: '',
  imageUrl: '',
  actionType: 'NONE',
  actionTarget: '',
  isActive: true,
  order: 0,
};

export default function BannerManagement() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchBanners = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/wholesale/banners/admin');
      setBanners(res.data?.data || []);
    } catch (e) {
      setError('Gagal memuat banner');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBanners(); }, [fetchBanners]);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setError('');
    setShowModal(true);
  };

  const openEdit = (banner) => {
    setEditId(banner.id);
    setForm({
      title: banner.title || '',
      imageUrl: banner.imageUrl || '',
      actionType: banner.actionType || 'NONE',
      actionTarget: banner.actionTarget || '',
      isActive: banner.isActive !== false,
      order: banner.order ?? 0,
    });
    setError('');
    setShowModal(true);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/wholesale/banners/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data?.data?.imageUrl || '';
      if (url) setForm(f => ({ ...f, imageUrl: url }));
    } catch (e) {
      setError('Gagal upload gambar');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) return setError('Judul banner wajib diisi');
    if (!form.imageUrl.trim()) return setError('Gambar banner wajib diupload atau isi URL');
    setSaving(true);
    setError('');
    try {
      if (editId) {
        await api.put(`/wholesale/banners/${editId}`, form);
      } else {
        await api.post('/wholesale/banners', form);
      }
      setSuccess(editId ? 'Banner berhasil diperbarui' : 'Banner berhasil dibuat');
      setShowModal(false);
      fetchBanners();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.response?.data?.message || 'Gagal menyimpan banner');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin hapus banner ini?')) return;
    try {
      await api.delete(`/wholesale/banners/${id}`);
      setSuccess('Banner dihapus');
      fetchBanners();
      setTimeout(() => setSuccess(''), 2000);
    } catch {
      setError('Gagal menghapus banner');
    }
  };

  const handleToggle = async (banner) => {
    try {
      await api.put(`/wholesale/banners/${banner.id}`, { ...banner, isActive: !banner.isActive });
      fetchBanners();
    } catch {
      setError('Gagal mengubah status');
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Image className="text-primary-500" size={24} />
            Manajemen Banner / Slider
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola banner yang tampil di slider aplikasi mobile merchant
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow transition"
        >
          <Plus size={16} /> Tambah Banner
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 mb-4 text-sm">
          <CheckCircle size={16} /> {success}
        </div>
      )}
      {error && !showModal && (
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 mb-4 text-sm">
          <XCircle size={16} /> {error}
        </div>
      )}

      {/* Banner List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : banners.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Image size={48} className="mb-3 opacity-30" />
          <p className="text-sm font-medium">Belum ada banner</p>
          <p className="text-xs mt-1">Klik "Tambah Banner" untuk membuat slider baru</p>
        </div>
      ) : (
        <div className="space-y-3">
          {banners.map((banner) => (
            <div
              key={banner.id}
              className="flex items-center gap-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition"
            >
              <GripVertical size={18} className="text-slate-300 cursor-grab shrink-0" />
              {/* Preview */}
              <div className="w-24 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                {banner.imageUrl ? (
                  <img
                    src={banner.imageUrl}
                    alt={banner.title}
                    className="w-full h-full object-cover"
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Image size={20} className="text-slate-300" />
                  </div>
                )}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-800 truncate">{banner.title}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${banner.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {banner.isActive ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Aksi: {ACTION_TYPES.find(a => a.value === (banner.actionType || 'NONE'))?.label}
                  {banner.actionTarget && ` → ${banner.actionTarget}`}
                  {' · '} Urutan: {banner.order ?? 0}
                </p>
              </div>
              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleToggle(banner)}
                  className="p-2 rounded-xl hover:bg-slate-100 transition text-slate-400 hover:text-primary-500"
                  title={banner.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                >
                  {banner.isActive ? <ToggleRight size={20} className="text-emerald-500" /> : <ToggleLeft size={20} />}
                </button>
                <button
                  onClick={() => openEdit(banner)}
                  className="p-2 rounded-xl hover:bg-slate-100 transition text-slate-400 hover:text-primary-500"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(banner.id)}
                  className="p-2 rounded-xl hover:bg-rose-50 transition text-slate-300 hover:text-rose-500"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">{editId ? 'Edit Banner' : 'Tambah Banner Baru'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700 text-xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              {error && (
                <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-3 py-2 text-sm">
                  <XCircle size={14} /> {error}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Judul Banner *</label>
                <input
                  type="text"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                  placeholder="Contoh: Promo Ramadan"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>

              {/* Image */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Gambar Banner *</label>
                {form.imageUrl && (
                  <div className="mb-2 rounded-xl overflow-hidden h-32 bg-slate-100">
                    <img src={form.imageUrl} alt="preview" className="w-full h-full object-cover" onError={e => e.target.style.display='none'} />
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                    placeholder="URL gambar atau upload di kanan"
                    value={form.imageUrl}
                    onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                  />
                  <label className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-sm font-medium cursor-pointer transition">
                    <Upload size={14} />
                    {uploading ? 'Upload...' : 'Upload'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
                  </label>
                </div>
              </div>

              {/* Action Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tipe Aksi saat Diklik</label>
                <select
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                  value={form.actionType}
                  onChange={e => setForm(f => ({ ...f, actionType: e.target.value }))}
                >
                  {ACTION_TYPES.map(a => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </div>

              {/* Action Target */}
              {form.actionType === 'URL' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Target URL</label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                    placeholder="https://..."
                    value={form.actionTarget}
                    onChange={e => setForm(f => ({ ...f, actionTarget: e.target.value }))}
                  />
                </div>
              )}

              {/* Order & Active */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Urutan Tampil</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                    value={form.order}
                    onChange={e => setForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div className="flex items-end pb-0.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <span className="text-xs font-semibold text-slate-600">Aktif</span>
                    <div
                      onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                      className={`relative w-10 h-5 rounded-full transition-colors ${form.isActive ? 'bg-emerald-400' : 'bg-slate-200'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving || uploading}
                className="px-5 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold shadow transition disabled:opacity-60"
              >
                {saving ? 'Menyimpan...' : editId ? 'Simpan Perubahan' : 'Buat Banner'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
