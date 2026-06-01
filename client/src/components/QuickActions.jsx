import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Store, Package, TrendingUp, Zap, Receipt, BarChart3, Gamepad2, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const QuickActions = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const role = user?.role || 'CASHIER';

    const allActions = [
        { id: 'pos', label: 'Buka Kasir', icon: Store, color: 'from-teal-500 to-emerald-600', path: '/pos', roles: ['OWNER', 'STORE_MANAGER', 'ADMIN', 'CASHIER'] },
        { id: 'inventory', label: 'Cek Stok', icon: Package, color: 'from-indigo-500 to-violet-600', path: '/inventory', roles: ['OWNER', 'STORE_MANAGER', 'ADMIN'] },
        { id: 'pnl', label: 'Laba Rugi', icon: TrendingUp, color: 'from-emerald-500 to-teal-600', path: '/profit-loss', roles: ['OWNER', 'STORE_MANAGER'] },
        { id: 'flashsale', label: 'Flash Sale', icon: Zap, color: 'from-amber-500 to-orange-600', path: '/flashsales', roles: ['OWNER', 'STORE_MANAGER'] },
        { id: 'transactions', label: 'Transaksi', icon: Receipt, color: 'from-blue-500 to-indigo-600', path: '/transactions', roles: ['OWNER', 'STORE_MANAGER', 'ADMIN'] },
        { id: 'reports', label: 'Laporan', icon: BarChart3, color: 'from-violet-500 to-purple-600', path: '/reports', roles: ['OWNER', 'STORE_MANAGER'] },
        { id: 'community', label: 'Komunitas', icon: Users, color: 'from-pink-500 to-rose-600', path: '/community', roles: ['OWNER', 'STORE_MANAGER', 'ADMIN'] },
        { id: 'game', label: 'Game', icon: Gamepad2, color: 'from-cyan-500 to-blue-600', path: '/game', roles: ['OWNER', 'STORE_MANAGER', 'ADMIN', 'CASHIER'] },
    ];

    const actions = allActions.filter(a => a.roles.includes(role));

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.05 }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 10, scale: 0.95 },
        show: { opacity: 1, y: 0, scale: 1 }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Aksi Cepat
                </h3>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                    {actions.length} menu
                </span>
            </div>
            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-4 gap-3"
            >
                {actions.map((action) => {
                    const Icon = action.icon;
                    return (
                        <motion.button
                            key={action.id}
                            variants={item}
                            whileHover={{ y: -3, scale: 1.02 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate(action.path)}
                            className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 hover:border-slate-200 dark:hover:border-slate-600 shadow-sm hover:shadow-md transition-all duration-200 group"
                        >
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200`}>
                                <Icon size={18} className="text-white" />
                            </div>
                            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 text-center leading-tight group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">
                                {action.label}
                            </span>
                        </motion.button>
                    );
                })}
            </motion.div>
        </div>
    );
};

export default QuickActions;
