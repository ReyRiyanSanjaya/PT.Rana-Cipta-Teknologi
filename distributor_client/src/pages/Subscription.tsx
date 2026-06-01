import React, { useEffect, useState } from 'react';
import client from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  Crown,
  Zap,
  Shield,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Package,
  ShoppingBag,
  Users,
  Warehouse,
  BarChart3,
  CreditCard,
  Calendar,
  Loader2,
  ArrowUpRight,
  HardDrive,
  Activity
} from 'lucide-react';

interface PlanInfo {
  plan: {
    tier: string;
    name: string;
    price: number;
    features: string[];
    limits: {
      maxProducts: number;
      maxOrders: number;
      maxCustomers: number;
      maxWarehouses: number;
    };
  };
  usage: {
    products: number;
    ordersThisMonth: number;
    customers: number;
    warehouses: number;
  };
  subscription: {
    status: string;
    startDate: string;
    endDate: string | null;
    daysRemaining: number | null;
  };
  distributor: {
    id: string;
    companyName: string;
    approvalStatus: string;
    balance: number;
  };
}

interface BillingData {
  history: {
    month: string;
    monthKey: string;
    totalOrders: number;
    paidOrders: number;
    revenue: number;
    platformFee: number;
    netRevenue: number;
  }[];
  allTime: {
    totalRevenue: number;
    totalOrders: number;
    totalPlatformFees: number;
  };
}

interface UsageData {
  thisMonth: {
    orders: number;
    revenue: number;
    newCustomers: number;
    apiCalls: number;
    storageUsedMB: number;
  };
  lastMonth: {
    orders: number;
    revenue: number;
  };
  growth: {
    orders: number;
    revenue: number;
  };
  limits: {
    storageMaxMB: number;
    apiCallsMax: number;
  };
}

