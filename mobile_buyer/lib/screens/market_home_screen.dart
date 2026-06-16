import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:async';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:geolocator/geolocator.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:rana_market/config/theme_config.dart';
import 'package:rana_market/data/market_api_service.dart';
import 'package:rana_market/providers/market_cart_provider.dart';
import 'package:rana_market/providers/auth_provider.dart';
import 'package:rana_market/screens/market_cart_screen.dart';
import 'package:rana_market/screens/product_detail_screen.dart';
import 'package:rana_market/screens/store_detail_screen.dart';
import 'package:rana_market/screens/market_search_screen.dart';
import 'package:rana_market/screens/map_explore_screen.dart';
import 'package:rana_market/screens/chat_list_screen.dart';
import 'package:rana_market/screens/ride_booking_screen.dart';
import 'package:rana_market/screens/ppob_screen.dart';
import 'package:rana_market/screens/notifications_screen.dart';
import 'package:rana_market/screens/profile_screen.dart';
import 'package:rana_market/screens/login_screen.dart';
import 'package:rana_market/widgets/interactive_widgets.dart';
import 'package:rana_market/widgets/home_loading_skeleton.dart';
import 'dart:ui';
import 'package:cached_network_image/cached_network_image.dart';

class MarketHomeScreen extends StatefulWidget {
  const MarketHomeScreen({super.key});

  @override
  State<MarketHomeScreen> createState() => _MarketHomeScreenState();
}

class _MarketHomeScreenState extends State<MarketHomeScreen> {
  final _searchCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();

  List<dynamic> _announcements = [];
  List<dynamic> _flashSales = [];
  List<dynamic> _popularProducts = [];
  List<dynamic> _recommendations = [];
  List<dynamic> _nearbyStores = [];
  List<dynamic> _filteredStores = [];
  List<dynamic> _recentProducts = [];
  List<String> _availableStoreCategories = [];
  String _storeCategoryFilter = 'Semua';
  String _storeRatingFilter = 'Semua';
  String _storeSort = 'default';
  double _nearbyRadiusKm = 5;
  bool _isLoading = true;
  String _address = 'Memuat lokasi...';
  double _userLat = 0;
  double _userLong = 0;

  // RanaPay wallet
  double _walletBalance = 0;
  bool _walletLoading = true;
  bool _walletObscure = false;

  Timer? _timer;
  Duration _flashSaleDuration = Duration.zero;

  @override
  void initState() {
    super.initState();
    _loadData();
    _loadWalletBalance();
  }

  Future<void> _loadWalletBalance() async {
    try {
      final data = await MarketApiService().getBuyerWallet();
      final bal = (data['balance'] as num?)?.toDouble() ?? 0.0;
      if (mounted) setState(() { _walletBalance = bal; _walletLoading = false; });
    } catch (_) {
      if (mounted) setState(() { _walletLoading = false; });
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _scrollCtrl.dispose();
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    try {
      double lat = 0;
      double long = 0;
      String locName = 'Mencari lokasi...';

      try {
        final position = await _determinePosition();
        lat = position.latitude;
        long = position.longitude;
        locName = 'Lokasi Terdeteksi';
      } catch (e) {
        debugPrint('Location error: $e');
        locName = 'Lokasi Default';
      }

      final announcements = await MarketApiService().getAnnouncements();

      final flashSales =
          await MarketApiService().getFlashSaleProducts(lat, long);

      final popular = await MarketApiService().searchGlobal(
        lat: lat,
        long: long,
        sort: 'rating_desc',
        limit: 10,
      );
      final nearby =
          await MarketApiService().getNearbyStores(lat, long, radiusKm: _nearbyRadiusKm);
      
      final recentProducts = await _loadRecentProducts();

      final categorySet = <String>{};
      for (final store in nearby) {
        final raw = (store['category'] ?? '').toString().trim();
        if (raw.isNotEmpty) {
          categorySet.add(raw);
        }
      }

      final prefs = await SharedPreferences.getInstance();
      final phone = prefs.getString('user_phone') ?? '';
      final recommendations = await MarketApiService().getRecommendations(phone, lat: lat, long: long);

      if (mounted) {
        setState(() {
          _userLat = lat;
          _userLong = long;
          _announcements = announcements;
          _flashSales = flashSales;
          _popularProducts = popular;
          _recommendations = recommendations;
          _recentProducts = recentProducts;
          _nearbyStores = nearby;
          _availableStoreCategories = categorySet.toList()..sort();
          _storeCategoryFilter = 'Semua';
          _storeRatingFilter = 'Semua';
          _rebuildFilteredStores();
          _isLoading = false;
          _address = locName;
          _startTimer();
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
      debugPrint('Error loading home: $e');
    }
  }

  Future<List<dynamic>> _loadRecentProducts() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      const key = 'buyer_recent_products_v1';
      final ids = prefs.getStringList(key) ?? <String>[];
      if (ids.isEmpty) return [];

      final List<dynamic> products = [];
      for (final id in ids.take(10)) {
        try {
          final p = await MarketApiService().getProduct(id);
          products.add(p);
        } catch (e) {
          debugPrint('Error loading recent product: $e');
        }
      }
      return products;
    } catch (e) {
      return [];
    }
  }

  void _rebuildFilteredStores() {
    _filteredStores = _nearbyStores.where((store) {
      if (_storeCategoryFilter != 'Semua') {
        final cat = (store['category'] ?? '').toString().trim();
        if (cat != _storeCategoryFilter) return false;
      }
      final rating = (store['rating'] as num?)?.toDouble() ?? 0;
      if (_storeRatingFilter == '4+') {
        if (rating < 4) return false;
      } else if (_storeRatingFilter == '4.5+') {
        if (rating < 4.5) return false;
      }
      return true;
    }).toList();
    _applyStoreSorting();
  }

  void _applyStoreSorting() {
    if (_storeSort == 'rating_desc') {
      _filteredStores.sort((a, b) {
        final ra = (a['rating'] ?? 0) as num;
        final rb = (b['rating'] ?? 0) as num;
        return rb.compareTo(ra);
      });
    }
  }

  Future<Position> _determinePosition() async {
    bool serviceEnabled;
    LocationPermission permission;

    // Test if location services are enabled.
    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return Future.error('Layanan lokasi tidak aktif.');
    }

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        return Future.error('Izin lokasi ditolak.');
      }
    }

    if (permission == LocationPermission.deniedForever) {
      return Future.error('Izin lokasi ditolak permanen. Cek pengaturan.');
    }

