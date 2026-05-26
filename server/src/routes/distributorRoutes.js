const express = require('express');
const router = express.Router();
const controller = require('../controllers/distributorController');
const authenticateToken = require('../middleware/auth');
const checkRole = require('../middleware/role');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer Config for Product Images
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const absoluteDir = path.join(__dirname, '../../uploads/products');
        fs.mkdirSync(absoluteDir, { recursive: true });
        cb(null, absoluteDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Middleware to ensure user is a Distributor
const isDistributor = [authenticateToken, checkRole(['DISTRIBUTOR'])];

// Upload Route
router.post('/upload', isDistributor, upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ status: 'error', message: 'No file uploaded' });
        }
        // Construct URL based on static serve path
        const fileUrl = `/uploads/products/${req.file.filename}`;
        return res.status(200).json({ 
            status: 'success', 
            data: { url: fileUrl },
            message: 'File uploaded successfully' 
        });
    } catch (error) {
        console.error('Upload error:', error);
        return res.status(500).json({ status: 'error', message: 'Upload failed' });
    }
});

// Profile
router.get('/profile', isDistributor, controller.getProfile);
router.put('/profile', isDistributor, controller.updateProfile);

// Dashboard
router.get('/dashboard', isDistributor, controller.getDashboardStats);

// Products
router.get('/categories', isDistributor, controller.getCategories);
router.get('/products', isDistributor, controller.getProducts);
router.get('/products/:id', isDistributor, controller.getProductById);
router.post('/products', isDistributor, controller.createProduct);
router.put('/products/:id', isDistributor, controller.updateProduct);
router.delete('/products/:id', isDistributor, controller.deleteProduct);

// Orders
router.get('/orders', isDistributor, controller.getOrders);
router.get('/orders/:id', isDistributor, controller.getOrderById);
router.put('/orders/:id/status', isDistributor, controller.updateOrderStatus);

// Customers (Merchants)
router.get('/customers', isDistributor, controller.getCustomers);
router.put('/customers/:id/credit', isDistributor, controller.updateCustomerCredit);

// Shipments
router.get('/shipments', isDistributor, controller.getShipments);

// Discounts
router.get('/discounts', isDistributor, controller.getDiscounts);
router.post('/discounts', isDistributor, controller.createDiscount);
router.put('/discounts/:id', isDistributor, controller.updateDiscount);
router.delete('/discounts/:id', isDistributor, controller.deleteDiscount);

module.exports = router;
