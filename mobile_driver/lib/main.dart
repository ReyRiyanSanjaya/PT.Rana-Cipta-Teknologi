import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:mobile_driver/providers/auth_provider.dart';
import 'package:mobile_driver/providers/driver_provider.dart';
import 'package:mobile_driver/providers/notifications_provider.dart';
import 'package:mobile_driver/screens/login_screen.dart';
import 'package:mobile_driver/screens/main_screen.dart';
import 'package:mobile_driver/config/theme_config.dart';
import 'package:mobile_driver/services/notification_service.dart';
import 'package:mobile_driver/services/push_notification_service.dart';
import 'package:mobile_driver/services/socket_service.dart';
import 'package:mobile_driver/services/background_service.dart';
import 'package:mobile_driver/services/webrtc_service.dart';
import 'package:mobile_driver/screens/voice_call_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Firebase (will fail gracefully if not configured)
  try {
    await Firebase.initializeApp();
    await PushNotificationService().init();
  } catch (e) {
    debugPrint('[Firebase] Not configured or init failed: $e');
  }

  // Initialize local notification service
  await NotificationService().init();

  // Initialize background service (lifecycle observer)
  BackgroundService().init();

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => DriverProvider()),
        ChangeNotifierProvider(create: (_) => NotificationsProvider()),
      ],
      child: const DriverApp(),
    ),
  );
}

class DriverApp extends StatelessWidget {
  const DriverApp({super.key});

  static final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (context, auth, _) {
        if (auth.isLoading) {
          return MaterialApp(
            navigatorKey: navigatorKey,
            debugShowCheckedModeBanner: false,
            theme: ThemeConfig.lightTheme,
            home: const Scaffold(
              body: Center(child: CircularProgressIndicator()),
            ),
          );
        }

        // Initialize socket and load driver data when authenticated
        if (auth.isAuthenticated && auth.token != null) {
          SocketService().init(auth.token!);
          WebRTCService().init();

          // Wire up incoming call handler
          WebRTCService().onIncomingCall = (callerName, orderId) {
            final ctx = navigatorKey.currentContext;
            if (ctx != null) {
              showIncomingCallDialog(ctx, callerName, orderId);
            }
          };

          // Load driver profile after auth
          WidgetsBinding.instance.addPostFrameCallback((_) {
            final driverProv =
                Provider.of<DriverProvider>(context, listen: false);
            if (driverProv.driverProfile == null &&
                !driverProv.isLoadingProfile) {
              driverProv.loadProfile();
            }
            // Load notifications
            Provider.of<NotificationsProvider>(context, listen: false).load();
          });
        }

        return MaterialApp(
          navigatorKey: navigatorKey,
          title: 'Rana Driver',
          debugShowCheckedModeBanner: false,
          theme: ThemeConfig.lightTheme,
          home: auth.isAuthenticated ? const MainScreen() : const LoginScreen(),
          routes: {
            '/login': (context) => const LoginScreen(),
            '/main': (context) => const MainScreen(),
          },
        );
      },
    );
  }
}
