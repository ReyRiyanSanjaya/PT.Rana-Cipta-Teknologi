import 'package:dio/dio.dart';
import 'package:http_parser/http_parser.dart';
import 'package:flutter/foundation.dart';
import 'package:rana_merchant/data/local/database_helper.dart';
import 'package:rana_merchant/config/api_config.dart'; // [NEW] Config

class ApiService {
  // Singleton Pattern
  static final ApiService _instance = ApiService._internal();

  factory ApiService() {
    return _instance;
  }

  late final Dio _dio;

  ApiService._internal() {
    _dio = Dio(BaseOptions(
      baseUrl: ApiConfig.baseUrl,
      connectTimeout: ApiConfig.connectTimeout,
      receiveTimeout: ApiConfig.receiveTimeout,
    ));

    if (kDebugMode) {
      _dio.interceptors.add(LogInterceptor(
          request: true,
          requestHeader: false,
          responseHeader: false,
          responseBody: true,
          error: true));
    }
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

  String? _token;
  String? get token => _token; // [NEW] Getter

  /// Convenience getter for auth options (used by screens calling dio directly)
  Options get authOptions =>
      Options(headers: {'Authorization': 'Bearer $_token'});

  void setToken(String token) {
    _token = token;
    _dio.options.headers['Authorization'] =
        'Bearer $token'; // Set global header
  }

  void clearAuth() {
    _token = null;
    try {
      _dio.options.headers.remove('Authorization');
    } catch (_) {}
  }

  List<dynamic> _cachedAnnouncements = const [];
  DateTime? _announcementsCachedAt;
  List<dynamic> _cachedBlogPosts = const [];
  DateTime? _blogCachedAt;
  Map<String, dynamic>? _referralCache;
  DateTime? _referralCachedAt;
  List<dynamic>? _myReferralsCache;
  DateTime? _myReferralsCachedAt;

  String _messageFromApiBody(dynamic body, {required String fallback}) {
    if (body is Map) {
      final msg = body['message'];
      if (msg is String && msg.trim().isNotEmpty) return msg.trim();
    }
    return fallback;
  }

  // --- Auth ---
  Future<void> register({
    required String businessName,
    required String ownerName,
    required String email,
    required String password,
    required String waNumber,
    required String category,
    String? storeImageBase64,
    double? lat,
    double? long,
    String? address,
    String? referralCode,
  }) async {
    try {
      final payload = {
        'businessName': businessName,
        'ownerName': ownerName,
        'email': email,
        'password': password,
        'waNumber': waNumber,
        'category': category,
        'storeImageBase64': storeImageBase64,
        'latitude': lat,
        'longitude': long,
        'address': address,
        'referralCode': referralCode,
      };

      final response = await _dio.post(ApiConfig.authRegister, data: payload);

      if (response.data['status'] != 'success') {
        throw Exception(response.data['message']);
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 429) {
        String retryMsg = 'Terlalu banyak permintaan. Coba lagi nanti.';
        final retryAfter = e.response?.headers.value('retry-after');
        if (retryAfter != null) {
          final secs = int.tryParse(retryAfter);
          if (secs != null && secs > 0) {
            retryMsg = 'Terlalu banyak permintaan. Coba lagi dalam $secs detik.';
          }
        }
        throw Exception(retryMsg);
      }
      final message =
          _messageFromApiBody(e.response?.data, fallback: 'Registrasi gagal');
      throw Exception(message);
    } catch (_) {
      throw Exception('Registrasi gagal');
    }
  }

  Future<dynamic> login(
      {required String phone, required String password}) async {
    try {
      final response = await _dio.post(ApiConfig.authLogin,
          data: {'phone': phone, 'password': password});
      return response.data;
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        throw Exception('Invalid credentials');
      }
      if (e.response?.statusCode == 402) {
        throw Exception('SUBSCRIPTION_EXPIRED'); // Magic string to catch in UI
      }
      rethrow; // Re-throw other DioErrors or network issues
    } catch (e) {
      throw Exception('Login failed: $e');
    }
  }

  Future<Map<String, dynamic>> getProfile() async {
    try {
      final response = await _dio.get(ApiConfig.authMe,
          options: Options(headers: {'Authorization': 'Bearer ${_token}'}));
      if (_isSuccess(response.data)) {
        return response.data['data'];
      }
      throw Exception(response.data['message']);
    } catch (e) {
      throw Exception('Failed to load profile: $e');
    }
  }

  Future<void> updateStoreProfile(
      {required String businessName,
      required String ownerName,
      required String waNumber,
      required String address,
      String? category,
      String? storeImageBase64,
      String? latitude,
      String? longitude}) async {
    try {
      await _dio.put(ApiConfig.authStore,
          data: {
            'businessName': businessName,
            'ownerName': ownerName,
            'waNumber': waNumber,
            'address': address,
            if (category != null) 'category': category,
            'storeImageBase64': storeImageBase64,
            'latitude': latitude,
            'longitude': longitude
          },
          options: Options(headers: {'Authorization': 'Bearer ${_token}'}));
    } catch (e) {
      throw Exception('Failed to update profile: $e');
    }
  }

