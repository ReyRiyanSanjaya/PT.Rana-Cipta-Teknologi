const express = require('express');
const router = express.Router();
const careersController = require('../controllers/careers');
const verifyToken = require('../middleware/auth');
const checkRole = require('../middleware/role');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure Multer for CV uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/cvs');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const safeName = file.originalname.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
        cb(null, uniqueSuffix + '-' + safeName);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /pdf|doc|docx|jpg|jpeg|png/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Hanya file PDF, DOC, DOCX, atau Gambar yang diperbolehkan!'));
    }
});

// Public: submit application
router.post('/applications', upload.single('resume'), careersController.createApplication);

// Admin: list & update applications
router.get('/applications', verifyToken, checkRole(['SUPER_ADMIN']), careersController.getApplications);
router.patch('/applications/:id/status', verifyToken, checkRole(['SUPER_ADMIN']), careersController.updateApplicationStatus);

module.exports = router;
