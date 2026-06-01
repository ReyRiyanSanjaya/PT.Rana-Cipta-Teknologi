/**
 * Merchant Category Configuration
 * Defines flow, status labels, and behavior per merchant category
 */

const MERCHANT_CATEGORIES = {
    // Food & Beverage
    'Kedai Makanan': {
        type: 'FOOD',
        icon: 'restaurant',
        statusLabels: {
            PENDING: 'Menunggu Konfirmasi',
            ACCEPTED: 'Pesanan Diterima',
            PROCESSING: 'Sedang Dimasak 🍳',
            READY: 'Makanan Siap',
            ON_DELIVERY: 'Sedang Diantar',
            COMPLETED: 'Selesai',
            CANCELLED: 'Dibatalkan',
        },
        estimatedPrepTime: 15, // minutes
        allowDelivery: true,
        allowPickup: true,
        requiresPreparation: true,
    },
    'Cafe': {
        type: 'FOOD',
        icon: 'local_cafe',
        statusLabels: {
            PENDING: 'Menunggu Konfirmasi',
            ACCEPTED: 'Pesanan Diterima',
            PROCESSING: 'Sedang Dibuat ☕',
            READY: 'Minuman Siap',
            ON_DELIVERY: 'Sedang Diantar',
            COMPLETED: 'Selesai',
            CANCELLED: 'Dibatalkan',
        },
        estimatedPrepTime: 10,
        allowDelivery: true,
        allowPickup: true,
        requiresPreparation: true,
    },
    'Restoran': {
        type: 'FOOD',
        icon: 'dinner_dining',
        statusLabels: {
            PENDING: 'Menunggu Konfirmasi',
            ACCEPTED: 'Pesanan Diterima',
            PROCESSING: 'Sedang Dimasak 👨‍🍳',
            READY: 'Hidangan Siap',
            ON_DELIVERY: 'Sedang Diantar',
            COMPLETED: 'Selesai',
            CANCELLED: 'Dibatalkan',
        },
        estimatedPrepTime: 25,
        allowDelivery: true,
        allowPickup: true,
        requiresPreparation: true,
    },

    // Retail / Konter
    'Outlet Ponsel': {
        type: 'RETAIL',
        icon: 'phone_android',
        statusLabels: {
            PENDING: 'Menunggu Konfirmasi',
            ACCEPTED: 'Pesanan Dikonfirmasi',
            PROCESSING: 'Sedang Disiapkan 📦',
            READY: 'Barang Siap Diambil',
            ON_DELIVERY: 'Sedang Dikirim',
            COMPLETED: 'Selesai',
            CANCELLED: 'Dibatalkan',
        },
        estimatedPrepTime: 5,
        allowDelivery: true,
        allowPickup: true,
        requiresPreparation: false,
    },
    'Kelontong': {
        type: 'RETAIL',
        icon: 'store',
        statusLabels: {
            PENDING: 'Menunggu Konfirmasi',
            ACCEPTED: 'Pesanan Dikonfirmasi',
            PROCESSING: 'Sedang Dikemas 🛒',
            READY: 'Pesanan Siap',
            ON_DELIVERY: 'Sedang Dikirim',
            COMPLETED: 'Selesai',
            CANCELLED: 'Dibatalkan',
        },
        estimatedPrepTime: 5,
        allowDelivery: true,
        allowPickup: true,
        requiresPreparation: false,
    },
    'Toko Baju': {
        type: 'RETAIL',
        icon: 'checkroom',
        statusLabels: {
            PENDING: 'Menunggu Konfirmasi',
            ACCEPTED: 'Pesanan Dikonfirmasi',
            PROCESSING: 'Sedang Dikemas 👕',
            READY: 'Paket Siap',
            ON_DELIVERY: 'Sedang Dikirim',
            COMPLETED: 'Selesai',
            CANCELLED: 'Dibatalkan',
        },
        estimatedPrepTime: 10,
        allowDelivery: true,
        allowPickup: true,
        requiresPreparation: false,
    },

    // Health
    'Apotik': {
        type: 'HEALTH',
        icon: 'local_pharmacy',
        statusLabels: {
            PENDING: 'Menunggu Konfirmasi',
            ACCEPTED: 'Resep Dikonfirmasi',
            PROCESSING: 'Sedang Disiapkan 💊',
            READY: 'Obat Siap Diambil',
            ON_DELIVERY: 'Sedang Diantar',
            COMPLETED: 'Selesai',
            CANCELLED: 'Dibatalkan',
        },
        estimatedPrepTime: 10,
        allowDelivery: true,
        allowPickup: true,
        requiresPreparation: true,
    },

    // Default
    'Lainnya': {
        type: 'GENERAL',
        icon: 'storefront',
        statusLabels: {
            PENDING: 'Menunggu Konfirmasi',
            ACCEPTED: 'Pesanan Diterima',
            PROCESSING: 'Sedang Diproses',
            READY: 'Pesanan Siap',
            ON_DELIVERY: 'Sedang Dikirim',
            COMPLETED: 'Selesai',
            CANCELLED: 'Dibatalkan',
        },
        estimatedPrepTime: 10,
        allowDelivery: true,
        allowPickup: true,
        requiresPreparation: false,
    },
};

/**
 * Get category config for a store
 */
const getCategoryConfig = (category) => {
    return MERCHANT_CATEGORIES[category] || MERCHANT_CATEGORIES['Lainnya'];
};

/**
 * Get status label for a specific category and status
 */
const getStatusLabel = (category, status) => {
    const config = getCategoryConfig(category);
    return config.statusLabels[status] || status;
};

/**
 * Get all available categories
 */
const getAllCategories = () => {
    return Object.entries(MERCHANT_CATEGORIES).map(([name, config]) => ({
        name,
        type: config.type,
        icon: config.icon,
        estimatedPrepTime: config.estimatedPrepTime,
    }));
};

module.exports = { MERCHANT_CATEGORIES, getCategoryConfig, getStatusLabel, getAllCategories };
