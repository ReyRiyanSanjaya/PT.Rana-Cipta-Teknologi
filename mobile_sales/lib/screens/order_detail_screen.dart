import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:rana_sales/data/api_service.dart';

class OrderDetailScreen extends StatefulWidget {
  final String orderId;
  const OrderDetailScreen({super.key, required this.orderId});

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  Map<String, dynamic>? _order;
  bool _isLoading = true;

  final _fmt = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

  @override
  void initState() {
    super.initState();
    _loadOrder();
  }

  Future<void> _loadOrder() async {
    try {
      final data = await ApiService().getOrderDetail(widget.orderId);
      if (mounted) setState(() { _order = data; _isLoading = false; });
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Detail Order', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _order == null
              ? Center(child: Text('Order tidak ditemukan', style: TextStyle(color: Colors.grey.shade500)))
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    _buildHeader(),
                    const SizedBox(height: 16),
                    _buildStatusCard(),
                    const SizedBox(height: 16),
                    _buildItemsList(),
                    const SizedBox(height: 16),
                    _buildPaymentInfo(),
                  ],
                ),
    );
  }

  Widget _buildHeader() {
    final orderNumber = _order!['orderNumber'] ?? '';
    final createdAt = _order!['createdAt'] ?? '';
    String dateStr = '';
    try { dateStr = DateFormat('dd MMMM yyyy, HH:mm', 'id_ID').format(DateTime.parse(createdAt)); } catch (_) {}

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.teal.shade50,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.teal.shade100),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(orderNumber, style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.teal.shade800)),
          const SizedBox(height: 4),
          Text(dateStr, style: TextStyle(color: Colors.teal.shade600, fontSize: 12)),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Total', style: TextStyle(color: Colors.teal.shade600)),
              Text(_fmt.format(_order!['totalAmount'] ?? 0), style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.teal.shade800)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatusCard() {
    final status = _order!['status'] ?? '';
    final paymentStatus = _order!['paymentStatus'] ?? '';

    Color statusColor = status == 'DELIVERED' ? Colors.green : status == 'PROCESSING' ? Colors.blue : status == 'SHIPPED' ? Colors.purple : Colors.amber;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              children: [
                Text('Status Order', style: TextStyle(color: Colors.grey.shade600, fontSize: 11)),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(color: statusColor.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
                  child: Text(status, style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 12)),
                ),
              ],
            ),
          ),
          Container(width: 1, height: 40, color: Colors.grey.shade200),
          Expanded(
            child: Column(
              children: [
                Text('Pembayaran', style: TextStyle(color: Colors.grey.shade600, fontSize: 11)),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: paymentStatus == 'PAID' ? Colors.green.withOpacity(0.1) : Colors.red.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(paymentStatus, style: TextStyle(
                    color: paymentStatus == 'PAID' ? Colors.green : Colors.red,
                    fontWeight: FontWeight.bold, fontSize: 12,
                  )),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildItemsList() {
    final items = _order!['items'] as List? ?? [];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Item Pesanan (${items.length})', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 14)),
          const SizedBox(height: 12),
          ...items.map((item) {
            final product = item['wholesaleProduct'] ?? {};
            final name = product['name'] ?? 'Item';
            final unit = product['unit'] ?? 'pcs';
            final qty = item['quantity'] ?? 0;
            final price = (item['unitPrice'] ?? 0).toDouble();
            final subtotal = (item['subtotal'] ?? 0).toDouble();

            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                        Text('$qty $unit × ${_fmt.format(price)}', style: TextStyle(color: Colors.grey.shade600, fontSize: 11)),
                      ],
                    ),
                  ),
                  Text(_fmt.format(subtotal), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                ],
              ),
            );
          }),
          const Divider(),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Total', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
              Text(_fmt.format(_order!['totalAmount'] ?? 0), style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.teal.shade700)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentInfo() {
    final method = _order!['paymentMethod'] ?? '-';
    final tenant = _order!['tenant'];
    final customerName = tenant?['name'] ?? 'Unknown';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Info Tambahan', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 14)),
          const SizedBox(height: 12),
          _buildInfoRow('Merchant', customerName),
          _buildInfoRow('Metode Bayar', method),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
        ],
      ),
    );
  }
}
