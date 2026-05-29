import React, { useEffect, useState, useCallback } from 'react';
import api from '../api';
import { Link } from 'react-router-dom';
import { Table, Thead, Tbody, Th, Td, Tr } from '../components/ui/Table';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import {
    Car, Users, MapPin, Search, RefreshCw, Eye, CheckCircle,
    XCircle, ChevronLeft, ChevronRight, Activity, Star, Phone,
    DollarSign, TrendingUp, Map, Ban
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

const DriverManagement = () => {
    const [drivers, setDrivers] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [selectedDriver, setSelectedDriver] = useState(null);
    const [actionLoading, setActionLoading] = useState({});
    const [activeTab, setActiveTab] = useState('drivers');
    const [revenue, setRevenue] = useState(null);
    const [feeSettings, setFeeSettings] = useState({});
    const [pendingDrivers, setPendingDrivers] = useState([]);
    const [broadcastForm, setBroadcastForm] = useState({ title: '', message: '' });
    const [broadcasting, setBroadcasting] = useState(false);

    const fetchDrivers = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page, limit: 20 };
            if (search) params.search = search;
            if (statusFilter) params.status = statusFilter;
            const res = await api.get('/admin/drivers', { params });
            setDrivers(res.data.data?.drivers || []);
            setTotal(res.data.data?.total || 0);
            setTotalPages(res.data.data?.totalPages || 1);
        } catch (e) {
            console.error('Failed to fetch drivers', e);
        } finally {
            setLoading(false);
        }
    }, [page, search, statusFilter]);

    const fetchStats = async () => {
        try {
            const res = await api.get('/admin/drivers/stats');
            setStats(res.data.data);
        } catch (e) {
            console.error('Failed to fetch driver stats', e);
        }
    };

    const fetchRevenue = async () => {
        try {
            const res = await api.get('/admin/drivers/revenue?months=6');
            setRevenue(res.data.data);
        } catch (e) {
            console.error('Failed to fetch revenue', e);
        }
    };

    const fetchFeeSettings = async () => {
        try {
            const res = await api.get('/admin/drivers/fee-settings');
            setFeeSettings(res.data.data || {});
        } catch (e) { console.error(e); }
    };

    const fetchPendingDrivers = async () => {
        try {
            const res = await api.get('/admin/drivers/pending');
            setPendingDrivers(res.data.data || []);
        } catch (e) { console.error(e); }
    };

    const saveFeeSettings = async () => {
        try {
            await api.post('/admin/drivers/fee-settings', feeSettings);
            alert('Fee settings saved!');
        } catch (e) { alert('Failed to save'); }
    };

    const sendBroadcast = async () => {
        if (!broadcastForm.title || !broadcastForm.message) return alert('Fill title and message');
        setBroadcasting(true);
        try {
            const res = await api.post('/admin/drivers/broadcast', broadcastForm);
            alert(`Broadcast sent to ${res.data.data?.driversNotified || 0} drivers`);
            setBroadcastForm({ title: '', message: '' });
        } catch (e) { alert('Failed to send broadcast'); }
        finally { setBroadcasting(false); }
    };

    useEffect(() => { fetchStats(); fetchRevenue(); fetchFeeSettings(); fetchPendingDrivers(); }, []);
    useEffect(() => {
        const timer = setTimeout(() => fetchDrivers(), 300);
        return () => clearTimeout(timer);
    }, [fetchDrivers]);

    const toggleActive = async (id, currentActive) => {
        setActionLoading(prev => ({ ...prev, [id]: true }));
        try {
            await api.put(`/admin/drivers/${id}`, { isActive: !currentActive });
            fetchDrivers();
            fetchStats();
        } catch (e) {
            alert(e.response?.data?.message || 'Failed to update');
        } finally {
            setActionLoading(prev => ({ ...prev, [id]: false }));
        }
    };

    const approveDriver = async (id) => {
        if (!window.confirm('Approve this driver?')) return;
        setActionLoading(prev => ({ ...prev, [id]: true }));
        try {
            await api.put(`/admin/drivers/${id}/approve`);
            fetchDrivers(); fetchStats();
        } catch (e) { alert(e.response?.data?.message || 'Failed'); }
        finally { setActionLoading(prev => ({ ...prev, [id]: false })); }
    };

    const suspendDriver = async (id) => {
        if (!window.confirm('Suspend this driver? They will be set offline.')) return;
        setActionLoading(prev => ({ ...prev, [id]: true }));
        try {
            await api.put(`/admin/drivers/${id}/suspend`);
            fetchDrivers(); fetchStats();
        } catch (e) { alert(e.response?.data?.message || 'Failed'); }
        finally { setActionLoading(prev => ({ ...prev, [id]: false })); }
    };

    const viewDetail = async (id) => {
        try {
            const res = await api.get(`/admin/drivers/${id}`);
            setSelectedDriver(res.data.data);
        } catch (e) {
            alert('Failed to load driver detail');
        }
    };

    const formatCurrency = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);

    const COLORS = ['#5DBB7B', '#06b6d4', '#f59e0b', '#8b5cf6'];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Driver Management</h1>
                    <p className="text-slate-500 mt-1">Monitor, manage, and analyze driver operations.</p>
                </div>
                <div className="flex gap-2">
                    <Link to="/admin/drivers/map">
                        <Button variant="outline" icon={Map}>Territory Map</Button>
                    </Link>
                    <Button variant="outline" icon={RefreshCw} onClick={() => { fetchDrivers(); fetchStats(); fetchRevenue(); }} isLoading={loading}>
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white/80 rounded-xl border border-emerald-100/50 p-1.5 shadow-sm">
                <div className="flex gap-1 overflow-x-auto">
                    {[
                        { id: 'drivers', label: 'Drivers', icon: Users },
                        { id: 'pending', label: 'Registrations', icon: CheckCircle },
                        { id: 'revenue', label: 'Revenue', icon: DollarSign },
                        { id: 'settings', label: 'Fee Settings', icon: TrendingUp },
                        { id: 'broadcast', label: 'Broadcast', icon: Activity },
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-primary-50 text-primary-700 shadow-sm border border-primary-100' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
                            <tab.icon size={16} />{tab.label}
                            {tab.id === 'pending' && pendingDrivers.length > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-rose-500 text-white rounded-full">{pendingDrivers.length}</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Cards */}
            {activeTab === 'drivers' && stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Card className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                            <Users size={18} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium">Total Drivers</p>
                            <p className="text-xl font-bold text-slate-900">{stats.totalDrivers}</p>
                        </div>
                    </Card>
                    <Card className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Activity size={18} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium">Online Now</p>
                            <p className="text-xl font-bold text-emerald-700">{stats.onlineDrivers}</p>
                        </div>
                    </Card>
                    <Card className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                            <Car size={18} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium">Busy (On Trip)</p>
                            <p className="text-xl font-bold text-amber-700">{stats.busyDrivers}</p>
                        </div>
                    </Card>
                    <Card className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                            <CheckCircle size={18} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium">Completed Orders</p>
                            <p className="text-xl font-bold text-slate-900">{stats.completedOrders}</p>
                        </div>
                    </Card>
                </div>
            )}

            {activeTab === 'drivers' && (
            <>
            {/* Filters */}
            <Card className="p-4">
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                    <div className="relative flex-1 w-full sm:max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search name, phone, plate..."
                            className="pl-10 pr-4 py-2 w-full border border-emerald-200/80 rounded-xl focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none text-sm"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>
                    <select
                        className="px-3 py-2 border border-emerald-200/80 rounded-xl text-sm bg-white focus:ring-2 focus:ring-primary-200"
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    >
                        <option value="">All Status</option>
                        <option value="ONLINE">Online</option>
                        <option value="OFFLINE">Offline</option>
                        <option value="BUSY">Busy</option>
                    </select>
                    <span className="text-sm text-slate-500">{total} drivers found</span>
                </div>
            </Card>

            {/* Table */}
            <Card className="overflow-hidden">
                <Table>
                    <Thead>
                        <Tr>
                            <Th>Driver</Th>
                            <Th>Vehicle</Th>
                            <Th>Status</Th>
                            <Th>Rating</Th>
                            <Th>Balance</Th>
                            <Th>Active</Th>
                            <Th className="text-right">Actions</Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                        {loading ? (
                            <Tr><Td colSpan="7" className="text-center py-12 text-slate-400">Loading drivers...</Td></Tr>
                        ) : drivers.length === 0 ? (
                            <Tr><Td colSpan="7" className="text-center py-12 text-slate-400">No drivers found.</Td></Tr>
                        ) : drivers.map((d) => (
                            <Tr key={d.id}>
                                <Td>
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 font-bold text-sm">
                                            {d.name?.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900">{d.name}</p>
                                            <p className="text-xs text-slate-500 flex items-center gap-1"><Phone size={10} /> {d.phone}</p>
                                        </div>
                                    </div>
                                </Td>
                                <Td>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-slate-700">{d.vehicleType}</span>
                                        <span className="text-xs text-slate-500">{d.vehiclePlate}</span>
                                    </div>
                                </Td>
                                <Td>
                                    <Badge variant={d.status === 'ONLINE' ? 'success' : d.status === 'BUSY' ? 'warning' : 'secondary'}>
                                        {d.status}
                                    </Badge>
                                </Td>
                                <Td>
                                    <div className="flex items-center gap-1">
                                        <Star size={14} className="text-amber-400 fill-amber-400" />
                                        <span className="text-sm font-medium">{d.rating?.toFixed(1) || '0.0'}</span>
                                        <span className="text-xs text-slate-400">({d.ratingCount})</span>
                                    </div>
                                </Td>
                                <Td>
                                    <span className="text-sm font-mono">{formatCurrency(d.balance)}</span>
                                </Td>
                                <Td>
                                    <button
                                        onClick={() => toggleActive(d.id, d.isActive)}
                                        disabled={!!actionLoading[d.id]}
                                        className="transition-colors"
                                    >
                                        <Badge variant={d.isActive ? 'success' : 'error'}>
                                            {d.isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </button>
                                </Td>
                                <Td className="text-right">
                                    <div className="flex justify-end gap-1.5">
                                        {!d.isActive && (
                                            <Button variant="outline" size="sm" onClick={() => approveDriver(d.id)} disabled={!!actionLoading[d.id]} className="text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                                                <CheckCircle size={14} />
                                            </Button>
                                        )}
                                        {d.isActive && (
                                            <Button variant="outline" size="sm" onClick={() => suspendDriver(d.id)} disabled={!!actionLoading[d.id]} className="text-rose-500 border-rose-200 hover:bg-rose-50">
                                                <Ban size={14} />
                                            </Button>
                                        )}
                                        <Button variant="outline" size="sm" icon={Eye} onClick={() => viewDetail(d.id)}>
                                            Detail
                                        </Button>
                                    </div>
                                </Td>
                            </Tr>
                        ))}
                    </Tbody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-emerald-100/50 flex items-center justify-between">
                        <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                                <ChevronLeft size={16} /> Prev
                            </Button>
                            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                                Next <ChevronRight size={16} />
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
            </>
            )}

            {/* Revenue Tab */}
            {activeTab === 'revenue' && revenue && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <Card className="p-5">
                            <p className="text-xs text-slate-500 font-medium">Total GMV</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(revenue.totalRevenue)}</p>
                            <p className="text-[11px] text-slate-400 mt-1">{revenue.totalCompleted} orders</p>
                        </Card>
                        <Card className="p-5 border-l-4 border-l-primary-400">
                            <p className="text-xs text-slate-500 font-medium">Platform Commission</p>
                            <p className="text-2xl font-bold text-primary-700 mt-1">{formatCurrency(revenue.platformCommission)}</p>
                            <p className="text-[11px] text-slate-400 mt-1">{revenue.feeFlat > 0 ? `Rp${revenue.feeFlat}/order` : `${revenue.feePercent}% per order`}</p>
                        </Card>
                        <Card className="p-5">
                            <p className="text-xs text-slate-500 font-medium">Driver Earnings</p>
                            <p className="text-2xl font-bold text-emerald-700 mt-1">{formatCurrency(revenue.driverEarnings)}</p>
                        </Card>
                        <Card className="p-5">
                            <p className="text-xs text-slate-500 font-medium">Avg Order Value</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(revenue.avgOrderValue)}</p>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="p-5 lg:col-span-2">
                            <h3 className="text-sm font-semibold text-slate-800 mb-4">Revenue & Commission Trend</h3>
                            <ResponsiveContainer width="100%" height={220}>
                                <LineChart data={revenue.revenueChart || []}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : `${(v/1000).toFixed(0)}K`} />
                                    <Tooltip formatter={(v) => formatCurrency(v)} />
                                    <Line type="monotone" dataKey="revenue" stroke="#94a3b8" strokeWidth={1.5} dot={false} name="GMV" />
                                    <Line type="monotone" dataKey="commission" stroke="#5DBB7B" strokeWidth={2.5} dot={{ r: 4, fill: '#5DBB7B' }} name="Platform Commission" />
                                </LineChart>
                            </ResponsiveContainer>
                        </Card>
                        <Card className="p-5">
                            <h3 className="text-sm font-semibold text-slate-800 mb-4">By Service Type</h3>
                            <ResponsiveContainer width="100%" height={180}>
                                <PieChart>
                                    <Pie data={revenue.revenueByType || []} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="revenue" nameKey="type" paddingAngle={3}>
                                        {(revenue.revenueByType || []).map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip formatter={v => formatCurrency(v)} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="space-y-1.5 mt-2">
                                {revenue.revenueByType?.map((t, idx) => (
                                    <div key={t.type} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[idx % COLORS.length] }} />
                                            <span className="text-slate-600">{t.type}</span>
                                        </div>
                                        <span className="font-medium">{formatCurrency(t.revenue)}</span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                    {/* Top Earners */}
                    <Card className="p-5">
                        <h3 className="text-sm font-semibold text-slate-800 mb-4">Top Earning Drivers</h3>
                        <div className="space-y-3">
                            {revenue.topEarners?.map((d, idx) => {
                                const maxRev = revenue.topEarners[0]?.revenue || 1;
                                const pct = Math.round((d.revenue / maxRev) * 100);
                                return (
                                    <div key={idx} className="flex items-center gap-3">
                                        <span className="text-xs font-bold text-slate-400 w-5 text-right">#{idx + 1}</span>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-medium text-slate-700">{d.name || 'Unknown'}</span>
                                                <span className="text-xs font-bold text-slate-800">{formatCurrency(d.revenue)} ({d.trips} trips)</span>
                                            </div>
                                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full bg-gradient-to-r from-primary-400 to-emerald-400" style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {(!revenue.topEarners || revenue.topEarners.length === 0) && (
                                <p className="text-sm text-slate-400 text-center py-4">No revenue data yet</p>
                            )}
                        </div>
                    </Card>
                </div>
            )}

            {/* Pending Registrations Tab */}
            {activeTab === 'pending' && (
                <Card className="overflow-hidden">
                    <div className="p-4 border-b border-emerald-100/50">
                        <h3 className="font-semibold text-slate-800">Pending Driver Registrations</h3>
                        <p className="text-xs text-slate-500 mt-1">Approve or reject new driver applications.</p>
                    </div>
                    <Table>
                        <Thead>
                            <Tr>
                                <Th>Driver</Th>
                                <Th>Vehicle</Th>
                                <Th>Documents</Th>
                                <Th>Registered</Th>
                                <Th className="text-right">Actions</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {pendingDrivers.length === 0 ? (
                                <Tr><Td colSpan="5" className="text-center py-12 text-slate-400">No pending registrations.</Td></Tr>
                            ) : pendingDrivers.map(d => (
                                <Tr key={d.id}>
                                    <Td>
                                        <div>
                                            <p className="font-medium text-slate-900">{d.name}</p>
                                            <p className="text-xs text-slate-500">{d.phone} • {d.email || '-'}</p>
                                        </div>
                                    </Td>
                                    <Td>
                                        <p className="text-sm">{d.vehicleType} - {d.vehicleBrand || '-'}</p>
                                        <p className="text-xs text-slate-500">{d.vehiclePlate}</p>
                                    </Td>
                                    <Td>
                                        <div className="flex gap-1">
                                            {['ktpImage', 'simImage', 'stnkImage'].map(k => (
                                                <span key={k} className={`text-[9px] px-1.5 py-0.5 rounded ${d[k] ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                                                    {k.replace('Image', '').toUpperCase()}
                                                </span>
                                            ))}
                                        </div>
                                    </Td>
                                    <Td><span className="text-xs text-slate-500">{new Date(d.createdAt).toLocaleDateString('id-ID')}</span></Td>
                                    <Td className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button size="sm" onClick={() => approveDriver(d.id)} disabled={!!actionLoading[d.id]} className="bg-emerald-600 hover:bg-emerald-700">
                                                <CheckCircle size={14} className="mr-1" /> Approve
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => suspendDriver(d.id)} disabled={!!actionLoading[d.id]} className="text-rose-600 border-rose-200 hover:bg-rose-50">
                                                <XCircle size={14} className="mr-1" /> Reject
                                            </Button>
                                        </div>
                                    </Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                </Card>
            )}

            {/* Fee Settings Tab */}
            {activeTab === 'settings' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="p-6">
                        <h3 className="font-semibold text-slate-800 mb-4">Platform Commission</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Commission Type</label>
                                <select className="w-full border border-emerald-200/80 rounded-xl p-2.5 text-sm bg-white"
                                    value={feeSettings.DRIVER_PLATFORM_FEE_FLAT > 0 ? 'FLAT' : 'PERCENT'}
                                    onChange={e => {
                                        if (e.target.value === 'FLAT') setFeeSettings(p => ({ ...p, DRIVER_PLATFORM_FEE_PERCENT: '0' }));
                                        else setFeeSettings(p => ({ ...p, DRIVER_PLATFORM_FEE_FLAT: '0' }));
                                    }}>
                                    <option value="PERCENT">Percentage (%)</option>
                                    <option value="FLAT">Flat per Order (Rp)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Commission Percentage (%)</label>
                                <Input type="number" value={feeSettings.DRIVER_PLATFORM_FEE_PERCENT || '20'}
                                    onChange={e => setFeeSettings(p => ({ ...p, DRIVER_PLATFORM_FEE_PERCENT: e.target.value }))} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Flat Fee per Order (Rp)</label>
                                <Input type="number" value={feeSettings.DRIVER_PLATFORM_FEE_FLAT || '0'}
                                    onChange={e => setFeeSettings(p => ({ ...p, DRIVER_PLATFORM_FEE_FLAT: e.target.value }))} />
                            </div>
                        </div>
                    </Card>
                    <Card className="p-6">
                        <h3 className="font-semibold text-slate-800 mb-4">Fare Configuration</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Base Fare (Rp)</label>
                                    <Input type="number" value={feeSettings.DRIVER_BASE_FARE || '5000'}
                                        onChange={e => setFeeSettings(p => ({ ...p, DRIVER_BASE_FARE: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Minimum Fare (Rp)</label>
                                    <Input type="number" value={feeSettings.DRIVER_MINIMUM_FARE || '8000'}
                                        onChange={e => setFeeSettings(p => ({ ...p, DRIVER_MINIMUM_FARE: e.target.value }))} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Per KM Rate (Rp)</label>
                                    <Input type="number" value={feeSettings.DRIVER_PER_KM_RATE || '2500'}
                                        onChange={e => setFeeSettings(p => ({ ...p, DRIVER_PER_KM_RATE: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Per Minute Rate (Rp)</label>
                                    <Input type="number" value={feeSettings.DRIVER_PER_MIN_RATE || '500'}
                                        onChange={e => setFeeSettings(p => ({ ...p, DRIVER_PER_MIN_RATE: e.target.value }))} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Surge Multiplier</label>
                                    <Input type="number" step="0.1" value={feeSettings.DRIVER_SURGE_MULTIPLIER || '1.0'}
                                        onChange={e => setFeeSettings(p => ({ ...p, DRIVER_SURGE_MULTIPLIER: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Cancellation Fee (Rp)</label>
                                    <Input type="number" value={feeSettings.DRIVER_CANCELLATION_FEE || '5000'}
                                        onChange={e => setFeeSettings(p => ({ ...p, DRIVER_CANCELLATION_FEE: e.target.value }))} />
                                </div>
                            </div>
                        </div>
                    </Card>
                    <div className="lg:col-span-2">
                        <Button onClick={saveFeeSettings} className="w-full sm:w-auto">Save All Fee Settings</Button>
                    </div>
                </div>
            )}

            {/* Broadcast Tab */}
            {activeTab === 'broadcast' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="p-6">
                        <h3 className="font-semibold text-slate-800 mb-4">Send Broadcast to All Drivers</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                                <Input placeholder="e.g. Maintenance Notice" value={broadcastForm.title}
                                    onChange={e => setBroadcastForm(p => ({ ...p, title: e.target.value }))} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                                <textarea className="w-full border border-emerald-200/80 rounded-xl p-3 text-sm h-32 focus:ring-2 focus:ring-primary-200 outline-none"
                                    placeholder="Write your message to all drivers..."
                                    value={broadcastForm.message}
                                    onChange={e => setBroadcastForm(p => ({ ...p, message: e.target.value }))} />
                            </div>
                            <Button onClick={sendBroadcast} isLoading={broadcasting} className="w-full">
                                Send Broadcast
                            </Button>
                        </div>
                    </Card>
                    <Card className="p-6">
                        <h3 className="font-semibold text-slate-800 mb-4">Quick Templates</h3>
                        <div className="space-y-2">
                            {[
                                { title: 'Maintenance', msg: 'Aplikasi akan maintenance pada [waktu]. Mohon selesaikan trip aktif Anda.' },
                                { title: 'Promo Bonus', msg: 'Selesaikan 10 trip hari ini dan dapatkan bonus Rp50.000!' },
                                { title: 'Update App', msg: 'Versi terbaru aplikasi sudah tersedia. Silakan update untuk performa terbaik.' },
                                { title: 'Peak Hour', msg: 'Jam sibuk dimulai! Banyak order menunggu di area Anda.' },
                            ].map((tpl, idx) => (
                                <button key={idx} onClick={() => setBroadcastForm({ title: tpl.title, message: tpl.msg })}
                                    className="w-full text-left p-3 border border-emerald-100 rounded-xl hover:bg-primary-50/50 transition-colors">
                                    <p className="text-sm font-medium text-slate-800">{tpl.title}</p>
                                    <p className="text-xs text-slate-500 mt-0.5 truncate">{tpl.msg}</p>
                                </button>
                            ))}
                        </div>
                    </Card>
                </div>
            )}

            {/* Driver Detail Modal */}
            {selectedDriver && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedDriver(null)}>
                    <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b bg-primary-50/50 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">{selectedDriver.name}</h2>
                                <p className="text-xs text-slate-500">{selectedDriver.phone} • {selectedDriver.email || '-'}</p>
                            </div>
                            <Badge variant={selectedDriver.isActive ? 'success' : 'error'}>
                                {selectedDriver.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Info Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div>
                                    <p className="text-xs text-slate-500 font-medium">Vehicle</p>
                                    <p className="text-sm font-semibold">{selectedDriver.vehicleType} - {selectedDriver.vehicleBrand || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-medium">Plate</p>
                                    <p className="text-sm font-semibold">{selectedDriver.vehiclePlate}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-medium">Status</p>
                                    <Badge variant={selectedDriver.status === 'ONLINE' ? 'success' : selectedDriver.status === 'BUSY' ? 'warning' : 'secondary'}>
                                        {selectedDriver.status}
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-medium">Rating</p>
                                    <p className="text-sm font-semibold flex items-center gap-1">
                                        <Star size={14} className="text-amber-400 fill-amber-400" />
                                        {selectedDriver.rating?.toFixed(1)} ({selectedDriver.ratingCount} reviews)
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-medium">Balance</p>
                                    <p className="text-sm font-semibold">{formatCurrency(selectedDriver.balance)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-medium">Joined</p>
                                    <p className="text-sm font-semibold">{new Date(selectedDriver.createdAt).toLocaleDateString('id-ID')}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-medium">NIK</p>
                                    <p className="text-sm font-semibold">{selectedDriver.nik || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-medium">Address</p>
                                    <p className="text-sm font-semibold">{selectedDriver.address || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-medium">Last Location</p>
                                    <p className="text-sm font-semibold flex items-center gap-1">
                                        <MapPin size={12} />
                                        {selectedDriver.latitude && selectedDriver.longitude
                                            ? `${selectedDriver.latitude.toFixed(4)}, ${selectedDriver.longitude.toFixed(4)}`
                                            : 'Unknown'}
                                    </p>
                                </div>
                            </div>

                            {/* Documents */}
                            <div>
                                <h3 className="text-sm font-semibold text-slate-700 mb-3">Documents</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {['ktpImage', 'simImage', 'stnkImage', 'selfieImage'].map(key => (
                                        <div key={key} className="border border-emerald-100 rounded-xl p-2 text-center">
                                            <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">{key.replace('Image', '')}</p>
                                            {selectedDriver[key] ? (
                                                <img
                                                    src={selectedDriver[key].startsWith('http') ? selectedDriver[key] : `http://localhost:4000${selectedDriver[key]}`}
                                                    alt={key}
                                                    className="w-full h-20 object-cover rounded-lg bg-slate-100"
                                                    onError={(e) => { e.target.src = 'https://placehold.co/100x80?text=N/A'; }}
                                                />
                                            ) : (
                                                <div className="w-full h-20 bg-slate-50 rounded-lg flex items-center justify-center text-xs text-slate-400">Not uploaded</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Recent Orders */}
                            {selectedDriver.serviceRequests?.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-700 mb-3">Recent Orders ({selectedDriver.serviceRequests.length})</h3>
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {selectedDriver.serviceRequests.slice(0, 10).map(order => (
                                            <div key={order.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-sm">
                                                <div>
                                                    <span className="font-medium">{order.type}</span>
                                                    <span className="text-xs text-slate-500 ml-2">{new Date(order.createdAt).toLocaleDateString()}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs">{formatCurrency(order.price)}</span>
                                                    <Badge variant={order.status === 'COMPLETED' ? 'success' : order.status === 'CANCELLED' ? 'error' : 'warning'}>
                                                        {order.status}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 border-t flex justify-end">
                            <Button variant="outline" onClick={() => setSelectedDriver(null)}>Close</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DriverManagement;
