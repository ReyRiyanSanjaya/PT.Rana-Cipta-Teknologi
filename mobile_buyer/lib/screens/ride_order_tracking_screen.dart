import 'dart:async';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:rana_market/config/theme_config.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';

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
  LatLng? _displayedPosition;   // rendered position
  LatLng? _targetPosition;      // latest target from data
  LatLng? _startPosition;       // start of current animation segment
  AnimationController? _positionAnimCtrl;
  Animation<double>? _positionAnim;

  double _progress = 0.0;
  Timer? _simulationTimer;

  @override
  void initState() {
    super.initState();
    _startSearchingSimulation();
  }

  @override
  void dispose() {
    _simulationTimer?.cancel();
    _positionAnimCtrl?.dispose();
    super.dispose();
  }

  void _startSearchingSimulation() {
    Timer(const Duration(seconds: 4), () {
      if (!mounted) return;
      final origin = LatLng(widget.orderData['originLat'], widget.orderData['originLng']);
      final initialDriverPos = LatLng(origin.latitude + 0.005, origin.longitude + 0.005);

      setState(() {
        _isSearching = false;
        _driverInfo = {
          'name': 'Budi Santoso',
          'rating': 4.9,
          'vehicle': widget.orderData['type'] == 'CAR'
              ? 'Toyota Avanza White'
              : 'Honda Vario Black',
          'plate': widget.orderData['type'] == 'CAR' ? 'B 1234 ABC' : 'B 5678 DEF',
          'photo': 'https://i.pravatar.cc/150?u=budi',
        };
        _displayedPosition = initialDriverPos;
        _targetPosition = initialDriverPos;
      });

      _startDriverMovementSimulation();
    });
  }

  /// Called each tick to compute a new [_targetPosition] and smoothly animate to it
  void _startDriverMovementSimulation() {
    _simulationTimer = Timer.periodic(const Duration(seconds: 2), (timer) {
      if (!mounted) return;

      _progress += 0.05;
      if (_progress >= 1.0) {
        timer.cancel();
        _showArrivalDialog();
        return;
      }

      final startLat = widget.orderData['originLat'] + 0.005;
      final startLng = widget.orderData['originLng'] + 0.005;
      final targetLat = (widget.orderData['originLat'] as double);
      final targetLng = (widget.orderData['originLng'] as double);

      final newTarget = LatLng(
        startLat + (targetLat - startLat) * _progress,
        startLng + (targetLng - startLng) * _progress,
      );

      _animateMarkerTo(newTarget);
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
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Driver telah sampai di lokasi jemput! 🎉'),
        backgroundColor: Colors.green,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
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
          _isSearching ? _buildSearchingPanel() : _buildDriverPanel(),
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
    return Positioned(
      top: MediaQuery.of(context).padding.top + 16,
      left: 60,
      right: 16,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.92),
          borderRadius: BorderRadius.circular(30),
          boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 12)],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: Colors.blue.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.navigation_rounded, color: Colors.blue, size: 16),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                _isSearching
                    ? 'Mencari driver terdekat...'
                    : 'Driver menuju ke lokasi Anda',
                style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 13),
              ),
            ),
            if (!_isSearching)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.blue.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text('~3 mnt',
                    style: GoogleFonts.outfit(
                        color: Colors.blue, fontWeight: FontWeight.w800, fontSize: 12)),
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
                onPressed: () => Navigator.pop(context),
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

  Widget _buildDriverPanel() {
    if (_driverInfo == null) return const SizedBox.shrink();

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
                          Text(_driverInfo!['name'],
                              style: GoogleFonts.outfit(fontSize: 17, fontWeight: FontWeight.bold)),
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
                  widthFactor: _progress.clamp(0.0, 1.0),
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
                Text('Driver berangkat', style: TextStyle(color: Colors.grey.shade500, fontSize: 11)),
                Text('Tiba di lokasi', style: TextStyle(color: Colors.grey.shade500, fontSize: 11)),
              ],
            ),

            const Divider(height: 32),
            Row(
              children: [
                Expanded(child: _buildActionButton(Icons.chat_bubble_rounded, 'Chat', Colors.blue)),
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
                    ThemeConfig.formatCurrency((widget.orderData['price'] as num).toDouble()),
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

  Widget _buildActionButton(IconData icon, String label, Color color) {
    return Column(
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
