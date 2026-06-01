import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:rana_sales/main.dart';
import 'package:rana_sales/providers/auth_provider.dart';

void main() {
  testWidgets('App renders without crashing', (WidgetTester tester) async {
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => AuthProvider()),
        ],
        child: const RanaSalesApp(),
      ),
    );

    // Verify the app renders
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
