const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/admin/emailRecipientsController');

router.get('/stats', ctrl.getStats);
router.post('/sync', ctrl.syncFromUsers);
router.post('/import', ctrl.bulkImport);
router.post('/lists', ctrl.createList);
router.delete('/lists/:id', ctrl.deleteList);
router.get('/:id', ctrl.getRecipients); // won't conflict since stats/sync/import come first
router.put('/:id', ctrl.updateRecipient);
router.delete('/:id', ctrl.deleteRecipient);
router.post('/', ctrl.addRecipient);
router.get('/', ctrl.getRecipients);

module.exports = router;
