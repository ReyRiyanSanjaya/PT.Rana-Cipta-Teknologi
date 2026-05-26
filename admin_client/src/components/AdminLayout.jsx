import React from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { LayoutDashboard, Store, Map, BarChart, ShoppingBag, LogOut, Search, Bell, Settings, Command, Wallet, CreditCard, Package, Megaphone, MessageSquare, Smartphone, Shield, Layout, FileText, List, Gift } from 'lucide-react';
import { cn } from '../lib/utils';
import { getRole, getUser, logout } from '../lib/auth';
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
        "w-full flex items-center rounded-lg py-2 text-sm transition-colors",
        collapsed ? "justify-center px-2" : "justify-between px-3",
        isActive ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
    );

    const iconWrapperClass = cn(
        "flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 shrink-0",
        !collapsed && "mr-3",
        isActive && "bg-slate-900 text-white border-slate-900"
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
                        <span className="ml-2 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[11px] px-2 py-0.5 min-w-[1.5rem]">
                            {badge > 99 ? "99+" : badge}
                        </span>
                    )}
                </Button>
                {collapsed && (
                    <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2 py-1 rounded-md bg-slate-900 text-white text-xs opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 shadow-lg whitespace-nowrap z-50">
                        {label}
                    </span>
                )}
            </div>
        </Link>
    );
};

// [NEW] Search Result Helpers
const SearchResultItem = ({ to, title, subtitle, icon: Icon, onClick }) => (
    <Link to={to} onClick={onClick} className="flex items-center p-3 hover:bg-slate-50 transition border-b border-slate-100 last:border-0">
        <div className="p-2 bg-indigo-50 text-indigo-600 rounded mr-3">
            <Icon size={16} />
        </div>
        <div>
            <p className="text-sm font-medium text-slate-900">{title}</p>
            <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
    </Link>
);

