import React, { useEffect, useState, useCallback } from 'react';
import api from '../api';
import { Table, Thead, Tbody, Th, Td, Tr } from '../components/ui/Table';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import {
    Users, Search, RefreshCw, Eye, CheckCircle, Ban,
    ChevronLeft, ChevronRight, TrendingUp, UserPlus, Smartphone,
    DollarSign, ShoppingBag
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const BuyerManagement = () => {
    const [buyers, setBuyers] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [selectedBuyer, setSelectedBuyer] = useState(null);
    const [actionLoading, setActionLoading] = useState({});
    const [activeTab, setActiveTab] = useState('users');
    const [revenue, setRevenue] = useState(null);
    const [orders, setOrders] = useState([]);
    const [ordersPage, setOrdersPage] = useState(1);
    const [ordersTotalPages, setOrdersTotalPages] = useState(1);
    const [orderSearch, setOrderSearch] = useState('');
    const [orderStatus, setOrderStatus] = useState('');

    const fetchBuyers = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page, limit: 20 };
            if (search) params.search = search;
            const res = await api.get('/admin/buyers', { params });
            setBuyers(res.data.data?.buyers || []);
            setTotal(res.data.data?.total || 0);
            setTotalPages(res.data.data?.totalPages || 1);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [page, search]);

    const fetchStats = async () => {
        try { const res = await api.get('/admin/buyers/stats'); setStats(res.data.data); }
        catch (e) { console.error(e); }
    };

    const fetchRevenue = async () => {
        try { const res = await api.get('/admin/buyers/revenue?months=6'); setRevenue(res.data.data); }
        catch (e) { console.error(e); }
    };

    const fetchOrders = async () => {
        try {
            const params = { page: ordersPage, limit: 15 };
            if (orderSearch) params.search = orderSearch;
            if (orderStatus) params.status = orderStatus;
            const res = await api.get('/admin/buyers/orders', { params });
            setOrders(res.data.data?.orders || []);
            setOrdersTotalPages(res.data.data?.totalPages || 1);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { fetchStats(); fetchRevenue(); }, []);
    useEffect(() => { const t = setTimeout(fetchBuyers, 300); return () => clearTimeout(t); }, [fetchBuyers]);
    useEffect(() => { if (activeTab === 'orders') fetchOrders(); }, [activeTab, ordersPage, orderSearch, orderStatus]);

    const toggleActive = async (id, currentActive) => {
        setActionLoading(p => ({ ...p, [id]: true }));
        try {
            await api.put(`/admin/buyers/${id}`, { isActive: !currentActive });
            fetchBuyers(); fetchStats();
        } catch (e) { alert(e.response?.data?.message || 'Failed'); }
        finally { setActionLoading(p => ({ ...p, [id]: false })); }
    };

    const viewDetail = async (id) => {
        try { const res = await api.get(`/admin/buyers/${id}`); setSelectedBuyer(res.data.data); }
        catch (e) { alert('Failed to load detail'); }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Buyer Management</h1>
                    <p className="text-slate-500 mt-1">Manage mobile app buyers and monitor user growth.</p>
                </div>
                <Button variant="outline" icon={RefreshCw} onClick={() => { fetchBuyers(); fetchStats(); }} isLoading={loading}>Refresh</Button>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Card className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center"><Users size={18} /></div>
                        <div><p className="text-xs text-slate-500">Total Buyers</p><p className="text-xl font-bold">{stats.total}</p></div>
                    </Card>
                    <Card className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><CheckCircle size={18} /></div>
                        <div><p className="text-xs text-slate-500">Active</p><p className="text-xl font-bold text-emerald-700">{stats.active}</p></div>
                    </Card>
                    <Card className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><UserPlus size={18} /></div>
                        <div><p className="text-xs text-slate-500">New This Month</p><p className="text-xl font-bold text-amber-700">{stats.newThisMonth}</p></div>
                    </Card>
                    <Card className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center"><Ban size={18} /></div>
                        <div><p className="text-xs text-slate-500">Inactive</p><p className="text-xl font-bold text-rose-600">{stats.inactive}</p></div>
                    </Card>
                </div>
            )}

            {/* Tabs */}
            <div className="bg-white/80 rounded-xl border border-emerald-100/50 p-1.5 shadow-sm">
                <div className="flex gap-1 overflow-x-auto">
                    {[
                        { id: 'users', label: 'Users', icon: Users },
                        { id: 'orders', label: 'Orders', icon: ShoppingBag },
                        { id: 'revenue', label: 'Revenue', icon: DollarSign },
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-primary-50 text-primary-700 shadow-sm border border-primary-100' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
                            <tab.icon size={16} />{tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Users Tab */}
            {activeTab === 'users' && (
            <>
            {/* Growth Chart */}
            {stats?.growthChart && (
                <Card className="p-5">
                    <h3 className="text-sm font-semibold text-slate-800 mb-4">Buyer Growth (6 Months)</h3>
                    <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={stats.growthChart}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#5DBB7B" radius={[6, 6, 0, 0]} name="New Buyers" />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
            )}

            {/* Search & Table */}
            <Card className="p-4">
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                    <div className="relative flex-1 w-full sm:max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input type="text" placeholder="Search name or email..."
                            className="pl-10 pr-4 py-2 w-full border border-emerald-200/80 rounded-xl focus:ring-2 focus:ring-primary-200 outline-none text-sm"
                            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                    </div>
                    <span className="text-sm text-slate-500">{total} buyers</span>
                </div>
            </Card>

            <Card className="overflow-hidden">
                <Table>
                    <Thead>
                        <Tr>
                            <Th>Buyer</Th>
                            <Th>Email</Th>
                            <Th>Joined</Th>
                            <Th>Status</Th>
                            <Th className="text-right">Actions</Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                        {loading ? (
                            <Tr><Td colSpan="5" className="text-center py-12 text-slate-400">Loading...</Td></Tr>
                        ) : buyers.length === 0 ? (
                            <Tr><Td colSpan="5" className="text-center py-12 text-slate-400">No buyers found.</Td></Tr>
                        ) : buyers.map(b => (
                            <Tr key={b.id}>
                                <Td>
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 font-bold text-sm">
                                            {b.name?.charAt(0) || '?'}
                                        </div>
                                        <span className="font-medium text-slate-900">{b.name}</span>
                                    </div>
                                </Td>
                                <Td><span className="text-sm text-slate-600">{b.email}</span></Td>
                                <Td><span className="text-xs text-slate-500">{new Date(b.createdAt).toLocaleDateString('id-ID')}</span></Td>
                                <Td>
                                    <button onClick={() => toggleActive(b.id, b.isActive)} disabled={!!actionLoading[b.id]}>
                                        <Badge variant={b.isActive ? 'success' : 'error'}>{b.isActive ? 'Active' : 'Inactive'}</Badge>
                                    </button>
                                </Td>
                                <Td className="text-right">
                                    <Button variant="outline" size="sm" icon={Eye} onClick={() => viewDetail(b.id)}>Detail</Button>
                                </Td>
                            </Tr>
                        ))}
                    </Tbody>
                </Table>
                {totalPages > 1 && (
                    <div className="p-4 border-t flex items-center justify-between">
                        <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={16} /></Button>
                            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={16} /></Button>
                        </div>
                    </div>
                )}
            </Card>
            </>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
                <div className="space-y-4">
                    <Card className="p-3">
                        <div className="flex flex-wrap gap-3 items-center">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input type="text" placeholder="Search name, phone, order ID..."
                                    className="pl-10 pr-4 py-2 w-full border border-emerald-200/80 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-200"
                                    value={orderSearch} onChange={e => { setOrderSearch(e.target.value); setOrdersPage(1); }} />
                            </div>
                            <select className="px-3 py-2 border border-emerald-200/80 rounded-xl text-sm bg-white"
                                value={orderStatus} onChange={e => { setOrderStatus(e.target.value); setOrdersPage(1); }}>
                                <option value="">All Status</option>
                                <option value="PENDING">Pending</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                        </div>
                    </Card>
                    <Card className="overflow-hidden">
                        <Table>
                            <Thead>
                                <Tr>
                                    <Th>Order ID</Th>
                                    <Th>Customer</Th>
                                    <Th>Store</Th>
                                    <Th>Amount</Th>
                                    <Th>Payment</Th>
                                    <Th>Status</Th>
                                    <Th>Date</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {orders.length === 0 ? (
                                    <Tr><Td colSpan="7" className="text-center py-12 text-slate-400">No orders found.</Td></Tr>
                                ) : orders.map(o => (
                                    <Tr key={o.id}>
                                        <Td><span className="font-mono text-xs">{o.id?.substring(0, 12)}</span></Td>
                                        <Td>
                                            <div><p className="text-sm font-medium">{o.customerName || '-'}</p></div>
                                        </Td>
                                        <Td><span className="text-sm">{o.store?.name || '-'}</span></Td>
                                        <Td><span className="font-mono text-sm font-medium">Rp{(o.totalAmount || 0).toLocaleString('id-ID')}</span></Td>
                                        <Td><Badge variant="neutral">{o.paymentMethod || '-'}</Badge></Td>
                                        <Td>
                                            <Badge variant={o.orderStatus === 'COMPLETED' ? 'success' : o.orderStatus === 'CANCELLED' ? 'error' : 'warning'}>
                                                {o.orderStatus}
                                            </Badge>
                                        </Td>
                                        <Td><span className="text-xs text-slate-500">{new Date(o.createdAt).toLocaleDateString('id-ID')}</span></Td>
                                    </Tr>
                                ))}
                            </Tbody>
                        </Table>
                        {ordersTotalPages > 1 && (
                            <div className="p-4 border-t flex items-center justify-between">
                                <span className="text-sm text-slate-500">Page {ordersPage} of {ordersTotalPages}</span>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" disabled={ordersPage === 1} onClick={() => setOrdersPage(p => p - 1)}><ChevronLeft size={16} /></Button>
                                    <Button variant="outline" size="sm" disabled={ordersPage >= ordersTotalPages} onClick={() => setOrdersPage(p => p + 1)}><ChevronRight size={16} /></Button>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {/* Revenue Tab */}
            {activeTab === 'revenue' && revenue && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <Card className="p-5">
                            <p className="text-xs text-slate-500">Total GMV (Buyer Orders)</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">Rp{(revenue.totalGMV || 0).toLocaleString('id-ID')}</p>
                            <p className="text-[11px] text-slate-400">{revenue.totalOrders} orders</p>
                        </Card>
                        <Card className="p-5 border-l-4 border-l-primary-400">
                            <p className="text-xs text-slate-500">Platform Commission</p>
                            <p className="text-2xl font-bold text-primary-700 mt-1">Rp{(revenue.totalPlatformFee || 0).toLocaleString('id-ID')}</p>
                            <p className="text-[11px] text-slate-400">From buyer service fees</p>
                        </Card>
                        <Card className="p-5">
                            <p className="text-xs text-slate-500">Avg Order Value</p>
                            <p className="text-2xl font-bold mt-1">Rp{(revenue.avgOrderValue || 0).toLocaleString('id-ID')}</p>
                        </Card>
                        <Card className="p-5">
                            <p className="text-xs text-slate-500">Order Status</p>
                            <div className="flex flex-wrap gap-1 mt-2">
                                {revenue.ordersByStatus?.map(s => (
                                    <Badge key={s.status} variant={s.status === 'COMPLETED' ? 'success' : s.status === 'CANCELLED' ? 'error' : 'warning'}>
                                        {s.status}: {s.count}
                                    </Badge>
                                ))}
                            </div>
                        </Card>
                    </div>
                    <Card className="p-5">
                        <h3 className="text-sm font-semibold text-slate-800 mb-4">GMV & Commission Trend (6 Months)</h3>
                        <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={revenue.revenueChart || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : `${(v/1000).toFixed(0)}K`} />
                                <Tooltip formatter={v => `Rp${(v||0).toLocaleString('id-ID')}`} />
                                <Line type="monotone" dataKey="gmv" stroke="#94a3b8" strokeWidth={1.5} dot={false} name="GMV" />
                                <Line type="monotone" dataKey="commission" stroke="#5DBB7B" strokeWidth={2.5} dot={{ r: 4, fill: '#5DBB7B' }} name="Commission" />
                            </LineChart>
                        </ResponsiveContainer>
                    </Card>
                </div>
            )}

            {/* Detail Modal */}
            {selectedBuyer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedBuyer(null)}>
                    <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b bg-primary-50/50 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold">{selectedBuyer.name}</h2>
                                <p className="text-xs text-slate-500">{selectedBuyer.email}</p>
                            </div>
                            <Badge variant={selectedBuyer.isActive ? 'success' : 'error'}>{selectedBuyer.isActive ? 'Active' : 'Inactive'}</Badge>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><p className="text-xs text-slate-500">User ID</p><p className="text-xs font-mono">{selectedBuyer.id}</p></div>
                                <div><p className="text-xs text-slate-500">Joined</p><p className="text-sm font-medium">{new Date(selectedBuyer.createdAt).toLocaleDateString('id-ID')}</p></div>
                            </div>
                            {selectedBuyer.loginHistory?.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold mb-2">Recent Logins</h3>
                                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                        {selectedBuyer.loginHistory.map((l, idx) => (
                                            <div key={idx} className="flex justify-between text-xs p-2 bg-slate-50 rounded-lg">
                                                <span className="flex items-center gap-1.5"><Smartphone size={12} /> {l.device || 'Unknown'}</span>
                                                <span className="text-slate-500">{new Date(l.createdAt).toLocaleString('id-ID')}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 border-t flex justify-end">
                            <Button variant="outline" onClick={() => setSelectedBuyer(null)}>Close</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BuyerManagement;
