const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');
const authenticateToken = require('../middleware/auth');

router.use(authenticateToken);

router.post('/scores', gameController.submitScore);
router.get('/scores/me', gameController.getMyHighScore);
router.get('/leaderboard', gameController.getLeaderboard);

module.exports = router;
