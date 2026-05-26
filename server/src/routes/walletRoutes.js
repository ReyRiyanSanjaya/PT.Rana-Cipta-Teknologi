const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const verifyToken = require('../middleware/auth');
const validate = require('../middleware/validate');
const { withdrawalSchema, topUpSchema, transferSchema } = require('../validations/schemas');

router.use(verifyToken);
router.get('/', walletController.getWalletData);
router.post('/withdraw', validate(withdrawalSchema), walletController.requestWithdrawal);

router.post('/topup', validate(topUpSchema), walletController.topUp);
router.post('/transfer', validate(transferSchema), walletController.transfer);
router.post('/transaction', walletController.payTransaction);

module.exports = router;
