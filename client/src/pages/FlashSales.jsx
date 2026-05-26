import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import api from '../services/api';
import { 
    Plus, Trash2, Calendar, Clock, ChevronLeft, Search, 
    Edit2, MoreVertical, X, Check, AlertCircle, Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Helper Components ---

const Badge = ({ children, color }) => {
    const colors = {
        emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
        amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
        slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        rose: 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/20',
        indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20',
    };
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[color] || colors.slate}`}>
            {children}
        </span>
    );
};

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 max-h-[80vh] overflow-y-auto">
                    {children}
                </div>
            </motion.div>
        </div>
    );
};

const FlashSales = () => {
    const [view, setView] = useState('list'); // 'list' | 'detail'
    const [loading, setLoading] = useState(false);
    const [sales, setSales] = useState([]);
    const [products, setProducts] = useState([]);
    const [selectedSale, setSelectedSale] = useState(null);

    // Modals state
    const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    
    // Form state
    const [saleForm, setSaleForm] = useState({ id: null, title: '', startAt: '', endAt: '' });
    const [itemForm, setItemForm] = useState({ id: null, productId: '', salePrice: '', maxQtyPerOrder: '', saleStock: '' });
    const [submitting, setSubmitting] = useState(false);

    // Initial Load
    useEffect(() => {
        fetchSales();
        fetchProducts();
    }, []);

    const fetchSales = async () => {
        setLoading(true);
        try {
            const res = await api.get('/products/flashsales');
            setSales(res.data.data || []);
            // Update selected sale if in detail view
            if (selectedSale) {
                const updated = (res.data.data || []).find(s => s.id === selectedSale.id);
                if (updated) setSelectedSale(updated);
            }
        } catch (error) {
            console.error("Failed to fetch sales", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProducts = async () => {
        try {
            const res = await api.get('/products');
            setProducts(res.data.data || []);
        } catch (error) {
            console.error("Failed to fetch products", error);
        }
    };

    // --- Actions ---

    const handleCreateSale = () => {
        setSaleForm({ id: null, title: '', startAt: '', endAt: '' });
        setIsSaleModalOpen(true);
    };

    const handleEditSale = (sale) => {
        // Adjust to local time for input[type="datetime-local"]
        const toLocalISO = (dateStr) => {
            const date = new Date(dateStr);
            const offset = date.getTimezoneOffset() * 60000;
            const localDate = new Date(date.getTime() - offset);
            return localDate.toISOString().slice(0, 16);
        };

        setSaleForm({
            id: sale.id,
            title: sale.title,
            startAt: toLocalISO(sale.startAt),
            endAt: toLocalISO(sale.endAt)
        });
        setIsSaleModalOpen(true);
    };

    const handleSaveSale = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (saleForm.id) {
                await api.put(`/products/flashsales/${saleForm.id}`, saleForm);
            } else {
                await api.post('/products/flashsales', saleForm);
            }
            await fetchSales();
            setIsSaleModalOpen(false);
        } catch (error) {
            alert('Gagal menyimpan flash sale');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteSale = async (id) => {
        if (!window.confirm('Hapus flash sale ini?')) return;
        try {
            await api.delete(`/products/flashsales/${id}`);
            if (selectedSale?.id === id) {
                setView('list');
                setSelectedSale(null);
            }
            fetchSales();
        } catch (error) {
            alert('Gagal menghapus flash sale. Pastikan status tidak ACTIVE.');
        }
    };

    const handleCancelSale = async (id) => {
        if (!window.confirm('Batalkan flash sale yang sedang berjalan ini?')) return;
        try {
            await api.put(`/products/flashsales/${id}/status`, { action: 'CANCEL' });
            fetchSales();
        } catch (error) {
            alert('Gagal membatalkan flash sale');
        }
    };

    // --- Item Actions ---

    const handleAddItem = () => {
        setItemForm({ id: null, productId: '', salePrice: '', maxQtyPerOrder: '', saleStock: '' });
        setIsItemModalOpen(true);
    };

    const handleEditItem = (item) => {
        setItemForm({
            id: item.id,
            productId: item.productId,
            salePrice: item.salePrice,
            maxQtyPerOrder: item.maxQtyPerOrder || '',
            saleStock: item.saleStock || ''
        });
        setIsItemModalOpen(true);
    };

    const handleSaveItem = async (e) => {
        e.preventDefault();
        if (!selectedSale) return;
        setSubmitting(true);
        try {
            const payload = {
                productId: itemForm.productId,
                salePrice: parseFloat(itemForm.salePrice),
                maxQtyPerOrder: parseInt(itemForm.maxQtyPerOrder || 0),
                saleStock: itemForm.saleStock ? parseInt(itemForm.saleStock) : null
            };

            if (itemForm.id) {
                await api.put(`/products/flashsales/${selectedSale.id}/items/${itemForm.id}`, payload);
            } else {
                await api.post(`/products/flashsales/${selectedSale.id}/items`, payload);
            }
            await fetchSales();
            setIsItemModalOpen(false);
        } catch (error) {
            alert('Gagal menyimpan item');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteItem = async (itemId) => {
        if (!confirm('Hapus item ini dari flash sale?')) return;
        try {
            await api.delete(`/products/flashsales/${selectedSale.id}/items/${itemId}`);
            fetchSales();
        } catch (error) {
            alert('Gagal menghapus item');
        }
    };

    // --- Render Helpers ---

    const getStatusBadge = (status) => {
        switch (status) {
            case 'ACTIVE': return <Badge color="emerald">Sedang Berjalan</Badge>;
            case 'PENDING': return <Badge color="amber">Menunggu</Badge>;
            case 'ENDED': return <Badge color="slate">Selesai</Badge>;
            case 'REJECTED': case 'CANCELLED': return <Badge color="rose">Dibatalkan</Badge>;
            default: return <Badge color="slate">{status}</Badge>;
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-6 min-h-[calc(100vh-8rem)]">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            {view === 'detail' && (
                                <button 
                                    onClick={() => setView('list')}
                                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <ChevronLeft size={24} className="text-slate-600 dark:text-slate-300" />
                                </button>
                            )}
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                                {view === 'detail' ? 'Detail Flash Sale' : 'Flash Sale'}
                            </h1>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            {view === 'detail' 
                                ? `Kelola item untuk flash sale "${selectedSale?.title}"`
                                : 'Atur jadwal promo kilat untuk meningkatkan penjualan'
                            }
                        </p>
                    </div>
                    {view === 'list' && (
                        <button 
                            onClick={handleCreateSale}
                            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                        >
                            <Plus size={18} />
                            Buat Flash Sale Baru
                        </button>
                    )}
                </div>

                {/* Content */}
                {loading && !sales.length ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : view === 'list' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sales.map(sale => (
                            <motion.div 
                                layoutId={sale.id}
                                key={sale.id} 
                                onClick={() => {
                                    setSelectedSale(sale);
                                    setView('detail');
                                }}
                                className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 hover:shadow-xl hover:border-indigo-500/30 dark:hover:border-indigo-500/30 transition-all cursor-pointer relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 p-2 rounded-lg">
                                        <Edit2 size={16} />
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <div className="flex items-start justify-between mb-2">
                                        {getStatusBadge(sale.status)}
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1">{sale.title}</h3>
                                </div>

                                <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400 mb-6">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={14} />
                                        <span>
                                            {new Date(sale.startAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - {new Date(sale.endAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock size={14} />
                                        <span>
                                            {new Date(sale.startAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} - {new Date(sale.endAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Package size={14} />
                                        <span>{(sale.items || []).length} Produk</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                        {sales.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-full mb-4">
                                    <Calendar size={32} className="text-slate-400" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Belum ada Flash Sale</h3>
                                <p className="text-slate-500 dark:text-slate-400 max-w-sm">
                                    Buat promo flash sale pertama Anda untuk menarik lebih banyak pelanggan.
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    // Detail View
                    <div className="space-y-6">
                        {/* Detail Header Card */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedSale.title}</h2>
                                        {getStatusBadge(selectedSale.status)}
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                                        <span className="flex items-center gap-1.5">
                                            <Calendar size={14} />
                                            {new Date(selectedSale.startAt).toLocaleString('id-ID')}
                                        </span>
                                        <span>→</span>
                                        <span className="flex items-center gap-1.5">
                                            <Clock size={14} />
                                            {new Date(selectedSale.endAt).toLocaleString('id-ID')}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {selectedSale.status !== 'ACTIVE' && selectedSale.status !== 'ENDED' && selectedSale.status !== 'CANCELLED' && (
                                        <>
                                            <button 
                                                onClick={() => handleEditSale(selectedSale)}
                                                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                            >
                                                Edit Detail
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteSale(selectedSale.id)}
                                                className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                                            >
                                                Hapus
                                            </button>
                                        </>
                                    )}
                                    {selectedSale.status === 'ACTIVE' && (
                                        <button 
                                            onClick={() => handleCancelSale(selectedSale.id)}
                                            className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                                        >
                                            Batalkan Promo
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Items Section */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Daftar Produk</h3>
                                {selectedSale.status !== 'ENDED' && selectedSale.status !== 'CANCELLED' && (
                                    <button 
                                        onClick={handleAddItem}
                                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                                    >
                                        <Plus size={16} />
                                        Tambah Produk
                                    </button>
                                )}
                            </div>
                            
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold">
                                        <tr>
                                            <th className="px-6 py-4">Produk</th>
                                            <th className="px-6 py-4">Harga Normal</th>
                                            <th className="px-6 py-4">Harga Flash Sale</th>
                                            <th className="px-6 py-4">Kuota Stok</th>
                                            <th className="px-6 py-4">Maks/User</th>
                                            <th className="px-6 py-4 text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {(selectedSale.items || []).length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                                                    Belum ada produk dalam flash sale ini
                                                </td>
                                            </tr>
                                        ) : (
                                            selectedSale.items.map((item) => (
                                                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="font-medium text-slate-900 dark:text-white">
                                                            {item.product?.name || 'Produk dihapus'}
                                                        </div>
                                                        <div className="text-xs text-slate-500">{item.productId}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 line-through decoration-slate-400">
                                                        Rp {item.product?.sellingPrice?.toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                                            Rp {item.salePrice?.toLocaleString()}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                                                        {item.saleStock ?? '∞'}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                                                        {item.maxQtyPerOrder || 'Tanpa Batas'}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button 
                                                                onClick={() => handleEditItem(item)}
                                                                className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeleteItem(item.id)}
                                                                className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- Modals --- */}

                {/* Create/Edit Sale Modal */}
                <Modal 
                    isOpen={isSaleModalOpen} 
                    onClose={() => setIsSaleModalOpen(false)} 
                    title={saleForm.id ? 'Edit Flash Sale' : 'Buat Flash Sale Baru'}
                >
                    <form onSubmit={handleSaveSale} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Judul Promo</label>
                            <input
                                required
                                type="text"
                                placeholder="Contoh: Flash Sale 12.12"
                                value={saleForm.title}
                                onChange={e => setSaleForm({ ...saleForm, title: e.target.value })}
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Mulai</label>
                                <input
                                    required
                                    type="datetime-local"
                                    value={saleForm.startAt}
                                    onChange={e => setSaleForm({ ...saleForm, startAt: e.target.value })}
                                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Selesai</label>
                                <input
                                    required
                                    type="datetime-local"
                                    value={saleForm.endAt}
                                    onChange={e => setSaleForm({ ...saleForm, endAt: e.target.value })}
                                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                />
                            </div>
                        </div>
                        <div className="pt-4 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setIsSaleModalOpen(false)}
                                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                                {submitting ? 'Menyimpan...' : 'Simpan'}
                            </button>
                        </div>
                    </form>
                </Modal>

                {/* Add/Edit Item Modal */}
                <Modal 
                    isOpen={isItemModalOpen} 
                    onClose={() => setIsItemModalOpen(false)} 
                    title={itemForm.id ? 'Edit Produk Flash Sale' : 'Tambah Produk Flash Sale'}
                >
                    <form onSubmit={handleSaveItem} className="space-y-4">
                        {!itemForm.id && (
                            <div>
                                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Pilih Produk</label>
                                <select
                                    required
                                    value={itemForm.productId}
                                    onChange={e => {
                                        const prod = products.find(p => p.id === e.target.value);
                                        setItemForm({ 
                                            ...itemForm, 
                                            productId: e.target.value,
                                            salePrice: prod ? prod.sellingPrice : '' // Default to current price
                                        });
                                    }}
                                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                >
                                    <option value="">-- Pilih Produk --</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} (Rp {p.sellingPrice.toLocaleString()})</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        
                        <div>
                            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Harga Flash Sale</label>
                            <div className="relative">
                                <span className="absolute left-4 top-2.5 text-slate-400">Rp</span>
                                <input
                                    required
                                    type="number"
                                    min="0"
                                    value={itemForm.salePrice}
                                    onChange={e => setItemForm({ ...itemForm, salePrice: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Pastikan harga lebih rendah dari harga normal.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Stok Promo</label>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="Tak Terbatas"
                                    value={itemForm.saleStock}
                                    onChange={e => setItemForm({ ...itemForm, saleStock: e.target.value })}
                                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                />
                                <p className="text-[10px] text-slate-400 mt-1">Kosongkan jika stok mengikuti inventaris utama.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Maks Beli / User</label>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="Tak Terbatas"
                                    value={itemForm.maxQtyPerOrder}
                                    onChange={e => setItemForm({ ...itemForm, maxQtyPerOrder: e.target.value })}
                                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setIsItemModalOpen(false)}
                                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                                {submitting ? 'Menyimpan...' : 'Simpan'}
                            </button>
                        </div>
                    </form>
                </Modal>

            </div>
        </DashboardLayout>
    );
};

export default FlashSales;
