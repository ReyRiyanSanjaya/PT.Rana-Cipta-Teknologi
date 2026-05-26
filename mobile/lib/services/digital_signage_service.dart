import 'package:flutter/material.dart';

class DigitalSignageService {
  // Mock data for promo images/ads
  // In a real app, these would come from an API or local storage
  List<String> getPromoImages() {
    return [
      'https://images.unsplash.com/photo-1541558869434-2840d30d6060?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80', // Cafe/Coffee
      'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80', // Shopping/Grocery
      'https://images.unsplash.com/photo-1578916171728-46686eac8d58?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80', // Sale/Discount
    ];
  }
  
  List<Map<String, String>> getPromoTexts() {
    return [
      {'title': 'Diskon Spesial Hari Ini!', 'subtitle': 'Beli 2 Gratis 1 Kopi Susu'},
      {'title': 'Produk Baru Tersedia', 'subtitle': 'Coba varian rasa matcha terbaru'},
      {'title': 'Member Lebih Hemat', 'subtitle': 'Daftar member sekarang, kumpulkan poin!'},
    ];
  }
}
