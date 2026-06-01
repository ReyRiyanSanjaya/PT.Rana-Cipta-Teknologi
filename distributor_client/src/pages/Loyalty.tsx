import React, { useEffect, useState } from 'react';
import client from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Award, Crown, Star, Users, Loader2 } from 'lucide-react';

const TIER_CONFIG: Record<string, { color: string; bg: string; icon: any }> = {
  PLATINUM: { color: 'text-purple-700', bg: 'bg-purple-100 dark:bg-purple-900/30', icon: Crown },
  GOLD: { color: 'text-amber-700', bg: 'bg-amber-100 dark:bg-amber-900/30', icon: Award },
  SILVER: { color: 'text-slate-600', bg: 'bg-slate-200 dark:bg-slate-700', icon: Star },
  BRONZE: { color: 'text-orange-700', bg: 'bg-orange-100 dark:bg-orange-900/30', icon: Star },
};

export default function Loyalty() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { client.get('/distributor/loyalty').then(r => setData(r.data.data)).catch(console.error).finally(() => setLoading(false)); }, []);

  const fmt = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-teal-600" /></div>;
  if (!data) return <div className="text-center py-20 text-slate-500">Gagal memuat data</div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Loyalty Program</h1><p className="text-slate-500 dark:text-slate-400">Tier pelanggan berdasarkan total pembelian</p></div>

      {/* Tier Summary */}
      <div className="grid gap-4 sm:grid-cols-4">
        {Object.entries(data.tierCounts || {}).map(([tier, count]) => {
          const cfg = TIER_CONFIG[tier] || TIER_CONFIG.BRONZE;
          const Icon = cfg.icon;
          return (
            <Card key={tier}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${cfg.bg} ${cfg.color}`}><Icon className="w-5 h-5" /></div>
                <div><p className="text-xs text-slate-500">{tier}</p><p className="text-xl font-bold text-slate-900 dark:text-white">{count as number}</p></div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tier Rules */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 text-xs text-slate-500">
            <span>🥉 <strong>Bronze:</strong> &lt; Rp 5jt</span>
            <span>🥈 <strong>Silver:</strong> Rp 5jt - 20jt</span>
            <span>🥇 <strong>Gold:</strong> Rp 20jt - 50jt</span>
            <span>💎 <strong>Platinum:</strong> &gt; Rp 50jt</span>
            <span className="ml-auto">1 poin = Rp 10.000 belanja</span>
          </div>
        </CardContent>
      </Card>

      {/* Customer List */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Users className="w-5 h-5 text-teal-600" />Daftar Pelanggan</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <th className="text-left py-3 px-4 font-medium text-slate-500">Pelanggan</th>
                <th className="text-center py-3 px-4 font-medium text-slate-500">Tier</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500">Poin</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500">Total Belanja</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500">Orders</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500">Last Order</th>
              </tr></thead>
              <tbody>
                {(data.customers || []).map((c: any) => {
                  const cfg = TIER_CONFIG[c.tier] || TIER_CONFIG.BRONZE;
                  return (
                    <tr key={c.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{c.customerName}</td>
                      <td className="py-3 px-4 text-center"><Badge className={`${cfg.bg} ${cfg.color} border-0`}>{c.tier}</Badge></td>
                      <td className="py-3 px-4 text-right font-bold text-indigo-600">{c.points.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-medium text-slate-900 dark:text-white">{fmt(c.totalSpent)}</td>
                      <td className="py-3 px-4 text-right text-slate-600">{c.orderCount}</td>
                      <td className="py-3 px-4 text-xs text-slate-500">{c.lastOrder ? new Date(c.lastOrder).toLocaleDateString('id-ID') : '-'}</td>
                    </tr>
                  );
                })}
                {(!data.customers || data.customers.length === 0) && <tr><td colSpan={6} className="py-12 text-center text-slate-400">Belum ada data pelanggan</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
