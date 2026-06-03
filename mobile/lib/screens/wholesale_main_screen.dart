import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:shimmer/shimmer.dart';
import 'package:rana_merchant/config/theme_config.dart';
import 'package:rana_merchant/data/remote/api_service.dart';
import 'package:rana_merchant/models/wholesale_product.dart';
import 'package:rana_merchant/providers/wholesale_cart_provider.dart';
import 'package:rana_merchant/screens/wholesale_cart_screen.dart';
import 'package:rana_merchant/screens/wholesale_order_list_screen.dart';
import 'package:rana_merchant/screens/wholesale_scan_screen.dart';
import 'package:rana_merchant/utils/format_utils.dart';

// ─── Entry Shell ────────────────────────────────────────────────────────────
class WholesaleMainScreen extends StatefulWidget {
  const WholesaleMainScreen({super.key});
  @override
  State<WholesaleMainScreen> createState() => _WholesaleMainScreenState();
}

class _WholesaleMainScreenState extends State<WholesaleMainScreen> {
  int _tab = 0;

  Future<void> _handleScan() async {
    final code = await Navigator.push<String>(
      context,
      MaterialPageRoute(builder: (_) => const WholesaleScanScreen()),
    );
    if (code == null || !mounted) return;
    try {
      await ApiService().scanQrOrder(code);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pesanan berhasil diterima!')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Gagal scan: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      const _MarketplaceView(),
      const WholesaleOrderListScreen(),
    ];
    return Scaffold(
      body: IndexedStack(index: _tab, children: pages),
      bottomNavigationBar: NavigationBar(
        height: 60,
        elevation: 0,
        backgroundColor: Theme.of(context).colorScheme.surface,
        indicatorColor: ThemeConfig.brandColor.withOpacity(0.15),
        selectedIndex: _tab,
        onDestinationSelected: (i) {
          if (i == 2) {
            _handleScan();
          } else {
            setState(() => _tab = i);
          }
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.storefront_outlined),
            selectedIcon: Icon(Icons.storefront, color: ThemeConfig.brandColor),
            label: 'Marketplace',
          ),
          NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined),
            selectedIcon: Icon(Icons.receipt_long, color: ThemeConfig.brandColor),
            label: 'Pesanan',
          ),
          NavigationDestination(
            icon: Icon(Icons.qr_code_scanner),
            label: 'Scan',
          ),
        ],
      ),
    );
  }
}

// ─── Main Marketplace View ───────────────────────────────────────────────────
class _MarketplaceView extends StatefulWidget {
  const _MarketplaceView();
  @override
  State<_MarketplaceView> createState() => _MarketplaceViewState();
}

class _MarketplaceViewState extends State<_MarketplaceView> {
  final _searchCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();

  List<dynamic> _categories = [];
  List<WholesaleDistributor> _distributors = [];
  List<WholesaleProduct> _products = [];
  List<WholesaleProduct> _filtered = [];

