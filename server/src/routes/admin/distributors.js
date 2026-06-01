const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/admin/distributorAdminController');

router.get('/stats', ctrl.getDistributorStats);
router.get('/revenue', ctrl.getDistributorRevenue);
router.get('/orders', ctrl.getWholesaleOrders);
router.put('/:id/approve', ctrl.approveDistributor);
router.put('/:id/reject', ctrl.rejectDistributor);
router.get('/:id', ctrl.getDistributorDetail);
router.get('/', ctrl.getDistributors);

module.exports = router;
