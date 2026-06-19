import React, { useEffect, useMemo, useState, useRef } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import usePageMeta from '../hooks/usePageMeta';
import { 
    Users, Target, Award, Rocket, Shield, Heart, Laptop, Briefcase, 
    Globe, Sparkles, Building2, Code, BarChart3, Megaphone, 
    ChevronDown, ChevronUp, CheckCircle2, ArrowRight, Play,
    FileText, Upload, Trash2, MapPin, Clock
} from 'lucide-react';
import api from '../services/api';
import MagneticButton from '../components/MagneticButton';
import SpotlightCard from '../components/SpotlightCard';

const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.2
        }
    }
};

const Section = ({ children, className = '' }) => (
    <section className={`relative z-10 ${className}`}>
        <div className="max-w-7xl mx-auto px-4">{children}</div>
    </section>
);

const Card = ({ children, className = '' }) => (
    <div className={`rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm ${className}`}>
        {children}
    </div>
);

const FAQItem = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-slate-100 dark:border-slate-800 last:border-0">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full py-4 flex items-center justify-between text-left focus:outline-none group"
            >
                <span className={`font-semibold text-lg transition ${isOpen ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white'}`}>
                    {question}
                </span>
                {isOpen ? <ChevronUp className="text-blue-600 dark:text-blue-400" /> : <ChevronDown className="text-slate-400 dark:text-slate-500" />}
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="pb-4 text-slate-500 dark:text-slate-400 leading-relaxed text-sm md:text-base">
                            {answer}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const Careers = () => {
    usePageMeta({
        title: 'Karir di RanaPOS | Bangun Solusi untuk Jutaan UMKM',
        description: 'Bergabung dengan tim RanaPOS. Lingkungan kerja remote-friendly, tantangan teknis nyata, dan dampak langsung ke ekonomi digital Indonesia.'
    });

    const [loading, setLoading] = useState(true);
    const [openings, setOpenings] = useState([]);
    
    // ... logic fetching data ...
    const pickIcon = (dept, title) => {
        const d = (dept || '').toLowerCase();
        if (d.includes('engineer') || d.includes('engineering')) return Code;
        if (d.includes('product')) return BarChart3;
        if (d.includes('market')) return Megaphone;
        const t = (title || '').toLowerCase();
        if (t.includes('engineer') || t.includes('developer')) return Code;
        if (t.includes('product')) return BarChart3;
        if (t.includes('marketing') || t.includes('growth')) return Megaphone;
        return Briefcase;
    };

    useEffect(() => {
        (async () => {
            try {
                const res = await api.get('/system/careers/openings');
                const data = Array.isArray(res.data?.data) ? res.data.data : [];
                setOpenings(data.map(o => ({
                    icon: pickIcon(o.dept, o.title),
                    title: o.title,
                    dept: o.dept || 'General',
                    location: o.location || 'Remote/Hybrid',
                    tags: Array.isArray(o.tags) ? o.tags.filter(Boolean) : [],
                    summary: o.summary || '',
                    seniority: o.seniority || ''
                })));
            } catch (e) {
                console.error("Failed to fetch openings", e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const departments = useMemo(() => ['All', ...new Set(openings.map(o => o.dept).filter(Boolean))], [openings]);
    const locations = useMemo(() => ['All', ...new Set(openings.map(o => o.location).filter(Boolean))], [openings]);
    const [dept, setDept] = useState('All');
    const [loc, setLoc] = useState('All');
    const [q, setQ] = useState('');
    const searchInputRef = useRef(null);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);
    
    const filteredOpenings = useMemo(
        () => openings.filter(o =>
            (dept === 'All' || o.dept === dept) &&
            (loc === 'All' || o.location === loc) &&
            (q.trim() === '' ||
             o.title.toLowerCase().includes(q.toLowerCase()) ||
             o.tags.some(t => t.toLowerCase().includes(q.toLowerCase())))
        ),
        [dept, loc, q]
    );

    const [selected, setSelected] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [applyForm, setApplyForm] = useState({ name: '', email: '', phone: '', resumeLink: '', portfolioLink: '', coverLetter: '' });
    const [submitting, setSubmitting] = useState(false);
    const [submitMsg, setSubmitMsg] = useState('');
    const [resumeFile, setResumeFile] = useState(null);

    const faqs = [
        { q: "Apakah RanaPOS menerapkan WFA (Work From Anywhere)?", a: "Ya! Mayoritas tim kami bekerja secara remote atau hybrid. Kami percaya hasil kerja lebih penting daripada lokasi absensi, selama komunikasi tetap lancar." },
        { q: "Bagaimana proses interview di RanaPOS?", a: "Biasanya terdiri dari 3-4 tahap: Screening CV, Interview HR/Culture Fit, Tes Teknis (Coding/Case Study), dan User Interview. Proses total memakan waktu 1-2 minggu." },
        { q: "Apakah ada device yang disediakan?", a: "Untuk posisi Full-time Engineering & Design, kami menyediakan fasilitas kepemilikan laptop (MacBook/ThinkPad) setelah masa percobaan, atau tunjangan device." },
        { q: "Apa bahasa pemrograman utama yang digunakan?", a: "Stack utama kami adalah React (Vite) untuk frontend, Node.js (Express) untuk backend, dan PostgreSQL/Prisma untuk database. Kami juga bereksperimen dengan Go dan Python." },
    ];

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans overflow-x-hidden transition-colors duration-300">
            <Navbar />
            
            {/* Soft background accents */}
            <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden" aria-hidden="true">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-100/60 dark:bg-blue-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-green-100/50 dark:bg-green-500/10 rounded-full blur-3xl" />
            </div>

            {/* Hero Section */}
            <Section className="pt-40 pb-32">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <motion.div 
                        initial="hidden"
                        animate="visible"
                        variants={staggerContainer}
                    >
                        <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 text-blue-700 dark:text-blue-300 text-sm font-bold uppercase tracking-wider mb-8">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                            We are Hiring
                        </motion.div>
                        
                        <motion.h1 variants={fadeInUp} className="text-6xl md:text-7xl font-black text-slate-900 dark:text-white leading-[1.1] mb-8 tracking-tight">
                            Bantu UMKM <br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-500">Naik Kelas.</span>
                        </motion.h1>
                        
                        <motion.p variants={fadeInUp} className="text-xl text-slate-500 dark:text-slate-400 leading-relaxed mb-10 max-w-xl font-light">
                            Bergabunglah dengan tim yang terobsesi menyederhanakan kompleksitas bisnis. 
                            Di <span className="text-slate-900 dark:text-white font-medium">RanaPOS</span>, kode yang kamu tulis hari ini akan membantu ribuan pedagang besok pagi.
                        </motion.p>
                        
                        <motion.div variants={fadeInUp} className="flex flex-wrap gap-5">
                            <MagneticButton>
                                <a href="#openings" className="px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold shadow-[0_10px_30px_rgba(31,95,191,0.3)] hover:shadow-[0_15px_40px_rgba(31,95,191,0.45)] hover:-translate-y-0.5 transition-all flex items-center gap-2">
                                    Lihat Lowongan <ArrowRight size={20} />
                                </a>
                            </MagneticButton>
                            <MagneticButton>
                                <a href="#gallery" className="px-8 py-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold hover:border-blue-300 hover:text-blue-700 dark:hover:text-blue-400 transition-all flex items-center gap-2">
                                    <Play size={18} fill="currentColor" /> Tentang Kami
                                </a>
                            </MagneticButton>
                        </motion.div>
                    </motion.div>

                    <motion.div 
                        initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="relative hidden lg:block perspective-1000"
                    >
                        <div className="grid grid-cols-2 gap-6 transform rotate-[-5deg] hover:rotate-0 transition-all duration-700 ease-in-out">
                            <div className="space-y-6 translate-y-12">
                                <SpotlightCard className="p-0 border-0 overflow-hidden h-72 group">
                                    <img 
                                        src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80" 
                                        alt="Team collaboration" 
                                        className="w-full h-full object-cover transition duration-700 group-hover:scale-110"
                                    />
                                </SpotlightCard>
                                <SpotlightCard className="p-0 border-0 overflow-hidden h-56 group">
                                    <img 
                                        src="https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=600&q=80" 
                                        alt="Remote work" 
                                        className="w-full h-full object-cover transition duration-700 group-hover:scale-110"
                                    />
                                </SpotlightCard>
                            </div>
                            <div className="space-y-6">
                                <SpotlightCard className="p-0 border-0 overflow-hidden h-56 group">
                                    <img 
                                        src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=600&q=80" 
                                        alt="Meeting" 
                                        className="w-full h-full object-cover transition duration-700 group-hover:scale-110"
                                    />
                                </SpotlightCard>
                                <SpotlightCard className="p-0 border-0 overflow-hidden h-72 group">
                                    <img 
                                        src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=600&q=80" 
                                        alt="Office vibe" 
                                        className="w-full h-full object-cover transition duration-700 group-hover:scale-110"
                                    />
                                </SpotlightCard>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </Section>

            {/* Life at Rana Gallery */}
            <Section id="gallery" className="py-32 relative bg-slate-50 dark:bg-slate-900 border-y border-slate-100 dark:border-slate-800">
                <div className="text-center mb-20">
                    <motion.h2 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-6"
                    >
                        Bukan Sekadar <span className="text-blue-600 dark:text-blue-400">Tempat Kerja</span>
                    </motion.h2>
                    <motion.p 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl mx-auto"
                    >
                        Kami membangun kultur di mana inovasi dihargai, kesalahan menjadi pelajaran, dan setiap suara didengar.
                    </motion.p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-[300px]">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="md:col-span-2 row-span-2 group relative overflow-hidden rounded-3xl"
                    >
                        <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80" className="w-full h-full object-cover transition duration-700 group-hover:scale-110" alt="Teamwork" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-8">
                            <span className="text-blue-300 font-bold text-sm uppercase tracking-wider mb-2">Culture</span>
                            <span className="text-white font-bold text-2xl">Global Collaboration</span>
                        </div>
                    </motion.div>
                    
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="md:col-span-1 row-span-1 group relative overflow-hidden rounded-3xl"
                    >
                        <img src="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=800&q=80" className="w-full h-full object-cover transition duration-700 group-hover:scale-110" alt="Strategy" />
                         <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-6">
                            <span className="text-white font-bold text-lg">Strategic Planning</span>
                        </div>
                    </motion.div>

                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="md:col-span-1 row-span-2 group relative overflow-hidden rounded-3xl"
                    >
                        <img src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80" className="w-full h-full object-cover transition duration-700 group-hover:scale-110" alt="Mentorship" />
                         <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6">
                            <span className="text-white font-bold text-xl">Mentorship & Growth</span>
                        </div>
                    </motion.div>

                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 }}
                        className="md:col-span-1 row-span-1 group relative overflow-hidden rounded-3xl"
                    >
                        <img src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80" className="w-full h-full object-cover transition duration-700 group-hover:scale-110" alt="Tech" />
                         <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-6">
                            <span className="text-white font-bold text-lg">Cutting-edge Tech</span>
                        </div>
                    </motion.div>
                </div>
            </Section>

            {/* Benefits */}
            <Section className="py-32">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    <div className="md:col-span-1 sticky top-32 self-start">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-6">Kenapa <br/>RanaPOS?</h2>
                            <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed text-lg">
                                Kami percaya bahwa kesejahteraan tim adalah kunci produk yang hebat. 
                                Benefit kami dirancang untuk mendukung kehidupan profesional dan personal Anda.
                            </p>
                            <MagneticButton>
                                <a href="#openings" className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                                    Lihat semua benefit <ArrowRight size={18} />
                                </a>
                            </MagneticButton>
                        </motion.div>
                    </div>
                    <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {[
                            { icon: Heart, title: 'Kesehatan & Wellness', desc: 'Asuransi kesehatan lengkap termasuk gigi dan kacamata, plus budget gym bulanan.' },
                            { icon: Laptop, title: 'Remote-First', desc: 'Kerja dari mana saja. Kami sediakan budget setup home office yang ergonomis.' },
                            { icon: Globe, title: 'Learning & Growth', desc: 'Akses unlimited ke course premium, tiket konferensi, dan buku.' },
                            { icon: Award, title: 'Competitive Salary', desc: 'Gaji di atas rata-rata pasar, review performa 2x setahun, dan opsi saham (ESOP).' },
                        ].map((b, i) => (
                            <SpotlightCard key={i} className="p-8 h-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg transition-shadow">
                                <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6 border border-blue-100 dark:border-blue-500/20">
                                    <b.icon size={28} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{b.title}</h3>
                                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{b.desc}</p>
                            </SpotlightCard>
                        ))}
                    </div>
                </div>
            </Section>

            {/* Openings */}
            <Section id="openings" className="py-24">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Posisi Terbuka</h2>
                        <p className="text-slate-500 dark:text-slate-400">Temukan peran yang sesuai dengan keahlianmu.</p>
                    </div>
                    
                    {/* Filters */}
                    <div className="flex flex-wrap gap-3">
                         <div className="relative group">
                            <select 
                                value={dept} 
                                onChange={(e) => setDept(e.target.value)}
                                className="appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl px-4 py-2.5 pr-10 focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 cursor-pointer hover:border-blue-300 transition shadow-sm"
                            >
                                {departments.map(d => <option key={d} value={d} className="bg-white dark:bg-slate-800">{d}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        </div>
                        <div className="relative group">
                            <select 
                                value={loc} 
                                onChange={(e) => setLoc(e.target.value)}
                                className="appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl px-4 py-2.5 pr-10 focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 cursor-pointer hover:border-blue-300 transition shadow-sm"
                            >
                                {locations.map(l => <option key={l} value={l} className="bg-white dark:bg-slate-800">{l}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        </div>
                    </div>
                </div>

                <div className="mb-8">
                     <div className="relative">
                        <input
                            ref={searchInputRef}
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Cari berdasarkan role, teknologi, atau keyword..."
                            className="w-full px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-400 dark:focus:border-blue-500/50 outline-none transition text-lg shadow-sm"
                        />
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 p-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400">
                             <kbd className="text-xs font-mono">⌘K</kbd>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="py-20 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
                        <div className="text-slate-500 dark:text-slate-400">Sedang memuat lowongan...</div>
                    </div>
                ) : filteredOpenings.length === 0 ? (
                    <div className="py-20 text-center bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 border-dashed">
                        <div className="text-slate-500 dark:text-slate-400 text-lg mb-2">Tidak ada lowongan yang cocok</div>
                        <p className="text-slate-400 dark:text-slate-500">Coba ubah filter atau kata kunci pencarian Anda.</p>
                        <button onClick={() => {setDept('All'); setLoc('All'); setQ('')}} className="mt-4 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-semibold">
                            Reset Filter
                        </button>
                    </div>
                ) : (
            <motion.div 
                variants={staggerContainer}
                initial="initial"
                whileInView="animate"
                viewport={{ once: true }}
                className="grid gap-4"
            >
                {filteredOpenings.map(({ icon: Icon, title, dept, tags, location, summary, seniority }, i) => (
                    <motion.div key={title} variants={fadeInUp}>
                        <SpotlightCard 
                            spotlightColor="rgba(47, 122, 217, 0.15)"
                            className="cursor-pointer group rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg transition-shadow"
                        >
                            <div 
                                onClick={() => { setSelected({ Icon, title, dept, location, tags, summary, seniority }); setShowModal(true); }}
                                className="relative flex flex-col md:flex-row md:items-center gap-6 p-6"
                            >
                                <div className="flex items-center gap-5 flex-1">
                                    <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition duration-300">
                                        <Icon size={28} />
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900 dark:text-white text-xl group-hover:text-blue-700 dark:group-hover:text-blue-400 transition">{title}</div>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                                            <span className="flex items-center gap-1.5"><Briefcase size={12}/> {dept}</span>
                                            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                                            <span className="flex items-center gap-1.5"><Globe size={12}/> {location}</span>
                                            {seniority && (
                                                <>
                                                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                                                    <span className="text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-xs border border-slate-200 dark:border-slate-600">{seniority}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center justify-between md:justify-end gap-6 md:w-auto w-full mt-4 md:mt-0 pl-[4.5rem] md:pl-0 border-t md:border-t-0 border-slate-100 dark:border-slate-700 pt-4 md:pt-0">
                                    <div className="hidden lg:flex flex-wrap gap-2 justify-end max-w-[240px]">
                                        {tags.slice(0, 3).map((t) => (
                                            <span key={t} className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                {t}
                                            </span>
                                        ))}
                                        {tags.length > 3 && <span className="text-xs text-slate-400 dark:text-slate-500 self-center">+{tags.length - 3}</span>}
                                    </div>
                                    <div className="flex items-center gap-2 text-white font-semibold text-sm bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-5 py-2.5 rounded-xl transition shadow-[0_10px_30px_rgba(31,95,191,0.3)]">
                                        Apply <ArrowRight size={16} className="group-hover:translate-x-1 transition" />
                                    </div>
                                </div>
                            </div>
                        </SpotlightCard>
                    </motion.div>
                ))}
            </motion.div>
        )}
            </Section>

            {/* FAQ */}
            <Section className="py-20 border-t border-slate-100 dark:border-slate-800">
                <motion.div 
                    initial="initial"
                    whileInView="animate"
                    viewport={{ once: true }}
                    variants={staggerContainer}
                    className="max-w-3xl mx-auto"
                >
                    <motion.h2 variants={fadeInUp} className="text-3xl font-bold text-slate-900 dark:text-white text-center mb-10">Pertanyaan Umum</motion.h2>
                    <div className="space-y-2">
                        {faqs.map((f, i) => (
                            <motion.div key={i} variants={fadeInUp}>
                                <FAQItem question={f.q} answer={f.a} />
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </Section>

            {/* CTA Footer */}
            <Section className="py-24">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <SpotlightCard spotlightColor="rgba(255, 255, 255, 0.1)" className="rounded-3xl border-0 overflow-hidden bg-transparent">
                        <div className="relative bg-gradient-to-br from-blue-600 to-blue-800 p-12 text-center h-full overflow-hidden">
                            <div className="absolute top-0 right-0 w-80 h-80 bg-green-400/20 rounded-full blur-3xl -mr-20 -mt-20" />
                            <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -ml-20 -mb-20" />
                            <div className="relative z-10 flex flex-col items-center">
                                <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Siap Membuat Dampak?</h2>
                                <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
                                    Jangan ragu untuk menyapa kami meskipun belum ada posisi yang pas. 
                                    Kami selalu mencari talenta luar biasa.
                                </p>
                                <MagneticButton>
                                    <a href="mailto:talent@rana.id" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-blue-700 font-bold hover:bg-blue-50 transition shadow-xl hover:-translate-y-0.5">
                                        Email Talent Team <ArrowRight size={18} />
                                    </a>
                                </MagneticButton>
                            </div>
                        </div>
                    </SpotlightCard>
                </motion.div>
            </Section>

            {/* Modal Logic (Preserved) */}
            <AnimatePresence>
                {showModal && selected && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/50 dark:bg-black/80 backdrop-blur-sm" 
                            onClick={() => setShowModal(false)} 
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 24 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 24 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl flex flex-col custom-scrollbar"
                        >
                            {/* Header */}
                            <div className="sticky top-0 z-20 flex items-start justify-between gap-4 p-6 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-500/20">
                                        {selected.Icon && <selected.Icon size={24} />}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                                            <span>{selected.title}</span>
                                            {(selected.seniority || selected.dept || selected.location) && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800">
                                                    {selected.seniority || 'Open'}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                                            <span>{selected.dept}</span>
                                            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                                            <span>{selected.location}</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition"
                                >
                                    <span className="sr-only">Close</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 18 18"/></svg>
                                </button>
                            </div>

                            <div className="p-6 pt-2">
                                {/* Details Section */}
                                <div className="mb-8">
                                    <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <Briefcase size={14} /> Ringkasan Pekerjaan
                                    </h3>
                                    {selected.summary ? (
                                        <div className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                                            {selected.summary}
                                        </div>
                                    ) : (
                                        <div className="text-slate-400 dark:text-slate-500 text-sm italic">Belum ada deskripsi rinci.</div>
                                    )}
                                    
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {(selected.tags || []).map((t) => (
                                            <span key={t} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 text-xs text-blue-700 dark:text-blue-200">
                                                {t}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-white/10 to-transparent mb-8" />

                                {/* Application Form */}
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Kirim Lamaran</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Lengkapi formulir di bawah ini untuk melamar posisi ini.</p>
                                    
                                    {submitMsg && (
                                        <div className={`mb-6 px-4 py-3 rounded-xl border ${submitMsg.includes('berhasil') ? 'border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'border-red-300 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300'} text-sm flex items-center gap-3`}>
                                            {submitMsg.includes('berhasil') ? <CheckCircle2 size={18} /> : <Shield size={18} />}
                                            {submitMsg}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">Nama Lengkap <span className="text-red-400">*</span></label>
                                            <input
                                                value={applyForm.name}
                                                onChange={(e) => setApplyForm(f => ({ ...f, name: e.target.value }))}
                                                placeholder="John Doe"
                                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-400 dark:focus:border-blue-500/50 focus:ring-1 focus:ring-blue-400 dark:focus:ring-blue-500/50 outline-none transition"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">Email <span className="text-red-400">*</span></label>
                                            <input
                                                value={applyForm.email}
                                                onChange={(e) => setApplyForm(f => ({ ...f, email: e.target.value }))}
                                                placeholder="john@example.com"
                                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-400 dark:focus:border-blue-500/50 focus:ring-1 focus:ring-blue-400 dark:focus:ring-blue-500/50 outline-none transition"
                                            />
                                        </div>
                                        <div className="space-y-1 md:col-span-2">
                                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">Nomor HP/WhatsApp</label>
                                            <input
                                                value={applyForm.phone}
                                                onChange={(e) => setApplyForm(f => ({ ...f, phone: e.target.value }))}
                                                placeholder="0812..."
                                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-400 dark:focus:border-blue-500/50 focus:ring-1 focus:ring-blue-400 dark:focus:ring-blue-500/50 outline-none transition"
                                            />
                                        </div>
                                        <div className="space-y-1 md:col-span-2">
                                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">CV / Resume <span className="text-red-400">*</span></label>
                                            
                                            {resumeFile ? (
                                                <div className="flex items-center justify-between p-3 rounded-xl border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10">
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-300 flex-shrink-0">
                                                            <FileText size={16} />
                                                        </div>
                                                        <div className="truncate text-sm text-blue-700 dark:text-blue-200 font-medium">
                                                            {resumeFile.name}
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={() => setResumeFile(null)}
                                                        className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-red-500 dark:hover:text-red-300 transition"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    <div className="relative">
                                                        <input
                                                            type="file"
                                                            id="resume-upload"
                                                            className="hidden"
                                                            accept=".pdf,.doc,.docx"
                                                            onChange={(e) => {
                                                                if (e.target.files?.[0]) {
                                                                    setResumeFile(e.target.files[0]);
                                                                    setApplyForm(f => ({ ...f, resumeLink: '' }));
                                                                }
                                                            }}
                                                        />
                                                        <label 
                                                            htmlFor="resume-upload"
                                                            className="flex flex-col items-center justify-center w-full h-24 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-500/30 hover:bg-blue-50/50 dark:hover:bg-white/[0.02] transition cursor-pointer group"
                                                        >
                                                            <div className="flex flex-col items-center gap-2 text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition">
                                                                <Upload size={20} />
                                                                <span className="text-xs font-medium">Upload File (PDF/DOC)</span>
                                                            </div>
                                                        </label>
                                                    </div>
                                                    
                                                    <div className="relative flex items-center gap-4">
                                                        <div className="h-px bg-slate-200 dark:bg-white/5 flex-1" />
                                                        <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">ATAU</span>
                                                        <div className="h-px bg-slate-200 dark:bg-white/5 flex-1" />
                                                    </div>

                                                    <input
                                                        value={applyForm.resumeLink}
                                                        onChange={(e) => setApplyForm(f => ({ ...f, resumeLink: e.target.value }))}
                                                        placeholder="Paste Link (LinkedIn / Drive)"
                                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-400 dark:focus:border-blue-500/50 focus:ring-1 focus:ring-blue-400 dark:focus:ring-blue-500/50 outline-none transition"
                                                    />
                                                </div>
                                            )}
                                            <p className="text-[10px] text-slate-400 dark:text-slate-500 ml-1">Wajib menyertakan salah satu.</p>
                                        </div>
                                        <div className="space-y-1 md:col-span-2">
                                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">Link Portofolio (Opsional)</label>
                                            <input
                                                value={applyForm.portfolioLink}
                                                onChange={(e) => setApplyForm(f => ({ ...f, portfolioLink: e.target.value }))}
                                                placeholder="https://dribbble.com/..."
                                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-400 dark:focus:border-blue-500/50 focus:ring-1 focus:ring-blue-400 dark:focus:ring-blue-500/50 outline-none transition"
                                            />
                                        </div>
                                        <div className="space-y-1 md:col-span-2">
                                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">Cover Letter / Pesan Singkat</label>
                                            <textarea
                                                value={applyForm.coverLetter}
                                                onChange={(e) => setApplyForm(f => ({ ...f, coverLetter: e.target.value }))}
                                                placeholder="Ceritakan singkat tentang diri Anda dan kenapa Anda cocok..."
                                                rows={4}
                                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-400 dark:focus:border-blue-500/50 focus:ring-1 focus:ring-blue-400 dark:focus:ring-blue-500/50 outline-none transition resize-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-8 flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                        <button
                                            onClick={() => setShowModal(false)}
                                            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition"
                                        >
                                            Batal
                                        </button>
                                        <button
                                            disabled={submitting}
                                            onClick={async () => {
                                                if (!applyForm.name || !applyForm.email) {
                                                    setSubmitMsg('Nama dan Email wajib diisi.');
                                                    return;
                                                }
                                                if (!resumeFile && !applyForm.resumeLink) {
                                                    setSubmitMsg('Wajib melampirkan CV (File atau Link).');
                                                    return;
                                                }
                                                setSubmitting(true);
                                                setSubmitMsg('');
                                                try {
                                                    const formData = new FormData();
                                                    formData.append('name', applyForm.name);
                                                    formData.append('email', applyForm.email);
                                                    if (applyForm.phone) formData.append('phone', applyForm.phone);
                                                    formData.append('positionTitle', selected.title);
                                                    formData.append('positionDept', selected.dept);
                                                    formData.append('seniority', selected.seniority);
                                                    if (applyForm.portfolioLink) formData.append('portfolioLink', applyForm.portfolioLink);
                                                    if (applyForm.coverLetter) formData.append('coverLetter', applyForm.coverLetter);

                                                    if (resumeFile) {
                                                        formData.append('resume', resumeFile);
                                                    } else {
                                                        formData.append('resumeLink', applyForm.resumeLink);
                                                    }

                                                    const res = await api.post('/careers/applications', formData, {
                                                        headers: { 'Content-Type': 'multipart/form-data' }
                                                    });

                                                    if (res.data?.status === 'success') {
                                                        setSubmitMsg('Lamaran berhasil dikirim! Kami akan segera menghubungi Anda.');
                                                        setApplyForm({ name: '', email: '', phone: '', resumeLink: '', portfolioLink: '', coverLetter: '' });
                                                        setResumeFile(null);
                                                        setTimeout(() => {
                                                            setShowModal(false);
                                                            setSubmitMsg('');
                                                        }, 2500);
                                                    } else {
                                                        setSubmitMsg('Gagal mengirim lamaran.');
                                                    }
                                                } catch (e) {
                                                    console.error(e);
                                                    setSubmitMsg(e.response?.data?.message || 'Gagal mengirim lamaran. Silakan coba lagi.');
                                                } finally {
                                                    setSubmitting(false);
                                                }
                                            }}
                                            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-bold shadow-[0_10px_30px_rgba(31,95,191,0.3)] hover:shadow-[0_15px_40px_rgba(31,95,191,0.45)] transition disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            {submitting ? (
                                                <>
                                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Mengirim...
                                                </>
                                            ) : (
                                                <>
                                                    <Rocket size={16} />
                                                    Kirim Lamaran
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <Footer />
        </div>
    );
};

export default Careers;
