import 'package:flutter/material.dart';
import 'package:flutter/painting.dart' as painting;
import 'dart:async';
import 'dart:ui';
import 'package:provider/provider.dart';
import 'package:rana_merchant/providers/cart_provider.dart';
import 'package:rana_merchant/providers/auth_provider.dart';
import 'package:rana_merchant/screens/login_screen.dart';
import 'package:rana_merchant/screens/home_screen.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:animations/animations.dart';
import 'package:rana_merchant/services/notification_service.dart';
import 'package:rana_merchant/services/overlay_service.dart';
import 'package:rana_merchant/services/overlay_navigation.dart';

import 'package:flutter/foundation.dart'
    show kIsWeb, defaultTargetPlatform, TargetPlatform;
import 'package:sqflite/sqflite.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:sqflite_common_ffi_web/sqflite_ffi_web.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'package:rana_merchant/providers/wholesale_cart_provider.dart'; // [NEW]
import 'package:rana_merchant/providers/wallet_provider.dart'; // [NEW]
import 'package:rana_merchant/providers/shift_provider.dart';
import 'package:rana_merchant/providers/subscription_provider.dart'; // [FIX] Added missing import
import 'package:rana_merchant/providers/theme_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:rana_merchant/screens/onboarding_merchant_screen.dart';

import 'package:rana_merchant/config/theme_config.dart'; // [NEW] Config
import 'package:rana_merchant/config/app_config.dart'; // [NEW] Config

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  painting.PaintingBinding.instance.imageCache.maximumSize = 100;
  painting.PaintingBinding.instance.imageCache.maximumSizeBytes = 50 << 20;

  if (kIsWeb) {
    databaseFactory = databaseFactoryFfiWeb;
  } else if (defaultTargetPlatform == TargetPlatform.windows ||
      defaultTargetPlatform == TargetPlatform.linux ||
      defaultTargetPlatform == TargetPlatform.macOS) {
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
  }

  await initializeDateFormatting(AppConfig.defaultLanguage, null);
  NotificationService().init();

  FlutterError.onError = (FlutterErrorDetails details) {
    FlutterError.presentError(details);
  };
  PlatformDispatcher.instance.onError = (error, stack) {
    FlutterError.reportError(
        FlutterErrorDetails(exception: error, stack: stack));
    return true;
  };
  runZonedGuarded(() {
    runApp(const RanaApp());
  }, (error, stack) {
    FlutterError.reportError(
        FlutterErrorDetails(exception: error, stack: stack));
  });
}

class RanaApp extends StatelessWidget {
  const RanaApp({super.key});

  static final GlobalKey<NavigatorState> _navigatorKey = GlobalKey<NavigatorState>();

  @override
  Widget build(BuildContext context) {
    OverlayNavigation().register(_navigatorKey);
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => CartProvider()),
        ChangeNotifierProvider(create: (_) => WholesaleCartProvider()),
        ChangeNotifierProvider(create: (_) => WalletProvider()),
        ChangeNotifierProvider(create: (_) => ShiftProvider()),
        ChangeNotifierProvider(create: (_) => SubscriptionProvider()),
        ChangeNotifierProvider(create: (_) => ThemeProvider()..loadFromPrefs()),
      ],
      child: Consumer<ThemeProvider>(
        builder: (context, theme, _) => MaterialApp(
          title: AppConfig.appName,
          debugShowCheckedModeBanner: false,
          theme: ThemeConfig.lightTheme,
          darkTheme: ThemeConfig.darkTheme,
          themeMode: theme.mode,
          navigatorKey: _navigatorKey,
          home: const AuthWrapper(),
        ),
      ),
    );
  }
}

class AuthWrapper extends StatefulWidget {
  const AuthWrapper({super.key});

  @override
  State<AuthWrapper> createState() => _AuthWrapperState();
}

class _AuthWrapperState extends State<AuthWrapper> {
  bool _checked = false;

  @override
  void initState() {
    super.initState();
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      Future.microtask(() => OverlayService().start());
    }
    Future.microtask(() async {
      try {
        await context.read<AuthProvider>().checkAuth();
      } finally {
        if (mounted) setState(() => _checked = true);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    if (!_checked) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }
    if (!auth.isAuthenticated) {
      return const LoginScreen();
    }
    return const HomeScreen();
  }
}
