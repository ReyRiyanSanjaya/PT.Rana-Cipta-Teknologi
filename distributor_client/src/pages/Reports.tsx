import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import client from '../api/client';
import { 
  Loader2, 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  ShoppingCart, 
  Users, 
  Download,
  Activity,
  FileText
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { 
  format, 
  subDays, 
  eachDayOfInterval,
  parseISO
} from 'date-fns';

// Types
interface Order {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  items: {
    quantity: number;
    wholesaleProduct: {
      name: string;
      wholesaleCategory?: {
        name: string;
      }
    };
  }[];
  tenantId: string;
  tenant: {
    name: string;
    users: {
      name: string;
      email: string;
    }[];
  };
}

type TimeRange = '7d' | '30d' | '90d' | 'all';

const STATUS_COLORS: Record<string, string> = {
  'PAID': '#10b981', // emerald-500
  'PROCESSING': '#3b82f6', // blue-500
  'SHIPPED': '#8b5cf6', // violet-500
  'DELIVERED': '#0d9488', // teal-600
  'PENDING': '#f59e0b', // amber-500
  'CANCELLED': '#ef4444', // red-500
};

export default function Reports() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await client.get('/distributor/orders');
      setOrders(res.data.data || []);
    } catch (e) {
      console.error("Failed to load reports data", e);
    } finally {
      setLoading(false);
    }
  };

  // Process Data based on Time Range
  const analytics = useMemo(() => {
    if (!orders.length) return null;

    const now = new Date();
    let startDate = subDays(now, 30); // Default

    if (timeRange === '7d') startDate = subDays(now, 7);
    if (timeRange === '90d') startDate = subDays(now, 90);
    if (timeRange === 'all') startDate = new Date(0); // Beginning of time

    // 1. Filter Orders for Current Period
    const currentOrders = orders.filter(o => {
      const date = parseISO(o.createdAt);
      return date >= startDate && date <= now;
    });

    // 2. Filter Orders for Previous Period (for comparison)
    const duration = now.getTime() - startDate.getTime();
    const prevStartDate = new Date(startDate.getTime() - duration);
    const prevEndDate = startDate;
    
    const prevOrders = orders.filter(o => {
      const date = parseISO(o.createdAt);
      return date >= prevStartDate && date < prevEndDate;
    });

    // 3. Calculate Metrics
    const calculateMetrics = (data: Order[]) => {
      const validOrders = data.filter(o => ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(o.status));
      const revenue = validOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
      const count = validOrders.length;
      const uniqueCustomers = new Set(validOrders.map(o => o.tenantId)).size;
      const aov = count > 0 ? revenue / count : 0;
      return { revenue, count, uniqueCustomers, aov };
    };

    const current = calculateMetrics(currentOrders);
    const previous = calculateMetrics(prevOrders);

    const growth = {
      revenue: previous.revenue ? ((current.revenue - previous.revenue) / previous.revenue) * 100 : 0,
      orders: previous.count ? ((current.count - previous.count) / previous.count) * 100 : 0,
    };

    // 4. Revenue Trend
    const days = timeRange === 'all' 
      ? [] 
      : eachDayOfInterval({ start: startDate, end: now });

    const revenueChartData = days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayOrders = currentOrders.filter(o => format(parseISO(o.createdAt), 'yyyy-MM-dd') === dateStr);
      const dayRevenue = dayOrders
        .filter(o => ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(o.status))
        .reduce((sum, o) => sum + Number(o.totalAmount), 0);
      
      return {
        date: format(day, 'MMM dd'),
        revenue: dayRevenue
      };
    });

    // 5. Order Status
    const statusCounts: Record<string, number> = {};
    currentOrders.forEach(o => {
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    });
    const statusChartData = Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value
    }));

    // 6. Top Products & Categories
    const productMap = new Map<string, number>();
    const categoryMap = new Map<string, number>();
    
    currentOrders.forEach(o => {
       if (['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(o.status)) {
         o.items?.forEach(item => {
            const name = item.wholesaleProduct?.name || 'Unknown';
            const category = item.wholesaleProduct?.wholesaleCategory?.name || 'Uncategorized';
            
            productMap.set(name, (productMap.get(name) || 0) + item.quantity);
            categoryMap.set(category, (categoryMap.get(category) || 0) + item.quantity);
         });
       }
    });

    const topProducts = Array.from(productMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, sales]) => ({ name, sales }));

    const salesByCategory = Array.from(categoryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, sales]) => ({ name, sales }));

    // 7. Top Customers
    const customerMap = new Map<string, { name: string, email: string, revenue: number, orders: number }>();
    
    currentOrders.forEach(o => {
      if (['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(o.status)) {
        const tenantId = o.tenantId;
        const current = customerMap.get(tenantId) || { 
          name: o.tenant?.name || 'Unknown', 
          email: o.tenant?.users?.[0]?.email || '', 
          revenue: 0, 
          orders: 0 
        };
        
        current.revenue += Number(o.totalAmount);
        current.orders += 1;
        customerMap.set(tenantId, current);
      }
    });

    const topCustomers = Array.from(customerMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      current,
      growth,
      revenueChartData,
      statusChartData,
      topProducts,
      salesByCategory,
      topCustomers,
      recentOrders: currentOrders.slice(0, 10) // Last 10 orders
    };
  }, [orders, timeRange]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
  };

  const handleExport = () => {
    if (!orders.length) return;
    
    const headers = ['Order ID', 'Date', 'Customer', 'Status', 'Items', 'Total Amount'];
    const csvContent = [
      headers.join(','),
      ...orders.map(o => [
        o.orderNumber || o.id,
        format(parseISO(o.createdAt), 'yyyy-MM-dd HH:mm'),
        `"${o.tenant?.name || 'Unknown'}"`,
        o.status,
        `"${o.items.map(i => `${i.wholesaleProduct.name} (${i.quantity})`).join('; ')}"`,
        o.totalAmount
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reports_${format(new Date(), 'yyyyMMdd')}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Reports & Analytics</h1>
           <p className="text-muted-foreground text-slate-500 dark:text-slate-400">Comprehensive insights into your business performance</p>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
          {(['7d', '30d', '90d'] as TimeRange[]).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTimeRange(range)}
              className={timeRange === range ? 'bg-teal-600 text-white hover:bg-teal-700' : ''}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '3 Months'}
            </Button>
          ))}
          <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard 
          title="Total Revenue" 
          value={formatCurrency(analytics?.current.revenue || 0)} 
          trend={analytics?.growth.revenue || 0}
          icon={<DollarSign className="h-4 w-4 text-slate-500" />}
        />
        <KpiCard 
          title="Total Orders" 
          value={(analytics?.current.count || 0).toString()} 
          trend={analytics?.growth.orders || 0}
          icon={<ShoppingCart className="h-4 w-4 text-slate-500" />}
        />
        <KpiCard 
          title="Active Merchants" 
          value={(analytics?.current.uniqueCustomers || 0).toString()} 
          icon={<Users className="h-4 w-4 text-slate-500" />}
          subtext="Unique buyers this period"
        />
        <KpiCard 
          title="Avg. Order Value" 
          value={formatCurrency(analytics?.current.aov || 0)} 
          icon={<Activity className="h-4 w-4 text-slate-500" />}
          subtext="Per valid transaction"
        />
      </div>

      {/* Main Charts Row 1 */}
      <div className="grid gap-4 md:grid-cols-7">
        
        {/* Revenue Trend */}
        <Card className="md:col-span-4 lg:col-span-5">
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
            <CardDescription>Daily revenue performance over the selected period</CardDescription>
          </CardHeader>
          <CardContent className="pl-0">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics?.revenueChartData || []}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="date" 
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
                    tickFormatter={(value) => `Rp${value/1000}k`} 
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#0d9488" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Sales by Category */}
        <Card className="md:col-span-3 lg:col-span-2">
           <CardHeader>
             <CardTitle>Sales by Category</CardTitle>
             <CardDescription>Top performing product categories</CardDescription>
           </CardHeader>
           <CardContent>
             <div className="h-[350px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={analytics?.salesByCategory || []} layout="vertical" margin={{ left: 0 }}>
                   <XAxis type="number" hide />
                   <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                   <Tooltip cursor={{fill: 'transparent'}} formatter={(value: number) => [value, 'Items Sold']} />
                   <Bar dataKey="sales" fill="#0d9488" radius={[0, 4, 4, 0]} barSize={20} />
                 </BarChart>
               </ResponsiveContainer>
             </div>
           </CardContent>
        </Card>
      </div>

      {/* Main Charts Row 2 */}
      <div className="grid gap-4 md:grid-cols-3">
        
        {/* Order Status */}
        <Card>
            <CardHeader>
              <CardTitle>Order Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics?.statusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {(analytics?.statusChartData || []).map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS] || '#94a3b8'} 
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                {(analytics?.statusChartData || []).map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS] || '#94a3b8' }} 
                    />
                    <span className="text-slate-600 dark:text-slate-300 capitalize">
                      {entry.name.toLowerCase().replace('_', ' ')}
                    </span>
                    <span className="font-medium ml-auto">{entry.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
            <CardHeader>
              <CardTitle>Top Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(analytics?.topProducts || []).map((product, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex flex-col flex-1 min-w-0 mr-4">
                      <span className="text-sm font-medium text-slate-900 dark:text-white truncate" title={product.name}>
                        {product.name}
                      </span>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-1">
                         <div 
                            className="bg-teal-500 h-1.5 rounded-full" 
                            style={{ width: `${(product.sales / (analytics?.topProducts[0]?.sales || 1)) * 100}%` }}
                         />
                      </div>
                    </div>
                    <span className="text-sm text-slate-500 font-medium shrink-0">{product.sales} sold</span>
                  </div>
                ))}
                {(!analytics?.topProducts.length) && (
                   <p className="text-sm text-slate-400 text-center py-4">No data available</p>
                )}
              </div>
            </CardContent>
        </Card>

        {/* Top Customers */}
        <Card>
            <CardHeader>
              <CardTitle>Top Customers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(analytics?.topCustomers || []).map((customer, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 font-bold text-xs">
                        {customer.name.substring(0,2).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-[120px]">
                          {customer.name}
                        </span>
                        <span className="text-xs text-slate-500 truncate max-w-[120px]">
                          {customer.orders} orders
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-teal-600">
                      {formatCurrency(customer.revenue)}
                    </span>
                  </div>
                ))}
                {(!analytics?.topCustomers.length) && (
                   <p className="text-sm text-slate-400 text-center py-4">No data available</p>
                )}
              </div>
            </CardContent>
        </Card>
      </div>

      {/* Recent Transactions Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
           <div>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Latest orders from your merchants</CardDescription>
           </div>
           <Button variant="outline" size="sm" className="gap-2" onClick={() => window.location.href='/orders'}>
             View All
           </Button>
        </CardHeader>
        <CardContent>
           <div className="overflow-x-auto">
             <table className="w-full text-sm text-left">
               <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/50">
                 <tr>
                   <th className="px-4 py-3">Order ID</th>
                   <th className="px-4 py-3">Date</th>
                   <th className="px-4 py-3">Customer</th>
                   <th className="px-4 py-3">Items</th>
                   <th className="px-4 py-3">Status</th>
                   <th className="px-4 py-3 text-right">Amount</th>
                 </tr>
               </thead>
               <tbody>
                 {(analytics?.recentOrders || []).map((order) => (
                   <tr key={order.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                     <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                       #{order.orderNumber || order.id.substring(0,8)}
                     </td>
                     <td className="px-4 py-3 text-slate-500">
                       {format(parseISO(order.createdAt), 'MMM dd, HH:mm')}
                     </td>
                     <td className="px-4 py-3">
                       <div className="flex flex-col">
                         <span className="text-slate-900 dark:text-white font-medium">{order.tenant?.name || 'Unknown'}</span>
                         <span className="text-xs text-slate-500">{order.tenant?.users?.[0]?.email}</span>
                       </div>
                     </td>
                     <td className="px-4 py-3 text-slate-500">
                       {order.items.length} items
                     </td>
                     <td className="px-4 py-3">
                       <span 
                         className="px-2 py-1 rounded-full text-xs font-medium"
                         style={{ 
                           backgroundColor: `${STATUS_COLORS[order.status]}20`, 
                           color: STATUS_COLORS[order.status] 
                         }}
                       >
                         {order.status}
                       </span>
                     </td>
                     <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white">
                       {formatCurrency(order.totalAmount)}
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Subcomponent for KPI Cards
function KpiCard({ title, value, trend, icon, subtext }: { title: string, value: string, trend?: number, icon: React.ReactNode, subtext?: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
        {trend !== undefined && (
          <div className="flex items-center text-xs mt-1">
            {trend > 0 ? (
              <TrendingUp className="h-3 w-3 text-emerald-500 mr-1" />
            ) : trend < 0 ? (
              <TrendingDown className="h-3 w-3 text-rose-500 mr-1" />
            ) : null}
            <span className={trend > 0 ? "text-emerald-500" : trend < 0 ? "text-rose-500" : "text-slate-500"}>
              {Math.abs(trend).toFixed(1)}%
            </span>
            <span className="text-slate-500 ml-1">from previous period</span>
          </div>
        )}
        {subtext && (
           <p className="text-xs text-slate-500 mt-1">{subtext}</p>
        )}
      </CardContent>
    </Card>
  );
}
