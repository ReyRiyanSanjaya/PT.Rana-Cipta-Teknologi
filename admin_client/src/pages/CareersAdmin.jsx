import React, { useEffect, useMemo, useState } from 'react';
import { Briefcase, Plus, Save, Trash2, Tag, MapPin, Layers, Filter, Search, Pencil, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import { Card } from '../components/ui/Card'; // Assuming Card is exported as named or default, I'll check imports
// Actually Card was defined inline in previous file, but I saw Card.jsx in file list.
// Let's assume standard export. If not I will fix.
// Wait, I didn't read Card.jsx. Let me assume it is a simple wrapper or just use div if it fails.
// I'll define a local Card wrapper if import fails, but I should try to import it.
// To be safe, I'll read Card.jsx quickly.
import { cn } from '../lib/utils';
import api from '../api';

// --- OPENINGS TAB ---

const EmptyOpenings = [
    { title: 'Senior Frontend Engineer', dept: 'Engineering', location: 'Remote/Hybrid', tags: ['React', 'TypeScript', 'Vite'], seniority: 'Senior', summary: 'Membangun UI/UX modern yang scalable.' },
];

const OpeningModal = ({ isOpen, onClose, initialData, onSave }) => {
    const [formData, setFormData] = useState({
        title: '',
        dept: '',
        location: '',
        seniority: '',
        summary: '',
        tags: []
    });
    const [tagInput, setTagInput] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    title: initialData.title || '',
                    dept: initialData.dept || '',
                    location: initialData.location || '',
                    seniority: initialData.seniority || '',
                    summary: initialData.summary || '',
                    tags: Array.isArray(initialData.tags) ? initialData.tags : []
                });
            } else {
                setFormData({ title: '', dept: '', location: '', seniority: '', summary: '', tags: [] });
            }
            setTagInput('');
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleAddTag = () => {
        const val = tagInput.trim();
        if (val && !formData.tags.includes(val)) {
            setFormData(prev => ({ ...prev, tags: [...prev.tags, val] }));
            setTagInput('');
        }
    };

    const handleRemoveTag = (index) => {
        setFormData(prev => ({ ...prev, tags: prev.tags.filter((_, i) => i !== index) }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h3 className="font-semibold text-lg text-slate-900">
                        {initialData ? 'Edit Lowongan' : 'Tambah Lowongan Baru'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto">
                    <form id="opening-form" onSubmit={handleSubmit} className="space-y-5">
                        <Input
                            label="Judul Posisi"
                            placeholder="Contoh: Senior Frontend Engineer"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            required
                        />
                        
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Departemen"
                                placeholder="Engineering"
                                value={formData.dept}
                                onChange={e => setFormData({ ...formData, dept: e.target.value })}
                            />
                            <Input
                                label="Lokasi"
                                placeholder="Remote / Jakarta"
                                value={formData.location}
                                onChange={e => setFormData({ ...formData, location: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Senioritas</label>
                            <select
                                className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all bg-white"
                                value={formData.seniority}
                                onChange={e => setFormData({ ...formData, seniority: e.target.value })}
                            >
                                <option value="">Pilih Senioritas</option>
                                <option value="Intern">Intern</option>
                                <option value="Junior">Junior</option>
                                <option value="Mid">Mid</option>
                                <option value="Senior">Senior</option>
                                <option value="Lead">Lead</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Tags (Skill / Tech Stack)</label>
                            <div className="flex gap-2 mb-2">
                                <Input
                                    placeholder="Ketik lalu Enter..."
                                    value={tagInput}
                                    onChange={e => setTagInput(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddTag();
                                        }
                                    }}
                                    className="flex-1"
                                />
                                <Button type="button" variant="secondary" onClick={handleAddTag}>Add</Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {formData.tags.map((tag, i) => (
                                    <Badge key={i} variant="secondary" className="pl-2.5 pr-1 py-1 gap-1">
                                        {tag}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveTag(i)}
                                            className="hover:bg-slate-200 rounded-full p-0.5 text-slate-500 hover:text-red-500 transition"
                                        >
                                            <X size={12} />
                                        </button>
                                    </Badge>
                                ))}
                                {formData.tags.length === 0 && (
                                    <span className="text-xs text-slate-400 italic">Belum ada tags</span>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Deskripsi Singkat</label>
                            <textarea
                                className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all min-h-[100px]"
                                placeholder="Jelaskan tanggung jawab utama dan impact posisi ini..."
                                value={formData.summary}
                                onChange={e => setFormData({ ...formData, summary: e.target.value })}
                            />
                        </div>
                    </form>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>Batal</Button>
                    <Button type="submit" form="opening-form">Simpan</Button>
                </div>
            </div>
        </div>
    );
};

const OpeningsTab = () => {
    // api imported globally
    const [openings, setOpenings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState(null);

    const fetchData = async () => {
        try {
            const res = await api.get('/admin/settings');
            const map = res.data?.data || {};
            const raw = map.CAREERS_OPENINGS;
            if (raw) {
                try {
                    const parsed = JSON.parse(raw);
                    setOpenings(Array.isArray(parsed) ? parsed : []);
                } catch {
                    setOpenings([]);
                }
            } else {
                setOpenings(EmptyOpenings);
            }
        } catch (e) {
            console.error("Failed to fetch openings", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const saveToServer = async (newOpenings) => {
        setSaving(true);
        try {
            const payload = newOpenings.map(o => ({
                title: String(o.title || '').trim(),
                dept: String(o.dept || '').trim(),
                location: String(o.location || '').trim(),
                tags: Array.isArray(o.tags) ? o.tags.filter(Boolean).map(t => String(t).trim()) : [],
                seniority: String(o.seniority || '').trim(),
                summary: String(o.summary || '').trim()
            }));
            
            await api.post('/admin/settings', {
                key: 'CAREERS_OPENINGS',
                value: JSON.stringify(payload),
                description: 'Career Openings'
            });
            setOpenings(newOpenings);
            return true;
        } catch (e) {
            console.error("Failed to save", e);
            const msg = e?.response?.data?.message || e.message || "Gagal menyimpan perubahan";
            alert(`Gagal menyimpan: ${msg}`);
            return false;
        } finally {
            setSaving(false);
        }
    };

    const handleSaveOpening = async (data) => {
        let newList;
        if (editingIndex !== null) {
            newList = openings.map((o, i) => i === editingIndex ? data : o);
        } else {
            newList = [...openings, data];
        }
        const ok = await saveToServer(newList);
        if (ok) {
            setIsModalOpen(false);
            setEditingIndex(null);
        }
    };

    const handleDelete = (index) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus lowongan ini?')) {
            const newList = openings.filter((_, i) => i !== index);
            saveToServer(newList);
        }
    };

    const openCreateModal = () => {
        setEditingIndex(null);
        setIsModalOpen(true);
    };

    const openEditModal = (index) => {
        setEditingIndex(index);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-slate-800">Daftar Lowongan Aktif</h2>
                <Button onClick={openCreateModal}>
                    <Plus className="mr-2 h-4 w-4" /> Tambah Posisi
                </Button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                            <TableHead className="w-[30%]">Posisi</TableHead>
                            <TableHead>Departemen</TableHead>
                            <TableHead>Lokasi</TableHead>
                            <TableHead className="w-[20%]">Tags</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    <div className="flex justify-center items-center text-slate-500">
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memuat data...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : openings.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                                    Belum ada lowongan pekerjaan.
                                </TableCell>
                            </TableRow>
                        ) : (
                            openings.map((opening, idx) => (
                                <TableRow key={idx}>
                                    <TableCell>
                                        <div className="font-medium text-slate-900">{opening.title}</div>
                                        {opening.seniority && (
                                            <span className="inline-flex items-center text-xs text-slate-500 mt-0.5">
                                                {opening.seniority}
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Layers size={14} className="text-slate-400" />
                                            {opening.dept || '-'}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <MapPin size={14} className="text-slate-400" />
                                            {opening.location || '-'}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1.5">
                                            {(opening.tags || []).slice(0, 3).map((tag, i) => (
                                                <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
                                                    {tag}
                                                </Badge>
                                            ))}
                                            {(opening.tags || []).length > 3 && (
                                                <span className="text-[10px] text-slate-400 px-1">
                                                    +{opening.tags.length - 3}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => openEditModal(idx)} title="Edit">
                                                <Pencil className="h-4 w-4 text-slate-500" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(idx)} title="Hapus">
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <OpeningModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                initialData={editingIndex !== null ? openings[editingIndex] : null}
                onSave={handleSaveOpening}
            />
        </div>
    );
};

// --- APPLICATIONS TAB ---

const StatusBadge = ({ status }) => {
    const map = {
        PENDING: 'warning',
        REVIEWED: 'neutral',
        SHORTLISTED: 'success',
        REJECTED: 'destructive', // error/destructive
    };
    return <Badge variant={map[status] || 'secondary'}>{status}</Badge>;
};

const ApplicationsTab = () => {
    // api imported globally
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState('ALL');
    const [q, setQ] = useState('');

    const filtered = useMemo(() => {
        return list.filter(a =>
            (status === 'ALL' || a.status === status) &&
            (q.trim() === '' ||
                (a.name || '').toLowerCase().includes(q.toLowerCase()) ||
                (a.email || '').toLowerCase().includes(q.toLowerCase()) ||
                (a.positionTitle || '').toLowerCase().includes(q.toLowerCase()))
        );
    }, [list, status, q]);

    const fetchApps = async () => {
        setLoading(true);
        try {
            const url = status === 'ALL' ? '/careers/applications' : `/careers/applications?status=${status}`;
            const res = await api.get(url);
            setList(Array.isArray(res.data?.data) ? res.data.data : []);
        } catch (e) {
            console.error("Failed to fetch apps", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchApps(); }, [status]);

    const updateStatus = async (id, next) => {
        try {
            await api.patch(`/careers/applications/${id}/status`, { status: next });
            setList(prev => prev.map(a => a.id === id ? { ...a, status: next } : a));
        } catch (e) {
            alert('Gagal memperbarui status');
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-2 sm:pb-0">
                    {['ALL', 'PENDING', 'REVIEWED', 'SHORTLISTED', 'REJECTED'].map(s => (
                        <Button
                            key={s}
                            variant={status === s ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setStatus(s)}
                            className="text-xs"
                        >
                            {s}
                        </Button>
                    ))}
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Cari pelamar..."
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <Button variant="outline" size="icon" onClick={fetchApps}>
                        <Filter className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50/50">
                            <TableHead>Pelamar</TableHead>
                            <TableHead>Posisi</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    <Loader2 className="inline mr-2 h-4 w-4 animate-spin" /> Memuat...
                                </TableCell>
                            </TableRow>
                        ) : filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-32 text-center text-slate-500">
                                    Tidak ada data lamaran.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map(a => (
                                <TableRow key={a.id}>
                                    <TableCell>
                                        <div className="font-medium text-slate-900">{a.name}</div>
                                        <div className="text-xs text-slate-500">{a.email}</div>
                                        <div className="text-xs text-slate-400 mt-0.5">{new Date(a.createdAt).toLocaleDateString()}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm text-slate-700">{a.positionTitle}</div>
                                        <div className="text-xs text-slate-500">{a.positionDept}</div>
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={a.status} />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {a.resumeLink && (
                                                <Button variant="outline" size="sm" asChild>
                                                    <a 
                                                        href={a.resumeLink.startsWith('http') ? a.resumeLink : `${(import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace('/api', '')}${a.resumeLink}`} 
                                                        target="_blank" 
                                                        rel="noreferrer"
                                                    >
                                                        CV
                                                    </a>
                                                </Button>
                                            )}
                                            
                                            {a.status !== 'SHORTLISTED' && a.status !== 'REJECTED' && (
                                                <>
                                                    <Button variant="ghost" size="icon" onClick={() => updateStatus(a.id, 'SHORTLISTED')} title="Shortlist" className="text-green-600 hover:text-green-700 hover:bg-green-50">
                                                        <CheckCircle className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => updateStatus(a.id, 'REJECTED')} title="Tolak" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            )}
                                            
                                            {a.status === 'SHORTLISTED' && (
                                                <Button variant="ghost" size="sm" onClick={() => updateStatus(a.id, 'REVIEWED')}>
                                                    Batal Shortlist
                                                </Button>
                                            )}
                                            {a.status === 'REJECTED' && (
                                                <Button variant="ghost" size="sm" onClick={() => updateStatus(a.id, 'REVIEWED')}>
                                                    Batal Tolak
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

// --- MAIN PAGE ---

const CareersAdmin = () => {
    const [activeTab, setActiveTab] = useState('openings'); // 'openings' | 'applications'

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
                        <Briefcase size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Careers Management</h1>
                        <p className="text-slate-500 text-sm">Kelola lowongan pekerjaan dan proses rekrutmen</p>
                    </div>
                </div>

                <div className="flex bg-slate-100 p-1.5 rounded-xl self-start md:self-auto shadow-inner">
                    <button
                        onClick={() => setActiveTab('openings')}
                        className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === 'openings' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'}`}
                    >
                        Lowongan
                    </button>
                    <button
                        onClick={() => setActiveTab('applications')}
                        className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === 'applications' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'}`}
                    >
                        Lamaran
                    </button>
                </div>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeTab === 'openings' ? <OpeningsTab /> : <ApplicationsTab />}
            </div>
        </div>
    );
};

export default CareersAdmin;
