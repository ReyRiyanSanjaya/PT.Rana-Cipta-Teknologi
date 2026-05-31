import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:intl/intl.dart';
import 'package:rana_market/config/theme_config.dart';
import 'package:rana_market/data/market_api_service.dart';

class TableOrderScreen extends StatefulWidget {
  final String qrCode;
  const TableOrderScreen({super.key, required this.qrCode});

  @override
  State<TableOrderScreen> createState() => _TableOrderScreenState();
}

class _TableOrderScreenState extends State<TableOrderScreen> {
  Map<String, dynamic>? _tableData;
  List<dynamic> _menu = [];
  bool _isLoading = true;
  String? _error;

  // Cart: productId → {product, quantity, notes}
  final Map<String, Map<String, dynamic>> _cart = {};

  @override
  void initState() {
    super.initState();
    _loadTableMenu();
  }

  Future<void> _loadTableMenu() async {
    try {
      final response = await MarketApiService().dio.get('/table/qr/${widget.qrCode}');
      if (response.data['status'] == 'success') {
        final data = response.data['data'];
        if (mounted) {
          setState(() {
            _tableData = data;
            _menu = data['menu'] ?? [];
            _isLoading = false;
          });
        }
      } else {
        setState(() { _error = response.data['message'] ?? 'Meja tidak ditemukan'; _isLoading = false; });
      }
    } catch (e) {
      if (mounted) setState(() { _error = 'Gagal memuat menu: $e'; _isLoading = false; });
    }
  }

  void _addToCart(Map<String, dynamic> product) {
    final id = product['id'];
    setState(() {
      if (_cart.containsKey(id)) {
        _cart[id]!['quantity'] = (_cart[id]!['quantity'] as int) + 1;
      } else {
        _cart[id] = {'product': product, 'quantity': 1, 'notes': ''};
      }
    });
  }

  void _removeFromCart(String productId) {
    setState(() {
      if (_cart.containsKey(productId)) {
        final qty = _cart[productId]!['quantity'] as int;
        if (qty <= 1) {
          _cart.remove(productId);
        } else {
          _cart[productId]!['quantity'] = qty - 1;
        }
      }
    });
  }

  int get _totalItems => _cart.values.fold(0, (sum, item) => sum + (item['quantity'] as int));
  double get _totalPrice => _cart.values.fold(0.0, (sum, item) {
    final product = item['product'] as Map<String, dynamic>;
    final price = (product['sellingPrice'] as num?)?.toDouble() ?? 0;
    return sum + (price * (item['quantity'] as int));
  });

