const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const chatController = require('../controllers/chatController');
const authenticateToken = require('../middleware/auth');

// File upload config for chat attachments
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'chat-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

router.use(authenticateToken);

router.get('/rooms', chatController.getRooms);
router.post('/rooms', chatController.createRoom);
router.get('/rooms/:roomId/messages', chatController.getMessages);
router.post('/rooms/:roomId/messages', upload.single('file'), chatController.sendMessage);
router.post('/rooms/:roomId/read', chatController.markRoomRead);

module.exports = router;