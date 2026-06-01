import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'package:rana_market/config/theme_config.dart';
import 'package:rana_market/data/market_api_service.dart';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:rana_market/screens/ride_order_tracking_screen.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'dart:ui';

class RideBookingScreen extends StatefulWidget {
  final String serviceType; // 'RIDE', 'CAR', 'SEND'

  const RideBookingScreen({super.key, required this.serviceType});

  @override
  State<RideBookingScreen> createState() => _RideBookingScreenState();
}

class _RideBookingScreenState extends State<RideBookingScreen> {
  final MapController _mapController = MapController();
  final DraggableScrollableController _sheetController = DraggableScrollableController();
  
  LatLng? _currentPosition;
  LatLng? _destinationPosition;
  bool _isLoadingLocation = true;
  bool _isBooking = false;
  String _selectedVehicle = 'RIDE'; // RIDE, CAR, SEND
  String _selectedPayment = 'RanaPay';
  String? _selectedPromo;
  Map<String, dynamic>? _priceData; // Dynamic pricing from server

  final TextEditingController _originCtrl = TextEditingController(text: 'Lokasi Anda Saat Ini');
  final TextEditingController _destCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _selectedVehicle = widget.serviceType;
    _determinePosition();
  }

  Future<void> _determinePosition() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) throw 'Layanan lokasi mati';

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) throw 'Izin ditolak';
      }

      Position pos = await Geolocator.getCurrentPosition();
      setState(() {
        _currentPosition = LatLng(pos.latitude, pos.longitude);
        _isLoadingLocation = false;
      });
      _mapController.move(_currentPosition!, 15);
    } catch (e) {
      if (mounted) {
        setState(() => _isLoadingLocation = false);
        // Default position if failed
        _currentPosition = const LatLng(-6.200000, 106.816666);
      }
    }
  }

  void _onMapTap(TapPosition tapPosition, LatLng point) {
    setState(() {
      _destinationPosition = point;
      _destCtrl.text = 'Titik Peta (${point.latitude.toStringAsFixed(4)}, ${point.longitude.toStringAsFixed(4)})';
    });
    _calculatePrice();
  }

  Future<void> _calculatePrice() async {
    if (_currentPosition == null || _destinationPosition == null) return;
    try {
      final result = await MarketApiService().calculateRidePrice(
        type: _selectedVehicle,
        originLat: _currentPosition!.latitude,
        originLng: _currentPosition!.longitude,
        destLat: _destinationPosition!.latitude,
        destLng: _destinationPosition!.longitude,
      );
      if (mounted && result.isNotEmpty) {
        setState(() => _priceData = result);
      }
    } catch (_) {}
  }

  double _getDynamicPrice(String type, double fallback) {
    if (_priceData == null || _destinationPosition == null) return fallback;
    // Simple multiplier based on type relative to the calculated price
    final basePrice = (_priceData!['price'] as num?)?.toDouble() ?? fallback;
    if (type == _selectedVehicle) return basePrice;
    // Approximate other types
    if (type == 'CAR') return basePrice * 2.5;
    if (type == 'SEND') return basePrice * 0.8;
    return basePrice;
  }

  Future<void> _submitBooking() async {
    if (_currentPosition == null || _destinationPosition == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Pilih lokasi tujuan di peta dahulu.')));
      return;
    }

    setState(() => _isBooking = true);

    try {
      final price = (_priceData?['price'] as num?)?.toDouble() ??
          (_selectedVehicle == 'CAR' ? 35000.0 : (_selectedVehicle == 'SEND' ? 12000.0 : 15000.0));

      final result = await MarketApiService().createServiceRequest(
        type: _selectedVehicle == 'CAR' ? 'RIDE' : _selectedVehicle,
        originLat: _currentPosition!.latitude,
        originLng: _currentPosition!.longitude,
        originAddress: _originCtrl.text,
        destLat: _destinationPosition!.latitude,
        destLng: _destinationPosition!.longitude,
        destAddress: _destCtrl.text,
        price: price,
        paymentMethod: 'CASH',
      );

      if (mounted) {
        setState(() => _isBooking = false);

        final orderData = {
          'id': result['id'],
          'type': _selectedVehicle,
          'originLat': _currentPosition!.latitude,
          'originLng': _currentPosition!.longitude,
          'originAddress': _originCtrl.text,
          'destLat': _destinationPosition!.latitude,
          'destLng': _destinationPosition!.longitude,
          'destAddress': _destCtrl.text,
          'price': price,
          'status': result['status'] ?? 'SEARCHING',
        };

        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => RideOrderTrackingScreen(orderData: orderData),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isBooking = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal memesan: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _isLoadingLocation 
        ? const Center(child: CircularProgressIndicator())
        : Stack(
            children: [
              // 1. Map Layer
              FlutterMap(
                mapController: _mapController,
                options: MapOptions(
                  initialCenter: _currentPosition ?? const LatLng(-6.2, 106.8),
                  initialZoom: 15.0,
                  onTap: _onMapTap,
                ),
                children: [
                  TileLayer(
                    urlTemplate: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
                    subdomains: const ['a', 'b', 'c'],
                  ),
                  if (_currentPosition != null && _destinationPosition != null)
                    PolylineLayer(
                      polylines: [
                        Polyline(
                          points: [_currentPosition!, _destinationPosition!],
                          color: ThemeConfig.brandColor.withOpacity(0.6),
                          strokeWidth: 4,
                          isDotted: true,
                        ),
                      ],
                    ),
                  MarkerLayer(
                    markers: [
                      if (_currentPosition != null)
                        Marker(
                          point: _currentPosition!,
                          width: 60, height: 60,
                          child: _buildLocationMarker(Icons.person_pin_circle, Colors.blue),
                        ),
                      if (_destinationPosition != null)
                        Marker(
                          point: _destinationPosition!,
                          width: 60, height: 60,
                          child: _buildLocationMarker(Icons.location_on, Colors.red),
                        ),
                    ],
                  ),
                ],
              ),

              // 2. Top Navigation Bar (Gojek style)
              _buildTopNavBar(),

              // 3. Draggable Booking Sheet
              _buildDraggableSheet(),
            ],
          ),
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
            boxShadow: [BoxShadow(color: Colors.black26, blurRadius: 10)],
          ),
          child: Icon(icon, color: color, size: 30),
        ),
        Container(
          width: 8, height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
      ],
    );
  }

  Widget _buildTopNavBar() {
    return Positioned(
      top: MediaQuery.of(context).padding.top + 16,
      left: 16, right: 16,
      child: Row(
        children: [
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle, boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 10)]),
              child: const Icon(Icons.arrow_back_rounded, color: Colors.black87),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: GestureDetector(
              onTap: () => _showLocationSearchOverlay(isDestination: true),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(30), boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 10)]),
                child: Row(
                  children: [
                    const Icon(Icons.search_rounded, color: Colors.grey, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _destCtrl.text.isEmpty ? 'Cari tujuan Anda...' : _destCtrl.text,
                        style: GoogleFonts.outfit(color: _destCtrl.text.isEmpty ? Colors.grey : Colors.black87, fontSize: 14),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showLocationSearchOverlay({required bool isDestination}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _LocationSearchOverlay(
        initialText: isDestination ? _destCtrl.text : _originCtrl.text,
        onSelected: (address, latLng) {
          setState(() {
            if (isDestination) {
              _destCtrl.text = address;
              _destinationPosition = latLng;
            } else {
              _originCtrl.text = address;
              _currentPosition = latLng;
            }
          });
          _mapController.move(latLng, 15);
          Navigator.pop(context);
        },
      ),
    );
  }

  Widget _buildDraggableSheet() {
    return DraggableScrollableSheet(
      controller: _sheetController,
      initialChildSize: 0.45,
      minChildSize: 0.45,
      maxChildSize: 0.9,
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
            boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 20, offset: Offset(0, -5))],
          ),
          child: ListView(
            controller: scrollController,
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            children: [
              Center(
                child: Container(
                  width: 40, height: 4,
                  decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
                ),
              ),
              const SizedBox(height: 24),
              
              // Location Details
              _buildLocationSummary(),
              const Divider(height: 32),

              // Vehicle Selection Section
              Text('Pilih Kendaraan', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              _buildVehicleOption('RIDE', 'RanaRide', 'Motor • Perjalanan cepat & hemat', _getDynamicPrice('RIDE', 15000)),
              _buildVehicleOption('CAR', 'RanaCar', 'Mobil • Nyaman & AC dingin', _getDynamicPrice('CAR', 35000)),
              _buildVehicleOption('SEND', 'RanaSend', 'Kurir • Kirim paket aman', _getDynamicPrice('SEND', 12000)),
              
              const SizedBox(height: 24),
              
              // Payment & Promo Section
              Row(
                children: [
                  _buildPaymentSelector(),
                  const Spacer(),
                  _buildPromoSelector(),
                ],
              ),
              
              const SizedBox(height: 24),
              
              // Booking Button
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: _isBooking ? null : _submitBooking,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: ThemeConfig.brandColor,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    elevation: 0,
                  ),
                  child: _isBooking 
                    ? const CircularProgressIndicator(color: Colors.white)
                    : Text('Pesan Sekarang', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16)),
                ),
              ),
              const SizedBox(height: 32),
            ],
          ),
        );
      },
    );
  }

  Widget _buildLocationSummary() {
    return Column(
      children: [
        GestureDetector(
          onTap: () => _showLocationSearchOverlay(isDestination: false),
          child: Row(
            children: [
              const Icon(Icons.my_location, color: Colors.blue, size: 20),
              const SizedBox(width: 12),
              Expanded(
                child: Text(_originCtrl.text, style: GoogleFonts.outfit(fontSize: 14, color: Colors.grey.shade700), maxLines: 1, overflow: TextOverflow.ellipsis),
              ),
              const Icon(Icons.edit_location_rounded, color: Colors.grey, size: 18),
            ],
          ),
        ),
        const SizedBox(height: 16),
        GestureDetector(
          onTap: () => _showLocationSearchOverlay(isDestination: true),
          child: Row(
            children: [
              const Icon(Icons.location_on, color: Colors.red, size: 20),
              const SizedBox(width: 12),
              Expanded(
                child: Text(_destCtrl.text.isEmpty ? 'Pilih tujuan di peta' : _destCtrl.text, 
                            style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.bold), maxLines: 1, overflow: TextOverflow.ellipsis),
              ),
              const Icon(Icons.edit_location_alt_rounded, color: Colors.grey, size: 20),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildVehicleOption(String id, String name, String desc, double basePrice) {
    bool isSelected = _selectedVehicle == id;
    return GestureDetector(
      onTap: () => setState(() => _selectedVehicle = id),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected ? ThemeConfig.brandColor.withOpacity(0.05) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: isSelected ? ThemeConfig.brandColor : Colors.grey.shade200, width: 2),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: isSelected ? ThemeConfig.brandColor : Colors.grey.shade100, borderRadius: BorderRadius.circular(14)),
              child: Icon(
                id == 'CAR' ? Icons.directions_car_rounded : (id == 'SEND' ? Icons.local_shipping_rounded : Icons.directions_bike_rounded),
                color: isSelected ? Colors.white : Colors.grey,
                size: 24,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(name, style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold)),
                  Text(desc, style: TextStyle(color: Colors.grey.shade600, fontSize: 11)),
                ],
              ),
            ),
            Text('Rp${ThemeConfig.formatCurrency(basePrice)}', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w800, color: Colors.black87)),
          ],
        ),
      ),
    );
  }

  Widget _buildPaymentSelector() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(color: Colors.grey.shade50, borderRadius: BorderRadius.circular(30), border: Border.all(color: Colors.grey.shade200)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.account_balance_wallet_rounded, color: Colors.green, size: 18),
          const SizedBox(width: 8),
          Text(_selectedPayment, style: GoogleFonts.outfit(fontSize: 13, fontWeight: FontWeight.bold)),
          const Icon(Icons.keyboard_arrow_down_rounded, color: Colors.grey, size: 18),
        ],
      ),
    );
  }

  Widget _buildPromoSelector() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(30), border: Border.all(color: Colors.red.shade100)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.confirmation_num_rounded, color: Colors.redAccent, size: 18),
          const SizedBox(width: 8),
          Text('Promo', style: GoogleFonts.outfit(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.redAccent)),
        ],
      ),
    );
  }
}

