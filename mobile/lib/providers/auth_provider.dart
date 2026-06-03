import 'package:flutter/material.dart'; // [NEW] - Fixed missing import
import 'dart:convert';
import 'package:rana_merchant/data/remote/api_service.dart'; // [NEW] - Fixed missing import
import 'package:shared_preferences/shared_preferences.dart';
import 'package:rana_merchant/data/local/database_helper.dart';
import 'package:rana_merchant/services/printer_service.dart';

class AuthProvider extends ChangeNotifier {
  final ApiService _api = ApiService();

  bool _isAuthenticated = false;
  bool get isAuthenticated => _isAuthenticated;

  Map<String, dynamic>? _currentUser;
  Map<String, dynamic>? get currentUser => _currentUser;

  String? _token;
  String? get token => _token;

  Future<void> login(String phone, String password) async {
    try {
      final response = await _api.login(phone: phone, password: password);
      if (response['status'] == 'success') {
        final data = response['data'];
        _token = data['token'];
        _currentUser = data['user'];

        _api.setToken(_token!);

        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('auth_token', _token!);
        try {
          await prefs.setString('user_data', jsonEncode(data['user']));
        } catch (e) {
          debugPrint('Failed to save user data: $e');
        }
      } else {
        throw Exception(response['message'] ?? 'Login Failed');
      }

      _isAuthenticated = true;
      notifyListeners();

      Future(() async {
        try {
          await DatabaseHelper.instance.clearAllData();
          await _api.syncAllData();
          try {
            final profile = await _api.getProfile();
            _currentUser = profile;
            final tenantId = profile['tenantId']?.toString();
            if (tenantId != null && tenantId.isNotEmpty) {
              await DatabaseHelper.instance.upsertTenant({
                'id': tenantId,
                'businessName': profile['businessName']?.toString(),
                'email': profile['email']?.toString(),
                'phone': (profile['waNumber'] ?? profile['phone'])?.toString(),
                'address': profile['address']?.toString(),
              });
            }
            notifyListeners();
          } catch (e) {
            debugPrint('Profile refresh warning: $e');
          }
          try {
            final prefs = await SharedPreferences.getInstance();
            final autoConnect = prefs.getBool('auto_connect_printer') ?? true;
            if (autoConnect) {
              await PrinterService().autoConnect();
            }
          } catch (e) {
            debugPrint('Auto-connect printer warning: $e');
          }
        } catch (e) {
          debugPrint('Initial Sync Warning: $e');
        }
      });
    } catch (e) {
      rethrow;
    }
  }

  Future<void> loginDemo() async {
    _isAuthenticated = true;
    _token = null;
    _currentUser = {
      'id': 'DEMO',
      'tenantId': 'DEMO_TENANT',
      'businessName': 'Demo Store',
      'ownerName': 'Demo Owner',
      'email': 'demo@rana.local',
      'phone': '081234567890',
      'waNumber': '081234567890',
      'address': 'Jl. Demo No.1, Kota Demo',
      'storeImage': 'https://plus.unsplash.com/premium_photo-1664201890375-f8fa405cdb7d?q=80&w=2070&auto=format&fit=crop',
      'subscriptionStatus': 'PREMIUM',
    };
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('demo_mode', true);
    await prefs.setString('user_data', jsonEncode(_currentUser));
    try {
      await DatabaseHelper.instance.upsertTenant({
        'id': 'DEMO_TENANT',
        'businessName': 'Demo Store',
        'email': 'demo@rana.local',
        'phone': '081234567890',
        'address': 'Jl. Demo No.1, Kota Demo',
      });
      final existing = await DatabaseHelper.instance.getTopSellingProducts(limit: 1);
      if (existing.isEmpty) {
        await DatabaseHelper.instance.insertProduct({
          'id': 'P001',
          'tenantId': 'DEMO_TENANT',
          'sku': 'DEM-COF-001',
          'name': 'Kopi Arabica 250g',
          'sellingPrice': 55000.0,
          'costPrice': 35000.0,
          'trackStock': 1,
          'stock': 50,
          'category': 'Beverage',
          'imageUrl': null,
          'syncStatus': 1,
          'lastUpdated': DateTime.now().millisecondsSinceEpoch
        });
        await DatabaseHelper.instance.insertProduct({
          'id': 'P002',
          'tenantId': 'DEMO_TENANT',
          'sku': 'DEM-TEA-001',
          'name': 'Teh Premium 50pcs',
          'sellingPrice': 35000.0,
          'costPrice': 20000.0,
          'trackStock': 1,
          'stock': 80,
          'category': 'Food',
          'imageUrl': null,
          'syncStatus': 1,
          'lastUpdated': DateTime.now().millisecondsSinceEpoch
        });
      }
    } catch (_) {}
    notifyListeners();
  }