const AdminLayout = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();

    const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

    const [searchQuery, setSearchQuery] = React.useState('');
    const [searchResults, setSearchResults] = React.useState(null);
    const [isSearching, setIsSearching] = React.useState(false);
    const [subscriptionStats, setSubscriptionStats] = React.useState({ pending: 0 });
    const [withdrawalStats, setWithdrawalStats] = React.useState({ pending: 0 });
    const [topupStats, setTopupStats] = React.useState({ pending: 0 });

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
        { icon: Map, label: 'Acquisition Map', to: '/admin/map' },
        { icon: Store, label: 'Merchants', to: '/admin/merchants' },
        { icon: ShoppingBag, label: 'Kulakan (Wholesale)', to: '/admin/kulakan' },
        { icon: BarChart, label: 'Reports', to: '/admin/reports' },
        { icon: FileText, label: 'Transactions', to: '/admin/transactions' },

    ];

    const financeItems = [
        { icon: Wallet, label: 'Withdrawals', to: '/admin/withdrawals' },
        { icon: CreditCard, label: 'Top Ups', to: '/admin/topups' }, // [NEW]
        { icon: CreditCard, label: 'Subscriptions', to: '/admin/subscriptions' },
        { icon: Gift, label: 'Referrals', to: '/admin/referrals' },
    ];

    const systemItems = [
        { icon: Package, label: 'Packages', to: '/admin/packages' },
        { icon: Megaphone, label: 'Broadcasts', to: '/admin/broadcasts' },
        { icon: Smartphone, label: 'App Menus', to: '/admin/app-menus' },
        { icon: Shield, label: 'Admins', to: '/admin/users' },
        { icon: Shield, label: 'Audit Logs', to: '/admin/audit-logs' }, // [NEW]
        { icon: Layout, label: 'Content CMS', to: '/admin/content' }, // [NEW]
        { icon: FileText, label: 'Blog Manager', to: '/admin/blog' }, // [NEW]
        { icon: List, label: 'Flash Sales', to: '/admin/flashsales' },
        { icon: MessageSquare, label: 'Support', to: '/admin/support' },
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
        <div className="min-h-screen bg-slate-50/50 flex overflow-x-hidden">
            <aside
                className={cn(
                    "hidden md:flex flex-col bg-white border-r border-slate-200 fixed inset-y-0 left-0 z-50 transition-all duration-300",
                    isSidebarCollapsed ? "w-[72px]" : "w-64"
                )}
            >
                <div
                    className={cn(
                        "h-14 flex items-center px-4 border-b border-slate-200",
                        isSidebarCollapsed && "justify-center"
                    )}
                >
                    <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
                        <div className="h-6 w-6 rounded-md bg-indigo-600 flex items-center justify-center text-white">
                            <Command size={14} />
                        </div>
                        {!isSidebarCollapsed && (
                            <div className="flex flex-col ml-2">
                                <span className="text-indigo-600 font-bold leading-tight">Rana Market</span>
                                <span className="text-[10px] text-slate-400 font-medium leading-none">Admin Panel v1.0.0</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                    {!isSidebarCollapsed && (
                        <div className="px-2 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Platform
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
                        <div className="mt-6 px-2 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
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
                        <div className="mt-6 px-2 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
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
                        <div className="mt-6 px-2 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
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

                <div className="p-4 border-t border-slate-200">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className={cn("w-full pl-0 hover:bg-slate-100", isSidebarCollapsed ? "justify-center" : "justify-start")}>
                                <div className="flex items-center gap-3 text-left">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                                        <AvatarFallback>AD</AvatarFallback>
                                    </Avatar>
                                    {!isSidebarCollapsed && (
                                        <div className="flex flex-col flex-1 overflow-hidden">
                                            <span className="text-sm font-medium leading-none truncate">Admin User</span>
                                            <span className="text-xs text-slate-500 truncate">admin@rana.id</span>
                                        </div>
                                    )}
                                </div>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end" forceMount>
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">Admin User</p>
                                    <p className="text-xs leading-none text-muted-foreground">
                                        admin@rana.id
                                    </p>
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
                {!isSidebarCollapsed && (
                    <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50">
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
                <header className="sticky top-0 z-40 w-full h-14 bg-white/80 backdrop-blur-md border-b border-slate-200">
                    <div className="h-full flex items-center justify-between px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                className="hidden md:inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                            >
                                <LayoutDashboard className="h-4 w-4" />
                            </button>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <span
                                    className="cursor-pointer hover:text-slate-900"
                                    onClick={() => {
                                        if (pathSegments[0] === 'admin') navigate('/admin');
                                    }}
                                >
                                    {sectionLabel}
                                </span>
                                <span>/</span>
                                <span className="font-medium text-slate-900">{pageLabel}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 relative">
                            <div className="relative hidden sm:block">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search merchants, users..."
                                    className="h-9 w-64 rounded-md border border-slate-200 bg-slate-50 pl-9 text-sm outline-none focus:ring-1 focus:ring-slate-900 transition-all focus:w-80"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                {searchQuery.length >= 3 && (
                                    <div className="absolute top-10 right-0 w-80 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                                        {isSearching ? (
                                            <div className="p-4 text-center text-xs text-slate-500">Searching...</div>
                                        ) : searchResults ? (
                                            <>
                                                {searchResults.merchants.length === 0 && searchResults.users.length === 0 && searchResults.products.length === 0 && (
                                                    <div className="p-4 text-center text-xs text-slate-500">No results found.</div>
                                                )}
                                                {searchResults.merchants.length > 0 && (
                                                    <div>
                                                        <div className="bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase text-slate-400">Merchants</div>
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
                                                        <div className="bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase text-slate-400">Users</div>
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
                                                        <div className="bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase text-slate-400">Products</div>
                                                        {searchResults.products.map(p => (
                                                            <SearchResultItem
                                                                key={p.id} to={`/admin/merchants`} onClick={clearSearch}
                                                                title={p.name} subtitle={`Rp ${p.sellingPrice}`} icon={Package}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        ) : null}
                                    </div>
                                )}
                            </div>
                            <Button variant="ghost" size="icon" className="text-slate-500">
                                <Bell className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                </header>
                <main className="flex-1 overflow-x-hidden">
                    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        {content}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
