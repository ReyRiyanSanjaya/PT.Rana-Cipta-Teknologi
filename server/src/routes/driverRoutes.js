const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const driverController = require('../controllers/driverController');
const verifyToken = require('../middleware/auth');

// Multer for proof photos
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads/proofs')),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'proof-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Public / Admin routes
router.post('/register', driverController.registerDriver);
router.get('/by-id/:driverId', driverController.getDriverById);

// Rating (from customer app - no driver auth needed, uses customer auth)
router.post('/rate/:requestId', verifyToken, driverController.rateDriver);

// Leaderboard & Community (authenticated)
router.get('/leaderboard', verifyToken, driverController.getLeaderboard);
router.get('/community', verifyToken, driverController.getCommunityPosts);
router.post('/community', verifyToken, driverController.createCommunityPost);

// Heat map / demand zones
router.get('/hotspots', verifyToken, driverController.getHotspots);

// Authenticated driver routes
router.get('/profile', verifyToken, driverController.getDriverProfile);
router.put('/profile', verifyToken, driverController.updateProfile);
router.put('/status', verifyToken, driverController.updateStatus);
router.put('/location', verifyToken, driverController.updateLocation);
router.get('/wallet', verifyToken, driverController.getWallet);
router.get('/wallet/transactions', verifyToken, driverController.getWalletTransactions);
router.get('/wallet/withdrawals', verifyToken, driverController.getWithdrawals);
router.post('/wallet/withdraw', verifyToken, driverController.requestWithdrawal);
router.get('/earnings', verifyToken, driverController.getEarnings);
router.get('/stats', verifyToken, driverController.getStats);
router.get('/trips', verifyToken, driverController.getTripHistory);
router.get('/active-trip', verifyToken, driverController.getActiveTrip);
router.get('/available-requests', verifyToken, driverController.getAvailableRequests);
router.get('/trip-chat/:requestId', verifyToken, driverController.getTripChatRoom);
router.post('/proof/:requestId', verifyToken, upload.single('photo'), driverController.uploadProof);
router.post('/accept/:requestId', verifyToken, driverController.acceptRequest);
router.put('/trip/:requestId/status', verifyToken, driverController.updateTripStatus);

module.exports = router;
