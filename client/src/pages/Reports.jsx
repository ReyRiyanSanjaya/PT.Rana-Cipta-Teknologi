import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie, Legend, LineChart, Line, ComposedChart
} from 'recharts';
import {
    TrendingUp, TrendingDown, DollarSign, Package, Users,
    ArrowRight, Calendar, AlertCircle, ShoppingBag, CreditCard,
    Clock, Activity, ChevronDown, Filter, Download
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import api, { fetchAnalytics } from '../services/api';
import { formatCurrency } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import RealtimeBadge from '../components/RealtimeBadge';
import { io } from 'socket.io-client';

// --- Components ---

const InsightCard = ({ type, title, message }) => {
    const styles = {
        PEAK_HOUR: 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800',
        GROWTH_POSITIVE: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800',
        GROWTH_NEGATIVE: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800',
        HIGH_AOV: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800',
        default: 'bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
    };
    const activeStyle = styles[type] || styles.default;

    return (
        <div className={`p-4 rounded-xl border ${activeStyle} flex items-start gap-3 shadow-sm`}>
            <div className="mt-1">
                {type === 'PEAK_HOUR' && <Clock size={18} />}
                {type === 'GROWTH_POSITIVE' && <TrendingUp size={18} />}
                {type === 'GROWTH_NEGATIVE' && <TrendingDown size={18} />}
                {type === 'HIGH_AOV' && <ShoppingBag size={18} />}
                {!['PEAK_HOUR', 'GROWTH_POSITIVE', 'GROWTH_NEGATIVE', 'HIGH_AOV'].includes(type) && <Activity size={18} />}
            </div>
            <div>
                <h4 className="font-bold text-sm mb-1">{title}</h4>
                <p className="text-xs opacity-90 leading-relaxed">{message}</p>
            </div>
        </div>
    );
};

const StatCard = ({ title, value, trend, icon: Icon, color = "indigo", subtext }) => {
    const colorStyles = {
        indigo: "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
        emerald: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        amber: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
        violet: "bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400",
        rose: "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400",
        default: "bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400"
    };

    const selectedStyle = colorStyles[color] || colorStyles.default;

    return (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${selectedStyle}`}>
                    <Icon size={22} />
                </div>
                {trend !== undefined && (
                    <span className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${trend >= 0 ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                        {trend >= 0 ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
                        {Math.abs(trend).toFixed(1)}%
                    </span>
                )}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{value}</h3>
            {subtext && <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">{subtext}</p>}
        </div>
    );
};

const Reports = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [dateRange, setDateRange] = useState(() => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);
        return {
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0]
        };
    });
    const [activeTab, setActiveTab] = useState('overview'); // overview, sales, inventory, expenses

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetchAnalytics({
                startDate: dateRange.startDate,
                endDate: dateRange.endDate,
                storeId: user?.storeId
            });
            setData(res);
        } catch (error) {
            console.error("Failed to load reports:", error);
        } finally {
            setLoading(false);
        }
    }, [dateRange, user?.storeId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const socketRef = useRef(null);

    // Socket Connection for Realtime Updates
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        const baseUrl = api?.defaults?.baseURL || '';
        const socketUrl = baseUrl ? baseUrl.replace(/\/api\/?$/, '') : 'http://localhost:4000';

        socketRef.current = io(socketUrl, {
            auth: { token },
            transports: ['websocket', 'polling']
        });

        socketRef.current.on('transactions:created', () => {
            loadData(); // Auto refresh on new transaction
        });

        return () => {
            socketRef.current?.disconnect();
        };
    }, [loadData]);

    // Derived Data
    const summary = data?.summary || {};
    const growth = summary.growth || {};
    const insights = data?.insights || [];
    const hourlyData = data?.hourlyStats || [];
    const trendData = data?.trend || [];
    const topProducts = data?.topProducts || [];
    const categoryData = data?.categorySales || [];
    const paymentMethods = data?.paymentMethods || [];
    const expenses = data?.expenses || {};
    const expensePieData = Object.entries(expenses).map(([name, value]) => ({ name, value }));
    const lowStock = data?.lowStock || [];

    const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    const handlePresetChange = (days) => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - days);
        setDateRange({
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0]
        });
    };

    const handleExport = () => {
        if (!data) return;

        const csvRows = [];
        
        // 1. Summary Section
        csvRows.push(['--- REPORT SUMMARY ---']);
        csvRows.push(['Generated At', new Date().toLocaleString()]);
        csvRows.push(['Period', `${dateRange.startDate} to ${dateRange.endDate}`]);
        csvRows.push([]);
        csvRows.push(['Metric', 'Value']);
        csvRows.push(['Total Revenue', summary.revenue || 0]);
        csvRows.push(['Net Profit', summary.netProfit || 0]);
        csvRows.push(['Total Transactions', summary.totalTransactions || 0]);
        csvRows.push(['Average Order Value', summary.averageOrderValue || 0]);
        csvRows.push([]);

        // 2. Daily Trend
        if (trendData && trendData.length > 0) {
            csvRows.push(['--- DAILY TREND ---']);
            csvRows.push(['Date', 'Revenue']);
            trendData.forEach(row => {
                csvRows.push([row.date, row.sales || 0].join(','));
            });
            csvRows.push([]);
        }

        // 3. Top Products
        if (topProducts && topProducts.length > 0) {
            csvRows.push(['--- TOP PRODUCTS ---']);
            csvRows.push(['Product Name', 'SKU', 'Revenue', 'Quantity Sold']);
            topProducts.forEach(item => {
                csvRows.push([
                    `"${item.product.name.replace(/"/g, '""')}"`,
                    item.product.sku || '-',
                    item.revenue,
                    item.quantity
                ].join(','));
            });
        }

        const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvRows.join('\n'));
        const link = document.createElement("a");
        link.setAttribute("href", csvContent);
        link.setAttribute("download", `Rana_Report_${dateRange.startDate}_${dateRange.endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading && !data) {
        return (
            <DashboardLayout>
                <div className="flex h-screen items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #e2e8f0;
                    border-radius: 20px;
                }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #475569;
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-up {
                    animation: fadeInUp 0.5s ease-out forwards;
                }
            `}</style>
            <div className="max-w-7xl mx-auto space-y-8 pb-12 animate-fade-up">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Analitik PRO</span>
                            <RealtimeBadge />
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Analisis Bisnis</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Analisis mendalam tentang performa toko Anda.</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center bg-slate-50 dark:bg-slate-800 rounded-lg px-3 border border-slate-100 dark:border-slate-700">
                            <Calendar size={16} className="text-slate-400 dark:text-slate-500 mr-2" />
                            <select
                                className="bg-transparent border-none text-sm font-medium text-slate-700 dark:text-slate-300 focus:ring-0 cursor-pointer py-2"
                                onChange={(e) => handlePresetChange(Number(e.target.value))}
                                defaultValue="30"
                            >
                                <option value="7" className="dark:bg-slate-800">7 Hari Terakhir</option>
                                <option value="30" className="dark:bg-slate-800">30 Hari Terakhir</option>
                                <option value="90" className="dark:bg-slate-800">3 Bulan Terakhir</option>
                            </select>
                        </div>
                        <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700 hidden sm:block self-center"></div>
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={dateRange.startDate}
                                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                                className="border-none bg-slate-50 dark:bg-slate-800 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 focus:ring-0 py-2 px-3"
                            />
                            <span className="text-slate-300 dark:text-slate-600">-</span>
                            <input
                                type="date"
                                value={dateRange.endDate}
                                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                                className="border-none bg-slate-50 dark:bg-slate-800 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 focus:ring-0 py-2 px-3"
                            />
                        </div>
                        <button onClick={loadData} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-sm" title="Terapkan Filter">
                            <Filter size={16} />
                        </button>
                        <button onClick={handleExport} className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition shadow-sm flex items-center gap-2" title="Export Laporan CSV">
                            <Download size={16} />
                            <span className="hidden md:inline text-xs font-bold">Export</span>
                        </button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-1 overflow-x-auto">
                    {['overview', 'sales', 'inventory', 'expenses'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors relative whitespace-nowrap ${
                                activeTab === tab 
                                    ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' 
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                            }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            {activeTab === tab && (
                                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 dark:bg-indigo-400" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Overview Content */}
                {activeTab === 'overview' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* AI Insights Section */}
                        {insights.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {insights.map((insight, idx) => (
                                    <InsightCard key={idx} {...insight} />
                                ))}
                            </div>
                        )}

                        {/* Main Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatCard
                                title="Total Pendapatan"
                                value={formatCurrency(summary.revenue || 0)}
                                trend={growth.revenue}
                                icon={DollarSign}
                                color="indigo"
                                subtext="Penjualan kotor sebelum potongan"
                            />
                            <StatCard
                                title="Laba Bersih"
                                value={formatCurrency(summary.netProfit || 0)}
                                trend={growth.netProfit}
                                icon={TrendingUp}
                                color="emerald"
                                subtext="Pendapatan - Pengeluaran"
                            />
                            <StatCard
                                title="Transaksi"
                                value={summary.totalTransactions?.toLocaleString('id-ID') || 0}
                                trend={null}
                                icon={Package}
                                color="amber"
                                subtext="Total pesanan selesai"
                            />
                            <StatCard
                                title="Rata-rata Transaksi"
                                value={formatCurrency(summary.averageOrderValue || 0)}
                                trend={null}
                                icon={Users}
                                color="violet"
                                subtext="Rata-rata belanja per pelanggan"
                            />
                        </div>

                        {/* Revenue Trend (Full Width in Overview) */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Tren Pendapatan</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Performa penjualan harian</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={handleExport} className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition" title="Download Data">
                                        <Download size={18} />
                                    </button>
                                </div>
                            </div>
                            <div className="h-[350px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={trendData}>
                                        <defs>
                                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--grid-color)" />
                                        <XAxis
                                            dataKey="date"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: 'var(--chart-text)', fontSize: 12 }}
                                            tickFormatter={(str) => {
                                                const d = new Date(str);
                                                return `${d.getDate()}/${d.getMonth() + 1}`;
                                            }}
                                            dy={10}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: 'var(--chart-text)', fontSize: 12 }}
                                            tickFormatter={(val) => `${val / 1000}k`}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'var(--tooltip-bg)', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', color: 'var(--tooltip-text)' }}
                                            formatter={(val) => formatCurrency(val)}
                                            labelFormatter={(label) => new Date(label).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="sales"
                                            stroke="#6366f1"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorRevenue)"
                                            name="Revenue"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {/* Sales Content */}
                {activeTab === 'sales' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                         {/* Hourly Traffic */}
                         <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm col-span-1 lg:col-span-2">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Jam Sibuk</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Distribusi trafik per jam</p>
                            <div className="h-[350px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={hourlyData} margin={{ left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--grid-color)" />
                                        <XAxis 
                                            dataKey="hour" 
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: 'var(--chart-text)', fontSize: 12 }}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: 'var(--chart-text)', fontSize: 12 }}
                                        />
                                        <Tooltip
                                            cursor={{ fill: 'var(--grid-color)', opacity: 0.2 }}
                                            contentStyle={{ borderRadius: '8px', backgroundColor: 'var(--tooltip-bg)', border: 'none', color: 'var(--tooltip-text)' }}
                                            formatter={(val, name) => [name === 'revenue' ? formatCurrency(val) : val, name === 'revenue' ? 'Pendapatan' : 'Transaksi']}
                                        />
                                        <Bar dataKey="count" name="Transaksi" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="revenue" name="Pendapatan" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Category Distribution */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Penjualan per Kategori</h3>
                            <div className="h-[250px] w-full relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={categoryData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="revenue"
                                        >
                                            {categoryData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            formatter={(val) => formatCurrency(val)} 
                                            contentStyle={{ borderRadius: '8px', backgroundColor: 'var(--tooltip-bg)', border: 'none', color: 'var(--tooltip-text)' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="text-center">
                                        <span className="block text-2xl font-bold text-slate-800 dark:text-white">{categoryData.length}</span>
                                        <span className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider">Kategori</span>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar">
                                {categoryData.map((item, index) => (
                                    <div key={index} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                            <span className="text-slate-600 dark:text-slate-400">{item.category}</span>
                                        </div>
                                        <span className="font-medium text-slate-900 dark:text-white">{((item.revenue / summary.revenue) * 100).toFixed(1)}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Payment Methods */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Metode Pembayaran</h3>
                            <div className="space-y-4">
                                {paymentMethods.map((item, idx) => {
                                    const methodMap = {
                                        'CASH': 'Tunai',
                                        'QRIS': 'QRIS',
                                        'TRANSFER': 'Transfer Bank',
                                        'DEBIT': 'Kartu Debit',
                                        'CREDIT': 'Kartu Kredit',
                                        'UNKNOWN': 'Lainnya'
                                    };
                                    const label = methodMap[item.method] || item.method;
                                    
                                    return (
                                    <div key={idx} className="flex items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                                        <div className="p-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm mr-3 text-slate-600 dark:text-slate-400">
                                            <CreditCard size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center mb-1">
                                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 capitalize">{label}</p>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(item.total)}</p>
                                            </div>
                                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                                                <div
                                                    className="bg-emerald-500 h-1.5 rounded-full"
                                                    style={{ width: `${(item.total / summary.revenue) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                )})}
                            </div>
                        </div>
                    </div>
                )}

                {/* Inventory Content */}
                {activeTab === 'inventory' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Low Stock Warnings */}
                         {lowStock.length > 0 && (
                            <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20 rounded-2xl p-6">
                                <div className="flex items-center gap-2 mb-4 text-rose-700 dark:text-rose-400">
                                    <AlertCircle size={20} />
                                    <h3 className="font-bold text-lg">Peringatan Stok Menipis</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {lowStock.map((item, idx) => (
                                        <div key={idx} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-rose-100 dark:border-rose-900/20 shadow-sm flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold text-slate-800 dark:text-white">{item.product.name}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">SKU: {item.product.sku}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="inline-block bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 text-xs font-bold px-2 py-1 rounded-lg">
                                                    Sisa: {item.quantity}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Top Products */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Produk Terlaris</h3>
                            <div className="space-y-5">
                                {topProducts.length > 0 ? topProducts.map((item, idx) => (
                                    <div key={idx} className="group">
                                        <div className="flex justify-between items-center mb-2">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">{item.product.name}</p>
                                                <p className="text-xs text-slate-400 dark:text-slate-500">{item.product.sku || 'Tanpa SKU'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(item.revenue)}</p>
                                                <p className="text-xs text-slate-400 dark:text-slate-500">{item.quantity} terjual</p>
                                            </div>
                                        </div>
                                        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                            <div
                                                className="bg-indigo-500 h-1.5 rounded-full transition-all duration-1000"
                                                style={{ width: `${(item.revenue / topProducts[0].revenue) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-10 text-slate-400 dark:text-slate-500">Data produk tidak tersedia</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                 {/* Expenses Content (NEW) */}
                {activeTab === 'expenses' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Expense Trend */}
                        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Tren Pengeluaran</h3>
                            <div className="h-[350px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={trendData}>
                                        <defs>
                                            <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--grid-color)" />
                                        <XAxis
                                            dataKey="date"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: 'var(--chart-text)', fontSize: 12 }}
                                            tickFormatter={(str) => {
                                                const d = new Date(str);
                                                return `${d.getDate()}/${d.getMonth() + 1}`;
                                            }}
                                            dy={10}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: 'var(--chart-text)', fontSize: 12 }}
                                            tickFormatter={(val) => `${val / 1000}k`}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'var(--tooltip-bg)', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', color: 'var(--tooltip-text)' }}
                                            formatter={(val) => formatCurrency(val)}
                                            labelFormatter={(label) => new Date(label).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="expenses"
                                            stroke="#ef4444"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorExpenses)"
                                            name="Expenses"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                         {/* Expense Breakdown */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Rincian Pengeluaran</h3>
                            <div className="h-[250px] w-full relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={expensePieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {expensePieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            formatter={(val) => formatCurrency(val)} 
                                            contentStyle={{ borderRadius: '8px', backgroundColor: 'var(--tooltip-bg)', border: 'none', color: 'var(--tooltip-text)' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="text-center">
                                        <span className="block text-2xl font-bold text-slate-800 dark:text-white">{expensePieData.length}</span>
                                        <span className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider">Jenis</span>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar">
                                {expensePieData.map((item, index) => (
                                    <div key={index} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                            <span className="text-slate-600 dark:text-slate-400">{item.name}</span>
                                        </div>
                                        <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(item.value)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default Reports;