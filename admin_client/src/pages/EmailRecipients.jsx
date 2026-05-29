import React, { useEffect, useState, useCallback } from 'react';
import api from '../api';
import { Table, Thead, Tbody, Th, Td, Tr } from '../components/ui/Table';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import {
    Mail, Users, Search, RefreshCw, Plus, Trash2, Upload, Download,
    ChevronLeft, ChevronRight, Tag, Filter, Zap, UserPlus
} from 'lucide-react';

const CATEGORIES = ['GENERAL', 'MERCHANT', 'BUYER', 'DRIVER', 'DISTRIBUTOR', 'LEAD'];
const CAT_COLORS = { MERCHANT: 'success', BUYER: 'brand', DRIVER: 'warning', DISTRIBUTOR: 'neutral', LEAD: 'secondary', GENERAL: 'neutral' };

const EmailRecipients = () => {
    const [recipients, setRecipients] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [addForm, setAddForm] = useState({ email: '', name: '', category: 'GENERAL', tags: '' });
    const [importText, setImportText] = useState('');
    const [importCategory, setImportCategory] = useState('GENERAL');
    const [syncing, setSyncing] = useState(false);

    const fetchRecipients = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page, limit: 25 };
            if (search) params.search = search;
            if (categoryFilter) params.category = categoryFilter;
            const res = await api.get('/admin/email-recipients', { params });
            setRecipients(res.data.data?.recipients || []);
            setTotal(res.data.data?.total || 0);
            setTotalPages(res.data.data?.totalPages || 1);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [page, search, categoryFilter]);

    const fetchStats = async () => {
        try { const res = await api.get('/admin/email-recipients/stats'); setStats(res.data.data); }
        catch (e) { console.error(e); }
    };

    useEffect(() => { fetchStats(); }, []);
    useEffect(() => { const t = setTimeout(fetchRecipients, 300); return () => clearTimeout(t); }, [fetchRecipients]);

    const handleAdd = async () => {
        if (!addForm.email) return alert('Email required');
        try {
            await api.post('/admin/email-recipients', {
                ...addForm,
                tags: addForm.tags ? addForm.tags.split(',').map(t => t.trim()) : []
            });
            setShowAddModal(false);
            setAddForm({ email: '', name: '', category: 'GENERAL', tags: '' });
            fetchRecipients(); fetchStats();
        } catch (e) { alert(e.response?.data?.message || 'Failed to add'); }
    };

    const handleImport = async () => {
        const lines = importText.split('\n').filter(l => l.trim());
        const recipients = lines.map(l => {
            const parts = l.split(',');
            return { email: parts[0]?.trim(), name: parts[1]?.trim() || null };
        });
        if (recipients.length === 0) return alert('No valid emails');
        try {
            const res = await api.post('/admin/email-recipients/import', { recipients, category: importCategory });
            alert(`Imported: ${res.data.data.imported}, Skipped: ${res.data.data.skipped}`);
            setShowImportModal(false); setImportText('');
            fetchRecipients(); fetchStats();
        } catch (e) { alert('Import failed'); }
    };

    const handleSync = async () => {
        setSyncing(true);
        try {
            const res = await api.post('/admin/email-recipients/sync');
            alert(`Synced ${res.data.data.synced} recipients from user database`);
            fetchRecipients(); fetchStats();
        } catch (e) { alert('Sync failed'); }
        finally { setSyncing(false); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Remove this recipient?')) return;
        try { await api.delete(`/admin/email-recipients/${id}`); fetchRecipients(); fetchStats(); }
        catch (e) { alert('Failed'); }
    };

    const exportCsv = () => {
        const rows = recipients.map(r => `${r.email},${r.name || ''},${r.category},${(r.tags||[]).join(';')}`);
        const csv = 'email,name,category,tags\n' + rows.join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'email_recipients.csv'; a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Email Recipients</h1>
                    <p className="text-slate-500 mt-1">Manage email lists, categories, and recipient segments for campaigns.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" icon={Zap} onClick={handleSync} isLoading={syncing}>Sync Users</Button>
                    <Button variant="outline" icon={Upload} onClick={() => setShowImportModal(true)}>Import</Button>
                    <Button icon={Plus} onClick={() => setShowAddModal(true)}>Add Recipient</Button>
                </div>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Card className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center"><Mail size={18} /></div>
                        <div><p className="text-xs text-slate-500">Total</p><p className="text-xl font-bold">{stats.total}</p></div>
                    </Card>
                    <Card className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><Users size={18} /></div>
                        <div><p className="text-xs text-slate-500">Active</p><p className="text-xl font-bold text-emerald-700">{stats.active}</p></div>
                    </Card>
                    <Card className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><Tag size={18} /></div>
                        <div><p className="text-xs text-slate-500">Tags</p><p className="text-xl font-bold">{stats.tags?.length || 0}</p></div>
                    </Card>
                    <Card className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center"><Mail size={18} /></div>
                        <div><p className="text-xs text-slate-500">Unsubscribed</p><p className="text-xl font-bold text-rose-600">{stats.unsubscribed}</p></div>
                    </Card>
                </div>
            )}

            {/* Category Breakdown */}
            {stats?.categories && (
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => { setCategoryFilter(''); setPage(1); }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${!categoryFilter ? 'bg-primary-50 text-primary-700 border-primary-200' : 'bg-white text-slate-600 border-slate-200 hover:border-primary-200'}`}>
                        All ({stats.total})
                    </button>
                    {stats.categories.map(c => (
                        <button key={c.category} onClick={() => { setCategoryFilter(c.category); setPage(1); }}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${categoryFilter === c.category ? 'bg-primary-50 text-primary-700 border-primary-200' : 'bg-white text-slate-600 border-slate-200 hover:border-primary-200'}`}>
                            {c.category} ({c.count})
                        </button>
                    ))}
                </div>
            )}

            {/* Search & Table */}
            <Card className="p-4">
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                    <div className="relative flex-1 w-full sm:max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input type="text" placeholder="Search email or name..."
                            className="pl-10 pr-4 py-2 w-full border border-emerald-200/80 rounded-xl focus:ring-2 focus:ring-primary-200 outline-none text-sm"
                            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                    </div>
                    <Button variant="outline" size="sm" icon={Download} onClick={exportCsv}>Export CSV</Button>
                    <span className="text-sm text-slate-500">{total} recipients</span>
                </div>
            </Card>

            <Card className="overflow-hidden">
                <Table>
                    <Thead><Tr><Th>Email</Th><Th>Name</Th><Th>Category</Th><Th>Tags</Th><Th>Source</Th><Th className="text-right">Actions</Th></Tr></Thead>
                    <Tbody>
                        {loading ? (
                            <Tr><Td colSpan="6" className="text-center py-12 text-slate-400">Loading...</Td></Tr>
                        ) : recipients.length === 0 ? (
                            <Tr><Td colSpan="6" className="text-center py-12 text-slate-400">No recipients found. Add manually or sync from users.</Td></Tr>
                        ) : recipients.map(r => (
                            <Tr key={r.id}>
                                <Td><span className="text-sm font-medium text-slate-900">{r.email}</span></Td>
                                <Td><span className="text-sm text-slate-600">{r.name || '-'}</span></Td>
                                <Td><Badge variant={CAT_COLORS[r.category] || 'neutral'}>{r.category}</Badge></Td>
                                <Td>
                                    <div className="flex flex-wrap gap-1">
                                        {(r.tags || []).slice(0, 3).map((t, i) => (
                                            <span key={i} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">{t}</span>
                                        ))}
                                        {(r.tags || []).length > 3 && <span className="text-[10px] text-slate-400">+{r.tags.length - 3}</span>}
                                    </div>
                                </Td>
                                <Td><span className="text-xs text-slate-500">{r.source || '-'}</span></Td>
                                <Td className="text-right">
                                    <Button variant="outline" size="sm" onClick={() => handleDelete(r.id)} className="text-rose-500 border-rose-200 hover:bg-rose-50">
                                        <Trash2 size={14} />
                                    </Button>
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

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
                    <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-semibold mb-4">Add Recipient</h2>
                        <div className="space-y-3">
                            <Input placeholder="email@example.com" value={addForm.email} onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))} />
                            <Input placeholder="Name (optional)" value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} />
                            <select className="w-full border border-emerald-200/80 rounded-xl p-2.5 text-sm bg-white"
                                value={addForm.category} onChange={e => setAddForm(p => ({ ...p, category: e.target.value }))}>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <Input placeholder="Tags (comma separated)" value={addForm.tags} onChange={e => setAddForm(p => ({ ...p, tags: e.target.value }))} />
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
                            <Button onClick={handleAdd}>Add</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowImportModal(false)}>
                    <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-semibold mb-2">Bulk Import</h2>
                        <p className="text-xs text-slate-500 mb-4">Paste emails, one per line. Format: email,name (name optional)</p>
                        <select className="w-full border border-emerald-200/80 rounded-xl p-2.5 text-sm bg-white mb-3"
                            value={importCategory} onChange={e => setImportCategory(e.target.value)}>
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <textarea className="w-full border border-emerald-200/80 rounded-xl p-3 text-sm h-40 font-mono"
                            placeholder="john@example.com,John Doe&#10;jane@example.com,Jane&#10;test@email.com"
                            value={importText} onChange={e => setImportText(e.target.value)} />
                        <div className="flex justify-end gap-2 mt-4">
                            <Button variant="outline" onClick={() => setShowImportModal(false)}>Cancel</Button>
                            <Button onClick={handleImport} icon={Upload}>Import {importText.split('\n').filter(l => l.trim()).length} emails</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmailRecipients;
