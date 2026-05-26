import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:rana_market/config/theme_config.dart';
import 'package:rana_market/data/market_api_service.dart';
import 'package:rana_market/screens/store_detail_screen.dart';
import 'package:rana_market/screens/ar_explore_screen.dart';
import 'dart:ui';

class MapExploreScreen extends StatefulWidget {
  final double initialLat;
  final double initialLong;
  final List<dynamic> initialStores;

  const MapExploreScreen({
    super.key,
    required this.initialLat,
    required this.initialLong,
    required this.initialStores,
  });

  @override
  State<MapExploreScreen> createState() => _MapExploreScreenState();
}

class _MapExploreScreenState extends State<MapExploreScreen> {
  late MapController _mapController;
  late List<dynamic> _stores;
  late double _currentLat;
  late double _currentLong;
  double _radiusKm = 5.0;
  String _selectedCategory = 'Semua';
  List<String> _categories = ['Semua'];
  dynamic _selectedStore;
  final DraggableScrollableController _sheetController = DraggableScrollableController();

  @override
  void initState() {
    super.initState();
    _mapController = MapController();
    _stores = widget.initialStores;
    _currentLat = widget.initialLat;
    _currentLong = widget.initialLong;
    _extractCategories();
  }

  void _extractCategories() {
    final set = <String>{'Semua'};
    for (final store in widget.initialStores) {
      final cat = (store['category'] ?? '').toString().trim();
      if (cat.isNotEmpty) set.add(cat);
    }
    setState(() {
      _categories = set.toList()..sort((a, b) => a == 'Semua' ? -1 : (b == 'Semua' ? 1 : a.compareTo(b)));
    });
  }

  Future<void> _refreshStores() async {
    try {
      final newStores = await MarketApiService().getNearbyStores(
        _currentLat,
        _currentLong,
        radiusKm: _radiusKm,
      );
      setState(() {
        _stores = newStores;
        _extractCategories();
      });
    } catch (e) {
      debugPrint('Error refreshing stores: $e');
    }
  }

  List<dynamic> get _filteredStores {
    if (_selectedCategory == 'Semua') return _stores;
    return _stores.where((s) => s['category'] == _selectedCategory).toList();
  }

