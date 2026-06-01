import React, { useEffect, useState } from 'react';
import client from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { TrendingUp, TrendingDown, AlertTriangle, Package, ShoppingBag, DollarSign, Loader2, RefreshCw, BarChart3, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ForecastData {
  historical: { month: string; monthKey: string; revenue: number; orderCount: number }[];
  forecast: { nextMonth: { revenue: number; orders: number; confidence: number }; trend: string; trendPercent: number };
  productForecasts: {
    id: string; name: string; unit: string;
    totalQty: number; orderFrequency: number;
    avgMonthlyDemand: number; currentStock: number;
    daysOfStock: number; reorderQty: number; status: string;
  }[];
  lowStockAlerts: { id: string; name: string; stockQuantity: number; unit: string; moq: number }[];
}

export default function Forecasting() {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await client.get('/distributor/forecasting');
      setData(res.data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CRITICAL': return 'destructive';
      case 'LOW': return 'warning';
      case 'MODERATE': return 'default';
      default: return 'success';
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-teal-600" /></div>;
  if (!data) return <div className="text-center py-20 text-slate-500">Gagal memuat data forecasting</div>;

  const chartData = [
    ...data.historical.map(h => ({ name: h.month, revenue: h.revenue, orders: h.orderCount })),
    { name: 'Forecast', revenue: data.forecast.nextMonth.revenue, orders: data.forecast.nextMonth.orders, isForecast: true }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Forecasting</h1>
          <p className="text-slate-500 dark:text-slate-400">Prediksi permintaan dan rekomendasi restock</p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Forecast Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 border-teal-100 dark:border-teal-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-teal-600">Prediksi Revenue</p>
              <Badge variant="success" className="text-[10px]">{Math.round(data.forecast.nextMonth.confidence * 100)}% conf</Badge>
            </div>
            <p className="text-2xl font-bold text-teal-700 dark:text-teal-300">{formatCurrency(data.forecast.nextMonth.revenue)}</p>
            <p className="text-xs text-teal-500 mt-1">Bulan depan</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 mb-2">Prediksi Orders</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{data.forecast.nextMonth.orders}</p>
            <p className="text-xs text-slate-400 mt-1">Estimasi pesanan</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 mb-2">Trend</p>
            <div className="flex items-center gap-2">
              {data.forecast.trend === 'UP' ? <TrendingUp className="w-5 h-5 text-emerald-500" /> : data.forecast.trend === 'DOWN' ? <TrendingDown className="w-5 h-5 text-red-500" /> : <ArrowRight className="w-5 h-5 text-slate-400" />}
              <p className={`text-2xl font-bold ${data.forecast.trend === 'UP' ? 'text-emerald-600' : data.forecast.trend === 'DOWN' ? 'text-red-600' : 'text-slate-600'}`}>
                {data.forecast.trendPercent >= 0 ? '+' : ''}{data.forecast.trendPercent}%
              </p>
            </div>
            <p className="text-xs text-slate-400 mt-1">{data.forecast.trend === 'UP' ? 'Naik' : data.forecast.trend === 'DOWN' ? 'Turun' : 'Stabil'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 mb-2">Low Stock Alert</p>
            <p className="text-2xl font-bold text-amber-600">{data.lowStockAlerts.length}</p>
            <p className="text-xs text-slate-400 mt-1">Produk perlu restock</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="w-5 h-5 text-teal-600" /> Revenue Trend & Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : `${(v/1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="revenue" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Product Demand Forecast */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="w-5 h-5 text-teal-600" /> Rekomendasi Restock
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="text-left py-3 px-3 font-medium text-slate-500">Produk</th>
                  <th className="text-right py-3 px-3 font-medium text-slate-500">Demand/Bulan</th>
                  <th className="text-right py-3 px-3 font-medium text-slate-500">Stok Saat Ini</th>
                  <th className="text-right py-3 px-3 font-medium text-slate-500">Hari Tersisa</th>
                  <th className="text-right py-3 px-3 font-medium text-slate-500">Reorder Qty</th>
                  <th className="text-center py-3 px-3 font-medium text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.productForecasts.map(p => (
                  <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-3">
                      <span className="font-medium text-slate-900 dark:text-white">{p.name}</span>
                      <span className="text-xs text-slate-400 ml-1">({p.unit})</span>
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700 dark:text-slate-300">{p.avgMonthlyDemand}</td>
                    <td className="py-3 px-3 text-right font-medium text-slate-900 dark:text-white">{p.currentStock}</td>
                    <td className="py-3 px-3 text-right">
                      <span className={`font-bold ${p.daysOfStock <= 7 ? 'text-red-600' : p.daysOfStock <= 14 ? 'text-amber-600' : 'text-slate-700 dark:text-slate-300'}`}>
                        {p.daysOfStock > 90 ? '90+' : p.daysOfStock} hari
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-teal-600">{p.reorderQty > 0 ? p.reorderQty : '-'}</td>
                    <td className="py-3 px-3 text-center">
                      <Badge variant={getStatusColor(p.status) as any}>{p.status}</Badge>
                    </td>
                  </tr>
                ))}
                {data.productForecasts.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-slate-400">Belum ada data demand</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Low Stock Alerts */}
      {data.lowStockAlerts.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5" /> Peringatan Stok Rendah
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.lowStockAlerts.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
                    <Package className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{p.name}</p>
                    <p className="text-xs text-amber-600">Sisa: <strong>{p.stockQuantity}</strong> {p.unit}</p>
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
