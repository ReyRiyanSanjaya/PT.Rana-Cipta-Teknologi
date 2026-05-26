import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import 'package:mobile_driver/config/theme_config.dart';
import 'package:mobile_driver/providers/driver_provider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:mobile_driver/screens/navigation_screen.dart';
import 'package:google_fonts/google_fonts.dart';

class DriverTripExecutionScreen extends StatefulWidget {
  const DriverTripExecutionScreen({super.key});

  @override
  State<DriverTripExecutionScreen> createState() => _DriverTripExecutionScreenState();
}

class _DriverTripExecutionScreenState extends State<DriverTripExecutionScreen> {
  final MapController _mapController = MapController();
  
  final LatLng _driverPos = const LatLng(-6.220, 106.815);
  final LatLng _pickupPos = const LatLng(-6.215, 106.818);
  final LatLng _destPos = const LatLng(-6.230, 106.825);

  // Simulated polyline for the route
  final List<LatLng> _routePoints = [
    const LatLng(-6.220, 106.815),
    const LatLng(-6.221, 106.816),
    const LatLng(-6.223, 106.818),
    const LatLng(-6.225, 106.820),
    const LatLng(-6.228, 106.822),
    const LatLng(-6.230, 106.825),
  ];

  @override
  Widget build(BuildContext context) {
    return Selector<DriverProvider, Map<String, dynamic>?>(
      selector: (_, prov) => prov.activeTrip,
      builder: (context, trip, child) {
        if (trip == null) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            Navigator.pop(context);
          });
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }

        String step = trip['currentStep'] ?? 'PICKUP';
        final prov = Provider.of<DriverProvider>(context, listen: false); // Only for method calls
        
