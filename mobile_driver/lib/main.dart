import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mobile_driver/providers/auth_provider.dart';
import 'package:mobile_driver/providers/driver_provider.dart';
import 'package:mobile_driver/providers/notifications_provider.dart';
import 'package:mobile_driver/screens/login_screen.dart';
import 'package:mobile_driver/screens/driver_dashboard_screen.dart';
import 'package:mobile_driver/config/theme_config.dart';

import 'package:mobile_driver/screens/main_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
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

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (context, auth, _) {
        if (auth.isLoading) {
          return const MaterialApp(
            home: Scaffold(
              body: Center(child: CircularProgressIndicator()),
            ),
          );
        }

        return MaterialApp(
          title: 'Rana Driver',
          debugShowCheckedModeBanner: false,
          theme: ThemeConfig.lightTheme,
          home: auth.isAuthenticated 
              ? const MainScreen() 
              : const LoginScreen(),
          routes: {
            '/login': (context) => const LoginScreen(),
            '/main': (context) => const MainScreen(),
          },
        );
      },
    );
  }
}
