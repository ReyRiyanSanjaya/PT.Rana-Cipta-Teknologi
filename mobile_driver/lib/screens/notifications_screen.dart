import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';
import 'package:mobile_driver/config/theme_config.dart';
import 'package:mobile_driver/providers/notifications_provider.dart';

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ThemeConfig.beigeBackground,
      appBar: AppBar(
        title: Text('Notifikasi',
            style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: ThemeConfig.brandColor)),
        backgroundColor: ThemeConfig.beigeBackground,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, size: 20, color: ThemeConfig.brandColor),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Provider.of<NotificationsProvider>(context, listen: false).markAllAsRead();
            },
            child: const Text('Tandai Dibaca', style: TextStyle(color: ThemeConfig.brandColor, fontSize: 12)),
          ),
        ],
      ),
      body: Consumer<NotificationsProvider>(
        builder: (context, prov, _) {
          if (prov.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (prov.items.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.notifications_off_rounded, size: 72, color: Colors.grey.shade300),
                  const SizedBox(height: 16),
                  Text('Belum ada notifikasi', style: TextStyle(color: Colors.grey.shade500, fontSize: 16)),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () => prov.load(),
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: prov.items.length,
              itemBuilder: (context, index) {
                final item = prov.items[index];
                return _buildNotifCard(item, index);
              },
            ),
          );
        },
      ),
    );
  }

  Widget _buildNotifCard(Map<String, dynamic> item, int index) {
    final title = item['title'] ?? '';
    final message = item['message'] ?? '';
    final source = item['source'] ?? 'SYSTEM';
    final isRead = item['isRead'] == true;
    final createdAt = item['createdAt'];

    String timeStr = '';
    if (createdAt != null) {
      try {
        final dt = DateTime.parse(createdAt.toString()).toLocal();
        final diff = DateTime.now().difference(dt);
        if (diff.inMinutes < 60) {
          timeStr = '${diff.inMinutes} menit lalu';
        } else if (diff.inHours < 24) {
          timeStr = '${diff.inHours} jam lalu';
        } else {
          timeStr = DateFormat('dd MMM, HH:mm').format(dt);
        }
      } catch (_) {}
    }

    IconData icon;
    Color color;
    switch (source) {
      case 'ANNOUNCEMENT':
        icon = Icons.campaign_rounded;
        color = Colors.blue;
        break;
      case 'REALTIME':
        icon = Icons.flash_on_rounded;
        color = Colors.orange;
        break;
      default:
        icon = Icons.notifications_rounded;
        color = Colors.grey;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isRead ? Colors.white : ThemeConfig.brandColor.withOpacity(0.03),
        borderRadius: BorderRadius.circular(16),
        border: isRead ? null : Border.all(color: ThemeConfig.brandColor.withOpacity(0.1)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 14)),
                if (message.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(message, style: TextStyle(color: Colors.grey.shade600, fontSize: 13, height: 1.4), maxLines: 3, overflow: TextOverflow.ellipsis),
                ],
                if (timeStr.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(timeStr, style: TextStyle(color: Colors.grey.shade400, fontSize: 11)),
                ],
              ],
            ),
          ),
          if (!isRead)
            Container(
              width: 8, height: 8,
              decoration: const BoxDecoration(color: ThemeConfig.brandColor, shape: BoxShape.circle),
            ),
        ],
      ),
    ).animate().fadeIn(delay: (30 * index).ms);
  }
}
