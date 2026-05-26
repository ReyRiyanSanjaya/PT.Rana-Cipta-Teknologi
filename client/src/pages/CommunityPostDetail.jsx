import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Share2, Heart } from 'lucide-react';
import Navbar from '../components/Navbar';
import PostCard from '../components/community/PostCard';
import UserProfileModal from '../components/community/UserProfileModal';
import ParticlesBackground from '../components/ui/ParticlesBackground';
import { 
    fetchCommunityPosts, 
    toggleLikePost, 
    addComment, 
    updateCommunityPost, 
    deleteCommunityPost 
} from '../services/api';
import { useAuth } from '../context/AuthContext';

const CommunityPostDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [post, setPost] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedAuthor, setSelectedAuthor] = useState(null);
    const [posts, setPosts] = useState([]); // Needed for author modal context if we want to show other posts by author

    useEffect(() => {
        loadPost();
    }, [id]);

    const loadPost = async () => {
        setIsLoading(true);
        try {
            // In a real app, you'd have a specific API endpoint for fetching a single post by ID
            // For now, we'll fetch all and find the one we need, or simulate a fetch
            const allPosts = await fetchCommunityPosts(); 
            const foundPost = allPosts.find(p => p.id.toString() === id);
            
            if (foundPost) {
                setPost(foundPost);
                setPosts(allPosts); // Keep all posts for context/author modal
            } else {
                // Handle not found
                console.error("Post not found");
            }
        } catch (error) {
            console.error("Failed to load post", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLikePost = async (postId) => {
        if (!user) {
            navigate('/login');
            return;
        }
        await toggleLikePost(postId);
        // Refresh post data
        const allPosts = await fetchCommunityPosts();
        const foundPost = allPosts.find(p => p.id.toString() === id);
        if (foundPost) setPost(foundPost);
    };

    const handleAddComment = async (postId, content) => {
        if (!user) {
            navigate('/login');
            return;
        }
        const res = await addComment(postId, content);
        if (res.success) {
            // Optimistically update or re-fetch
             const updatedPost = {
                ...post,
                comments: [...(post.comments || []), { ...res.data, author: { name: user.name, avatar: user.name?.charAt(0) || 'U' } }]
            };
            setPost(updatedPost);
        }
    };

    const handleAuthorClick = (author) => {
        setSelectedAuthor(author);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0a0b0f] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!post) {
        return (
            <div className="min-h-screen bg-[#0a0b0f] text-slate-200 flex flex-col items-center justify-center p-4">
                <h2 className="text-xl font-bold mb-4">Diskusi tidak ditemukan</h2>
                <button 
                    onClick={() => navigate('/community')}
                    className="px-6 py-2 bg-indigo-600 rounded-xl text-white font-bold"
                >
                    Kembali ke Komunitas
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0b0f] text-slate-200 font-sans relative">
            <ParticlesBackground />
            <div className="relative z-10">
                <Navbar />
                
                <div className="pt-24 md:pt-28 pb-12 px-4 md:px-6 max-w-4xl mx-auto">
                    <button 
                        onClick={() => navigate('/community')}
                        className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors group"
                    >
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="font-bold">Kembali ke Forum</span>
                    </button>

                    <PostCard 
                        post={post}
                        onLike={handleLikePost}
                        onAddComment={handleAddComment}
                        onAuthorClick={handleAuthorClick}
                        defaultShowComments={true}
                    />
                </div>
            </div>
            <Footer />

             {/* User Profile Modal */}
             <UserProfileModal 
                isOpen={!!selectedAuthor}
                onClose={() => setSelectedAuthor(null)}
                author={selectedAuthor}
                posts={posts.filter(p => p.author.name === selectedAuthor?.name)}
                onLike={handleLikePost}
                onAddComment={handleAddComment}
            />
        </div>
    );
};

export default CommunityPostDetail;
