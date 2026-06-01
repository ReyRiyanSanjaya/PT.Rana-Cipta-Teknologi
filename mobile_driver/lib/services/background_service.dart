import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mobile_driver/services/socket_service.dart';
import 'package:mobile_driver/services/notification_service.dart';
import 'package:mobile_driver/services/bubble_service.dart';
import 'package:mobile_driver/data/driver_api_service.dart';

/// Manages the driver's online/offline state and background execution.
/// Keeps GPS tracking and socket alive when app is in background.
class BackgroundService with WidgetsBindingObserver {
  static final BackgroundService _instance = BackgroundService._internal();
  factory BackgroundService() => _instance;
  BackgroundService._internal();

  bool _isInitialized = false;
  bool _isDriverOnline = false;
  bool _appInForeground = true;
  Timer? _backgroundLocationTimer;
  Timer? _keepAliveTimer;

  // Persistent notification for foreground service simulation
  static const int _ongoingNotifId = 9999;

  bool get isDriverOnline => _isDriverOnline;
  bool get appInForeground => _appInForeground;

  /// Initialize the background service - call once from main.dart
  void init() {
    if (_isInitialized) return;
    WidgetsBinding.instance.addObserver(this);
    _isInitialized = true;
    _loadOnlineState();
  }

  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _stopBackgroundTracking();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    switch (state) {
      case AppLifecycleState.resumed:
        _appInForeground = true;
        debugPrint('[Background] App RESUMED');
        _onAppResumed();
        break;
      case AppLifecycleState.paused:
        _appInForeground = false;
        debugPrint('[Background] App PAUSED (background)');
        _onAppPaused();
        break;
      case AppLifecycleState.inactive:
        debugPrint('[Background] App INACTIVE');
        break;
      case AppLifecycleState.detached:
        debugPrint('[Background] App DETACHED');
        _onAppPaused();
        break;
      default:
        break;
    }
  }

  /// Called when driver goes online
  void setDriverOnline(bool online) {
    _isDriverOnline = online;
    if (online) {
      _showOngoingNotification();
      _startBackgroundTracking();
    } else {
      BubbleService().hide();
      _cancelOngoingNotification();
      _stopBackgroundTracking();
    }
    _saveOnlineState();
  }

  /// When app goes to background while driver is online
  void _onAppPaused() {
    if (_isDriverOnline) {
      // Keep GPS tracking alive in background
      _startBackgroundTracking();
      // Show floating bubble
      BubbleService().show(status: 'Online • Menunggu pesanan');
      // Update the ongoing notification
      _showOngoingNotification(message: 'Anda sedang online. Menunggu pesanan...');
    }
  }

  /// When app comes back to foreground
  void _onAppResumed() {
    // Stop background-specific timers (foreground handles it via DriverProvider)
    _stopBackgroundTracking();
    // Hide floating bubble
    BubbleService().hide();

    if (_isDriverOnline) {
      _showOngoingNotification(message: 'Anda sedang online');
      // Reconnect socket if needed
      _ensureSocketConnected();
    }
  }

  /// Background GPS tracking (less frequent than foreground)
  void _startBackgroundTracking() {
    _backgroundLocationTimer?.cancel();
    _backgroundLocationTimer = Timer.periodic(const Duration(seconds: 30), (timer) async {
      if (!_isDriverOnline) {
        timer.cancel();
        return;
      }

      try {
        final position = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.high,
          timeLimit: const Duration(seconds: 10),
        );

        // Send location via socket
        SocketService().emitLocationUpdate(
          position.latitude,
          position.longitude,
        );

        // Also update via REST
        DriverApiService().updateLocation(position.latitude, position.longitude);
      } catch (e) {
        debugPrint('[Background] Location error: $e');
      }
    });

    // Keep-alive ping to prevent socket disconnect
    _keepAliveTimer?.cancel();
    _keepAliveTimer = Timer.periodic(const Duration(seconds: 60), (timer) {
      if (!_isDriverOnline) {
        timer.cancel();
        return;
      }
      _ensureSocketConnected();
    });
  }

  void _stopBackgroundTracking() {
    _backgroundLocationTimer?.cancel();
    _backgroundLocationTimer = null;
    _keepAliveTimer?.cancel();
    _keepAliveTimer = null;
  }

  /// Ensure socket stays connected
  void _ensureSocketConnected() async {
    if (!SocketService().isConnected) {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token');
      if (token != null) {
        SocketService().init(token);
      }
    }
  }

  /// Show persistent notification while driver is online (simulates foreground service)
  void _showOngoingNotification({String? message}) {
    final plugin = FlutterLocalNotificationsPlugin();

    const androidDetails = AndroidNotificationDetails(
      'driver_online_channel',
      'Status Driver',
      channelDescription: 'Menampilkan status online driver',
      importance: Importance.low,
      priority: Priority.low,
      ongoing: true, // Cannot be swiped away
      autoCancel: false,
      showWhen: false,
      playSound: false,
      enableVibration: false,
      category: AndroidNotificationCategory.service,
    );

    plugin.show(
      _ongoingNotifId,
      'Rana Driver - Online',
      message ?? 'Anda sedang online. Menunggu pesanan...',
      const NotificationDetails(android: androidDetails),
    );
  }

  /// Cancel the ongoing notification when going offline
  void _cancelOngoingNotification() {
    FlutterLocalNotificationsPlugin().cancel(_ongoingNotifId);
  }

  /// Persist online state
  Future<void> _saveOnlineState() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('driver_is_online', _isDriverOnline);
  }

  /// Load online state on startup
  Future<void> _loadOnlineState() async {
    final prefs = await SharedPreferences.getInstance();
    _isDriverOnline = prefs.getBool('driver_is_online') ?? false;
    if (_isDriverOnline) {
      _showOngoingNotification();
      _ensureSocketConnected();
    }
  }
}
