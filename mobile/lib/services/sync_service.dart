import 'dart:async';
import 'package:rana_merchant/config/merchant_config.dart';
import 'dart:math' as math; // [NEW]
import 'package:flutter/foundation.dart';
import 'package:rana_merchant/data/local/database_helper.dart';
import 'package:rana_merchant/data/remote/api_service.dart';
import 'package:rana_merchant/services/connectivity_service.dart';
import 'package:shared_preferences/shared_preferences.dart'; // [NEW]

class SyncService {
  static final SyncService _instance = SyncService._internal();
  factory SyncService() => _instance;
  SyncService._internal();

  bool _isSyncing = false;
  bool get isSyncing => _isSyncing;

  // [NEW] Backoff state
  int _retryCount = 0;
  final int _maxRetries = 5;

  // [NEW] Data Change Stream
  final _dataChangeController = StreamController<void>.broadcast();
  Stream<void> get onDataChanged => _dataChangeController.stream;
  Timer? _autoTimer;
  StreamSubscription<bool>? _connSub;
  bool _autoEnabled = false;
  DateTime? _lastSyncAt;
  bool _online = false;
  final _statusController = StreamController<Map<String, dynamic>>.broadcast();
  Stream<Map<String, dynamic>> get statusStream => _statusController.stream;
  DateTime? get lastSyncAt => _lastSyncAt;
  bool get isOnline => _online;

  Future<void> syncTransactions() async {
    if (_isSyncing) return;
    _isSyncing = true; 
    _statusUpdate();

    try {
      // [NEW] Check connectivity first
      final hasInternet = await ConnectivityService().hasInternetConnection();
      if (!hasInternet) {
        if (kDebugMode) debugPrint('No internet connection. Skipping sync.');
        return;
      }

      final db = DatabaseHelper.instance;
      final pendingTxns = await db.getPendingTransactions();

      // if (pendingTxns.isEmpty) { // [OLD] Removed
      //   if (kDebugMode) debugPrint('No pending transactions to sync.');
      //   return;
      // }

      final api = ApiService();

      if (pendingTxns.isNotEmpty) {
        final List<String> syncedIds = [];
        for (var txn in pendingTxns) {
          final offlineId = txn['offlineId'];
          final items = await db.getItemsForTransaction(offlineId);

          final payload = {
            'offlineId': offlineId,
            'cashierId': txn['cashierId'],
            'totalAmount': txn['totalAmount'],
            'paymentMethod': txn['paymentMethod'] ?? 'CASH',
            'occurredAt': txn['occurredAt'],
            'items': items
                .map((i) => {
                      'productId': i['productId'],
                      'quantity': i['quantity'],
                      'price': i['price'],
                      'productName': i['name'],
                      'productSku': i['sku'],
                      'productImage': i['imageUrl'],
                      'basePrice': i['costPrice']
                    })
                .toList()
          };

          // Send to Server
          await api.uploadTransaction(payload);
          syncedIds.add(offlineId);
        }
        
        if (syncedIds.isNotEmpty) {
          await db.batchMarkSynced(syncedIds);
        }
      }

      // [NEW] Sync Pending Expenses
      await _syncExpenses(); // [FIX] Renamed to private

      // [NEW] Sync Transaction History from server to local for reporting
      await syncTransactionHistory(); // [FIX] Incremental Sync

      // After all transactions are synced, refresh products from server
      await api.fetchAndSaveProducts(); // [FIX] Moved here

      // [NEW] Notify listeners
      _lastSyncAt = DateTime.now();
      final prefs = await SharedPreferences.getInstance(); // [NEW]
      await prefs.setString('last_sync_timestamp', _lastSyncAt!.toIso8601String()); // [NEW]

      _retryCount = 0; // [NEW] Reset retry on success
      _dataChangeController.add(null);
      _statusController.add(
          {'online': _online, 'lastSyncAt': _lastSyncAt?.toIso8601String()});
    } catch (e) {
      if (kDebugMode) debugPrint('Sync Error: $e');
      _retryCount++; // [NEW] Increment retry count on error
      rethrow;
    } finally {
      _isSyncing = false;
      _statusUpdate();
    }
  }

  // [NEW] Sync Pending Expenses
  Future<void> _syncExpenses() async { // [FIX] Renamed to private
    try {
      final db = DatabaseHelper.instance;
      final pendingExpenses = await db.getPendingExpenses();

      if (pendingExpenses.isNotEmpty) {
        final api = ApiService();
        final List<int> syncedIds = [];
        for (var expense in pendingExpenses) {
          String category = expense['category'];
          String description = expense['description'] ?? '';

          final Map<String, String> categoryMapping = {
            'EXPENSE_SALARY': 'EXPENSE_OPERATIONAL',
            'EXPENSE_MARKETING': 'EXPENSE_OPERATIONAL',
            'EXPENSE_RENT': 'EXPENSE_OPERATIONAL',
            'EXPENSE_MAINTENANCE': 'EXPENSE_OPERATIONAL',
            'EXPENSE_OTHER': 'OTHER',
          };

          if (categoryMapping.containsKey(category)) {
            if (!description.contains('[')) {
              description = '[${expense['category']}] $description';
            }
            category = categoryMapping[category]!;
          }

          final payload = {
            'storeId': expense['storeId'],
            'amount': expense['amount'],
            'category': category,
            'description': description,
            'date': expense['date'],
          };

          await api.uploadExpense(payload);
          syncedIds.add(expense['id']);
        }

        if (syncedIds.isNotEmpty) {
          await db.batchMarkExpenseSynced(syncedIds);
        }
      }
    } catch (e) {
      if (kDebugMode) debugPrint('Expense Sync Error: $e');
      // Don't rethrow to avoid blocking transaction sync
    }
  }

