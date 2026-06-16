const express = require('express');
const router = express.Router();
const marketController = require('../controllers/marketController');
const marketOrderController = require('../controllers/marketOrderController');
const systemController = require('../controllers/systemController');

router.get('/nearby', marketController.getNearbyStores);
router.get('/food-stores', marketController.getFoodStores); // RanaFood
router.get('/config/payment', systemController.getPaymentInfo);
router.get('/flashsales', marketController.getActiveFlashSales);
router.get('/store/:id/catalog', marketController.getStoreCatalog);
router.get('/store/:id/chat-user', marketController.getStoreChatUser); // [NEW]
router.get('/store/:id/reviews', marketController.getStoreReviews); // [NEW]
router.get('/search', marketController.searchGlobal); // [NEW]
router.post('/favorites', marketController.toggleFavorite); // [NEW]
router.get('/favorites', marketController.getFavorites); // [NEW]
router.post('/product/:id/reviews', marketController.addReview); // [NEW]
router.get('/product/:id', marketController.getProduct);
router.get('/product/recommendations', marketController.getRecommendations); // [NEW]
router.get('/product/:id/reviews', marketController.getProductReviews); // [NEW]

router.post('/order', marketOrderController.createOrder);
router.post('/order/confirm', marketOrderController.confirmPayment);
router.delete('/order/:id', marketOrderController.cancelOrder);
router.get('/order/check-purchased', marketOrderController.checkPurchased);
router.get('/orders', marketOrderController.getOrdersByPhone);

module.exports = router;
