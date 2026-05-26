import axios from 'axios';

const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:4000/api';

const api = axios.create({
    baseURL: API_URL
});

// Add Auth Token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// --- Local Storage Helpers for Mock Data ---
const STORAGE_KEYS = {
    POSTS: 'rana_community_posts_v1',
    NOTIFICATIONS: 'rana_notifications_v1',
    TOPICS: 'rana_topics_v1',
    CHAT_ROOMS: 'rana_chat_rooms_v1',
    CHAT_MESSAGES: 'rana_chat_messages_v1',
    LEADERBOARD: 'rana_leaderboard_v1'
};

const getStoredData = (key, defaultData) => {
    try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : defaultData;
    } catch (e) {
        return defaultData;
    }
};

const setStoredData = (key, data) => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error('Storage error', e);
    }
};

// --- Default Data (Clean / No Mock) ---

const DEFAULT_NOTIFICATIONS = [];

const DEFAULT_TOPICS = [
    { id: 1, title: 'Strategi Promosi', count: 0, icon: 'TrendingUp', color: 'text-blue-400', desc: 'Tips marketing low budget tapi nendang.' },
    { id: 2, title: 'Info Supplier', count: 0, icon: 'Users', color: 'text-green-400', desc: 'Cari bahan baku murah & berkualitas.' },
    { id: 3, title: 'Curhat UMKM', count: 0, icon: 'Heart', color: 'text-pink-400', desc: 'Tempat berbagi keluh kesah & semangat.' },
    { id: 4, title: 'Teknis Aplikasi', count: 0, icon: 'MessageCircle', color: 'text-indigo-400', desc: 'Diskusi fitur & cara pakai Rana.' },
    { id: 5, title: 'Legalitas & Izin', count: 0, icon: 'Award', color: 'text-yellow-400', desc: 'Panduan NIB, PIRT, dan Halal.' },
    { id: 6, title: 'Manajemen Keuangan', count: 0, icon: 'Wallet', color: 'text-emerald-400', desc: 'Tips atur arus kas biar nggak boncos.' },
];

const DEFAULT_POSTS = [];

const DEFAULT_CHAT_ROOMS = [
    { id: 1, name: 'Komunitas F&B Jakarta', members: 0, lastMessage: null, time: null, unread: 0 },
    { id: 2, name: 'Belajar Digital Marketing', members: 0, lastMessage: null, time: null, unread: 0 },
    { id: 3, name: 'Info Perizinan Usaha', members: 0, lastMessage: null, time: null, unread: 0 },
];

const DEFAULT_CHAT_MESSAGES = {};

const DEFAULT_LEADERBOARD = [];

// --- Blog System (Public) ---
export const getBlogPosts = async (params) => {
    try {
        const res = await api.get('/blog', { params });
        return res.data.data;
    } catch (e) {
        return [];
    }
};

export const getBlogPostBySlug = async (slug) => {
    try {
        const res = await api.get(`/blog/${slug}`);
        return res.data.data;
    } catch (e) {
        return null;
    }
};

// --- Community ---
export const fetchCommunityTopics = async () => {
    try {
        const res = await api.get('/community/topics');
        return res.data.map(topic => ({
            ...topic,
            count: topic._count?.posts || 0
        }));
    } catch (e) {
        console.error("Failed to fetch topics", e);
        return [];
    }
};

export const fetchCommunityPosts = async (topicId, sortBy = 'newest') => {
    try {
        const params = {};
        if (topicId) params.topicId = topicId;
        
        const res = await api.get('/community/posts', { params });
        let posts = res.data;

        // Sort logic (client-side for now, or move to backend)
        if (sortBy === 'newest') {
            posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } else if (sortBy === 'popular') {
            posts.sort((a, b) => (b.likes || 0) - (a.likes || 0));
        } else if (sortBy === 'oldest') {
            posts.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        }

        return posts.map(post => ({
            ...post,
            comments: new Array(post._count?.comments || 0), // Placeholder for count
            likes: post.likes || 0,
            isLiked: false // Needs separate check or inclusion in list API
        }));
    } catch (e) {
        console.error("Failed to fetch posts", e);
        return [];
    }
};

