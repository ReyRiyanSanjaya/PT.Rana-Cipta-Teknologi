class MerchantConfig {
  // ==========================================
  // Store & Localization Defaults
  // ==========================================
  static const String defaultCountry = 'ID';
  static const String defaultCurrency = 'IDR';
  static const String defaultCurrencySymbol = 'Rp';
  static const String defaultTimezone = 'Asia/Jakarta';

  // ==========================================
  // Tax, Fees, and Accounting
  // ==========================================
  static const double defaultTaxRate = 0.11; // 11% PB1/PPN
  static const double minimumServiceFee = 0.0;
  static const bool isTaxInclusive = false;

  // ==========================================
  // POS & Transaction Policies
  // ==========================================
  static const List<String> supportedPaymentMethods = [
    'CASH',
    'QRIS',
    'TRANSFER',
    'EDC',
    'DEBT' // Hutang/Kasbon
  ];
  
  static const bool allowNegativeStock = false; // Mencegah penjualan jika stok habis
  static const bool requireCustomerPhone = false;

  // ==========================================
  // Receipt & Printer Settings
  // ==========================================
  static const String defaultPrinterPaperSize = '58mm'; // '58mm' or '80mm'
  static const bool printReceiptAutomatically = true;
  static const String receiptFooterText = 'Terima kasih atas kunjungannya. Barang yang sudah dibeli tidak dapat ditukar/dikembalikan.';

  // ==========================================
  // AI & Analytics Thresholds
  // ==========================================
  static const int lowStockWarningThreshold = 5;
  static const int deadStockDaysFilter = 14; 
  static const int dormantCustomerDays = 14; // Mendeteksi pelanggan yang mulai churn

  // ==========================================
  // Connection & Offline Syncing
  // ==========================================
  static const int autoSyncIntervalSeconds = 15;
  static const int maxOfflineTransactionsLimit = 200; // Peringatan jika belum sync
  
  // ==========================================
  // Support & URLs
  // ==========================================
  static const String merchantSupportEmail = 'support@rana-merchant.com';
  static const String merchantHelpCenterUrl = 'https://rana-app.com/merchant-help';
}
