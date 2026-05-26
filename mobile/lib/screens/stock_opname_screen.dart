import 'package:rana_merchant/config/merchant_config.dart';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kDebugMode, debugPrint;
import 'package:provider/provider.dart';
import 'package:rana_merchant/data/local/database_helper.dart';
import 'package:rana_merchant/data/remote/api_service.dart';
import 'package:rana_merchant/providers/auth_provider.dart';
import 'package:rana_merchant/screens/add_product_screen.dart';
import 'package:rana_merchant/screens/product_barcode_screen.dart';
import 'package:barcode_widget/barcode_widget.dart';
import 'package:screenshot/screenshot.dart';
import 'package:rana_merchant/services/printer_service.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:rana_merchant/services/ai_service.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';
import 'package:flutter/services.dart';
import 'dart:ui';

class StockOpnameScreen extends StatefulWidget {
  const StockOpnameScreen({super.key});

  @override
  State<StockOpnameScreen> createState() => _StockOpnameScreenState();
}

class _StockOpnameScreenState extends State<StockOpnameScreen> {
  final ApiService _api = ApiService();
  final _searchCtrl = TextEditingController();
  List<Map<String, dynamic>> _allProducts = [];
  List<Map<String, dynamic>> _products = [];
  bool _isLoading = false;

  int _totalProducts = 0;
  int _lowStockCount = 0;
  String _selectedCategory = 'Semua';
  List<String> _categories = ['Semua'];

  final ScreenshotController _barcodeShotCtrl = ScreenshotController();
  String _barcodeSku = '';
  String? _barcodeName;
  bool _printingAll = false;
  String? _selectedPrintCategory;
  int _copiesPerSku = 1;
  bool _includeNameOnBarcode = true;
  bool _onlyInStock = false;

