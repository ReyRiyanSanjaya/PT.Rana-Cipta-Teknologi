import React, { useEffect, useState } from 'react';
import client from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { DollarSign, AlertTriangle, CheckCircle, Clock, Loader2, RefreshCw, CreditCard } from 'lucide-react';

interface Receivable {
  id: string; orderNumber: string; customerName: string; contactName: string;
  amount: number; paymentStatus: string; orderDate: string; daysSinceOrder: number;
  paymentTerm: number; isOverdue: boolean; daysOverdue: number; creditLimit: number; creditUsed: number;
}

export default function Receivables() {
  const [data, setData] = useState<Receivable[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [payModal, setPayModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Receivable | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [paying, setPaying] = useState(false);

  useEffect(() => { fetchData(); }, [filter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await client.get('/distributor/receivables', { params: { status: filter || undefined } });
      setData(res.data.data.receivables || []);
      setSummary(res.data.data.summary || null);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handlePay = async () => {
    if (!selectedOrder) return;
    try {
      setPaying(true);
      await client.put(`/distributor/receivables/${selectedOrder.id}/pay`, { amount: parseFloat(payAmount) || selectedOrder.amount, paymentMethod: 'TRANSFER' });
      setPayModal(false);
      fetchData();
    } catch (e: any) { alert(e.response?.data?.message || 'Gagal'); } finally { setPaying(false); }
  };

  const fmt = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Piutang</h1>
          <p className="text-slate-500 dark:text-slate-400">Kelola tagihan dan pembayaran merchant</p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading}><RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>
      </div>

      {summary && (
        <div className="grid gap-4 sm:grid-cols-4">
          <Card><CardContent className="p-4 text-center"><DollarSign className="w-5 h-5 mx-auto text-indigo-600 mb-1" /><p className="text-xl font-bold text-slate-900 dark:text-white">{fmt(summary.totalReceivable)}</p><p className="text-[10px] text-slate-500">Total Piutang</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><AlertTriangle className="w-5 h-5 mx-auto text-red-600 mb-1" /><p className="text-xl font-bold text-red-600">{fmt(summary.overdueAmount)}</p><p className="text-[10px] text-slate-500">Jatuh Tempo</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><Clock className="w-5 h-5 mx-auto text-amber-600 mb-1" /><p className="text-xl font-bold text-amber-600">{summary.overdueCount}</p><p className="text-[10px] text-slate-500">Invoice Overdue</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><CreditCard className="w-5 h-5 mx-auto text-teal-600 mb-1" /><p className="text-xl font-bold text-slate-900 dark:text-white">{summary.totalInvoices}</p><p className="text-[10px] text-slate-500">Total Invoice</p></CardContent></Card>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex gap-3 items-center">
            <select className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900" value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="">Belum Lunas</option>
              <option value="overdue">Jatuh Tempo</option>
              <option value="paid">Sudah Lunas</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-teal-600" /></div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-left py-3 px-4 font-medium text-slate-500">Invoice</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500">Pelanggan</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-500">Jumlah</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-500">Umur</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-500">Status</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-500">Aksi</th>
                </tr></thead>
                <tbody>
                  {data.length === 0 ? <tr><td colSpan={6} className="py-12 text-center text-slate-400">Tidak ada piutang</td></tr> : data.map(r => (
                    <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-mono text-xs font-medium">{r.orderNumber}</td>
                      <td className="py-3 px-4"><p className="font-medium text-slate-900 dark:text-white">{r.customerName}</p><p className="text-xs text-slate-400">{r.contactName}</p></td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">{fmt(r.amount)}</td>
                      <td className="py-3 px-4 text-center"><span className={`text-xs font-medium ${r.isOverdue ? 'text-red-600' : 'text-slate-500'}`}>{r.daysSinceOrder} hari</span></td>
                      <td className="py-3 px-4 text-center">
                        {r.isOverdue ? <Badge variant="destructive">Overdue {r.daysOverdue}d</Badge> : <Badge variant="warning">Pending</Badge>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Button size="sm" onClick={() => { setSelectedOrder(r); setPayAmount(r.amount.toString()); setPayModal(true); }}>
                          <CheckCircle className="w-3.5 h-3.5 mr-1" />Bayar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={payModal} onClose={() => setPayModal(false)} title="Konfirmasi Pembayaran" className="max-w-sm">
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"><p className="text-xs text-slate-500">Invoice</p><p className="font-bold">{selectedOrder?.orderNumber}</p><p className="text-sm text-slate-600">{selectedOrder?.customerName}</p></div>
          <div className="space-y-2"><label className="text-sm font-medium">Jumlah Dibayar</label><Input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} /></div>
          <div className="flex justify-end gap-3"><Button variant="ghost" onClick={() => setPayModal(false)}>Batal</Button><Button onClick={handlePay} disabled={paying}>{paying ? 'Memproses...' : 'Konfirmasi'}</Button></div>
        </div>
      </Modal>
    </div>
  );
}
