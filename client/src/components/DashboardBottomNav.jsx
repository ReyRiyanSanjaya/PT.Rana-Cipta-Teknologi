import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Store, Package, Receipt, BarChart3, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DashboardBottomNav = () => {
    const location = useLocation();
    const { user } = useAuth();
    const [isVisible, setIsVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);

    const role = user?.role || 'CASHIER';

    // Define nav items based on role
    let navItems = [];

    if (role === 'CASHIER') {
        navItems = [
            { name: 'Kasir', path: '/pos', icon: Store },
        ];
    } else if (role === 'SUPER_ADMIN') {
        navItems = [
            { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
            { name: 'Toko', path: '/stores', icon: Store },
            { name: 'Langganan', path: '/subscription', icon: Zap },
        ];
    } else {
        // OWNER, STORE_MANAGER, ADMIN
        navItems = [
            { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
            { name: 'Kasir', path: '/pos', icon: Store },
            { name: 'Inventaris', path: '/inventory', icon: Package },
            { name: 'Transaksi', path: '/transactions', icon: Receipt },
            { name: 'Laporan', path: '/reports', icon: BarChart3 },
        ];
    }

    // Hide on scroll down, show on scroll up
    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY > lastScrollY && currentScrollY > 80) {
                setIsVisible(false);
            } else {
                setIsVisible(true);
            }
            setLastScrollY(currentScrollY);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [lastScrollY]);

    // Don't show on POS page (it has its own UI) or public pages
    const hiddenPaths = ['/pos', '/', '/about', '/features', '/blog', '/contact', '/login', '/register', '/community', '/careers', '/distributor'];
    const shouldHide = hiddenPaths.some(p => location.pathname === p) || location.pathname.startsWith('/blog/') || location.pathname.startsWith('/table/');
    
    if (shouldHide) return null;

    const isActive = (path) => {
        if (location.pathname === path) return true;
        if (path !== '/' && location.pathname.startsWith(path + '/')) return true;
        return false;
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="fixed bottom-0 left-0 right-0 z-50 md:hidden safe-bottom"
                >
                    <nav className="mx-3 mb-3 bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/60 rounded-2xl shadow-[0_-4px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_30px_rgba(0,0,0,0.4)] px-2 py-2">
                        <ul className="flex justify-around items-center">
                            {navItems.map((item) => {
                                const active = isActive(item.path);
                                const Icon = item.icon;

                                return (
                                    <li key={item.path}>
                                        <Link
                                            to={item.path}
                                            className="relative flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all duration-200"
                                        >
                                            {active && (
                                                <motion.div
                                                    layoutId="dashNavActive"
                                                    className="absolute inset-0 bg-teal-50 dark:bg-teal-500/10 rounded-xl"
                                                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                                                />
                                            )}
                                            <div className="relative z-10 flex flex-col items-center gap-0.5">
                                                <Icon
                                                    size={20}
                                                    className={`transition-colors duration-200 ${
                                                        active
                                                            ? 'text-teal-600 dark:text-teal-400'
                                                            : 'text-slate-400 dark:text-slate-500'
                                                    }`}
                                                />
                                                <span className={`text-[10px] font-medium transition-colors duration-200 ${
                                                    active
                                                        ? 'text-teal-700 dark:text-teal-300'
                                                        : 'text-slate-400 dark:text-slate-500'
                                                }`}>
                                                    {item.name}
                                                </span>
                                            </div>
                                            {active && (
                                                <motion.div
                                                    layoutId="dashNavDot"
                                                    className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-teal-500"
                                                    transition={{ type: "spring", stiffness: 400, damping: 26 }}
                                                />
                                            )}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </nav>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default DashboardBottomNav;
