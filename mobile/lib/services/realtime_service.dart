import 'dart:async';

import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:rana_merchant/constants.dart';
import 'package:rana_merchant/config/api_config.dart';
import 'package:rana_merchant/data/local/database_helper.dart';
import 'package:rana_merchant/data/remote/api_service.dart';
import 'package:rana_merchant/services/notification_service.dart';
import 'package:rana_merchant/services/sync_service.dart'; // [NEW]
import 'package:rana_merchant/services/connectivity_service.dart';

typedef TransactionEventHandler = void Function(Map<String, dynamic> data);

class RealtimeService {
  static final RealtimeService _instance = RealtimeService._internal();
  factory RealtimeService() => _instance;
  RealtimeService._internal();

  io.Socket? _socket;
  bool _initialized = false;
  StreamSubscription<bool>? _connSub;

  final List<TransactionEventHandler> _transactionListeners = [];
  final _maintenanceController = StreamController<Map<String, dynamic>>.broadcast();
  Stream<Map<String, dynamic>> get maintenanceStream => _maintenanceController.stream;
  final _menusUpdateController = StreamController<void>.broadcast();
  Stream<void> get menusUpdateStream => _menusUpdateController.stream;
  final _transactionsController = StreamController<Map<String, dynamic>>.broadcast();
  Stream<Map<String, dynamic>> get transactionsStream => _transactionsController.stream;
  final _chatMessageController = StreamController<Map<String, dynamic>>.broadcast();
  Stream<Map<String, dynamic>> get chatMessageStream => _chatMessageController.stream;
  final _chatTypingController = StreamController<Map<String, dynamic>>.broadcast();
  Stream<Map<String, dynamic>> get chatTypingStream => _chatTypingController.stream;
  final _chatStatusController = StreamController<Map<String, dynamic>>.broadcast();
  Stream<Map<String, dynamic>> get chatStatusStream => _chatStatusController.stream;

  io.Socket _ensureConnected() {
    if (_socket != null && _socket!.connected) return _socket!;
    final token = ApiService().token ?? '';
    final origin = ApiConfig.serverUrl;

    _socket = io.io(
      origin,
      io.OptionBuilder().setTransports(['websocket', 'polling']).setAuth(
          {'token': token}).build(),
    );

    return _socket!;
  }