    return await Geolocator.getCurrentPosition();
  }

  void _startTimer() {
    if (_flashSales.isEmpty) return;

    // Find the earliest end time
    DateTime? earliestEnd;
    for (final sale in _flashSales) {
      final endAtStr = sale['flashSaleEndAt'];
      if (endAtStr != null) {
        final endAt = DateTime.tryParse(endAtStr);
        if (endAt != null && endAt.isAfter(DateTime.now())) {
          if (earliestEnd == null || endAt.isBefore(earliestEnd)) {
            earliestEnd = endAt;
          }
        }
      }
    }

    if (earliestEnd == null) return;

    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      final now = DateTime.now();
      if (now.isAfter(earliestEnd!)) {
        timer.cancel();
        setState(() {
          _flashSaleDuration = Duration.zero;
        });
      } else {
        setState(() {
          _flashSaleDuration = earliestEnd!.difference(now);
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final isGuest = !auth.isAuthenticated;
    return Scaffold(
      backgroundColor: const Color(0xFFF5F6FA),
      body: CustomScrollView(
        controller: _scrollCtrl,
        physics: const BouncingScrollPhysics(),
        slivers: [
          _buildAppBar(),
          if (_isLoading)
            const SliverFillRemaining(child: HomeLoadingSkeleton())
          else ...[
            SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (isGuest) _buildGuestBanner() else _buildWalletCard(),
                  _buildSuperAppGrid(),
                  if (_announcements.isNotEmpty) _buildAnnouncements(),
                  _buildSectionHeader(
                    'Produk Populer',
                    Icons.local_fire_department_rounded,
                    onSeeAll: () => Navigator.push(context,
                        MaterialPageRoute(builder: (_) => const MarketSearchScreen())),
                  ),
                ],
              ),
            ),
            // Grid produk 2 kolom penuh seperti marketplace
            _buildProductSliverGrid(_popularProducts),
            if (_flashSales.isNotEmpty) ...[
              SliverToBoxAdapter(
                child: _buildSectionHeader(
                  'Flash Sale',
                  Icons.flash_on_rounded,
                  onSeeAll: null,
                  badge: _buildFlashSaleTimer(),
                ),
              ),
              _buildProductSliverGrid(_flashSales, isFlashSale: true),
            ],
            if (_recommendations.isNotEmpty) ...[
              SliverToBoxAdapter(
                child: _buildSectionHeader(
                  'Rekomendasi Untukmu',
                  Icons.auto_awesome_rounded,
                  onSeeAll: null,
                ),
              ),
              _buildProductSliverGrid(_recommendations),
            ],
            SliverToBoxAdapter(
              child: _buildSectionHeader('Toko Terdekat', Icons.store_rounded, onSeeAll: null),
            ),
            _buildNearbyStoresList(),
            const SliverToBoxAdapter(child: SizedBox(height: 110)),
          ],
        ],
      ),
    );
  }

  // Banner login untuk guest
  Widget _buildGuestBanner() {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 4),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: ThemeConfig.brandColor.withOpacity(0.07),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: ThemeConfig.brandColor.withOpacity(0.18)),
      ),
      child: Row(
        children: [
          const Icon(Icons.person_outline_rounded,
              color: ThemeConfig.brandColor, size: 22),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Masuk untuk pengalaman belanja lebih baik',
              style: GoogleFonts.outfit(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: ThemeConfig.textPrimary,
              ),
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const LoginScreen()),
            ),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
              decoration: BoxDecoration(
                color: ThemeConfig.brandColor,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                'Masuk',
                style: GoogleFonts.outfit(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // Grid produk 2 kolom sebagai Sliver (full width)
  Widget _buildProductSliverGrid(List<dynamic> products,
      {bool isFlashSale = false}) {
    if (products.isEmpty) return const SliverToBoxAdapter(child: SizedBox.shrink());
    final items = products.take(8).toList();
    return SliverPadding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      sliver: SliverGrid(
        delegate: SliverChildBuilderDelegate(
          (context, i) {
            final item = items[i] as Map;
            return _buildProductCard(item, isFlashSale: isFlashSale, index: i);
          },
          childCount: items.length,
        ),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          crossAxisSpacing: 10,
          mainAxisSpacing: 10,
          childAspectRatio: 0.72,
        ),
      ),
    );
  }

  Widget _buildProductCard(Map item,
      {bool isFlashSale = false, int index = 0}) {
    final name = item['name']?.toString() ?? '';
    final price = (item['sellingPrice'] as num?)?.toDouble() ??
        (item['price'] as num?)?.toDouble() ?? 0;
    final originalPrice = (item['originalPrice'] as num?)?.toDouble();
    final imgUrl = MarketApiService().resolveFileUrl(item['imageUrl']);
    final discPct =
        isFlashSale ? (item['discountPercentage'] as num?)?.toInt() ?? 0 : 0;
    final rating = (item['rating'] as num?)?.toDouble();
    final sold = item['soldCount'] ?? item['sold'];

    return GestureDetector(
      onTap: () => Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => ProductDetailScreen(
            product: Map<String, dynamic>.from(item),
            storeId: item['storeId']?.toString() ?? '',
            storeName: item['storeName']?.toString() ?? '',
            storeAddress: item['storeAddress']?.toString(),
            storeLat: (item['storeLat'] as num?)?.toDouble(),
            storeLong: (item['storeLong'] as num?)?.toDouble(),
          ),
        ),
      ),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 8,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Gambar produk
            Stack(
              children: [
                ClipRRect(
                  borderRadius:
                      const BorderRadius.vertical(top: Radius.circular(12)),
                  child: imgUrl.isNotEmpty
                      ? CachedNetworkImage(
                          imageUrl: imgUrl,
                          width: double.infinity,
                          height: 130,
                          fit: BoxFit.cover,
                          errorWidget: (_, __, ___) =>
                              _productPlaceholder(height: 130),
                        )
                      : _productPlaceholder(height: 130),
                ),
                if (discPct > 0)
                  Positioned(
                    top: 6, left: 6,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE63946),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text('$discPct%',
                          style: const TextStyle(
                              color: Colors.white,
                              fontSize: 9,
                              fontWeight: FontWeight.w900)),
                    ),
                  ),
              ],
            ),
            // Info produk
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 7, 8, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.outfit(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: ThemeConfig.textPrimary,
                      height: 1.3,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Rp ${ThemeConfig.formatCurrency(price)}',
                    style: GoogleFonts.outfit(
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                      color: ThemeConfig.brandColor,
                    ),
                  ),
                  if (originalPrice != null && originalPrice > price) ...[
                    const SizedBox(height: 1),
                    Text(
                      'Rp ${ThemeConfig.formatCurrency(originalPrice)}',
                      style: GoogleFonts.outfit(
                        fontSize: 10,
                        color: Colors.grey.shade400,
                        decoration: TextDecoration.lineThrough,
                      ),
                    ),
                  ],
                  if (rating != null || sold != null) ...[
                    const SizedBox(height: 5),
                    Row(
                      children: [
                        if (rating != null) ...[
                          const Icon(Icons.star_rounded,
                              size: 12, color: Color(0xFFFFB800)),
                          const SizedBox(width: 2),
                          Text(rating.toStringAsFixed(1),
                              style: GoogleFonts.outfit(
                                  fontSize: 10, color: Colors.grey.shade600)),
                        ],
                        if (rating != null && sold != null)
                          const SizedBox(width: 6),
                        if (sold != null)
                          Text('Terjual $sold',
                              style: GoogleFonts.outfit(
                                  fontSize: 10, color: Colors.grey.shade500)),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    ).animate().fadeIn(delay: (40 * index).ms);
  }

  Widget _productPlaceholder({double height = 130}) {
    return Container(
      width: double.infinity,
      height: height,
      color: ThemeConfig.brandColor.withOpacity(0.06),
      child: Icon(Icons.image_outlined,
          size: 28, color: ThemeConfig.brandColor.withOpacity(0.25)),
    );
  }

  Widget _buildSectionHeader(String title, IconData icon,
      {VoidCallback? onSeeAll, Widget? badge}) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 10),
      child: Row(
        children: [
          Container(
            width: 28, height: 28,
            decoration: BoxDecoration(
              color: ThemeConfig.brandColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 16, color: ThemeConfig.brandColor),
          ),
          const SizedBox(width: 8),
          Text(
            title,
            style: GoogleFonts.outfit(
              fontSize: 15,
              fontWeight: FontWeight.w800,
              color: ThemeConfig.textPrimary,
            ),
          ),
          if (badge != null) ...[const SizedBox(width: 8), badge],
          const Spacer(),
          if (onSeeAll != null)
            GestureDetector(
              onTap: onSeeAll,
              child: Text(
                'Lihat Semua',
                style: GoogleFonts.outfit(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: ThemeConfig.brandColor,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildFlashSaleTimer() {
    if (_flashSaleDuration == Duration.zero) return const SizedBox.shrink();
    final h = _flashSaleDuration.inHours.toString().padLeft(2, '0');
    final m = (_flashSaleDuration.inMinutes % 60).toString().padLeft(2, '0');
    final s = (_flashSaleDuration.inSeconds % 60).toString().padLeft(2, '0');
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: const Color(0xFFE63946),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        '$h:$m:$s',
        style: GoogleFonts.outfit(
          fontSize: 11,
          fontWeight: FontWeight.w800,
          color: Colors.white,
          letterSpacing: 1,
        ),
      ),
    );
  }

  Widget _buildAppBar() {
    final topPadding = MediaQuery.of(context).padding.top;
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final isGuest = !auth.isAuthenticated;

    return SliverPersistentHeader(
      pinned: true,
      delegate: _HomeAppBarDelegate(
        topPadding: topPadding,
        address: _address,
        isGuest: isGuest,
        onSearchTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const MarketSearchScreen()),
          );
        },
        onNotifTap: () {
          if (isGuest) {
            Navigator.push(context, MaterialPageRoute(builder: (_) => const LoginScreen()));
            return;
          }
          Navigator.of(context, rootNavigator: true).push(
            MaterialPageRoute(builder: (_) => const NotificationsScreen()),
          );
        },
        onChatTap: () {
          if (isGuest) {
            Navigator.push(context, MaterialPageRoute(builder: (_) => const LoginScreen()));
            return;
          }
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const ChatListScreen()),
          );
        },
        onCartTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const MarketCartScreen()),
          );
        },
        onAvatarTap: () {
          if (isGuest) {
            Navigator.push(context, MaterialPageRoute(builder: (_) => const LoginScreen()));
          } else {
            Navigator.of(context, rootNavigator: true).push(
              MaterialPageRoute(builder: (_) => const ProfileScreen()),
            );
          }
        },
      ),
    );
  }

  Widget _buildStories() {
    final scale = ThemeConfig.tabletScale(context, mobile: 1.0);
    final List<Map<String, dynamic>> stories = [
      {'name': 'Promo', 'icon': Icons.local_offer_rounded, 'gradient': [const Color(0xFFE63946), const Color(0xFFFF6B6B)]},
      {'name': 'Baru', 'icon': Icons.new_releases_rounded, 'gradient': [const Color(0xFF457B9D), const Color(0xFF4FACFE)]},
      {'name': 'Top', 'icon': Icons.star_rounded, 'gradient': [const Color(0xFFFFB800), const Color(0xFFFEE140)]},
      {'name': 'Kilat', 'icon': Icons.flash_on_rounded, 'gradient': [const Color(0xFFF4A261), const Color(0xFFFC4A1A)]},
      {'name': 'Voucher', 'icon': Icons.confirmation_num_rounded, 'gradient': [const Color(0xFF43E97B), const Color(0xFF38F9D7)]},
      {'name': 'Gajian', 'icon': Icons.account_balance_wallet_rounded, 'gradient': [const Color(0xFF667EEA), const Color(0xFF764BA2)]},
    ];

    return Container(
      height: 112 * scale,
      margin: const EdgeInsets.symmetric(vertical: 12),
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        scrollDirection: Axis.horizontal,
        itemCount: stories.length,
        itemBuilder: (context, index) {
          final story = stories[index];
          final gradients = story['gradient'] as List<Color>;
          return Padding(
            padding: const EdgeInsets.only(right: 18),
            child: PressScaleButton(
              onTap: () {
                HapticFeedback.mediumImpact();
                PremiumToast.show(
                  context,
                  message: '${story['name']} — Segera hadir!',
                  icon: story['icon'] as IconData,
                  gradient: gradients,
                );
              },
              child: Column(
                children: [
                  Container(
                    width: 68 * scale,
                    height: 68 * scale,
                    padding: const EdgeInsets.all(3),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: LinearGradient(colors: gradients),
                      boxShadow: [
                        BoxShadow(color: gradients.first.withOpacity(0.35), blurRadius: 10, offset: const Offset(0, 4)),
                      ],
                    ),
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                      ),
                      child: Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(colors: gradients.map((c) => c.withOpacity(0.15)).toList()),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          story['icon'] as IconData,
                          color: gradients.first,
                          size: 26 * scale,
                        ),
                      ),
                    ),
                  ).animate(onPlay: (c) => c.repeat(reverse: true)).scale(
                    begin: const Offset(1.0, 1.0),
                    end: const Offset(1.06, 1.06),
                    duration: 2200.ms,
                    delay: (300 * index).ms,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    story['name'] as String,
                    style: GoogleFonts.poppins(
                      fontSize: 11 * scale,
                      fontWeight: FontWeight.w700,
                      color: ThemeConfig.textPrimary,
                    ),
                  ),
                ],
              ),
            ),
          ).animate().fadeIn(delay: (80 * index).ms).slideX(begin: 0.3, curve: Curves.easeOutBack);
        },
      ),
    );
  }

  Widget _buildSmartAiWidget() {
    final scale = ThemeConfig.tabletScale(context, mobile: 1.0);
    final hour = DateTime.now().hour;
    String greeting = 'Pagi';
    String suggestion = 'Sarapan apa hari ini?';
    IconData suggestIcon = Icons.wb_sunny_rounded;

    if (hour >= 11 && hour < 15) {
      greeting = 'Siang';
      suggestion = 'Makan siang enak di RanaFood?';
      suggestIcon = Icons.restaurant_rounded;
    } else if (hour >= 15 && hour < 19) {
      greeting = 'Sore';
      suggestion = 'Waktunya camilan sore!';
      suggestIcon = Icons.coffee_rounded;
    } else if (hour >= 19 || hour < 4) {
      greeting = 'Malam';
      suggestion = 'Lapar malam-malam?';
      suggestIcon = Icons.nightlight_round;
    }

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(
            color: ThemeConfig.brandColor.withOpacity(0.08),
            blurRadius: 20,
            offset: const Offset(0, 10),
          )
        ],
        border: Border.all(color: ThemeConfig.brandColor.withOpacity(0.1)),
      ),
      child: Row(
        children: [
          Stack(
            alignment: Alignment.center,
            children: [
              Container(
                width: 54 * scale,
                height: 54 * scale,
                decoration: BoxDecoration(
                  color: ThemeConfig.brandColor.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
              ).animate(onPlay: (c) => c.repeat()).scale(
                    begin: const Offset(0.8, 0.8),
                    end: const Offset(1.2, 1.2),
                    duration: 1.5.seconds,
                  ).fade(begin: 0.5, end: 0.2),
              Container(
                width: 44 * scale,
                height: 44 * scale,
                decoration: const BoxDecoration(
                  color: ThemeConfig.brandColor,
                  shape: BoxShape.circle,
                ),
                child: Icon(suggestIcon, color: Colors.white, size: 22 * scale),
              ),
            ],
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Halo $greeting, Riyan!',
                  style: GoogleFonts.outfit(
                    fontSize: 15 * scale,
                    fontWeight: FontWeight.w800,
                    color: ThemeConfig.textPrimary,
                  ),
                ),
                Text(
                  suggestion,
                  style: GoogleFonts.outfit(
                    fontSize: 12 * scale,
                    color: ThemeConfig.textSecondary.withOpacity(0.7),
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: ThemeConfig.brandColor.withOpacity(0.05),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(
              Icons.auto_awesome_rounded,
              color: ThemeConfig.brandColor,
              size: 18,
            ),
          ).animate(onPlay: (c) => c.repeat()).shimmer(duration: 2.seconds),
        ],
      ),
    ).animate().fadeIn().slideY(begin: 0.1);
  }

  Widget _buildWalletCard() {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final userName = (auth.user?['name'] ?? '').toString().trim();
    final firstName = userName.isNotEmpty ? userName.split(' ').first : 'Kamu';
    final hour = DateTime.now().hour;
    final greeting = hour < 11
        ? 'Selamat pagi'
        : hour < 15
            ? 'Selamat siang'
            : hour < 18
                ? 'Selamat sore'
                : 'Selamat malam';

    final balanceText = _walletLoading
        ? '...'
        : _walletObscure
            ? '••••••••'
            : 'Rp ${ThemeConfig.formatCurrency(_walletBalance)}';

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 4),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [ThemeConfig.brandColor, Color(0xFFFF9A7A)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: ThemeConfig.brandColor.withOpacity(0.35),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Greeting row
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '$greeting, $firstName 👋',
                      style: GoogleFonts.outfit(
                        color: Colors.white.withOpacity(0.9),
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Saldo RanaPay',
                      style: GoogleFonts.outfit(
                        color: Colors.white.withOpacity(0.75),
                        fontSize: 11,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
              ),
              GestureDetector(
                onTap: () => setState(() => _walletObscure = !_walletObscure),
                child: Icon(
                  _walletObscure ? Icons.visibility_off_rounded : Icons.visibility_rounded,
                  color: Colors.white.withOpacity(0.8),
                  size: 18,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          // Balance
          Text(
            balanceText,
            style: GoogleFonts.outfit(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.w900,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 14),
          // Action buttons
          Row(
            children: [
              _walletActionChip(Icons.qr_code_scanner_rounded, 'Bayar'),
              const SizedBox(width: 8),
              _walletActionChip(Icons.add_rounded, 'Top Up'),
              const SizedBox(width: 8),
              _walletActionChip(Icons.history_rounded, 'Riwayat'),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.18),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.stars_rounded, color: Colors.amber, size: 13),
                    const SizedBox(width: 4),
                    Text('Poin',
                        style: GoogleFonts.outfit(
                            color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    ).animate().fadeIn().slideY(begin: 0.05);
  }

  Widget _walletActionChip(IconData icon, String label) {
    return GestureDetector(
      onTap: () => ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('$label segera hadir'),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      ),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.2),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: Colors.white.withOpacity(0.15)),
        ),
        child: Row(
          children: [
            Icon(icon, color: Colors.white, size: 13),
            const SizedBox(width: 4),
            Text(label,
                style: GoogleFonts.outfit(
                    color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }

  Widget _buildWalletQuickAction(IconData icon, String label, double scale) {
    return Column(
      children: [
        Container(
          width: 50 * scale,
          height: 50 * scale,
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.2),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.white.withOpacity(0.1)),
          ),
          child: Icon(icon, color: Colors.white, size: 24 * scale),
        ),
        const SizedBox(height: 6),
        Text(
          label,
          style: GoogleFonts.outfit(
            color: Colors.white,
            fontSize: 10 * scale,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }

  Widget _buildWalletActionBtn(IconData icon, String label, double scale) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.2),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.white.withOpacity(0.1)),
          ),
          child: Icon(icon, color: Colors.white, size: 20 * scale),
        ),
        const SizedBox(height: 4),
        Text(label, style: GoogleFonts.outfit(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
      ],
    );
  }

  Widget _buildWalletInfoItem(IconData icon, String label, Color color, double scale) {
    return Row(
      children: [
        Icon(icon, color: color, size: 16 * scale),
        const SizedBox(width: 6),
        Text(label, 
            style: GoogleFonts.outfit(
              color: Colors.black87, 
              fontSize: 12 * scale,
              fontWeight: FontWeight.w600
            )),
      ],
    );
  }

  Widget _buildMiniStat(IconData icon, String label, double scale) {
    return Row(
      children: [
        Icon(icon, color: Colors.white.withOpacity(0.6), size: 14 * scale),
        const SizedBox(width: 6),
        Text(label, 
            style: GoogleFonts.outfit(
              color: Colors.white.withOpacity(0.9), 
              fontSize: 11 * scale,
              fontWeight: FontWeight.w600
            )),
      ],
    );
  }

  Widget _buildWalletActionButton(IconData icon, String label, double scale) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.15),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(icon, color: Colors.white, size: 16 * scale),
          const SizedBox(width: 6),
          Text(label, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11)),
        ],
      ),
    );
  }

  Widget _buildWalletAction(IconData icon, String label, double scale) {
    return GestureDetector(
      onTap: () {
         ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Fitur $label akan segera hadir.')));
      },
      child: Column(
        children: [
          Icon(icon, color: ThemeConfig.brandColor, size: 22 * scale),
          SizedBox(height: 6 * scale),
          Text(label, style: TextStyle(fontSize: 11 * scale, fontWeight: FontWeight.w600, color: Colors.grey.shade700)),
        ],
      ),
    );
  }

  Widget _buildSuperAppGrid() {
    final List<Map<String, dynamic>> services = [
      {'icon': Icons.motorcycle_rounded,    'label': 'RanaRide', 'color': const Color(0xFF00AA13)},
      {'icon': Icons.restaurant_rounded,    'label': 'RanaFood', 'color': const Color(0xFFEE2737)},
      {'icon': Icons.local_shipping_rounded,'label': 'RanaSend', 'color': const Color(0xFF00AED6)},
      {'icon': Icons.shopping_bag_rounded,  'label': 'RanaMart', 'color': const Color(0xFFF06400)},
      {'icon': Icons.phone_android_rounded, 'label': 'Pulsa',    'color': const Color(0xFF005EB8)},
      {'icon': Icons.flash_on_rounded,      'label': 'Tagihan',  'color': const Color(0xFFFFB000)},
      {'icon': Icons.map_rounded,           'label': 'Jelajah',  'color': const Color(0xFF6C63FF)},
      {'icon': Icons.grid_view_rounded,     'label': 'Lainnya',  'color': Colors.blueGrey},
    ];

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 4),
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 12, offset: const Offset(0, 4)),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: services.map((item) {
          final color = item['color'] as Color;
          return GestureDetector(
            onTap: () {
              HapticFeedback.lightImpact();
              final label = item['label'] as String;
              if (label == 'RanaRide') {
                Navigator.push(context, MaterialPageRoute(builder: (_) => const RideBookingScreen(serviceType: 'RIDE')));
              } else if (label == 'RanaSend') {
                Navigator.push(context, MaterialPageRoute(builder: (_) => const RideBookingScreen(serviceType: 'SEND')));
              } else if (label == 'Pulsa' || label == 'Tagihan') {
                Navigator.push(context, MaterialPageRoute(builder: (_) => const PpobScreen()));
              } else if (label == 'Jelajah') {
                Navigator.push(context, MaterialPageRoute(builder: (_) => MapExploreScreen(
                  initialLat: _userLat, initialLong: _userLong, initialStores: _nearbyStores)));
              } else {
                PremiumToast.show(context, message: '$label segera hadir!',
                  icon: item['icon'] as IconData,
                  gradient: [color, color.withOpacity(0.6)]);
              }
            },
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 44, height: 44,
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(item['icon'] as IconData, color: color, size: 22),
                ),
                const SizedBox(height: 5),
                Text(
                  item['label'] as String,
                  style: GoogleFonts.outfit(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: ThemeConfig.textPrimary,
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    ).animate().fadeIn(duration: 300.ms);
  }

  Widget _buildAnnouncements() {
    if (_announcements.isEmpty) return const SizedBox.shrink();
    return SizedBox(
      height: ThemeConfig.isTablet(context) ? 260.0 : 170.0,
      child: PageView.builder(
        controller: PageController(viewportFraction: 0.92),
        itemCount: _announcements.length,
        itemBuilder: (context, index) {
          final item = _announcements[index];
          final imgUrl = MarketApiService().resolveFileUrl(item['imageUrl']);
          return Container(
            margin: const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: ThemeConfig.brandColor.withOpacity(0.3),
                  blurRadius: 12,
                  offset: const Offset(0, 6),
                )
              ],
              image: DecorationImage(
                image: NetworkImage(imgUrl),
                fit: BoxFit.cover,
              ),
            ),
          ).animate().scale(begin: const Offset(0.9, 0.9), curve: Curves.easeOutBack, duration: 600.ms);
        },
      ),
    ).animate().fadeIn(duration: 500.ms);
  }

  Widget _buildMapExploreBanner() {
    final scale = ThemeConfig.tabletScale(context, mobile: 1.0);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: GestureDetector(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => MapExploreScreen(
                initialLat: _userLat,
                initialLong: _userLong,
                initialStores: _nearbyStores,
              ),
            ),
          );
        },
        child: Container(
          height: 110 * scale,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            gradient: LinearGradient(
              colors: [
                const Color(0xFF2A2D34),
                ThemeConfig.brandColor.withOpacity(0.1),
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            boxShadow: [
              BoxShadow(
                color: ThemeConfig.brandColor.withOpacity(0.1),
                blurRadius: 20,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Stack(
            children: [
              // Abstract Map Patterns
              Positioned(
                right: -30,
                bottom: -30,
                child: Icon(
                  Icons.map_outlined,
                  size: 160 * scale,
                  color: Colors.white.withOpacity(0.1),
                ).animate(onPlay: (c) => c.repeat(reverse: true)).moveY(begin: -5, end: 5, duration: 3.seconds),
              ),
              Padding(
                padding: const EdgeInsets.all(20),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: Colors.white.withOpacity(0.1),
                        ),
                      ),
                      child: const Icon(
                        Icons.view_in_ar_outlined,
                        color: Colors.white,
                        size: 30,
                      ).animate().shimmer(duration: 2.seconds, delay: 1.seconds),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Jelajahi UMKM di Sekitarmu',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 18 * scale,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.5,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Gunakan Kamera AR & Peta interaktif',
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.1),
                              fontSize: 12 * scale,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Icon(
                      Icons.arrow_forward_ios,
                      color: Colors.white.withOpacity(0.1),
                      size: 18 * scale,
                    ).animate(onPlay: (c) => c.repeat()).moveX(begin: 0, end: 5, duration: 1.seconds),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    ).animate().fadeIn(duration: 500.ms).slideY(begin: 0.2, curve: Curves.easeOutQuart);
  }

  Widget _buildRecentProducts() {
    final scale = ThemeConfig.tabletScale(context, mobile: 1.0);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: EdgeInsets.fromLTRB(16, 16 * scale, 16, 8 * scale),
          child: Text(
            'Terakhir Dilihat',
            style: TextStyle(
              fontSize: 18 * scale,
              fontWeight: FontWeight.bold,
              color: ThemeConfig.textPrimary,
            ),
          ),
        ),
        SizedBox(
          height: 120 * scale,
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            scrollDirection: Axis.horizontal,
            itemCount: _recentProducts.length,
            itemBuilder: (context, index) {
              final product = _recentProducts[index];
              final imgUrl = MarketApiService().resolveFileUrl(product['imageUrl']);
              return GestureDetector(
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => ProductDetailScreen(
                        product: product,
                        storeId: product['storeId'] ?? product['store']?['id'] ?? '',
                        storeName: product['store']?['name'] ?? 'Toko',
                      ),
                    ),
                  );
                },
                child: Container(
                  width: 100 * scale,
                  margin: const EdgeInsets.only(right: 12),
                  child: Column(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Hero(
                          tag: 'recent_${product['id']}',
                          child: CachedNetworkImage(
                            imageUrl: imgUrl,
                            width: 80 * scale,
                            height: 80 * scale,
                            fit: BoxFit.cover,
                            errorWidget: (_, __, ___) => Container(
                              width: 80 * scale,
                              height: 80 * scale,
                              color: Colors.grey.shade200,
                              child: const Icon(Icons.image, color: Colors.grey),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        product['name'] ?? '',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 11 * scale, color: ThemeConfig.textSecondary),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildSmartRecommendations() {
    final scale = ThemeConfig.tabletScale(context, mobile: 1.0);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: EdgeInsets.fromLTRB(16, 24 * scale, 16, 16 * scale),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(9),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [ThemeConfig.brandColor, Color(0xFFFFA07A)]),
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: [BoxShadow(color: ThemeConfig.brandColor.withOpacity(0.3), blurRadius: 8, offset: const Offset(0, 4))],
                ),
                child: const Icon(Icons.auto_awesome_rounded, color: Colors.white, size: 18),
              ).animate(onPlay: (c) => c.repeat()).shimmer(duration: 3.seconds),
              const SizedBox(width: 12),
              GradientText(
                'Saran Spesial Untukmu',
                style: GoogleFonts.poppins(
                  fontSize: 18 * scale,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
        ),
        SizedBox(
          height: ThemeConfig.isTablet(context) ? 290 : 252,
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            scrollDirection: Axis.horizontal,
            itemCount: _recommendations.length,
            itemBuilder: (context, index) {
              final item = _recommendations[index];
              final imgUrl = MarketApiService().resolveFileUrl(item['imageUrl']);
              final price = (item['sellingPrice'] as num?)?.toDouble() ?? 0;
              final original = (item['originalPrice'] as num?)?.toDouble();
              final hasPromo = original != null && original > price && original > 0;
              final discountPct = hasPromo ? ((1 - price / original) * 100).round() : null;

              return _RecommendationCard(
                key: ValueKey(item['id']),
                item: item,
                imgUrl: imgUrl,
                price: price,
                original: original,
                hasPromo: hasPromo,
                discountPct: discountPct,
                scale: scale,
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => ProductDetailScreen(
                        product: item,
                        storeId: item['storeId'] ?? item['store']?['id'] ?? '',
                        storeName: item['store']?['name'] ?? 'Toko',
                      ),
                    ),
                  );
                },
              ).animate().slideY(begin: 0.15, delay: (60 * index).ms).fadeIn(duration: 400.ms);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildTopFavoriteStores() {
    if (_nearbyStores.isEmpty) return const SizedBox.shrink();
    final scale = ThemeConfig.tabletScale(context, mobile: 1.0);

    final favorites = _nearbyStores.where((store) {
      final rating = (store['rating'] as num?)?.toDouble() ?? 0;
      final reviewCount = (store['reviewCount'] as num?)?.toInt() ?? 0;
      return rating >= 4.5 && reviewCount >= 10;
    }).toList();

    favorites.sort((a, b) {
      final ra = (a['rating'] as num?)?.toDouble() ?? 0;
      final rb = (b['rating'] as num?)?.toDouble() ?? 0;
      if (rb.compareTo(ra) != 0) return rb.compareTo(ra);
      final ca = (a['reviewCount'] as num?)?.toInt() ?? 0;
      final cb = (b['reviewCount'] as num?)?.toInt() ?? 0;
      return cb.compareTo(ca);
    });

    final top = favorites.take(5).toList();
    if (top.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: EdgeInsets.fromLTRB(16, 24 * scale, 16, 12 * scale),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Toko Paling Disukai',
                style: GoogleFonts.outfit(
                  fontSize: 18 * scale,
                  fontWeight: FontWeight.w800,
                  color: Colors.black87,
                ),
              ),
              Text('Lihat Semua', style: GoogleFonts.outfit(color: ThemeConfig.brandColor, fontWeight: FontWeight.bold, fontSize: 12 * scale)),
            ],
          ),
        ),
        SizedBox(
          height: 220 * scale,
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            scrollDirection: Axis.horizontal,
            itemCount: top.length,
            separatorBuilder: (_, __) => const SizedBox(width: 16),
            itemBuilder: (context, index) {
              final store = top[index];
              final distance = (store['distance'] as num?)?.toDouble();
              final rating = (store['rating'] as num?)?.toDouble() ?? 0;
              final imgUrl = MarketApiService().resolveFileUrl(store['imageUrl']);

              return GestureDetector(
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => StoreDetailScreen(store: store),
                    ),
                  );
                },
                child: Container(
                  width: 220 * scale,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.05),
                        blurRadius: 15,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Stack(
                        children: [
                          ClipRRect(
                            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                            child: CachedNetworkImage(
                              imageUrl: imgUrl,
                              height: 120 * scale,
                              width: double.infinity,
                              fit: BoxFit.cover,
                            ),
                          ),
                          Positioned(
                            top: 12, left: 12,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(color: Colors.white.withOpacity(0.9), borderRadius: BorderRadius.circular(12)),
                              child: Row(
                                children: [
                                  const Icon(Icons.star_rounded, color: Colors.amber, size: 14),
                                  const SizedBox(width: 4),
                                  Text('$rating', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 11)),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              store['name'] ?? '',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 15 * scale),
                            ),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                Icon(Icons.location_on_rounded, color: Colors.grey.shade400, size: 12),
                                const SizedBox(width: 4),
                                Text(
                                  distance != null ? '${distance.toStringAsFixed(1)} km' : 'Sekitar Anda',
                                  style: TextStyle(color: Colors.grey.shade600, fontSize: 11),
                                ),
                                const Spacer(),
                                Text('Tutup 21:00', style: TextStyle(color: Colors.red.shade400, fontSize: 10, fontWeight: FontWeight.bold)),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ).animate().fadeIn(delay: (100 * index).ms).slideX(begin: 0.1);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildCategories() {
    final scale = ThemeConfig.tabletScale(context, mobile: 1.0);

    final Map<String, int> categoryCounts = {};
    for (final store in _nearbyStores) {
      final name = (store['category'] ?? '').toString().trim();
      if (name.isEmpty) continue;
      categoryCounts[name] = (categoryCounts[name] ?? 0) + 1;
    }

    final sortedNames = List<String>.from(_availableStoreCategories);
    sortedNames.sort((a, b) {
      final cb = categoryCounts[b] ?? 0;
      final ca = categoryCounts[a] ?? 0;
      if (cb != ca) return cb.compareTo(ca);
      return a.compareTo(b);
    });

    final List<Map<String, dynamic>> categories = [];
    for (final name in sortedNames) {
      IconData icon;
      if (name == 'Makanan') {
        icon = Icons.restaurant;
      } else if (name == 'Minuman') {
        icon = Icons.local_drink;
      } else if (name == 'Belanja') {
        icon = Icons.shopping_basket;
      } else {
        icon = Icons.storefront;
      }
      final count = categoryCounts[name] ?? 0;
      categories.add({'icon': icon, 'label': name, 'count': count});
      if (categories.length >= 4) break;
    }

    if (categories.isEmpty) {
      categories.addAll([
        {'icon': Icons.restaurant, 'label': 'Makanan', 'count': 0},
        {'icon': Icons.local_drink, 'label': 'Minuman', 'count': 0},
        {'icon': Icons.shopping_basket, 'label': 'Belanja', 'count': 0},
        {'icon': Icons.local_offer, 'label': 'Promo', 'count': 0},
      ]);
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: categories.asMap().entries.map((entry) {
          final index = entry.key;
          final cat = entry.value;
          
          List<Color> gradient = [ThemeConfig.brandColor, ThemeConfig.brandColor.withOpacity(0.8)];
          final label = cat['label'] as String;
          if (label == 'Makanan') {
            gradient = [const Color(0xFFFF9900), const Color(0xFFFF5500)];
          } else if (label == 'Minuman') {
            gradient = [const Color(0xFF00C6FF), const Color(0xFF0072FF)];
          } else if (label == 'Belanja') {
            gradient = [const Color(0xFF11998E), const Color(0xFF38EF7D)];
          } else if (label == 'Promo') {
            gradient = [const Color(0xFFF12711), const Color(0xFFF5AF19)];
          }

          return GestureDetector(
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => MarketSearchScreen(
                    initialCategory: cat['label'] as String,
                  ),
                ),
              );
            },
            child: Column(
              children: [
                Container(
                  padding: EdgeInsets.all(14 * scale),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: gradient,
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: gradient[1].withOpacity(0.4),
                        blurRadius: 15,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Icon(
                    cat['icon'] as IconData,
                    color: Colors.white,
                    size: 26 * scale,
                  ),
                ).animate().scale(delay: (index * 100).ms, curve: Curves.easeOutBack),
                SizedBox(height: 10 * scale),
                Text(
                  cat['label'] as String,
                  style: TextStyle(
                    fontSize: 12 * scale,
                    fontWeight: FontWeight.w600,
                    color: ThemeConfig.textPrimary,
                  ),
                ),
                if ((cat['count'] as int) > 0) ...[
                  SizedBox(height: 2 * scale),
                  Text(
                    '${cat['count']} Toko',
                    style: TextStyle(
                      fontSize: 10 * scale,
                      color: Colors.grey.shade500,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ],
            ).animate().fadeIn(duration: 400.ms, delay: (index * 100).ms),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildFlashSale() {
    final scale = ThemeConfig.tabletScale(context, mobile: 1.0);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          child: Row(
            children: [
              const Icon(Icons.flash_on, color: ThemeConfig.colorWarning),
              const SizedBox(width: 8),
              Text(
                'Flash Sale',
                style: TextStyle(
                  fontSize: 18 * scale,
                  fontWeight: FontWeight.bold,
                  color: ThemeConfig.textPrimary,
                ),
              ),
              const Spacer(),
              if (_flashSaleDuration > Duration.zero)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.red,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.timer, color: Colors.white, size: 14),
                      const SizedBox(width: 4),
                      Text(
                        '${_flashSaleDuration.inHours.toString().padLeft(2, '0')}:${(_flashSaleDuration.inMinutes % 60).toString().padLeft(2, '0')}:${(_flashSaleDuration.inSeconds % 60).toString().padLeft(2, '0')}',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 12 * scale,
                        ),
                      )
                    ],
                  ),
                ),
            ],
          ),
        ),
        SizedBox(
          height: ThemeConfig.isTablet(context) ? 280 : 240,
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            scrollDirection: Axis.horizontal,
            itemCount: _flashSales.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              final product = _flashSales[index];
              return GestureDetector(
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => ProductDetailScreen(
                        product: product,
                        storeId: product['storeId'] ?? '',
                        storeName: product['storeName'] ?? 'Toko',
                      ),
                    ),
                  );
                },
                child: Container(
                  width: ThemeConfig.isTablet(context) ? 200 : 160,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius:
                        BorderRadius.circular(ThemeConfig.radiusMedium),
                    boxShadow: [
                      BoxShadow(
                        color: ThemeConfig.shadowColor,
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      ClipRRect(
                        borderRadius: const BorderRadius.vertical(
                            top: Radius.circular(ThemeConfig.radiusMedium)),
                        child: CachedNetworkImage(
                          imageUrl: MarketApiService()
                              .resolveFileUrl(product['imageUrl']),
                          height: ThemeConfig.isTablet(context) ? 140 : 120,
                          width: double.infinity,
                          fit: BoxFit.cover,
                          errorWidget: (_, __, ___) => Container(
                            color: Colors.grey[200],
                            child: const Icon(Icons.image_not_supported),
                          ),
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.all(8.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              product['name'],
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 14 * scale,
                                fontWeight: FontWeight.w600,
                                color: ThemeConfig.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Rp ${product['sellingPrice']}',
                              style: TextStyle(
                                fontSize: 14 * scale,
                                fontWeight: FontWeight.bold,
                                color: ThemeConfig.brandColor,
                              ),
                            ),
                            if (product['originalPrice'] >
                                product['sellingPrice'])
                              Text(
                                'Rp ${product['originalPrice']}',
                                style: TextStyle(
                                  fontSize: 12 * scale,
                                  decoration: TextDecoration.lineThrough,
                                  color: Colors.grey.shade400,
                                ),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ).animate().fadeIn(duration: 300.ms).slideX(begin: 0.05),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildPopularProducts() {
    final scale = ThemeConfig.tabletScale(context, mobile: 1.0);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Paling Populer',
                style: TextStyle(
                  fontSize: 18 * scale,
                  fontWeight: FontWeight.bold,
                ),
              ),
              TextButton(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) =>
                          const MarketSearchScreen(initialQuery: ''),
                    ),
                  );
                },
                child: const Text('Lihat Semua'),
              ),
            ],
          ),
        ),
        SizedBox(
          height: ThemeConfig.isTablet(context) ? 280 : 240,
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            scrollDirection: Axis.horizontal,
            itemCount: _popularProducts.length,
            itemBuilder: (context, index) {
              final item = _popularProducts[index];
              final imgUrl =
                  MarketApiService().resolveFileUrl(item['imageUrl']);
              final price = (item['sellingPrice'] as num?)?.toDouble() ?? 0;
              final original = (item['originalPrice'] as num?)?.toDouble();
              final hasPromo =
                  original != null && original > price && original > 0;
              final discountPct =
                  hasPromo ? ((1 - price / original) * 100).round() : null;

              return GestureDetector(
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => ProductDetailScreen(
                        product: item,
                        storeId: item['storeId'] ?? item['store']?['id'] ?? '',
                        storeName: item['store']?['name'] ?? 'Toko',
                        storeAddress: item['store']?['location'] ??
                            item['store']?['address'] ??
                            item['store']?['alamat'],
                        storeLat: (item['store']?['latitude'] ??
                                item['store']?['lat'])
                            ?.toDouble(),
                        storeLong: (item['store']?['longitude'] ??
                                item['store']?['long'] ??
                                item['store']?['lng'])
                            ?.toDouble(),
                      ),
                    ),
                  );
                },
                child: Container(
                  width: ThemeConfig.isTablet(context) ? 200 : 160,
                  margin: const EdgeInsets.only(right: 12, bottom: 8),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.1),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      )
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      ClipRRect(
                        borderRadius: const BorderRadius.vertical(
                            top: Radius.circular(12)),
                        child: Stack(
                          children: [
                            CachedNetworkImage(
                              imageUrl: imgUrl,
                              height: ThemeConfig.isTablet(context) ? 140 : 120,
                              width: double.infinity,
                              fit: BoxFit.cover,
                              errorWidget: (_, __, ___) => Container(
                                height: 120,
                                color: Colors.grey.shade200,
                                child:
                                    const Icon(Icons.image, color: Colors.grey),
                              ),
                            ),
                            if (discountPct != null)
                              Positioned(
                                top: 8,
                                left: 8,
                                child: Container(
                                  padding: EdgeInsets.symmetric(
                                      horizontal: 6 * scale,
                                      vertical: 2 * scale),
                                  decoration: BoxDecoration(
                                    color: Colors.red,
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    '$discountPct%',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 10 * scale,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.all(8.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item['name'] ?? '',
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 13 * scale,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Rp ${price.toInt()}',
                              style: TextStyle(
                                color: ThemeConfig.brandColor,
                                fontWeight: FontWeight.bold,
                                fontSize: 14 * scale,
                              ),
                            ),
                            if (hasPromo)
                              Text(
                                'Rp ${original.toInt()}',
                                style: TextStyle(
                                  decoration: TextDecoration.lineThrough,
                                  color: Colors.grey,
                                  fontSize: 10 * scale,
                                ),
                              ),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                const Icon(Icons.star,
                                    size: 12, color: ThemeConfig.colorRating),
                                const SizedBox(width: 4),
                                Text(
                                  (item['averageRating'] ?? 0)
                                      .toStringAsFixed(1),
                                  style: TextStyle(
                                    fontSize: 11 * scale,
                                    color: Colors.grey,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ).animate().fadeIn(duration: 300.ms).slideX(begin: 0.05),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildNearbyStoresHeader() {
    final scale = ThemeConfig.tabletScale(context, mobile: 1.0);
    final totalStores = _nearbyStores.length;
    final filteredCount = _filteredStores.length;
    final hasActiveFilter =
        _storeCategoryFilter != 'Semua' || _storeRatingFilter != 'Semua';

    return SliverToBoxAdapter(
      child: Padding(
        padding: EdgeInsets.fromLTRB(16, 32 * scale, 16, 16 * scale),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Eksplor Toko Terdekat',
                    style: GoogleFonts.outfit(
                      fontSize: 20 * scale,
                      fontWeight: FontWeight.w900,
                      color: ThemeConfig.textPrimary,
                      letterSpacing: -0.5,
                    ),
                  ),
                ),
                _buildDropdownFilter<double>(
                  value: _nearbyRadiusKm,
                  items: [3, 5, 10],
                  labelSuffix: ' km',
                  onChanged: (value) async {
                    if (value == null) return;
                    setState(() => _nearbyRadiusKm = value);
                    await _loadData();
                  },
                ),
                const SizedBox(width: 8),
                _buildDropdownFilter<String>(
                  value: _storeSort,
                  items: ['default', 'rating_desc'],
                  labels: {'default': 'Terdekat', 'rating_desc': 'Rating'},
                  onChanged: (value) {
                    if (value == null) return;
                    setState(() {
                      _storeSort = value;
                      _applyStoreSorting();
                    });
                  },
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (_availableStoreCategories.isNotEmpty)
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                child: Row(
                  children: [
                    _buildModernChip(
                      label: 'Semua Kategori',
                      isSelected: _storeCategoryFilter == 'Semua',
                      onTap: () {
                        setState(() {
                          _storeCategoryFilter = 'Semua';
                          _rebuildFilteredStores();
                        });
                      },
                    ),
                    ..._availableStoreCategories.map((c) => _buildModernChip(
                          label: c,
                          isSelected: _storeCategoryFilter == c,
                          onTap: () {
                            setState(() {
                              _storeCategoryFilter = c;
                              _rebuildFilteredStores();
                            });
                          },
                        )),
                  ],
                ),
              ),
            const SizedBox(height: 12),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              child: Row(
                children: [
                  _buildModernChip(
                    label: 'Semua Rating',
                    isSelected: _storeRatingFilter == 'Semua',
                    icon: Icons.star_outline_rounded,
                    onTap: () {
                      setState(() {
                        _storeRatingFilter = 'Semua';
                        _rebuildFilteredStores();
                      });
                    },
                  ),
                  _buildModernChip(
                    label: '4+ Bintang',
                    isSelected: _storeRatingFilter == '4+',
                    icon: Icons.star_rounded,
                    onTap: () {
                      setState(() {
                        _storeRatingFilter = '4+';
                        _rebuildFilteredStores();
                      });
                    },
                  ),
                  _buildModernChip(
                    label: '4.5+ Bintang',
                    isSelected: _storeRatingFilter == '4.5+',
                    icon: Icons.stars_rounded,
                    onTap: () {
                      setState(() {
                        _storeRatingFilter = '4.5+';
                        _rebuildFilteredStores();
                      });
                    },
                  ),
                ],
              ),
            ),
            if (hasActiveFilter && filteredCount != totalStores)
              Padding(
                padding: const EdgeInsets.only(top: 12, left: 4),
                child: Text(
                  'Menampilkan $filteredCount toko yang sesuai',
                  style: GoogleFonts.outfit(
                    fontSize: 12 * scale,
                    color: ThemeConfig.brandColor,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildDropdownFilter<T>({
    required T value,
    required List<T> items,
    String? labelSuffix,
    Map<T, String>? labels,
    required ValueChanged<T?> onChanged,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<T>(
          value: value,
          icon: const Icon(Icons.keyboard_arrow_down_rounded, size: 18),
          style: GoogleFonts.outfit(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: ThemeConfig.textPrimary,
          ),
          onChanged: onChanged,
          items: items.map((T item) {
            String label = labels != null ? labels[item]! : item.toString();
            if (labelSuffix != null) label += labelSuffix;
            return DropdownMenuItem<T>(
              value: item,
              child: Text(label),
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _buildModernChip({
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
    IconData? icon,
  }) {
    final scale = ThemeConfig.tabletScale(context, mobile: 1.0);
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: EdgeInsets.symmetric(
            horizontal: 16 * scale,
            vertical: 10 * scale,
          ),
          decoration: BoxDecoration(
            color: isSelected ? ThemeConfig.brandColor : Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: ThemeConfig.brandColor.withOpacity(0.3),
                      blurRadius: 8,
                      offset: const Offset(0, 4),
                    )
                  ]
                : [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.03),
                      blurRadius: 4,
                      offset: const Offset(0, 2),
                    )
                  ],
            border: Border.all(
              color: isSelected ? ThemeConfig.brandColor : Colors.grey.shade200,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[
                Icon(
                  icon,
                  size: 14 * scale,
                  color: isSelected ? Colors.white : ThemeConfig.brandColor,
                ),
                const SizedBox(width: 6),
              ],
              Text(
                label,
                style: GoogleFonts.outfit(
                  fontSize: 12 * scale,
                  fontWeight: FontWeight.w700,
                  color: isSelected ? Colors.white : ThemeConfig.textPrimary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNearbyStoresList() {
    if (_filteredStores.isEmpty) {
      return SliverToBoxAdapter(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              Icon(Icons.store_mall_directory_outlined,
                  size: 48 * ThemeConfig.tabletScale(context, mobile: 1.0),
                  color: Colors.grey),
              SizedBox(height: 8 * ThemeConfig.tabletScale(context, mobile: 1.0)),
              Text(
                'Belum ada toko yang sesuai',
                style: TextStyle(
                  color: Colors.grey.shade600,
                  fontSize: 14 * ThemeConfig.tabletScale(context, mobile: 1.0),
                ),
              ),
            ],
          ),
        ),
      );
    }

    if (ThemeConfig.isTablet(context)) {
      final cols = ThemeConfig.gridColumns(context, mobile: 2);
      return SliverPadding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        sliver: SliverGrid(
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: cols,
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
            childAspectRatio: 2.8,
          ),
          delegate: SliverChildBuilderDelegate(
            (context, index) {
              final store = _filteredStores[index];
              return _StoreCard(store: store);
            },
            childCount: _filteredStores.length,
          ),
        ),
      );
    }
    return SliverPadding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      sliver: SliverList(
        delegate: SliverChildBuilderDelegate(
          (context, index) {
            final store = _filteredStores[index];
            return _StoreCard(store: store);
          },
          childCount: _filteredStores.length,
        ),
      ),
    );
  }
}

class _StoreCard extends StatelessWidget {
  final dynamic store;

  const _StoreCard({required this.store});

  @override
  Widget build(BuildContext context) {
    final scale = ThemeConfig.tabletScale(context, mobile: 1.0);
    final distance = (store['distance'] as num?)?.toDouble();
    final rating = (store['rating'] as num?)?.toDouble();
    final reviewCount = (store['reviewCount'] as num?)?.toInt() ?? 0;
    final isFavorite =
        rating != null && rating >= 4.8 && reviewCount >= 20;

    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => StoreDetailScreen(store: store),
          ),
        );
      },
      child: Container(
        margin: EdgeInsets.symmetric(horizontal: 16, vertical: 8 * scale),
        padding: EdgeInsets.all(12 * scale),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 20,
              offset: const Offset(0, 10),
            ),
          ],
          border: Border.all(color: Colors.grey.shade100),
        ),
        child: Row(
          children: [
            Stack(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(18),
                  child: CachedNetworkImage(
                    imageUrl: MarketApiService().resolveFileUrl(store['imageUrl']),
                    width: 90 * scale,
                    height: 90 * scale,
                    fit: BoxFit.cover,
                    errorWidget: (_, __, ___) => Container(
                      width: 90 * scale,
                      height: 90 * scale,
                      color: Colors.grey[100],
                      child: const Icon(Icons.store, color: Colors.grey),
                    ),
                  ),
                ),
                if (isFavorite)
                  Positioned(
                    top: 6,
                    left: 6,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: const BoxDecoration(
                        color: ThemeConfig.colorRating,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.star_rounded,
                          color: Colors.white, size: 12),
                    ),
                  ),
              ],
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    store['name'] ?? 'Toko Tanpa Nama',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.outfit(
                      fontSize: 16 * scale,
                      fontWeight: FontWeight.w800,
                      color: ThemeConfig.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: ThemeConfig.brandColor.withOpacity(0.05),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          store['category'] ?? 'Umum',
                          style: GoogleFonts.outfit(
                            fontSize: 10 * scale,
                            color: ThemeConfig.brandColor,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      if (rating != null && rating > 0) ...[
                        const Icon(Icons.star_rounded,
                            size: 16, color: ThemeConfig.colorRating),
                        const SizedBox(width: 2),
                        Text(
                          rating.toStringAsFixed(1),
                          style: GoogleFonts.outfit(
                            fontSize: 12 * scale,
                            fontWeight: FontWeight.w800,
                            color: ThemeConfig.textPrimary,
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Icon(Icons.location_on_rounded,
                          size: 14 * scale, color: Colors.grey.shade400),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          store['address'] ?? '-',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.outfit(
                            fontSize: 12 * scale,
                            color: ThemeConfig.textSecondary.withOpacity(0.7),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                      if (distance != null) ...[
                        const SizedBox(width: 8),
                        Text(
                          '${distance.toStringAsFixed(1)} km',
                          style: GoogleFonts.outfit(
                            fontSize: 11 * scale,
                            color: ThemeConfig.brandColor,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      )
          .animate()
          .fadeIn(duration: 400.ms)
          .slideX(begin: 0.1, curve: Curves.easeOutQuart),
    );
  }
}

class _HomeAppBarDelegate extends SliverPersistentHeaderDelegate {
  final double topPadding;
  final String address;
  final VoidCallback onSearchTap;
  final VoidCallback onNotifTap;
  final VoidCallback onCartTap;
  final VoidCallback onChatTap;
  final VoidCallback onAvatarTap;
  final bool isGuest;

  _HomeAppBarDelegate({
    required this.topPadding,
    required this.address,
    required this.onSearchTap,
    required this.onNotifTap,
    required this.onCartTap,
    required this.onChatTap,
    required this.onAvatarTap,
    this.isGuest = false,
  });

  @override
  Widget build(
      BuildContext context, double shrinkOffset, bool overlapsContent) {
    final scale = ThemeConfig.tabletScale(context, mobile: 1.0);
    final progress = shrinkOffset / (maxExtent - minExtent);
    final clampedProgress = progress.clamp(0.0, 1.0);
    final locOpacity = (1.0 - (clampedProgress * 2.5)).clamp(0.0, 1.0);

    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(clampedProgress),
        boxShadow: clampedProgress > 0.8
            ? [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 20,
                  offset: const Offset(0, 4),
                )
              ]
            : null,
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [
          // 1. Dynamic Background (Brand Color Gradient)
          Opacity(
            opacity: 1.0 - clampedProgress,
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    ThemeConfig.brandColor,
                    ThemeConfig.brandColor.withOpacity(0.85),
                  ],
                ),
              ),
            ),
          ),

          // 2. Glassmorphism Effect when Scrolled
          if (clampedProgress > 0.1)
            ClipRRect(
              child: BackdropFilter(
                filter: ImageFilter.blur(
                  sigmaX: 15 * clampedProgress,
                  sigmaY: 15 * clampedProgress,
                ),
                child: Container(color: Colors.transparent),
              ),
            ),

          // 3. Decorative Elements (Circles)
          Positioned(
            top: -40 * (1 - clampedProgress),
            right: -20,
            child: Container(
              width: 140,
              height: 140,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withOpacity(0.08),
              ),
            ),
          ),

          // 4. Location & User Info (Top Row)
          Positioned(
            top: topPadding + 4,
            left: 0,
            right: 0,
            height: 50 * scale,
            child: Opacity(
              opacity: locOpacity,
              child: Padding(
                padding: EdgeInsets.symmetric(horizontal: 20 * scale),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(14),
                        border:
                            Border.all(color: Colors.white.withOpacity(0.1)),
                      ),
                      child: const Icon(
                        Icons.location_on_rounded,
                        color: Colors.white,
                        size: 18,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            'LOKASI PENGIRIMAN',
                            style: GoogleFonts.outfit(
                              color: Colors.white.withOpacity(0.7),
                              fontSize: 9,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 1.2,
                            ),
                          ),
                          Row(
                            children: [
                              Flexible(
                                child: Text(
                                  address,
                                  style: GoogleFonts.outfit(
                                    color: Colors.white,
                                    fontSize: 14,
                                    fontWeight: FontWeight.w700,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              const Icon(Icons.keyboard_arrow_down_rounded,
                                  color: Colors.white, size: 16),
                            ],
                          ),
                        ],
                      ),
                    ),
                    _buildTopActionBtn(
                        Icons.notifications_none_rounded, onNotifTap),
                    const SizedBox(width: 10),
                    GestureDetector(
                      onTap: onAvatarTap,
                      child: isGuest
                          ? Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 6),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.25),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                    color: Colors.white.withOpacity(0.4)),
                              ),
                              child: Text(
                                'Masuk',
                                style: GoogleFonts.outfit(
                                  color: Colors.white,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            )
                          : const CircleAvatar(
                              radius: 18,
                              backgroundColor: Colors.white24,
                              child: Icon(Icons.person_outline_rounded,
                                  color: Colors.white, size: 20),
                            ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // 5. Search Bar (Sticky)
          Positioned(
            left: 20 * scale,
            right: 20 * scale,
            bottom: 12 * scale,
            height: 50 * scale,
            child: Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: onSearchTap,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      decoration: BoxDecoration(
                        color: clampedProgress > 0.5
                            ? Colors.grey.shade100
                            : Colors.white,
                        borderRadius: BorderRadius.circular(18),
                        boxShadow: clampedProgress < 0.5
                            ? [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.1),
                                  blurRadius: 15,
                                  offset: const Offset(0, 5),
                                )
                              ]
                            : null,
                        border: Border.all(
                          color: clampedProgress > 0.5
                              ? Colors.grey.shade200
                              : Colors.transparent,
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.search_rounded,
                            color: clampedProgress > 0.5
                                ? Colors.grey.shade500
                                : Colors.grey.shade400,
                            size: 22,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'Cari layanan, toko, atau menu...',
                              style: GoogleFonts.outfit(
                                color: clampedProgress > 0.5
                                    ? Colors.grey.shade600
                                    : Colors.grey.shade500,
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              color: ThemeConfig.brandColor.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(
                              Icons.auto_awesome_rounded,
                              color: ThemeConfig.brandColor,
                              size: 16,
                            ),
                          ).animate(onPlay: (c) => c.repeat()).shimmer(
                              duration: 2.seconds),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                _buildActionBtn(Icons.chat_bubble_outline_rounded, onChatTap,
                    clampedProgress),
                const SizedBox(width: 8),
                _buildCartBtn(onCartTap, clampedProgress),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTopActionBtn(IconData icon, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.15),
          shape: BoxShape.circle,
        ),
        child: Icon(icon, color: Colors.white, size: 20),
      ),
    );
  }

  Widget _buildActionBtn(IconData icon, VoidCallback onTap, double progress) {
    final isScrolled = progress > 0.5;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 48,
        height: 48,
        decoration: BoxDecoration(
          color: isScrolled
              ? Colors.grey.shade100
              : Colors.white.withOpacity(0.2),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isScrolled
                ? Colors.grey.shade200
                : Colors.white.withOpacity(0.1),
          ),
        ),
        child: Icon(
          icon,
          color: isScrolled ? ThemeConfig.textPrimary : Colors.white,
          size: 24,
        ),
      ),
    );
  }

  Widget _buildCartBtn(VoidCallback onTap, double progress) {
    return Consumer<MarketCartProvider>(
      builder: (context, cart, child) {
        final count =
            cart.items.values.fold(0, (sum, item) => sum + item.quantity);
        final isScrolled = progress > 0.5;
        return GestureDetector(
          onTap: onTap,
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              _buildActionBtn(Icons.shopping_bag_outlined, onTap, progress),
              if (count > 0)
                Positioned(
                  right: -4,
                  top: -4,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: ThemeConfig.colorError,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 2),
                      boxShadow: [
                        BoxShadow(
                          color: ThemeConfig.colorError.withOpacity(0.4),
                          blurRadius: 8,
                        )
                      ],
                    ),
                    constraints:
                        const BoxConstraints(minWidth: 20, minHeight: 20),
                    child: Center(
                      child: Text(
                        '$count',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ).animate().scale(curve: Curves.elasticOut),
                ),
            ],
          ),
        );
      },
    );
  }

  @override
  double get maxExtent => topPadding + 115;
  @override
  double get minExtent => topPadding + 75;
  @override
  bool shouldRebuild(covariant _HomeAppBarDelegate oldDelegate) => true;
}

