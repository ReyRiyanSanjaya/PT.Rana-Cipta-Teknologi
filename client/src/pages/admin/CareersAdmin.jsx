import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Briefcase, Users, FileText, CheckCircle, XCircle, 
    Clock, Search, Filter, ChevronDown, ChevronUp,
    Plus, Edit2, Trash2, ExternalLink, Save
} from 'lucide-react';
import usePageMeta from '../../hooks/usePageMeta';

const CareersAdmin = () => {
    usePageMeta({ title: 'Manajemen Karir - Admin' });
    const [activeTab, setActiveTab] = useState('applications');

    return (
        <div className="p-6 md:p-8 min-h-screen bg-[#0a0b0f] text-slate-200">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <Briefcase className="text-indigo-400" />
                            Manajemen Karir
                        </h1>
                        <p className="text-slate-400 mt-1">Kelola lowongan pekerjaan dan lamaran masuk.</p>
                    </div>
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                        <button
                            onClick={() => setActiveTab('applications')}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${activeTab === 'applications' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Lamaran Masuk
                        </button>
                        <button
                            onClick={() => setActiveTab('openings')}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${activeTab === 'openings' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Lowongan Kerja
                        </button>
                    </div>
                </div>

                {activeTab === 'applications' ? <ApplicationsTab /> : <OpeningsTab />}
            </div>
        </div>
    );
};

const ApplicationsTab = () => {
    const [apps, setApps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [selectedApp, setSelectedApp] = useState(null);

    const fetchApps = async () => {
        setLoading(true);
        try {
            const res = await api.get('/careers/applications', { params: { q, status: statusFilter !== 'ALL' ? statusFilter : undefined } });
            setApps(Array.isArray(res.data?.data) ? res.data.data : []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApps();
    }, [statusFilter]); // q is handled by search button or debounce, here simple effect

    const updateStatus = async (id, status) => {
        if (!confirm(`Ubah status menjadi ${status}?`)) return;
        try {
            await api.patch(`/careers/applications/${id}/status`, { status });
            fetchApps();
            if (selectedApp?.id === id) setSelectedApp(prev => ({ ...prev, status }));
        } catch (e) {
            alert('Gagal update status');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchApps()}
                        placeholder="Cari pelamar, posisi..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg bg-black/20 border border-white/10 text-white focus:border-indigo-500 outline-none"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 rounded-lg bg-black/20 border border-white/10 text-white focus:border-indigo-500 outline-none"
                >
                    <option value="ALL">Semua Status</option>
                    <option value="PENDING">Pending</option>
                    <option value="REVIEWED">Reviewed</option>
                    <option value="INTERVIEW">Interview</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="HIRED">Hired</option>
                </select>
                <button
                    onClick={fetchApps}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition"
                >
                    Refresh
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-slate-400">Memuat data...</div>
            ) : apps.length === 0 ? (
                <div className="text-center py-12 text-slate-400">Belum ada lamaran masuk.</div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* List */}
                    <div className="lg:col-span-1 space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
                        {apps.map(app => (
                            <div
                                key={app.id}
                                onClick={() => setSelectedApp(app)}
                                className={`p-4 rounded-xl border cursor-pointer transition ${selectedApp?.id === app.id ? 'bg-indigo-600/10 border-indigo-500/50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-white truncate">{app.name}</h3>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                        app.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-300' :
                                        app.status === 'REJECTED' ? 'bg-red-500/20 text-red-300' :
                                        app.status === 'HIRED' ? 'bg-emerald-500/20 text-emerald-300' :
                                        'bg-blue-500/20 text-blue-300'
                                    }`}>
                                        {app.status}
                                    </span>
                                </div>
                                <div className="text-xs text-slate-400 mb-1">{app.positionTitle}</div>
                                <div className="text-[10px] text-slate-500">{new Date(app.createdAt).toLocaleString()}</div>
                            </div>
                        ))}
                    </div>

                    {/* Detail */}
                    <div className="lg:col-span-2">
                        {selectedApp ? (
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 sticky top-6">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white mb-1">{selectedApp.name}</h2>
                                        <div className="text-indigo-300 font-medium">{selectedApp.positionTitle}</div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => updateStatus(selectedApp.id, 'INTERVIEW')} className="p-2 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30" title="Interview">
                                            <Users size={18} />
                                        </button>
                                        <button onClick={() => updateStatus(selectedApp.id, 'HIRED')} className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30" title="Hire">
                                            <CheckCircle size={18} />
                                        </button>
                                        <button onClick={() => updateStatus(selectedApp.id, 'REJECTED')} className="p-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30" title="Reject">
                                            <XCircle size={18} />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                    <div className="space-y-4">
                                        <div>
                                            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Kontak</div>
                                            <div className="text-white">{selectedApp.email}</div>
                                            <div className="text-slate-300">{selectedApp.phone || '-'}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Posisi</div>
                                            <div className="text-white">{selectedApp.positionTitle}</div>
                                            <div className="text-slate-300">{selectedApp.positionDept} ({selectedApp.seniority || 'Open'})</div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Lampiran</div>
                                            {selectedApp.resumeLink ? (
                                                <a href={selectedApp.resumeLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-indigo-400 hover:underline mb-1">
                                                    <ExternalLink size={14} /> Resume / CV
                                                </a>
                                            ) : <div className="text-slate-500 italic">Tidak ada resume</div>}
                                            {selectedApp.portfolioLink ? (
                                                <a href={selectedApp.portfolioLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-indigo-400 hover:underline">
                                                    <ExternalLink size={14} /> Portofolio
                                                </a>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Cover Letter</div>
                                    <div className="p-4 rounded-xl bg-black/20 border border-white/5 text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                                        {selectedApp.coverLetter || 'Tidak ada cover letter.'}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500 p-12 border border-white/10 rounded-2xl border-dashed">
                                <FileText size={48} className="mb-4 opacity-20" />
                                <p>Pilih lamaran untuk melihat detail</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const OpeningsTab = () => {
    const [openings, setOpenings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(null); // null = list, {} = create, {id...} = edit

    const fetchOpenings = async () => {
        setLoading(true);
        try {
            const res = await api.get('/system/careers/openings');
            setOpenings(Array.isArray(res.data?.data) ? res.data.data : []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOpenings();
    }, []);

    const saveOpening = async (opening) => {
        try {
            let newOpenings = [...openings];
            if (opening._id) {
                // Update
                newOpenings = newOpenings.map(o => o._id === opening._id ? opening : o);
            } else {
                // Create
                newOpenings.push({ ...opening, _id: Date.now().toString() });
            }
            
            await api.post('/admin/settings', {
                key: 'CAREERS_OPENINGS',
                value: JSON.stringify(newOpenings),
                description: 'List of career openings'
            });
            
            setOpenings(newOpenings);
            setEditing(null);
            alert('Lowongan berhasil disimpan');
        } catch (e) {
            console.error(e);
            alert('Gagal menyimpan lowongan');
        }
    };

    const deleteOpening = async (id) => {
        if (!confirm('Hapus lowongan ini?')) return;
        try {
            const newOpenings = openings.filter(o => o._id !== id);
            await api.post('/admin/settings', {
                key: 'CAREERS_OPENINGS',
                value: JSON.stringify(newOpenings),
                description: 'List of career openings'
            });
            setOpenings(newOpenings);
        } catch (e) {
            alert('Gagal menghapus lowongan');
        }
    };

    if (editing) {
        return <OpeningForm initialData={editing} onSave={saveOpening} onCancel={() => setEditing(null)} />;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <button
                    onClick={() => setEditing({})}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-lg shadow-indigo-500/20"
                >
                    <Plus size={18} /> Tambah Lowongan
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {openings.map((o) => (
                    <div key={o._id || Math.random()} className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-white/20 transition group relative">
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                            <button onClick={() => setEditing(o)} className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20"><Edit2 size={16} /></button>
                            <button onClick={() => deleteOpening(o._id)} className="p-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30"><Trash2 size={16} /></button>
                        </div>
                        <h3 className="font-bold text-lg text-white mb-1">{o.title}</h3>
                        <div className="flex flex-wrap gap-2 mb-3 text-xs text-slate-400">
                            <span className="bg-white/5 px-2 py-1 rounded border border-white/5">{o.dept}</span>
                            <span className="bg-white/5 px-2 py-1 rounded border border-white/5">{o.location}</span>
                            <span className="bg-white/5 px-2 py-1 rounded border border-white/5">{o.seniority}</span>
                        </div>
                        <p className="text-sm text-slate-400 line-clamp-2">{o.summary}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

const OpeningForm = ({ initialData, onSave, onCancel }) => {
    const [form, setForm] = useState({
        _id: initialData._id || null,
        title: initialData.title || '',
        dept: initialData.dept || '',
        location: initialData.location || '',
        seniority: initialData.seniority || '',
        tags: initialData.tags ? initialData.tags.join(', ') : '',
        summary: initialData.summary || ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            ...form,
            tags: form.tags.split(',').map(t => t.trim()).filter(Boolean)
        });
    };

    return (
        <div className="max-w-2xl mx-auto bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
            <h2 className="text-xl font-bold text-white mb-6">{form._id ? 'Edit Lowongan' : 'Tambah Lowongan Baru'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                    <label className="text-xs text-slate-400">Judul Posisi</label>
                    <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full px-4 py-2 rounded-lg bg-black/20 border border-white/10 text-white focus:border-indigo-500 outline-none" placeholder="e.g. Senior Frontend Engineer" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400">Departemen</label>
                        <input required value={form.dept} onChange={e => setForm({...form, dept: e.target.value})} className="w-full px-4 py-2 rounded-lg bg-black/20 border border-white/10 text-white focus:border-indigo-500 outline-none" placeholder="e.g. Engineering" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400">Lokasi</label>
                        <input required value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="w-full px-4 py-2 rounded-lg bg-black/20 border border-white/10 text-white focus:border-indigo-500 outline-none" placeholder="e.g. Remote / Jakarta" />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-slate-400">Seniority</label>
                    <select value={form.seniority} onChange={e => setForm({...form, seniority: e.target.value})} className="w-full px-4 py-2 rounded-lg bg-black/20 border border-white/10 text-white focus:border-indigo-500 outline-none">
                        <option value="">Pilih Level</option>
                        <option value="Intern">Intern</option>
                        <option value="Junior">Junior</option>
                        <option value="Mid">Mid</option>
                        <option value="Senior">Senior</option>
                        <option value="Lead">Lead</option>
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-slate-400">Tags (pisahkan koma)</label>
                    <input value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} className="w-full px-4 py-2 rounded-lg bg-black/20 border border-white/10 text-white focus:border-indigo-500 outline-none" placeholder="e.g. React, Node.js, SQL" />
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-slate-400">Deskripsi Singkat</label>
                    <textarea rows={5} required value={form.summary} onChange={e => setForm({...form, summary: e.target.value})} className="w-full px-4 py-2 rounded-lg bg-black/20 border border-white/10 text-white focus:border-indigo-500 outline-none" placeholder="Jelaskan tanggung jawab dan kualifikasi..." />
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                    <button type="button" onClick={onCancel} className="px-5 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition">Batal</button>
                    <button type="submit" className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition flex items-center gap-2">
                        <Save size={18} /> Simpan
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CareersAdmin;
