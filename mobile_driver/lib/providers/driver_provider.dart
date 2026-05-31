import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mobile_driver/services/socket_service.dart';
import 'package:mobile_driver/data/driver_api_service.dart';
import 'package:mobile_driver/services/connectivity_service.dart';
import 'package:mobile_driver/services/background_service.dart';
import 'package:geolocator/geolocator.dart';

enum DriverStatus { offline, online, busy }

class DriverProvider with ChangeNotifier {
  DriverStatus _status = DriverStatus.offline;
  double _balance = 0;
  int _completedTrips = 0;
  int _todayTrips = 0;
  int _dailyTarget = 20;
  double _rating = 0;
  double _todayEarnings = 0;
  int _ratingCount = 0;
  double _acceptanceRate = 0.95;
  double _completionRate = 0.98;
  Map<String, dynamic>? _activeTrip;
  final List<Map<String, dynamic>> _activeRequests = [];
  Map<String, dynamic>? _driverProfile;
  bool _isLoadingProfile = false;

  DriverStatus get status => _status;
  double get balance => _balance;
  int get completedTrips => _completedTrips;
  int get todayTrips => _todayTrips;
  int get dailyTarget => _dailyTarget;
  double get rating => _rating;
  double get todayEarnings => _todayEarnings;
  int get ratingCount => _ratingCount;
  Map<String, dynamic>? get activeTrip => _activeTrip;
  List<Map<String, dynamic>> get activeRequests => _activeRequests;
  Map<String, dynamic>? get driverProfile => _driverProfile;
  bool get isLoadingProfile => _isLoadingProfile;

  String? _destinationAddress;
  String? get destinationAddress => _destinationAddress;
  bool get isDestinationModeActive => _destinationAddress != null;
  bool _isAutoAcceptOn = false;
  bool get isAutoAcceptOn => _isAutoAcceptOn;

  bool get isOnline => _status != DriverStatus.offline;
  double get dailyProgress => _dailyTarget > 0
      ? (_todayTrips / _dailyTarget).clamp(0.0, 1.0)
      : 0.0;

  // Gamification
  int get xp => (_completedTrips * 50) + (_rating * 100).toInt();
  int get level => (xp / 500).floor().clamp(1, 99);
  int get nextLevelXP => (level + 1) * 500;
  double get levelProgress => (xp % 500) / 500;
  double get acceptanceRate => _acceptanceRate;
  double get completionRate => _completionRate;

  Timer? _locationTimer;
  Timer? _requestPollTimer;