  Future<void> changePassword(String oldPassword, String newPassword) async {
    try {
      final response = await _dio.put(ApiConfig.authChangePassword,
          data: {
            'oldPassword': oldPassword,
            'newPassword': newPassword,
          },
          options: Options(headers: {'Authorization': 'Bearer ${_token}'}));

      if (!_isSuccess(response.data)) {
        throw Exception(response.data['message']);
      }
    } catch (e) {
      // Handle specific Dio errors if needed
      if (e is DioException && e.response != null) {
        throw Exception(
            e.response!.data['message'] ?? 'Gagal mengubah password');
      }
      throw Exception('Gagal mengubah password: $e');
    }
  }

  Future<void> createPurchase(
      {required String supplierName,
      required List<Map<String, dynamic>> items}) async {
    try {
      await _dio.post(ApiConfig.purchases,
          data: {'supplierName': supplierName, 'items': items});
    } catch (e) {
      throw Exception('Purchase failed: $e');
    }
  }

  Future<Map<String, dynamic>> getReferralInfo() async {
    final token = _token?.trim();
    if (token == null || token.isEmpty) {
      return {};
    }
    if (_referralCachedAt != null &&
        DateTime.now().difference(_referralCachedAt!) <
            const Duration(minutes: 3)) {
      return Map<String, dynamic>.from(_referralCache ?? const {});
    }
    try {
      final response = await _dio.get(
        ApiConfig.referralMe,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      if (_isSuccess(response.data)) {
        final data =
            Map<String, dynamic>.from(response.data['data'] ?? const {});
        _referralCache = data;
        _referralCachedAt = DateTime.now();
        return data;
      }
      return {};
    } on DioException catch (e) {
      final status = e.response?.statusCode ?? 0;
      if (status == 401 || status == 403) {
        return {};
      }
      if (status >= 500 && status < 600) {
        return {};
      }
      throw Exception(_messageFromApiBody(
          e.response?.data, fallback: 'Gagal memuat data referral'));
    } catch (_) {
      throw Exception('Gagal memuat data referral');
    }
  }

  Future<List<dynamic>> getMyReferrals() async {
    final token = _token?.trim();
    if (token == null || token.isEmpty) {
      return [];
    }
    if (_myReferralsCachedAt != null &&
        DateTime.now().difference(_myReferralsCachedAt!) <
            const Duration(minutes: 2)) {
      return List<dynamic>.from(_myReferralsCache ?? const []);
    }
    try {
      final response = await _dio.get(
        ApiConfig.referralReferrals,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      if (_isSuccess(response.data)) {
        final items =
            List<dynamic>.from(response.data['data']['items'] ?? const []);
        _myReferralsCache = items;
        _myReferralsCachedAt = DateTime.now();
        return items;
      }
      return [];
    } on DioException catch (e) {
      final status = e.response?.statusCode ?? 0;
      if (status == 401 || status == 403) {
        return [];
      }
      if (status >= 500 && status < 600) {
        return [];
      }
      throw Exception(_messageFromApiBody(
          e.response?.data, fallback: 'Gagal memuat daftar referral'));
    } catch (_) {
      return [];
    }
  }

  // --- Product Sync (Downlink) ---
  Future<void> fetchAndSaveProducts() async {
    try {
      // 1. Fetch from Server
      final response = await _dio.get(ApiConfig.products,
          queryParameters: {'limit': 1000}, // [FIX] Ensure we get all products
          options: Options(headers: {'Authorization': 'Bearer ${_token}'}));
      final List<dynamic> serverProducts = response.data['data'];

      final db = DatabaseHelper.instance;

      // 2. Save to SQLite (using reconcile logic)
      await db.syncProducts(serverProducts);

      if (kDebugMode) {
        debugPrint('Products Synced (Downlink): ${serverProducts.length}');
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('Product Sync Failed: $e');
      }
    }
  }

  // --- Product Management ---
  Future<Map<String, dynamic>> createProduct(Map<String, dynamic> data) async {
    // data: {sku, name, sellingPrice, costPrice}
    final response = await _dio.post(ApiConfig.products, data: data);
    return response.data['data'];
  }

  Future<Map<String, dynamic>> updateProduct(
      String id, Map<String, dynamic> data) async {
    final response = await _dio.put('${ApiConfig.products}/$id', data: data);
    return response.data['data'];
  }

  Future<void> applyDiscountToProduct(
    String productId,
    double newPrice,
    String promoType,
    String label,
    int durationDays,
  ) async {
    final response = await _dio.post(
      '${ApiConfig.products}/$productId/apply-discount',
      data: {
        'newPrice': newPrice,
        'promoType': promoType,
        'label': label,
        'durationDays': durationDays,
      },
      options: Options(headers: {'Authorization': 'Bearer ${_token}'}),
    );

    if (response.data['status'] != 'success') {
      throw Exception(response.data['message'] ?? 'Failed to apply discount');
    }
  }

  Future<void> deleteProduct(String id) async {
    await _dio.delete('${ApiConfig.products}/$id');
  }

  // --- Upload Proof ---
  Future<String> uploadTransferProof(String filePath,
      {List<int>? fileBytes, String? fileName}) async {
    try {
      String name = fileName ?? filePath.split('/').last;
      String ext = '';
      if (name.contains('.')) {
        ext = name.split('.').last.toLowerCase();
      }
      String mime = 'jpeg';
      if (ext == 'png') mime = 'png';
      if (ext == 'gif') mime = 'gif';
      if (ext == 'webp') mime = 'webp';
      FormData formData;

      if (fileBytes != null) {
        formData = FormData.fromMap({
          'file': MultipartFile.fromBytes(fileBytes,
              filename: name, contentType: MediaType('image', mime)),
        });
      } else {
        formData = FormData.fromMap({
          'file': await MultipartFile.fromFile(filePath, filename: name),
        });
      }

      final response = await _dio.post('/wholesale/upload-proof',
          data: formData,
          options: Options(
              contentType: 'multipart/form-data',
              headers: {'Authorization': 'Bearer ${_token}'}));

      final body = response.data;
      String? url;
      if (body is Map) {
        final inner = body['data'];
        if (inner is Map && inner['url'] != null) {
          url = inner['url']?.toString();
        } else if (body['url'] != null) {
          url = body['url']?.toString();
        }
      } else if (body is String && body.trim().isNotEmpty) {
        url = body.trim();
      }
      if (url == null || url.isEmpty) {
        throw Exception(
            _messageFromApiBody(body, fallback: 'Upload response invalid'));
      }
      return url;
    } catch (e) {
      throw Exception('Upload failed: $e');
    }
  }

  // --- Flash Sales (Merchant) ---
  Future<Map<String, dynamic>> createFlashSale({
    required String title,
    required DateTime startAt,
    required DateTime endAt,
    List<Map<String, dynamic>> items = const [],
  }) async {
    final response = await _dio.post(
      ApiConfig.flashSales,
      data: {
        'title': title,
        'startAt': startAt.toIso8601String(),
        'endAt': endAt.toIso8601String(),
        'items': items,
      },
      options: Options(headers: {'Authorization': 'Bearer ${_token}'}),
    );
    if (response.data['status'] != 'success') {
      throw Exception(
          response.data['message'] ?? 'Failed to create flash sale');
    }
    return response.data['data'];
  }

  Future<List<dynamic>> getMyFlashSales() async {
    final response = await _dio.get(
      ApiConfig.flashSales,
      options: Options(headers: {'Authorization': 'Bearer ${_token}'}),
    );
    if (!_isSuccess(response.data)) {
      throw Exception(
          response.data['message'] ?? 'Failed to fetch flash sales');
    }
    return response.data['data'] ?? [];
  }

  Future<void> addFlashSaleItem({
    required String saleId,
    required String productId,
    required double salePrice,
    int? maxQtyPerOrder,
    int? saleStock,
  }) async {
    await _dio.post(
      '${ApiConfig.flashSales}/$saleId/items',
      data: {
        'productId': productId,
        'salePrice': salePrice,
        'maxQtyPerOrder': maxQtyPerOrder,
        'saleStock': saleStock,
      },
      options: Options(headers: {'Authorization': 'Bearer ${_token}'}),
    );
  }

  Future<void> deleteFlashSaleItem({
    required String saleId,
    required String itemId,
  }) async {
    await _dio.delete(
      '${ApiConfig.flashSales}/$saleId/items/$itemId',
      options: Options(headers: {'Authorization': 'Bearer ${_token}'}),
    );
  }

  Future<void> cancelFlashSale({required String saleId}) async {
    await _dio.put(
      '/products/flashsales/$saleId/status',
      data: {'action': 'CANCEL'},
      options: Options(headers: {'Authorization': 'Bearer ${_token}'}),
    );
  }

  Future<List<dynamic>> getSubscriptionPackages() async {
    try {
      final response = await _dio.get(ApiConfig.subscriptionsPackages);
      return response.data['data'];
    } catch (e) {
      return []; // Return empty on error
    }
  }

  Future<Map<String, dynamic>> getSubscriptionStatus() async {
    try {
      final response = await _dio.get(ApiConfig.subscriptionsStatus,
          options: Options(headers: {'Authorization': 'Bearer ${_token}'}));
      return response.data['data'];
    } catch (e) {
      throw Exception('Failed to get subscription status');
    }
  }

  Future<void> requestSubscription(String proofUrl,
      {String? packageId, Map<String, dynamic>? selectedBank}) async {
    try {
      final data = <String, dynamic>{
        'proofUrl': proofUrl,
        'packageId': packageId,
      };
      if (selectedBank != null) {
        data['selectedBank'] = selectedBank;
      }
      await _dio.post(ApiConfig.subscriptionsRequest,
          data: data,
          options: Options(headers: {'Authorization': 'Bearer ${_token}'}));
    } catch (e) {
      throw Exception('Failed to request subscription: $e');
    }
  }

  // --- Sync ---
  // --- Wallet & O2O ---
  Future<Map<String, dynamic>> getWalletData() async {
    try {
      final response = await _dio.get(ApiConfig.wallet,
          options: Options(headers: {'Authorization': 'Bearer ${_token}'}));
      if (response.data['status'] == 'success') return response.data['data'];
      throw Exception(response.data['message']);
    } catch (e) {
      throw Exception('Get Wallet Failed: $e');
    }
  }

  Future<void> requestWithdrawal(
      {required double amount,
      required String bankName,
      required String accountNumber}) async {
    try {
      final response = await _dio.post(ApiConfig.walletWithdraw,
          data: {
            'amount': amount,
            'bankName': bankName,
            'accountNumber': accountNumber
          },
          options: Options(headers: {'Authorization': 'Bearer ${_token}'}));
      if (response.data['status'] != 'success')
        throw Exception(response.data['message']);
    } catch (e) {
      throw Exception('Withdraw Request Failed: $e');
    }
  }

  Future<void> topUp(
      {required double amount, required String proofPath}) async {
    try {
      // Convert image to Base64 to avoid Multipart overhead issues on some servers/configs,
      // matching our simple backend implementation.
      // Actually backend accepts JSON with proofImage base64 string.
      // We need dart:io and dart:convert

      // Wait, I cannot import dart:io here easily if not already imported.
      // But this is a data layer, so passed argument `proofPath` implies I need to read it.
      // I will assume the caller passes Base64 string OR I handle file reading here.
      // Let's pass the path and handle reading here.
      // I need to add imports to the top of file.

      // Since replace_file_content is for contiguous blocks, I have to be careful about imports.
      // I will implement this method assuming `proofPath` is passed, but I'll use a hack or just ensure imports are there.
      // Actually `ApiService` uses `dio`. I can use `FormData` if I changed backend to `multer`.
      // But I chose Base64 in backend. So I must send Base64 string.

      // I will implement a helper or just inline it if imports exist.
      // `d:/rana/mobile/lib/data/remote/api_service.dart` does NOT have `dart:convert` or `dart:io`.
      // I will use `MultiReplace` to add imports AND methods.
      // But I am using `ReplaceFileContent` here. I should cancel and use MultiReplace.
      // Wait, I can just accept base64 string from Provider. That keeps ApiService clean of IO.
      // Yes, `topUp({required double amount, required String proofBase64})`.

      await _dio.post(ApiConfig.walletTopup,
          data: {
            'amount': amount,
            'proofImage': proofPath // Expecting Base64 string here
          },
          options: Options(headers: {'Authorization': 'Bearer ${_token}'}));
    } catch (e) {
      throw Exception('Top Up Failed: $e');
    }
  }

  Future<void> transfer(
      {required String targetStoreId,
      required double amount,
      String? note}) async {
    try {
      await _dio.post(ApiConfig.walletTransfer,
          data: {
            'targetStoreId': targetStoreId,
            'amount': amount,
            'note': note
          },
          options: Options(headers: {'Authorization': 'Bearer ${_token}'}));
    } catch (e) {
      if (e is DioException && e.response != null && e.response?.data != null) {
        // Extract message from server response if available
        final msg = e.response!.data['message'] ?? e.message;
        throw Exception(msg);
      }
      throw Exception('Transfer Failed: $e');
    }
  }

  Future<void> payTransaction(
      {required double amount,
      required String description,
      String category = 'PURCHASE'}) async {
    try {
      await _dio.post(ApiConfig.walletTransaction,
          data: {
            'amount': amount,
            'description': description,
            'category': category
          },
          options: Options(headers: {'Authorization': 'Bearer ${_token}'}));
    } catch (e) {
      throw Exception('Payment Failed: $e');
    }
  }

  // --- Transaction Sync ---
  Future<void> uploadTransaction(Map<String, dynamic> payload) async {
    try {
      final response = await _dio.post(
        ApiConfig.transactionsSync,
        data: payload,
        options: Options(headers: {'Authorization': 'Bearer ${_token}'}),
      );

      if (!_isSuccess(response.data)) {
        throw Exception(
            response.data['message'] ?? 'Failed to upload transaction');
      }
    } catch (e) {
      throw Exception('Upload Transaction Failed: $e');
    }
  }

  // [NEW] Upload Expense for Sync
  Future<void> uploadExpense(Map<String, dynamic> payload) async {
    try {
      // POST /reports/expenses
      final response = await _dio.post(
        '/reports/expenses',
        data: payload,
        options: Options(headers: {'Authorization': 'Bearer ${_token}'}),
      );

      if (!_isSuccess(response.data)) {
        throw Exception(response.data['message'] ?? 'Failed to upload expense');
      }
    } catch (e) {
      throw Exception('Upload Expense Failed: $e');
    }
  }

  Future<List<Map<String, dynamic>>> fetchTransactionHistory({
    DateTime? startDate,
    DateTime? endDate,
    int limit = 100,
  }) async {
    try {
      final queryParameters = <String, dynamic>{
        'limit': limit,
      };
      if (startDate != null) {
        queryParameters['startDate'] = startDate.toIso8601String();
      }
      if (endDate != null) {
        queryParameters['endDate'] = endDate.toIso8601String();
      }

      final response = await _dio.get(
        ApiConfig.transactionHistory,
        queryParameters: queryParameters,
        options: Options(headers: {'Authorization': 'Bearer ${_token}'}),
      );

      if (_isSuccess(response.data)) {
        return List<Map<String, dynamic>>.from(response.data['data'] ?? []);
      }
      return [];
    } catch (e) {
      if (kDebugMode) debugPrint('Fetch History Error: $e');
      return [];
    }
  }

  // --- Inventory ---
  Future<void> adjustStock(
      {required String productId,
      required int quantity,
      required String type,
      String? reason}) async {
    try {
      final response = await _dio.post(ApiConfig.inventoryAdjust,
          data: {
            'productId': productId,
            'quantity': quantity,
            'type': type, // IN, OUT, ADJUSTMENT
            'reason': reason
          },
          options: Options(headers: {'Authorization': 'Bearer ${_token}'}));

      if (!_isSuccess(response.data)) {
        throw Exception(response.data['message']);
      }
    } catch (e) {
      throw Exception('Stock Adjustment Failed: $e');
    }
  }

  Future<List<dynamic>> getIncomingMarketOrders() async {
    try {
      final response = await _dio.get(
        ApiConfig.orders,
        options: Options(headers: {'Authorization': 'Bearer ${_token}'}),
      );
      if (_isSuccess(response.data)) {
        return List<dynamic>.from(response.data['data'] ?? const []);
      }
      return [];
    } on DioException catch (e) {
      final status = e.response?.statusCode ?? 0;
      if (status == 401 || status == 403) {
        return [];
      }
      if (status >= 500 && status < 600) {
        return [];
      }
      throw Exception(_messageFromApiBody(
          e.response?.data, fallback: 'Gagal memuat pesanan'));
    } catch (_) {
      return [];
    }
  }

  Future<void> updateMarketOrderStatus(String orderId, String status) async {
    try {
      final response = await _dio.put(
        ApiConfig.ordersStatus,
        data: {'orderId': orderId, 'status': status},
        options: Options(headers: {'Authorization': 'Bearer ${_token}'}),
      );
      if (response.data['status'] != 'success') {
        throw Exception(response.data['message'] ?? 'Update failed');
      }
    } catch (e) {
      throw Exception('Update failed: $e');
    }
  }

  Future<Map<String, dynamic>> scanMarketOrderPickup(String pickupCode) async {
    try {
      final response = await _dio.post(
        ApiConfig.ordersScan,
        data: {'pickupCode': pickupCode},
        options: Options(headers: {'Authorization': 'Bearer ${_token}'}),
      );
      if (!_isSuccess(response.data)) {
        throw Exception(response.data['message'] ?? 'Scan failed');
      }
      final data = response.data['data'];
      if (data is Map) return Map<String, dynamic>.from(data);
      return {};
    } catch (e) {
      throw Exception('Scan failed: $e');
    }
  }

  Future<Map<String, dynamic>> scanQrOrder(String code) async {
    try {
      final response = await _dio.post(ApiConfig.wholesaleOrdersScan,
          data: {'pickupCode': code},
          options: Options(headers: {'Authorization': 'Bearer ${_token}'}));
      if (response.data['status'] != 'success') {
        throw Exception(response.data['message']);
      }
      final data = response.data['data'];
      if (data is Map) return Map<String, dynamic>.from(data);
      return {};
    } catch (e) {
      throw Exception('Scan Order Failed: $e');
    }
  }

  Future<void> syncOfflineTransactions() async {
    final db = DatabaseHelper.instance;
    final pending = await db.getPendingTransactions();

    for (var txn in pending) {
      try {
        final items = await db.getItemsForTransaction(txn['offlineId']);

        final payload = {...txn, 'items': items};

        await _dio.post('/transactions/sync', data: payload);

        // Mark as synced locally
        await db.markSynced(txn['offlineId']);
        if (kDebugMode) debugPrint('Synced txn: ${txn['offlineId']}');
      } catch (e) {
        if (kDebugMode) debugPrint('Failed to sync ${txn['offlineId']}: $e');
        // Keep pending
      }
    }
  }

  // --- Master Sync ---
  Future<void> syncAllData() async {
    // 1. Push Offline Transactions (Upstream)
    await syncOfflineTransactions();

    // 2. Fetch Latest Products & Stock (Downstream)
    await fetchAndSaveProducts();

    // 3. (Optional) Fetch other data like Reports/Wallet if needed
  }

  // --- Features: Broadcasts, Support, Settings ---

  // 1. Announcements
  Future<List<dynamic>> getAnnouncements() async {
    final now = DateTime.now();
    if (_announcementsCachedAt != null &&
        now.difference(_announcementsCachedAt!) < const Duration(minutes: 5)) {
      return List<dynamic>.from(_cachedAnnouncements);
    }
    try {
      final response = await _dio.get('/system/announcements');
      final data = List<dynamic>.from(response.data['data'] ?? const []);
      _cachedAnnouncements = data;
      _announcementsCachedAt = DateTime.now();
      return data;
    } on DioException catch (e) {
      if (e.response?.statusCode == 429) {
        return List<dynamic>.from(_cachedAnnouncements);
      }
      return [];
    } catch (_) {
      return List<dynamic>.from(_cachedAnnouncements);
    }
  }

  // 2. Support Tickets
  Future<List<dynamic>> getTickets() async {
    try {
      final response = await _dio.get('/tickets');
      return response.data['data'];
    } catch (e) {
      throw Exception('Failed to fetch tickets');
    }
  }

  Future<void> createTicket(String subject, String message,
      {String priority = 'NORMAL'}) async {
    try {
      await _dio.post('/tickets',
          data: {'subject': subject, 'message': message, 'priority': priority});
    } catch (e) {
      if (e is DioException) {
        throw Exception(_messageFromBody(e.response?.data,
            fallback: 'Failed to create ticket'));
      }
      throw Exception('Failed to create ticket: $e');
    }
  }

  Future<dynamic> getTicketDetail(String id) async {
    try {
      final response = await _dio.get('/tickets/$id');
      return response.data['data'];
    } catch (e) {
      throw Exception('Failed to load ticket');
    }
  }

  Future<void> replyTicket(String id, String message) async {
    try {
      await _dio.post('/tickets/$id/reply', data: {'message': message});
    } catch (e) {
      if (e is DioException && e.response != null) {
        throw Exception(e.response!.data['message'] ?? 'Failed to send reply');
      }
      throw Exception('Failed to send reply: $e');
    }
  }

  // 3. System Settings (Bank Info)
  // 3. System Settings (Bank Info & CMS)
  Future<Map<String, String>> getSystemSettings() async {
    try {
      final Map<String, String> settings = {};

      // 1. Fetch CMS Content
      try {
        final cmsRes = await _dio.get('/system/cms-content');
        final Map<String, dynamic> cmsData = cmsRes.data['data'];
        cmsData.forEach((key, value) {
          settings[key] = value.toString();
        });
      } catch (_) {}

      // 2. Fetch Payment Info
      try {
        final payRes = await _dio.get('/system/payment-info');
        final Map<String, dynamic> payData = payRes.data['data'];
        settings['PLATFORM_QRIS_URL'] = payData['qrisUrl'] ?? '';
        settings['PLATFORM_BANK_INFO'] = payData['bankInfo'] ?? '';
      } catch (_) {}

      // 3. Fetch Global Settings (Wholesale, etc.)
      try {
        final settingsRes = await _dio.get('/system/settings');
        final Map<String, dynamic> settingsData = settingsRes.data['data'];
        settingsData.forEach((key, value) {
          settings[key] = value.toString();
        });
      } catch (_) {}

      return settings;
    } catch (e) {
      return {};
    }
  }

  Future<Map<String, dynamic>> getPaymentInfo() async {
    try {
      final response = await _dio.get('/system/payment-info');
      if (_isSuccess(response.data)) {
        final Map<String, dynamic> data =
            Map<String, dynamic>.from(response.data['data'] ?? {});
        return {
          'qrisUrl': data['qrisUrl'],
          'bankInfo': data['bankInfo'],
          'bankAccounts': (data['bankAccounts'] is List)
              ? data['bankAccounts']
              : <dynamic>[],
        };
      }
      throw Exception(_messageFromBody(response.data));
    } catch (e) {
      throw Exception('Failed to load payment info: $e');
    }
  }

  // 4. Kulakan (Wholesale)
  Future<List<dynamic>> getWholesaleProducts(
      {String? category, String? search}) async {
    try {
      final response = await _dio.get('/wholesale/products',
          queryParameters: {'category': category, 'search': search});
      return response.data['data'] ?? [];
    } catch (e) {
      throw Exception('Failed to fetch wholesale products');
    }
  }

  Future<List<dynamic>> getWholesaleCategories() async {
    try {
      final response = await _dio.get('/wholesale/categories');
      return response.data['data'] ?? [];
    } catch (e) {
      return [];
    }
  }

  Future<Map<String, dynamic>> validateCoupon(
      String code, double totalAmount) async {
    try {
      final response = await _dio.post('/wholesale/validate-coupon',
          data: {'code': code, 'totalAmount': totalAmount});
      return response.data['data'];
    } catch (e) {
      if (e is DioException && e.response != null) {
        throw Exception(e.response!.data['message']);
      }
      throw Exception('Failed to validate coupon');
    }
  }

  Future<void> createWholesaleOrder(
      {required String tenantId,
      required List<Map<String, dynamic>> items,
      required String paymentMethod,
      required String shippingAddress,
      required double shippingCost,
      double serviceFee = 0,
      String? couponCode,
      String? proofUrl}) async {
    try {
      await _dio.post('/wholesale/orders', data: {
        'tenantId': tenantId,
        'items': items,
        'paymentMethod': paymentMethod,
        'shippingAddress': shippingAddress,
        'shippingCost': shippingCost,
        'serviceFee': serviceFee,
        'couponCode': couponCode,
        'proofUrl': proofUrl
      });
    } catch (e) {
      throw Exception('Failed to place wholesale order');
    }
  }

  Future<List<dynamic>> getWholesaleBanners() async {
    try {
      final response = await _dio.get('/wholesale/banners');
      return response.data['data'] ?? [];
    } catch (e) {
      return [];
    }
  }

  Future<List<dynamic>> getMyWholesaleOrders(String tenantId) async {
    try {
      final response = await _dio
          .get('/wholesale/orders', queryParameters: {'tenantId': tenantId});
      return response.data['data'] ?? [];
    } catch (e) {
      return []; // Return empty on error
    }
  }

  // 5. App Menus (Dynamic)
  Future<List<dynamic>> fetchAppMenus() async {
    try {
      final response = await _dio.get('/system/app-menus');
      return response.data['data'] ?? [];
    } catch (e) {
      if (kDebugMode) debugPrint('Failed to fetch app menus: $e');
      return [];
    }
  }

  Future<Map<String, dynamic>> fetchMenuMaintenance() async {
    try {
      final response = await _dio.get('/system/app-menus/maintenance');
      return Map<String, dynamic>.from(response.data['data'] ?? {});
    } catch (e) {
      if (kDebugMode) debugPrint('Failed to fetch menu maintenance: $e');
      return {};
    }
  }

  // 6. Notifications (Enterprise)
  Future<List<dynamic>> fetchNotifications() async {
    try {
      final response = await _dio.get('/system/notifications');
      return response.data['data'] ?? [];
    } catch (e) {
      if (kDebugMode) debugPrint('Failed to fetch notifications: $e');
      return [];
    }
  }

  Future<void> markAllNotificationsRead() async {
    try {
      await _dio.patch('/system/notifications/read-all',
          options: Options(headers: {'Authorization': 'Bearer ${_token}'}));
    } catch (e) {
      if (kDebugMode) debugPrint('Failed to mark notifications as read: $e');
    }
  }

  Future<void> markNotificationRead(String id) async {
    try {
      await _dio.patch('/system/notifications/$id/read',
          options: Options(headers: {'Authorization': 'Bearer ${_token}'}));
    } catch (e) {
      if (kDebugMode) debugPrint('Failed to mark notification $id as read: $e');
    }
  }

  // --- Chat Discussion ---
  Future<List<dynamic>> fetchChatRooms() async {
    try {
      final response = await _dio.get(ApiConfig.chatRooms);
      return response.data;
    } catch (e) {
      if (kDebugMode) debugPrint('Failed to fetch chat rooms: $e');
      return [];
    }
  }

  Future<List<dynamic>> fetchChatMessages(String roomId) async {
    try {
      final response = await _dio.get(ApiConfig.chatMessages(roomId));
      return response.data;
    } catch (e) {
      if (kDebugMode) debugPrint('Failed to fetch chat messages: $e');
      return [];
    }
  }

  Future<Map<String, dynamic>> sendChatMessage(String roomId, String content,
      {String? replyToId}) async {
    try {
      final response = await _dio.post(
        ApiConfig.chatMessages(roomId),
        data: {'content': content, 'replyToId': replyToId},
      );
      return response.data;
    } catch (e) {
      if (kDebugMode) debugPrint('Failed to send chat message: $e');
      throw Exception('Gagal mengirim pesan');
    }
  }

  Future<Map<String, dynamic>> sendChatAttachment(
      String roomId, List<int> bytes, String filename,
      {String? mimeType, String? replyToId}) async {
    try {
      final form = FormData.fromMap({
        'replyToId': replyToId,
        'file': MultipartFile.fromBytes(bytes, filename: filename, contentType: mimeType != null ? MediaType.parse(mimeType) : null),
      });
      final response = await _dio.post(ApiConfig.chatMessages(roomId), data: form);
      return response.data;
    } catch (e) {
      if (kDebugMode) debugPrint('Failed to send attachment: $e');
      throw Exception('Gagal mengirim lampiran');
    }
  }

  Future<void> markChatRoomRead(String roomId) async {
    try {
      await _dio.post('/chat/rooms/$roomId/read');
    } catch (e) {
      if (kDebugMode) debugPrint('Failed to mark room $roomId as read: $e');
    }
  }
  Future<List<dynamic>> getBlogPosts() async {
    final now = DateTime.now();
    if (_blogCachedAt != null &&
        now.difference(_blogCachedAt!) < const Duration(minutes: 5)) {
      return List<dynamic>.from(_cachedBlogPosts);
    }
    try {
      final response = await _dio.get('/blog');
      final posts = List<dynamic>.from(response.data['data']['posts'] ?? const []);
      _cachedBlogPosts = posts;
      _blogCachedAt = DateTime.now();
      return posts;
    } on DioException catch (e) {
      if (kDebugMode) debugPrint('Failed to fetch blog posts: $e');
      if (e.response?.statusCode == 429) {
        return List<dynamic>.from(_cachedBlogPosts);
      }
      return [];
    } catch (e) {
      if (kDebugMode) debugPrint('Failed to fetch blog posts: $e');
      return List<dynamic>.from(_cachedBlogPosts);
    }
  }

  // 8. PPOB / Digital Products
  Future<List<dynamic>> getDigitalProducts(String category) async {
    try {
      final response = await _dio.get('/ppob/products',
          queryParameters: {'service': category},
          options: Options(headers: {'Authorization': 'Bearer ${_token}'}));
      return response.data['data'] ?? [];
    } catch (e) {
      if (kDebugMode) debugPrint('PPOB Fetch Failed: $e');
      return [];
    }
  }

  Future<List<dynamic>> getPpobServices() async {
    try {
      final response = await _dio.get('/ppob/services',
          options: Options(headers: {'Authorization': 'Bearer ${_token}'}));
      return response.data['data'] ?? [];
    } catch (e) {
      if (kDebugMode) debugPrint('Failed to fetch PPOB services: $e');
      return [];
    }
  }

  Future<Map<String, dynamic>> checkDigitalBill(String customerId, String type,
      {String? productId, double? amount}) async {
    try {
      final response = await _dio.post('/ppob/inquiry',
          data: {
            'customerId': customerId,
            'type': type,
            if (productId != null) 'productId': productId,
            if (amount != null) 'amount': amount
          },
          options: Options(headers: {'Authorization': 'Bearer ${_token}'}));
      return response.data['data'];
    } catch (e) {
      throw Exception('Inquiry Failed');
    }
  }

  Future<Map<String, dynamic>> purchaseDigitalProduct(
      {String? sku,
      String? productId,
      double? amount,
      required String customerId,
      String? commands,
      String? refId}) async {
    try {
      final resolvedProductId = (productId ?? sku);
      if (resolvedProductId == null || resolvedProductId.isEmpty) {
        throw Exception('Invalid productId');
      }
      final response = await _dio.post('/ppob/transaction',
          data: {
            'productId': resolvedProductId,
            if (amount != null) 'amount': amount,
            'customerId': customerId,
            if (commands != null) 'commands': commands,
            if (refId != null) 'refId': refId
          },
          options: Options(headers: {'Authorization': 'Bearer ${_token}'}));

      if (!_isSuccess(response.data)) throw Exception(response.data['message']);
      return Map<String, dynamic>.from(response.data['data'] ?? {});
    } catch (e) {
      if (e is DioException && e.response?.statusCode == 402) {
        throw Exception('Saldo tidak mencukupi');
      }
      throw Exception('Transaksi Gagal: ${e.toString()}');
    }
  }

  Future<Map<String, dynamic>> checkDigitalStatus(String refId) async {
    try {
      final response = await _dio.get('/ppob/status/$refId',
          options: Options(headers: {'Authorization': 'Bearer ${_token}'}));
      return Map<String, dynamic>.from(response.data['data'] ?? {});
    } catch (e) {
      throw Exception('Cek status gagal');
    }
  }

  // --- Reporting (Hybrid) ---
  Future<Map<String, dynamic>> getDashboardStats(
      {required String date, String? storeId}) async {
    try {
      final response = await _dio.get('/reports/dashboard',
          queryParameters: {'date': date, 'storeId': storeId},
          options: Options(headers: {'Authorization': 'Bearer ${_token}'}));
      if (!_isSuccess(response.data)) throw Exception(response.data['message'] ?? 'Failed to fetch dashboard stats');
      return response.data['data'] ?? {};
    } catch (e) {
      throw Exception('Dashboard fetch error: ${e.toString()}');
    }
  }

  Future<Map<String, dynamic>> getProfitLoss(
      {required String startDate, required String endDate}) async {
    try {
      final response = await _dio.get('/reports/profit-loss',
          queryParameters: {'startDate': startDate, 'endDate': endDate},
          options: Options(headers: {'Authorization': 'Bearer ${_token}'}));
      if (!_isSuccess(response.data)) throw Exception(response.data['message'] ?? 'Failed to fetch P&L');
      return response.data['data'] ?? {};
    } catch (e) {
      throw Exception('P&L fetch error: ${e.toString()}');
    }
  }

  /// Get Detailed Analytics
  /// Returns:
  /// - summary: { revenue, totalExpenses, netProfit, growth: { revenue, expenses, netProfit } }
  /// - hourlyStats: List<{ hour: "HH:00", count, revenue }>
  /// - trend: List<{ date, sales, expenses }>
  /// - topProducts, categorySales, paymentMethods
  /// - lowStock: List<{ product: { name }, quantity }>
  Future<Map<String, dynamic>> getAnalytics(
      {required String startDate,
      required String endDate,
      String? storeId}) async {
    try {
      final response = await _dio.get('/reports/analytics',
          queryParameters: {
            'startDate': startDate,
            'endDate': endDate,
            if (storeId != null) 'storeId': storeId
          },
          options: Options(headers: {'Authorization': 'Bearer ${_token}'}));
      return Map<String, dynamic>.from(response.data['data'] ?? {});
    } catch (e) {
      throw Exception('Failed to fetch analytics');
    }
  }

  Future<Map<String, dynamic>> askMerchantAssistant(String message) async {
    try {
      final response = await _dio.post(
        '/reports/assistant',
        data: {'message': message},
        options: Options(headers: {'Authorization': 'Bearer ${_token}'}),
      );
      return Map<String, dynamic>.from(response.data['data'] ?? {});
    } catch (e) {
      throw Exception('Failed to ask assistant');
    }
  }

  // --- Games & Leaderboard ---
  Future<void> submitGameScore(String gameId, int score) async {
    try {
      await _dio.post(
        ApiConfig.gameScores,
        data: {'gameId': gameId, 'score': score},
        options: Options(headers: {'Authorization': 'Bearer ${_token}'}),
      );
    } catch (e) {
      if (kDebugMode) debugPrint('Failed to submit score: $e');
    }
  }

  Future<List<dynamic>> getLeaderboard(String gameId) async {
    try {
      final response = await _dio.get(
        ApiConfig.gameLeaderboard,
        queryParameters: {'gameId': gameId, 'limit': 10},
        options: Options(headers: {'Authorization': 'Bearer ${_token}'}),
      );
      return response.data['data'] ?? [];
    } catch (e) {
      if (kDebugMode) debugPrint('Failed to fetch leaderboard: $e');
      return [];
    }
  }

  Future<int> getMyHighScore(String gameId) async {
    try {
      final response = await _dio.get(
        '${ApiConfig.gameScores}/me',
        queryParameters: {'gameId': gameId},
        options: Options(headers: {'Authorization': 'Bearer ${_token}'}),
      );
      return response.data['data']['score'] ?? 0;
    } catch (e) {
      return 0;
    }
  }
}
