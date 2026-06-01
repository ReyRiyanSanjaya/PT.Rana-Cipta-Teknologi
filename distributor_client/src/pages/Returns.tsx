import React, { useEffect, useState } from 'react';
import client from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { RotateCcw, DollarSign, Clock, CheckCircle, Loader2, Package } from 'lucide-react';

export default function Returns() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);
  const fetchData = async () => { try { setLoading(true); const r = await client.get('/distributor/returns'); setData(r.data.data); } catch (e) { console.error(e); } finally { setLoading(false); } };

  const handleProcess = async (orderId: string, action: string) => {
    if (!window.confirm(`${action === 'refund' ? 'Refund & restock' : 'Restock saja'}?`)) return;
    try { setProcessing(orderId); await client.put(`/distributor/returns/${orderId}/process`, { action }); fetchData(); }
    catch (e: any) { alert(e.response?.data?.message || 'Gagal'); } finally { setProcessing(null); }
  };

  const fmt = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-teal-600" /></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Retur & Klaim</h1><p className="text-slate-500 dark:text-slate-400">Kelola pengembalian barang dan refund</p></div>

      {data?.summary && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card><CardContent className="p-4 text-center"><RotateCcw className="w-5 h-5 mx-auto text-indigo-600 mb-1" /><p className="text-xl font-bold">{data.summary.total}</p><p className="text-[10px] text-slate-500">Total Retur</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><Clock className="w-5 h-5 mx-auto text-amber-600 mb-1" /><p className="text-xl font-bold text-amber-600">{fmt(data.summary.pendingRefund)}</p><p className="text-[10px] text-slate-500">Pending Refund</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><CheckCircle className="w-5 h-5 mx-auto text-emerald-600 mb-1" /><p className="text-xl font-bold text-emerald-600">{fmt(data.summary.totalRefunded)}</p><p className="text-[10px] text-slate-500">Sudah Refund</p></CardContent></Card>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><RotateCcw className="w-5 h-5 text-teal-600" />Daftar Retur</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <th className="text-left py-3 px-4 font-medium text-slate-500">Order</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500">Pelanggan</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500">Items</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500">Nilai</th>
                <th className="text-center py-3 px-4 font-medium text-slate-500">Status</th>
                <th className="text-center py-3 px-4 font-medium text-slate-500">Aksi</th>
              </tr></thead>
              <tbody>
                {(!data?.returns || data.returns.length === 0) ? <tr><td colSpan={6} className="py-12 text-center text-slate-400">Tidak ada retur</td></tr> : data.returns.map((r: any) => (
                  <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-3 px-4 font-mono text-xs">{r.orderNumber}</td>
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{r.customerName}</td>
                    <td className="py-3 px-4 text-slate-500 text-xs">{r.items.map((i: any) => `${i.name} (${i.qty})`).join(', ')}</td>
                    <td className="py-3 px-4 text-right font-bold">{fmt(r.amount)}</td>
                    <td className="py-3 px-4 text-center"><Badge variant={r.status === 'REFUNDED' ? 'success' : 'warning'}>{r.status === 'REFUNDED' ? 'Refunded' : 'Pending'}</Badge></td>
                    <td className="py-3 px-4 text-center">
                      {r.status !== 'REFUNDED' && (
                        <div className="flex gap-1 justify-center">
                          <Button size="sm" onClick={() => handleProcess(r.id, 'refund')} disabled={processing === r.id}>Refund</Button>
                          <Button size="sm" variant="outline" onClick={() => handleProcess(r.id, 'restock')} disabled={processing === r.id}>Restock</Button>
                        </div>
                      )}
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
