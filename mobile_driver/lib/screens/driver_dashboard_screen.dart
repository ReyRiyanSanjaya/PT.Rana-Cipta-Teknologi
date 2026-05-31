import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mobile_driver/config/theme_config.dart';
import 'package:mobile_driver/providers/driver_provider.dart';
import 'package:mobile_driver/services/socket_service.dart';
import 'package:mobile_driver/screens/driver_trip_execution_screen.dart';
import 'package:mobile_driver/screens/driver_wallet_screen.dart';
import 'package:mobile_driver/screens/set_destination_screen.dart';
import 'package:mobile_driver/screens/community_hub_screen.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lottie/lottie.dart' hide Marker;
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:mobile_driver/screens/leaderboard_screen.dart';
import 'package:vibration/vibration.dart';
import 'package:carousel_slider/carousel_slider.dart';
import 'package:mobile_driver/widgets/glassmorphism_card.dart';
import 'package:mobile_driver/services/telematics_service.dart';
import 'package:mobile_driver/services/ai_voice_assistant.dart';
import 'package:mobile_driver/data/driver_api_service.dart';
import 'package:mobile_driver/screens/notifications_screen.dart';
import 'package:mobile_driver/widgets/new_order_overlay.dart';

class DriverDashboardScreen extends StatefulWidget {
  const DriverDashboardScreen({super.key});

  @override
  State<DriverDashboardScreen> createState() => _DriverDashboardScreenState();
}

class _DriverDashboardScreenState extends State<DriverDashboardScreen> with TickerProviderStateMixin {
  late ScrollController _scrollController;
  double _scrollOffset = 0;
  StreamSubscription? _orderStreamSub;

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController()
      ..addListener(() {
        setState(() {
          _scrollOffset = _scrollController.offset;
        });
      });

    // Initialize advanced safety and AI features
    TelematicsService().startMonitoring(context);
    AiVoiceAssistant().startListening((command) {
      if (!mounted) return;
      final prov = Provider.of<DriverProvider>(context, listen: false);
      if (command == 'ACCEPT_ORDER' && prov.activeRequests.isNotEmpty) {
        prov.acceptTrip(prov.activeRequests.first);
      } else if (command == 'REJECT_ORDER' && prov.activeRequests.isNotEmpty) {
        prov.rejectTrip(prov.activeRequests.first);
      }
    });

    // Listen for new orders and show modal notification
    _orderStreamSub = SocketService().newDriverOrderStream.listen((orderData) {
      if (!mounted) return;
      final prov = Provider.of<DriverProvider>(context, listen: false);
      if (prov.status != DriverStatus.online) return;
      if (prov.activeTrip != null) return;

      showNewOrderModal(
        context,
        orderData,
        onAccept: () => prov.acceptTrip(orderData),
        onReject: () => prov.rejectTrip(orderData),
      );
    });

