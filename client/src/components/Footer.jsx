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

    return (
        <footer className="relative z-10 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pt-16 pb-10">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8 pb-12">
                    {/* Brand Section */}
                    <div className="md:col-span-4 space-y-5">
                        <Link to="/" className="flex items-center gap-2 w-fit">
                            <img src="/rana-logo.png" alt="RANA" className="h-10 w-auto object-contain" />
                        </Link>
                        <p className="text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm">
                            Platform POS modern yang membantu ribuan pemilik bisnis mengelola dan mengembangkan usaha mereka dengan lebih efisien.
                        </p>
                        <div className="flex items-center gap-3">
                            {[Facebook, Twitter, Instagram, Linkedin].map((Icon, idx) => (
                                <motion.a
                                    key={idx}
                                    href="#"
                                    whileHover={{ scale: 1.07, y: -2 }}
                                    whileTap={{ scale: 0.97 }}
                                    className="w-11 h-11 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-white hover:bg-blue-600 hover:border-blue-600 transition-all duration-300"
                                >
                                    <Icon size={18} />
                                </motion.a>
                            ))}
                        </div>
                    </div>

                    {/* Navigation Links */}
                    <div className="md:col-span-2">
                        <h4 className="text-slate-900 dark:text-white font-bold text-base mb-4">Menu</h4>
                        <ul className="space-y-2.5">
                            {navLinks.map((link) => (
                                <li key={link.name}>
                                    <Link
                                        to={link.path}
                                        className="group inline-flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
                                    >
                                        <span>{link.name}</span>
                                        <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all text-blue-600" />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div className="md:col-span-3">
                        <h4 className="text-slate-900 dark:text-white font-bold text-base mb-4">Hubungi Kami</h4>
                        <ul className="space-y-3.5">
                            <li className="flex items-start gap-3 text-slate-500 dark:text-slate-400">
                                <Mail size={18} className="mt-0.5 text-blue-600 dark:text-blue-400 shrink-0" />
                                <span>hello@rana.id</span>
                            </li>
                            <li className="flex items-start gap-3 text-slate-500 dark:text-slate-400">
                                <Phone size={18} className="mt-0.5 text-blue-600 dark:text-blue-400 shrink-0" />
                                <span>+62 812 3456 7890</span>
                            </li>
                            <li className="flex items-start gap-3 text-slate-500 dark:text-slate-400">
                                <MapPin size={18} className="mt-0.5 text-blue-600 dark:text-blue-400 shrink-0" />
                                <span>Jakarta Selatan, Indonesia</span>
                            </li>
                        </ul>
                    </div>

                    {/* App Downloads */}
                    <div className="md:col-span-3">
                        <h4 className="text-slate-900 dark:text-white font-bold text-base mb-4">Dapatkan Aplikasi</h4>
                        <div className="grid gap-2.5">
                            <motion.a
                                href="#"
                                className="group inline-flex w-full items-center justify-start gap-3 px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-sm transition-all"
                                aria-label="Dapatkan di Google Play"
                                whileHover={{ scale: 1.02, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Smartphone size={20} className="text-green-600 dark:text-green-400" />
                                <div className="flex flex-col leading-tight">
                                    <span className="text-[10px] tracking-widest text-slate-400">GET IT ON</span>
                                    <span className="text-sm font-bold">Google Play</span>
                                </div>
                            </motion.a>
                            <motion.a
                                href="#"
                                className="group inline-flex w-full items-center justify-start gap-3 px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-sm transition-all"
                                aria-label="Dapatkan di App Store"
                                whileHover={{ scale: 1.02, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Apple size={20} className="text-slate-700 dark:text-slate-200" />
                                <div className="flex flex-col leading-tight">
                                    <span className="text-[10px] tracking-widest text-slate-400">DOWNLOAD ON THE</span>
                                    <span className="text-sm font-bold">App Store</span>
                                </div>
                            </motion.a>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-6">
                    <div className="text-xs">© {new Date().getFullYear()} Rana Market. All rights reserved.</div>
                    <div className="text-xs flex items-center gap-2">
                        <span>Dibuat dengan</span>
                        <Heart size={14} className="text-rose-400 fill-rose-400" />
                        <span>untuk UMKM Indonesia</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
