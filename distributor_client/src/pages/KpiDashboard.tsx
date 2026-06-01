import React, { useEffect, useState } from 'react';
import client from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  Target, TrendingUp, Users, Loader2, Trophy, MapPin, ShoppingBag,
  DollarSign, Activity, Flag, BarChart3
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#0d9488', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function KpiDashboard() {
  const [targets, setTargets] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [companyTarget, setCompanyTarget] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tRes, lRes, cRes, aRes] = await Promise.all([
        client.get('/distributor/sfa/targets'),
        client.get('/distributor/sfa/leaderboard'),
        client.get('/distributor/kpi/company-target'),
        client.get('/distributor/sales/analytics?period=30'),
      ]);
      setTargets(tRes.data.data);
      setLeaderboard(lRes.data.data || []);
      setCompanyTarget(cRes.data.data);
      setAnalytics(aRes.data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fmt = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);
  const fmtShort = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}Jt`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}Rb`;
    return v.toString();
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-teal-600" /></div>;

  const teamTargets = targets?.targets || [];
  const summary = targets?.summary || {};
  const visitCorrelation = analytics?.visitCorrelation || {};

  // Chart data: Team performance comparison
  const teamChart = teamTargets.slice(0, 8).map((t: any) => ({
    name: t.userName?.split(' ')[0] || '?',
    revenue: t.achievement?.revenue || 0,
    orders: t.achievement?.orders || 0,
    visits: t.achievement?.visits || 0,
  }));

  // Radar for top 3
  const top3 = leaderboard.slice(0, 3);
  const radarData = top3.length > 0 ? [
    { metric: 'Visits', ...Object.fromEntries(top3.map((t, i) => [`p${i}`, t.completedVisits])) },
    { metric: 'Effective', ...Object.fromEntries(top3.map((t, i) => [`p${i}`, t.effectiveCalls])) },
    { metric: 'ECR%', ...Object.fromEntries(top3.map((t, i) => [`p${i}`, t.ecr])) },
    { metric: 'Score', ...Object.fromEntries(top3.map((t, i) => [`p${i}`, Math.min(t.score, 100)])) },
  ] : [];

  // Revenue vs Target pie
  const companyRevTarget = companyTarget?.companyRevenueTarget || 0;
  const actualRevenue = summary?.revenue || 0;
  const revProgress = companyRevTarget > 0 ? Math.min(Math.round((actualRevenue / companyRevTarget) * 100), 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">KPI Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400">Performa tim sales, target, dan analisis KPI</p>
        </div>
        <Button variant="outline" onClick={fetchData}><Activity className="w-4 h-4 mr-2" />Refresh</Button>
      </div>

      {/* Company Target Progress */}
      {companyRevTarget > 0 && (
        <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border-indigo-200 dark:border-indigo-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2"><Flag className="w-5 h-5 text-indigo-600" /><span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Company Target</span></div>
              <Badge variant={revProgress >= 100 ? 'success' : revProgress >= 70 ? 'default' : 'warning'}>{revProgress}%</Badge>
            </div>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <p className="text-xs text-slate-500">Actual</p>
                <p className="text-xl font-bold text-indigo-700 dark:text-indigo-300">{fmt(actualRevenue)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Target</p>
                <p className="text-xl font-bold text-slate-600 dark:text-slate-400">{fmt(companyRevTarget)}</p>
              </div>
            </div>
            <div className="mt-3 w-full h-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${revProgress >= 100 ? 'bg-emerald-500' : revProgress >= 70 ? 'bg-indigo-500' : 'bg-amber-500'}`} style={{ width: `${revProgress}%` }} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-emerald-500"><CardContent className="p-4"><div className="flex items-center gap-3"><DollarSign className="w-5 h-5 text-emerald-600" /><div><p className="text-xs text-slate-500">Revenue Bulan Ini</p><p className="text-xl font-bold text-emerald-600">{fmt(summary.revenue || 0)}</p></div></div></CardContent></Card>
        <Card className="border-l-4 border-l-indigo-500"><CardContent className="p-4"><div className="flex items-center gap-3"><ShoppingBag className="w-5 h-5 text-indigo-600" /><div><p className="text-xs text-slate-500">Total Orders</p><p className="text-xl font-bold text-indigo-600">{summary.orders || 0}</p></div></div></CardContent></Card>
        <Card className="border-l-4 border-l-teal-500"><CardContent className="p-4"><div className="flex items-center gap-3"><MapPin className="w-5 h-5 text-teal-600" /><div><p className="text-xs text-slate-500">Total Visits</p><p className="text-xl font-bold text-teal-600">{summary.visits || 0}</p></div></div></CardContent></Card>
        <Card className="border-l-4 border-l-amber-500"><CardContent className="p-4"><div className="flex items-center gap-3"><Target className="w-5 h-5 text-amber-600" /><div><p className="text-xs text-slate-500">ECR</p><p className="text-xl font-bold text-amber-600">{visitCorrelation.ecr || 0}%</p></div></div></CardContent></Card>
      </div>

      {/* Team Achievement Chart + Radar */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="w-4 h-4 text-teal-600" />Achievement Tim (%)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teamChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} domain={[0, 150]} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Bar dataKey="revenue" name="Revenue" fill="#0d9488" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="orders" name="Orders" fill="#6366f1" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="visits" name="Visits" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {radarData.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-500" />Top 3 Sales Radar</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="metric" fontSize={11} />
                    <PolarRadiusAxis fontSize={9} />
                    {top3.map((_, i) => (
                      <Radar key={i} name={top3[i].name?.split(' ')[0]} dataKey={`p${i}`} stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.15} />
                    ))}
                    <Tooltip />
                    <Legend formatter={(value) => <span className="text-xs">{value}</span>} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Individual Target Cards */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-indigo-600" />Target per Sales Rep</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-slate-50 dark:bg-slate-800/50">
                <th className="text-left py-3 px-4 font-medium text-slate-500">Sales</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500">Target Revenue</th>
                <th className="text-center py-3 px-4 font-medium text-slate-500">Revenue %</th>
                <th className="text-center py-3 px-4 font-medium text-slate-500">Orders %</th>
                <th className="text-center py-3 px-4 font-medium text-slate-500">Visits %</th>
                <th className="text-center py-3 px-4 font-medium text-slate-500">Status</th>
              </tr></thead>
              <tbody>
                {teamTargets.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-slate-400">Belum ada target. Generate via AI KPI.</td></tr>
                ) : teamTargets.map((t: any, i: number) => {
                  const revPct = t.achievement?.revenue || 0;
                  const ordPct = t.achievement?.orders || 0;
                  const visPct = t.achievement?.visits || 0;
                  const avgPct = Math.round((revPct + ordPct + visPct) / 3);
                  return (
                    <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-xs font-bold text-teal-700">{(t.userName || '?').substring(0, 2).toUpperCase()}</div>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">{t.userName}</p>
                            {t.isAutoGenerated && <span className="text-[9px] text-purple-500 font-medium">AI Generated</span>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-medium">{fmt(t.revenue || 0)}</td>
                      <td className="py-3 px-4 text-center"><ProgressBadge value={revPct} /></td>
                      <td className="py-3 px-4 text-center"><ProgressBadge value={ordPct} /></td>
                      <td className="py-3 px-4 text-center"><ProgressBadge value={visPct} /></td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={avgPct >= 100 ? 'success' : avgPct >= 70 ? 'default' : avgPct >= 40 ? 'warning' : 'destructive'}>
                          {avgPct >= 100 ? 'On Track' : avgPct >= 70 ? 'Good' : avgPct >= 40 ? 'Behind' : 'At Risk'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProgressBadge({ value }: { value: number }) {
  const color = value >= 100 ? 'text-emerald-600 bg-emerald-50' : value >= 70 ? 'text-teal-600 bg-teal-50' : value >= 40 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50';
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>{value}%</span>;
}
