const express = require('express');
const router = express.Router();
const communityController = require('../controllers/communityController');
const verifyToken = require('../middleware/auth');

router.use(verifyToken);

router.get('/topics', communityController.getTopics);
router.get('/posts', communityController.getPosts);
router.post('/posts', communityController.createPost);
router.get('/posts/:id', communityController.getPostDetails);
router.post('/posts/:id/like', communityController.toggleLike);
router.post('/posts/:id/comments', communityController.addComment);
router.put('/posts/:id', communityController.updatePost);
router.delete('/posts/:id', communityController.deletePost);

module.exports = router;

router.get('/tags/trending', communityController.getTrendingTags);
