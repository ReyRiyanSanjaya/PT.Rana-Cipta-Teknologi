import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:rana_sales/data/api_service.dart';

class AuthProvider extends ChangeNotifier {
  bool _isLoggedIn = false;
  bool _isLoading = false;
  Map<String, dynamic>? _user;
  String? _error;

  bool get isLoggedIn => _isLoggedIn;
  bool get isLoading => _isLoading;
  Map<String, dynamic>? get user => _user;
  String? get error => _error;
  String get userName => _user?['name'] ?? 'Sales';
  String get userEmail => _user?['email'] ?? '';
  String get userId => _user?['id'] ?? '';

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    if (token != null && token.isNotEmpty) {
      ApiService().setToken(token);
      _user = {
        'id': prefs.getString('userId') ?? '',
        'name': prefs.getString('userName') ?? 'Sales',
        'email': prefs.getString('userEmail') ?? '',
        'role': prefs.getString('userRole') ?? 'DISTRIBUTOR',
        'distributorId': prefs.getString('distributorId') ?? '',
      };
      _isLoggedIn = true;
      notifyListeners();
    }
  }

  Future<bool> login(String credential, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await ApiService().login(credential, password);
      if (response['status'] == 'success') {
        final data = response['data'];
        final token = data['token'];
        final user = data['user'];

        // Verify this is a distributor account
        if (user['role'] != 'DISTRIBUTOR') {
          _error = 'Akun ini bukan akun tim distributor. Gunakan email yang di-invite oleh distributor.';
          _isLoading = false;
          notifyListeners();
          return false;
        }

        ApiService().setToken(token);

        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('token', token);
        await prefs.setString('userId', user['id'] ?? '');
        await prefs.setString('userName', user['name'] ?? '');
        await prefs.setString('userEmail', user['email'] ?? '');
        await prefs.setString('userRole', user['role'] ?? '');
        await prefs.setString('distributorId', user['distributorId'] ?? '');

        _user = user;
        _isLoggedIn = true;
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _error = response['message'] ?? 'Login gagal';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      String msg = 'Login gagal';
      if (e.toString().contains('401')) msg = 'Email/HP atau password salah';
      else if (e.toString().contains('403')) msg = 'Akun tidak aktif';
      _error = msg;
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    ApiService().clearAuth();
    _isLoggedIn = false;
    _user = null;
    notifyListeners();
  }
}
