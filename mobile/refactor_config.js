const fs = require('fs');
const aiPath = 'c:/Riyan/projek/Rana/mobile/lib/services/ai_service.dart';
let aiContent = fs.readFileSync(aiPath, 'utf8');

// Replace 14 with MerchantConfig.dormantCustomerDays in getInactiveCustomers
aiContent = aiContent.replace(
    /_db\.getInactiveCustomers\(days: 21\),/g,
    '_db.getInactiveCustomers(days: MerchantConfig.dormantCustomerDays),'
);

// Replace computeChurnScores default limit
aiContent = aiContent.replace(
    /int daysInactive = 14,/g,
    'int daysInactive = MerchantConfig.dormantCustomerDays,'
);

// In generateActionRecommendations
aiContent = aiContent.replace(
    /computeChurnScores\(daysInactive: 14, limit: 3\)/g,
    'computeChurnScores(daysInactive: MerchantConfig.dormantCustomerDays, limit: 3)'
);

aiContent = aiContent.replace(
    /_db\.getLowStockProducts\(threshold: 5\);/g,
    '_db.getLowStockProducts(threshold: MerchantConfig.lowStockWarningThreshold);'
);

aiContent = aiContent.replace(
    /_db\.getUnsoldProducts\(limit: 5, minStock: 5, start: s\);/g,
    '_db.getUnsoldProducts(limit: 5, minStock: MerchantConfig.lowStockWarningThreshold, start: s);'
);

aiContent = aiContent.replace(
    /\(p\['stock'\] \?\? 0\) <= 5/g,
    "(p['stock'] ?? 0) <= MerchantConfig.lowStockWarningThreshold"
);

fs.writeFileSync(aiPath, aiContent);


const syncPath = 'c:/Riyan/projek/Rana/mobile/lib/services/sync_service.dart';
let syncContent = fs.readFileSync(syncPath, 'utf8');

// Add import
if (!syncContent.includes("import 'package:rana_merchant/config/merchant_config.dart';")) {
  syncContent = syncContent.replace(
      "import 'dart:async';",
      "import 'dart:async';\nimport 'package:rana_merchant/config/merchant_config.dart';"
  );
}

// Replace interval: const Duration(seconds: 15)
syncContent = syncContent.replace(
    /void startAutoSync\(\{Duration interval = const Duration\(seconds: 15\)\}\)/g,
    'void startAutoSync({Duration interval = const Duration(seconds: MerchantConfig.autoSyncIntervalSeconds)})'
);

fs.writeFileSync(syncPath, syncContent);
console.log("Successfully refactored AI and Sync services to use MerchantConfig.");