  void _onMarkerTap(dynamic store) {
    setState(() {
      _selectedStore = store;
    });
    _sheetController.animateTo(
      0.4,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOut,
    );
    _mapController.move(
      LatLng(
        (store['latitude'] ?? store['lat'] ?? 0).toDouble(),
        (store['longitude'] ?? store['long'] ?? store['lng'] ?? 0).toDouble(),
      ),
      15.0,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // Peta
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: LatLng(_currentLat, _currentLong),
              initialZoom: 14.0,
              onTap: (_, __) {
                if (_selectedStore != null) {
                  setState(() => _selectedStore = null);
                  _sheetController.animateTo(
                    0.0,
                    duration: const Duration(milliseconds: 300),
                    curve: Curves.easeOut,
                  );
                }
              },
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                subdomains: const ['a', 'b', 'c'],
              ),
              CircleLayer(
                circles: [
                  CircleMarker(
                    point: LatLng(_currentLat, _currentLong),
                    radius: _radiusKm * 1000, // in meters
                    useRadiusInMeter: true,
                    color: ThemeConfig.brandColor.withValues(alpha: 0.1),
                    borderColor: ThemeConfig.brandColor.withValues(alpha: 0.3),
                    borderStrokeWidth: 2,
                  ),
                ],
              ),
              MarkerLayer(
                markers: [
                  // Buyer Position Marker
                  Marker(
                    point: LatLng(_currentLat, _currentLong),
                    width: 40,
                    height: 40,
                    child: _buildPulseMarker(),
                  ),
                  // Store Markers
                  ..._filteredStores.map((store) {
                    final lat = (store['latitude'] ?? store['lat'] ?? 0).toDouble();
                    final lng = (store['longitude'] ?? store['long'] ?? store['lng'] ?? 0).toDouble();
                    return Marker(
                      point: LatLng(lat, lng),
                      width: 45,
                      height: 45,
                      child: GestureDetector(
                        onTap: () => _onMarkerTap(store),
                        child: _buildStoreMarker(store),
                      ),
                    );
                  }),
                ],
              ),
            ],
          ),

          // Header (Back button & Search info)
          Positioned(
            top: MediaQuery.of(context).padding.top + 10,
            left: 16,
            right: 16,
            child: _buildHeader(),
          ),

          // Top Controls (Category Filter)
          Positioned(
            top: MediaQuery.of(context).padding.top + 70,
            left: 0,
            right: 0,
            child: _buildCategoryFilter(),
          ),

          // Right Controls (Radius & GPS)
          Positioned(
            right: 16,
            bottom: 120,
            child: _buildRightControls(),
          ),

          // Store Detail Bottom Sheet
          _buildStoreDetailSheet(),
        ],
      ),
    );
  }

  Widget _buildPulseMarker() {
    return Stack(
      alignment: Alignment.center,
      children: [
        Container(
          width: 20,
          height: 20,
          decoration: BoxDecoration(
            color: Colors.blue.withValues(alpha: 0.3),
            shape: BoxShape.circle,
          ),
        ),
        Container(
          width: 12,
          height: 12,
          decoration: const BoxDecoration(
            color: Colors.blue,
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(color: Colors.black26, blurRadius: 4),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStoreMarker(dynamic store) {
    final isSelected = _selectedStore != null && _selectedStore['id'] == store['id'];
    return Column(
      children: [
        AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: isSelected ? ThemeConfig.brandColor : Colors.white,
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.2),
                blurRadius: 4,
                offset: const Offset(0, 2),
              ),
            ],
            border: Border.all(
              color: isSelected ? Colors.white : ThemeConfig.brandColor,
              width: 2,
            ),
          ),
          child: Icon(
            Icons.storefront,
            size: isSelected ? 24 : 20,
            color: isSelected ? Colors.white : ThemeConfig.brandColor,
          ),
        ),
        if (isSelected)
          Container(
            margin: const EdgeInsets.only(top: 2),
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: ThemeConfig.brandColor,
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(
              store['name'] ?? '',
              style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
            ),
          ),
      ],
    );
  }

  Widget _buildHeader() {
    return Row(
      children: [
        GestureDetector(
          onTap: () => Navigator.pop(context),
          child: _glassContainer(
            padding: const EdgeInsets.all(12),
            child: const Icon(Icons.arrow_back, color: ThemeConfig.textPrimary),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _glassContainer(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Jelajahi UMKM Terdekat',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
                Text(
                  '${_filteredStores.length} toko ditemukan',
                  style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCategoryFilter() {
    return SizedBox(
      height: 40,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        scrollDirection: Axis.horizontal,
        itemCount: _categories.length,
        itemBuilder: (context, index) {
          final cat = _categories[index];
          final isSelected = _selectedCategory == cat;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: GestureDetector(
              onTap: () => setState(() => _selectedCategory = cat),
              child: _glassContainer(
                color: isSelected ? ThemeConfig.brandColor : null,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Text(
                  cat,
                  style: TextStyle(
                    color: isSelected ? Colors.white : ThemeConfig.textPrimary,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                    fontSize: 12,
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildRightControls() {
    return Column(
      children: [
        // Radius Slider Vertical-ish
        _glassContainer(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Column(
            children: [
              const Icon(Icons.radar, size: 20, color: ThemeConfig.brandColor),
              const SizedBox(height: 4),
              Text('${_radiusKm.toInt()}km', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
              RotatedBox(
                quarterTurns: 3,
                child: Slider(
                  value: _radiusKm,
                  min: 1,
                  max: 20,
                  divisions: 19,
                  activeColor: ThemeConfig.brandColor,
                  onChanged: (v) => setState(() => _radiusKm = v),
                  onChangeEnd: (v) => _refreshStores(),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        GestureDetector(
          onTap: () async {
            final pos = await Geolocator.getCurrentPosition();
            _mapController.move(LatLng(pos.latitude, pos.longitude), 15.0);
            setState(() {
              _currentLat = pos.latitude;
              _currentLong = pos.longitude;
            });
            _refreshStores();
          },
          child: _glassContainer(
            padding: const EdgeInsets.all(12),
            child: const Icon(Icons.my_location, color: ThemeConfig.brandColor),
          ),
        ),
        const SizedBox(height: 12),
        GestureDetector(
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => ArExploreScreen(
                  userLat: _currentLat,
                  userLong: _currentLong,
                  stores: _filteredStores,
                ),
              ),
            );
          },
          child: _glassContainer(
            padding: const EdgeInsets.all(12),
            color: ThemeConfig.brandColor,
            child: const Icon(Icons.view_in_ar, color: Colors.white),
          ),
        ),
      ],
    );
  }

  Widget _buildStoreDetailSheet() {
    return DraggableScrollableSheet(
      controller: _sheetController,
      initialChildSize: 0.0,
      minChildSize: 0.0,
      maxChildSize: 0.4,
      builder: (context, scrollController) {
        if (_selectedStore == null) return const SizedBox.shrink();

        final store = _selectedStore!;
        final distance = (store['distance'] as num?)?.toDouble();
        final rating = (store['rating'] as num?)?.toDouble() ?? 0;
        final imgUrl = MarketApiService().resolveFileUrl(store['imageUrl']);

        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
            boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 10)],
          ),
          child: ListView(
            controller: scrollController,
            padding: const EdgeInsets.all(20),
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: CachedNetworkImage(
                      imageUrl: imgUrl,
                      width: 80,
                      height: 80,
                      fit: BoxFit.cover,
                      errorWidget: (_, __, ___) => Container(color: Colors.grey.shade200, child: const Icon(Icons.store)),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          store['name'] ?? '',
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(Icons.star, size: 16, color: ThemeConfig.colorRating),
                            const SizedBox(width: 4),
                            Text(rating.toStringAsFixed(1), style: const TextStyle(fontWeight: FontWeight.bold)),
                            const SizedBox(width: 8),
                            Text(store['category'] ?? '', style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Icon(Icons.location_on_outlined, size: 14, color: Colors.grey.shade500),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                store['address'] ?? '',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                              ),
                            ),
                            if (distance != null)
                              Text(' • ${distance.toStringAsFixed(1)} km', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => StoreDetailScreen(store: store)),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: ThemeConfig.brandColor,
                  foregroundColor: Colors.white,
                  minimumSize: const Size(double.infinity, 50),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: const Text('Buka Toko', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _glassContainer({required Widget child, EdgeInsetsGeometry? padding, Color? color}) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          padding: padding,
          decoration: BoxDecoration(
            color: color ?? Colors.white.withValues(alpha: 0.7),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
          ),
          child: child,
        ),
      ),
    );
  }
}
