const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/admin/driverAdminController');

router.get('/stats', ctrl.getDriverStats);
router.get('/revenue', ctrl.getDriverRevenue);
router.get('/map', ctrl.getDriverMap);
router.get('/online', ctrl.getOnlineDrivers);
router.get('/orders', ctrl.getDriverOrders);
router.get('/pending', ctrl.getPendingDrivers);
router.get('/fee-settings', ctrl.getDriverFeeSettings);
router.post('/fee-settings', ctrl.saveDriverFeeSettings);
router.post('/broadcast', ctrl.broadcastToDrivers);
router.put('/:id/approve', ctrl.approveDriver);
router.put('/:id/suspend', ctrl.suspendDriver);
router.get('/:id', ctrl.getDriverDetail);
router.put('/:id', ctrl.updateDriver);
router.get('/', ctrl.getDrivers);

module.exports = router;
