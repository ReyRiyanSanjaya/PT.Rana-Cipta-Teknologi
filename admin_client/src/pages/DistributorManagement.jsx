import React, { useEffect, useState, useCallback } from 'react';
import api from '../api';
import { Table, Thead, Tbody, Th, Td, Tr } from '../components/ui/Table';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import {
    Package, Users, Search, RefreshCw, Eye, CheckCircle, XCircle,
    ChevronLeft, ChevronRight, DollarSign, TrendingUp, ShoppingBag, Truck
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const DistributorManagement = () => {
    const [distributors, setDistributors] = useState([]);
    const [stats, setStats] = useState(null);
    const [revenue, setRevenue] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [activeTab, setActiveTab] = useState('list');
    const [selectedDist, setSelectedDist] = useState(null);
    const [actionLoading, setActionLoading] = useState({});
    const [orders, setOrders] = useState([]);
    const [ordersPage, setOrdersPage] = useState(1);
    const [ordersTotalPages, setOrdersTotalPages] = useState(1);
    const [orderStatusFilter, setOrderStatusFilter] = useState('');

    const fetchDistributors = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page, limit: 20 };
            if (search) params.search = search;
            if (statusFilter) params.status = statusFilter;
            const res = await api.get('/admin/distributors', { params });
            setDistributors(res.data.data?.distributors || []);
            setTotalPages(res.data.data?.totalPages || 1);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [page, search, statusFilter]);

    const fetchStats = async () => {
        try { const res = await api.get('/admin/distributors/stats'); setStats(res.data.data); } catch (e) { console.error(e); }
    };
    const fetchRevenue = async () => {
        try { const res = await api.get('/admin/distributors/revenue?months=6'); setRevenue(res.data.data); } catch (e) { console.error(e); }
    };

    const fetchOrders = async () => {
        try {
            const params = { page: ordersPage, limit: 15 };
            if (orderStatusFilter) params.status = orderStatusFilter;
            const res = await api.get('/admin/distributors/orders', { params });
            setOrders(res.data.data?.orders || []);
            setOrdersTotalPages(res.data.data?.totalPages || 1);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { fetchStats(); fetchRevenue(); }, []);
    useEffect(() => { const t = setTimeout(fetchDistributors, 300); return () => clearTimeout(t); }, [fetchDistributors]);
    useEffect(() => { if (activeTab === 'orders') fetchOrders(); }, [activeTab, ordersPage, orderStatusFilter]);

    const approve = async (id) => {
        if (!confirm('Approve this distributor?')) return;
        setActionLoading(p => ({ ...p, [id]: true }));
        try { await api.put(`/admin/distributors/${id}/approve`); fetchDistributors(); fetchStats(); }
        catch (e) { alert(e.response?.data?.message || 'Failed'); }
        finally { setActionLoading(p => ({ ...p, [id]: false })); }
    };
    const reject = async (id) => {
        if (!confirm('Reject this distributor?')) return;
        setActionLoading(p => ({ ...p, [id]: true }));
        try { await api.put(`/admin/distributors/${id}/reject`); fetchDistributors(); fetchStats(); }
        catch (e) { alert(e.response?.data?.message || 'Failed'); }
        finally { setActionLoading(p => ({ ...p, [id]: false })); }
    };
    const viewDetail = async (id) => {
        try { const res = await api.get(`/admin/distributors/${id}`); setSelectedDist(res.data.data); }
        catch (e) { alert('Failed to load detail'); }
    };

    const formatCurrency = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v || 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Distributor Management</h1>
                    <p className="text-slate-500 mt-1">Manage distributors, orders, and wholesale operations.</p>
                </div>
                <Button variant="outline" icon={RefreshCw} onClick={() => { fetchDistributors(); fetchStats(); fetchRevenue(); }} isLoading={loading}>Refresh</Button>
            </div>

            {/* Tabs */}
            <div className="bg-white/80 rounded-xl border border-emerald-100/50 p-1.5 shadow-sm">
                <div className="flex gap-1 overflow-x-auto">
                    {[
                        { id: 'list', label: 'Distributors', icon: Package },
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

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Card className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center"><Package size={18} /></div>
                        <div><p className="text-xs text-slate-500">Total</p><p className="text-xl font-bold">{stats.total}</p></div>
                    </Card>
                    <Card className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><Users size={18} /></div>
                        <div><p className="text-xs text-slate-500">Pending</p><p className="text-xl font-bold text-amber-700">{stats.pending}</p></div>
                    </Card>
                    <Card className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><ShoppingBag size={18} /></div>
                        <div><p className="text-xs text-slate-500">Orders</p><p className="text-xl font-bold">{stats.totalOrders}</p></div>
                    </Card>
                    <Card className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center"><DollarSign size={18} /></div>
                        <div><p className="text-xs text-slate-500">Revenue</p><p className="text-lg font-bold">{formatCurrency(stats.totalRevenue)}</p></div>
                    </Card>
                </div>
            )}

            {/* List Tab */}
            {activeTab === 'list' && (
            <>
                <Card className="p-4">
                    <div className="flex flex-col sm:flex-row gap-3 items-center">
                        <div className="relative flex-1 w-full sm:max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input type="text" placeholder="Search company, name, email..."
                                className="pl-10 pr-4 py-2 w-full border border-emerald-200/80 rounded-xl focus:ring-2 focus:ring-primary-200 outline-none text-sm"
                                value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                        </div>
                        <select className="px-3 py-2 border border-emerald-200/80 rounded-xl text-sm bg-white"
                            value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
                            <option value="">All Status</option>
                            <option value="PENDING">Pending</option>
                            <option value="APPROVED">Approved</option>
                            <option value="REJECTED">Rejected</option>
                        </select>
                    </div>
                </Card>

                <Card className="overflow-hidden">
                    <Table>
                        <Thead>
                            <Tr>
                                <Th>Company</Th>
                                <Th>Owner</Th>
                                <Th>Products</Th>
                                <Th>Orders</Th>
                                <Th>Status</Th>
                                <Th className="text-right">Actions</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {loading ? (
                                <Tr><Td colSpan="6" className="text-center py-12 text-slate-400">Loading...</Td></Tr>
                            ) : distributors.length === 0 ? (
                                <Tr><Td colSpan="6" className="text-center py-12 text-slate-400">No distributors found.</Td></Tr>
                            ) : distributors.map(d => (
                                <Tr key={d.id}>
                                    <Td><span className="font-medium text-slate-900">{d.companyName}</span></Td>
                                    <Td>
                                        <div><p className="text-sm">{d.user?.name || '-'}</p><p className="text-xs text-slate-500">{d.user?.email}</p></div>
                                    </Td>
                                    <Td><span className="text-sm">{d._count?.wholesaleProducts || 0}</span></Td>
                                    <Td><span className="text-sm">{d._count?.wholesaleOrders || 0}</span></Td>
                                    <Td>
                                        <Badge variant={d.approvalStatus === 'APPROVED' ? 'success' : d.approvalStatus === 'REJECTED' ? 'error' : 'warning'}>
                                            {d.approvalStatus}
                                        </Badge>
                                    </Td>
                                    <Td className="text-right">
                                        <div className="flex justify-end gap-1.5">
                                            {d.approvalStatus === 'PENDING' && (
                                                <>
                                                    <Button size="sm" onClick={() => approve(d.id)} disabled={!!actionLoading[d.id]} className="bg-emerald-600 hover:bg-emerald-700"><CheckCircle size={14} /></Button>
                                                    <Button size="sm" variant="outline" onClick={() => reject(d.id)} disabled={!!actionLoading[d.id]} className="text-rose-500 border-rose-200"><XCircle size={14} /></Button>
                                                </>
                                            )}
                                            <Button variant="outline" size="sm" icon={Eye} onClick={() => viewDetail(d.id)}>Detail</Button>
                                        </div>
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

            {/* Revenue Tab */}
            {activeTab === 'revenue' && revenue && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Card className="p-5">
                            <p className="text-xs text-slate-500">Total Revenue</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(revenue.totalRevenue)}</p>
                            <p className="text-[11px] text-slate-400">{revenue.totalOrders} orders</p>
                        </Card>
                        <Card className="p-5">
                            <p className="text-xs text-slate-500">Avg Order Value</p>
                            <p className="text-2xl font-bold text-primary-700 mt-1">{formatCurrency(revenue.totalOrders > 0 ? revenue.totalRevenue / revenue.totalOrders : 0)}</p>
                        </Card>
                        <Card className="p-5">
                            <p className="text-xs text-slate-500">Top Distributors</p>
                            <p className="text-2xl font-bold mt-1">{revenue.topDistributors?.length || 0}</p>
                        </Card>
                    </div>
                    <Card className="p-5">
                        <h3 className="text-sm font-semibold text-slate-800 mb-4">Revenue Trend (6 Months)</h3>
                        <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={revenue.revenueChart || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : `${(v/1000).toFixed(0)}K`} />
                                <Tooltip formatter={v => formatCurrency(v)} />
                                <Line type="monotone" dataKey="revenue" stroke="#5DBB7B" strokeWidth={2.5} dot={{ r: 4, fill: '#5DBB7B' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </Card>
                    <Card className="p-5">
                        <h3 className="text-sm font-semibold text-slate-800 mb-4">Top Distributors by Revenue</h3>
                        <div className="space-y-3">
                            {revenue.topDistributors?.map((d, idx) => {
                                const max = revenue.topDistributors[0]?.revenue || 1;
                                return (
                                    <div key={idx} className="flex items-center gap-3">
                                        <span className="text-xs font-bold text-slate-400 w-5">#{idx+1}</span>
                                        <div className="flex-1">
                                            <div className="flex justify-between mb-1">
                                                <span className="text-xs font-medium text-slate-700">{d.companyName || 'Unknown'}</span>
                                                <span className="text-xs font-bold">{formatCurrency(d.revenue)} ({d.orders} orders)</span>
                                            </div>
                                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full bg-gradient-to-r from-primary-400 to-emerald-400" style={{ width: `${Math.round((d.revenue/max)*100)}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
                <div className="space-y-4">
                    <Card className="p-3">
                        <div className="flex flex-wrap gap-3 items-center">
                            <select className="px-3 py-2 border border-emerald-200/80 rounded-xl text-sm bg-white"
                                value={orderStatusFilter} onChange={e => { setOrderStatusFilter(e.target.value); setOrdersPage(1); }}>
                                <option value="">All Status</option>
                                <option value="PENDING">Pending</option>
                                <option value="PAID">Paid</option>
                                <option value="PROCESSING">Processing</option>
                                <option value="SHIPPED">Shipped</option>
                                <option value="DELIVERED">Delivered</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                            <span className="text-sm text-slate-500 ml-auto">{orders.length} orders</span>
                        </div>
                    </Card>
                    <Card className="overflow-hidden">
                        <Table>
                            <Thead>
                                <Tr>
                                    <Th>Order #</Th>
                                    <Th>Buyer</Th>
                                    <Th>Distributor</Th>
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
                                        <Td><span className="font-mono text-xs font-medium">{o.orderNumber}</span></Td>
                                        <Td><span className="text-sm">{o.tenant?.name || '-'}</span></Td>
                                        <Td><span className="text-sm">{o.distributor?.companyName || '-'}</span></Td>
                                        <Td><span className="font-mono text-sm font-medium">{formatCurrency(o.totalAmount)}</span></Td>
                                        <Td>
                                            <Badge variant={o.paymentStatus === 'PAID' ? 'success' : 'warning'}>{o.paymentStatus}</Badge>
                                        </Td>
                                        <Td>
                                            <Badge variant={o.status === 'DELIVERED' ? 'success' : o.status === 'CANCELLED' ? 'error' : o.status === 'SHIPPED' ? 'brand' : 'warning'}>
                                                {o.status}
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

            {/* Detail Modal */}
            {selectedDist && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedDist(null)}>
                    <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b bg-primary-50/50 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold">{selectedDist.companyName}</h2>
                                <p className="text-xs text-slate-500">{selectedDist.user?.name} • {selectedDist.user?.email}</p>
                            </div>
                            <Badge variant={selectedDist.approvalStatus === 'APPROVED' ? 'success' : selectedDist.approvalStatus === 'REJECTED' ? 'error' : 'warning'}>
                                {selectedDist.approvalStatus}
                            </Badge>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><p className="text-xs text-slate-500">NPWP</p><p className="text-sm font-medium">{selectedDist.npwp || '-'}</p></div>
                                <div><p className="text-xs text-slate-500">Balance</p><p className="text-sm font-medium">{formatCurrency(selectedDist.balance)}</p></div>
                                <div><p className="text-xs text-slate-500">Products</p><p className="text-sm font-medium">{selectedDist.wholesaleProducts?.length || 0}</p></div>
                                <div><p className="text-xs text-slate-500">Customers</p><p className="text-sm font-medium">{selectedDist.customers?.length || 0}</p></div>
                                <div><p className="text-xs text-slate-500">Warehouses</p><p className="text-sm font-medium">{selectedDist.warehouses?.length || 0}</p></div>
                                <div><p className="text-xs text-slate-500">Joined</p><p className="text-sm font-medium">{new Date(selectedDist.createdAt).toLocaleDateString('id-ID')}</p></div>
                            </div>
                            {selectedDist.wholesaleOrders?.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold mb-2">Recent Orders</h3>
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {selectedDist.wholesaleOrders.map(o => (
                                            <div key={o.id} className="flex justify-between p-2 bg-slate-50 rounded-lg text-xs">
                                                <span>{o.orderNumber} • {o.tenant?.name}</span>
                                                <div className="flex gap-2">
                                                    <span className="font-mono">{formatCurrency(o.totalAmount)}</span>
                                                    <Badge variant={o.status === 'DELIVERED' ? 'success' : o.status === 'CANCELLED' ? 'error' : 'warning'}>{o.status}</Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 border-t flex justify-end">
                            <Button variant="outline" onClick={() => setSelectedDist(null)}>Close</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DistributorManagement;
