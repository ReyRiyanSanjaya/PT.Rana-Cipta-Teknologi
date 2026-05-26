import 'package:rana_merchant/config/merchant_config.dart';
import 'package:flutter/material.dart';
import 'dart:async';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:shimmer/shimmer.dart';
import 'package:rana_merchant/config/theme_config.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:rana_merchant/providers/wholesale_cart_provider.dart';
import 'package:rana_merchant/screens/wholesale_cart_screen.dart';
import 'package:rana_merchant/screens/wholesale_order_list_screen.dart'; // [NEW]
import 'package:rana_merchant/data/remote/api_service.dart';

class PurchaseScreen extends StatefulWidget {
  const PurchaseScreen({super.key});

  @override
  State<PurchaseScreen> createState() => _PurchaseScreenState();
}

class _PurchaseScreenState extends State<PurchaseScreen> {
  List<dynamic> _categories = [];
  List<dynamic> _products = [];
  List<dynamic> _banners = []; // [NEW]
  List<dynamic> _allProducts = [];
  bool _isLoading = true;
  String _selectedCat = 'Semua';
  String _searchQuery = '';
  String _sortKey = 'pop';
  Timer? _searchDebounce;
  List<String> _supplierOptions = [];
  Set<String> _selectedSuppliers = {};
  double _priceMin = 0;
  double _priceMax = 0;
  RangeValues? _priceRange;

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  void _computeFilterOptions() {
    try {
      final prices = _allProducts.map((e) {
        final p = e['price'];
        if (p is int) return p.toDouble();
        if (p is double) return p;
        if (p is String) return double.tryParse(p) ?? 0.0;
        return 0.0;
      }).toList();
      if (prices.isNotEmpty) {
        prices.sort();
        _priceMin = prices.first;
        _priceMax = prices.last;
        _priceRange ??= RangeValues(_priceMin, _priceMax);
      }
      final set = <String>{};
      for (final e in _allProducts) {
        final s = (e['supplierName'] ?? '').toString().trim();
        if (s.isNotEmpty) set.add(s);
      }
      _supplierOptions = set.toList()..sort();
      setState(() {});
    } catch (_) {}
  }

