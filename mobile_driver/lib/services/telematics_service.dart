import 'dart:async';
import 'package:flutter/material.dart';
import 'package:sensors_plus/sensors_plus.dart';
import 'package:vibration/vibration.dart';

class TelematicsService {
  static final TelematicsService _instance = TelematicsService._internal();
  factory TelematicsService() => _instance;
  TelematicsService._internal();

  StreamSubscription<UserAccelerometerEvent>? _accelerometerSubscription;
  Timer? _fatigueTimer;
  DateTime? _onlineStartTime;
  bool _crashAlertShowing = false;

  // Tuned threshold for real devices:
  // Normal driving: 10-15 m/s²
  // Hard braking: 15-25 m/s²
  // Crash impact: 30+ m/s²
  // We use 35 to avoid false positives from potholes/speed bumps
  final double crashThreshold = 35.0;

  // Debounce to prevent multiple triggers
  DateTime? _lastCrashAlert;
  static const Duration _crashCooldown = Duration(seconds: 60);

  // Fatigue threshold (hours)
  static const int fatigueHoursThreshold = 8;

  BuildContext? _context;

  void startMonitoring(BuildContext context) {
    _context = context;
    _onlineStartTime = DateTime.now();

    // 1. Crash Detection via accelerometer
    _accelerometerSubscription = userAccelerometerEventStream(
      samplingPeriod: const Duration(milliseconds: 100),
    ).listen((UserAccelerometerEvent event) {
      final double gForce = event.x.abs() + event.y.abs() + event.z.abs();
      if (gForce > crashThreshold) {
        _handlePossibleCrash();
      }
    });

    // 2. Fatigue Warning (check every 30 minutes)
    _fatigueTimer = Timer.periodic(const Duration(minutes: 30), (timer) {
      _checkFatigue();
    });
  }

  void stopMonitoring() {
    _accelerometerSubscription?.cancel();
    _accelerometerSubscription = null;
    _fatigueTimer?.cancel();
    _fatigueTimer = null;
    _onlineStartTime = null;
    _context = null;
  }

  void _handlePossibleCrash() {
    // Debounce: don't trigger again within cooldown period
    if (_lastCrashAlert != null &&
        DateTime.now().difference(_lastCrashAlert!) < _crashCooldown) {
      return;
    }

    if (_crashAlertShowing) return;

    final ctx = _context;
    if (ctx == null) return;

    // Check if context is still valid
    if (!ctx.mounted) return;

    _lastCrashAlert = DateTime.now();
    _triggerCrashAlert(ctx);
  }

  void _triggerCrashAlert(BuildContext context) async {
    _crashAlertShowing = true;

    // Pause accelerometer to avoid re-triggers
    _accelerometerSubscription?.pause();

    // Vibrate pattern for attention
    try {
      final hasVibrator = await Vibration.hasVibrator();
      if (hasVibrator == true) {
        Vibration.vibrate(pattern: [500, 1000, 500, 1000]);
      }
    } catch (_) {}

    if (!context.mounted) {
      _crashAlertShowing = false;
      _accelerometerSubscription?.resume();
      return;
    }

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: Colors.red, size: 32),
            SizedBox(width: 8),
            Expanded(child: Text('Deteksi Benturan', style: TextStyle(fontSize: 18))),
          ],
        ),
        content: const Text(
          'Kami mendeteksi guncangan yang tidak wajar. Apakah Anda mengalami kecelakaan dan butuh bantuan darurat?',
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(dialogContext);
              _crashAlertShowing = false;
              _accelerometerSubscription?.resume();
            },
            child: const Text('SAYA BAIK-BAIK SAJA',
                style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () {
              Navigator.pop(dialogContext);
              _crashAlertShowing = false;
              _accelerometerSubscription?.resume();
              // TODO: Trigger SOS - send location to emergency contacts & support
            },
            child: const Text('PANGGIL BANTUAN SOS',
                style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    // Auto-dismiss after 30 seconds if no response (assume driver is OK)
    Timer(const Duration(seconds: 30), () {
      if (_crashAlertShowing && context.mounted) {
        Navigator.of(context, rootNavigator: true).pop();
        _crashAlertShowing = false;
        _accelerometerSubscription?.resume();
      }
    });
  }

  void _checkFatigue() {
    if (_onlineStartTime == null) return;

    final ctx = _context;
    if (ctx == null || !ctx.mounted) return;

    final diff = DateTime.now().difference(_onlineStartTime!);

    if (diff.inHours >= fatigueHoursThreshold) {
      showDialog(
        context: ctx,
        builder: (dialogContext) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Text('Peringatan Kelelahan 😴'),
          content: Text(
            'Anda sudah online selama ${diff.inHours} jam. '
            'Demi keselamatan Anda dan penumpang, mohon istirahat sejenak.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('Mengerti', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      );
    }
  }
}
