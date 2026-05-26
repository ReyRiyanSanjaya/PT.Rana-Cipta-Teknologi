const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const multer = require('multer');
const path = require('path');

const verifyToken = require('../middleware/auth');

// Multer Config for General Auth Uploads (e.g. Driver KYC)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

const validate = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../validations/schemas');

router.post('/register', upload.any(), validate(registerSchema), authController.register);
router.post('/register-distributor', authController.registerDistributor); // [NEW]
router.post('/login', authController.login);
router.get('/me', verifyToken, authController.getProfile);
router.put('/me', verifyToken, authController.updateUserProfile);
router.put('/store', verifyToken, authController.updateStoreProfile); // [NEW]

module.exports = router;
