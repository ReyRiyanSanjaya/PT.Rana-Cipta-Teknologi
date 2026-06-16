import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Package, 
    Truck, 
    BarChart3, 
    ShieldCheck, 
    ArrowRight, 
    Zap,
    CheckCircle2,
    Globe,
    Lock,
    Users,
    ChevronRight,
    Star
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SpotlightCard from '../components/SpotlightCard';
import { useAuth } from '../context/AuthContext';

const DistributorInfo = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [showAllFeatures, setShowAllFeatures] = useState(false);
    
    // Distributor Client URL (default 5175 as seen in vite.config.ts)
    const DISTRIBUTOR_CLIENT_URL = 'http://localhost:5175';

    useEffect(() => {
        window.scrollTo(0, 0);
        
        // If already logged in as distributor, redirect to dashboard
        if (user?.role === 'DISTRIBUTOR') {
            window.location.href = DISTRIBUTOR_CLIENT_URL + '/dashboard';
        }
    }, [user]);

    const handleAction = (type) => {
        if (type === 'register') {
            window.location.href = `${DISTRIBUTOR_CLIENT_URL}/register`;
        } else {
            window.location.href = `${DISTRIBUTOR_CLIENT_URL}/login`;
        }
    };

    const features = [
        {
            icon: <Package className="w-8 h-8 text-indigo-500" />,
            title: "Manajemen Produk Grosir",
            description: "Kelola katalog produk wholesale Anda dengan mudah. Atur harga bertingkat (tier pricing) dan Minimum Order Quantity (MOQ) sesuai kebutuhan bisnis Anda."
        },
        {
            icon: <Truck className="w-8 h-8 text-blue-500" />,
            title: "Manajemen Pengiriman",
            description: "Pantau status pengiriman secara real-time. Kelola warehouse dan stok di berbagai lokasi untuk efisiensi logistik yang lebih baik."
        },
        {
            icon: <BarChart3 className="w-8 h-8 text-emerald-500" />,
            title: "Analitik Penjualan",
            description: "Dapatkan insight mendalam tentang performa produk dan tren pembelian merchant. Pantau pertumbuhan omzet Anda dengan dashboard yang intuitif."
        },
        {
            icon: <ShieldCheck className="w-8 h-8 text-amber-500" />,
            title: "Keamanan Transaksi",
            description: "Sistem pembayaran yang aman dan terverifikasi. Kelola invoice dan piutang merchant dengan sistem yang terintegrasi."
        },
        {
            icon: <Users className="w-8 h-8 text-purple-500" />,
            title: "Manajemen Pelanggan",
            description: "Kelola database merchant dan klasifikasikan mereka berdasarkan histori pembelian untuk program loyalitas yang lebih efektif."
        },
        {
            icon: <Zap className="w-8 h-8 text-yellow-500" />,
            title: "Promosi & Diskon",
            description: "Buat kampanye diskon, flash sale, atau bundling produk untuk meningkatkan volume penjualan grosir Anda dengan cepat."
        },
        {
            icon: <Lock className="w-8 h-8 text-rose-500" />,
            title: "Manajemen Kredit",
            description: "Atur batas kredit dan termin pembayaran (TOP) untuk setiap merchant guna menjaga cash flow bisnis Anda tetap sehat."
        },
        {
            icon: <Globe className="w-8 h-8 text-cyan-500" />,
            title: "Multi-Warehouse",
            description: "Integrasikan stok dari berbagai gudang cabang Anda dalam satu sistem terpusat untuk distribusi yang lebih merata."
        }
    ];

    const stats = [
        { label: "Merchant Terdaftar", value: "10,000+", icon: <Users size={20} /> },
        { label: "Transaksi Bulanan", value: "Rp 50M+", icon: <BarChart3 size={20} /> },
        { label: "Kota Terjangkau", value: "150+", icon: <Globe size={20} /> },
        { label: "Kepuasan Mitra", value: "4.9/5.0", icon: <Star size={20} /> },
    ];

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans selection:bg-blue-200 selection:text-blue-900 overflow-x-hidden transition-colors duration-300">
            <Navbar />
            
            {/* Soft background accents */}
            <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
                <div className="absolute -top-32 -left-24 w-[600px] h-[600px] bg-blue-100/60 dark:bg-blue-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-32 -right-24 w-[500px] h-[500px] bg-green-100/50 dark:bg-green-500/10 rounded-full blur-3xl" />
            </div>

            <main className="relative z-10">
                {/* Hero Section */}
                <section className="relative pt-32 pb-20 px-6">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid lg:grid-cols-2 gap-16 items-center">
                            <motion.div
                                initial={{ opacity: 0, x: -30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                            >
                                <motion.span 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 text-blue-700 dark:text-blue-300 text-sm font-semibold mb-6"
                                >
                                    <Zap size={16} className="animate-pulse" />
                                    Ekosistem B2B Rana Terintegrasi
                                </motion.span>
                                
                                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-8 leading-[1.1]">
                                    Digitalisasi <br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-500">
                                        Rantai Pasok
                                    </span> <br />
                                    Bisnis Anda
                                </h1>
                                
                                <p className="text-xl text-slate-500 dark:text-slate-400 max-w-xl mb-12 leading-relaxed">
                                    Hubungkan produk grosir Anda dengan ribuan merchant UMKM dalam satu platform. 
                                    Kelola pesanan, stok, dan pengiriman dengan sistem B2B yang canggih dan transparan.
                                </p>

                                <div className="flex flex-col sm:flex-row items-center gap-4">
                                    <button 
                                        onClick={() => handleAction('register')}
                                        className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(31,95,191,0.3)] hover:shadow-[0_15px_40px_rgba(31,95,191,0.45)] hover:-translate-y-0.5 group relative overflow-hidden"
                                    >
                                        <span className="relative z-10 flex items-center gap-2">
                                            Daftar Sekarang
                                            <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                                        </span>
                                        <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                    </button>
                                    <button 
                                        onClick={() => handleAction('login')}
                                        className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-bold text-lg transition-all hover:border-blue-300 hover:text-blue-700 dark:hover:text-blue-400 flex items-center justify-center gap-2"
                                    >
                                        <Lock size={18} className="text-slate-400" />
                                        Login Portal
                                    </button>
                                </div>

                                {/* Quick Stats */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16">
                                    {stats.map((stat, i) => (
                                        <motion.div 
                                            key={i}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.4 + i * 0.1 }}
                                            className="flex flex-col gap-1"
                                        >
                                            <div className="text-blue-600 dark:text-blue-400 mb-1">{stat.icon}</div>
                                            <div className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-500 font-medium uppercase tracking-wider">{stat.label}</div>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, rotate: 5 }}
                                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className="relative hidden lg:block"
                            >
                                <div className="absolute -inset-4 bg-gradient-to-tr from-blue-200/50 to-green-200/40 dark:from-blue-500/20 dark:to-green-500/15 rounded-[3rem] blur-2xl" />
                                <div className="relative rounded-[2.5rem] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-2xl shadow-blue-900/10 overflow-hidden group">
                                    <img 
                                        src="/dashboard_red_theme.png" 
                                        alt="Distributor Portal" 
                                        className="rounded-[2rem] w-full h-auto transition-transform duration-700 transform group-hover:scale-[1.02]"
                                    />
                                    {/* UI Overlays */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                                        <div className="w-20 h-20 rounded-full bg-blue-600/90 backdrop-blur-md flex items-center justify-center text-white shadow-2xl shadow-blue-600/40">
                                            <Zap size={32} />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section className="py-28 px-6">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
                            <div className="max-w-2xl">
                                <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-6 tracking-tight">
                                    Fitur Unggulan <br />
                                    <span className="text-slate-400 dark:text-slate-500 text-2xl md:text-3xl">Didesain khusus untuk efisiensi B2B</span>
                                </h2>
                                <p className="text-slate-500 dark:text-slate-400 text-lg">
                                    Kelola seluruh operasional bisnis distribusi Anda mulai dari manajemen stok hingga analitik pembayaran dalam satu platform terpadu.
                                </p>
                            </div>
                            <div className="hidden md:block">
                                <button 
                                    onClick={() => setShowAllFeatures(!showAllFeatures)}
                                    className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold hover:text-blue-700 dark:hover:text-blue-300 transition-colors group"
                                >
                                    {showAllFeatures ? 'Sembunyikan Fitur' : 'Lihat Semua Fitur'}
                                    <ChevronRight className={`group-hover:translate-x-1 transition-transform ${showAllFeatures ? 'rotate-90' : ''}`} />
                                </button>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                            <AnimatePresence>
                                {(showAllFeatures ? features : features.slice(0, 4)).map((feature, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.5, delay: index * 0.1 }}
                                    >
                                        <SpotlightCard className="p-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm hover:shadow-lg transition-all group h-full">
                                            <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-500/10 rounded-2xl w-fit group-hover:scale-110 transition-transform duration-500">
                                                {feature.icon}
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{feature.title}</h3>
                                            <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-sm">
                                                {feature.description}
                                            </p>
                                        </SpotlightCard>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>

                        {/* Mobile Toggle Button */}
                        <div className="mt-10 md:hidden flex justify-center">
                            <button 
                                onClick={() => setShowAllFeatures(!showAllFeatures)}
                                className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-blue-600 dark:text-blue-400 font-bold hover:border-blue-300 transition-all"
                            >
                                {showAllFeatures ? 'Sembunyikan Fitur' : 'Lihat Semua Fitur'}
                                <ChevronRight className={`transition-transform ${showAllFeatures ? 'rotate-90' : ''}`} />
                            </button>
                        </div>
                    </div>
                </section>

                {/* Dashboard Experience */}
                <section className="py-28 px-6 bg-slate-50 dark:bg-slate-900 border-y border-slate-100 dark:border-slate-800 relative overflow-hidden">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid lg:grid-cols-2 gap-20 items-center">
                            <div className="order-2 lg:order-1">
                                <div className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-xl shadow-blue-900/5">
                                    <img 
                                        src="/dashboard_red_theme.png" 
                                        alt="Experience" 
                                        className="w-full h-auto rounded-2xl hover:scale-[1.03] transition-transform duration-[2000ms]"
                                    />
                                </div>
                            </div>
                            <div className="order-1 lg:order-2">
                                <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-8 tracking-tight">Dashboard Modern & Intuitif</h2>
                                <p className="text-lg text-slate-500 dark:text-slate-400 mb-10 leading-relaxed">
                                    Pantau seluruh aktivitas bisnis Anda dalam satu layar. Dashboard distributor kami dirancang untuk memberikan informasi yang paling relevan dengan cepat dan akurat.
                                </p>
                                <div className="space-y-6">
                                    {[
                                        { title: "Real-time Monitoring", desc: "Pantau omzet dan pertumbuhan harian secara langsung." },
                                        { title: "Smart Inventory", desc: "Notifikasi otomatis saat stok produk populer mulai menipis." },
                                        { title: "Automated Shipping", desc: "Kelola label pengiriman dan status kurir dalam satu klik." }
                                    ].map((item, i) => (
                                        <div key={i} className="flex gap-4 group">
                                            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                                                <CheckCircle2 size={24} />
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{item.title}</h4>
                                                <p className="text-slate-500 dark:text-slate-400 text-sm">{item.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-28 px-6 relative overflow-hidden">
                    <div className="max-w-5xl mx-auto bg-gradient-to-br from-blue-600 to-blue-800 rounded-[3rem] p-12 md:p-24 text-center relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[100px] -mr-48 -mt-48 group-hover:scale-110 transition-transform duration-1000" />
                        <div className="absolute bottom-0 left-0 w-96 h-96 bg-green-400/20 rounded-full blur-[100px] -ml-48 -mb-48 group-hover:scale-110 transition-transform duration-1000" />
                        
                        <div className="relative z-10">
                            <h2 className="text-4xl md:text-6xl font-extrabold text-white mb-8">Siap Menjadi Distributor Rana?</h2>
                            <p className="text-blue-100 text-xl mb-12 max-w-2xl mx-auto leading-relaxed">
                                Bergabunglah dengan ekosistem B2B kami dan mulai transformasi digital bisnis distribusi Anda hari ini.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                                <button 
                                    onClick={() => handleAction('register')}
                                    className="w-full sm:w-auto px-12 py-5 bg-white text-blue-700 rounded-2xl font-black text-xl hover:bg-blue-50 hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-black/20"
                                >
                                    Daftar Sekarang
                                </button>
                                <button 
                                    onClick={() => navigate('/contact')}
                                    className="w-full sm:w-auto px-12 py-5 bg-white/10 border-2 border-white/30 text-white rounded-2xl font-bold text-lg hover:bg-white/20 transition-all backdrop-blur-md"
                                >
                                    Hubungi Tim Sales
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
};

export default DistributorInfo;
