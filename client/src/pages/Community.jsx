import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Filter, TrendingUp, Users, Heart, MessageCircle, Award, Wallet, MessagesSquare, X, ChevronDown } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import usePageMeta from '../hooks/usePageMeta';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
    fetchCommunityTopics, 
    fetchCommunityPosts, 
    createCommunityPost,
    toggleLikePost,
    addComment,
    getLeaderboard,
    fetchTrendingTags,
    getUserStats,
    updateCommunityPost,
    deleteCommunityPost
} from '../services/api';

// Components
import CommunitySidebar from '../components/community/CommunitySidebar';
import PostCard from '../components/community/PostCard';
import CreatePostModal from '../components/community/CreatePostModal';
import UserProfileModal from '../components/community/UserProfileModal';
import ChatInterface from '../components/community/ChatInterface';
import CommunityFeatureReview from '../components/community/CommunityFeatureReview';

const Community = () => {
    usePageMeta({
        title: 'Komunitas Rana | Tumbuh Bersama Pengusaha Lain',
        description: 'Bergabung dengan ribuan pengusaha UMKM lainnya. Berbagi cerita, tips sukses, dan solusi bisnis di komunitas Rana.'
    });

    const navigate = useNavigate();
    const { user } = useAuth();
    
    // State
    const [activeTab, setActiveTab] = useState('feed'); // 'feed' | 'chat'
    const [topics, setTopics] = useState([]);
    const [posts, setPosts] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [trendingTags, setTrendingTags] = useState([]);
    const [userStats, setUserStats] = useState({ discussions: 0, likesReceived: 0 });
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedAuthor, setSelectedAuthor] = useState(null);
    const [editingPost, setEditingPost] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [showFilter, setShowFilter] = useState(false);

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user, selectedTopic, sortBy]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const promises = [
                fetchCommunityTopics(),
                fetchCommunityPosts(selectedTopic, sortBy),
                getLeaderboard(),
                fetchTrendingTags()
            ];
            
            if (user?.name) {
                promises.push(getUserStats(user.name));
            }

            const results = await Promise.all(promises);
            
            const topicsData = results[0];
            const postsData = results[1];
            const leaderboardData = results[2];
            const tagsData = results[3];
            const statsData = user?.name ? results[4] : { discussions: 0, likesReceived: 0 };
            
            // Map icon strings to components
            const iconMap = { 
                TrendingUp, Users, Heart, MessageCircle, Award, Wallet 
            };
            
            const processedTopics = topicsData.map(t => ({
                ...t,
                icon: iconMap[t.icon] || MessageCircle
            }));

            setTopics(processedTopics);
            setPosts(postsData);
            setLeaderboard(leaderboardData);
            setTrendingTags(tagsData);
            setUserStats(statsData);
        } catch (error) {
            console.error("Failed to load community data", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenCreateModal = () => {
        if (!user) {
            navigate('/login');
            return;
        }
        setEditingPost(null); // Ensure not editing
        setIsCreateModalOpen(true);
    };

    const handleCreatePost = async (postData) => {
        try {
            if (editingPost) {
                // Update existing
                await updateCommunityPost(editingPost.id, postData);
                setEditingPost(null);
            } else {
                // Create new
                await createCommunityPost(postData);
            }
            setIsCreateModalOpen(false);
            await loadData(); // Refresh feed
        } catch (error) {
            console.error("Failed to save post", error);
            alert("Gagal menyimpan diskusi. Silakan coba lagi.");
        }
    };

    const handleDeletePost = async (postId) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus diskusi ini?')) {
            try {
                await deleteCommunityPost(postId);
                await loadData();
            } catch (error) {
                console.error("Failed to delete post", error);
                alert("Gagal menghapus diskusi. Silakan coba lagi.");
            }
        }
    };

    const handleEditPost = (post) => {
        setEditingPost(post);
        setIsCreateModalOpen(true);
    };

    const handleAuthorClick = (author) => {
        setSelectedAuthor(author);
    };

    const handlePostClick = (post) => {
        navigate(`/community/post/${post.id}`);
    };

    const handleLikePost = async (postId) => {
        if (!user) {
            navigate('/login');
            return;
        }
        await toggleLikePost(postId);
        // Note: PostCard handles the optimistic update
        
        // Refresh leaderboard as points change
        const newLeaderboard = await getLeaderboard();
        setLeaderboard(newLeaderboard);
        
        // If user liked their own post, update their stats
        if (user?.name) {
             const newStats = await getUserStats(user.name);
             setUserStats(newStats);
        }
    };

    const handleAddComment = async (postId, content) => {
        if (!user) {
            navigate('/login');
            return;
        }
        const res = await addComment(postId, content);
        if (res.success) {
            // Update local state to show new comment immediately
            setPosts(posts.map(p => {
                if (p.id === postId) {
                    return {
                        ...p,
                        comments: [...(p.comments || []), { ...res.data, author: { name: user.name, avatar: user.name?.charAt(0) || 'U' } }]
                    };
                }
                return p;
            }));

            // Update stats
            const [newLeaderboard] = await Promise.all([getLeaderboard()]);
            setLeaderboard(newLeaderboard);
            
            if (user?.name) {
                const newStats = await getUserStats(user.name);
                setUserStats(newStats);
            }
        }
    };

    // Filter posts by search term
    const filteredPosts = posts.filter(post => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            post.content.toLowerCase().includes(term) ||
            post.author.name.toLowerCase().includes(term) ||
            post.tags.some(tag => tag.toLowerCase().includes(term)) ||
            (post.comments && post.comments.some(c => c.content.toLowerCase().includes(term)))
        );
    });

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans overflow-x-hidden transition-colors duration-300 relative">
            <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
                {/* Soft background accents */}
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-100/60 dark:bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-green-100/50 dark:bg-green-500/10 rounded-full blur-3xl translate-y-1/2" />
            </div>

            <div className="relative z-10">
                <Navbar />
            
            {!user ? (
                <CommunityFeatureReview />
            ) : (
                <div className="pt-24 md:pt-32 pb-12 px-4 md:px-6 max-w-7xl mx-auto">
                {/* Header Banner - Clean Blue Gradient */}
                <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-blue-600 to-blue-800 mb-8 shadow-xl shadow-blue-900/10">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
                    <div className="absolute bottom-0 left-0 w-72 h-72 bg-green-400/20 rounded-full blur-3xl -ml-20 -mb-20" />
                    <div className="p-6 md:p-10 relative overflow-hidden">
                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                            <div>
                                <motion.div 
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="relative z-10"
                                >
                                    <h1 className="text-4xl md:text-7xl font-black text-white mb-6 tracking-tight flex flex-wrap items-center gap-x-4">
                                        <span className="drop-shadow-lg">Komunitas</span>
                                        <motion.div 
                                            className="relative inline-block group"
                                            whileHover={{ scale: 1.05 }}
                                            transition={{ type: "spring", stiffness: 400, damping: 10 }}
                                        >
                                            <motion.span 
                                                className="absolute -inset-4 rounded-xl bg-white/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" 
                                            />
                                            <motion.span 
                                                className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-green-200 cursor-default select-none inline-block"
                                                whileHover={{ 
                                                    scale: 1.02,
                                                }}
                                            >
                                                RANA
                                            </motion.span>
                                            {/* Underline */}
                                            <motion.div 
                                                className="absolute -bottom-1 left-0 w-0 h-[3px] bg-gradient-to-r from-white to-green-200 rounded-full"
                                                animate={{ width: "100%" }}
                                                transition={{ delay: 0.5, duration: 1, ease: "circOut" }}
                                            />
                                            {/* Sparkles/Stars decorations */}
                                            <motion.div 
                                                className="absolute -top-2 -right-4 text-yellow-300 drop-shadow-[0_0_10px_rgba(253,224,71,0.8)]"
                                                animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
                                                transition={{ duration: 2, repeat: Infinity }}
                                            >
                                                ✦
                                            </motion.div>
                                        </motion.div>
                                    </h1>
                                </motion.div>
                                <motion.p 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="text-blue-100 max-w-xl text-base md:text-lg leading-relaxed font-light"
                                >
                                    Ruang kolaborasi eksklusif bagi pengusaha UMKM. Temukan mentor, bangun relasi, dan akselerasi bisnis Anda.
                                </motion.p>
                            </div>
                            {activeTab === 'feed' && (
                                <button 
                                    onClick={handleOpenCreateModal}
                                    className="shrink-0 px-8 py-4 bg-white text-blue-700 hover:bg-blue-50 rounded-2xl font-bold transition-all shadow-lg flex items-center gap-3 group hover:-translate-y-0.5"
                                >
                                    <div className="bg-blue-100 p-1 rounded-lg group-hover:scale-110 transition-transform">
                                        <Plus size={20} />
                                    </div>
                                    <span>Mulai Diskusi Baru</span>
                                </button>
                            )}
                        </div>

                        {/* Navigation Tabs - Pill Style */}
                        <div className="flex justify-center md:justify-start mt-10">
                            <div className="bg-white/15 backdrop-blur-md p-1.5 rounded-2xl border border-white/20 inline-flex">
                                <button 
                                    onClick={() => setActiveTab('feed')}
                                    className={`px-6 py-2.5 font-bold text-sm md:text-base flex items-center gap-2 transition-all rounded-xl ${
                                        activeTab === 'feed' 
                                        ? 'bg-white text-blue-700 shadow-lg' 
                                        : 'text-blue-100 hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    <MessageCircle size={18} />
                                    Diskusi
                                </button>
                                <button 
                                    onClick={() => setActiveTab('chat')}
                                    className={`px-6 py-2.5 font-bold text-sm md:text-base flex items-center gap-2 transition-all rounded-xl ${
                                        activeTab === 'chat' 
                                        ? 'bg-white text-blue-700 shadow-lg' 
                                        : 'text-blue-100 hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    <MessagesSquare size={18} />
                                    Live Chat
                                    <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-md border border-white/20">BETA</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {activeTab === 'feed' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        {/* Sidebar - Left */}
                        <div className="lg:col-span-1 hidden lg:block">
                            <div className="sticky top-28">
                                <CommunitySidebar 
                                    topics={topics} 
                                    selectedTopic={selectedTopic} 
                                    onSelectTopic={setSelectedTopic}
                                    leaderboard={leaderboard}
                                    userStats={userStats}
                                />
                            </div>
                        </div>

                        {/* Main Feed - Center */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Search & Filter */}
                            <div className="flex gap-4 mb-2">
                                <div className="relative flex-1 group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors z-10" size={20} />
                                    <input 
                                        type="text" 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Cari diskusi, topik, atau member..." 
                                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 pl-12 pr-12 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-400 dark:focus:border-blue-500/50 transition-all shadow-sm relative z-10"
                                    />
                                    {searchTerm && (
                                        <button 
                                            onClick={() => setSearchTerm('')}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white z-20"
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>
                                <div className="relative">
                                    <button 
                                        onClick={() => setShowFilter(!showFilter)}
                                        className={`h-full px-6 bg-white dark:bg-slate-800 border ${showFilter ? 'border-blue-400 dark:border-blue-500 text-blue-700 dark:text-blue-400' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'} rounded-2xl flex items-center gap-2 font-bold text-sm transition-all hover:border-blue-300 dark:hover:border-blue-500/50 hover:text-blue-700 dark:hover:text-white shadow-sm`}
                                    >
                                        <Filter size={18} />
                                        <span className="hidden md:inline">Urutkan</span>
                                        <ChevronDown size={16} className={`transition-transform ${showFilter ? 'rotate-180' : ''}`} />
                                    </button>
                                    
                                    {showFilter && (
                                        <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden z-20 p-1.5">
                                            <button 
                                                onClick={() => { setSortBy('newest'); setShowFilter(false); }}
                                                className={`w-full text-left px-4 py-3 rounded-xl text-sm flex items-center gap-2 transition-all ${sortBy === 'newest' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'}`}
                                            >
                                                Terbaru
                                            </button>
                                            <button 
                                                onClick={() => { setSortBy('popular'); setShowFilter(false); }}
                                                className={`w-full text-left px-4 py-3 rounded-xl text-sm flex items-center gap-2 transition-all ${sortBy === 'popular' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'}`}
                                            >
                                                Populer
                                            </button>
                                            <button 
                                                onClick={() => { setSortBy('oldest'); setShowFilter(false); }}
                                                className={`w-full text-left px-4 py-3 rounded-xl text-sm flex items-center gap-2 transition-all ${sortBy === 'oldest' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'}`}
                                            >
                                                Terlama
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Mobile Categories Scroll */}
                            <div className="lg:hidden overflow-x-auto pb-4 -mx-4 px-4 flex gap-3 no-scrollbar">
                                <button 
                                    onClick={() => setSelectedTopic(null)}
                                    className={`shrink-0 px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${selectedTopic === null ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
                                >
                                    Semua
                                </button>
                                {topics.map(topic => (
                                    <button 
                                        key={topic.id}
                                        onClick={() => setSelectedTopic(topic.id)}
                                        className={`shrink-0 px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${selectedTopic === topic.id ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
                                    >
                                        {topic.title}
                                    </button>
                                ))}
                            </div>

                            {/* Posts Feed */}
                            {isLoading ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="bg-slate-100 dark:bg-slate-800 h-48 rounded-2xl animate-pulse" />
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {filteredPosts.map(post => (
                                        <PostCard 
                                            key={post.id} 
                                            post={post} 
                                            onLike={handleLikePost}
                                            onAddComment={(content) => handleAddComment(post.id, content)}
                                            onEdit={() => handleEditPost(post)}
                                            onDelete={() => handleDeletePost(post.id)}
                                            onAuthorClick={handleAuthorClick}
                                            onPostClick={handlePostClick}
                                        />
                                    ))}
                                    {filteredPosts.length === 0 && (
                                        <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                                            {searchTerm ? (
                                                <>
                                                    <Search size={48} className="mx-auto mb-4 opacity-20" />
                                                    <p>Tidak ditemukan hasil untuk "{searchTerm}"</p>
                                                    <button onClick={() => setSearchTerm('')} className="text-blue-600 dark:text-blue-400 text-sm mt-2 hover:underline">
                                                        Hapus pencarian
                                                    </button>
                                                </>
                                            ) : (
                                                <p>Belum ada diskusi untuk topik ini.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Right Sidebar (Desktop) */}
                        <div className="lg:col-span-1 hidden lg:block">
                            <div className="sticky top-32 space-y-6">
                                {/* Trending Tags */}
                                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
                                    <h3 className="text-slate-900 dark:text-white font-bold mb-4 flex items-center gap-2 relative z-10">
                                        <TrendingUp size={18} className="text-blue-600 dark:text-blue-400" />
                                        Trending Tags
                                    </h3>
                                    <div className="flex flex-wrap gap-2 relative z-10">
                                        {trendingTags.length > 0 ? (
                                            trendingTags.map(tag => (
                                                <span 
                                                    key={tag} 
                                                    onClick={() => setSearchTerm(tag)}
                                                    className="bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors border border-blue-100 dark:border-blue-500/20"
                                                >
                                                    {tag}
                                                </span>
                                            ))
                                        ) : (
                                            <p className="text-slate-400 dark:text-slate-500 text-sm">Belum ada topik populer.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Promo Banner - Blue Gradient */}
                                <div className="rounded-2xl relative overflow-hidden group bg-gradient-to-br from-blue-600 to-blue-800 shadow-lg shadow-blue-900/10">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
                                    <div className="relative p-5 text-center">
                                        <h3 className="text-white font-bold text-lg mb-2">Upgrade ke Pro</h3>
                                        <p className="text-blue-100 text-sm mb-4 leading-relaxed">Dapatkan akses ke grup mentor eksklusif dan webinar mingguan.</p>
                                        <button className="w-full py-2.5 bg-white text-blue-700 rounded-xl font-bold text-sm hover:bg-blue-50 transition-colors shadow-lg">
                                            Lihat Benefit
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                    >
                        <ChatInterface />
                    </motion.div>
                )}
            </div>
            )}

                {/* User Profile Modal */}
            <UserProfileModal 
                isOpen={!!selectedAuthor}
                onClose={() => setSelectedAuthor(null)}
                author={selectedAuthor}
                posts={posts.filter(p => p.author.name === selectedAuthor?.name)}
                onLike={handleLikePost}
                onAddComment={handleAddComment}
                onPostClick={(post) => {
                    setSelectedAuthor(null); // Close modal
                    handlePostClick(post);
                }}
            />

            <CreatePostModal 
                isOpen={isCreateModalOpen} 
                    onClose={() => setIsCreateModalOpen(false)} 
                    onCreatePost={handleCreatePost}
                    topics={topics}
                    postToEdit={editingPost}
                />
            </div>
            <Footer />
        </div>
    );
};

export default Community;
