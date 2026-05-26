import 'package:flutter/services.dart';
import 'package:flutter/material.dart';
import 'package:rana_merchant/screens/order_list_screen.dart';
import 'package:rana_merchant/screens/scan_screen.dart';
import 'package:rana_merchant/screens/pos_screen.dart';
import 'package:rana_merchant/screens/notification_screen.dart';

class OverlayNavigation {
  static const _channel = MethodChannel('rana_merchant/overlay');
  static final OverlayNavigation _instance = OverlayNavigation._internal();
  OverlayNavigation._internal();
  factory OverlayNavigation() => _instance;

  void register(GlobalKey<NavigatorState> navigatorKey) {
    _channel.setMethodCallHandler((call) async {
      if (call.method == 'navigate') {
        final action = call.arguments as String?;
        final nav = navigatorKey.currentState;
        if (nav == null || action == null) return;
        switch (action) {
          case 'orders':
            nav.push(MaterialPageRoute(builder: (_) => const OrderListScreen()));
            break;
          case 'scan':
            nav.push(MaterialPageRoute(builder: (_) => const ScanScreen()));
            break;
          case 'pos':
            nav.push(MaterialPageRoute(builder: (_) => const PosScreen()));
            break;
          case 'notifications':
            nav.push(MaterialPageRoute(builder: (_) => const NotificationScreen()));
            break;
        }
      }
    });
  }
}
