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

// Acquisition Map
router.get('/acquisition-map', isDistributor, controller.getAcquisitionMap);

// Shipments
router.get('/shipments', isDistributor, controller.getShipments);

// Discounts
router.get('/discounts', isDistributor, controller.getDiscounts);
router.post('/discounts', isDistributor, controller.createDiscount);
router.put('/discounts/:id', isDistributor, controller.updateDiscount);
router.delete('/discounts/:id', isDistributor, controller.deleteDiscount);

// Subscription & Billing (Enterprise SaaS)
const subscriptionCtrl = require('../controllers/distributorSubscriptionController');
router.get('/subscription/plan', isDistributor, subscriptionCtrl.getPlanInfo);
router.get('/subscription/billing', isDistributor, subscriptionCtrl.getBillingHistory);
router.get('/subscription/usage', isDistributor, subscriptionCtrl.getUsageAnalytics);
router.get('/subscription/plans', isDistributor, subscriptionCtrl.getAvailablePlans);

// Warehouse Management
const warehouseCtrl = require('../controllers/distributorWarehouseController');
router.get('/warehouses', isDistributor, warehouseCtrl.getWarehouses);
router.post('/warehouses', isDistributor, warehouseCtrl.createWarehouse);
router.put('/warehouses/:id', isDistributor, warehouseCtrl.updateWarehouse);
router.delete('/warehouses/:id', isDistributor, warehouseCtrl.deleteWarehouse);

// Warehouse Stock Management
router.get('/warehouses/stock', isDistributor, warehouseCtrl.getWarehouseStock);
router.post('/warehouses/stock/adjust', isDistributor, warehouseCtrl.adjustStock);
router.post('/warehouses/stock/bulk-adjust', isDistributor, warehouseCtrl.bulkAdjustStock);
router.get('/warehouses/stock/movements', isDistributor, warehouseCtrl.getStockMovements);

// Forecasting
router.get('/forecasting', isDistributor, warehouseCtrl.getForecasting);

// External Sales (Outside Ecosystem)
router.get('/external-sales', isDistributor, warehouseCtrl.getExternalSales);
router.post('/external-sales', isDistributor, warehouseCtrl.createExternalSale);

// Enterprise Features
const enterpriseCtrl = require('../controllers/distributorEnterpriseController');

// Piutang (Accounts Receivable)
router.get('/receivables', isDistributor, enterpriseCtrl.getReceivables);
router.put('/receivables/:orderId/pay', isDistributor, enterpriseCtrl.markAsPaid);

// Notifications
router.get('/notifications', isDistributor, enterpriseCtrl.getNotifications);
router.put('/notifications/:id/read', isDistributor, enterpriseCtrl.markNotificationRead);
router.put('/notifications/read-all', isDistributor, enterpriseCtrl.markAllNotificationsRead);
router.post('/notifications/send', isDistributor, enterpriseCtrl.sendNotificationToMerchant);

// Storefront / Katalog
router.get('/storefront', isDistributor, enterpriseCtrl.getStorefront);

// Retur & Klaim
router.get('/returns', isDistributor, enterpriseCtrl.getReturns);
router.put('/returns/:orderId/process', isDistributor, enterpriseCtrl.processReturn);

// Sales KPI & Target
router.get('/kpi', isDistributor, enterpriseCtrl.getSalesKPI);

// Loyalty Program
router.get('/loyalty', isDistributor, enterpriseCtrl.getLoyaltyProgram);

// Invoice
router.get('/invoice/:orderId', isDistributor, enterpriseCtrl.generateInvoice);

// Team Management (Multi-User)
const teamCtrl = require('../controllers/distributorTeamController');
router.get('/team', isDistributor, teamCtrl.getTeamMembers);
router.post('/team/invite', isDistributor, teamCtrl.inviteTeamMember);
router.put('/team/:userId/role', isDistributor, teamCtrl.updateMemberRole);
router.put('/team/:userId/toggle', isDistributor, teamCtrl.toggleMemberStatus);
router.delete('/team/:userId', isDistributor, teamCtrl.removeMember);
router.get('/team/my-permissions', isDistributor, teamCtrl.getMyPermissions);
router.get('/team/activity', isDistributor, teamCtrl.getTeamActivity);

// DMS - Distributor Management System
const dmsCtrl = require('../controllers/distributorDmsController');

// Accounting / Jurnal Keuangan
const accountingCtrl = require('../controllers/distributorAccountingController');
router.get('/accounting/accounts', isDistributor, accountingCtrl.getAccounts);
router.post('/accounting/accounts', isDistributor, accountingCtrl.createAccount);
router.get('/accounting/journals', isDistributor, accountingCtrl.getJournals);
router.post('/accounting/journals', isDistributor, accountingCtrl.createJournal);
router.get('/accounting/profit-loss', isDistributor, accountingCtrl.getProfitLoss);
router.get('/accounting/balance-sheet', isDistributor, accountingCtrl.getBalanceSheet);
router.get('/accounting/cashflow', isDistributor, accountingCtrl.getCashflow);

router.get('/dms/hierarchy', isDistributor, dmsCtrl.getHierarchy);
router.post('/dms/hierarchy', isDistributor, dmsCtrl.addToHierarchy);
router.delete('/dms/hierarchy/:userId', isDistributor, dmsCtrl.removeFromHierarchy);
router.get('/dms/territories', isDistributor, dmsCtrl.getTerritories);
router.post('/dms/territories', isDistributor, dmsCtrl.createTerritory);
router.put('/dms/territories/:id', isDistributor, dmsCtrl.updateTerritory);
router.delete('/dms/territories/:id', isDistributor, dmsCtrl.deleteTerritory);

// SFA - Sales Force Automation
router.get('/sfa/dashboard', isDistributor, dmsCtrl.getSfaDashboard);
router.get('/sfa/visits', isDistributor, dmsCtrl.getVisits);
router.post('/sfa/visits', isDistributor, dmsCtrl.createVisit);
router.put('/sfa/visits/:id/checkin', isDistributor, dmsCtrl.checkInVisit);
router.put('/sfa/visits/:id/checkout', isDistributor, dmsCtrl.checkOutVisit);
router.put('/sfa/visits/:id/cancel', isDistributor, dmsCtrl.cancelVisit);
router.get('/sfa/targets', isDistributor, dmsCtrl.getSalesTargets);
router.post('/sfa/targets', isDistributor, dmsCtrl.setSalesTarget);
router.get('/sfa/route-plans', isDistributor, dmsCtrl.getRoutePlans);
router.post('/sfa/route-plans', isDistributor, dmsCtrl.createRoutePlan);
router.delete('/sfa/route-plans/:id', isDistributor, dmsCtrl.deleteRoutePlan);
router.get('/sfa/leaderboard', isDistributor, dmsCtrl.getLeaderboard);

module.exports = router;
