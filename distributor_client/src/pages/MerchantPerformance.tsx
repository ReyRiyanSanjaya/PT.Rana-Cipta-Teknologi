import React, { useEffect, useState } from 'react';
import client from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import {
  Users, Loader2, Search, TrendingUp, DollarSign, MapPin, Phone,
  Flame, Snowflake, Activity, Filter
} from 'lucide-react';

export default function MerchantPerformance() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await client.get('/distributor/sales/merchant-performance');
      setData(res.data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fmt = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-teal-600" /></div>;
  if (!data) return <div className="text-center py-20 text-slate-500">Gagal memuat data</div>;

  const { merchants, summary } = data;

  const filtered = merchants.filter((m: any) => {
    const matchSearch = !search || m.storeName.toLowerCase().includes(search.toLowerCase()) || m.location.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || m.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Performa Merchant</h1>
          <p className="text-slate-500 dark:text-slate-400">Analisis aktivitas dan revenue per merchant</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card><CardContent className="p-4 text-center"><Users className="w-5 h-5 mx-auto text-slate-600 mb-1" /><p className="text-xl font-bold">{summary.totalMerchants}</p><p className="text-[10px] text-slate-500">Total Merchant</p></CardContent></Card>
        <Card className="border-l-4 border-l-emerald-500"><CardContent className="p-4 text-center"><Activity className="w-5 h-5 mx-auto text-emerald-600 mb-1" /><p className="text-xl font-bold text-emerald-600">{summary.active}</p><p className="text-[10px] text-slate-500">Active (≤7 hari)</p></CardContent></Card>
        <Card className="border-l-4 border-l-amber-500"><CardContent className="p-4 text-center"><Flame className="w-5 h-5 mx-auto text-amber-600 mb-1" /><p className="text-xl font-bold text-amber-600">{summary.warm}</p><p className="text-[10px] text-slate-500">Warm (≤30 hari)</p></CardContent></Card>
        <Card className="border-l-4 border-l-blue-500"><CardContent className="p-4 text-center"><Snowflake className="w-5 h-5 mx-auto text-blue-600 mb-1" /><p className="text-xl font-bold text-blue-600">{summary.cold}</p><p className="text-[10px] text-slate-500">Cold (&gt;30 hari)</p></CardContent></Card>
        <Card className="border-l-4 border-l-teal-500"><CardContent className="p-4 text-center"><DollarSign className="w-5 h-5 mx-auto text-teal-600 mb-1" /><p className="text-xl font-bold text-teal-600">{fmt(summary.totalRevenue)}</p><p className="text-[10px] text-slate-500">Revenue Bulan Ini</p></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-10" placeholder="Cari merchant..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {[{ label: 'Semua', value: 'all' }, { label: 'Active', value: 'ACTIVE' }, { label: 'Warm', value: 'WARM' }, { label: 'Cold', value: 'COLD' }].map(f => (
            <Button key={f.value} variant={statusFilter === f.value ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter(f.value)}>
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Merchant Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-left py-3 px-4 font-medium text-slate-500">#</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500">Merchant</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500">Lokasi</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-500">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-500">Revenue</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-500">Orders</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-500">Visits</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-500">Last Order</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-500">Credit</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} className="py-12 text-center text-slate-400">Tidak ada merchant ditemukan</td></tr>
                ) : filtered.map((m: any, i: number) => (
                  <tr key={m.tenantId} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4 text-slate-400 font-medium">{i + 1}</td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{m.storeName}</p>
                        <p className="text-[10px] text-slate-400">{m.category}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500 max-w-[150px] truncate">{m.location}</td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant={m.status === 'ACTIVE' ? 'success' : m.status === 'WARM' ? 'warning' : 'destructive'}>
                        {m.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600">{m.monthRevenue > 0 ? fmt(m.monthRevenue) : '-'}</td>
                    <td className="py-3 px-4 text-right">{m.monthOrders || '-'}</td>
                    <td className="py-3 px-4 text-right">{m.monthVisits || '-'}</td>
                    <td className="py-3 px-4 text-right text-xs text-slate-500">
                      {m.daysSinceLastOrder < 999 ? `${m.daysSinceLastOrder}d ago` : 'Never'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="text-xs">
                        <p className="font-medium">{fmt(m.creditLimit)}</p>
                        {m.creditUsed > 0 && <p className="text-red-500">Used: {fmt(m.creditUsed)}</p>}
                      </div>
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
