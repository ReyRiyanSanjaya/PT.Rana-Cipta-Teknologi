import React, { useEffect, useState } from 'react';
import api from '../api';
import { Table, Thead, Tbody, Th, Td, Tr } from '../components/ui/Table';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import { Plus, Trash, Check, Edit, Package, RefreshCw } from 'lucide-react';

const Packages = () => {
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showInactive, setShowInactive] = useState(false);

    // Form State
    const [form, setForm] = useState({ name: '', price: '', durationDays: 30, description: '' });
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const fetchPackages = async () => {
        try {
            const res = await api.get('/admin/packages');
            setPackages(res.data.data || []);
        } catch (error) {
            console.error("Failed to fetch packages", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPackages();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = {
                name: form.name,
                price: parseFloat(form.price) || 0,
                durationDays: parseInt(form.durationDays) || 30,
                description: form.description || ''
            };
            if (isEditing) {
                await api.put(`/admin/packages/${editId}`, payload);
                alert("Package updated successfully");
            } else {
                await api.post('/admin/packages', payload);
                alert("Package created successfully");
            }
            setShowModal(false);
            setForm({ name: '', price: '', durationDays: 30, description: '' });
            setIsEditing(false);
            setEditId(null);
            fetchPackages();
        } catch (error) {
            alert(error.response?.data?.message || (isEditing ? "Failed to update package" : "Failed to create package"));
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (pkg) => {
        setForm({
            name: pkg.name || '',
            price: pkg.price || '',
            durationDays: pkg.durationDays || 30,
            description: pkg.description || ''
        });
        setIsEditing(true);
        setEditId(pkg.id);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this package? It will be deactivated and hidden from merchants.")) return;
        try {
            await api.delete(`/admin/packages/${id}`);
            fetchPackages();
        } catch (error) {
            alert(error.response?.data?.message || "Failed to delete package");
        }
    };

    const openCreateModal = () => {
        setForm({ name: '', price: '', durationDays: 30, description: '' });
        setIsEditing(false);
        setEditId(null);
        setShowModal(true);
    };

    const formatCurrency = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">Subscription Packages</h1>
                        <p className="text-slate-500 mt-1">Manage subscription plans available for merchants.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" icon={RefreshCw} onClick={fetchPackages} isLoading={loading}>
                            Refresh
                        </Button>
                        <Button icon={Plus} onClick={openCreateModal}>New Package</Button>
                    </div>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="p-4 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <Package size={18} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium">Total Packages</p>
                            <p className="text-lg font-bold text-slate-900">{packages.length}</p>
                        </div>
                    </Card>
                    <Card className="p-4 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Check size={18} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium">Active</p>
                            <p className="text-lg font-bold text-slate-900">{packages.filter(p => p.isActive !== false).length}</p>
                        </div>
                    </Card>
                    <Card className="p-4 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                            <Package size={18} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium">Price Range</p>
                            <p className="text-sm font-bold text-slate-900">
                                {packages.length > 0 ? `${formatCurrency(Math.min(...packages.map(p => p.price)))} - ${formatCurrency(Math.max(...packages.map(p => p.price)))}` : '-'}
                            </p>
                        </div>
                    </Card>
                </div>

                <Card className="overflow-hidden border border-slate-200 shadow-sm">
                <Table>
                    <Thead>
                        <Tr>
                            <Th>Package Name</Th>
                            <Th>Price</Th>
                            <Th>Duration</Th>
                            <Th>Description</Th>
                            <Th>Status</Th>
                            <Th>Actions</Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                        {loading ? (
                            <Tr>
                                <Td colSpan="6" className="text-center py-12 text-slate-400">Loading...</Td>
                            </Tr>
                        ) : packages.length === 0 ? (
                            <Tr>
                                <Td colSpan="6" className="text-center py-12 text-slate-400">No active packages found.</Td>
                            </Tr>
                        ) : packages.map((p) => (
                            <Tr key={p.id}>
                                <Td><span className="font-semibold text-slate-900">{p.name}</span></Td>
                                <Td><span className="font-mono font-medium text-slate-700">{formatCurrency(p.price)}</span></Td>
                                <Td>{p.durationDays} Days</Td>
                                <Td><span className="text-slate-500 text-sm truncate max-w-xs block">{p.description || '-'}</span></Td>
                                <Td>
                                    <Badge variant={p.isActive !== false ? 'success' : 'neutral'}>
                                        {p.isActive !== false ? 'Active' : 'Inactive'}
                                    </Badge>
                                </Td>
                                <Td>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="icon" onClick={() => handleEdit(p)} title="Edit">
                                            <Edit size={16} />
                                        </Button>
                                        <Button variant="outline" size="icon" onClick={() => handleDelete(p.id)} className="text-red-600 border-red-200 hover:bg-red-50" title="Delete">
                                            <Trash size={16} />
                                        </Button>
                                    </div>
                                </Td>
                            </Tr>
                        ))}
                    </Tbody>
                </Table>
            </Card>
            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => !submitting && setShowModal(false)}>
                    <Card className="w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-xl font-bold mb-4">{isEditing ? 'Edit Package' : 'Create New Package'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Package Name</label>
                                <Input required placeholder="e.g. Pro Plan" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Price (IDR)</label>
                                    <Input required type="number" placeholder="50000" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Duration (Days)</label>
                                    <Input required type="number" value={form.durationDays} onChange={e => setForm({ ...form, durationDays: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Benefit Description</label>
                                <textarea
                                    className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                    rows="3"
                                    placeholder="List benefits..."
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                ></textarea>
                            </div>
                            <div className="flex justify-end space-x-3 pt-4">
                                <Button type="button" variant="outline" onClick={() => setShowModal(false)} disabled={submitting}>Cancel</Button>
                                <Button type="submit" isLoading={submitting} disabled={submitting}>{isEditing ? 'Update Package' : 'Create Package'}</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default Packages;
