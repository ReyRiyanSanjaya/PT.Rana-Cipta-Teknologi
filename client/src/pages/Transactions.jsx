import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '../components/layout/DashboardLayout';
import { initTransactionsStream, subscribeTransactions } from '../services/transactionsStream';
import { Search, Eye, X, Receipt, Calendar, User, CreditCard, ShoppingBag } from 'lucide-react';

const Badge = ({ connected }) => (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
        connected 
        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' 
        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
    }`}>
        <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
        {connected ? 'Update Langsung' : 'Offline'}
    </div>
);

const formatCurrency = (val) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);

const formatDateTime = (iso) => {
    try {
        return new Date(iso).toLocaleString('id-ID', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    } catch { return '-'; }
};

const Transactions = () => {
    const [state, setState] = useState({ connected: false, list: [], recentEventAt: null });
    const [updating, setUpdating] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const lastEventRef = useRef(null);

    useEffect(() => {
        initTransactionsStream();
        const unsub = subscribeTransactions((s) => {
            setState(s);
            if (s.recentEventAt && s.recentEventAt !== lastEventRef.current) {
                lastEventRef.current = s.recentEventAt;
                setUpdating(true);
                setTimeout(() => setUpdating(false), 1500);
            }
        });
        return () => unsub();
    }, []);

    const filteredList = state.list.filter(t => 
        (t.id && t.id.toString().includes(searchTerm)) ||
        (t.cashierName && t.cashierName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.paymentMethod && t.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <DashboardLayout>
            <div className="space-y-8 pb-20">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Riwayat Transaksi</h2>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                            <Receipt size={16} />
                            <span>Riwayat penjualan dan detail real-time</span>
                        </p>
                    </div>
                    <Badge connected={state.connected} />
                </div>

                {/* Search & Stats */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center sticky top-0 z-10 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md py-4 -my-4 px-1">
                    <div className="relative w-full md:w-96 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Cari ID, Kasir, atau Metode..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm"
                        />
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 font-medium bg-white dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        Total Transaksi: <span className="text-slate-900 dark:text-white font-bold">{filteredList.length}</span>
                    </div>
                </div>

                {/* Table */}
                <motion.div 
                    layout
                    className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden"
                >
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    <th className="px-6 py-4">Waktu</th>
                                    <th className="px-6 py-4">ID Transaksi</th>
                                    <th className="px-6 py-4">Kasir</th>
                                    <th className="px-6 py-4">Metode</th>
                                    <th className="px-6 py-4 text-right">Total</th>
                                    <th className="px-6 py-4 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                <AnimatePresence initial={false}>
                                    {filteredList.map((t, i) => (
                                        <motion.tr
                                            key={(t.id || t.offlineId || i) + '-' + i}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className={`group hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${updating && i === 0 ? 'bg-emerald-50/30 dark:bg-emerald-900/10' : ''}`}
                                        >
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-sm whitespace-nowrap">
                                                {formatDateTime(t.createdAt || t.occurredAt)}
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs text-slate-400 dark:text-slate-500">
                                                #{t.id?.toString().slice(-6) || '---'}
                                            </td>
                                            <td className="px-6 py-4 text-slate-800 dark:text-slate-200 font-medium">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">
                                                        {(t.cashierName?.[0] || 'U').toUpperCase()}
                                                    </div>
                                                    {t.cashierName || 'Tidak Diketahui'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${
                                                    (t.paymentMethod === 'QRIS' || t.paymentMethod === 'TRANSFER')
                                                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                                    : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                                }`}>
                                                    {t.paymentMethod || 'TUNAI'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white">
                                                {formatCurrency(t.totalAmount)}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => setSelectedTransaction(t)}
                                                    className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                                    title="Lihat Detail"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                                {filteredList.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="p-12 text-center text-slate-500 dark:text-slate-400">
                                            <div className="flex flex-col items-center gap-3">
                                                <Receipt size={48} className="text-slate-200 dark:text-slate-700" />
                                                <p>Tidak ada transaksi yang cocok dengan "{searchTerm}"</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>

                {/* Detail Modal */}
                <AnimatePresence>
                    {selectedTransaction && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100 dark:border-slate-800"
                            >
                                {/* Modal Header */}
                                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Detail Transaksi</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 font-mono mt-1">ID: {selectedTransaction.id || selectedTransaction.offlineId}</p>
                                    </div>
                                    <button 
                                        onClick={() => setSelectedTransaction(null)}
                                        className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                {/* Modal Body */}
                                <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                                    {/* Info Grid */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                                                <Calendar size={12} /> Tanggal & Waktu
                                            </div>
                                            <div className="text-slate-700 dark:text-slate-300 font-medium text-sm">
                                                {formatDateTime(selectedTransaction.createdAt || selectedTransaction.occurredAt)}
                                            </div>
                                        </div>
                                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                                                <User size={12} /> Kasir
                                            </div>
                                            <div className="text-slate-700 dark:text-slate-300 font-medium text-sm">
                                                {selectedTransaction.cashierName || 'Tidak Diketahui'}
                                            </div>
                                        </div>
                                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                                                <CreditCard size={12} /> Metode Pembayaran
                                            </div>
                                            <div className="text-slate-700 dark:text-slate-300 font-medium text-sm">
                                                {selectedTransaction.paymentMethod || 'TUNAI'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Items List */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <ShoppingBag size={16} className="text-indigo-500 dark:text-indigo-400" />
                                            <h4 className="font-bold text-slate-900 dark:text-white">Item Dibeli</h4>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                                                    <tr>
                                                        <th className="px-4 py-2">Item</th>
                                                        <th className="px-4 py-2 text-center">Jml</th>
                                                        <th className="px-4 py-2 text-right">Harga</th>
                                                        <th className="px-4 py-2 text-right">Subtotal</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                                    {selectedTransaction.items && selectedTransaction.items.length > 0 ? (
                                                        selectedTransaction.items.map((item, idx) => (
                                                            <tr key={idx}>
                                                                <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">{item.product?.name || item.productName || item.name || 'Unknown Item'}</td>
                                                                <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">x{item.quantity}</td>
                                                                <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{formatCurrency(item.price)}</td>
                                                                <td className="px-4 py-3 text-right font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(item.price * item.quantity)}</td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan="4" className="px-4 py-8 text-center text-slate-400 dark:text-slate-500 italic">
                                                                Detail item tidak tersedia
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Summary */}
                                    <div className="space-y-2 pt-4 border-t border-dashed border-slate-200 dark:border-slate-700">
                                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                            <span>Subtotal</span>
                                            <span>{formatCurrency((selectedTransaction.totalAmount / 1.11))}</span>
                                        </div>
                                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                            <span>Pajak (11%)</span>
                                            <span>{formatCurrency(selectedTransaction.totalAmount - (selectedTransaction.totalAmount / 1.11))}</span>
                                        </div>
                                        <div className="flex justify-between items-end pt-2">
                                            <span className="font-bold text-slate-900 dark:text-white text-lg">Total Bayar</span>
                                            <span className="font-extrabold text-2xl text-indigo-600 dark:text-indigo-400 tracking-tight">{formatCurrency(selectedTransaction.totalAmount)}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Modal Footer */}
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 text-center">
                                    <button 
                                        onClick={() => window.print()} 
                                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm font-bold flex items-center justify-center gap-2 w-full"
                                    >
                                        <Receipt size={16} /> Cetak Struk
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </DashboardLayout>
    );
};

export default Transactions;