export default function Subscription() {
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'billing' | 'usage'>('overview');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [planRes, billingRes, usageRes] = await Promise.all([
        client.get('/distributor/subscription/plan'),
        client.get('/distributor/subscription/billing'),
        client.get('/distributor/subscription/usage'),
      ]);
      setPlanInfo(planRes.data.data);
      setBilling(billingRes.data.data);
      setUsage(usageRes.data.data);
    } catch (error) {
      console.error('Failed to fetch subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);

  const getUsagePercent = (current: number, max: number) => {
    if (max === -1) return 0; // unlimited
    return Math.min(Math.round((current / max) * 100), 100);
  };

  const getUsageColor = (percent: number) => {
    if (percent >= 90) return 'bg-red-500';
    if (percent >= 70) return 'bg-amber-500';
    return 'bg-teal-500';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Subscription</h1>
          <p className="text-slate-500 dark:text-slate-400">Kelola paket langganan dan penggunaan platform</p>
        </div>
        <Badge variant="success" className="text-sm px-3 py-1.5 flex items-center gap-1.5">
          <Crown className="w-4 h-4" />
          {planInfo?.plan.name || 'Enterprise'}
        </Badge>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="-mb-px flex space-x-6">
          {[
            { id: 'overview' as const, label: 'Overview', icon: Shield },
            { id: 'billing' as const, label: 'Billing', icon: CreditCard },
            { id: 'usage' as const, label: 'Usage', icon: Activity },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && planInfo && (
        <div className="space-y-6">
          {/* Plan Card */}
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-teal-600 to-emerald-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-6 h-6" />
                    <h2 className="text-2xl font-bold">{planInfo.plan.name} Plan</h2>
                  </div>
                  <p className="text-teal-100 text-sm">
                    {planInfo.distributor.companyName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black">
                    {planInfo.plan.price > 0 ? formatCurrency(planInfo.plan.price) : 'Custom'}
                  </p>
                  <p className="text-teal-100 text-sm">/bulan</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-4 text-sm text-teal-100">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <span>Aktif sejak {new Date(planInfo.subscription.startDate).toLocaleDateString('id-ID')}</span>
                </div>
                {planInfo.subscription.daysRemaining !== null && (
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-4 h-4" />
                    <span>{planInfo.subscription.daysRemaining} hari tersisa</span>
                  </div>
                )}
              </div>
            </div>
            <CardContent className="p-6">
              <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300 mb-3">Fitur yang termasuk:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {planInfo.plan.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <CheckCircle className="w-4 h-4 text-teal-500 flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Usage Meters */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Produk', icon: Package, current: planInfo.usage.products, max: planInfo.plan.limits.maxProducts },
              { label: 'Pesanan/Bulan', icon: ShoppingBag, current: planInfo.usage.ordersThisMonth, max: planInfo.plan.limits.maxOrders },
              { label: 'Pelanggan', icon: Users, current: planInfo.usage.customers, max: planInfo.plan.limits.maxCustomers },
              { label: 'Gudang', icon: Warehouse, current: planInfo.usage.warehouses, max: planInfo.plan.limits.maxWarehouses },
            ].map((item) => {
              const percent = getUsagePercent(item.current, item.max);
              const isUnlimited = item.max === -1;
              return (
                <Card key={item.label}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <item.icon className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{item.label}</span>
                      </div>
                      {isUnlimited ? (
                        <Badge variant="success" className="text-[10px]">Unlimited</Badge>
                      ) : (
                        <span className="text-xs text-slate-400">{percent}%</span>
                      )}
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                      {item.current}
                      {!isUnlimited && <span className="text-sm font-normal text-slate-400"> / {item.max}</span>}
                    </p>
                    {!isUnlimited && (
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${getUsageColor(percent)}`} style={{ width: `${percent}%` }} />
                      </div>
                    )}
                    {isUnlimited && (
                      <div className="w-full h-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-400 w-full opacity-30" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Balance Card */}
          <Card>
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Saldo Akun Distributor</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(planInfo.distributor.balance)}</p>
                </div>
              </div>
              <Badge variant={planInfo.subscription.status === 'ACTIVE' ? 'success' : 'warning'}>
                {planInfo.subscription.status === 'ACTIVE' ? 'Aktif' : 'Pending'}
              </Badge>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Billing Tab */}
      {activeTab === 'billing' && billing && (
        <div className="space-y-6">
          {/* All-time Summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Revenue (All Time)</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{formatCurrency(billing.allTime.totalRevenue)}</p>
                <p className="text-xs text-slate-400 mt-1">{billing.allTime.totalOrders} orders terbayar</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Platform Fee (2%)</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{formatCurrency(billing.allTime.totalPlatformFees)}</p>
                <p className="text-xs text-slate-400 mt-1">Biaya layanan platform</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Net Revenue</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(billing.allTime.totalRevenue - billing.allTime.totalPlatformFees)}</p>
                <p className="text-xs text-slate-400 mt-1">Pendapatan bersih</p>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="w-5 h-5 text-teal-600" />
                Riwayat Billing Bulanan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Bulan</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Orders</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Revenue</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Platform Fee</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Net Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billing.history.map((row) => (
                      <tr key={row.monthKey} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{row.month}</td>
                        <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-300">
                          {row.totalOrders}
                          <span className="text-slate-400 text-xs ml-1">({row.paidOrders} paid)</span>
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-900 dark:text-white">{formatCurrency(row.revenue)}</td>
                        <td className="py-3 px-4 text-right text-amber-600">{formatCurrency(row.platformFee)}</td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600">{formatCurrency(row.netRevenue)}</td>
                      </tr>
                    ))}
                    {billing.history.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">Belum ada data billing</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Usage Tab */}
      {activeTab === 'usage' && usage && (
        <div className="space-y-6">
          {/* Growth Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">Orders Bulan Ini</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{usage.thisMonth.orders}</p>
                <div className="flex items-center gap-1 mt-1">
                  {usage.growth.orders >= 0 ? (
                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-500" />
                  )}
                  <span className={`text-xs font-medium ${usage.growth.orders >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {usage.growth.orders >= 0 ? '+' : ''}{usage.growth.orders}%
                  </span>
                  <span className="text-xs text-slate-400">vs bulan lalu</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">Revenue Bulan Ini</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{formatCurrency(usage.thisMonth.revenue)}</p>
                <div className="flex items-center gap-1 mt-1">
                  {usage.growth.revenue >= 0 ? (
                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-500" />
                  )}
                  <span className={`text-xs font-medium ${usage.growth.revenue >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {usage.growth.revenue >= 0 ? '+' : ''}{usage.growth.revenue}%
                  </span>
                  <span className="text-xs text-slate-400">vs bulan lalu</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">Pelanggan Baru</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{usage.thisMonth.newCustomers}</p>
                <p className="text-xs text-slate-400 mt-1">Bulan ini</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">API Calls</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{usage.thisMonth.apiCalls.toLocaleString()}</p>
                <p className="text-xs text-slate-400 mt-1">/ {usage.limits.apiCallsMax.toLocaleString()} limit</p>
              </CardContent>
            </Card>
          </div>

          {/* Resource Usage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <HardDrive className="w-5 h-5 text-teal-600" />
                Resource Usage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Storage */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Storage</span>
                  <span className="text-sm text-slate-500">
                    {usage.thisMonth.storageUsedMB} MB / {(usage.limits.storageMaxMB / 1000).toFixed(0)} GB
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-teal-500"
                    style={{ width: `${Math.min((usage.thisMonth.storageUsedMB / usage.limits.storageMaxMB) * 100, 100)}%` }}
                  />
                </div>
              </div>

              {/* API Calls */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">API Calls</span>
                  <span className="text-sm text-slate-500">
                    {usage.thisMonth.apiCalls.toLocaleString()} / {usage.limits.apiCallsMax.toLocaleString()}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${getUsageColor(Math.round((usage.thisMonth.apiCalls / usage.limits.apiCallsMax) * 100))}`}
                    style={{ width: `${Math.min((usage.thisMonth.apiCalls / usage.limits.apiCallsMax) * 100, 100)}%` }}
                  />
                </div>
              </div>

              {/* Bandwidth (simulated) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Bandwidth</span>
                  <span className="text-sm text-slate-500">Unlimited</span>
                </div>
                <div className="w-full h-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-300 w-full opacity-40" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Month Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ArrowUpRight className="w-5 h-5 text-teal-600" />
                Perbandingan Bulan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <p className="text-xs text-slate-500 font-medium mb-2">Bulan Lalu</p>
                  <p className="text-lg font-bold text-slate-700 dark:text-slate-300">{usage.lastMonth.orders} orders</p>
                  <p className="text-sm text-slate-500">{formatCurrency(usage.lastMonth.revenue)}</p>
                </div>
                <div className="p-4 bg-teal-50 dark:bg-teal-900/20 rounded-xl border border-teal-100 dark:border-teal-800">
                  <p className="text-xs text-teal-600 font-medium mb-2">Bulan Ini</p>
                  <p className="text-lg font-bold text-teal-700 dark:text-teal-300">{usage.thisMonth.orders} orders</p>
                  <p className="text-sm text-teal-600">{formatCurrency(usage.thisMonth.revenue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
