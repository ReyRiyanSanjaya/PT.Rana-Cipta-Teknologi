import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:rana_sales/config/api_config.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;

  late final Dio _dio;
  String? _token;

  ApiService._internal() {
    _dio = Dio(BaseOptions(
      baseUrl: ApiConfig.baseUrl,
      connectTimeout: ApiConfig.connectTimeout,
      receiveTimeout: ApiConfig.receiveTimeout,
    ));

    if (kDebugMode) {
      _dio.interceptors.add(LogInterceptor(
        request: true, requestHeader: false,
        responseHeader: false, responseBody: true, error: true,
      ));
    }
  }

  Dio get dio => _dio;
  String? get token => _token;
  Options get authOptions => Options(headers: {'Authorization': 'Bearer $_token'});

  void setToken(String token) {
    _token = token;
    _dio.options.headers['Authorization'] = 'Bearer $token';
  }

  void clearAuth() {
    _token = null;
    _dio.options.headers.remove('Authorization');
  }

  // === AUTH ===
  Future<Map<String, dynamic>> login(String credential, String password) async {
    // Server accepts either 'phone' (for merchant) or 'email' (for distributor team)
    // Detect if credential is email or phone
    final isEmail = credential.contains('@');
    final response = await _dio.post('/auth/login', data: {
      if (isEmail) 'email': credential else 'phone': credential,
      'password': password,
    });
    return response.data;
  }

  // === SFA DASHBOARD ===
  Future<Map<String, dynamic>> getSfaDashboard() async {
    final response = await _dio.get('/distributor/sfa/dashboard', options: authOptions);
    return response.data['data'];
  }

  // === VISITS ===
  Future<List<dynamic>> getVisits({String? status, String? dateFrom, String? dateTo}) async {
    final params = <String, dynamic>{};
    if (status != null) params['status'] = status;
    if (dateFrom != null) params['dateFrom'] = dateFrom;
    if (dateTo != null) params['dateTo'] = dateTo;
    final response = await _dio.get('/distributor/sfa/visits', queryParameters: params, options: authOptions);
    return response.data['data']['visits'] ?? [];
  }

  Future<Map<String, dynamic>> createVisit(Map<String, dynamic> data) async {
    final response = await _dio.post('/distributor/sfa/visits', data: data, options: authOptions);
    return response.data['data'];
  }

  Future<void> checkIn(String visitId, double lat, double lng) async {
    await _dio.put('/distributor/sfa/visits/$visitId/checkin', data: {'latitude': lat, 'longitude': lng}, options: authOptions);
  }

  Future<void> checkOut(String visitId, {String? feedback, bool orderCreated = false, double orderAmount = 0}) async {
    await _dio.put('/distributor/sfa/visits/$visitId/checkout', data: {
      'feedback': feedback ?? '',
      'orderCreated': orderCreated,
      'orderAmount': orderAmount,
    }, options: authOptions);
  }

  Future<void> cancelVisit(String visitId, String reason) async {
    await _dio.put('/distributor/sfa/visits/$visitId/cancel', data: {'reason': reason}, options: authOptions);
  }

  // === TARGETS ===
  Future<Map<String, dynamic>> getTargets() async {
    final response = await _dio.get('/distributor/sfa/targets', options: authOptions);
    return response.data['data'];
  }

  // === LEADERBOARD ===
  Future<List<dynamic>> getLeaderboard() async {
    final response = await _dio.get('/distributor/sfa/leaderboard', options: authOptions);
    return response.data['data'] ?? [];
  }

  // === ROUTE PLANS ===
  Future<List<dynamic>> getRoutePlans() async {
    final response = await _dio.get('/distributor/sfa/route-plans', options: authOptions);
    return response.data['data'] ?? [];
  }

  Future<Map<String, dynamic>> generateRoutePlan({
    String? salesId,
    int visitFrequency = 1,
    int maxVisitsPerDay = 8,
    int saturdayMax = 4,
  }) async {
    final response = await _dio.post('/distributor/sfa/route-plans/generate', data: {
      if (salesId != null) 'salesId': salesId,
      'visitFrequency': visitFrequency,
      'maxVisitsPerDay': maxVisitsPerDay,
      'saturdayMax': saturdayMax,
    }, options: authOptions);
    return response.data['data'];
  }

  Future<List<dynamic>> getWaitlist() async {
    final response = await _dio.get('/distributor/sfa/route-plans/waitlist', options: authOptions);
    return response.data['data'] ?? [];
  }

  // === PRODUCTS ===
  Future<List<dynamic>> getProducts() async {
    final response = await _dio.get('/distributor/products', options: authOptions);
    return response.data['data'] ?? [];
  }

  // === VISIT ORDER ===
  Future<Map<String, dynamic>> createVisitOrder(Map<String, dynamic> data) async {
    final response = await _dio.post('/distributor/sales/visit-order', data: data, options: authOptions);
    return response.data['data'];
  }

  // === MERCHANT PERFORMANCE ===
  Future<Map<String, dynamic>> getMerchantPerformance() async {
    final response = await _dio.get('/distributor/sales/merchant-performance', options: authOptions);
    return response.data['data'];
  }

  // === SALES ANALYTICS ===
  Future<Map<String, dynamic>> getSalesAnalytics({int period = 30}) async {
    final response = await _dio.get('/distributor/sales/analytics', queryParameters: {'period': period}, options: authOptions);
    return response.data['data'];
  }

  // === KPI ===
  Future<Map<String, dynamic>> getKpi() async {
    final response = await _dio.get('/distributor/kpi', options: authOptions);
    return response.data['data'];
  }

  Future<Map<String, dynamic>> getCompanyTarget() async {
    final response = await _dio.get('/distributor/kpi/company-target', options: authOptions);
    return response.data['data'];
  }

  Future<Map<String, dynamic>> generateKpiTargets({
    required double companyRevenueTarget,
    int? companyOrderTarget,
    int? companyVisitTarget,
    int growthPercent = 10,
    String fairnessMode = 'balanced',
  }) async {
    final response = await _dio.post('/distributor/kpi/generate', data: {
      'companyRevenueTarget': companyRevenueTarget,
      if (companyOrderTarget != null) 'companyOrderTarget': companyOrderTarget,
      if (companyVisitTarget != null) 'companyVisitTarget': companyVisitTarget,
      'growthPercent': growthPercent,
      'fairnessMode': fairnessMode,
    }, options: authOptions);
    return response.data['data'];
  }

  Future<void> setCompanyTarget({
    required double companyRevenueTarget,
    int? companyOrderTarget,
    int? companyVisitTarget,
    int growthPercent = 10,
    String? notes,
  }) async {
    await _dio.put('/distributor/kpi/company-target', data: {
      'companyRevenueTarget': companyRevenueTarget,
      if (companyOrderTarget != null) 'companyOrderTarget': companyOrderTarget,
      if (companyVisitTarget != null) 'companyVisitTarget': companyVisitTarget,
      'growthPercent': growthPercent,
      if (notes != null) 'notes': notes,
    }, options: authOptions);
  }

  // === TEAM ===
  Future<Map<String, dynamic>> getMyPermissions() async {
    final response = await _dio.get('/distributor/team/my-permissions', options: authOptions);
    return response.data['data'];
  }

  // === NOTIFICATIONS ===
  Future<List<dynamic>> getNotifications() async {
    final response = await _dio.get('/distributor/notifications', options: authOptions);
    return response.data['data'] ?? [];
  }

  Future<void> markNotificationRead(String id) async {
    await _dio.put('/distributor/notifications/$id/read', options: authOptions);
  }

  Future<void> markAllNotificationsRead() async {
    await _dio.put('/distributor/notifications/read-all', options: authOptions);
  }

  // === ORDERS ===
  Future<Map<String, dynamic>> getAllOrders({String? type, String? status, int page = 1, int limit = 20}) async {
    final params = <String, dynamic>{'page': page, 'limit': limit};
    if (type != null) params['type'] = type;
    if (status != null) params['status'] = status;
    final response = await _dio.get('/distributor/sales/all-orders', queryParameters: params, options: authOptions);
    return response.data['data'];
  }

  Future<Map<String, dynamic>> getOrderDetail(String orderId) async {
    final response = await _dio.get('/distributor/orders/$orderId', options: authOptions);
    return response.data['data'];
  }

  // === RECEIVABLES ===
  Future<Map<String, dynamic>> getReceivables({String? status}) async {
    final params = <String, dynamic>{};
    if (status != null) params['status'] = status;
    final response = await _dio.get('/distributor/receivables', queryParameters: params, options: authOptions);
    return response.data['data'];
  }

  Future<void> markReceivablePaid(String orderId) async {
    await _dio.put('/distributor/receivables/$orderId/pay', data: {'paymentMethod': 'CASH'}, options: authOptions);
  }

  // === CUSTOMERS ===
  Future<List<dynamic>> getCustomers() async {
    final response = await _dio.get('/distributor/customers', options: authOptions);
    return response.data['data'] ?? [];
  }

  // === PROMOTIONS ===
  Future<Map<String, dynamic>> getPromotions({String? status}) async {
    final params = <String, dynamic>{};
    if (status != null) params['status'] = status;
    final response = await _dio.get('/distributor/promotions', queryParameters: params, options: authOptions);
    return response.data['data'];
  }

  Future<List<dynamic>> getActivePromos(String distributorId) async {
    final response = await _dio.get('/distributor/promotions/active/$distributorId');
    return response.data['data'] ?? [];
  }

  Future<Map<String, dynamic>> applyPromo({required String distributorId, required String promoCode, required List<Map<String, dynamic>> items, required double orderTotal}) async {
    final response = await _dio.post('/distributor/promotions/apply', data: {
      'distributorId': distributorId,
      'promoCode': promoCode,
      'items': items,
      'orderTotal': orderTotal,
    }, options: authOptions);
    return response.data['data'];
  }
}
