const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');

// Public System Info
router.get('/payment-info', systemController.getPaymentInfo);
router.get('/announcements', systemController.getActiveAnnouncements);
router.get('/app-menus', systemController.getAppMenus);
router.get('/app-menus/maintenance', systemController.getAppMenuMaintenancePublic);
router.get('/careers/openings', systemController.getCareersOpenings);
router.get('/merchant-categories', (req, res) => {
    const { getAllCategories, getCategoryConfig } = require('../utils/merchantCategory');
    const { successResponse } = require('../utils/response');
    const category = req.query.category;
    if (category) {
        return successResponse(res, getCategoryConfig(category));
    }
    return successResponse(res, getAllCategories());
});

// Protected System Info
const verifyToken = require('../middleware/auth');
router.get('/announcements/me', verifyToken, systemController.getMyAnnouncements);
router.get('/notifications', verifyToken, systemController.getNotifications); 
router.patch('/notifications/:id/read', verifyToken, systemController.markNotificationRead);
router.patch('/notifications/read-all', verifyToken, systemController.markAllNotificationsRead);

// Public Settings for CMP/Content
router.get('/cms-content', systemController.getPublicSettings);
router.get('/config', systemController.getAppConfig);
router.get('/stores/featured', systemController.getFeaturedStores);

module.exports = router;