  void _openFilterSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (_) {
        final scheme = Theme.of(context).colorScheme;
        final rv = _priceRange ?? RangeValues(_priceMin, _priceMax);
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
            left: 16, right: 16, top: 16,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Filter Produk', style: GoogleFonts.poppins(fontWeight: FontWeight.bold, fontSize: 16)),
              const SizedBox(height: 12),
              Text('Rentang Harga', style: GoogleFonts.poppins(fontWeight: FontWeight.w600)),
              RangeSlider(
                min: _priceMin,
                max: _priceMax,
                values: rv,
                divisions: 10,
                labels: RangeLabels(
                  NumberFormat.currency(locale: 'id_ID', symbol: '${MerchantConfig.defaultCurrencySymbol} ', decimalDigits: 0).format(rv.start),
                  NumberFormat.currency(locale: 'id_ID', symbol: '${MerchantConfig.defaultCurrencySymbol} ', decimalDigits: 0).format(rv.end),
                ),
                onChanged: (val) => setState(() => _priceRange = val),
              ),
              const SizedBox(height: 8),
              Text('Supplier', style: GoogleFonts.poppins(fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _supplierOptions.map((s) {
                  final sel = _selectedSuppliers.contains(s);
                  return ChoiceChip(
                    label: Text(s),
                    selected: sel,
                    onSelected: (_) {
                      setState(() {
                        if (sel) {
                          _selectedSuppliers.remove(s);
                        } else {
                          _selectedSuppliers.add(s);
                        }
                      });
                    },
                    selectedColor: scheme.primary.withOpacity(0.15),
                    labelStyle: GoogleFonts.poppins(color: sel ? scheme.primary : scheme.onSurface),
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  TextButton(
                    onPressed: () {
                      setState(() {
                        _selectedSuppliers.clear();
                        _priceRange = RangeValues(_priceMin, _priceMax);
                      });
                    },
                    child: const Text('Reset'),
                  ),
                  const Spacer(),
                  FilledButton(
                    onPressed: () {
                      Navigator.pop(context);
                      _applyFilterAndSort();
                    },
                    child: const Text('Terapkan'),
                  )
                ],
              ),
              const SizedBox(height: 16),
            ],
          ),
        );
      },
    );
  }

  void _applyFilterAndSort() {
    List<dynamic> src = List<dynamic>.from(_allProducts);
    // Price
    final rv = _priceRange ?? RangeValues(_priceMin, _priceMax);
    src = src.where((e) {
      final p = e['price'];
      double price = 0;
      if (p is int) price = p.toDouble();
      else if (p is double) price = p;
      else if (p is String) price = double.tryParse(p) ?? 0.0;
      return price >= rv.start && price <= rv.end;
    }).toList();
    // Suppliers
    if (_selectedSuppliers.isNotEmpty) {
      src = src.where((e) => _selectedSuppliers.contains((e['supplierName'] ?? '').toString())).toList();
    }
    // Sort
    int numOrZero(dynamic v) {
      if (v == null) return 0;
      if (v is int) return v;
      if (v is double) return v.toInt();
      if (v is String) return int.tryParse(v) ?? 0;
      return 0;
    }
    double priceOf(dynamic it) {
      final p = it['price'];
      if (p is int) return p.toDouble();
      if (p is double) return p;
      if (p is String) return double.tryParse(p) ?? 0.0;
      return 0.0;
    }
    if (_sortKey == 'cheap') {
      src.sort((a, b) => priceOf(a).compareTo(priceOf(b)));
    } else if (_sortKey == 'exp') {
      src.sort((a, b) => priceOf(b).compareTo(priceOf(a)));
    } else if (_sortKey == 'rate') {
      src.sort((a, b) => (double.tryParse((b['rating'] ?? '0').toString()) ?? 0)
          .compareTo(double.tryParse((a['rating'] ?? '0').toString()) ?? 0));
    } else {
      src.sort((a, b) => numOrZero(b['soldCount']).compareTo(numOrZero(a['soldCount'])));
    }
    setState(() => _products = src);
  }
  void _applySort() {
    List<dynamic> src = List<dynamic>.from(_products);
    int numOrZero(dynamic v) {
      if (v == null) return 0;
      if (v is int) return v;
      if (v is double) return v.toInt();
      if (v is String) {
        return int.tryParse(v) ?? 0;
      }
      return 0;
    }
    double priceOf(dynamic it) {
      final p = it['price'];
      if (p is int) return p.toDouble();
      if (p is double) return p;
      if (p is String) return double.tryParse(p) ?? 0.0;
      return 0.0;
    }
    if (_sortKey == 'cheap') {
      src.sort((a, b) => priceOf(a).compareTo(priceOf(b)));
    } else if (_sortKey == 'exp') {
      src.sort((a, b) => priceOf(b).compareTo(priceOf(a)));
    } else if (_sortKey == 'rate') {
      src.sort((a, b) => (double.tryParse((b['rating'] ?? '0').toString()) ?? 0)
          .compareTo(double.tryParse((a['rating'] ?? '0').toString()) ?? 0));
    } else {
      src.sort((a, b) => numOrZero(b['soldCount']).compareTo(numOrZero(a['soldCount'])));
    }
    setState(() => _products = src);
  }

  @override
  void dispose() {
    _searchDebounce?.cancel();
    super.dispose();
  }

  Future<void> _fetchData() async {
    try {
      final cats = await ApiService().getWholesaleCategories();
      final prods = await ApiService().getWholesaleProducts();
      final banners = await ApiService().getWholesaleBanners(); // [NEW]

      if (mounted) {
        setState(() {
          _categories = [
            'Semua',
            ...(cats ?? []).map((c) => c['name'] ?? 'Unknown')
          ];
          _allProducts = prods ?? [];
          _products = List<dynamic>.from(_allProducts);
          _banners = banners ?? [];
          _isLoading = false;
        });
        _computeFilterOptions();
        _applySort();
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
      print('Error fetching purchase data: $e');
    }
  }

  Future<void> _refreshProducts() async {
    setState(() => _isLoading = true);
    try {
      final prods = await ApiService()
          .getWholesaleProducts(category: _selectedCat, search: _searchQuery);
      if (mounted) {
        setState(() {
          _allProducts = prods ?? [];
          _products = List<dynamic>.from(_allProducts);
          _isLoading = false;
        });
        _computeFilterOptions();
        _applySort();
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final bool isDarkTheme = colorScheme.brightness == Brightness.dark;
    final List<Color> headerGradientColors = isDarkTheme
        ? [
            colorScheme.surface.withOpacity(0.98),
            colorScheme.surface.withOpacity(0.94),
          ]
        : [
            colorScheme.primary.withOpacity(0.9),
            colorScheme.primary.withOpacity(0.8),
          ];

    return Scaffold(
      backgroundColor: colorScheme.surface,
      appBar: AppBar(
        title: Text('Rana Grosir (B2B)',
            style: GoogleFonts.poppins(
                fontWeight: FontWeight.bold, color: colorScheme.onPrimary)),
        backgroundColor: Colors.transparent,
        foregroundColor: colorScheme.onPrimary,
        iconTheme: IconThemeData(color: colorScheme.onPrimary),
        elevation: 0,
        flexibleSpace: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: headerGradientColors,
            ),
          ),
        ),
        actions: [
          Consumer<WholesaleCartProvider>(
            builder: (ctx, cart, _) => Row(
              children: [
                IconButton(
                  icon: Icon(Icons.history,
                      color: Theme.of(context).colorScheme.primary),
                  onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                          builder: (_) => const WholesaleOrderListScreen())),
                ),
                Padding(
                  padding: const EdgeInsets.only(right: 16.0),
                  child: Center(
                    child: Badge(
                      isLabelVisible: cart.itemCount > 0,
                      label: Text('${cart.itemCount}'),
                      child: IconButton(
                        icon: Icon(Icons.shopping_cart_outlined,
                            color: Theme.of(context).colorScheme.primary),
                        onPressed: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (_) => const WholesaleCartScreen())),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          )
        ],
      ),
      body: LayoutBuilder(
        builder: (context, constraints) {
          if (_isLoading) {
            return Shimmer.fromColors(
              baseColor: Theme.of(context).colorScheme.surface,
              highlightColor: Theme.of(context).colorScheme.onSurface.withOpacity(0.06),
              child: GridView.builder(
                padding: const EdgeInsets.all(16),
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: ThemeConfig.gridColumns(context, mobile: 2),
                  childAspectRatio: 0.70,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                ),
                itemCount: 8,
                itemBuilder: (_, __) => Container(
                  decoration: BoxDecoration(
                      color: Colors.white, borderRadius: BorderRadius.circular(20)),
                ),
              ),
            );
          }

          final isWide = constraints.maxWidth >= 900;
          final width = constraints.maxWidth;

          int crossAxisCount = ThemeConfig.gridColumns(context, mobile: 2);
          double childAspectRatio = 0.70;

          if (width >= 1200) {
            childAspectRatio = 0.78;
          } else if (width >= 1000) {
            childAspectRatio = 0.75;
          } else if (width >= 800) {
            childAspectRatio = 0.72;
          }

          final content = SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  color: Theme.of(context).colorScheme.surface,
                  child: TextField(
                    onChanged: (val) {
                      _searchQuery = val;
                      _searchDebounce?.cancel();
                      _searchDebounce = Timer(const Duration(milliseconds: 350), _refreshProducts);
                    },
                    decoration: InputDecoration(
                      hintText: 'Cari barang grosir...',
                      prefixIcon: const Icon(Icons.search),
                      suffixIcon: PopupMenuButton<String>(
                        icon: const Icon(Icons.tune_rounded),
                        onSelected: (k) {
                          setState(() => _sortKey = k);
                          _applyFilterAndSort();
                        },
                        itemBuilder: (_) => const [
                          PopupMenuItem(value: 'pop', child: Text('Terpopuler')),
                          PopupMenuItem(value: 'cheap', child: Text('Termurah')),
                          PopupMenuItem(value: 'exp', child: Text('Termahal')),
                          PopupMenuItem(value: 'rate', child: Text('Rating Tertinggi')),
                        ],
                      ),
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: BorderSide.none),
                      filled: true,
                      fillColor:
                          Theme.of(context).colorScheme.surface.withOpacity(0.7),
                      contentPadding: const EdgeInsets.symmetric(
                          vertical: 0, horizontal: 16),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Row(
                    children: [
                      OutlinedButton.icon(
                        onPressed: _openFilterSheet,
                        icon: const Icon(Icons.filter_list_rounded),
                        label: const Text('Filter'),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                      const SizedBox(width: 8),
                      if (_selectedSuppliers.isNotEmpty)
                        Expanded(
                          child: SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            child: Row(
                              children: _selectedSuppliers.map((s) => Padding(
                                padding: const EdgeInsets.only(right: 6),
                                child: InputChip(
                                  label: Text(s, overflow: TextOverflow.ellipsis),
                                  onDeleted: () {
                                    setState(() {
                                      _selectedSuppliers.remove(s);
                                    });
                                    _applyFilterAndSort();
                                  },
                                ),
                              )).toList(),
                            ),
                          ),
                        )
                    ],
                  ),
                ),
                SizedBox(
                  height: 140,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    children: _banners.isEmpty
                        ? [
                            _buildBanner(
                                const Color(0xFFE07A5F),
                                "Diskon Juragan",
                                "Potongan 50rb!",
                                Icons.discount,
                                null),
                            const SizedBox(width: 12),
                            _buildBanner(
                                const Color(0xFFE07A5F),
                                "Gratis Ongkir",
                                "Min. Blj 1 Juta",
                                Icons.local_shipping,
                                null),
                          ]
                        : _banners
                            .map((b) => Padding(
                                  padding: const EdgeInsets.only(right: 12),
                  child: _buildBanner(
                                      const Color(0xFFE07A5F),
                                      b['title'],
                                      b['description'] ?? '',
                                      Icons.star,
                                      b['imageUrl']),
                                ))
                            .toList(),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: _categories
                          .map((c) => Padding(
                                padding: const EdgeInsets.only(right: 8),
                                child: ChoiceChip(
                                  label: Text(c.toString()),
                                  selected: _selectedCat == c,
                                  onSelected: (val) {
                                    setState(() => _selectedCat = c.toString());
                                    _refreshProducts();
                                  },
                                  selectedColor:
                                      Theme.of(context)
                                          .colorScheme
                                          .primary
                                          .withOpacity(0.2),
                                  labelStyle: TextStyle(
                                      color: _selectedCat == c
                                          ? Theme.of(context)
                                              .colorScheme
                                              .primary
                                          : Theme.of(context).colorScheme.onSurface.withOpacity(0.87)),
                                ),
                              ))
                          .toList(),
                    ),
                  ),
                ),
                if (_products.isEmpty)
                  Center(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 32),
                      child: Column(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(20),
                            decoration: BoxDecoration(
                              color: Theme.of(context).colorScheme.primary.withOpacity(0.07),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(Icons.storefront_outlined, size: 44,
                                color: Theme.of(context).colorScheme.primary.withOpacity(0.45)),
                          ),
                          const SizedBox(height: 16),
                          Text('Produk Tidak Ditemukan',
                              style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold,
                                  color: Theme.of(context).colorScheme.onSurface.withOpacity(0.65))),
                          const SizedBox(height: 8),
                          Text(
                            _searchQuery.isNotEmpty
                                ? 'Tidak ada barang grosir yang cocok dengan "$_searchQuery"'
                                : 'Belum ada produk tersedia di kategori ini.',
                            textAlign: TextAlign.center,
                            style: GoogleFonts.outfit(fontSize: 13, height: 1.5,
                                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.42)),
                          ),
                        ],
                      ).animate().fadeIn(duration: 400.ms).scale(begin: const Offset(0.92, 0.92)),
                    ),
                  )
                else
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: crossAxisCount,
                        childAspectRatio: childAspectRatio,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                      ),
                      itemCount: _products.length,
                      itemBuilder: (context, index) =>
                          _buildProductCard(_products[index]),
                    ),
                  ),
                const SizedBox(height: 32),
              ],
            ),
          );

          if (!isWide) {
            return content;
          }

          return Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 900),
              child: content,
            ),
          );
        },
      ),
      bottomNavigationBar: Consumer<WholesaleCartProvider>(
        builder: (ctx, cart, _) {
          if (cart.itemCount == 0) return const SizedBox.shrink();
          final totalFmt = NumberFormat.currency(locale: 'id_ID', symbol: '${MerchantConfig.defaultCurrencySymbol} ', decimalDigits: 0)
              .format(cart.totalAmount);
          return Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              boxShadow: const [
                BoxShadow(color: Colors.black12, blurRadius: 10, offset: Offset(0, -4))
              ],
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text('Total Keranjang',
                          style: GoogleFonts.poppins(fontWeight: FontWeight.w600)),
                      const SizedBox(height: 4),
                      Text(totalFmt,
                          style: GoogleFonts.poppins(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                              color: Theme.of(context).colorScheme.primary)),
                    ],
                  ),
                ),
                FilledButton(
                  onPressed: () => Navigator.push(
                      context, MaterialPageRoute(builder: (_) => const WholesaleCartScreen())),
                  style: FilledButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12)),
                  child: const Text('Lanjut Checkout'),
                )
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildBanner(
      Color color, String title, String sub, IconData icon, String? imageUrl) {
    final hasImage =
        imageUrl != null && imageUrl.toString().trim().isNotEmpty;
    final resolvedImageUrl =
        hasImage ? ApiService().resolveFileUrl(imageUrl.toString()) : '';
    return Container(
      width: 260,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          color: hasImage
              ? Theme.of(context).colorScheme.surface
              : color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.3)),
          image: hasImage
              ? DecorationImage(
                  image: NetworkImage(resolvedImageUrl),
                  fit: BoxFit.cover,
                  colorFilter: ColorFilter.mode(
                      Theme.of(context).colorScheme.onSurface.withOpacity(0.4), BlendMode.darken))
              : null),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(title,
                    style: GoogleFonts.poppins(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                        color: hasImage
                            ? Theme.of(context).colorScheme.surface
                            : color.withOpacity(0.8))),
                Text(sub,
                    style: GoogleFonts.poppins(
                        fontSize: 12,
                        color: hasImage
                            ? Theme.of(context)
                                .colorScheme
                                .onSurface
                                .withOpacity(0.7)
                            : Colors.grey.shade700),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis),
                const SizedBox(height: 8),
                if (!hasImage)
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                        color: color, borderRadius: BorderRadius.circular(4)),
                    child: Text('CEK SEKARANG',
                        style: TextStyle(
                            color: Theme.of(context).colorScheme.surface,
                            fontSize: 10,
                            fontWeight: FontWeight.bold)),
                  )
              ],
            ),
          ),
          if (!hasImage)
            Icon(icon, size: 64, color: color.withOpacity(0.2))
        ],
      ),
    );
  }

  Widget _buildProductCard(dynamic item) {
    final double price = (item['price'] is int)
        ? (item['price'] as int).toDouble()
        : (item['price'] as double);
    final fmtPrice =
        NumberFormat.currency(locale: 'id_ID', symbol: '${MerchantConfig.defaultCurrencySymbol} ', decimalDigits: 0)
            .format(price);

    return GestureDetector(
      onTap: () {
        showModalBottomSheet(
            context: context,
            isScrollControlled: true,
            useSafeArea: true,
            backgroundColor: Theme.of(context).colorScheme.surface,
            shape: const RoundedRectangleBorder(
                borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
            builder: (_) => _ProductDetailSheet(item: item));
      },
      child: Container(
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: Theme.of(context).colorScheme.primary.withOpacity(0.15),
            width: 1.5,
          ),
          boxShadow: [
            BoxShadow(
              color: Theme.of(context).colorScheme.shadow.withOpacity(0.03),
              blurRadius: 10,
              offset: const Offset(0, 6),
            )
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surface.withOpacity(0.7),
                    borderRadius:
                        const BorderRadius.vertical(top: Radius.circular(18)),
                    image: (item['imageUrl'] != null && item['imageUrl'] != '')
                        ? DecorationImage(
                            image: NetworkImage(item['imageUrl']),
                            fit: BoxFit.cover)
                        : null),
                child: (item['imageUrl'] == null || item['imageUrl'] == '')
                    ? Center(
                        child: Icon(Icons.image,
                            color: Theme.of(context)
                                .colorScheme
                                .onSurface
                                .withOpacity(0.5)))
                      : Stack(
                          children: [
                            Positioned(
                              top: 8,
                              right: 8,
                              child: Container(
                                padding: const EdgeInsets.all(4),
                                decoration: BoxDecoration(
                                    color: Theme.of(context).colorScheme.surface, shape: BoxShape.circle),
                                child: Icon(Icons.favorite_border,
                                    size: 16,
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onSurface
                                        .withOpacity(0.6)),
                              ),
                            ),
                            Positioned(
                              bottom: 8,
                              right: 8,
                              child: Material(
                                color: Colors.transparent,
                                child: InkWell(
                                  onTap: () {
                                    final double price = (item['price'] is int)
                                        ? (item['price'] as int).toDouble()
                                        : (item['price'] as double);
                                    Provider.of<WholesaleCartProvider>(context, listen: false).addItem(
                                        item['id'],
                                        item['name'],
                                        price,
                                        item['imageUrl'] ?? '',
                                        item['supplierName'] ?? 'No Supplier');
                                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                                      content: Row(children: [
                                        const Icon(Icons.check_circle_rounded, color: Colors.white),
                                        const SizedBox(width: 8),
                                        Text('Ditambahkan ke keranjang!',
                                            style: GoogleFonts.outfit(fontWeight: FontWeight.w600)),
                                      ]),
                                      backgroundColor: const Color(0xFF81B29A),
                                      behavior: SnackBarBehavior.floating,
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                      duration: const Duration(seconds: 2),
                                    ));
                                  },
                                  borderRadius: BorderRadius.circular(999),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                    decoration: BoxDecoration(
                                        color: Theme.of(context).colorScheme.primary,
                                        borderRadius: BorderRadius.circular(999)),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: const [
                                        Icon(Icons.add_shopping_cart_rounded, size: 14, color: Colors.white),
                                        SizedBox(width: 6),
                                        Text('Tambah', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700)),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            )
                          ],
                      ),
              ),
            ),
            // Info
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                        color: Theme.of(context)
                            .colorScheme
                            .surface
                            .withOpacity(0.7),
                        borderRadius: BorderRadius.circular(4)),
                    child: Text(item['category']?['name'] ?? 'General',
                        style: GoogleFonts.poppins(
                            fontSize: 10,
                            color: Theme.of(context)
                                .colorScheme
                                .onSurface
                                .withOpacity(0.7))),
                  ),
                  const SizedBox(height: 4),
                  Text(item['name'],
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.poppins(
                          fontSize: 13, fontWeight: FontWeight.w500)),
                  const SizedBox(height: 4),
                  Text(fmtPrice,
                      style: GoogleFonts.poppins(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: Theme.of(context).colorScheme.primary)),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Icon(Icons.store,
                          size: 12,
                          color: Theme.of(context)
                              .colorScheme
                              .onSurface
                              .withOpacity(0.6)),
                      const SizedBox(width: 4),
                      Expanded(
                          child: Text(item['supplierName'] ?? 'No Supplier',
                              style: TextStyle(
                                  fontSize: 10,
                                  color: Theme.of(context)
                                      .colorScheme
                                      .onSurface
                                      .withOpacity(0.6)),
                              overflow: TextOverflow.ellipsis)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.star,
                          size: 12, color: Color(0xFFF2CC8F)),
                      Text(' ${item['rating'] ?? 0.0} ',
                          style: const TextStyle(
                              fontSize: 10, fontWeight: FontWeight.bold)),
                      Text('| ${item['soldCount'] ?? 0} Terjual',
                          style: TextStyle(
                              fontSize: 10,
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurface
                                  .withOpacity(0.6))),
                    ],
                  )
                ],
              ),
            )
          ],
        ),
      ),
    );
  }
}

