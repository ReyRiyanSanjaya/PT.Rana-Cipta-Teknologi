import React, { useEffect, useState } from 'react';
import client from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Target, TrendingUp, TrendingDown, Users, ShoppingBag, DollarSign, Loader2, Award, Repeat, Sparkles, Flag } from 'lucide-react';

export default function SalesKPI() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [companyTarget, setCompanyTarget] = useState<any>(null);
  const [genModal, setGenModal] = useState(false);
  const [genForm, setGenForm] = useState({ revenue: '50000000', orders: '', visits: '', growth: '10', mode: 'balanced' });
  const [generating, setGenerating] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      client.get('/distributor/kpi'),
      client.get('/distributor/kpi/company-target'),
    ]).then(([kpiRes, ctRes]) => {
      setData(kpiRes.data.data);
      setCompanyTarget(ctRes.data.data);
      if (ctRes.data.data?.companyRevenueTarget) {
        setGenForm(f => ({ ...f, revenue: String(ctRes.data.data.companyRevenueTarget), growth: String(ctRes.data.data.growthPercent || 10) }));
      }
    }).catch(console.error).finally(() => setLoading(false));
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genForm.revenue) { alert('Target omset wajib diisi'); return; }
    try {
      setGenerating(true);
      await client.post('/distributor/kpi/generate', {
        companyRevenueTarget: parseFloat(genForm.revenue),
        companyOrderTarget: genForm.orders ? parseInt(genForm.orders) : undefined,
        companyVisitTarget: genForm.visits ? parseInt(genForm.visits) : undefined,
        growthPercent: parseInt(genForm.growth) || 10,
        fairnessMode: genForm.mode,
      });
      setGenModal(false);
      fetchData();
      alert('✅ KPI target berhasil di-generate!');
    } catch (err: any) { alert(err.response?.data?.message || 'Gagal'); }
    finally { setGenerating(false); }
  };

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div><h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Target & KPI</h1><p className="text-slate-500 dark:text-slate-400">Performa penjualan bulan ini</p></div>
        <Button onClick={() => setGenModal(true)}><Sparkles className="w-4 h-4 mr-2" />AI Generate KPI</Button>
      </div>

      {/* Company Target Banner */}
      {companyTarget?.companyRevenueTarget && (
        <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border-indigo-200 dark:border-indigo-800">
          <CardContent className="p-4 flex items-center gap-4">
            <Flag className="w-6 h-6 text-indigo-600" />
            <div className="flex-1">
              <p className="text-xs text-indigo-600 font-medium">Company Hope Target (Direktur)</p>
              <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300">{fmt(companyTarget.companyRevenueTarget)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Growth</p>
              <p className="text-sm font-bold text-indigo-600">+{companyTarget.growthPercent || 10}%</p>
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* AI Generate KPI Modal */}
      <Modal isOpen={genModal} onClose={() => setGenModal(false)} title="AI Generate KPI Target" className="max-w-lg">
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
            <p className="text-xs text-blue-700 dark:text-blue-300">AI akan menghitung target per sales berdasarkan data historis 3 bulan, potensi territory, dan growth target yang Anda set.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Target Omset Perusahaan (Hope Target) *</label>
            <Input type="number" value={genForm.revenue} onChange={e => setGenForm({...genForm, revenue: e.target.value})} placeholder="50000000" required />
            <p className="text-[10px] text-slate-400">Total omset yang diharapkan Direktur bulan depan</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Order (opsional)</label>
              <Input type="number" value={genForm.orders} onChange={e => setGenForm({...genForm, orders: e.target.value})} placeholder="Auto" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Visit (opsional)</label>
              <Input type="number" value={genForm.visits} onChange={e => setGenForm({...genForm, visits: e.target.value})} placeholder="Auto" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Growth Expectation (%)</label>
            <Input type="number" value={genForm.growth} onChange={e => setGenForm({...genForm, growth: e.target.value})} placeholder="10" />
            <p className="text-[10px] text-slate-400">Persentase pertumbuhan yang diharapkan dari rata-rata historis</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Mode Distribusi</label>
            <div className="flex gap-2">
              {[{v:'balanced',l:'Balanced (60% perf + 25% potensi + 15% tenure)'},{v:'performance',l:'Performance (100% historis)'},{v:'equal',l:'Equal (rata semua)'}].map(m => (
                <label key={m.v} className={`flex-1 p-2 rounded-lg border-2 cursor-pointer text-center text-xs ${genForm.mode === m.v ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                  <input type="radio" className="sr-only" value={m.v} checked={genForm.mode === m.v} onChange={() => setGenForm({...genForm, mode: m.v})} />
                  {m.v.charAt(0).toUpperCase() + m.v.slice(1)}
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setGenModal(false)}>Batal</Button>
            <Button type="submit" disabled={generating}>{generating ? 'Generating...' : '✨ Generate KPI'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
