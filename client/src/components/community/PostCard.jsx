import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { MessageCircle, Heart, Share2, MoreHorizontal, Send, Store, Edit, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import DOMPurify from 'dompurify';
import './quill-dark.css'; // Reuse quill styles for content display

const CommentSection = ({ comments, onAddComment }) => {
    const { user } = useAuth();
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        setIsSubmitting(true);
        await onAddComment(newComment);
        setNewComment('');
        setIsSubmitting(false);
    };

    return (
        <div className="mt-4 pt-4 border-t border-white/5">
            <h4 className="text-sm font-bold text-slate-300 mb-4">Komentar ({comments.length})</h4>
            
            <div className="space-y-4 mb-6">
                {comments.length === 0 ? (
                    <p className="text-center text-slate-500 text-sm py-4">Belum ada komentar. Jadilah yang pertama!</p>
                ) : (
                    comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white font-bold shrink-0">
                                {comment.author.avatar}
                            </div>
                            <div className="flex-1 bg-white/5 rounded-2xl rounded-tl-none p-3">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold text-slate-200 text-sm">{comment.author.name}</span>
                                    <span className="text-xs text-slate-500">{comment.createdAt}</span>
                                </div>
                                <p className="text-slate-300 text-sm">{comment.content}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {user ? (
                <form onSubmit={handleSubmit} className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs text-white font-bold shrink-0">
                        {user.name?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Tulis komentar..."
                            className="w-full bg-[#0a0b0f] border border-white/10 rounded-xl py-2 pl-4 pr-10 text-slate-300 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                        <button 
                            type="submit"
                            disabled={!newComment.trim() || isSubmitting}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-500 hover:text-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </form>
            ) : (
                <div className="text-center py-4 bg-white/5 rounded-xl">
                    <p className="text-sm text-slate-400">Masuk untuk ikut berdiskusi</p>
                </div>
            )}
        </div>
    );
};

const PostCard = ({ post, onLike, onAddComment, onEdit, onDelete, onAuthorClick, onPostClick, defaultShowComments = false }) => {
    const { user } = useAuth();
    const [isExpanded, setIsExpanded] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showComments, setShowComments] = useState(defaultShowComments);
    const [localLikes, setLocalLikes] = useState(post.likes);
    const [isLiked, setIsLiked] = useState(post.isLiked);

    const handleLike = () => {
        if (isLiked) {
            setLocalLikes(prev => prev - 1);
        } else {
            setLocalLikes(prev => prev + 1);
        }
        setIsLiked(!isLiked);
        onLike(post.id);
    };

    const handleShare = async () => {
        const shareData = {
            title: `Diskusi oleh ${post.author.name}`,
            text: `${post.content.substring(0, 100)}... \n\nLihat selengkapnya di Komunitas Rana!`,
            url: window.location.href 
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
                alert('Tautan diskusi berhasil disalin ke clipboard!');
            }
        } catch (err) {
            console.error('Error sharing:', err);
        }
        setShowMenu(false);
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative bg-white/5 backdrop-blur-xl border border-white/10 p-5 md:p-6 rounded-3xl mb-6 hover:bg-white/[0.07] hover:border-white/20 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] transition-all duration-300"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <div className="absolute inset-0 border border-white/5 rounded-3xl pointer-events-none group-hover:border-indigo-500/30 transition-colors duration-500" />
            
            <div className="relative z-10">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 group/author cursor-pointer" onClick={() => onAuthorClick && onAuthorClick(post.author)}>
                        <div className="relative">
                            <div className="absolute inset-0 bg-indigo-500 rounded-full blur opacity-20 group-hover/author:opacity-60 transition-opacity duration-300" />
                            <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover/author:scale-105 transition-transform duration-300 border border-white/10">
                                {post.author.avatar}
                            </div>
                            {post.author.level && (
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#1a1c29] rounded-full flex items-center justify-center ring-2 ring-[#0a0b0f] z-10">
                                    <div className="w-3.5 h-3.5 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full flex items-center justify-center text-[8px] font-bold text-black shadow-sm">
                                        {post.author.level}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-white text-base group-hover/author:text-transparent group-hover/author:bg-clip-text group-hover/author:bg-gradient-to-r group-hover/author:from-indigo-400 group-hover/author:to-purple-400 transition-all duration-300">{post.author.name}</h3>
                                {post.author.badge && (
                                    <span className="hidden md:inline-block px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-wide border border-indigo-500/20 backdrop-blur-sm shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                                        {post.author.badge}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                <span className="text-indigo-300/80">{post.author.role}</span>
                                <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                                <span>{post.createdAt}</span>
                            </div>
                            {(post.author.storeName || post.author.storeLocation) && (
                                <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-500 font-medium">
                                    <Store size={12} className="text-indigo-400" />
                                    <span>
                                        {post.author.storeName}
                                        {post.author.storeLocation ? ` • ${post.author.storeLocation}` : ''}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="relative">
                        <button 
                            onClick={() => setShowMenu(!showMenu)}
                            className="p-2 -mr-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
                        >
                            <MoreHorizontal size={20} />
                        </button>
                        
                        {showMenu && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="absolute right-0 top-full mt-2 w-48 bg-[#0a0b0f]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-20 ring-1 ring-white/10"
                            >
                                {user?.name === post.author.name ? (
                                    <>
                                        <button 
                                            onClick={() => {
                                                setShowMenu(false);
                                                onEdit && onEdit();
                                            }}
                                            className="w-full text-left px-4 py-3 hover:bg-white/5 text-sm text-slate-300 hover:text-white flex items-center gap-3 border-b border-white/5 transition-colors"
                                        >
                                            <Edit size={16} /> Edit Diskusi
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setShowMenu(false);
                                                onDelete && onDelete();
                                            }}
                                            className="w-full text-left px-4 py-3 hover:bg-red-500/10 text-sm text-red-400 hover:text-red-300 flex items-center gap-3 transition-colors"
                                        >
                                            <Trash2 size={16} /> Hapus Diskusi
                                        </button>
                                    </>
                                ) : (
                                    <button 
                                        className="w-full text-left px-4 py-3 hover:bg-white/5 text-sm text-slate-300 hover:text-white flex items-center gap-3 transition-colors"
                                        onClick={() => setShowMenu(false)}
                                    >
                                        <Share2 size={16} /> Bagikan
                                    </button>
                                )}
                            </motion.div>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div 
                    className={`mb-4 ${onPostClick ? 'cursor-pointer' : ''}`}
                    onClick={() => {
                        const selection = window.getSelection();
                        if (selection.toString().length > 0) return; // Don't trigger if text is selected
                        onPostClick && onPostClick(post);
                    }}
                >
                    <div className={`text-slate-200 text-sm md:text-base leading-relaxed ql-editor !p-0 ${!isExpanded && post.content.length > 200 ? 'line-clamp-3' : ''}`}>
                        {post.content.includes('<') ? (
                             <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }} />
                        ) : (
                            <ReactMarkdown 
                                components={{
                                    p: ({node, ...props}) => <p className="mb-2" {...props} />,
                                    a: ({node, ...props}) => <a className="text-indigo-400 hover:underline decoration-indigo-500/30 underline-offset-2" onClick={(e) => e.stopPropagation()} {...props} />,
                                    img: ({node, ...props}) => <img className="rounded-xl my-2 max-w-full h-auto border border-white/10" {...props} />,
                                    ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2 text-slate-300" {...props} />,
                                    ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2 text-slate-300" {...props} />,
                                    blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-indigo-500 pl-4 italic my-2 text-slate-400 bg-indigo-500/5 py-2 pr-2 rounded-r-lg" {...props} />,
                                    code: ({node, ...props}) => <code className="bg-[#0a0b0f] border border-white/10 px-1.5 py-0.5 rounded text-sm font-mono text-indigo-300" {...props} />,
                                }}
                            >
                                {post.content}
                            </ReactMarkdown>
                        )}
                    </div>
                    {post.content.length > 200 && (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsExpanded(!isExpanded);
                            }}
                            className="text-indigo-400 text-sm font-bold mt-2 hover:text-indigo-300 transition-colors flex items-center gap-1 group/btn"
                        >
                            {isExpanded ? 'Lihat lebih sedikit' : 'Selengkapnya'}
                            <div className={`w-1.5 h-1.5 border-r border-b border-current transform transition-transform duration-300 ${isExpanded ? '-rotate-135 translate-y-0.5' : 'rotate-45 -translate-y-0.5'}`} />
                        </button>
                    )}

                    {/* Tags */}
                    {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4">
                            {post.tags.map(tag => (
                                <span key={tag} className="text-xs font-bold px-3 py-1 rounded-lg bg-indigo-500/5 text-indigo-300 border border-indigo-500/10 hover:bg-indigo-500/10 hover:border-indigo-500/30 hover:shadow-[0_0_10px_rgba(99,102,241,0.2)] transition-all cursor-default">
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Image if available */}
                    {post.image && (
                        <div className="mt-4 rounded-2xl overflow-hidden border border-white/10 shadow-lg relative group/image">
                            <div className="absolute inset-0 bg-indigo-500/0 group-hover/image:bg-indigo-500/10 transition-colors duration-500 z-10" />
                            <img src={post.image} alt="Post attachment" className="w-full h-auto object-cover max-h-[500px] hover:scale-105 transition-transform duration-700" />
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-white/5 relative">
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleLike}
                            className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-300 relative overflow-hidden ${
                                isLiked 
                                ? 'text-pink-500 bg-pink-500/10 shadow-[0_0_15px_rgba(236,72,153,0.3)]' 
                                : 'text-slate-400 hover:text-pink-400 hover:bg-pink-500/5'
                            }`}
                        >
                            <Heart size={20} className={`transition-transform duration-300 ${isLiked ? 'scale-110 fill-current' : 'group-hover:scale-110'}`} />
                            <span className="font-bold text-sm">{localLikes}</span>
                            {isLiked && <div className="absolute inset-0 bg-pink-500/10 animate-pulse" />}
                        </button>
                        
                        <button 
                            onClick={() => setShowComments(!showComments)}
                            className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-300 ${
                                showComments 
                                ? 'text-indigo-400 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.3)]' 
                                : 'text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/5'
                            }`}
                        >
                            <MessageCircle size={20} className={`transition-transform duration-300 ${showComments ? 'scale-110 fill-current' : 'group-hover:scale-110'}`} />
                            <span className="font-bold text-sm">{post.comments ? post.comments.length : 0}</span>
                        </button>

                        <button 
                            onClick={handleShare}
                            className="group flex items-center gap-2 px-3 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                        >
                            <Share2 size={20} className="group-hover:rotate-12 transition-transform duration-300" />
                        </button>
                    </div>
                    
                    <div className="flex -space-x-2">
                        {post.comments && post.comments.slice(0, 3).map((comment, i) => (
                            <div key={i} className="w-7 h-7 rounded-full bg-slate-700 border-2 border-[#15161b] flex items-center justify-center text-[8px] text-white overflow-hidden shadow-lg relative group/avatar" title={comment.author.name}>
                                <div className="absolute inset-0 bg-indigo-500/20 hidden group-hover/avatar:block" />
                                {comment.author.avatar}
                            </div>
                        ))}
                        {post.comments && post.comments.length > 3 && (
                            <div className="w-7 h-7 rounded-full bg-slate-800 border-2 border-[#15161b] flex items-center justify-center text-[9px] text-white font-bold shadow-lg">
                                +{post.comments.length - 3}
                            </div>
                        )}
                    </div>
                </div>

                {/* Comments Section */}
                <AnimatePresence>
                    {showComments && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <CommentSection comments={post.comments || []} onAddComment={(content) => onAddComment(post.id, content)} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

export default PostCard;
