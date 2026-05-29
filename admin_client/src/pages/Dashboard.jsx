import React, { useEffect, useState, useRef, useCallback } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import {
    ArrowRight, Wallet, Users, TrendingUp, Clock, Download,
    ShoppingBag, Receipt, Activity, DollarSign, Store,
    CreditCard, ArrowUpRight, ArrowDownRight, RefreshCw,
    Zap, BarChart3, PieChart, Globe
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api';
import { initSocket } from '../lib/socket';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, AreaChart, Area, PieChart as RechartsPie,
    Pie, Cell, LineChart, Line
} from 'recharts';

const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const formatCurrency = (val) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);

const formatNumber = (val) =>
    new Intl.NumberFormat('id-ID').format(val || 0);

const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    if (diffMin < 1) return 'Baru saja';
    if (diffMin < 60) return `${diffMin}m lalu`;
    if (diffHour < 24) return `${diffHour}h lalu`;
    if (diffDay < 7) return `${diffDay}d lalu`;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
};

// Stat Card Component
const StatCard = ({ title, value, icon: Icon, colorClass, bgClass, link, trend, subtitle, loading: isLoading }) => (
    <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-100 p-5 shadow-sm hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 group">
        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-[0.05] group-hover:scale-150 transition-transform duration-700" style={{ background: bgClass }} />
        <div className="relative z-10">
            <div className="flex items-start justify-between mb-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${colorClass} transition-transform duration-300 group-hover:scale-110`}>
                    <Icon size={20} />
                </div>
                {trend !== undefined && trend !== null && (
                    <div className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${trend >= 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                        {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                {isLoading ? <span className="inline-block h-7 w-24 bg-slate-100 rounded animate-pulse" /> : value}
            </h3>
            <p className="text-xs font-medium text-slate-500 mt-1">{title}</p>
            {subtitle && <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>}
            {link && (
                <Link to={link} className="mt-3 inline-flex items-center text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
                    Lihat Detail <ArrowRight size={12} className="ml-1" />
                </Link>
            )}
        </div>
    </div>
);

// Realtime indicator
const RealtimeBadge = () => (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
        <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
        </span>
        Realtime
    </span>
);

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    // Core stats
    const [stats, setStats] = useState({
        totalStores: 0, totalPayouts: 0, pendingWithdrawals: 0, recentWithdrawals: []
    });
    const [chartData, setChartData] = useState([]);
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [txnTotal, setTxnTotal] = useState(0);

    // Analytics
    const [analytics, setAnalytics] = useState(null);

    // Pending counts
    const [pendingTopups, setPendingTopups] = useState(0);
    const [pendingSubscriptions, setPendingSubscriptions] = useState(0);

    // Fetch all dashboard data
    const fetchData = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        try {
            const [statsRes, chartRes, txnRes, analyticsRes, topupRes, subStatsRes] = await Promise.allSettled([
                api.get('/admin/stats'),
                api.get('/admin/stats/chart'),
                api.get('/admin/transactions?limit=5'),
                api.get('/admin/analytics?months=6'),
                api.get('/admin/topups?status=PENDING'),
                api.get('/admin/subscriptions/stats'),
            ]);

            if (statsRes.status === 'fulfilled') setStats(statsRes.value.data.data);
            if (chartRes.status === 'fulfilled') setChartData(chartRes.value.data.data || []);
            if (txnRes.status === 'fulfilled') {
                const txnData = txnRes.value.data.data;
                setRecentTransactions(txnData.transactions || []);
                setTxnTotal(txnData.total || 0);
            }
            if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value.data.data);
            if (topupRes.status === 'fulfilled') {
                const topups = topupRes.value.data.data;
                setPendingTopups(Array.isArray(topups) ? topups.length : 0);
            }
            if (subStatsRes.status === 'fulfilled') {
                setPendingSubscriptions(subStatsRes.value.data.data?.pending || 0);
            }

            setLastUpdated(new Date());
        } catch (error) {
            console.error('Dashboard fetch error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Initial load + polling
    useEffect(() => {
        fetchData();
        const interval = setInterval(() => fetchData(false), 15000); // Auto-refresh every 15s
        return () => clearInterval(interval);
    }, [fetchData]);

    // Socket realtime updates
    useEffect(() => {
        const socket = initSocket();
        if (!socket) return;

        const handleRealtimeUpdate = () => {
            fetchData(false);
        };

        socket.on('new_withdrawal', handleRealtimeUpdate);
        socket.on('new_topup', handleRealtimeUpdate);
        socket.on('new_subscription', handleRealtimeUpdate);
        socket.on('new_transaction', handleRealtimeUpdate);
        socket.on('merchant_registered', handleRealtimeUpdate);
        socket.on('admin:stats_update', handleRealtimeUpdate);

        return () => {
            socket.off('new_withdrawal', handleRealtimeUpdate);
            socket.off('new_topup', handleRealtimeUpdate);
            socket.off('new_subscription', handleRealtimeUpdate);
            socket.off('new_transaction', handleRealtimeUpdate);
            socket.off('merchant_registered', handleRealtimeUpdate);
            socket.off('admin:stats_update', handleRealtimeUpdate);
        };
    }, [fetchData]);

    const handleExport = async () => {
        try {
            const res = await api.get('/admin/export/dashboard');
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data.data, null, 2));
            const a = document.createElement('a');
            a.setAttribute("href", dataStr);
            a.setAttribute("download", "dashboard_export_" + Date.now() + ".json");
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (error) {
            alert("Failed to export data");
        }
    };

    // Derived data for charts
    const revenueBySourceData = analytics?.revenueBySource?.map(r => ({
        name: r.source === 'SUBSCRIPTION' ? 'Langganan' : r.source === 'WITHDRAWAL_FEE' ? 'Fee WD' : r.source === 'OTHER' ? 'Lainnya' : r.source,
        value: r._sum?.amount || 0
    })) || [];

    const tenantByPlanData = analytics?.tenantByPlan || [];

    return (
        <>
            {/* Header */}
            <div className="mb-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
                            <RealtimeBadge />
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                            Platform overview &mdash; Last updated: {lastUpdated.toLocaleTimeString('id-ID')}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() => fetchData(true)}
                            variant="outline"
                            className="gap-2"
                            disabled={refreshing}
                        >
                            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                            {refreshing ? 'Refreshing...' : 'Refresh'}
                        </Button>
                        <Button onClick={handleExport} variant="outline" className="gap-2">
                            <Download size={14} />
                            Export
                        </Button>
                        <Badge variant="outline" className="px-3 py-1.5 text-xs">
                            {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                    title="Total Merchants"
                    value={formatNumber(stats.totalStores)}
                    icon={Store}
                    colorClass="bg-indigo-50 text-indigo-600"
                    bgClass="#6366f1"
                    link="/admin/merchants"
                    loading={loading}
                    subtitle={analytics ? `${analytics.activeSubscribers || 0} aktif berlangganan` : null}
                />
                <StatCard
                    title="Total Revenue"
                    value={formatCurrency(analytics?.totalRevenue)}
                    icon={DollarSign}
                    colorClass="bg-emerald-50 text-emerald-600"
                    bgClass="#10b981"
                    loading={loading}
                    subtitle={analytics ? `ARPU: ${formatCurrency(analytics.arpu)}` : null}
                />
                <StatCard
                    title="Total Transaksi"
                    value={formatNumber(txnTotal)}
                    icon={Receipt}
                    colorClass="bg-cyan-50 text-cyan-600"
                    bgClass="#06b6d4"
                    link="/admin/transactions"
                    loading={loading}
                />
                <StatCard
                    title="Total Payouts"
                    value={formatCurrency(stats.totalPayouts)}
                    icon={TrendingUp}
                    colorClass="bg-violet-50 text-violet-600"
                    bgClass="#8b5cf6"
                    link="/admin/withdrawals"
                    loading={loading}
                />
            </div>

            {/* Pending Actions Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <Link to="/admin/withdrawals" className="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-100 hover:border-orange-200 hover:shadow-md transition-all group">
                    <div className="h-10 w-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Wallet size={18} />
                    </div>
                    <div className="flex-1">
                        <p className="text-xs text-slate-500 font-medium">Pending Withdrawals</p>
                        <p className="text-lg font-bold text-slate-900">{loading ? '...' : stats.pendingWithdrawals}</p>
                    </div>
                    {stats.pendingWithdrawals > 0 && (
                        <span className="h-2.5 w-2.5 rounded-full bg-orange-400 animate-pulse" />
                    )}
                </Link>
                <Link to="/admin/topups" className="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all group">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <CreditCard size={18} />
                    </div>
                    <div className="flex-1">
                        <p className="text-xs text-slate-500 font-medium">Pending Top Ups</p>
                        <p className="text-lg font-bold text-slate-900">{loading ? '...' : pendingTopups}</p>
                    </div>
                    {pendingTopups > 0 && (
                        <span className="h-2.5 w-2.5 rounded-full bg-blue-400 animate-pulse" />
                    )}
                </Link>
                <Link to="/admin/subscriptions" className="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-100 hover:border-purple-200 hover:shadow-md transition-all group">
                    <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Zap size={18} />
                    </div>
                    <div className="flex-1">
                        <p className="text-xs text-slate-500 font-medium">Pending Subscriptions</p>
                        <p className="text-lg font-bold text-slate-900">{loading ? '...' : pendingSubscriptions}</p>
                    </div>
                    {pendingSubscriptions > 0 && (
                        <span className="h-2.5 w-2.5 rounded-full bg-purple-400 animate-pulse" />
                    )}
                </Link>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Sales Chart - 7 Days */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-sm font-semibold text-slate-800">Penjualan 7 Hari Terakhir</h3>
                            <p className="text-[11px] text-slate-400 mt-0.5">Total volume transaksi harian</p>
                        </div>
                        <BarChart3 size={16} className="text-slate-300" />
                    </div>
                    {loading ? (
                        <div className="h-48 flex items-center justify-center">
                            <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                                <Tooltip formatter={(value) => [formatCurrency(value), 'Penjualan']} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                                <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2.5} fill="url(#colorSales)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Revenue by Source Pie */}
                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-sm font-semibold text-slate-800">Revenue by Source</h3>
                            <p className="text-[11px] text-slate-400 mt-0.5">Distribusi pendapatan platform</p>
                        </div>
                        <PieChart size={16} className="text-slate-300" />
                    </div>
                    {loading || !analytics ? (
                        <div className="h-48 flex items-center justify-center">
                            <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : revenueBySourceData.length === 0 ? (
                        <div className="h-48 flex items-center justify-center text-xs text-slate-400">No data</div>
                    ) : (
                        <>
                            <ResponsiveContainer width="100%" height={160}>
                                <RechartsPie>
                                    <Pie data={revenueBySourceData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                                        {revenueBySourceData.map((_, idx) => (
                                            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }} />
                                </RechartsPie>
                            </ResponsiveContainer>
                            <div className="space-y-1.5 mt-2">
                                {revenueBySourceData.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-[11px]">
                                        <div className="flex items-center gap-2">
                                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[idx % COLORS.length] }} />
                                            <span className="text-slate-600">{item.name}</span>
                                        </div>
                                        <span className="font-medium text-slate-800">{formatCurrency(item.value)}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Revenue & Growth Charts */}
            {analytics && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Revenue Trend */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-800">Revenue Trend</h3>
                                <p className="text-[11px] text-slate-400 mt-0.5">Pendapatan platform 6 bulan terakhir</p>
                            </div>
                            <TrendingUp size={16} className="text-slate-300" />
                        </div>
                        <ResponsiveContainer width="100%" height={180}>
                            <LineChart data={analytics.revenueChart || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : `${(v/1000).toFixed(0)}K`} />
                                <Tooltip formatter={(value) => [formatCurrency(value), 'Revenue']} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Merchant Growth */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-800">Merchant Growth</h3>
                                <p className="text-[11px] text-slate-400 mt-0.5">Merchant baru per bulan</p>
                            </div>
                            <Users size={16} className="text-slate-300" />
                        </div>
                        <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={analytics.growthChart || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                                <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Analytics Summary Cards */}
            {analytics && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-xl border border-slate-100 p-4">
                        <p className="text-[11px] text-slate-500 font-medium">Active Subscribers</p>
                        <p className="text-xl font-bold text-slate-900 mt-1">{formatNumber(analytics.activeSubscribers)}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">dari {formatNumber(analytics.totalTenants)} tenant</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-100 p-4">
                        <p className="text-[11px] text-slate-500 font-medium">Churn Rate</p>
                        <p className="text-xl font-bold text-slate-900 mt-1">{analytics.churnRate}%</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{formatNumber(analytics.cancelledTenants)} cancelled</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-100 p-4">
                        <p className="text-[11px] text-slate-500 font-medium">Subscription Revenue</p>
                        <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(analytics.totalSubscriptionRevenue)}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">6 bulan terakhir</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-100 p-4">
                        <p className="text-[11px] text-slate-500 font-medium">Transaction Fees</p>
                        <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(analytics.totalTxnFees)}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Fee withdrawal</p>
                    </div>
                </div>
            )}

            {/* Tables Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Recent Transactions */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-50 flex justify-between items-center">
                        <div>
                            <h3 className="text-sm font-semibold text-slate-800">Transaksi Terbaru</h3>
                            <p className="text-[11px] text-slate-400 mt-0.5">5 transaksi terakhir</p>
                        </div>
                        <Link to="/admin/transactions" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
                            Semua <ArrowRight size={12} />
                        </Link>
                    </div>
                    <div>
                        {loading ? (
                            <div className="p-8 text-center">
                                <div className="h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                            </div>
                        ) : recentTransactions.length === 0 ? (
                            <div className="p-8 text-center text-xs text-slate-400">Belum ada transaksi</div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {recentTransactions.map((t) => (
                                    <div key={t.id} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50/50 transition">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500">
                                                <ShoppingBag size={16} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-slate-800">{t.store?.name || 'Unknown'}</p>
                                                <p className="text-[10px] text-slate-400">{formatTimeAgo(t.occurredAt || t.createdAt)}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-bold text-slate-900">{formatCurrency(t.totalAmount)}</p>
                                            <Badge variant={t.paymentStatus === 'PAID' ? 'success' : 'warning'} className="text-[9px] mt-0.5">
                                                {t.paymentStatus}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Withdrawals */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-50 flex justify-between items-center">
                        <div>
                            <h3 className="text-sm font-semibold text-slate-800">Withdrawal Terbaru</h3>
                            <p className="text-[11px] text-slate-400 mt-0.5">5 permintaan terakhir</p>
                        </div>
                        <Link to="/admin/withdrawals" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
                            Semua <ArrowRight size={12} />
                        </Link>
                    </div>
                    <div>
                        {loading ? (
                            <div className="p-8 text-center">
                                <div className="h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                            </div>
                        ) : stats.recentWithdrawals.length === 0 ? (
                            <div className="p-8 text-center text-xs text-slate-400">Belum ada withdrawal</div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {stats.recentWithdrawals.map((w) => (
                                    <div key={w.id} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50/50 transition">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500">
                                                <Wallet size={16} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-slate-800">{w.store?.name || 'Unknown'}</p>
                                                <p className="text-[10px] text-slate-400">{formatTimeAgo(w.createdAt)}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-bold text-slate-900">{formatCurrency(w.amount)}</p>
                                            <Badge variant={w.status === 'APPROVED' ? 'success' : w.status === 'REJECTED' ? 'error' : 'warning'} className="text-[9px] mt-0.5">
                                                {w.status}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Top Merchants & Distribution */}
            {analytics && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Top Merchants */}
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-800">Top Merchants</h3>
                                <p className="text-[11px] text-slate-400 mt-0.5">Berdasarkan volume transaksi</p>
                            </div>
                            <Globe size={16} className="text-slate-300" />
                        </div>
                        {analytics.topMerchants?.length > 0 ? (
                            <div className="space-y-2.5">
                                {analytics.topMerchants.slice(0, 7).map((m, idx) => {
                                    const maxVol = analytics.topMerchants[0]?.volume || 1;
                                    const pct = Math.round((m.volume / maxVol) * 100);
                                    return (
                                        <div key={idx} className="flex items-center gap-3">
                                            <span className="text-[10px] font-bold text-slate-400 w-5 text-right">#{idx + 1}</span>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-medium text-slate-700 truncate">{m.name}</span>
                                                    <span className="text-[11px] font-bold text-slate-800">{formatCurrency(m.volume)}</span>
                                                </div>
                                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="h-40 flex items-center justify-center text-xs text-slate-400">No data</div>
                        )}
                    </div>

                    {/* Tenant by Plan */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-800">Distribusi Plan</h3>
                                <p className="text-[11px] text-slate-400 mt-0.5">Tenant berdasarkan paket</p>
                            </div>
                        </div>
                        {tenantByPlanData.length > 0 ? (
                            <div className="space-y-3">
                                {tenantByPlanData.map((item, idx) => {
                                    const total = tenantByPlanData.reduce((s, i) => s + i.count, 0);
                                    const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                                    return (
                                        <div key={idx}>
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="h-3 w-3 rounded-sm" style={{ background: COLORS[idx % COLORS.length] }} />
                                                    <span className="text-xs font-medium text-slate-700">{item.plan || 'Free'}</span>
                                                </div>
                                                <span className="text-[11px] text-slate-500">{item.count} ({pct}%)</span>
                                            </div>
                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: COLORS[idx % COLORS.length] }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="h-40 flex items-center justify-center text-xs text-slate-400">No data</div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default Dashboard;
