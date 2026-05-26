import React, { useEffect, useState, useRef } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { fetchSubscriptionPackages, createSubscriptionRequest, fetchProfile, fetchSubscriptionBanks, fetchSubscriptionStatus } from '../services/api';
import { Check, Star, Zap, Shield, Loader, X, AlertCircle, Upload, Copy, Clock, Calendar, Hourglass } from 'lucide-react';

const Subscription = () => {
    const [packages, setPackages] = useState([]);
    const [banks, setBanks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [profile, setProfile] = useState(null);
    const [pendingRequest, setPendingRequest] = useState(null);
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [selectedBank, setSelectedBank] = useState(null);
    const [proofUrl, setProofUrl] = useState('');
    const [previewUrl, setPreviewUrl] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }
        
        try {
            const [pkgRes, profileRes, banksRes, statusRes] = await Promise.all([
                fetchSubscriptionPackages(),
                fetchProfile(),
                fetchSubscriptionBanks(),
                fetchSubscriptionStatus()
            ]);
            setPackages(pkgRes || []);
            setProfile(profileRes);
            setBanks(banksRes || []);
            setPendingRequest(statusRes?.pendingRequest || null);
        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (selectedPackage && banks.length > 0 && !selectedBank) {
            const defaultBank = banks.find(b => b.isDefault);
            if (defaultBank) {
                setSelectedBank(defaultBank);
            }
        }
    }, [selectedPackage, banks]);

    const handleSelectPackage = (pkg) => {
        setSelectedPackage(pkg);
        setSelectedBank(null);
        setProofUrl('');
        setPreviewUrl('');
        setError('');
        setSuccess(false);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) { // 5MB Limit
            setError('Ukuran file maksimal 5MB');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setProofUrl(reader.result);
            setPreviewUrl(reader.result);
            setError('');
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!proofUrl) {
            setError('Mohon sertakan bukti pembayaran atau ID referensi');
            return;
        }

        if (banks.length > 0 && !selectedBank) {
            setError('Mohon pilih rekening tujuan transfer');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            await createSubscriptionRequest({
                packageId: selectedPackage.id,
                proofUrl: proofUrl,
                selectedBank: selectedBank || {} 
            });
            setSuccess(true);
            await loadData();
            setSelectedPackage(null);
        } catch (err) {
            setError(err.response?.data?.error || 'Gagal mengirim permintaan');
        } finally {
            setSubmitting(false);
        }
    };

    const formatCurrency = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

    const renderActiveSubscription = () => {
        if (!profile?.tenant) return null;
        
        const { plan, subscriptionStatus, subscriptionEndsAt, trialEndsAt } = profile.tenant;
        const isActive = subscriptionStatus === 'ACTIVE' || subscriptionStatus === 'TRIAL';
        const expiryDate = subscriptionStatus === 'ACTIVE' ? subscriptionEndsAt : trialEndsAt;
        
        // Calculate remaining days
        let daysRemaining = 0;
        
        if (expiryDate) {
            const now = new Date();
            const end = new Date(expiryDate);
            const diffTime = end - now;
            daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
        
        return (
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 mb-8 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full transform translate-x-1/2 -translate-y-1/2"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h3 className="text-lg font-medium opacity-90 mb-1">Status Langganan Anda</h3>
                        <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-3xl font-bold">{plan}</h2>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${isActive ? 'bg-green-400 text-green-900' : 'bg-red-400 text-red-900'}`}>
                                {subscriptionStatus}
                            </span>
                        </div>
                        {expiryDate && (
                            <div className="flex flex-col gap-1 mt-2">
                                <p className="text-sm opacity-90 flex items-center gap-2">
                                    <Calendar size={16} />
                                    Berakhir pada: <span className="font-bold">{new Date(expiryDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                </p>
                                {isActive && (
                                    <p className="text-sm opacity-90 flex items-center gap-2">
                                        <Clock size={16} />
                                        Sisa Masa Aktif: <span className="font-bold text-yellow-300">{daysRemaining > 0 ? `${daysRemaining} Hari` : 'Hari Ini'}</span>
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                    {isActive ? (
                        <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl border border-white/20">
                            <div className="flex items-center gap-3">
                                <Shield className="w-8 h-8" />
                                <div>
                                    <p className="font-bold">Akun Terlindungi</p>
                                    <p className="text-xs opacity-80">Nikmati fitur lengkap tanpa batas.</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-red-500/20 backdrop-blur-sm p-4 rounded-xl border border-red-200/20">
                            <div className="flex items-center gap-3">
                                <AlertCircle className="w-8 h-8" />
                                <div>
                                    <p className="font-bold">Langganan Habis</p>
                                    <p className="text-xs opacity-80">Segera perbarui untuk akses penuh.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const currentPlanName = profile?.tenant?.plan || 'FREE';

    const renderPendingScreen = () => (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 text-center max-w-2xl mx-auto mt-8">
            <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <Hourglass className="w-10 h-10 text-amber-600 dark:text-amber-400 animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Menunggu Konfirmasi</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-lg mx-auto">
                Permintaan berlangganan paket <span className="font-bold text-indigo-600 dark:text-indigo-400">{pendingRequest?.package?.name}</span> Anda telah kami terima dan sedang dalam proses verifikasi.
            </p>
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 max-w-md mx-auto mb-6 border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400 text-sm">ID Referensi</span>
                    <span className="font-mono text-slate-900 dark:text-white font-medium text-sm">{pendingRequest?.id.substring(0, 8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400 text-sm">Tanggal Request</span>
                    <span className="text-slate-900 dark:text-white font-medium text-sm">
                        {new Date(pendingRequest?.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
                <div className="flex justify-between items-center py-2">
                    <span className="text-slate-500 dark:text-slate-400 text-sm">Status</span>
                    <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded text-xs font-bold">
                        PENDING
                    </span>
                </div>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-500">
                Proses verifikasi biasanya memakan waktu 1x24 jam. Anda dapat menutup halaman ini, status akan diperbarui otomatis.
            </p>
            <button 
                onClick={() => loadData(true)}
                disabled={refreshing}
                className={`mt-6 text-indigo-600 dark:text-indigo-400 font-medium hover:underline text-sm flex items-center justify-center gap-2 mx-auto ${refreshing ? 'opacity-70 cursor-wait' : ''}`}
            >
                <Clock size={16} className={refreshing ? 'animate-spin' : ''} />
                {refreshing ? 'Memeriksa...' : 'Cek Status Terbaru'}
            </button>
        </div>
    );

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto px-4 py-8">
                {renderActiveSubscription()}

                {pendingRequest ? (
                    renderPendingScreen()
                ) : (
                    <>
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Tingkatkan Bisnis Anda</h2>
                            <p className="text-slate-500 dark:text-slate-400 mt-2">Pilih paket yang sesuai dengan pertumbuhan bisnis Anda.</p>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader className="animate-spin text-indigo-600 dark:text-indigo-400" size={32} />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {packages.map((pkg) => {
                                    const isCurrent = currentPlanName === pkg.name;
                                    return (
                                        <div key={pkg.id} className={`relative bg-white dark:bg-slate-900 rounded-2xl shadow-sm border ${isCurrent ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200 dark:border-slate-800'} overflow-hidden hover:shadow-lg transition-all flex flex-col`}>
                                            {isCurrent && (
                                                <div className="absolute top-0 right-0 bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                                                    Saat Ini
                                                </div>
                                            )}
                                            <div className="p-6 flex-grow">
                                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{pkg.name}</h3>
                                                <div className="flex items-baseline mb-4">
                                                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{formatCurrency(pkg.price)}</span>
                                                    <span className="text-slate-500 dark:text-slate-400 ml-1">/{pkg.durationDays} hari</span>
                                                </div>
                                                <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">{pkg.description}</p>
                                                
                                                <ul className="space-y-3 mb-8">
                                                    {pkg.benefits && pkg.benefits.map((benefit, idx) => (
                                                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                                                            <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                                            <span>{benefit}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div className="p-6 pt-0 mt-auto">
                                                <button
                                                    onClick={() => handleSelectPackage(pkg)}
                                                    disabled={isCurrent}
                                                    className={`w-full py-3 rounded-xl font-bold transition-all ${
                                                        isCurrent 
                                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                                                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-indigo-500/30'
                                                    }`}
                                                >
                                                    {isCurrent ? 'Paket Aktif' : 'Pilih Paket'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
                
                {selectedPackage && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-4xl w-full overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Konfirmasi Langganan</h3>
                                <button onClick={() => setSelectedPackage(null)} className="text-slate-400 hover:text-slate-500 dark:hover:text-slate-300">
                                    <X size={20} />
                                </button>
                            </div>
                            
                            <div className="p-6 overflow-y-auto custom-scrollbar">
                                {success ? (
                                    <div className="text-center py-12">
                                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <Check size={32} />
                                        </div>
                                        <h4 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Permintaan Terkirim!</h4>
                                        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">Terima kasih telah melakukan pemesanan. Admin kami akan memverifikasi pembayaran Anda secepatnya. Mohon tunggu notifikasi selanjutnya.</p>
                                        <button 
                                            onClick={() => setSelectedPackage(null)}
                                            className="mt-8 px-6 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-medium rounded-lg transition-colors"
                                        >
                                            Tutup
                                        </button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="flex flex-col h-full">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {/* LEFT COLUMN: DETAILS & BANK INFO */}
                                            <div className="space-y-6">
                                                <div>
                                                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Rincian Paket</h4>
                                                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div>
                                                                <h5 className="font-bold text-slate-900 dark:text-white text-lg">{selectedPackage.name}</h5>
                                                                <p className="text-sm text-slate-500 dark:text-slate-400">{selectedPackage.description}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="font-bold text-indigo-600 dark:text-indigo-400 text-xl">{formatCurrency(selectedPackage.price)}</div>
                                                                <div className="text-xs text-slate-500">/{selectedPackage.durationDays} hari</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Transfer ke Rekening</label>
                                                    {banks && banks.length > 0 ? (
                                                        <div className="grid gap-3">
                                                            {banks.map((bank, idx) => (
                                                                <div 
                                                                    key={idx} 
                                                                    onClick={() => setSelectedBank(bank)}
                                                                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                                                                        selectedBank?.accountNumber === bank.accountNumber 
                                                                        ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500 dark:bg-indigo-900/20 dark:border-indigo-400' 
                                                                        : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700 hover:border-indigo-300'
                                                                    }`}
                                                                >
                                                                    <div className="mt-1">
                                                                        <input 
                                                                            type="radio" 
                                                                            name="bank_selection"
                                                                            checked={selectedBank?.accountNumber === bank.accountNumber}
                                                                            onChange={() => setSelectedBank(bank)}
                                                                            className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer"
                                                                        />
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <div className="flex justify-between items-center mb-1">
                                                                            <span className="font-bold text-slate-800 dark:text-slate-200">{bank.bankName}</span>
                                                                            {bank.label && (
                                                                                <span className="text-xs px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full">{bank.label}</span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="font-mono text-lg font-bold text-slate-900 dark:text-white tracking-wide">
                                                                                {bank.accountNumber}
                                                                            </div>
                                                                            <button 
                                                                                type="button"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    navigator.clipboard.writeText(bank.accountNumber);
                                                                                }}
                                                                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-indigo-600"
                                                                                title="Salin No Rekening"
                                                                            >
                                                                                <Copy size={14} />
                                                                            </button>
                                                                        </div>
                                                                        <div className="text-sm text-slate-500 dark:text-slate-400">
                                                                            a.n {bank.accountName}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 text-sm rounded-lg border border-yellow-100 dark:border-yellow-900/30">
                                                            Informasi rekening belum tersedia. Silakan hubungi admin.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* RIGHT COLUMN: UPLOAD PROOF */}
                                            <div className="flex flex-col h-full">
                                                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Bukti Pembayaran</h4>
                                                
                                                <div 
                                                    className={`flex-1 min-h-[250px] border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors relative bg-slate-50/50 dark:bg-slate-800/30 ${
                                                        previewUrl ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500'
                                                    }`}
                                                    onClick={() => fileInputRef.current?.click()}
                                                >
                                                    {previewUrl ? (
                                                        <div className="relative w-full h-full flex items-center justify-center">
                                                            <img src={previewUrl} alt="Bukti" className="max-w-full max-h-[300px] object-contain rounded-lg shadow-sm" />
                                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-lg">
                                                                <span className="text-white text-sm font-medium bg-black/60 px-3 py-1.5 rounded-full flex items-center gap-2">
                                                                    <Upload size={16} /> Ganti Gambar
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center">
                                                            <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full shadow-sm flex items-center justify-center mb-4">
                                                                <Upload className="w-8 h-8 text-indigo-500" />
                                                            </div>
                                                            <p className="text-base text-slate-700 dark:text-slate-300 font-medium mb-1">Upload Bukti Transfer</p>
                                                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 max-w-[200px]">Format: JPG, PNG (Max 5MB)</p>
                                                            <span className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 shadow-sm">
                                                                Pilih File
                                                            </span>
                                                        </div>
                                                    )}
                                                    <input 
                                                        type="file" 
                                                        ref={fileInputRef}
                                                        onChange={handleFileChange}
                                                        accept="image/*"
                                                        className="hidden" 
                                                    />
                                                </div>
                                                
                                                {error && (
                                                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2 border border-red-100 dark:border-red-900/30">
                                                        <AlertCircle size={16} className="shrink-0" />
                                                        {error}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="pt-6 mt-8 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedPackage(null)}
                                                className="px-5 py-2.5 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                            >
                                                Batal
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={submitting}
                                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-2 disabled:opacity-70 disabled:shadow-none"
                                            >
                                                {submitting ? <Loader size={18} className="animate-spin" /> : (
                                                    <>
                                                        <span>Proses Pembayaran</span>
                                                        <Check size={18} />
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default Subscription;