  @override
  void initState() {
    super.initState();
    _refreshData();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _refreshData() async {
    setState(() => _isLoading = true);
    try {
      final data = await DatabaseHelper.instance.getAllProducts();
      int low = 0;
      final Set<String> cats = {'Semua'};
      for (var p in data) {
        if ((p['stock'] ?? 0) <= 5) low++;
        final cat = p['category']?.toString() ?? '';
        if (cat.isNotEmpty) cats.add(cat);
      }

      setState(() {
        _allProducts = data;
        _products = data;
        _totalProducts = data.length;
        _lowStockCount = low;
        _categories = cats.toList()..sort((a, b) => a == 'Semua' ? -1 : (b == 'Semua' ? 1 : a.compareTo(b)));
      });
      _filterProducts(_searchCtrl.text);
    } catch (e) {
      if (mounted)
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _filterProducts(String query) {
    final q = query.toLowerCase().trim();
    setState(() {
      _products = _allProducts.where((p) {
        final name = (p['name'] ?? '').toString().toLowerCase();
        final sku = (p['sku'] ?? '').toString().toLowerCase();
        final cat = (p['category'] ?? '').toString();
        
        final matchesQuery = q.isEmpty || name.contains(q) || sku.contains(q);
        final matchesCategory = _selectedCategory == 'Semua' || cat == _selectedCategory;
        
        return matchesQuery && matchesCategory;
      }).toList();
    });
  }

  void _openAiStockAssistant() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => AiAssistantSheetContent(
        onAdjustStock: (p) {
          Navigator.pop(ctx);
          _showAdjustDialog(p);
        },
        onRefreshParent: _refreshData,
        allProducts: _allProducts,
      ),
    );
  }

  void _showAdjustDialog(Map<String, dynamic> product, {int? initialQty}) {
    final qtyCtrl = TextEditingController(text: initialQty?.toString() ?? '');
    String type = 'IN';
    String? reason;
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    showModalBottomSheet(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => StatefulBuilder(
        builder: (context, setSheetState) => Container(
          decoration: BoxDecoration(
            color: theme.scaffoldBackgroundColor,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
          ),
          padding: EdgeInsets.only(
              bottom: MediaQuery.of(context).viewInsets.bottom + 24,
              left: 24,
              right: 24,
              top: 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: colorScheme.outline.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Text('Atur Stok Produk',
                  style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.bold)),
              Text(product['name'],
                  style: GoogleFonts.outfit(
                      color: colorScheme.onSurface.withOpacity(0.6),
                      fontSize: 15)),
              const SizedBox(height: 32),

              Row(
                children: [
                  _buildAdjustTypeButton(
                    label: 'Masuk',
                    icon: Icons.add_circle_outline_rounded,
                    isActive: type == 'IN',
                    color: const Color(0xFF81B29A),
                    onTap: () => setSheetState(() => type = 'IN'),
                  ),
                  const SizedBox(width: 16),
                  _buildAdjustTypeButton(
                    label: 'Keluar',
                    icon: Icons.remove_circle_outline_rounded,
                    isActive: type == 'OUT',
                    color: const Color(0xFFE07A5F),
                    onTap: () => setSheetState(() => type = 'OUT'),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              TextField(
                controller: qtyCtrl,
                keyboardType: TextInputType.number,
                autofocus: true,
                style: GoogleFonts.outfit(fontSize: 32, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
                decoration: InputDecoration(
                  hintText: '0',
                  prefixText: type == 'IN' ? '+' : '-',
                  suffixText: 'Unit',
                  filled: true,
                  fillColor: colorScheme.surfaceContainerHighest.withOpacity(0.3),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(24),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
              const SizedBox(height: 24),

              TextField(
                onChanged: (v) => reason = v,
                decoration: InputDecoration(
                  hintText: 'Catatan (opsional)...',
                  prefixIcon: const Icon(Icons.edit_note_rounded),
                  filled: true,
                  fillColor: colorScheme.surfaceContainerHighest.withOpacity(0.3),
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide.none),
                ),
              ),
              const SizedBox(height: 32),

              FilledButton(
                onPressed: () {
                  final qty = int.tryParse(qtyCtrl.text);
                  if (qty == null || qty <= 0) return;
                  Navigator.pop(context);
                  _submitAdjustment(product['id'], qty, type, reason);
                },
                style: FilledButton.styleFrom(
                  backgroundColor: colorScheme.primary,
                  padding: const EdgeInsets.symmetric(vertical: 18),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20)),
                ),
                child: Text('Konfirmasi Perubahan',
                    style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAdjustTypeButton({
    required String label,
    required IconData icon,
    required bool isActive,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
            color: isActive ? color.withOpacity(0.15) : Colors.transparent,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isActive ? color : Colors.grey.withOpacity(0.2),
              width: 1.5,
            ),
          ),
          child: Column(
            children: [
              Icon(icon, color: isActive ? color : Colors.grey, size: 28),
              const SizedBox(height: 8),
              Text(label,
                  style: GoogleFonts.outfit(
                      color: isActive ? color : Colors.grey,
                      fontWeight: FontWeight.bold)),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _submitAdjustment(
      String productId, int qty, String type, String? reason) async {
    setState(() => _isLoading = true);
    final product = _allProducts.firstWhere((p) => p['id'] == productId);
    int currentStock = product['stock'] ?? 0;
    int newStock = (type == 'IN') ? currentStock + qty : currentStock - qty;

    try {
      await DatabaseHelper.instance.updateProductStock(productId, newStock);
      try {
        await _api.adjustStock(
            productId: productId, quantity: qty, type: type, reason: reason);
      } catch (e) {
        debugPrint('Background sync failed: $e');
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text('Stok ${product['name']} berhasil diperbarui'),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            backgroundColor: Theme.of(context).colorScheme.primary));
      }
      _refreshData();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text('Gagal: $e'),
            backgroundColor: Colors.redAccent));
      }
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    
    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: Stack(
        children: [
          CustomScrollView(
            physics: const BouncingScrollPhysics(),
            slivers: [
              _buildModernAppBar(context),
              
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 8),
                  child: Row(
                    children: [
                      Expanded(
                        child: _buildGlassStatCard(
                          context,
                          'Total Produk',
                          '$_totalProducts',
                          Icons.inventory_2_rounded,
                          colorScheme.primary,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: _buildGlassStatCard(
                          context,
                          'Stok Menipis',
                          '$_lowStockCount',
                          Icons.warning_amber_rounded,
                          _lowStockCount > 0 ? const Color(0xFFE07A5F) : const Color(0xFF81B29A),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              SliverToBoxAdapter(
                child: _buildSearchAndFilters(context),
              ),

              if (_lowStockCount > 0)
                SliverToBoxAdapter(
                  child: _buildLowStockAlertBanner(context),
                ),

              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                sliver: _products.isEmpty
                    ? SliverFillRemaining(
                        hasScrollBody: false,
                        child: _buildEmptyState(context),
                      )
                    : SliverList(
                        delegate: SliverChildBuilderDelegate(
                          (context, index) => _buildModernProductCard(context, _products[index], index),
                          childCount: _products.length,
                        ),
                      ),
              ),
              
              const SliverPadding(padding: EdgeInsets.only(bottom: 100)),
            ],
          ),

          // Hidden Barcode Renderer
          _buildHiddenBarcodeRenderer(),

          // Floating Action Buttons
          _buildFloatingActionButtons(context),
        ],
      ),
    );
  }

  Widget _buildModernAppBar(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return SliverAppBar(
      expandedHeight: 120,
      floating: false,
      pinned: true,
      elevation: 0,
      stretch: true,
      centerTitle: false,
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      flexibleSpace: FlexibleSpaceBar(
        titlePadding: const EdgeInsets.only(left: 20, bottom: 16),
        centerTitle: false,
        title: Text(
          'Manajemen Stok',
          style: GoogleFonts.outfit(
            fontWeight: FontWeight.bold,
            fontSize: 22,
            color: colorScheme.onSurface,
          ),
        ),
        background: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                colorScheme.primary.withOpacity(0.05),
                Theme.of(context).scaffoldBackgroundColor,
              ],
            ),
          ),
        ),
      ),
      actions: [
        Padding(
          padding: const EdgeInsets.only(right: 12),
          child: IconButton.filledTonal(
            onPressed: _isLoading || _products.isEmpty || _printingAll ? null : _openPrintOptions,
            icon: const Icon(Icons.print_rounded),
            tooltip: 'Cetak Barcode',
          ),
        ),
      ],
    );
  }

  Widget _buildGlassStatCard(BuildContext context, String label, String value, IconData icon, Color color) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: colorScheme.outline.withOpacity(0.1)),
        boxShadow: [
          BoxShadow(
            color: color.withOpacity(0.06),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withOpacity(0.12),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(height: 16),
          Text(value,
              style: GoogleFonts.outfit(
                  fontSize: 28, fontWeight: FontWeight.bold, color: colorScheme.onSurface)),
          Text(label,
              style: GoogleFonts.outfit(
                  fontSize: 13,
                  color: colorScheme.onSurface.withOpacity(0.5),
                  fontWeight: FontWeight.w600)),
        ],
      ),
    ).animate().fade(duration: 400.ms).slideY(begin: 0.1);
  }

  Widget _buildSearchAndFilters(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 16),
          child: TextField(
            controller: _searchCtrl,
            onChanged: _filterProducts,
            decoration: InputDecoration(
              hintText: 'Cari nama atau SKU produk...',
              prefixIcon: const Icon(Icons.search_rounded),
              filled: true,
              fillColor: colorScheme.surface,
              contentPadding: const EdgeInsets.symmetric(vertical: 16),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(20),
                borderSide: BorderSide(color: colorScheme.outline.withOpacity(0.1)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(20),
                borderSide: BorderSide(color: colorScheme.outline.withOpacity(0.1)),
              ),
            ),
          ),
        ),
        SizedBox(
          height: 40,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 20),
            itemCount: _categories.length,
            itemBuilder: (context, index) {
              final cat = _categories[index];
              final isSelected = _selectedCategory == cat;
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ChoiceChip(
                  label: Text(cat),
                  selected: isSelected,
                  onSelected: (val) {
                    if (val) {
                      setState(() => _selectedCategory = cat);
                      _filterProducts(_searchCtrl.text);
                    }
                  },
                  showCheckmark: false,
                  labelStyle: GoogleFonts.outfit(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: isSelected ? Colors.white : colorScheme.onSurface.withOpacity(0.7),
                  ),
                  selectedColor: colorScheme.primary,
                  backgroundColor: colorScheme.surface,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  side: BorderSide(color: isSelected ? Colors.transparent : colorScheme.outline.withOpacity(0.1)),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildLowStockAlertBanner(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [const Color(0xFFE07A5F), const Color(0xFFE07A5F).withOpacity(0.8)],
          ),
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFFE07A5F).withOpacity(0.2),
              blurRadius: 20,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.2),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.bolt_rounded, color: Colors.white, size: 24),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Segera Restock!',
                      style: GoogleFonts.outfit(
                          color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                  Text('Ada $_lowStockCount produk yang stoknya hampir habis.',
                      style: GoogleFonts.outfit(
                          color: Colors.white.withOpacity(0.9), fontSize: 13)),
                ],
              ),
            ),
            Icon(Icons.chevron_right_rounded, color: Colors.white.withOpacity(0.6)),
          ],
        ),
      ).animate().shake(delay: 500.ms),
    );
  }

  Widget _buildModernProductCard(BuildContext context, Map<String, dynamic> p, int index) {
    final colorScheme = Theme.of(context).colorScheme;
    final stock = p['stock'] ?? 0;
    final isLow = stock <= 5;
    final currency = NumberFormat.currency(locale: 'id_ID', symbol: '${MerchantConfig.defaultCurrencySymbol} ', decimalDigits: 0);
    
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: colorScheme.outline.withOpacity(0.08)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(24),
          onTap: () => _showAdjustDialog(p),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                // Product Icon/Thumbnail
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    color: (isLow ? const Color(0xFFE07A5F) : colorScheme.primary).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: Icon(
                    _getIconForCategory(p['category']),
                    color: isLow ? const Color(0xFFE07A5F) : colorScheme.primary,
                    size: 28,
                  ),
                ),
                const SizedBox(width: 16),
                
                // Info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        p['name'] ?? 'Produk',
                        style: GoogleFonts.outfit(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                          color: colorScheme.onSurface,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'SKU: ${p['sku'] ?? '-'}',
                        style: GoogleFonts.outfit(
                          fontSize: 12,
                          color: colorScheme.onSurface.withOpacity(0.4),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        currency.format(p['sellingPrice'] ?? 0),
                        style: GoogleFonts.outfit(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: colorScheme.primary,
                        ),
                      ),
                    ],
                  ),
                ),
                
                // Stock Badge
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: isLow ? const Color(0xFFE07A5F).withOpacity(0.1) : colorScheme.surfaceVariant.withOpacity(0.3),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            '$stock',
                            style: GoogleFonts.outfit(
                              fontWeight: FontWeight.bold,
                              fontSize: 18,
                              color: isLow ? const Color(0xFFE07A5F) : colorScheme.onSurface,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'Unit',
                            style: GoogleFonts.outfit(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: isLow ? const Color(0xFFE07A5F).withOpacity(0.7) : colorScheme.onSurface.withOpacity(0.4),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),
                    _buildQuickActionMenu(context, p),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    ).animate().fadeIn(delay: (index * 50).ms).slideX(begin: 0.05);
  }

  Widget _buildQuickActionMenu(BuildContext context, Map<String, dynamic> p) {
    final colorScheme = Theme.of(context).colorScheme;
    return PopupMenuButton<String>(
      icon: Icon(Icons.more_horiz_rounded, color: colorScheme.onSurface.withOpacity(0.3)),
      padding: EdgeInsets.zero,
      onSelected: (val) async {
        if (val == 'edit') {
          final res = await Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => AddProductScreen(product: p)));
          if (res == true) _refreshData();
        } else if (val == 'barcode') {
          final sku = (p['sku'] ?? '').toString().trim();
          if (sku.isNotEmpty) {
            Navigator.push(context, MaterialPageRoute(builder: (_) => ProductBarcodeScreen(sku: sku, name: p['name'])));
          }
        } else if (val == 'delete') {
          _confirmDelete(p);
        }
      },
      itemBuilder: (context) => [
        _buildPopupItem(Icons.edit_rounded, 'Edit Produk', 'edit'),
        _buildPopupItem(Icons.qr_code_rounded, 'Cetak Barcode', 'barcode'),
        _buildPopupItem(Icons.delete_outline_rounded, 'Hapus', 'delete', isDestructive: true),
      ],
    );
  }

  PopupMenuItem<String> _buildPopupItem(IconData icon, String label, String value, {bool isDestructive = false}) {
    return PopupMenuItem(
      value: value,
      child: Row(
        children: [
          Icon(icon, size: 20, color: isDestructive ? Colors.redAccent : null),
          const SizedBox(width: 12),
          Text(label, style: TextStyle(color: isDestructive ? Colors.redAccent : null)),
        ],
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.inventory_2_outlined, size: 80, color: Colors.grey.withOpacity(0.3)),
          const SizedBox(height: 24),
          Text('Belum ada produk',
              style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.grey)),
          const SizedBox(height: 8),
          Text('Tambahkan produk pertama kamu untuk mulai berjualan.',
              textAlign: TextAlign.center,
              style: GoogleFonts.outfit(color: Colors.grey.withOpacity(0.7))),
        ],
      ),
    );
  }

  Widget _buildFloatingActionButtons(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Positioned(
      bottom: 24,
      left: 20,
      right: 20,
      child: Row(
        children: [
          FloatingActionButton(
            heroTag: 'ai_assistant',
            onPressed: _openAiStockAssistant,
            backgroundColor: colorScheme.surface,
            foregroundColor: colorScheme.primary,
            elevation: 8,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            child: const Icon(Icons.smart_toy_rounded),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: FloatingActionButton.extended(
              heroTag: 'add_product',
              onPressed: () async {
                final res = await Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const AddProductScreen()),
                );
                if (res == true) _refreshData();
              },
              backgroundColor: colorScheme.primary,
              foregroundColor: Colors.white,
              elevation: 8,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              icon: const Icon(Icons.add_business_rounded),
              label: Text('Tambah Produk Baru', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHiddenBarcodeRenderer() {
    return Positioned(
      left: -9999,
      child: IgnorePointer(
        child: Screenshot(
          controller: _barcodeShotCtrl,
          child: Container(
            width: 200,
            padding: const EdgeInsets.all(8),
            color: Colors.white,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (_barcodeName != null)
                  Text(_barcodeName!, textAlign: TextAlign.center, style: const TextStyle(fontSize: 10, color: Colors.black)),
                const SizedBox(height: 4),
                BarcodeWidget(
                  barcode: Barcode.code128(),
                  data: _barcodeSku.isEmpty ? 'UNKNOWN' : _barcodeSku,
                  width: 180,
                  height: 60,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  IconData _getIconForCategory(dynamic category) {
    final cat = category?.toString().toLowerCase() ?? '';
    if (cat.contains('makanan') || cat.contains('food')) return Icons.restaurant_rounded;
    if (cat.contains('minuman') || cat.contains('drink')) return Icons.local_drink_rounded;
    if (cat.contains('pakaian') || cat.contains('cloth')) return Icons.checkroom_rounded;
    if (cat.contains('elektronik')) return Icons.devices_rounded;
    return Icons.inventory_2_rounded;
  }

  Future<void> _openPrintOptions() async {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final categories = <String>{
      for (final p in _allProducts)
        if ((p['category'] ?? '').toString().trim().isNotEmpty)
          (p['category'] as String)
    }.toList()..sort();

    final copiesCtrl = TextEditingController(text: '$_copiesPerSku');

    await showModalBottomSheet<bool>(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        decoration: BoxDecoration(
          color: theme.scaffoldBackgroundColor,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
        ),
        padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
            left: 24,
            right: 24,
            top: 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Cetak Barcode Masal',
                style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 24),
            DropdownButtonFormField<String>(
              value: _selectedPrintCategory,
              decoration: InputDecoration(
                  labelText: 'Kategori Produk',
                  filled: true,
                  fillColor: colorScheme.surfaceContainerHighest.withOpacity(0.3),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                  prefixIcon: const Icon(Icons.category_rounded)),
              items: [
                const DropdownMenuItem(value: null, child: Text('Semua Kategori')),
                ...categories.map((c) => DropdownMenuItem(value: c, child: Text(c)))
              ],
              onChanged: (val) => _selectedPrintCategory = val,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: copiesCtrl,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                  labelText: 'Jumlah per SKU',
                  filled: true,
                  fillColor: colorScheme.surfaceContainerHighest.withOpacity(0.3),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                  prefixIcon: const Icon(Icons.copy_rounded)),
            ),
            const SizedBox(height: 24),
            SwitchListTile(
              title: const Text('Sertakan nama produk'),
              value: _includeNameOnBarcode,
              onChanged: (v) => setState(() => _includeNameOnBarcode = v),
            ),
            SwitchListTile(
              title: const Text('Hanya stok tersedia'),
              value: _onlyInStock,
              onChanged: (v) => setState(() => _onlyInStock = v),
            ),
            const SizedBox(height: 32),
            FilledButton(
              onPressed: () {
                _copiesPerSku = int.tryParse(copiesCtrl.text) ?? 1;
                Navigator.pop(ctx);
                _printAllBarcodes(
                  category: _selectedPrintCategory,
                  copies: _copiesPerSku,
                  includeName: _includeNameOnBarcode,
                  onlyInStock: _onlyInStock,
                );
              },
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 18),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              ),
              child: const Text('Mulai Cetak'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _printAllBarcodes({String? category, int copies = 1, bool includeName = true, bool onlyInStock = false}) async {
    if (_printingAll) return;
    _printingAll = true;
    try {
      await PrinterService().autoConnect();
      int printed = 0;
      final list = _allProducts.where((p) {
        final sku = (p['sku'] ?? '').toString().trim();
        if (sku.isEmpty) return false;
        if (category != null && p['category'] != category) return false;
        if (onlyInStock && (p['stock'] ?? 0) <= 0) return false;
        return true;
      }).toList();

      for (final p in list) {
        setState(() {
          _barcodeSku = p['sku'];
          _barcodeName = includeName ? p['name'] : null;
        });
        await Future.delayed(const Duration(milliseconds: 200));
        for (int i = 0; i < copies; i++) {
          final png = await _barcodeShotCtrl.capture();
          if (png != null) {
            await PrinterService().printBarcodeImage(png, title: p['name']);
            printed++;
          }
        }
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Berhasil mencetak $printed barcode')));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gagal cetak: $e')));
    } finally {
      _printingAll = false;
    }
  }

  Future<void> _confirmDelete(Map<String, dynamic> product) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
        title: Text('Hapus Produk?', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        content: Text('Data "${product['name']}" akan dihapus permanen. Lanjutkan?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Ya, Hapus', style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (confirm == true) {
      setState(() => _isLoading = true);
      try {
        await _api.deleteProduct(product['id']);
        await DatabaseHelper.instance.deleteProduct(product['id']);
        _refreshData();
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
        setState(() => _isLoading = false);
      }
    }
  }
}

class AiAssistantSheetContent extends StatefulWidget {
  final Function(Map<String, dynamic>) onAdjustStock;
  final VoidCallback onRefreshParent;
  final List<Map<String, dynamic>> allProducts;

  const AiAssistantSheetContent({
    super.key,
    required this.onAdjustStock,
    required this.onRefreshParent,
    required this.allProducts,
  });

  @override
  State<AiAssistantSheetContent> createState() => _AiAssistantSheetContentState();
}

class _AiAssistantSheetContentState extends State<AiAssistantSheetContent> {
  final TextEditingController _queryCtrl = TextEditingController();
  final List<Map<String, dynamic>> _messages = [];
  bool _isTyping = false;
  final ScrollController _scrollCtrl = ScrollController();

  @override
  void initState() {
    super.initState();
    _addSystemMessage('Halo! Saya asisten stok Rana AI. Ada yang bisa saya bantu dengan stok atau produk Anda hari ini?');
    _analyzeStockAutomatically();
  }

  void _addSystemMessage(String text, {List<Map<String, dynamic>>? actions}) {
    setState(() {
      _messages.add({
        'isUser': false,
        'text': text,
        'actions': actions,
        'time': DateTime.now(),
      });
    });
    _scrollToBottom();
  }

  void _addUserMessage(String text) {
    setState(() {
      _messages.add({
        'isUser': true,
        'text': text,
        'time': DateTime.now(),
      });
    });
    _scrollToBottom();
  }

  void _scrollToBottom() {
    Future.delayed(const Duration(milliseconds: 100), () {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _analyzeStockAutomatically() async {
    setState(() => _isTyping = true);
    await Future.delayed(const Duration(seconds: 1)); // Simulate thinking
    
    final lowStock = widget.allProducts.where((p) => (p['stock'] ?? 0) <= 5).toList();
    
    if (lowStock.isNotEmpty) {
      final actions = lowStock.take(3).map((p) => {
        'label': 'Tambah stok ${p['name']}',
        'onTap': () => widget.onAdjustStock(p),
      }).toList();

      _addSystemMessage(
        'Saya mendeteksi ada ${lowStock.length} produk yang stoknya menipis. Segera restock untuk menghindari kehabisan barang.',
        actions: actions,
      );
    } else {
      _addSystemMessage('Semua stok Anda terlihat aman saat ini! Kerja bagus.');
    }
    
    setState(() => _isTyping = false);
  }

  Future<void> _handleSend() async {
    final query = _queryCtrl.text.trim();
    if (query.isEmpty) return;

    _addUserMessage(query);
    _queryCtrl.clear();
    setState(() => _isTyping = true);

    try {
      final response = await AiService().answerBusinessQuery(query);
      _addSystemMessage(response['answer'] ?? 'Maaf, saya tidak mengerti pertanyaan tersebut.');
    } catch (e) {
      _addSystemMessage('Maaf, terjadi kesalahan saat memproses permintaan Anda.');
    } finally {
      setState(() => _isTyping = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final bottomPadding = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      height: MediaQuery.of(context).size.height * 0.75,
      decoration: BoxDecoration(
        color: theme.scaffoldBackgroundColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
      ),
      child: Column(
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: colorScheme.outline.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    CircleAvatar(
                      backgroundColor: colorScheme.primaryContainer,
                      child: Icon(Icons.smart_toy_rounded, color: colorScheme.primary),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Rana AI Assistant', 
                          style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16)),
                        Text('Cerdas • Proaktif • Real-time', 
                          style: GoogleFonts.outfit(fontSize: 12, color: colorScheme.onSurface.withOpacity(0.5))),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
          
          const Divider(height: 1),

          // Chat Area
          Expanded(
            child: ListView.builder(
              controller: _scrollCtrl,
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length + (_isTyping ? 1 : 0),
              itemBuilder: (context, index) {
                if (index == _messages.length) {
                  return _buildTypingIndicator();
                }
                final msg = _messages[index];
                return _buildChatBubble(msg);
              },
            ),
          ),

          // Input Area
          Container(
            padding: EdgeInsets.fromLTRB(16, 8, 16, 16 + bottomPadding),
            decoration: BoxDecoration(
              color: theme.scaffoldBackgroundColor,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 10,
                  offset: const Offset(0, -5),
                ),
              ],
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _queryCtrl,
                    onSubmitted: (_) => _handleSend(),
                    decoration: InputDecoration(
                      hintText: 'Tanya stok terlaris, sisa stok...',
                      filled: true,
                      fillColor: colorScheme.surfaceVariant.withOpacity(0.3),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide.none,
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filled(
                  onPressed: _handleSend,
                  icon: const Icon(Icons.send_rounded),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildChatBubble(Map<String, dynamic> msg) {
    final isUser = msg['isUser'] as bool;
    final colorScheme = Theme.of(context).colorScheme;

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
            decoration: BoxDecoration(
              color: isUser ? colorScheme.primary : colorScheme.surfaceVariant.withOpacity(0.5),
              borderRadius: BorderRadius.only(
                topLeft: const Radius.circular(20),
                topRight: const Radius.circular(20),
                bottomLeft: Radius.circular(isUser ? 20 : 0),
                bottomRight: Radius.circular(isUser ? 0 : 20),
              ),
            ),
            child: Text(
              msg['text'],
              style: GoogleFonts.outfit(
                color: isUser ? Colors.white : colorScheme.onSurface,
                fontSize: 14,
              ),
            ),
          ),
          if (msg['actions'] != null) ...[
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: (msg['actions'] as List).map<Widget>((action) {
                return ActionChip(
                  label: Text(action['label'], style: GoogleFonts.outfit(fontSize: 12)),
                  onPressed: action['onTap'],
                  backgroundColor: colorScheme.primaryContainer.withOpacity(0.5),
                  side: BorderSide.none,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                );
              }).toList(),
            ),
          ],
        ],
      ),
    ).animate().fadeIn(duration: 300.ms).slideX(begin: isUser ? 0.1 : -0.1);
  }

  Widget _buildTypingIndicator() {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.5),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                SizedBox(
                  width: 12,
                  height: 12,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
                SizedBox(width: 8),
                Text('AI sedang berpikir...', style: TextStyle(fontSize: 12)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
