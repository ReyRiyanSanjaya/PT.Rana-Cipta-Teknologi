import React, { useEffect, useRef, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DollarSign, ShoppingBag, CreditCard, Activity, Package, Calendar, AlertCircle, TrendingUp, TrendingDown, ArrowUpRight, Store, Wallet, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import { DashboardSkeleton } from '../components/LoadingSkeleton';
import { fetchDashboardStats, fetchAdminStats, fetchAdminChart, fetchWalletData } from '../services/api';
import api from '../services/api';
import { io } from 'socket.io-client';
import RealtimeBadge from '../components/RealtimeBadge';
import QuickActions from '../components/QuickActions';
import { useAuth } from '../context/AuthContext';

const StatCard = ({ title, value, subtext, icon: Icon, colorClass, trend, delay, onClick }) => {
    // Helper to get background color class
    const bgBase = colorClass.replace('text-', 'bg-').replace('600', '500');
    
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            whileTap={{ scale: 0.97 }}
            transition={{ delay, duration: 0.4 }}
            onClick={onClick}
            className={`relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 sm:p-6 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 dark:hover:shadow-indigo-900/10 transition-all duration-300 group ${onClick ? 'cursor-pointer' : ''}`}
        >
            <div className={`absolute -right-6 -top-6 h-32 w-32 rounded-full opacity-[0.03] transition-transform duration-700 group-hover:scale-150 ${bgBase}`} />
            <div className={`absolute -bottom-6 -left-6 h-24 w-24 rounded-full opacity-[0.03] transition-transform delay-100 duration-700 group-hover:scale-150 ${bgBase}`} />
            
            <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className={`flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-opacity-10 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110 ${bgBase} ${colorClass} dark:${colorClass.replace('600', '400')}`}>
                        <Icon size={18} className="sm:hidden" />
                        <Icon size={24} className="hidden sm:block" />
                    </div>
                    {trend !== undefined && trend !== null && (
                        <div className={`flex items-center gap-0.5 sm:gap-1 rounded-full px-1.5 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold border ${trend >= 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'}`}>
                            {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {Math.abs(trend)}%
                        </div>
                    )}
                </div>
                
                <div>
                    <h3 className="text-lg sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-0.5 sm:mb-1 truncate">{value}</h3>
                    <p className="text-[11px] sm:text-sm font-medium text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors truncate">{title}</p>
                </div>
                
                {subtext && (
                    <div className="mt-3 sm:mt-4 hidden sm:flex items-center gap-2 border-t border-slate-50 pt-3 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
                        <span className={`h-1.5 w-1.5 rounded-full ${bgBase.replace('bg-opacity-10', '')} opacity-60`} />
                        {subtext}
                    </div>
                )}
            </div>
        </motion.div>
    );
};

const Dashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [adminData, setAdminData] = useState(null);
    const [adminChart, setAdminChart] = useState([]);

    const [announcements, setAnnouncements] = useState([]);
    const [wallet, setWallet] = useState(null);
    const socketRef = useRef(null);

    const [error, setError] = useState(null);

    const loadData = async () => {
        const today = new Date().toISOString().split('T')[0];
        setLoading(true);
        setError(null);

        try {
            const annResPromise = api.get('/system/announcements').catch(() => ({ data: { data: [] } }));
            const walletPromise = fetchWalletData().catch(() => null);

            if (user?.role === 'SUPER_ADMIN') {
                try {
                    const [stats, chart, annRes] = await Promise.all([
                        fetchAdminStats(),
                        fetchAdminChart(),
                        annResPromise
                    ]);
                    setAdminData(stats);
                    setAdminChart(chart || []);
                    setData(null);
                    setAnnouncements(annRes?.data?.data || []);
                } catch (err) {
                    console.error("Failed to load admin data", err);
                    setError("Gagal memuat data dashboard admin.");
                }
            } else {
                try {
                    // Fetch today and yesterday for trend comparison
                    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
                    const [stats, yesterdayStats, annRes, walletData] = await Promise.all([
                        fetchDashboardStats(today, user?.storeId),
                        fetchDashboardStats(yesterday, user?.storeId).catch(() => null),
                        annResPromise,
                        walletPromise
                    ]);
                    
                    // Calculate real trends
                    if (stats && yesterdayStats) {
                        const calcTrend = (current, previous) => {
                            if (!previous || previous === 0) return current > 0 ? 100 : 0;
                            return Math.round(((current - previous) / previous) * 100 * 10) / 10;
                        };
                        const todayFin = stats.financials || {};
                        const yestFin = yesterdayStats.financials || {};
                        stats._trends = {
                            grossProfit: calcTrend(todayFin.grossProfit || 0, yestFin.grossProfit || 0),
                            netSales: calcTrend(todayFin.netSales || 0, yestFin.netSales || 0),
                            avgOrder: calcTrend(
                                (todayFin.netSales || 0) / (todayFin.transactionCount || 1),
                                (yestFin.netSales || 0) / (yestFin.transactionCount || 1)
                            ),
                            cogs: calcTrend(todayFin.cogs || 0, yestFin.cogs || 0),
                        };
                    }
                    
                    setData(stats);
                    setAnnouncements(annRes?.data?.data || []);
                    setWallet(walletData);
                } catch (err) {
                    console.error("Failed to load dashboard data", err);
                    setError("Gagal memuat data dashboard. Silakan coba lagi.");
                }
            }
        } catch (e) {
            console.error("Unexpected error in loadData", e);
            setError("Terjadi kesalahan yang tidak terduga.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();

        const token = localStorage.getItem('token');
        if (!token) return;

        const baseUrl = api?.defaults?.baseURL || '';
        const socketUrl = baseUrl ? baseUrl.replace(/\/api\/?$/, '') : 'http://localhost:4000';

        socketRef.current = io(socketUrl, {
            auth: { token },
            transports: ['websocket', 'polling']
        });

        socketRef.current.on('transactions:created', loadData);
        socketRef.current.on('inventory:changed', loadData);

        return () => {
            socketRef.current?.disconnect();
        };
    }, []);

    if (loading) return (
        <DashboardLayout>
            <DashboardSkeleton />
        </DashboardLayout>
    );

    if (error) return (
        <DashboardLayout>
            <div className="flex items-center justify-center h-[80vh]">
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="p-4 rounded-full bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">
                        <AlertCircle size={40} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Terjadi Kesalahan</h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">{error}</p>
                    </div>
                    <button 
                        onClick={loadData}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                    >
                        Coba Lagi
                    </button>
                </div>
            </div>
        </DashboardLayout>
    );

    if (!data && !adminData) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="flex flex-col items-center gap-6 text-center max-w-md"
                    >
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-teal-400 to-indigo-500 rounded-full blur-2xl opacity-20 animate-pulse" />
                            <div className="relative p-6 rounded-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700">
                                <Store size={48} className="text-teal-500 dark:text-teal-400" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Selamat Datang di Rana!</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                                Belum ada data transaksi hari ini. Mulai berjualan melalui POS untuk melihat ringkasan performa toko Anda.
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            <button 
                                onClick={() => navigate('/pos')}
                                className="px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-xl hover:from-teal-600 hover:to-emerald-700 transition-all font-semibold flex items-center justify-center gap-2 shadow-lg shadow-teal-500/25"
                            >
                                <Store size={18} />
                                Buka Kasir (POS)
                            </button>
                            <button 
                                onClick={() => navigate('/inventory')}
                                className="px-6 py-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all font-semibold flex items-center justify-center gap-2"
                            >
                                <Package size={18} />
                                Kelola Inventaris
                            </button>
                        </div>
                    </motion.div>

                    {/* Quick Actions even when no data */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mt-12 w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 shadow-sm"
                    >
                        <QuickActions />
                    </motion.div>
                </div>
            </DashboardLayout>
        );
    }

    if (user?.role === 'SUPER_ADMIN' && adminData) {
        const { totalStores, totalPayouts, pendingWithdrawals, recentWithdrawals } = adminData;
        const formatCurrency = (val) =>
            new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
        return (
            <DashboardLayout>
                <div className="space-y-8 pb-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Admin Dashboard</span>
                                <RealtimeBadge />
                            </div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Ringkasan Platform</h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-1">Statistik global untuk semua merchant.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard
                            title="Total Toko"
                            value={totalStores}
                            subtext="Terdaftar di platform"
                            icon={Store}
                            colorClass="text-indigo-600"
                            delay={0.1}
                        />
                        <StatCard
                            title="Total Pencairan"
                            value={formatCurrency(totalPayouts)}
                            subtext="Disetujui"
                            icon={DollarSign}
                            colorClass="text-emerald-600"
                            delay={0.2}
                        />
                        <StatCard
                            title="Penarikan Tertunda"
                            value={pendingWithdrawals}
                            subtext="Menunggu persetujuan"
                            icon={AlertCircle}
                            colorClass="text-amber-600"
                            delay={0.3}
                        />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">Omzet 7 Hari</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Total penjualan harian</p>
                                </div>
                            </div>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={adminChart}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '12px', backgroundColor: 'var(--tooltip-bg)', color: 'var(--tooltip-text)' }}
                                            formatter={(value) => [<span className="font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(value)}</span>, 'Omzet']}
                                        />
                                        <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={28}>
                                            {adminChart.map((entry, index) => (
                                                <Cell key={`cell-admin-${index}`} fill={['#4f46e5', '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe'][index % 5]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </motion.div>
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800"
                        >
                            <div className="flex items-center space-x-2 mb-4">
                                <span className="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 p-2 rounded-lg">
                                    <Activity size={16} />
                                </span>
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Penarikan Terbaru</h3>
                            </div>
                            <div className="space-y-4">
                                {(recentWithdrawals || []).map((w) => (
                                    <div key={w.id} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                                        <div className="flex justify-between items-start">
                                            <div className="text-sm font-bold text-slate-900 dark:text-white">{w.store?.name || 'Toko'}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">{new Date(w.createdAt).toLocaleDateString('id-ID')}</div>
                                        </div>
                                        <div className="text-sm text-indigo-600 dark:text-indigo-400 font-bold mt-2">{formatCurrency(w.amount)}</div>
                                    </div>
                                ))}
                                {(!recentWithdrawals || recentWithdrawals.length === 0) && (
                                    <div className="text-sm text-slate-500 dark:text-slate-400">Belum ada data.</div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const financials = data?.financials || {
        grossSales: 0,
        netSales: 0,
        grossProfit: 0,
        transactionCount: 0,
        cogs: 0
    };

    const topProducts = data?.topProducts || [];

    const formatCurrency = (val) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

    return (
        <DashboardLayout>
            <div className="space-y-8 pb-10">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="inline-flex items-center rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-teal-700 dark:bg-teal-500/10 dark:text-teal-400">
                                <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse"></span>
                                Dashboard
                            </span>
                            <RealtimeBadge />
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                            Halo, {user?.name?.split(' ')[0] || 'Kasir'} <span className="text-2xl">👋</span>
                        </h1>
                        <p className="mt-2 text-sm sm:text-base text-slate-500 dark:text-slate-400">
                            Berikut adalah ringkasan performa toko Anda untuk hari ini.
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 rounded-2xl bg-white px-3 sm:px-4 py-2 sm:py-2.5 shadow-sm border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
                            <div className="rounded-lg bg-teal-50 p-1.5 sm:p-2 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400">
                                <Calendar size={16} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold uppercase text-slate-400">Hari Ini</span>
                                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                    {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                            </div>
                        </div>

                        <button 
                            onClick={() => navigate('/inventory')}
                            className="group relative flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-100 hover:border-rose-100 hover:text-rose-600 dark:bg-slate-900 dark:border-slate-800 dark:hover:border-rose-900 dark:hover:text-rose-400 transition-all"
                            title="Cek Stok Menipis"
                        >
                            <AlertCircle size={20} />
                            <span className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900"></span>
                        </button>
                    </div>
                </div>

                {/* Financial Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                    <StatCard
                        title="Laba Kotor"
                        value={formatCurrency(financials.grossProfit)}
                        subtext="Pendapatan - HPP"
                        icon={DollarSign}
                        colorClass="text-emerald-600"
                        trend={data?._trends?.grossProfit}
                        delay={0.1}
                        onClick={() => navigate('/profit-loss')}
                    />
                    <StatCard
                        title="Penjualan Bersih"
                        value={formatCurrency(financials.netSales)}
                        subtext={`${financials.transactionCount} Transaksi sukses`}
                        icon={ShoppingBag}
                        colorClass="text-indigo-600"
                        trend={data?._trends?.netSales}
                        delay={0.2}
                        onClick={() => navigate('/transactions')}
                    />
                    <StatCard
                        title="Nilai Rata-rata Pesanan"
                        value={formatCurrency(financials.netSales / (financials.transactionCount || 1))}
                        subtext="Per transaksi sukses"
                        icon={CreditCard}
                        colorClass="text-violet-600"
                        trend={data?._trends?.avgOrder}
                        delay={0.3}
                        onClick={() => navigate('/reports')}
                    />
                    <StatCard
                        title="Total HPP"
                        value={formatCurrency(financials.cogs)}
                        subtext="Modal barang terjual"
                        icon={Activity}
                        colorClass="text-amber-600"
                        trend={data?._trends?.cogs}
                        delay={0.4}
                        onClick={() => navigate('/profit-loss')}
                    />
                </div>

                {/* Quick Actions - Mobile First */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                    className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 shadow-sm"
                >
                    <QuickActions />
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Top Products Chart */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="lg:col-span-2 flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm"
                    >
                        <div className="flex items-center justify-between p-6 border-b border-slate-50 dark:border-slate-800">
                            <div>
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Produk Terlaris</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Kontribusi pendapatan per produk</p>
                            </div>
                            <button 
                                onClick={() => navigate('/reports')}
                                className="group flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-indigo-900/20 dark:hover:text-indigo-400 transition-all"
                            >
                                Lihat Detail
                                <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                            </button>
                        </div>
                        <div className="flex-1 p-6 min-h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topProducts} layout="vertical" margin={{ left: 0, right: 30, top: 10, bottom: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--grid-color)" opacity={0.3} />
                                    <XAxis type="number" hide />
                                    <YAxis
                                        dataKey="product.name"
                                        type="category"
                                        width={140}
                                        tick={{ fontSize: 13, fill: '#64748b', fontWeight: 500 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'var(--grid-color)', opacity: 0.1, radius: 8 }}
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl border border-slate-700/50 backdrop-blur-sm">
                                                        <p className="font-bold mb-1 text-sm">{label}</p>
                                                        <p className="text-indigo-300">
                                                            Pendapatan: <span className="text-white font-bold ml-1">{formatCurrency(payload[0].value)}</span>
                                                        </p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar 
                                        dataKey="revenue" 
                                        radius={[0, 8, 8, 0]} 
                                        barSize={32}
                                        animationDuration={1500}
                                    >
                                        {topProducts.map((entry, index) => (
                                            <Cell 
                                                key={`cell-${index}`} 
                                                fill={['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b'][index % 5]} 
                                                className="hover:opacity-80 transition-opacity cursor-pointer"
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>

                    {/* Wallet Snapshot & Announcements */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="space-y-6"
                    >
                        {wallet && (
                            <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-5 sm:p-8 text-white shadow-2xl shadow-indigo-500/30 transition-transform hover:scale-[1.01] duration-500">
                                <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-white opacity-10 blur-3xl transition-transform duration-1000 group-hover:scale-110" />
                                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-48 w-48 rounded-full bg-indigo-950 opacity-20 blur-2xl" />
                                
                                <div className="relative z-10 flex flex-col justify-between h-full">
                                    <div className="flex items-start justify-between mb-5 sm:mb-8">
                                        <div className="rounded-xl sm:rounded-2xl bg-white/10 p-2.5 sm:p-3 backdrop-blur-md border border-white/10 shadow-lg">
                                            <Wallet className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-bold uppercase tracking-widest text-indigo-200">Rana Pay</p>
                                            <div className="mt-1 flex items-center justify-end gap-1.5">
                                                <span className="relative flex h-2 w-2">
                                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                                                </span>
                                                <span className="text-[10px] font-bold text-emerald-300">CONNECTED</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="mb-5 sm:mb-8">
                                        <p className="text-xs sm:text-sm font-medium text-indigo-100 mb-1">Total Saldo Aktif</p>
                                        <h3 className="text-2xl sm:text-4xl font-bold tracking-tight text-white drop-shadow-sm">
                                            {formatCurrency(wallet.balance || 0)}
                                        </h3>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { label: 'Top Up', icon: ArrowUpRight, action: () => navigate('/wallet') },
                                            { label: 'Transfer', icon: TrendingUp, action: () => navigate('/wallet') },
                                            { label: 'Riwayat', icon: Activity, action: () => navigate('/wallet') }
                                        ].map((btn, idx) => (
                                            <button
                                                key={idx}
                                                onClick={btn.action}
                                                className="group/btn flex flex-col items-center justify-center rounded-xl bg-white/10 py-3 backdrop-blur-sm border border-white/10 transition-all duration-200 hover:bg-white/20 hover:scale-105 active:scale-95"
                                            >
                                                <btn.icon size={20} className="mb-1.5 text-indigo-100 group-hover/btn:text-white transition-colors" />
                                                <span className="text-[10px] font-bold text-indigo-100 group-hover/btn:text-white">{btn.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Status Sistem Widget */}
                        <div className="group relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 shadow-sm transition-all hover:shadow-lg">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                                    <Zap size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white">Status Sistem</h3>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                        <span className="relative flex h-2 w-2">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                        </span>
                                        Semua layanan berjalan normal
                                    </div>
                                </div>
                            </div>
                            
                            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 text-xs leading-relaxed text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
                                Sistem berjalan dalam <span className="font-bold text-indigo-600 dark:text-indigo-400">Mode Hybrid</span>. Data keuangan disinkronisasi secara otomatis setiap 15 menit untuk performa optimal.
                            </div>
                        </div>

                        {/* Announcements */}
                        {announcements.length > 0 && (
                            <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-slate-900 dark:text-white">Pengumuman</h3>
                                    <span className="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                                        {announcements.length} Baru
                                    </span>
                                </div>
                                <div className="space-y-3">
                                    {announcements.map((ann) => (
                                        <div key={ann.id} className="relative pl-4 before:absolute before:left-0 before:top-2 before:h-2 before:w-2 before:rounded-full before:bg-indigo-500">
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">{ann.title}</h4>
                                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{ann.content}</p>
                                            <span className="mt-2 block text-[10px] font-medium text-slate-400">{new Date(ann.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* Distributor Promo Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="bg-gradient-to-r from-indigo-600/10 via-blue-600/5 to-transparent border border-indigo-500/20 rounded-[2rem] p-8 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] -mr-32 -mt-32" />
                    
                    <div className="flex-shrink-0 w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
                        <Package size={40} />
                    </div>
                    
                    <div className="flex-grow text-center md:text-left">
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Ingin Menjadi Distributor?</h3>
                        <p className="text-slate-600 dark:text-slate-400 max-w-2xl">
                            Punya stok barang grosir? Daftar sebagai distributor Rana dan mulai pasok barang ke ribuan merchant lainnya di platform kami. Kelola pesanan wholesale dengan mudah!
                        </p>
                    </div>
                    
                    <button 
                        onClick={() => navigate('/distributor')}
                        className="flex-shrink-0 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition-all shadow-xl shadow-indigo-600/20 flex items-center gap-2 group"
                    >
                        Pelajari Selengkapnya
                        <ArrowUpRight className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </button>
                </motion.div>
            </div>
        </DashboardLayout>
    );
};

export default Dashboard;
