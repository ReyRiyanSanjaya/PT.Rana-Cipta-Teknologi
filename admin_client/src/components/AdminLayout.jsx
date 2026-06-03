import React from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { LayoutDashboard, Store, Map, BarChart, ShoppingBag, LogOut, Search, Bell, Settings, Command, Wallet, CreditCard, Package, Megaphone, MessageSquare, Smartphone, Shield, Layout, FileText, List, Gift, Menu, X, ChevronRight, Sparkles, Check, Clock, AlertTriangle, Mail, Info, Car, Image } from 'lucide-react';
import { cn } from '../lib/utils';
import { getRole, getUser, logout } from '../lib/auth';
import { initSocket, getSocket, disconnectSocket } from '../lib/socket';
import { Button } from './ui/Button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Separator } from './ui/separator';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from './ui/dropdown-menu';

const SidebarItem = ({ icon: Icon, label, to, isActive, badge, collapsed }) => {
    const buttonClassName = cn(
        "w-full flex items-center rounded-xl py-2.5 text-sm font-medium transition-all duration-200",
        collapsed ? "justify-center px-2" : "justify-between px-3",
        isActive
            ? "bg-primary-50 text-primary-700 shadow-sm shadow-primary-500/10"
            : "text-slate-500 hover:text-slate-800 hover:bg-emerald-50/50"
    );

    const iconWrapperClass = cn(
        "flex h-8 w-8 items-center justify-center rounded-lg shrink-0 transition-all duration-200",
        !collapsed && "mr-3",
        isActive
            ? "bg-primary-400 text-white shadow-sm shadow-primary-500/30"
            : "bg-emerald-50 text-slate-400 group-hover:text-primary-600 group-hover:bg-primary-50"
    );

    return (
        <Link to={to} title={label} className="block">
            <div className="relative group">
                <Button
                    variant="ghost"
                    className={buttonClassName}
                >
                    <span className="flex items-center overflow-hidden">
                        <span className={iconWrapperClass}>
                            <Icon className="h-4 w-4" />
                        </span>
                        {!collapsed && <span className="truncate">{label}</span>}
                    </span>
                    {!collapsed && typeof badge === "number" && badge > 0 && (
                        <span className="ml-2 inline-flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 min-w-[1.25rem]">
                            {badge > 99 ? "99+" : badge}
                        </span>
                    )}
                </Button>
                {collapsed && (
                    <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-medium opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 shadow-xl whitespace-nowrap z-50 transition-all duration-200">
                        {label}
                    </span>
                )}
            </div>
        </Link>
    );
};

// [NEW] Search Result Helpers
const SearchResultItem = ({ to, title, subtitle, icon: Icon, onClick }) => (
    <Link to={to} onClick={onClick} className="flex items-center p-3 px-4 hover:bg-primary-50/50 transition-all duration-150 border-b border-slate-100/50 last:border-0 group">
        <div className="p-2 bg-primary-50 text-primary-600 rounded-lg mr-3 group-hover:bg-primary-100 group-hover:scale-110 transition-all duration-200">
            <Icon size={14} />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{title}</p>
            <p className="text-[11px] text-slate-400">{subtitle}</p>
        </div>
        <ChevronRight size={14} className="text-slate-300 group-hover:text-primary-400 group-hover:translate-x-0.5 transition-all" />
    </Link>
);

// Time ago formatter
const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Baru saja';
    if (diffMin < 60) return `${diffMin} menit lalu`;
    if (diffHour < 24) return `${diffHour} jam lalu`;
    if (diffDay < 7) return `${diffDay} hari lalu`;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

