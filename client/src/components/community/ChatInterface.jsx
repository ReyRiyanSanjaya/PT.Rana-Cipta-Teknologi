import React, { useState, useEffect, useRef } from 'react';
import { 
    MessageCircle, Send, Users, Hash, Search, MoreVertical, 
    Smile, Shield, TrendingUp, Zap, X, Menu, Reply, Heart, Copy,
    Paperclip, Mic, Check, CheckCheck, Phone, Video, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EmojiPicker from 'emoji-picker-react';
import ReactMarkdown from 'react-markdown';
import { fetchChatRooms, fetchChatMessages, sendChatMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { io } from 'socket.io-client';

const ChatInterface = () => {
    const { user, refreshUser } = useAuth();
    const [rooms, setRooms] = useState([]);
    const [activeRoomId, setActiveRoomId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [showMemberInfo, setShowMemberInfo] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [replyTo, setReplyTo] = useState(null);
    const [roomMembers, setRoomMembers] = useState({});
    const messagesEndRef = useRef(null);
    const socketRef = useRef(null);
    const typingTimerRef = useRef(null);
    const prevRoomRef = useRef(null);
    const userRef = useRef(user);

    const activeRoom = rooms.find(r => r.id === activeRoomId) || {};

    const getDisplayName = (u) => u?.tenant?.name || u?.store?.name || u?.name || 'Anda';

    const playNotificationSound = () => {
        try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
            audio.volume = 0.5;
            audio.play().catch(e => console.log("Audio play failed:", e));
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        refreshUser();
        if ("Notification" in window && Notification.permission !== "granted") {
            Notification.requestPermission();
        }
    }, []);

    useEffect(() => {
        userRef.current = user;
    }, [user]);

    useEffect(() => {
        loadRooms();
        const SERVER_URL = (import.meta.env?.VITE_API_URL || 'http://localhost:4000/api').replace('/api', '');
        const token = localStorage.getItem('token');
        socketRef.current = io(SERVER_URL, {
            auth: { token }
        });
        socketRef.current.on('connect', () => {
            // Joined globally
        });
        socketRef.current.on('chat:new_message', (msg) => {
            const currentUser = userRef.current;
            const currentUserDisplayName = getDisplayName(currentUser);
            
            setMessages(prev => {
                // 1. Check if message already exists by ID
                if (prev.find(m => m.id === msg.id)) return prev;

                // 2. Check for pending match (Optimistic UI)
                // If text matches a pending message, it is OUR message returning from server.
                const textContent = (msg.content || msg.text || '').trim();
                const pendingMatch = prev.find(m => m.isPending && m.text.trim() === textContent);
                
                if (pendingMatch) {
                    // [FIX] Save ownership metadata for the new server ID
                    if (currentUser?.id) {
                        const meta = JSON.parse(localStorage.getItem('my_messages_meta') || '{}');
                        meta[msg.id] = { userId: currentUser.id, userName: currentUserDisplayName };
                        localStorage.setItem('my_messages_meta', JSON.stringify(meta));
                    }

                    return prev.map(m => m.id === pendingMatch.id ? { 
                        ...m,
                        id: msg.id, // Update to server ID
                        createdAt: new Date(msg.createdAt),
                        time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        isPending: false,
                        // Update other fields but prioritize local identity
                        userId: msg.userId || m.userId,
                        replyToId: msg.replyToId
                    } : m);
                }

                // 3. New message from socket (not pending)
                // Try to recover identity from local storage (if we sent it but missed pending state)
                const myMessageMeta = JSON.parse(localStorage.getItem('my_messages_meta') || '{}');
                const recoveredUser = myMessageMeta[msg.id];
                const effectiveUserId = msg.userId || recoveredUser?.userId;
                const effectiveUserName = msg.userName || msg.user?.name || recoveredUser?.userName;

                const isMe = (currentUser?.id && effectiveUserId == currentUser.id);

                // Play sound and notify if not me
                if (!isMe) {
                    playNotificationSound();
                    if (document.hidden && Notification.permission === "granted") {
                        new Notification("Pesan Baru", { 
                            body: `${effectiveUserName}: ${textContent}`,
                        });
                    }
                }

                const mapped = {
                    id: msg.id,
                    text: textContent,
                    userId: effectiveUserId,
                    // Prioritize: 1. Current User Name (if isMe), 2. Message User Name, 3. User Relation Name, 4. Unknown
                    userName: isMe ? currentUserDisplayName : (effectiveUserName || 'Unknown'),
                    storeName: isMe ? (currentUser?.store?.name || currentUser?.tenant?.name) : (msg.user?.store?.name || msg.user?.tenant?.name || msg.storeName),
                    avatar: (effectiveUserName || 'U').charAt(0),
                    createdAt: new Date(msg.createdAt),
                    time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    isMe: isMe,
                    replyToId: msg.replyToId
                };
                
                return [...prev, mapped];
            });
        });
        socketRef.current.on('chat:typing', ({ isTyping }) => {
            setIsTyping(!!isTyping);
        });
        socketRef.current.on('chat:online_count', ({ roomId, count }) => {
            setRooms(prev => prev.map(r => r.id === roomId ? { ...r, onlineCount: count } : r));
        });
        socketRef.current.on('chat:online_members', ({ roomId, members, count }) => {
            setRooms(prev => prev.map(r => r.id === roomId ? { ...r, onlineCount: count } : r));
            setRoomMembers(prev => ({ ...prev, [roomId]: Array.isArray(members) ? members : [] }));
        });
        return () => {
            socketRef.current?.disconnect();
        };
    }, []);

    useEffect(() => {
        if (activeRoomId) {
            loadMessages(activeRoomId);
            setIsSidebarOpen(false); 
            if (prevRoomRef.current && prevRoomRef.current !== activeRoomId) {
                socketRef.current?.emit('leave_chat_room', prevRoomRef.current);
            }
            prevRoomRef.current = activeRoomId;
            socketRef.current?.emit('join_chat_room', activeRoomId);
        }
    }, [activeRoomId, user?.id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const loadRooms = async () => {
        const data = await fetchChatRooms();
        setRooms(data);
        if (!activeRoomId && data?.length > 0) {
            setActiveRoomId(data[0].id);
        }
    };

    const loadMessages = async (roomId) => {
        const data = await fetchChatMessages(roomId);
        // Use current user from ref to ensure we have the latest data even inside async callbacks
        const currentUser = userRef.current || user; 
        const currentUserDisplayName = getDisplayName(currentUser);
        
        // [FIX] Load local ownership metadata to recover identity when server returns null userId
        const myMessageMeta = JSON.parse(localStorage.getItem('my_messages_meta') || '{}');

        const mapped = data.map(msg => {
            // 1. Try to recover identity from local storage if server failed
            let recoveredUser = null;
            if (!msg.userId && myMessageMeta[msg.id]) {
                recoveredUser = myMessageMeta[msg.id];
            }

            // 2. Determine effective User ID and Name
            const effectiveUserId = msg.userId || recoveredUser?.userId;
            const effectiveUserName = msg.userName || msg.user?.name || recoveredUser?.userName;
            const storeName = msg.user?.store?.name || msg.user?.tenant?.name;
            const role = msg.user?.role || (msg.isAdmin ? 'ADMIN' : 'USER');

            // 3. Check isMe with loose equality
            const isMe = (currentUser?.id && effectiveUserId == currentUser.id);
            
            return {
                id: msg.id,
                text: msg.content || msg.text || '',
                userId: effectiveUserId,
                // If it's me, use my real name, otherwise use what server sent or 'Unknown'
                userName: isMe ? currentUserDisplayName : (effectiveUserName || 'Unknown'),
                storeName: isMe ? (currentUser?.store?.name || currentUser?.tenant?.name) : storeName,
                role: role,
                avatar: (effectiveUserName || 'U').charAt(0),
                createdAt: new Date(msg.createdAt || Date.now()),
                time: new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isMe: isMe,
                replyToId: msg.replyToId
            };
        });

        const linked = mapped.map(msg => {
            if (msg.replyToId) {
                const target = mapped.find(m => m.id === msg.replyToId);
                if (target) {
                    return { ...msg, replyTo: target };
                }
            }
            return msg;
        });

        setMessages(linked);
        setIsLoading(false);
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        if (!activeRoomId) {
            alert("Silakan pilih chat room terlebih dahulu.");
            return;
        }

        const displayName = getDisplayName(user);
        const storeName = user?.store?.name || user?.tenant?.name;

        const tempMessage = {
            id: Date.now(),
            text: newMessage,
            userId: user?.id || 'me',
            userName: displayName,
            storeName: storeName,
            avatar: displayName.charAt(0) || 'A',
            createdAt: new Date(),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isMe: true,
            isPending: true,
            replyTo: replyTo
        };

        setMessages(prev => [...prev, tempMessage]);
        setNewMessage('');
        setReplyTo(null);
        setIsTyping(true);

        try {
            const res = await sendChatMessage(activeRoomId, tempMessage.text, tempMessage.replyTo?.id);
            
            // [FIX] Save ownership to localStorage to survive reloads (since server might return null userId)
            if (user?.id) {
                const meta = JSON.parse(localStorage.getItem('my_messages_meta') || '{}');
                meta[res.id] = { userId: user.id, userName: displayName };
                localStorage.setItem('my_messages_meta', JSON.stringify(meta));
            }

            setMessages(prev => prev.map(msg => 
                msg.id === tempMessage.id ? { 
                    ...res, 
                    userId: user?.id || res.userId, // Ensure ID is consistent
                    userName: displayName, // Ensure Name is consistent
                    storeName: storeName,
                    isPending: false, 
                    isMe: true,
                    replyTo: tempMessage.replyTo 
                } : msg
            ));
        } catch (error) {
            console.error("Failed to send message:", error);
            setMessages(prev => prev.map(msg => 
                msg.id === tempMessage.id ? { ...msg, isPending: false, error: true, text: msg.text + " (Gagal terkirim)" } : msg
            ));
        }

        setTimeout(() => {
            setIsTyping(false);
        }, 3000);
    };

    const getUserColor = (userId, type = 'text') => {
        const colors = [
            { text: 'text-indigo-400', bg: 'bg-indigo-600' },
            { text: 'text-cyan-400', bg: 'bg-cyan-600' },
            { text: 'text-purple-400', bg: 'bg-purple-600' },
            { text: 'text-pink-400', bg: 'bg-pink-600' },
            { text: 'text-teal-400', bg: 'bg-teal-600' },
        ];
        const safeId = userId || 'user';
        const index = (safeId.length + safeId.charCodeAt(0)) % colors.length;
        return (colors[index] || colors[0])[type];
    };

    const getMemberNames = () => {
        if (!activeRoom) return '';
        if (activeRoom.storeName) {
            return activeRoom.onlineCount > 0 
                ? `${activeRoom.onlineCount} Online` 
                : 'Klik untuk info bisnis';
        }
        
        // Collect unique members from messages
        const uniqueMembers = [];
        const seenNames = new Set();
        
        messages.forEach(m => {
            const name = m.userName;
            if (name && name !== (user?.name || 'Anda') && !seenNames.has(name)) {
                seenNames.add(name);
                uniqueMembers.push({
                    name: name,
                    store: m.storeName
                });
            }
        });
        
        if (uniqueMembers.length === 0) {
             return "Jumiati, Leni, Pratiwi, Surtini, Anda";
        }

        const displayNames = uniqueMembers.map(m => m.store ? `${m.name} (${m.store})` : m.name);

        if (displayNames.length > 0) {
            return displayNames.slice(0, 3).join(', ') + (displayNames.length > 3 ? ', ...' : '');
        }
        
        return activeRoom.onlineCount > 0 ? `${activeRoom.onlineCount} Online` : '';
    };

    const getAvatarUrl = (name) => {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=random&color=fff`;
    };

    const getIcon = (iconName) => {
        const icons = { MessageCircle, TrendingUp, Zap, Shield };
        const Icon = icons[iconName] || Hash;
        return <Icon size={20} />;
    };

    return (
        <div className="flex h-[calc(100vh-140px)] bg-slate-900/90 backdrop-blur-xl relative overflow-hidden shadow-2xl rounded-2xl border border-white/10">
            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsSidebarOpen(false)}
                        className="absolute inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar / Room List */}
            <div className={`
                absolute md:relative z-50 h-full w-full md:w-80 bg-slate-800/50 border-r border-white/10 flex flex-col transition-transform duration-300 backdrop-blur-md
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                {/* Sidebar Header */}
                <div className="h-16 px-4 flex justify-between items-center border-b border-white/10 shrink-0 bg-slate-800/30">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">
                            {user?.name?.charAt(0) || 'U'}
                        </div>
                        <span className="text-slate-200 font-bold text-lg hidden sm:block">Chats</span>
                    </div>
                    <div className="flex gap-2 text-slate-400">
                        <button className="p-2 hover:bg-white/5 rounded-lg transition-colors"><MessageCircle size={18} /></button>
                        <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 hover:bg-white/5 rounded-lg">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="p-3 border-b border-white/10">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input 
                            type="text" 
                            placeholder="Cari chat room..." 
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 transition-colors"
                        />
                    </div>
                </div>
                
                {/* Rooms List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {rooms.map(room => (
                        <button
                            key={room.id}
                            onClick={() => setActiveRoomId(room.id)}
                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all relative group border border-transparent ${
                                activeRoomId === room.id 
                                ? 'bg-indigo-600/10 border-indigo-500/20' 
                                : 'hover:bg-white/5'
                            }`}
                        >
                            <div className="relative shrink-0">
                                <img 
                                    src={getAvatarUrl(room.storeName || room.name)} 
                                    alt={room.name}
                                    className="w-12 h-12 rounded-full object-cover bg-slate-700 ring-2 ring-white/5"
                                />
                                {room.onlineCount > 0 && (
                                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-800 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
                                )}
                            </div>
                            
                            <div className="flex-1 text-left min-w-0">
                                <div className="flex justify-between items-center mb-1">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <span className={`font-semibold truncate text-sm ${activeRoomId === room.id ? 'text-indigo-300' : 'text-slate-200'}`}>
                                            {room.storeName || room.name}
                                        </span>
                                        {room.unread > 0 && (
                                            <span className="bg-indigo-500 text-white text-[10px] font-bold px-1.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
                                                {room.unread}
                                            </span>
                                        )}
                                    </div>
                                    {room.lastMessage && (
                                        <span className="text-[10px] text-slate-500 shrink-0 ml-1">
                                            {new Date(room.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    )}
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="text-xs text-slate-400 truncate w-full">
                                        {room.lastMessage ? (
                                            <span className="flex items-center gap-1">
                                                {room.lastMessage.userId === user?.id && <CheckCheck size={12} className="text-indigo-400" />}
                                                {room.lastMessage.content || room.lastMessage.text}
                                            </span>
                                        ) : 'Belum ada pesan'}
                                    </div>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-slate-950/50 relative min-w-0 z-10">
                {/* Header */}
                <div className="h-16 px-4 py-2 bg-slate-900/80 backdrop-blur-md flex items-center justify-between border-b border-white/5 z-20 shrink-0">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => setShowMemberInfo(!showMemberInfo)}>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(true); }}
                            className="md:hidden mr-1 text-slate-400"
                        >
                            <Menu size={24} />
                        </button>
                        <div className="w-10 h-10 rounded-full bg-slate-700 p-0.5 border border-white/10 relative overflow-hidden shrink-0">
                            <img 
                                src={getAvatarUrl(activeRoom.storeName || activeRoom.name)} 
                                alt={activeRoom.name}
                                className="w-full h-full object-cover rounded-full"
                            />
                        </div>
                        <div className="flex flex-col">
                            <h3 className="text-slate-100 font-bold text-sm md:text-base leading-tight flex items-center gap-2">
                                {activeRoom.storeName || activeRoom.name}
                                {activeRoom.type === 'public' && <Shield size={12} className="text-indigo-400" />}
                                {activeRoom.onlineCount > 0 && (
                                    <span className="flex items-center gap-1 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] px-1.5 rounded animate-pulse">
                                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                                        LIVE
                                    </span>
                                )}
                            </h3>
                            <p className="text-[11px] md:text-xs text-slate-400 truncate max-w-[200px] md:max-w-md">
                                {getMemberNames()}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                        <button 
                            onClick={() => setShowSearch(!showSearch)}
                            className={`p-2 hover:bg-white/5 rounded-lg transition-colors ${showSearch ? 'text-indigo-400 bg-indigo-500/10' : ''}`}
                        >
                            <Search size={20} />
                        </button>
                        <button 
                            onClick={() => setShowMemberInfo(!showMemberInfo)}
                            className={`p-2 hover:bg-white/5 rounded-lg transition-colors ${showMemberInfo ? 'text-indigo-400 bg-indigo-500/10' : ''}`}
                        >
                            <Info size={20} />
                        </button>
                    </div>
                </div>

                {showSearch && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-4 py-2 bg-slate-900/80 border-b border-white/5 z-20"
                    >
                        <input
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Cari pesan dalam chat ini..."
                            className="w-full bg-slate-800 rounded-lg py-2 px-4 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                            autoFocus
                        />
                    </motion.div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 md:px-6 space-y-1 z-10 custom-scrollbar">
                    {(searchQuery ? messages.filter(m => (m.text || '').toLowerCase().includes(searchQuery.toLowerCase())) : messages).map((msg, idx) => {
                        const isSequence = idx > 0 && messages[idx - 1].userId === msg.userId;
                        const date = new Date(msg.createdAt || Date.now());
                        const prevDate = idx > 0 ? new Date(messages[idx-1].createdAt || Date.now()) : null;
                        const showDateDivider = !prevDate || date.toDateString() !== prevDate.toDateString();
                        
                        let dateLabel = date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                        if (date.toDateString() === new Date().toDateString()) dateLabel = 'Hari Ini';
                        else if (new Date(Date.now() - 86400000).toDateString() === date.toDateString()) dateLabel = 'Kemarin';

                        return (
                            <React.Fragment key={msg.id}>
                                {showDateDivider && (
                                    <div className="flex justify-center my-6 sticky top-2 z-10">
                                        <span className="bg-slate-800/80 backdrop-blur text-slate-400 text-[10px] font-bold px-3 py-1 rounded-full border border-white/5 shadow-sm uppercase tracking-wider">
                                            {dateLabel}
                                        </span>
                                    </div>
                                )}
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex group mb-1 items-end gap-2 ${msg.isMe ? 'justify-end' : 'justify-start'} ${isSequence ? '-mt-1' : 'mt-2'}`}
                                >
                                    {/* Avatar Left (Others) */}
                                    {!msg.isMe && (
                                        <div className={`w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0 overflow-hidden shadow-md ring-2 ring-slate-900 ${isSequence ? 'invisible' : ''}`}>
                                            <img 
                                                src={getAvatarUrl(msg.userName)} 
                                                alt={msg.userName}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    )}

                                    <div className={`
                                        relative max-w-[85%] md:max-w-[65%] px-4 py-2 shadow-md text-sm flex flex-col group/bubble
                                        ${msg.role === 'ADMIN'
                                            ? 'bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl border border-red-400/30 w-full md:max-w-[80%] mx-auto items-center text-center shadow-lg shadow-red-900/20'
                                            : msg.isMe 
                                                ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-2xl rounded-tr-sm items-end text-right' 
                                                : 'bg-slate-800/90 text-slate-200 rounded-2xl rounded-tl-sm border border-white/5 items-start text-left'
                                        }
                                    `}>
                                        {/* Name Display */}
                                        {(!msg.isMe || msg.role === 'ADMIN') && !isSequence && (
                                            <div className={`mb-1 flex items-center gap-2 ${msg.role === 'ADMIN' ? 'justify-center w-full border-b border-white/20 pb-1 mb-2' : ''}`}>
                                                <span className={`text-[11px] font-bold ${msg.role === 'ADMIN' ? 'text-white text-xs uppercase tracking-wider flex items-center gap-1' : getUserColor(msg.userId, 'text')}`}>
                                                    {msg.role === 'ADMIN' && <Shield size={12} />}
                                                    {msg.userName}
                                                </span>
                                                {msg.role === 'ADMIN' && (
                                                    <span className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                                                        ADMIN
                                                    </span>
                                                )}
                                                {msg.storeName && msg.role !== 'ADMIN' && (
                                                    <span className="text-[10px] text-slate-400 bg-slate-700/50 px-1.5 py-0.5 rounded border border-white/5 truncate max-w-[120px]">
                                                        {msg.storeName}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Metadata (Above Text) */}
                                        <div className={`flex items-center gap-1 mb-1 select-none opacity-60 text-[10px] ${msg.role === 'ADMIN' ? 'justify-center text-white/70' : (msg.isMe ? 'justify-end text-indigo-100' : 'justify-start text-slate-400')}`}>
                                            <span>{msg.time}</span>
                                            {msg.isMe && msg.role !== 'ADMIN' && (
                                                <span className={`flex items-center justify-center w-4 h-4 rounded-full bg-black/20 ${msg.isPending ? 'opacity-70' : ''}`}>
                                                    {msg.isPending ? <Check size={10} strokeWidth={3} /> : <CheckCheck size={10} strokeWidth={3} />}
                                                </span>
                                            )}
                                        </div>

                                        {/* Reply Indicator */}
                                        {msg.replyTo && (
                                            <div className={`mb-2 p-2 rounded-lg text-xs ${msg.role === 'ADMIN' ? 'bg-black/20 text-center mx-auto' : (msg.isMe ? 'bg-black/20 text-right' : 'bg-black/20 text-left')} border-l-2 border-white/30`}>
                                                <span className="font-bold opacity-80 block mb-0.5">{msg.replyTo.userName}</span>
                                                <span className="truncate block opacity-70">{msg.replyTo.text}</span>
                                            </div>
                                        )}

                                        <div className={`break-words markdown-content leading-relaxed ${msg.role === 'ADMIN' ? 'text-center text-base font-medium' : (msg.isMe ? 'text-right' : 'text-left')}`}>
                                            <ReactMarkdown 
                                                components={{
                                                    a: ({node, ...props}) => <a {...props} className={`underline hover:opacity-80 ${msg.isMe || msg.role === 'ADMIN' ? 'text-white' : 'text-indigo-400'}`} target="_blank" rel="noopener noreferrer" />,
                                                    code: ({node, ...props}) => <code {...props} className="bg-black/20 px-1 rounded font-mono text-xs" />
                                                }}
                                            >
                                                {msg.text}
                                            </ReactMarkdown>
                                        </div>

                                        {/* Quick Actions (Reply) */}
                                        <button 
                                            onClick={() => setReplyTo(msg)}
                                            className={`absolute top-0 bottom-0 ${msg.isMe ? '-left-8' : '-right-8'} p-1 opacity-0 group-hover/bubble:opacity-100 transition-opacity text-slate-500 hover:text-indigo-400`}
                                        >
                                            <Reply size={16} />
                                        </button>
                                    </div>

                                    {/* Avatar Right (Me) */}
                                    {msg.isMe && (
                                        <div className={`w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center shrink-0 overflow-hidden shadow-md ring-2 ring-indigo-500/30 ${isSequence ? 'invisible' : ''}`}>
                                            <img 
                                                src={getAvatarUrl(msg.userName)} 
                                                alt={msg.userName}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    )}
                                </motion.div>
                            </React.Fragment>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="px-4 py-3 bg-slate-900/80 backdrop-blur-md flex items-end gap-3 z-20 shrink-0 border-t border-white/5">
                    <button 
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="mb-2 p-2 rounded-full text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                    >
                        <Smile size={24} />
                    </button>

                    <form onSubmit={handleSendMessage} className="flex-1 relative">
                        <AnimatePresence>
                            {replyTo && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, height: 0 }}
                                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                                    exit={{ opacity: 0, y: 10, height: 0 }}
                                    className="absolute bottom-full left-0 right-0 mb-2 bg-slate-800 rounded-xl p-3 flex justify-between items-center border border-white/10 shadow-lg"
                                >
                                    <div className="flex-1 min-w-0 pl-1 border-l-2 border-indigo-500">
                                        <div className="text-xs text-indigo-400 font-bold mb-0.5 ml-2">{replyTo.userName}</div>
                                        <div className="text-xs text-slate-400 truncate ml-2">{replyTo.text}</div>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => setReplyTo(null)}
                                        className="p-1 hover:bg-white/10 rounded-full text-slate-400"
                                    >
                                        <X size={16} />
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <AnimatePresence>
                            {showEmojiPicker && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                    className="absolute bottom-full left-0 mb-4 z-50 shadow-2xl rounded-2xl overflow-hidden border border-white/10"
                                >
                                    <EmojiPicker 
                                        theme="dark"
                                        onEmojiClick={(emojiData) => setNewMessage(prev => prev + emojiData.emoji)}
                                        width={320}
                                        height={400}
                                        skinTonesDisabled
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="bg-slate-800/50 border border-white/10 rounded-2xl flex items-center px-4 py-2 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all shadow-inner">
                            <input 
                                type="text" 
                                value={newMessage}
                                onChange={(e) => {
                                    setNewMessage(e.target.value);
                                    if (socketRef.current && activeRoomId) {
                                        socketRef.current.emit('chat:typing', { roomId: activeRoomId, isTyping: true });
                                        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
                                        typingTimerRef.current = setTimeout(() => {
                                            socketRef.current?.emit('chat:typing', { roomId: activeRoomId, isTyping: false });
                                        }, 800);
                                    }
                                }}
                                placeholder="Ketik pesan..."
                                className="flex-1 bg-transparent text-slate-200 text-sm focus:outline-none py-2 placeholder:text-slate-500"
                            />
                        </div>
                    </form>

                    <button 
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim()}
                        className="mb-1 p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 disabled:scale-95 active:scale-95"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </div>
            
            {/* Member Info Sidebar (Right) */}
            <AnimatePresence>
                {showMemberInfo && (
                    <motion.div 
                        initial={{ x: '100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="absolute right-0 top-0 bottom-0 w-full md:w-[350px] bg-slate-900/95 backdrop-blur-xl border-l border-white/10 flex flex-col z-30 shadow-2xl"
                    >
                        <div className="h-16 px-6 bg-slate-800/50 flex items-center border-b border-white/10 shrink-0 text-slate-200 font-bold">
                            Info Grup
                            <button onClick={() => setShowMemberInfo(false)} className="ml-auto p-2 hover:bg-white/5 rounded-full text-slate-400">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-8 text-center border-b border-white/5 bg-gradient-to-b from-slate-800/30 to-transparent">
                            <div className="w-24 h-24 rounded-2xl bg-slate-800 mx-auto flex items-center justify-center text-4xl text-indigo-400 mb-4 shadow-lg ring-1 ring-white/10">
                                {getIcon(activeRoom.icon)}
                            </div>
                            <h2 className="text-xl font-bold text-white mb-1">{activeRoom.name}</h2>
                            <p className="text-slate-400 text-sm">{activeRoom.type === 'public' ? 'Public Group' : 'Private Discussion'}</p>
                        </div>

                        <div className="p-4 flex-1 overflow-y-auto">
                            <div className="flex justify-between items-center mb-4 px-2">
                                <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">{activeRoom.onlineCount} Anggota Online</h3>
                                <button className="text-indigo-400 text-xs hover:underline">Lihat Semua</button>
                            </div>
                            <div className="space-y-3">
                                {(roomMembers[activeRoomId] || []).map((m) => {
                                    const label = m.name || m.userId;
                                    const isMe = user?.id && m.userId === user.id;
                                    return (
                                        <div key={m.userId} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl transition-colors">
                                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white text-sm font-bold shadow-inner">
                                                {label.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-slate-200 text-sm font-medium truncate flex items-center gap-2">
                                                    {label} 
                                                    {isMe && <span className="text-xs bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded">Anda</span>}
                                                </div>
                                                {m.storeName && (
                                                    <div className="text-xs text-indigo-400/80 truncate">
                                                        {m.storeName}
                                                    </div>
                                                )}
                                                <div className="text-slate-500 text-xs truncate flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                    Online
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ChatInterface;
