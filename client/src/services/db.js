/**
 * RanaDB - Offline First Database Layer
 * Uses raw IndexedDB for zero-dependency handling of offline transactions.
 */

const DB_NAME = 'RanaPOS_DB';
const DB_VERSION = 2;
const STORES = {
    TRANSACTIONS: 'transactions',
    PRODUCTS: 'products', // Cache for offline lookup
    SYNC_QUEUE: 'sync_queue',
    CASH_SHIFTS: 'cash_shifts',
    CASH_MUTATIONS: 'cash_mutations'
};

const openDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => reject('Database error: ' + event.target.error);

        request.onsuccess = (event) => resolve(event.target.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Store for Completed Transactions (History)
            if (!db.objectStoreNames.contains(STORES.TRANSACTIONS)) {
                db.createObjectStore(STORES.TRANSACTIONS, { keyPath: 'offlineId' });
            }

            // Store for Product Catalog (Read-heavy)
            if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
                const productStore = db.createObjectStore(STORES.PRODUCTS, { keyPath: 'id' });
                productStore.createIndex('sku', 'sku', { unique: true });
            }

            // Store for Pending Sync Items
            if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
                db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
            }

            // Store for Cash Shifts
            if (!db.objectStoreNames.contains(STORES.CASH_SHIFTS)) {
                const shiftStore = db.createObjectStore(STORES.CASH_SHIFTS, { keyPath: 'offlineId' });
                shiftStore.createIndex('status', 'status', { unique: false });
            }

            // Store for Cash Mutations
            if (!db.objectStoreNames.contains(STORES.CASH_MUTATIONS)) {
                const mutationStore = db.createObjectStore(STORES.CASH_MUTATIONS, { keyPath: 'id', autoIncrement: true });
                mutationStore.createIndex('shiftId', 'shiftId', { unique: false });
            }
        };
    });
};

const RanaDB = {
    // Add a transaction to the offline queue
    async queueTransaction(transactionData) {
        const db = await openDB();
        const tx = db.transaction([STORES.SYNC_QUEUE, STORES.TRANSACTIONS], 'readwrite');

        // 1. Save to History (UI display)
        const historyStore = tx.objectStore(STORES.TRANSACTIONS);
        historyStore.add({
            ...transactionData,
            status: 'PENDING_SYNC', // Local status
            syncedAt: null
        });

        // 2. Add to Sync Queue
        const queueStore = tx.objectStore(STORES.SYNC_QUEUE);
        queueStore.add({
            type: 'NEW_TRANSACTION',
            payload: transactionData,
            createdAt: new Date().toISOString()
        });

        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
        });
    },

    // Save transaction that is ALREADY synced (skip queue)
    async saveSyncedTransaction(transactionData) {
        const db = await openDB();
        const tx = db.transaction([STORES.TRANSACTIONS], 'readwrite');

        const historyStore = tx.objectStore(STORES.TRANSACTIONS);
        historyStore.add({
            ...transactionData,
            status: 'SYNCED',
            syncedAt: new Date().toISOString()
        });

        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
        });
    },

    // Get all pending items to sync
    async getPendingSync() {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.SYNC_QUEUE, 'readonly');
            const store = tx.objectStore(STORES.SYNC_QUEUE);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    // Clear synced items
    async clearSyncQueue(ids) {
        const db = await openDB();
        const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
        const store = tx.objectStore(STORES.SYNC_QUEUE);
        ids.forEach(id => store.delete(id));
        return new Promise((resolve) => {
            tx.oncomplete = () => resolve(true);
        });
    },

    // --- Shift Management ---

    async getOpenShift() {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.CASH_SHIFTS, 'readonly');
            const store = tx.objectStore(STORES.CASH_SHIFTS);
            const index = store.index('status');
            const request = index.get('OPEN');
            
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    },

    async openShift(shiftData) {
        const db = await openDB();
        const tx = db.transaction(STORES.CASH_SHIFTS, 'readwrite');
        const store = tx.objectStore(STORES.CASH_SHIFTS);
        
        store.add({
            ...shiftData,
            status: 'OPEN',
            synced: 0
        });

        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
        });
    },

    async closeShift(offlineId, closeData) {
        const db = await openDB();
        const tx = db.transaction(STORES.CASH_SHIFTS, 'readwrite');
        const store = tx.objectStore(STORES.CASH_SHIFTS);
        
        const request = store.get(offlineId);
        
        request.onsuccess = () => {
            const data = request.result;
            if (!data) return;

            const updated = { ...data, ...closeData, status: 'CLOSED', synced: 0 };
            store.put(updated);
        };

        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
        });
    },

    async getShiftSummary(offlineId) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
             // Calculate totals from transactions and mutations for this shift
             // This is a simplified version; normally we'd query by time range or store relation
             // For now, let's assume we just return basic info or need to query transactions
             // In a real implementation, we would query transactions that happened AFTER openedAt
             
             // 1. Get Shift
             const tx = db.transaction([STORES.CASH_SHIFTS, STORES.TRANSACTIONS], 'readonly');
             const shiftStore = tx.objectStore(STORES.CASH_SHIFTS);
             const txnStore = tx.objectStore(STORES.TRANSACTIONS);
             
             const shiftReq = shiftStore.get(offlineId);
             
             shiftReq.onsuccess = () => {
                 const shift = shiftReq.result;
                 if (!shift) {
                     resolve(null);
                     return;
                 }
                 
                 // 2. Get Transactions since open
                 const txns = [];
                 const cursorReq = txnStore.openCursor();
                 
                 cursorReq.onsuccess = (e) => {
                     const cursor = e.target.result;
                     if (cursor) {
                         const t = cursor.value;
                         if (t.occurredAt >= shift.openedAt && (!t.status || t.status !== 'VOID')) {
                             txns.push(t);
                         }
                         cursor.continue();
                     } else {
                         // Done
                         const cashSales = txns
                            .filter(t => t.paymentMethod === 'CASH')
                            .reduce((sum, t) => sum + (t.amountPaid - t.change), 0);
                            
                         resolve({
                             startCash: shift.startCash,
                             cashSales,
                             cashIn: 0, // Placeholder for mutations
                             cashOut: 0 // Placeholder for mutations
                         });
                     }
                 };
             };
             
             shiftReq.onerror = () => reject(shiftReq.error);
        });
    }
};

export default RanaDB;
