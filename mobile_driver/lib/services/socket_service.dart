import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:mobile_driver/config/api_config.dart';

class SocketService {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;
  SocketService._internal();

  io.Socket? _socket;
  bool _isConnected = false;
  String? _currentToken;

  final _chatMessageController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _typingController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _orderStatusController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _onlineCountController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _newDriverOrderController =
      StreamController<Map<String, dynamic>>.broadcast();

  bool get isConnected => _isConnected;
  Stream<Map<String, dynamic>> get orderStatusStream =>
      _orderStatusController.stream;
  Stream<Map<String, dynamic>> get chatMessageStream =>
      _chatMessageController.stream;
  Stream<Map<String, dynamic>> get typingStream => _typingController.stream;
  Stream<Map<String, dynamic>> get onlineCountStream =>
      _onlineCountController.stream;
  Stream<Map<String, dynamic>> get newDriverOrderStream =>
      _newDriverOrderController.stream;

  void init(String token) {
    if (_currentToken == token && _isConnected) return;

    if (_socket != null) {
      if (_socket!.connected) _socket!.disconnect();
      _socket!.dispose();
    }

    _currentToken = token;
    final url = ApiConfig.serverUrl;

    _socket = io.io(
      url,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .disableAutoConnect()
          .setAuth({'token': token})
          .enableForceNew()
          .build(),
    );

    _socket!.onConnect((_) {
      _isConnected = true;
      debugPrint('[Socket] Connected');
    });

    _socket!.onDisconnect((_) {
      _isConnected = false;
      debugPrint('[Socket] Disconnected');
    });

    _socket!.onConnectError((err) {
      _isConnected = false;
      debugPrint('[Socket] Connection Error: $err');
    });

    _socket!.on('order_status', (data) {
      if (data is Map) {
        _orderStatusController.add(Map<String, dynamic>.from(data));
      }
    });

    _socket!.on('chat:new_message', (data) {
      if (data is Map) {
        _chatMessageController.add(Map<String, dynamic>.from(data));
      }
    });

    _socket!.on('chat:typing', (data) {
      if (data is Map) {
        _typingController.add(Map<String, dynamic>.from(data));
      }
    });

    _socket!.on('chat:online_count', (data) {
      if (data is Map) {
        _onlineCountController.add(Map<String, dynamic>.from(data));
      }
    });

    // Listen for new orders dispatched to drivers
    _socket!.on('new_order_driver', (data) {
      if (data is Map) {
        debugPrint('[Socket] New order received: ${data['id']}');
        _newDriverOrderController.add(Map<String, dynamic>.from(data));
      }
    });

    _socket!.connect();
  }

  void joinOrder(String orderId) {
    _emitWhenConnected('join_order', orderId);
  }

  void joinChatRoom(String roomId) {
    _emitWhenConnected('join_chat_room', roomId);
  }

  void leaveChatRoom(String roomId) {
    _emitWhenConnected('leave_chat_room', roomId);
  }

  void setTyping(String roomId, bool isTyping) {
    _emitWhenConnected(
        'chat:typing', {'roomId': roomId, 'isTyping': isTyping});
  }

  void emitLocationUpdate(double lat, double lng, {String? orderId}) {
    _emitWhenConnected('driver_location_update', {
      'lat': lat,
      'lng': lng,
      'orderId': orderId,
      'timestamp': DateTime.now().toIso8601String(),
    });
  }

  void _emitWhenConnected(String event, dynamic data) {
    if (_socket != null && _socket!.connected) {
      _socket!.emit(event, data);
    }
  }

  /// Emit raw event (for WebRTC signaling)
  void emitRaw(String event, dynamic data) {
    _emitWhenConnected(event, data);
  }

  /// Listen to raw socket event (for WebRTC signaling)
  void onRaw(String event, Function(dynamic) callback) {
    _socket?.on(event, callback);
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _isConnected = false;
    _currentToken = null;
  }
}