export const createCommunityPost = async (data) => {
    try {
        const res = await api.post('/community/posts', data);
        return { success: true, data: res.data };
    } catch (e) {
        console.error("Failed to create post", e);
        return { success: false, error: e.message };
    }
};

export const updateCommunityPost = async (postId, data) => {
    try {
        const res = await api.put(`/community/posts/${postId}`, data);
        return { success: true, data: res.data };
    } catch (e) {
        console.error("Failed to update post", e);
        return { success: false, error: e.message };
    }
};

export const deleteCommunityPost = async (postId) => {
    try {
        const res = await api.delete(`/community/posts/${postId}`);
        return { success: true, data: res.data };
    } catch (e) {
        console.error("Failed to delete post", e);
        return { success: false, error: e.message };
    }
};

export const fetchTrendingTags = async () => {
    try {
        // Fetch posts to calculate trending tags from real data
        const res = await api.get('/community/posts');
        const posts = res.data;
        
        const tagCounts = {};
        posts.forEach(post => {
            if (post.tags && Array.isArray(post.tags)) {
                post.tags.forEach(tag => {
                    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                });
            }
        });

        // Sort by count descending and take top 10
        const sortedTags = Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1])
            .map(entry => entry[0])
            .slice(0, 10);

        return sortedTags;
    } catch (e) {
        console.error("Failed to fetch trending tags", e);
        return [];
    }
};

export const toggleLikePost = async (postId) => {
    try {
        const res = await api.post(`/community/posts/${postId}/like`);
        return { success: true, liked: res.data.liked };
    } catch (e) {
        console.error("Failed to like post", e);
        return { success: false };
    }
};

export const addComment = async (postId, content) => {
    try {
        const res = await api.post(`/community/posts/${postId}/comments`, { content });
        return { success: true, data: res.data };
    } catch (e) {
        console.error("Failed to add comment", e);
        return { success: false };
    }
};

export const getLeaderboard = async () => {
    // Not implemented backend yet
    return [];
};

export const getUserStats = async (username) => {
    // Not implemented backend yet
    return { discussions: 0, likesReceived: 0 };
};

// --- Chat System ---

export const fetchChatRooms = async () => {
    try {
        const res = await api.get('/chat/rooms');
        return res.data;
    } catch (e) {
        console.error("Failed to fetch chat rooms", e);
        return [];
    }
};

export const fetchChatMessages = async (roomId) => {
    try {
        const res = await api.get(`/chat/rooms/${roomId}/messages`);
        return res.data.map(msg => ({
            ...msg,
            sender: msg.userName || 'Unknown',
            time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isMe: false // Need to check against current user ID from context or store
        }));
    } catch (e) {
        console.error("Failed to fetch messages", e);
        return [];
    }
};

export const sendChatMessage = async (roomId, text, replyToId = null) => {
    try {
        const res = await api.post(`/chat/rooms/${roomId}/messages`, { content: text, replyToId });
        const msg = res.data;
        return {
            ...msg,
            sender: 'Anda', // Optimistic
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isMe: true
        };
    } catch (e) {
        console.error("Failed to send message", e);
        throw e;
    }
};

// --- Notifications ---

export const fetchNotifications = async () => {
    return getStoredData(STORAGE_KEYS.NOTIFICATIONS, DEFAULT_NOTIFICATIONS);
};

export const markNotificationsRead = async () => {
    const notifications = getStoredData(STORAGE_KEYS.NOTIFICATIONS, DEFAULT_NOTIFICATIONS);
    const updated = notifications.map(n => ({ ...n, isRead: true }));
    setStoredData(STORAGE_KEYS.NOTIFICATIONS, updated);
    return { success: true };
};

// --- Profile & User Settings ---

export const fetchProfile = async () => {
    try {
        const res = await api.get('/auth/me');
        if (res.data?.data) {
            setStoredData('user', res.data.data);
            return res.data.data;
        }
        return getStoredData('user', null);
    } catch (e) {
        console.error("Failed to fetch profile", e);
        return getStoredData('user', null);
    }
};

export const updateUserProfile = async (data) => {
    const user = getStoredData('user', {});
    const updatedUser = { ...user, ...data };
    setStoredData('user', updatedUser);
    return updatedUser;
};

