import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:rana_merchant/data/remote/api_service.dart';
import 'package:rana_merchant/services/realtime_service.dart';
import 'package:rana_merchant/services/sound_service.dart';

class KitchenDisplayScreen extends StatefulWidget {
  const KitchenDisplayScreen({super.key});

  @override
  State<KitchenDisplayScreen> createState() => _KitchenDisplayScreenState();
}

class _KitchenDisplayScreenState extends State<KitchenDisplayScreen> {
  List<dynamic> _orders = [];
  bool _isLoading = true;
  StreamSubscription? _realtimeSub;

  @override
  void initState() {
    super.initState();
    _loadOrders();
    _realtimeSub = RealtimeService().transactionsStream.listen((data) {
      // Refresh when new table order comes in
      if (data.containsKey('tableNumber') || data.containsKey('orderId')) {
        _loadOrders();
        SoundService.playBeep();
      }
    });
  }

  @override
  void dispose() {
    _realtimeSub?.cancel();
    super.dispose();
  }

  Future<void> _loadOrders() async {
    try {
      final response = await ApiService().dio.get('/table/kitchen', options: ApiService().authOptions);
      if (response.data['status'] == 'success') {
        if (mounted) setState(() { _orders = response.data['data'] ?? []; _isLoading = false; });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _updateStatus(String orderId, String status) async {
    try {
      await ApiService().dio.put('/table/kitchen/$orderId', data: {'status': status});
      _loadOrders();
      SoundService.playSuccess();
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final pending = _orders.where((o) => o['status'] == 'PENDING').toList();
    final preparing = _orders.where((o) => o['status'] == 'PREPARING').toList();

    return Scaffold(
      backgroundColor: colorScheme.surface,
      appBar: AppBar(
        title: Text('Kitchen Display', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loadOrders),
          Container(
            margin: const EdgeInsets.only(right: 16),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(color: Colors.orange.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
            child: Row(
              children: [
                const Icon(Icons.pending_actions, color: Colors.orange, size: 18),
                const SizedBox(width: 4),
                Text('${pending.length}', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: Colors.orange)),
              ],
            ),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _orders.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.restaurant_menu, size: 80, color: Colors.grey.shade300),
                      const SizedBox(height: 16),
                      Text('Tidak ada pesanan', style: GoogleFonts.outfit(fontSize: 18, color: Colors.grey.shade500)),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadOrders,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      if (pending.isNotEmpty) ...[
                        _buildSectionHeader('BARU MASUK', Colors.red, pending.length),
                        const SizedBox(height: 8),
                        ...pending.asMap().entries.map((e) => _buildOrderCard(e.value, e.key, 'PENDING')),
                        const SizedBox(height: 24),
                      ],
                      if (preparing.isNotEmpty) ...[
                        _buildSectionHeader('SEDANG DISIAPKAN', Colors.orange, preparing.length),
                        const SizedBox(height: 8),
                        ...preparing.asMap().entries.map((e) => _buildOrderCard(e.value, e.key, 'PREPARING')),
                      ],
                    ],
                  ),
                ),
    );
  }

  Widget _buildSectionHeader(String title, Color color, int count) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
          child: Row(
            children: [
              Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
              const SizedBox(width: 8),
              Text(title, style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: color, fontSize: 13, letterSpacing: 1)),
              const SizedBox(width: 8),
              Text('($count)', style: TextStyle(color: color, fontWeight: FontWeight.bold)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildOrderCard(dynamic order, int index, String currentStatus) {
    final orderMap = Map<String, dynamic>.from(order);
    final session = orderMap['session'] as Map<String, dynamic>?;
    final table = session?['table'] as Map<String, dynamic>?;
    final tableNum = table?['number'] ?? '?';
    final tableName = table?['name'];
    final productName = orderMap['productName'] ?? 'Item';
    final quantity = orderMap['quantity'] ?? 1;
    final notes = orderMap['notes'];
    final orderedAt = orderMap['orderedAt'];

    String timeAgo = '';
    if (orderedAt != null) {
      try {
        final dt = DateTime.parse(orderedAt.toString());
        final diff = DateTime.now().difference(dt);
        if (diff.inMinutes < 1) timeAgo = 'Baru saja';
        else if (diff.inMinutes < 60) timeAgo = '${diff.inMinutes} mnt lalu';
        else timeAgo = '${diff.inHours} jam lalu';
      } catch (_) {}
    }

    final isUrgent = currentStatus == 'PENDING';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isUrgent ? Colors.red.withOpacity(0.3) : Colors.orange.withOpacity(0.2), width: 1.5),
      ),
      child: Row(
        children: [
          // Table badge
          Container(
            width: 50, height: 50,
            decoration: BoxDecoration(
              color: isUrgent ? Colors.red.withOpacity(0.1) : Colors.orange.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Center(
              child: Text('$tableNum', style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.w900, color: isUrgent ? Colors.red : Colors.orange)),
            ),
          ),
          const SizedBox(width: 14),
          // Order info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('$quantity× $productName', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 15)),
                if (tableName != null) Text('Meja: $tableName', style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                if (notes != null && notes.isNotEmpty) Text('📝 $notes', style: TextStyle(color: Colors.blue.shade700, fontSize: 12, fontStyle: FontStyle.italic)),
                Text(timeAgo, style: TextStyle(color: Colors.grey.shade500, fontSize: 11)),
              ],
            ),
          ),
          // Action button
          if (currentStatus == 'PENDING')
            FilledButton(
              onPressed: () => _updateStatus(orderMap['id'], 'PREPARING'),
              style: FilledButton.styleFrom(backgroundColor: Colors.orange, padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
              child: const Text('Proses', style: TextStyle(fontSize: 12)),
            )
          else
            FilledButton(
              onPressed: () => _updateStatus(orderMap['id'], 'SERVED'),
              style: FilledButton.styleFrom(backgroundColor: Colors.green, padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
              child: const Text('Selesai', style: TextStyle(fontSize: 12)),
            ),
        ],
      ),
    ).animate().fadeIn(delay: (50 * index).ms);
  }
}
