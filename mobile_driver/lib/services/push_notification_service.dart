import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:mobile_driver/services/notification_service.dart';

/// Background message handler (must be top-level function)
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  debugPrint('[FCM Background] ${message.notification?.title}');
}

class PushNotificationService {
  static final PushNotificationService _instance = PushNotificationService._internal();
  factory PushNotificationService() => _instance;
  PushNotificationService._internal();

  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  String? _fcmToken;
  bool _initialized = false;

  String? get fcmToken => _fcmToken;

  /// Initialize FCM - call after Firebase.initializeApp()
  Future<void> init() async {
    if (_initialized) return;

    // Set background handler
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

    // Request permission
    final settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized ||
        settings.authorizationStatus == AuthorizationStatus.provisional) {
      debugPrint('[FCM] Permission granted');

      // Get FCM token
      _fcmToken = await _messaging.getToken();
      debugPrint('[FCM] Token: $_fcmToken');

      // Listen for token refresh
      _messaging.onTokenRefresh.listen((newToken) {
        _fcmToken = newToken;
        debugPrint('[FCM] Token refreshed: $newToken');
        // TODO: Send new token to server
      });

      // Handle foreground messages
      FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

      // Handle notification tap when app is in background
      FirebaseMessaging.onMessageOpenedApp.listen(_handleNotificationTap);

      // Check if app was opened from a notification
      final initialMessage = await _messaging.getInitialMessage();
      if (initialMessage != null) {
        _handleNotificationTap(initialMessage);
      }

      // Subscribe to driver topic for broadcasts
      await _messaging.subscribeToTopic('drivers');
    } else {
      debugPrint('[FCM] Permission denied');
    }

    _initialized = true;
  }

  /// Handle foreground messages - show local notification
  void _handleForegroundMessage(RemoteMessage message) {
    final notification = message.notification;
    if (notification == null) return;

    debugPrint('[FCM Foreground] ${notification.title}: ${notification.body}');

    // Show local notification
    NotificationService().show(
      id: message.hashCode,
      title: notification.title ?? 'Rana Driver',
      body: notification.body ?? '',
      payload: message.data['type'] ?? 'general',
    );
  }

  /// Handle notification tap
  void _handleNotificationTap(RemoteMessage message) {
    debugPrint('[FCM Tap] ${message.data}');
    // Navigate based on notification type
    final type = message.data['type'];
    final id = message.data['id'];

    switch (type) {
      case 'new_order':
        // Could trigger order acceptance flow
        break;
      case 'withdrawal_approved':
        // Navigate to wallet
        break;
      case 'broadcast':
        // Show announcement
        break;
    }
  }

  /// Subscribe to a specific topic
  Future<void> subscribeToTopic(String topic) async {
    await _messaging.subscribeToTopic(topic);
  }

  /// Unsubscribe from a topic
  Future<void> unsubscribeFromTopic(String topic) async {
    await _messaging.unsubscribeFromTopic(topic);
  }
}
