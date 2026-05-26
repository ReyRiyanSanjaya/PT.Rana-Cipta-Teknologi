import 'dart:async';
import 'package:flutter/material.dart';
import 'package:sensors_plus/sensors_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:vibration/vibration.dart';

class TelematicsService {
  static final TelematicsService _instance = TelematicsService._internal();
  factory TelematicsService() => _instance;
  TelematicsService._internal();

  StreamSubscription<UserAccelerometerEvent>? _accelerometerSubscription;
  Timer? _fatigueTimer;
  DateTime? _onlineStartTime;

  // Ambang batas g-force (crash logic sederhana)
  final double crashThreshold = 40.0;

  void startMonitoring(BuildContext context) {
    // 1. Crash Detection
    _accelerometerSubscription = userAccelerometerEventStream().listen((UserAccelerometerEvent event) {
      final double gForce = event.x.abs() + event.y.abs() + event.z.abs();
      if (gForce > crashThreshold) {
        _triggerCrashAlert(context);
      }
    });

    // 2. Fatigue Warning (Cek setiap 30 menit)
    _onlineStartTime = DateTime.now();
    _fatigueTimer = Timer.periodic(const Duration(minutes: 30), (timer) {
      _checkFatigue(context);
    });
  }

  void stopMonitoring() {
    _accelerometerSubscription?.cancel();
    _fatigueTimer?.cancel();
  }

  void _triggerCrashAlert(BuildContext context) async {
    // Hindari trigger berkali-kali
    _accelerometerSubscription?.pause();
    
    if (await Vibration.hasVibrator() ?? false) {
      Vibration.vibrate(pattern: [500, 1000, 500, 1000]);
    }

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: Colors.red, size: 32),
            SizedBox(width: 8),
            Text('Deteksi Benturan Tinggi'),
          ],
        ),
        content: const Text(
            'Kami mendeteksi guncangan yang tidak wajar pada perangkat Anda. Apakah Anda mengalami kecelakaan dan butuh bantuan darurat?'),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _accelerometerSubscription?.resume();
            },
            child: const Text('SAYA BAIK-BAIK SAJA', style: TextStyle(color: Colors.green)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () {
              Navigator.pop(context);
              // Panggil fungsi SOS darurat
              _accelerometerSubscription?.resume();
            },
            child: const Text('PANGGIL BANTUAN SOS', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _checkFatigue(BuildContext context) async {
    if (_onlineStartTime == null) return;
    
    final diff = DateTime.now().difference(_onlineStartTime!);
    
    // Asumsi 8 jam berturut-turut tanpa offline
    if (diff.inHours >= 8) {
      showDialog(
        context: context,
        builder: (_) => AlertDialog(
          title: const Text('Peringatan Kelelahan 😴'),
          content: const Text(
            'Anda sudah online lebih dari 8 jam secara terus menerus. Demi keselamatan Anda dan penumpang, mohon istirahat sejenak.'
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Mengerti'),
            ),
          ],
        ),
      );
    }
  }
}
