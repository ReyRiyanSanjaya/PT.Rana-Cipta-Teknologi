import 'package:flutter/material.dart';
import 'package:rana_market/screens/market_home_screen.dart';
import 'package:rana_market/screens/orders_screen.dart';
import 'package:rana_market/screens/notifications_screen.dart';
import 'package:rana_market/screens/profile_screen.dart';
import 'package:rana_market/screens/ai_assistant_screen.dart';
import 'package:rana_market/screens/login_screen.dart';
import 'package:rana_market/providers/auth_provider.dart';
import 'package:provider/provider.dart';
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

  // Tab yang butuh login: 1=Pesanan, 2=AI, 3=Notif
  static const _authRequiredTabs = {1, 2, 3};

  final List<Widget> _pages = [
    const MarketHomeScreen(),    // 0 - Beranda (guest ok)
    const OrdersScreen(),        // 1 - Pesanan (butuh login)
    const AiAssistantScreen(),   // 2 - AI (butuh login)
    const NotificationsScreen(), // 3 - Notif (butuh login)
    const ProfileScreen(),       // 4 - Profil (handle sendiri)
  ];

  @override
  void initState() {
    super.initState();
    _selectedIndex = widget.initialIndex;
  }

  void _onTabSelected(int index, bool isAuthenticated) {
    if (!isAuthenticated && _authRequiredTabs.contains(index)) {
      // Redirect ke login tanpa mengubah tab aktif
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => const LoginScreen()),
      );
      return;
    }
    if (index == 3) {
      NotificationService.badgeCount.value = 0;
    }
    setState(() => _selectedIndex = index);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isAuthenticated =
        Provider.of<AuthProvider>(context).isAuthenticated;

    return Scaffold(
      extendBody: true,
      backgroundColor:
          isDark ? const Color(0xFF0F0F1A) : const Color(0xFFF8F9FA),
      body: IndexedStack(
        index: _selectedIndex,
        children: _pages,
      ),
      bottomNavigationBar: BuyerBottomNav(
        selectedIndex: _selectedIndex,
        onSelected: (index) => _onTabSelected(index, isAuthenticated),
      ),
    );
  }
}
