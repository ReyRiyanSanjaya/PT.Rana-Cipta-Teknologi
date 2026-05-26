import 'package:flutter/material.dart';
import 'dart:ui';
import 'package:camera/camera.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_compass/flutter_compass.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart' as math;
import 'package:rana_market/config/theme_config.dart';
import 'package:rana_market/screens/store_detail_screen.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:rana_market/data/market_api_service.dart';
import 'dart:math' as dartmath;

class ArExploreScreen extends StatefulWidget {
  final double userLat;
  final double userLong;
  final List<dynamic> stores;

  const ArExploreScreen({
    super.key,
    required this.userLat,
    required this.userLong,
    required this.stores,
  });

  @override
  State<ArExploreScreen> createState() => _ArExploreScreenState();
}

class _ArExploreScreenState extends State<ArExploreScreen> {
  CameraController? _cameraController;
  List<CameraDescription>? cameras;
  
  double? _heading;
  bool _isInit = false;
  String _errorMsg = '';

  @override
  void initState() {
    super.initState();
    _initAr();
  }

  Future<void> _initAr() async {
    try {
      cameras = await availableCameras();
      if (cameras != null && cameras!.isNotEmpty) {
        _cameraController = CameraController(
          cameras!.first,
          ResolutionPreset.high,
          enableAudio: false,
        );
        await _cameraController!.initialize();
      } else {
        _errorMsg = "Kamera tidak ditemukan.";
      }

      FlutterCompass.events?.listen((event) {
        if (mounted) {
          setState(() {
            // Add a small threshold or just setState to let AnimatedPositioned smooth it out
            _heading = event.heading;
          });
        }
      });

      setState(() {
        _isInit = true;
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMsg = "Gagal memulai Kamera AR: $e";
          _isInit = true;
        });
      }
    }
  }

  @override
  void dispose() {
    _cameraController?.dispose();
    super.dispose();
  }

  double _calculateBearing(double lat1, double lon1, double lat2, double lon2) {
    var dLon = (lon2 - lon1) * dartmath.pi / 180.0;
    var lat1Rad = lat1 * dartmath.pi / 180.0;
    var lat2Rad = lat2 * dartmath.pi / 180.0;

    var y = dartmath.sin(dLon) * dartmath.cos(lat2Rad);
    var x = dartmath.cos(lat1Rad) * dartmath.sin(lat2Rad) -
        dartmath.sin(lat1Rad) * dartmath.cos(lat2Rad) * dartmath.cos(dLon);
    var brng = dartmath.atan2(y, x) * 180.0 / dartmath.pi;
    return (brng + 360.0) % 360.0;
  }

  double _getNormalizedAngleOffset(double targetBearing, double currentHeading) {
    double diff = targetBearing - currentHeading;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return diff;
  }

  @override
  Widget build(BuildContext context) {
    if (!_isInit) {
      return const Scaffold(
        backgroundColor: Colors.black,
        body: Center(child: CircularProgressIndicator(color: Colors.white)),
      );
    }

    if (_errorMsg.isNotEmpty || _cameraController == null) {
      return Scaffold(
        backgroundColor: Colors.black,
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Text(
              _errorMsg.isNotEmpty ? _errorMsg : "Kamera tidak dimuat.",
              style: const TextStyle(color: Colors.white),
              textAlign: TextAlign.center,
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // 1. Camera Feed
          SizedBox.expand(
            child: CameraPreview(_cameraController!),
          ),

          // 2. AR Grid/Scanner Overlay
          Positioned.fill(
            child: IgnorePointer(
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.transparent,
                      ThemeConfig.brandColor.withValues(alpha: 0.3),
                      Colors.transparent,
                    ],
                    stops: const [0.0, 0.5, 1.0],
                  ),
                ),
              ).animate(onPlay: (c) => c.repeat()).slideY(begin: -1, end: 1, duration: 3.seconds, curve: Curves.linear),
            ),
          ),
          
          // Add a subtle vignette for depth
          Positioned.fill(
            child: IgnorePointer(
              child: Container(
                decoration: BoxDecoration(
                  gradient: RadialGradient(
                    center: Alignment.center,
                    radius: 1.0,
                    colors: [
                      Colors.transparent,
                      Colors.black.withValues(alpha: 0.6),
                    ],
                    stops: const [0.5, 1.0],
                  )
                ),
              ),
            ),
          ),

          // 3. AR Cards
          if (_heading != null)
            ...widget.stores.map((store) {
              final storeLat = (store['latitude'] ?? store['lat'])?.toDouble();
              final storeLong = (store['longitude'] ?? store['lng'])?.toDouble();
              
              if (storeLat == null || storeLong == null) return const SizedBox.shrink();

              // Calculate Bearing
              final bearing = _calculateBearing(widget.userLat, widget.userLong, storeLat, storeLong);
              final angleDiff = _getNormalizedAngleOffset(bearing, _heading!);

              // Field of view approx: +/- 45 degrees visible
              // We map [-45, 45] to [0, screenWidth]
              final isVisible = angleDiff >= -60 && angleDiff <= 60;
              if (!isVisible) return const SizedBox.shrink();

              // Calculate X position
              final width = MediaQuery.of(context).size.width;
              final xPos = ((angleDiff + 45) / 90) * width; // Center is 45 offset
              
              // Calculate rough Y position based on distance (closer = lower on screen)
              final dist = store['distance'] as num? ?? 1;
              final height = MediaQuery.of(context).size.height;
              // Very rough distance mapping
              final normalizedDist = (dist / 10).clamp(0.0, 1.0); // max 10km scale
              final yPos = (height * 0.35) + (normalizedDist * height * 0.25);

              return AnimatedPositioned(
                duration: const Duration(milliseconds: 300),
                curve: Curves.easeOut,
                left: xPos - 75, // center the 150px wide card
                top: yPos,
                child: GestureDetector(
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => StoreDetailScreen(
                          store: store,
                        ),
                      ),
                    );
                  },
                  child: _buildArCard(store).animate().fadeIn().scale(begin: const Offset(0.8, 0.8)),
                ),
              );
            }),

          // 4. Back Button
          Positioned(
            top: MediaQuery.of(context).padding.top + 10,
            left: 16,
            child: _glassContainer(
              padding: const EdgeInsets.all(10),
              child: GestureDetector(
                onTap: () => Navigator.pop(context),
                child: const Icon(Icons.arrow_back_ios_new, color: Colors.white, size: 20),
              )
            ),
          ),
          
          // 5. Compass Indicator (Top Center)
          if (_heading != null)
            Positioned(
              top: MediaQuery.of(context).padding.top + 10,
              left: 0, right: 0,
              child: Center(
                child: _glassContainer(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.explore, color: ThemeConfig.brandColor, size: 16),
                      const SizedBox(width: 6),
                      Text(
                        '${_heading!.toStringAsFixed(0)}°',
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, letterSpacing: 1),
                      ),
                    ],
                  ),
                ),
              ),
            ),

          // 6. HUD Instructions
          Positioned(
            bottom: 40,
            left: 20,
            right: 140, // leave space for radar
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _glassContainer(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: const Text(
                    'Pindai sekelilingmu untuk menemukan toko terdekat dalam jangkauan AR.',
                    style: TextStyle(color: Colors.white, fontSize: 12, height: 1.4),
                  ),
                ),
              ],
            ).animate().slideX(begin: -0.2).fadeIn(delay: 500.ms),
          ),
          
          // 7. Radar Minimap
          if (_heading != null)
            Positioned(
              bottom: 40,
              right: 20,
              child: _buildRadar(),
            ),
        ],
      ),
    );
  }

  Widget _buildRadar() {
    return _glassContainer(
      padding: const EdgeInsets.all(8),
      borderRadius: 100, // Make it circular
      child: Container(
        width: 100,
        height: 100,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: ThemeConfig.brandColor.withValues(alpha: 0.5), width: 1),
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Radar sweeping line (animated rotate)
            Container(
              width: 100, height: 100,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: SweepGradient(
                  colors: [Colors.transparent, ThemeConfig.brandColor.withValues(alpha: 0.6)],
                  stops: const [0.8, 1.0],
                ),
              ),
            ).animate(onPlay: (c) => c.repeat()).rotate(duration: 2.seconds),
            
            // Center user dot
            Container(
              width: 8, height: 8,
              decoration: const BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
                boxShadow: [BoxShadow(color: Colors.white, blurRadius: 4)]
              ),
            ),
            
            // Store dots on radar
            ...widget.stores.map((store) {
               final storeLat = (store['latitude'] ?? store['lat'])?.toDouble();
               final storeLong = (store['longitude'] ?? store['lng'])?.toDouble();
               if (storeLat == null || storeLong == null) return const SizedBox.shrink();

               final bearing = _calculateBearing(widget.userLat, widget.userLong, storeLat, storeLong);
               // Rotate bearing relative to user's heading so "up" is always what user is looking at
               final relativeAngle = bearing - _heading!;
               final rad = (relativeAngle - 90) * dartmath.pi / 180.0; // -90 to align 0 to top

               final dist = store['distance'] as num? ?? 1;
               // Map distance to radius (max 50px)
               final normalizedDist = (dist / 10).clamp(0.1, 1.0); 
               final r = 40 * normalizedDist;

               final dx = r * dartmath.cos(rad);
               final dy = r * dartmath.sin(rad);

               return Positioned(
                 left: 50 + dx - 3, // center is 50, dot is 6x6 so offset 3
                 top: 50 + dy - 3,
                 child: Container(
                   width: 6, height: 6,
                   decoration: BoxDecoration(
                     color: ThemeConfig.brandColor,
                     shape: BoxShape.circle,
                     boxShadow: [BoxShadow(color: ThemeConfig.brandColor, blurRadius: 4)]
                   ),
                 ),
               );
            }),
          ]
        ),
      ),
    ).animate().scale(delay: 600.ms, begin: const Offset(0.8, 0.8)).fadeIn();
  }

  Widget _glassContainer({required Widget child, EdgeInsetsGeometry? padding, double borderRadius = 16, Color? color}) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          padding: padding,
          decoration: BoxDecoration(
            color: color?.withValues(alpha: 0.3) ?? Colors.white.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(borderRadius),
            border: Border.all(color: Colors.white.withValues(alpha: 0.2), width: 1.5),
          ),
          child: child,
        ),
      ),
    );
  }

  Widget _buildArCard(dynamic store) {
    final imgUrl = store['imageUrl'] != null ? MarketApiService().resolveFileUrl(store['imageUrl']) : null;
    final dist = store['distance'] as num?;
    String distStr = dist != null ? (dist < 1 ? '${(dist * 1000).toInt()} m' : '${dist.toStringAsFixed(1)} km') : '';

    return _glassContainer(
      padding: const EdgeInsets.all(10),
      borderRadius: 20,
      child: SizedBox(
        width: 130,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (imgUrl != null)
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: CachedNetworkImage(
                  imageUrl: imgUrl,
                  height: 70,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  errorWidget: (_, __, ___) => Container(
                    height: 70, color: Colors.white24,
                    child: const Icon(Icons.store, color: Colors.white54),
                  ),
                ),
              ),
            const SizedBox(height: 8),
            Text(
              store['name'] ?? 'Toko',
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white),
            ),
            const SizedBox(height: 4),
            if (distStr.isNotEmpty)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: ThemeConfig.brandColor.withValues(alpha: 0.8),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.location_on, color: Colors.white, size: 12),
                    const SizedBox(width: 4),
                    Text(
                      distStr,
                      style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              )
          ],
        ),
      ),
    );
  }
}
