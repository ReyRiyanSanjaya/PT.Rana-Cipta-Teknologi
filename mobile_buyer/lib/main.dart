import 'package:flutter/material.dart';
import 'package:rana_market/config/theme_config.dart';
import 'package:rana_market/screens/main_screen.dart';
import 'package:rana_market/services/notification_service.dart';

import 'package:provider/provider.dart';
import 'package:rana_market/providers/market_cart_provider.dart';
import 'package:rana_market/providers/orders_provider.dart';
import 'package:rana_market/providers/auth_provider.dart';
import 'package:rana_market/providers/favorites_provider.dart';
import 'package:rana_market/providers/search_history_provider.dart';
import 'package:rana_market/providers/reviews_provider.dart';
import 'package:rana_market/providers/notifications_provider.dart';
import 'package:rana_market/services/socket_service.dart';
import 'package:rana_market/providers/chat_provider.dart';
import 'package:rana_market/providers/service_provider.dart';
import 'package:rana_market/services/cache_service.dart';
import 'package:rana_market/services/webrtc_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await NotificationService().init();
  await CacheService.init();
  runApp(const RanaMarketApp());
}

class RanaMarketApp extends StatelessWidget {
  const RanaMarketApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => MarketCartProvider()),
        ChangeNotifierProvider(create: (_) => OrdersProvider()),
        ChangeNotifierProvider(create: (_) => ServiceProvider()),
        ChangeNotifierProvider(create: (_) => FavoritesProvider()),
        ChangeNotifierProvider(create: (_) => SearchHistoryProvider()),
        ChangeNotifierProvider(create: (_) => ReviewsProvider()),
        ChangeNotifierProvider(create: (_) => NotificationsProvider()),
        ChangeNotifierProvider(create: (_) => SocketService()),
        ChangeNotifierProxyProvider<SocketService, ChatProvider>(
          create: (context) =>
              ChatProvider(Provider.of<SocketService>(context, listen: false)),
          update: (context, socket, chat) => chat ?? ChatProvider(socket),
        ),
      ],
      child: MaterialApp(
        title: 'Rana Market',
        debugShowCheckedModeBanner: false,
        theme: ThemeConfig.lightTheme,
        darkTheme: ThemeConfig.darkTheme,
        themeMode: ThemeMode.system,
        home: Consumer<AuthProvider>(
          builder: (context, auth, _) {
            // Tampilkan loading saat sesi sedang dicek
            if (auth.isLoading) {
              return const Scaffold(
                body: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.storefront_rounded,
                          size: 64, color: ThemeConfig.brandColor),
                      SizedBox(height: 24),
                      CircularProgressIndicator(color: ThemeConfig.brandColor),
                    ],
                  ),
                ),
              );
            }
            // Sudah login → MainScreen dengan socket
            // Belum login → MainScreen tanpa socket (guest mode)
            if (auth.isAuthenticated) {
              return const SocketManager(child: MainScreen());
            }
            return const MainScreen();
          },
        ),
      ),
    );
  }
}

class SocketManager extends StatefulWidget {
  final Widget child;
  const SocketManager({super.key, required this.child});

  @override
  State<SocketManager> createState() => _SocketManagerState();
}

class _SocketManagerState extends State<SocketManager> {
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final auth = Provider.of<AuthProvider>(context);
    final socket = Provider.of<SocketService>(context, listen: false);

    if (auth.isAuthenticated && auth.token != null) {
      if (!socket.isConnected) {
        socket.init(auth.token!);
        // Initialize WebRTC for receiving driver calls
        BuyerWebRTCService().init(socket);
        BuyerWebRTCService().onIncomingCall = (callerName, orderId) {
          _showIncomingCallDialog(callerName, orderId, socket);
        };
      }
    } else {
      if (socket.isConnected) {
        socket.disconnect();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return widget.child;
  }

  void _showIncomingCallDialog(String callerName, String orderId, SocketService socket) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 16),
            Container(
              width: 80, height: 80,
              decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.green.withOpacity(0.1)),
              child: const Icon(Icons.call_rounded, color: Colors.green, size: 40),
            ),
            const SizedBox(height: 16),
            const Text('Panggilan Masuk', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text(callerName, style: TextStyle(color: Colors.grey.shade600, fontSize: 16)),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                GestureDetector(
                  onTap: () {
                    BuyerWebRTCService().rejectCall(socket);
                    Navigator.pop(ctx);
                  },
                  child: Container(
                    width: 56, height: 56,
                    decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                    child: const Icon(Icons.call_end_rounded, color: Colors.white),
                  ),
                ),
                GestureDetector(
                  onTap: () {
                    Navigator.pop(ctx);
                    BuyerWebRTCService().answerCall(socket);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Panggilan terhubung'), backgroundColor: Colors.green),
                    );
                  },
                  child: Container(
                    width: 56, height: 56,
                    decoration: const BoxDecoration(color: Colors.green, shape: BoxShape.circle),
                    child: const Icon(Icons.call_rounded, color: Colors.white),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
