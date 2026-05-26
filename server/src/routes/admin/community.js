const express = require('express');
const router = express.Router();
const controller = require('../../controllers/admin/CommunityController');

// Topics
router.get('/topics', controller.getTopics);
router.post('/topics', controller.createTopic);
router.put('/topics/:id', controller.updateTopic);
router.delete('/topics/:id', controller.deleteTopic);

// Posts
router.get('/posts', controller.getPosts);
router.delete('/posts/:id', controller.deletePost);

module.exports = router;
