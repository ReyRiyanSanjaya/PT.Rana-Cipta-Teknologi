import React, { useEffect, useState } from 'react';
import client from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Trophy, Loader2, TrendingUp, MapPin, ShoppingBag, Target } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

interface LeaderEntry {
  userId: string; name: string; totalVisits: number; completedVisits: number;
  effectiveCalls: number; ecr: number; totalOrderValue: number; score: number;
}

export default function SfaLeaderboard() {
  const [data, setData] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/distributor/sfa/leaderboard')
      .then(r => setData(r.data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fmt = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-teal-600" /></div>;

  // Chart data
  const chartData = data.slice(0, 8).map(d => ({ name: d.name.split(' ')[0], visits: d.completedVisits, effective: d.effectiveCalls, score: d.score }));

  // Radar data for top 3
  const top3 = data.slice(0, 3);
  const radarData = top3.length > 0 ? [
    { metric: 'Visits', ...Object.fromEntries(top3.map((t, i) => [`p${i}`, t.completedVisits])) },
    { metric: 'Effective', ...Object.fromEntries(top3.map((t, i) => [`p${i}`, t.effectiveCalls])) },
    { metric: 'ECR%', ...Object.fromEntries(top3.map((t, i) => [`p${i}`, t.ecr])) },
    { metric: 'Score', ...Object.fromEntries(top3.map((t, i) => [`p${i}`, Math.min(t.score, 100)])) },
  ] : [];

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Leaderboard</h1><p className="text-slate-500 dark:text-slate-400">Ranking performa tim sales bulan ini</p></div>

      {/* Top 3 Podium */}
      {data.length >= 1 && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 0, 2].map(idx => {
            const entry = data[idx];
            if (!entry) return <div key={idx} />;
            const medals = ['🥇', '🥈', '🥉'];
            const colors = ['from-amber-400 to-yellow-500', 'from-slate-300 to-slate-400', 'from-orange-300 to-amber-400'];
            const sizes = ['scale-110', 'scale-100', 'scale-100'];
            return (
              <Card key={idx} className={`${idx === 0 ? 'sm:order-2 ring-2 ring-amber-200 dark:ring-amber-800' : idx === 1 ? 'sm:order-1' : 'sm:order-3'} ${sizes[idx]}`}>
                <CardContent className="p-5 text-center">
                  <div className={`w-16 h-16 mx-auto rounded-full bg-gradient-to-br ${colors[idx]} flex items-center justify-center text-3xl mb-3 shadow-lg`}>{medals[idx]}</div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">{entry.name}</h3>
                  <p className="text-2xl font-black text-indigo-600 mt-1">{entry.score} pts</p>
                  <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                    <div><p className="text-sm font-bold text-teal-600">{entry.completedVisits}</p><p className="text-[9px] text-slate-400">Visits</p></div>
                    <div><p className="text-sm font-bold text-emerald-600">{entry.effectiveCalls}</p><p className="text-[9px] text-slate-400">Effective</p></div>
                    <div><p className="text-sm font-bold text-amber-600">{entry.ecr}%</p><p className="text-[9px] text-slate-400">ECR</p></div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Performance Comparison</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="visits" fill="#0d9488" name="Visits" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="effective" fill="#6366f1" name="Effective Calls" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {radarData.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Top 3 Radar</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="metric" fontSize={11} />
                    <PolarRadiusAxis fontSize={10} />
                    {top3.map((_, i) => (
                      <Radar key={i} name={top3[i].name} dataKey={`p${i}`} stroke={['#0d9488', '#6366f1', '#f59e0b'][i]} fill={['#0d9488', '#6366f1', '#f59e0b'][i]} fillOpacity={0.15} />
                    ))}
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-2">
                {top3.map((t, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: ['#0d9488', '#6366f1', '#f59e0b'][i] }} />
                    <span className="text-slate-600">{t.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Full Table */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" />Ranking Lengkap</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-slate-50 dark:bg-slate-800/50">
                <th className="text-center py-3 px-3 font-medium text-slate-500">#</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500">Sales Rep</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500">Total Visits</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500">Completed</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500">Effective</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500">ECR</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500">Order Value</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500">Score</th>
              </tr></thead>
              <tbody>
                {data.length === 0 ? <tr><td colSpan={8} className="py-12 text-center text-slate-400">Belum ada data. Buat kunjungan di Sales Force.</td></tr> : data.map((l, i) => (
                  <tr key={l.userId} className={`border-b border-slate-100 dark:border-slate-800 ${i < 3 ? 'bg-amber-50/30 dark:bg-amber-900/5' : ''}`}>
                    <td className="py-3 px-3 text-center font-bold">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}</td>
                    <td className="py-3 px-4"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-xs font-bold text-teal-700">{l.name.substring(0, 2).toUpperCase()}</div><span className="font-medium text-slate-900 dark:text-white">{l.name}</span></div></td>
                    <td className="py-3 px-4 text-right text-slate-600">{l.totalVisits}</td>
                    <td className="py-3 px-4 text-right font-medium">{l.completedVisits}</td>
                    <td className="py-3 px-4 text-right text-emerald-600 font-bold">{l.effectiveCalls}</td>
                    <td className="py-3 px-4 text-right"><Badge variant={l.ecr >= 50 ? 'success' : l.ecr >= 30 ? 'warning' : 'destructive'}>{l.ecr}%</Badge></td>
                    <td className="py-3 px-4 text-right font-medium">{fmt(l.totalOrderValue)}</td>
                    <td className="py-3 px-4 text-right font-black text-indigo-600">{l.score}</td>
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
