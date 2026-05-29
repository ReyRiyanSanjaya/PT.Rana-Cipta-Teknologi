import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchProfile } from '../../services/api';
import {
    LayoutDashboard,
    TrendingUp,
    Package,
    Image as ImageIcon,
    Settings,
    Menu,
    LogOut,
    Store,
    Zap,
    BarChart3,
    Search,
    Bell,
    ChevronLeft,
    ChevronRight,
    Receipt,
    User,
    Lock,
    AlertTriangle,
    CreditCard,
    ArrowUpCircle,
    ArrowDownCircle,
    Wallet,
    Gamepad2,
    Users
} from 'lucide-react';
import ThemeToggle from '../ThemeToggle';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

const SidebarItem = ({ icon: Icon, label, path, active, onClick, collapsed, badge }) => (
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

const DashboardLayout = ({ children }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
    const [commandQuery, setCommandQuery] = useState('');
    const [profile, setProfile] = useState(null);

    // Dropdown States
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const notificationRef = useRef(null);
    const profileRef = useRef(null);
    const mainContentRef = useRef(null);

    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout, refreshUser, checkSubscriptionStatus } = useAuth();
    const { notifications, unreadCount, markAllRead } = useNotifications();

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

    // Keyboard shortcut for Command Palette (Ctrl+K / Cmd+K)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsCommandPaletteOpen(prev => !prev);
                setCommandQuery('');
            }
            if (e.key === 'Escape') {
                setIsCommandPaletteOpen(false);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Close dropdowns on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
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

    // Refresh user data on mount to ensure role and subscription status are up to date
    useEffect(() => {
        refreshUser();
    }, []);

    useEffect(() => {
        let isMounted = true;
        const loadProfile = async () => {
            try {
                const data = await fetchProfile();
                if (isMounted) {
                    setProfile(data);
                }
            } catch (e) {
            }
        };
        if (user) {
            loadProfile();
        }
        return () => {
            isMounted = false;
        };
    }, [user]);

    // --- SUBSCRIPTION CHECK LOGIC ---
    const isLocked = !checkSubscriptionStatus();
    const isSubscriptionPage = location.pathname.startsWith('/subscription');
    const canManageSubscription = user?.role === 'OWNER' || user?.role === 'SUPER_ADMIN';

    // If locked and not on subscription page, we render the overlay
    // But we still render the layout structure behind it (or just the overlay)
    // To be cleaner, we'll return the overlay immediately if locked, 
    // but maybe we want to keep the sidebar visible but disabled?
    // Let's go with a full blocking overlay for maximum "mobile app" feel.

    if (isLocked && !isSubscriptionPage) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-[#0a0b0f] flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-8 text-center">
                    <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Lock className="w-10 h-10 text-red-500" />
                    </div>

                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                        Masa Aktif Berakhir
                    </h2>

                    <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                        Maaf, masa aktif layanan Anda telah berakhir.
                        {canManageSubscription
                            ? " Silakan perbarui langganan Anda untuk kembali mengakses dashboard dan semua fitur Rana."
                            : " Silakan hubungi pemilik toko untuk memperbarui layanan."}
                    </p>

                    {canManageSubscription ? (
                        <button
                            onClick={() => navigate('/subscription')}
                            className="w-full py-3.5 px-6 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-lg shadow-teal-500/25 transition-all flex items-center justify-center gap-2 group"
                        >
                            <CreditCard size={20} />
                            <span>Perbarui Langganan</span>
                            <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    ) : (
                        <div className="flex flex-col gap-3">
                            <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm text-slate-500 dark:text-slate-400">
                                Hubungi Owner untuk melakukan pembayaran
                            </div>
                            <button
                                onClick={logout}
                                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-medium"
                            >
                                Keluar Aplikasi
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }


    const role = user?.role || 'CASHIER'; // Default safe

    const ALL_NAV_ITEMS = {
        dashboard: { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        pos: { icon: Store, label: 'Sistem Kasir (POS)', path: '/pos' },
        pnl: { icon: TrendingUp, label: 'Laba Rugi', path: '/profit-loss' },
        inventory: { icon: Package, label: 'Inventaris', path: '/inventory' },
        transactions: { icon: Receipt, label: 'Riwayat Transaksi', path: '/transactions' },
        cashOps: { icon: Package, label: 'Kas & Ops', path: '/cash-ops' },
        withdraw: { icon: ArrowUpCircle, label: 'Withdraw', path: '/withdraw' },
        topups: { icon: ArrowDownCircle, label: 'Topups', path: '/topups' },
        subscription: { icon: Zap, label: 'Berlangganan', path: '/subscription' },
        stores: { icon: Store, label: 'Toko / Cabang', path: '/stores' },
        banners: { icon: ImageIcon, label: 'Banner / Iklan', path: '/banners' },
        reports: { icon: BarChart3, label: 'Laporan Lengkap', path: '/reports' },
        flashsales: { icon: Zap, label: 'Flash Sale', path: '/flashsales' },
        game: { icon: Gamepad2, label: 'Game', path: '/game' },
        community: { icon: Users, label: 'Komunitas', path: '/community' }, // Added Community
        support: { icon: Menu, label: 'Bantuan & Support', path: '/support' }, // Using Menu icon as placeholder or find HelpCircle
        settings: { icon: Settings, label: 'Pengaturan', path: '/settings' },
    };

    let navItems = [];

    if (role === 'SUPER_ADMIN') {
        navItems = [
            ALL_NAV_ITEMS.dashboard,
            ALL_NAV_ITEMS.stores,
            ALL_NAV_ITEMS.banners,
            ALL_NAV_ITEMS.subscription
        ];
    } else if (role === 'OWNER' || role === 'STORE_MANAGER' || role === 'ADMIN') {
        navItems = [
            ALL_NAV_ITEMS.dashboard,
            ALL_NAV_ITEMS.pos,
            ALL_NAV_ITEMS.reports,
            ALL_NAV_ITEMS.pnl,
            ALL_NAV_ITEMS.inventory,
            ALL_NAV_ITEMS.transactions,
            ALL_NAV_ITEMS.flashsales,
            role === 'OWNER' ? ALL_NAV_ITEMS.subscription : null,
            ALL_NAV_ITEMS.community, // Added to OWNER/MANAGER/ADMIN menu
            ALL_NAV_ITEMS.support,
            ALL_NAV_ITEMS.game
        ];
    } else {
        // Cashier or others
        navItems = [
            ALL_NAV_ITEMS.pos,
            // ALL_NAV_ITEMS.settings // Maybe limited settings?
        ];
    }

    // Filter out any undefined/null items from navItems
    navItems = navItems.filter(item => item);

    const isPathActive = (itemPath) => {
        if (!itemPath) return false;
        if (location.pathname === itemPath) return true;
        if (itemPath !== '/' && location.pathname.startsWith(itemPath + '/')) return true;
        return false;
    };

    const activeNavItem = navItems.find((item) => isPathActive(item.path));
    const pageLabel = activeNavItem?.label || 'Overview';

    const displayName = profile?.name || user?.name || 'User';
    const roleLabelMap = {
        SUPER_ADMIN: 'Super Admin',
        OWNER: 'Pemilik',
        STORE_MANAGER: 'Manajer Toko',
        ADMIN: 'Admin',
        CASHIER: 'Kasir'
    };
    const roleLabel = roleLabelMap[role] || role;
    const initials = displayName
        .split(' ')
        .filter((part) => part && part.length > 0)
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
    const secondaryLine = profile?.store?.name || profile?.tenant?.name || 'RanaPOS Cloud Dashboard';
    const subscriptionStatus = profile?.tenant?.subscriptionStatus || null;
    const subscriptionPlan = profile?.tenant?.plan || null;
    const subscriptionBadgeText = subscriptionStatus && subscriptionPlan
        ? `${subscriptionPlan} • ${subscriptionStatus}`
        : subscriptionStatus || subscriptionPlan || null;
    const subscriptionBadgeClass = (() => {
        if (!subscriptionStatus) return 'bg-slate-100 text-slate-600';
        if (subscriptionStatus === 'TRIAL') return 'bg-amber-100 text-amber-700';
        if (subscriptionStatus === 'ACTIVE') return 'bg-emerald-100 text-emerald-700';
        if (subscriptionStatus === 'EXPIRED') return 'bg-red-100 text-red-700';
        return 'bg-slate-100 text-slate-600';
    })();

    const allCommands = navItems.filter(item => item).map((item) => ({
        type: 'nav',
        label: item.label,
        path: item.path
    }));

    const filteredCommands = commandQuery
        ? allCommands.filter((cmd) =>
            cmd.label.toLowerCase().includes(commandQuery.toLowerCase())
        )
        : allCommands;

    return (
        <div className="h-screen bg-transparent flex transition-colors duration-200 overflow-hidden">
            <aside
                className={`
        fixed inset-y-0 left-0 z-50 bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl border-r border-white/50 dark:border-slate-800 transform transition-transform duration-200 ease-in-out w-64
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0
        ${isSidebarCollapsed ? 'md:w-20' : 'md:w-64'}
      `}
            >

            {/* Mobile sidebar backdrop */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[-1] md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                    aria-hidden="true"
                />
            )}
                <div className="flex h-full flex-col">
                    <div className="p-6 flex items-center justify-between gap-2">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5 }}
                            className={isSidebarCollapsed ? 'hidden md:hidden' : 'flex flex-col'}
                        >
                            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-teal-500 dark:from-indigo-400 dark:to-teal-400 tracking-tight">
                                Rana Market
                            </h1>
                            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 tracking-wider uppercase">v1.0.0 Stable • Super-App UMKM</p>
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
                            {navItems.map((item) => {
                                // Logic for dynamic badges
                                let badge = item.badge;

                                // Example: Show unread notification count on Support/Help menu
                                // You can customize this to show badges on other menus based on specific updates
                                if (item.path === '/support' && unreadCount > 0) {
                                    badge = unreadCount > 9 ? '9+' : unreadCount;
                                }

                                // Badge logic for Withdraw and Topups
                                // We filter notifications based on assumed types or keywords
                                if (item.path === '/withdraw') {
                                    const count = notifications.filter(n =>
                                        !n.isRead && (n.type === 'WITHDRAW' || n.title?.toLowerCase().includes('withdraw'))
                                    ).length;
                                    if (count > 0) badge = count > 9 ? '9+' : count;
                                }

                                if (item.path === '/topups') {
                                    const count = notifications.filter(n =>
                                        !n.isRead && (n.type === 'TOPUP' || n.title?.toLowerCase().includes('topup'))
                                    ).length;
                                    if (count > 0) badge = count > 9 ? '9+' : count;
                                }

                                return (
                                    <motion.div
                                        key={item.path}
                                        variants={{
                                            hidden: { x: -20, opacity: 0 },
                                            visible: { x: 0, opacity: 1 }
                                        }}
                                    >
                                        <SidebarItem
                                            {...item}
                                            badge={badge}
                                            active={isPathActive(item.path)}
                                            collapsed={isSidebarCollapsed}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                        />
                                    </motion.div>
                                );
                            })}
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
                            className="flex items-center space-x-3 px-4 py-3 text-slate-600 hover:text-danger dark:text-slate-400 dark:hover:text-red-400 w-full transition-colors mb-2"
                        >
                            <LogOut size={20} />
                            <span>Keluar</span>
                        </motion.button>
                        
                        {!isSidebarCollapsed && (
                            <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800/50">
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
                                        Live
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
                                                {unreadCount > 0 && (
                                                    <button onClick={markAllRead} className="text-xs text-teal-500 hover:text-teal-600 font-medium">
                                                        Tandai sudah dibaca
                                                    </button>
                                                )}
                                            </div>
                                            <div className="max-h-80 overflow-y-auto">
                                                {notifications.length === 0 ? (
                                                    <div className="px-4 py-8 text-center text-slate-500 text-sm">
                                                        Tidak ada notifikasi
                                                    </div>
                                                ) : (
                                                    notifications.map((item) => (
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
                                                    ))
                                                )}
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
                                        {initials || 'U'}
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
                                                    to="/profile"
                                                    className="group flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                                                    onClick={() => setIsProfileMenuOpen(false)}
                                                >
                                                    <User size={16} className="mr-3 text-slate-400 group-hover:text-teal-500 transition-colors" />
                                                    Profil Saya
                                                </Link>
                                                <Link
                                                    to="/settings"
                                                    className="group flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                                                    onClick={() => setIsProfileMenuOpen(false)}
                                                >
                                                    <Settings size={16} className="mr-3 text-slate-400 group-hover:text-teal-500 transition-colors" />
                                                    Pengaturan
                                                </Link>
                                                <Link
                                                    to="/subscription"
                                                    className="group flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                                                    onClick={() => setIsProfileMenuOpen(false)}
                                                >
                                                    <Zap size={16} className="mr-3 text-slate-400 group-hover:text-amber-500 transition-colors" />
                                                    Langganan
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
                <main ref={mainContentRef} className="flex-1 overflow-y-auto overflow-x-hidden text-slate-900 dark:text-slate-100">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"
                    >
                        {children}
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
};

export default DashboardLayout;
