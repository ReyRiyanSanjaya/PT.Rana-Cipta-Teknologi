const prisma = require('../config/database'); // [FIX] Singleton Prisma
const { successResponse, errorResponse } = require('../utils/response');
const AggregationService = require('../services/aggregationService');
const { emitToTenant, emitToAdmin, emitPublic } = require('../socket');

/**
 * Handle incoming sync batches from offline clients
 */
const fs = require('fs');
const path = require('path');

const logger = require('../config/logger');

const logSync = (msg) => {
    logger.debug(`[Sync] ${msg}`);
    // Optional: Keep file logging if user prefers it for offline debug
    try {
        const logPath = path.join(__dirname, '../../sync_debug.log');
        const time = new Date().toISOString();
        fs.appendFileSync(logPath, `[${time}] ${msg}\n`);
    } catch (_) {}
};

const syncTransaction = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const transactionData = req.body;

        logSync(`Receiving Sync: ${JSON.stringify(transactionData)}`);

        // Validate structure
        if (!transactionData.offlineId || !transactionData.items) {
            logSync('Invalid Data');
            return errorResponse(res, "Invalid transaction data", 400);
        }

        let storeId = transactionData.storeId || req.user.storeId;
        
        // [FIX] Validate storeId exists and belongs to tenant
        if (storeId) {
             const validStore = await prisma.store.findFirst({ 
                where: { id: storeId, tenantId },
                select: { id: true }
            });
            if (!validStore) storeId = null; // Invalid storeId provided
        }

        if (!storeId) {
            const store = await prisma.store.findFirst({ where: { tenantId }, select: { id: true } });
            storeId = store?.id;
        }
        if (!storeId) return errorResponse(res, "No store found for tenant", 404);

        // 1. Idempotency Check
        const existing = await prisma.transaction.findUnique({
            where: {
                tenantId_offlineId: {
                    tenantId,
                    offlineId: transactionData.offlineId
                }
            }
        });

        if (existing) {
            logSync(`Already Synced: ${existing.id}`);
            return successResponse(res, { id: existing.id, status: 'ALREADY_SYNCED' }, "Transaction already exists");
        }

        const productIds = transactionData.items.map(i => i.productId);
        // Verify products exist AND belong to the tenant to prevent FK errors or data leaks
        const validProducts = await prisma.product.findMany({
            where: {
                id: { in: productIds },
                tenantId: tenantId
            },
            select: { id: true, sellingPrice: true, basePrice: true, name: true, sku: true, imageUrl: true }
        });
        const validProductMap = new Map(validProducts.map(p => [p.id, p]));

        // [FIX] Relaxed Validation for Deleted Products
        if (validProducts.length !== productIds.length) {
            const foundIds = validProducts.map(p => p.id);
            const missing = productIds.filter(id => !foundIds.includes(id));
            logSync(`Missing Products in DB: ${missing.join(', ')}`);
            
            return errorResponse(res, "Product Mismatch - Please Refresh Products", 400, { 
                code: "PRODUCT_MISMATCH", 
                missingIds: missing 
            });
        }

        const prismaItems = transactionData.items.map(item => {
            const prod = validProductMap.get(item.productId);
            return {
                productId: item.productId,
                quantity: item.quantity,
                price: Number(item.price || prod?.sellingPrice || 0),
                // [NEW] Snapshot Data (Prefer Client Data if available)
                productName: item.productName || prod?.name || "Unknown Product",
                productSku: item.productSku || prod?.sku,
                productImage: item.productImage || prod?.imageUrl,
                basePrice: item.basePrice !== undefined ? Number(item.basePrice) : (prod?.basePrice || 0)
            };
        });

        const qtyByProductId = new Map();
        for (const item of prismaItems) {
            const qty = Number(item.quantity || 0);
            if (!qtyByProductId.has(item.productId)) qtyByProductId.set(item.productId, 0);
            qtyByProductId.set(item.productId, qtyByProductId.get(item.productId) + qty);
        }

        const stockChanges = [];
        const newTxn = await prisma.$transaction(async (tx) => {
            const createdTxn = await tx.transaction.create({
                data: {
                    tenantId,
                    storeId,
                    cashierId: req.user.userId || transactionData.cashierId,
                    offlineId: transactionData.offlineId,
                    occurredAt: new Date(transactionData.occurredAt),
                    orderStatus: 'COMPLETED',
                    paymentStatus: 'PAID',
                    paymentMethod: transactionData.paymentMethod || 'CASH',
                    totalAmount: Number(transactionData.totalAmount),
                    amountPaid: Number(transactionData.totalAmount),
                    change: 0,
                    transactionItems: {
                        create: prismaItems
                    }
                }
            });

            for (const [productId, qty] of qtyByProductId.entries()) {
                if (!qty) continue;

                const product = await tx.product.findFirst({
                    where: { id: productId, tenantId },
                    select: { id: true, stock: true, name: true }
                });
                if (!product) {
                    console.log(`[Sync] Product not found or invalid tenant: ${productId}`);
                    continue;
                }

                // [FIX] Use atomic decrement to prevent race conditions
                // const nextProductStock = Math.max(0, Number(product.stock || 0) - qty);
                console.log(`[Sync] Deducting Stock for ${product.name} (${productId}) by ${qty}`);

                const updatedProduct = await tx.product.update({
                    where: { id: product.id },
                    data: { 
                        stock: { decrement: qty } 
                    }
                });

                // Calculate nextStoreQty for create case only
                // For update, we use decrement
                const existingStock = await tx.stock.findUnique({
                    where: { storeId_productId: { storeId, productId } },
                    select: { quantity: true }
                });
                
                // If creating, we estimate initial. If updating, we decrement.
                const initialCreateQty = Math.max(0, Number(product.stock || 0) - qty);

                const updatedStock = await tx.stock.upsert({
                    where: { storeId_productId: { storeId, productId } },
                    update: { 
                        quantity: { decrement: qty } 
                    },
                    create: { 
                        storeId, 
                        productId, 
                        quantity: initialCreateQty 
                    }
                });

                await tx.inventoryLog.create({
                    data: {
                        productId,
                        storeId,
                        type: 'OUT',
                        quantity: -qty,
                        reason: 'Sale',
                        createdAt: new Date()
                    }
                });

                stockChanges.push({ 
                    productId, 
                    stock: updatedProduct.stock, 
                    storeStock: updatedStock.quantity 
                });
            }

            return createdTxn;
        });

        logSync(`Success: ${newTxn.id}`);

        // Async aggregation
        const dateStr = transactionData.occurredAt.split('T')[0];
        AggregationService.processDailyAggregates(tenantId, storeId, dateStr);

        emitToTenant(tenantId, 'transactions:created', { id: newTxn.id, storeId, occurredAt: transactionData.occurredAt });
        if (stockChanges.length) emitToTenant(tenantId, 'inventory:changed', { storeId, changes: stockChanges });

        // [REALTIME] Emit public event for map visualization (Async)
        prisma.store.findUnique({ 
            where: { id: storeId }, 
            select: { location: true, category: true } 
        }).then(store => {
            if (store) {
                emitPublic('public:transaction_created', {
                    id: newTxn.id,
                    city: store.location || 'Indonesia',
                    category: store.category,
                    amount: Number(transactionData.totalAmount),
                    occurredAt: transactionData.occurredAt
                });
            }
        }).catch(err => console.error("Failed to emit public txn", err));

        return successResponse(res, { id: newTxn.id, status: 'SYNCED' }, "Sync successful");

    } catch (error) {
        // [FIX] Handle Race Condition (Unique Constraint)
        if (error.code === 'P2002') {
            const targets = error.meta?.target || [];
            if (Array.isArray(targets) && targets.includes('tenantId') && targets.includes('offlineId')) {
                logSync(`Already Synced (Race Condition)`);
                 try {
                     const tenantId = req.user.tenantId;
                     const offlineId = req.body.offlineId;
                     const existing = await prisma.transaction.findUnique({
                        where: { tenantId_offlineId: { tenantId, offlineId } }
                     });
                     if (existing) {
                         return successResponse(res, { id: existing.id, status: 'ALREADY_SYNCED' }, "Transaction already exists");
                     }
                 } catch (innerError) {
                     // Fallback to error response if something else fails
                 }
            }
        }

        logSync(`ERROR: ${error.message} \nStack: ${error.stack}`);
        console.error(error); // Keep console log
        return errorResponse(res, "Sync failed", 500, error);
    }
};