    // Load heat map data
    _loadHotspots();
  }

  @override
  void dispose() {
    _orderStreamSub?.cancel();
    TelematicsService().stopMonitoring();
    AiVoiceAssistant().stopListening();
    _scrollController.dispose();
    super.dispose();
  }


  final List<LatLng> _heatPoints = [];
  final List<double> _surgeRates = [];

  void _loadHotspots() async {
    try {
      final hotspots = await DriverApiService().getHotspots();
      if (mounted && hotspots.isNotEmpty) {
        setState(() {
          _heatPoints.clear();
          _surgeRates.clear();
          for (final h in hotspots) {
            final lat = (h['lat'] as num?)?.toDouble();
            final lng = (h['lng'] as num?)?.toDouble();
            final surge = (h['surge'] as num?)?.toDouble() ?? 1.0;
            if (lat != null && lng != null) {
              _heatPoints.add(LatLng(lat, lng));
              _surgeRates.add(surge);
            }
          }
        });
      }
    } catch (_) {}
  }

  bool _tripScreenPushed = false;

  @override
  Widget build(BuildContext context) {
    final scale = ThemeConfig.tabletScale(context, mobile: 1.0);
    
    return Scaffold(
      backgroundColor: ThemeConfig.beigeBackground,
      body: Stack(
        children: [
          Consumer<DriverProvider>(
            builder: (context, prov, child) {
              if (prov.activeTrip != null && !_tripScreenPushed) {
                _tripScreenPushed = true;
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const DriverTripExecutionScreen())).then((_) {
                    _tripScreenPushed = false;
                  });
                });
              }
              if (prov.isOnline) return _buildBackgroundMap();
              return const SizedBox.shrink();
            },
          ),
          CustomScrollView(
            controller: _scrollController,
            physics: const BouncingScrollPhysics(),
            slivers: [
              _buildModernAppBar(scale),
              SliverToBoxAdapter(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
                  decoration: BoxDecoration(
                    color: ThemeConfig.beigeBackground,
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildSummaryStats(scale),
                      const SizedBox(height: 32),
                      _buildModernRequestSection(scale),
                      const SizedBox(height: 32),
                      _buildHistorySection(scale),
                      const SizedBox(height: 120),
                    ],
                  ),
                ),
              ),
            ],
          ),
          _buildFloatingOnlineToggle(scale),
        ],
      ),
    );
  }

  Widget _buildFloatingOnlineToggle(double scale) {
    return Positioned(
      bottom: 30,
      left: 24,
      right: 24,
      child: Selector<DriverProvider, bool>(
        selector: (_, prov) => prov.isOnline,
        builder: (context, isOnline, child) {
          return GestureDetector(
            onHorizontalDragEnd: (details) {
              final prov = Provider.of<DriverProvider>(context, listen: false);
              if (details.primaryVelocity! > 0 && !isOnline) {
                prov.toggleOnline();
                _playVibration();
              } else if (details.primaryVelocity! < 0 && isOnline) {
                prov.toggleOnline();
                _playVibration();
              }
            },
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 400),
              height: 80 * scale,
              decoration: BoxDecoration(
                color: isOnline ? Colors.white : Colors.grey.shade900,
                borderRadius: BorderRadius.circular(40),
                boxShadow: [
                  BoxShadow(
                    color: (isOnline ? Colors.green : Colors.black).withOpacity(0.3),
                    blurRadius: 20,
                    offset: const Offset(0, 10),
                  )
                ],
              ),
              child: Stack(
                children: [
                  Center(
                    child: Text(
                      isOnline ? 'GESER UNTUK OFFLINE' : 'GESER UNTUK ONLINE',
                      style: GoogleFonts.outfit(
                        color: isOnline ? Colors.green.shade700 : Colors.white70,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 2,
                        fontSize: 14 * scale,
                      ),
                    ),
                  ),
                  AnimatedPositioned(
                    duration: const Duration(milliseconds: 300),
                    left: isOnline ? null : 8,
                    right: isOnline ? 8 : null,
                    top: 8,
                    bottom: 8,
                    child: Container(
                      width: 64 * scale,
                      decoration: BoxDecoration(
                        color: isOnline ? Colors.green : Colors.white24,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        isOnline ? Icons.power_settings_new_rounded : Icons.arrow_forward_ios_rounded,
                        color: Colors.white,
                        size: 32 * scale,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ).animate().fadeIn(delay: 1.seconds).slideY(begin: 1);
        },
      ),
    );
  }

  void _playVibration() async {
    if (await Vibration.hasVibrator() ?? false) {
      Vibration.vibrate(duration: 100);
    }
  }

  Widget _buildSummaryStats(double scale) {
    return Consumer<DriverProvider>(
      builder: (context, prov, child) {
        return Row(
          children: [
            _buildStatCard('Trip', '${prov.completedTrips}', Icons.directions_bike_rounded, Colors.blue, scale),
            const SizedBox(width: 12),
            _buildStatCard('Rating', '${prov.rating}', Icons.star_rounded, Colors.amber, scale),
            const SizedBox(width: 12),
            _buildStatCard('XP', '${prov.xp}', Icons.bolt_rounded, Colors.purple, scale),
          ],
        );
      },
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon, Color color, double scale) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.02),
              blurRadius: 10,
              offset: const Offset(0, 4),
            )
          ],
        ),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 20 * scale),
            ),
            const SizedBox(height: 12),
            Text(value, style: GoogleFonts.outfit(fontSize: 18 * scale, fontWeight: FontWeight.bold)),
            Text(label, style: TextStyle(color: Colors.grey.shade500, fontSize: 11 * scale)),
          ],
        ),
      ),
    );
  }

  Widget _buildModernRequestSection(double scale) {
    return Consumer<DriverProvider>(
      builder: (context, prov, child) {
        if (!prov.isOnline) {
          return Center(
            child: Column(
              children: [
                const SizedBox(height: 40),
                Lottie.network('https://assets5.lottiefiles.com/packages/lf20_qpwbiyxf.json', height: 150),
                const SizedBox(height: 16),
                Text('Anda Sedang Offline', style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Text('Aktifkan mode online untuk menerima pesanan', 
                     textAlign: TextAlign.center,
                     style: TextStyle(color: Colors.grey.shade600)),
              ],
            ),
          );
        }

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('PESANAN TERSEDIA', 
                     style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.bold, letterSpacing: 1.2, color: Colors.grey.shade700)),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(color: Colors.green.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
                  child: const Text('LIVE', style: const TextStyle(color: Colors.green, fontSize: 10, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (prov.activeRequests.isEmpty)
              const Center(child: const Text('Belum ada pesanan masuk'))
            else
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: prov.activeRequests.length,
                itemBuilder: (context, index) {
                  final req = prov.activeRequests[index];
                  return _buildRequestCard(req, scale, prov);
                },
              ),
          ],
        );
      },
    );
  }

  Widget _buildRequestCard(Map<String, dynamic> req, double scale, DriverProvider prov) {
    final isRide = req['type'] == 'RIDE';
    final timeLeft = req['timeLeft'] as int;
    final isUrgent = timeLeft < 10;
    
    return GlassmorphismCard(
      blur: 15,
      opacity: Theme.of(context).brightness == Brightness.dark ? 0.3 : 0.8,
      child: Container(
        margin: const EdgeInsets.only(bottom: 20),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(32),
          boxShadow: [
            BoxShadow(
              color: ThemeConfig.brandColor.withOpacity(0.08),
              blurRadius: 24,
              offset: const Offset(0, 12),
            )
          ],
        ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(32),
        child: Column(
          children: [
            // Header with interactive countdown
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              color: isUrgent ? Colors.red.shade50 : Colors.blue.shade50,
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: isUrgent ? Colors.red : Colors.blue,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.timer_outlined, color: Colors.white, size: 16),
                  ).animate(onPlay: (controller) => controller.repeat(reverse: true))
                   .scale(begin: const Offset(0.8, 0.8), end: const Offset(1.2, 1.2), duration: 600.ms),
                  const SizedBox(width: 12),
                  Text(
                    'PESANAN BARU',
                    style: GoogleFonts.outfit(
                      color: isUrgent ? Colors.red : Colors.blue,
                      fontWeight: FontWeight.w800,
                      fontSize: 12,
                      letterSpacing: 1,
                    ),
                  ),
                  const Spacer(),
                  TweenAnimationBuilder<int>(
                    tween: IntTween(begin: 30, end: 0),
                    duration: const Duration(seconds: 30),
                    builder: (context, value, child) {
                      final bool isDanger = value < 10;
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: isDanger ? Colors.red : Colors.blue,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          '${value}s',
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                      ).animate(target: isDanger ? 1 : 0)
                       .shake(hz: 4, curve: Curves.easeInOut)
                       .scale(begin: const Offset(1, 1), end: const Offset(1.2, 1.2), duration: 500.ms)
                       .animate(onPlay: (controller) => controller.repeat(reverse: true))
                       .shimmer(duration: 1.seconds, color: Colors.white24);
                    },
                  ),
                ],
              ),
            ),
            
            Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: ThemeConfig.brandColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Icon(isRide ? Icons.directions_bike_rounded : Icons.fastfood_rounded, 
                                    color: ThemeConfig.brandColor, size: 28),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(isRide ? 'Rana Ride' : 'Rana Food/Delivery', 
                                 style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 18)),
                            Row(
                              children: [
                                const Icon(Icons.star_rounded, color: Colors.amber, size: 16),
                                const SizedBox(width: 4),
                                Text('${req['rating']} • ${req['customer']}', 
                                     style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                              ],
                            ),
                          ],
                        ),
                      ),
                      Text('Rp${ThemeConfig.formatCurrency((req['price'] as num).toDouble())}', 
                           style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.w900, color: ThemeConfig.brandColor)),
                    ],
                  ),
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 20),
                    child: Divider(height: 1, color: Colors.black12),
                  ),
                  _buildLocationRow(Icons.radio_button_checked_rounded, Colors.green, req['origin'] ?? req['originAddress'] ?? '-'),
                  const SizedBox(height: 16),
                  _buildLocationRow(Icons.location_on_rounded, Colors.red, req['destination'] ?? req['destAddress'] ?? '-'),
                  const SizedBox(height: 28),
                  Row(
                    children: [
                      Expanded(
                        child: TextButton(
                          onPressed: () => prov.rejectTrip(req),
                          style: TextButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 18),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                          ),
                          child: Text('ABAIKAN', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: Colors.grey.shade400)),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        flex: 2,
                        child: ElevatedButton(
                          onPressed: () => prov.acceptTrip(req),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: ThemeConfig.brandColor,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 18),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                            elevation: 8,
                            shadowColor: ThemeConfig.brandColor.withOpacity(0.4),
                          ),
                          child: Text('TERIMA PESANAN', style: GoogleFonts.outfit(fontWeight: FontWeight.w800, fontSize: 16)),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      ),
    ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.2, end: 0, curve: Curves.easeOutQuart);
  }

  Widget _buildLocationRow(IconData icon, Color color, String address) {
    return Row(
      children: [
        Icon(icon, color: color, size: 18),
        const SizedBox(width: 12),
        Expanded(
          child: Text(address, 
                      maxLines: 1, overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
        ),
      ],
    );
  }

  Widget _buildHistorySection(double scale) {
    return Consumer<DriverProvider>(
      builder: (context, prov, _) {
        return FutureBuilder<Map<String, dynamic>>(
          future: DriverApiService().getTripHistory(limit: 5),
          builder: (context, snapshot) {
            final trips = (snapshot.data?['trips'] as List<dynamic>?) ?? [];

            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('RIWAYAT TERAKHIR',
                    style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.bold, letterSpacing: 1.2, color: Colors.grey.shade700)),
                const SizedBox(height: 16),
                if (trips.isEmpty)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(28),
                    ),
                    child: Column(
                      children: [
                        Icon(Icons.history_rounded, size: 48, color: Colors.grey.shade300),
                        const SizedBox(height: 12),
                        Text('Belum ada riwayat trip',
                            style: TextStyle(color: Colors.grey.shade500, fontWeight: FontWeight.w500)),
                      ],
                    ),
                  )
                else
                  ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: trips.length,
                    itemBuilder: (context, index) {
                      final item = Map<String, dynamic>.from(trips[index]);
                      return _buildHistoryCard(item, scale);
                    },
                  ),
              ],
            );
          },
        );
      },
    );
  }

  Widget _buildHistoryCard(Map<String, dynamic> item, double scale) {
    final isRide = item['type'] == 'RIDE';
    final destination = item['destination'] ?? item['destAddress'] ?? 'Trip';
    final price = (item['price'] as num?)?.toDouble() ?? 0;
    final time = item['time'] ?? _formatTime(item['updatedAt'] ?? item['createdAt']);

    return GlassmorphismCard(
      blur: 10,
      opacity: Theme.of(context).brightness == Brightness.dark ? 0.2 : 0.9,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.02),
              blurRadius: 10,
              offset: const Offset(0, 4),
            )
          ],
        ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: (isRide ? Colors.blue : Colors.orange).withOpacity(0.1),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(isRide ? Icons.directions_bike_rounded : Icons.fastfood_rounded, 
                        color: isRide ? Colors.blue : Colors.orange, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(destination, 
                     style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14), 
                     maxLines: 1, overflow: TextOverflow.ellipsis),
                Text(time, style: const TextStyle(color: Color(0xFF9E9E9E), fontSize: 12)),
              ],
            ),
          ),
          Text('Rp${ThemeConfig.formatCurrency(price)}', 
               style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w700, color: ThemeConfig.textPrimary)),
        ],
      ),
      ),
    );
  }

  String _formatTime(dynamic dateValue) {
    if (dateValue == null) return '-';
    try {
      final dt = DateTime.parse(dateValue.toString()).toLocal();
      final hour = dt.hour.toString().padLeft(2, '0');
      final minute = dt.minute.toString().padLeft(2, '0');
      return '$hour:$minute';
    } catch (_) {
      return '-';
    }
  }

  Widget _buildBackgroundMap() {
    return Positioned.fill(
      child: Opacity(
        opacity: 0.5,
        child: FlutterMap(
          options: const MapOptions(
            initialCenter: LatLng(-6.2, 106.8),
            initialZoom: 14.0,
            interactionOptions: InteractionOptions(flags: InteractiveFlag.none),
          ),
          children: [
            TileLayer(
              urlTemplate: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
              subdomains: const ['a', 'b', 'c'],
            ),
            CircleLayer(
              circles: List.generate(_heatPoints.length, (index) {
                final rate = _surgeRates[index];
                Color surgeColor = rate >= 1.8 ? Colors.red : (rate >= 1.5 ? Colors.orange : Colors.yellow);
                return CircleMarker(
                  point: _heatPoints[index],
                  radius: 250,
                  useRadiusInMeter: true,
                  color: surgeColor.withOpacity(0.2),
                  borderColor: surgeColor.withOpacity(0.4),
                  borderStrokeWidth: 2,
                );
              }),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildModernAppBar(double scale) {
    return Consumer<DriverProvider>(
      builder: (context, driverProv, child) {
        final List<Widget> carouselItems = [
          _buildImageSliderItem('https://images.unsplash.com/photo-1593950315186-76a92975b60c?q=80&w=800&auto=format&fit=crop', 'Pendapatan Hari Ini', 'Rp${ThemeConfig.formatCurrency(driverProv.todayEarnings)}'),
          _buildImageSliderItem('https://images.unsplash.com/photo-1619451334792-150fd785ee74?q=80&w=800&auto=format&fit=crop', 'Trip Hari Ini', '${driverProv.todayTrips} Trip'),
          _buildImageSliderItem('https://images.unsplash.com/photo-1549463010-14ec32869353?q=80&w=800&auto=format&fit=crop', 'Rating Anda', '${driverProv.rating} ★'),
        ];

        return SliverAppBar(
          expandedHeight: 280 * scale,
          pinned: true,
          elevation: 0,
          backgroundColor: Color.lerp(ThemeConfig.brandColor, Colors.white, (_scrollOffset / 200).clamp(0.0, 1.0)),
          surfaceTintColor: Colors.transparent,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.vertical(
              bottom: Radius.circular(32 * (1 - (_scrollOffset / 200).clamp(0.0, 1.0))),
            ),
          ),
          flexibleSpace: FlexibleSpaceBar(
            background: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    ThemeConfig.brandColor,
                    ThemeConfig.brandColor.withOpacity(0.8),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                  child: Column(
                    children: [
                      _buildDailyTargetHeader(driverProv),
                      const Spacer(),
                      CarouselSlider(
                        items: carouselItems,
                        options: CarouselOptions(
                          height: 140 * scale,
                          enlargeCenterPage: true,
                          viewportFraction: 0.9,
                          autoPlay: true,
                          autoPlayInterval: const Duration(seconds: 5),
                        ),
                      ),
                      const Spacer(),
                      _buildPerformanceMiniRow(driverProv),
                    ],
                  ),
                ),
              ),
            ),
          ),
          leading: IconButton(
            icon: Icon(Icons.notifications_outlined, color: _scrollOffset > 150 ? Colors.black : Colors.white),
            onPressed: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const NotificationsScreen()));
            },
          ),
          actions: [
            IconButton(
              icon: Icon(Icons.settings_outlined, color: _scrollOffset > 150 ? Colors.black : Colors.white),
              onPressed: () {},
            ),
          ],
        );
      },
    );
  }

  Widget _buildImageSliderItem(String imageUrl, String label, String value) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        image: DecorationImage(
          image: NetworkImage(imageUrl),
          fit: BoxFit.cover,
          colorFilter: ColorFilter.mode(Colors.black.withOpacity(0.4), BlendMode.darken),
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.end,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label.toUpperCase(),
              style: GoogleFonts.outfit(
                color: Colors.white.withOpacity(0.8),
                fontSize: 10,
                letterSpacing: 1.5,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              value,
              style: GoogleFonts.outfit(
                color: Colors.white,
                fontSize: 24,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDailyTargetHeader(DriverProvider driverProv) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [Colors.amber, Colors.orange]),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text('LVL ${driverProv.level}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.1),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text('Auto-Bid', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                ),
                Switch(
                  value: driverProv.isAutoAcceptOn,
                  onChanged: (val) {
                    driverProv.toggleAutoAccept(val);
                  },
                  activeColor: Colors.green,
                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: 12),
        GestureDetector(
          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const LeaderboardScreen())),
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.15),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.leaderboard_outlined, color: Colors.white, size: 20),
          ),
        ),
      ],
    );
  }

  Widget _buildPerformanceMiniRow(DriverProvider driverProv) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: [
        _buildMiniMetric('Rating', driverProv.rating.toString(), Icons.star_rounded, Colors.amber),
        _buildMiniMetric('Accept', '${(driverProv.acceptanceRate * 100).toInt()}%', Icons.check_circle_rounded, Colors.blue),
      ],
    );
  }

  Widget _buildMiniMetric(String label, String value, IconData icon, Color color) {
    return Column(
      children: [
        Row(
          children: [
            Icon(icon, color: color, size: 14),
            const SizedBox(width: 4),
            Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
          ],
        ),
        Text(label, style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 10)),
      ],
    );
  }

  Widget _buildBalanceCard(double scale, DriverProvider driverProv) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.1),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            'PENDAPATAN HARI INI',
            style: GoogleFonts.outfit(
              fontSize: 11 * scale,
              color: Colors.white.withOpacity(0.7),
              letterSpacing: 1.5,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Rp${ThemeConfig.formatCurrency(driverProv.balance)}',
            style: GoogleFonts.outfit(
              fontSize: 36 * scale,
              fontWeight: FontWeight.w800,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTripsCard(double scale, DriverProvider driverProv) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.1),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            'TRIP HARI INI',
            style: GoogleFonts.outfit(
              fontSize: 11 * scale,
              color: Colors.white.withOpacity(0.7),
              letterSpacing: 1.5,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '${driverProv.completedTrips}',
            style: GoogleFonts.outfit(
              fontSize: 36 * scale,
              fontWeight: FontWeight.w800,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRatingCard(double scale, DriverProvider driverProv) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.1),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            'RATING ANDA',
            style: GoogleFonts.outfit(
              fontSize: 11 * scale,
              color: Colors.white.withOpacity(0.7),
              letterSpacing: 1.5,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.star_rounded, color: Colors.amber, size: 32 * scale),
              const SizedBox(width: 8),
              Text(
                '${driverProv.rating}',
                style: GoogleFonts.outfit(
                  fontSize: 36 * scale,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