  String _selectedCat = 'Semua';
  String? _selectedDist; // distributorId
  String _searchQuery = '';
  bool _loading = true;
  bool _searchActive = false;
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    _scrollCtrl.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await Future.wait([
        ApiService().getWholesaleCategories(),
        ApiService().getWholesaleProducts(),
        ApiService().getWholesaleDistributors(),
      ]);
      final cats = res[0] as List;
      final prods = res[1] as List;
      final dists = res[2] as List;
      if (!mounted) return;
      setState(() {
        _categories = cats;
        _products = prods.map((p) => WholesaleProduct.fromJson(p)).toList();
        _distributors =
            dists.map((d) => WholesaleDistributor.fromJson(d)).toList();
        _applyFilter();
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _applyFilter() {
    _filtered = _products.where((p) {
      final matchCat = _selectedCat == 'Semua' ||
          p.categoryId == _selectedCat ||
          p.categoryName == _selectedCat;
      final matchDist =
          _selectedDist == null || p.distributorId == _selectedDist;
      final matchSearch = _searchQuery.isEmpty ||
          p.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          p.supplier.toLowerCase().contains(_searchQuery.toLowerCase());
      return matchCat && matchDist && matchSearch;
    }).toList();
  }

  void _onSearchChanged(String v) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), () {
      if (!mounted) return;
      setState(() {
        _searchQuery = v;
        _applyFilter();
      });
    });
  }

  void _selectCategory(String cat) =>
      setState(() { _selectedCat = cat; _applyFilter(); });

  void _selectDist(String? id) =>
      setState(() { _selectedDist = id; _applyFilter(); });

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Scaffold(
      backgroundColor: cs.surface,
      body: RefreshIndicator(
        onRefresh: _load,
        child: CustomScrollView(
          controller: _scrollCtrl,
          slivers: [
            _buildAppBar(cs),
            if (_loading)
              SliverFillRemaining(child: _buildShimmer())
            else ...[
              if (!_searchActive) _buildDistributorRow(),
              _buildCategoryRow(cs),
              _buildProductGrid(cs),
            ],
          ],
        ),
      ),
    );
  }

  // ── App Bar dengan Search ──
  Widget _buildAppBar(ColorScheme cs) {
    return SliverAppBar(
      pinned: true,
      backgroundColor: ThemeConfig.brandColor,
      title: _searchActive
          ? TextField(
              controller: _searchCtrl,
              autofocus: true,
              style: GoogleFonts.poppins(color: Colors.white, fontSize: 14),
              cursorColor: Colors.white,
              decoration: InputDecoration(
                hintText: 'Cari produk, distributor...',
                hintStyle:
                    GoogleFonts.poppins(color: Colors.white70, fontSize: 14),
                border: InputBorder.none,
              ),
              onChanged: _onSearchChanged,
            )
          : Text('Rana Grosir',
              style: GoogleFonts.poppins(
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                  fontSize: 18)),
      actions: [
        IconButton(
          icon: Icon(_searchActive ? Icons.close : Icons.search,
              color: Colors.white),
          onPressed: () {
            setState(() {
              _searchActive = !_searchActive;
              if (!_searchActive) {
                _searchCtrl.clear();
                _searchQuery = '';
                _applyFilter();
              }
            });
          },
        ),
        Stack(
          children: [
            IconButton(
              icon: const Icon(Icons.shopping_cart_outlined, color: Colors.white),
              onPressed: () => Navigator.push(context,
                  MaterialPageRoute(builder: (_) => const WholesaleCartScreen())),
            ),
            Consumer<WholesaleCartProvider>(
              builder: (_, cart, __) => cart.itemCount == 0
                  ? const SizedBox.shrink()
                  : Positioned(
                      right: 6,
                      top: 6,
                      child: Container(
                        padding: const EdgeInsets.all(3),
                        decoration: const BoxDecoration(
                            color: Colors.yellow, shape: BoxShape.circle),
                        child: Text('${cart.itemCount}',
                            style: const TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                                color: Colors.black)),
                      ),
                    ),
            ),
          ],
        ),
      ],
    );
  }

  // ── Distributor Row (seperti "Toko" di Shopee) ──
  Widget _buildDistributorRow() {
    if (_distributors.isEmpty) return const SliverToBoxAdapter(child: SizedBox.shrink());
    return SliverToBoxAdapter(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
            child: Row(
              children: [
                const Icon(Icons.storefront, size: 16, color: ThemeConfig.brandColor),
                const SizedBox(width: 6),
                Text('Distributor',
                    style: GoogleFonts.poppins(
                        fontWeight: FontWeight.w700, fontSize: 13)),
                const Spacer(),
                if (_selectedDist != null)
                  GestureDetector(
                    onTap: () => _selectDist(null),
                    child: Text('Lihat Semua',
                        style: GoogleFonts.poppins(
                            fontSize: 12, color: ThemeConfig.brandColor)),
                  ),
              ],
            ),
          ),
          SizedBox(
            height: 90,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              itemCount: _distributors.length,
              itemBuilder: (_, i) {
                final d = _distributors[i];
                final selected = _selectedDist == d.id;
                return GestureDetector(
                  onTap: () => _selectDist(selected ? null : d.id),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    margin: const EdgeInsets.only(right: 10),
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: selected
                          ? ThemeConfig.brandColor.withOpacity(0.12)
                          : Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.35),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: selected
                            ? ThemeConfig.brandColor
                            : Colors.transparent,
                        width: 1.5,
                      ),
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        CircleAvatar(
                          radius: 22,
                          backgroundColor: selected
                              ? ThemeConfig.brandColor
                              : ThemeConfig.brandColor.withOpacity(0.15),
                          child: Text(
                            d.companyName.isNotEmpty
                                ? d.companyName[0].toUpperCase()
                                : 'D',
                            style: TextStyle(
                              color:
                                  selected ? Colors.white : ThemeConfig.brandColor,
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                        ),
                        const SizedBox(height: 4),
                        SizedBox(
                          width: 70,
                          child: Text(
                            d.companyName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            textAlign: TextAlign.center,
                            style: GoogleFonts.poppins(
                                fontSize: 10,
                                fontWeight: selected
                                    ? FontWeight.w700
                                    : FontWeight.normal),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 4),
        ],
      ),
    );
  }

  // ── Category Pills ──
  Widget _buildCategoryRow(ColorScheme cs) {
    final all = ['Semua', ..._categories.map((c) => c['name']?.toString() ?? '')];
    return SliverToBoxAdapter(
      child: SizedBox(
        height: 38,
        child: ListView.builder(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          itemCount: all.length,
          itemBuilder: (_, i) {
            final cat = all[i];
            final active = _selectedCat == cat;
            return GestureDetector(
              onTap: () => _selectCategory(cat),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                margin: const EdgeInsets.only(right: 8),
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(
                  color: active
                      ? ThemeConfig.brandColor
                      : cs.surfaceVariant.withOpacity(0.4),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(cat,
                    style: GoogleFonts.poppins(
                        fontSize: 12,
                        fontWeight:
                            active ? FontWeight.w700 : FontWeight.normal,
                        color: active
                            ? Colors.white
                            : cs.onSurface.withOpacity(0.7))),
              ),
            );
          },
        ),
      ),
    );
  }

  // ── Product Grid ──
  Widget _buildProductGrid(ColorScheme cs) {
    if (_filtered.isEmpty) {
      return SliverFillRemaining(
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.inventory_2_outlined,
                  size: 64, color: cs.onSurface.withOpacity(0.2)),
              const SizedBox(height: 12),
              Text('Produk tidak ditemukan',
                  style: GoogleFonts.poppins(
                      color: cs.onSurface.withOpacity(0.5))),
            ],
          ),
        ),
      );
    }
    return SliverPadding(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 80),
      sliver: SliverGrid(
        delegate: SliverChildBuilderDelegate(
          (_, i) => _ProductCard(product: _filtered[i]),
          childCount: _filtered.length,
        ),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          childAspectRatio: 0.62,
          crossAxisSpacing: 10,
          mainAxisSpacing: 10,
        ),
      ),
    );
  }

  // ── Shimmer Loading ──
  Widget _buildShimmer() {
    return Shimmer.fromColors(
      baseColor: Colors.grey[200]!,
      highlightColor: Colors.grey[100]!,
      child: GridView.builder(
        padding: const EdgeInsets.all(12),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          childAspectRatio: 0.62,
          crossAxisSpacing: 10,
          mainAxisSpacing: 10,
        ),
        itemCount: 6,
        itemBuilder: (_, __) => Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
    );
  }
}

