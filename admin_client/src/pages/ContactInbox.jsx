import React, { useEffect, useState } from 'react';
import api from '../api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/ui/Table';
import { Mail, Eye, CheckCircle, Archive, Trash2, RefreshCw } from 'lucide-react';

const ContactInbox = () => {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMessage, setSelectedMessage] = useState(null);

    useEffect(() => {
        fetchMessages();
    }, []);

    const fetchMessages = async () => {
        setLoading(true);
        try {
            const res = await api.get('/contact/messages');
            setMessages(res.data?.data || []);
        } catch (error) {
            console.error("Failed to fetch messages", error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id, status) => {
        try {
            await api.patch(`/contact/messages/${id}/status`, { status });
            // Update local state
            setMessages(prev => prev.map(msg => 
                msg.id === id ? { ...msg, status } : msg
            ));
            if (selectedMessage && selectedMessage.id === id) {
                setSelectedMessage(prev => ({ ...prev, status }));
            }
        } catch (error) {
            console.error("Failed to update status", error);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'UNREAD': return <Badge variant="danger">Unread</Badge>;
            case 'READ': return <Badge variant="success">Read</Badge>;
            case 'ARCHIVED': return <Badge variant="secondary">Archived</Badge>;
            default: return <Badge>{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Inbox Pesan</h1>
                    <p className="text-slate-500">Kelola pesan masuk dari form kontak website.</p>
                </div>
                <Button variant="outline" onClick={fetchMessages}><RefreshCw size={16} className="mr-2" /> Refresh</Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* List Section */}
                <div className="lg:col-span-2">
                    <Card className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <Table>
                                <Thead>
                                    <Tr>
                                        <Th>Tanggal</Th>
                                        <Th>Pengirim</Th>
                                        <Th>Subjek</Th>
                                        <Th>Status</Th>
                                        <Th>Aksi</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {loading ? (
                                        <Tr><Td colSpan={5} className="text-center py-8">Loading...</Td></Tr>
                                    ) : messages.length === 0 ? (
                                        <Tr><Td colSpan={5} className="text-center py-8">Tidak ada pesan.</Td></Tr>
                                    ) : (
                                        messages.map(msg => (
                                            <Tr key={msg.id} className={selectedMessage?.id === msg.id ? 'bg-indigo-50/50' : ''}>
                                                <Td className="whitespace-nowrap text-sm text-slate-500">
                                                    {new Date(msg.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                </Td>
                                                <Td>
                                                    <div className="font-medium text-slate-900">{msg.name}</div>
                                                    <div className="text-xs text-slate-500">{msg.email}</div>
                                                </Td>
                                                <Td className="max-w-[200px] truncate" title={msg.subject}>{msg.subject}</Td>
                                                <Td>{getStatusBadge(msg.status)}</Td>
                                                <Td>
                                                    <Button size="sm" variant="ghost" onClick={() => setSelectedMessage(msg)}>
                                                        <Eye size={16} className="text-indigo-600" />
                                                    </Button>
                                                </Td>
                                            </Tr>
                                        ))
                                    )}
                                </Tbody>
                            </Table>
                        </div>
                    </Card>
                </div>

                {/* Detail Section */}
                <div className="lg:col-span-1">
                    <Card className="h-full p-6 sticky top-6">
                        {selectedMessage ? (
                            <div className="space-y-6">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-lg font-bold text-slate-900">Detail Pesan</h3>
                                    <div className="flex gap-2">
                                        {selectedMessage.status === 'UNREAD' && (
                                            <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(selectedMessage.id, 'READ')} title="Tandai Dibaca">
                                                <CheckCircle size={16} />
                                            </Button>
                                        )}
                                        {selectedMessage.status !== 'ARCHIVED' && (
                                            <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(selectedMessage.id, 'ARCHIVED')} title="Arsipkan">
                                                <Archive size={16} />
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                                        <div>
                                            <label className="text-xs font-medium text-slate-500 uppercase">Pengirim</label>
                                            <p className="text-sm font-semibold text-slate-900">{selectedMessage.name}</p>
                                            <p className="text-sm text-slate-600">{selectedMessage.email}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-slate-500 uppercase">Waktu</label>
                                            <p className="text-sm text-slate-900">{new Date(selectedMessage.createdAt).toLocaleString('id-ID')}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-slate-500 uppercase">Status</label>
                                            <div className="mt-1">{getStatusBadge(selectedMessage.status)}</div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-medium text-slate-500 uppercase mb-2 block">Subjek</label>
                                        <p className="text-base font-semibold text-slate-900">{selectedMessage.subject || 'Tanpa Subjek'}</p>
                                    </div>

                                    <div>
                                        <label className="text-xs font-medium text-slate-500 uppercase mb-2 block">Pesan</label>
                                        <div className="p-4 border border-slate-200 rounded-lg bg-white text-slate-800 text-sm leading-relaxed whitespace-pre-wrap min-h-[150px]">
                                            {selectedMessage.message}
                                        </div>
                                    </div>
                                    
                                    <div className="pt-4 border-t border-slate-100">
                                        <a href={`mailto:${selectedMessage.email}?subject=Re: ${selectedMessage.subject}`} className="block w-full">
                                            <Button className="w-full">
                                                <Mail size={16} className="mr-2" /> Balas via Email
                                            </Button>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-8">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                    <Mail size={32} className="text-slate-300" />
                                </div>
                                <p className="font-medium">Pilih pesan untuk melihat detail</p>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default ContactInbox;
