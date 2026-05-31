import React, { useEffect, useState } from 'react';
import client from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Network, MapPin, Plus, Trash2, Loader2, Users, Crown, Globe, ChevronRight } from 'lucide-react';

export default function DmsHierarchy() {
  const [hierarchy, setHierarchy] = useState<any>(null);
  const [territories, setTerritories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'hierarchy' | 'territories'>('hierarchy');

  // Hierarchy form
  const [hModal, setHModal] = useState(false);
  const [hForm, setHForm] = useState({ userId: '', position: 'SALES', reportTo: '' });

  // Territory form
  const [tModal, setTModal] = useState(false);
  const [tForm, setTForm] = useState({ name: '', areas: '', assignedTo: '', revenueTarget: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [hRes, tRes] = await Promise.all([
        client.get('/distributor/dms/hierarchy'),
        client.get('/distributor/dms/territories'),
      ]);
      setHierarchy(hRes.data.data);
      setTerritories(tRes.data.data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleAddHierarchy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hForm.userId || !hForm.position) return;
    try {
      setSaving(true);
      await client.post('/distributor/dms/hierarchy', { userId: hForm.userId, position: hForm.position, reportTo: hForm.reportTo || null });
      setHModal(false); fetchAll();
    } catch (err: any) { alert(err.response?.data?.message || 'Gagal'); } finally { setSaving(false); }
  };

  const handleRemoveHierarchy = async (userId: string) => {
    if (!window.confirm('Hapus dari struktur organisasi?')) return;
    try { await client.delete(`/distributor/dms/hierarchy/${userId}`); fetchAll(); }
    catch (e: any) { alert(e.response?.data?.message || 'Gagal'); }
  };

  const handleCreateTerritory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tForm.name || !tForm.areas) return;
    try {
      setSaving(true);
      await client.post('/distributor/dms/territories', { name: tForm.name, areas: tForm.areas.split(',').map(a => a.trim()), assignedTo: tForm.assignedTo || null, revenueTarget: parseInt(tForm.revenueTarget) || 0 });
      setTModal(false); setTForm({ name: '', areas: '', assignedTo: '', revenueTarget: '' }); fetchAll();
    } catch (err: any) { alert(err.response?.data?.message || 'Gagal'); } finally { setSaving(false); }
  };

  const handleDeleteTerritory = async (id: string) => {
    if (!window.confirm('Hapus territory?')) return;
    try { await client.delete(`/distributor/dms/territories/${id}`); fetchAll(); } catch (e: any) { alert('Gagal'); }
  };

  const fmt = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-teal-600" /></div>;

  // Group hierarchy nodes by level
  const nodesByLevel: Record<number, any[]> = {};
  (hierarchy?.nodes || []).forEach((n: any) => { if (!nodesByLevel[n.level]) nodesByLevel[n.level] = []; nodesByLevel[n.level].push(n); });

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">DMS - Organisasi</h1><p className="text-slate-500 dark:text-slate-400">Struktur organisasi dan territory penjualan</p></div>

      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="-mb-px flex space-x-6">
          <button onClick={() => setActiveTab('hierarchy')} className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium ${activeTab === 'hierarchy' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500'}`}><Network className="w-4 h-4" />Struktur Organisasi</button>
          <button onClick={() => setActiveTab('territories')} className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium ${activeTab === 'territories' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500'}`}><Globe className="w-4 h-4" />Territory</button>
        </nav>
      </div>

      {activeTab === 'hierarchy' && hierarchy && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Card className="flex-1 bg-gradient-to-r from-teal-600 to-emerald-600 text-white"><CardContent className="p-4 flex items-center gap-4"><Crown className="w-8 h-8" /><div><h2 className="text-lg font-bold">{hierarchy.companyName}</h2><p className="text-teal-100 text-sm">Owner: {hierarchy.owner?.name}</p></div></CardContent></Card>
            <Button className="ml-4" onClick={() => setHModal(true)}><Plus className="w-4 h-4 mr-2" />Tambah Posisi</Button>
          </div>

          {/* Org Chart by Level */}
          {(hierarchy.positions || []).map((pos: any) => {
            const nodesAtLevel = nodesByLevel[pos.level] || [];
            return (
              <Card key={pos.level} className={`border-l-4 ${pos.level === 1 ? 'border-l-purple-500' : pos.level === 2 ? 'border-l-blue-500' : pos.level === 3 ? 'border-l-indigo-500' : pos.level === 4 ? 'border-l-amber-500' : pos.level === 5 ? 'border-l-orange-500' : 'border-l-teal-500'}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="text-[10px]">L{pos.level}</Badge>
                      <h3 className="font-semibold text-slate-900 dark:text-white">{pos.title}</h3>
                      <span className="text-xs text-slate-400">({pos.code})</span>
                    </div>
                    <span className="text-sm font-bold text-slate-600">{nodesAtLevel.length} orang</span>
                  </div>
                  {nodesAtLevel.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Belum ada yang ditugaskan</p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {nodesAtLevel.map((node: any) => (
                        <div key={node.userId} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-xs font-bold text-teal-700">{(node.userName || 'U').substring(0, 2).toUpperCase()}</div>
                            <div>
                              <p className="text-sm font-medium text-slate-900 dark:text-white">{node.userName}</p>
                              {node.territory && <p className="text-[10px] text-slate-400">📍 {node.territory}</p>}
                              {node.reportTo && <p className="text-[10px] text-slate-400">↑ Lapor ke: {(hierarchy.nodes || []).find((n: any) => n.userId === node.reportTo)?.userName || '-'}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {node.subordinateCount > 0 && <Badge variant="success" className="text-[9px]">{node.subordinateCount} bawahan</Badge>}
                            <Button variant="ghost" size="sm" onClick={() => handleRemoveHierarchy(node.userId)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {activeTab === 'territories' && (
        <div className="space-y-4">
          <div className="flex justify-end"><Button onClick={() => setTModal(true)}><Plus className="w-4 h-4 mr-2" />Tambah Territory</Button></div>
          {territories.length === 0 ? (
            <Card><CardContent className="py-12 text-center"><Globe className="w-12 h-12 mx-auto text-slate-300 mb-3" /><p className="text-slate-500">Belum ada territory</p></CardContent></Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {territories.map((t: any) => (
                <Card key={t.id}>
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div><h3 className="font-semibold text-slate-900 dark:text-white">{t.name}</h3><p className="text-xs text-slate-500">{(t.areas || []).join(', ')}</p></div>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteTerritory(t.id)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-slate-500">Sales Rep:</span><span className="font-medium text-slate-900 dark:text-white">{t.assignedName}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Merchants:</span><span className="font-bold text-teal-600">{t.merchantCount}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Total Credit:</span><span className="font-medium">{fmt(t.totalCredit)}</span></div>
                      {t.revenueTarget > 0 && <div className="flex justify-between"><span className="text-slate-500">Target:</span><span className="font-medium text-indigo-600">{fmt(t.revenueTarget)}</span></div>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add to Hierarchy Modal */}
      <Modal isOpen={hModal} onClose={() => setHModal(false)} title="Tambah ke Struktur Organisasi" className="max-w-md">
        <form onSubmit={handleAddHierarchy} className="space-y-4">
          <div className="space-y-2"><label className="text-sm font-medium">Anggota Tim</label>
            <select className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" value={hForm.userId} onChange={e => setHForm({ ...hForm, userId: e.target.value })} required>
              <option value="">Pilih anggota</option>
              {(hierarchy?.teamMembers || []).map((u: any) => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
            </select>
          </div>
          <div className="space-y-2"><label className="text-sm font-medium">Posisi</label>
            <select className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" value={hForm.position} onChange={e => setHForm({ ...hForm, position: e.target.value })}>
              {(hierarchy?.positions || []).map((p: any) => <option key={p.code} value={p.code}>{p.title} (Level {p.level})</option>)}
            </select>
          </div>
          <div className="space-y-2"><label className="text-sm font-medium">Lapor Kepada (Atasan)</label>
            <select className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" value={hForm.reportTo} onChange={e => setHForm({ ...hForm, reportTo: e.target.value })}>
              <option value="">-- Tidak ada (Top Level) --</option>
              {(hierarchy?.nodes || []).map((n: any) => <option key={n.userId} value={n.userId}>{n.userName} - {(hierarchy?.positions || []).find((p: any) => p.code === n.position)?.title}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4"><Button type="button" variant="ghost" onClick={() => setHModal(false)}>Batal</Button><Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Tambah'}</Button></div>
        </form>
      </Modal>

      {/* Territory Modal */}
      <Modal isOpen={tModal} onClose={() => setTModal(false)} title="Tambah Territory" className="max-w-md">
        <form onSubmit={handleCreateTerritory} className="space-y-4">
          <div className="space-y-2"><label className="text-sm font-medium">Nama Territory</label><Input value={tForm.name} onChange={e => setTForm({ ...tForm, name: e.target.value })} placeholder="Medan Utara" required /></div>
          <div className="space-y-2"><label className="text-sm font-medium">Area (pisahkan koma)</label><Input value={tForm.areas} onChange={e => setTForm({ ...tForm, areas: e.target.value })} placeholder="Medan Baru, Medan Petisah, Medan Sunggal" required /></div>
          <div className="space-y-2"><label className="text-sm font-medium">Assign ke Sales</label>
            <select className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" value={tForm.assignedTo} onChange={e => setTForm({ ...tForm, assignedTo: e.target.value })}>
              <option value="">Belum ditugaskan</option>
              {(hierarchy?.teamMembers || []).map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div className="space-y-2"><label className="text-sm font-medium">Target Revenue (Rp)</label><Input type="number" value={tForm.revenueTarget} onChange={e => setTForm({ ...tForm, revenueTarget: e.target.value })} placeholder="50000000" /></div>
          <div className="flex justify-end gap-3 pt-4"><Button type="button" variant="ghost" onClick={() => setTModal(false)}>Batal</Button><Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Tambah'}</Button></div>
        </form>
      </Modal>
    </div>
  );
}
