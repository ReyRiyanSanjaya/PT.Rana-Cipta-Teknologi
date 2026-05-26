import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { fetchWalletData, requestWalletTopUp, transferWallet, requestWithdrawal } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRightLeft, ArrowUpRight, ArrowDownRight, Banknote, Clock, RefreshCw, AlertCircle, X, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Wallet = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('history');
    const [submitting, setSubmitting] = useState(false);

    const [topupAmount, setTopupAmount] = useState('');
    const [topupProof, setTopupProof] = useState('');

    const [transferTarget, setTransferTarget] = useState('');
    const [transferAmount, setTransferAmount] = useState('');
    const [transferNote, setTransferNote] = useState('');

    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawBank, setWithdrawBank] = useState('');
    const [withdrawAccount, setWithdrawAccount] = useState('');
    const navigate = useNavigate();

    const formatCurrency = (val) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchWalletData();
            setData(res);
        } catch (e) {
            setError('Gagal memuat data dompet. Silakan coba lagi.');
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                setError('Ukuran file maksimal 2MB.');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setTopupProof(reader.result);
                setError(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleTopUpSubmit = async (e) => {
        e.preventDefault();
        if (!topupAmount || !topupProof) {
            setError('Nominal dan bukti transfer wajib diisi.');
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            await requestWalletTopUp({
                amount: topupAmount,
                proofImage: topupProof
            });
            setTopupAmount('');
            setTopupProof('');
            await loadData();
        } catch (err) {
            setError(err?.response?.data?.message || 'Gagal mengajukan top up.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleTransferSubmit = async (e) => {
        e.preventDefault();
        if (!transferTarget || !transferAmount) {
            setError('Tujuan dan nominal transfer wajib diisi.');
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            await transferWallet({
                targetStoreId: transferTarget,
                amount: transferAmount,
                note: transferNote
            });
            setTransferTarget('');
            setTransferAmount('');
            setTransferNote('');
            await loadData();
        } catch (err) {
            setError(err?.response?.data?.message || 'Gagal melakukan transfer.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleWithdrawSubmit = async (e) => {
        e.preventDefault();
        if (!withdrawAmount || !withdrawBank || !withdrawAccount) {
            setError('Nominal, bank, dan nomor rekening wajib diisi.');
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            await requestWithdrawal({
                amount: withdrawAmount,
                bankName: withdrawBank,
                accountNumber: withdrawAccount
            });
            setWithdrawAmount('');
            setWithdrawBank('');
            setWithdrawAccount('');
            await loadData();
        } catch (err) {
            setError(err?.response?.data?.message || 'Gagal mengajukan penarikan.');
        } finally {
            setSubmitting(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const history = data?.history || [];
    const pendingWithdrawals = data?.pendingWithdrawals || [];
    const pendingTopUps = data?.pendingTopUps || [];

    const renderHistoryItem = (item) => {
        const isOut = item.type === 'CASH_OUT';
        const sign = isOut ? '-' : '+';
        const iconColor = isOut ? 'text-rose-400 bg-rose-500/10' : 'text-emerald-400 bg-emerald-500/10';
        const Icon = isOut ? ArrowUpRight : ArrowDownRight;

        return (
            <div key={item.id} className="flex items-start justify-between py-3 border-b border-slate-800/60 last:border-0">
                <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${iconColor}`}>
                        <Icon size={16} />
                    </div>
                    <div>
                        <div className="text-sm font-semibold text-slate-100">{item.category}</div>
                        <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{item.description || '-'}</div>
                        <div className="text-[10px] text-slate-600 mt-1 flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(item.occurredAt).toLocaleString('id-ID')}
                        </div>
                    </div>
                </div>
                <div className={`text-sm font-bold ${isOut ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {sign} {formatCurrency(item.amount)}
                </div>
            </div>
        );
    };

    return (
        <DashboardLayout>
            <div className="max-w-3xl mx-auto space-y-6 pb-10">
                <div className="flex items-center justify-between gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-slate-200 hover:bg-slate-700 transition-colors"
                    >
                        <ArrowLeft size={14} />
                        Kembali
                    </button>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Dompet Terkoneksi
                    </div>
                </div>

                <div className="bg-[#020617] border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl shadow-indigo-900/20 relative overflow-hidden">
                    <div className="absolute -right-16 -top-16 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl" />
                    <div className="flex items-center justify-between mb-6 relative z-10">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-300 border border-indigo-500/40">
                                    <Banknote size={18} />
                                </div>
                                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                    Saldo Dompet Toko
                                </div>
                            </div>
                            <div className="text-3xl md:text-4xl font-black text-slate-50 tracking-tight">
                                {formatCurrency(data?.balance || 0)}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                                Saldo ini digunakan untuk PPOB, transfer antar toko, dan penarikan.
                            </div>
                        </div>
                        <div className="hidden md:flex flex-col items-end gap-2 text-xs text-slate-400">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700">
                                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                                <span>{loading ? 'Menyegarkan...' : 'Tarik data terbaru'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 relative z-10">
                        <button
                            onClick={() => setActiveTab('topup')}
                            className={`flex flex-col items-center justify-center px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                                activeTab === 'topup'
                                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/30'
                                    : 'bg-slate-900/80 text-slate-200 border-slate-700 hover:bg-slate-800'
                            }`}
                        >
                            Top Up
                        </button>
                        <button
                            onClick={() => setActiveTab('transfer')}
                            className={`flex flex-col items-center justify-center px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                                activeTab === 'transfer'
                                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/30'
                                    : 'bg-slate-900/80 text-slate-200 border-slate-700 hover:bg-slate-800'
                            }`}
                        >
                            Transfer
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`flex flex-col items-center justify-center px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                                activeTab === 'history'
                                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/30'
                                    : 'bg-slate-900/80 text-slate-200 border-slate-700 hover:bg-slate-800'
                            }`}
                        >
                            Riwayat
                        </button>
                        <button
                            onClick={() => setActiveTab('withdraw')}
                            className={`flex flex-col items-center justify-center px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                                activeTab === 'withdraw'
                                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/30'
                                    : 'bg-slate-900/80 text-slate-200 border-slate-700 hover:bg-slate-800'
                            }`}
                        >
                            Tarik
                        </button>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {activeTab === 'history' && (
                        <motion.div
                            key="history"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-[#020617] border border-slate-800 rounded-2xl p-4 md:p-5"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <div className="text-sm font-semibold text-slate-100">Riwayat Transaksi Dompet</div>
                                    <div className="text-xs text-slate-500">
                                        Menampilkan 20 transaksi terakhir dari keuangan toko.
                                    </div>
                                </div>
                            </div>

                            {loading && (
                                <div className="flex items-center justify-center py-8 text-slate-500 text-sm">
                                    Memuat riwayat transaksi...
                                </div>
                            )}

                            {!loading && history.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 mb-1">
                                        <ArrowRightLeft size={18} />
                                    </div>
                                    <div className="text-sm font-medium text-slate-100">Belum ada transaksi dompet</div>
                                    <div className="text-xs text-slate-500">
                                        Mulai gunakan dompet untuk PPOB, top up saldo, atau transfer antar toko.
                                    </div>
                                </div>
                            )}

                            {!loading && history.length > 0 && (
                                <div className="divide-y divide-slate-800/70">
                                    {history.map(renderHistoryItem)}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'topup' && (
                        <motion.div
                            key="topup"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-[#020617] border border-slate-800 rounded-2xl p-4 md:p-5 space-y-4"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-semibold text-slate-100">Top Up Saldo Dompet</div>
                                    <div className="text-xs text-slate-500">
                                        Ajukan penambahan saldo, konfirmasi akan diproses admin.
                                    </div>
                                </div>
                            </div>
                            <form className="space-y-4" onSubmit={handleTopUpSubmit}>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-300">Nominal Top Up</label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-slate-400">Rp</span>
                                        <input
                                            type="number"
                                            min="0"
                                            value={topupAmount}
                                            onChange={(e) => setTopupAmount(e.target.value)}
                                            className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40"
                                            placeholder="Masukkan nominal"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-300">Bukti Transfer</label>
                                    <div className="p-4 border border-dashed border-slate-700 rounded-xl bg-slate-900/50 hover:bg-slate-900 hover:border-indigo-500/50 transition-all group">
                                        {topupProof ? (
                                            <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-slate-700 bg-black/40">
                                                <img 
                                                    src={topupProof} 
                                                    alt="Bukti Transfer" 
                                                    className="w-full h-full object-contain" 
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setTopupProof('')}
                                                    className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-sm rounded-full text-white hover:bg-rose-500 transition-colors"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="flex flex-col items-center justify-center gap-2 cursor-pointer py-4">
                                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-indigo-400 group-hover:bg-indigo-500/10 transition-colors">
                                                    <Upload size={18} />
                                                </div>
                                                <div className="text-center">
                                                    <span className="text-xs font-medium text-indigo-400 group-hover:text-indigo-300">Upload Gambar</span>
                                                    <p className="text-[10px] text-slate-500 mt-1">PNG, JPG, JPEG (Max 2MB)</p>
                                                </div>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleFileChange}
                                                    className="hidden"
                                                />
                                            </label>
                                        )}
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? 'Mengirim...' : 'Ajukan Top Up'}
                                </button>
                            </form>

                            {pendingTopUps.length > 0 && (
                                <div className="space-y-2">
                                    <div className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                                        Top Up Menunggu Persetujuan
                                    </div>
                                    <div className="space-y-2">
                                        {pendingTopUps.map((t) => (
                                            <div
                                                key={t.id}
                                                className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900 border border-slate-700"
                                            >
                                                <div className="text-xs">
                                                    <div className="font-semibold text-slate-100">
                                                        {formatCurrency(t.amount)}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500">
                                                        {new Date(t.createdAt).toLocaleString('id-ID')}
                                                    </div>
                                                </div>
                                                <div className="text-[10px] px-2 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/40">
                                                    PENDING
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'transfer' && (
                        <motion.div
                            key="transfer"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-[#020617] border border-slate-800 rounded-2xl p-4 md:p-5 space-y-4"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-semibold text-slate-100">Transfer Antar Toko</div>
                                    <div className="text-xs text-slate-500">
                                        Pindahkan saldo dompet antara cabang dalam satu tenant.
                                    </div>
                                </div>
                            </div>
                            <form className="space-y-4" onSubmit={handleTransferSubmit}>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-300">ID Toko Tujuan</label>
                                    <input
                                        type="text"
                                        value={transferTarget}
                                        onChange={(e) => setTransferTarget(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40"
                                        placeholder="Masukkan ID store tujuan"
                                    />
                                    <div className="text-[10px] text-slate-500">
                                        ID store bisa dilihat di panel admin / pengaturan toko.
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-300">Nominal Transfer</label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-slate-400">Rp</span>
                                        <input
                                            type="number"
                                            min="0"
                                            value={transferAmount}
                                            onChange={(e) => setTransferAmount(e.target.value)}
                                            className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40"
                                            placeholder="Masukkan nominal"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-300">Catatan (opsional)</label>
                                    <input
                                        type="text"
                                        value={transferNote}
                                        onChange={(e) => setTransferNote(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40"
                                        placeholder="Contoh: Transfer saldo antar cabang"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? 'Memproses...' : 'Kirim Transfer'}
                                </button>
                            </form>


                        </motion.div>
                    )}

                    {activeTab === 'withdraw' && (
                        <motion.div
                            key="withdraw"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-[#020617] border border-slate-800 rounded-2xl p-4 md:p-5 space-y-4"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-semibold text-slate-100">Ajukan Penarikan Saldo</div>
                                    <div className="text-xs text-slate-500">
                                        Dana akan diproses manual oleh tim admin ke rekening tujuan.
                                    </div>
                                </div>
                            </div>
                            <form className="space-y-4" onSubmit={handleWithdrawSubmit}>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-300">Nominal Penarikan</label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-slate-400">Rp</span>
                                        <input
                                            type="number"
                                            min="0"
                                            value={withdrawAmount}
                                            onChange={(e) => setWithdrawAmount(e.target.value)}
                                            className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40"
                                            placeholder="Masukkan nominal"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-300">Nama Bank</label>
                                    <input
                                        type="text"
                                        value={withdrawBank}
                                        onChange={(e) => setWithdrawBank(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40"
                                        placeholder="Contoh: BCA, BRI, Mandiri"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-300">Nomor Rekening</label>
                                    <input
                                        type="text"
                                        value={withdrawAccount}
                                        onChange={(e) => setWithdrawAccount(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40"
                                        placeholder="Masukkan nomor rekening tujuan"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? 'Mengajukan...' : 'Ajukan Penarikan'}
                                </button>
                            </form>

                            <div className="pt-4 mt-4 border-t border-slate-800 space-y-2">
                                <div className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                                    Penarikan Menunggu Proses
                                </div>
                            </div>

                            {pendingWithdrawals.length > 0 && (
                                <div className="space-y-2">
                                    <div className="space-y-2">
                                        {pendingWithdrawals.map((w) => (
                                            <div
                                                key={w.id}
                                                className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900 border border-slate-700"
                                            >
                                                <div className="text-xs">
                                                    <div className="font-semibold text-slate-100">
                                                        {formatCurrency(w.amount)}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500">
                                                        {w.bankName} • {w.accountNumber}
                                                    </div>
                                                </div>
                                                <div className="text-[10px] px-2 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/40">
                                                    {w.status}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {error && (
                    <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200 flex items-start gap-2">
                        <AlertCircle size={14} className="mt-0.5 shrink-0" />
                        <div>{error}</div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default Wallet;