export const updateStoreProfile = async (data) => {
    const user = getStoredData('user', {});
    const updatedUser = {
        ...user,
        tenant: {
            ...(user.tenant || {}),
            name: data.businessName || user.tenant?.name
        },
        store: {
            ...(user.store || {}),
            location: data.address || user.store?.location,
            waNumber: data.waNumber || user.store?.waNumber
        }
    };
    setStoredData('user', updatedUser);
    return updatedUser;
};

// --- Subscription ---

export const fetchSubscriptionPackages = async () => {
    try {
        const res = await api.get('/subscriptions/packages');
        return res.data.data;
    } catch (e) {
        console.error("Failed to fetch packages", e);
        return [];
    }
};

export const fetchSubscriptionBanks = async () => {
    try {
        const res = await api.get('/subscriptions/banks');
        return res.data.data;
    } catch (e) {
        console.error("Failed to fetch banks", e);
        return [];
    }
};

export const fetchSubscriptionStatus = async () => {
    try {
        const res = await api.get('/subscriptions/status');
        return res.data.data;
    } catch (e) {
        console.error("Failed to fetch subscription status", e);
        return {
            isActive: false,
            plan: 'FREE',
            expiryDate: null,
            pendingRequest: null
        };
    }
};

export const createSubscriptionRequest = async (data) => {
    const res = await api.post('/subscriptions/request', data);
    return res.data;
};

// --- Transactions ---

export const fetchAdminChart = async (range = '7d') => {
    try {
        const res = await api.get('/admin/stats/chart', { params: { range } });
        return res.data.data;
    } catch (e) {
        console.error("Failed to fetch admin chart", e);
        return [
            { name: 'Sen', value: 0 },
            { name: 'Sel', value: 0 },
            { name: 'Rab', value: 0 },
            { name: 'Kam', value: 0 },
            { name: 'Jum', value: 0 },
            { name: 'Sab', value: 0 },
            { name: 'Min', value: 0 }
        ];
    }
};

export const fetchAdminStats = async () => {
    try {
        const res = await api.get('/admin/stats');
        return res.data.data;
    } catch (e) {
        console.error("Failed to fetch admin stats", e);
        return {
            totalStores: 0,
            totalPayouts: 0,
            pendingWithdrawals: 0,
            recentWithdrawals: []
        };
    }
};

export const fetchDashboardStats = async (date, storeId) => {
    try {
        const res = await api.get('/reports/dashboard', { params: { date, storeId } });
        return res.data.data;
    } catch (e) {
        console.error("Failed to fetch dashboard stats", e);
        return {
            financials: {
                grossSales: 0,
                netSales: 0,
                grossProfit: 0,
                transactionCount: 0,
                cogs: 0
            },
            topProducts: []
        };
    }
};

export const fetchWalletData = async () => {
    try {
        const res = await api.get('/wallet');
        return res.data.data;
    } catch (e) {
        console.error("Failed to fetch wallet data", e);
        return {
            balance: 0,
            transactions: []
        };
    }
};

export const requestWalletTopUp = async (data) => {
    try {
        const res = await api.post('/wallet/topup', data);
        return res.data;
    } catch (e) {
        console.error("Failed to request topup", e);
        throw e;
    }
};

export const transferWallet = async (data) => {
    try {
        const res = await api.post('/wallet/transfer', data);
        return res.data;
    } catch (e) {
        console.error("Failed to transfer wallet", e);
        throw e;
    }
};

export const requestWithdrawal = async (data) => {
    try {
        const res = await api.post('/wallet/withdraw', data);
        return res.data;
    } catch (e) {
        console.error("Failed to request withdrawal", e);
        throw e;
    }
};

export const fetchTransactionHistory = async (params) => {
    try {
        const res = await api.get('/transactions', { params });
        return res.data.data;
    } catch (e) {
        console.error("Failed to fetch transaction history", e);
        return [];
    }
};

export const createTransaction = async (data) => {
    try {
        const res = await api.post('/transactions', data);
        return res.data;
    } catch (e) {
        console.error("Failed to create transaction", e);
        throw e;
    }
};

// --- Products ---

export const fetchProducts = async (params) => {
    try {
        const res = await api.get('/products', { params });
        return res.data.data;
    } catch (e) {
        console.error("Failed to fetch products", e);
        return [];
    }
};

