import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, Outlet, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    Users,
    BarChart3,
    Settings,
    LogOut,
    Menu,
    Search,
    Bell,
    ChevronLeft,
    ChevronRight,
    User as UserIcon,
    Box,
    Truck,
    Tag
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { useAuthStore } from '../store/authStore';

// Sidebar Item Component
const SidebarItem = ({ icon: Icon, label, path, active, onClick, collapsed, badge }: any) => (
    <Link
        to={path}
        onClick={onClick}
        className={`group relative flex items-center ${collapsed ? 'justify-center' : 'space-x-3'} px-3 py-2.5 rounded-xl text-sm transition-all duration-200 relative overflow-hidden ${active
                ? 'text-teal-700 font-medium dark:text-teal-300'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
    >
        {active && (
            <motion.div
                layoutId="activeSidebarItem"
                className="absolute inset-0 bg-teal-50/80 dark:bg-teal-500/10 rounded-xl"
                initial={false}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
        )}

        <span
            className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-teal-500 transition-all duration-300 z-10 ${active
                    ? 'opacity-100 scale-y-100'
                    : 'opacity-0 scale-y-50'
                }`}
        />
        <div
            className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200 shrink-0 ${active
                    ? 'bg-teal-100 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400 shadow-sm shadow-teal-500/20'
                    : 'bg-transparent text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 group-hover:bg-white dark:group-hover:bg-slate-700/50'
                }`}
        >
            <Icon className={`h-[18px] w-[18px] transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`} />
            {/* Collapsed Badge Dot */}
            {badge && (
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                </span>
            )}
        </div>
        {!collapsed && (
            <div className="relative z-10 flex flex-1 items-center justify-between overflow-hidden gap-2">
                <span className="truncate tracking-wide">{label}</span>
                {badge && (
                    <span className="px-2 py-0.5 text-[10px] font-bold text-white bg-rose-500 rounded-full shadow-sm shadow-rose-500/30 min-w-[20px] text-center">
                        {badge}
                    </span>
                )}
            </div>
        )}
        {collapsed && (
            <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md px-2 py-1 text-xs bg-slate-900 text-white shadow-lg opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition duration-150 z-50 flex items-center gap-2">
                {label}
                {badge && (
                    <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                        {badge}
                    </span>
                )}
            </span>
        )}
    </Link>
);

export default function Layout() {
    const { user, logout } = useAuthStore();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
    const [commandQuery, setCommandQuery] = useState('');

    // Dropdown States
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const notificationRef = useRef<HTMLDivElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);
    const mainContentRef = useRef<HTMLDivElement>(null);

    const location = useLocation();
    const navigate = useNavigate();

    // Mock Notifications for Distributor
    const [notifications] = useState([
        { id: 1, title: 'Pesanan Baru', body: 'Toko Maju Jaya memesan 50 item', isRead: false, createdAt: new Date().toISOString() },
        { id: 2, title: 'Stok Menipis', body: 'Produk Kopi Susu sisa 10 karton', isRead: true, createdAt: new Date().toISOString() }
    ]);
    const unreadCount = notifications.filter(n => !n.isRead).length;

    // Scroll Detection
    useEffect(() => {
        const handleScroll = () => {
            if (mainContentRef.current) {
                setIsScrolled(mainContentRef.current.scrollTop > 10);
            }
        };

        const mainElement = mainContentRef.current;
        if (mainElement) {
            mainElement.addEventListener('scroll', handleScroll);
        }

        return () => {
            if (mainElement) {
                mainElement.removeEventListener('scroll', handleScroll);
            }
        };
    }, []);

    // Close dropdowns on click outside
    useEffect(() => {
        const handleClickOutside = (event: any) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                setIsNotificationsOpen(false);
            }
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setIsProfileMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const NAV_ITEMS = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
        { icon: Package, label: 'Produk', path: '/products' },
        { icon: ShoppingCart, label: 'Pesanan', path: '/orders', badge: unreadCount > 0 ? unreadCount : undefined },
        { icon: Box, label: 'Inventaris', path: '/inventory' },
        { icon: Users, label: 'Mitra Toko', path: '/merchants' }, // Changed from Stores to Merchants for clarity
        { icon: Tag, label: 'Promosi', path: '/discounts' },
        { icon: Truck, label: 'Pengiriman', path: '/shipments' },
        { icon: BarChart3, label: 'Laporan', path: '/reports' },
        { icon: Settings, label: 'Pengaturan', path: '/settings' },
    ];

    const isPathActive = (itemPath: string) => {
        if (location.pathname === itemPath) return true;
        if (itemPath !== '/' && location.pathname.startsWith(itemPath)) return true;
        return false;
    };

    const activeNavItem = NAV_ITEMS.find((item) => isPathActive(item.path));
    const pageLabel = activeNavItem?.label || 'Distributor Portal';

    const displayName = user?.name || 'Distributor';
    const roleLabel = 'Distributor Principal';
    const initials = displayName.substring(0, 2).toUpperCase();

    const filteredCommands = commandQuery
        ? NAV_ITEMS.filter((cmd) =>
            cmd.label.toLowerCase().includes(commandQuery.toLowerCase())
        )
        : NAV_ITEMS;

    return (
        <div className="h-screen bg-transparent flex transition-colors duration-200 overflow-hidden font-sans">
            <aside
                className={`
        fixed inset-y-0 left-0 z-50 bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl border-r border-white/50 dark:border-slate-800 transform transition-transform duration-200 ease-in-out w-64
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0
        ${isSidebarCollapsed ? 'md:w-20' : 'md:w-64'}
      `}
            >
                <div className="flex h-full flex-col">
                    <div className="p-6 flex items-center justify-between gap-2">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5 }}
                            className={isSidebarCollapsed ? 'hidden md:hidden' : 'flex flex-col'}
                        >
                            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-emerald-500 dark:from-teal-400 dark:to-emerald-400 tracking-tight">
                                Rana Market
                            </h1>
                            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 tracking-wider uppercase">Distributor Portal v1.0.0</p>
                        </motion.div>
                        <button
                            type="button"
                            onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                            className="hidden md:inline-flex items-center justify-center h-8 w-8 rounded-full border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm"
                        >
                            {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-3">
                        <motion.nav
                            className="flex flex-col gap-0.5"
                            initial="hidden"
                            animate="visible"
                            variants={{
                                visible: { transition: { staggerChildren: 0.03 } }
                            }}
                        >
                            {NAV_ITEMS.map((item) => (
                                <motion.div
                                    key={item.path}
                                    variants={{
                                        hidden: { x: -20, opacity: 0 },
                                        visible: { x: 0, opacity: 1 }
                                    }}
                                >
                                    <SidebarItem
                                        {...item}
                                        active={isPathActive(item.path)}
                                        collapsed={isSidebarCollapsed}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    />
                                </motion.div>
                            ))}
                        </motion.nav>
                    </div>

                    <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                        <motion.button
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            whileHover={{ x: 5 }}
                            onClick={() => {
                                logout();
                                window.location.href = '/login';
                            }}
                            className="flex items-center space-x-3 px-4 py-3 text-slate-600 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 w-full transition-colors"
                        >
                            <LogOut size={20} />
                            <span>Keluar</span>
                        </motion.button>
                        {!isSidebarCollapsed && (
                            <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800/50 mt-2">
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Rana Market v1.0.0</p>
                                <p className="text-[9px] text-slate-300 dark:text-slate-600 italic">Super-App Ekosistem UMKM Terintegrasi</p>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative md:border-l md:border-white/20 dark:md:border-slate-800/50 bg-white/40 dark:bg-slate-950/80 backdrop-blur-sm">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-sky-500/5 via-transparent to-transparent dark:from-sky-400/10" />
                <motion.header
                    className="sticky top-0 z-40 transition-all duration-300"
                    initial={{ y: -100 }}
                    animate={{ y: 0 }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                >
                    <div className={`h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 transition-all duration-300 ${isScrolled
                            ? 'bg-white/70 dark:bg-slate-900/80 backdrop-blur-md shadow-sm border-b border-white/20 dark:border-slate-800/50'
                            : 'bg-transparent border-b border-transparent'
                        }`}>
                        <div className="flex items-center gap-4">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="md:hidden text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors"
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            >
                                <Menu size={20} />
                            </motion.button>
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                                        {pageLabel}
                                    </span>
                                    <span className="hidden sm:inline-flex h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                                    <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-500/20">
                                        <span className="relative flex h-1.5 w-1.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                                        </span>
                                        Online
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-4">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="button"
                                onClick={() => {
                                    setIsCommandPaletteOpen(true);
                                    setCommandQuery('');
                                }}
                                className={`hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-medium transition-all w-56 justify-between group shadow-sm ${isScrolled
                                        ? 'bg-slate-100/50 border-slate-200/60 dark:bg-slate-800/50 dark:border-slate-700/60'
                                        : 'bg-white border-slate-200/80 dark:bg-slate-900/50 dark:border-slate-700/80 shadow-sm'
                                    } text-slate-500 hover:border-teal-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800`}
                            >
                                <div className="flex items-center gap-2">
                                    <Search size={14} className="group-hover:text-teal-500 transition-colors" />
                                    <span>Cari menu...</span>
                                </div>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-400 group-hover:border-teal-100">
                                    ⌘K
                                </span>
                            </motion.button>

                            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>

                            <ThemeToggle />

                            <div className="relative" ref={notificationRef}>
                                <motion.button
                                    whileHover={{ scale: 1.1, rotate: 5 }}
                                    whileTap={{ scale: 0.9 }}
                                    type="button"
                                    onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                                    className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <Bell size={20} />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
                                    )}
                                </motion.button>

                                <AnimatePresence>
                                    {isNotificationsOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            transition={{ duration: 0.2 }}
                                            className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-100 dark:border-slate-800 py-2 z-50 origin-top-right"
                                        >
                                            <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Notifikasi</h3>
                                            </div>
                                            <div className="max-h-80 overflow-y-auto">
                                                {notifications.map((item) => (
                                                    <div key={item.id} className={`px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${!item.isRead ? 'bg-teal-50/50 dark:bg-teal-900/10' : ''}`}>
                                                        <div className="flex gap-3">
                                                            <div className="mt-1">
                                                                <div className={`w-2 h-2 rounded-full ${!item.isRead ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.title}</p>
                                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.body}</p>
                                                                <p className="text-[10px] text-slate-400 mt-1">{new Date(item.createdAt).toLocaleString()}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="relative pl-2 sm:pl-4 border-l border-slate-200 dark:border-slate-800" ref={profileRef}>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                                    className="flex items-center gap-3 focus:outline-none"
                                >
                                    <div className="hidden md:flex flex-col items-end text-right">
                                        <span className="text-sm font-semibold text-slate-900 dark:text-white leading-none mb-1">
                                            {displayName}
                                        </span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400 leading-none">
                                            {roleLabel}
                                        </span>
                                    </div>
                                    <div className="h-9 w-9 rounded-lg bg-teal-600 text-white flex items-center justify-center text-sm font-bold shadow-lg shadow-teal-500/20 ring-2 ring-white dark:ring-slate-900 cursor-pointer hover:ring-teal-100 dark:hover:ring-teal-900 transition-all">
                                        {initials}
                                    </div>
                                </motion.button>

                                <AnimatePresence>
                                    {isProfileMenuOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            transition={{ duration: 0.2 }}
                                            className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50 border border-slate-200 dark:border-slate-800 overflow-hidden origin-top-right"
                                        >
                                            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 md:hidden">
                                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{displayName}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">{roleLabel}</p>
                                            </div>
                                            <div className="py-1">
                                                <Link
                                                    to="/settings"
                                                    className="group flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                                                    onClick={() => setIsProfileMenuOpen(false)}
                                                >
                                                    <Settings size={16} className="mr-3 text-slate-400 group-hover:text-teal-500 transition-colors" />
                                                    Pengaturan
                                                </Link>
                                            </div>
                                            <div className="border-t border-slate-100 dark:border-slate-800 py-1">
                                                <button
                                                    onClick={() => {
                                                        logout();
                                                        navigate('/login');
                                                    }}
                                                    className="group flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                >
                                                    <LogOut size={16} className="mr-3 text-red-500 group-hover:text-red-700" />
                                                    Keluar
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </motion.header>

                {/* Page Content */}
                <main ref={mainContentRef} className="flex-1 overflow-y-auto overflow-x-hidden text-slate-900 dark:text-slate-100 scroll-smooth">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"
                    >
                        <Outlet />
                    </motion.div>
                </main>
            </div>

            <AnimatePresence>
                {isCommandPaletteOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-40 flex items-start justify-center pt-24 px-4 sm:px-6 lg:px-8 bg-black/40 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: -20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: -20 }}
                            transition={{ duration: 0.2, delay: 0.05 }}
                            className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700/70 shadow-2xl overflow-hidden"
                        >
                            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                                <Search size={16} className="text-slate-400" />
                                <input
                                    autoFocus
                                    value={commandQuery}
                                    onChange={(e) => setCommandQuery(e.target.value)}
                                    placeholder="Cari menu dashboard..."
                                    className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setIsCommandPaletteOpen(false)}
                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs px-2 py-1 rounded-md border border-slate-200/70 dark:border-slate-700/70"
                                >
                                    Esc
                                </button>
                            </div>
                            <div className="max-h-72 overflow-y-auto py-2">
                                {filteredCommands.length === 0 ? (
                                    <div className="px-4 py-6 text-sm text-slate-400">
                                        Tidak ada menu yang cocok.
                                    </div>
                                ) : (
                                    filteredCommands.map((cmd) => (
                                        <Link
                                            key={cmd.path}
                                            to={cmd.path}
                                            onClick={() => {
                                                setIsCommandPaletteOpen(false);
                                                setIsMobileMenuOpen(false);
                                            }}
                                            className={`flex items-center justify-between px-4 py-2.5 text-sm ${isPathActive(cmd.path)
                                                    ? 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-200'
                                                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                                                }`}
                                        >
                                            <span>{cmd.label}</span>
                                            <span className="text-[11px] text-slate-400">
                                                {cmd.path}
                                            </span>
                                        </Link>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
