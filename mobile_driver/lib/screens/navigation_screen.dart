import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:mobile_driver/config/theme_config.dart';

class NavigationScreen extends StatefulWidget {
  final LatLng origin;
  final LatLng destination;

  const NavigationScreen(
      {super.key, required this.origin, required this.destination});

  @override
  State<NavigationScreen> createState() => _NavigationScreenState();
}

class _NavigationScreenState extends State<NavigationScreen> {
  @override
  void initState() {
    super.initState();
    // Try to open Google Maps for navigation
    _openExternalNavigation();
  }

  Future<void> _openExternalNavigation() async {
    final url = Uri.parse(
        'https://www.google.com/maps/dir/?api=1'
        '&origin=${widget.origin.latitude},${widget.origin.longitude}'
        '&destination=${widget.destination.latitude},${widget.destination.longitude}'
        '&travelmode=driving');

    try {
      if (await canLaunchUrl(url)) {
        await launchUrl(url, mode: LaunchMode.externalApplication);
      }
    } catch (e) {
      debugPrint('Navigation launch error: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    // Simulated route points
    final routePoints = [
      widget.origin,
      LatLng(
        (widget.origin.latitude + widget.destination.latitude) / 2,
        (widget.origin.longitude + widget.destination.longitude) / 2,
      ),
      widget.destination,
    ];

    return Scaffold(
      backgroundColor: ThemeConfig.beigeBackground,
      appBar: AppBar(
        title: Text('Navigasi',
            style: GoogleFonts.outfit(
                fontWeight: FontWeight.bold, color: ThemeConfig.brandColor)),
        backgroundColor: ThemeConfig.beigeBackground,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new,
              size: 20, color: ThemeConfig.brandColor),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.open_in_new_rounded,
                color: ThemeConfig.brandColor),
            onPressed: _openExternalNavigation,
            tooltip: 'Buka di Google Maps',
          ),
        ],
      ),
      body: Stack(
        children: [
          FlutterMap(
            options: MapOptions(
              initialCenter: widget.origin,
              initialZoom: 14.0,
            ),
            children: [
              TileLayer(
                urlTemplate:
                    'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
                subdomains: const ['a', 'b', 'c'],
              ),
              PolylineLayer(
                polylines: [
                  Polyline(
                    points: routePoints,
                    color: Colors.blue.shade600,
                    strokeWidth: 5.0,
                    strokeCap: StrokeCap.round,
                  ),
                ],
              ),
              MarkerLayer(
                markers: [
                  Marker(
                    point: widget.origin,
                    width: 40,
                    height: 40,
                    child: const Icon(Icons.navigation_rounded,
                        color: Colors.green, size: 32),
                  ),
                  Marker(
                    point: widget.destination,
                    width: 40,
                    height: 40,
                    child: const Icon(Icons.location_on_rounded,
                        color: Colors.red, size: 32),
                  ),
                ],
              ),
            ],
          ),
          Positioned(
            bottom: 24,
            left: 24,
            right: 24,
            child: ElevatedButton.icon(
              onPressed: _openExternalNavigation,
              icon: const Icon(Icons.navigation_rounded),
              label: const Text('BUKA GOOGLE MAPS',
                  style: TextStyle(fontWeight: FontWeight.bold)),
              style: ElevatedButton.styleFrom(
                backgroundColor: ThemeConfig.brandColor,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 18),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
