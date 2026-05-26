const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const cashController = require('../controllers/cashController');
const verifyToken = require('../middleware/auth');
const checkSubscription = require('../middleware/subscription');

// Secure all routes
router.use(verifyToken);
router.use(checkSubscription);

// Reporting Endpoints
router.get('/dashboard', reportController.getDashboardStats);
router.get('/profit-loss', reportController.getProfitLoss);
router.get('/inventory', reportController.getInventoryIntelligence);
router.get('/analytics', reportController.getAnalytics);
router.post('/assistant', reportController.merchantAssistant);
router.post('/expenses', cashController.recordExpense);
router.post('/debts', cashController.recordDebt);
router.post('/daily-report', cashController.triggerDailyReport);

module.exports = router;
