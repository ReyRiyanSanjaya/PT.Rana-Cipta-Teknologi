import 'dart:async';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:flutter/foundation.dart';

class AiVoiceAssistant {
  static final AiVoiceAssistant _instance = AiVoiceAssistant._internal();
  factory AiVoiceAssistant() => _instance;
  AiVoiceAssistant._internal();

  final stt.SpeechToText _speech = stt.SpeechToText();
  bool _isListening = false;
  bool _isInitialized = false;
  bool _isAvailable = false;
  Function(String)? _onCommandReceived;
  Timer? _restartTimer;

  bool get isListening => _isListening;
  bool get isAvailable => _isAvailable;

  Future<bool> initialize() async {
    if (_isInitialized) return _isAvailable;

    try {
      _isAvailable = await _speech.initialize(
        onStatus: (status) {
          debugPrint('[VoiceAssistant] Status: $status');
          // Auto-restart listening when speech recognition stops
          if (status == 'done' || status == 'notListening') {
            _isListening = false;
            // Restart after a short delay if we should still be listening
            if (_onCommandReceived != null) {
              _restartTimer?.cancel();
              _restartTimer = Timer(const Duration(seconds: 2), () {
                if (_onCommandReceived != null) {
                  _startListeningInternal();
                }
              });
            }
          }
        },
        onError: (errorNotification) {
          debugPrint('[VoiceAssistant] Error: ${errorNotification.errorMsg}');
          _isListening = false;
        },
      );
      _isInitialized = true;
      return _isAvailable;
    } catch (e) {
      debugPrint('[VoiceAssistant] Init error: $e');
      _isAvailable = false;
      _isInitialized = true;
      return false;
    }
  }

  void startListening(Function(String) onCommandReceived) async {
    _onCommandReceived = onCommandReceived;

    if (!_isInitialized) {
      final available = await initialize();
      if (!available) {
        debugPrint('[VoiceAssistant] Speech recognition not available on this device');
        return;
      }
    }

    if (!_isAvailable) return;
    _startListeningInternal();
  }

  void _startListeningInternal() {
    if (_isListening) return;
    if (!_isAvailable) return;

    try {
      _isListening = true;
      _speech.listen(
        onResult: (result) {
          if (result.finalResult && result.recognizedWords.isNotEmpty) {
            final words = result.recognizedWords.toLowerCase().trim();
            debugPrint('[VoiceAssistant] Heard: $words');
            _processCommand(words);
          }
        },
        localeId: 'id_ID',
        listenMode: stt.ListenMode.dictation,
        cancelOnError: false,
        partialResults: false,
      );
    } catch (e) {
      debugPrint('[VoiceAssistant] Listen error: $e');
      _isListening = false;
    }
  }

  void stopListening() {
    _onCommandReceived = null;
    _restartTimer?.cancel();
    _restartTimer = null;
    if (_isListening) {
      _speech.stop();
      _isListening = false;
    }
  }

  void _processCommand(String text) {
    if (_onCommandReceived == null) return;

    // Accept order commands
    if (text.contains('terima') || text.contains('ambil') || text.contains('accept')) {
      _onCommandReceived!('ACCEPT_ORDER');
      return;
    }

    // Reject order commands
    if (text.contains('tolak') || text.contains('abaikan') || text.contains('skip')) {
      _onCommandReceived!('REJECT_ORDER');
      return;
    }

    // Navigation commands
    if (text.contains('navigasi') || text.contains('arahkan') || text.contains('maps')) {
      _onCommandReceived!('OPEN_NAVIGATION');
      return;
    }

    // Status update commands
    if (text.contains('sudah sampai') || text.contains('arrived')) {
      _onCommandReceived!('ARRIVED');
      return;
    }

    if (text.contains('mulai perjalanan') || text.contains('jalan')) {
      _onCommandReceived!('START_TRIP');
      return;
    }

    if (text.contains('selesai') || text.contains('done') || text.contains('complete')) {
      _onCommandReceived!('COMPLETE_TRIP');
      return;
    }

    // Communication commands
    if (text.contains('saya di jalan') || text.contains('otw')) {
      _onCommandReceived!('SEND_MESSAGE_OTW');
      return;
    }

    if (text.contains('offline') || text.contains('istirahat')) {
      _onCommandReceived!('GO_OFFLINE');
      return;
    }
  }
}
