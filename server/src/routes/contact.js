const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contact');
const verifyToken = require('../middleware/auth');
const checkRole = require('../middleware/role');

router.post('/messages', contactController.createMessage);

// Admin routes
router.get('/messages', verifyToken, checkRole(['SUPER_ADMIN']), contactController.getMessages);
router.patch('/messages/:id/status', verifyToken, checkRole(['SUPER_ADMIN']), contactController.updateMessageStatus);

module.exports = router;
