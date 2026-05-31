import 'dart:async';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:rana_market/config/theme_config.dart';
import 'package:rana_market/services/socket_service.dart';
import 'package:rana_market/data/market_api_service.dart';
import 'package:rana_market/screens/ride_rating_screen.dart';
import 'package:rana_market/screens/buyer_trip_chat_screen.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:provider/provider.dart';

class RideOrderTrackingScreen extends StatefulWidget {
  final Map<String, dynamic> orderData;

  const RideOrderTrackingScreen({super.key, required this.orderData});

  @override
  State<RideOrderTrackingScreen> createState() => _RideOrderTrackingScreenState();
}

class _RideOrderTrackingScreenState extends State<RideOrderTrackingScreen>
    with TickerProviderStateMixin {
  final MapController _mapController = MapController();
  bool _isSearching = true;
  Map<String, dynamic>? _driverInfo;

  // For smooth animation
  LatLng? _displayedPosition;
  LatLng? _targetPosition;
  LatLng? _startPosition;
  AnimationController? _positionAnimCtrl;
  Animation<double>? _positionAnim;

  double _progress = 0.0; // kept for compatibility but calculated dynamically in panel
  String _currentStatus = 'SEARCHING';
  StreamSubscription? _orderStatusSub;
  StreamSubscription? _driverMovedSub;
  Timer? _pollTimer;
  int? _etaMinutes;
  double? _etaDistance;

  @override
  void initState() {
    super.initState();
    _currentStatus = widget.orderData['status'] ?? 'SEARCHING';
    _isSearching = _currentStatus == 'SEARCHING';
    _setupSocketListeners();
    _startPolling();
  }

  @override
  void dispose() {
    _orderStatusSub?.cancel();
    _driverMovedSub?.cancel();
    _pollTimer?.cancel();
    _positionAnimCtrl?.dispose();
    super.dispose();
  }

  void _setupSocketListeners() {
    final orderId = widget.orderData['id'];
    if (orderId == null) return;

    // Import socket service - use the buyer's socket
    // Listen for order_status events (driver accepted, arrived, etc.)
    // The buyer socket already listens to 'order_status' events
    // We need to join the order room first
    try {
      final socketService = Provider.of<SocketService>(context, listen: false);
      socketService.joinOrder(orderId.toString());

      // Listen for order status changes
      _orderStatusSub = socketService.orderStatusStream.listen((data) {
        if (!mounted) return;
        final status = data['status'];
        final driver = data['driver'];

        if (status == 'ACCEPTED' && driver != null) {
          setState(() {
            _isSearching = false;
            _currentStatus = 'ACCEPTED';
            _driverInfo = {
              'name': driver['name'] ?? 'Driver',
              'rating': driver['rating'] ?? 4.5,
              'vehicle': '${driver['vehicleBrand'] ?? ''} ${driver['vehicleType'] ?? ''}',
              'plate': driver['vehiclePlate'] ?? '-',
              'phone': driver['phone'] ?? '',
              'photo': 'https://i.pravatar.cc/150?u=${driver['id']}',
            };
            if (driver['latitude'] != null && driver['longitude'] != null) {
              _displayedPosition = LatLng(
                (driver['latitude'] as num).toDouble(),
                (driver['longitude'] as num).toDouble(),
              );
            }
          });
        } else if (status == 'ARRIVED') {
          setState(() => _currentStatus = 'ARRIVED');
          _showArrivalDialog();
        } else if (status == 'IN_TRANSIT') {
          setState(() => _currentStatus = 'IN_TRANSIT');
        } else if (status == 'COMPLETED') {
          setState(() => _currentStatus = 'COMPLETED');
          _showCompletedDialog();
        } else if (status == 'CANCELLED') {
          setState(() => _currentStatus = 'CANCELLED');
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Pesanan dibatalkan'), backgroundColor: Colors.red),
            );
            Navigator.pop(context);
          }
        }
      });

      // Listen for driver location updates via stream
      _driverMovedSub = socketService.driverMovedStream.listen((data) {
        if (!mounted) return;
        if (data['lat'] != null && data['lng'] != null) {
          final newPos = LatLng(
            (data['lat'] as num).toDouble(),
            (data['lng'] as num).toDouble(),
          );
          _animateMarkerTo(newPos);
        }
      });
    } catch (e) {
      debugPrint('[Tracking] Socket setup error: $e');
    }
  }

  /// Poll the server for status updates (fallback if socket misses events)
  void _startPolling() {
    final orderId = widget.orderData['id'];
    if (orderId == null) return;

    _pollTimer = Timer.periodic(const Duration(seconds: 5), (timer) async {
      if (!mounted) return;
      if (_currentStatus == 'COMPLETED' || _currentStatus == 'CANCELLED') {
        timer.cancel();
        return;
      }

      try {
        final data = await MarketApiService().getServiceRequestStatus(orderId.toString());

        final status = data['status'];
        final driver = data['driver'];

        if (status != null && status != _currentStatus) {
          setState(() => _currentStatus = status);
        }

        // Always update driver info if available and we don't have it yet
        if (driver != null && _driverInfo == null) {
          setState(() {
            _isSearching = false;
            _driverInfo = {
              'name': driver['name'] ?? 'Driver',
              'rating': driver['rating'] ?? 4.5,
              'vehicle': '${driver['vehicleBrand'] ?? ''} ${driver['vehicleType'] ?? ''}',
              'plate': driver['vehiclePlate'] ?? '-',
              'phone': driver['phone'] ?? '',
              'photo': 'https://i.pravatar.cc/150?u=${driver['id']}',
            };
          });
        }

        // Handle status-not-searching but still showing searching UI
        if (status != null && status != 'SEARCHING' && _isSearching) {
          setState(() => _isSearching = false);
        }

        if (status == 'ARRIVED' && _currentStatus != 'ARRIVED') _showArrivalDialog();
        if (status == 'COMPLETED') _showCompletedDialog();

        // Update driver position from poll
        if (driver != null && driver['latitude'] != null && driver['longitude'] != null) {
          final newPos = LatLng(
            (driver['latitude'] as num).toDouble(),
            (driver['longitude'] as num).toDouble(),
          );
          _animateMarkerTo(newPos);
        }

        // Fetch ETA
        try {
          final etaData = await MarketApiService().getETA(orderId.toString());
          if (mounted && etaData.isNotEmpty) {
            setState(() {
              _etaMinutes = (etaData['eta'] as num?)?.toInt();
              _etaDistance = (etaData['distance'] as num?)?.toDouble();
            });
          }
        } catch (_) {}
      } catch (_) {}
    });
  }

  /// Smoothly interpolates the marker from [_displayedPosition] to [newTarget]
  void _animateMarkerTo(LatLng newTarget) {
    _positionAnimCtrl?.stop();
    _positionAnimCtrl?.dispose();

    _startPosition = _displayedPosition ?? newTarget;
    _targetPosition = newTarget;

    _positionAnimCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    );

    _positionAnim = CurvedAnimation(
      parent: _positionAnimCtrl!,
      curve: Curves.easeInOut,
    );

    _positionAnimCtrl!.addListener(() {
      if (!mounted) return;
      final t = _positionAnim!.value;
      final lat = _startPosition!.latitude +
          (_targetPosition!.latitude - _startPosition!.latitude) * t;
      final lng = _startPosition!.longitude +
          (_targetPosition!.longitude - _startPosition!.longitude) * t;
      final interpolatedPos = LatLng(lat, lng);
      setState(() {
        _displayedPosition = interpolatedPos;
      });
      // Only move the camera on final frames so it doesn't stutter
      if (t > 0.9) {
        _mapController.move(interpolatedPos, 16);
      }
    });

    _positionAnimCtrl!.forward();
  }

  void _showArrivalDialog() {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(_currentStatus == 'ARRIVED'
            ? 'Driver telah sampai di lokasi jemput! 🎉'
            : 'Driver sedang menuju ke Anda'),
        backgroundColor: Colors.green,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  void _showCompletedDialog() {
    if (!mounted) return;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Perjalanan Selesai! 🎉'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.check_circle_rounded, color: Colors.green, size: 64),
            const SizedBox(height: 16),
            Text('Rp${ThemeConfig.formatCurrency((widget.orderData['price'] as num).toDouble())}',
                style: GoogleFonts.outfit(fontSize: 28, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            const Text('Terima kasih telah menggunakan Rana!'),
          ],
        ),
        actions: [
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                Navigator.pop(ctx); // close dialog
                Navigator.pushReplacement(
                  context,
                  MaterialPageRoute(
                    builder: (_) => RideRatingScreen(
                      orderData: widget.orderData,
                      driverInfo: _driverInfo,
                    ),
                  ),
                );
              },
              child: const Text('BERI RATING DRIVER'),
            ),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.pop(context);
            },
            child: const Text('Lewati', style: TextStyle(color: Colors.grey)),
          ),
        ],
      ),
    );
  }

  Future<void> _cancelOrder() async {
    final orderId = widget.orderData['id'];
    if (orderId == null) {
      Navigator.pop(context);
      return;
    }

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Batalkan Pesanan?'),
        content: const Text('Apakah Anda yakin ingin membatalkan pesanan ini?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('TIDAK'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('YA, BATALKAN', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      await MarketApiService().cancelServiceRequest(orderId.toString());
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Pesanan dibatalkan'), backgroundColor: Colors.orange),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal membatalkan: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // 1. Map
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: LatLng(widget.orderData['originLat'], widget.orderData['originLng']),
              initialZoom: 15.0,
            ),
            children: [
              TileLayer(
                urlTemplate:
                    'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
                subdomains: const ['a', 'b', 'c'],
              ),
              MarkerLayer(
                markers: [
                  Marker(
                    point: LatLng(widget.orderData['originLat'], widget.orderData['originLng']),
                    width: 50,
                    height: 50,
                    child: Column(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: Colors.blue,
                            shape: BoxShape.circle,
                            boxShadow: [BoxShadow(color: Colors.blue.withOpacity(0.4), blurRadius: 12)],
                          ),
                          child: const Icon(Icons.person_rounded, color: Colors.white, size: 20),
                        ),
                      ],
                    ),
                  ),
                  if (_displayedPosition != null)
                    Marker(
                      point: _displayedPosition!,
                      width: 55,
                      height: 55,
                      child: _buildDriverMarker(),
                    ),
                ],
              ),
            ],
          ),

          // 2. Back Button (Top-left)
          Positioned(
            top: MediaQuery.of(context).padding.top + 8,
            left: 12,
            child: GestureDetector(
              onTap: () => Navigator.pop(context),
              child: Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                  boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 10)],
                ),
                child: const Icon(Icons.arrow_back_rounded, size: 22),
              ),
            ),
          ),

          // 3. Top Status Bar
          _buildTopStatus(),

          // 4. Bottom Info Sheet
          _isSearching
              ? _buildSearchingPanel()
              : (_driverInfo != null
                  ? _buildDriverPanel()
                  : _buildWaitingForDriverInfo()),
        ],
      ),
    );
  }

  Widget _buildDriverMarker() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(
            color: Colors.white,
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: ThemeConfig.brandColor.withOpacity(0.4),
                blurRadius: 12,
                offset: const Offset(0, 4),
              )
            ],
          ),
          child: Icon(
            widget.orderData['type'] == 'CAR'
                ? Icons.directions_car_rounded
                : Icons.directions_bike_rounded,
            color: ThemeConfig.brandColor,
            size: 24,
          ),
        ),
        CustomPaint(
          size: const Size(10, 5),
          painter: TrianglePainter(color: Colors.white),
        ),
      ],
    ).animate(onPlay: (c) => c.repeat()).shimmer(
          duration: 2.seconds,
          color: ThemeConfig.brandColor.withOpacity(0.3),
        );
  }

  Widget _buildTopStatus() {
    String statusText;
    Color statusColor;
    IconData statusIcon;

    switch (_currentStatus) {
      case 'SEARCHING':
        statusText = 'Mencari driver terdekat...';
        statusColor = Colors.orange;
        statusIcon = Icons.search_rounded;
        break;
      case 'ACCEPTED':
        statusText = 'Driver menuju ke lokasi Anda';
        statusColor = Colors.blue;
        statusIcon = Icons.navigation_rounded;
        break;
      case 'ARRIVED':
        statusText = 'Driver sudah sampai!';
        statusColor = Colors.green;
        statusIcon = Icons.place_rounded;
        break;
      case 'IN_TRANSIT':
        statusText = 'Sedang dalam perjalanan';
        statusColor = Colors.purple;
        statusIcon = Icons.directions_rounded;
        break;
      case 'COMPLETED':
        statusText = 'Perjalanan selesai';
        statusColor = Colors.green;
        statusIcon = Icons.check_circle_rounded;
        break;
      case 'CANCELLED':
        statusText = 'Pesanan dibatalkan';
        statusColor = Colors.red;
        statusIcon = Icons.cancel_rounded;
        break;
      default:
        statusText = 'Memproses...';
        statusColor = Colors.grey;
        statusIcon = Icons.hourglass_top_rounded;
    }

    return Positioned(
      top: MediaQuery.of(context).padding.top + 16,
      left: 60,
      right: 16,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.92),
          borderRadius: BorderRadius.circular(30),
          boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 12)],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: statusColor.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(statusIcon, color: statusColor, size: 16),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                statusText,
                style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 13),
              ),
            ),
            if (_etaMinutes != null && _currentStatus != 'SEARCHING' && _currentStatus != 'COMPLETED')
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text('~$_etaMinutes mnt',
                    style: GoogleFonts.outfit(color: statusColor, fontWeight: FontWeight.w800, fontSize: 12)),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildSearchingPanel() {
    return Positioned(
      bottom: 0,
      left: 0,
      right: 0,
      child: Container(
        padding: const EdgeInsets.all(32),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
          boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 20)],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 12),
            Stack(
              alignment: Alignment.center,
              children: [
                SizedBox(
                  width: 120,
                  height: 120,
                  child: CircularProgressIndicator(
                    strokeWidth: 8,
                    valueColor: AlwaysStoppedAnimation<Color>(
                        ThemeConfig.brandColor.withOpacity(0.15)),
                  ),
                ),
                SizedBox(
                  width: 120,
                  height: 120,
                  child: const CircularProgressIndicator(strokeWidth: 8)
                      .animate(onPlay: (c) => c.repeat())
                      .rotate(duration: 2.seconds),
                ),
                Icon(
                  widget.orderData['type'] == 'CAR'
                      ? Icons.directions_car_rounded
                      : Icons.directions_bike_rounded,
                  size: 48,
                  color: ThemeConfig.brandColor,
                ).animate(onPlay: (c) => c.repeat(reverse: true)).scale(
                    begin: const Offset(0.85, 0.85),
                    end: const Offset(1.15, 1.15),
                    duration: 1.seconds),
              ],
            ),
            const SizedBox(height: 28),
            Text('Sedang Mencari Driver',
                style: GoogleFonts.outfit(fontSize: 22, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            Text(
              'Kami sedang mencarikan driver terbaik untuk Anda.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey.shade600, height: 1.5),
            ),
            const SizedBox(height: 28),
            SizedBox(
              width: double.infinity,
              height: 52,
              child: OutlinedButton(
                onPressed: () => _cancelOrder(),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Colors.red),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                child: Text('BATALKAN PESANAN',
                    style: GoogleFonts.outfit(
                        color: Colors.red, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWaitingForDriverInfo() {
    return Positioned(
      bottom: 0,
      left: 0,
      right: 0,
      child: Container(
        padding: const EdgeInsets.all(32),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
          boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 20)],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: Colors.green.shade50,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.check_circle_rounded, color: Colors.green, size: 48),
            ).animate().scale(curve: Curves.elasticOut),
            const SizedBox(height: 20),
            Text('Driver Ditemukan!',
                style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text('Memuat detail driver...',
                style: TextStyle(color: Colors.grey.shade600)),
            const SizedBox(height: 20),
            const LinearProgressIndicator(),
          ],
        ),
      ),
    );
  }

  Widget _buildDriverPanel() {
    if (_driverInfo == null) return const SizedBox.shrink();

    // Calculate progress based on status
    double progress;
    String progressStart;
    String progressEnd;

    switch (_currentStatus) {
      case 'ACCEPTED':
        progress = 0.25;
        progressStart = 'Driver berangkat';
        progressEnd = 'Tiba di jemput';
        break;
      case 'ARRIVED':
        progress = 0.5;
        progressStart = 'Sudah sampai';
        progressEnd = 'Menunggu Anda';
        break;
      case 'IN_TRANSIT':
        progress = 0.75;
        progressStart = 'Dalam perjalanan';
        progressEnd = 'Tiba di tujuan';
        break;
      case 'COMPLETED':
        progress = 1.0;
        progressStart = 'Selesai';
        progressEnd = '✓';
        break;
      default:
        progress = 0.1;
        progressStart = 'Menunggu';
        progressEnd = 'Tiba';
    }

    return Positioned(
      bottom: 0,
      left: 0,
      right: 0,
      child: Container(
        padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
          boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 20)],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                  color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
            ),
            const SizedBox(height: 20),

            // Status badge
            if (_currentStatus == 'ARRIVED')
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: Colors.green.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.green.shade200),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.check_circle, color: Colors.green, size: 20),
                    const SizedBox(width: 8),
                    Text('Driver sudah sampai di lokasi jemput',
                        style: GoogleFonts.outfit(color: Colors.green.shade700, fontWeight: FontWeight.bold, fontSize: 13)),
                  ],
                ),
              ),

            if (_currentStatus == 'IN_TRANSIT')
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: Colors.purple.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.purple.shade200),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.directions_rounded, color: Colors.purple, size: 20),
                    const SizedBox(width: 8),
                    Text('Sedang menuju tujuan Anda',
                        style: GoogleFonts.outfit(color: Colors.purple.shade700, fontWeight: FontWeight.bold, fontSize: 13)),
                  ],
                ),
              ),

            // Driver Info Row
            Row(
              children: [
                ClipOval(
                  child: Image.network(
                    _driverInfo!['photo'],
                    width: 56,
                    height: 56,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      width: 56,
                      height: 56,
                      color: ThemeConfig.brandColor.withOpacity(0.1),
                      child: const Icon(Icons.person_rounded, color: ThemeConfig.brandColor),
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(_driverInfo!['name'],
                                style: GoogleFonts.outfit(fontSize: 17, fontWeight: FontWeight.bold),
                                overflow: TextOverflow.ellipsis),
                          ),
                          const SizedBox(width: 6),
                          const Icon(Icons.star_rounded, color: Colors.amber, size: 16),
                          Text('${_driverInfo!['rating']}',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                        ],
                      ),
                      Text(_driverInfo!['vehicle'],
                          style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.grey.shade200),
                  ),
                  child: Text(_driverInfo!['plate'],
                      style: GoogleFonts.outfit(fontWeight: FontWeight.w800, fontSize: 14)),
                ),
              ],
            ),

            // Progress Bar
            const SizedBox(height: 20),
            Stack(
              children: [
                Container(
                  height: 6,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
                FractionallySizedBox(
                  widthFactor: progress.clamp(0.0, 1.0),
                  child: Container(
                    height: 6,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                          colors: [ThemeConfig.brandColor, Color(0xFFFFA07A)]),
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(progressStart, style: TextStyle(color: Colors.grey.shade500, fontSize: 11)),
                Text(progressEnd, style: TextStyle(color: Colors.grey.shade500, fontSize: 11)),
              ],
            ),

            const Divider(height: 32),
            Row(
              children: [
                Expanded(child: _buildActionButton(Icons.chat_bubble_rounded, 'Chat', Colors.blue, onTap: () {
                  final orderId = widget.orderData['id']?.toString();
                  if (orderId != null && _driverInfo != null) {
                    Navigator.push(context, MaterialPageRoute(
                      builder: (_) => BuyerTripChatScreen(
                        requestId: orderId,
                        driverName: _driverInfo!['name'] ?? 'Driver',
                      ),
                    ));
                  }
                })),
                const SizedBox(width: 12),
                Expanded(child: _buildActionButton(Icons.call_rounded, 'Hubungi', Colors.green)),
                const SizedBox(width: 12),
                Expanded(child: _buildActionButton(Icons.security_rounded, 'Bantuan', Colors.orange)),
              ],
            ),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.grey.shade50,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey.shade100),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                        color: Colors.green.withOpacity(0.1), shape: BoxShape.circle),
                    child: const Icon(Icons.payment_rounded, color: Colors.green, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Text('Pembayaran Tunai',
                      style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
                  const Spacer(),
                  Text(
                    'Rp${ThemeConfig.formatCurrency((widget.orderData['price'] as num).toDouble())}',
                    style: GoogleFonts.outfit(
                        fontWeight: FontWeight.w900,
                        fontSize: 16,
                        color: ThemeConfig.brandColor),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    ).animate().slideY(begin: 1.0, duration: 600.ms, curve: Curves.easeOutQuart);
  }

  Widget _buildActionButton(IconData icon, String label, Color color, {VoidCallback? onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              shape: BoxShape.circle,
              border: Border.all(color: color.withOpacity(0.2)),
            ),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(height: 8),
          Text(label,
              style: GoogleFonts.outfit(
                  fontSize: 12, fontWeight: FontWeight.w600, color: Colors.grey.shade700)),
        ],
      ),
    );
  }
}

class TrianglePainter extends CustomPainter {
  final Color color;
  TrianglePainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color;
    final path = ui.Path();
    path.moveTo(0, 0);
    path.lineTo(size.width, 0);
    path.lineTo(size.width / 2, size.height);
    path.close();
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
