const { z } = require('zod');

// Auth Schemas
const registerSchema = z.object({
    businessName: z.string().min(3, "Nama bisnis minimal 3 karakter"),
    ownerName: z.string().min(3, "Nama pemilik minimal 3 karakter"),
    email: z.string().email("Email tidak valid"),
    password: z.string().min(8, "Password minimal 8 karakter")
        .regex(/[A-Z]/, "Password harus mengandung huruf besar")
        .regex(/[a-z]/, "Password harus mengandung huruf kecil")
        .regex(/[0-9]/, "Password harus mengandung angka"),
    role: z.enum(['OWNER', 'BUYER', 'DRIVER']).optional(),
    waNumber: z.string().min(10, "Nomor WhatsApp tidak valid").optional(),
    category: z.string().optional(),
    address: z.string().optional(),
    latitude: z.union([z.number(), z.string()]).optional(),
    longitude: z.union([z.number(), z.string()]).optional(),
});

const loginSchema = z.object({
    email: z.string().optional().or(z.literal('')),
    phone: z.string().optional().or(z.literal('')),
    password: z.string().min(1, "Password wajib diisi"),
}).refine(data => {
    const identifier = data.email || data.phone;
    return identifier && identifier.length >= 3;
}, {
    message: "Email atau Nomor Telepon yang valid wajib diisi",
    path: ["email"]
});

// Transaction Schemas
const syncItemSchema = z.object({
    productId: z.string().uuid("Product ID tidak valid"),
    quantity: z.number().positive("Quantity harus lebih dari 0"),
    price: z.number().nonnegative("Harga tidak boleh negatif"),
    productName: z.string().optional(),
    productSku: z.string().optional(),
    productImage: z.string().optional(),
    basePrice: z.number().optional(),
});

const syncTransactionSchema = z.object({
    offlineId: z.string().min(1, "Offline ID wajib diisi"),
    items: z.array(syncItemSchema).min(1, "Minimal 1 item per transaksi"),
    totalAmount: z.number().nonnegative("Total tidak boleh negatif"),
    paymentMethod: z.enum(['CASH', 'DEBIT', 'QRIS', 'WALLET', 'TRANSFER']).optional(),
    occurredAt: z.string().refine(val => !isNaN(Date.parse(val)), {
        message: "Format tanggal tidak valid"
    }),
    cashierId: z.string().optional(),
    storeId: z.string().optional(),
});

// Wallet Schemas
const withdrawalSchema = z.object({
    amount: z.number().positive("Jumlah penarikan harus lebih dari 0"),
    bankName: z.string().min(2, "Nama bank wajib diisi"),
    accountNumber: z.string().min(5, "Nomor rekening wajib diisi"),
});

const topUpSchema = z.object({
    amount: z.number().positive("Jumlah top up harus lebih dari 0"),
    proofImage: z.string().min(1, "Bukti transfer wajib diisi"), // Base64
});

const transferSchema = z.object({
    targetStoreId: z.string().uuid("ID toko tujuan tidak valid"),
    amount: z.number().positive("Jumlah transfer harus lebih dari 0"),
    note: z.string().optional(),
});

module.exports = {
    registerSchema,
    loginSchema,
    syncTransactionSchema,
    withdrawalSchema,
    topUpSchema,
    transferSchema
};
