import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:rana_market/config/theme_config.dart';
import 'package:rana_market/providers/chat_provider.dart';
import 'package:rana_market/screens/chat_detail_screen.dart';
import 'package:intl/intl.dart';

class ChatListScreen extends StatefulWidget {
  const ChatListScreen({super.key});

  @override
  State<ChatListScreen> createState() => _ChatListScreenState();
}

class _ChatListScreenState extends State<ChatListScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<ChatProvider>(context, listen: false).loadRooms();
    });
  }

  @override
  Widget build(BuildContext context) {
    final chat = Provider.of<ChatProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Chat'),
      ),
      body: chat.isLoadingRooms
          ? const Center(child: CircularProgressIndicator())
          : chat.rooms.isEmpty
              ? _buildEmptyState()
              : ListView.separated(
                  itemCount: chat.rooms.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (context, index) {
                    final room = chat.rooms[index];
                    return _buildRoomTile(room);
                  },
                ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.chat_bubble_outline, size: 80, color: Colors.grey.shade300),
          const SizedBox(height: 16),
          Text(
            'Belum ada percakapan',
            style: TextStyle(color: Colors.grey.shade500, fontSize: 16),
          ),
        ],
      ),
    );
  }

  Widget _buildRoomTile(Map<String, dynamic> room) {
    final lastMsg = room['lastMessage'];
    final time = lastMsg != null
        ? DateTime.tryParse(lastMsg['createdAt'] ?? '') ?? DateTime.now()
        : null;
    final timeStr = time != null ? DateFormat('HH:mm').format(time) : '';

    return ListTile(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => ChatDetailScreen(
              roomId: room['id'],
              roomName: room['displayName'] ?? room['name'] ?? 'Chat',
            ),
          ),
        );
      },
      leading: CircleAvatar(
        backgroundColor: ThemeConfig.brandColor.withValues(alpha: 0.1),
        child: const Icon(Icons.store, color: ThemeConfig.brandColor),
      ),
      title: Text(
        room['displayName'] ?? room['name'] ?? 'Chat',
        style: const TextStyle(fontWeight: FontWeight.bold),
      ),
      subtitle: Text(
        lastMsg?['content'] ?? 'Belum ada pesan',
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      trailing: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Text(
            timeStr,
            style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
          ),
          if (room['onlineCount'] != null && room['onlineCount'] > 0)
            Container(
              margin: const EdgeInsets.only(top: 4),
              width: 8,
              height: 8,
              decoration: const BoxDecoration(
                color: Colors.green,
                shape: BoxShape.circle,
              ),
            ),
        ],
      ),
    );
  }
}
