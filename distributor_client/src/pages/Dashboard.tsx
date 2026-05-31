import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Link } from 'react-router-dom';
import client from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { DollarSign, ShoppingBag, Package, TrendingUp, Users, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Badge } from '../components/ui/Badge';

interface DashboardStats {
  totalRevenue: number;
  activeOrders: number;
  productsCount: number;
  lowStockCount: number;
  totalMerchants: number;
  recentOrders: {
    id: string;
    orderNumber: string;
    totalAmount: number;
    status: string;
    createdAt: string;
    tenant: {
      name: string;
      users: { name: string }[];
    };
  }[];
  weeklyChart: { name: string; sales: number }[];
}

export default function Dashboard() {
  const user = useAuthStore((state) => state.user);
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    activeOrders: 0,
    productsCount: 0,
    lowStockCount: 0,
    totalMerchants: 0,
    recentOrders: [],
    weeklyChart: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await client.get('/distributor/dashboard');
      setStats(res.data.data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'DELIVERED': return 'success';
      case 'PAID': return 'success';
      case 'PENDING': return 'warning';
      case 'CANCELLED': return 'destructive';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-muted-foreground text-slate-500 dark:text-slate-400">Welcome back, {user?.name}</p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground text-slate-400 dark:text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              Rp {stats.totalRevenue.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-muted-foreground text-emerald-600 dark:text-emerald-400 font-medium">From paid orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground text-slate-400 dark:text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.activeOrders}</div>
            <p className="text-xs text-muted-foreground text-slate-500 dark:text-slate-400">Orders in progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products in Stock</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground text-slate-400 dark:text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.productsCount}</div>
            <p className="text-xs text-muted-foreground text-slate-500 dark:text-slate-400">
              {stats.lowStockCount > 0 ? `${stats.lowStockCount} low stock alerts` : 'Stock levels healthy'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Merchants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground text-slate-400 dark:text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalMerchants}</div>
            <p className="text-xs text-muted-foreground text-emerald-600 dark:text-emerald-400 font-medium">Unique buyers</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Chart */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Weekly Revenue</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full">
              {stats.weeklyChart.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.weeklyChart}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-700" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#64748b" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      stroke="#64748b" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(value) => value >= 1000000 ? `${(value/1000000).toFixed(1)}M` : value >= 1000 ? `${(value/1000).toFixed(0)}K` : `${value}`} 
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--tooltip-bg)', 
                        borderColor: 'var(--grid-color)',
                        color: 'var(--tooltip-text)',
                        borderRadius: '0.5rem'
                      }}
                      formatter={(value: number) => [`Rp ${value.toLocaleString('id-ID')}`, 'Revenue']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="sales" 
                      stroke="#0d9488" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorSales)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <p>No revenue data this week</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className="col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Orders</CardTitle>
            <Link to="/orders" className="text-xs text-teal-600 hover:underline font-medium">View All</Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {stats.recentOrders.length > 0 ? (
                stats.recentOrders.map((order) => (
                  <Link key={order.id} to={`/orders/${order.id}`} className="flex items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 -mx-2 px-2 py-1 rounded-lg transition-colors">
                    <div className="h-9 w-9 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center border border-teal-200 dark:border-teal-800">
                      <span className="text-xs font-bold text-teal-700 dark:text-teal-300">
                        {(order.tenant?.name || 'U').substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-4 space-y-1 flex-1 min-w-0">
                      <p className="text-sm font-medium leading-none text-slate-900 dark:text-slate-100 truncate">
                        {order.orderNumber}
                      </p>
                      <p className="text-sm text-muted-foreground text-slate-500 dark:text-slate-400 truncate">
                        {order.tenant?.name || 'Unknown'}
                      </p>
                    </div>
                    <div className="ml-auto flex flex-col items-end gap-1">
                      <span className="font-medium text-sm text-slate-900 dark:text-slate-100">
                        +Rp {order.totalAmount.toLocaleString('id-ID')}
                      </span>
                      <Badge variant={getStatusVariant(order.status) as any} className="text-[10px]">
                        {order.status}
                      </Badge>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No orders yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