// ─── Recommendation Card with Add-to-Cart Animation ──────────────────────────
class _RecommendationCard extends StatefulWidget {
  final Map<String, dynamic> item;
  final String imgUrl;
  final double price;
  final double? original;
  final bool hasPromo;
  final int? discountPct;
  final double scale;
  final VoidCallback onTap;

  const _RecommendationCard({
    super.key,
    required this.item,
    required this.imgUrl,
    required this.price,
    required this.original,
    required this.hasPromo,
    required this.discountPct,
    required this.scale,
    required this.onTap,
  });

  @override
  State<_RecommendationCard> createState() => _RecommendationCardState();
}

class _RecommendationCardState extends State<_RecommendationCard>
    with SingleTickerProviderStateMixin {
  bool _added = false;
  bool _confetti = false;
  late AnimationController _cartCtrl;
  late Animation<double> _cartScale;

  @override
  void initState() {
    super.initState();
    _cartCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 350));
    _cartScale = TweenSequence([
      TweenSequenceItem(tween: Tween(begin: 1.0, end: 0.78), weight: 40),
      TweenSequenceItem(tween: Tween(begin: 0.78, end: 1.15), weight: 35),
      TweenSequenceItem(tween: Tween(begin: 1.15, end: 1.0), weight: 25),
    ]).animate(CurvedAnimation(parent: _cartCtrl, curve: Curves.easeInOut));
  }

  @override
  void dispose() {
    _cartCtrl.dispose();
    super.dispose();
  }

  void _onAddToCart() {
    HapticFeedback.heavyImpact();
    _cartCtrl.forward(from: 0);
    setState(() {
      _added = true;
      _confetti = true;
    });
    final cart = Provider.of<MarketCartProvider>(context, listen: false);
    try {
      cart.addToCart(
        widget.item['storeId'] ?? widget.item['store']?['id'] ?? '',
        widget.item['store']?['name'] ?? 'Toko',
        widget.item['id']?.toString() ?? '',
        widget.item['name'] ?? '',
        widget.price,
        originalPrice: widget.original,
        imageUrl: widget.item['imageUrl'],
      );
    } catch (_) {
      // different store — ignore silently for home screen quick add
    }
    Future.delayed(const Duration(milliseconds: 2200), () {
      if (mounted) setState(() => _confetti = false);
    });
    Future.delayed(const Duration(seconds: 3), () {
      if (mounted) setState(() => _added = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    final isTablet = ThemeConfig.isTablet(context);
    return ConfettiOverlay(
      trigger: _confetti,
      child: PressScaleButton(
        onTap: widget.onTap,
        child: Container(
          width: isTablet ? 200 : 165,
          margin: const EdgeInsets.only(right: 14, bottom: 8, top: 2),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(22),
            boxShadow: [
              BoxShadow(color: Colors.black.withOpacity(0.08), blurRadius: 16, offset: const Offset(0, 6))
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(22)),
                child: Stack(
                  children: [
                    CachedNetworkImage(
                      imageUrl: widget.imgUrl,
                      height: isTablet ? 140 : 115,
                      width: double.infinity,
                      fit: BoxFit.cover,
                      errorWidget: (_, __, ___) => Container(
                        height: 115, color: Colors.grey.shade100,
                        child: const Icon(Icons.image, color: Colors.grey),
                      ),
                    ),
                    if (widget.discountPct != null)
                      Positioned(
                        top: 8, left: 8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(colors: [Color(0xFFFC4A1A), Color(0xFFF7B733)]),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text('${widget.discountPct}% OFF',
                              style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w900)),
                        ),
                      ),
                    Positioned(
                      top: 8, right: 8,
                      child: Container(
                        width: 30, height: 30,
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.9),
                          shape: BoxShape.circle,
                          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 8)],
                        ),
                        child: const Icon(Icons.favorite_border_rounded, size: 16, color: Colors.pink),
                      ),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(widget.item['name'] ?? '',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.poppins(fontWeight: FontWeight.w700, fontSize: 12 * widget.scale, height: 1.3)),
                    const SizedBox(height: 6),
                    Text('Rp${ThemeConfig.formatCurrency(widget.price)}',
                        style: GoogleFonts.poppins(fontWeight: FontWeight.w900, color: ThemeConfig.brandColor, fontSize: 14 * widget.scale)),
                    if (widget.hasPromo)
                      Text('Rp${ThemeConfig.formatCurrency(widget.original!)}',
                          style: GoogleFonts.poppins(
                            decoration: TextDecoration.lineThrough,
                            color: Colors.grey.shade400,
                            fontSize: 10 * widget.scale,
                          )),
                    const SizedBox(height: 10),
                    GestureDetector(
                      onTap: _added ? null : _onAddToCart,
                      child: AnimatedBuilder(
                        animation: _cartScale,
                        builder: (_, child) => Transform.scale(scale: _cartScale.value, child: child),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 350),
                          curve: Curves.easeInOut,
                          width: double.infinity,
                          height: 34,
                          decoration: BoxDecoration(
                            gradient: _added
                                ? const LinearGradient(colors: [Color(0xFF43E97B), Color(0xFF38F9D7)])
                                : const LinearGradient(colors: [ThemeConfig.brandColor, Color(0xFFFFA07A)]),
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: [
                              BoxShadow(
                                color: (_added ? const Color(0xFF43E97B) : ThemeConfig.brandColor).withOpacity(0.3),
                                blurRadius: 8, offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(_added ? Icons.check_rounded : Icons.add_shopping_cart_rounded,
                                  color: Colors.white, size: 15),
                              const SizedBox(width: 5),
                              Text(
                                _added ? 'Ditambahkan!' : '+ Keranjang',
                                style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 10.5),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