  Future<void> _submitOrder() async {
    if (_cart.isEmpty) return;

    final items = _cart.values.map((item) {
      final product = item['product'] as Map<String, dynamic>;
      return {
        'productId': product['id'],
        'productName': product['name'],
        'quantity': item['quantity'],
        'price': (product['sellingPrice'] as num?)?.toDouble() ?? 0,
        'notes': item['notes'],
      };
    }).toList();

    try {
      final response = await MarketApiService().dio.post(
        '/table/qr/${widget.qrCode}/order',
        data: {'items': items},
      );

      if (mounted) {
        if (response.data['status'] == 'success') {
          setState(() => _cart.clear());
          _showSuccessDialog();
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(response.data['message'] ?? 'Gagal')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gagal: $e')));
      }
    }
  }

  void _showSuccessDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 16),
            const Icon(Icons.check_circle_rounded, color: Colors.green, size: 72),
            const SizedBox(height: 16),
            Text('Pesanan Terkirim!', style: GoogleFonts.outfit(fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text('Pesanan Anda sedang disiapkan.\nMohon tunggu di meja Anda.',
                textAlign: TextAlign.center, style: TextStyle(color: Colors.grey.shade600, height: 1.5)),
          ],
        ),
        actions: [
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: () { Navigator.pop(ctx); },
              child: const Text('OK'),
            ),
          ),
          SizedBox(
            width: double.infinity,
            child: TextButton(
              onPressed: () { Navigator.pop(ctx); _requestBill(); },
              child: const Text('Minta Bill'),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _requestBill() async {
    try {
      await MarketApiService().dio.post('/table/qr/${widget.qrCode}/bill');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Bill diminta. Pelayan akan segera datang.'), backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gagal: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (_error != null) {
      return Scaffold(
        body: Center(child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 64, color: Colors.grey.shade400),
            const SizedBox(height: 16),
            Text(_error!, style: TextStyle(color: Colors.grey.shade600)),
            const SizedBox(height: 16),
            ElevatedButton(onPressed: () => Navigator.pop(context), child: const Text('Kembali')),
          ],
        )),
      );
    }

    final table = _tableData?['table'] as Map<String, dynamic>?;
    final store = _tableData?['store'] as Map<String, dynamic>?;
    final tableNum = table?['number'] ?? '?';
    final storeName = store?['name'] ?? 'Restoran';

    // Group menu by category
    final Map<String, List<dynamic>> grouped = {};
    for (final item in _menu) {
      final cat = (item['category'] is Map ? item['category']['name'] : null) ?? 'Menu';
      grouped.putIfAbsent(cat, () => []).add(item);
    }

    return Scaffold(
      backgroundColor: ThemeConfig.beigeBackground,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(storeName, style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16)),
            Text('Meja $tableNum', style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
          ],
        ),
        backgroundColor: ThemeConfig.beigeBackground,
        elevation: 0,
        actions: [
          TextButton.icon(
            onPressed: _requestBill,
            icon: const Icon(Icons.receipt_long, size: 18),
            label: const Text('Bill'),
          ),
        ],
      ),
      body: Column(
        children: [
          // Menu list
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: grouped.entries.map((entry) {
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      child: Text(entry.key.toUpperCase(),
                          style: GoogleFonts.outfit(fontSize: 13, fontWeight: FontWeight.bold, letterSpacing: 1, color: Colors.grey.shade600)),
                    ),
                    ...entry.value.map((item) => _buildMenuItem(Map<String, dynamic>.from(item))),
                  ],
                );
              }).toList(),
            ),
          ),

          // Cart summary bar
          if (_cart.isNotEmpty)
            Container(
              padding: const EdgeInsets.fromLTRB(20, 12, 12, 12),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.08), blurRadius: 16, offset: const Offset(0, -4))],
              ),
              child: SafeArea(
                top: false,
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('$_totalItems item', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
                          Text('Rp${_formatCurrency(_totalPrice)}', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w800, color: ThemeConfig.brandColor)),
                        ],
                      ),
                    ),
                    FilledButton.icon(
                      onPressed: _submitOrder,
                      icon: const Icon(Icons.send_rounded, size: 18),
                      label: const Text('Pesan Sekarang'),
                      style: FilledButton.styleFrom(
                        backgroundColor: ThemeConfig.brandColor,
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                    ),
                  ],
                ),
              ),
            ).animate().slideY(begin: 1, duration: 300.ms),
        ],
      ),
    );
  }

  Widget _buildMenuItem(Map<String, dynamic> product) {
    final id = product['id'] as String;
    final name = product['name'] ?? '';
    final price = (product['sellingPrice'] as num?)?.toDouble() ?? 0;
    final imageUrl = product['imageUrl'];
    final inCart = _cart[id]?['quantity'] ?? 0;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: inCart > 0 ? Border.all(color: ThemeConfig.brandColor.withOpacity(0.4), width: 1.5) : null,
      ),
      child: Row(
        children: [
          // Image
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: imageUrl != null && imageUrl.toString().isNotEmpty
                ? CachedNetworkImage(
                    imageUrl: MarketApiService().resolveFileUrl(imageUrl),
                    width: 64, height: 64, fit: BoxFit.cover,
                    errorWidget: (_, __, ___) => _buildPlaceholder(),
                  )
                : _buildPlaceholder(),
          ),
          const SizedBox(width: 12),
          // Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: GoogleFonts.outfit(fontWeight: FontWeight.w600, fontSize: 14), maxLines: 2, overflow: TextOverflow.ellipsis),
                const SizedBox(height: 4),
                Text('Rp${_formatCurrency(price)}', style: GoogleFonts.outfit(fontWeight: FontWeight.w800, color: ThemeConfig.brandColor, fontSize: 15)),
              ],
            ),
          ),
          // Quantity controls
          if (inCart > 0)
            Row(
              children: [
                _buildQtyBtn(Icons.remove, () => _removeFromCart(id)),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  child: Text('$inCart', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16)),
                ),
                _buildQtyBtn(Icons.add, () => _addToCart(product)),
              ],
            )
          else
            _buildQtyBtn(Icons.add, () => _addToCart(product)),
        ],
      ),
    );
  }

  Widget _buildQtyBtn(IconData icon, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 32, height: 32,
        decoration: BoxDecoration(
          color: ThemeConfig.brandColor.withOpacity(0.1),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(icon, color: ThemeConfig.brandColor, size: 18),
      ),
    );
  }

  Widget _buildPlaceholder() {
    return Container(
      width: 64, height: 64,
      decoration: BoxDecoration(color: Colors.grey.shade200, borderRadius: BorderRadius.circular(12)),
      child: Icon(Icons.restaurant_menu, color: Colors.grey.shade400),
    );
  }

  String _formatCurrency(double amount) {
    return NumberFormat('#,###', 'id_ID').format(amount.round());
  }
}
