import React, { useEffect, useState, useMemo } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Legend, ReferenceLine
} from 'recharts';
import { 
    Calendar, Download, TrendingUp, TrendingDown, DollarSign, 
    Wallet, ShoppingBag, Activity, ArrowUpRight, ArrowDownRight,
    CreditCard, PieChart, ChevronDown, Check
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { fetchProfitLoss } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

// --- Components ---

const CustomDateInfo = ({ range, customStart, customEnd }) => {
    const getDateText = () => {
        const now = new Date();
        const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
        
        if (range === 'custom' && customStart && customEnd) {
            const start = new Date(customStart);
            const end = new Date(customEnd);
            return `${start.getDate()} ${months[start.getMonth()]} ${start.getFullYear()} - ${end.getDate()} ${months[end.getMonth()]} ${end.getFullYear()}`;
        }
        if (range === 'today') {
            return `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
        }
        if (range === 'this_week') {
            const day = now.getDay() || 7;
            const start = new Date(now);
            start.setDate(now.getDate() - day + 1);
            return `${start.getDate()} ${months[start.getMonth()]} - ${now.getDate()} ${months[now.getMonth()]}`;
        }
        if (range === 'this_month') {
            return `${months[now.getMonth()]} ${now.getFullYear()}`;
        }
        if (range === 'last_month') {
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            return `${months[lastMonth.getMonth()]} ${lastMonth.getFullYear()}`;
        }
        if (range === 'this_year') {
            return `Tahun ${now.getFullYear()}`;
        }
        return '';
    };

    return (
        <span className="text-xs text-slate-400 dark:text-slate-500 font-normal ml-2 hidden sm:inline-block">
            ({getDateText()})
        </span>
    );
};

const CustomDatePickerModal = ({ isOpen, onClose, onApply }) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-800"
            >
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Pilih Rentang Tanggal</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <ArrowDownRight className="rotate-45" size={24} />
                    </button>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tanggal Mulai</label>
                        <input 
                            type="date" 
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tanggal Selesai</label>
                        <input 
                            type="date" 
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                </div>

                <div className="flex gap-3 mt-8">
                    <button 
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        Batal
                    </button>
                    <button 
                        onClick={() => onApply(startDate, endDate)}
                        disabled={!startDate || !endDate}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Terapkan
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

const ModernDateDropdown = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);

    const options = [
        { id: 'today', label: 'Hari Ini', icon: Activity },
        { id: 'this_week', label: 'Minggu Ini', icon: Calendar },
        { id: 'this_month', label: 'Bulan Ini', icon: PieChart },
        { id: 'last_month', label: 'Bulan Lalu', icon: TrendingUp },
        { id: 'this_year', label: 'Tahun Ini', icon: Wallet },
        { id: 'custom', label: 'Kustom...', icon: Calendar },
    ];

    const selectedOption = options.find(o => o.id === value) || options.find(o => o.id === 'custom');

    return (
        <div className="relative z-20">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all shadow-sm hover:shadow-md min-w-[200px] justify-between group"
            >
                <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-indigo-500 group-hover:text-indigo-600 transition-colors" />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {selectedOption?.label}
                    </span>
                </div>
                <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                        <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="absolute top-full mt-2 right-0 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 p-2 z-30 overflow-hidden backdrop-blur-sm"
                        >
                            {options.map((option) => (
                                <button
                                    key={option.id}
                                    onClick={() => {
                                        onChange(option.id);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${
                                        value === option.id 
                                        ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium' 
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <option.icon size={16} className={value === option.id ? 'text-indigo-500' : 'text-slate-400'} />
                                        {option.label}
                                    </div>
                                    {value === option.id && <Check size={14} className="text-indigo-600" />}
                                </button>
                            ))}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

const CustomChartTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm p-4 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                    {label}
                </p>
                <div className="space-y-2">
                    {payload.map((entry, index) => (
                        <div key={index} className="flex items-center justify-between gap-6">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    {entry.name === 'revenue' ? 'Pendapatan' : 'Laba Bersih'}
                                </span>
                            </div>
                            <span className="text-sm font-bold font-mono" style={{ color: entry.color }}>
                                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(entry.value)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

const PnLCard = ({ title, value, subValue, type = 'neutral', icon: Icon }) => {
    const palette = {
        positive: { 
            text: 'text-emerald-600 dark:text-emerald-400', 
            bg: 'bg-emerald-50 dark:bg-emerald-500/10',
            icon: 'text-emerald-600 dark:text-emerald-400',
            border: 'border-emerald-100 dark:border-emerald-500/20'
        },
        negative: { 
            text: 'text-rose-600 dark:text-rose-400', 
            bg: 'bg-rose-50 dark:bg-rose-500/10',
            icon: 'text-rose-600 dark:text-rose-400',
            border: 'border-rose-100 dark:border-rose-500/20'
        },
        neutral: { 
            text: 'text-slate-900 dark:text-white', 
            bg: 'bg-slate-50 dark:bg-slate-800/50',
            icon: 'text-slate-600 dark:text-slate-400',
            border: 'border-slate-200 dark:border-slate-700'
        },
        primary: { 
            text: 'text-indigo-600 dark:text-indigo-400', 
            bg: 'bg-indigo-50 dark:bg-indigo-500/10',
            icon: 'text-indigo-600 dark:text-indigo-400',
            border: 'border-indigo-100 dark:border-indigo-500/20'
        }
    };
    const current = palette[type] || palette.neutral;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative overflow-hidden rounded-2xl border ${current.border} bg-white dark:bg-slate-900 p-6 shadow-sm hover:shadow-md transition-all duration-300`}
        >
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{title}</p>
                    <h3 className={`text-2xl font-bold ${current.text} tracking-tight`}>{value}</h3>
                </div>
                {Icon && (
                    <div className={`p-3 rounded-xl ${current.bg} ${current.icon}`}>
                        <Icon size={20} />
                    </div>
                )}
            </div>
            {subValue && (
                <div className="mt-4 flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${current.bg} ${current.text}`}>
                        {subValue}
                    </span>
                </div>
            )}
        </motion.div>
    );
};

const ProfitLoss = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('this_month');
    const [customStart, setCustomStart] = useState(null);
    const [customEnd, setCustomEnd] = useState(null);
    const [isCustomDateModalOpen, setIsCustomDateModalOpen] = useState(false);

    const [error, setError] = useState(null);

    const handleDateRangeChange = (val) => {
        if (val === 'custom') {
            setIsCustomDateModalOpen(true);
        } else {
            setDateRange(val);
        }
    };

    const handleCustomDateApply = (start, end) => {
        setCustomStart(start);
        setCustomEnd(end);
        setDateRange('custom');
        setIsCustomDateModalOpen(false);
    };

    useEffect(() => {
        const now = new Date();
        let start = new Date();
        let end = new Date();

        if (dateRange === 'custom') {
            if (customStart && customEnd) {
                // Parse local date strings (YYYY-MM-DD)
                // We want to ensure the start date begins at 00:00:00 and end date ends at 23:59:59 of that local day.
                // Creating Date objects from YYYY-MM-DD string assumes UTC usually, but we want local time behavior or strict string usage.
                // Let's use the string directly for the API if possible, but the API might expect ISO strings or similar.
                // Assuming API takes YYYY-MM-DD string, we can just use customStart and customEnd.
                // But for consistency with other logic which uses Date objects:
                start = new Date(customStart);
                start.setHours(0, 0, 0, 0);
                
                end = new Date(customEnd);
                end.setHours(23, 59, 59, 999);
            } else {
                return; // Wait for custom dates
            }
        } else if (dateRange === 'today') {
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
        } else if (dateRange === 'this_week') {
            const day = now.getDay() || 7; // Mon=1, Sun=7
            start.setDate(now.getDate() - day + 1);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
        } else if (dateRange === 'this_month') {
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            // end is already now
        } else if (dateRange === 'last_month') {
            start.setMonth(start.getMonth() - 1);
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            end.setDate(0); // Last day of previous month
            end.setHours(23, 59, 59, 999);
        } else if (dateRange === 'this_year') {
            start.setMonth(0, 1); // Jan 1st
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
        }

        // Helper to format date as YYYY-MM-DD in local time
        const formatDateLocal = (date) => {
            const offset = date.getTimezoneOffset();
            const localDate = new Date(date.getTime() - (offset * 60 * 1000));
            return localDate.toISOString().split('T')[0];
        };

        const startStr = formatDateLocal(start);
        const endStr = formatDateLocal(end);

        setLoading(true);
        setError(null);
        
        fetchProfitLoss(startStr, endStr).then(res => {
            if (res) {
                setData(res);
            } else {
                setError("Data tidak ditemukan");
            }
            setLoading(false);
        }).catch(err => {
            console.error("Failed to load PnL", err);
            setError("Gagal memuat data laporan. Silakan coba lagi.");
            setLoading(false);
        });
    }, [dateRange, customStart, customEnd]);

    const handlePrint = () => {
        window.print();
    };
    
    // Calculate Average Revenue for Reference Line
    const avgRevenue = useMemo(() => {
        if (!data || !data.chartData || data.chartData.length === 0) return 0;
        const total = data.chartData.reduce((acc, curr) => acc + (curr.revenue || 0), 0);
        return total / data.chartData.length;
    }, [data]);

    if (loading) return (
        <DashboardLayout>
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        </DashboardLayout>
    );

    if (error) return (
        <DashboardLayout>
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="text-rose-500 mb-4">
                    <Activity size={48} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{error}</h3>
                <button 
                    onClick={() => window.location.reload()} 
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    Muat Ulang
                </button>
            </div>
        </DashboardLayout>
    );

    if (!data) return null;

    const { pnl, chartData } = data;
    const formatCurrency = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

    return (
        <DashboardLayout>
            <style>{`
                @media print {
                    @page { margin: 1cm; size: landscape; }
                    aside, header, nav, .no-print { display: none !important; }
                    body { background: white !important; color: black !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    main, .print-content { width: 100% !important; margin: 0 !important; padding: 0 !important; max-width: none !important; }
                    .card-print { break-inside: avoid; border: 1px solid #e2e8f0 !important; }
                    .print-header { display: block !important; margin-bottom: 2rem; border-bottom: 2px solid #000; padding-bottom: 1rem; }
                    /* Ensure text is dark for printing */
                    * { color: black !important; text-shadow: none !important; }
                    .text-white { color: black !important; }
                    .bg-indigo-600 { background-color: #eee !important; color: black !important; }
                    /* Chart adjustments for print */
                    .recharts-wrapper { margin: 0 auto; }
                }
                .print-header { display: none; }
            `}</style>
            <CustomDatePickerModal 
                isOpen={isCustomDateModalOpen} 
                onClose={() => setIsCustomDateModalOpen(false)} 
                onApply={handleCustomDateApply} 
            />
            
            <div className="space-y-8 pb-10 print-content">
                {/* Print Header */}
                <div className="print-header">
                    <div className="flex justify-between items-end">
                        <div>
                            <h1 className="text-3xl font-bold uppercase tracking-wider mb-1">RANA POS</h1>
                            <p className="text-sm text-gray-600">Laporan Keuangan & Analisis Bisnis</p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-xl font-bold mb-1">LAPORAN LABA RUGI</h2>
                            <p className="text-sm">
                                Periode: <span className="font-semibold">{customStart ? `${customStart} s/d ${customEnd}` : dateRange}</span>
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                Dicetak pada: {new Date().toLocaleString('id-ID')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Laba & Rugi</h2>
                            <CustomDateInfo range={dateRange} customStart={customStart} customEnd={customEnd} />
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">Analisis lengkap kinerja keuangan bisnis Anda</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 no-print">
                        <ModernDateDropdown value={dateRange} onChange={handleDateRangeChange} />
                        <button 
                            onClick={handlePrint}
                            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 text-sm font-medium active:scale-95"
                        >
                            <Download size={18} />
                            <span>Ekspor Laporan</span>
                        </button>
                    </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <PnLCard
                        title="Total Pendapatan"
                        value={formatCurrency(pnl.revenue)}
                        subValue={`${pnl.transactionCount || 0} Transaksi`}
                        type="primary"
                        icon={Wallet}
                    />
                    <PnLCard
                        title="HPP (Modal)"
                        value={formatCurrency(pnl.cogs)}
                        subValue="Cost of Goods Sold"
                        type="neutral"
                        icon={ShoppingBag}
                    />
                    <PnLCard
                        title="Laba Kotor"
                        value={formatCurrency(pnl.grossProfit)}
                        subValue={`${pnl.margin}% Margin`}
                        type="positive"
                        icon={Activity}
                    />
                    <PnLCard
                        title="Laba Bersih"
                        value={formatCurrency(pnl.netProfit)}
                        subValue="Net Profit"
                        type="positive"
                        icon={TrendingUp}
                    />
                </div>

                {/* Chart Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Chart */}
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Tren Pendapatan</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Perbandingan pendapatan vs laba kotor</p>
                            </div>
                            <div className="flex gap-2">
                                <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Revenue
                                </span>
                                <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Profit
                                </span>
                            </div>
                        </div>
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ left: 10, right: 10, top: 10, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorProf" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" opacity={0.5} />
                                    <XAxis 
                                        dataKey="date" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 12, fill: '#64748b' }} 
                                        dy={10}
                                    />
                                    <YAxis 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 12, fill: '#64748b' }} 
                                        tickFormatter={(value) => `${value / 1000}k`}
                                    />
                                    <Tooltip content={<CustomChartTooltip />} />
                                    <ReferenceLine 
                                        y={avgRevenue} 
                                        stroke="#fbbf24" 
                                        strokeDasharray="3 3"
                                        label={{ 
                                            value: 'Rata-rata', 
                                            position: 'insideTopRight', 
                                            fill: '#fbbf24', 
                                            fontSize: 12 
                                        }} 
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="revenue" 
                                        stroke="#6366f1" 
                                        strokeWidth={3}
                                        fillOpacity={1} 
                                        fill="url(#colorRev)" 
                                        activeDot={{ r: 6, strokeWidth: 0, fill: '#6366f1' }}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="profit" 
                                        stroke="#10b981" 
                                        strokeWidth={3}
                                        fillOpacity={1} 
                                        fill="url(#colorProf)" 
                                        activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Summary / Insights Side Panel (Optional or just breakdown) */}
                    <div className="space-y-6">
                         <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4">Ringkasan Cepat</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
                                            <CreditCard size={18} />
                                        </div>
                                        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Rata-rata Transaksi</span>
                                    </div>
                                    <span className="font-bold text-slate-900 dark:text-white">
                                        {formatCurrency(pnl.revenue / (pnl.transactionCount || 1))}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400">
                                            <PieChart size={18} />
                                        </div>
                                        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Margin Laba</span>
                                    </div>
                                    <span className="font-bold text-slate-900 dark:text-white">{pnl.margin}%</span>
                                </div>
                            </div>
                         </div>
                    </div>
                </div>

                {/* Detailed Table */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                        <div>
                            <h3 className="font-bold text-xl text-slate-900 dark:text-white">Laporan Laba Rugi</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Detail rincian pendapatan dan pengeluaran</p>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold text-xs">
                                <tr>
                                    <th className="px-8 py-4">Kategori</th>
                                    <th className="px-8 py-4 text-right">Jumlah</th>
                                    <th className="px-8 py-4 text-right">% Pendapatan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                {/* Revenue Section */}
                                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="px-8 py-4 font-medium text-slate-900 dark:text-slate-200 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                        Penjualan Kotor
                                    </td>
                                    <td className="px-8 py-4 text-right font-medium text-slate-700 dark:text-slate-200">
                                        {formatCurrency(pnl.revenue + pnl.discountsGiven)}
                                    </td>
                                    <td className="px-8 py-4 text-right text-slate-500 dark:text-slate-400">100%</td>
                                </tr>
                                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="px-8 py-4 text-slate-600 dark:text-slate-400 pl-12">
                                        Diskon & Potongan
                                    </td>
                                    <td className="px-8 py-4 text-right text-rose-500 dark:text-rose-400">
                                        -{formatCurrency(pnl.discountsGiven)}
                                    </td>
                                    <td className="px-8 py-4 text-right text-slate-400">
                                        {(pnl.discountsGiven / (pnl.revenue + pnl.discountsGiven) * 100).toFixed(1)}%
                                    </td>
                                </tr>
                                <tr className="bg-indigo-50/30 dark:bg-indigo-900/10 font-semibold">
                                    <td className="px-8 py-4 text-indigo-900 dark:text-indigo-300">Total Pendapatan Bersih</td>
                                    <td className="px-8 py-4 text-right text-indigo-700 dark:text-indigo-400">
                                        {formatCurrency(pnl.revenue)}
                                    </td>
                                    <td className="px-8 py-4 text-right text-indigo-700 dark:text-indigo-400">98%</td>
                                </tr>

                                {/* COGS Section */}
                                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="px-8 py-4 font-medium text-slate-900 dark:text-slate-200 flex items-center gap-2 mt-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                        Harga Pokok Penjualan (HPP)
                                    </td>
                                    <td className="px-8 py-4 text-right text-rose-500 dark:text-rose-400 font-medium">
                                        -{formatCurrency(pnl.cogs)}
                                    </td>
                                    <td className="px-8 py-4 text-right text-slate-500 dark:text-slate-400">
                                        {(pnl.cogs / pnl.revenue * 100).toFixed(1)}%
                                    </td>
                                </tr>

                                {/* Gross Profit */}
                                <tr className="bg-emerald-50/30 dark:bg-emerald-900/10 font-bold border-t-2 border-emerald-100 dark:border-emerald-900/30">
                                    <td className="px-8 py-5 text-emerald-900 dark:text-emerald-300 text-lg">Laba Kotor</td>
                                    <td className="px-8 py-5 text-right text-emerald-700 dark:text-emerald-400 text-lg">
                                        {formatCurrency(pnl.grossProfit)}
                                    </td>
                                    <td className="px-8 py-5 text-right text-emerald-700 dark:text-emerald-400">
                                        {pnl.margin}%
                                    </td>
                                </tr>

                                {/* Expenses Section */}
                                <tr>
                                    <td colSpan="3" className="px-8 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-800/30">
                                        Pengeluaran Operasional
                                    </td>
                                </tr>
                                {Object.entries(pnl.expenseBreakdown || {}).length === 0 ? (
                                    <tr>
                                        <td colSpan="3" className="px-8 py-4 text-center text-slate-400 italic">
                                            Tidak ada pengeluaran tercatat
                                        </td>
                                    </tr>
                                ) : (
                                    Object.entries(pnl.expenseBreakdown || {}).map(([cat, amt]) => (
                                        <tr key={cat} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-8 py-3 text-slate-600 dark:text-slate-400 pl-12 border-l-2 border-transparent hover:border-rose-300 dark:hover:border-rose-700">
                                                {cat.replace('EXPENSE_', '')}
                                            </td>
                                            <td className="px-8 py-3 text-right text-rose-500 dark:text-rose-400">
                                                -{formatCurrency(amt)}
                                            </td>
                                            <td className="px-8 py-3 text-right text-slate-400">
                                                {(pnl.revenue > 0 ? (amt / pnl.revenue * 100) : 0).toFixed(1)}%
                                            </td>
                                        </tr>
                                    ))
                                )}
                                
                                <tr className="bg-slate-50 dark:bg-slate-800/50 font-medium">
                                    <td className="px-8 py-4 text-slate-700 dark:text-slate-300">Total Pengeluaran Operasional</td>
                                    <td className="px-8 py-4 text-right text-rose-600 dark:text-rose-400">
                                        -{formatCurrency(pnl.totalExpenses)}
                                    </td>
                                    <td className="px-8 py-4 text-right text-slate-500 dark:text-slate-400">
                                        {(pnl.revenue > 0 ? (pnl.totalExpenses / pnl.revenue * 100) : 0).toFixed(1)}%
                                    </td>
                                </tr>

                                {/* Net Profit */}
                                <tr className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg transform scale-[1.01] rounded-lg">
                                    <td className="px-8 py-6 text-xl font-bold flex items-center gap-3">
                                        <TrendingUp className="text-indigo-200" size={24} />
                                        Laba Bersih (Net Profit)
                                    </td>
                                    <td className="px-8 py-6 text-right text-2xl font-bold tracking-tight">
                                        {formatCurrency(pnl.netProfit)}
                                    </td>
                                    <td className="px-8 py-6 text-right font-bold text-indigo-100 text-lg">
                                        {(pnl.revenue > 0 ? (pnl.netProfit / pnl.revenue * 100) : 0).toFixed(1)}%
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default ProfitLoss;
