import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:shimmer/shimmer.dart';
import 'package:rana_merchant/data/remote/api_service.dart';

class NotificationScreen extends StatefulWidget {
  const NotificationScreen({super.key});

  @override
  State<NotificationScreen> createState() => _NotificationScreenState();
}

class _NotificationScreenState extends State<NotificationScreen> {
  final ApiService _api = ApiService();
  bool _isLoading = true;
  List<Map<String, dynamic>> _notifications = [];

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    setState(() => _isLoading = true);
    try {
      final anns = await _api.getAnnouncements();
      final notifs = await _api.fetchNotifications();

      final merged = <Map<String, dynamic>>[];

      for (final a in anns.whereType<Map>()) {
        final m = Map<String, dynamic>.from(a);
        merged.add({
          'title': m['title'] ?? '-',
          'body': m['content'] ?? m['body'] ?? '',
          'createdAt': m['createdAt'],
          'type': 'ANNOUNCEMENT',
        });
      }

      for (final n in notifs.whereType<Map>()) {
        final m = Map<String, dynamic>.from(n);
        merged.add({
          'id': m['id'],
          'title': m['title'] ?? '-',
          'body': m['body'] ?? m['message'] ?? '',
          'createdAt': m['createdAt'],
          'type': 'NOTIFICATION',
          'isRead': m['isRead'] ?? false,
        });
      }

      merged.sort((a, b) {
        final ad = a['createdAt'];
        final bd = b['createdAt'];
        DateTime? at;
        DateTime? bt;
        if (ad is String) at = DateTime.tryParse(ad);
        else if (ad is DateTime) at = ad;
        if (bd is String) bt = DateTime.tryParse(bd);
        else if (bd is DateTime) bt = bd;
        final av = at?.millisecondsSinceEpoch ?? 0;
        final bv = bt?.millisecondsSinceEpoch ?? 0;
        return bv.compareTo(av);
      });

      if (!mounted) return;
      setState(() { _notifications = merged; _isLoading = false; });
    } catch (_) {
      if (!mounted) return;
      setState(() => _isLoading = false);
    }
  }

  Future<void> _markAllRead() async {
    try {
      await _api.markAllNotificationsRead();
      _loadNotifications();
    } catch (_) {}
  }

  Future<void> _markSingleRead(Map<String, dynamic> n) async {
    if (n['isRead'] == true || n['id'] == null) return;
    try {
      await _api.markNotificationRead(n['id'].toString());
      _loadNotifications();
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final isDark = colorScheme.brightness == Brightness.dark;
    final headerColors = isDark
        ? [colorScheme.surface.withOpacity(0.98), colorScheme.surface.withOpacity(0.94)]
        : [colorScheme.primary.withOpacity(0.9), colorScheme.primary.withOpacity(0.8)];

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text('Notifikasi',
            style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: colorScheme.onPrimary)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        iconTheme: IconThemeData(color: colorScheme.onPrimary),
        actions: [
          if (_notifications.any((n) => n['isRead'] == false))
            IconButton(
              icon: Icon(Icons.done_all, color: colorScheme.onPrimary),
              tooltip: 'Tandai semua dibaca',
              onPressed: _markAllRead,
            ),
        ],
        flexibleSpace: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: headerColors,
            ),
          ),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _loadNotifications,
        child: _isLoading
            ? _buildShimmer(colorScheme)
            : _notifications.isEmpty
                ? _buildEmptyState(colorScheme)
                : ListView.separated(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 80),
                    itemCount: _notifications.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final n = _notifications[index];
                      final isRead = n['isRead'] ?? true;
                      final created = n['createdAt'];
                      DateTime? createdAt;
                      if (created is String) createdAt = DateTime.tryParse(created);
                      else if (created is DateTime) createdAt = created;

                      final timeLabel = createdAt != null
                          ? DateFormat('dd MMM HH:mm').format(createdAt)
                          : '';
                      final isAnn = n['type'] == 'ANNOUNCEMENT';
                      final accent = isAnn ? colorScheme.secondary : const Color(0xFFE07A5F);

                      return InkWell(
                        onTap: () => _markSingleRead(n),
                        borderRadius: BorderRadius.circular(16),
                        child: Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: isRead
                                ? (isDark ? colorScheme.surface : Colors.white)
                                : colorScheme.primary.withOpacity(0.04),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: isRead
                                  ? colorScheme.outline.withOpacity(0.08)
                                  : colorScheme.primary.withOpacity(0.15),
                              width: 1,
                            ),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Icon with unread dot
                              Stack(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: accent.withOpacity(0.1),
                                      shape: BoxShape.circle,
                                    ),
                                    child: Icon(
                                      isAnn ? Icons.campaign_rounded : Icons.notifications_none_rounded,
                                      color: accent, size: 20,
                                    ),
                                  ),
                                  if (!isRead)
                                    Positioned(
                                      right: 2, top: 2,
                                      child: Container(
                                        width: 10, height: 10,
                                        decoration: BoxDecoration(
                                          color: Colors.redAccent,
                                          shape: BoxShape.circle,
                                          border: Border.all(color: colorScheme.surface, width: 2),
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Expanded(
                                          child: Text(
                                            n['title']?.toString() ?? 'Info',
                                            style: GoogleFonts.outfit(
                                              fontWeight: isRead ? FontWeight.w600 : FontWeight.bold,
                                              fontSize: 15,
                                              color: isRead ? colorScheme.onSurface : colorScheme.primary,
                                            ),
                                            maxLines: 1, overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                        if (timeLabel.isNotEmpty)
                                          Text(timeLabel,
                                              style: GoogleFonts.outfit(
                                                  fontSize: 11,
                                                  color: colorScheme.onSurface.withOpacity(0.4))),
                                      ],
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      n['body']?.toString() ?? '',
                                      style: GoogleFonts.outfit(
                                        color: colorScheme.onSurface.withOpacity(isRead ? 0.6 : 0.8),
                                        fontSize: 13, height: 1.4,
                                        fontWeight: isRead ? FontWeight.normal : FontWeight.w500,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      )
                          .animate()
                          .fadeIn(delay: (40 * index).ms, duration: 300.ms)
                          .slideX(begin: 0.05, curve: Curves.easeOutQuad);
                    },
                  ),
      ),
    );
  }

  Widget _buildEmptyState(ColorScheme colorScheme) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      children: [
        SizedBox(
          height: MediaQuery.of(context).size.height * 0.65,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  color: colorScheme.primary.withOpacity(0.07),
                  shape: BoxShape.circle,
                ),
                child: Icon(Icons.notifications_none_rounded,
                    size: 48, color: colorScheme.primary.withOpacity(0.45)),
              ),
              const SizedBox(height: 18),
              Text('Semua Beres!',
                  style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold,
                      color: colorScheme.onSurface.withOpacity(0.7))),
              const SizedBox(height: 8),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 48),
                child: Text(
                  'Belum ada notifikasi. Kami akan memberitahu kamu jika ada informasi penting atau pengumuman baru.',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.outfit(fontSize: 13,
                      color: colorScheme.onSurface.withOpacity(0.42), height: 1.5),
                ),
              ),
              const SizedBox(height: 12),
              Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                Icon(Icons.swipe_down_rounded, size: 14, color: colorScheme.onSurface.withOpacity(0.3)),
                const SizedBox(width: 4),
                Text('Tarik ke bawah untuk memperbarui',
                    style: GoogleFonts.outfit(fontSize: 12,
                        color: colorScheme.onSurface.withOpacity(0.35))),
              ]),
            ],
          ).animate().fadeIn(duration: 400.ms).scale(begin: const Offset(0.92, 0.92)),
        ),
      ],
    );
  }

  Widget _buildShimmer(ColorScheme colorScheme) {
    return Shimmer.fromColors(
      baseColor: colorScheme.surface,
      highlightColor: colorScheme.onSurface.withOpacity(0.06),
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
        itemCount: 6,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (_, __) => Container(
          height: 84,
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
        ),
      ),
    );
  }
}
