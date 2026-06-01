import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:rana_sales/data/api_service.dart';

class VisitOrderScreen extends StatefulWidget {
  final Map<String, dynamic> visit;
  const VisitOrderScreen({super.key, required this.visit});

  @override
  State<VisitOrderScreen> createState() => _VisitOrderScreenState();
}

class _VisitOrderScreenState extends State<VisitOrderScreen> {
  List<dynamic> _products = [];
  bool _isLoading = true;
  bool _isSaving = false;
  String _paymentMethod = 'COD';
  final _notesCtrl = TextEditingController();

  // Cart items: {productId, name, unit, qty, price}
  final List<Map<String, dynamic>> _items = [];

  @override
  void initState() {
    super.initState();
    _loadProducts();
  }

  Future<void> _loadProducts() async {
    try {
      final products = await ApiService().getProducts();
      if (mounted) setState(() { _products = products; _isLoading = false; });
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _addProduct(Map<String, dynamic> product) {
    final existing = _items.indexWhere((i) => i['productId'] == product['id']);
    if (existing >= 0) {
      setState(() => _items[existing]['qty'] += 1);
    } else {
      final tiers = product['pricingTiers'] as List? ?? [];
      final price = tiers.isNotEmpty ? (tiers[0]['price'] ?? 0).toDouble() : 0.0;
      setState(() {
        _items.add({
          'productId': product['id'],
          'name': product['name'],
          'unit': product['unit'] ?? 'pcs',
          'qty': 1,
          'price': price,
        });
      });
    }
  }

  void _removeItem(int index) => setState(() => _items.removeAt(index));

  double get _total => _items.fold(0, (sum, i) => sum + (i['qty'] as int) * (i['price'] as double));

  Future<void> _submitOrder() async {
    if (_items.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Tambahkan minimal 1 produk')));
      return;
    }

    setState(() => _isSaving = true);
    try {
      await ApiService().createVisitOrder({
        'visitId': widget.visit['id'],
        'merchantId': widget.visit['merchantId'],
        'items': _items.map((i) => {'productId': i['productId'], 'quantity': i['qty'], 'unitPrice': i['price']}).toList(),
        'paymentMethod': _paymentMethod,
        'notes': _notesCtrl.text,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Order berhasil dibuat!'), backgroundColor: Colors.green));
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gagal: $e'), backgroundColor: Colors.red));
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  final _fmt = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Order - ${widget.visit['merchantName']}', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16)),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                // Cart items
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      // Payment method
                      Text('Metode Pembayaran', style: GoogleFonts.outfit(fontWeight: FontWeight.w600, fontSize: 13)),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        children: ['COD', 'TRANSFER', 'CREDIT'].map((m) {
                          final selected = _paymentMethod == m;
                          return ChoiceChip(
                            label: Text(m, style: TextStyle(fontSize: 12, color: selected ? Colors.white : null)),
                            selected: selected,
                            onSelected: (_) => setState(() => _paymentMethod = m),
                            selectedColor: Colors.teal,
                          );
                        }).toList(),
                      ),
                      const SizedBox(height: 16),

                      // Items
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Item Pesanan (${_items.length})', style: GoogleFonts.outfit(fontWeight: FontWeight.w600, fontSize: 13)),
                          TextButton.icon(
                            onPressed: _showProductPicker,
                            icon: const Icon(Icons.add, size: 16),
                            label: const Text('Tambah', style: TextStyle(fontSize: 12)),
                          ),
                        ],
                      ),
                      if (_items.isEmpty)
                        Container(
                          padding: const EdgeInsets.all(32),
                          decoration: BoxDecoration(
                            border: Border.all(color: Colors.grey.shade300, style: BorderStyle.solid),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Column(
                            children: [
                              Icon(Icons.shopping_bag_outlined, size: 40, color: Colors.grey.shade300),
                              const SizedBox(height: 8),
                              Text('Belum ada item', style: TextStyle(color: Colors.grey.shade500)),
                            ],
                          ),
                        ),
                      ..._items.asMap().entries.map((e) => _buildItemCard(e.key, e.value)),

                      const SizedBox(height: 16),
                      TextField(
                        controller: _notesCtrl,
                        decoration: InputDecoration(
                          labelText: 'Catatan (opsional)',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ],
                  ),
                ),

                // Bottom total + submit
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surface,
                    boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, -2))],
                  ),
                  child: SafeArea(
                    top: false,
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text('Total', style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                              Text(_fmt.format(_total), style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.teal.shade700)),
                            ],
                          ),
                        ),
                        FilledButton.icon(
                          onPressed: _isSaving ? null : _submitOrder,
                          icon: _isSaving ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.check),
                          label: Text(_isSaving ? 'Memproses...' : 'Buat Order'),
                          style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14)),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildItemCard(int index, Map<String, dynamic> item) {
    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item['name'], style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                Text('${_fmt.format(item['price'])} / ${item['unit']}', style: TextStyle(color: Colors.grey.shade600, fontSize: 11)),
              ],
            ),
          ),
          // Qty controls
          Row(
            children: [
              IconButton(
                icon: const Icon(Icons.remove_circle_outline, size: 20),
                onPressed: () {
                  if (item['qty'] > 1) setState(() => item['qty'] -= 1);
                  else _removeItem(index);
                },
              ),
              Text('${item['qty']}', style: const TextStyle(fontWeight: FontWeight.bold)),
              IconButton(
                icon: const Icon(Icons.add_circle_outline, size: 20),
                onPressed: () => setState(() => item['qty'] += 1),
              ),
            ],
          ),
          Text(_fmt.format(item['qty'] * item['price']), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
        ],
      ),
    );
  }

  void _showProductPicker() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        maxChildSize: 0.9,
        minChildSize: 0.4,
        expand: false,
        builder: (ctx, scrollCtrl) => Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text('Pilih Produk', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
            Expanded(
              child: ListView.builder(
                controller: scrollCtrl,
                itemCount: _products.length,
                itemBuilder: (ctx, i) {
                  final p = _products[i];
                  final tiers = p['pricingTiers'] as List? ?? [];
                  final price = tiers.isNotEmpty ? tiers[0]['price'] ?? 0 : 0;
                  return ListTile(
                    title: Text(p['name'] ?? '', style: const TextStyle(fontSize: 14)),
                    subtitle: Text('${_fmt.format(price)} / ${p['unit'] ?? 'pcs'} · Stok: ${p['stockQuantity'] ?? 0}', style: const TextStyle(fontSize: 11)),
                    trailing: IconButton(
                      icon: const Icon(Icons.add_circle, color: Colors.teal),
                      onPressed: () {
                        _addProduct(p);
                        Navigator.pop(ctx);
                      },
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
