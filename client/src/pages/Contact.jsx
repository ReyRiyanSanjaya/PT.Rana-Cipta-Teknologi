import React, { useEffect, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import useCms from '../hooks/useCms';
import { Mail, Phone, MapPin, Send, Loader, CheckCircle, AlertTriangle, Globe, Shield, Activity, Users, ArrowRight } from 'lucide-react';
import gsap from 'gsap';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import NetworkGlobe from '../components/3d/NetworkGlobe';
import usePageMeta from '../hooks/usePageMeta';

const ContactCanvas = () => {
    return (
        <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
            <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
                <ambientLight intensity={0.5} />
                <NetworkGlobe />
            </Canvas>
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a0b0f]/80 via-[#0b1020]/50 to-[#0a0b0f]" />
            {/* Ambient Glows */}
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[120px]" />
        </div>
    );
};

const StatCard = ({ icon: Icon, label, value, delay }) => (
    <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay, duration: 0.5 }}
        className="flex flex-col items-center p-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm hover:bg-white/10 transition-colors"
    >
        <div className="p-3 bg-indigo-500/20 rounded-xl mb-4 text-indigo-400">
            <Icon size={24} />
        </div>
        <h4 className="text-3xl font-bold text-white mb-1">{value}</h4>
        <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">{label}</p>
    </motion.div>
);

const InputField = ({ label, name, type = "text", value, onChange, placeholder, required = false, isTextArea = false }) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <div className="relative">
            <label className={`absolute left-4 transition-all duration-300 pointer-events-none ${
                isFocused || value ? '-top-2.5 text-xs bg-[#0b1020] px-2 text-indigo-400' : 'top-4 text-slate-400'
            }`}>
                {label} {required && <span className="text-red-400">*</span>}
            </label>
            
            {isTextArea ? (
                <textarea
                    name={name}
                    value={value}
                    onChange={onChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    required={required}
                    rows="4"
                    className={`w-full bg-white/5 border rounded-xl p-4 pt-4 outline-none transition-all duration-300 text-white placeholder-transparent ${
                        isFocused ? 'border-indigo-500 ring-1 ring-indigo-500/50' : 'border-white/10 hover:border-white/20'
                    }`}
                    placeholder={placeholder}
                />
            ) : (
                <input
                    type={type}
                    name={name}
                    value={value}
                    onChange={onChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    required={required}
                    className={`w-full bg-white/5 border rounded-xl p-4 outline-none transition-all duration-300 text-white placeholder-transparent ${
                        isFocused ? 'border-indigo-500 ring-1 ring-indigo-500/50' : 'border-white/10 hover:border-white/20'
                    }`}
                    placeholder={placeholder}
                />
            )}
        </div>
    );
};

