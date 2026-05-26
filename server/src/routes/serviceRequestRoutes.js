const express = require('express');
const router = express.Router();
const serviceRequestController = require('../controllers/serviceRequestController');

router.post('/', serviceRequestController.createRequest);
router.get('/pending', serviceRequestController.getPendingRequests);
router.put('/:requestId/accept', serviceRequestController.acceptRequest);
router.put('/:requestId/status', serviceRequestController.updateRequestStatus);

module.exports = router;
