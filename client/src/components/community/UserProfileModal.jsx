import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Calendar, MessageCircle, Heart, Store, Shield } from 'lucide-react';
import PostCard from './PostCard';

const UserProfileModal = ({ isOpen, onClose, author, posts, onLike, onAddComment, onPostClick }) => {
    if (!isOpen || !author) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />
                    
                    <motion.div 
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="bg-[#1a1c29] border border-white/10 w-full max-w-3xl rounded-2xl overflow-hidden relative z-10 shadow-2xl flex flex-col max-h-[90vh]"
                    >
                        {/* Header Background */}
                        <div className="h-32 bg-gradient-to-r from-indigo-900 to-purple-900 relative shrink-0">
                            <button 
                                onClick={onClose}
                                className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full transition-colors backdrop-blur-sm"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Profile Info */}
                        <div className="px-6 pb-6 relative shrink-0 border-b border-white/10">
                            <div className="flex flex-col md:flex-row items-start md:items-end gap-4 -mt-12 mb-4">
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl font-bold text-white border-4 border-[#1a1c29] shadow-xl">
                                        {author.avatar}
                                    </div>
                                    {author.level && (
                                        <div className="absolute bottom-0 right-0 w-8 h-8 bg-[#1a1c29] rounded-full flex items-center justify-center">
                                            <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-xs font-bold text-black border-2 border-[#1a1c29]">
                                                {author.level}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h2 className="text-2xl font-bold text-white">{author.name}</h2>
                                        {author.badge && (
                                            <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wide border border-indigo-500/20">
                                                {author.badge}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                                        <div className="flex items-center gap-1.5">
                                            <Shield size={14} className="text-indigo-400" />
                                            <span>{author.role}</span>
                                        </div>
                                        {author.storeName && (
                                            <div className="flex items-center gap-1.5">
                                                <Store size={14} className="text-indigo-400" />
                                                <span>{author.storeName}</span>
                                            </div>
                                        )}
                                        {author.joinDate && (
                                            <div className="flex items-center gap-1.5">
                                                <Calendar size={14} className="text-indigo-400" />
                                                <span>Bergabung {author.joinDate}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-4 bg-[#0a0b0f] rounded-xl p-4 border border-white/5">
                                <div className="text-center border-r border-white/5 last:border-0">
                                    <div className="text-2xl font-bold text-white mb-1">{posts.length}</div>
                                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Diskusi</div>
                                </div>
                                <div className="text-center border-r border-white/5 last:border-0">
                                    <div className="text-2xl font-bold text-white mb-1">
                                        {posts.reduce((acc, post) => acc + (post.likes || 0), 0)}
                                    </div>
                                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Disukai</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-white mb-1">
                                        {posts.reduce((acc, post) => acc + (post.comments?.length || 0), 0)}
                                    </div>
                                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Komentar</div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Posts List */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar bg-[#0a0b0f]/30">
                            <h3 className="text-lg font-bold text-white mb-4 sticky top-0 bg-[#1a1c29]/95 backdrop-blur-sm py-2 z-10">
                                Diskusi oleh {author.name}
                            </h3>
                            
                            <div className="space-y-4">
                                {posts.length > 0 ? (
                                    posts.map(post => (
                                        <div key={post.id} className="transform scale-95 origin-top-left w-full">
                                            <PostCard 
                                                post={post} 
                                                onLike={onLike}
                                                onAddComment={onAddComment}
                                                onPostClick={onPostClick}
                                                // Disable edit/delete in modal view for simplicity, or pass them if needed
                                            />
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-12 text-slate-500">
                                        <MessageCircle size={48} className="mx-auto mb-4 opacity-20" />
                                        <p>Belum ada diskusi yang dibuat.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default UserProfileModal;
