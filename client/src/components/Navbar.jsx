import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { Menu, X, LayoutDashboard, LogIn, Rocket, Home, Info, Sparkles, Users, BookOpen, Briefcase, Phone, Package, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import useTheme from '../hooks/useTheme';

const Navbar = () => {
    const navRef = useRef(null);
    const logoRef = useRef(null);
    const linksRef = useRef(null);
    const actionsRef = useRef(null);
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();
    const { user } = useAuth();
    const { theme, toggleTheme } = useTheme();

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

    const navItems = [
        { name: 'Beranda', path: '/' },
        { name: 'Tentang', path: '/about' },
        { name: 'Fitur', path: '/features' },
        { name: 'Distributor', path: '/distributor' },
        { name: 'Komunitas', path: '/community' },
        { name: 'Blog', path: '/blog' },
        { name: 'Karir', path: '/careers' },
        { name: 'Kontak', path: '/contact' }
    ];

    return (
        <nav
            ref={navRef}
            className={`fixed top-0 w-full z-50 transition-all duration-500 ease-in-out ${
                isScrolled || isMobileMenuOpen
                    ? 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl h-20 border-b border-slate-200 dark:border-slate-800 shadow-sm'
                    : 'bg-white/80 dark:bg-slate-900/70 backdrop-blur-md h-24 border-b border-transparent'
            }`}
        >
            <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">

                {/* Logo */}
                <Link to="/" ref={logoRef} className="flex items-center gap-2 group relative z-[60]">
                    <img
                        src="/rana-logo.png"
                        alt="RANA"
                        className="h-9 md:h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                </Link>

                {/* Desktop Links */}
                <div ref={linksRef} className="hidden lg:flex items-center gap-7">
                    {navItems.map((link) => (
                        <Link
                            key={link.name}
                            to={link.path}
                            className={`relative font-medium group py-2 text-sm transition-colors ${
                                location.pathname === link.path
                                    ? 'text-blue-700 dark:text-blue-400'
                                    : 'text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400'
                            }`}
                        >
                            {link.name}
                            <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-600 to-green-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left ease-out ${location.pathname === link.path ? 'scale-x-100' : ''
                                }`} />
                        </Link>
                    ))}
                </div>

                {/* Actions */}
                <div ref={actionsRef} className="flex items-center gap-3 relative z-[70]">
                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        aria-label="Ganti tema"
                    >
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>

                    {user ? (
                        <Link
                            to="/dashboard"
                            className="hidden lg:flex relative overflow-hidden px-6 py-2.5 rounded-xl font-bold transform hover:-translate-y-0.5 transition-all duration-300 group bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-[0_8px_24px_rgba(31,95,191,0.3)] hover:shadow-[0_12px_32px_rgba(31,95,191,0.45)] text-sm"
                        >
                            <span className="relative z-10 w-full flex items-center justify-center gap-2">
                                <LayoutDashboard size={18} />
                                Dashboard
                            </span>
                            <div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 group-hover:left-[100%] transition-all duration-700 ease-in-out" />
                        </Link>
                    ) : (
                        <>
                            <Link
                                to="/login"
                                className="hidden lg:block font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-700 dark:hover:text-blue-400 transition-colors text-sm px-4 py-2.5"
                            >
                                Masuk
                            </Link>
                            <Link
                                to="/register"
                                className="hidden lg:flex relative overflow-hidden px-6 py-2.5 rounded-xl font-bold transform hover:-translate-y-0.5 transition-all duration-300 group bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-[0_8px_24px_rgba(31,95,191,0.3)] hover:shadow-[0_12px_32px_rgba(31,95,191,0.45)] text-sm"
                            >
                                <span className="relative z-10 w-full flex items-center justify-center gap-2">
                                    Coba Gratis
                                </span>
                                <div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 group-hover:left-[100%] transition-all duration-700 ease-in-out" />
                            </Link>
                        </>
                    )}

                    {/* Mobile Menu Toggle */}
                    <button 
                        className={`lg:hidden p-2 rounded-xl transition-all duration-300 relative z-[80] pointer-events-auto ${isMobileMenuOpen ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
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

            {/* Mobile Menu Overlay */}
            <div 
                className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] lg:hidden transition-all duration-300 ${
                    isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
            >
                <div 
                    className={`absolute right-0 top-0 h-full w-[85%] max-w-sm bg-white dark:bg-slate-900 shadow-2xl flex flex-col transition-transform duration-300 transform ${
                        isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-6 pt-10 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <img src="/rana-logo.png" alt="RANA" className="h-10 w-auto object-contain" />
                        <button 
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
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
                                        ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400' 
                                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                            >
                                {link.icon}
                                <span className="font-semibold">{link.name}</span>
                                {location.pathname === link.path && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />
                                )}
                            </Link>
                        ))}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
                        {/* Theme toggle (mobile) */}
                        <button
                            onClick={toggleTheme}
                            className="flex items-center justify-center gap-2 w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 font-semibold"
                        >
                            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                            {theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
                        </button>
                        {user ? (
                            <Link
                                to="/dashboard"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="flex items-center justify-center gap-2 w-full p-4 bg-blue-600 rounded-xl text-white font-bold shadow-lg shadow-blue-600/20"
                            >
                                <LayoutDashboard size={20} />
                                Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link
                                    to="/register"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="flex items-center justify-center gap-2 w-full p-4 bg-blue-600 rounded-xl text-white font-bold"
                                >
                                    <Rocket size={20} />
                                    Coba Gratis
                                </Link>
                                <Link
                                    to="/login"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="flex items-center justify-center gap-2 w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 font-bold"
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
