const express = require('express');
const router = express.Router();
const tableController = require('../controllers/tableController');
const verifyToken = require('../middleware/auth');

// ==================== PUBLIC (Customer via QR scan) ====================
// No auth needed — QR code is the authentication

router.get('/qr/:qrCode', tableController.getTableByQR);
router.post('/qr/:qrCode/order', tableController.placeTableOrder);
router.post('/qr/:qrCode/bill', tableController.requestBill);

// ==================== MERCHANT (Authenticated) ====================

router.get('/', verifyToken, tableController.getTables);
router.post('/', verifyToken, tableController.createTable);
router.put('/:id', verifyToken, tableController.updateTable);
router.delete('/:id', verifyToken, tableController.deleteTable);

// Sessions
router.post('/session', verifyToken, tableController.openSession);
router.get('/session/:tableId', verifyToken, tableController.getActiveSession);
router.put('/session/:sessionId/close', verifyToken, tableController.closeSession);

// Kitchen Display
router.get('/kitchen', verifyToken, tableController.getKitchenOrders);
router.put('/kitchen/:orderId', verifyToken, tableController.updateOrderStatus);

// Payment Management (Merchant)
router.get('/unpaid', verifyToken, tableController.getUnpaidSessions);
router.put('/payment/:sessionId', verifyToken, tableController.processPayment);

// Payment (Customer via QR - no auth)
router.post('/qr/:qrCode/pay', tableController.markPaymentPending);

// Admin: All sessions
router.get('/sessions', verifyToken, tableController.getAllSessions);

module.exports = router;
