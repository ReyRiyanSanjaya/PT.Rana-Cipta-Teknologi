import React, { useEffect, useState } from 'react';
import client from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Target, TrendingUp, TrendingDown, Users, ShoppingBag, DollarSign, Loader2, Award, Repeat } from 'lucide-react';

export default function SalesKPI() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { client.get('/distributor/kpi').then(r => setData(r.data.data)).catch(console.error).finally(() => setLoading(false)); }, []);

  const fmt = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-teal-600" /></div>;
  if (!data) return <div className="text-center py-20 text-slate-500">Gagal memuat data</div>;

  const ProgressRing = ({ percent, color }: { percent: number; color: string }) => (
    <div className="relative w-20 h-20">
      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="35" fill="none" stroke="currentColor" strokeWidth="6" className="text-slate-100 dark:text-slate-800" />
        <circle cx="40" cy="40" r="35" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${percent * 2.2} 220`} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-900 dark:text-white">{percent}%</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Target & KPI</h1><p className="text-slate-500 dark:text-slate-400">Performa penjualan bulan ini</p></div>

      {/* KPI Progress */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Revenue', value: fmt(data.current.revenue), target: fmt(data.targets.monthlyRevenue), percent: data.progress.revenue, color: '#0d9488', icon: DollarSign },
          { label: 'Orders', value: data.current.orders, target: data.targets.monthlyOrders, percent: data.progress.orders, color: '#6366f1', icon: ShoppingBag },
          { label: 'New Customers', value: data.current.newCustomers, target: data.targets.newCustomers, percent: data.progress.newCustomers, color: '#f59e0b', icon: Users },
          { label: 'Conversion', value: `${data.current.conversionRate}%`, target: `${data.targets.conversionRate}%`, percent: data.progress.conversionRate, color: '#8b5cf6', icon: Target },
        ].map((kpi, i) => (
          <Card key={i}>
            <CardContent className="p-5 flex items-center gap-4">
              <ProgressRing percent={kpi.percent} color={kpi.color} />
              <div className="flex-1">
                <p className="text-xs text-slate-500 font-medium">{kpi.label}</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{kpi.value}</p>
                <p className="text-[10px] text-slate-400">Target: {kpi.target}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Growth & Metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-2 mb-2">{data.growth.revenue >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />}<span className="text-xs text-slate-500">Revenue Growth</span></div>
          <p className={`text-2xl font-bold ${data.growth.revenue >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{data.growth.revenue >= 0 ? '+' : ''}{data.growth.revenue}%</p>
          <p className="text-xs text-slate-400 mt-1">vs bulan lalu</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-2 mb-2"><Repeat className="w-4 h-4 text-indigo-500" /><span className="text-xs text-slate-500">Repeat Customers</span></div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{data.current.repeatCustomers}</p>
          <p className="text-xs text-slate-400 mt-1">Order &gt; 1x bulan ini</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-2 mb-2"><Award className="w-4 h-4 text-amber-500" /><span className="text-xs text-slate-500">Avg Order Value</span></div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{fmt(data.current.avgOrderValue)}</p>
          <p className="text-xs text-slate-400 mt-1">Per transaksi</p>
        </CardContent></Card>
      </div>

      {/* Top Products */}
      <Card>
        <CardHeader><CardTitle className="text-base">Top Produk Bulan Ini</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(data.topProducts || []).map((p: any, i: number) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 w-5">#{i + 1}</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{p.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-teal-600">{fmt(p.revenue)}</p>
                  <p className="text-[10px] text-slate-400">{p.qty} unit</p>
                </div>
              </div>
            ))}
            {(!data.topProducts || data.topProducts.length === 0) && <p className="text-center text-slate-400 py-4">Belum ada data</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
