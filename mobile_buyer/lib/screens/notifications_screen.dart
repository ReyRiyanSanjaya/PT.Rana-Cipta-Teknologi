import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:rana_market/config/theme_config.dart';
import 'package:rana_market/providers/notifications_provider.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  String _filterTab = 'Semua';
  final List<String> _tabs = ['Semua', 'Pesanan', 'Promo', 'Sistem'];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<NotificationsProvider>(context, listen: false).load();
    });
  }

  String _formatTime(dynamic createdAt) {
    if (createdAt == null) return '';
    final dt = (createdAt is String)
        ? DateTime.tryParse(createdAt)
        : (createdAt is DateTime ? createdAt : null);
    if (dt == null) return '';
    final diff = DateTime.now().difference(dt);
    if (diff.inSeconds < 60) return 'Baru saja';
    if (diff.inMinutes < 60) return '${diff.inMinutes} menit lalu';
    if (diff.inHours < 24) return '${diff.inHours} jam lalu';
    if (diff.inDays < 7) return '${diff.inDays} hari lalu';
    return '${dt.day}/${dt.month}/${dt.year}';
  }

  Map<String, dynamic> _getConfig(String source) {
    switch (source) {
      case 'ANNOUNCEMENT':
        return {
          'icon': Icons.campaign_rounded,
          'colors': [const Color(0xFFF093FB), const Color(0xFFF5576C)],
          'label': 'Promo',
        };
      case 'REALTIME':
        return {
          'icon': Icons.notifications_active_rounded,
          'colors': [const Color(0xFF667EEA), const Color(0xFF764BA2)],
          'label': 'Sistem',
        };
      case 'ORDER_UPDATE':
        return {
          'icon': Icons.shopping_bag_rounded,
          'colors': [const Color(0xFF43E97B), const Color(0xFF38F9D7)],
          'label': 'Pesanan',
        };
      default:
        return {
          'icon': Icons.info_rounded,
          'colors': [const Color(0xFF4FACFE), const Color(0xFF00F2FE)],
          'label': 'Sistem',
        };
    }
  }

  List<Map<String, dynamic>> _filtered(List<dynamic> items) {
    if (_filterTab == 'Semua') return items.cast<Map<String, dynamic>>();
    return items
        .cast<Map<String, dynamic>>()
        .where((n) {
          final cfg = _getConfig((n['source'] ?? '').toString());
          return cfg['label'] == _filterTab;
        })
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF0F2F8),
      body: Consumer<NotificationsProvider>(
        builder: (context, prov, _) {
          return CustomScrollView(
            physics: const BouncingScrollPhysics(),
            slivers: [
              _buildSliverAppBar(prov),
              SliverToBoxAdapter(child: _buildFilterTabs()),
              if (prov.isLoading && prov.items.isEmpty)
                const SliverFillRemaining(
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (prov.items.isEmpty)
                SliverFillRemaining(child: _buildEmptyState())
              else ...[
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (ctx, i) {
                        final filtered = _filtered(prov.items);
                        if (i >= filtered.length) return null;
                        final n = filtered[i];
                        final source = (n['source'] ?? '').toString();
                        final isRead = n['isRead'] == true;
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: _buildNotifCard(n, source, isRead, prov)
                              .animate()
                              .fadeIn(delay: (50 * i).ms, duration: 300.ms)
                              .slideX(begin: -0.05),
                        );
                      },
                      childCount: _filtered(prov.items).length,
                    ),
                  ),
                ),
              ],
            ],
          );
        },
      ),
    );
  }

  Widget _buildSliverAppBar(NotificationsProvider prov) {
    final unread = prov.items.where((n) => n['isRead'] != true).length;
    return SliverAppBar(
      pinned: true,
      stretch: true,
      expandedHeight: 140,
      backgroundColor: const Color(0xFF1A1A2E),
      leading: IconButton(
        icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
        onPressed: () => Navigator.pop(context),
      ),
      actions: [
        TextButton.icon(
          onPressed: () {
            HapticFeedback.lightImpact();
            prov.markAllAsRead();
          },
          icon: const Icon(Icons.done_all_rounded, color: Colors.white70, size: 18),
          label: Text('Baca Semua',
              style: GoogleFonts.poppins(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w600)),
        ),
        const SizedBox(width: 4),
      ],
      flexibleSpace: FlexibleSpaceBar(
        collapseMode: CollapseMode.pin,
        background: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF1A1A2E), Color(0xFF0F3460)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: Stack(
            children: [
              Positioned(
                top: -30, right: -30,
                child: Opacity(
                  opacity: 0.12,
                  child: Container(
                    width: 160, height: 160,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: RadialGradient(colors: [Color(0xFF667EEA), Colors.transparent]),
                    ),
                  ),
                ),
              ),
              SafeArea(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 48, 20, 16),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Notifikasi',
                              style: GoogleFonts.poppins(
                                  color: Colors.white, fontSize: 26, fontWeight: FontWeight.w900)),
                          if (unread > 0)
                            Text('$unread notifikasi belum dibaca',
                                style: GoogleFonts.poppins(
                                    color: Colors.white60, fontSize: 13, fontWeight: FontWeight.w500)),
                        ],
                      ),
                      const Spacer(),
                      if (unread > 0)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(colors: [Color(0xFFFA709A), Color(0xFFFEE140)]),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text('$unread Baru',
                              style: GoogleFonts.poppins(
                                  color: Colors.white, fontWeight: FontWeight.w800, fontSize: 12)),
                        ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFilterTabs() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: _tabs.map((tab) {
            final isSelected = _filterTab == tab;
            return GestureDetector(
              onTap: () {
                HapticFeedback.selectionClick();
                setState(() => _filterTab = tab);
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                margin: const EdgeInsets.only(right: 10),
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 9),
                decoration: BoxDecoration(
                  gradient: isSelected
                      ? const LinearGradient(colors: [ThemeConfig.brandColor, Color(0xFFFFA07A)])
                      : null,
                  color: isSelected ? null : Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: isSelected ? [
                    BoxShadow(color: ThemeConfig.brandColor.withOpacity(0.35), blurRadius: 10, offset: const Offset(0, 4)),
                  ] : [
                    BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8)
                  ],
                ),
                child: Text(
                  tab,
                  style: GoogleFonts.poppins(
                    fontWeight: FontWeight.w700,
                    fontSize: 12.5,
                    color: isSelected ? Colors.white : Colors.black54,
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(28),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [ThemeConfig.brandColor.withOpacity(0.1), ThemeConfig.brandColor.withOpacity(0.05)],
              ),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.notifications_off_outlined, size: 60, color: ThemeConfig.brandColor),
          ).animate().scale(curve: Curves.easeOutBack, duration: 600.ms),
          const SizedBox(height: 24),
          Text('Tidak ada notifikasi',
              style: GoogleFonts.poppins(fontSize: 20, fontWeight: FontWeight.w800, color: const Color(0xFF1A1A2E)))
              .animate().fadeIn(delay: 200.ms).slideY(begin: 0.2),
          const SizedBox(height: 8),
          Text('Pemberitahuan pesanan dan promo\nakan tampil di sini.',
              textAlign: TextAlign.center,
              style: GoogleFonts.poppins(color: Colors.black38, height: 1.6))
              .animate().fadeIn(delay: 300.ms),
        ],
      ),
    );
  }

  Widget _buildNotifCard(
      Map<String, dynamic> n, String source, bool isRead, NotificationsProvider prov) {
    final cfg = _getConfig(source);
    final colors = cfg['colors'] as List<Color>;
    final icon = cfg['icon'] as IconData;

    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        if (!isRead) prov.markAsRead(n['id']?.toString() ?? '');
      },
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isRead ? Colors.grey.shade100 : colors.first.withOpacity(0.3),
            width: isRead ? 1 : 1.5,
          ),
          boxShadow: [
            BoxShadow(
              color: isRead ? Colors.black.withOpacity(0.04) : colors.first.withOpacity(0.12),
              blurRadius: isRead ? 10 : 16,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Icon
              Container(
                width: 50, height: 50,
                decoration: BoxDecoration(
                  gradient: LinearGradient(colors: colors, begin: Alignment.topLeft, end: Alignment.bottomRight),
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [BoxShadow(color: colors.first.withOpacity(0.3), blurRadius: 10, offset: const Offset(0, 4))],
                ),
                child: Icon(icon, color: Colors.white, size: 24),
              ),
              const SizedBox(width: 14),

              // Content
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            (n['title'] ?? '-').toString(),
                            style: GoogleFonts.poppins(
                              fontWeight: isRead ? FontWeight.w600 : FontWeight.w800,
                              fontSize: 14,
                              color: const Color(0xFF1A1A2E),
                            ),
                          ),
                        ),
                        if (!isRead)
                          Container(
                            width: 8, height: 8,
                            decoration: const BoxDecoration(
                              color: Color(0xFFE63946),
                              shape: BoxShape.circle,
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 5),
                    Text(
                      (n['message'] ?? '').toString(),
                      style: GoogleFonts.poppins(
                          color: Colors.black54, fontSize: 12.5, height: 1.5),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                          decoration: BoxDecoration(
                            color: colors.first.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            cfg['label'] as String,
                            style: GoogleFonts.poppins(
                                fontSize: 10, fontWeight: FontWeight.w700, color: colors.first),
                          ),
                        ),
                        const Spacer(),
                        Icon(Icons.access_time_rounded, size: 11, color: Colors.black26),
                        const SizedBox(width: 3),
                        Text(
                          _formatTime(n['createdAt']),
                          style: GoogleFonts.poppins(fontSize: 11, color: Colors.black38),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
