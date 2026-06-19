import React, { useRef } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import useCms from '../hooks/useCms';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Users, TrendingUp, Globe, Award, Target, Zap, Shield, Heart, MapPin, ArrowUpRight, Quote, Linkedin, Twitter } from 'lucide-react';
import MerchantGrowthMap from '../components/MerchantGrowthMap';
import usePageMeta from '../hooks/usePageMeta';

const StatItem = ({ label, value, delay }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        viewport={{ once: true }}
        className="text-center"
    >
        <div className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">{value}</div>
        <div className="text-sm text-slate-500 dark:text-slate-400 uppercase tracking-widest font-medium">{label}</div>
    </motion.div>
);

const About = () => {
    const { cmsContent } = useCms();
    const containerRef = useRef(null);
    usePageMeta({
        title: 'Tentang RanaPOS | Partner teknologi untuk UMKM',
        description: 'Kenal lebih dekat dengan RanaPOS, visi, tim, dan komitmen kami membantu UMKM Indonesia bertumbuh dengan teknologi keuangan yang mudah digunakan.'
    });

    const founder = cmsContent.CMS_FOUNDER || {
        name: "Riyan",
        role: "Founder & CEO",
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=774&q=80",
        quote: "Membangun Masa Depan Ekonomi Digital Indonesia",
        description: `"Saya mendirikan Rana dengan keyakinan sederhana: setiap pengusaha, sekecil apapun, berhak mendapatkan akses ke teknologi terbaik. Kami tidak hanya membangun software, kami membangun jembatan menuju kemandirian finansial."\n\n"Di Rana, kami melihat setiap transaksi sebagai cerita, dan setiap merchant sebagai pahlawan ekonomi lokal. Tugas kami adalah memastikan mereka memiliki senjata terbaik untuk memenangkan pertempuran di pasar yang semakin kompetitif."`,
        linkedin: "#",
        twitter: "#"
    };

    const team = (cmsContent.CMS_TEAM && cmsContent.CMS_TEAM.length > 0) ? cmsContent.CMS_TEAM : [
        { name: "Sarah Wijaya", role: "Head of Product", image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&auto=format&fit=crop&w=774&q=80" },
        { name: "Budi Santoso", role: "CTO", image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1770&q=80" },
        { name: "Jessica Tan", role: "Head of Growth", image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&auto=format&fit=crop&w=1061&q=80" },
        { name: "Andi Pratama", role: "Lead Engineer", image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?ixlib=rb-4.0.3&auto=format&fit=crop&w=774&q=80" }
    ];

    const milestones = (cmsContent.CMS_MILESTONES && cmsContent.CMS_MILESTONES.length > 0) ? cmsContent.CMS_MILESTONES : [
        { year: '2022', title: 'Inception', description: 'Ide RanaPOS lahir dari sebuah kedai kopi kecil di Jakarta Selatan.' },
        { year: '2023', title: '100 Merchant Pertama', description: 'Validasi pasar dengan membantu 100 UMKM pertama mendigitalkan usaha mereka.' },
        { year: '2024', title: 'Ekspansi Nasional', description: 'RanaPOS kini hadir di 20 provinsi, membantu ribuan pengusaha lokal.' },
        { year: '2025', title: 'AI Integration', description: 'Meluncurkan Rana AI untuk membantu merchant menganalisa bisnis secara otomatis.' }
    ];
    
    // Parallax effect for the hero text
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end start"]
    });
    const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
    const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans overflow-x-hidden transition-colors duration-300">
            <Navbar />

            {/* Hero Section */}
            <section ref={containerRef} className="relative overflow-hidden h-screen flex items-center justify-center px-4">
                {/* Soft background accents */}
                <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                    <div className="absolute -top-32 -right-24 w-[600px] h-[600px] bg-blue-100/60 dark:bg-blue-500/10 rounded-full blur-3xl" />
                    <div className="absolute top-40 -left-32 w-[500px] h-[500px] bg-green-100/50 dark:bg-green-500/10 rounded-full blur-3xl" />
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:64px_64px] opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
                </div>

                <motion.div 
                    style={{ y, opacity }}
                    className="relative z-10 max-w-5xl mx-auto text-center"
                >
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1 }}
                        className="inline-block px-4 py-2 mb-8 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 text-blue-700 dark:text-blue-300 font-semibold text-sm tracking-wide uppercase"
                    >
                        Pioneering The Future
                    </motion.div>
                    <h1 className="text-6xl md:text-8xl font-black text-slate-900 dark:text-white mb-8 tracking-tighter leading-[1.1]">
                        We Build for the <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-500">
                            Bold & Ambitious
                        </span>
                    </h1>
                    <p className="text-xl md:text-2xl text-slate-500 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed font-light">
                        Rana bukan sekadar aplikasi POS. Kami adalah ekosistem teknologi yang memberdayakan jutaan UMKM untuk bersaing di era digital.
                    </p>
                </motion.div>

                {/* Scroll Indicator */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, y: [0, 10, 0] }}
                    transition={{ delay: 2, duration: 2, repeat: Infinity }}
                    className="absolute bottom-10 left-1/2 -translate-x-1/2 text-slate-400 dark:text-slate-500 flex flex-col items-center gap-2 z-10"
                >
                    <span className="text-xs uppercase tracking-widest">Explore Our World</span>
                    <div className="w-px h-12 bg-gradient-to-b from-blue-500 to-transparent"></div>
                </motion.div>
            </section>

            {/* Live Operations Center Section */}
            <section className="relative z-10 py-24 px-4 bg-slate-50 dark:bg-slate-900 border-y border-slate-100 dark:border-slate-800">
                <div className="max-w-7xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-20 items-center">
                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <span className="relative flex h-3 w-3">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                </span>
                                <span className="text-green-600 dark:text-green-400 font-mono text-sm tracking-wider uppercase">Live Operations Center</span>
                            </div>
                            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-8 leading-tight">
                                Melihat Pertumbuhan <br/>
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-500">Secara Real-time</span>
                            </h2>
                            <p className="text-lg text-slate-500 dark:text-slate-400 mb-10 leading-relaxed">
                                Teknologi kami memproses jutaan transaksi setiap hari, menghubungkan pedagang dari Sabang sampai Merauke dalam satu jaringan saraf digital yang cerdas.
                            </p>
                            
                            <div className="grid grid-cols-2 gap-8">
                                <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <Globe className="text-blue-600 dark:text-blue-400 mb-4" size={32} />
                                    <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">34</div>
                                    <div className="text-sm text-slate-500 dark:text-slate-400">Provinsi Terjangkau</div>
                                </div>
                                <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <Target className="text-green-600 dark:text-green-400 mb-4" size={32} />
                                    <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">99.9%</div>
                                    <div className="text-sm text-slate-500 dark:text-slate-400">Uptime Server</div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="relative">
                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/40 to-green-500/30 rounded-[2rem] blur-2xl opacity-60"></div>
                            <MerchantGrowthMap />
                        </div>
                    </div>
                </div>
            </section>

            {/* Impact Stats */}
            <section className="relative z-10 py-20 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-4">
                        <StatItem label="Active Merchants" value="50K+" delay={0.1} />
                        <StatItem label="Daily Transactions" value="1.2M" delay={0.2} />
                        <StatItem label="Cities Covered" value="120+" delay={0.3} />
                        <StatItem label="Growth YoY" value="300%" delay={0.4} />
                    </div>
                </div>
            </section>

            {/* Mission & Vision - Cards */}
            <section className="relative z-10 py-24 px-4">
                <div className="max-w-7xl mx-auto">
                    <motion.div 
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-20"
                    >
                        <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">Driven by Purpose</h2>
                        <p className="text-xl text-slate-500 dark:text-slate-400 max-w-3xl mx-auto">
                            Kami percaya bahwa teknologi canggih seharusnya tidak hanya milik perusahaan besar. 
                            Misi kami adalah mendemokratisasi akses ke alat bisnis kelas enterprise.
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { 
                                icon: Zap, 
                                title: "Inovasi Tanpa Henti", 
                                desc: "Kami terus mendorong batas apa yang mungkin dilakukan oleh aplikasi web, menghadirkan kecepatan native ke dalam browser.",
                                color: "text-blue-600 dark:text-blue-400",
                                bg: "bg-blue-50 dark:bg-blue-500/10",
                                border: "border-slate-200 dark:border-slate-700"
                            },
                            { 
                                icon: Heart, 
                                title: "Obsesi Pelanggan", 
                                desc: "Setiap fitur yang kami bangun dimulai dari masalah nyata yang dihadapi pengguna kami. Empati adalah kode sumber kami.",
                                color: "text-green-600 dark:text-green-400",
                                bg: "bg-green-50 dark:bg-green-500/10",
                                border: "border-slate-200 dark:border-slate-700"
                            },
                            { 
                                icon: Shield, 
                                title: "Integritas & Keamanan", 
                                desc: "Kepercayaan adalah mata uang kami. Kami menjaga data bisnis Anda dengan standar keamanan perbankan tertinggi.",
                                color: "text-blue-600 dark:text-blue-400",
                                bg: "bg-blue-50 dark:bg-blue-500/10",
                                border: "border-slate-200 dark:border-slate-700"
                            }
                        ].map((item, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.2 }}
                                viewport={{ once: true }}
                                whileHover={{ y: -10 }}
                                className={`p-10 rounded-3xl bg-white dark:bg-slate-800 border ${item.border} shadow-sm hover:shadow-lg transition-all duration-300 group`}
                            >
                                <div className={`w-14 h-14 rounded-2xl ${item.bg} flex items-center justify-center mb-8 group-hover:scale-110 transition-transform`}>
                                    <item.icon size={28} className={item.color} />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">{item.title}</h3>
                                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Our Story / CMS Content */}
            <section className="relative z-10 py-24 px-4 bg-slate-50 dark:bg-slate-900 border-y border-slate-100 dark:border-slate-800">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center gap-4 mb-12">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-300 dark:to-slate-700"></div>
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white uppercase tracking-widest">Our Story</h2>
                        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-300 dark:to-slate-700"></div>
                    </div>
                    
                    <div 
                        className="prose prose-lg dark:prose-invert mx-auto text-slate-600 dark:text-slate-300 leading-loose"
                        dangerouslySetInnerHTML={{ 
                            __html: cmsContent.CMS_ABOUT_US || `
                                <p>Perjalanan Rana dimulai dari sebuah kedai kopi kecil di Jakarta. Kami melihat betapa sulitnya pemilik usaha mengelola inventaris, karyawan, dan laporan keuangan secara manual.</p>
                                <p>Apa yang dimulai sebagai solusi sederhana untuk satu toko, kini telah berkembang menjadi platform yang melayani ribuan bisnis di seluruh Indonesia. Kami menggabungkan desain yang indah dengan rekayasa perangkat lunak yang kuat untuk menciptakan pengalaman yang tak tertandingi.</p>
                                <p>Hari ini, Rana didukung oleh tim insinyur, desainer, dan ahli strategi produk kelas dunia yang bekerja tanpa lelah untuk satu tujuan: <strong>Membantu bisnis Anda tumbuh.</strong></p>
                            ` 
                        }} 
                    />
                </div>
            </section>

            {/* Milestones / Journey Section */}
            <section className="relative z-10 py-24 px-4 bg-white dark:bg-slate-950 overflow-hidden">
                 <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                    <div className="absolute top-20 -left-24 w-[420px] h-[420px] bg-blue-100/50 dark:bg-blue-500/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-10 -right-24 w-[420px] h-[420px] bg-green-100/40 dark:bg-green-500/10 rounded-full blur-3xl" />
                 </div>
                 <div className="max-w-5xl mx-auto relative">
                    <div className="text-center mb-20">
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Perjalanan Kami</h2>
                        <div className="w-24 h-1 bg-blue-600 mx-auto rounded-full"></div>
                    </div>

                    <div className="relative">
                        {/* Vertical Line */}
                        <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700 transform md:-translate-x-1/2"></div>

                        <div className="space-y-12">
                            {milestones.map((ms, idx) => (
                                <motion.div 
                                    key={idx}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: idx * 0.1 }}
                                    className={`relative flex flex-col md:flex-row gap-8 items-center ${idx % 2 === 0 ? 'md:flex-row-reverse' : ''}`}
                                >
                                    {/* Content Card */}
                                    <div className="flex-1 w-full pl-12 md:pl-0">
                                        <div className={`p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:border-blue-300 dark:hover:border-blue-500/40 hover:shadow-lg transition-all ${idx % 2 === 0 ? 'md:text-left' : 'md:text-right'}`}>
                                            <span className="text-blue-600 dark:text-blue-400 font-mono text-sm font-bold tracking-wider mb-2 block">{ms.year}</span>
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{ms.title}</h3>
                                            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{ms.description}</p>
                                        </div>
                                    </div>

                                    {/* Timeline Dot */}
                                    <div className="absolute left-4 md:left-1/2 w-4 h-4 rounded-full bg-blue-600 border-4 border-white dark:border-slate-950 transform -translate-x-1/2 z-10 shadow-[0_0_20px_rgba(31,95,191,0.4)]"></div>

                                    {/* Empty Space for alignment */}
                                    <div className="flex-1 hidden md:block"></div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                 </div>
            </section>

            {/* Founder Section */}
            <section className="relative z-10 py-24 px-4 bg-slate-50 dark:bg-slate-900 border-y border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-blue-100/40 dark:from-blue-900/10 to-transparent pointer-events-none"></div>
                <div className="max-w-7xl mx-auto relative">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <motion.div 
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="relative"
                        >
                            <div className="aspect-[3/4] rounded-3xl overflow-hidden bg-slate-200 dark:bg-slate-800 relative group shadow-xl shadow-blue-900/5">
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60 z-10"></div>
                                {/* Placeholder for Founder Image - You can replace src with actual image */}
                                <img 
                                    src={founder.image} 
                                    alt={founder.name} 
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                <div className="absolute bottom-8 left-8 z-20">
                                    <h3 className="text-3xl font-bold text-white mb-1">{founder.name}</h3>
                                    <p className="text-blue-300 font-medium">{founder.role}</p>
                                </div>
                            </div>
                            
                            {/* Decorative elements */}
                            <div className="absolute -bottom-10 -right-10 w-40 h-40 border border-blue-500/20 rounded-full flex items-center justify-center backdrop-blur-md bg-white/50 dark:bg-slate-900/50">
                                <div className="w-32 h-32 border border-blue-500/40 rounded-full"></div>
                            </div>
                        </motion.div>
                        
                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <Quote className="text-blue-500 mb-8 opacity-50" size={64} />
                            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-8 leading-tight">
                                {founder.quote}
                            </h2>
                            <div className="space-y-6 text-lg text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                                <p>
                                    {founder.description}
                                </p>
                            </div>
                            
                            <div className="mt-10 flex gap-4">
                                <a href={founder.linkedin} className="p-3 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 transition-colors">
                                    <Linkedin size={20} />
                                </a>
                                <a href={founder.twitter} className="p-3 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 transition-colors">
                                    <Twitter size={20} />
                                </a>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Team Section */}
            <section className="relative z-10 py-24 px-4 bg-white dark:bg-slate-950">
                 <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">Meet The Architects</h2>
                        <p className="text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
                            Orang-orang di balik layar yang bekerja keras mewujudkan visi Rana setiap hari.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-4 gap-8">
                        {team.map((member, idx) => (
                            <motion.div 
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                viewport={{ once: true }}
                                className="group relative"
                            >
                                <div className="aspect-square rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-800 mb-4 relative border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/20 transition-colors z-10"></div>
                                    <img 
                                        src={member.image || member.img} 
                                        alt={member.name} 
                                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 transform group-hover:scale-110"
                                    />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{member.name}</h3>
                                <p className="text-blue-600 dark:text-blue-400 text-sm font-medium uppercase tracking-wider">{member.role}</p>
                            </motion.div>
                        ))}
                    </div>
                 </div>
            </section>

            {/* CTA Section */}
            <section className="relative z-10 py-24 px-4">
                <div className="max-w-5xl mx-auto">
                    <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-800 rounded-[2.5rem] p-10 md:p-16 text-center">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-green-400/20 rounded-full blur-3xl -mr-20 -mt-20" />
                        <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -ml-20 -mb-20" />

                        <div className="relative z-10">
                            <h2 className="text-4xl md:text-6xl font-black text-white mb-8 tracking-tight">
                                Siap Bergabung dengan <br/> Revolusi Retail?
                            </h2>
                            <p className="text-xl text-blue-100 mb-12 max-w-2xl mx-auto">
                                Jadilah bagian dari komunitas pedagang modern yang tumbuh bersama Rana. Mulai perjalanan sukses Anda hari ini.
                            </p>
                            <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
                                <motion.button 
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="px-10 py-5 bg-white text-blue-700 rounded-xl font-bold text-lg shadow-lg hover:bg-blue-50 transition-all flex items-center gap-3"
                                >
                                    Mulai Gratis Sekarang <ArrowUpRight size={24} />
                                </motion.button>
                                
                                <motion.button 
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="px-10 py-5 bg-white/10 border border-white/30 text-white rounded-xl font-bold text-lg hover:bg-white/20 transition-all flex items-center gap-3"
                                >
                                    Lihat Karir <span className="bg-white/20 text-xs px-2 py-1 rounded-full">Hiring</span>
                                </motion.button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            <Footer />
        </div>
    );
};

export default About;
