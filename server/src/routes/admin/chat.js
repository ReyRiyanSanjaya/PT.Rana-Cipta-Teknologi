const express = require('express');
const router = express.Router();
const chat = require('../../controllers/admin/ChatController');
const verifyToken = require('../../middleware/auth');
const checkRole = require('../../middleware/role');

router.use(verifyToken);
router.use(checkRole(['SUPER_ADMIN']));

router.get('/rooms', chat.listRooms);
router.post('/rooms', chat.createRoom);
router.put('/rooms/:id', chat.updateRoom);
router.delete('/rooms/:id', chat.deleteRoom);
router.get('/rooms/:id/members', chat.getRoomMembers);
router.post('/rooms/:id/members', chat.addMember);
router.delete('/rooms/:id/members/:userId', chat.removeMember);
router.get('/rooms/:id/messages', chat.getRoomMessages);
router.post('/rooms/:id/messages', chat.sendMessage);
router.post('/broadcasts', chat.broadcastMessages);

module.exports = router;
