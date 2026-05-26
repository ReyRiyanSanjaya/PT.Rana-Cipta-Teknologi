import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:rana_market/data/market_api_service.dart';
import 'package:rana_market/services/socket_service.dart';

class ChatProvider with ChangeNotifier {
  final SocketService socketService;
  
  List<dynamic> _rooms = [];
  List<dynamic> get rooms => _rooms;
  
  Map<String, List<dynamic>> _messages = {}; // RoomId -> Messages
  List<dynamic> getMessages(String roomId) => _messages[roomId] ?? [];
  
  String? _activeRoomId;
  String? get activeRoomId => _activeRoomId;
  
  bool _isLoadingRooms = false;
  bool get isLoadingRooms => _isLoadingRooms;
  
  final Map<String, bool> _isTyping = {}; // UserId -> bool
  bool isUserTyping(String userId) => _isTyping[userId] ?? false;

  StreamSubscription? _msgSub;
  StreamSubscription? _typingSub;

  ChatProvider(this.socketService) {
    _msgSub = socketService.chatMessageStream.listen(_onNewMessage);
    _typingSub = socketService.typingStream.listen(_onTypingUpdate);
  }

  @override
  void dispose() {
    _msgSub?.cancel();
    _typingSub?.cancel();
    super.dispose();
  }

  Future<void> loadRooms() async {
    _isLoadingRooms = true;
    notifyListeners();
    try {
      _rooms = await MarketApiService().getChatRooms();
    } finally {
      _isLoadingRooms = false;
      notifyListeners();
    }
  }

  Future<void> loadMessages(String roomId) async {
    final msgs = await MarketApiService().getChatMessages(roomId);
    _messages[roomId] = msgs;
    notifyListeners();
  }

  void setActiveRoom(String? roomId) {
    if (_activeRoomId != null && _activeRoomId != roomId) {
      socketService.leaveChatRoom(_activeRoomId!);
    }
    _activeRoomId = roomId;
    if (_activeRoomId != null) {
      socketService.joinChatRoom(_activeRoomId!);
      loadMessages(_activeRoomId!);
    }
    notifyListeners();
  }

  Future<void> sendMessage(String roomId, String content) async {
    try {
      await MarketApiService().sendMessage(roomId, content);
      // Socket will broadcast it back to us usually, 
      // but we can optimistic update if needed.
    } catch (e) {
      debugPrint('Send Message Error: $e');
    }
  }

  void setTyping(bool isTyping) {
    if (_activeRoomId != null) {
      socketService.setTyping(_activeRoomId!, isTyping);
    }
  }

  void _onNewMessage(Map<String, dynamic> data) {
    final roomId = data['roomId'];
    if (roomId == null) return;
    
    if (!_messages.containsKey(roomId)) {
      _messages[roomId] = [];
    }
    _messages[roomId]!.add(data);
    
    // Update last message in room list
    final rIdx = _rooms.indexWhere((r) => r['id'] == roomId);
    if (rIdx != -1) {
      _rooms[rIdx]['lastMessage'] = data;
      // Move to top
      final room = _rooms.removeAt(rIdx);
      _rooms.insert(0, room);
    }
    
    notifyListeners();
  }

  void _onTypingUpdate(Map<String, dynamic> data) {
    final roomId = data['roomId'];
    final userId = data['userId'];
    final typing = data['isTyping'] ?? false;
    
    if (roomId == _activeRoomId && userId != null) {
      _isTyping[userId] = typing;
      notifyListeners();
    }
  }
}
