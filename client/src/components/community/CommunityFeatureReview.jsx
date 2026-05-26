import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Users, Award, TrendingUp, Lock, ArrowRight, MessagesSquare, Heart, Share2, MoreHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CommunityFeatureReview = () => {
    const navigate = useNavigate();
    const [activePreview, setActivePreview] = useState('feed'); // 'feed' | 'chat'

    const features = [
        {
            icon: MessageCircle,
            title: "Diskusi & Tanya Jawab",
            desc: "Temukan solusi untuk masalah bisnis Anda dari ribuan pengusaha berpengalaman.",
            color: "text-blue-400",
            bg: "bg-blue-400/10",
            border: "border-blue-400/20"
        },
        {
            icon: Users,
            title: "Networking Luas",
            desc: "Bangun koneksi dengan supplier, mitra, dan mentor potensial di seluruh Indonesia.",
            color: "text-purple-400",
            bg: "bg-purple-400/10",
            border: "border-purple-400/20"
        },
        {
            icon: Award,
            title: "Leaderboard & Gamifikasi",
            desc: "Dapatkan reputasi dan badge eksklusif dengan berkontribusi aktif di komunitas.",
            color: "text-amber-400",
            bg: "bg-amber-400/10",
            border: "border-amber-400/20"
        },
        {
            icon: TrendingUp,
            title: "Insight Tren Bisnis",
            desc: "Akses data tren pasar terkini yang dibagikan oleh komunitas dan pakar industri.",
            color: "text-emerald-400",
            bg: "bg-emerald-400/10",
            border: "border-emerald-400/20"
        }
    ];

    const feedMock = [
        {
            id: 1,
            author: "Budi Santoso",
            role: "Owner Cafe",
            avatar: "B",
            color: "bg-blue-500",
            content: "Ada rekomendasi supplier biji kopi arabica yang konsisten di area Jakarta Selatan? Supplier lama sering telat kirim 🙏",
            likes: 24,
            comments: 8,
            time: "2 jam yang lalu"
        },
        {
            id: 2,
            author: "Siti Aminah",
            role: "Fashion Retail",
            avatar: "S",
            color: "bg-pink-500",
            content: "Sharing tips: Cara saya meningkatkan omzet 30% saat Ramadhan kemarin dengan strategi bundling produk.",
            likes: 156,
            comments: 42,
            time: "4 jam yang lalu"
        }
    ];

    const chatMock = [
        { id: 1, user: "Rian (Mentor)", msg: "Selamat pagi semua! Topik hari ini tentang manajemen cashflow ya.", time: "09:00", self: false },
        { id: 2, user: "Andi", msg: "Siap mas, kebetulan lagi butuh banget insight soal ini.", time: "09:02", self: true },
        { id: 3, user: "Dewi", msg: "Izin tanya mas, idealnya berapa persen alokasi untuk marketing?", time: "09:05", self: false },
        { id: 4, user: "Rian (Mentor)", msg: "Untuk tahap awal, saran saya 15-20% dari gross profit, mbak Dewi.", time: "09:06", self: false },
    ];

    return (
        <div className="relative pt-24 pb-12 px-4 max-w-7xl mx-auto min-h-[80vh] flex flex-col justify-center items-center">
            {/* Locked Overlay Effect */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="text-center mb-16 relative z-10 max-w-3xl mx-auto">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-indigo-300 text-sm font-bold mb-6 backdrop-blur-md"
                >
                    <Lock size={16} />
                    <span>Member Only Access</span>
                </motion.div>
                
                <motion.h1 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight"
                >
                    Bergabung dengan <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                        Komunitas Rana
                    </span>
                </motion.h1>
                
                <motion.p 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-slate-400 text-lg md:text-xl leading-relaxed"
                >
                    Ruang kolaborasi eksklusif bagi pengusaha UMKM untuk tumbuh bersama. Login sekarang untuk mengakses diskusi, event, dan networking.
                </motion.p>
            </div>

            {/* Interactive Preview Section */}
            <motion.div 
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="w-full max-w-4xl mb-20 relative z-20"
            >
                {/* Window Frame */}
                <div className="rounded-2xl border border-white/10 bg-[#0f111a]/80 backdrop-blur-xl shadow-2xl overflow-hidden relative group">
                    {/* Window Header */}
                    <div className="h-12 bg-white/5 border-b border-white/5 flex items-center px-4 justify-between">
                        <div className="flex gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500/50" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                            <div className="w-3 h-3 rounded-full bg-green-500/50" />
                        </div>
                        <div className="flex gap-1 bg-black/20 p-1 rounded-lg">
                            <button 
                                onClick={() => setActivePreview('feed')}
                                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${activePreview === 'feed' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                Diskusi
                            </button>
                            <button 
                                onClick={() => setActivePreview('chat')}
                                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${activePreview === 'chat' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                Live Chat
                            </button>
                        </div>
                    </div>

                    {/* Window Content */}
                    <div className="p-6 min-h-[400px] relative">
                        <AnimatePresence mode="wait">
                            {activePreview === 'feed' ? (
                                <motion.div 
                                    key="feed"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="space-y-4"
                                >
                                    {feedMock.map(post => (
                                        <div key={post.id} className="bg-white/[0.03] border border-white/5 rounded-2xl p-5">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex gap-3">
                                                    <div className={`w-10 h-10 rounded-full ${post.color} flex items-center justify-center font-bold text-white`}>
                                                        {post.avatar}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-200 text-sm">{post.author}</h4>
                                                        <p className="text-xs text-indigo-400">{post.role}</p>
                                                    </div>
                                                </div>
                                                <span className="text-xs text-slate-500">{post.time}</span>
                                            </div>
                                            <p className="text-slate-300 text-sm leading-relaxed mb-4">{post.content}</p>
                                            <div className="flex gap-4 border-t border-white/5 pt-3">
                                                <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                                                    <Heart size={14} /> {post.likes}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                                                    <MessagesSquare size={14} /> {post.comments}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key="chat"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-4 flex flex-col justify-end h-full"
                                >
                                    {chatMock.map(chat => (
                                        <div key={chat.id} className={`flex ${chat.self ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[80%] rounded-2xl p-3 text-sm ${chat.self ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white/10 text-slate-300 rounded-tl-sm'}`}>
                                                {!chat.self && <p className="text-xs font-bold text-indigo-400 mb-1">{chat.user}</p>}
                                                <p>{chat.msg}</p>
                                                <p className={`text-[10px] mt-1 text-right ${chat.self ? 'text-indigo-200' : 'text-slate-500'}`}>{chat.time}</p>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="mt-4 pt-4 border-t border-white/10">
                                        <div className="bg-white/5 rounded-xl h-10 w-full animate-pulse" />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Login Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b0f] via-[#0a0b0f]/60 to-transparent flex flex-col items-center justify-end pb-12 z-10">
                            <p className="text-slate-300 mb-4 font-medium">Bergabung untuk melihat konten selengkapnya</p>
                            <button 
                                onClick={() => navigate('/login')}
                                className="px-6 py-2 bg-white text-indigo-900 rounded-full font-bold text-sm hover:bg-slate-200 transition-colors shadow-lg"
                            >
                                Login untuk Interaksi
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full mb-16 relative z-10">
                {features.map((feature, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + (idx * 0.1) }}
                        className={`p-6 rounded-3xl bg-white/5 border ${feature.border} backdrop-blur-md hover:-translate-y-2 transition-transform duration-300`}
                    >
                        <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-4`}>
                            <feature.icon className={feature.color} size={24} />
                        </div>
                        <h3 className="text-white font-bold text-lg mb-2">{feature.title}</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
                    </motion.div>
                ))}
            </div>

            {/* CTA Buttons */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex flex-col md:flex-row gap-4 relative z-10"
            >
                <button 
                    onClick={() => navigate('/login')}
                    className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold shadow-[0_10px_30px_rgba(79,70,229,0.3)] hover:shadow-[0_15px_40px_rgba(124,58,237,0.4)] hover:scale-105 transition-all flex items-center gap-2"
                >
                    Masuk ke Komunitas
                    <ArrowRight size={20} />
                </button>
                <button 
                    onClick={() => navigate('/register')}
                    className="px-8 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-bold hover:bg-white/10 hover:scale-105 transition-all"
                >
                    Daftar Akun Baru
                </button>
            </motion.div>
        </div>
    );
};

export default CommunityFeatureReview;