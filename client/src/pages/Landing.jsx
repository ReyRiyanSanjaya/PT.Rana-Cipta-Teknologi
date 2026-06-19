import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion } from 'framer-motion';
import { ArrowRight, TrendingUp, Users, Smartphone, ShieldCheck, Zap, BarChart3, PieChart, Sparkles, Star, Check, Store, Box, CreditCard, RefreshCw, Cloud, Package } from 'lucide-react';
import Navbar from '../components/Navbar';
import SpotlightCard from '../components/SpotlightCard';
import Footer from '../components/Footer';
import useCms from '../hooks/useCms';
import usePageMeta from '../hooks/usePageMeta';

gsap.registerPlugin(ScrollTrigger);

const GrowthSimulator = () => {
    const [monthlySales, setMonthlySales] = useState(50000000);
    const [growthRate, setGrowthRate] = useState(20);

    const projectedSales = monthlySales * (1 + growthRate / 100);
    const annualExtra = (projectedSales - monthlySales) * 12;

    return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-8 shadow-xl shadow-blue-900/5">
            <div className="mb-8">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Simulasi Pertumbuhan Bisnis</h3>
                <p className="text-slate-500 dark:text-slate-400">Lihat potensi kenaikan omzet Anda bersama Rana.</p>
            </div>

            <div className="space-y-6 mb-8">
                <div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-300 mb-2">
                        <span>Omzet Bulanan Saat Ini</span>
                        <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold">Rp {monthlySales.toLocaleString('id-ID')}</span>
                    </div>
                    <input 
                        type="range" 
                        min="10000000" 
                        max="500000000" 
                        step="1000000" 
                        value={monthlySales} 
                        onChange={(e) => setMonthlySales(Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                </div>
                <div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-300 mb-2">
                        <span>Optimasi Rana (Efisiensi & Stok)</span>
                        <span className="font-mono text-green-600 dark:text-green-400 font-semibold">+{growthRate}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-lg overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-600 to-green-500 h-full transition-all duration-500" style={{ width: `${growthRate}%` }}></div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 p-4 rounded-xl">
                    <div className="text-slate-500 dark:text-slate-400 text-sm mb-1">Proyeksi Bulan Depan</div>
                    <div className="text-xl font-bold text-slate-900 dark:text-white">Rp {projectedSales.toLocaleString('id-ID')}</div>
                </div>
                <div className="bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 p-4 rounded-xl">
                    <div className="text-slate-500 dark:text-slate-400 text-sm mb-1">Potensi Tambahan / Tahun</div>
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">+Rp {annualExtra.toLocaleString('id-ID')}</div>
                </div>
            </div>
        </div>
    );
};

const Landing = () => {
    const { cmsContent } = useCms();
    usePageMeta({
        title: 'RanaPOS | POS modern dan analytics untuk UMKM',
        description: 'Kelola penjualan, stok, dan keuangan bisnis Anda dengan RanaPOS. Sistem kasir berbasis cloud dengan laporan otomatis dan insight pertumbuhan.'
    });
    const headerRef = useRef(null);
    const coreValuesRef = useRef(null);
    const downloadRef = useRef(null);
    const fallbackTestimonials = [
        {
            initial: 'A',
            name: 'Andi',
            role: 'Owner kedai kopi di Bandung',
            quote: 'Setelah pakai Rana, saya bisa lihat omzet harian dan stok bahan baku tanpa harus tanya kasir satu per satu. Keputusan buka cabang kedua jadi jauh lebih berani karena datanya jelas.'
        },
        {
            initial: 'S',
            name: 'Siti',
            role: 'Pemilik minimarket keluarga',
            quote: 'Fitur notifikasi stok menipis sangat membantu. Dulu sering kehabisan barang laris, sekarang lebih jarang sekali terjadi dan pelanggan jadi tidak kecewa.'
        },
        {
            initial: 'R',
            name: 'Rama',
            role: 'Owner barbershop di Jakarta',
            quote: 'Laporan harian dan shift kasir membuat saya bisa memantau bisnis walaupun sering di luar kota. Tim tetap jalan, saya tetap pegang kendali.'
        }
    ];
    const [activeTestimonial, setActiveTestimonial] = useState(0);
    const [visibleCount, setVisibleCount] = useState(1);

    const testimonials = useMemo(() => {
        const raw = Array.isArray(cmsContent.CMS_TESTIMONIALS) ? cmsContent.CMS_TESTIMONIALS : [];
        const mapped = raw
            .map(item => {
                const name = typeof item.name === 'string' ? item.name : '';
                const role = typeof item.role === 'string' ? item.role : '';
                const quote = typeof item.quote === 'string' ? item.quote : '';
                const initialSource = typeof item.initial === 'string' && item.initial.length > 0
                    ? item.initial
                    : (name ? name.charAt(0) : '');
                const initial = initialSource.toUpperCase();
                return {
                    name,
                    role,
                    quote,
                    initial
                };
            })
            .filter(item => item.name && item.quote);

        return mapped.length > 0 ? mapped : fallbackTestimonials;
    }, [cmsContent.CMS_TESTIMONIALS]);

    const visibleTestimonials = useMemo(() => {
        if (!testimonials.length || visibleCount <= 0) return [];
        const result = [];
        for (let i = 0; i < Math.min(visibleCount, testimonials.length); i += 1) {
            const index = (activeTestimonial + i) % testimonials.length;
            result.push({
                item: testimonials[index],
                index
            });
        }
        return result;
    }, [testimonials, activeTestimonial, visibleCount]);

    useEffect(() => {
        // Hero Animation
        gsap.fromTo(headerRef.current.children,
            { y: 50, opacity: 0 },
            { y: 0, opacity: 1, stagger: 0.2, duration: 1, ease: 'power3.out', delay: 0.3 }
        );

        // Core Values Animation
        gsap.fromTo(coreValuesRef.current.children,
            { y: 100, opacity: 0 },
            {
                y: 0, opacity: 1, stagger: 0.1, duration: 0.8, ease: 'back.out(1.7)',
                scrollTrigger: {
                    trigger: coreValuesRef.current,
                    start: 'top 80%',
                }
            }
        );

        // Download Section Animation
        gsap.fromTo(downloadRef.current,
            { scale: 0.9, opacity: 0 },
            {
                scale: 1, opacity: 1, duration: 0.8, ease: 'power2.out',
                scrollTrigger: {
                    trigger: downloadRef.current,
                    start: 'top 75%',
                }
            }
        );

    }, []);

    useEffect(() => {
        const updateVisibleCount = () => {
            const width = window.innerWidth;
            if (width >= 1024) {
                setVisibleCount(3);
            } else if (width >= 640) {
                setVisibleCount(2);
            } else {
                setVisibleCount(1);
            }
        };

        updateVisibleCount();
        window.addEventListener('resize', updateVisibleCount);
        return () => window.removeEventListener('resize', updateVisibleCount);
    }, []);

    useEffect(() => {
        if (!testimonials.length) return;
        const interval = setInterval(() => {
            setActiveTestimonial(prev => (prev + 1) % testimonials.length);
        }, 7000);
        return () => clearInterval(interval);
    }, [testimonials.length]);

    const industries = [
        { emoji: '🍔', title: 'Restoran & Cafe', desc: 'POS + Kitchen Display System' },
        { emoji: '🛒', title: 'Retail & Toko', desc: 'Smart Inventory Management' },
        { emoji: '💇', title: 'Salon & Spa', desc: 'Booking & Komisi Staff' },
        { emoji: '🏪', title: 'Minimarket', desc: 'Barcode Scanner Ready' },
    ];

    const features = [
        { icon: BarChart3, title: 'Dashboard Analytics', desc: 'Real-time insights' },
        { icon: Box, title: 'Inventory Smart', desc: 'Auto tracking' },
        { icon: PieChart, title: 'Laporan Keuangan', desc: 'Laporan lengkap' },
        { icon: Users, title: 'Multi-User', desc: 'Manajemen role' },
        { icon: CreditCard, title: 'Multi Pembayaran', desc: 'Semua metode bayar' },
        { icon: Store, title: 'Database Pelanggan', desc: 'Program loyalti' },
        { icon: RefreshCw, title: 'Sync Real-time', desc: 'Antar perangkat' },
        { icon: Cloud, title: 'Cloud Backup', desc: 'Auto sinkronisasi' },
    ];

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans selection:bg-blue-200 selection:text-blue-900 overflow-x-hidden transition-colors duration-300">
            <Navbar />

            {/* ===== HERO ===== */}
            <header className="relative overflow-hidden pt-36 pb-24 px-4">
                {/* Soft background accents */}
                <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                    <div className="absolute -top-32 -right-24 w-[600px] h-[600px] bg-blue-100/60 dark:bg-blue-500/10 rounded-full blur-3xl" />
                    <div className="absolute top-40 -left-32 w-[500px] h-[500px] bg-green-100/50 dark:bg-green-500/10 rounded-full blur-3xl" />
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:64px_64px] opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
                </div>

                <div className="relative max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
                    {/* Left: copy */}
                    <div ref={headerRef} className="text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                            <span className="text-blue-700 dark:text-blue-300 font-semibold text-xs tracking-wide uppercase">Solusi Kasir Cerdas untuk UMKM</span>
                        </div>

                        <h1 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight leading-[1.1] text-slate-900 dark:text-white">
                            Kelola Bisnis Lebih <br className="hidden md:block" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-500">
                                Mudah & Cerdas
                            </span>
                        </h1>

                        <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                            Kelola penjualan, stok, laporan keuangan, dan karyawan dalam satu aplikasi yang powerful dan mudah digunakan.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                            <Link to="/register" className="group px-7 py-3.5 rounded-xl font-bold text-base bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-[0_10px_30px_rgba(31,95,191,0.3)] hover:shadow-[0_15px_40px_rgba(31,95,191,0.45)] transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2">
                                Coba Gratis 14 Hari
                                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link to="/features" className="px-7 py-3.5 rounded-xl font-bold text-base bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-300 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 transition-all">
                                Lihat Fitur
                            </Link>
                        </div>

                        <div className="flex items-center gap-6 justify-center lg:justify-start mt-8">
                            <div className="flex items-center gap-2">
                                <div className="flex">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} size={16} className="text-amber-400 fill-amber-400" />
                                    ))}
                                </div>
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">4.9/5 Rating</span>
                            </div>
                            <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />
                            <span className="text-sm text-slate-500 dark:text-slate-400"><span className="font-semibold text-slate-700 dark:text-slate-200">10.000+</span> Pengguna</span>
                        </div>
                    </div>

                    {/* Right: dashboard mockup card */}
                    <div className="relative">
                        <div className="absolute -inset-4 bg-gradient-to-tr from-blue-200/50 to-green-200/40 dark:from-blue-500/20 dark:to-green-500/15 rounded-[2.5rem] blur-2xl" />
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.3 }}
                            className="relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-2xl shadow-blue-900/10 overflow-hidden"
                        >
                            <img
                                src="/dashboard_red_theme.png"
                                alt="Dashboard Rana"
                                className="w-full h-auto"
                            />
                        </motion.div>
                        {/* Floating stat card */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5, delay: 0.8 }}
                            className="absolute -bottom-5 -left-3 md:left-6 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-4 flex items-center gap-3"
                        >
                            <div className="w-11 h-11 rounded-xl bg-green-100 dark:bg-green-500/15 flex items-center justify-center text-green-600 dark:text-green-400">
                                <TrendingUp size={22} />
                            </div>
                            <div>
                                <div className="text-xs text-slate-400">Penjualan Hari Ini</div>
                                <div className="text-lg font-bold text-slate-900 dark:text-white">Rp 4.5 Juta</div>
                                <div className="text-xs text-green-600 dark:text-green-400 font-medium">↑ 12% dari kemarin</div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </header>

            {/* ===== STATS BAR ===== */}
            <section className="relative z-10 px-4 -mt-2 pb-8">
                <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { value: '10.000+', label: 'Merchant Aktif' },
                        { value: '+35%', label: 'Pertumbuhan Omzet' },
                        { value: '99.99%', label: 'Uptime Terjamin' },
                        { value: '24/7', label: 'Support Siap Bantu' },
                    ].map((s, i) => (
                        <div key={i} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 text-center shadow-sm hover:shadow-md transition-shadow">
                            <div className="text-2xl md:text-3xl font-extrabold text-blue-700 dark:text-blue-400">{s.value}</div>
                            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">{s.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ===== FEATURES GRID ===== */}
            <section className="relative z-10 py-20 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center max-w-2xl mx-auto mb-14">
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 text-blue-700 dark:text-blue-300 text-sm font-semibold mb-4">
                            <Sparkles size={15} /> Fitur Powerful & Lengkap
                        </span>
                        <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">
                            Semua Fitur yang Anda Butuhkan
                        </h2>
                        <p className="text-lg text-slate-500 dark:text-slate-400">
                            Platform kasir all-in-one yang dirancang khusus untuk berbagai jenis bisnis Anda.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                        {features.map((f, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: i * 0.05 }}
                                className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-900/5 transition-all duration-300"
                            >
                                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <f.icon size={24} />
                                </div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">{f.title}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{f.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ===== INDUSTRIES ===== */}
            <section className="relative z-10 py-20 px-4 bg-slate-50 dark:bg-slate-900 border-y border-slate-100 dark:border-slate-800">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center max-w-2xl mx-auto mb-14">
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 text-green-700 dark:text-green-300 text-sm font-semibold mb-4">
                            <Store size={15} /> Untuk Semua Bisnis
                        </span>
                        <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">
                            Cocok untuk Berbagai Industri
                        </h2>
                        <p className="text-lg text-slate-500 dark:text-slate-400">
                            Dari cafe, retail, salon, hingga minimarket. Rana dapat disesuaikan dengan kebutuhan bisnis Anda.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                        {industries.map((ind, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: i * 0.08 }}
                                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-7 text-center hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                            >
                                <div className="text-4xl mb-4">{ind.emoji}</div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{ind.title}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{ind.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ===== DISTRIBUTOR PROMO ===== */}
            <section className="relative z-10 py-20 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-[2.5rem] p-8 md:p-14 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
                        <div className="absolute bottom-0 left-0 w-72 h-72 bg-green-400/20 rounded-full blur-3xl -ml-20 -mb-20" />
                        <div className="grid lg:grid-cols-2 gap-10 items-center relative z-10">
                            <div>
                                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 border border-white/20 text-white text-sm font-medium mb-5">
                                    <Package size={16} /> Baru: Rana for Distributors
                                </span>
                                <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-5 leading-tight">
                                    Apakah Anda Distributor atau Supplier?
                                </h2>
                                <p className="text-lg text-blue-100 mb-8 leading-relaxed">
                                    Digitalisasikan bisnis distribusi Anda. Jangkau ribuan merchant UMKM, kelola stok wholesale, dan terima pesanan besar secara otomatis.
                                </p>
                                <div className="flex flex-wrap gap-4">
                                    <Link to="/distributor" className="px-7 py-3.5 bg-white text-blue-700 rounded-xl font-bold transition-all hover:bg-blue-50 flex items-center gap-2 group">
                                        Pelajari Lebih Lanjut
                                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                    <a href="/distributor/register" className="px-7 py-3.5 bg-white/10 border border-white/30 text-white rounded-xl font-bold transition-all hover:bg-white/20">
                                        Daftar Distributor
                                    </a>
                                </div>
                            </div>
                            <div className="relative">
                                <div className="relative bg-white/10 border border-white/20 rounded-3xl p-3 backdrop-blur-sm overflow-hidden">
                                    <img src="/dashboard_red_theme.png" alt="Distributor Portal" className="rounded-2xl w-full h-auto" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ===== CORE VALUES ===== */}
            <section className="relative z-10 py-20 px-4 bg-slate-50 dark:bg-slate-900 border-y border-slate-100 dark:border-slate-800">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center max-w-2xl mx-auto mb-14">
                        <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">Fondasi Kesuksesan Bisnis Modern</h2>
                        <p className="text-lg text-slate-500 dark:text-slate-400">Dibangun untuk pertumbuhan jangka panjang bisnis Anda.</p>
                    </div>
                    <div ref={coreValuesRef} className="grid md:grid-cols-3 gap-6 text-left">
                        {(cmsContent.CMS_CORE_VALUES && cmsContent.CMS_CORE_VALUES.length > 0) ? (
                            cmsContent.CMS_CORE_VALUES.map((val, idx) => (
                                <div key={idx} className="p-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                                    <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center mb-6 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        <TrendingUp size={28} />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{val.title}</h3>
                                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{val.desc}</p>
                                </div>
                            ))
                        ) : (
                            <>
                                <div className="p-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                                    <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center mb-6 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        <ShieldCheck size={28} />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Keamanan Terjamin</h3>
                                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed">Data bisnis Anda dilindungi dengan enkripsi tingkat lanjut dan backup otomatis.</p>
                                </div>
                                <div className="p-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                                    <div className="w-14 h-14 rounded-2xl bg-green-50 dark:bg-green-500/10 flex items-center justify-center mb-6 text-green-600 dark:text-green-400 group-hover:bg-green-600 group-hover:text-white transition-colors">
                                        <TrendingUp size={28} />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Pertumbuhan Berkelanjutan</h3>
                                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed">Dari satu gerai kecil hingga waralaba nasional, Rana siap menskalakan bisnis Anda.</p>
                                </div>
                                <div className="p-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                                    <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center mb-6 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        <Users size={28} />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Customer Centric</h3>
                                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed">Fitur CRM mendalam membantu Anda memahami dan melayani pelanggan lebih personal.</p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </section>

            {/* ===== AI / GROWTH SIMULATOR ===== */}
            <section className="relative z-10 py-20 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col lg:flex-row items-center gap-14">
                        <div className="w-full lg:w-1/2 space-y-7">
                            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 text-blue-700 dark:text-blue-300 text-sm font-semibold">
                                <Sparkles size={16} /> Teknologi Rana Intelligence™
                            </span>
                            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white leading-tight">
                                Kembangkan Bisnis dengan Data Cerdas
                            </h2>
                            <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed">
                                Jangan hanya mencatat transaksi. Rana menganalisis pola penjualan, memprediksi tren, dan memberikan saran actionable untuk meningkatkan profitabilitas bisnis Anda.
                            </p>
                            <div className="space-y-3">
                                {[
                                    { icon: BarChart3, title: 'Prediksi Penjualan', desc: 'Forecast omzet harian dengan akurasi tinggi.' },
                                    { icon: PieChart, title: 'Analisis Pelanggan', desc: 'Pahami preferensi dan kebiasaan belanja pelanggan.' },
                                    { icon: Zap, title: 'Restock Pintar', desc: 'Notifikasi otomatis saat stok menipis berdasarkan tren.' }
                                ].map((item, idx) => (
                                    <div key={idx} className="flex items-start gap-4 p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-500/40 hover:shadow-sm transition-all">
                                        <div className="bg-blue-50 dark:bg-blue-500/10 p-3 rounded-lg text-blue-600 dark:text-blue-400 shrink-0">
                                            <item.icon size={22} />
                                        </div>
                                        <div>
                                            <h4 className="text-base font-bold text-slate-900 dark:text-white">{item.title}</h4>
                                            <p className="text-slate-500 dark:text-slate-400 text-sm">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="w-full lg:w-1/2">
                            <GrowthSimulator />
                        </div>
                    </div>
                </div>
            </section>

            {/* ===== TESTIMONIALS ===== */}
            <section className="relative z-10 py-20 px-4 bg-slate-50 dark:bg-slate-900 border-y border-slate-100 dark:border-slate-800">
                <div className="max-w-6xl mx-auto text-center mb-12">
                    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 text-amber-700 dark:text-amber-300 text-sm font-semibold mb-4">
                        <Star size={15} className="fill-amber-500 text-amber-500" /> Dipercaya 10.000+ Bisnis
                    </span>
                    <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">
                        Apa Kata Pengguna Rana
                    </h2>
                    <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
                        Dari kedai kopi kecil hingga jaringan minimarket, Rana membantu pemilik usaha mengambil keputusan dengan data yang jelas.
                    </p>
                </div>
                <div className="max-w-6xl mx-auto">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {visibleTestimonials.map(({ item, index }) => (
                            <motion.div
                                key={`${item.name}-${index}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4 }}
                                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-7 flex flex-col gap-4 shadow-sm"
                            >
                                <div className="flex gap-1">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} size={16} className="text-amber-400 fill-amber-400" />
                                    ))}
                                </div>
                                <p className="text-slate-600 dark:text-slate-300 text-sm md:text-base leading-relaxed flex-1">
                                    "{item.quote}"
                                </p>
                                <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-600 to-green-500 flex items-center justify-center text-white font-bold">
                                        {item.initial}
                                    </div>
                                    <div className="text-left">
                                        <div className="font-semibold text-slate-900 dark:text-white text-sm">{item.name}</div>
                                        {item.role ? (
                                            <div className="text-xs text-slate-400">{item.role}</div>
                                        ) : null}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                    <div className="flex justify-center gap-2 mt-8">
                        {testimonials.map((item, index) => (
                            <button
                                key={item.name}
                                type="button"
                                onClick={() => setActiveTestimonial(index)}
                                className={`h-2.5 rounded-full transition-all duration-300 ${index === activeTestimonial ? 'w-6 bg-blue-600' : 'w-2.5 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400'}`}
                            />
                        ))}
                    </div>
                </div>
            </section>

            {/* ===== CTA / DOWNLOAD ===== */}
            <section className="relative z-10 py-24 px-4">
                <div ref={downloadRef} className="max-w-5xl mx-auto text-center bg-gradient-to-br from-blue-600 to-blue-800 rounded-[2.5rem] p-10 md:p-16 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-green-400/20 rounded-full blur-3xl -mr-20 -mt-20" />
                    <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -ml-20 -mb-20" />
                    <div className="relative z-10">
                        <h2 className="text-3xl md:text-5xl font-extrabold mb-5 text-white">
                            Siap Tingkatkan Bisnis Anda?
                        </h2>
                        <p className="text-lg text-blue-100 mb-10 max-w-2xl mx-auto">
                            Bergabung dengan 10.000+ pemilik bisnis yang telah merasakan kemudahan mengelola usaha bersama Rana.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                            <Link to="/register" className="px-8 py-4 bg-white rounded-xl text-blue-700 font-bold flex items-center justify-center gap-2 hover:bg-blue-50 transition-all hover:-translate-y-0.5">
                                Coba Gratis 14 Hari
                                <ArrowRight size={18} />
                            </Link>
                            <Link to="/contact" className="px-8 py-4 rounded-xl border border-white/40 text-white font-bold flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 transition-all hover:-translate-y-0.5">
                                Konsultasi dengan Tim
                            </Link>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8 text-blue-100 text-sm">
                            <span className="flex items-center gap-1.5"><Check size={16} className="text-green-300" /> Gratis 14 Hari</span>
                            <span className="flex items-center gap-1.5"><Check size={16} className="text-green-300" /> Tanpa Kartu Kredit</span>
                            <span className="flex items-center gap-1.5"><Check size={16} className="text-green-300" /> Support 24/7</span>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default Landing;
