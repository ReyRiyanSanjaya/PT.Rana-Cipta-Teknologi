import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:rana_market/config/api_config.dart';

class MarketApiService {
  static final MarketApiService _instance = MarketApiService._internal();
  factory MarketApiService() => _instance;

  late Dio _dio;

  // Uses ApiConfig for base URL resolution
  final String _baseUrl = ApiConfig.baseUrl;

  MarketApiService._internal() {
    _dio = Dio(BaseOptions(
      baseUrl: _baseUrl,
      connectTimeout: ApiConfig.connectTimeout,
      receiveTimeout: ApiConfig.receiveTimeout,
    ));

    _dio.interceptors
        .add(LogInterceptor(responseBody: true, requestBody: true));
  }

  Dio get dio => _dio;

  String resolveFileUrl(dynamic value) {
    final raw = value?.toString().trim() ?? '';
    if (raw.isEmpty) return '';
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    final base = ApiConfig.serverUrl;
    if (raw.startsWith('/')) return '$base$raw';
    return '$base/$raw';
  }

  bool _isSuccess(dynamic body) {
    if (body is! Map) return false;
    final dynamic success = body['success'];
    if (success is bool) return success;
    final dynamic status = body['status'];
    if (status is String) return status.toLowerCase() == 'success';
    return false;
  }

  String _messageFromBody(dynamic body,
      {String fallback = 'Terjadi kesalahan'}) {
    if (body is Map) {
      final dynamic msg = body['message'];
      if (msg is String && msg.trim().isNotEmpty) return msg;
      final dynamic error = body['error'];
      if (error is String && error.trim().isNotEmpty) return error;
    }
    if (body is String && body.trim().isNotEmpty) return body;
    return fallback;
  }

  Exception _toApiException(Object e, {String fallback = 'Terjadi kesalahan'}) {
    if (e is DioException) {
      final responseData = e.response?.data;
      final msg = _messageFromBody(
        responseData,
        fallback:
            e.message?.trim().isNotEmpty == true ? e.message!.trim() : fallback,
      );
      return Exception(msg);
    }
    return Exception(e.toString());
  }

  Future<List<dynamic>> getProductReviews(
    String productId, {
    int page = 1,
    int limit = 10,
    String sort = 'newest', // or 'rating_desc'
  }) async {
    try {
      final response = await _dio.get(
        '/market/product/$productId/reviews',
        queryParameters: {
          'page': page,
          'limit': limit,
          'sort': sort,
        },
      );
      return response.data['data'] ?? [];
    } catch (e) {
      return [];
    }
  }

  Future<Map<String, dynamic>> addProductReview(String productId,
      {required int rating, required String comment}) async {
    try {
      final response =
          await _dio.post('/market/product/$productId/reviews', data: {
        'rating': rating,
        'comment': comment,
      });
      if (!_isSuccess(response.data)) {
        throw Exception(_messageFromBody(response.data,
            fallback: 'Gagal menambahkan ulasan'));
      }
      return response.data['data'] ?? {};
    } catch (e) {
      throw _toApiException(e, fallback: 'Gagal menambahkan ulasan');
    }
  }

  void setToken(String? token) {
    if (token != null) {
      _dio.options.headers['Authorization'] = 'Bearer $token';
    } else {
      _dio.options.headers.remove('Authorization');
    }
  }

  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final response = await _dio.post('/auth/login',
          data: {'email': email, 'password': password, 'role': 'BUYER'});

