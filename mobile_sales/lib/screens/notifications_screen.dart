import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:rana_sales/data/api_service.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<dynamic> _notifications = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      setState(() => _isLoading = true);
      final data = await ApiService().getNotifications();
      if (mounted) setState(() { _notifications = data; _isLoading = false; });
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _markAllRead() async {
    try {
      await ApiService().markAllNotificationsRead();
      _loadData();
    } catch (_) {}
  }

  Future<void> _markRead(String id) async {
    try {
      await ApiService().markNotificationRead(id);
      setState(() {
        final idx = _notifications.indexWhere((n) => n['id'] == id);
        if (idx >= 0) _notifications[idx]['isRead'] = true;
      });
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final unread = _notifications.where((n) => n['isRead'] != true).length;

    return Scaffold(
      appBar: AppBar(
        title: Text('Notifikasi', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        actions: [
          if (unread > 0)
            TextButton(onPressed: _markAllRead, child: const Text('Tandai Semua', style: TextStyle(fontSize: 12))),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _notifications.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.notifications_none, size: 60, color: Colors.grey.shade300),
                      const SizedBox(height: 12),
                      Text('Belum ada notifikasi', style: TextStyle(color: Colors.grey.shade500)),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadData,
                  child: ListView.builder(
                    itemCount: _notifications.length,
                    itemBuilder: (ctx, i) => _buildNotifCard(_notifications[i], i),
                  ),
                ),
    );
  }

  Widget _buildNotifCard(dynamic notif, int index) {
    final isRead = notif['isRead'] == true;
    final title = notif['title'] ?? '';
    final body = notif['body'] ?? '';
    final createdAt = notif['createdAt'] ?? '';

    String timeAgo = '';
    try {
      final dt = DateTime.parse(createdAt);
      final diff = DateTime.now().difference(dt);
      if (diff.inMinutes < 60) {
        timeAgo = '${diff.inMinutes} mnt lalu';
      } else if (diff.inHours < 24) {
        timeAgo = '${diff.inHours} jam lalu';
      } else {
        timeAgo = '${diff.inDays} hari lalu';
      }
    } catch (_) {}

    return InkWell(
      onTap: () {
        if (!isRead) _markRead(notif['id']);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: isRead ? null : Colors.teal.shade50,
          border: Border(bottom: BorderSide(color: Colors.grey.shade100)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 8, height: 8,
              margin: const EdgeInsets.only(top: 6, right: 12),
              decoration: BoxDecoration(
                color: isRead ? Colors.transparent : Colors.teal,
                shape: BoxShape.circle,
              ),
            ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: GoogleFonts.outfit(fontWeight: isRead ? FontWeight.normal : FontWeight.bold, fontSize: 14)),
                  const SizedBox(height: 2),
                  Text(body, style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                  const SizedBox(height: 4),
                  Text(timeAgo, style: TextStyle(color: Colors.grey.shade400, fontSize: 10)),
                ],
              ),
            ),
          ],
        ),
      ),
    ).animate().fadeIn(delay: (20 * index).ms);
  }
}
