import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';
import 'package:rana_sales/data/api_service.dart';

class PromotionsScreen extends StatefulWidget {
  const PromotionsScreen({super.key});

  @override
  State<PromotionsScreen> createState() => _PromotionsScreenState();
}

class _PromotionsScreenState extends State<PromotionsScreen> {
  Map<String, dynamic>? _data;
  bool _isLoading = true;
  String _filter = 'active';

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      setState(() => _isLoading = true);
      final data = await ApiService().getPromotions(status: _filter == 'all' ? null : _filter);
      if (mounted) setState(() { _data = data; _isLoading = false; });
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final promos = (_data?['promotions'] as List?) ?? [];
    final summary = _data?['summary'] as Map<String, dynamic>? ?? {};

    return Scaffold(
      appBar: AppBar(
        title: Text('Promosi', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        actions: [IconButton(icon: const Icon(Icons.refresh), onPressed: _loadData)],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                // Summary
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                  child: Row(
                    children: [
                      _buildSummaryChip('Active', summary['active'] ?? 0, Colors.green),
                      const SizedBox(width: 8),
                      _buildSummaryChip('Upcoming', summary['upcoming'] ?? 0, Colors.blue),
                      const SizedBox(width: 8),
                      _buildSummaryChip('Expired', summary['expired'] ?? 0, Colors.grey),
                    ],
                  ),
                ),
                // Filter
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: ['active', 'upcoming', 'expired', 'all'].map((f) => Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text(f[0].toUpperCase() + f.substring(1), style: TextStyle(fontSize: 12, color: _filter == f ? Colors.white : null)),
                          selected: _filter == f,
                          onSelected: (_) { setState(() => _filter = f); _loadData(); },
                          selectedColor: Colors.teal,
                        ),
                      )).toList(),
                    ),
                  ),
                ),
                // List
                Expanded(
                  child: promos.isEmpty
                      ? Center(child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.local_offer_outlined, size: 50, color: Colors.grey.shade300),
                            const SizedBox(height: 8),
                            Text('Tidak ada promosi', style: TextStyle(color: Colors.grey.shade500)),
                          ],
                        ))
                      : RefreshIndicator(
                          onRefresh: _loadData,
                          child: ListView.builder(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            itemCount: promos.length,
                            itemBuilder: (ctx, i) => _buildPromoCard(promos[i], i),
                          ),
                        ),
                ),
              ],
            ),
    );
  }

  Widget _buildSummaryChip(String label, int count, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
        child: Column(
          children: [
            Text('$count', style: TextStyle(fontWeight: FontWeight.bold, color: color, fontSize: 16)),
            Text(label, style: TextStyle(fontSize: 10, color: color)),
          ],
        ),
      ),
    );
  }

  Widget _buildPromoCard(dynamic promo, int index) {
    final type = promo['type'] ?? '';
    final status = promo['status'] ?? '';
    final name = promo['name'] ?? '';
    final description = promo['description'] ?? '';
    final code = promo['code'];
    final endDate = promo['endDate'];

    Color typeColor;
    IconData typeIcon;
    String typeLabel;

    switch (type) {
      case 'PERCENTAGE':
        typeColor = Colors.green;
        typeIcon = Icons.percent;
        typeLabel = 'Diskon ${promo['value']}%';
        break;
      case 'FIXED':
        typeColor = Colors.blue;
        typeIcon = Icons.money_off;
        typeLabel = 'Potongan Rp ${NumberFormat('#,###').format(promo['value'] ?? 0)}';
        break;
      case 'BUY_X_GET_Y':
        typeColor = Colors.purple;
        typeIcon = Icons.card_giftcard;
        final cfg = promo['config'] ?? {};
        typeLabel = 'Beli ${cfg['buyQty'] ?? '?'} Gratis ${cfg['freeQty'] ?? '?'}';
        break;
      case 'BUNDLE':
        typeColor = Colors.orange;
        typeIcon = Icons.inventory_2;
        typeLabel = 'Bundle Deal';
        break;
      case 'MIN_QTY_DISCOUNT':
        typeColor = Colors.teal;
        typeIcon = Icons.shopping_cart;
        typeLabel = 'Min Qty Discount';
        break;
      case 'FREE_ITEM':
        typeColor = Colors.pink;
        typeIcon = Icons.redeem;
        typeLabel = 'Free Item';
        break;
      default:
        typeColor = Colors.grey;
        typeIcon = Icons.local_offer;
        typeLabel = type;
    }

    Color statusColor = status == 'ACTIVE' ? Colors.green : status == 'UPCOMING' ? Colors.blue : Colors.grey;

    String endStr = '';
    if (endDate != null) {
      try { endStr = DateFormat('dd MMM yyyy').format(DateTime.parse(endDate.toString())); } catch (_) {}
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: typeColor.withOpacity(0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 38, height: 38,
                decoration: BoxDecoration(color: typeColor.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
                child: Icon(typeIcon, color: typeColor, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name, style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 14)),
                    Text(typeLabel, style: TextStyle(color: typeColor, fontSize: 11, fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(color: statusColor.withOpacity(0.1), borderRadius: BorderRadius.circular(4)),
                child: Text(status, style: TextStyle(color: statusColor, fontSize: 9, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          if (description.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(description, style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
          ],
          const SizedBox(height: 8),
          Row(
            children: [
              if (code != null && code.isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(6), border: Border.all(color: Colors.grey.shade300)),
                  child: Text('CODE: $code', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey.shade700, letterSpacing: 1)),
                ),
              const Spacer(),
              if (endStr.isNotEmpty) Text('s/d $endStr', style: TextStyle(color: Colors.grey.shade500, fontSize: 10)),
            ],
          ),
        ],
      ),
    ).animate().fadeIn(delay: (20 * index).ms);
  }
}