      if (_isSuccess(response.data)) {
        return Map<String, dynamic>.from(response.data['data'] ?? {});
      }
      throw Exception(_messageFromBody(response.data, fallback: 'Login gagal'));
    } catch (e) {
      throw _toApiException(e, fallback: 'Login gagal');
    }
  }

  Future<Map<String, dynamic>> register(
      String name, String email, String phone, String password) async {
    try {
      final response = await _dio.post('/auth/register', data: {
        'name': name,
        'email': email,
        'phone': phone,
        'password': password,
        'role': 'BUYER'
      });

      if (_isSuccess(response.data)) {
        return Map<String, dynamic>.from(response.data['data'] ?? {});
      }
      throw Exception(
          _messageFromBody(response.data, fallback: 'Daftar gagal'));
    } catch (e) {
      throw _toApiException(e, fallback: 'Daftar gagal');
    }
  }

  Future<List<dynamic>> searchGlobal({
    String? query,
    String? category,
    String? sort,
    int? limit,
    double? lat,
    double? long,
  }) async {
    try {
      final response = await _dio.get('/market/search', queryParameters: {
        if (query != null && query.isNotEmpty) 'q': query,
        if (category != null && category != 'Semua') 'category': category,
        if (sort != null) 'sort': sort,
        if (limit != null) 'limit': limit,
        if (lat != null) 'lat': lat,
        if (long != null) 'long': long,
      });
      return response.data['data'] as List<dynamic>? ?? [];
    } catch (e) {
      return [];
    }
  }

  Future<bool> toggleFavorite(String phone, String productId) async {
    try {
      final response = await _dio.post('/market/favorites', data: {
        'phone': phone,
        'productId': productId,
      });
      return response.data['data']['isFavorite'] ?? false;
    } catch (e) {
      throw _toApiException(e, fallback: 'Gagal update favorit');
    }
  }

  Future<List<dynamic>> getFavorites(String phone) async {
    try {
      final response = await _dio.get('/market/favorites', queryParameters: {
        'phone': phone,
      });
      return response.data['data'] ?? [];
    } catch (e) {
      return [];
    }
  }

  Future<List<dynamic>> getNearbyStores(double lat, double long,
      {double? radiusKm}) async {
    try {
      final response = await _dio.get(
        '/market/nearby',
        queryParameters: {
          'lat': lat,
          'long': long,
          if (radiusKm != null) 'radius': radiusKm,
        },
      );

      if (_isSuccess(response.data)) return response.data['data'] ?? [];
      throw Exception(_messageFromBody(response.data,
          fallback: 'Gagal memuat toko terdekat'));
    } catch (e) {
      debugPrint('Nearby Error: $e');
      return []; // Return empty on error for fail-soft
    }
  }

  Future<Map<String, dynamic>> getStoreReviews(String storeId,
      {int page = 1, int limit = 10}) async {
    try {
      final response = await _dio.get(
        '/market/store/$storeId/reviews',
        queryParameters: {'page': page, 'limit': limit},
      );
      if (_isSuccess(response.data)) {
        return Map<String, dynamic>.from(response.data['data'] ?? {});
      }
      return {};
    } catch (e) {
      debugPrint('Store Reviews Error: $e');
      return {};
    }
  }

  Future<Map<String, dynamic>> getStoreCatalog(String storeId,
      {String? search}) async {
    try {
      final response = await _dio.get(
        '/market/store/$storeId/catalog',
        queryParameters: {
          if (search != null && search.trim().isNotEmpty) 'search': search
        },
      );
      if (_isSuccess(response.data)) {
        return Map<String, dynamic>.from(response.data['data'] ?? {});
      }
      throw Exception(_messageFromBody(response.data,
          fallback: 'Gagal memuat katalog toko'));
    } catch (e) {
      throw _toApiException(e, fallback: 'Gagal memuat katalog toko');
    }
  }

  Future<Map<String, dynamic>> createOrder(
      {required String storeId,
      required List<Map<String, dynamic>> items,
      required String customerName,
      required String customerPhone,
      required String deliveryAddress,
      required String fulfillmentType,
      double deliveryFee = 0}) async {
    try {
      final response = await _dio.post('/market/order', data: {
        'storeId': storeId,
        'items': items,
        'customerName': customerName,
        'customerPhone': customerPhone,
        'deliveryAddress': deliveryAddress,
        'fulfillmentType': fulfillmentType,
        'deliveryFee': deliveryFee
      });

      if (!_isSuccess(response.data)) {
        throw Exception(
            _messageFromBody(response.data, fallback: 'Gagal membuat pesanan'));
      }
      return Map<String, dynamic>.from(response.data['data'] ?? {});
    } catch (e) {
      throw _toApiException(e, fallback: 'Gagal membuat pesanan');
    }
  }

  Future<Map<String, dynamic>> getPaymentInfo() async {
    try {
      final response = await _dio.get('/market/config/payment');
      if (_isSuccess(response.data)) {
        return Map<String, dynamic>.from(response.data['data'] ?? {});
      }
      throw Exception(_messageFromBody(response.data,
          fallback: 'Gagal memuat konfigurasi pembayaran'));
    } catch (e) {
      throw _toApiException(e, fallback: 'Gagal memuat konfigurasi pembayaran');
    }
  }

  Future<Map<String, dynamic>> confirmPayment(String orderId) async {
    try {
      final response =
          await _dio.post('/market/order/confirm', data: {'orderId': orderId});
      if (!_isSuccess(response.data)) {
        throw Exception(_messageFromBody(response.data,
            fallback: 'Gagal konfirmasi pembayaran'));
      }
      return Map<String, dynamic>.from(response.data['data'] ?? {});
    } catch (e) {
      throw _toApiException(e, fallback: 'Gagal konfirmasi pembayaran');
    }
  }

  Future<List<dynamic>> getNotifications() async {
    try {
      final response = await _dio.get('/system/notifications');
      return response.data['data'] ?? [];
    } catch (e) {
      return [];
    }
  }

  Future<List<dynamic>> getAnnouncements() async {
    try {
      final response = await _dio.get('/system/announcements');
      return response.data['data'] ?? [];
    } catch (e) {
      return [];
    }
  }

  Future<List<dynamic>> getFlashSaleProducts(double lat, double long,
      {String? storeId}) async {
    try {
      final params = <String, dynamic>{};
      if (storeId != null) params['storeId'] = storeId;

      final response =
          await _dio.get('/market/flashsales', queryParameters: params);
      if (!_isSuccess(response.data)) return [];

      final sales = response.data['data'] as List<dynamic>;
      final allProducts = <Map<String, dynamic>>[];

      for (final sale in sales) {
        if (sale is! Map) continue;
        final storeName = sale['store']?['name'] ?? 'Toko';
        final storeAddress = sale['store']?['location'];
        final storeLat = sale['store']?['latitude'];
        final storeLong = sale['store']?['longitude'];
        final storeId = sale['storeId'];
        final endAt = sale['endAt']; // Get endAt from flash sale
        final items = sale['items'] as List<dynamic>? ?? [];

        for (final item in items) {
          if (item is! Map) continue;
          final product = item['product'];
          if (product is! Map) continue;

          final originalPrice = (product['sellingPrice'] as num).toDouble();
          final salePrice = (item['salePrice'] as num).toDouble();

          final map = <String, dynamic>{
            'id': item['productId'], // Use productId as the ID for navigation
            'name': product['name'],
            'imageUrl': product['imageUrl'],
            'originalPrice': originalPrice,
            'sellingPrice': salePrice,
            'discountPercentage': originalPrice > 0
                ? ((originalPrice - salePrice) / originalPrice * 100).round()
                : 0,
            'storeId': storeId,
            'storeName': storeName,
            'storeAddress': storeAddress,
            'storeLat': storeLat,
            'storeLong': storeLong,
            'flashSaleEndAt': endAt, // Add endAt to product map
            // Add other fields needed for ProductDetailScreen if missing
            'description': product['description'] ?? '',
            'stock': item['saleStock'] ?? 0, // Flash sale stock
          };

          allProducts.add(map);
        }
      }

      allProducts.shuffle();
      return allProducts;
    } catch (e) {
      debugPrint('Flash Sale Error: $e');
      return [];
    }
  }

  Future<Map<String, dynamic>> cancelOrder(String orderId) async {
    try {
      final response = await _dio.delete('/market/order/$orderId');
      if (!_isSuccess(response.data)) {
        throw Exception(
            _messageFromBody(response.data, fallback: 'Gagal membatalkan pesanan'));
      }
      return Map<String, dynamic>.from(response.data['data'] ?? {});
    } catch (e) {
      throw _toApiException(e, fallback: 'Gagal membatalkan pesanan');
    }
  }

  Future<bool> checkPurchased(String productId, String phone) async {
    try {
      final response = await _dio.get('/market/order/check-purchased',
          queryParameters: {'productId': productId, 'phone': phone});
      if (_isSuccess(response.data)) {
        return response.data['data']?['hasPurchased'] == true;
      }
      return false;
    } catch (e) {
      debugPrint('CheckPurchased Error: $e');
      return false;
    }
  }

  Future<List<dynamic>> getMyOrders({String? phone}) async {
    try {
      final normalized = phone?.toString().trim();
      if (normalized == null || normalized.isEmpty) return [];
      final response = await _dio
          .get('/market/orders', queryParameters: {'phone': normalized});
      return response.data['data'] ?? [];
    } catch (e) {
      return [];
    }
  }

  Future<List<dynamic>> getRecommendations(String phone, {double? lat, double? long}) async {
    try {
      final response = await _dio.get('/market/product/recommendations', queryParameters: {
        if (phone.isNotEmpty) 'phone': phone,
        if (lat != null) 'lat': lat,
        if (long != null) 'long': long,
      });
      if (_isSuccess(response.data)) {
        return response.data['data'] ?? [];
      }
      return [];
    } catch (e) {
      debugPrint('Recommendations API Error: $e');
      return [];
    }
  }

  Future<Map<String, dynamic>> getAppConfig() async {
    try {
      final response = await _dio.get('/system/config');
      if (_isSuccess(response.data)) {
        return response.data['data'];
      }
      return {};
    } catch (e) {
      debugPrint('Config Error: $e');
      return {};
    }
  }

  // --- Chat Features ---

  Future<Map<String, dynamic>> getStoreChatUser(String storeId) async {
    try {
      final response = await _dio.get('/market/store/$storeId/chat-user');
      if (_isSuccess(response.data)) {
        return Map<String, dynamic>.from(response.data['data'] ?? {});
      }
      throw Exception('Gagal mendapatkan informasi chat toko');
    } catch (e) {
      throw _toApiException(e, fallback: 'Gagal mendapatkan informasi chat toko');
    }
  }

  Future<List<dynamic>> getChatRooms() async {
    try {
      final response = await _dio.get('/chat/rooms');
      return response.data as List<dynamic>? ?? [];
    } catch (e) {
      debugPrint('GetRooms Error: $e');
      return [];
    }
  }

  Future<Map<String, dynamic>> createChatRoom(String otherUserId, String name) async {
    try {
      final response = await _dio.post('/chat/rooms', data: {
        'type': 'private',
        'name': name,
        'memberIds': [otherUserId]
      });
      return Map<String, dynamic>.from(response.data ?? {});
    } catch (e) {
      throw _toApiException(e, fallback: 'Gagal membuat ruang chat');
    }
  }

  Future<List<dynamic>> getChatMessages(String roomId) async {
    try {
      final response = await _dio.get('/chat/rooms/$roomId/messages');
      return response.data as List<dynamic>? ?? [];
    } catch (e) {
      debugPrint('GetMessages Error: $e');
      return [];
    }
  }

  Future<void> sendMessage(String roomId, String content) async {
    try {
      await _dio.post('/chat/rooms/$roomId/messages', data: {'content': content});
    } catch (e) {
      debugPrint('SendMessage Error: $e');
    }
  }

  Future<Map<String, dynamic>> getProduct(String id) async {
    try {
      final response = await _dio.get('/market/product/$id');
      if (_isSuccess(response.data)) {
        return Map<String, dynamic>.from(response.data['data'] ?? {});
      }
      throw Exception('Gagal mendapatkan informasi produk');
    } catch (e) {
      throw _toApiException(e, fallback: 'Gagal mendapatkan informasi produk');
    }
  }

  // ==================== RIDE / SERVICE REQUESTS ====================

  /// Create a ride/send/food service request
  Future<Map<String, dynamic>> createServiceRequest({
    required String type,
    required double originLat,
    required double originLng,
    required String originAddress,
    required double destLat,
    required double destLng,
    required String destAddress,
    required double price,
    String paymentMethod = 'CASH',
    String? notes,
  }) async {
    try {
      final response = await _dio.post('/service-requests', data: {
        'type': type,
        'originLat': originLat,
        'originLng': originLng,
        'originAddress': originAddress,
        'destLat': destLat,
        'destLng': destLng,
        'destAddress': destAddress,
        'price': price,
        'paymentMethod': paymentMethod,
        if (notes != null) 'notes': notes,
      });
      if (_isSuccess(response.data)) {
        return Map<String, dynamic>.from(response.data['data'] ?? {});
      }
      throw Exception(_messageFromBody(response.data, fallback: 'Gagal membuat pesanan'));
    } catch (e) {
      throw _toApiException(e, fallback: 'Gagal membuat pesanan ride');
    }
  }

  /// Get service request status (with driver info)
  Future<Map<String, dynamic>> getServiceRequestStatus(String requestId) async {
    try {
      final response = await _dio.get('/service-requests/$requestId');
      if (_isSuccess(response.data)) {
        return Map<String, dynamic>.from(response.data['data'] ?? {});
      }
      throw Exception(_messageFromBody(response.data, fallback: 'Gagal memuat status'));
    } catch (e) {
      throw _toApiException(e, fallback: 'Gagal memuat status pesanan');
    }
  }

  /// Cancel a service request
  Future<Map<String, dynamic>> cancelServiceRequest(String requestId) async {
    try {
      final response = await _dio.put('/service-requests/$requestId/cancel');
      if (_isSuccess(response.data)) {
        return Map<String, dynamic>.from(response.data['data'] ?? {});
      }
      throw Exception(_messageFromBody(response.data, fallback: 'Gagal membatalkan'));
    } catch (e) {
      throw _toApiException(e, fallback: 'Gagal membatalkan pesanan');
    }
  }

  /// Get ride order history for the current user
  Future<List<dynamic>> getRideHistory() async {
    try {
      final response = await _dio.get('/service-requests/my-rides');
      if (_isSuccess(response.data)) {
        return response.data['data'] ?? [];
      }
      return [];
    } catch (e) {
      debugPrint('Get Ride History Error: $e');
      return [];
    }
  }

  /// Calculate ride price from server
  Future<Map<String, dynamic>> calculateRidePrice({
    required String type,
    required double originLat,
    required double originLng,
    required double destLat,
    required double destLng,
  }) async {
    try {
      final response = await _dio.post('/service-requests/calculate-price', data: {
        'type': type,
        'originLat': originLat,
        'originLng': originLng,
        'destLat': destLat,
        'destLng': destLng,
      });
      if (_isSuccess(response.data)) {
        return Map<String, dynamic>.from(response.data['data'] ?? {});
      }
      return {};
    } catch (e) {
      debugPrint('Calculate Price Error: $e');
      return {};
    }
  }

  /// Rate a driver after trip completion
  Future<void> rateDriver(String requestId, double rating, {String? comment}) async {
    try {
      await _dio.post('/driver/rate/$requestId', data: {
        'rating': rating,
        if (comment != null) 'comment': comment,
      });
    } catch (e) {
      debugPrint('Rate Driver Error: $e');
    }
  }

  /// Give tip to driver
  Future<void> giveTip(String requestId, double amount) async {
    try {
      await _dio.post('/service-requests/$requestId/tip', data: {
        'amount': amount,
      });
    } catch (e) {
      throw _toApiException(e, fallback: 'Gagal mengirim tip');
    }
  }

  /// Get ETA for active trip
  Future<Map<String, dynamic>> getETA(String requestId) async {
    try {
      final response = await _dio.get('/service-requests/$requestId/eta');
      if (_isSuccess(response.data)) {
        return Map<String, dynamic>.from(response.data['data'] ?? {});
      }
      return {};
    } catch (e) {
      return {};
    }
  }

  /// Get or create trip chat room (buyer side)
  Future<Map<String, dynamic>> getTripChatRoom(String requestId) async {
    try {
      final response = await _dio.get('/driver/trip-chat/$requestId');
      if (_isSuccess(response.data)) {
        return Map<String, dynamic>.from(response.data['data'] ?? {});
      }
      return {};
    } catch (e) {
      debugPrint('Get Trip Chat Error: $e');
      return {};
    }
  }

  /// Send chat message
  Future<void> sendChatMessage(String roomId, String content) async {
    try {
      await _dio.post('/chat/rooms/$roomId/messages', data: {'content': content});
    } catch (e) {
      debugPrint('Send Message Error: $e');
    }
  }
}
