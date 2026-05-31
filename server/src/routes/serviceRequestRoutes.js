const express = require('express');
const router = express.Router();
const serviceRequestController = require('../controllers/serviceRequestController');
const verifyToken = require('../middleware/auth');

// Buyer creates a service request (authenticated)
router.post('/', verifyToken, serviceRequestController.createRequest);

// Calculate price (authenticated)
router.post('/calculate-price', verifyToken, serviceRequestController.calculatePrice);

// Get buyer's ride history
router.get('/my-rides', verifyToken, serviceRequestController.getMyRides);

// Get pending requests (for drivers) - must be before /:requestId
router.get('/pending', serviceRequestController.getPendingRequests);

// Buyer checks request status
router.get('/:requestId', verifyToken, serviceRequestController.getRequestStatus);

// Get ETA for active trip
router.get('/:requestId/eta', verifyToken, serviceRequestController.getETA);

// Buyer cancels a request
router.put('/:requestId/cancel', verifyToken, serviceRequestController.cancelRequest);

// Buyer gives tip
router.post('/:requestId/tip', verifyToken, serviceRequestController.giveTip);

// Driver accepts (legacy - prefer /api/driver/accept/:id)
router.put('/:requestId/accept', serviceRequestController.acceptRequest);

// Update status
router.put('/:requestId/status', serviceRequestController.updateRequestStatus);

module.exports = router;
