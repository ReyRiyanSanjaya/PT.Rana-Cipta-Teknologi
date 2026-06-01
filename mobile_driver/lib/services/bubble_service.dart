import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// Flutter service to control the native floating bubble overlay.
/// The bubble appears when the driver is online and the app is minimized.
class BubbleService {
  static final BubbleService _instance = BubbleService._internal();
  factory BubbleService() => _instance;
  BubbleService._internal();

  static const _channel = MethodChannel('com.rana.driver/bubble');
  bool _isShowing = false;

  bool get isShowing => _isShowing;

  /// Check if the app has overlay permission
  Future<bool> canDrawOverlays() async {
    try {
      final result = await _channel.invokeMethod<bool>('canDrawOverlays');
      return result ?? false;
    } catch (e) {
      debugPrint('[Bubble] canDrawOverlays error: $e');
      return false;
    }
  }

  /// Request overlay permission from the user
  Future<void> requestOverlayPermission() async {
    try {
      await _channel.invokeMethod('requestOverlayPermission');
    } catch (e) {
      debugPrint('[Bubble] requestOverlayPermission error: $e');
    }
  }

  /// Show the floating bubble with a status message
  Future<void> show({String status = 'Online'}) async {
    try {
      final hasPermission = await canDrawOverlays();
      if (!hasPermission) {
        debugPrint('[Bubble] No overlay permission');
        return;
      }

      await _channel.invokeMethod('showBubble', {'status': status});
      _isShowing = true;
    } catch (e) {
      debugPrint('[Bubble] show error: $e');
    }
  }

  /// Hide the floating bubble
  Future<void> hide() async {
    try {
      await _channel.invokeMethod('hideBubble');
      _isShowing = false;
    } catch (e) {
      debugPrint('[Bubble] hide error: $e');
    }
  }

  /// Update the bubble status text
  Future<void> update({required String status}) async {
    try {
      await _channel.invokeMethod('updateBubble', {'status': status});
    } catch (e) {
      debugPrint('[Bubble] update error: $e');
    }
  }
}