  DriverProvider() {
    _loadDriverState();

    // Listen to real-time orders via Socket
    SocketService().newDriverOrderStream.listen((orderData) {
      if (_status == DriverStatus.online) {
        _activeRequests.add(orderData);
        notifyListeners();

        // Auto remove if not accepted in 30s
        final orderId = orderData['id'];
        Timer(const Duration(seconds: 30), () {
          final exists = _activeRequests.any((r) => r['id'] == orderId);
          if (exists) {
            _activeRequests.removeWhere((r) => r['id'] == orderId);
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

  /// Load driver profile and stats from API
  Future<void> loadProfile() async {
    _isLoadingProfile = true;
    notifyListeners();

    try {
      final api = DriverApiService();

      // Load profile and stats in parallel
      final results = await Future.wait([
        api.getDriverProfile().catchError((_) => <String, dynamic>{}),
        api.getDriverStats().catchError((_) => <String, dynamic>{}),
        api.getActiveTrip().catchError((_) => null),
      ]);

      final profile = results[0] as Map<String, dynamic>;
      final stats = results[1] as Map<String, dynamic>;
      final activeTrip = results[2] as Map<String, dynamic>?;

      if (profile.isNotEmpty) {
        _driverProfile = profile;
        _balance = (stats['balance'] as num?)?.toDouble() ?? (profile['balance'] as num?)?.toDouble() ?? 0;
        _rating = (stats['rating'] as num?)?.toDouble() ?? (profile['rating'] as num?)?.toDouble() ?? 0;
        _ratingCount = (stats['ratingCount'] as num?)?.toInt() ?? (profile['ratingCount'] as num?)?.toInt() ?? 0;
        _completedTrips = (stats['totalTrips'] as num?)?.toInt() ?? 0;
        _todayTrips = (stats['todayTrips'] as num?)?.toInt() ?? 0;
        _todayEarnings = (stats['todayEarnings'] as num?)?.toDouble() ?? 0;
        _acceptanceRate = (stats['acceptanceRate'] as num?)?.toDouble() ?? 0.95;
        _completionRate = (stats['completionRate'] as num?)?.toDouble() ?? 0.98;

        final serverStatus = stats['status'] ?? profile['status'];
        if (serverStatus == 'ONLINE') {
          _status = DriverStatus.online;
        } else if (serverStatus == 'BUSY') {
          _status = DriverStatus.busy;
        }
      }

      if (activeTrip != null) {
        _activeTrip = activeTrip;
        _status = DriverStatus.busy;
      }
    } catch (e) {
      debugPrint('Load Profile Error: $e');
    } finally {
      _isLoadingProfile = false;
      notifyListeners();
    }
  }

  /// Toggle online/offline status
  Future<void> toggleOnline() async {
    final api = DriverApiService();

    if (_status == DriverStatus.offline) {
      _status = DriverStatus.online;
      notifyListeners();

      try {
        // Get current location
        Position? position;
        try {
          position = await _getCurrentPosition();
        } catch (_) {}

        await api.updateDriverStatus('ONLINE',
            latitude: position?.latitude,
            longitude: position?.longitude);

        _startLocationPing();
        _startRequestPolling();
      } catch (e) {
        debugPrint('Toggle Online Error: $e');
      }

      // Notify background service to keep alive
      BackgroundService().setDriverOnline(true);
    } else {
      _status = DriverStatus.offline;
      _activeRequests.clear();
      _stopLocationPing();
      _stopRequestPolling();
      notifyListeners();

      // Notify background service to stop
      BackgroundService().setDriverOnline(false);

      try {
        await api.updateDriverStatus('OFFLINE');
      } catch (e) {
        debugPrint('Toggle Offline Error: $e');
      }
    }

    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('driver_is_online', _status != DriverStatus.offline);
  }

  Future<Position?> _getCurrentPosition() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) return null;

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) return null;
      }
      if (permission == LocationPermission.deniedForever) return null;

      return await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 5),
      );
    } catch (e) {
      debugPrint('Geolocator Error: $e');
      return null;
    }
  }

  void _startLocationPing() {
    _locationTimer?.cancel();
    _locationTimer = Timer.periodic(const Duration(seconds: 10), (timer) async {
      try {
        final position = await _getCurrentPosition();
        if (position != null) {
          // Emit via socket for real-time tracking
          SocketService().emitLocationUpdate(
            position.latitude,
            position.longitude,
            orderId: _activeTrip?['id'],
          );

          // Also update via REST API periodically
          DriverApiService().updateLocation(position.latitude, position.longitude);
        }
      } catch (_) {}
    });
  }

  void _stopLocationPing() {
    _locationTimer?.cancel();
    _locationTimer = null;
  }

  /// Poll for available requests (fallback if socket misses them)
  void _startRequestPolling() {
    _requestPollTimer?.cancel();
    _requestPollTimer = Timer.periodic(const Duration(seconds: 15), (timer) async {
      if (_status != DriverStatus.online) return;
      if (_activeTrip != null) return; // Don't poll if already on a trip

      try {
        final position = await _getCurrentPosition();
        final requests = await DriverApiService().getAvailableRequests(
          latitude: position?.latitude,
          longitude: position?.longitude,
        );

        if (requests.isNotEmpty) {
          for (final req in requests) {
            final reqMap = Map<String, dynamic>.from(req);
            final exists = _activeRequests.any((r) => r['id'] == reqMap['id']);
            if (!exists) {
              _activeRequests.add(reqMap);
            }
          }
          notifyListeners();
        }
      } catch (_) {}
    });
  }

