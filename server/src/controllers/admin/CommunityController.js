const prisma = require('../../config/database'); // [FIX] Singleton Prisma

// =======================
// TOPICS MANAGEMENT
// =======================

exports.getTopics = async (req, res) => {
    try {
        const topics = await prisma.communityTopic.findMany({
            include: {
                _count: {
                    select: { posts: true }
                }
            },
            orderBy: { id: 'asc' }
        });
        res.json({ success: true, data: topics });
    } catch (error) {
        console.error('Error fetching topics:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createTopic = async (req, res) => {
    try {
        const { title, description, icon, color } = req.body;
        const topic = await prisma.communityTopic.create({
            data: {
                title,
                description,
                icon,
                color
            }
        });
        res.json({ success: true, data: topic });
    } catch (error) {
        console.error('Error creating topic:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateTopic = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, icon, color } = req.body;
        const topic = await prisma.communityTopic.update({
            where: { id: parseInt(id) },
            data: {
                title,
                description,
                icon,
                color
            }
        });
        res.json({ success: true, data: topic });
    } catch (error) {
        console.error('Error updating topic:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteTopic = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Optional: Check for posts first or delete them
        // For now, we rely on Prisma to throw error if constraints exist, 
        // or we manually delete related posts if we want cascade.
        // Let's manually delete posts to be safe/clean
        await prisma.communityPost.deleteMany({
            where: { topicId: parseInt(id) }
        });

        await prisma.communityTopic.delete({
            where: { id: parseInt(id) }
        });

        res.json({ success: true, message: "Topic deleted successfully" });
    } catch (error) {
        console.error('Error deleting topic:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// =======================
// POSTS MANAGEMENT
// =======================

exports.getPosts = async (req, res) => {
    try {
        const posts = await prisma.communityPost.findMany({
            include: {
                topic: true,
                author: {
                    select: { id: true, name: true, email: true }
                },
                _count: {
                    select: { comments: true, postLikes: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: posts });
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deletePost = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Delete related data first (comments, likes)
        await prisma.communityComment.deleteMany({
            where: { postId: parseInt(id) }
        });
        
        await prisma.communityPostLike.deleteMany({
            where: { postId: parseInt(id) }
        });

        await prisma.communityPost.delete({
            where: { id: parseInt(id) }
        });
        
        res.json({ success: true, message: "Post deleted successfully" });
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
