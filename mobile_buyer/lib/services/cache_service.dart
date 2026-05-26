import 'package:hive_flutter/hive_flutter.dart';

class CacheService {
  static const String _userBox = 'userBox';
  static const String _appBox = 'appBox';

  static Future<void> init() async {
    await Hive.initFlutter();
    await Hive.openBox(_userBox);
    await Hive.openBox(_appBox);
  }

  static Box get userBox => Hive.box(_userBox);
  static Box get appBox => Hive.box(_appBox);

  // App settings
  static bool get isDarkMode => appBox.get('isDarkMode', defaultValue: false);
  static Future<void> setDarkMode(bool val) => appBox.put('isDarkMode', val);

  // General caching method
  static Future<void> saveCache(String key, dynamic data) async {
    await appBox.put(key, data);
  }

  static dynamic getCache(String key) {
    return appBox.get(key);
  }

  static Future<void> clearCache() async {
    await appBox.clear();
  }
}