// ─── Product Card (Shopee-style) ─────────────────────────────────────────────
class _ProductCard extends StatelessWidget {
  final WholesaleProduct product;
  const _ProductCard({required this.product});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final fmt = NumberFormat.compactCurrency(
        locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

    return GestureDetector(
      onTap: () => _showDetail(context),
      child: Container(
        decoration: BoxDecoration(
          color: cs.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: cs.outlineVariant.withOpacity(0.5)),
          boxShadow: [
            BoxShadow(
                color: Colors.black.withOpacity(0.04),
                blurRadius: 6,
                offset: const Offset(0, 2))
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Image ──
            AspectRatio(
              aspectRatio: 1,
              child: ClipRRect(
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(12)),
                child: product.image.isNotEmpty
                    ? Image.network(
                        ApiService().resolveFileUrl(product.image),
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => _placeholder(cs),
                      )
                    : _placeholder(cs),
              ),
            ),
            // ── Info ──
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(8, 6, 8, 6),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      product.name,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.poppins(
                          fontSize: 11.5, fontWeight: FontWeight.w500),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      fmt.format(product.wholesalePrice),
                      style: GoogleFonts.poppins(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: ThemeConfig.brandColor),
                    ),
                    if (product.pricingTiers.length > 1) ...[
                      const SizedBox(height: 2),
                      Text(
                        's/d ${fmt.format(product.pricingTiers.last.price)}',
                        style: GoogleFonts.poppins(
                            fontSize: 10,
                            color: Colors.green[700],
                            fontWeight: FontWeight.w500),
                      ),
                    ],
                    const SizedBox(height: 4),
                    // Seller badge
                    Row(
                      children: [
                        const Icon(Icons.store,
                            size: 11, color: ThemeConfig.brandColor),
                        const SizedBox(width: 3),
                        Expanded(
                          child: Text(
                            product.supplier,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.poppins(
                                fontSize: 10,
                                color: ThemeConfig.brandColor,
                                fontWeight: FontWeight.w500),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 5, vertical: 1),
                          decoration: BoxDecoration(
                            color: ThemeConfig.brandColor.withOpacity(0.08),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            'Min ${product.moq} ${product.unit}',
                            style: GoogleFonts.poppins(
                                fontSize: 9,
                                color: ThemeConfig.brandColor,
                                fontWeight: FontWeight.w600),
                          ),
                        ),
                        const SizedBox(width: 4),
                        if (product.stockQuantity < 20)
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 5, vertical: 1),
                            decoration: BoxDecoration(
                              color: Colors.orange.withOpacity(0.12),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              'Sisa ${product.stockQuantity}',
                              style: GoogleFonts.poppins(
                                  fontSize: 9,
                                  color: Colors.orange[800],
                                  fontWeight: FontWeight.w600),
                            ),
                          ),
                      ],
                    ),
                    const Spacer(),
                    // Add to cart button
                    SizedBox(
                      width: double.infinity,
                      height: 28,
                      child: Consumer<WholesaleCartProvider>(
                        builder: (ctx, cart, _) => ElevatedButton(
                          onPressed: product.stockQuantity <= 0
                              ? null
                              : () {
                                  cart.addItem(
                                    product.id,
                                    product.name,
                                    product.wholesalePrice,
                                    product.image,
                                    product.supplier,
                                  );
                                  ScaffoldMessenger.of(ctx).showSnackBar(
                                    SnackBar(
                                      content:
                                          Text('${product.name} ditambahkan'),
                                      duration: const Duration(seconds: 1),
                                      backgroundColor: ThemeConfig.brandColor,
                                    ),
                                  );
                                },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: ThemeConfig.brandColor,
                            foregroundColor: Colors.white,
                            padding: EdgeInsets.zero,
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(6)),
                            elevation: 0,
                          ),
                          child: Text(
                            product.stockQuantity <= 0
                                ? 'Habis'
                                : '+ Keranjang',
                            style: GoogleFonts.poppins(
                                fontSize: 10, fontWeight: FontWeight.w600),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _placeholder(ColorScheme cs) {
    // Pilih ikon berdasarkan kategori produk
    final cat = (product.categoryName ?? '').toLowerCase();
    IconData icon = Icons.inventory_2_outlined;
    Color color = cs.onSurface.withOpacity(0.2);
    Color bg = cs.surfaceVariant.withOpacity(0.3);

    if (cat.contains('makan') || cat.contains('snack') || cat.contains('camilan')) {
      icon = Icons.fastfood_outlined;
      color = Colors.orange.withOpacity(0.5);
      bg = Colors.orange.withOpacity(0.08);
    } else if (cat.contains('minum')) {
      icon = Icons.local_drink_outlined;
      color = Colors.blue.withOpacity(0.5);
      bg = Colors.blue.withOpacity(0.08);
    } else if (cat.contains('sembako')) {
      icon = Icons.rice_bowl_outlined;
      color = Colors.green.withOpacity(0.5);
      bg = Colors.green.withOpacity(0.08);
    } else if (cat.contains('bersih') || cat.contains('rumah')) {
      icon = Icons.clean_hands_outlined;
      color = Colors.teal.withOpacity(0.5);
      bg = Colors.teal.withOpacity(0.08);
    }

    return Container(
      color: bg,
      child: Center(
        child: Icon(icon, size: 40, color: color),
      ),
    );
  }

  void _showDetail(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => _ProductDetailScreen(product: product),
      ),
    );
  }
}

