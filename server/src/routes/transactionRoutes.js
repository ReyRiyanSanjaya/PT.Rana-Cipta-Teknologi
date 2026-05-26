const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const verifyToken = require('../middleware/auth');

// Secure
router.use(verifyToken);
router.use(require('../middleware/subscription')); // Block Sync if expired

const validate = require('../middleware/validate');
const { syncTransactionSchema } = require('../validations/schemas');

router.post('/sync', validate(syncTransactionSchema), transactionController.syncTransaction);
router.get('/history', transactionController.getTransactionHistory);

module.exports = router;
