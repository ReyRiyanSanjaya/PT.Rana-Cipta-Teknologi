import React, { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import DashboardLayout from '../components/layout/DashboardLayout';
import { MessageSquare, Check, X, Send, Plus, HelpCircle, Search, Filter, Paperclip, CheckCircle, FileText } from 'lucide-react';

const Card = ({ children, className }) => (
    <div className={`bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 ${className}`}>{children}</div>
);

const getStatusLabel = (status) => {
    const labels = {
        OPEN: 'TERBUKA',
        RESOLVED: 'TERSELESAIKAN',
        CLOSED: 'DITUTUP',
        IN_PROGRESS: 'DIPROSES'
    };
    return labels[status] || status;
};

const Badge = ({ children, variant }) => {
    const colors = {
        OPEN: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        RESOLVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        CLOSED: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
        IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    };
    return <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${colors[variant] || colors.CLOSED}`}>{children}</span>;
}

const Support = () => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [replyMessage, setReplyMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    // Create Modal State
    const [showCreate, setShowCreate] = useState(false);
    const [newTicket, setNewTicket] = useState({ subject: '', message: '', priority: 'NORMAL' });

    const fetchTickets = async () => {
        try {
            const res = await api.get('/tickets');
            setTickets(res.data.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, []);

    const handleSelectTicket = async (id) => {
        try {
            const res = await api.get(`/tickets/${id}`);
            setSelectedTicket(res.data.data);
        } catch (error) {
            alert("Gagal memuat tiket");
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.post('/tickets', newTicket);
            setShowCreate(false);
            setNewTicket({ subject: '', message: '', priority: 'NORMAL' });
            fetchTickets();
            alert("Tiket dibuat!");
        } catch (error) {
            alert("Gagal membuat tiket");
        }
    };

    const handleReply = async () => {
        if (!replyMessage.trim()) return;
        try {
            const res = await api.post(`/tickets/${selectedTicket.id}/reply`, { message: replyMessage });
            setReplyMessage('');
            setSelectedTicket(prev => ({
                ...prev,
                messages: [...prev.messages, res.data.data]
            }));
        } catch (error) {
            alert("Gagal mengirim balasan");
        }
    };

    const handleResolve = async () => {
        if (!selectedTicket) return;
        if (!window.confirm("Apakah Anda yakin ingin menandai tiket ini sebagai terselesaikan?")) return;
        
        try {
            // Update status via PUT endpoint
            await api.put(`/tickets/${selectedTicket.id}/status`, { status: 'RESOLVED' });
            
            // Update local state
            setSelectedTicket(prev => ({ ...prev, status: 'RESOLVED' }));
            setTickets(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, status: 'RESOLVED' } : t));
        } catch (error) {
            console.error(error);
            alert("Gagal memperbarui status tiket");
        }
    };

    const filteredTickets = useMemo(() => {
        return tickets.filter(ticket => {
            const matchesSearch = ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  ticket.id.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesFilter = statusFilter === 'ALL' || ticket.status === statusFilter;
            return matchesSearch && matchesFilter;
        });
    }, [tickets, searchQuery, statusFilter]);

    return (
        <DashboardLayout>
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Bantuan & Dukungan</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Dapatkan bantuan untuk masalah teknis atau tagihan.</p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/20"
                >
                    <Plus size={18} /> 
                    <span className="hidden sm:inline">Tiket Baru</span>
                    <span className="sm:hidden">Baru</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
                {/* LIST */}
                <Card className="lg:col-span-1 overflow-hidden flex flex-col h-full">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-3">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
                                placeholder="Cari tiket..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                            {['ALL', 'OPEN', 'RESOLVED', 'CLOSED'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                                        statusFilter === status 
                                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' 
                                            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    {status === 'ALL' ? 'Semua' : getStatusLabel(status)}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="overflow-y-auto flex-1 bg-white dark:bg-slate-900">
                        {loading ? (
                            <div className="p-8 text-center text-slate-400 dark:text-slate-500 animate-pulse">Memuat...</div>
                        ) : filteredTickets.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 dark:text-slate-500 flex flex-col items-center">
                                <HelpCircle size={40} className="mb-3 opacity-30" />
                                <p>Tidak ada tiket ditemukan.</p>
                            </div>
                        ) : filteredTickets.map(ticket => (
                            <div
                                key={ticket.id}
                                onClick={() => handleSelectTicket(ticket.id)}
                                className={`p-4 border-b border-slate-100 dark:border-slate-800/50 cursor-pointer transition group ${
                                    selectedTicket?.id === ticket.id 
                                        ? 'bg-indigo-50 dark:bg-indigo-900/10 border-l-4 border-l-indigo-500 dark:border-l-indigo-400' 
                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-l-4 border-l-transparent'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-1.5">
                                    <h4 className={`font-medium truncate pr-2 text-sm ${selectedTicket?.id === ticket.id ? 'text-indigo-900 dark:text-indigo-300' : 'text-slate-900 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'}`}>
                                        {ticket.subject}
                                    </h4>
                                    <Badge variant={ticket.status}>{getStatusLabel(ticket.status)}</Badge>
                                </div>
                                <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-500">
                                    <span className="font-mono opacity-75">#{ticket.id.substring(0, 8)}</span>
                                    <span>{new Date(ticket.updatedAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* DETAIL */}
                <Card className="lg:col-span-2 overflow-hidden flex flex-col h-full">
                    {selectedTicket ? (
                        <>
                            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                                <div>
                                    <h3 className="font-semibold text-slate-900 dark:text-white text-lg">{selectedTicket.subject}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                                            ID: {selectedTicket.id}
                                        </span>
                                        <span className="text-slate-300 dark:text-slate-700">•</span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">
                                            {new Date(selectedTicket.createdAt).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge variant={selectedTicket.status}>{getStatusLabel(selectedTicket.status)}</Badge>
                                    {selectedTicket.status === 'OPEN' && (
                                        <button 
                                            onClick={handleResolve}
                                            className="text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 p-2 rounded-lg transition"
                                            title="Tandai Selesai"
                                        >
                                            <CheckCircle size={20} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/50 dark:bg-slate-950/50">
                                {selectedTicket.messages?.map(msg => {
                                    const isMe = msg.senderType === 'MERCHANT'; // Assuming user is Merchant
                                    return (
                                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%]`}>
                                                <div className={`rounded-2xl p-4 text-sm shadow-sm ${
                                                    isMe
                                                        ? 'bg-indigo-600 text-white rounded-br-none'
                                                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-none'
                                                }`}>
                                                    <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                                                </div>
                                                <div className={`text-[10px] mt-1.5 px-1 ${isMe ? 'text-slate-400' : 'text-slate-400'}`}>
                                                    {isMe ? 'Anda' : 'Support Team'} • {new Date(msg.createdAt).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                                {selectedTicket.status === 'CLOSED' || selectedTicket.status === 'RESOLVED' ? (
                                    <div className="text-center py-2 text-slate-500 dark:text-slate-400 text-sm bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                                        Tiket ini telah ditutup. Buat tiket baru jika butuh bantuan lain.
                                    </div>
                                ) : (
                                    <div className="flex gap-2 items-end">
                                        <button 
                                            className="p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                                            onClick={() => alert("Fitur lampiran akan segera hadir!")}
                                            title="Lampirkan File"
                                        >
                                            <Paperclip size={20} />
                                        </button>
                                        <div className="flex-1 relative">
                                            <textarea
                                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-slate-900 dark:text-white placeholder:text-slate-400 resize-none"
                                                placeholder="Tulis balasan Anda..."
                                                rows={1}
                                                style={{ minHeight: '46px', maxHeight: '120px' }}
                                                value={replyMessage}
                                                onChange={e => {
                                                    setReplyMessage(e.target.value);
                                                    e.target.style.height = 'auto';
                                                    e.target.style.height = e.target.scrollHeight + 'px';
                                                }}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        handleReply();
                                                    }
                                                }}
                                            />
                                        </div>
                                        <button
                                            onClick={handleReply}
                                            disabled={!replyMessage.trim()}
                                            className="bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition shadow-lg shadow-indigo-500/20"
                                        >
                                            <Send size={20} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                <MessageSquare size={32} className="opacity-50" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-200">Belum ada tiket dipilih</h3>
                            <p className="mt-1">Pilih tiket dari daftar untuk melihat percakapan</p>
                        </div>
                    )}
                </Card>
            </div>

            {/* CREATE MODAL */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md p-0 animate-in zoom-in-95 duration-200 border-0 shadow-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Tiket Dukungan Baru</h2>
                            <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Subjek</label>
                                <input
                                    required
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
                                    placeholder="misal, Masalah pembayaran"
                                    value={newTicket.subject}
                                    onChange={e => setNewTicket({ ...newTicket, subject: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Prioritas</label>
                                <select
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
                                    value={newTicket.priority}
                                    onChange={e => setNewTicket({ ...newTicket, priority: e.target.value })}
                                >
                                    <option value="NORMAL">Normal</option>
                                    <option value="HIGH">Tinggi</option>
                                    <option value="URGENT">Mendesak</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Pesan</label>
                                <textarea
                                    required
                                    rows={5}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white placeholder:text-slate-400 resize-none"
                                    placeholder="Jelaskan masalah Anda secara detail..."
                                    value={newTicket.message}
                                    onChange={e => setNewTicket({ ...newTicket, message: e.target.value })}
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button 
                                    type="button" 
                                    onClick={() => setShowCreate(false)} 
                                    className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition text-sm font-medium"
                                >
                                    Batal
                                </button>
                                <button 
                                    type="submit" 
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/20 text-sm font-medium"
                                >
                                    Kirim Tiket
                                </button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </DashboardLayout>
    );
};

export default Support;