// ─── Product Detail Screen (Shopee-style) ────────────────────────────────────
class _ProductDetailScreen extends StatefulWidget {
  final WholesaleProduct product;
  const _ProductDetailScreen({required this.product});
  @override
  State<_ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<_ProductDetailScreen> {
  int _qty = 1;
  int _imgIndex = 0;
  final PageController _imgCtrl = PageController();

  @override
  void initState() {
    super.initState();
    final p = widget.product;
    _qty = p.moq > 0 ? p.moq : 1;
  }

  @override
  void dispose() {
    _imgCtrl.dispose();
    super.dispose();
  }

  double get _currentPrice => widget.product.priceForQty(_qty);

  @override
  Widget build(BuildContext context) {
    final p = widget.product;
    final cs = Theme.of(context).colorScheme;
    final fmt = NumberFormat.currency(
        locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);
    final fmtC = NumberFormat.compactCurrency(
        locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);
    final images = p.images.isNotEmpty ? p.images : (p.image.isNotEmpty ? [p.image] : <String>[]);

    return Scaffold(
      backgroundColor: cs.surface,
      body: CustomScrollView(
        slivers: [
          // ── Image Carousel ──
          SliverAppBar(
            expandedHeight: 320,
            pinned: true,
            backgroundColor: ThemeConfig.brandColor,
            flexibleSpace: FlexibleSpaceBar(
              background: images.isEmpty
                  ? Container(
                      color: cs.surfaceVariant.withOpacity(0.3),
                      child: Center(
                        child: Icon(Icons.inventory_2_outlined,
                            size: 80, color: cs.onSurface.withOpacity(0.2)),
                      ),
                    )
                  : Stack(
                      children: [
                        PageView.builder(
                          controller: _imgCtrl,
                          itemCount: images.length,
                          onPageChanged: (i) =>
                              setState(() => _imgIndex = i),
                          itemBuilder: (_, i) => Image.network(
                            ApiService().resolveFileUrl(images[i]),
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => Container(
                              color: cs.surfaceVariant,
                              child: const Icon(Icons.image_not_supported),
                            ),
                          ),
                        ),
                        if (images.length > 1)
                          Positioned(
                            bottom: 12,
                            left: 0,
                            right: 0,
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: List.generate(
                                images.length,
                                (i) => AnimatedContainer(
                                  duration: const Duration(milliseconds: 200),
                                  margin: const EdgeInsets.symmetric(horizontal: 3),
                                  width: _imgIndex == i ? 18 : 6,
                                  height: 6,
                                  decoration: BoxDecoration(
                                    color: _imgIndex == i
                                        ? ThemeConfig.brandColor
                                        : Colors.white60,
                                    borderRadius: BorderRadius.circular(3),
                                  ),
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
            ),
          ),

          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Price + Name
                  Text(fmt.format(_currentPrice),
                      style: GoogleFonts.poppins(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: ThemeConfig.brandColor)),
                  const SizedBox(height: 4),
                  Text(p.name,
                      style: GoogleFonts.poppins(
                          fontSize: 16, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),

                  // Badges row
                  Wrap(
                    spacing: 6,
                    children: [
                      _badge('Min ${p.moq} ${p.unit}',
                          ThemeConfig.brandColor.withOpacity(0.1),
                          ThemeConfig.brandColor),
                      _badge('Stok ${p.stockQuantity} ${p.unit}',
                          Colors.green.withOpacity(0.1), Colors.green[700]!),
                      if (p.categoryName != null)
                        _badge(p.categoryName!,
                            cs.surfaceVariant, cs.onSurfaceVariant),
                    ],
                  ),
                  const SizedBox(height: 16),
                  const Divider(),

                  // Seller Card
                  _buildSellerCard(cs, p),
                  const Divider(),

                  // Pricing tiers
                  if (p.pricingTiers.length > 1) ...[
                    _buildPricingTiers(cs, p, fmtC),
                    const Divider(),
                  ],

                  // Qty picker
                  _buildQtyPicker(cs, p, fmt),
                  const SizedBox(height: 16),
                  const Divider(),

                  // Description
                  if (p.description.isNotEmpty) ...[
                    Text('Deskripsi Produk',
                        style: GoogleFonts.poppins(
                            fontWeight: FontWeight.w700, fontSize: 14)),
                    const SizedBox(height: 6),
                    Text(p.description,
                        style: GoogleFonts.poppins(
                            fontSize: 13, height: 1.6,
                            color: cs.onSurface.withOpacity(0.75))),
                    const SizedBox(height: 80),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: _buildBottomBar(cs, fmt),
    );
  }

  Widget _badge(String text, Color bg, Color fg) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration:
            BoxDecoration(color: bg, borderRadius: BorderRadius.circular(6)),
        child: Text(text,
            style: GoogleFonts.poppins(
                fontSize: 11, fontWeight: FontWeight.w600, color: fg)),
      );

  // Seller card — info distributor
  Widget _buildSellerCard(ColorScheme cs, WholesaleProduct p) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        children: [
          CircleAvatar(
            radius: 22,
            backgroundColor: ThemeConfig.brandColor.withOpacity(0.15),
            child: Text(
              p.supplier.isNotEmpty ? p.supplier[0].toUpperCase() : 'D',
              style: const TextStyle(
                  color: ThemeConfig.brandColor,
                  fontWeight: FontWeight.bold,
                  fontSize: 18),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(p.supplier,
                    style: GoogleFonts.poppins(
                        fontWeight: FontWeight.w700, fontSize: 14)),
                Row(
                  children: [
                    const Icon(Icons.verified,
                        size: 12, color: ThemeConfig.brandColor),
                    const SizedBox(width: 3),
                    Text('Distributor Terverifikasi',
                        style: GoogleFonts.poppins(
                            fontSize: 11, color: ThemeConfig.brandColor)),
                  ],
                ),
              ],
            ),
          ),
          OutlinedButton(
            onPressed: () {
              // Filter by this distributor in parent — pop and select
              Navigator.pop(context);
            },
            style: OutlinedButton.styleFrom(
              foregroundColor: ThemeConfig.brandColor,
              side: const BorderSide(color: ThemeConfig.brandColor),
              padding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            child: Text('Lihat Toko',
                style: GoogleFonts.poppins(
                    fontSize: 11, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }

  // Pricing tiers table
  Widget _buildPricingTiers(
      ColorScheme cs, WholesaleProduct p, NumberFormat fmt) {
    final sorted = [...p.pricingTiers]
      ..sort((a, b) => a.minQty.compareTo(b.minQty));    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Text('Harga Grosir',
              style: GoogleFonts.poppins(
                  fontWeight: FontWeight.w700, fontSize: 14)),
        ),
        Table(
          border: TableBorder.all(
              color: cs.outlineVariant.withOpacity(0.4),
              borderRadius: BorderRadius.circular(8)),
          columnWidths: const {
            0: FlexColumnWidth(1),
            1: FlexColumnWidth(1),
          },
          children: [
            TableRow(
              decoration:
                  BoxDecoration(color: cs.surfaceVariant.withOpacity(0.4)),
              children: [
                Padding(
                  padding: const EdgeInsets.all(8),
                  child: Text('Jumlah',
                      style: GoogleFonts.poppins(
                          fontSize: 12, fontWeight: FontWeight.w600)),
                ),
                Padding(
                  padding: const EdgeInsets.all(8),
                  child: Text('Harga / ${p.unit}',
                      style: GoogleFonts.poppins(
                          fontSize: 12, fontWeight: FontWeight.w600)),
                ),
              ],
            ),
            ...sorted.asMap().entries.map((e) {
              final t = e.value;
              final next = e.key < sorted.length - 1
                  ? sorted[e.key + 1]
                  : null;
              final isActive = _qty >= t.minQty &&
                  (next == null || _qty < next.minQty);
              final label = next != null
                  ? '${t.minQty}–${next.minQty - 1} ${p.unit}'
                  : '≥ ${t.minQty} ${p.unit}';
              return TableRow(
                decoration: BoxDecoration(
                  color: isActive
                      ? ThemeConfig.brandColor.withOpacity(0.08)
                      : null,
                ),
                children: [
                  Padding(
                    padding: const EdgeInsets.all(8),
                    child: Text(label,
                        style: GoogleFonts.poppins(
                            fontSize: 12,
                            fontWeight: isActive
                                ? FontWeight.w700
                                : FontWeight.normal)),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(8),
                    child: Text(fmt.format(t.price),
                        style: GoogleFonts.poppins(
                            fontSize: 12,
                            color: isActive
                                ? ThemeConfig.brandColor
                                : null,
                            fontWeight: isActive
                                ? FontWeight.w700
                                : FontWeight.normal)),
                  ),
                ],
              );
            }),
          ],
        ),
      ],
    );
  }

  // Qty picker
  Widget _buildQtyPicker(
      ColorScheme cs, WholesaleProduct p, NumberFormat fmt) {
    final total = _currentPrice * _qty;
    return Row(
      children: [
        Text('Jumlah:',
            style: GoogleFonts.poppins(
                fontWeight: FontWeight.w600, fontSize: 14)),
        const Spacer(),
        IconButton(
          icon: const Icon(Icons.remove_circle_outline),
          color: ThemeConfig.brandColor,
          onPressed: _qty <= p.moq
              ? null
              : () => setState(() => _qty = (_qty - 1).clamp(p.moq, 9999)),
        ),
        SizedBox(
          width: 48,
          child: Text(
            '$_qty',
            textAlign: TextAlign.center,
            style: GoogleFonts.poppins(
                fontSize: 16, fontWeight: FontWeight.w700),
          ),
        ),
        IconButton(
          icon: const Icon(Icons.add_circle_outline),
          color: ThemeConfig.brandColor,
          onPressed: _qty >= p.stockQuantity
              ? null
              : () => setState(() => _qty++),
        ),
        const SizedBox(width: 8),
        Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text('Total',
                style: GoogleFonts.poppins(
                    fontSize: 11,
                    color: cs.onSurface.withOpacity(0.5))),
            Text(fmt.format(total),
                style: GoogleFonts.poppins(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: ThemeConfig.brandColor)),
          ],
        ),
      ],
    );
  }

  // Bottom action bar
  Widget _buildBottomBar(ColorScheme cs, NumberFormat fmt) {
    final p = widget.product;
    return Consumer<WholesaleCartProvider>(
      builder: (ctx, cart, _) => Container(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 20),
        decoration: BoxDecoration(
          color: cs.surface,
          boxShadow: [
            BoxShadow(
                color: Colors.black.withOpacity(0.08),
                blurRadius: 12,
                offset: const Offset(0, -4))
          ],
        ),
        child: SafeArea(
          top: false,
          child: Row(
            children: [
              // Wishlist / cart count
              Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    icon: const Icon(Icons.shopping_cart_outlined),
                    color: ThemeConfig.brandColor,
                    onPressed: () => Navigator.push(
                      ctx,
                      MaterialPageRoute(
                          builder: (_) => const WholesaleCartScreen()),
                    ),
                  ),
                  Text('${cart.itemCount}',
                      style: GoogleFonts.poppins(
                          fontSize: 10, color: ThemeConfig.brandColor)),
                ],
              ),
              const SizedBox(width: 8),
              Expanded(
                child: FilledButton(
                  onPressed: p.stockQuantity <= 0
                      ? null
                      : () {
                          for (var i = 0; i < _qty; i++) {
                            cart.addItem(
                              p.id,
                              p.name,
                              _currentPrice,
                              p.image,
                              p.supplier,
                            );
                          }
                          ScaffoldMessenger.of(ctx).showSnackBar(
                            SnackBar(
                              content: Text(
                                  '$_qty ${p.unit} ${p.name} ditambahkan'),
                              backgroundColor: ThemeConfig.brandColor,
                              duration: const Duration(seconds: 1),
                            ),
                          );
                        },
                  style: FilledButton.styleFrom(
                    backgroundColor: ThemeConfig.brandColor,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10)),
                  ),
                  child: Text(
                    p.stockQuantity <= 0
                        ? 'Stok Habis'
                        : '+ Tambah ke Keranjang',
                    style: GoogleFonts.poppins(
                        fontWeight: FontWeight.w700, fontSize: 14),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
