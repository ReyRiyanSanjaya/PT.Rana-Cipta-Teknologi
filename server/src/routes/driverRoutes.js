const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');

// All endpoints could be protected by authMiddleware in production
router.post('/register', driverController.registerDriver);
router.get('/:driverId', driverController.getDriverProfile);
router.put('/:driverId/status', driverController.updateStatus);

module.exports = router;
