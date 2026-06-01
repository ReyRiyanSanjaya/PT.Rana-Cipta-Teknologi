import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:rana_market/config/theme_config.dart';
import 'package:rana_market/data/market_api_service.dart';
import 'package:rana_market/services/socket_service.dart';

class BuyerTripChatScreen extends StatefulWidget {
  final String requestId;
  final String driverName;

  const BuyerTripChatScreen({super.key, required this.requestId, required this.driverName});

  @override
  State<BuyerTripChatScreen> createState() => _BuyerTripChatScreenState();
}

class _BuyerTripChatScreenState extends State<BuyerTripChatScreen> {
  final _msgCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  List<Map<String, dynamic>> _messages = [];
  String? _roomId;
  bool _isLoading = true;
  StreamSubscription? _chatSub;

  static const List<String> _templates = [
    'Saya tunggu di depan',
    'Mohon jangan klakson',
    'Saya pakai baju merah',
    'Sebentar ya, saya turun',
  ];

  @override
  void initState() {
    super.initState();
    _initChat();
  }

  @override
  void dispose() {
    _chatSub?.cancel();
    if (_roomId != null) {
      Provider.of<SocketService>(context, listen: false).leaveChatRoom(_roomId!);
    }
    _msgCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  Future<void> _initChat() async {
    try {
      final result = await MarketApiService().getTripChatRoom(widget.requestId);
      _roomId = result['roomId'];

      if (_roomId != null) {
        final socketService = Provider.of<SocketService>(context, listen: false);
        socketService.joinChatRoom(_roomId!);

        final messages = await MarketApiService().getChatMessages(_roomId!);
        if (mounted) {
          setState(() {
            _messages = messages.map((m) => Map<String, dynamic>.from(m)).toList();
            _isLoading = false;
          });
          _scrollToBottom();
        }

        _chatSub = socketService.chatMessageStream.listen((data) {
          if (!mounted) return;
          if (data['roomId'] == _roomId) {
            setState(() => _messages.add(data));
            _scrollToBottom();
          }
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(_scrollCtrl.position.maxScrollExtent,
            duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
      }
    });
  }

  Future<void> _sendMessage(String content) async {
    if (content.trim().isEmpty || _roomId == null) return;
    _msgCtrl.clear();

    setState(() {
      _messages.add({
        'content': content,
        'userId': 'me',
        'userName': 'Anda',
        'createdAt': DateTime.now().toIso8601String(),
        'isMine': true,
      });
    });
    _scrollToBottom();

    await MarketApiService().sendChatMessage(_roomId!, content);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade100,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.driverName, style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.black87)),
            Text('Driver Anda', style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
          ],
        ),
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, size: 20, color: Colors.black87),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _messages.isEmpty
                    ? Center(child: Text('Belum ada pesan', style: TextStyle(color: Colors.grey.shade500)))
                    : ListView.builder(
                        controller: _scrollCtrl,
                        padding: const EdgeInsets.all(16),
                        itemCount: _messages.length,
                        itemBuilder: (context, index) => _buildBubble(_messages[index]),
                      ),
          ),
          // Quick templates
          Container(
            height: 44,
            color: Colors.white,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              itemCount: _templates.length,
              itemBuilder: (context, index) => Padding(
                padding: const EdgeInsets.only(right: 8),
                child: GestureDetector(
                  onTap: () => _sendMessage(_templates[index]),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      color: ThemeConfig.brandColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: ThemeConfig.brandColor.withOpacity(0.3)),
                    ),
                    child: Text(_templates[index],
                        style: TextStyle(color: ThemeConfig.brandColor, fontSize: 12, fontWeight: FontWeight.w600)),
                  ),
                ),
              ),
            ),
          ),
          // Input
          Container(
            padding: const EdgeInsets.fromLTRB(16, 8, 8, 16),
            color: Colors.white,
            child: SafeArea(
              top: false,
              child: Row(
                children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(24)),
                      child: TextField(
                        controller: _msgCtrl,
                        decoration: const InputDecoration(hintText: 'Ketik pesan...', border: InputBorder.none),
                        textInputAction: TextInputAction.send,
                        onSubmitted: _sendMessage,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  GestureDetector(
                    onTap: () => _sendMessage(_msgCtrl.text),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: const BoxDecoration(color: ThemeConfig.brandColor, shape: BoxShape.circle),
                      child: const Icon(Icons.send_rounded, color: Colors.white, size: 20),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBubble(Map<String, dynamic> msg) {
    final isMine = msg['isMine'] == true || msg['userId'] == 'me';
    final content = msg['content'] ?? '';
    String timeStr = '';
    if (msg['createdAt'] != null) {
      try {
        final dt = DateTime.parse(msg['createdAt'].toString()).toLocal();
        timeStr = '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
      } catch (_) {}
    }

    return Align(
      alignment: isMine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
        decoration: BoxDecoration(
          color: isMine ? ThemeConfig.brandColor : Colors.white,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16), topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(isMine ? 16 : 4),
            bottomRight: Radius.circular(isMine ? 4 : 16),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(content, style: TextStyle(color: isMine ? Colors.white : Colors.black87, fontSize: 14, height: 1.4)),
            if (timeStr.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(timeStr, style: TextStyle(color: isMine ? Colors.white70 : Colors.grey.shade500, fontSize: 10)),
              ),
          ],
        ),
      ),
    );
  }
}
