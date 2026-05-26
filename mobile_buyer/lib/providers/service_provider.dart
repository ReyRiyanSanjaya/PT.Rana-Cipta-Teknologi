import 'package:flutter/foundation.dart';

class ServiceProvider with ChangeNotifier {
  Map<String, dynamic>? _activeServiceOrder;

  Map<String, dynamic>? get activeServiceOrder => _activeServiceOrder;

  bool get hasActiveService => _activeServiceOrder != null;

  void setActiveService(Map<String, dynamic> order) {
    _activeServiceOrder = Map<String, dynamic>.from(order);
    notifyListeners();
  }

  void updateServiceStatus(String status, {Map<String, dynamic>? extraData}) {
    if (_activeServiceOrder != null) {
      _activeServiceOrder!['status'] = status;
      if (extraData != null) {
        _activeServiceOrder!.addAll(extraData);
      }
      notifyListeners();
    }
  }

  void updateDriverLocation(double lat, double lng) {
    if (_activeServiceOrder != null && _activeServiceOrder!['driver'] != null) {
      _activeServiceOrder!['driver']['latitude'] = lat;
      _activeServiceOrder!['driver']['longitude'] = lng;
      notifyListeners();
    }
  }

  void clearActiveService() {
    _activeServiceOrder = null;
    notifyListeners();
  }
}
