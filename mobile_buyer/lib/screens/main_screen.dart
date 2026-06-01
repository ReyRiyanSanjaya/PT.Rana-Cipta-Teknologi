import 'package:flutter/material.dart';
import 'package:rana_market/screens/market_home_screen.dart';
import 'package:rana_market/screens/orders_screen.dart';
import 'package:rana_market/screens/notifications_screen.dart';
import 'package:rana_market/screens/profile_screen.dart';
import 'package:rana_market/screens/ai_assistant_screen.dart';
import 'package:rana_market/providers/auth_provider.dart'; // [NEW]
import 'package:provider/provider.dart'; // [NEW]
import 'package:rana_market/services/notification_service.dart';
import 'package:rana_market/widgets/buyer_bottom_nav.dart';

class MainScreen extends StatefulWidget {
  final int initialIndex;

  const MainScreen({super.key, this.initialIndex = 0});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  late int _selectedIndex;

  final List<Widget> _pages = [
    const MarketHomeScreen(),
    const OrdersScreen(),
    const AiAssistantScreen(),
    const NotificationsScreen(),
    const ProfileScreen(),
  ];

  @override
  void initState() {
    super.initState();
    _selectedIndex = widget.initialIndex;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      extendBody: true,
      backgroundColor: isDark ? const Color(0xFF0F0F1A) : const Color(0xFFF8F9FA),
      body: IndexedStack(
        index: _selectedIndex,
        children: _pages,
      ),
      bottomNavigationBar: BuyerBottomNav(
        selectedIndex: _selectedIndex,
        onSelected: (index) {
          if (index == 3) {
            NotificationService.badgeCount.value = 0;
          }
          setState(() => _selectedIndex = index);
        },
      ),
    );
  }
}
