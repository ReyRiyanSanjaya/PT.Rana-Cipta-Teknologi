import React, { useEffect, useState } from 'react';
import client from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Route, Plus, Trash2, Loader2, MapPin, Calendar, Users, Clock } from 'lucide-react';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const DAY_LABELS: Record<string, string> = { MONDAY: 'Senin', TUESDAY: 'Selasa', WEDNESDAY: 'Rabu', THURSDAY: 'Kamis', FRIDAY: 'Jumat', SATURDAY: 'Sabtu', SUNDAY: 'Minggu' };

export default function SfaRoutes() {
  const [plans, setPlans] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', salesId: '', dayOfWeek: 'MONDAY', merchants: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pRes, tRes] = await Promise.all([
        client.get('/distributor/sfa/route-plans'),
        client.get('/distributor/team'),
      ]);
      setPlans(pRes.data.data || []);
      setTeam(tRes.data.data?.members || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.merchants) return;
    const merchants = form.merchants.split('\n').filter(m => m.trim()).map((m, i) => ({ merchantName: m.trim(), order: i + 1, estimatedTime: '30 min' }));
    try {
      setSaving(true);
      await client.post('/distributor/sfa/route-plans', { name: form.name, salesId: form.salesId || undefined, dayOfWeek: form.dayOfWeek, merchants });
      setModal(false); setForm({ name: '', salesId: '', dayOfWeek: 'MONDAY', merchants: '' }); fetchData();
    } catch (err: any) { alert(err.response?.data?.message || 'Gagal'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus route plan ini?')) return;
    try { await client.delete(`/distributor/sfa/route-plans/${id}`); fetchData(); } catch (e: any) { alert('Gagal'); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-teal-600" /></div>;

  // Group by day
  const byDay: Record<string, any[]> = {};
  plans.forEach(p => { const d = p.dayOfWeek || 'MONDAY'; if (!byDay[d]) byDay[d] = []; byDay[d].push(p); });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div><h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Route Plan</h1><p className="text-slate-500 dark:text-slate-400">Journey plan mingguan untuk tim sales</p></div>
        <Button onClick={() => setModal(true)}><Plus className="w-4 h-4 mr-2" />Buat Route Plan</Button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-4 flex items-center gap-3"><Route className="w-5 h-5 text-teal-600" /><div><p className="text-xs text-slate-500">Total Route Plans</p><p className="text-xl font-bold">{plans.length}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><MapPin className="w-5 h-5 text-indigo-600" /><div><p className="text-xs text-slate-500">Total Merchants</p><p className="text-xl font-bold">{plans.reduce((s, p) => s + (p.merchants?.length || 0), 0)}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><Users className="w-5 h-5 text-amber-600" /><div><p className="text-xs text-slate-500">Sales Assigned</p><p className="text-xl font-bold">{new Set(plans.map(p => p.salesId).filter(Boolean)).size}</p></div></CardContent></Card>
      </div>

      {/* Plans by Day */}
      {plans.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><Route className="w-12 h-12 mx-auto text-slate-300 mb-3" /><p className="text-slate-500">Belum ada route plan. Buat rencana kunjungan mingguan untuk tim sales.</p></CardContent></Card>
      ) : (
        <div className="space-y-4">
          {DAYS.filter(d => byDay[d]?.length > 0).map(day => (
            <Card key={day}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-teal-600" />
                  {DAY_LABELS[day]}
                  <Badge variant="default" className="text-[10px] ml-2">{byDay[day].length} route</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {byDay[day].map((plan: any) => (
                    <div key={plan.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-slate-900 dark:text-white">{plan.name}</h4>
                          <p className="text-xs text-slate-500">Sales: {plan.salesName || 'Belum ditugaskan'}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(plan.id)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(plan.merchants || []).map((m: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-700 text-xs">
                            <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-[10px] font-bold text-teal-700">{m.order || idx + 1}</span>
                            <span className="text-slate-700 dark:text-slate-300">{m.merchantName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={modal} onClose={() => setModal(false)} title="Buat Route Plan" className="max-w-lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2"><label className="text-sm font-medium">Nama Route</label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Route Medan Utara" required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><label className="text-sm font-medium">Hari</label>
              <select className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" value={form.dayOfWeek} onChange={e => setForm({ ...form, dayOfWeek: e.target.value })}>
                {DAYS.map(d => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
              </select>
            </div>
            <div className="space-y-2"><label className="text-sm font-medium">Sales Rep</label>
              <select className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" value={form.salesId} onChange={e => setForm({ ...form, salesId: e.target.value })}>
                <option value="">Pilih sales</option>
                {team.map(t => <option key={t.id} value={t.id}>{t.name} ({t.subRoleLabel})</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Daftar Merchant (1 per baris, urut kunjungan)</label>
            <textarea className="w-full min-h-[120px] rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" value={form.merchants} onChange={e => setForm({ ...form, merchants: e.target.value })} placeholder={"Toko Maju Jaya\nWarung Berkah\nMinimarket Sinar"} required />
            <p className="text-xs text-slate-400">Urutan = prioritas kunjungan</p>
          </div>
          <div className="flex justify-end gap-3 pt-4"><Button type="button" variant="ghost" onClick={() => setModal(false)}>Batal</Button><Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Buat'}</Button></div>
        </form>
      </Modal>
    </div>
  );
}
