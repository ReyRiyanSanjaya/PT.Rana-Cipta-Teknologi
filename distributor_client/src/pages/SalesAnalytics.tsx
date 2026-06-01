import React, { useEffect, useState } from 'react';
import client from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingBag, Users, Loader2,
  Globe, Layers, MapPin, Package, ArrowUpRight, ArrowDownRight, Calendar
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#0d9488', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function SalesAnalytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');

  useEffect(() => { fetchData(); }, [period]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await client.get(`/distributor/sales/analytics?period=${period}`);
      setData(res.data.data);
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
  if (!data) return <div className="text-center py-20 text-slate-500">Gagal memuat data</div>;

  const { summary, dailyRevenue, topMerchants, topProducts, statusBreakdown, visitCorrelation } = data;

  const pieData = [
    { name: 'Ekosistem', value: summary.ecosystemRevenue },
    { name: 'Eksternal', value: summary.externalRevenue },
  ].filter(d => d.value > 0);

  const statusPieData = Object.entries(statusBreakdown).filter(([, v]) => (v as number) > 0).map(([k, v]) => ({ name: k.charAt(0).toUpperCase() + k.slice(1), value: v as number }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Sales Analytics</h1>
          <p className="text-slate-500 dark:text-slate-400">Analisis penjualan komprehensif ekosistem & eksternal</p>
        </div>
        <div className="flex gap-2">
          {[{ label: '7 Hari', value: '7' }, { label: '30 Hari', value: '30' }, { label: '90 Hari', value: '90' }].map(p => (
            <Button key={p.value} variant={period === p.value ? 'default' : 'outline'} size="sm" onClick={() => setPeriod(p.value)}>
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Total Revenue</p>
                <p className="text-2xl font-bold text-emerald-600">{fmt(summary.totalRevenue)}</p>
                <div className="flex items-center gap-1 mt-1">
                  {summary.revenueGrowth >= 0 ? <ArrowUpRight className="w-3 h-3 text-emerald-500" /> : <ArrowDownRight className="w-3 h-3 text-red-500" />}
                  <span className={`text-xs font-medium ${summary.revenueGrowth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{summary.revenueGrowth}% vs bulan lalu</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/30"><DollarSign className="w-5 h-5 text-emerald-600" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Total Orders</p>
                <p className="text-2xl font-bold text-indigo-600">{summary.totalOrders}</p>
                <p className="text-[10px] text-slate-400">{summary.ecosystemOrders} ekosistem · {summary.externalOrders} eksternal</p>
              </div>
              <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-900/30"><ShoppingBag className="w-5 h-5 text-indigo-600" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Avg Order Value</p>
                <p className="text-2xl font-bold text-amber-600">{fmt(summary.avgOrderValue)}</p>
                <p className="text-[10px] text-slate-400">Per transaksi</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30"><Package className="w-5 h-5 text-amber-600" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-teal-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Active Merchants</p>
                <p className="text-2xl font-bold text-teal-600">{summary.uniqueCustomers}</p>
                <p className="text-[10px] text-slate-400">Merchant aktif periode ini</p>
              </div>
              <div className="p-3 rounded-xl bg-teal-100 dark:bg-teal-900/30"><Users className="w-5 h-5 text-teal-600" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart + Pie */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-teal-600" />Revenue Harian</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyRevenue}>
                  <defs>
                    <linearGradient id="colorEco" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="label" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={fmtShort} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Area type="monotone" dataKey="ecosystem" name="Ekosistem" stroke="#0d9488" fill="url(#colorEco)" strokeWidth={2} />
                  <Area type="monotone" dataKey="external" name="Eksternal" stroke="#6366f1" fill="url(#colorExt)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Komposisi Revenue</CardTitle></CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Legend formatter={(value) => <span className="text-xs">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-slate-400 text-sm">Belum ada data</div>
            )}
            <div className="mt-4 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-2"><Layers className="w-3.5 h-3.5 text-teal-600" />Ekosistem</span>
                <span className="font-bold text-teal-600">{fmt(summary.ecosystemRevenue)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-2"><Globe className="w-3.5 h-3.5 text-indigo-600" />Eksternal</span>
                <span className="font-bold text-indigo-600">{fmt(summary.externalRevenue)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visit Correlation + Status */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4 text-center"><MapPin className="w-5 h-5 mx-auto text-teal-600 mb-2" /><p className="text-2xl font-bold">{visitCorrelation.totalVisits}</p><p className="text-[10px] text-slate-500">Total Kunjungan</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Users className="w-5 h-5 mx-auto text-emerald-600 mb-2" /><p className="text-2xl font-bold">{visitCorrelation.completed}</p><p className="text-[10px] text-slate-500">Selesai</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><ShoppingBag className="w-5 h-5 mx-auto text-indigo-600 mb-2" /><p className="text-2xl font-bold text-indigo-600">{visitCorrelation.effective}</p><p className="text-[10px] text-slate-500">Effective Calls</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><TrendingUp className="w-5 h-5 mx-auto text-amber-600 mb-2" /><p className="text-2xl font-bold text-amber-600">{visitCorrelation.ecr}%</p><p className="text-[10px] text-slate-500">ECR</p></CardContent></Card>
      </div>

      {/* Top Merchants + Top Products */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-teal-600" />Top Merchants</CardTitle></CardHeader>
          <CardContent>
            {topMerchants.length === 0 ? (
              <p className="text-center text-slate-400 py-6">Belum ada data</p>
            ) : (
              <div className="space-y-3">
                {topMerchants.slice(0, 8).map((m: any, i: number) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-[10px] font-bold text-teal-700">#{i + 1}</span>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{m.name}</p>
                        <p className="text-[10px] text-slate-400">{m.category} · {m.orders} orders</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-emerald-600">{fmt(m.revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="w-4 h-4 text-indigo-600" />Top Produk</CardTitle></CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <p className="text-center text-slate-400 py-6">Belum ada data</p>
            ) : (
              <div className="space-y-3">
                {topProducts.slice(0, 8).map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-[10px] font-bold text-indigo-700">#{i + 1}</span>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{p.name}</p>
                        <p className="text-[10px] text-slate-400">{p.qty} {p.unit} terjual</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-indigo-600">{fmt(p.revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Status */}
      <Card>
        <CardHeader><CardTitle className="text-base">Status Pesanan</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {[
              { label: 'Pending', value: statusBreakdown.pending, color: 'bg-amber-100 text-amber-700' },
              { label: 'Paid', value: statusBreakdown.paid, color: 'bg-blue-100 text-blue-700' },
              { label: 'Processing', value: statusBreakdown.processing, color: 'bg-indigo-100 text-indigo-700' },
              { label: 'Shipped', value: statusBreakdown.shipped, color: 'bg-purple-100 text-purple-700' },
              { label: 'Delivered', value: statusBreakdown.delivered, color: 'bg-emerald-100 text-emerald-700' },
            ].map((s, i) => (
              <div key={i} className={`p-3 rounded-xl text-center ${s.color.split(' ')[0]}`}>
                <p className={`text-2xl font-bold ${s.color.split(' ')[1]}`}>{s.value}</p>
                <p className="text-xs font-medium mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