const Contact = () => {
    const { cmsContent } = useCms();
    const headerRef = useRef(null);
    const formRef = useRef(null);
    const infoRef = useRef(null);

    const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
    const [formStatus, setFormStatus] = useState({ status: 'idle', message: '' });

    usePageMeta({
        title: 'Hubungi Kami | RanaPOS Enterprise',
        description: 'Solusi POS Enterprise terpercaya untuk pertumbuhan bisnis Anda. Hubungi tim ahli kami untuk konsultasi.'
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormStatus({ status: 'loading', message: '' });

        try {
            await axios.post('/api/contact/messages', formData);
            setFormStatus({ status: 'success', message: 'Pesan Anda telah terkirim!' });
            setFormData({ name: '', email: '', subject: '', message: '' });
            setTimeout(() => setFormStatus({ status: 'idle', message: '' }), 5000);
        } catch (error) {
            setFormStatus({ status: 'error', message: 'Terjadi kesalahan. Silakan coba lagi.' });
            setTimeout(() => setFormStatus({ status: 'idle', message: '' }), 5000);
        }
    };

    useEffect(() => {
        const tl = gsap.timeline();
        tl.fromTo(headerRef.current, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'power3.out' })
          .fromTo('.stat-card', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power3.out' }, '-=0.5');
    }, []);

    return (
        <div className="min-h-screen bg-[#0a0b0f] font-sans text-slate-200 relative overflow-x-hidden selection:bg-indigo-500/30">
            <ContactCanvas />
            <Navbar />
            
            <div className="relative z-10 pt-32 pb-20">
                {/* Hero Section */}
                <div ref={headerRef} className="text-center px-4 max-w-4xl mx-auto mb-20">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium mb-6">
                        <Globe size={16} />
                        <span>Global Enterprise Solutions</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
                        Mari Berkolaborasi untuk <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
                            Pertumbuhan Bisnis
                        </span>
                    </h1>
                    <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
                        Bergabunglah dengan ribuan merchant yang telah mempercayakan operasional bisnis mereka pada infrastruktur RanaPOS yang aman dan skalabel.
                    </p>
                </div>

                {/* Stats Section */}
                <div className="max-w-7xl mx-auto px-4 mb-24">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard icon={Users} label="Active Merchants" value="10,000+" delay={0.1} />
                        <StatCard icon={Activity} label="Transactions/Day" value="500K+" delay={0.2} />
                        <StatCard icon={Shield} label="Uptime SLA" value="99.99%" delay={0.3} />
                        <StatCard icon={Globe} label="Cities Covered" value="50+" delay={0.4} />
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4">
                    <div className="grid lg:grid-cols-2 gap-16 items-start">
                        {/* Contact Info */}
                        <div ref={infoRef} className="space-y-10">
                            <div>
                                <h3 className="text-3xl font-bold text-white mb-4">Hubungi Tim Kami</h3>
                                <p className="text-slate-400 text-lg leading-relaxed">
                                    Punya pertanyaan tentang fitur Enterprise? Tim ahli kami siap membantu Anda menemukan solusi terbaik.
                                </p>
                            </div>

                            <div className="grid gap-6">
                                <motion.div 
                                    whileHover={{ x: 10 }}
                                    className="group flex items-center gap-6 p-6 bg-white/5 border border-white/10 rounded-2xl hover:border-indigo-500/50 transition-all duration-300"
                                >
                                    <div className="w-14 h-14 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                        <Mail size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold text-white mb-1">Email Inquiry</h4>
                                        <p className="text-slate-400">{cmsContent.CMS_CONTACT_EMAIL || 'enterprise@rana.com'}</p>
                                    </div>
                                </motion.div>

                                <motion.div 
                                    whileHover={{ x: 10 }}
                                    className="group flex items-center gap-6 p-6 bg-white/5 border border-white/10 rounded-2xl hover:border-indigo-500/50 transition-all duration-300"
                                >
                                    <div className="w-14 h-14 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-400 group-hover:bg-violet-500 group-hover:text-white transition-all">
                                        <Phone size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold text-white mb-1">Call Center (24/7)</h4>
                                        <p className="text-slate-400">{cmsContent.CMS_CONTACT_PHONE || '+62 812 9999 8888'}</p>
                                    </div>
                                </motion.div>

                                <motion.div 
                                    whileHover={{ x: 10 }}
                                    className="group flex items-center gap-6 p-6 bg-white/5 border border-white/10 rounded-2xl hover:border-indigo-500/50 transition-all duration-300"
                                >
                                    <div className="w-14 h-14 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white transition-all">
                                        <MapPin size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold text-white mb-1">Headquarters</h4>
                                        <p className="text-slate-400">Menara Rana, SCBD Lot 8<br/>Jakarta Selatan, Indonesia</p>
                                    </div>
                                </motion.div>
                            </div>

                        </div>

                        {/* Contact Form */}
                        <div ref={formRef} className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 rounded-3xl blur-xl" />
                            <form onSubmit={handleSubmit} className="relative bg-[#0b1020]/80 backdrop-blur-xl border border-white/10 p-8 md:p-10 rounded-3xl shadow-2xl">
                                <div className="space-y-6">
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <InputField 
                                            label="Nama Lengkap" 
                                            name="name" 
                                            value={formData.name} 
                                            onChange={handleInputChange} 
                                            placeholder="John Doe"
                                            required 
                                        />
                                        <InputField 
                                            label="Email Bisnis" 
                                            name="email" 
                                            type="email"
                                            value={formData.email} 
                                            onChange={handleInputChange} 
                                            placeholder="john@company.com"
                                            required 
                                        />
                                    </div>
                                    
                                    <InputField 
                                        label="Subjek" 
                                        name="subject" 
                                        value={formData.subject} 
                                        onChange={handleInputChange} 
                                        placeholder="Partnership / Demo Request"
                                        required 
                                    />

                                    <InputField 
                                        label="Pesan Detail" 
                                        name="message" 
                                        isTextArea
                                        value={formData.message} 
                                        onChange={handleInputChange} 
                                        placeholder="Ceritakan kebutuhan bisnis Anda..."
                                        required 
                                    />

                                    <div className="pt-4">
                                        <motion.button 
                                            type="submit" 
                                            disabled={formStatus.status === 'loading'}
                                            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-xl shadow-[0_10px_30px_rgba(79,70,229,0.35)] hover:shadow-[0_15px_40px_rgba(124,58,237,0.45)] transition duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group"
                                            whileHover={{ scale: formStatus.status === 'idle' ? 1.02 : 1 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <AnimatePresence mode="wait">
                                                {formStatus.status === 'loading' ? (
                                                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                                        <Loader className="animate-spin" size={20} />
                                                    </motion.div>
                                                ) : formStatus.status === 'success' ? (
                                                    <motion.div key="success" className="flex items-center gap-2" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                                                        <span>Terkirim</span> <CheckCircle size={20} />
                                                    </motion.div>
                                                ) : formStatus.status === 'error' ? (
                                                    <motion.div key="error" className="flex items-center gap-2" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                                                        <span>Gagal</span> <AlertTriangle size={20} />
                                                    </motion.div>
                                                ) : (
                                                    <motion.div key="idle" className="flex items-center gap-2">
                                                        <span>Kirim Pesan</span> 
                                                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.button>
                                        <p className="text-center text-slate-500 text-xs mt-4">
                                            Data Anda aman dan terenkripsi. Kami akan membalas dalam waktu 1x24 jam.
                                        </p>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default Contact;
