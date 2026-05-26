import React from 'react';
import { 
    Users, TrendingUp, Star, Award, MessageCircle, Hash, 
    Shield, Zap, ChevronRight 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

const CommunitySidebar = ({ topics, selectedTopic, onSelectTopic, leaderboard, userStats }) => {
    const { user } = useAuth();

    return (
        <div className="space-y-6">
            {/* User Mini Profile */}
            {user ? (
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 relative overflow-hidden group hover:border-white/20 hover:shadow-[0_0_40px_rgba(99,102,241,0.2)] transition-all duration-500">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/20 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2 transition-all duration-700 group-hover:bg-indigo-500/30 animate-pulse-slow" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-[50px] translate-y-1/2 -translate-x-1/2" />
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-indigo-500/5 group-hover:via-purple-500/5 group-hover:to-pink-500/5 transition-all duration-700" />
                    
                    <div className="flex items-center gap-4 mb-6 relative z-10">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full blur opacity-40 group-hover:opacity-70 transition-opacity duration-500" />
                            <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold border-2 border-white/20 shadow-xl group-hover:scale-105 transition-transform duration-300">
                                {user.name?.charAt(0) || 'U'}
                            </div>
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg leading-tight mb-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-indigo-300 group-hover:to-purple-300 transition-all duration-300">{user.name}</h3>
                            <div className="flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 w-fit shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                                <Shield size={10} className="fill-indigo-300" />
                                <span>Member</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
                        <div className="bg-[#0a0b0f]/40 rounded-2xl p-3 text-center border border-white/5 group-hover:border-indigo-500/20 transition-colors backdrop-blur-md">
                            <div className="text-2xl font-black text-white mb-0.5 group-hover:text-indigo-400 transition-colors">{userStats?.discussions || 0}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Diskusi</div>
                        </div>
                        <div className="bg-[#0a0b0f]/40 rounded-2xl p-3 text-center border border-white/5 group-hover:border-purple-500/20 transition-colors backdrop-blur-md">
                            <div className="text-2xl font-black text-white mb-0.5 group-hover:text-purple-400 transition-colors">{userStats?.likesReceived || 0}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Likes</div>
                        </div>
                    </div>

                    <Link to="/profile" className="block w-full text-center py-3 text-sm font-bold text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition-all relative z-10 hover:shadow-lg hover:shadow-indigo-500/10 group/btn overflow-hidden">
                        <span className="relative z-10">Lihat Profil Lengkap</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 translate-x-[-100%] group-hover/btn:translate-x-0 transition-transform duration-500" />
                    </Link>
                </div>
            ) : (
                <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 text-center shadow-2xl shadow-indigo-900/40 group hover:shadow-indigo-900/60 transition-all duration-500">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/20 rounded-full blur-[60px] group-hover:scale-150 transition-transform duration-700" />
                    
                    <div className="relative z-10">
                        <h3 className="text-white font-black text-xl mb-2 drop-shadow-lg">Gabung Komunitas</h3>
                        <p className="text-indigo-100 text-sm mb-6 font-medium leading-relaxed opacity-90">Nikmati akses penuh untuk berdiskusi, berbagi, dan membangun relasi dengan para ahli.</p>
                        <Link to="/login" className="block w-full py-3.5 bg-white text-indigo-700 rounded-xl font-bold hover:bg-indigo-50 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden">
                             <span className="relative z-10">Masuk Sekarang</span>
                        </Link>
                    </div>
                </div>
            )}

            {/* Topics Navigation */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-50" />
                <h4 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4 px-2 flex items-center gap-2">
                    <Zap size={14} className="text-yellow-400" />
                    Topik Diskusi
                </h4>
                <div className="space-y-1.5">
                    <button 
                        onClick={() => onSelectTopic(null)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group relative overflow-hidden ${
                            selectedTopic === null 
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-white/20' 
                            : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent hover:border-white/5'
                        }`}
                    >
                        {selectedTopic === null && <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />}
                        <div className={`p-1.5 rounded-lg transition-colors relative z-10 ${selectedTopic === null ? 'bg-white/20' : 'bg-white/5 group-hover:bg-white/10'}`}>
                            <Zap size={18} className={selectedTopic === null ? "fill-white" : "fill-none"} />
                        </div>
                        <span className="font-bold text-sm relative z-10">Semua Topik</span>
                        {selectedTopic === null && <ChevronRight size={16} className="ml-auto opacity-70 relative z-10" />}
                    </button>
                    {topics.map(topic => (
                        <button 
                            key={topic.id}
                            onClick={() => onSelectTopic(topic.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group relative overflow-hidden ${
                                selectedTopic === topic.id 
                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-white/20' 
                                : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent hover:border-white/5'
                            }`}
                        >
                            {selectedTopic === topic.id && <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />}
                            <div className={`p-1.5 rounded-lg transition-colors relative z-10 ${selectedTopic === topic.id ? 'bg-white/20 text-white' : `${topic.color || 'text-slate-400'} bg-white/5 group-hover:bg-white/10`}`}>
                                {/* Use icon component if passed, or fallback */}
                                {topic.icon && typeof topic.icon !== 'string' ? <topic.icon size={18} /> : <Hash size={18} />}
                            </div>
                            <div className="flex-1 text-left relative z-10">
                                <span className="font-bold text-sm block">{topic.title}</span>
                            </div>
                            {selectedTopic !== topic.id ? (
                                <span className="text-[10px] font-bold bg-white/5 px-2 py-0.5 rounded-full text-slate-500 border border-white/5 group-hover:border-white/10 transition-colors group-hover:text-slate-300">
                                    {topic.count > 1000 ? `${(topic.count/1000).toFixed(1)}k` : topic.count}
                                </span>
                            ) : (
                                <ChevronRight size={16} className="opacity-70 relative z-10" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Top Contributors */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 relative overflow-hidden hover:border-white/20 hover:shadow-[0_0_30px_rgba(234,179,8,0.1)] transition-all duration-500">
                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-[50px] animate-pulse-slow" />
                <div className="flex items-center gap-3 mb-6 relative z-10">
                    <div className="p-2 bg-gradient-to-br from-yellow-500/10 to-amber-500/10 rounded-xl text-yellow-500 border border-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.2)]">
                        <Award size={20} />
                    </div>
                    <h3 className="text-white font-bold text-base tracking-wide">Top Kontributor</h3>
                </div>
                <div className="space-y-4 relative z-10">
                    {leaderboard.map((user, idx) => (
                        <div key={user.id} className="flex items-center gap-3 group cursor-pointer hover:bg-white/5 p-2 -mx-2 rounded-xl transition-colors relative">
                            {idx === 0 && <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />}
                            <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center text-white font-bold border border-white/10 group-hover:scale-105 transition-transform shadow-lg">
                                    {user.avatar}
                                </div>
                                {idx < 3 && (
                                    <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-[#15161b] shadow-md z-10 ${
                                        idx === 0 ? 'bg-gradient-to-br from-yellow-300 to-yellow-500 text-yellow-900 shadow-[0_0_10px_rgba(234,179,8,0.5)]' :
                                        idx === 1 ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-900' :
                                        'bg-gradient-to-br from-amber-600 to-amber-800 text-amber-100'
                                    }`}>
                                        {idx + 1}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-white font-bold text-sm truncate group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-yellow-200 group-hover:to-amber-400 transition-all">{user.name}</div>
                                <div className="text-slate-500 text-xs truncate font-bold">{user.points} Poin</div>
                            </div>
                            {idx === 0 && <Star size={14} className="text-yellow-500 fill-yellow-500 animate-pulse drop-shadow-[0_0_5px_rgba(234,179,8,0.8)]" />}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CommunitySidebar;
