const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authenticateToken = require('../middleware/auth');

// AI Agent endpoint - proxies to the merchant assistant
router.post('/agent', authenticateToken, reportController.merchantAssistant);

module.exports = router;
