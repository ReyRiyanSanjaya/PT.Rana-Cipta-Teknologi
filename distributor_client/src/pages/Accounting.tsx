import React, { useEffect, useState } from 'react';
import client from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import {
  BookOpen, Plus, Loader2, DollarSign, TrendingUp, TrendingDown,
  FileText, PieChart, ArrowUpRight, ArrowDownRight, BarChart3
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area } from 'recharts';

export default function Accounting() {
  const [activeTab, setActiveTab] = useState<'overview' | 'journals' | 'accounts'>('overview');
  const [profitLoss, setProfitLoss] = useState<any>(null);
  const [balanceSheet, setBalanceSheet] = useState<any>(null);
  const [cashflow, setCashflow] = useState<any>(null);
  const [journals, setJournals] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Journal form
  const [jModal, setJModal] = useState(false);
  const [jForm, setJForm] = useState({ date: new Date().toISOString().split('T')[0], description: '', entries: [{ accountCode: '', accountName: '', debit: '', credit: '' }, { accountCode: '', accountName: '', debit: '', credit: '' }] });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [plRes, bsRes, cfRes, jRes, aRes] = await Promise.all([
        client.get('/distributor/accounting/profit-loss'),
        client.get('/distributor/accounting/balance-sheet'),
        client.get('/distributor/accounting/cashflow'),
        client.get('/distributor/accounting/journals'),
        client.get('/distributor/accounting/accounts'),
      ]);
      setProfitLoss(plRes.data.data);
      setBalanceSheet(bsRes.data.data);
      setCashflow(cfRes.data.data);
      setJournals(jRes.data.data || []);
      setAccounts(aRes.data.data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleCreateJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await client.post('/distributor/accounting/journals', { date: jForm.date, description: jForm.description, type: 'MANUAL', entries: jForm.entries.filter(en => en.accountCode && (parseFloat(en.debit as string) > 0 || parseFloat(en.credit as string) > 0)) });
      setJModal(false); fetchAll();
    } catch (err: any) { alert(err.response?.data?.message || 'Gagal'); } finally { setSaving(false); }
  };

  const addEntry = () => setJForm({ ...jForm, entries: [...jForm.entries, { accountCode: '', accountName: '', debit: '', credit: '' }] });
  const updateEntry = (idx: number, field: string, value: string) => {
    const entries = [...jForm.entries];
    (entries[idx] as any)[field] = value;
    if (field === 'accountCode') { const acc = accounts.find(a => a.code === value); if (acc) entries[idx].accountName = acc.name; }
    setJForm({ ...jForm, entries });
  };

  const fmt = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-teal-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div><h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Akuntansi</h1><p className="text-slate-500 dark:text-slate-400">Jurnal, laba rugi, neraca, dan arus kas</p></div>
        <Button onClick={() => setJModal(true)}><Plus className="w-4 h-4 mr-2" />Buat Jurnal</Button>
      </div>

      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="-mb-px flex space-x-6">
          {[{ id: 'overview' as const, label: 'Laporan', icon: PieChart }, { id: 'journals' as const, label: 'Jurnal', icon: BookOpen }, { id: 'accounts' as const, label: 'Bagan Akun', icon: FileText }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium ${activeTab === tab.id ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500'}`}><tab.icon className="w-4 h-4" />{tab.label}</button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* P&L Summary */}
          {profitLoss && (
            <div className="grid gap-4 sm:grid-cols-4">
              <Card className="border-l-4 border-l-emerald-500"><CardContent className="p-4"><p className="text-xs text-slate-500">Pendapatan</p><p className="text-xl font-bold text-emerald-600">{fmt(profitLoss.revenue.total)}</p><p className="text-[10px] text-slate-400">{profitLoss.revenue.orderCount} transaksi</p></CardContent></Card>
              <Card className="border-l-4 border-l-red-500"><CardContent className="p-4"><p className="text-xs text-slate-500">Total Beban</p><p className="text-xl font-bold text-red-600">{fmt(profitLoss.expenses.total)}</p></CardContent></Card>
              <Card className="border-l-4 border-l-teal-500"><CardContent className="p-4"><p className="text-xs text-slate-500">Laba Bersih</p><p className={`text-xl font-bold ${profitLoss.netProfit >= 0 ? 'text-teal-600' : 'text-red-600'}`}>{fmt(profitLoss.netProfit)}</p></CardContent></Card>
              <Card className="border-l-4 border-l-indigo-500"><CardContent className="p-4"><p className="text-xs text-slate-500">Margin</p><p className="text-xl font-bold text-indigo-600">{profitLoss.margin}%</p></CardContent></Card>
            </div>
          )}

          {/* Cashflow Chart */}
          {cashflow && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="w-5 h-5 text-teal-600" />Arus Kas (6 Bulan)</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cashflow.months}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : `${(v/1000).toFixed(0)}K`} />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Bar dataKey="cashIn" fill="#0d9488" name="Kas Masuk" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="cashOut" fill="#ef4444" name="Kas Keluar" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4 text-center">
                  <div><p className="text-xs text-slate-500">Total Masuk</p><p className="font-bold text-emerald-600">{fmt(cashflow.summary.totalIn)}</p></div>
                  <div><p className="text-xs text-slate-500">Total Keluar</p><p className="font-bold text-red-600">{fmt(cashflow.summary.totalOut)}</p></div>
                  <div><p className="text-xs text-slate-500">Net Cashflow</p><p className={`font-bold ${cashflow.summary.netCashflow >= 0 ? 'text-teal-600' : 'text-red-600'}`}>{fmt(cashflow.summary.netCashflow)}</p></div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Balance Sheet Summary */}
          {balanceSheet && (
            <Card>
              <CardHeader><CardTitle className="text-base">Neraca (Balance Sheet)</CardTitle></CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-3 gap-6">
                  <div><h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2"><ArrowUpRight className="w-4 h-4 text-emerald-500" />Aset</h4>
                    <div className="space-y-2">{balanceSheet.assets.items.filter((a: any) => a.balance > 0).map((a: any) => (<div key={a.code} className="flex justify-between text-xs"><span className="text-slate-600">{a.name}</span><span className="font-medium">{fmt(a.balance)}</span></div>))}</div>
                    <div className="mt-3 pt-2 border-t flex justify-between text-sm font-bold"><span>Total Aset</span><span className="text-emerald-600">{fmt(balanceSheet.assets.total)}</span></div>
                  </div>
                  <div><h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2"><ArrowDownRight className="w-4 h-4 text-red-500" />Kewajiban</h4>
                    <div className="space-y-2">{balanceSheet.liabilities.items.filter((a: any) => a.balance > 0).map((a: any) => (<div key={a.code} className="flex justify-between text-xs"><span className="text-slate-600">{a.name}</span><span className="font-medium">{fmt(a.balance)}</span></div>))}</div>
                    <div className="mt-3 pt-2 border-t flex justify-between text-sm font-bold"><span>Total Kewajiban</span><span className="text-red-600">{fmt(balanceSheet.liabilities.total)}</span></div>
                  </div>
                  <div><h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2"><DollarSign className="w-4 h-4 text-indigo-500" />Ekuitas</h4>
                    <div className="space-y-2">{balanceSheet.equity.items.filter((a: any) => a.balance > 0).map((a: any) => (<div key={a.code} className="flex justify-between text-xs"><span className="text-slate-600">{a.name}</span><span className="font-medium">{fmt(a.balance)}</span></div>))}</div>
                    <div className="mt-3 pt-2 border-t flex justify-between text-sm font-bold"><span>Total Ekuitas</span><span className="text-indigo-600">{fmt(balanceSheet.equity.total)}</span></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Journals Tab */}
      {activeTab === 'journals' && (
        <Card><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-slate-50 dark:bg-slate-800/50">
          <th className="text-left py-3 px-4 font-medium text-slate-500">Tanggal</th>
          <th className="text-left py-3 px-4 font-medium text-slate-500">Keterangan</th>
          <th className="text-left py-3 px-4 font-medium text-slate-500">Tipe</th>
          <th className="text-right py-3 px-4 font-medium text-slate-500">Debit</th>
          <th className="text-right py-3 px-4 font-medium text-slate-500">Kredit</th>
        </tr></thead><tbody>
          {journals.length === 0 ? <tr><td colSpan={5} className="py-12 text-center text-slate-400">Belum ada jurnal. Klik "Buat Jurnal" untuk memulai.</td></tr> : journals.map(j => (
            <tr key={j.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30">
              <td className="py-3 px-4 text-xs text-slate-500">{new Date(j.date).toLocaleDateString('id-ID')}</td>
              <td className="py-3 px-4"><p className="font-medium text-slate-900 dark:text-white text-xs">{j.description || '-'}</p><div className="mt-1 space-y-0.5">{(j.entries || []).map((e: any, i: number) => (<p key={i} className="text-[10px] text-slate-400">{e.accountCode} {e.accountName}</p>))}</div></td>
              <td className="py-3 px-4"><Badge variant="default" className="text-[10px]">{j.type}</Badge></td>
              <td className="py-3 px-4 text-right font-mono text-xs font-medium text-slate-900 dark:text-white">{fmt(j.totalDebit)}</td>
              <td className="py-3 px-4 text-right font-mono text-xs font-medium text-slate-900 dark:text-white">{fmt(j.totalCredit)}</td>
            </tr>
          ))}
        </tbody></table></div></CardContent></Card>
      )}

      {/* Accounts Tab */}
      {activeTab === 'accounts' && (
        <Card><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-slate-50 dark:bg-slate-800/50">
          <th className="text-left py-3 px-4 font-medium text-slate-500">Kode</th>
          <th className="text-left py-3 px-4 font-medium text-slate-500">Nama Akun</th>
          <th className="text-left py-3 px-4 font-medium text-slate-500">Tipe</th>
          <th className="text-left py-3 px-4 font-medium text-slate-500">Kategori</th>
          <th className="text-right py-3 px-4 font-medium text-slate-500">Saldo</th>
        </tr></thead><tbody>
          {accounts.map((a: any) => (
            <tr key={a.code} className="border-b border-slate-100 dark:border-slate-800">
              <td className="py-3 px-4 font-mono text-xs font-bold text-slate-700 dark:text-slate-300">{a.code}</td>
              <td className="py-3 px-4 font-medium text-slate-900 dark:text-white text-sm">{a.name}</td>
              <td className="py-3 px-4"><Badge variant={a.type === 'ASSET' ? 'success' : a.type === 'LIABILITY' ? 'destructive' : a.type === 'REVENUE' ? 'default' : 'warning'} className="text-[10px]">{a.type}</Badge></td>
              <td className="py-3 px-4 text-xs text-slate-500">{a.category}</td>
              <td className="py-3 px-4 text-right font-mono text-sm font-medium">{fmt(a.balance || 0)}</td>
            </tr>
          ))}
        </tbody></table></div></CardContent></Card>
      )}

      {/* Create Journal Modal */}
      <Modal isOpen={jModal} onClose={() => setJModal(false)} title="Buat Jurnal Umum" className="max-w-3xl">
        <form onSubmit={handleCreateJournal} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><label className="text-sm font-medium">Tanggal</label><Input type="date" value={jForm.date} onChange={e => setJForm({ ...jForm, date: e.target.value })} required /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Keterangan</label><Input value={jForm.description} onChange={e => setJForm({ ...jForm, description: e.target.value })} placeholder="Pembelian barang, dll" /></div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center"><label className="text-sm font-medium">Entri Jurnal</label><Button type="button" variant="outline" size="sm" onClick={addEntry}><Plus className="w-3 h-3 mr-1" />Tambah Baris</Button></div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm"><thead><tr className="bg-slate-50 dark:bg-slate-800"><th className="py-2 px-3 text-left text-xs font-medium text-slate-500">Akun</th><th className="py-2 px-3 text-right text-xs font-medium text-slate-500 w-32">Debit</th><th className="py-2 px-3 text-right text-xs font-medium text-slate-500 w-32">Kredit</th></tr></thead>
                <tbody>{jForm.entries.map((entry, idx) => (
                  <tr key={idx} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-2 px-3"><select className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs" value={entry.accountCode} onChange={e => updateEntry(idx, 'accountCode', e.target.value)}><option value="">Pilih akun</option>{accounts.map((a: any) => <option key={a.code} value={a.code}>{a.code} - {a.name}</option>)}</select></td>
                    <td className="py-2 px-3"><Input type="number" className="text-right text-xs" value={entry.debit} onChange={e => updateEntry(idx, 'debit', e.target.value)} placeholder="0" /></td>
                    <td className="py-2 px-3"><Input type="number" className="text-right text-xs" value={entry.credit} onChange={e => updateEntry(idx, 'credit', e.target.value)} placeholder="0" /></td>
                  </tr>
                ))}</tbody>
              </table>
              <div className="p-2 bg-slate-50 dark:bg-slate-800 flex justify-end gap-6 text-xs font-bold">
                <span>Total Debit: {fmt(jForm.entries.reduce((s, e) => s + (parseFloat(e.debit as string) || 0), 0))}</span>
                <span>Total Kredit: {fmt(jForm.entries.reduce((s, e) => s + (parseFloat(e.credit as string) || 0), 0))}</span>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4"><Button type="button" variant="ghost" onClick={() => setJModal(false)}>Batal</Button><Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Jurnal'}</Button></div>
        </form>
      </Modal>
    </div>
  );
}
