import React, { useEffect, useState } from 'react';
import client from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { MapPin, Target, Plus, Loader2, CheckCircle, Clock, Activity, Trophy, ShoppingBag, Users, TrendingUp, XCircle, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

export default function SfaDashboard() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [visits, setVisits] = useState<any[]>([]);
  const [targets, setTargets] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'visits' | 'targets' | 'leaderboard'>('overview');

  const [visitModal, setVisitModal] = useState(false);
  const [visitForm, setVisitForm] = useState({ merchantName: '', date: new Date().toISOString().split('T')[0], objective: 'Regular Visit', notes: '' });
  const [targetModal, setTargetModal] = useState(false);
  const [targetForm, setTargetForm] = useState({ userId: '', revenue: '', orders: '', visits: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => {
    if (activeTab === 'targets') client.get('/distributor/sfa/targets').then(r => setTargets(r.data.data)).catch(console.error);
    if (activeTab === 'leaderboard') client.get('/distributor/sfa/leaderboard').then(r => setLeaderboard(r.data.data || [])).catch(console.error);
  }, [activeTab]);

  const fetchAll = async () => {
    try { setLoading(true);
      const [dRes, vRes] = await Promise.all([client.get('/distributor/sfa/dashboard'), client.get('/distributor/sfa/visits')]);
      setDashboard(dRes.data.data); setVisits(vRes.data.data.visits || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleCreateVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { setSaving(true); await client.post('/distributor/sfa/visits', visitForm); setVisitModal(false); fetchAll(); }
    catch (err: any) { alert(err.response?.data?.message || 'Gagal'); } finally { setSaving(false); }
  };

  const handleCheckIn = async (id: string) => {
    try { await client.put(`/distributor/sfa/visits/${id}/checkin`, { latitude: 0, longitude: 0 }); fetchAll(); }
    catch (e: any) { alert(e.response?.data?.message || 'Gagal'); }
  };

  const handleCheckOut = async (id: string) => {
    const feedback = prompt('Hasil kunjungan:') || '';
    const orderCreated = window.confirm('Ada order dibuat?');
    const orderAmount = orderCreated ? parseInt(prompt('Nilai order (Rp):') || '0') : 0;
    try { await client.put(`/distributor/sfa/visits/${id}/checkout`, { feedback, orderCreated, orderAmount }); fetchAll(); }
    catch (e: any) { alert(e.response?.data?.message || 'Gagal'); }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('Batalkan kunjungan?')) return;
    try { await client.put(`/distributor/sfa/visits/${id}/cancel`, { reason: 'Dibatalkan' }); fetchAll(); }
    catch (e: any) { alert(e.response?.data?.message || 'Gagal'); }
  };

  const handleSetTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    try { setSaving(true); await client.post('/distributor/sfa/targets', { userId: targetForm.userId, revenue: parseInt(targetForm.revenue) || 0, orders: parseInt(targetForm.orders) || 0, visits: parseInt(targetForm.visits) || 0 }); setTargetModal(false); client.get('/distributor/sfa/targets').then(r => setTargets(r.data.data)); }
    catch (err: any) { alert(err.response?.data?.message || 'Gagal'); } finally { setSaving(false); }
  };

  const fmt = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-teal-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div><h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Sales Force</h1><p className="text-slate-500 dark:text-slate-400">Kunjungan, target, dan performa tim sales</p></div>
        <Button onClick={() => setVisitModal(true)}><Plus className="w-4 h-4 mr-2" />Buat Kunjungan</Button>
      </div>

      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="-mb-px flex space-x-4 overflow-x-auto">
          {[{ id: 'overview' as const, label: 'Overview', icon: Activity }, { id: 'visits' as const, label: 'Kunjungan', icon: MapPin }, { id: 'targets' as const, label: 'Target', icon: Target }, { id: 'leaderboard' as const, label: 'Leaderboard', icon: Trophy }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium whitespace-nowrap ${activeTab === tab.id ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500'}`}><tab.icon className="w-4 h-4" />{tab.label}</button>
          ))}
        </nav>
      </div>

      {activeTab === 'overview' && dashboard && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-l-4 border-l-teal-500"><CardContent className="p-4"><p className="text-xs text-slate-500">Kunjungan Hari Ini</p><p className="text-2xl font-bold">{dashboard.today.completed}/{dashboard.today.planned}</p><p className="text-[10px] text-slate-400">Selesai / Rencana</p></CardContent></Card>
            <Card className="border-l-4 border-l-indigo-500"><CardContent className="p-4"><p className="text-xs text-slate-500">Pipeline</p><p className="text-2xl font-bold">{dashboard.pipeline.total}</p><p className="text-[10px] text-slate-400">{dashboard.pipeline.pending}P / {dashboard.pipeline.processing}Proc / {dashboard.pipeline.shipped}Ship</p></CardContent></Card>
            <Card className="border-l-4 border-l-emerald-500"><CardContent className="p-4"><p className="text-xs text-slate-500">Revenue Bulan Ini</p><p className="text-2xl font-bold text-emerald-600">{fmt(dashboard.month.revenue)}</p></CardContent></Card>
            <Card className="border-l-4 border-l-amber-500"><CardContent className="p-4"><p className="text-xs text-slate-500">ECR (Effective Call Rate)</p><p className="text-2xl font-bold">{dashboard.month.ecr}%</p><p className="text-[10px] text-slate-400">{dashboard.month.effectiveCalls}/{dashboard.month.completedVisits} calls</p></CardContent></Card>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <Card><CardContent className="p-4 text-center"><MapPin className="w-5 h-5 mx-auto text-teal-600 mb-1" /><p className="text-lg font-bold">{dashboard.month.completedVisits}</p><p className="text-[10px] text-slate-500">Total Visits</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><Users className="w-5 h-5 mx-auto text-indigo-600 mb-1" /><p className="text-lg font-bold">{dashboard.month.newCustomers}</p><p className="text-[10px] text-slate-500">New Customers</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><ShoppingBag className="w-5 h-5 mx-auto text-amber-600 mb-1" /><p className="text-lg font-bold">{dashboard.month.totalCustomers}</p><p className="text-[10px] text-slate-500">Total Customers</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><TrendingUp className="w-5 h-5 mx-auto text-red-500 mb-1" /><p className="text-lg font-bold">{dashboard.month.lowStock}</p><p className="text-[10px] text-slate-500">Low Stock Alert</p></CardContent></Card>
          </div>

          {/* Visit Activity Chart */}
          <Card>
            <CardHeader><CardTitle className="text-base">Aktivitas Kunjungan (7 Hari Terakhir)</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={(() => {
                    const days = [];
                    for (let i = 6; i >= 0; i--) {
                      const d = new Date(); d.setDate(d.getDate() - i);
                      const dateStr = d.toISOString().split('T')[0];
                      const dayVisits = visits.filter(v => v.date === dateStr);
                      days.push({ day: d.toLocaleDateString('id-ID', { weekday: 'short' }), planned: dayVisits.length, completed: dayVisits.filter((v: any) => v.status === 'COMPLETED').length, effective: dayVisits.filter((v: any) => v.status === 'COMPLETED' && v.orderCreated).length });
                    }
                    return days;
                  })()}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="day" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="planned" fill="#94a3b8" name="Planned" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="completed" fill="#0d9488" name="Completed" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="effective" fill="#6366f1" name="Effective" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'visits' && (
        <Card><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-slate-50 dark:bg-slate-800/50"><th className="text-left py-3 px-4 font-medium text-slate-500">Merchant</th><th className="text-left py-3 px-4 font-medium text-slate-500">Sales</th><th className="text-left py-3 px-4 font-medium text-slate-500">Tanggal</th><th className="text-left py-3 px-4 font-medium text-slate-500">Tujuan</th><th className="text-center py-3 px-4 font-medium text-slate-500">Status</th><th className="text-center py-3 px-4 font-medium text-slate-500">Order</th><th className="text-center py-3 px-4 font-medium text-slate-500">Aksi</th></tr></thead>
          <tbody>{visits.length === 0 ? <tr><td colSpan={7} className="py-12 text-center text-slate-400">Belum ada kunjungan</td></tr> : visits.slice(0, 50).map(v => (
            <tr key={v.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30">
              <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{v.merchantName}</td>
              <td className="py-3 px-4 text-slate-500 text-xs">{v.salesName}</td>
              <td className="py-3 px-4 text-slate-500 text-xs">{v.date}</td>
              <td className="py-3 px-4 text-xs">{v.objective}</td>
              <td className="py-3 px-4 text-center"><Badge variant={v.status === 'COMPLETED' ? 'success' : v.status === 'IN_PROGRESS' ? 'default' : v.status === 'CANCELLED' ? 'destructive' : 'warning'}>{v.status}</Badge></td>
              <td className="py-3 px-4 text-center">{v.orderCreated ? <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" /> : <span className="text-slate-300">-</span>}</td>
              <td className="py-3 px-4 text-center"><div className="flex gap-1 justify-center">
                {v.status === 'PLANNED' && <><Button size="sm" onClick={() => handleCheckIn(v.id)}>Check In</Button><Button size="sm" variant="ghost" onClick={() => handleCancel(v.id)}><XCircle className="w-3.5 h-3.5 text-red-500" /></Button></>}
                {v.status === 'IN_PROGRESS' && <Button size="sm" variant="outline" onClick={() => handleCheckOut(v.id)}>Check Out</Button>}
              </div></td>
            </tr>
          ))}</tbody></table></div></CardContent></Card>
      )}

      {activeTab === 'targets' && targets && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Card className="flex-1"><CardContent className="p-4"><div className="grid grid-cols-3 gap-4 text-center">
              <div><p className="text-lg font-bold text-emerald-600">{fmt(targets.summary?.revenue || 0)}</p><p className="text-[10px] text-slate-500">Revenue</p></div>
              <div><p className="text-lg font-bold text-indigo-600">{targets.summary?.orders || 0}</p><p className="text-[10px] text-slate-500">Orders</p></div>
              <div><p className="text-lg font-bold text-teal-600">{targets.summary?.visits || 0}</p><p className="text-[10px] text-slate-500">Visits</p></div>
            </div></CardContent></Card>
            <Button className="ml-4" onClick={() => setTargetModal(true)}><Plus className="w-4 h-4 mr-2" />Set Target</Button>
          </div>
          {(targets.targets || []).map((t: any) => (
            <Card key={t.userId}><CardContent className="p-4"><div className="flex items-center justify-between mb-3"><p className="font-medium text-slate-900 dark:text-white">{t.userName}</p></div>
              <div className="grid grid-cols-3 gap-3">{[{ label: 'Revenue', val: t.achievement?.revenue }, { label: 'Orders', val: t.achievement?.orders }, { label: 'Visits', val: t.achievement?.visits }].map((m, i) => (
                <div key={i}><div className="flex justify-between text-xs mb-1"><span className="text-slate-500">{m.label}</span><span className="font-bold">{m.val || 0}%</span></div><div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"><div className={`h-full rounded-full ${(m.val || 0) >= 100 ? 'bg-emerald-500' : (m.val || 0) >= 70 ? 'bg-teal-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(m.val || 0, 100)}%` }} /></div></div>
              ))}</div></CardContent></Card>
          ))}
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" />Leaderboard Bulan Ini</CardTitle></CardHeader>
          <CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-slate-50 dark:bg-slate-800/50"><th className="text-center py-3 px-3 font-medium text-slate-500">#</th><th className="text-left py-3 px-4 font-medium text-slate-500">Sales</th><th className="text-right py-3 px-4 font-medium text-slate-500">Visits</th><th className="text-right py-3 px-4 font-medium text-slate-500">Effective</th><th className="text-right py-3 px-4 font-medium text-slate-500">ECR</th><th className="text-right py-3 px-4 font-medium text-slate-500">Order Value</th><th className="text-right py-3 px-4 font-medium text-slate-500">Score</th></tr></thead>
            <tbody>{leaderboard.length === 0 ? <tr><td colSpan={7} className="py-12 text-center text-slate-400">Belum ada data</td></tr> : leaderboard.map((l, i) => (
              <tr key={l.userId} className={`border-b border-slate-100 dark:border-slate-800 ${i < 3 ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}>
                <td className="py-3 px-3 text-center font-bold text-slate-400">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</td>
                <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{l.name}</td>
                <td className="py-3 px-4 text-right">{l.completedVisits}</td>
                <td className="py-3 px-4 text-right text-emerald-600 font-medium">{l.effectiveCalls}</td>
                <td className="py-3 px-4 text-right">{l.ecr}%</td>
                <td className="py-3 px-4 text-right font-medium">{fmt(l.totalOrderValue)}</td>
                <td className="py-3 px-4 text-right font-bold text-indigo-600">{l.score}</td>
              </tr>
            ))}</tbody></table></div></CardContent></Card>
      )}

      {/* Visit Modal */}
      <Modal isOpen={visitModal} onClose={() => setVisitModal(false)} title="Buat Kunjungan" className="max-w-md">
        <form onSubmit={handleCreateVisit} className="space-y-4">
          <div className="space-y-2"><label className="text-sm font-medium">Merchant</label><Input value={visitForm.merchantName} onChange={e => setVisitForm({ ...visitForm, merchantName: e.target.value })} placeholder="Nama toko" required /></div>
          <div className="space-y-2"><label className="text-sm font-medium">Tanggal</label><Input type="date" value={visitForm.date} onChange={e => setVisitForm({ ...visitForm, date: e.target.value })} required /></div>
          <div className="space-y-2"><label className="text-sm font-medium">Tujuan</label><select className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" value={visitForm.objective} onChange={e => setVisitForm({ ...visitForm, objective: e.target.value })}><option>Regular Visit</option><option>New Customer</option><option>Collection</option><option>Complaint</option><option>Product Introduction</option></select></div>
          <div className="space-y-2"><label className="text-sm font-medium">Catatan</label><Input value={visitForm.notes} onChange={e => setVisitForm({ ...visitForm, notes: e.target.value })} placeholder="Opsional" /></div>
          <div className="flex justify-end gap-3 pt-4"><Button type="button" variant="ghost" onClick={() => setVisitModal(false)}>Batal</Button><Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Buat'}</Button></div>
        </form>
      </Modal>

      {/* Target Modal */}
      <Modal isOpen={targetModal} onClose={() => setTargetModal(false)} title="Set Target Sales" className="max-w-md">
        <form onSubmit={handleSetTarget} className="space-y-4">
          <div className="space-y-2"><label className="text-sm font-medium">Sales Rep</label><select className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" value={targetForm.userId} onChange={e => setTargetForm({ ...targetForm, userId: e.target.value })} required><option value="">Pilih</option>{(targets?.teamMembers || []).map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
          <div className="space-y-2"><label className="text-sm font-medium">Target Revenue (Rp)</label><Input type="number" value={targetForm.revenue} onChange={e => setTargetForm({ ...targetForm, revenue: e.target.value })} placeholder="50000000" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><label className="text-sm font-medium">Target Orders</label><Input type="number" value={targetForm.orders} onChange={e => setTargetForm({ ...targetForm, orders: e.target.value })} placeholder="50" /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Target Visits</label><Input type="number" value={targetForm.visits} onChange={e => setTargetForm({ ...targetForm, visits: e.target.value })} placeholder="100" /></div>
          </div>
          <div className="flex justify-end gap-3 pt-4"><Button type="button" variant="ghost" onClick={() => setTargetModal(false)}>Batal</Button><Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button></div>
        </form>
      </Modal>
    </div>
  );
}