  // [FIXED] Incremental Sync Transaction History from server
  Future<void> syncTransactionHistory() async {
    try {
      final prefs = await SharedPreferences.getInstance(); // [NEW]
      final lastSyncStr = prefs.getString('last_sync_timestamp'); // [NEW]
      DateTime? startDate; // [NEW]
      if (lastSyncStr != null) { // [NEW]
        // Fetch data since last sync minus a grace period (e.g., 5 mins) to account for clock drift
        startDate = DateTime.parse(lastSyncStr).subtract(const Duration(minutes: 5)); // [NEW]
      } else { // [NEW]
        // First sync: fetch last 7 days
        startDate = DateTime.now().subtract(const Duration(days: 7)); // [NEW]
      }

      final api = ApiService();
      final db = DatabaseHelper.instance;

      // Fetch last 30 days history (or more if needed)
      final history = await api.fetchTransactionHistory( // [FIX] Added startDate and limit
        startDate: startDate,
        limit: 200,
      );

      if (history.isEmpty) return; // [NEW]

      final List<Map<String, dynamic>> batchPayload = [];
      for (var txnData in history) {
        final itemsData = txnData['items'] as List<dynamic>? ?? [];

        final txn = {
          'offlineId': txnData['offlineId'] ?? txnData['id'].toString(),
          'cashierId': txnData['cashierId'],
          'totalAmount': txnData['totalAmount'],
          'paymentMethod': txnData['paymentMethod'] ?? 'CASH',
          'status':
              (txnData['status'] == 'VOID' || txnData['status'] == 'CANCELLED')
                  ? 'VOID'
                  : 'SYNCED',
          'occurredAt': (txnData['occurredAt'] ?? txnData['createdAt']) != null
              ? DateTime.parse(txnData['occurredAt'] ?? txnData['createdAt'])
                  .toLocal()
                  .toIso8601String()
              : DateTime.now().toIso8601String(),
          'syncedAt': DateTime.now().toIso8601String(),
        };

        final items = itemsData
            .map((i) => {
                  'transactionOfflineId': txn['offlineId'],
                  'productId': i['productId'],
                  'quantity': i['quantity'],
                  'price': i['price'],
                  'costPrice': i['basePrice'] ?? i['costPrice'] ?? 0,
                  'name': i['productName'] ?? '',
                  'sku': i['productSku'],
                  'imageUrl': i['productImage']
                })
            .toList();

        batchPayload.add({'transaction': txn, 'items': items});
      }

      await db.upsertSyncedTransactions(batchPayload);
    } catch (e) {
      if (kDebugMode) debugPrint('History Sync Error: $e');
    }
  }

  // [NEW] Allow external services to trigger update notification
  void notifyDataChanged() {
    _dataChangeController.add(null);
  }

  // [NEW] Sync Products only
  Future<void> syncProducts() async {
    try {
      await ApiService().fetchAndSaveProducts();
      notifyDataChanged();
    } catch (e) {
      if (kDebugMode) debugPrint('Product Sync Error: $e');
    }
  }

  void startAutoSync({Duration interval = const Duration(seconds: MerchantConfig.autoSyncIntervalSeconds)}) {
    if (_autoEnabled) return;
    _autoEnabled = true;
    ConnectivityService().startMonitoring();
    _connSub?.cancel();
    _connSub = ConnectivityService().onStatusChanged.listen((online) async {
      _online = online;
      _statusUpdate(); // [FIX] Use new method
      if (online) {
        _triggerSyncWithBackoff(); // [FIX] Use new method
      }
    });
    _autoTimer?.cancel();
    _autoTimer = Timer.periodic(interval, (_) async {
      // final online = await ConnectivityService().hasInternetConnection(); // [OLD] Removed
      // _online = online; // [OLD] Removed
      // _statusController.add( // [OLD] Removed
      //     {'online': _online, 'lastSyncAt': _lastSyncAt?.toIso8601String()}); // [OLD] Removed
      if (_online) { // [FIX] Use existing _online state
        _triggerSyncWithBackoff(); // [FIX] Use new method
      }
    });
  }

  void _statusUpdate() { // [NEW]
    _statusController.add({
      'online': _online,
      'lastSyncAt': _lastSyncAt?.toIso8601String(),
      'retryCount': _retryCount, // [NEW]
      'isSyncing': _isSyncing,
    });
  }

  Future<void> _triggerSyncWithBackoff() async { // [NEW]
    if (_isSyncing) return;
    
    // Simple Exponential Backoff
    if (_retryCount > 0 && _retryCount <= _maxRetries) { // [NEW] Check max retries
      final delaySeconds = math.min(math.pow(2, _retryCount).toInt(), 300); // Max 5 mins
      if (kDebugMode) debugPrint('Retrying sync in $delaySeconds seconds...');
      await Future.delayed(Duration(seconds: delaySeconds));
    } else if (_retryCount > _maxRetries) { // [NEW]
      if (kDebugMode) debugPrint('Max sync retries reached. Skipping sync attempt.'); // [NEW]
      return; // [NEW] Stop retrying after max attempts
    }

    try {
      await syncTransactions();
    } catch (_) {
      // Error handled in syncTransactions (retryCount++)
    }
  }

  void stopAutoSync() {
    _autoEnabled = false;
    _autoTimer?.cancel();
    _autoTimer = null;
    _connSub?.cancel();
    _connSub = null;
    _statusUpdate(); // [FIX] Use new method
  }
}
