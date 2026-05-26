import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:rana_market/config/theme_config.dart';
import 'package:rana_market/data/market_api_service.dart';
import 'package:rana_market/providers/favorites_provider.dart';
import 'package:rana_market/screens/product_detail_screen.dart';
import 'package:rana_market/providers/reviews_provider.dart';
import 'package:rana_market/providers/auth_provider.dart';
import 'package:rana_market/screens/market_cart_screen.dart';
import 'package:rana_market/screens/chat_detail_screen.dart';
import 'package:rana_market/screens/login_screen.dart';
import 'package:rana_market/providers/market_cart_provider.dart';

class StoreDetailScreen extends StatefulWidget {
  final Map<String, dynamic> store;
  const StoreDetailScreen({super.key, required this.store});

  @override
  State<StoreDetailScreen> createState() => _StoreDetailScreenState();
}

class _StoreDetailScreenState extends State<StoreDetailScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  Map<String, dynamic> _storeDetail = {};
  List<dynamic> _products = [];
  List<dynamic> _categories = [];
  List<dynamic> _reviews = [];
  Map<String, dynamic> _reviewStats = {};

  bool _loading = true;
  String _selectedCategory = 'Semua';
  final TextEditingController _searchCtrl = TextEditingController();
  String _query = '';
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _storeDetail = widget.store;
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final storeId = widget.store['id'];

      // Load Catalog (Store Info + Products + Categories)
      final catalog = await MarketApiService().getStoreCatalog(storeId);

      // Load Reviews
      final reviewsData = await MarketApiService().getStoreReviews(storeId);

      if (!mounted) return;

      setState(() {
        if (catalog['store'] != null) {
          _storeDetail = {
            ..._storeDetail,
            ...catalog['store'],
          };
        }
        _products = catalog['products'] ?? [];
        _categories = ['Semua', ...(catalog['categories'] ?? [])];

        _reviews = reviewsData['reviews'] ?? [];
        _reviewStats = reviewsData['stats'] ?? {};

        _loading = false;
      });
    } catch (e) {
      debugPrint('Error loading store data: $e');
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _debounce?.cancel();
    _searchCtrl.dispose();
    super.dispose();
  }

  void _startChat() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    if (!auth.isAuthenticated) {
      Navigator.push(context, MaterialPageRoute(builder: (_) => const LoginScreen()));
      return;
    }

    try {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (_) => const Center(child: CircularProgressIndicator()),
      );
      
      final storeId = widget.store['id'];
      final storeName = widget.store['name'] ?? 'Toko';
      final storeUser = await MarketApiService().getStoreChatUser(storeId);
      final otherUserId = storeUser['id'];

      if (otherUserId == null) throw Exception();

      final room = await MarketApiService().createChatRoom(otherUserId, storeName);
      
      if (mounted) {
        Navigator.pop(context);
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => ChatDetailScreen(
              roomId: room['id'] ?? room['_id'], 
              roomName: storeName,
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Gagal memulai chat dengan toko ini')),
        );
      }
    }
  }

  void _onSearchChanged(String value) {
    setState(() {
      _query = value.trim().toLowerCase();
    });
  }

  List<dynamic> get _filteredProducts {
    return _products.where((p) {
      final matchCat = _selectedCategory == 'Semua' ||
          (p['category']?['name'] == _selectedCategory);
      final matchSearch =
          _query.isEmpty || (p['name'] ?? '').toLowerCase().contains(_query);
      return matchCat && matchSearch;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final scale = ThemeConfig.tabletScale(context, mobile: 1.0);
    return Scaffold(
      backgroundColor: ThemeConfig.beigeBackground,
      body: NestedScrollView(
        headerSliverBuilder: (context, innerBoxIsScrolled) {
          return [
            _buildSliverAppBar(scale),
          ];
        },
        body: TabBarView(
          controller: _tabController,
          children: [
            _buildMenuTab(scale),
            _buildReviewsTab(scale),
            _buildInfoTab(scale),
          ],
        ),
      ),
    );
  }

  Widget _buildSliverAppBar(double scale) {
    final bannerUrl = MarketApiService().resolveFileUrl(_storeDetail['bannerUrl']);
    final logoUrl = MarketApiService().resolveFileUrl(_storeDetail['imageUrl']);
    final hasBanner = bannerUrl.isNotEmpty;
    final rating = (_reviewStats['averageRating'] ?? 0).toDouble();

    return SliverAppBar(
      expandedHeight: 280 * scale,
      pinned: true,
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.white,
      iconTheme: const IconThemeData(color: Colors.white),
      leading: Padding(
        padding: const EdgeInsets.all(8.0),
        child: Container(
          decoration: const BoxDecoration(color: Colors.black26, shape: BoxShape.circle),
          child: IconButton(
            icon: const Icon(Icons.arrow_back, color: Colors.white, size: 20),
            padding: EdgeInsets.zero,
            onPressed: () => Navigator.pop(context),
          ),
        ),
      ),
      actions: [
        IconButton(
          icon: Container(
             padding: const EdgeInsets.all(8),
             decoration: const BoxDecoration(color: Colors.black26, shape: BoxShape.circle),
             child: const Icon(Icons.share, size: 20)
          ),
          onPressed: () {},
        ),
        IconButton(
          icon: Container(
             padding: const EdgeInsets.all(8),
             decoration: const BoxDecoration(color: Colors.black26, shape: BoxShape.circle),
             child: const Icon(Icons.chat_outlined, size: 20)
          ),
          onPressed: _startChat,
        ),
        Stack(
          children: [
            IconButton(
              icon: Container(
                 padding: const EdgeInsets.all(8),
                 decoration: const BoxDecoration(color: Colors.black26, shape: BoxShape.circle),
                 child: const Icon(Icons.shopping_cart, size: 20)
              ),
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const MarketCartScreen()),
                );
              },
            ),
            Positioned(
              right: 6,
              top: 6,
              child: Consumer<MarketCartProvider>(
                builder: (context, cart, _) {
                  if (cart.itemCount == 0) return const SizedBox.shrink();
                  return Container(
                    padding: EdgeInsets.all(4 * scale),
                    decoration: BoxDecoration(
                      color: Colors.redAccent,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 1.5)
                    ),
                    child: Text(
                      '${cart.itemCount}',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 9 * scale,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
        const SizedBox(width: 8),
      ],
      flexibleSpace: FlexibleSpaceBar(
        collapseMode: CollapseMode.parallax,
        background: Stack(
          fit: StackFit.expand,
          children: [
            if (hasBanner)
              Image.network(
                bannerUrl,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) =>
                    Container(color: ThemeConfig.brandColor),
              )
            else
              Container(
                color: ThemeConfig.brandColor,
                child: const Center(
                  child: Icon(Icons.store, size: 64, color: Colors.white24),
                ),
              ),
            // Gradient Overlay
            Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.black.withValues(alpha: 0.3),
                    Colors.transparent,
                    Colors.black.withValues(alpha: 0.8),
                  ],
                  stops: const [0.0, 0.4, 1.0],
                ),
              ),
            ),
            // Store Info Content (Glassmorphic)
            Positioned(
              bottom: 24 * scale,
              left: 16 * scale,
              right: 16 * scale,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(20),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                  child: Container(
                    padding: EdgeInsets.all(16 * scale),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.3), width: 1.5),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 70 * scale,
                          height: 70 * scale,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: Colors.white, width: 2),
                            boxShadow: [
                              BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 10, offset: const Offset(0, 5))
                            ],
                            image: logoUrl.isNotEmpty
                                ? DecorationImage(
                                    image: NetworkImage(logoUrl),
                                    fit: BoxFit.cover,
                                  )
                                : null,
                          ),
                          child: logoUrl.isEmpty
                              ? const Icon(Icons.store, color: Colors.grey, size: 30)
                              : null,
                        ),
                        SizedBox(width: 16 * scale),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      _storeDetail['name'] ?? 'Toko',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontSize: 20 * scale,
                                        fontWeight: FontWeight.bold,
                                        shadows: const [Shadow(color: Colors.black26, blurRadius: 4, offset: Offset(0,2))],
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  if (rating >= 4.5)
                                    Container(
                                       padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                                       decoration: BoxDecoration(color: Colors.amber, borderRadius: BorderRadius.circular(8)),
                                       child: const Row(
                                          children: [
                                            Icon(Icons.verified, color: Colors.white, size: 10),
                                            SizedBox(width: 2),
                                            Text('Official', style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold)),
                                          ]
                                       ),
                                    )
                                ],
                              ),
                              SizedBox(height: 8 * scale),
                              Row(
                                children: [
                                  Icon(Icons.star, color: Colors.amber, size: 14 * scale),
                                  SizedBox(width: 4 * scale),
                                  Text(
                                    '${rating.toStringAsFixed(1)} (${_reviewStats['totalReviews'] ?? 0} ulasan)',
                                    style: TextStyle(color: Colors.white, fontSize: 11 * scale, fontWeight: FontWeight.w500),
                                  ),
                                  SizedBox(width: 12 * scale),
                                  Icon(Icons.location_on, color: Colors.white70, size: 14 * scale),
                                  SizedBox(width: 4 * scale),
                                  Expanded(
                                    child: Text(
                                      _storeDetail['location'] ?? _storeDetail['address'] ?? '-',
                                      style: TextStyle(color: Colors.white, fontSize: 11 * scale),
                                      maxLines: 1, overflow: TextOverflow.ellipsis,
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
              ),
            ),
          ],
        ),
      ),
      bottom: PreferredSize(
        preferredSize: Size.fromHeight(60 * scale),
        child: Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: EdgeInsets.symmetric(horizontal: 16 * scale, vertical: 8 * scale),
          child: TabBar(
            controller: _tabController,
            labelColor: Colors.white,
            unselectedLabelColor: Colors.grey.shade600,
            indicatorSize: TabBarIndicatorSize.tab,
            indicator: BoxDecoration(
               gradient: const LinearGradient(colors: [ThemeConfig.brandColor, Color(0xFFFFA07A)]),
               borderRadius: BorderRadius.circular(30),
               boxShadow: [BoxShadow(color: ThemeConfig.brandColor.withValues(alpha: 0.3), blurRadius: 8, offset: const Offset(0, 3))]
            ),
            splashBorderRadius: BorderRadius.circular(30),
            tabs: [
              Tab(child: Text('Katalog', style: TextStyle(fontSize: 12 * scale, fontWeight: FontWeight.bold))),
              Tab(child: Text('Ulasan', style: TextStyle(fontSize: 12 * scale, fontWeight: FontWeight.bold))),
              Tab(child: Text('Info Toko', style: TextStyle(fontSize: 12 * scale, fontWeight: FontWeight.bold))),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMenuTab(double scale) {
    final products = _filteredProducts;

    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
          child: Column(
            children: [
              // Search Bar
              Padding(
                padding: EdgeInsets.all(16 * scale),
                child: TextField(
                  controller: _searchCtrl,
                  onChanged: _onSearchChanged,
                  decoration: InputDecoration(
                    hintText: 'Cari di toko ini...',
                    prefixIcon: const Icon(Icons.search),
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding:
                        EdgeInsets.symmetric(horizontal: 16 * scale),
                  ),
                ),
              ),
              // Categories
              if (_categories.isNotEmpty)
                SizedBox(
                  height: 40 * scale,
                  child: ListView.separated(
                    padding: EdgeInsets.symmetric(horizontal: 16 * scale),
                    scrollDirection: Axis.horizontal,
                    itemCount: _categories.length,
                    separatorBuilder: (_, __) =>
                        SizedBox(width: 8 * scale),
                    itemBuilder: (context, index) {
                      final cat = _categories[index];
                      final isSelected = cat == _selectedCategory;
                      return ChoiceChip(
                        label: Text(cat,
                            style: TextStyle(fontSize: 12 * scale)),
                        selected: isSelected,
                        onSelected: (val) {
                          if (val) setState(() => _selectedCategory = cat);
                        },
                        selectedColor: ThemeConfig.brandColor,
                        labelStyle: TextStyle(
                          color: isSelected ? Colors.white : Colors.black87,
                        ),
                        backgroundColor: Colors.white,
                      );
                    },
                  ),
                ),
              SizedBox(height: 16 * scale),
            ],
          ),
        ),
        if (_loading)
          const SliverFillRemaining(
            child: Center(child: CircularProgressIndicator()),
          )
        else if (products.isEmpty)
          SliverFillRemaining(
            child: Center(
                child: Text('Produk tidak ditemukan',
                    style: TextStyle(
                        color: Colors.grey.shade600,
                        fontSize: 14 * scale))),
          )
        else
          SliverPadding(
            padding: EdgeInsets.symmetric(
                horizontal: 16 * scale, vertical: 8 * scale),
            sliver: SliverGrid(
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: ThemeConfig.gridColumns(context, mobile: 2),
                childAspectRatio: 0.68,
                mainAxisSpacing: 12 * scale,
                crossAxisSpacing: 12 * scale,
              ),
              delegate: SliverChildBuilderDelegate(
                (context, index) {
                  return _buildProductCard(products[index]);
                },
                childCount: products.length,
              ),
            ),
          ),
        SliverToBoxAdapter(child: SizedBox(height: 80 * scale)),
      ],
    );
  }

  Widget _buildProductCard(Map<String, dynamic> p) {
    return Consumer2<FavoritesProvider, ReviewsProvider>(
      builder: (context, fav, rev, _) {
        final isFav = fav.isFavorite(p['id']);
        final avg = (p['averageRating'] as num?)?.toDouble() ?? rev.getAverage(p['id']);
        final imageUrl = MarketApiService().resolveFileUrl(p['imageUrl'] ?? p['image']);
        final selling = (p['sellingPrice'] as num?)?.toDouble() ?? 0;
        final original = (p['originalPrice'] as num?)?.toDouble();
        final hasPromo = original != null && original > selling && original > 0;
        final discountPct = hasPromo ? ((1 - selling / original) * 100).round() : null;

        final scale = ThemeConfig.tabletScale(context, mobile: 1.0);

        return GestureDetector(
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => ProductDetailScreen(
                  product: p,
                  storeId: _storeDetail['id'],
                  storeName: _storeDetail['name'],
                  storeAddress: (_storeDetail['address'] ?? _storeDetail['location'] ?? _storeDetail['alamat'])?.toString(),
                  storeLat: ((_storeDetail['latitude'] ?? _storeDetail['lat']) is num) ? (_storeDetail['latitude'] ?? _storeDetail['lat']).toDouble() : null,
                  storeLong: ((_storeDetail['longitude'] ?? _storeDetail['long'] ?? _storeDetail['lng']) is num) ? (_storeDetail['longitude'] ?? _storeDetail['long'] ?? _storeDetail['lng']).toDouble() : null,
                ),
              ),
            );
          },
          child: Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.grey.shade100),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 15,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Stack(
                    children: [
                      ClipRRect(
                        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                        child: imageUrl.isEmpty
                            ? Container(color: Colors.grey.shade50)
                            : Image.network(
                                imageUrl,
                                width: double.infinity,
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) => Container(color: Colors.grey.shade50),
                              ),
                      ),
                      if (discountPct != null)
                        Positioned(
                          top: 10, left: 10,
                          child: Container(
                            padding: EdgeInsets.symmetric(horizontal: 8 * scale, vertical: 4 * scale),
                            decoration: BoxDecoration(
                              color: Colors.redAccent,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              '-$discountPct%',
                              style: TextStyle(color: Colors.white, fontSize: 10 * scale, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ),
                      Positioned(
                        top: 8, right: 8,
                        child: GestureDetector(
                          onTap: () {
                            final auth = Provider.of<AuthProvider>(context, listen: false);
                            fav.toggleFavorite(p['id'], phone: auth.user?['phone'] as String?);
                          },
                          child: Container(
                            padding: EdgeInsets.all(6 * scale),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.85),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              isFav ? Icons.favorite : Icons.favorite_border,
                              color: isFav ? Colors.red : Colors.grey.shade400,
                              size: 18 * scale,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: EdgeInsets.all(12 * scale),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        p['name'] ?? '',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontSize: 13 * scale, fontWeight: FontWeight.bold, height: 1.2),
                      ),
                      SizedBox(height: 6 * scale),
                      if (hasPromo)
                        Text(
                          ThemeConfig.formatCurrency(original),
                          style: TextStyle(fontSize: 10 * scale, decoration: TextDecoration.lineThrough, color: Colors.grey.shade500),
                        ),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Expanded(
                            child: Text(
                              ThemeConfig.formatCurrency(selling),
                              style: TextStyle(fontSize: 15 * scale, fontWeight: FontWeight.w800, color: ThemeConfig.brandColor),
                            ),
                          ),
                          Container(
                             padding: const EdgeInsets.all(6),
                             decoration: BoxDecoration(
                               color: ThemeConfig.brandColor,
                               borderRadius: BorderRadius.circular(8)
                             ),
                             child: const Icon(Icons.add_shopping_cart, color: Colors.white, size: 14),
                          )
                        ],
                      ),
                      SizedBox(height: 6 * scale),
                      Row(
                        children: [
                          Icon(Icons.star_rounded, size: 14 * scale, color: Colors.amber),
                          SizedBox(width: 4 * scale),
                          Text(
                            avg > 0 ? avg.toStringAsFixed(1) : '-',
                            style: TextStyle(fontSize: 12 * scale, color: Colors.grey.shade600, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildReviewsTab(double scale) {
    if (_reviews.isEmpty) {
      return Center(
        child: Text(
          'Belum ada ulasan',
          style: TextStyle(
            color: Colors.grey,
            fontSize: 14 * scale,
          ),
        ),
      );
    }
    return ListView.separated(
      padding: EdgeInsets.all(16 * scale),
      itemCount: _reviews.length,
      separatorBuilder: (_, __) => const Divider(),
      itemBuilder: (context, index) {
        final r = _reviews[index];
        final product = r['product'];
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: Colors.grey.shade200,
                  radius: 16 * scale,
                  child: Text(
                    (r['userName'] ?? 'U')[0].toUpperCase(),
                    style:
                        TextStyle(color: Colors.grey, fontSize: 14 * scale),
                  ),
                ),
                SizedBox(width: 12 * scale),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        r['userName'] ?? 'Pengguna',
                        style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 14 * scale),
                      ),
                      Row(
                        children: List.generate(
                          5,
                          (i) => Icon(
                            i < (r['rating'] ?? 0)
                                ? Icons.star
                                : Icons.star_border,
                            size: 14 * scale,
                            color: Colors.amber,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Text(
                  _formatDate(r['createdAt']),
                  style: TextStyle(
                      fontSize: 10 * scale,
                      color: Colors.grey.shade500),
                ),
              ],
            ),
            if (product != null) ...[
              SizedBox(height: 8 * scale),
              Container(
                padding: EdgeInsets.all(8 * scale),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    if (product['imageUrl'] != null)
                      ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: Image.network(
                          MarketApiService()
                              .resolveFileUrl(product['imageUrl']),
                          width: 30 * scale,
                          height: 30 * scale,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => SizedBox(
                              width: 30 * scale, height: 30 * scale),
                        ),
                      ),
                    SizedBox(width: 8 * scale),
                    Expanded(
                      child: Text(
                        product['name'] ?? '',
                        style: TextStyle(
                            fontSize: 11 * scale, color: Colors.grey),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
            ],
            if (r['comment'] != null && r['comment'].isNotEmpty) ...[
              SizedBox(height: 8 * scale),
              Text(
                r['comment'],
                style: TextStyle(fontSize: 13 * scale),
              ),
            ],
          ],
        );
      },
    );
  }

  Widget _buildInfoTab(double scale) {
    return ListView(
      padding: EdgeInsets.all(16 * scale),
      children: [
        Container(
           padding: EdgeInsets.all(20 * scale),
           decoration: BoxDecoration(
             color: Colors.white,
             borderRadius: BorderRadius.circular(24),
             boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 20, offset: const Offset(0, 10))],
             border: Border.all(color: Colors.grey.shade100, width: 1.5)
           ),
           child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                 _buildInfoItem(Icons.storefront_rounded, 'Tentang Toko', _storeDetail['description'] ?? 'Tidak ada deskripsi tersedia', isRich: true),
                 const Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Divider(color: Colors.black12)),
                 _buildInfoItem(Icons.location_on_rounded, 'Alamat Lengkap', _storeDetail['address'] ?? _storeDetail['location'] ?? '-'),
                 const Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Divider(color: Colors.black12)),
                 _buildInfoItem(Icons.schedule_rounded, 'Jam Operasional', _storeDetail['openingHours'] ?? 'Buka Setiap Hari'),
                 const Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Divider(color: Colors.black12)),
                 _buildInfoItem(Icons.category_rounded, 'Kategori Unggulan', _storeDetail['category'] ?? '-'),
              ]
           )
        )
      ],
    );
  }

  Widget _buildInfoItem(IconData icon, String title, String value, {bool isRich = false}) {
    final scale = ThemeConfig.tabletScale(context, mobile: 1.0);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: ThemeConfig.brandColor.withValues(alpha: 0.1),
            shape: BoxShape.circle
          ),
          child: Icon(icon, color: ThemeConfig.brandColor, size: 20 * scale),
        ),
        SizedBox(width: 16 * scale),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13 * scale, color: Colors.grey.shade600)),
              SizedBox(height: 6 * scale),
              Text(
                 value, 
                 style: TextStyle(color: Colors.black87, fontSize: 14 * scale, height: 1.4, fontWeight: isRich ? FontWeight.w500 : FontWeight.normal)
              ),
            ],
          ),
        ),
      ],
    );
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null) return '';
    try {
      final date = DateTime.parse(dateStr);
      return '${date.day}/${date.month}/${date.year}';
    } catch (_) {
      return '';
    }
  }
}
