import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';

class SoundService {
  // Use separate players for SFX to allow overlapping and avoid interruption errors
  static Future<void> _playSfx(String assetPath, {double volume = 1.0}) async {
    try {
      final player = AudioPlayer();
      // Dispose player once finished to clean up resources
      player.onPlayerComplete.listen((_) {
        player.dispose();
      });

      await player.play(AssetSource(assetPath),
          volume: volume, mode: PlayerMode.lowLatency);
    } catch (e) {
      // Ignore errors to prevent game disruption
      // debugPrint('Sound Error ($assetPath): $e');
    }
  }

  static Future<void> playBeep() async {
    await _playSfx('sounds/beep.mp3', volume: 0.8);
  }

  static Future<void> playClick() async {
    await _playSfx('sounds/beep.mp3', volume: 0.5);
  }

  static Future<void> playSuccess() async {
    await _playSfx('sounds/success.mp3', volume: 1.0);
  }

  static Future<void> playError() async {
    // Reusing beep for error for now
    await _playSfx('sounds/beep.mp3', volume: 1.0);
  }
}
