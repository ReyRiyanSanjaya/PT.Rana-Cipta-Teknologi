const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/admin/aiMarketingController');

router.get('/dashboard', ctrl.getDashboard);
router.get('/config', ctrl.getConfig);
router.put('/config', ctrl.updateConfig);
router.post('/analyze', ctrl.runAnalysis);
router.get('/analysis', ctrl.getAnalysis);
router.post('/branding/generate', ctrl.generateBranding);
router.get('/branding', ctrl.getBranding);
router.post('/campaign/generate', ctrl.generateCampaign);
router.get('/campaigns', ctrl.getCampaigns);
router.post('/run', ctrl.runFullAutomation);

module.exports = router;