const getTransactionHistory = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { limit = 100, startDate, endDate } = req.query;

        const where = { tenantId };
        if (startDate && endDate) {
            where.occurredAt = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }

        const transactions = await prisma.transaction.findMany({
            where,
            include: {
                transactionItems: {
                    include: {
                        product: { select: { basePrice: true, name: true } }
                    }
                }
            },
            orderBy: { occurredAt: 'desc' },
            take: Number(limit)
        });

        const data = transactions.map(t => ({
            id: t.id,
            offlineId: t.offlineId,
            tenantId: t.tenantId,
            storeId: t.storeId,
            cashierId: t.cashierId,
            totalAmount: t.totalAmount,
            paymentMethod: t.paymentMethod,
            status: t.orderStatus, // Map orderStatus to status
            occurredAt: t.occurredAt,
            createdAt: t.createdAt,
            items: t.transactionItems.map(ti => ({
                productId: ti.productId,
                quantity: ti.quantity,
                price: ti.price,
                // Return the snapshot basePrice first, fallback to product current basePrice
                basePrice: ti.basePrice ?? ti.costPrice ?? ti.product?.basePrice ?? 0,
                costPrice: ti.basePrice ?? ti.costPrice ?? ti.product?.basePrice ?? 0,
                name: ti.productName ?? ti.product?.name
            }))
        }));

        successResponse(res, data);
    } catch (error) {
        console.error("History Error:", error);
        errorResponse(res, "Failed to fetch history", 500, error);
    }
};

module.exports = {
    syncTransaction,
    getTransactionHistory
};
