import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:flutter/foundation.dart';

class AiVoiceAssistant {
  static final AiVoiceAssistant _instance = AiVoiceAssistant._internal();
  factory AiVoiceAssistant() => _instance;
  AiVoiceAssistant._internal();

  final stt.SpeechToText _speech = stt.SpeechToText();
  bool _isListening = false;
  String _lastWords = '';

  Future<bool> initialize() async {
    try {
      bool available = await _speech.initialize(
        onStatus: (status) => debugPrint('STT Status: $status'),
        onError: (errorNotification) => debugPrint('STT Error: $errorNotification'),
      );
      return available;
    } catch (e) {
      debugPrint("Speech init error: $e");
      return false;
    }
  }

  void startListening(Function(String) onCommandReceived) async {
    if (!_isListening) {
      bool available = await initialize();
      if (available) {
        _isListening = true;
        _speech.listen(
          onResult: (result) {
            _lastWords = result.recognizedWords.toLowerCase();
            // Process command when done
            if (result.finalResult) {
              _processCommand(_lastWords, onCommandReceived);
            }
          },
          localeId: 'id_ID', // Basa Indonesia
        );
      }
    }
  }

  void stopListening() {
    if (_isListening) {
      _speech.stop();
      _isListening = false;
    }
  }

  void _processCommand(String text, Function(String) onCommandReceived) {
    debugPrint("Received Voice Command: $text");
    if (text.contains('terima') || text.contains('ambil')) {
      onCommandReceived('ACCEPT_ORDER');
    } else if (text.contains('tolak') || text.contains('abaikan')) {
      onCommandReceived('REJECT_ORDER');
    } else if (text.contains('saya di jalan') || text.contains('otw')) {
      onCommandReceived('SEND_MESSAGE_OTW');
    }
  }
}