        return Scaffold(
          backgroundColor: ThemeConfig.beigeBackground,
          body: Stack(
            children: [
               RepaintBoundary(child: _buildModernMap(step)), // Prevents map repaints affecting other UI
              _buildGlassTopBar(context, trip, step),
              _buildDraggableTripDetails(context, prov, trip, step),
            ],
          ),
        );
      },
    );
  }

  Widget _buildModernMap(String step) {
    return FlutterMap(
      mapController: _mapController,
      options: const MapOptions(
        initialCenter: LatLng(-6.220, 106.815),
        initialZoom: 15.0,
      ),
      children: [
        TileLayer(
          urlTemplate: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
          subdomains: const ['a', 'b', 'c'],
        ),
        PolylineLayer(
          polylines: [
            Polyline(
              points: _routePoints,
              color: Colors.blue.shade600,
              strokeWidth: 6.0,
              isDotted: false,
              strokeCap: StrokeCap.round,
              strokeJoin: StrokeJoin.round,
            ),
            // Inner line for 3D effect
            Polyline(
              points: _routePoints,
              color: Colors.blue.shade300,
              strokeWidth: 3.0,
              isDotted: false,
              strokeCap: StrokeCap.round,
              strokeJoin: StrokeJoin.round,
            ),
          ],
        ),
        MarkerLayer(
          markers: [
            // Driver Marker with pulsing effect
            Marker(
              point: _driverPos,
              width: 60, height: 60,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  Container(
                    width: 40, height: 40,
                    decoration: BoxDecoration(
                      color: Colors.green.withOpacity(0.2),
                      shape: BoxShape.circle,
                    ),
                  ).animate(onPlay: (controller) => controller.repeat())
                   .scale(begin: const Offset(1, 1), end: const Offset(2, 2), duration: 1000.ms)
                   .fadeOut(),
                  const Icon(Icons.navigation_rounded, color: Colors.green, size: 32),
                ],
              ),
            ),
            
            if (step == 'PICKUP' || step == 'ARRIVED_PICKUP')
              Marker(
                point: _pickupPos,
                width: 50, height: 50,
                child: _buildLocationMarker(Icons.person_pin_circle, Colors.blue),
              ),
            
            if (step == 'ON_TRIP' || step == 'ARRIVED_DEST')
              Marker(
                point: _destPos,
                width: 50, height: 50,
                child: _buildLocationMarker(Icons.location_on, Colors.red),
              ),
          ],
        ),
      ],
    );
  }

  Widget _buildLocationMarker(IconData icon, Color color) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: Colors.white,
            shape: BoxShape.circle,
            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 10)],
          ),
          child: Icon(icon, color: color, size: 28),
        ),
        Container(
          width: 8, height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
      ],
    ).animate().slideY(begin: -0.5, curve: Curves.bounceOut);
  }

  Widget _buildGlassTopBar(BuildContext context, Map<String, dynamic> trip, String step) {
    String statusText = 'Menuju Lokasi Jemput';
    if (step == 'ARRIVED_PICKUP') statusText = 'Sudah Sampai di Jemputan';
    if (step == 'ON_TRIP') statusText = 'Mengantar ke Tujuan';
    if (step == 'ARRIVED_DEST') statusText = 'Sudah Sampai di Tujuan';

    return Positioned(
      top: 0, left: 0, right: 0,
      child: ClipRRect(
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
          child: Container(
            padding: const EdgeInsets.only(top: 50, left: 20, right: 20, bottom: 20),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.8),
              border: Border(bottom: BorderSide(color: Colors.black.withOpacity(0.05))),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _buildTurnByTurnPanel(),
                const SizedBox(height: 16),
                Row(
                  children: [
                    _buildCircularAction(Icons.close, Colors.black, onTap: () => Navigator.pop(context)),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            statusText.toUpperCase(),
                            style: GoogleFonts.outfit(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              color: Colors.green.shade700,
                              letterSpacing: 1.2,
                            ),
                          ),
                          Text(
                            step == 'ON_TRIP' ? trip['destination'] : trip['origin'],
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 16),
                    _buildCircularAction(Icons.navigation_rounded, Colors.blue, onTap: () {
                      Navigator.push(context, MaterialPageRoute(builder: (_) => NavigationScreen(origin: _driverPos, destination: step == 'ON_TRIP' ? _destPos : _pickupPos)));
                    }),
                    const SizedBox(width: 16),
                    _buildSafetyButton(),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTurnByTurnPanel() {
    return ClipRRect(
      borderRadius: BorderRadius.circular(24),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          decoration: BoxDecoration(
            color: Colors.black.withOpacity(0.75),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: Colors.white.withOpacity(0.15)),
            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 20)],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: Colors.blue.shade500, shape: BoxShape.circle),
                    child: const Icon(Icons.turn_left_rounded, color: Colors.white, size: 32),
                  ).animate(onPlay: (controller) => controller.repeat(reverse: true)).scale(begin: const Offset(1, 1), end: const Offset(1.1, 1.1), duration: 800.ms),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('200 m', style: GoogleFonts.outfit(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w900, letterSpacing: -0.5)),
                        Text('Belok kiri ke Jl. Sudirman', style: GoogleFonts.outfit(color: Colors.greenAccent.shade100, fontSize: 15, fontWeight: FontWeight.w500)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              _buildLaneGuidance(),
            ],
          ),
        ),
      ),
    ).animate().fadeIn(delay: 500.ms).slideY(begin: -0.5, curve: Curves.easeOutBack);
  }

  Widget _buildLaneGuidance() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.2),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildLane(Icons.straight_rounded, isActive: false),
          _buildLane(Icons.turn_left_rounded, isActive: true),
          _buildLane(Icons.straight_rounded, isActive: false),
          _buildLane(Icons.turn_right_rounded, isActive: false),
        ],
      ),
    );
  }

  Widget _buildLane(IconData icon, {required bool isActive}) {
    return Icon(
      icon,
      color: isActive ? Colors.white : Colors.white.withOpacity(0.3),
      size: 28,
    );
  }

  Widget _buildSafetyButton() {
    return GestureDetector(
      onTap: () => _showSafetyMenu(),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.red.shade50,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.red.shade100),
        ),
        child: Row(
          children: [
            const Icon(Icons.shield_rounded, color: Colors.red, size: 16),
            const SizedBox(width: 6),
            Text('SOS', style: GoogleFonts.outfit(color: Colors.red, fontWeight: FontWeight.w800, fontSize: 12)),
          ],
        ),
      ),
    );
  }

  void _showSafetyMenu() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
        ),
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 60, height: 60,
              decoration: BoxDecoration(color: Colors.red.shade100, shape: BoxShape.circle),
              child: const Icon(Icons.warning_rounded, color: Colors.red, size: 32),
            ),
            const SizedBox(height: 16),
            Text('Pusat Keselamatan', style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            const Text('Gunakan fitur ini hanya dalam keadaan darurat.', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey)),
            const SizedBox(height: 32),
            _buildSafetyAction(Icons.phone_in_talk_rounded, 'Hubungi Polisi (110)', Colors.red),
            const SizedBox(height: 12),
            _buildSafetyAction(Icons.share_location_rounded, 'Bagikan Lokasi Perjalanan', Colors.blue),
            const SizedBox(height: 12),
            _buildSafetyAction(Icons.support_agent_rounded, 'Hubungi Rana Support', Colors.green),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildSafetyAction(IconData icon, String label, Color color) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.1)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color),
          const SizedBox(width: 16),
          Text(label, style: GoogleFonts.outfit(fontWeight: FontWeight.w600, fontSize: 15)),
          const Spacer(),
          const Icon(Icons.chevron_right, color: Colors.grey, size: 20),
        ],
      ),
    );
  }

  Widget _buildDraggableTripDetails(BuildContext context, DriverProvider prov, Map<String, dynamic> trip, String step) {
    return DraggableScrollableSheet(
      initialChildSize: 0.25,
      minChildSize: 0.25,
      maxChildSize: 0.6,
      builder: (context, scrollController) {
        return Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.1),
                blurRadius: 20,
                offset: const Offset(0, -5),
              )
            ],
          ),
          child: ListView(
            controller: scrollController,
            padding: EdgeInsets.zero,
            children: [
              const SizedBox(height: 12),
              Center(
                child: Container(
                  width: 40, height: 4,
                  decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    _buildNavigationProgress(step),
                    const SizedBox(height: 24),
                    _buildCustomerInfo(trip),
                    const SizedBox(height: 24),
                    _buildExecutionButton(prov, step),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildNavigationProgress(String step) {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Estimasi Tiba', style: TextStyle(color: Colors.grey.shade500, fontSize: 12, fontWeight: FontWeight.w600, letterSpacing: 1.1)),
                Text('14:35 WIB', style: GoogleFonts.outfit(fontSize: 22, fontWeight: FontWeight.w900, color: ThemeConfig.textPrimary)),
              ],
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                children: [
                   const Icon(Icons.speed_rounded, color: Colors.blue, size: 18),
                   const SizedBox(width: 6),
                   Text('45 km/jam', style: TextStyle(color: Colors.blue.shade700, fontWeight: FontWeight.bold, fontSize: 13)),
                ]
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Stack(
          children: [
            Container(height: 8, width: double.infinity, decoration: BoxDecoration(color: Colors.grey.shade200, borderRadius: BorderRadius.circular(4))),
            FractionallySizedBox(
              widthFactor: 0.3, // Simulated
              child: Container(
                height: 8,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [Colors.green, Colors.greenAccent]),
                  borderRadius: BorderRadius.circular(4))
              ).animate(onPlay: (controller) => controller.repeat()).shimmer(duration: 2.seconds, color: Colors.white54),
            ),
          ]
        ),
        const SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('8.2 km tersisa', style: TextStyle(fontSize: 13, color: Colors.grey.shade700, fontWeight: FontWeight.w600)),
            Text('15 mnt', style: TextStyle(fontSize: 13, color: Colors.grey.shade700, fontWeight: FontWeight.w600)),
          ],
        ),
      ],
    );
  }

  Widget _buildCustomerInfo(Map<String, dynamic> trip) {
    return Row(
      children: [
        Container(
          width: 60, height: 60,
          decoration: BoxDecoration(
            color: Colors.grey.shade100,
            borderRadius: BorderRadius.circular(20),
          ),
          child: const Icon(Icons.person_rounded, color: Colors.grey, size: 30),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(trip['customerName'] ?? 'Rana User', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(height: 4),
              Row(
                children: [
                  const Icon(Icons.star_rounded, color: Colors.amber, size: 16),
                  const SizedBox(width: 4),
                  Text('4.9', style: GoogleFonts.outfit(fontSize: 14, color: Colors.grey.shade600, fontWeight: FontWeight.w500)),
                  const SizedBox(width: 12),
                  const Icon(Icons.payments_rounded, color: Colors.green, size: 16),
                  const SizedBox(width: 4),
                  Text('Tunai', style: GoogleFonts.outfit(fontSize: 14, color: Colors.grey.shade600, fontWeight: FontWeight.w500)),
                ],
              ),
            ],
          ),
        ),
        _buildCircularAction(Icons.chat_bubble_rounded, Colors.blue),
        const SizedBox(width: 12),
        _buildCircularAction(Icons.phone_rounded, Colors.green),
      ],
    );
  }

  Widget _buildCircularAction(IconData icon, Color color, {VoidCallback? onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: color.withOpacity(0.05),
          shape: BoxShape.circle,
        ),
        child: Icon(icon, color: color, size: 22),
      ),
    );
  }

  Widget _buildExecutionButton(DriverProvider prov, String step) {
    String btnText = 'SAYA SUDAH SAMPAI';
    Color color = Colors.orange;
    
    if (step == 'ARRIVED_PICKUP') {
      btnText = 'MULAI PERJALANAN';
      color = Colors.blue;
    } else if (step == 'ON_TRIP') {
      btnText = 'SAMPAI DI TUJUAN';
      color = Colors.green;
    } else if (step == 'ARRIVED_DEST') {
      btnText = 'SELESAIKAN PESANAN';
      color = Colors.green.shade800;
    }

    return SizedBox(
      width: double.infinity,
      height: 60,
      child: ElevatedButton(
        onPressed: () {
          if (step == 'PICKUP') prov.updateTripStep('ARRIVED_PICKUP');
          else if (step == 'ARRIVED_PICKUP') prov.updateTripStep('ON_TRIP');
          else if (step == 'ON_TRIP') prov.updateTripStep('ARRIVED_DEST');
          else if (step == 'ARRIVED_DEST') prov.updateTripStep('COMPLETED');
        },
        style: ElevatedButton.styleFrom(
          backgroundColor: color,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
          elevation: 0,
        ),
        child: Text(btnText, style: GoogleFonts.outfit(fontWeight: FontWeight.w800, letterSpacing: 1.2)),
      ),
    ).animate(target: 1).shimmer(duration: 2000.ms);
  }
}