// ==========================================
// BOTTOM SHEET DETAIL
// ==========================================
class _ProductDetailSheet extends StatefulWidget {
  final Map<String, dynamic> item;
  const _ProductDetailSheet({required this.item});

  @override
  State<_ProductDetailSheet> createState() => _ProductDetailSheetState();
}

class _ProductDetailSheetState extends State<_ProductDetailSheet> {
  int _qty = 1;

  @override
  Widget build(BuildContext context) {
    final double price = (widget.item['price'] is int)
        ? (widget.item['price'] as int).toDouble()
        : (widget.item['price'] as double);
    final fmtPrice =
        NumberFormat.currency(locale: 'id_ID', symbol: '${MerchantConfig.defaultCurrencySymbol} ', decimalDigits: 0)
            .format(price);

    final imageUrl = widget.item['imageUrl'];

    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      appBar: AppBar(
        title: const Text('Detail Produk'),
        leading: IconButton(
            icon: const Icon(Icons.close),
            onPressed: () => Navigator.pop(context)),
        elevation: 0,
        backgroundColor: Colors.transparent,
        foregroundColor: Theme.of(context).colorScheme.onPrimary,
        flexibleSpace: Builder(
          builder: (ctx) {
            final detailScheme = Theme.of(ctx).colorScheme;
            final bool detailDark =
                detailScheme.brightness == Brightness.dark;
            final List<Color> detailHeaderColors = detailDark
                ? [
                    detailScheme.surface.withOpacity(0.98),
                    detailScheme.surface.withOpacity(0.94),
                  ]
                : [
                    detailScheme.primary.withOpacity(0.9),
                    detailScheme.primary.withOpacity(0.8),
                  ];
            return Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: detailHeaderColors,
                ),
              ),
            );
          },
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Container(
                      height: 300,
                      color: Theme.of(context)
                          .colorScheme
                          .surface
                          .withOpacity(0.7),
                      child: (imageUrl != null && imageUrl != '')
                          ? Image.network(
                              ApiService().resolveFileUrl(imageUrl),
                              fit: BoxFit.cover,
                            )
                          : Icon(Icons.image,
                              size: 120,
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurface
                                  .withOpacity(0.5))),
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(fmtPrice,
                          style: GoogleFonts.poppins(
                              fontSize: 26 * ThemeConfig.tabletScale(context, mobile: 1.0),
                                fontWeight: FontWeight.bold,
                                color: Theme.of(context).colorScheme.primary)),
                        const SizedBox(height: 8),
                        Text(widget.item['name'],
                            style:
                                GoogleFonts.poppins(fontSize: 18 * ThemeConfig.tabletScale(context, mobile: 1.0), height: 1.3)),
                        const SizedBox(height: 16),
                        const Divider(),
                        ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: CircleAvatar(
                              backgroundColor: Theme.of(context).colorScheme.primary,
                              child: Icon(Icons.store, color: Theme.of(context).colorScheme.onSurface)),
                          title: Text(
                              widget.item['supplierName'] ?? 'No Supplier',
                              style: GoogleFonts.poppins(
                                  fontWeight: FontWeight.bold)),
                          subtitle: Row(
                            children: [
                              const Icon(Icons.star,
                                  size: 14, color: Color(0xFFF2CC8F)),
                              Text(' ${widget.item['rating'] ?? '4.5'}',
                                  style: const TextStyle(fontSize: 12)),
                            ],
                          ),
                          trailing: OutlinedButton(
                              onPressed: () {}, child: const Text('Kunjungi')),
                        ),
                        const Divider(),
                        const SizedBox(height: 16),
                        Text('Deskripsi Produk',
                            style: GoogleFonts.poppins(
                                fontWeight: FontWeight.bold, fontSize: 16 * ThemeConfig.tabletScale(context, mobile: 1.0))),
                        const SizedBox(height: 8),
                        Text(
                          widget.item['description'] ?? "Tidak ada deskripsi.",
                          style: GoogleFonts.poppins(
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurface
                                  .withOpacity(0.75),
                              height: 1.6),
                        ),
                      ],
                    ),
                  )
                ],
              ),
            ),
          ),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Theme.of(context).colorScheme.surface, boxShadow: [
              BoxShadow(
                  color: Colors.black12,
                  blurRadius: 10,
                  offset: const Offset(0, -2))
            ]),
            child: Row(
              children: [
                Container(
                  decoration: BoxDecoration(
                      border: Border.all(
                          color: Theme.of(context)
                              .colorScheme
                              .outline
                              .withOpacity(0.3)),
                      borderRadius: BorderRadius.circular(8)),
                  child: Row(
                    children: [
                      IconButton(
                          onPressed: () =>
                              setState(() => _qty = _qty > 1 ? _qty - 1 : 1),
                          icon: const Icon(Icons.remove)),
                      Text('$_qty',
                          style: const TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 16)),
                      IconButton(
                          onPressed: () => setState(() => _qty++),
                          icon: const Icon(Icons.add)),
                    ],
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: FilledButton(
                    onPressed: () {
                      final cart = Provider.of<WholesaleCartProvider>(context, listen: false);
                      for (int i = 0; i < _qty; i++) {
                        cart.addItem(
                            widget.item['id'],
                            widget.item['name'],
                            price,
                            widget.item['imageUrl'] ?? '',
                            widget.item['supplierName'] ?? 'No Supplier');
                      }
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                          content: Text('Berhasil masuk keranjang!'),
                          backgroundColor: Colors.green));
                    },
                    style: FilledButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        backgroundColor:
                            Theme.of(context).colorScheme.primary,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8))),
                    child: const Text('Tambah ke Keranjang',
                        style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                )
              ],
            ),
          )
        ],
      ),
    );
  }
}
