import React, { useEffect, useState } from 'react';
import client from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import {
  Users, Plus, Shield, UserCheck, UserX, Edit2, Trash2, Loader2,
  Crown, ShoppingBag, Warehouse, DollarSign, Eye, Clock, Activity,
  Network, MapPin, Target, TrendingUp, BarChart3
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface TeamMember {
  id: string; name: string; email: string; isActive: boolean; isOwner: boolean;
  subRole: string; subRoleLabel: string; permissions: string[];
  lastLogin: string | null; joinedAt: string;
}
interface SubRoles { [key: string]: { label: string; permissions: string[]; description: string } }

const ROLE_ICONS: Record<string, any> = { OWNER: Crown, SALES: ShoppingBag, WAREHOUSE: Warehouse, FINANCE: DollarSign, VIEWER: Eye };
const ROLE_COLORS: Record<string, string> = {
  OWNER: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  SALES: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  WAREHOUSE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  FINANCE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  VIEWER: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

export default function TeamManagement() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [roles, setRoles] = useState<SubRoles>({});
  const [activity, setActivity] = useState<any[]>([]);
  const [hierarchy, setHierarchy] = useState<any>(null);
  const [targets, setTargets] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'members' | 'performance' | 'positions' | 'activity'>('members');

  const [inviteModal, setInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', password: '', subRole: 'SALES' });
  const [saving, setSaving] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editMember, setEditMember] = useState<TeamMember | null>(null);
  const [editRole, setEditRole] = useState('');

  // Assign position modal
  const [posModal, setPosModal] = useState(false);
  const [posForm, setPosForm] = useState({ userId: '', position: 'SALES', reportTo: '' });

  useEffect(() => { fetchTeam(); }, []);
  useEffect(() => {
    if (activeTab === 'activity') fetchActivity();
    if (activeTab === 'positions') fetchHierarchy();
    if (activeTab === 'performance') fetchTargets();
  }, [activeTab]);

  const fetchTeam = async () => {
    try { setLoading(true); const res = await client.get('/distributor/team'); setMembers(res.data.data.members || []); setRoles(res.data.data.roles || {}); } catch (e) { console.error(e); } finally { setLoading(false); }
  };
  const fetchActivity = async () => { try { const res = await client.get('/distributor/team/activity'); setActivity(res.data.data || []); } catch (e) { console.error(e); } };
  const fetchHierarchy = async () => { try { const res = await client.get('/distributor/dms/hierarchy'); setHierarchy(res.data.data); } catch (e) { console.error(e); } };
  const fetchTargets = async () => { try { const res = await client.get('/distributor/sfa/targets'); setTargets(res.data.data); } catch (e) { console.error(e); } };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try { setSaving(true); await client.post('/distributor/team/invite', inviteForm); setInviteModal(false); setInviteForm({ name: '', email: '', password: '', subRole: 'SALES' }); fetchTeam(); }
    catch (err: any) { alert(err.response?.data?.message || 'Gagal'); } finally { setSaving(false); }
  };
  const handleUpdateRole = async () => { if (!editMember || !editRole) return; try { await client.put(`/distributor/team/${editMember.id}/role`, { subRole: editRole }); setEditModal(false); fetchTeam(); } catch (err: any) { alert(err.response?.data?.message || 'Gagal'); } };
  const handleToggle = async (userId: string) => { try { await client.put(`/distributor/team/${userId}/toggle`); fetchTeam(); } catch (err: any) { alert(err.response?.data?.message || 'Gagal'); } };
  const handleRemove = async (userId: string) => { if (!window.confirm('Hapus anggota ini?')) return; try { await client.delete(`/distributor/team/${userId}`); fetchTeam(); } catch (err: any) { alert(err.response?.data?.message || 'Gagal'); } };
  const handleAssignPosition = async (e: React.FormEvent) => {
    e.preventDefault();
    try { setSaving(true); await client.post('/distributor/dms/hierarchy', posForm); setPosModal(false); fetchHierarchy(); }
    catch (err: any) { alert(err.response?.data?.message || 'Gagal'); } finally { setSaving(false); }
  };

  const fmt = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div><h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Tim & Akses</h1><p className="text-slate-500 dark:text-slate-400">Kelola anggota, posisi, dan performa tim</p></div>
        <Button onClick={() => setInviteModal(true)}><Plus className="w-4 h-4 mr-2" />Undang Anggota</Button>
      </div>

      {/* Role Summary */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
        {Object.entries(roles).map(([key, role]) => {
          const Icon = ROLE_ICONS[key] || Shield;
          const count = members.filter(m => m.subRole === key).length;
          return (<Card key={key}><CardContent className="p-3 text-center"><Icon className={`w-5 h-5 mx-auto mb-1 ${ROLE_COLORS[key]?.split(' ')[1] || 'text-slate-500'}`} /><p className="text-xs font-medium text-slate-700 dark:text-slate-300">{role.label}</p><p className="text-lg font-bold text-slate-900 dark:text-white">{count}</p></CardContent></Card>);
        })}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="-mb-px flex space-x-4 overflow-x-auto">
          {[
            { id: 'members' as const, label: `Anggota (${members.length})`, icon: Users },
            { id: 'performance' as const, label: 'Performa', icon: BarChart3 },
            { id: 'positions' as const, label: 'Posisi', icon: Network },
            { id: 'activity' as const, label: 'Aktivitas', icon: Activity },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium whitespace-nowrap ${activeTab === tab.id ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><tab.icon className="w-4 h-4" />{tab.label}</button>
          ))}
        </nav>
      </div>

      {/* Members Tab */}
      {activeTab === 'members' && (
        <Card><CardContent className="p-0">
          {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-teal-600" /></div> : (
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-slate-50 dark:bg-slate-800/50">
              <th className="text-left py-3 px-4 font-medium text-slate-500">Anggota</th>
              <th className="text-center py-3 px-4 font-medium text-slate-500">Role</th>
              <th className="text-center py-3 px-4 font-medium text-slate-500">Status</th>
              <th className="text-left py-3 px-4 font-medium text-slate-500">Login Terakhir</th>
              <th className="text-left py-3 px-4 font-medium text-slate-500">Hak Akses</th>
              <th className="text-center py-3 px-4 font-medium text-slate-500">Aksi</th>
            </tr></thead><tbody>
              {members.map(m => {
                const Icon = ROLE_ICONS[m.subRole] || Shield;
                return (
                  <tr key={m.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4"><div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${m.isOwner ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700'}`}>{m.name.substring(0, 2).toUpperCase()}</div>
                      <div><p className="font-medium text-slate-900 dark:text-white flex items-center gap-1.5">{m.name} {m.isOwner && <Crown className="w-3.5 h-3.5 text-purple-500" />}</p><p className="text-xs text-slate-400">{m.email}</p></div>
                    </div></td>
                    <td className="py-3 px-4 text-center"><Badge className={`${ROLE_COLORS[m.subRole] || ''} border-0 text-[10px]`}><Icon className="w-3 h-3 mr-1" />{m.subRoleLabel}</Badge></td>
                    <td className="py-3 px-4 text-center"><Badge variant={m.isActive ? 'success' : 'destructive'}>{m.isActive ? 'Aktif' : 'Nonaktif'}</Badge></td>
                    <td className="py-3 px-4 text-xs text-slate-500">{m.lastLogin ? new Date(m.lastLogin).toLocaleString('id-ID') : 'Belum pernah'}</td>
                    <td className="py-3 px-4"><div className="flex flex-wrap gap-1">{m.permissions.slice(0, 3).map(p => <span key={p} className="text-[9px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500">{p === '*' ? 'ALL' : p}</span>)}{m.permissions.length > 3 && <span className="text-[9px] text-slate-400">+{m.permissions.length - 3}</span>}</div></td>
                    <td className="py-3 px-4 text-center">{!m.isOwner && (<div className="flex gap-1 justify-center">
                      <Button variant="ghost" size="sm" onClick={() => { setEditMember(m); setEditRole(m.subRole); setEditModal(true); }} title="Edit Role"><Edit2 className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleToggle(m.id)} title={m.isActive ? 'Nonaktifkan' : 'Aktifkan'}>{m.isActive ? <UserX className="w-3.5 h-3.5 text-amber-500" /> : <UserCheck className="w-3.5 h-3.5 text-emerald-500" />}</Button>
                      <Button variant="ghost" size="sm" onClick={() => handleRemove(m.id)} title="Hapus"><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                    </div>)}</td>
                  </tr>
                );
              })}
            </tbody></table></div>
          )}
        </CardContent></Card>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          {targets?.summary && (
            <div className="grid gap-4 sm:grid-cols-4">
              <Card><CardContent className="p-4 text-center"><DollarSign className="w-5 h-5 mx-auto text-emerald-600 mb-1" /><p className="text-lg font-bold text-emerald-600">{fmt(targets.summary.revenue)}</p><p className="text-[10px] text-slate-500">Revenue Tim</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><ShoppingBag className="w-5 h-5 mx-auto text-indigo-600 mb-1" /><p className="text-lg font-bold">{targets.summary.orders}</p><p className="text-[10px] text-slate-500">Orders</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><MapPin className="w-5 h-5 mx-auto text-teal-600 mb-1" /><p className="text-lg font-bold">{targets.summary.visits}</p><p className="text-[10px] text-slate-500">Visits</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><Users className="w-5 h-5 mx-auto text-amber-600 mb-1" /><p className="text-lg font-bold">{targets.summary.customers}</p><p className="text-[10px] text-slate-500">Customers</p></CardContent></Card>
            </div>
          )}

          {/* Performance Chart */}
          {targets?.targets && targets.targets.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Achievement per Anggota</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={targets.targets.map((t: any) => ({ name: t.userName?.split(' ')[0] || '?', revenue: t.achievement?.revenue || 0, orders: t.achievement?.orders || 0, visits: t.achievement?.visits || 0 }))}>
                      <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis fontSize={11} tickLine={false} axisLine={false} unit="%" />
                      <Tooltip formatter={(v: number) => `${v}%`} />
                      <Bar dataKey="revenue" fill="#0d9488" name="Revenue %" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="orders" fill="#6366f1" name="Orders %" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="visits" fill="#f59e0b" name="Visits %" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Individual Targets */}
          {targets?.targets && targets.targets.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {targets.targets.map((t: any) => (
                <Card key={t.userId}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-xs font-bold text-teal-700">{(t.userName || 'U').substring(0, 2).toUpperCase()}</div>
                      <div><p className="font-medium text-slate-900 dark:text-white text-sm">{t.userName}</p><p className="text-[10px] text-slate-400">{targets.summary?.month}</p></div>
                    </div>
                    <div className="space-y-2">
                      {[{ label: 'Revenue', target: fmt(t.revenue), pct: t.achievement?.revenue || 0 }, { label: 'Orders', target: t.orders, pct: t.achievement?.orders || 0 }, { label: 'Visits', target: t.visits, pct: t.achievement?.visits || 0 }].map((m, i) => (
                        <div key={i}>
                          <div className="flex justify-between text-xs mb-0.5"><span className="text-slate-500">{m.label} (target: {m.target})</span><span className={`font-bold ${m.pct >= 100 ? 'text-emerald-600' : m.pct >= 70 ? 'text-teal-600' : 'text-amber-600'}`}>{m.pct}%</span></div>
                          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"><div className={`h-full rounded-full ${m.pct >= 100 ? 'bg-emerald-500' : m.pct >= 70 ? 'bg-teal-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(m.pct, 100)}%` }} /></div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card><CardContent className="py-12 text-center text-slate-400"><Target className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>Belum ada target. Set target di menu Sales Force.</p></CardContent></Card>
          )}
        </div>
      )}

      {/* Positions Tab - Org Chart */}
      {activeTab === 'positions' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Struktur Organisasi</h2>
            <Button onClick={() => setPosModal(true)}><Plus className="w-4 h-4 mr-2" />Assign Posisi</Button>
          </div>

          {hierarchy ? (
            <>
              {/* Owner / Top */}
              <div className="flex flex-col items-center">
                <div className="p-4 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-2xl shadow-lg text-center min-w-[200px]">
                  <Crown className="w-6 h-6 mx-auto mb-1" />
                  <p className="font-bold">{hierarchy.owner?.name}</p>
                  <p className="text-purple-200 text-xs">{hierarchy.companyName}</p>
                  <Badge className="mt-2 bg-white/20 text-white border-0 text-[10px]">OWNER</Badge>
                </div>
                {(hierarchy.nodes || []).filter((n: any) => !n.reportTo).length > 0 && (
                  <div className="w-px h-8 bg-slate-300 dark:bg-slate-600" />
                )}
              </div>

              {/* Org Tree - Render by levels */}
              {(() => {
                const nodes = hierarchy.nodes || [];
                const topNodes = nodes.filter((n: any) => !n.reportTo);
                
                const renderNode = (node: any, depth: number) => {
                  const children = nodes.filter((n: any) => n.reportTo === node.userId);
                  const levelColors = ['bg-indigo-500', 'bg-blue-500', 'bg-teal-500', 'bg-emerald-500', 'bg-amber-500', 'bg-slate-500'];
                  const bgColor = levelColors[Math.min(depth, levelColors.length - 1)];
                  const posTitle = (hierarchy.positions || []).find((p: any) => p.code === node.position)?.title || node.position;

                  return (
                    <div key={node.userId} className="flex flex-col items-center">
                      <div className={`relative p-3 rounded-xl shadow-md text-center min-w-[160px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900`}>
                        <div className={`w-10 h-10 mx-auto rounded-full ${bgColor} text-white flex items-center justify-center text-sm font-bold mb-2`}>
                          {(node.userName || 'U').substring(0, 2).toUpperCase()}
                        </div>
                        <p className="font-semibold text-sm text-slate-900 dark:text-white">{node.userName}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{posTitle}</p>
                        {node.territory && <p className="text-[10px] text-teal-600 mt-0.5">📍 {node.territory}</p>}
                        {children.length > 0 && (
                          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[9px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full text-slate-500 border border-slate-200 dark:border-slate-700">{children.length} bawahan</span>
                        )}
                      </div>
                      {children.length > 0 && (
                        <>
                          <div className="w-px h-6 bg-slate-300 dark:bg-slate-600" />
                          <div className="flex gap-4 flex-wrap justify-center">
                            {children.map((child: any) => renderNode(child, depth + 1))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                };

                return topNodes.length > 0 ? (
                  <div className="flex gap-6 flex-wrap justify-center">
                    {topNodes.map((node: any) => renderNode(node, 0))}
                  </div>
                ) : null;
              })()}

              {/* Level Legend */}
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">Level Jabatan</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {(hierarchy.positions || []).map((pos: any) => {
                      const count = (hierarchy.nodes || []).filter((n: any) => n.position === pos.code).length;
                      return (
                        <div key={pos.code} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                          <Badge variant="default" className="text-[9px] w-6 h-6 flex items-center justify-center p-0">{pos.level}</Badge>
                          <div>
                            <p className="text-[10px] font-medium text-slate-700 dark:text-slate-300">{pos.title}</p>
                            <p className="text-[9px] text-slate-400">{count} orang</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Empty state */}
              {(hierarchy.nodes || []).length === 0 && (
                <Card><CardContent className="py-12 text-center">
                  <Network className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500 mb-2">Belum ada struktur organisasi</p>
                  <p className="text-xs text-slate-400 mb-4">Klik "Assign Posisi" untuk menambahkan anggota ke struktur</p>
                  <Button variant="outline" onClick={() => setPosModal(true)}><Plus className="w-4 h-4 mr-2" />Mulai Buat Struktur</Button>
                </CardContent></Card>
              )}
            </>
          ) : <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-teal-600" /></div>}
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="w-5 h-5 text-teal-600" />Login Terbaru</CardTitle></CardHeader>
          <CardContent><div className="space-y-3 max-h-[500px] overflow-y-auto">
            {activity.length === 0 ? <p className="text-center text-slate-400 py-8">Belum ada aktivitas</p> : activity.map((a, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-xs font-bold text-teal-700">{(a.user?.name || 'U').substring(0, 2).toUpperCase()}</div>
                <div className="flex-1"><p className="text-sm font-medium text-slate-900 dark:text-white">{a.user?.name || 'Unknown'}</p><p className="text-xs text-slate-400">{a.user?.email}</p></div>
                <div className="text-right"><p className="text-xs text-slate-500">{new Date(a.loginAt).toLocaleString('id-ID')}</p><p className="text-[10px] text-slate-400">{a.ip || '-'}</p></div>
              </div>
            ))}
          </div></CardContent>
        </Card>
      )}

      {/* Invite Modal */}
      <Modal isOpen={inviteModal} onClose={() => setInviteModal(false)} title="Undang Anggota Tim" className="max-w-md">
        <form onSubmit={handleInvite} className="space-y-4">
          <div className="space-y-2"><label className="text-sm font-medium">Nama Lengkap</label><Input value={inviteForm.name} onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })} placeholder="Nama lengkap" required /></div>
          <div className="space-y-2"><label className="text-sm font-medium">Email</label><Input type="email" value={inviteForm.email} onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })} placeholder="email@company.com" required /></div>
          <div className="space-y-2"><label className="text-sm font-medium">Password Awal</label><Input type="password" value={inviteForm.password} onChange={e => setInviteForm({ ...inviteForm, password: e.target.value })} placeholder="Min 8 karakter" required /></div>
          <div className="space-y-2"><label className="text-sm font-medium">Role / Departemen</label>
            <select className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" value={inviteForm.subRole} onChange={e => setInviteForm({ ...inviteForm, subRole: e.target.value })}>
              {Object.entries(roles).filter(([k]) => k !== 'OWNER').map(([key, role]) => (<option key={key} value={key}>{role.label} — {role.description}</option>))}
            </select>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs text-slate-500">
            <p className="font-medium mb-1">Hak akses yang diberikan:</p>
            <div className="flex flex-wrap gap-1">{(roles[inviteForm.subRole]?.permissions || []).map(p => <span key={p} className="px-1.5 py-0.5 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 rounded text-[10px]">{p === '*' ? 'SEMUA' : p}</span>)}</div>
          </div>
          <div className="flex justify-end gap-3 pt-4"><Button type="button" variant="ghost" onClick={() => setInviteModal(false)}>Batal</Button><Button type="submit" disabled={saving}>{saving ? 'Mengundang...' : 'Undang'}</Button></div>
        </form>
      </Modal>

      {/* Edit Role Modal */}
      <Modal isOpen={editModal} onClose={() => setEditModal(false)} title={`Ubah Role: ${editMember?.name}`} className="max-w-sm">
        <div className="space-y-4">
          <select className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" value={editRole} onChange={e => setEditRole(e.target.value)}>
            {Object.entries(roles).filter(([k]) => k !== 'OWNER').map(([key, role]) => (<option key={key} value={key}>{role.label}</option>))}
          </select>
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs text-slate-500">
            <p className="font-medium mb-1">Akses:</p>
            <div className="flex flex-wrap gap-1">{(roles[editRole]?.permissions || []).map(p => <span key={p} className="px-1.5 py-0.5 bg-teal-100 dark:bg-teal-900/30 text-teal-700 rounded text-[10px]">{p === '*' ? 'SEMUA' : p}</span>)}</div>
          </div>
          <div className="flex justify-end gap-3"><Button variant="ghost" onClick={() => setEditModal(false)}>Batal</Button><Button onClick={handleUpdateRole}>Simpan</Button></div>
        </div>
      </Modal>

      {/* Assign Position Modal */}
      <Modal isOpen={posModal} onClose={() => setPosModal(false)} title="Assign Posisi Organisasi" className="max-w-md">
        <form onSubmit={handleAssignPosition} className="space-y-4">
          <div className="space-y-2"><label className="text-sm font-medium">Anggota Tim</label>
            <select className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" value={posForm.userId} onChange={e => setPosForm({ ...posForm, userId: e.target.value })} required>
              <option value="">Pilih anggota</option>
              {members.filter(m => m.isActive).map(m => <option key={m.id} value={m.id}>{m.name} ({m.subRoleLabel})</option>)}
            </select>
          </div>
          <div className="space-y-2"><label className="text-sm font-medium">Posisi</label>
            <select className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" value={posForm.position} onChange={e => setPosForm({ ...posForm, position: e.target.value })}>
              {(hierarchy?.positions || [{ code: 'DIRECTOR', title: 'Direktur' }, { code: 'NSM', title: 'NSM' }, { code: 'RSM', title: 'RSM' }, { code: 'ASM', title: 'ASM' }, { code: 'SPV', title: 'Supervisor' }, { code: 'SALES', title: 'Sales Rep' }]).map((p: any) => <option key={p.code} value={p.code}>{p.title}</option>)}
            </select>
          </div>
          <div className="space-y-2"><label className="text-sm font-medium">Atasan Langsung</label>
            <select className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" value={posForm.reportTo} onChange={e => setPosForm({ ...posForm, reportTo: e.target.value })}>
              <option value="">— Top Level (tanpa atasan) —</option>
              {(hierarchy?.nodes || []).map((n: any) => <option key={n.userId} value={n.userId}>{n.userName} ({n.position})</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4"><Button type="button" variant="ghost" onClick={() => setPosModal(false)}>Batal</Button><Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Assign'}</Button></div>
        </form>
      </Modal>
    </div>
  );
}
