import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mobile_driver/services/socket_service.dart';

enum DriverStatus { offline, online, busy }

class DriverProvider with ChangeNotifier {
  DriverStatus _status = DriverStatus.offline;
  double _balance = 250000;
  int _completedTrips = 12;
  int _dailyTarget = 20;
  double _rating = 4.8;
  double _acceptanceRate = 0.95;
  double _completionRate = 0.98;
  int _xp = 1250;
  int _level = 5;
  Map<String, dynamic>? _activeTrip;
  final List<Map<String, dynamic>> _activeRequests = [];
  
  DriverStatus get status => _status;
  double get balance => _balance;
  int get completedTrips => _completedTrips;
  int get dailyTarget => _dailyTarget;
  double get rating => _rating;
  double get acceptanceRate => _acceptanceRate;
  double get completionRate => _completionRate;
  int get xp => _xp;
  int get level => _level;
  int get nextLevelXP => (_level + 1) * 500;
  double get levelProgress => (_xp % 500) / 500;
  Map<String, dynamic>? get activeTrip => _activeTrip;
  List<Map<String, dynamic>> get activeRequests => _activeRequests;
  String? _destinationAddress;
  String? get destinationAddress => _destinationAddress;
  bool get isDestinationModeActive => _destinationAddress != null;
  bool _isAutoAcceptOn = false;
  bool get isAutoAcceptOn => _isAutoAcceptOn;

  bool get isOnline => _status != DriverStatus.offline;
  double get dailyProgress => (_completedTrips / _dailyTarget).clamp(0.0, 1.0);

  Timer? _locationTimer;

  DriverProvider() {
    _loadDriverState();
    
    // Listen to real-time orders securely via Socket
    SocketService().newDriverOrderStream.listen((orderData) {
      if (_status == DriverStatus.online) {
        _activeRequests.add(orderData);
        notifyListeners();
        
        // Auto remove if not accepted in 30s
        Timer(const Duration(seconds: 30), () {
          final exists = _activeRequests.any((r) => r['id'] == orderData['id']);
          if (exists) {
            _activeRequests.removeWhere((r) => r['id'] == orderData['id']);
            notifyListeners();
          }
        });
      }
    });
  }

  Future<void> _loadDriverState() async {
    final prefs = await SharedPreferences.getInstance();
    final isOnline = prefs.getBool('driver_is_online') ?? false;
    _status = isOnline ? DriverStatus.online : DriverStatus.offline;
    notifyListeners();
  }

  Future<void> toggleOnline() async {
    if (_status == DriverStatus.offline) {
      _status = DriverStatus.online;
      _startLocationPing();
      _simulateNewRequest(); // Wait, fallback
    } else {
      _status = DriverStatus.offline;
      _stopLocationPing();
      _activeTrip = null;
      _activeRequests.clear();
    }
    
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('driver_is_online', _status != DriverStatus.offline);
    notifyListeners();
  }

  void _startLocationPing() {
    // Ping location to Node.js server every 5 seconds
    _locationTimer?.cancel();
    _locationTimer = Timer.periodic(const Duration(seconds: 5), (timer) {
      // In production, grab real GPS using Geolocator
      // For now, simulate around Jakarta
      double lat = -6.220 + (DateTime.now().second % 10) * 0.0001;
      double lng = 106.815 + (DateTime.now().second % 10) * 0.0001;
      
      SocketService().emitLocationUpdate(
        lat, 
        lng, 
        orderId: _activeTrip?['id']
      );
    });
  }

  void _stopLocationPing() {
    _locationTimer?.cancel();
    _locationTimer = null;
  }

  void _simulateNewRequest() {
    const request = {
      'id': 'SR-102',
      'type': 'RIDE',
      'customer': 'Budi Santoso',
      'origin': 'Stasiun Tebet, Jakarta Selatan',
      'destination': 'Menara Mandiri, Sudirman',
      'distance': '5.2 km',
      'price': 18000.0,
      'status': 'SEARCHING',
      'timeLeft': 30,
      'rating': 4.9,
    };

    _activeRequests.add(request);
    notifyListeners();

    // Optimasi: Hindari notifyListeners per detik. 
    // Gantikan dengan satu timer kedaluwarsa untuk menghemat resource.
    Timer(const Duration(seconds: 30), () {
      final exists = _activeRequests.any((r) => r['id'] == request['id']);
      if (exists) {
        _activeRequests.removeWhere((r) => r['id'] == request['id']);
        notifyListeners();
      }
    });
  }

  void acceptTrip(Map<String, dynamic> trip) {
    _activeTrip = {
      ...trip,
      'currentStep': 'PICKUP', // PICKUP, ARRIVED_PICKUP, ON_TRIP, ARRIVED_DEST, COMPLETED
    };
    _activeRequests.removeWhere((r) => r['id'] == trip['id']);
    _status = DriverStatus.busy;
    notifyListeners();
  }

  void rejectTrip(Map<String, dynamic> trip) {
    _activeRequests.removeWhere((r) => r['id'] == trip['id']);
    notifyListeners();
  }

  void updateTripStep(String step) {
    if (_activeTrip != null) {
      _activeTrip!['currentStep'] = step;
      if (step == 'COMPLETED') {
        _balance += (_activeTrip!['price'] as num).toDouble();
        _completedTrips += 1;
        _activeTrip = null;
        _status = DriverStatus.online;
      }
      notifyListeners();
    }
  }

  void cancelTrip() {
    _activeTrip = null;
    _status = DriverStatus.online;
    notifyListeners();
  }

  void setDestination(String address) {
    _destinationAddress = address;
    notifyListeners();
  }

  void clearDestination() {
    _destinationAddress = null;
    notifyListeners();
  }

  void toggleAutoAccept(bool value) {
    _isAutoAcceptOn = value;
    notifyListeners();
  }
}
