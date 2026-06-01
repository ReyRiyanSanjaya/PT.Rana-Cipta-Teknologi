import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';
import 'package:rana_sales/data/api_service.dart';
import 'package:rana_sales/screens/order_detail_screen.dart';

class OrderHistoryScreen extends StatefulWidget {
  const OrderHistoryScreen({super.key});

  @override
  State<OrderHistoryScreen> createState() => _OrderHistoryScreenState();
}

class _OrderHistoryScreenState extends State<OrderHistoryScreen> {
  List<dynamic> _orders = [];
  bool _isLoading = true;
  String _typeFilter = 'all';
  int _page = 1;
  int _totalPages = 1;

  final _fmt = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

  @override
  void initState() {
    super.initState();
    _loadOrders();
  }

  Future<void> _loadOrders() async {
    try {
      setState(() => _isLoading = true);
      final type = _typeFilter == 'all' ? null : _typeFilter;
      final data = await ApiService().getAllOrders(type: type, page: _page);
      if (mounted) {
        setState(() {
          _orders = data['orders'] ?? [];
          _totalPages = data['totalPages'] ?? 1;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Riwayat Order', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
      ),
      body: Column(
        children: [
          // Filter chips
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildChip('Semua', 'all'),
                  _buildChip('Ekosistem', 'ecosystem'),
                  _buildChip('Kunjungan', 'visit'),
                  _buildChip('Eksternal', 'external'),
                ],
              ),
            ),
          ),
          // Orders
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _orders.isEmpty
                    ? Center(child: Text('Belum ada order', style: TextStyle(color: Colors.grey.shade500)))
                    : RefreshIndicator(
                        onRefresh: _loadOrders,
                        child: ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: _orders.length,
                          itemBuilder: (ctx, i) => _buildOrderCard(_orders[i], i),
                        ),
                      ),
          ),
          // Pagination
          if (_totalPages > 1)
            Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  IconButton(
                    icon: const Icon(Icons.chevron_left),
                    onPressed: _page > 1 ? () { setState(() => _page--); _loadOrders(); } : null,
                  ),
                  Text('$_page / $_totalPages', style: const TextStyle(fontWeight: FontWeight.bold)),
                  IconButton(
                    icon: const Icon(Icons.chevron_right),
                    onPressed: _page < _totalPages ? () { setState(() => _page++); _loadOrders(); } : null,
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildChip(String label, String value) {
    final selected = _typeFilter == value;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label, style: TextStyle(fontSize: 12, color: selected ? Colors.white : null)),
        selected: selected,
        onSelected: (_) { setState(() { _typeFilter = value; _page = 1; }); _loadOrders(); },
        selectedColor: Colors.teal,
      ),
    );
  }

  Widget _buildOrderCard(dynamic order, int index) {
    final status = order['status'] ?? '';
    final orderType = order['orderType'] ?? 'ecosystem';
    final customerName = order['customerName'] ?? 'Unknown';
    final total = (order['totalAmount'] ?? 0).toDouble();
    final createdAt = order['createdAt'] ?? '';

    Color statusColor = status == 'DELIVERED' ? Colors.green : status == 'PROCESSING' ? Colors.blue : status == 'SHIPPED' ? Colors.purple : Colors.amber;
    Color typeColor = orderType == 'visit' ? Colors.indigo : orderType == 'external' ? Colors.orange : Colors.teal;
    String typeLabel = orderType == 'visit' ? 'Visit' : orderType == 'external' ? 'Ext' : 'Eco';

    String dateStr = '';
    try { dateStr = DateFormat('dd/MM/yy').format(DateTime.parse(createdAt)); } catch (_) {}

    return GestureDetector(
      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => OrderDetailScreen(orderId: order['id']))),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.grey.shade200),
        ),
        child: Row(
          children: [
            Container(
              width: 40, height: 40,
              decoration: BoxDecoration(color: typeColor.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
              child: Center(child: Text(typeLabel, style: TextStyle(color: typeColor, fontSize: 10, fontWeight: FontWeight.bold))),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(customerName, style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 13)),
                  Text('${order['orderNumber'] ?? ''} · $dateStr', style: TextStyle(color: Colors.grey.shade500, fontSize: 10)),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(_fmt.format(total), style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 13)),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(color: statusColor.withOpacity(0.1), borderRadius: BorderRadius.circular(4)),
                  child: Text(status, style: TextStyle(color: statusColor, fontSize: 9, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ],
        ),
      ),
    ).animate().fadeIn(delay: (20 * index).ms);
  }
}
