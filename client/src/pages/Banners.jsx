import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Image as ImageIcon, Loader, Pencil, Plus, Trash2, XCircle } from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { createBanner, deleteBanner, fetchBannersAdmin, updateBanner, uploadBannerImage } from '../services/api';

const Banners = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [editingBannerId, setEditingBannerId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageUrl: '',
    isActive: true
  });

  const isEditing = useMemo(() => Boolean(editingBannerId), [editingBannerId]);

  const loadBanners = async () => {
    setLoading(true);
    try {
      const data = await fetchBannersAdmin();
      setBanners(data || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal memuat banner');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBanners();
  }, []);

  const openCreate = () => {
    setEditingBannerId(null);
    setFormData({
      title: '',
      description: '',
      imageUrl: '',
      isActive: true
    });
    setIsModalOpen(true);
  };

  const openEdit = (banner) => {
    setEditingBannerId(banner.id);
    setFormData({
      title: banner.title || '',
      description: banner.description || '',
      imageUrl: banner.imageUrl || '',
      isActive: Boolean(banner.isActive)
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    if (!formData.imageUrl.trim()) return;

    setSubmitting(true);
    try {
      if (isEditing) {
        await updateBanner(editingBannerId, formData);
      } else {
        await createBanner(formData);
      }
      setIsModalOpen(false);
      await loadBanners();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Gagal menyimpan banner');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (bannerId) => {
    if (!window.confirm('Hapus banner ini?')) return;
    try {
      await deleteBanner(bannerId);
      await loadBanners();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Gagal menghapus banner');
    }
  };

  const handleToggleActive = async (banner) => {
    try {
      await updateBanner(banner.id, { isActive: !banner.isActive });
      setBanners((prev) => prev.map((b) => (b.id === banner.id ? { ...b, isActive: !b.isActive } : b)));
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Gagal memperbarui banner');
    }
  };

  const handlePickFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const data = await uploadBannerImage(file);
      setFormData((prev) => ({ ...prev, imageUrl: data?.imageUrl || '' }));
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Gagal mengunggah gambar');
    } finally {
      setUploading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto overflow-x-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">
              Banner / Iklan
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Kelola carousel iklan untuk aplikasi merchant</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            <Plus size={20} />
            <span>Tambah Banner</span>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader className="animate-spin text-indigo-600" size={32} />
          </div>
        ) : banners.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
            <ImageIcon className="mx-auto text-slate-300 mb-3" size={48} />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">Belum ada banner</h3>
            <p className="text-slate-500">Tambahkan banner untuk tampil di home merchant.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {banners.map((banner) => (
              <div key={banner.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <div className="relative h-40 bg-slate-100 dark:bg-slate-800">
                  {banner.imageUrl ? (
                    <img src={banner.imageUrl} alt={banner.title || 'Banner'} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-400">
                      <ImageIcon size={36} />
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${banner.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'}`}>
                      {banner.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3 flex gap-2">
                    <button
                      onClick={() => openEdit(banner)}
                      className="p-2 bg-white/80 hover:bg-white text-slate-700 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(banner.id)}
                      className="p-2 bg-white/80 hover:bg-white text-red-600 rounded-lg transition-colors"
                      title="Hapus"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-1">{banner.title}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{banner.description || '-'}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => handleToggleActive(banner)}
                      className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${banner.isActive ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                    >
                      {banner.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                    <span className="text-xs text-slate-400 font-mono">
                      {banner.id?.slice(0, 8)}...
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-900 z-10">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {isEditing ? 'Edit Banner' : 'Tambah Banner'}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <XCircle size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Judul</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    value={formData.title}
                    onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Deskripsi</label>
                  <textarea
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all min-h-[92px]"
                    value={formData.description}
                    onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">URL Gambar</label>
                    <input
                      type="url"
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      value={formData.imageUrl}
                      onChange={(e) => setFormData((p) => ({ ...p, imageUrl: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Unggah</label>
                    <input
                      type="file"
                      accept="image/*"
                      className="w-full text-sm"
                      onChange={(e) => handlePickFile(e.target.files?.[0])}
                      disabled={uploading}
                    />
                  </div>
                </div>

                {formData.imageUrl && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-800">
                    <img src={formData.imageUrl} alt="Preview" className="h-40 w-full object-cover" />
                  </div>
                )}

                <label className="flex items-center gap-2 select-none">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData((p) => ({ ...p, isActive: e.target.checked }))}
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Aktifkan banner</span>
                </label>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    disabled={submitting}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors disabled:opacity-70 inline-flex items-center gap-2"
                    disabled={submitting || uploading}
                  >
                    {submitting ? <Loader className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                    <span>Simpan</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Banners;
