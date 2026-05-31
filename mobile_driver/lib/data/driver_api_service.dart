import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:mobile_driver/config/api_config.dart';

class DriverApiService {
  static final DriverApiService _instance = DriverApiService._internal();
  factory DriverApiService() => _instance;

  late Dio _dio;

  final String _baseUrl = ApiConfig.baseUrl;

  DriverApiService._internal() {
    _dio = Dio(BaseOptions(
      baseUrl: _baseUrl,
      connectTimeout: ApiConfig.connectTimeout,
      receiveTimeout: ApiConfig.receiveTimeout,
    ));

    // Add retry interceptor for network resilience
    _dio.interceptors.add(_RetryInterceptor(_dio));
    _dio.interceptors
        .add(LogInterceptor(responseBody: !ApiConfig.isProduction, requestBody: !ApiConfig.isProduction));
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

  void setToken(String? token) {
    if (token != null) {
      _dio.options.headers['Authorization'] = 'Bearer $token';
    } else {
      _dio.options.headers.remove('Authorization');
    }
  }

  // ==================== AUTH ====================

  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final response = await _dio.post('/auth/login',
          data: {'email': email, 'password': password});

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
        'role': 'DRIVER'
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

  Future<Map<String, dynamic>> registerDriver(Map<String, dynamic> data) async {
    try {
      final Map<String, dynamic> fields = Map.from(data);
      final List<String> fileKeys = ['ktp_image', 'sim_image', 'stnk_image', 'selfie_image'];

      for (var key in fileKeys) {
        fields.remove(key);
      }

      final formData = FormData.fromMap(fields);

      for (var key in fileKeys) {
        final fileData = data[key];
        if (fileData != null) {
          if (kIsWeb) {
            formData.files.add(MapEntry(
              key,
              MultipartFile.fromBytes(fileData as Uint8List,
                  filename: '${key}_${DateTime.now().millisecondsSinceEpoch}.jpg'),
            ));
          } else {
            formData.files.add(MapEntry(
              key,
              await MultipartFile.fromFile(fileData as String),
            ));
          }
        }
      }

      final response = await _dio.post('/auth/register', data: formData);

      if (_isSuccess(response.data)) {
        return Map<String, dynamic>.from(response.data['data'] ?? {});
      }
      throw Exception(
          _messageFromBody(response.data, fallback: 'Pendaftaran driver gagal'));
    } catch (e) {
      throw _toApiException(e, fallback: 'Pendaftaran driver gagal');
    }
  }

  // ==================== DRIVER PROFILE ====================

  Future<Map<String, dynamic>> getDriverProfile() async {
    try {
      final response = await _dio.get('/driver/profile');
      if (_isSuccess(response.data)) {
        return Map<String, dynamic>.from(response.data['data'] ?? {});
      }
      throw Exception(
          _messageFromBody(response.data, fallback: 'Gagal ambil profil'));
    } catch (e) {
      throw _toApiException(e, fallback: 'Gagal ambil profil');
    }
  }

  Future<Map<String, dynamic>> updateDriverProfile(Map<String, dynamic> data) async {
    try {
      final response = await _dio.put('/driver/profile', data: data);
      if (_isSuccess(response.data)) {
        return Map<String, dynamic>.from(response.data['data'] ?? {});
      }
      throw Exception(
          _messageFromBody(response.data, fallback: 'Gagal update profil'));
    } catch (e) {
      throw _toApiException(e, fallback: 'Gagal update profil');
    }
  }

  // ==================== DRIVER STATUS & LOCATION ====================

  Future<Map<String, dynamic>> updateDriverStatus(String status,
      {double? latitude, double? longitude}) async {
    try {
      final response = await _dio.put('/driver/status', data: {
        'status': status,
        if (latitude != null) 'latitude': latitude,
        if (longitude != null) 'longitude': longitude,
      });
      if (_isSuccess(response.data)) {
        return Map<String, dynamic>.from(response.data['data'] ?? {});
      }
      throw Exception(
          _messageFromBody(response.data, fallback: 'Gagal update status'));
    } catch (e) {
      throw _toApiException(e, fallback: 'Gagal update status');
    }
  }

  Future<void> updateLocation(double latitude, double longitude) async {
    try {
      await _dio.put('/driver/location', data: {
        'latitude': latitude,
        'longitude': longitude,
      });
    } catch (e) {
      debugPrint('Update Location Error: $e');
    }
  }

  // ==================== WALLET & EARNINGS ====================

  Future<Map<String, dynamic>> getWallet() async {
    try {
      final response = await _dio.get('/driver/wallet');
      if (_isSuccess(response.data)) {
        return Map<String, dynamic>.from(response.data['data'] ?? {});
      }
      return {'balance': 0, 'transactions': []};
    } catch (e) {
      debugPrint('Get Wallet Error: $e');
      return {'balance': 0, 'transactions': []};
    }
  }

  Future<Map<String, dynamic>> getEarnings({String period = 'week'}) async {
    try {
      final response = await _dio.get('/driver/earnings',
          queryParameters: {'period': period});
      if (_isSuccess(response.data)) {
        return Map<String, dynamic>.from(response.data['data'] ?? {});
      }
      return {'totalEarnings': 0, 'totalTrips': 0, 'dailyEarnings': {}};
    } catch (e) {
      debugPrint('Get Earnings Error: $e');
      return {'totalEarnings': 0, 'totalTrips': 0, 'dailyEarnings': {}};
    }
  }

  // ==================== STATS ====================

  Future<Map<String, dynamic>> getDriverStats() async {
    try {
      final response = await _dio.get('/driver/stats');
      if (_isSuccess(response.data)) {
        return Map<String, dynamic>.from(response.data['data'] ?? {});
      }
      return {};
    } catch (e) {
      debugPrint('Get Stats Error: $e');
      return {};
    }
  }

  // ==================== TRIPS ====================

  Future<Map<String, dynamic>> getTripHistory({int page = 1, int limit = 20}) async {
    try {
      final response = await _dio.get('/driver/trips',
          queryParameters: {'page': page, 'limit': limit});
      if (_isSuccess(response.data)) {
        return Map<String, dynamic>.from(response.data['data'] ?? {});
      }
      return {'trips': [], 'pagination': {}};
    } catch (e) {
      debugPrint('Get Trip History Error: $e');
      return {'trips': [], 'pagination': {}};
    }
  }

  Future<Map<String, dynamic>?> getActiveTrip() async {
    try {
      final response = await _dio.get('/driver/active-trip');
      if (_isSuccess(response.data)) {
        final data = response.data['data'];
        if (data == null) return null;
        return Map<String, dynamic>.from(data);
      }
      return null;
    } catch (e) {
      debugPrint('Get Active Trip Error: $e');
      return null;
    }
  }

  Future<List<dynamic>> getAvailableRequests(
      {double? latitude, double? longitude}) async {
    try {
      final response = await _dio.get('/driver/available-requests',
          queryParameters: {
            if (latitude != null) 'latitude': latitude,
            if (longitude != null) 'longitude': longitude,
          });
      if (_isSuccess(response.data)) {
        return response.data['data'] ?? [];
      }
      return [];
    } catch (e) {
      debugPrint('Get Available Requests Error: $e');
      return [];
    }
  }

  Future<Map<String, dynamic>> acceptRequest(String requestId) async {
    try {
      final response = await _dio.post('/driver/accept/$requestId');
      if (_isSuccess(response.data)) {
        return Map<String, dynamic>.from(response.data['data'] ?? {});
      }
      throw Exception(
          _messageFromBody(response.data, fallback: 'Gagal menerima pesanan'));
    } catch (e) {
      throw _toApiException(e, fallback: 'Gagal menerima pesanan');
    }
  }

  Future<Map<String, dynamic>> updateTripStatus(
      String requestId, String status) async {
    try {
      final response = await _dio
          .put('/driver/trip/$requestId/status', data: {'status': status});
      if (_isSuccess(response.data)) {
        return Map<String, dynamic>.from(response.data['data'] ?? {});
      }
      throw Exception(
          _messageFromBody(response.data, fallback: 'Gagal update status trip'));
    } catch (e) {
      throw _toApiException(e, fallback: 'Gagal update status trip');
    }
  }

  // ==================== NOTIFICATIONS ====================

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

  // ==================== WALLET TRANSACTIONS ====================

  Future<Map<String, dynamic>> getWalletTransactions({int page = 1, int limit = 20}) async {
    try {
      final response = await _dio.get('/driver/wallet/transactions',
          queryParameters: {'page': page, 'limit': limit});
      if (_isSuccess(response.data)) {
        return Map<String, dynamic>.from(response.data['data'] ?? {});
      }
      return {'balance': 0, 'transactions': [], 'pagination': {}};
    } catch (e) {
      debugPrint('Get Wallet Transactions Error: $e');
      return {'balance': 0, 'transactions': [], 'pagination': {}};
    }
  }

  Future<Map<String, dynamic>> requestWithdrawal({
    required double amount,
    required String bankName,
    required String accountNumber,
    String? accountHolder,
  }) async {
    try {
      final response = await _dio.post('/driver/wallet/withdraw', data: {
        'amount': amount,
        'bankName': bankName,
        'accountNumber': accountNumber,
        if (accountHolder != null) 'accountHolder': accountHolder,
      });
      if (_isSuccess(response.data)) {
        return Map<String, dynamic>.from(response.data['data'] ?? {});
      }
      throw Exception(
          _messageFromBody(response.data, fallback: 'Gagal mengajukan penarikan'));
    } catch (e) {
      throw _toApiException(e, fallback: 'Gagal mengajukan penarikan');
    }
  }

  Future<List<dynamic>> getWithdrawalHistory() async {
    try {
      final response = await _dio.get('/driver/wallet/withdrawals');
      if (_isSuccess(response.data)) {
        return response.data['data'] ?? [];
      }
      return [];
    } catch (e) {
      debugPrint('Get Withdrawals Error: $e');
      return [];
    }
  }

  // ==================== LEADERBOARD & COMMUNITY ====================

  Future<List<dynamic>> getHotspots() async {
    try {
      final response = await _dio.get('/driver/hotspots');
      if (_isSuccess(response.data)) {
        return response.data['data'] ?? [];
      }
      return [];
    } catch (e) {
      debugPrint('Get Hotspots Error: $e');
      return [];
    }
  }

  // ==================== TRIP CHAT ====================

  /// Get or create chat room for a trip
  Future<Map<String, dynamic>> getTripChatRoom(String requestId) async {
    try {
      final response = await _dio.get('/driver/trip-chat/$requestId');
      if (_isSuccess(response.data)) {
        return Map<String, dynamic>.from(response.data['data'] ?? {});
      }
      throw Exception(_messageFromBody(response.data, fallback: 'Gagal membuat chat'));
    } catch (e) {
      throw _toApiException(e, fallback: 'Gagal membuat chat');
    }
  }

  /// Get chat messages for a room
  Future<List<dynamic>> getChatMessages(String roomId) async {
    try {
      final response = await _dio.get('/chat/rooms/$roomId/messages');
      if (response.data is List) return response.data;
      return [];
    } catch (e) {
      debugPrint('Get Chat Messages Error: $e');
      return [];
    }
  }

  /// Send a chat message
  Future<void> sendChatMessage(String roomId, String content) async {
    try {
      await _dio.post('/chat/rooms/$roomId/messages', data: {'content': content});
    } catch (e) {
      debugPrint('Send Chat Message Error: $e');
    }
  }

  // ==================== PHOTO PROOF ====================

  /// Upload proof photo for pickup/delivery
  Future<Map<String, dynamic>> uploadProof(String requestId, String filePath, String type) async {
    try {
      final formData = FormData.fromMap({
        'type': type,
        'photo': await MultipartFile.fromFile(filePath, filename: 'proof_${DateTime.now().millisecondsSinceEpoch}.jpg'),
      });
      final response = await _dio.post('/driver/proof/$requestId', data: formData);
      if (_isSuccess(response.data)) {
        return Map<String, dynamic>.from(response.data['data'] ?? {});
      }
      throw Exception(_messageFromBody(response.data, fallback: 'Gagal upload foto'));
    } catch (e) {
      throw _toApiException(e, fallback: 'Gagal upload foto bukti');
    }
  }

  Future<List<dynamic>> getLeaderboard({String type = 'trips', String period = 'week'}) async {
    try {
      final response = await _dio.get('/driver/leaderboard',
          queryParameters: {'type': type, 'period': period});
      if (_isSuccess(response.data)) {
        return response.data['data'] ?? [];
      }
      return [];
    } catch (e) {
      debugPrint('Get Leaderboard Error: $e');
      return [];
    }
  }

  Future<List<dynamic>> getCommunityPosts({int page = 1}) async {
    try {
      final response = await _dio.get('/driver/community',
          queryParameters: {'page': page, 'limit': 20});
      if (_isSuccess(response.data)) {
        return response.data['data'] ?? [];
      }
      return [];
    } catch (e) {
      debugPrint('Get Community Posts Error: $e');
      return [];
    }
  }

  Future<Map<String, dynamic>> createCommunityPost(String content, {String? title}) async {
    try {
      final response = await _dio.post('/driver/community', data: {
        'content': content,
        if (title != null) 'title': title,
      });
      if (_isSuccess(response.data)) {
        return Map<String, dynamic>.from(response.data['data'] ?? {});
      }
      throw Exception(_messageFromBody(response.data, fallback: 'Gagal membuat post'));
    } catch (e) {
      throw _toApiException(e, fallback: 'Gagal membuat post');
    }
  }
}

/// Retry interceptor for automatic retry on network failures
class _RetryInterceptor extends Interceptor {
  final Dio _dio;
  static const int _maxRetries = 2;
  static const Duration _retryDelay = Duration(seconds: 2);

  _RetryInterceptor(this._dio);

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    // Only retry on connection/timeout errors, not on 4xx client errors
    if (_shouldRetry(err)) {
      final retryCount = (err.requestOptions.extra['retryCount'] as int?) ?? 0;

      if (retryCount < _maxRetries) {
        debugPrint('[Retry] Attempt ${retryCount + 1}/$_maxRetries for ${err.requestOptions.path}');
        await Future.delayed(_retryDelay * (retryCount + 1));

        try {
          err.requestOptions.extra['retryCount'] = retryCount + 1;
          final response = await _dio.fetch(err.requestOptions);
          return handler.resolve(response);
        } catch (e) {
          // Fall through to original error
        }
      }
    }

    return handler.next(err);
  }

  bool _shouldRetry(DioException err) {
    return err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.receiveTimeout ||
        err.type == DioExceptionType.connectionError ||
        (err.type == DioExceptionType.unknown && err.error != null);
  }
}