  void init() {
    if (_initialized) return;
    final s = _ensureConnected();

    // [NEW] On Connect: Sync everything
    s.onConnect((_) {
      SyncService().syncProducts();
      SyncService().syncTransactions();
    });

    s.on('inventory:changed', (payload) async {
      if (payload is! Map) return;
      final dynamic changesRaw = payload['changes'];
      if (changesRaw is! List) return;

      final db = DatabaseHelper.instance;
      for (final item in changesRaw) {
        if (item is! Map) continue;
        final map = Map<String, dynamic>.from(item);
        final productId = map['productId']?.toString();
        final dynamic storeStockRaw = map['storeStock'] ?? map['stock'];
        if (productId == null) continue;
        if (storeStockRaw is! num) continue;
        final newStock = storeStockRaw.toInt();
        await db.updateProductStock(productId, newStock);
      }

      // [NEW] Notify UI to refresh
      SyncService().notifyDataChanged();
    });

    s.on('transactions:created', (payload) {
      if (payload is! Map) return;
      final data = Map<String, dynamic>.from(payload);
      for (final handler
          in List<TransactionEventHandler>.from(_transactionListeners)) {
        unawaited(Future<void>.microtask(() => handler(data)));
      }
      _transactionsController.add(data);

      NotificationService().showNotification(
        id: DateTime.now().millisecondsSinceEpoch % 100000,
        title: 'Transaksi baru',
        body: 'Transaksi baru berhasil tersimpan.',
      );
    });

    s.on('orders:updated', (payload) {
      if (payload is! Map) return;
      final data = Map<String, dynamic>.from(payload);
      for (final handler
          in List<TransactionEventHandler>.from(_transactionListeners)) {
        unawaited(Future<void>.microtask(() => handler(data)));
      }

      final status = data['orderStatus']?.toString();
      final title = status == null || status.isEmpty
          ? 'Pesanan diperbarui'
          : 'Status pesanan: $status';

      NotificationService().showNotification(
        id: DateTime.now().millisecondsSinceEpoch % 100000,
        title: title,
        body: 'Pesanan marketplace diperbarui.',
      );
    });

    s.on('orders:new', (payload) {
      if (payload is! Map) return;
      final data = Map<String, dynamic>.from(payload);
      for (final handler
          in List<TransactionEventHandler>.from(_transactionListeners)) {
        unawaited(Future<void>.microtask(() => handler(data)));
      }
      _transactionsController.add(data);

      final customerName = data['customerName'] ?? 'Pelanggan';
      final total = data['totalAmount'];
      final totalStr = total != null ? ' - Rp${total.toString()}' : '';

      NotificationService().showNotification(
        id: DateTime.now().millisecondsSinceEpoch % 100000,
        title: '🔔 Pesanan Baru Masuk!',
        body: 'Dari $customerName$totalStr. Segera proses pesanan.',
      );
    });

    s.on('maintenance:update', (payload) async {
      try {
        final map = await ApiService().fetchMenuMaintenance();
        _maintenanceController.add(map);
      } catch (_) {}
    });
    s.on('app_menus:update', (_) {
      _menusUpdateController.add(null);
    });
    s.on('chat:new_message', (payload) {
      if (payload is Map) {
        _chatMessageController.add(Map<String, dynamic>.from(payload));
      }
    });
    s.on('chat:typing', (payload) {
      if (payload is Map) {
        _chatTypingController.add(Map<String, dynamic>.from(payload));
      }
    });
    s.on('chat:status', (payload) {
      if (payload is Map) {
        _chatStatusController.add(Map<String, dynamic>.from(payload));
      }
    });

    // Table Management Events (Cafe/Restaurant)
    s.on('table:new_order', (payload) {
      if (payload is! Map) return;
      final data = Map<String, dynamic>.from(payload);
      _transactionsController.add(data);

      final tableNum = data['tableNumber'] ?? '?';
      NotificationService().showNotification(
        id: DateTime.now().millisecondsSinceEpoch % 100000,
        title: '🍽️ Pesanan Meja $tableNum',
        body: 'Pesanan baru dari meja $tableNum. Segera siapkan!',
      );
    });

    s.on('table:bill_requested', (payload) {
      if (payload is! Map) return;
      final data = Map<String, dynamic>.from(payload);
      _transactionsController.add(data);

      final tableNum = data['tableNumber'] ?? '?';
      NotificationService().showNotification(
        id: DateTime.now().millisecondsSinceEpoch % 100000,
        title: '💰 Minta Bill - Meja $tableNum',
        body: 'Pelanggan meja $tableNum meminta bill.',
      );
    });

    s.on('table:session_opened', (payload) {
      if (payload is! Map) return;
      _transactionsController.add(Map<String, dynamic>.from(payload));
    });

    s.on('table:session_closed', (payload) {
      if (payload is! Map) return;
      _transactionsController.add(Map<String, dynamic>.from(payload));
    });

    s.on('table:order_updated', (payload) {
      if (payload is! Map) return;
      _transactionsController.add(Map<String, dynamic>.from(payload));
    });

    _initialized = true;
  }

  void startAutoManage() {
    ConnectivityService().startMonitoring();
    _connSub?.cancel();
    _connSub = ConnectivityService().onStatusChanged.listen((online) {
      if (online) {
        final s = _ensureConnected();
        if (!s.connected) {
          s.connect();
        }
        SyncService().syncTransactions();
      } else {
        _socket?.disconnect();
      }
    });
  }

  void emitTyping(String roomId, {String? userId, String? userName}) {
    final s = _ensureConnected();
    s.emit('chat:typing', {
      'roomId': roomId,
      if (userId != null) 'userId': userId,
      if (userName != null) 'userName': userName,
    });
  }

  void joinChatRoom(String roomId) {
    final s = _ensureConnected();
    s.emit('join_chat_room', roomId);
  }

  void leaveChatRoom(String roomId) {
    final s = _ensureConnected();
    s.emit('leave_chat_room', roomId);
  }

  void emitDeliveryStatus(String roomId, String messageId, String status) {
    final s = _ensureConnected();
    s.emit('chat:status', {'roomId': roomId, 'messageId': messageId, 'status': status});
  }

  void addTransactionListener(TransactionEventHandler handler) {
    if (!_transactionListeners.contains(handler)) {
      _transactionListeners.add(handler);
    }
    _ensureConnected();
  }

  void removeTransactionListener(TransactionEventHandler handler) {
    _transactionListeners.remove(handler);
  }

  void dispose() {
    _transactionListeners.clear();
    _socket?.dispose();
    _socket = null;
    _initialized = false;
    _connSub?.cancel();
    _connSub = null;
  }
}