// --- Merchants (Admin) ---

export const fetchMerchants = async () => {
    try {
        const res = await api.get('/merchants');
        return res.data.data;
    } catch (e) {
        console.error("Failed to fetch merchants", e);
        return [];
    }
};

export const createMerchant = async (data) => {
    const res = await api.post('/merchants', data);
    return res.data;
};

export const deleteMerchant = async (id) => {
    const res = await api.delete(`/merchants/${id}`);
    return res.data;
};

export const fetchAnalytics = async (params) => {
    try {
        const res = await api.get('/reports/analytics', { params });
        return res.data.data;
    } catch (e) {
        console.error("Failed to fetch analytics", e);
        return {
            summary: { 
                revenue: 0, 
                netProfit: 0, 
                totalTransactions: 0, 
                averageOrderValue: 0,
                growth: { revenue: 0, netProfit: 0 } 
            },
            trend: [],
            topProducts: [],
            categorySales: [],
            paymentMethods: [],
            hourlyStats: [],
            expenses: {},
            insights: [],
            lowStock: []
        };
    }
};

export const fetchProfitLoss = async (startDate, endDate) => {
    try {
        const res = await api.get('/reports/profit-loss', { params: { startDate, endDate } });
        return res.data.data;
    } catch (e) {
        console.error("Failed to fetch profit loss", e);
        return {
            pnl: {
                revenue: 0,
                discountsGiven: 0,
                grossProfit: 0,
                margin: 0,
                cogs: 0,
                totalExpenses: 0,
                netProfit: 0,
                transactionCount: 0,
                expenseBreakdown: {}
            },
            chartData: []
        };
    }
};

export default api;

// --- Inventory ---

export const fetchProductLogs = async (productId) => {
    try {
        const res = await api.get(`/inventory/${productId}/logs`);
        return res.data.data;
    } catch (e) {
        console.error("Failed to fetch product logs", e);
        return [];
    }
};

export const adjustStock = async (data) => {
    try {
        const res = await api.post('/inventory/adjust', data);
        return res.data;
    } catch (e) {
        console.error("Failed to adjust stock", e);
        throw e;
    }
};

export const fetchInventoryIntelligence = async () => {
    try {
        const res = await api.get('/reports/inventory');
        return res.data.data;
    } catch (e) {
        console.error("Failed to fetch inventory intelligence", e);
        return { slowMoving: [], topProducts: [] };
    }
};

export const createProduct = async (data) => {
    try {
        const res = await api.post('/products', data);
        return res.data;
    } catch (e) {
        console.error("Failed to create product", e);
        throw e;
    }
};

export const updateProduct = async (id, data) => {
    try {
        const res = await api.put(`/products/${id}`, data);
        return res.data;
    } catch (e) {
        console.error("Failed to update product", e);
        throw e;
    }
};

export const deleteProduct = async (id) => {
    try {
        const res = await api.delete(`/products/${id}`);
        return res.data;
    } catch (e) {
        console.error("Failed to delete product", e);
        throw e;
    }
};

// --- Banners ---

export const fetchBannersAdmin = async () => {
    try {
        const res = await api.get('/banners');
        return res.data.data;
    } catch (e) {
        console.error("Failed to fetch banners", e);
        return [];
    }
};

export const createBanner = async (data) => {
    try {
        const res = await api.post('/banners', data);
        return res.data;
    } catch (e) {
        console.error("Failed to create banner", e);
        throw e;
    }
};

export const updateBanner = async (id, data) => {
    try {
        const res = await api.put(`/banners/${id}`, data);
        return res.data;
    } catch (e) {
        console.error("Failed to update banner", e);
        throw e;
    }
};

export const deleteBanner = async (id) => {
    try {
        const res = await api.delete(`/banners/${id}`);
        return res.data;
    } catch (e) {
        console.error("Failed to delete banner", e);
        throw e;
    }
};

export const uploadBannerImage = async (file) => {
    try {
        const formData = new FormData();
        formData.append('image', file);
        const res = await api.post('/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return res.data;
    } catch (e) {
        console.error("Failed to upload banner image", e);
        throw e;
    }
};
