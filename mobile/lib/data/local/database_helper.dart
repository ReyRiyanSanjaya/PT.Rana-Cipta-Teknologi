import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import 'package:flutter/foundation.dart' show kDebugMode, debugPrint;
import 'package:intl/intl.dart';

class DatabaseHelper {
  static final DatabaseHelper instance = DatabaseHelper._init();
  static Database? _database;

  DatabaseHelper._init();

  static Future<Database>? _openFuture;

  Future<Database> get database async {
    if (_database != null) return _database!;
    _openFuture ??= _initDB('rana_pos_fixed.db');
    _database = await _openFuture;
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, filePath);

    return await openDatabase(
      path,
      version: 20,
      onConfigure: (db) async {
        await db.execute('PRAGMA journal_mode=WAL');
        await db.execute('PRAGMA foreign_keys = ON');
      },
      onCreate: _createDB,
      onUpgrade: _onUpgrade,
    );
  }

  Future<void> _createDB(Database db, int version) async {
    await db.execute('''
      CREATE TABLE tenants (
        id TEXT PRIMARY KEY,
        businessName TEXT,
        email TEXT,
        phone TEXT,
        address TEXT
      )
    ''');

    await db.execute('''
      CREATE TABLE products (
        id TEXT PRIMARY KEY,
        tenantId TEXT,
        sku TEXT,
        name TEXT,
        description TEXT,
        costPrice REAL DEFAULT 0,
        purchasePrice REAL DEFAULT 0,
        sellingPrice REAL,
        originalPrice REAL,
        promoEndsAt TEXT,
        stock INTEGER DEFAULT 0,
        trackStock INTEGER DEFAULT 1,
        category TEXT,
        imageUrl TEXT,
        syncStatus INTEGER DEFAULT 0,
        lastUpdated INTEGER
      )
    ''');

    await db.execute('''
      CREATE TABLE transactions (
        offlineId TEXT PRIMARY KEY,
        tenantId TEXT,
        storeId TEXT,
        cashierId TEXT,
        totalAmount REAL,
        discount REAL DEFAULT 0,
        tax REAL DEFAULT 0,
        paymentMethod TEXT,
        totalCost REAL DEFAULT 0,
        totalProfit REAL DEFAULT 0,
        customerName TEXT,
        customerId TEXT,
        notes TEXT,
        status TEXT,
        occurredAt TEXT,
        syncStatus INTEGER DEFAULT 0,
        syncedAt TEXT
      )
    ''');

    await db.execute('''
      CREATE TABLE transaction_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transactionOfflineId TEXT,
        productId TEXT,
        name TEXT,
        quantity INTEGER,
        price REAL,
        costPrice REAL DEFAULT 0,
        sku TEXT,
        imageUrl TEXT,
        category TEXT,
        FOREIGN KEY (transactionOfflineId) REFERENCES transactions (offlineId) ON DELETE CASCADE
      )
    ''');

    await db.execute('''
      CREATE TABLE expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        storeId TEXT,
        amount REAL,
        category TEXT,
        description TEXT,
        date TEXT,
        imagePath TEXT,
        synced INTEGER DEFAULT 0
      )
    ''');

    await db.execute('''
      CREATE TABLE cash_shifts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        offlineId TEXT UNIQUE,
        cashierId TEXT,
        openedAt TEXT,
        closedAt TEXT,
        startCash REAL,
        expectedEndCash REAL,
        actualEndCash REAL,
        difference REAL,
        status TEXT,
        synced INTEGER DEFAULT 0
      )
    ''');

    await db.execute('''
      CREATE TABLE cash_mutations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shiftId TEXT,
        type TEXT,
        amount REAL,
        description TEXT,
        createdAt TEXT,
        synced INTEGER DEFAULT 0
      )
    ''');

    await db.execute('''
      CREATE TABLE debts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT,
        partyName TEXT,
        phoneNumber TEXT,
        amount REAL,
        remainingAmount REAL,
        dueDate TEXT,
        description TEXT,
        transactionId TEXT,
        status TEXT,
        createdAt TEXT,
        updatedAt TEXT
      )
    ''');

    await db.execute('''
      CREATE TABLE debt_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        debtId INTEGER,
        amount REAL,
        date TEXT,
        note TEXT,
        FOREIGN KEY (debtId) REFERENCES debts (id) ON DELETE CASCADE
      )
    ''');

    await db.execute('''
      CREATE TABLE customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        notes TEXT,
        totalSpent REAL DEFAULT 0,
        lastVisit TEXT,
        createdAt TEXT,
        updatedAt TEXT
      )
    ''');

    await db.execute('''
      CREATE TABLE employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        role TEXT,
        pin TEXT,
        phone TEXT,
        isActive INTEGER DEFAULT 1,
        createdAt TEXT
      )
    ''');

    await db.execute('CREATE INDEX IF NOT EXISTS idx_transactions_occurredAt ON transactions(occurredAt)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_transaction_items_txn ON transaction_items(transactionOfflineId)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_transaction_items_product ON transaction_items(productId)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)');
  }

  Future<void> _onUpgrade(Database db, int oldVersion, int newVersion) async {
    if (oldVersion < 19) {
      // Migration logic could go here if needed
    }
    if (oldVersion < 20) {
      await db.execute('''
        UPDATE transactions 
        SET totalCost = (
          SELECT COALESCE(SUM(costPrice * quantity), 0)
          FROM transaction_items 
          WHERE transaction_items.transactionOfflineId = transactions.offlineId
        )
        WHERE totalCost = 0 OR totalCost IS NULL;
      ''');
      
      await db.execute('''
        UPDATE transactions 
        SET totalProfit = (totalAmount - totalCost)
        WHERE totalProfit = 0 OR totalProfit IS NULL;
      ''');
    }
  }

  // --- Products ---

  Future<List<Map<String, dynamic>>> getAllProducts() async {
    final db = await database;
    return await db.query('products');
  }

  Future<void> insertProduct(Map<String, dynamic> product) async {
    final db = await database;
    await db.insert('products', product, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<void> updateProductDetails(String id, Map<String, dynamic> data) async {
    final db = await database;
    await db.update('products', data, where: 'id = ?', whereArgs: [id]);
  }

  Future<void> updateProductStock(String id, int newStock) async {
    final db = await database;
    await db.update('products', {'stock': newStock}, where: 'id = ?', whereArgs: [id]);
  }

  Future<void> deleteProduct(String id) async {
    final db = await database;
    await db.delete('products', where: 'id = ?', whereArgs: [id]);
  }

  Future<void> syncProducts(List<dynamic> serverProducts) async {
    final db = await database;
    await db.transaction((txn) async {
      for (var p in serverProducts) {
        final Map<String, dynamic> product = Map<String, dynamic>.from(p);
        await txn.insert('products', product, conflictAlgorithm: ConflictAlgorithm.replace);
      }
    });
  }

  // --- Transactions ---

  Future<void> queueTransaction(Map<String, dynamic> txn, List<Map<String, dynamic>> items) async {
    final db = await database;
    await db.transaction((txnObj) async {
      await txnObj.insert('transactions', txn);
      for (var item in items) {
        await txnObj.insert('transaction_items', item);
        await txnObj.rawUpdate('UPDATE products SET stock = stock - ? WHERE id = ?', [item['quantity'], item['productId']]);
      }
    });
  }

  Future<List<Map<String, dynamic>>> getAllTransactions() async {
    final db = await database;
    return await db.query('transactions', orderBy: 'occurredAt DESC');
  }

  Future<List<Map<String, dynamic>>> getPendingTransactions() async {
    final db = await database;
    return await db.query('transactions', where: 'status IS NULL OR status NOT IN (\'SYNCED\', \'VOID\', \'CANCELLED\')');
  }

  Future<List<Map<String, dynamic>>> getItemsForTransaction(String offlineId) async {
    final db = await database;
    return await db.query('transaction_items', where: 'transactionOfflineId = ?', whereArgs: [offlineId]);
  }

  Future<void> batchMarkSynced(List<String> offlineIds) async {
    final db = await database;
    final now = DateTime.now().toIso8601String();
    await db.transaction((txn) async {
      for (var id in offlineIds) {
        await txn.update('transactions', {'status': 'SYNCED', 'syncedAt': now}, where: 'offlineId = ?', whereArgs: [id]);
      }
    });
  }

  Future<void> markSynced(String offlineId) async {
    final db = await database;
    await db.update('transactions', {'status': 'SYNCED', 'syncedAt': DateTime.now().toIso8601String()},
        where: 'offlineId = ?', whereArgs: [offlineId]);
  }

  Future<void> upsertSyncedTransactions(List<Map<String, dynamic>> transactionsWithItems) async {
    final db = await database;
    await db.transaction((txnObj) async {
      for (var entry in transactionsWithItems) {
        final txn = entry['transaction'] as Map<String, dynamic>;
        final items = entry['items'] as List<Map<String, dynamic>>;
        await txnObj.insert('transactions', txn, conflictAlgorithm: ConflictAlgorithm.replace);
        await txnObj.delete('transaction_items', where: 'transactionOfflineId = ?', whereArgs: [txn['offlineId']]);
        for (var item in items) {
          await txnObj.insert('transaction_items', item);
        }
      }
    });
  }

  // --- Insights ---

  Future<Map<String, dynamic>> getSalesReport({required DateTime start, required DateTime end}) async {
    final db = await database;
    final s = start.toIso8601String();
    final e = end.toIso8601String();
    final res = await db.rawQuery('''
      SELECT 
        COUNT(*) as totalTransactions,
        SUM(totalAmount) as grossSales,
        SUM(totalCost) as totalCost,
        SUM(totalProfit) as netProfit,
        (SELECT SUM(amount) FROM expenses WHERE date BETWEEN ? AND ?) as totalExpenses
      FROM transactions 
      WHERE occurredAt BETWEEN ? AND ? AND status NOT IN ('VOID', 'CANCELLED')
    ''', [s, e, s, e]);
    return res.first;
  }

  Future<List<Map<String, dynamic>>> getTopSellingProductsDetailed({required int limit, required DateTime start, required DateTime end}) async {
    final db = await database;
    final s = start.toIso8601String();
    final e = end.toIso8601String();
    return await db.rawQuery('''
      SELECT 
        ti.productId,
        ti.name,
        p.sellingPrice,
        SUM(ti.quantity) as totalQty,
        SUM(ti.price * ti.quantity) as totalRevenue,
        SUM((ti.price - ti.costPrice) * ti.quantity) as totalProfit,
        (SUM((ti.price - ti.costPrice) * ti.quantity) / SUM(ti.price * ti.quantity)) as profitMargin
      FROM transaction_items ti
      JOIN transactions t ON ti.transactionOfflineId = t.offlineId
      LEFT JOIN products p ON ti.productId = p.id
      WHERE t.occurredAt BETWEEN ? AND ? AND t.status NOT IN ('VOID', 'CANCELLED')
      GROUP BY ti.productId
      ORDER BY totalQty DESC
      LIMIT ?
    ''', [s, e, limit]);
  }

  Future<List<Map<String, dynamic>>> getTopSellingProducts({int limit = 5}) async {
    final db = await database;
    return await db.rawQuery('''
      SELECT productId, name, SUM(quantity) as totalQty
      FROM transaction_items
      GROUP BY productId
      ORDER BY totalQty DESC
      LIMIT ?
    ''', [limit]);
  }

  Future<List<Map<String, dynamic>>> getLowStockProducts({int threshold = 5}) async {
    final db = await database;
    return await db.query('products', where: 'stock <= ? AND trackStock = 1', whereArgs: [threshold]);
  }

  Future<List<Map<String, dynamic>>> getPeakHours({int days = 7}) async {
    final db = await database;
    final s = DateTime.now().subtract(Duration(days: days)).toIso8601String();
    return await db.rawQuery('''
      SELECT 
        strftime('%H', occurredAt) as hour,
        COUNT(*) as count,
        SUM(totalAmount) as revenue
      FROM transactions
      WHERE occurredAt >= ? AND status NOT IN ('VOID', 'CANCELLED')
      GROUP BY hour
      ORDER BY count DESC
    ''', [s]);
  }

  Future<List<Map<String, dynamic>>> getUnsoldProducts({int limit = 5, int minStock = 5, DateTime? start, DateTime? end}) async {
    final db = await database;
    final s = (start ?? DateTime.now().subtract(const Duration(days: 14))).toIso8601String();
    final e = (end ?? DateTime.now()).toIso8601String();
    return await db.rawQuery('''
      SELECT p.* FROM products p
      WHERE p.stock >= ? AND p.id NOT IN (
        SELECT ti.productId FROM transaction_items ti
        JOIN transactions t ON ti.transactionOfflineId = t.offlineId
        WHERE t.occurredAt BETWEEN ? AND ? AND t.status NOT IN ('VOID', 'CANCELLED')
      ) LIMIT ?
    ''', [minStock, s, e, limit]);
  }

  Future<List<Map<String, dynamic>>> getSalesByCategory({DateTime? start, DateTime? end}) async {
    final db = await database;
    final s = (start ?? DateTime.now().subtract(const Duration(days: 30))).toIso8601String();
    final e = (end ?? DateTime.now()).toIso8601String();
    return await db.rawQuery('''
      SELECT p.category, SUM(ti.quantity) as totalQty, SUM(ti.price * ti.quantity) as totalSales
      FROM transaction_items ti
      JOIN transactions t ON ti.transactionOfflineId = t.offlineId
      LEFT JOIN products p ON ti.productId = p.id
      WHERE t.occurredAt BETWEEN ? AND ? AND t.status NOT IN ('VOID', 'CANCELLED')
      GROUP BY p.category ORDER BY totalSales DESC
    ''', [s, e]);
  }

  Future<List<Map<String, dynamic>>> getFrequentlyBoughtTogether({DateTime? start, DateTime? end, int limit = 10}) async {
    final db = await database;
    final s = (start ?? DateTime.now().subtract(const Duration(days: 30))).toIso8601String();
    final e = (end ?? DateTime.now()).toIso8601String();
    return await db.rawQuery('''
      SELECT ti1.productId as productIdA, ti1.name as nameA, p1.sellingPrice as priceA, p1.purchasePrice as costA, p1.stock as stockA,
             ti2.productId as productIdB, ti2.name as nameB, p2.sellingPrice as priceB, p2.purchasePrice as costB, p2.stock as stockB,
             COUNT(*) as pairCount
      FROM transaction_items ti1
      JOIN transaction_items ti2 ON ti1.transactionOfflineId = ti2.transactionOfflineId
      JOIN transactions t ON ti1.transactionOfflineId = t.offlineId
      LEFT JOIN products p1 ON ti1.productId = p1.id
      LEFT JOIN products p2 ON ti2.productId = p2.id
      WHERE ti1.productId < ti2.productId AND t.occurredAt BETWEEN ? AND ? AND t.status NOT IN ('VOID', 'CANCELLED')
      GROUP BY ti1.productId, ti2.productId ORDER BY pairCount DESC LIMIT ?
    ''', [s, e, limit]);
  }

  Future<List<Map<String, dynamic>>> getProductSalesDetail({
    required String productId,
    required DateTime start,
    required DateTime end,
  }) async {
    final db = await database;
    final s = start.toIso8601String();
    final e = end.toIso8601String();
    return await db.rawQuery('''
      SELECT 
        strftime('%Y-%m-%d', t.occurredAt) as date,
        SUM(ti.quantity) as totalQty,
        SUM(ti.price * ti.quantity) as totalRevenue,
        SUM((ti.price - ti.costPrice) * ti.quantity) as totalProfit
      FROM transaction_items ti
      JOIN transactions t ON ti.transactionOfflineId = t.offlineId
      WHERE ti.productId = ? AND t.occurredAt BETWEEN ? AND ? AND t.status NOT IN ('VOID', 'CANCELLED')
      GROUP BY date
      ORDER BY date DESC
    ''', [productId, s, e]);
  }

  Future<List<Map<String, dynamic>>> getSalesByPaymentMethod({DateTime? start, DateTime? end}) async {
    final db = await database;
    final s = (start ?? DateTime.now().subtract(const Duration(days: 30))).toIso8601String();
    final e = (end ?? DateTime.now()).toIso8601String();
    return await db.rawQuery('''
      SELECT paymentMethod, COUNT(*) as totalTransactions, SUM(totalAmount) as totalAmount
      FROM transactions WHERE occurredAt BETWEEN ? AND ? AND status NOT IN ('VOID', 'CANCELLED')
      GROUP BY paymentMethod
    ''', [s, e]);
  }

  Future<Map<String, dynamic>> getLocalTodayBreakdown({DateTime? start, DateTime? end}) async {
    final db = await database;
    final s = (start ?? DateTime.now()).toIso8601String();
    final e = (end ?? DateTime.now()).toIso8601String();
    final res = await db.rawQuery('''
      SELECT COUNT(*) as totalTransactions, SUM(totalAmount) as grossSales, SUM(totalCost) as totalCost, SUM(totalProfit) as netProfit
      FROM transactions WHERE occurredAt BETWEEN ? AND ? AND status NOT IN ('VOID', 'CANCELLED')
    ''', [s, e]);
    return res.first;
  }

  // --- Customers ---

  Future<List<Map<String, dynamic>>> getCustomers() async {
    final db = await database;
    return await db.query('customers', orderBy: 'name ASC');
  }

  Future<List<Map<String, dynamic>>> searchCustomers(String query) async {
    final db = await database;
    return await db.query('customers',
        where: 'name LIKE ? OR phone LIKE ?',
        whereArgs: ['%$query%', '%$query%'],
        orderBy: 'name ASC');
  }

  Future<void> addCustomer(Map<String, dynamic> data) async {
    final db = await database;
    await db.insert('customers', data);
  }

  Future<void> updateCustomer(int id, Map<String, dynamic> data) async {
    final db = await database;
    await db.update('customers', data, where: 'id = ?', whereArgs: [id]);
  }

  Future<void> deleteCustomer(int id) async {
    final db = await database;
    await db.delete('customers', where: 'id = ?', whereArgs: [id]);
  }

  Future<List<Map<String, dynamic>>> getInactiveCustomers({int days = 14}) async {
    final db = await database;
    final cutoff = DateTime.now().subtract(Duration(days: days)).toIso8601String();
    return await db.rawQuery('''
      SELECT c.*, MAX(t.occurredAt) as lastVisit
      FROM customers c
      JOIN transactions t ON c.id = t.customerId
      WHERE t.status NOT IN ('VOID', 'CANCELLED')
      GROUP BY c.id
      HAVING lastVisit < ?
      ORDER BY lastVisit DESC
    ''', [cutoff]);
  }

  Future<Map<String, dynamic>> getCustomerStats(String customerId, {DateTime? start, DateTime? end}) async {
    final db = await database;
    final s = (start ?? DateTime(2000)).toIso8601String();
    final e = (end ?? DateTime.now()).toIso8601String();
    final res = await db.rawQuery('''
      SELECT COUNT(*) as totalTransactions, SUM(totalAmount) as totalSpent, MAX(occurredAt) as lastVisit
      FROM transactions
      WHERE customerId = ? AND occurredAt BETWEEN ? AND ? AND status NOT IN ('VOID', 'CANCELLED')
    ''', [customerId, s, e]);
    final row = res.first;
    final lastVisitStr = row['lastVisit'] as String?;
    final lastVisit = lastVisitStr != null ? DateTime.parse(lastVisitStr) : null;
    return {
      'totalTransactions': row['totalTransactions'] ?? 0,
      'totalSpent': row['totalSpent'] ?? 0.0,
      'lastVisit': lastVisit,
      'daysSinceLastVisit': lastVisit != null ? DateTime.now().difference(lastVisit).inDays : 999,
    };
  }

  // --- Expenses ---

  Future<void> insertExpense(Map<String, dynamic> data) async {
    final db = await database;
    await db.insert('expenses', data);
  }

  Future<void> updateExpense(int id, Map<String, dynamic> data) async {
    final db = await database;
    await db.update('expenses', data, where: 'id = ?', whereArgs: [id]);
  }

  Future<void> deleteExpense(int id) async {
    final db = await database;
    await db.delete('expenses', where: 'id = ?', whereArgs: [id]);
  }

  Future<List<Map<String, dynamic>>> getExpenses({DateTime? start, DateTime? end}) async {
    final db = await database;
    final s = (start ?? DateTime.now().subtract(const Duration(days: 30))).toIso8601String();
    final e = (end ?? DateTime.now()).toIso8601String();
    return await db.query('expenses', where: 'date BETWEEN ? AND ?', whereArgs: [s, e], orderBy: 'date DESC');
  }

  Future<List<Map<String, dynamic>>> getPendingExpenses() async {
    final db = await database;
    return await db.query('expenses', where: 'synced = 0');
  }

  Future<void> batchMarkExpenseSynced(List<int> ids) async {
    final db = await database;
    await db.transaction((txn) async {
      for (var id in ids) {
        await txn.update('expenses', {'synced': 1}, where: 'id = ?', whereArgs: [id]);
      }
    });
  }

  // --- Shifts ---

  Future<Map<String, dynamic>?> getOpenShift(String cashierId) async {
    final db = await database;
    final res = await db.query('cash_shifts', where: 'status = ?', whereArgs: ['OPEN'], limit: 1);
    return res.isNotEmpty ? res.first : null;
  }

  Future<void> openShift(Map<String, dynamic> data) async {
    final db = await database;
    await db.insert('cash_shifts', data);
  }

  Future<void> closeShift(String offlineId, double actualEndCash, double expectedEndCash, double difference) async {
    final db = await database;
    await db.update('cash_shifts', {
      'actualEndCash': actualEndCash,
      'expectedEndCash': expectedEndCash,
      'difference': difference,
      'status': 'CLOSED',
      'closedAt': DateTime.now().toIso8601String(),
    }, where: 'offlineId = ?', whereArgs: [offlineId]);
  }

  Future<void> addCashMutation(Map<String, dynamic> data) async {
    final db = await database;
    await db.insert('cash_mutations', data);
  }

  Future<Map<String, double>> getShiftSummary(String shiftId, DateTime openedAt) async {
    final db = await database;
    final start = openedAt.toIso8601String();
    final salesRes = await db.rawQuery('''
      SELECT SUM(totalAmount) as total FROM transactions
      WHERE occurredAt >= ? AND paymentMethod = 'CASH' AND status NOT IN ('VOID', 'CANCELLED')
    ''', [start]);
    final mutationsRes = await db.rawQuery('''
      SELECT type, SUM(amount) as total FROM cash_mutations
      WHERE shiftId = ? GROUP BY type
    ''', [shiftId]);
    double cashSales = (salesRes.first['total'] as num?)?.toDouble() ?? 0.0;
    double cashIn = 0.0;
    double cashOut = 0.0;
    for (var row in mutationsRes) {
      if (row['type'] == 'IN') cashIn = (row['total'] as num?)?.toDouble() ?? 0.0;
      else if (row['type'] == 'OUT') cashOut = (row['total'] as num?)?.toDouble() ?? 0.0;
    }
    return {'cashSales': cashSales, 'cashIn': cashIn, 'cashOut': cashOut};
  }

  // --- Debts ---

  Future<List<Map<String, dynamic>>> getDebts({String? type}) async {
    final db = await database;
    if (type != null) {
      return await db.query('debts', where: 'type = ?', whereArgs: [type], orderBy: 'createdAt DESC');
    }
    return await db.query('debts', orderBy: 'createdAt DESC');
  }

  Future<void> addDebt(Map<String, dynamic> data) async {
    final db = await database;
    await db.insert('debts', data);
  }

  Future<void> deleteDebt(int id) async {
    final db = await database;
    await db.delete('debts', where: 'id = ?', whereArgs: [id]);
  }

  Future<List<Map<String, dynamic>>> getDebtPayments(int debtId) async {
    final db = await database;
    return await db.query('debt_payments', where: 'debtId = ?', whereArgs: [debtId]);
  }

  Future<void> addDebtPayment(int debtId, double amount, String note) async {
    final db = await database;
    await db.transaction((txn) async {
      await txn.insert('debt_payments', {
        'debtId': debtId,
        'amount': amount,
        'date': DateTime.now().toIso8601String(),
        'note': note,
      });
      await txn.rawUpdate('UPDATE debts SET remainingAmount = remainingAmount - ?, updatedAt = ? WHERE id = ?',
          [amount, DateTime.now().toIso8601String(), debtId]);
      await txn.rawUpdate('UPDATE debts SET status = \'PAID\' WHERE id = ? AND remainingAmount <= 0', [debtId]);
    });
  }

  // --- Utility ---

  Future<void> clearAllData() async {
    final db = await database;
    await db.transaction((txn) async {
      await txn.delete('transactions');
      await txn.delete('transaction_items');
      await txn.delete('products');
      await txn.delete('expenses');
      await txn.delete('customers');
      await txn.delete('employees');
      await txn.delete('debts');
      await txn.delete('debt_payments');
      await txn.delete('cash_shifts');
      await txn.delete('cash_mutations');
    });
  }

  Future<Map<String, dynamic>?> getTenantInfo() async {
    final db = await database;
    final res = await db.query('tenants', limit: 1);
    return res.isNotEmpty ? res.first : null;
  }

  Future<void> upsertTenant(Map<String, dynamic> data) async {
    final db = await database;
    await db.insert('tenants', data, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<List<Map<String, dynamic>>> getEmployees() async {
    final db = await database;
    return await db.query('employees');
  }

  Future<void> addEmployee(Map<String, dynamic> data) async {
    final db = await database;
    await db.insert('employees', data);
  }

  Future<void> updateEmployee(int id, Map<String, dynamic> data) async {
    final db = await database;
    await db.update('employees', data, where: 'id = ?', whereArgs: [id]);
  }

  Future<void> deleteEmployee(int id) async {
    final db = await database;
    await db.delete('employees', where: 'id = ?', whereArgs: [id]);
  }
}
