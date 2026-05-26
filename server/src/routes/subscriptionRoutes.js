const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const systemController = require('../controllers/systemController');

const authenticateToken = require('../middleware/auth');

router.get('/packages', subscriptionController.getPackages);
router.get('/banks', authenticateToken, systemController.getSubscriptionBankAccounts);
router.get('/status', authenticateToken, subscriptionController.getStatus);
router.post('/request', authenticateToken, subscriptionController.createRequest);
router.get('/requests', authenticateToken, subscriptionController.getAllRequests); // Admin or Tenant (filtered)
router.post('/requests/:id/approve', subscriptionController.approveRequest); // Admin only

module.exports = router;