class _LocationSearchOverlay extends StatefulWidget {
  final String initialText;
  final Function(String, LatLng) onSelected;

  const _LocationSearchOverlay({required this.initialText, required this.onSelected});

  @override
  State<_LocationSearchOverlay> createState() => _LocationSearchOverlayState();
}

class _LocationSearchOverlayState extends State<_LocationSearchOverlay> {
  final TextEditingController _searchCtrl = TextEditingController();
  List<Map<String, dynamic>> _results = [];
  bool _isSearching = false;
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _searchCtrl.text = widget.initialText == 'Lokasi Anda Saat Ini' ? '' : widget.initialText;
    _searchCtrl.addListener(_onSearchChanged);
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchCtrl.dispose();
    super.dispose();
  }

  void _onSearchChanged() {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 500), () {
      _searchPlaces(_searchCtrl.text);
    });
  }

  Future<void> _searchPlaces(String query) async {
    if (query.trim().length < 3) {
      setState(() => _results = []);
      return;
    }

    setState(() => _isSearching = true);

    try {
      // Use Nominatim (OpenStreetMap) for free geocoding
      final dio = Dio();
      final response = await dio.get(
        'https://nominatim.openstreetmap.org/search',
        queryParameters: {
          'q': query,
          'format': 'json',
          'limit': 8,
          'countrycodes': 'id', // Indonesia
          'addressdetails': 1,
        },
        options: Options(headers: {'User-Agent': 'RanaMarket/1.0'}),
      );

      if (mounted) {
        final data = response.data as List<dynamic>;
        setState(() {
          _results = data.map<Map<String, dynamic>>((item) {
            return <String, dynamic>{
              'name': item['display_name']?.toString().split(',').first ?? '',
              'address': item['display_name'] ?? '',
              'lat': double.tryParse(item['lat']?.toString() ?? '') ?? 0.0,
              'lng': double.tryParse(item['lon']?.toString() ?? '') ?? 0.0,
            };
          }).toList();
          _isSearching = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isSearching = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.9,
      decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(32))),
      child: Column(
        children: [
          const SizedBox(height: 12),
          Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2))),
          Padding(
            padding: const EdgeInsets.all(24),
            child: Row(
              children: [
                GestureDetector(onTap: () => Navigator.pop(context), child: const Icon(Icons.close, color: Colors.black87)),
                const SizedBox(width: 16),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.grey.shade200)),
                    child: TextField(
                      controller: _searchCtrl,
                      autofocus: true,
                      decoration: const InputDecoration(hintText: 'Cari lokasi...', border: InputBorder.none, prefixIcon: Icon(Icons.search, size: 20)),
                    ),
                  ),
                ),
              ],
            ),
          ),
          if (_isSearching)
            const Padding(
              padding: EdgeInsets.all(16),
              child: Center(child: CircularProgressIndicator()),
            ),
          const Divider(height: 1),
          Expanded(
            child: _results.isEmpty && !_isSearching
                ? Center(
                    child: Text(
                      _searchCtrl.text.length < 3 ? 'Ketik minimal 3 huruf untuk mencari' : 'Tidak ditemukan',
                      style: TextStyle(color: Colors.grey.shade500),
                    ),
                  )
                : ListView.separated(
                    itemCount: _results.length,
                    separatorBuilder: (_, __) => const Divider(height: 1, indent: 70),
                    itemBuilder: (context, index) {
                      final item = _results[index];
                      return ListTile(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                        leading: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(color: Colors.blue.shade50, shape: BoxShape.circle),
                          child: const Icon(Icons.location_on, color: Colors.blue, size: 20),
                        ),
                        title: Text(item['name'], style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 15), maxLines: 1, overflow: TextOverflow.ellipsis),
                        subtitle: Text(item['address'], style: TextStyle(color: Colors.grey.shade600, fontSize: 12), maxLines: 2, overflow: TextOverflow.ellipsis),
                        onTap: () => widget.onSelected(item['name'], LatLng(item['lat'], item['lng'])),
                      );
                    },
                  ),
          ),
          // Set on map button
          Padding(
            padding: const EdgeInsets.all(24),
            child: SizedBox(
              width: double.infinity,
              height: 56,
              child: OutlinedButton.icon(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.map_rounded),
                label: Text('Pilih Lewat Peta', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
                style: OutlinedButton.styleFrom(
                  foregroundColor: ThemeConfig.brandColor,
                  side: BorderSide(color: ThemeConfig.brandColor),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
