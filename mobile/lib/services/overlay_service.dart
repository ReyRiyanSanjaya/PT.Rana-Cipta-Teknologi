import 'dart:io';
import 'package:flutter/services.dart';
import 'package:flutter/foundation.dart';

class OverlayService {
  static const _channel = MethodChannel('rana_merchant/overlay');

  Future<bool> _hasPermission() async {
    if (kIsWeb || !Platform.isAndroid) return false;
    final ok = await _channel.invokeMethod<bool>('hasOverlayPermission');
    return ok ?? false;
  }

  Future<void> requestPermission() async {
    if (kIsWeb || !Platform.isAndroid) return;
    await _channel.invokeMethod('openOverlaySettings');
  }

  Future<void> start() async {
    if (kIsWeb || !Platform.isAndroid) return;
    final ok = await _hasPermission();
    if (!ok) {
      await requestPermission();
      return;
    }
    await _channel.invokeMethod('startOverlay');
  }

  Future<void> stop() async {
    if (kIsWeb || !Platform.isAndroid) return;
    await _channel.invokeMethod('stopOverlay');
  }
}
