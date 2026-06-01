import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:rana_market/config/theme_config.dart';
import 'package:rana_market/services/notification_service.dart';

class BuyerBottomNav extends StatelessWidget {
  final int selectedIndex;
  final ValueChanged<int> onSelected;

  const BuyerBottomNav({
    super.key,
    required this.selectedIndex,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      margin: const EdgeInsets.only(left: 20, right: 20, bottom: 20),
      decoration: BoxDecoration(
        color: isDark
            ? const Color(0xFF1A1A2E).withValues(alpha: 0.9)
            : Colors.white.withValues(alpha: 0.8),
        borderRadius: BorderRadius.circular(32),
        boxShadow: [
          BoxShadow(
            color: isDark
                ? Colors.black.withValues(alpha: 0.4)
                : ThemeConfig.brandColor.withValues(alpha: 0.2),
            blurRadius: 30,
            offset: const Offset(0, 10),
          ),
        ],
        border: isDark
            ? Border.all(color: const Color(0xFF2A2A3E), width: 0.5)
            : null,
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(32),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildNavItem(0, Icons.storefront_outlined, Icons.storefront_rounded, 'Beranda'),
                _buildNavItem(1, Icons.receipt_long_outlined, Icons.receipt_long_rounded, 'Pesanan'),
                _buildCenterButton(),
                _buildNavItem(3, Icons.notifications_outlined, Icons.notifications_rounded, 'Inbox', showBadge: true),
                _buildNavItem(4, Icons.person_outline, Icons.person_rounded, 'Profil'),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(int index, IconData iconOff, IconData iconOn, String label, {bool showBadge = false}) {
    final isSelected = selectedIndex == index;
    Widget iconWidget = Icon(
      isSelected ? iconOn : iconOff,
      color: isSelected ? ThemeConfig.brandColor : Colors.grey.shade400,
      size: 26,
    );

    if (showBadge) {
      iconWidget = ValueListenableBuilder<int>(
        valueListenable: NotificationService.badgeCount,
        builder: (context, count, child) {
          return Badge(
            isLabelVisible: count > 0,
            label: Text('$count'),
            backgroundColor: ThemeConfig.brandColor,
            child: child,
          );
        },
        child: iconWidget,
      );
    }

    return GestureDetector(
      onTap: () => onSelected(index),
      behavior: HitTestBehavior.opaque,
      child: Container(
        width: 50,
        height: 50,
        alignment: Alignment.center,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            iconWidget.animate(target: isSelected ? 1 : 0).scaleXY(end: 1.1, duration: 200.ms, curve: Curves.easeOutBack),
            if (isSelected)
              Container(
                margin: const EdgeInsets.only(top: 4),
                width: 4,
                height: 4,
                decoration: const BoxDecoration(
                  color: ThemeConfig.brandColor,
                  shape: BoxShape.circle,
                ),
              ).animate().scale(duration: 200.ms)
          ],
        ),
      ),
    );
  }

  Widget _buildCenterButton() {
    final isSelected = selectedIndex == 2;
    return GestureDetector(
      onTap: () => onSelected(2),
      child: Container(
        width: 56,
        height: 56,
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [ThemeConfig.brandColor, Color(0xFFFFA07A)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: ThemeConfig.brandColor.withValues(alpha: 0.5),
              blurRadius: 15,
              offset: const Offset(0, 5),
            )
          ],
        ),
        child: Icon(
          Icons.auto_awesome,
          color: isSelected ? Colors.white : Colors.white.withValues(alpha: 0.9),
          size: 28,
        ).animate(onPlay: (c) => c.repeat(reverse: true)).scaleXY(begin: 1.0, end: 1.1, duration: 1.seconds),
      ),
    ).animate().slideY(begin: -0.2).scale(duration: 400.ms, curve: Curves.easeOutBack);
  }
}
