import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Facebook, Twitter, Instagram, Linkedin, Mail, MapPin, Phone, Heart, ArrowRight, Smartphone, Apple } from 'lucide-react';

const Footer = () => {
    const navLinks = [
        { name: 'Beranda', path: '/' },
        { name: 'Tentang', path: '/about' },
        { name: 'Fitur', path: '/features' },
        { name: 'Komunitas', path: '/community' },
        { name: 'Blog', path: '/blog' },
        { name: 'Kontak', path: '/contact' },
        { name: 'Karir', path: '/careers' }
    ];

    // Legal links removed per request

    return (
        <footer className="relative z-10 bg-transparent border-t border-white/10 pt-24 pb-14 overflow-hidden">
            <motion.div
                aria-hidden="true"
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
            >
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></div>
                <motion.div
                    className="absolute -top-40 -left-40 w-[28rem] h-[28rem] bg-indigo-500/15 rounded-full blur-[120px]"
                    animate={{ x: [0, 40, -30, 0], y: [0, -20, 30, 0] }}
                    transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                    className="absolute -bottom-40 -right-40 w-[28rem] h-[28rem] bg-violet-500/15 rounded-full blur-[120px]"
                    animate={{ x: [0, -30, 25, 0], y: [0, 25, -20, 0] }}
                    transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
                />
                <div className="absolute inset-x-0 top-10 h-24 bg-gradient-to-r from-slate-900/20 via-transparent to-slate-900/20 blur-2xl" />
            </motion.div>

            <div className="w-screen max-w-none relative left-1/2 -translate-x-1/2 px-4 md:px-8 z-10">
                <div className="group mx-auto max-w-7xl p-[1px] rounded-[30px] bg-gradient-to-br from-indigo-500/25 via-fuchsia-500/20 to-violet-500/25 shadow-[0_25px_80px_rgba(0,0,0,0.35)]">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="relative overflow-hidden bg-slate-900/60 border border-white/10 rounded-[28px] p-8 md:p-10 backdrop-blur-2xl"
                    >
                        <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.12),transparent_60%)]" />
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-x-3 md:gap-y-6 md:[&>div]:pl-3 md:[&>div:not(:first-child)]:border-l md:[&>div:not(:first-child)]:border-white/10">
                    {/* Brand Section */}
                    <motion.div 
                        className="md:col-span-4 md:col-start-1 space-y-6"
                        initial={{ opacity: 0, y: 14 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.45, delay: 0.05 }}
                    >
                        <Link to="/" className="flex items-center gap-3 group w-fit">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-[0_0_15px_rgba(99,102,241,0.5)] group-hover:rotate-12 transition-transform duration-500">
                                R
                            </div>
                            <span className="text-2xl font-black tracking-tight text-white">
                                Rana Market
                            </span>
                        </Link>
                        <p className="text-slate-300 leading-relaxed max-w-sm">
                            Platform POS modern yang membantu UMKM tumbuh dengan data cerdas, manajemen inventaris real-time, dan komunitas pengusaha yang solid.
                        </p>
                        <div className="flex items-center gap-3 md:gap-4">
                            {[Facebook, Twitter, Instagram, Linkedin].map((Icon, idx) => (
                                <motion.a
                                    key={idx}
                                    href="#"
                                    whileHover={{ scale: 1.07, rotate: 3 }}
                                    whileTap={{ scale: 0.97 }}
                                    className="w-12 h-12 rounded-xl bg-slate-800/60 border border-white/10 backdrop-blur-md flex items-center justify-center text-slate-300 hover:text-white hover:border-indigo-400/50 hover:bg-indigo-500/25 transition-all duration-300"
                                >
                                    <Icon size={18} />
                                </motion.a>
                            ))}
                        </div>
                        <div className="pt-2">
                            <div className="inline-flex items-center gap-2 text-slate-400 text-xs">
                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/10">
                                    <Heart className="text-rose-400" size={14} />
                                    Dibuat untuk UMKM Indonesia
                                </span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Navigation Links */}
                    <motion.div 
                        className="md:col-span-2"
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.45, delay: 0.12 }}
                    >
                        <h4 className="text-white font-bold text-lg mb-3">Menu</h4>
                        <ul className="space-y-2.5">
                            {navLinks.map((link) => (
                                <li key={link.name}>
                                    <Link
                                        to={link.path}
                                        className="group relative inline-flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
                                    >
                                        <span>{link.name}</span>
                                        <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 translate-x-[-4px] group-hover:translate-x-0 transition-all text-indigo-400" />
                                        <span className="absolute left-0 -bottom-1 w-0 group-hover:w-full h-px bg-gradient-to-r from-indigo-500/60 to-violet-500/60 transition-all" />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </motion.div>

                    {/* Contact Info */}
                    <motion.div 
                        className="md:col-span-3"
                        initial={{ opacity: 0, y: 18 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.45, delay: 0.2 }}
                    >
                        <h4 className="text-white font-bold text-lg mb-5">Hubungi Kami</h4>
                        <ul className="space-y-3.5">
                            <li className="flex items-start gap-3 text-slate-400">
                                <Mail size={18} className="mt-1 text-indigo-400 shrink-0" />
                                <span>hello@rana.id</span>
                            </li>
                            <li className="flex items-start gap-3 text-slate-400">
                                <Phone size={18} className="mt-1 text-indigo-400 shrink-0" />
                                <span>+62 812 3456 7890</span>
                            </li>
                            <li className="flex items-start gap-3 text-slate-400">
                                <MapPin size={18} className="mt-1 text-indigo-400 shrink-0" />
                                <span>Jakarta Selatan, Indonesia</span>
                            </li>
                        </ul>
                        
                    </motion.div>

                    {/* App Downloads */}
                    <motion.div 
                        className="md:col-span-3"
                        initial={{ opacity: 0, y: 18 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.45, delay: 0.28 }}
                    >
                        <h4 className="text-white font-bold text-lg mb-5">Dapatkan Aplikasi</h4>
                        <div className="grid gap-2.5">
                            <motion.a
                                href="#"
                                className="group inline-flex w-full items-center justify-start gap-3 px-3 py-2.5 rounded-xl bg-slate-800/60 border border-white/10 text-white hover:bg-slate-700/60 transition-all"
                                aria-label="Dapatkan di Google Play"
                                whileHover={{ scale: 1.03, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Smartphone size={20} className="text-emerald-400" />
                                <div className="flex flex-col leading-tight">
                                    <span className="text-[10px] tracking-widest text-slate-300">GET IT ON</span>
                                    <span className="text-sm font-bold">Google Play</span>
                                </div>
                            </motion.a>
                            <motion.a
                                href="#"
                                className="group inline-flex w-full items-center justify-start gap-3 px-3 py-2.5 rounded-xl bg-slate-800/60 border border-white/10 text-white hover:bg-slate-700/60 transition-all"
                                aria-label="Dapatkan di App Store"
                                whileHover={{ scale: 1.03, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Apple size={20} className="text-slate-200" />
                                <div className="flex flex-col leading-tight">
                                    <span className="text-[10px] tracking-widest text-slate-300">DOWNLOAD ON THE</span>
                                    <span className="text-sm font-bold">App Store</span>
                                </div>
                            </motion.a>
                        </div>
                    </motion.div>
                </div>
                    </motion.div>
                </div>

                <motion.div 
                    className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-0 text-slate-400 border-t border-white/10 pt-6 max-w-7xl mx-auto"
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.45, delay: 0.15 }}
                >
                    <div className="text-xs">© {new Date().getFullYear()} Rana Market v1.0.0. All rights reserved.</div>
                    <div className="text-xs flex items-center gap-2">
                        <span>Dibuat dengan</span>
                        <Heart size={14} className="text-rose-400" />
                        <span>untuk UMKM Indonesia</span>
                    </div>
                </motion.div>
            </div>
        </footer>
    );
};

export default Footer;
