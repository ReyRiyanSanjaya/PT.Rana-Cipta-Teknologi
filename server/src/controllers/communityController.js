const prisma = require('../config/database'); // [FIX] Singleton Prisma

exports.getTopics = async (req, res) => {
  try {
    const topics = await prisma.communityTopic.findMany({
      include: {
        _count: {
          select: { posts: true }
        }
      }
    });
    res.json(topics);
  } catch (error) {
    console.error('Error fetching topics:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getPosts = async (req, res) => {
  const { topicId, tag } = req.query;
  try {
    const where = {};
    if (topicId) where.topicId = parseInt(topicId);
    if (tag) where.tags = { has: tag };

    const posts = await prisma.communityPost.findMany({
      where,
      include: {
        author: {
          select: { id: true, name: true }
        },
        topic: true,
        _count: {
          select: { comments: true, postLikes: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.createPost = async (req, res) => {
  const { topicId, title, content, tags, image } = req.body;
  const authorId = req.user.id;

  try {
    const post = await prisma.communityPost.create({
      data: {
        topicId: parseInt(topicId),
        authorId,
        title,
        content,
        tags: tags || [],
        image
      }
    });
    res.status(201).json(post);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getPostDetails = async (req, res) => {
  const { id } = req.params;
  try {
    const post = await prisma.communityPost.findUnique({
      where: { id: parseInt(id) },
      include: {
        author: { select: { id: true, name: true } },
        topic: true,
        comments: {
          include: {
            author: { select: { id: true, name: true } }
          },
          orderBy: { createdAt: 'asc' }
        },
        _count: { select: { postLikes: true } }
      }
    });
    
    if (!post) return res.status(404).json({ error: 'Post not found' });

    // Increment view count
    await prisma.communityPost.update({
      where: { id: parseInt(id) },
      data: { views: { increment: 1 } }
    });

    // Check if current user liked
    const userId = req.user.id;
    const liked = await prisma.communityPostLike.findUnique({
      where: {
        postId_userId: {
          postId: parseInt(id),
          userId
        }
      }
    });

    res.json({ ...post, isLiked: !!liked });
  } catch (error) {
    console.error('Error fetching post details:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.toggleLike = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const postId = parseInt(id);

  try {
    const existingLike = await prisma.communityPostLike.findUnique({
      where: {
        postId_userId: {
          postId,
          userId
        }
      }
    });

    if (existingLike) {
      await prisma.communityPostLike.delete({
        where: { id: existingLike.id }
      });
      await prisma.communityPost.update({
        where: { id: postId },
        data: { likes: { decrement: 1 } }
      });
      res.json({ liked: false });
    } else {
      await prisma.communityPostLike.create({
        data: { postId, userId }
      });
      await prisma.communityPost.update({
        where: { id: postId },
        data: { likes: { increment: 1 } }
      });
      res.json({ liked: true });
    }
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.addComment = async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  const userId = req.user.id;

  try {
    const comment = await prisma.communityComment.create({
      data: {
        postId: parseInt(id),
        authorId: userId,
        content
      },
      include: {
        author: { select: { id: true, name: true } }
      }
    });
    res.status(201).json(comment);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.updatePost = async (req, res) => {
  const { id } = req.params;
  const { title, content, tags, image } = req.body;
  const userId = req.user.id;

  try {
    const post = await prisma.communityPost.findUnique({ where: { id: parseInt(id) } });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.authorId !== userId) return res.status(403).json({ error: 'Not allowed' });

    const updated = await prisma.communityPost.update({
      where: { id: parseInt(id) },
      data: {
        title: title ?? post.title,
        content: content ?? post.content,
        tags: Array.isArray(tags) ? tags : post.tags,
        image: image ?? post.image
      }
    });
    res.json(updated);
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.deletePost = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const post = await prisma.communityPost.findUnique({ where: { id: parseInt(id) } });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.authorId !== userId) return res.status(403).json({ error: 'Not allowed' });

    await prisma.communityComment.deleteMany({ where: { postId: parseInt(id) } });
    await prisma.communityPostLike.deleteMany({ where: { postId: parseInt(id) } });
    await prisma.communityPost.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getTrendingTags = async (req, res) => {
  try {
    const posts = await prisma.communityPost.findMany({
      select: { tags: true },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    const tagCounts = {};
    posts.forEach(post => {
      if (Array.isArray(post.tags)) {
        post.tags.forEach(tag => {
          const normalizedTag = tag.trim(); 
          if (normalizedTag) {
            tagCounts[normalizedTag] = (tagCounts[normalizedTag] || 0) + 1;
          }
        });
      }
    });

    const sortedTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(item => item.tag);

    res.json(sortedTags);
  } catch (error) {
    console.error('Error fetching trending tags:', error);
    res.status(500).json({ error: error.message });
  }
};
