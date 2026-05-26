import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:rana_market/config/theme_config.dart';
import 'package:rana_market/data/market_api_service.dart';
import 'package:rana_market/providers/auth_provider.dart';
import 'package:rana_market/providers/favorites_provider.dart';
import 'package:rana_market/providers/market_cart_provider.dart';
import 'package:rana_market/providers/reviews_provider.dart';
import 'package:rana_market/screens/login_screen.dart';
import 'package:rana_market/screens/market_reviews_screen.dart';
import 'package:rana_market/screens/chat_detail_screen.dart';
import 'package:rana_market/screens/store_detail_screen.dart';
import 'package:rana_market/screens/market_cart_screen.dart';
import 'package:flutter/services.dart';
import 'package:vibration/vibration.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ProductDetailScreen extends StatefulWidget {
  final Map<String, dynamic> product;
  final String storeId;
  final String storeName;
  final String? storeAddress;
  final double? storeLat;
  final double? storeLong;

  const ProductDetailScreen({
    super.key,
    required this.product,
    required this.storeId,
    required this.storeName,
    this.storeAddress,
    this.storeLat,
    this.storeLong,
  });

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  int _quantity = 1;
  int _rating = 5;
  bool _hasPurchased = false;
  final TextEditingController _commentCtrl = TextEditingController();
  final ScrollController _scrollCtrl = ScrollController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<ReviewsProvider>(context, listen: false)
          .loadInitial(widget.product['id'], sort: 'newest');
      _checkPurchased();
    });
    _scrollCtrl.addListener(_onScroll);
    _recordViewed();
  }

  void _onScroll() {
    final rev = Provider.of<ReviewsProvider>(context, listen: false);
    if (_scrollCtrl.position.pixels >=
        _scrollCtrl.position.maxScrollExtent - 200) {
      if (rev.hasMore(widget.product['id']) &&
          !rev.isLoading(widget.product['id'])) {
        rev.loadMore(widget.product['id']);
      }
    }
  }

  Future<void> _recordViewed() async {
    final id = widget.product['id']?.toString();
    if (id == null) return;
    final prefs = await SharedPreferences.getInstance();
    const key = 'buyer_recent_products_v1';
    final list = prefs.getStringList(key) ?? <String>[];
    list.remove(id);
    list.insert(0, id);
    if (list.length > 20) list.removeRange(20, list.length);
    await prefs.setStringList(key, list);
  }

  Future<void> _checkPurchased() async {
    final productId = widget.product['id']?.toString();
    if (productId == null) return;
    final prefs = await SharedPreferences.getInstance();
    final phone = (prefs.getString('buyer_phone') ?? '').trim();
    if (phone.isEmpty) return;
    final result = await MarketApiService().checkPurchased(productId, phone);
    if (mounted) setState(() => _hasPurchased = result);
  }

  Future<void> _shareProduct() async {
    final name = widget.product['name'] ?? 'Produk';
    final price = (widget.product['sellingPrice'] as num?)?.toInt() ?? 0;
    final storeName = widget.storeName;
    final storeId = widget.storeId;
    final text =
        '🛍️ $name\n💰 Rp $price\n🏪 $storeName\n\nBeli sekarang di Rana Market!\n${MarketApiService().resolveFileUrl('/store/$storeId')}';
    await Share.share(text);
  }

  void _addToCart() async {
    final cart = Provider.of<MarketCartProvider>(context, listen: false);
    
    // Haptic & Vibration for premium feel
    HapticFeedback.mediumImpact();
    if (await Vibration.hasVibrator() ?? false) {
      Vibration.vibrate(duration: 50, amplitude: 128);
    }

    final productId = (widget.product['id'] ?? '').toString();
    final name = (widget.product['name'] ?? 'Produk').toString();
    final price = (widget.product['sellingPrice'] as num?)?.toDouble() ?? 0.0;
    final originalPrice = (widget.product['originalPrice'] as num?)?.toDouble();
    final imageUrl = MarketApiService()
        .resolveFileUrl(widget.product['imageUrl'] ?? widget.product['image']);
    cart.addToCart(
      widget.storeId,
      widget.storeName,
      productId,
      name,
      price,
      storeAddress: widget.storeAddress,
      storeLat: widget.storeLat,
      storeLong: widget.storeLong,
      originalPrice: originalPrice,
      imageUrl: imageUrl,
      quantity: _quantity,
    );
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Produk ditambahkan ke keranjang'),
        backgroundColor: ThemeConfig.colorSuccess,
        duration: Duration(seconds: 1),
      ),
    );
  }

  @override
  void dispose() {
    _scrollCtrl.removeListener(_onScroll);
    _scrollCtrl.dispose();
    _commentCtrl.dispose();
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
      
      final storeUser = await MarketApiService().getStoreChatUser(widget.storeId);
      final otherUserId = storeUser['id'];

      if (otherUserId == null) throw Exception();

      final room = await MarketApiService().createChatRoom(otherUserId, widget.storeName);
      
      if (mounted) {
        Navigator.pop(context);
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => ChatDetailScreen(
              roomId: room['id'] ?? room['_id'], 
              roomName: widget.storeName,
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

  void _showFullScreenImage() {
    final imageUrl = MarketApiService().resolveFileUrl(
      widget.product['imageUrl'] ?? widget.product['image'],
    );
    if (imageUrl.isEmpty) return;

    showDialog(
      context: context,
      builder: (context) => Scaffold(
        backgroundColor: Colors.black,
        body: Stack(
          children: [
            Center(
              child: InteractiveViewer(
                minScale: 0.5,
                maxScale: 4.0,
                child: Hero(
                  tag: 'recent_${widget.product['id']}',
                  child: Image.network(
                    imageUrl,
                    fit: BoxFit.contain,
                  ),
                ),
              ),
            ),
            Positioned(
              top: MediaQuery.of(context).padding.top + 10,
              right: 20,
              child: IconButton(
                icon: const Icon(Icons.close, color: Colors.white, size: 30),
                onPressed: () => Navigator.pop(context),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final scale = ThemeConfig.tabletScale(context, mobile: 1.0);

    final price = (widget.product['sellingPrice'] as num?)?.toDouble() ?? 0;
    final originalPrice = (widget.product['originalPrice'] as num?)?.toDouble();
    final hasPromo =
        originalPrice != null && originalPrice > price && originalPrice > 0;
    final discountPct =
        hasPromo ? ((1 - price / originalPrice) * 100).round() : null;
    final savedAmount = hasPromo ? (originalPrice - price).toInt() : null;
    final imageUrl = MarketApiService().resolveFileUrl(
      widget.product['imageUrl'] ?? widget.product['image'],
    );

    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.storeName,
          style: TextStyle(fontSize: 16 * scale, fontWeight: FontWeight.w600),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.share),
            onPressed: _shareProduct,
          ),
          IconButton(
            icon: const Icon(Icons.chat_outlined),
            onPressed: _startChat,
          ),
          Stack(
            children: [
              IconButton(
                icon: const Icon(Icons.shopping_cart),
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const MarketCartScreen()),
                  );
                },
              ),
              Positioned(
                right: 4,
                top: 4,
                child: Consumer<MarketCartProvider>(
                  builder: (context, cart, _) {
                    if (cart.itemCount == 0) return const SizedBox.shrink();
                    return Container(
                      padding: EdgeInsets.all(4 * scale),
                      decoration: const BoxDecoration(
                        color: Colors.red,
                        shape: BoxShape.circle,
                      ),
                      child: Text(
                        '${cart.itemCount}',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 10 * scale,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ],
      ),
      bottomNavigationBar: Container(
        padding: EdgeInsets.all(16 * scale),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 10,
              offset: const Offset(0, -5),
            ),
          ],
        ),
        child: SafeArea(
          child: Row(
            children: [
              Container(
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey.shade300),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    IconButton(
                      icon: Icon(Icons.remove, size: 20 * scale),
                      onPressed: () {
                        if (_quantity > 1) {
                          setState(() => _quantity--);
                        }
                      },
                    ),
                    Text(
                      '$_quantity',
                      style: TextStyle(
                          fontSize: 16 * scale, fontWeight: FontWeight.bold),
                    ),
                    IconButton(
                      icon: Icon(Icons.add, size: 20 * scale),
                      onPressed: () {
                        setState(() => _quantity++);
                      },
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: ElevatedButton(
                  onPressed: _addToCart,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: ThemeConfig.brandColor,
                    foregroundColor: Colors.white,
                    padding:
                        EdgeInsets.symmetric(vertical: 16 * scale),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: Text(
                    '+ Keranjang',
                    style: TextStyle(
                        fontSize: 16 * scale, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              controller: _scrollCtrl,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    height: ThemeConfig.isTablet(context) ? 360 : 250,
                    width: double.infinity,
                    child: GestureDetector(
                      onTap: _showFullScreenImage,
                      child: Stack(
                        children: [
                          Positioned.fill(
                            child: imageUrl.isEmpty
                                ? Container(
                                    color: Colors.grey.shade200,
                                    child: const Icon(Icons.image,
                                        size: 100, color: Colors.grey),
                                  )
                                : (ThemeConfig.isTablet(context)
                                    ? Hero(
                                        tag: 'recent_${widget.product['id']}',
                                        child: Image.network(
                                          imageUrl,
                                          fit: BoxFit.cover,
                                          errorBuilder:
                                              (context, error, stackTrace) {
                                            return Container(
                                              color: Colors.grey.shade200,
                                              child: const Icon(Icons.image,
                                                  size: 100, color: Colors.grey),
                                            );
                                          },
                                        ),
                                      )
                                    : Hero(
                                        tag: 'recent_${widget.product['id']}',
                                        child: Image.network(
                                          imageUrl,
                                          fit: BoxFit.cover,
                                          errorBuilder:
                                              (context, error, stackTrace) {
                                            return Container(
                                              color: Colors.grey.shade200,
                                              child: const Icon(Icons.image,
                                                  size: 100, color: Colors.grey),
                                            );
                                          },
                                        ),
                                      )),
                          ),
                          if (discountPct != null)
                            Positioned(
                              left: 16,
                              top: 16,
                              child: Container(
                                padding: EdgeInsets.symmetric(
                                    horizontal: 8 * scale,
                                    vertical: 4 * scale),
                                decoration: BoxDecoration(
                                  color: ThemeConfig.brandColor
                                      .withValues(alpha: 0.9),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  '-$discountPct%',
                                  style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 12 * scale,
                                      fontWeight: FontWeight.bold),
                                ),
                              ),
                            ),
                          Positioned(
                            right: 16,
                            top: 16,
                            child: Consumer<FavoritesProvider>(
                              builder: (context, fav, _) {
                                final isFav =
                                    fav.isFavorite(widget.product['id']);
                                return Container(
                                  decoration: BoxDecoration(
                                    color: Colors.white.withValues(alpha: 0.85),
                                    shape: BoxShape.circle,
                                  ),
                                  child: IconButton(
                                    icon: Icon(
                                      isFav
                                          ? Icons.favorite
                                          : Icons.favorite_border,
                                      color: isFav ? Colors.red : Colors.grey,
                                    ),
                                    onPressed: () {
                                      final auth = Provider.of<AuthProvider>(
                                          context,
                                          listen: false);
                                      final phone =
                                          auth.user?['phone'] as String?;
                                      fav.toggleFavorite(widget.product['id'],
                                          phone: phone);
                                    },
                                  ),
                                );
                              },
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.product['name'],
                          style: TextStyle(
                              fontSize: 24 * scale,
                              fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 8),
                        if (hasPromo) ...[
                          Text(
                            'Rp ${originalPrice.toInt()}',
                            style: TextStyle(
                                decoration: TextDecoration.lineThrough,
                                color: Colors.grey,
                                fontSize: 14 * scale),
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              Text(
                                'Rp ${price.toInt()}',
                                style: TextStyle(
                                    fontSize: 22 * scale,
                                    fontWeight: FontWeight.bold,
                                    color: ThemeConfig.brandColor),
                              ),
                              const SizedBox(width: 8),
                              Container(
                                padding: EdgeInsets.symmetric(
                                    horizontal: 8 * scale,
                                    vertical: 2 * scale),
                                decoration: BoxDecoration(
                                  color: ThemeConfig.brandColor
                                      .withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(999),
                                ),
                                child: Text(
                                  '-$discountPct%',
                                  style: TextStyle(
                                      color: ThemeConfig.brandColor,
                                      fontSize: 12 * scale,
                                      fontWeight: FontWeight.w600),
                                ),
                              ),
                            ],
                          ),
                          if (savedAmount != null) ...[
                            const SizedBox(height: 4),
                            Text(
                              'Hemat Rp $savedAmount',
                              style: TextStyle(
                                  color: ThemeConfig.colorSuccess,
                                  fontSize: 12 * scale,
                                  fontWeight: FontWeight.w600),
                            ),
                          ],
                        ] else
                          Text(
                            'Rp ${price.toInt()}',
                            style: TextStyle(
                                fontSize: 22 * scale,
                                fontWeight: FontWeight.bold,
                                color: ThemeConfig.brandColor),
                          ),
                        const SizedBox(height: 8),
                        Consumer<ReviewsProvider>(
                          builder: (context, rev, _) {
                            final avg =
                                (widget.product['averageRating'] as num?)
                                        ?.toDouble() ??
                                    rev.getAverage(widget.product['id']);
                            return Row(
                              children: [
                                const Icon(Icons.star,
                                    color: ThemeConfig.colorRating, size: 18),
                                const SizedBox(width: 4),
                                Text(
                                  avg.toStringAsFixed(1),
                                  style: TextStyle(fontSize: 14 * scale),
                                ),
                              ],
                            );
                          },
                        ),
                        const SizedBox(height: 16),
                        const Divider(),
                        const SizedBox(height: 16),
                        Text(
                          'Informasi Toko',
                          style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16 * scale),
                        ),
                        const SizedBox(height: 12),
                        Container(
                          padding: EdgeInsets.all(16 * scale),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 50 * scale,
                                height: 50 * scale,
                                decoration: BoxDecoration(
                                  color: Colors.grey.shade100,
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(
                                  Icons.store,
                                  color: ThemeConfig.brandColor,
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      widget.storeName,
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 16 * scale,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      (widget.storeAddress ??
                                                  widget
                                                      .product['storeAddress'])
                                              ?.toString() ??
                                          'Alamat tidak tersedia',
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                        color: Colors.grey.shade600,
                                        fontSize: 13 * scale,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 12),
                              TextButton(
                                onPressed: () {
                                  final store = <String, dynamic>{
                                    'id': widget.storeId,
                                    'name': widget.storeName,
                                    'address': (widget.storeAddress ??
                                            widget.product['storeAddress'])
                                        ?.toString(),
                                    'location': (widget.storeAddress ??
                                            widget.product['storeAddress'])
                                        ?.toString(),
                                    'latitude': widget.storeLat,
                                    'longitude': widget.storeLong,
                                  };
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (_) =>
                                          StoreDetailScreen(store: store),
                                    ),
                                  );
                                },
                                style: TextButton.styleFrom(
                                  padding: EdgeInsets.symmetric(
                                      horizontal: 12 * scale,
                                      vertical: 8 * scale),
                                  minimumSize: const Size(0, 0),
                                  tapTargetSize:
                                      MaterialTapTargetSize.shrinkWrap,
                                  foregroundColor: ThemeConfig.brandColor,
                                ),
                                child: const Text(
                                  'Kunjungi Toko',
                                  style: TextStyle(fontSize: 12),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 24),
                        Text(
                          'Deskripsi',
                          style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16 * scale),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          widget.product['description'] ??
                              'Tidak ada deskripsi.',
                          style: TextStyle(
                              color: Colors.grey.shade600,
                              fontSize: 14 * scale),
                        ),
                        const SizedBox(height: 24),
                        Consumer<ReviewsProvider>(
                          builder: (context, rev, _) {
                            final total = rev.getCount(widget.product['id']);
                            final dist =
                                rev.getDistribution(widget.product['id']);
                            return Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Total ulasan: $total',
                                    style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 14 * scale)),
                                const SizedBox(height: 8),
                                for (int star = 5; star >= 1; star--)
                                  Padding(
                                    padding: const EdgeInsets.symmetric(
                                        vertical: 4.0),
                                    child: Row(
                                      children: [
                                        const Icon(Icons.star,
                                            size: 16,
                                            color: ThemeConfig.colorRating),
                                        const SizedBox(width: 4),
                                        Text(
                                          '$star',
                                          style: TextStyle(
                                              fontSize: 12 * scale),
                                        ),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: LinearProgressIndicator(
                                            value: total == 0
                                                ? 0
                                                : (dist[star]! / total),
                                            minHeight: 8,
                                            backgroundColor:
                                                Colors.grey.shade200,
                                            color: ThemeConfig.colorRating,
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        Text('${dist[star]}'),
                                      ],
                                    ),
                                  ),
                              ],
                            );
                          },
                        ),
                        const SizedBox(height: 16),
                        Text('Ulasan Pembeli',
                            style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 16 * scale)),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Consumer<ReviewsProvider>(
                              builder: (context, rev, _) {
                                final currentSort =
                                    rev.sortFor(widget.product['id']);
                                return DropdownButton<String>(
                                  value: currentSort,
                                  items: [
                                    DropdownMenuItem(
                                        value: 'newest',
                                        child: Text('Terbaru',
                                            style: TextStyle(
                                                fontSize: 14 * scale))),
                                    DropdownMenuItem(
                                        value: 'rating_desc',
                                        child: Text('Terbanyak Bintang',
                                            style: TextStyle(
                                                fontSize: 14 * scale))),
                                  ],
                                  onChanged: (val) {
                                    if (val == null) return;
                                    Provider.of<ReviewsProvider>(context,
                                            listen: false)
                                        .loadInitial(widget.product['id'],
                                            sort: val);
                                  },
                                );
                              },
                            ),
                            const Spacer(),
                            Consumer<ReviewsProvider>(
                              builder: (context, rev, _) {
                                final canLoad =
                                    rev.hasMore(widget.product['id']) &&
                                        !rev.isLoading(widget.product['id']);
                                return TextButton(
                                  onPressed: canLoad
                                      ? () => rev.loadMore(widget.product['id'])
                                      : null,
                                  child: const Text('Muat lagi'),
                                );
                              },
                            )
                          ],
                        ),
                        Consumer<ReviewsProvider>(
                          builder: (context, rev, _) {
                            final list = rev.getReviews(widget.product['id']);
                            if (list.isEmpty) {
                              return Padding(
                                padding:
                                    const EdgeInsets.symmetric(vertical: 16),
                                child: Text(
                                  'Belum ada ulasan tertulis.',
                                  style: TextStyle(
                                      color: Colors.grey.shade500,
                                      fontSize: 14 * scale),
                                ),
                              );
                            }
                            return Column(
                              children: [
                                for (final r in list.take(3))
                                  Container(
                                    margin: const EdgeInsets.only(bottom: 12),
                                    padding: EdgeInsets.all(12 * scale),
                                    decoration: BoxDecoration(
                                      color: Colors.grey.shade50,
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            CircleAvatar(
                                              radius: 12,
                                              backgroundColor:
                                                  Colors.grey.shade300,
                                              backgroundImage: r['user']
                                                          ?['imageUrl'] !=
                                                      null
                                                  ? NetworkImage(
                                                      MarketApiService()
                                                          .resolveFileUrl(
                                                              r['user']
                                                                  ['imageUrl']))
                                                  : null,
                                              child:
                                                  r['user']?['imageUrl'] == null
                                                      ? const Icon(Icons.person,
                                                          size: 14,
                                                          color: Colors.white)
                                                      : null,
                                            ),
                                            const SizedBox(width: 8),
                                            Expanded(
                                              child: Text(
                                                r['userName'] ??
                                                    r['user']?['name'] ??
                                                    'Pengguna',
                                                style: TextStyle(
                                                    fontWeight: FontWeight.bold,
                                                    fontSize: 12 * scale),
                                              ),
                                            ),
                                            Row(
                                              children: List.generate(
                                                  5,
                                                  (i) => Icon(
                                                        Icons.star,
                                                        size: 12,
                                                        color: i <
                                                                (r['rating'] ??
                                                                    0)
                                                            ? ThemeConfig
                                                                .colorRating
                                                            : Colors
                                                                .grey.shade300,
                                                      )),
                                            ),
                                          ],
                                        ),
                                        if (r['comment'] != null &&
                                            r['comment'].toString().isNotEmpty)
                                          Padding(
                                            padding:
                                                const EdgeInsets.only(top: 8),
                                              child: Text(
                                                r['comment'],
                                                style: TextStyle(
                                                    fontSize: 13 * scale,
                                                    color: Colors.grey.shade800),
                                              ),
                                          ),
                                      ],
                                    ),
                                  ),
                                if (list.length > 3)
                                  TextButton(
                                    onPressed: () {
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (_) => MarketReviewsScreen(
                                            productId:
                                                widget.product['id'].toString(),
                                            productName: widget.product['name'],
                                          ),
                                        ),
                                      );
                                    },
                                    child: Text('Lihat Semua Ulasan',
                                        style: TextStyle(
                                            fontSize: 14 * scale)),
                                  ),
                              ],
                            );
                          },
                        ),
                        const SizedBox(height: 12),
                        // Review form – gated by purchase
                        const SizedBox(height: 12),
                        if (_hasPurchased) ...[
                          Text('Tulis Ulasan Kamu',
                              style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16 * scale)),
                          const SizedBox(height: 8),
                          Row(
                            children: List.generate(5, (i) {
                              final val = i + 1;
                              return IconButton(
                                onPressed: () =>
                                    setState(() => _rating = val),
                                icon: Icon(
                                  Icons.star,
                                  color: _rating >= val
                                      ? const Color(0xFFF2CC8F)
                                      : Colors.grey.shade400,
                                  size: 24 * scale,
                                ),
                              );
                            }),
                          ),
                          TextField(
                            controller: _commentCtrl,
                            decoration: const InputDecoration(
                                border: OutlineInputBorder(),
                                labelText: 'Tulis ulasan'),
                            maxLines: 2,
                          ),
                          const SizedBox(height: 8),
                          Align(
                            alignment: Alignment.centerRight,
                            child: FilledButton(
                              onPressed: () async {
                                final auth = Provider.of<AuthProvider>(context,
                                    listen: false);
                                if (!auth.isAuthenticated) {
                                  final ok = await Navigator.push<bool>(
                                    context,
                                    MaterialPageRoute(
                                        builder: (_) => const LoginScreen()),
                                  );
                                  if (ok != true || !context.mounted) return;
                                }
                                final rev = Provider.of<ReviewsProvider>(context,
                                    listen: false);
                                await rev.addReview(
                                  productId: widget.product['id'],
                                  rating: _rating,
                                  comment: _commentCtrl.text,
                                  userName: auth.user?['name'],
                                );
                                _commentCtrl.clear();
                                if (!context.mounted) return;
                                ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                        content: Text('Ulasan terkirim')));
                              },
                              child: Text('Kirim Ulasan',
                                  style: TextStyle(fontSize: 14 * scale)),
                            ),
                          ),
                        ] else ...[
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Colors.grey.shade50,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Colors.grey.shade200),
                            ),
                            child: Row(
                              children: [
                                Icon(Icons.lock_outline,
                                    color: Colors.grey.shade400, size: 20),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    'Beli produk ini terlebih dahulu untuk memberikan ulasan.',
                                    style: TextStyle(
                                        color: Colors.grey.shade500,
                                        fontSize: 13 * scale),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Bottom Action Bar removed (duplicate)
        ],
      ),
    );
  }
}
