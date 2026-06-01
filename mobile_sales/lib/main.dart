import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:rana_sales/config/app_theme.dart';
import 'package:rana_sales/providers/auth_provider.dart';
import 'package:rana_sales/screens/login_screen.dart';
import 'package:rana_sales/screens/main_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  // Set preferred orientations
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()..init()),
      ],
      child: const RanaSalesApp(),
    ),
  );
}

class RanaSalesApp extends StatelessWidget {
  const RanaSalesApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Rana Sales',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      home: Consumer<AuthProvider>(
        builder: (context, auth, _) {
          if (auth.isLoggedIn) return const MainScreen();
          return const LoginScreen();
        },
      ),
    );
  }
}