  void _stopRequestPolling() {
    _requestPollTimer?.cancel();
    _requestPollTimer = null;
  }

  /// Accept a trip request
  Future<void> acceptTrip(Map<String, dynamic> trip) async {
    final requestId = trip['id']?.toString();
    if (requestId == null) return;

    // Optimistic local state update for UX
    _activeTrip = {
      ...trip,
      'currentStep': 'PICKUP',
    };
    _activeRequests.removeWhere((r) => r['id'] == trip['id']);
    _status = DriverStatus.busy;
    notifyListeners();

    try {
      await DriverApiService().acceptRequest(requestId);
      // Success - start location ping with orderId
      _stopRequestPolling();
    } catch (e) {
      debugPrint('Accept Trip API Error: $e');
      // Revert if server rejected (e.g., already taken by another driver)
      _activeTrip = null;
      _status = DriverStatus.online;
      _startRequestPolling();
      notifyListeners();
    }
  }

  /// Reject/ignore a trip request
  void rejectTrip(Map<String, dynamic> trip) {
    _activeRequests.removeWhere((r) => r['id'] == trip['id']);
    notifyListeners();
  }

  /// Update trip step progression
  Future<void> updateTripStep(String step) async {
    if (_activeTrip == null) return;

    final requestId = _activeTrip!['id']?.toString();
    _activeTrip!['currentStep'] = step;

    if (step == 'COMPLETED') {
      final price = (_activeTrip!['price'] as num?)?.toDouble() ?? 0;
      _balance += price;
      _completedTrips += 1;
      _todayTrips += 1;
      _todayEarnings += price;
      _activeTrip = null;
      _status = DriverStatus.online;
      _startRequestPolling();
    }

    notifyListeners();

    // Map local step to server status
    if (requestId != null) {
      String? serverStatus;
      switch (step) {
        case 'ARRIVED_PICKUP':
          serverStatus = 'ARRIVED';
          break;
        case 'ON_TRIP':
          serverStatus = 'IN_TRANSIT';
          break;
        case 'COMPLETED':
          serverStatus = 'COMPLETED';
          break;
      }

      if (serverStatus != null) {
        try {
          await ConnectivityService().withRetry(
            () => DriverApiService().updateTripStatus(requestId, serverStatus!),
            queueOnFailure: true,
            operationId: 'trip_status_${requestId}_$serverStatus',
          );
        } catch (e) {
          debugPrint('Update Trip Status API Error: $e');
        }
      }
    }
  }

  /// Cancel current trip
  Future<void> cancelTrip() async {
    final requestId = _activeTrip?['id']?.toString();
    _activeTrip = null;
    _status = DriverStatus.online;
    _startRequestPolling();
    notifyListeners();

    if (requestId != null) {
      try {
        await DriverApiService().updateTripStatus(requestId, 'CANCELLED');
      } catch (e) {
        debugPrint('Cancel Trip API Error: $e');
      }
    }
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

  /// Refresh stats from server
  Future<void> refreshStats() async {
    try {
      final stats = await DriverApiService().getDriverStats();
      if (stats.isNotEmpty) {
        _balance = (stats['balance'] as num?)?.toDouble() ?? _balance;
        _rating = (stats['rating'] as num?)?.toDouble() ?? _rating;
        _completedTrips = (stats['totalTrips'] as num?)?.toInt() ?? _completedTrips;
        _todayTrips = (stats['todayTrips'] as num?)?.toInt() ?? _todayTrips;
        _todayEarnings = (stats['todayEarnings'] as num?)?.toDouble() ?? _todayEarnings;
        notifyListeners();
      }
    } catch (e) {
      debugPrint('Refresh Stats Error: $e');
    }
  }
}
