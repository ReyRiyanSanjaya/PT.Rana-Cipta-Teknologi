import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Info, Zap, BookOpen, Mail, User, Package } from 'lucide-react';

const navItems = [
    { name: 'Beranda', path: '/', icon: Home },
    { name: 'Tentang', path: '/about', icon: Info },
    { name: 'Fitur', path: '/features', icon: Zap },
    { name: 'Distributor', path: '/distributor', icon: Package },
    { name: 'Blog', path: '/blog', icon: BookOpen },
    { name: 'Kontak', path: '/contact', icon: Mail },
];

const BottomNav = ({ onLayoutChange }) => {
    const location = useLocation();
    const [activeTab, setActiveTab] = useState(location.pathname);
    const [isVisible, setIsVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);
    const shellRef = useRef(null);
    const MotionLink = useMemo(() => motion.create(Link), []);

    useEffect(() => {
        setActiveTab(location.pathname);
    }, [location]);

    // Hide on scroll down, show on scroll up
    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            
            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                setIsVisible(false);
            } else {
                setIsVisible(true);
            }
            
            setLastScrollY(currentScrollY);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [lastScrollY]);

    useEffect(() => {
        if (!onLayoutChange) return;

        const el = shellRef.current;
        const update = () => {
            const rect = el?.getBoundingClientRect();
            const height = rect ? Math.ceil(rect.height) : 0;
            onLayoutChange({ height, isVisible });
        };

        update();

        if (!el) return;
        let ro;
        if (typeof ResizeObserver !== 'undefined') {
            ro = new ResizeObserver(update);
            ro.observe(el);
        }
        window.addEventListener('resize', update, { passive: true });

        return () => {
            ro?.disconnect?.();
            window.removeEventListener('resize', update);
        };
    }, [isVisible, activeTab, onLayoutChange]);

    if (location.pathname === '/pos') {
        return null;
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden pointer-events-none pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]">
            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        ref={shellRef}
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                        className="pointer-events-auto mx-4 mb-4"
                    >
                        <nav className="relative bg-[#0f172a]/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] px-2 py-3 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.06] to-transparent" />
                            <ul className="flex justify-around items-center">
                                {navItems.map((item) => {
                                    const isActive = activeTab === item.path;
                                    const Icon = item.icon;

                                    return (
                                        <li key={item.name} className="relative z-10">
                                            <MotionLink
                                                to={item.path}
                                                className="relative flex flex-col items-center justify-center w-14 h-14 select-none"
                                                onClick={() => setActiveTab(item.path)}
                                                whileTap={{ scale: 0.94 }}
                                            >
                                                {isActive && (
                                                    <motion.div
                                                        layoutId="activeTabBubble"
                                                        className="absolute inset-0 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-xl -z-10"
                                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                                    />
                                                )}

                                                <motion.div
                                                    animate={{
                                                        scale: isActive ? 1.12 : 1,
                                                        y: isActive ? -3 : 0
                                                    }}
                                                    transition={{ type: "spring", stiffness: 320, damping: 20 }}
                                                >
                                                    <Icon 
                                                        size={22} 
                                                        className={`transition-colors duration-200 ${
                                                            isActive ? 'text-white' : 'text-slate-400'
                                                        }`} 
                                                    />
                                                </motion.div>

                                                <AnimatePresence>
                                                    {isActive && (
                                                        <motion.span
                                                            initial={{ opacity: 0, y: 6 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: 6 }}
                                                            transition={{ duration: 0.18 }}
                                                            className="absolute bottom-1 text-[10px] font-semibold text-white"
                                                        >
                                                            {item.name}
                                                        </motion.span>
                                                    )}
                                                </AnimatePresence>

                                                {isActive && (
                                                    <motion.div
                                                        layoutId="activeDot"
                                                        className="absolute -bottom-1 w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_18px_rgba(99,102,241,0.9)]"
                                                        transition={{ type: "spring", stiffness: 400, damping: 26 }}
                                                    />
                                                )}
                                            </MotionLink>
                                        </li>
                                    );
                                })}
                            </ul>
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default BottomNav;
