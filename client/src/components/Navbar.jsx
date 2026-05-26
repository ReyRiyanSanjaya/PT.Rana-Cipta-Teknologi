import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { Menu, X, LayoutDashboard, User, LogIn, Rocket, ArrowRight, Home, Info, Sparkles, Users, BookOpen, Briefcase, Phone, Package } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = () => {
    const navRef = useRef(null);
    const logoRef = useRef(null);
    const linksRef = useRef(null);
    const actionsRef = useRef(null);
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();
    const { user } = useAuth();

    // Close mobile menu when route changes
    useEffect(() => {
        if (isMobileMenuOpen) {
            setIsMobileMenuOpen(false);
        }
    }, [location.pathname]);

    // Prevent scrolling when mobile menu is open
    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isMobileMenuOpen]);

    // Scroll Effect
    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 20) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Entrance Animation
    useEffect(() => {
        const tl = gsap.timeline();

        tl.fromTo(navRef.current,
            { y: -100, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }
        )
            .fromTo([logoRef.current, linksRef.current.children, actionsRef.current.children],
                { y: -20, opacity: 0 },
                { y: 0, opacity: 1, stagger: 0.1, duration: 0.5, ease: 'back.out(1.7)' },
                '-=0.4'
            );

    }, []);

    // Hover Animation Helper
    const handleHover = (e, isEnter) => {
        gsap.to(e.target, {
            scale: isEnter ? 1.05 : 1,
            color: isEnter ? '#6366F1' : '#94A3B8',
            duration: 0.2,
            ease: 'power1.out'
        });

        // Underline animation logic could be added here if we used a span ref
    };

    return (
        <nav
            ref={navRef}
            className={`fixed top-0 w-full z-50 transition-all duration-500 ease-in-out ${
                isScrolled || isMobileMenuOpen
                    ? 'bg-[#0a0b0f]/80 backdrop-blur-xl h-20 border-b border-white/10 shadow-2xl'
                    : 'bg-transparent h-24'
            }`}
        >
            <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">

                {/* Logo */}
                <Link to="/" ref={logoRef} className="flex items-center gap-3 group relative z-[60]">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xl transition-all duration-500 shadow-[0_0_15px_rgba(99,102,241,0.5)] ${isScrolled ? 'bg-gradient-to-br from-indigo-600 to-violet-600' : 'bg-gradient-to-br from-indigo-500 to-violet-500'
                        } group-hover:rotate-12`}>
                        R
                    </div>
                    <span className="text-2xl font-black tracking-tight text-white">
                        Rana
                    </span>
                </Link>

                {/* Desktop Links */}
                <div ref={linksRef} className="hidden lg:flex items-center gap-8">
                    {[
                        { name: 'Beranda', path: '/' },
                        { name: 'Tentang', path: '/about' },
                        { name: 'Fitur', path: '/features' },
                        { name: 'Distributor', path: '/distributor' },
                        { name: 'Komunitas', path: '/community' },
                        { name: 'Blog', path: '/blog' },
                        { name: 'Karir', path: '/careers' },
                        { name: 'Kontak', path: '/contact' }
                    ].map((link) => (
                        <Link
                            key={link.name}
                            to={link.path}
                            className="relative font-medium text-slate-300 hover:text-white group py-2 text-sm uppercase tracking-wider"
                            onMouseEnter={(e) => handleHover(e, true)}
                            onMouseLeave={(e) => handleHover(e, false)}
                        >
                            {link.name}
                            {/* Animated Underline */}
                            <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-500 to-violet-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left ease-out ${location.pathname === link.path ? 'scale-x-100' : ''
                                }`} />
                        </Link>
                    ))}
                </div>

                {/* Actions */}
                <div ref={actionsRef} className="flex items-center gap-4 relative z-[70]">
                    {user ? (
                        <Link
                            to="/dashboard"
                            className="hidden lg:flex relative overflow-hidden px-6 py-3 rounded-xl font-bold transform hover:-translate-y-0.5 transition-all duration-300 group bg-gradient-to-r from-sky-400 to-teal-400 text-white shadow-[0_10px_30px_rgba(56,189,248,0.35)] hover:shadow-[0_15px_40px_rgba(45,212,191,0.45)]"
                        >
                            <span className="relative z-10 w-full flex items-center justify-center gap-2">
                                <LayoutDashboard size={18} />
                                Dashboard
                            </span>
                            <div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 group-hover:left-[100%] transition-all duration-700 ease-in-out" />
                        </Link>
                    ) : (
                        <>
                            <Link
                                to="/login"
                                className="hidden lg:block font-bold text-slate-300 hover:text-white transition-colors text-sm uppercase tracking-wider"
                            >
                                Masuk
                            </Link>
                            <Link
                                to="/register"
                                className="hidden lg:flex relative overflow-hidden px-6 py-3 rounded-xl font-bold transform hover:-translate-y-0.5 transition-all duration-300 group bg-gradient-to-r from-sky-500 to-teal-500 text-white shadow-[0_10px_30px_rgba(56,189,248,0.35)] hover:shadow-[0_15px_40px_rgba(45,212,191,0.45)] text-sm uppercase tracking-wider"
                            >
                                <span className="relative z-10 w-full flex items-center justify-center gap-2">
                                    Mulai Sekarang
                                </span>
                                {/* Sheen Effect */}
                                <div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 group-hover:left-[100%] transition-all duration-700 ease-in-out" />
                            </Link>
                        </>
                    )}

                    {/* Mobile Menu Toggle */}
                    <button 
                        className={`lg:hidden p-2 rounded-xl transition-all duration-300 relative z-[80] pointer-events-auto ${isMobileMenuOpen ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-300'}`}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsMobileMenuOpen(!isMobileMenuOpen);
                        }}
                    >
                        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Simple Mobile Menu Overlay */}
            <div 
                className={`fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[100] lg:hidden transition-all duration-300 ${
                    isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
            >
                <div 
                    className={`absolute right-0 top-0 h-full w-[85%] max-w-sm bg-[#0a0b0f] border-l border-white/10 shadow-2xl flex flex-col transition-transform duration-300 transform ${
                        isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-6 pt-10 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xl">
                                R
                            </div>
                            <span className="text-xl font-bold text-white">Rana Digital</span>
                        </div>
                        <button 
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="p-2 text-slate-400 hover:text-white"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Links List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-1">
                        {[
                            { name: 'Beranda', path: '/', icon: <Home size={20} /> },
                            { name: 'Tentang', path: '/about', icon: <Info size={20} /> },
                            { name: 'Fitur', path: '/features', icon: <Sparkles size={20} /> },
                            { name: 'Distributor', path: '/distributor', icon: <Package size={20} /> },
                            { name: 'Komunitas', path: '/community', icon: <Users size={20} /> },
                            { name: 'Blog', path: '/blog', icon: <BookOpen size={20} /> },
                            { name: 'Karir', path: '/careers', icon: <Briefcase size={20} /> },
                            { name: 'Kontak', path: '/contact', icon: <Phone size={20} /> }
                        ].map((link) => (
                            <Link
                                key={link.name}
                                to={link.path}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${
                                    location.pathname === link.path 
                                        ? 'bg-indigo-600/20 text-indigo-400' 
                                        : 'text-slate-300 hover:bg-white/5'
                                }`}
                            >
                                {link.icon}
                                <span className="font-semibold">{link.name}</span>
                                {location.pathname === link.path && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                )}
                            </Link>
                        ))}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 border-t border-white/5 space-y-3">
                        {user ? (
                            <Link
                                to="/dashboard"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="flex items-center justify-center gap-2 w-full p-4 bg-indigo-600 rounded-xl text-white font-bold shadow-lg shadow-indigo-600/20"
                            >
                                <LayoutDashboard size={20} />
                                Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link
                                    to="/register"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="flex items-center justify-center gap-2 w-full p-4 bg-indigo-600 rounded-xl text-white font-bold"
                                >
                                    <Rocket size={20} />
                                    Mulai Sekarang
                                </Link>
                                <Link
                                    to="/login"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="flex items-center justify-center gap-2 w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-bold"
                                >
                                    <LogIn size={20} />
                                    Masuk
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
