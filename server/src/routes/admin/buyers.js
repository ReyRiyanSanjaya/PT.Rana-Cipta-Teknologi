const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/admin/buyerAdminController');

router.get('/stats', ctrl.getBuyerStats);
router.get('/revenue', ctrl.getBuyerRevenue);
router.get('/orders', ctrl.getBuyerOrders);
router.get('/:id', ctrl.getBuyerDetail);
router.put('/:id', ctrl.updateBuyer);
router.get('/', ctrl.getBuyers);

module.exports = router;
