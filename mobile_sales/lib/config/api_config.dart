class ApiConfig {
  // Production
  static const String _prodUrl = 'https://api.rana-app.com/api';
  // Local development (fallback jika API_BASE_URL tidak di-set)
  static const String _localUrl = 'http://192.168.1.100:4000/api';

  // Environment Flags
  static const bool _isProduction =
      bool.fromEnvironment('RANA_PROD', defaultValue: false);
  static const String _apiBaseUrlOverride =
      String.fromEnvironment('API_BASE_URL', defaultValue: '');

  static String get baseUrl {
    final override = _apiBaseUrlOverride.trim();
    if (override.isNotEmpty) return override;
    return _isProduction ? _prodUrl : _localUrl;
  }

  static Duration get connectTimeout => const Duration(seconds: 15);
  static Duration get receiveTimeout => const Duration(seconds: 15);
}
