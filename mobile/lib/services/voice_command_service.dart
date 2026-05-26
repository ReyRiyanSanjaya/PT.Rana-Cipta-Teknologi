import 'package:flutter/material.dart';
import 'package:speech_to_text/speech_to_text.dart';
import 'package:rana_merchant/providers/cart_provider.dart';

class VoiceCommandService {
  final SpeechToText _speech = SpeechToText();
  bool _isAvailable = false;
  
  // Singleton pattern
  static final VoiceCommandService _instance = VoiceCommandService._internal();
  factory VoiceCommandService() => _instance;
  VoiceCommandService._internal();

  Future<bool> initialize() async {
    _isAvailable = await _speech.initialize(
      onError: (val) => debugPrint('Speech Error: $val'),
      onStatus: (val) => debugPrint('Speech Status: $val'),
    );
    return _isAvailable;
  }

  void startListening({
    required Function(String text) onResult,
    required Function(String status) onStatus,
  }) {
    if (!_isAvailable) return;
    
    _speech.listen(
      onResult: (val) => onResult(val.recognizedWords),
      localeId: 'id_ID', // Indonesian
      listenFor: const Duration(seconds: 10),
      pauseFor: const Duration(seconds: 3),
      onSoundLevelChange: (level) {},
      cancelOnError: true,
      partialResults: true,
    );
  }

  void stopListening() {
    _speech.stop();
  }

  // Parse natural language to actions
  // Example: "Tambah Kopi Susu 2" -> addItem('Kopi Susu', 2)
  // Example: "Bayar" -> checkout()
  Map<String, dynamic>? parseCommand(String text, List<Map<String, dynamic>> products) {
    text = text.toLowerCase();
    
    // ACTION: ADD ITEM
    if (text.contains('tambah') || text.contains('pesan') || text.contains('beli') || text.contains('masukkan')) {
      // Remove action words
      String query = text.replaceAll(RegExp(r'(tambah|pesan|beli|tolong|masukkan)'), '').trim();
      
      // Extract quantity (default 1)
      int qty = 1;
      final qtyMatch = RegExp(r'\b(\d+)\b').firstMatch(query);
      if (qtyMatch != null) {
        qty = int.parse(qtyMatch.group(1)!);
        // Remove number from query
        query = query.replaceAll(RegExp(r'\b\d+\b'), '').trim();
      }
      
      // Find best matching product
      // Simple heuristic: contains string
      Map<String, dynamic>? bestMatch;
      int bestScore = 0;
      
      for (final p in products) {
        final name = p['name'].toString().toLowerCase();
        if (query.isNotEmpty && name.contains(query)) {
          // If exact match, priority
          if (name == query) {
            return {
              'action': 'ADD_ITEM',
              'product': p,
              'qty': qty,
            };
          }
          // Basic scoring: longer match is better
          if (name.length > bestScore) {
            bestScore = name.length;
            bestMatch = p;
          }
        }
      }

      if (bestMatch == null) {
        // Try fuzzy search or simpler containment if no match yet
         for (final p in products) {
            final name = p['name'].toString().toLowerCase();
            if (name.contains(query) || query.contains(name)) {
                bestMatch = p;
                break;
            }
         }
      }
      
      if (bestMatch != null) {
        return {
          'action': 'ADD_ITEM',
          'product': bestMatch,
          'qty': qty,
        };
      }
    }
    
    // ACTION: CHECKOUT
    if (text.contains('bayar') || text.contains('selesai') || text.contains('checkout')) {
      return {
        'action': 'CHECKOUT',
      };
    }
    
    // ACTION: CLEAR CART
    if (text.contains('hapus semua') || text.contains('batal') || text.contains('kosongkan')) {
      return {
        'action': 'CLEAR_CART',
      };
    }

    return null;
  }
}
