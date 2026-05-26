import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion } from 'framer-motion';
import { ArrowRight, Box, TrendingUp, Users, Smartphone, ShieldCheck, Zap, BarChart3, PieChart, LineChart, Sparkles, Activity, Layers } from 'lucide-react';
import Experience from '../components/3d/Experience';
import Navbar from '../components/Navbar';
import LiveDashboardPreview from '../components/LiveDashboardPreview';
import SpotlightCard from '../components/SpotlightCard';
import TrustedByLeaders from '../components/TrustedByLeaders';
import TypewriterText from '../components/TypewriterText';
import MagneticButton from '../components/MagneticButton';
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
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md">
            <div className="mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">Simulasi Pertumbuhan Bisnis</h3>
                <p className="text-slate-400">Lihat potensi kenaikan omzet Anda dengan teknologi AI Rana.</p>
            </div>

            <div className="space-y-6 mb-8">
                <div>
                    <div className="flex justify-between text-slate-300 mb-2">
                        <span>Omzet Bulanan Saat Ini</span>
                        <span className="font-mono text-indigo-400">Rp {monthlySales.toLocaleString('id-ID')}</span>
                    </div>
                    <input 
                        type="range" 
                        min="10000000" 
                        max="500000000" 
                        step="1000000" 
                        value={monthlySales} 
                        onChange={(e) => setMonthlySales(Number(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                </div>
                <div>
                    <div className="flex justify-between text-slate-300 mb-2">
                        <span>Optimasi AI (Efisiensi & Stok)</span>
                        <span className="font-mono text-green-400">+{growthRate}%</span>
                    </div>
                    <div className="w-full bg-slate-700 h-2 rounded-lg overflow-hidden">
                        <div className="bg-gradient-to-r from-indigo-500 to-green-400 h-full transition-all duration-500" style={{ width: `${growthRate}%` }}></div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-indigo-600/20 border border-indigo-500/30 p-4 rounded-xl">
                    <div className="text-slate-400 text-sm mb-1">Proyeksi Bulan Depan</div>
                    <div className="text-2xl font-bold text-white">Rp {projectedSales.toLocaleString('id-ID')}</div>
                </div>
                <div className="bg-green-600/20 border border-green-500/30 p-4 rounded-xl">
                    <div className="text-slate-400 text-sm mb-1">Potensi Tambahan / Tahun</div>
                    <div className="text-2xl font-bold text-green-400">+Rp {annualExtra.toLocaleString('id-ID')}</div>
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
            { y: 0, opacity: 1, stagger: 0.2, duration: 1, ease: 'power3.out', delay: 0.7 }
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

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#0a0b0f] via-[#0b1020] to-[#0a0b0f] text-slate-200 font-sans selection:bg-indigo-400/30 overflow-x-hidden">
            <Navbar />

            {/* 3D Background */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-25" aria-hidden="true">
                <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
                    <Experience />
                </Canvas>
            </div>
            <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
                <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-gradient-to-br from-indigo-600/30 to-violet-600/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 rounded-full blur-3xl" />
            </div>

            <header className="relative z-10 min-h-screen flex items-center justify-center pt-32 pb-32 px-4">
                <div ref={headerRef} className="max-w-5xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-[0_0_15px_rgba(99,102,241,0.3)] group cursor-default transition-all hover:bg-white/10 hover:border-indigo-500/30">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                        <span className="text-indigo-200 font-medium text-sm tracking-wide uppercase">The Future of Retail Intelligence</span>
                    </div>
                    
                    <h1 className="text-6xl md:text-8xl font-black mb-8 tracking-tighter leading-[1.1] text-white drop-shadow-2xl">
                        Revolusi Bisnis <br />
                        <span className="relative inline-block">
                            <span className="absolute -inset-2 blur-2xl bg-gradient-to-r from-indigo-600/50 via-violet-600/50 to-cyan-500/50 opacity-50"></span>
                            <span className="relative text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-white to-cyan-300 animate-gradient-x">
                                Tanpa Batas
                            </span>
                        </span>
                    </h1>
                    
                    <p className="text-xl md:text-2xl text-slate-300/90 mb-12 max-w-3xl mx-auto leading-relaxed font-light">
                        Sistem kasir cerdas dengan <span className="text-white font-semibold">Artificial Intelligence</span>. Kelola ribuan SKU, pantau cabang, dan prediksi tren pasar dalam satu dashboard futuristik.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                        <Link to="/login" className="relative group px-8 py-4 rounded-2xl font-bold text-lg overflow-hidden bg-indigo-600 text-white shadow-[0_0_40px_rgba(79,70,229,0.4)] transition-all hover:scale-105 hover:shadow-[0_0_60px_rgba(79,70,229,0.6)]">
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 opacity-100 group-hover:opacity-90 transition-opacity" />
                            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
                            <span className="relative flex items-center gap-3">
                                Mulai Sekarang
                                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </span>
                        </Link>
                        
                        <Link to="/blog" className="px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10 hover:border-white/20 hover:text-white backdrop-blur-sm">
                            Pelajari Teknologi
                        </Link>
                    </div>
                </div>
            </header>

            <section className="relative z-20 -mt-12 px-4 pb-12">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
                    <SpotlightCard 
                        spotlightColor="rgba(99, 102, 241, 0.25)"
                        className="p-6 flex items-center gap-5 group"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.2)] group-hover:scale-110 transition-transform">
                            <Users size={28} />
                        </div>
                        <div>
                            <div className="text-sm text-slate-400 uppercase tracking-wider font-medium mb-1">Merchant Aktif</div>
                            <div className="text-2xl font-black text-white">10.000+</div>
                            <div className="text-xs text-slate-500 mt-1">Di seluruh Indonesia</div>
                        </div>
                    </SpotlightCard>

                    <SpotlightCard 
                        spotlightColor="rgba(16, 185, 129, 0.25)"
                        className="p-6 flex items-center gap-5 group"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)] group-hover:scale-110 transition-transform">
                            <TrendingUp size={28} />
                        </div>
                        <div>
                            <div className="text-sm text-slate-400 uppercase tracking-wider font-medium mb-1">Pertumbuhan Omzet</div>
                            <div className="text-2xl font-black text-white">+35%</div>
                            <div className="text-xs text-slate-500 mt-1">Rata-rata per kuartal</div>
                        </div>
                    </SpotlightCard>

                    <SpotlightCard 
                        spotlightColor="rgba(6, 182, 212, 0.25)"
                        className="p-6 flex items-center gap-5 group"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)] group-hover:scale-110 transition-transform">
                            <ShieldCheck size={28} />
                        </div>
                        <div>
                            <div className="text-sm text-slate-400 uppercase tracking-wider font-medium mb-1">Reliability</div>
                            <div className="text-2xl font-black text-white">99.99%</div>
                            <div className="text-xs text-slate-500 mt-1">Uptime terjamin</div>
                        </div>
                    </SpotlightCard>
                </div>
            </section>

            <section className="relative z-20 py-16 px-4 border-y border-white/10 bg-gradient-to-b from-white/[0.02] to-transparent backdrop-blur-sm">
                <div className="max-w-7xl mx-auto">
                    <TrustedByLeaders />

            {/* Distributor Promotion Section */}
            <section className="py-24 px-6 relative overflow-hidden">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900/40 border border-indigo-500/20 rounded-[3rem] p-8 md:p-16 backdrop-blur-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] -mr-48 -mt-48" />
                        
                        <div className="grid lg:grid-cols-2 gap-12 items-center">
                            <div>
                                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium mb-6">
                                    <Box size={16} />
                                    Baru: Rana for Distributors
                                </span>
                                <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
                                    Apakah Anda Seorang <br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400">
                                        Distributor atau Supplier?
                                    </span>
                                </h2>
                                <p className="text-lg text-slate-400 mb-8 leading-relaxed">
                                    Digitalisasikan bisnis distribusi Anda dengan Rana. Jangkau ribuan merchant UMKM, kelola stok wholesale, dan terima pesanan dalam jumlah besar secara otomatis.
                                </p>
                                <div className="flex flex-wrap gap-4">
                                    <Link 
                                        to="/distributor" 
                                        className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition-all flex items-center gap-2 group"
                                    >
                                        Pelajari Lebih Lanjut
                                        <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                    <a 
                                        href="/distributor/register" 
                                        className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl font-bold transition-all"
                                    >
                                        Daftar Distributor
                                    </a>
                                </div>
                            </div>
                            <div className="relative">
                                <div className="absolute -inset-4 bg-indigo-500/20 rounded-3xl blur-2xl" />
                                <div className="relative bg-slate-800/50 border border-white/10 rounded-3xl p-4 shadow-2xl overflow-hidden group">
                                    <img 
                                        src="/dashboard_red_theme.png" 
                                        alt="Distributor Portal Preview" 
                                        className="rounded-2xl w-full h-auto grayscale-[0.3] group-hover:grayscale-0 transition-all duration-500"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60" />
                                    <div className="absolute bottom-8 left-8 right-8">
                                        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl">
                                            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white">
                                                <TrendingUp size={20} />
                                            </div>
                                            <div>
                                                <div className="text-xs text-slate-300 font-medium uppercase tracking-wider">Potensi Jangkauan</div>
                                                <div className="text-lg font-bold text-white">10.000+ Merchant Aktif</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
                </div>
            </section>

            <section className="relative z-20 mt-12 mb-12 px-4">
                <div className="max-w-7xl mx-auto">
                    <motion.div 
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="relative shadow-2xl rounded-2xl overflow-hidden"
                    >
                         <LiveDashboardPreview />
                    </motion.div>
                </div>
            </section>

            <section className="relative z-10 py-12 px-4">
                <div className="max-w-6xl mx-auto text-center mb-10">
                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
                        Cerita sukses merchant bersama Rana
                    </h2>
                    <p className="text-lg text-slate-400 max-w-2xl mx-auto">
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
                                className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 flex flex-col gap-4"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 font-bold text-xl">
                                        {item.initial}
                                    </div>
                                    <div className="text-left">
                                        <div className="font-semibold text-white text-base md:text-lg">
                                            {item.name}
                                        </div>
                                        {item.role ? (
                                            <div className="text-xs md:text-sm text-slate-400">
                                                {item.role}
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                                <p className="text-slate-300 text-sm md:text-base leading-relaxed">
                                    {item.quote}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                    <div className="flex justify-center gap-2 mt-6">
                        {testimonials.map((item, index) => (
                            <button
                                key={item.name}
                                type="button"
                                onClick={() => setActiveTestimonial(index)}
                                className={`h-2.5 rounded-full transition-all duration-300 ${index === activeTestimonial ? 'w-6 bg-indigo-400' : 'w-2.5 bg-slate-500/60 hover:bg-slate-300/80'}`}
                            />
                        ))}
                    </div>
                </div>
            </section>

            <section className="relative z-10 py-12 px-4 overflow-hidden">
                <div className="absolute top-0 right-0 w-1/2 h-full pointer-events-none translate-x-1/2" />

                <div className="max-w-7xl mx-auto space-y-32">

                    {/* Feature 1: Efficiency (Image Left) */}
                    <div ref={coreValuesRef} className="flex flex-col md:flex-row items-center gap-10 md:gap-20">
                        <div className="w-full md:w-1/2 order-2 md:order-1">
                             <motion.div 
                                whileHover={{ scale: 1.02, rotate: -1 }}
                                className="relative rounded-3xl overflow-hidden p-1 bg-gradient-to-br from-indigo-500/30 to-violet-500/30 backdrop-blur-md"
                            >
                                <div className="bg-[#0f172a] rounded-[22px] overflow-hidden">
                                    <div className="h-64 md:h-80 bg-gradient-to-br from-indigo-900/50 to-slate-900 flex items-center justify-center relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20"></div>
                                        <Zap size={80} className="text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)] group-hover:scale-110 transition-transform duration-500" />
                                        
                                        {/* Floating Elements */}
                                        <motion.div 
                                            animate={{ y: [0, -10, 0] }}
                                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                            className="absolute top-10 right-10 bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-xl"
                                        >
                                            <Activity className="text-green-400" size={24} />
                                        </motion.div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                        <div className="w-full md:w-1/2 text-left space-y-6 order-1 md:order-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                                <Zap size={14} />
                                <span>Lightning Fast</span>
                            </div>
                            <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                                Manajemen secepat <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-300">Kecepatan Pikiran</span>
                            </h2>
                            <p className="text-xl text-slate-300 leading-relaxed">
                                Tidak ada lagi loading lama. Arsitektur kami dirancang untuk performa instan, memastikan setiap transaksi dan laporan tersaji dalam milidetik.
                            </p>
                            <Link to="/features" className="inline-flex items-center text-slate-200 font-bold text-lg hover:text-indigo-400 transition-colors gap-2 group">
                                Pelajari efisiensi <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>

                    {/* Feature 2: Mobile First (Image Right) */}
                    <div className="flex flex-col md:flex-row-reverse items-center gap-10 md:gap-20">
                        <div className="w-full md:w-1/2">
                             <motion.div 
                                whileHover={{ scale: 1.02, rotate: 1 }}
                                className="relative rounded-3xl overflow-hidden p-1 bg-gradient-to-br from-violet-500/30 to-pink-500/30 backdrop-blur-md"
                            >
                                <div className="bg-[#0f172a] rounded-[22px] overflow-hidden">
                                    <div className="h-64 md:h-80 bg-gradient-to-bl from-violet-900/50 to-slate-900 flex items-center justify-center relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20"></div>
                                        <Smartphone size={80} className="text-pink-400 drop-shadow-[0_0_15px_rgba(236,72,153,0.5)] group-hover:scale-110 transition-transform duration-500" />
                                         
                                         {/* Floating Elements */}
                                        <motion.div 
                                            animate={{ y: [0, -15, 0] }}
                                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                                            className="absolute bottom-10 left-10 bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-xl"
                                        >
                                            <Layers className="text-violet-400" size={24} />
                                        </motion.div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                        <div className="w-full md:w-1/2 text-left space-y-6">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs font-bold uppercase tracking-wider">
                                <Smartphone size={14} />
                                <span>Mobile First</span>
                            </div>
                            <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                                Bisnis dalam <br />
                                <span className="text-slate-200">Genggaman Anda</span>
                            </h2>
                            <p className="text-xl text-slate-300 leading-relaxed">
                                Kontrol penuh dari mana saja. Aplikasi mobile Rana memberikan kekuatan desktop dalam format yang ringkas dan intuitif.
                            </p>
                            <Link to="/features" className="inline-flex items-center text-slate-200 font-bold text-lg hover:text-pink-400 transition-colors gap-2 group">
                                Jelajahi fitur mobile <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>

                    {/* Feature 3: Security & Growth (Core Values) */}
                    <div className="text-center max-w-6xl mx-auto pt-20">
                        <div className="inline-block mb-4 px-4 py-1.5 rounded-full border border-slate-700 bg-slate-800/50 backdrop-blur text-slate-300 text-sm font-medium">
                            Our Core Values
                        </div>
                        <h2 className="text-3xl md:text-5xl font-bold text-white mb-16">Fondasi Kesuksesan Bisnis Modern</h2>
                        <div className="grid md:grid-cols-3 gap-6 text-left">
                            {(cmsContent.CMS_CORE_VALUES && cmsContent.CMS_CORE_VALUES.length > 0) ? (
                                cmsContent.CMS_CORE_VALUES.map((val, idx) => (
                                    <motion.div 
                                        key={idx} 
                                        whileHover={{ y: -10 }}
                                        className="p-8 bg-[#1e293b]/40 border border-slate-700/50 rounded-3xl hover:bg-[#1e293b]/60 hover:border-indigo-500/30 transition-all duration-300 group"
                                    >
                                        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6 group-hover:bg-indigo-500/20 transition-colors">
                                            <TrendingUp size={28} className="text-indigo-400" />
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-3 group-hover:text-indigo-300 transition-colors">{val.title}</h3>
                                        <p className="text-slate-400 leading-relaxed">{val.desc}</p>
                                    </motion.div>
                                ))
                            ) : (
                                <>
                                    <motion.div 
                                        whileHover={{ y: -10 }}
                                        className="p-8 bg-[#1e293b]/40 border border-slate-700/50 rounded-3xl hover:bg-[#1e293b]/60 hover:border-indigo-500/30 transition-all duration-300 group"
                                    >
                                        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:bg-blue-500/20 transition-colors">
                                            <ShieldCheck size={28} className="text-blue-400" />
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-3 group-hover:text-blue-300 transition-colors">Keamanan Terjamin</h3>
                                        <p className="text-slate-400 leading-relaxed">Data bisnis Anda adalah aset paling berharga. Kami melindunginya dengan enkripsi tingkat lanjut dan backup otomatis.</p>
                                    </motion.div>

                                    <motion.div 
                                        whileHover={{ y: -10 }}
                                        className="p-8 bg-[#1e293b]/40 border border-slate-700/50 rounded-3xl hover:bg-[#1e293b]/60 hover:border-emerald-500/30 transition-all duration-300 group"
                                    >
                                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:bg-emerald-500/20 transition-colors">
                                            <TrendingUp size={28} className="text-emerald-400" />
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-3 group-hover:text-emerald-300 transition-colors">Pertumbuhan Berkelanjutan</h3>
                                        <p className="text-slate-400 leading-relaxed">Sistem yang tumbuh bersama Anda. Dari satu gerai kecil hingga waralaba nasional, Rana siap menskalakan bisnis Anda.</p>
                                    </motion.div>

                                    <motion.div 
                                        whileHover={{ y: -10 }}
                                        className="p-8 bg-[#1e293b]/40 border border-slate-700/50 rounded-3xl hover:bg-[#1e293b]/60 hover:border-violet-500/30 transition-all duration-300 group"
                                    >
                                        <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-6 group-hover:bg-violet-500/20 transition-colors">
                                            <Users size={28} className="text-violet-400" />
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-3 group-hover:text-violet-300 transition-colors">Customer Centric</h3>
                                        <p className="text-slate-400 leading-relaxed">Fitur CRM yang mendalam membantu Anda memahami dan melayani pelanggan dengan lebih personal dan efektif.</p>
                                    </motion.div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* AI Growth Section */}
            <section className="relative z-10 py-32 px-4 bg-white/5">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        <div className="w-full lg:w-1/2 space-y-8">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-semibold">
                                <Sparkles size={16} />
                                <span>Teknologi Rana Intelligence™</span>
                            </div>
                            <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                                Kembangkan Bisnis dengan <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Kecerdasan Buatan</span>
                            </h2>
                            <p className="text-xl text-slate-300 leading-relaxed">
                                Jangan hanya mencatat transaksi. Rana menganalisis pola penjualan, memprediksi tren, dan memberikan saran actionable untuk meningkatkan profitabilitas bisnis Anda secara otomatis.
                            </p>
                            
                            <div className="space-y-4">
                                {[
                                    { icon: BarChart3, title: 'Prediksi Penjualan', desc: 'Forecast omzet harian dengan akurasi tinggi.' },
                                    { icon: PieChart, title: 'Analisis Pelanggan', desc: 'Pahami preferensi dan kebiasaan belanja pelanggan.' },
                                    { icon: Zap, title: 'Restock Pintar', desc: 'Notifikasi otomatis saat stok menipis berdasarkan tren.' }
                                ].map((item, idx) => (
                                    <div key={idx} className="flex items-start gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors">
                                        <div className="bg-indigo-600/20 p-3 rounded-lg text-indigo-400">
                                            <item.icon size={24} />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-bold text-white">{item.title}</h4>
                                            <p className="text-slate-400 text-sm">{item.desc}</p>
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

            {/* Download Section */}
            <section className="relative z-10 py-32 px-4 text-white">
                <div ref={downloadRef} className="max-w-5xl mx-auto text-center">
                    <h2 className="text-4xl md:text-6xl font-black mb-8">
                        Siap Bertransformasi?
                    </h2>
                    <p className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto">
                        Bergabung dengan ribuan merchant yang membentuk masa depan retail. Unduh aplikasinya sekarang.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-6">
                        <button className="px-8 py-4 bg-white rounded-2xl text-[#303346] font-bold flex items-center justify-center gap-4 hover:bg-gray-100 transition-all duration-300 transform hover:-translate-y-1">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Play Store" className="h-8" />
                            <span className="text-left">
                                <small className="block text-xs text-gray-500">GET IT ON</small>
                                Google Play
                            </span>
                        </button>
                        <button className="px-8 py-4 bg-white rounded-2xl text-[#303346] font-bold flex items-center justify-center gap-4 hover:bg-gray-100 transition-all duration-300 transform hover:-translate-y-1">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" alt="App Store" className="h-8" />
                            <span className="text-left">
                                <small className="block text-xs text-gray-500">Download on the</small>
                                App Store
                            </span>
                        </button>
                        <Link
                            to="/contact"
                            className="px-8 py-4 rounded-2xl border border-white/30 text-white font-bold flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 transition-all duration-300 transform hover:-translate-y-1"
                        >
                            <span>Konsultasi dengan tim Rana</span>
                            <ArrowRight size={18} />
                        </Link>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default Landing;
