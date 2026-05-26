import React, { useEffect, useState } from 'react';
import api from '../api';
import { Button } from '../components/ui/Button';
import Input from '../components/ui/Input';
import { MessageSquare, Plus, Trash, Pencil, Users, Tag, X, Send, MoreVertical, Search, Filter, CheckSquare, Square, Megaphone } from 'lucide-react';
import { cn } from '../lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '../components/ui/dropdown-menu';
import { initSocket } from '../lib/socket';

const ChatRooms = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'public', icon: '', topicId: '' });
  const [editing, setEditing] = useState(null);
  
  // Topic State
  const [topics, setTopics] = useState([]);
  const [topicModal, setTopicModal] = useState(false);
  const [topicForm, setTopicForm] = useState({ name: '' });
  const [editingTopic, setEditingTopic] = useState(null);

  const [membersModal, setMembersModal] = useState(null);
  const [members, setMembers] = useState([]);
  const [newMemberId, setNewMemberId] = useState('');
  const [messages, setMessages] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [sendContent, setSendContent] = useState('');
  const [sending, setSending] = useState(false);
  const [broadcastContent, setBroadcastContent] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  const [selectedRooms, setSelectedRooms] = useState(new Set());
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState([]);

  const loadRooms = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/chat/rooms');
      setRooms(res.data);
      if (!activeRoomId && res.data?.length) {
        setActiveRoomId(res.data[0].id);
        await loadMessages(res.data[0].id);
      }
    } catch (e) {
      console.error("Failed to load rooms", e);
      // Optional: Add UI feedback for error, e.g. toast or alert
      // alert("Gagal memuat room chat. Silakan coba lagi nanti.");
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (roomId) => {
    try {
        const res = await api.get(`/admin/chat/rooms/${roomId}/members`);
        setMembers(res.data || []);
    } catch (e) {
        console.error("Failed to load members", e);
        setMembers([]);
    }
  };

  const loadMessages = async (roomId) => {
    try {
        const res = await api.get(`/admin/chat/rooms/${roomId}/messages`);
        setMessages(res.data || []);
    } catch (e) {
        console.error("Failed to load messages", e);
        setMessages([]);
    }
  };

  const loadTopics = async () => {
    try {
        const res = await api.get('/admin/chat/topics');
        setTopics(res.data || []);
    } catch (e) {
        console.warn("API topics unavailable, using local storage fallback", e);
        const localTopics = JSON.parse(localStorage.getItem('chat_topics') || '[]');
        setTopics(localTopics);
    }
  };

  const handleCreateTopic = async () => {
    if (!topicForm.name.trim()) return;
    try {
        await api.post('/admin/chat/topics', topicForm);
        setTopicForm({ name: '' });
        await loadTopics();
    } catch (e) {
        console.warn("API create topic failed, using local storage fallback", e);
        // Fallback to local storage
        const newTopic = { 
            id: Date.now().toString(), 
            name: topicForm.name,
            createdAt: new Date().toISOString()
        };
        const localTopics = JSON.parse(localStorage.getItem('chat_topics') || '[]');
        const updatedTopics = [...localTopics, newTopic];
        localStorage.setItem('chat_topics', JSON.stringify(updatedTopics));
        
        setTopicForm({ name: '' });
        setTopics(updatedTopics);
    }
  };

  const handleUpdateTopic = async () => {
    if (!editingTopic || !editingTopic.name.trim()) return;
    try {
        await api.put(`/admin/chat/topics/${editingTopic.id}`, { name: editingTopic.name });
        setEditingTopic(null);
        await loadTopics();
    } catch (e) {
        console.warn("API update topic failed, using local storage fallback", e);
        const localTopics = JSON.parse(localStorage.getItem('chat_topics') || '[]');
        const updatedTopics = localTopics.map(t => 
            t.id === editingTopic.id ? { ...t, name: editingTopic.name } : t
        );
        localStorage.setItem('chat_topics', JSON.stringify(updatedTopics));
        
        setEditingTopic(null);
        setTopics(updatedTopics);
    }
  };

  const handleDeleteTopic = async (id) => {
    if (!confirm('Hapus topik ini?')) return;
    try {
        await api.delete(`/admin/chat/topics/${id}`);
        await loadTopics();
    } catch (e) {
        console.warn("API delete topic failed, using local storage fallback", e);
        const localTopics = JSON.parse(localStorage.getItem('chat_topics') || '[]');
        const updatedTopics = localTopics.filter(t => t.id !== id);
        localStorage.setItem('chat_topics', JSON.stringify(updatedTopics));
        
        setTopics(updatedTopics);
    }
  };

  useEffect(() => {
    loadRooms();
    loadTopics();
  }, []);

  // Realtime Chat Integration
  useEffect(() => {
    const socket = initSocket();
    if (!socket) return;

    // Join room for realtime updates
    if (activeRoomId) {
        socket.emit('join-room', activeRoomId);
    }

    const onMessage = (newMessage) => {
        // Only append if message belongs to current active room
        // and we don't already have it (deduplication)
        if (newMessage.roomId == activeRoomId) {
            setMessages(prev => {
                if (prev.some(m => m.id === newMessage.id)) return prev;
                return [...prev, newMessage];
            });
        }
    };

    socket.on('message:created', onMessage);
    // Fallback event name
    socket.on('message', onMessage);

    return () => {
        socket.off('message:created', onMessage);
        socket.off('message', onMessage);
        if (activeRoomId) {
            socket.emit('leave-room', activeRoomId);
        }
    };
  }, [activeRoomId]);

  const handleSaveRoom = async () => {
    if (!editing) return;
    if (!editing.name.trim()) return;
    
    setCreating(true);
    try {
        if (editing.id) {
            // Update
            const { id, name, type, icon, topicId } = editing;
            await api.put(`/admin/chat/rooms/${id}`, { name, type, icon, topicId });
        } else {
            // Create
            const { name, type, icon, topicId } = editing;
            await api.post('/admin/chat/rooms', { name, type, icon, topicId });
        }
        setEditing(null);
        await loadRooms();
    } catch (e) {
        console.error("Failed to save room", e);
        alert("Gagal menyimpan room: " + (e.response?.data?.message || e.message));
    } finally {
        setCreating(false);
    }
  };

  const onDelete = async (id) => {
    if (!confirm('Hapus room ini beserta semua pesan dan anggota?')) return;
    try {
        await api.delete(`/admin/chat/rooms/${id}`);
        if (activeRoomId === id) {
            setActiveRoomId(null);
            setMessages([]);
        }
        await loadRooms();
    } catch (e) {
        console.error("Failed to delete room", e);
        alert("Gagal menghapus room: " + (e.response?.data?.message || e.message));
    }
  };

  const openMembers = async (room) => {
    setMembersModal(room);
    await loadMembers(room.id);
  };

  const addMember = async () => {
    if (!newMemberId.trim()) return;
    try {
        await api.post(`/admin/chat/rooms/${membersModal.id}/members`, { userId: newMemberId.trim() });
        setNewMemberId('');
        await loadMembers(membersModal.id);
    } catch (e) {
        console.error("Failed to add member", e);
        alert("Gagal menambahkan anggota: " + (e.response?.data?.message || e.message));
    }
  };

  const removeMember = async (userId) => {
    if (!confirm('Hapus anggota ini dari room?')) return;
    try {
        await api.delete(`/admin/chat/rooms/${membersModal.id}/members/${userId}`);
        await loadMembers(membersModal.id);
    } catch (e) {
        console.error("Failed to remove member", e);
        alert("Gagal menghapus anggota: " + (e.response?.data?.message || e.message));
    }
  };

  const toggleSelectRoom = (id) => {
    setSelectedRooms(prev => {
      const next = new Set([...prev]);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = (checked) => {
    if (checked) {
        setSelectedRooms(new Set(rooms.map(r => r.id)));
    } else {
        setSelectedRooms(new Set());
    }
  };

  const handleSelectByType = (type) => {
    const filtered = rooms.filter(r => r.type === type).map(r => r.id);
    setSelectedRooms(new Set(filtered));
  };

  const handleSelectByTopic = (topicId) => {
    const filtered = rooms.filter(r => r.topicId == topicId).map(r => r.id);
    setSelectedRooms(new Set(filtered));
  };

  const sendMessage = async () => {
    if (!activeRoomId || !sendContent.trim()) return;
    setSending(true);
    try {
      const res = await api.post(`/admin/chat/rooms/${activeRoomId}/messages`, { content: sendContent.trim() });
      setMessages(prev => [...prev, res.data]);
      setSendContent('');
    } catch (e) {
        console.error("Failed to send message", e);
        alert("Gagal mengirim pesan: " + (e.response?.data?.message || e.message));
    } finally {
      setSending(false);
    }
  };

  const broadcast = async () => {
    if (!broadcastContent.trim() || selectedRooms.size === 0) return;
    
    const targetRoomIds = Array.from(selectedRooms);
    if (!confirm(`Kirim pesan ke ${targetRoomIds.length} room terpilih?`)) return;

    setBroadcasting(true);
    let successCount = 0;
    let failCount = 0;

    try {
      // Try bulk endpoint first
      await api.post('/admin/chat/broadcasts', { roomIds: targetRoomIds, content: broadcastContent.trim() });
      
      alert(`Berhasil mengirim broadcast ke ${targetRoomIds.length} room.`);
      setBroadcastContent('');
      setSelectedRooms(new Set());
      if (activeRoomId && selectedRooms.has(activeRoomId)) {
        await loadMessages(activeRoomId);
      }
    } catch (e) {
        console.warn("Broadcast bulk endpoint failed, attempting individual sends...", e);
        
        // Fallback: Send individually
        for (const roomId of targetRoomIds) {
            try {
                await api.post(`/admin/chat/rooms/${roomId}/messages`, { content: broadcastContent.trim() });
                successCount++;
            } catch (err) {
                console.error(`Failed to send to room ${roomId}`, err);
                failCount++;
            }
        }

        if (successCount > 0) {
            alert(`Broadcast selesai.\nSukses: ${successCount}\nGagal: ${failCount}`);
            setBroadcastContent('');
            setSelectedRooms(new Set());
            if (activeRoomId && selectedRooms.has(activeRoomId)) {
                await loadMessages(activeRoomId);
            }
        } else {
             alert(`Gagal mengirim broadcast.\nError: ${e.response?.data?.message || e.message}`);
        }
    } finally {
        setBroadcasting(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(async () => {
      if (userQuery.trim().length < 2) {
        setUserResults([]);
        return;
      }
      try {
        const res = await api.get(`/admin/search?q=${encodeURIComponent(userQuery.trim())}`);
        const list = Array.isArray(res.data?.data?.users) ? res.data.data.users : [];
        setUserResults(list);
      } catch {
        setUserResults([]);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [userQuery]);

  return (
    <div className="h-[calc(100vh-65px)] p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Chat Rooms</h2>
          <p className="text-sm text-slate-500">Kelola komunitas dan interaksi pengguna.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => setTopicModal(true)}>
                <Tag className="h-4 w-4 mr-2" />
                Kelola Topik
            </Button>
            <Button onClick={() => setEditing({ id: null, name: '', type: 'public', icon: '', topicId: '' })}>
                <Plus className="h-4 w-4 mr-2" />
                Buat Room
            </Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
        {/* Room List Sidebar */}
        <div className="col-span-12 lg:col-span-4 xl:col-span-3 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 space-y-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                        placeholder="Cari room..." 
                        className="pl-9 bg-slate-50 border-transparent focus:bg-white transition-all" 
                    />
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50">
                                    {selectedRooms.size === rooms.length && rooms.length > 0 ? (
                                        <CheckSquare className="h-4 w-4 mr-2 text-indigo-600" />
                                    ) : selectedRooms.size > 0 ? (
                                        <div className="h-4 w-4 mr-2 flex items-center justify-center">
                                            <div className="h-2 w-2 bg-indigo-600 rounded-sm" />
                                        </div>
                                    ) : (
                                        <Square className="h-4 w-4 mr-2 text-slate-400" />
                                    )}
                                    <span className="text-xs font-medium">Pilih</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-48">
                                <DropdownMenuLabel>Opsi Seleksi</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleSelectAll(true)}>
                                    Semua Room
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleSelectAll(false)}>
                                    Kosongkan Seleksi
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel>Berdasarkan Tipe</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleSelectByType('public')}>
                                    Hanya Public
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleSelectByType('private')}>
                                    Hanya Private
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel>Berdasarkan Topik</DropdownMenuLabel>
                                {topics.map(t => (
                                    <DropdownMenuItem key={t.id} onClick={() => handleSelectByTopic(t.id)}>
                                        Topik: {t.name}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <span className="text-xs text-slate-500 font-medium">{rooms.length} Rooms</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mb-2"></div>
                    <span className="text-xs">Memuat room...</span>
                </div>
              ) : rooms.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-400 p-6 text-center">
                    <MessageSquare className="h-8 w-8 mb-2 opacity-20" />
                    <span className="text-sm">Belum ada room chat</span>
                </div>
              ) : rooms.map((r) => {
                const topicName = topics.find(t => t.id == r.topicId)?.name;
                const isSelected = selectedRooms.has(r.id);
                const isActive = activeRoomId === r.id;
                
                return (
                <div 
                    key={r.id} 
                    className={cn(
                        "group relative p-4 flex gap-3 hover:bg-slate-50 transition-all cursor-pointer border-l-4 border-transparent",
                        isActive && "bg-indigo-50/60 border-indigo-500"
                    )}
                    onClick={() => { setActiveRoomId(r.id); loadMessages(r.id); }}
                >
                  {/* Selection Overlay for hover/checked */}
                  <div className="absolute left-2 top-4 z-10" onClick={(e) => e.stopPropagation()}>
                    <input
                        type="checkbox"
                        className={cn(
                            "rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-opacity",
                            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}
                        checked={isSelected}
                        onChange={() => toggleSelectRoom(r.id)}
                    />
                  </div>

                  <div className={cn("shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-lg transition-all ml-4", isActive ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-500")}>
                    {r.icon ? <span className="text-lg">{r.icon}</span> : <MessageSquare size={18} />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className={cn("font-medium truncate text-sm", isActive ? "text-indigo-900" : "text-slate-900")}>
                        {r.name}
                      </h3>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(r.updatedAt || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                    
                    <p className="text-xs text-slate-500 truncate mb-1.5 h-4">
                      {r.lastMessage ? r.lastMessage.content : <span className="italic opacity-70">Belum ada pesan</span>}
                    </p>

                    <div className="flex items-center gap-2">
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border", 
                            r.type === 'public' ? "bg-green-50 text-green-600 border-green-100" :
                            r.type === 'private' ? "bg-amber-50 text-amber-600 border-amber-100" :
                            "bg-blue-50 text-blue-600 border-blue-100"
                        )}>
                            {r.type}
                        </span>
                        {topicName && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                {topicName}
                            </span>
                        )}
                        <span className="text-[10px] text-slate-400 ml-auto flex items-center gap-1">
                            <Users size={10} /> {r.membersCount}
                        </span>
                    </div>
                  </div>

                  {/* Context Menu Trigger */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 absolute right-2 top-2">
                            <MoreVertical size={14} />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditing({ id: r.id, name: r.name, type: r.type, icon: r.icon || '', topicId: r.topicId || '' })}>
                            <Pencil className="mr-2 h-4 w-4" /> Ubah
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openMembers(r)}>
                            <Users className="mr-2 h-4 w-4" /> Anggota
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => onDelete(r.id)}>
                            <Trash className="mr-2 h-4 w-4" /> Hapus
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );})}
            </div>

            {/* Broadcast Area */}
            <div className="p-4 bg-slate-50 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Megaphone size={12} /> Broadcast
                  </div>
                  {selectedRooms.size > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                            {selectedRooms.size} TARGET
                        </span>
                        <button onClick={() => setSelectedRooms(new Set())} className="text-slate-400 hover:text-slate-600">
                            <X size={12} />
                        </button>
                    </div>
                  )}
              </div>
              <div className="flex flex-col gap-2">
                <textarea 
                    placeholder={selectedRooms.size === 0 ? "Pilih room terlebih dahulu..." : "Tulis pesan broadcast..."}
                    value={broadcastContent} 
                    onChange={(e) => setBroadcastContent(e.target.value)}
                    className="w-full bg-white text-sm border border-slate-200 rounded-lg p-2 resize-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all h-20"
                    disabled={selectedRooms.size === 0}
                />
                <Button 
                    size="sm"
                    onClick={broadcast} 
                    disabled={broadcasting || selectedRooms.size === 0 || !broadcastContent.trim()}
                    className={cn("w-full justify-center", broadcasting ? "opacity-70" : "")}
                >
                  {broadcasting ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                        Mengirim...
                      </>
                  ) : (
                      <>
                        <Send className="h-3 w-3 mr-2" />
                        Kirim Broadcast
                      </>
                  )}
                </Button>
              </div>
            </div>
        </div>

        {/* Chat Area */}
        <div className="col-span-12 lg:col-span-8 xl:col-span-9 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-full">
            {activeRoomId ? (
                <>
                    {/* Chat Header */}
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur sticky top-0 z-10">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                {rooms.find(r => r.id === activeRoomId)?.icon ? (
                                    <span className="text-lg">{rooms.find(r => r.id === activeRoomId)?.icon}</span>
                                ) : (
                                    <MessageSquare size={20} />
                                )}
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900">
                                    {rooms.find(r => r.id === activeRoomId)?.name || 'Room Chat'}
                                </h3>
                                <p className="text-xs text-slate-500 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
                                    {rooms.find(r => r.id === activeRoomId)?.membersCount || 0} Anggota
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600" onClick={() => openMembers(rooms.find(r => r.id === activeRoomId))}>
                                <Users size={18} />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600">
                                <Search size={18} />
                            </Button>
                        </div>
                    </div>

                    {/* Messages List */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 scroll-smooth">
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                                <div className="h-20 w-20 bg-slate-100 rounded-full flex items-center justify-center">
                                    <MessageSquare size={32} className="opacity-20" />
                                </div>
                                <div className="text-center">
                                    <p className="text-slate-900 font-medium">Belum ada pesan</p>
                                    <p className="text-sm">Jadilah yang pertama mengirim pesan di sini.</p>
                                </div>
                            </div>
                        ) : messages.map((m, i) => {
                            const isMe = m.user?.email === 'admin@rana.id' || m.senderType === 'ADMIN'; // Simple check, ideally use user ID
                            const showAvatar = i === 0 || messages[i-1]?.user?.id !== m.user?.id;
                            
                            return (
                            <div key={m.id} className={cn("flex gap-3 max-w-[80%]", isMe ? "ml-auto flex-row-reverse" : "")}>
                                <div className={cn("shrink-0 w-8 flex flex-col items-center", !showAvatar && "invisible")}>
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={`https://ui-avatars.com/api/?name=${m.user?.name || 'U'}&background=random`} />
                                        <AvatarFallback>{(m.user?.name || 'U').slice(0,2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                </div>
                                
                                <div className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                                    {showAvatar && !isMe && (
                                        <span className="text-xs text-slate-500 mb-1 ml-1">{m.user?.name || 'Unknown'}</span>
                                    )}
                                    <div className={cn(
                                        "px-4 py-2.5 rounded-2xl text-sm shadow-sm",
                                        isMe 
                                            ? "bg-indigo-600 text-white rounded-tr-none" 
                                            : "bg-white text-slate-700 border border-slate-200 rounded-tl-none"
                                    )}>
                                        {m.content}
                                    </div>
                                    <span className={cn("text-[10px] text-slate-400 mt-1", isMe ? "mr-1" : "ml-1")}>
                                        {new Date(m.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                </div>
                            </div>
                        )})}
                    </div>

                    {/* Message Input */}
                    <div className="p-4 bg-white border-t border-slate-200">
                        <div className="flex gap-3 items-end max-w-4xl mx-auto">
                            <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-400 transition-all">
                                <textarea 
                                    placeholder="Tulis pesan..." 
                                    value={sendContent} 
                                    onChange={(e) => setSendContent(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            sendMessage();
                                        }
                                    }}
                                    className="w-full bg-transparent border-none focus:ring-0 p-3 min-h-[44px] max-h-32 resize-none text-sm"
                                    rows={1}
                                />
                            </div>
                            <Button 
                                onClick={sendMessage} 
                                disabled={sending || !sendContent.trim()}
                                className="rounded-xl h-11 w-11 p-0 shrink-0 bg-indigo-600 hover:bg-indigo-700 shadow-sm"
                            >
                                <Send className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/30">
                    <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                        <MessageSquare className="h-10 w-10 text-indigo-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Pilih Room Chat</h3>
                    <p className="text-slate-500 max-w-xs text-center">Pilih salah satu room dari daftar di sebelah kiri untuk mulai mengobrol.</p>
                </div>
            )}
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-semibold text-lg text-slate-900">{editing.id ? 'Ubah Room' : 'Buat Room Baru'}</h3>
                <button onClick={() => setEditing(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                    <X size={20} />
                </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Nama Room</label>
                <Input 
                    placeholder="Contoh: Komunitas React Indonesia" 
                    value={editing.name} 
                    onChange={(e) => setEditing((prev) => ({ ...prev, name: e.target.value }))} 
                    className="bg-slate-50 border-slate-200 focus:bg-white"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Tipe</label>
                    <div className="relative">
                        <select 
                            className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-indigo-500 appearance-none" 
                            value={editing.type} 
                            onChange={(e) => setEditing((prev) => ({ ...prev, type: e.target.value }))}
                        >
                          <option value="public">Public</option>
                          <option value="group">Group</option>
                          <option value="private">Private</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                            <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                        </div>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Icon (Emoji)</label>
                    <Input 
                        placeholder="🔥" 
                        value={editing.icon} 
                        onChange={(e) => setEditing((prev) => ({ ...prev, icon: e.target.value }))} 
                        className="bg-slate-50 border-slate-200 focus:bg-white text-center text-lg"
                    />
                  </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Topik</label>
                <div className="relative">
                    <select 
                        className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-indigo-500 appearance-none" 
                        value={editing.topicId || ''} 
                        onChange={(e) => setEditing((prev) => ({ ...prev, topicId: e.target.value }))}
                    >
                        <option value="">-- Pilih Topik --</option>
                        {topics.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                        <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                    </div>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditing(null)} className="border-slate-200 hover:bg-white hover:text-slate-900">Batal</Button>
              <Button onClick={handleSaveRoom} disabled={creating} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200">
                {creating ? (
                    <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Menyimpan...
                    </>
                ) : (editing.id ? 'Simpan Perubahan' : 'Buat Room')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {topicModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-semibold text-lg text-slate-900">Kelola Topik</h3>
                <button onClick={() => setTopicModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                    <X size={20} />
                </button>
            </div>
            
            <div className="p-6">
                <div className="flex gap-2 mb-6">
                    <Input 
                        placeholder="Nama Topik Baru" 
                        value={topicForm.name} 
                        onChange={(e) => setTopicForm({ name: e.target.value })} 
                        className="bg-slate-50 border-slate-200 focus:bg-white"
                    />
                    <Button onClick={handleCreateTopic} className="bg-indigo-600 hover:bg-indigo-700">Tambah</Button>
                </div>

                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                    {topics.length === 0 ? (
                        <div className="text-sm text-slate-500 text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            Belum ada topik
                        </div>
                    ) : topics.map(t => (
                        <div key={t.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-slate-200 transition-all group">
                            {editingTopic?.id === t.id ? (
                                <div className="flex gap-2 flex-1 animate-in fade-in duration-200">
                                    <Input 
                                        value={editingTopic.name} 
                                        onChange={(e) => setEditingTopic({...editingTopic, name: e.target.value})}
                                        className="h-9 text-sm"
                                        autoFocus
                                    />
                                    <Button size="sm" onClick={handleUpdateTopic} className="bg-indigo-600">OK</Button>
                                    <Button size="sm" variant="ghost" onClick={() => setEditingTopic(null)}>Batal</Button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                            {t.name.substring(0,1).toUpperCase()}
                                        </div>
                                        <span className="text-sm font-medium text-slate-700">{t.name}</span>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-600" onClick={() => setEditingTopic(t)}>
                                            <Pencil size={14} />
                                        </Button>
                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteTopic(t.id)}>
                                            <Trash size={14} />
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>
          </div>
        </div>
      )}

      {membersModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                    <h3 className="font-semibold text-lg text-slate-900">Anggota Room</h3>
                    <p className="text-xs text-slate-500">{membersModal.name}</p>
                </div>
                <button onClick={() => setMembersModal(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                    <X size={20} />
                </button>
            </div>
            
            <div className="p-6 space-y-6">
                {/* Add Member Section */}
                <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tambah Anggota</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Cari user berdasarkan nama atau email..." 
                            value={userQuery} 
                            onChange={(e) => setUserQuery(e.target.value)} 
                            className="pl-9 bg-white"
                        />
                        {userResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg z-20 animate-in fade-in zoom-in-95 duration-100">
                                {userResults.map(u => (
                                    <button 
                                        key={u.id} 
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center justify-between group" 
                                        onClick={() => { 
                                            // Directly add member if confirmed, or populate ID
                                            setNewMemberId(u.id); 
                                            setUserQuery('');
                                            // Optional: auto add
                                            // addMember();
                                        }}
                                    >
                                        <div>
                                            <div className="font-medium text-slate-900">{u.name}</div>
                                            <div className="text-xs text-slate-500">{u.email}</div>
                                        </div>
                                        <Plus className="h-4 w-4 text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Input 
                            placeholder="Atau masukkan User ID manual" 
                            value={newMemberId} 
                            onChange={(e) => setNewMemberId(e.target.value)}
                            className="bg-white" 
                        />
                        <Button onClick={addMember} disabled={!newMemberId.trim()} className="shrink-0 bg-indigo-600 hover:bg-indigo-700">
                            <Plus className="h-4 w-4 mr-1" /> Tambah
                        </Button>
                    </div>
                </div>

                {/* Members List */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Daftar Anggota ({members.length})</label>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto pr-1 space-y-1">
                        {members.length === 0 ? (
                            <div className="text-sm text-slate-400 text-center py-8 border border-dashed border-slate-200 rounded-xl">
                                Belum ada anggota di room ini
                            </div>
                        ) : members.map((m) => (
                            <div key={m.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={`https://ui-avatars.com/api/?name=${m.name || 'User'}&background=random`} />
                                        <AvatarFallback>{(m.name || 'U').substring(0,2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="text-sm font-medium text-slate-900">{m.name || 'Unknown User'}</div>
                                        <div className="text-xs text-slate-500">{m.userId}</div>
                                    </div>
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => removeMember(m.userId)}
                                    className="text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatRooms;
