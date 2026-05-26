import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:provider/provider.dart';
import 'package:rana_market/config/theme_config.dart';
import 'package:rana_market/providers/auth_provider.dart';
import 'package:rana_market/providers/chat_provider.dart';
import 'package:intl/intl.dart';

class ChatDetailScreen extends StatefulWidget {
  final String roomId;
  final String roomName;

  const ChatDetailScreen({
    super.key,
    required this.roomId,
    required this.roomName,
  });

  @override
  State<ChatDetailScreen> createState() => _ChatDetailScreenState();
}

class _ChatDetailScreenState extends State<ChatDetailScreen> {
  final TextEditingController _messageCtrl = TextEditingController();
  final ScrollController _scrollCtrl = ScrollController();
  bool _isTyping = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<ChatProvider>(context, listen: false)
          .setActiveRoom(widget.roomId);
    });
  }

  @override
  void dispose() {
    _messageCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  void _sendMessage() {
    final text = _messageCtrl.text.trim();
    if (text.isEmpty) return;

    Provider.of<ChatProvider>(context, listen: false)
        .sendMessage(widget.roomId, text);
    _messageCtrl.clear();
    _setTyping(false);

    Timer(const Duration(milliseconds: 100), () {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent + 200,
          duration: const Duration(milliseconds: 350),
          curve: Curves.easeOutQuart,
        );
      }
    });
  }

  void _setTyping(bool typing) {
    if (_isTyping != typing) {
      _isTyping = typing;
      Provider.of<ChatProvider>(context, listen: false).setTyping(typing);
    }
  }

  @override
  Widget build(BuildContext context) {
    final chat = Provider.of<ChatProvider>(context);
    final auth = Provider.of<AuthProvider>(context);
    final myUserId = auth.user?['id'];
    final messages = chat.getMessages(widget.roomId);

    return Scaffold(
      backgroundColor: const Color(0xFFF1F3F6),
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: ThemeConfig.brandColor.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(
                  widget.roomName.isNotEmpty ? widget.roomName[0].toUpperCase() : 'S',
                  style: const TextStyle(fontWeight: FontWeight.bold, color: ThemeConfig.brandColor, fontSize: 16),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(widget.roomName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.black87)),
                const Text('Online', style: TextStyle(fontSize: 11, color: Colors.green, fontWeight: FontWeight.w500)),
              ],
            ),
          ],
        ),
        elevation: 0,
        backgroundColor: Colors.white.withValues(alpha: 0.85),
        leading: const BackButton(color: Colors.black87),
        flexibleSpace: ClipRect(
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
            child: Container(color: Colors.transparent),
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.phone_rounded, color: ThemeConfig.brandColor),
            onPressed: () {},
          ),
          IconButton(
            icon: const Icon(Icons.more_vert_rounded, color: Colors.black54),
            onPressed: () {},
          ),
        ],
      ),
      body: Stack(
        children: [
          Column(
            children: [
              Expanded(
                child: ListView.builder(
                  controller: _scrollCtrl,
                  padding: const EdgeInsets.only(top: 100, left: 16, right: 16, bottom: 120),
                  itemCount: messages.length,
                  itemBuilder: (context, index) {
                    final msg = messages[index];
                    final isMe = msg['userId'] == myUserId;
                    return _buildMessageBubble(msg, isMe)
                        .animate()
                        .fadeIn(duration: 300.ms)
                        .slideY(begin: 0.05, curve: Curves.easeOutQuart);
                  },
                ),
              ),
            ],
          ),

          // Floating Input Bar
          Positioned(
            bottom: 0, left: 0, right: 0,
            child: _buildInputArea(),
          ),
        ],
      ),
    );
  }

  Widget _buildMessageBubble(Map<String, dynamic> msg, bool isMe) {
    final time = DateTime.tryParse(msg['createdAt'] ?? '') ?? DateTime.now();
    final timeStr = DateFormat('HH:mm').format(time);

    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 5),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.72,
        ),
        decoration: BoxDecoration(
          gradient: isMe
              ? const LinearGradient(
                  colors: [ThemeConfig.brandColor, Color(0xFFFFA07A)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                )
              : null,
          color: isMe ? null : Colors.white,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(20),
            topRight: const Radius.circular(20),
            bottomLeft: Radius.circular(isMe ? 20 : 4),
            bottomRight: Radius.circular(isMe ? 4 : 20),
          ),
          boxShadow: [
            BoxShadow(
              color: (isMe ? ThemeConfig.brandColor : Colors.black).withValues(alpha: 0.08),
              blurRadius: 12,
              offset: const Offset(0, 4),
            )
          ],
          border: isMe ? null : Border.all(color: Colors.grey.shade100, width: 1.5),
        ),
        child: Column(
          crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            Text(
              msg['content'] ?? '',
              style: TextStyle(
                color: isMe ? Colors.white : Colors.black87,
                fontSize: 14,
                height: 1.4,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              timeStr,
              style: TextStyle(
                color: isMe ? Colors.white.withValues(alpha: 0.75) : Colors.black38,
                fontSize: 10,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInputArea() {
    return Container(
      margin: const EdgeInsets.fromLTRB(12, 0, 12, 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(
            color: ThemeConfig.brandColor.withValues(alpha: 0.12),
            blurRadius: 20,
            offset: const Offset(0, 6),
          ),
        ],
        border: Border.all(color: Colors.grey.shade100, width: 1.5),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            const SizedBox(width: 6),
            IconButton(
              onPressed: () {},
              icon: Icon(Icons.emoji_emotions_outlined, color: Colors.grey.shade500),
              iconSize: 22,
            ),
            Expanded(
              child: TextField(
                controller: _messageCtrl,
                maxLines: 3,
                minLines: 1,
                onChanged: (val) => _setTyping(val.isNotEmpty),
                decoration: const InputDecoration(
                  hintText: 'Ketik pesan...',
                  hintStyle: TextStyle(color: Colors.grey, fontWeight: FontWeight.w400),
                  border: InputBorder.none,
                  contentPadding: EdgeInsets.symmetric(vertical: 12),
                ),
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => _sendMessage(),
              ),
            ),
            const SizedBox(width: 4),
            GestureDetector(
              onTap: _sendMessage,
              child: Container(
                margin: const EdgeInsets.all(6),
                padding: const EdgeInsets.all(11),
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [ThemeConfig.brandColor, Color(0xFFFFA07A)],
                  ),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.send_rounded, color: Colors.white, size: 20),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
