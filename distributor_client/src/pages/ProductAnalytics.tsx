import React, { useEffect, useState } from 'react';
import client from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  Package, TrendingUp, TrendingDown, Loader2, BarChart3, ShoppingBag,
  AlertTriangle, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';

const COLORS = ['#0d9488', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function ProductAnalytics() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [forecasting, setForecasting] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');

  useEffect(() => { fetchData(); }, [period]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [aRes, fRes] = await Promise.all([
        client.get(`/distributor/sales/analytics?period=${period}`),
        client.get('/distributor/forecasting'),
      ]);
      setAnalytics(aRes.data.data);
      setForecasting(fRes.data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fmt = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);
  const fmtShort = (v: number) => {
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}M`;
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}Jt`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}Rb`;
    return v.toString();
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-teal-600" /></div>;

  const topProducts = analytics?.topProducts || [];
  const productForecasts = forecasting?.productForecasts || [];
  const lowStockAlerts = forecasting?.lowStockAlerts || [];
  const historical = forecasting?.historical || [];
  const forecast = forecasting?.forecast || {};

  // Prepare chart data
  const productRevenueChart = topProducts.slice(0, 8).map((p: any) => ({ name: p.name?.substring(0, 12), revenue: p.revenue, qty: p.qty }));
  const categoryPie = (() => {
    const cats: Record<string, number> = {};
    topProducts.forEach((p: any) => { const cat = p.unit || 'Other'; cats[cat] = (cats[cat] || 0) + p.revenue; });
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  })();

  const historicalChart = historical.map((h: any) => ({ month: h.month, revenue: h.revenue, orders: h.orderCount }));
  if (forecast.nextMonth) {
    historicalChart.push({ month: 'Forecast', revenue: forecast.nextMonth.revenue, orders: forecast.nextMonth.orders });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Analisis Produk & Penjualan</h1>
          <p className="text-slate-500 dark:text-slate-400">Historis penjualan, forecasting, dan performa produk</p>
        </div>
        <div className="flex gap-2">
          {[{ label: '7D', value: '7' }, { label: '30D', value: '30' }, { label: '90D', value: '90' }].map(p => (
            <Button key={p.value} variant={period === p.value ? 'default' : 'outline'} size="sm" onClick={() => setPeriod(p.value)}>{p.label}</Button>
          ))}
        </div>
      </div>

      {/* Forecast Banner */}
      {forecast.nextMonth && (
        <Card className="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30 border-teal-200 dark:border-teal-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-teal-600 font-medium flex items-center gap-1"><TrendingUp className="w-3 h-3" />Forecast Bulan Depan</p>
                <p className="text-2xl font-bold text-teal-700 dark:text-teal-300">{fmt(forecast.nextMonth.revenue)}</p>
                <p className="text-xs text-teal-500">{forecast.nextMonth.orders} orders · Confidence {Math.round((forecast.nextMonth.confidence || 0) * 100)}%</p>
              </div>
              <div className="text-right">
                <div className={`flex items-center gap-1 ${forecast.trend === 'UP' ? 'text-emerald-600' : forecast.trend === 'DOWN' ? 'text-red-600' : 'text-slate-500'}`}>
                  {forecast.trend === 'UP' ? <ArrowUpRight className="w-4 h-4" /> : forecast.trend === 'DOWN' ? <ArrowDownRight className="w-4 h-4" /> : null}
                  <span className="text-sm font-bold">{forecast.trendPercent > 0 ? '+' : ''}{forecast.trendPercent}%</span>
                </div>
                <p className="text-xs text-slate-500">Trend</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revenue Trend + Forecast Chart */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="w-4 h-4 text-teal-600" />Revenue Historis & Forecast</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historicalChart}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={fmtShort} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#0d9488" fill="url(#colorRev)" strokeWidth={2.5} />
                <Line type="monotone" dataKey="orders" name="Orders" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" yAxisId={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top Products Bar Chart + Category Pie */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="w-4 h-4 text-indigo-600" />Produk Paling Laku (by Revenue)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productRevenueChart} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                  <XAxis type="number" fontSize={10} tickLine={false} axisLine={false} tickFormatter={fmtShort} />
                  <YAxis type="category" dataKey="name" fontSize={11} tickLine={false} axisLine={false} width={100} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="revenue" name="Revenue" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Revenue by Unit</CardTitle></CardHeader>
          <CardContent>
            {categoryPie.length > 0 ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryPie} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                      {categoryPie.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Legend formatter={(value) => <span className="text-xs">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="text-center text-slate-400 py-12">Belum ada data</p>}
          </CardContent>
        </Card>
      </div>

      {/* Product Quantity Chart */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShoppingBag className="w-4 h-4 text-amber-600" />Volume Penjualan (Quantity)</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productRevenueChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="qty" name="Qty Terjual" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Stock Forecast Table */}
      {productForecasts.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-purple-600" />Forecast Stok & Reorder</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-left py-3 px-4 font-medium text-slate-500">Produk</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-500">Avg/Bulan</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-500">Stok</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-500">Days Left</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-500">Reorder Qty</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-500">Status</th>
                </tr></thead>
                <tbody>
                  {productForecasts.map((p: any, i: number) => (
                    <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{p.name}</td>
                      <td className="py-3 px-4 text-right">{p.avgMonthlyDemand} {p.unit}</td>
                      <td className="py-3 px-4 text-right">{p.currentStock}</td>
                      <td className="py-3 px-4 text-right font-medium">{p.daysOfStock > 90 ? '90+' : p.daysOfStock}d</td>
                      <td className="py-3 px-4 text-right font-bold text-indigo-600">{p.reorderQty > 0 ? p.reorderQty : '-'}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={p.status === 'CRITICAL' ? 'destructive' : p.status === 'LOW' ? 'warning' : p.status === 'MODERATE' ? 'default' : 'success'}>
                          {p.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Low Stock Alerts */}
      {lowStockAlerts.length > 0 && (
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader><CardTitle className="text-base flex items-center gap-2 text-red-600"><AlertTriangle className="w-4 h-4" />Low Stock Alert</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {lowStockAlerts.map((p: any, i: number) => (
                <div key={i} className="p-3 rounded-lg border border-red-100 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20">
                  <p className="font-medium text-sm text-slate-900 dark:text-white">{p.name}</p>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-slate-500">Stok: <span className="font-bold text-red-600">{p.stockQuantity}</span> {p.unit}</span>
                    {p.moq > 0 && <span className="text-xs text-slate-400">MOQ: {p.moq}</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