  Future<void> checkAuth() async {
    final prefs = await SharedPreferences.getInstance();
    final isDemo = prefs.getBool('demo_mode') ?? false;

    if (isDemo) {
      // Handle demo mode separately for clarity
      await _activateDemoMode(prefs);
      return;
    }

    final token = prefs.getString('auth_token');
    if (token == null || token.isEmpty) {
      _clearAuthData();
      return;
    }

    _token = token;
    _api.setToken(token);

    // Load user data from cache immediately
    final cachedUserJson = prefs.getString('user_data');
    if (cachedUserJson != null && cachedUserJson.isNotEmpty) {
      try {
        _currentUser = jsonDecode(cachedUserJson);
      } catch (e) {
        debugPrint('Failed to parse cached user_data: $e');
        // If cache is corrupt, force logout
        await logout();
        return;
      }
    }

    _isAuthenticated = true;
    notifyListeners();

    // Trigger background sync without blocking UI
    syncOnLogin();
  }

  Future<void> syncOnLogin() async {
    try {
      // 1. Refresh profile silently
      final profile = await _api.getProfile();
      _currentUser = profile;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('user_data', jsonEncode(profile));
      
      // Use flattened fields from new getProfile response
      final tenantId = (profile['tenantId'])?.toString();
      if (tenantId != null && tenantId.isNotEmpty) {
        await DatabaseHelper.instance.upsertTenant({
          'id': tenantId,
          'businessName': profile['businessName']?.toString(),
          'email': profile['email']?.toString(),
          'phone': (profile['waNumber'] ?? profile['phone'])?.toString(),
          'address': profile['address']?.toString(),
        });
      }
      notifyListeners(); // Notify UI of updated profile

      // 2. Full data sync
      await _api.syncAllData();

      // 3. Auto-connect printer
      final autoConnect = prefs.getBool('auto_connect_printer') ?? true;
      if (autoConnect) {
        await PrinterService().autoConnect();
      }
    } catch (e) {
      debugPrint('Background sync/refresh failed: $e');
      if (e.toString().contains('401') || e.toString().contains('Unauthorized')) {
         _clearAuthData();
      }
    }
  }
  
  void _clearAuthData() {
    _isAuthenticated = false;
    _currentUser = null;
    _token = null;
    _api.clearAuth();
    notifyListeners();
  }

  Future<void> _activateDemoMode(SharedPreferences prefs) async {
    final cachedUserJson = prefs.getString('user_data');
    if (cachedUserJson != null && cachedUserJson.isNotEmpty) {
      try {
        _currentUser = jsonDecode(cachedUserJson);
      } catch (_) {
        // Fallback to default demo user if cache is corrupt
        _currentUser = _getDefaultDemoUser();
      }
    } else {
      _currentUser = _getDefaultDemoUser();
    }
    _isAuthenticated = true;
    _token = null;
    notifyListeners();
  }

  Map<String, dynamic> _getDefaultDemoUser() => {
        'id': 'DEMO',
        'tenantId': 'DEMO_TENANT',
        'businessName': 'Demo Store',
        'ownerName': 'Demo Owner',
        'email': 'demo@rana.local',
        'phone': '081234567890',
        'waNumber': '081234567890',
        'address': 'Jl. Demo No.1, Kota Demo'
      };

  Future<void> refreshProfile() async {
    try {
      final profile = await _api.getProfile();
      _currentUser = profile;
      
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('user_data', jsonEncode(profile));
      
      notifyListeners();
    } catch (e) {
      debugPrint('Failed to refresh profile: $e');
    }
  }

  Future<void> logout() async {
    _isAuthenticated = false;
    _currentUser = null;
    _token = null;
    try {
      _api.clearAuth();
    } catch (_) {}

    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    await prefs.remove('user_data');
    await prefs.remove('demo_mode');

    // Clear Local DB
    await DatabaseHelper.instance.clearAllData();

    notifyListeners();
  }
}