const AdminLayout = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();

    const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    const [searchQuery, setSearchQuery] = React.useState('');
    const [searchResults, setSearchResults] = React.useState(null);
    const [isSearching, setIsSearching] = React.useState(false);
    const [subscriptionStats, setSubscriptionStats] = React.useState({ pending: 0 });
    const [withdrawalStats, setWithdrawalStats] = React.useState({ pending: 0 });
    const [topupStats, setTopupStats] = React.useState({ pending: 0 });

    // Notification State
    const [notifications, setNotifications] = React.useState([]);
    const [unreadCount, setUnreadCount] = React.useState(0);
    const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
    const [notifLoading, setNotifLoading] = React.useState(false);
    const notificationRef = React.useRef(null);

    // Fetch notifications from API
    const fetchNotifications = React.useCallback(async () => {
        try {
            const { default: api } = await import('../api');
            const res = await api.get('/notifications');
            if (res.data?.data && Array.isArray(res.data.data)) {
                setNotifications(res.data.data);
                setUnreadCount(res.data.data.filter(n => !n.isRead).length);
            }
        } catch (e) {
            console.error('Failed to fetch notifications', e);
        }
    }, []);

    // Mark single notification as read
    const markAsRead = React.useCallback(async (id) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
        try {
            const { default: api } = await import('../api');
            await api.patch(`/notifications/${id}/read`);
        } catch (e) {
            console.error('Failed to mark notification as read', e);
        }
    }, []);

    // Mark all notifications as read
    const markAllRead = React.useCallback(async () => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
        try {
            const { default: api } = await import('../api');
            await api.post('/notifications/read-all');
        } catch (e) {
            console.error('Failed to mark all notifications as read', e);
        }
    }, []);

    // Initial fetch + polling for notifications
    React.useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // Poll every 30s as fallback
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    // Realtime Socket for notifications
    React.useEffect(() => {
        const socket = initSocket();
        if (!socket) return;

        const handleNewNotification = (data) => {
            if (data) {
                setNotifications(prev => [data, ...prev]);
                setUnreadCount(prev => prev + 1);
            }
        };

        const handleNotificationUpdate = () => {
            // Refetch on bulk updates
            fetchNotifications();
        };

        socket.on('notification', handleNewNotification);
        socket.on('admin:notification', handleNewNotification);
        socket.on('new_withdrawal', handleNotificationUpdate);
        socket.on('new_topup', handleNotificationUpdate);
        socket.on('new_subscription', handleNotificationUpdate);
        socket.on('new_contact', handleNewNotification);

        return () => {
            socket.off('notification', handleNewNotification);
            socket.off('admin:notification', handleNewNotification);
            socket.off('new_withdrawal', handleNotificationUpdate);
            socket.off('new_topup', handleNotificationUpdate);
            socket.off('new_subscription', handleNotificationUpdate);
            socket.off('new_contact', handleNewNotification);
        };
    }, [fetchNotifications]);

    // Close notification dropdown on click outside
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                setIsNotificationsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Debounced Search
    React.useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.length >= 3) {
                setIsSearching(true);
                try {
                    // Import api internally to avoid circular dep issues if any, or just use global
                    const { default: api } = await import('../api');
                    const res = await api.get(`/admin/search?q=${searchQuery}`);
                    setSearchResults(res.data?.data);
                } catch (e) {
                    console.error("Search error", e);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults(null);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    React.useEffect(() => {
        let cancelled = false;
        const fetchStats = async () => {
            try {
                const { default: api } = await import('../api');
                
                // Fetch Subscription Stats
                try {
                    const resSub = await api.get('/admin/subscriptions/stats');
                    if (!cancelled && resSub.data?.data) {
                        setSubscriptionStats(resSub.data.data);
                    }
                } catch (e) {
                    console.error('Failed to fetch subscription stats', e);
                }

                // Fetch Withdrawal Stats (Pending)
                try {
                    const resWithdraw = await api.get('/admin/withdrawals?status=PENDING');
                    if (!cancelled && Array.isArray(resWithdraw.data?.data)) {
                        setWithdrawalStats({ pending: resWithdraw.data.data.length });
                    }
                } catch (e) {
                    console.error('Failed to fetch withdrawal stats', e);
                }

                // Fetch TopUp Stats (Pending)
                try {
                    const resTopup = await api.get('/admin/topups?status=PENDING');
                    if (!cancelled && Array.isArray(resTopup.data?.data)) {
                        setTopupStats({ pending: resTopup.data.data.length });
                    }
                } catch (e) {
                    console.error('Failed to fetch topup stats', e);
                }
            } catch (e) {
                console.error('Failed to init api', e);
            }
        };
        fetchStats();
        const id = setInterval(fetchStats, 10000); // Poll every 10 seconds
        return () => {
            cancelled = true;
            clearInterval(id);
        };
    }, []);

    const [roleAccess, setRoleAccess] = React.useState(null);
    const currentRole = React.useMemo(() => {
        const r = getRole();
        return r || null;
    }, []);
    React.useEffect(() => {
        (async () => {
            try {
                const { default: api } = await import('../api');
                const res = await api.get('/admin/settings');
                const map = {};
                (res.data.data || []).forEach(s => map[s.key] = s.value);
                const parsed = map.ADMIN_ROLE_MENU_ACCESS ? JSON.parse(map.ADMIN_ROLE_MENU_ACCESS) : null;
                setRoleAccess(parsed);
            } catch {
                setRoleAccess(null);
            }
        })();
    }, []);
    const isAllowed = React.useCallback((path) => {
        if (!currentRole) return false;
        // SUPER_ADMIN always allowed
        if (currentRole === 'SUPER_ADMIN') return true;
        
        // Safety check: if roleAccess is missing or currentRole rules are missing/invalid, allow access (or handle as needed)
        if (!roleAccess || !roleAccess[currentRole] || !Array.isArray(roleAccess[currentRole])) return true;

        const normalizedPath = path.replace(/^\/admin/, '');
        return roleAccess[currentRole].includes(path) || roleAccess[currentRole].includes(normalizedPath);
    }, [roleAccess, currentRole]);
    React.useEffect(() => {
        const user = getUser();
        if (!user || !currentRole) navigate('/login');
        else if (roleAccess && roleAccess[currentRole] && !isAllowed(location.pathname)) navigate('/admin');
    }, [roleAccess, currentRole, location.pathname, isAllowed, navigate]);
    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', to: '/admin' },
        { icon: BarChart, label: 'Reports', to: '/admin/reports' },
    ];

    const ecosystemItems = [
        { icon: Store, label: 'Merchants', to: '/admin/merchants' },
        { icon: Car, label: 'Drivers', to: '/admin/drivers' },
        { icon: Map, label: 'Driver Map', to: '/admin/drivers/map' },
        { icon: Package, label: 'Distributors', to: '/admin/distributors' },
        { icon: Smartphone, label: 'Buyers', to: '/admin/buyers' },
    ];

    const financeItems = [
        { icon: FileText, label: 'Transactions', to: '/admin/transactions' },
        { icon: Wallet, label: 'Withdrawals', to: '/admin/withdrawals' },
        { icon: CreditCard, label: 'Top Ups', to: '/admin/topups' },
        { icon: CreditCard, label: 'Subscriptions', to: '/admin/subscriptions' },
        { icon: Gift, label: 'Referrals', to: '/admin/referrals' },
    ];

    const operationItems = [
        { icon: Map, label: 'Acquisition Map', to: '/admin/map' },
        { icon: Sparkles, label: 'AI Marketing', to: '/admin/ai-marketing' },
        { icon: Mail, label: 'Email Recipients', to: '/admin/email-recipients' },
        { icon: List, label: 'Flash Sales', to: '/admin/flashsales' },
        { icon: Package, label: 'Packages', to: '/admin/packages' },
        { icon: Megaphone, label: 'Broadcasts', to: '/admin/broadcasts' },
        { icon: Image, label: 'Banner / Slider', to: '/admin/banners' },
    ];

    const systemItems = [
        { icon: Shield, label: 'Admins', to: '/admin/users' },
        { icon: Smartphone, label: 'App Menus', to: '/admin/app-menus' },
        { icon: Layout, label: 'Content CMS', to: '/admin/content' },
        { icon: FileText, label: 'Blog', to: '/admin/blog' },
        { icon: MessageSquare, label: 'Support', to: '/admin/support' },
        { icon: Shield, label: 'Audit Logs', to: '/admin/audit-logs' },
    ];

    const clearSearch = () => {
        setSearchQuery('');
        setSearchResults(null);
    };

    const pathSegments = location.pathname.split('/').filter(Boolean);
    let sectionLabel = 'Dashboard';
    let pageLabel = 'Overview';

    if (pathSegments[0] === 'admin') {
        sectionLabel = 'Admin';
        if (pathSegments.length === 1) {
            pageLabel = 'Dashboard';
        } else if (pathSegments[1] === 'merchants' && pathSegments.length > 2) {
            pageLabel = 'Merchant Detail';
        } else {
            const raw = pathSegments[1] || '';
            const normalized = raw.replace(/-/g, ' ');
            pageLabel = normalized.charAt(0).toUpperCase() + normalized.slice(1);
        }
    } else if (pathSegments.length > 0) {
        const rawSection = pathSegments[0];
        sectionLabel = rawSection.charAt(0).toUpperCase() + rawSection.slice(1);
        const rawPage = pathSegments[pathSegments.length - 1];
        const normalized = rawPage.replace(/-/g, ' ');
        pageLabel = normalized.charAt(0).toUpperCase() + normalized.slice(1);
    }

    const content = children ?? <Outlet />;

    return (
        <div className="min-h-screen bg-[#F4FBF6] flex overflow-x-hidden">
            {/* Mobile sidebar backdrop */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[45] md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                    aria-hidden="true"
                />
            )}

            <aside
                className={cn(
                    "flex flex-col bg-[#F8FFF9]/95 backdrop-blur-xl border-r border-emerald-100/60 fixed inset-y-0 left-0 z-50 transition-all duration-300 shadow-lg shadow-emerald-900/[0.03]",
                    isSidebarCollapsed ? "w-[72px]" : "w-64",
                    isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
                )}
            >
                <div
                    className={cn(
                        "h-16 flex items-center px-4 border-b border-emerald-100/50",
                        isSidebarCollapsed && "justify-center"
                    )}
                >
                    <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary-400 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-primary-500/25">
                            <Command size={15} />
                        </div>
                        {!isSidebarCollapsed && (
                            <div className="flex flex-col ml-2">
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-emerald-600 font-bold leading-tight">Rana Market</span>
                                <span className="text-[10px] text-slate-400 font-medium leading-none">Admin Panel v1.0.0</span>
                            </div>
                        )}
                    </div>
                    {/* Mobile close button */}
                    <button
                        type="button"
                        className="md:hidden ml-auto p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-emerald-50 transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                    {!isSidebarCollapsed && (
                        <div className="px-2 mb-2 text-[10px] font-semibold text-primary-600/70 uppercase tracking-widest">
                            Overview
                        </div>
                    )}
                    {navItems.filter(i => isAllowed(i.to)).map((item) => (
                        <SidebarItem
                            key={item.to}
                            icon={item.icon}
                            label={item.label}
                            to={item.to}
                            isActive={location.pathname === item.to}
                            collapsed={isSidebarCollapsed}
                        />
                    ))}

                    {!isSidebarCollapsed && (
                        <div className="mt-5 px-2 mb-2 text-[10px] font-semibold text-primary-600/70 uppercase tracking-widest">
                            Ecosystem
                        </div>
                    )}
                    {ecosystemItems.filter(i => isAllowed(i.to)).map((item) => (
                        <SidebarItem
                            key={item.to}
                            icon={item.icon}
                            label={item.label}
                            to={item.to}
                            isActive={location.pathname === item.to || (item.to === '/admin/drivers' && location.pathname.startsWith('/admin/drivers'))}
                            collapsed={isSidebarCollapsed}
                        />
                    ))}

                    {!isSidebarCollapsed && (
                        <div className="mt-5 px-2 mb-2 text-[10px] font-semibold text-primary-600/70 uppercase tracking-widest">
                            Finance
                        </div>
                    )}
                    {financeItems.filter(i => isAllowed(i.to)).map((item) => {
                        let badge = undefined;
                        if (item.to === '/admin/subscriptions') badge = subscriptionStats?.pending;
                        else if (item.to === '/admin/withdrawals') badge = withdrawalStats?.pending;
                        else if (item.to === '/admin/topups') badge = topupStats?.pending;

                        return (
                            <SidebarItem
                                key={item.to}
                                icon={item.icon}
                                label={item.label}
                                to={item.to}
                                isActive={location.pathname === item.to}
                                collapsed={isSidebarCollapsed}
                                badge={badge}
                            />
                        );
                    })}

                    {!isSidebarCollapsed && (
                        <div className="mt-5 px-2 mb-2 text-[10px] font-semibold text-primary-600/70 uppercase tracking-widest">
                            Operations
                        </div>
                    )}
                    {operationItems.filter(i => isAllowed(i.to)).map((item) => (
                        <SidebarItem
                            key={item.to}
                            icon={item.icon}
                            label={item.label}
                            to={item.to}
                            isActive={location.pathname === item.to}
                            collapsed={isSidebarCollapsed}
                        />
                    ))}

                    {!isSidebarCollapsed && (
                        <div className="mt-5 px-2 mb-2 text-[10px] font-semibold text-primary-600/70 uppercase tracking-widest">
                            System
                        </div>
                    )}
                    {systemItems.filter(i => isAllowed(i.to)).map((item) => (
                        <SidebarItem
                            key={item.to}
                            icon={item.icon}
                            label={item.label}
                            to={item.to}
                            isActive={location.pathname === item.to}
                            collapsed={isSidebarCollapsed}
                        />
                    ))}

                    {!isSidebarCollapsed && (
                        <div className="mt-5 px-2 mb-2 text-[10px] font-semibold text-primary-600/70 uppercase tracking-widest">
                            Settings
                        </div>
                    )}
                    <SidebarItem
                        icon={Settings}
                        label="General Settings"
                        to="/admin/settings"
                        isActive={location.pathname === '/admin/settings'}
                        collapsed={isSidebarCollapsed}
                    />
                </div>

                <div className="p-4 border-t border-emerald-100/50">
                    <button
                        onClick={() => logout()}
                        className={cn(
                            "w-full flex items-center rounded-xl py-2.5 text-sm text-slate-500 hover:text-rose-500 hover:bg-rose-50 transition-all duration-200",
                            isSidebarCollapsed ? "justify-center px-2" : "px-3 gap-3"
                        )}
                    >
                        <LogOut className="h-4 w-4" />
                        {!isSidebarCollapsed && <span className="font-medium">Log out</span>}
                    </button>
                </div>
                {!isSidebarCollapsed && (
                    <div className="px-6 py-3 border-t border-emerald-100/50 bg-gradient-to-r from-primary-50/40 to-emerald-50/30">
                        <p className="text-[10px] text-slate-400 font-medium">Rana Market v1.0.0</p>
                        <p className="text-[9px] text-slate-400 italic">Super-App Ekosistem UMKM</p>
                    </div>
                )}
            </aside>

            <div
                className={cn(
                    "flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out min-w-0",
                    isSidebarCollapsed ? "md:ml-[72px]" : "md:ml-64"
                )}
            >
                <header className="sticky top-0 z-40 w-full transition-all duration-300">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary-500/[0.02] via-transparent to-transparent" />
                    <div className={cn(
                        "h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 transition-all duration-300",
                        "bg-white/60 backdrop-blur-xl border-b border-emerald-100/50 shadow-sm shadow-emerald-900/[0.02]"
                    )}>
                        <div className="flex items-center gap-4">
                            {/* Mobile menu toggle */}
                            <button
                                type="button"
                                className="md:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-emerald-50 transition-colors"
                                onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                            >
                                <Menu className="h-5 w-5" />
                            </button>
                            {/* Sidebar collapse toggle */}
                            <button
                                type="button"
                                className="hidden md:inline-flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-100 bg-white/80 text-slate-400 hover:bg-emerald-50 hover:text-primary-600 hover:border-primary-200 transition-all duration-200 shadow-sm"
                                onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                            >
                                <LayoutDashboard className="h-4 w-4" />
                            </button>
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <span
                                        className="font-bold text-slate-800 tracking-tight cursor-pointer hover:text-primary-600 transition-colors"
                                        onClick={() => {
                                            if (pathSegments[0] === 'admin') navigate('/admin');
                                        }}
                                    >
                                        {pageLabel}
                                    </span>
                                    <span className="hidden sm:inline-flex h-1 w-1 rounded-full bg-slate-300" />
                                    <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                        <span className="relative flex h-1.5 w-1.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                                        </span>
                                        Live
                                    </span>
                                </div>
                                <span className="text-[11px] text-slate-400 font-medium hidden sm:block">
                                    {sectionLabel} / {pageLabel}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3 relative">
                            {/* Search - Command Palette Style */}
                            <div className="relative hidden sm:block">
                                <button
                                    type="button"
                                    onClick={() => document.getElementById('admin-search-input')?.focus()}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-100 bg-white/80 text-xs font-medium transition-all w-56 justify-between group shadow-sm text-slate-500 hover:border-primary-200 hover:text-slate-700 hover:bg-white hover:shadow-md hover:shadow-primary-500/5"
                                >
                                    <div className="flex items-center gap-2">
                                        <Search size={14} className="group-hover:text-primary-500 transition-colors" />
                                        <span>{searchQuery || 'Search...'}</span>
                                    </div>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-100 text-slate-400 group-hover:border-primary-100">
                                        ⌘K
                                    </span>
                                </button>
                                <input
                                    id="admin-search-input"
                                    type="text"
                                    placeholder="Search merchants, users..."
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onFocus={(e) => { e.target.style.opacity = '1'; e.target.className = 'absolute inset-0 w-full h-full rounded-full border border-primary-300 bg-white pl-10 pr-4 text-sm outline-none ring-2 ring-primary-500/20 shadow-lg shadow-primary-500/10 transition-all'; }}
                                    onBlur={(e) => { if (!searchQuery) { e.target.style.opacity = '0'; e.target.className = 'absolute inset-0 w-full h-full opacity-0 cursor-pointer'; } }}
                                />
                                {searchQuery && (
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-400 pointer-events-none z-10" />
                                )}
                                {searchQuery.length >= 3 && (
                                    <div className="absolute top-12 right-0 w-96 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-emerald-900/10 border border-emerald-100/60 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                                            <span className="text-xs font-semibold text-slate-700">Search Results</span>
                                            <button onClick={clearSearch} className="text-slate-400 hover:text-slate-600 transition-colors">
                                                <X size={14} />
                                            </button>
                                        </div>
                                        {isSearching ? (
                                            <div className="p-6 text-center">
                                                <div className="inline-flex items-center gap-2 text-xs text-slate-500">
                                                    <div className="h-4 w-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                                                    Searching...
                                                </div>
                                            </div>
                                        ) : searchResults ? (
                                            <div className="max-h-80 overflow-y-auto">
                                                {searchResults.merchants.length === 0 && searchResults.users.length === 0 && searchResults.products.length === 0 && (
                                                    <div className="p-6 text-center text-xs text-slate-500">No results found.</div>
                                                )}
                                                {searchResults.merchants.length > 0 && (
                                                    <div>
                                                        <div className="bg-slate-50/80 px-4 py-2 text-[10px] font-bold uppercase text-slate-400 tracking-wider">Merchants</div>
                                                        {searchResults.merchants.map(m => (
                                                            <SearchResultItem
                                                                key={m.id} to={`/admin/merchants`} onClick={clearSearch}
                                                                title={m.name} subtitle={m.plan} icon={Store}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                                {searchResults.users.length > 0 && (
                                                    <div>
                                                        <div className="bg-slate-50/80 px-4 py-2 text-[10px] font-bold uppercase text-slate-400 tracking-wider">Users</div>
                                                        {searchResults.users.map(u => (
                                                            <SearchResultItem
                                                                key={u.id} to={`/admin/settings`} onClick={clearSearch}
                                                                title={u.name} subtitle={u.role} icon={LayoutDashboard}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                                {searchResults.products.length > 0 && (
                                                    <div>
                                                        <div className="bg-slate-50/80 px-4 py-2 text-[10px] font-bold uppercase text-slate-400 tracking-wider">Products</div>
                                                        {searchResults.products.map(p => (
                                                            <SearchResultItem
                                                                key={p.id} to={`/admin/merchants`} onClick={clearSearch}
                                                                title={p.name} subtitle={`Rp ${p.sellingPrice}`} icon={Package}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ) : null}
                                    </div>
                                )}
                            </div>

                            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

                            {/* Notification Bell with Dropdown */}
                            <div className="relative" ref={notificationRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsNotificationsOpen(prev => !prev)}
                                    className="relative p-2.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all duration-200 group"
                                >
                                    <Bell className="h-[18px] w-[18px] group-hover:scale-110 transition-transform duration-200" />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] items-center justify-center">
                                            <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-rose-400 opacity-75" />
                                            <span className="relative inline-flex items-center justify-center rounded-full h-4 min-w-[16px] px-1 bg-rose-500 text-white text-[9px] font-bold">
                                                {unreadCount > 99 ? '99+' : unreadCount}
                                            </span>
                                        </span>
                                    )}
                                </button>

                                {/* Notification Dropdown Panel */}
                                {isNotificationsOpen && (
                                    <div className="absolute right-0 mt-2 w-96 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-emerald-900/10 border border-emerald-100/60 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                        {/* Header */}
                                        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-sm font-bold text-slate-800">Notifications</h3>
                                                {unreadCount > 0 && (
                                                    <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-rose-100 text-rose-600 text-[10px] font-bold">
                                                        {unreadCount}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {unreadCount > 0 && (
                                                    <button
                                                        onClick={markAllRead}
                                                        className="text-[11px] font-medium text-primary-600 hover:text-primary-700 px-2 py-1 rounded-lg hover:bg-primary-50 transition-colors"
                                                    >
                                                        Mark all read
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setIsNotificationsOpen(false)}
                                                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Notification List */}
                                        <div className="max-h-[400px] overflow-y-auto">
                                            {notifications.length === 0 ? (
                                                <div className="py-12 text-center">
                                                    <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                                        <Bell size={20} className="text-slate-400" />
                                                    </div>
                                                    <p className="text-sm font-medium text-slate-700">No notifications</p>
                                                    <p className="text-xs text-slate-400 mt-1">You're all caught up!</p>
                                                </div>
                                            ) : (
                                                notifications.slice(0, 20).map((notif) => (
                                                    <div
                                                        key={notif.id}
                                                        onClick={() => {
                                                            if (!notif.isRead) markAsRead(notif.id);
                                                            setIsNotificationsOpen(false);
                                                            // Navigate based on notification type
                                                            if (notif.title?.toLowerCase().includes('withdraw')) navigate('/admin/withdrawals');
                                                            else if (notif.title?.toLowerCase().includes('topup') || notif.title?.toLowerCase().includes('top up')) navigate('/admin/topups');
                                                            else if (notif.title?.toLowerCase().includes('subscription') || notif.title?.toLowerCase().includes('langganan')) navigate('/admin/subscriptions');
                                                            else if (notif.title?.toLowerCase().includes('pesan') || notif.title?.toLowerCase().includes('contact')) navigate('/admin/support');
                                                            else if (notif.title?.toLowerCase().includes('merchant')) navigate('/admin/merchants');
                                                            else navigate('/admin/notifications');
                                                        }}
                                                        className={cn(
                                                            "flex items-start gap-3 px-4 py-3 cursor-pointer transition-all duration-150 border-b border-slate-50 last:border-0 hover:bg-primary-50/30",
                                                            !notif.isRead && "bg-primary-50/40"
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                                                            !notif.isRead ? "bg-primary-100 text-primary-600" : "bg-slate-100 text-slate-400"
                                                        )}>
                                                            {notif.title?.toLowerCase().includes('error') || notif.title?.toLowerCase().includes('gagal')
                                                                ? <AlertTriangle size={16} />
                                                                : notif.title?.toLowerCase().includes('pesan') || notif.title?.toLowerCase().includes('contact')
                                                                    ? <Mail size={16} />
                                                                    : notif.title?.toLowerCase().includes('withdraw') || notif.title?.toLowerCase().includes('topup')
                                                                        ? <Wallet size={16} />
                                                                        : notif.title?.toLowerCase().includes('subscription') || notif.title?.toLowerCase().includes('langganan')
                                                                            ? <CreditCard size={16} />
                                                                            : <Info size={16} />
                                                            }
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <p className={cn(
                                                                    "text-xs leading-tight truncate",
                                                                    !notif.isRead ? "font-semibold text-slate-900" : "font-medium text-slate-600"
                                                                )}>
                                                                    {notif.title}
                                                                </p>
                                                                {!notif.isRead && (
                                                                    <span className="h-2 w-2 rounded-full bg-primary-500 shrink-0 mt-1" />
                                                                )}
                                                            </div>
                                                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                                                                {notif.body}
                                                            </p>
                                                            <div className="flex items-center gap-1 mt-1.5">
                                                                <Clock size={10} className="text-slate-300" />
                                                                <span className="text-[10px] text-slate-400">
                                                                    {formatTimeAgo(notif.createdAt)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        {/* Footer */}
                                        {notifications.length > 0 && (
                                            <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50">
                                                <Link
                                                    to="/admin/notifications"
                                                    onClick={() => setIsNotificationsOpen(false)}
                                                    className="flex items-center justify-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
                                                >
                                                    View all notifications
                                                    <ChevronRight size={12} />
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Profile Quick Access */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-full hover:bg-emerald-50 transition-all duration-200 border border-transparent hover:border-emerald-100 group">
                                        <Avatar className="h-8 w-8 ring-2 ring-primary-500/20 group-hover:ring-primary-500/40 transition-all">
                                            <AvatarImage src="https://github.com/shadcn.png" alt="Admin" />
                                            <AvatarFallback className="bg-gradient-to-br from-primary-400 to-emerald-500 text-white text-xs font-bold">AD</AvatarFallback>
                                        </Avatar>
                                        <div className="hidden lg:flex flex-col text-left">
                                            <span className="text-xs font-semibold text-slate-700 leading-tight">Admin</span>
                                            <span className="text-[10px] text-slate-400 leading-tight">{currentRole?.replace('_', ' ') || 'Super Admin'}</span>
                                        </div>
                                        <ChevronRight className="h-3 w-3 text-slate-400 hidden lg:block rotate-90" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56 rounded-xl shadow-xl shadow-emerald-900/5 border-emerald-100/60" align="end" forceMount>
                                    <DropdownMenuLabel className="font-normal px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10 ring-2 ring-primary-500/20">
                                                <AvatarImage src="https://github.com/shadcn.png" alt="Admin" />
                                                <AvatarFallback className="bg-gradient-to-br from-primary-400 to-emerald-500 text-white text-sm font-bold">AD</AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col space-y-0.5">
                                                <p className="text-sm font-semibold leading-none">Admin User</p>
                                                <p className="text-xs leading-none text-muted-foreground">admin@rana.id</p>
                                                <span className="inline-flex items-center mt-1 text-[10px] font-medium text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded-md w-fit">
                                                    {currentRole?.replace('_', ' ') || 'Super Admin'}
                                                </span>
                                            </div>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link to="/admin/profile" className="cursor-pointer w-full">Profile</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link to="/admin/billing" className="cursor-pointer w-full">Billing</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link to="/admin/settings" className="cursor-pointer w-full">Settings</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        className="text-red-500 focus:text-red-500 cursor-pointer"
                                        onClick={() => logout()}
                                    >
                                        <LogOut className="mr-2 h-4 w-4" />
                                        Log out
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </header>
                <main className="flex-1 overflow-x-hidden">
                    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative">
                        {content}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
