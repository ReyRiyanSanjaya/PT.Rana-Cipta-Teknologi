import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:rana_merchant/config/theme_config.dart';
import 'package:rana_merchant/data/remote/api_service.dart';
import 'package:rana_merchant/services/realtime_service.dart';
import 'package:barcode_widget/barcode_widget.dart';
import 'package:share_plus/share_plus.dart';

class TableManagementScreen extends StatefulWidget {
  const TableManagementScreen({super.key});

  @override
  State<TableManagementScreen> createState() => _TableManagementScreenState();
}

class _TableManagementScreenState extends State<TableManagementScreen> {
  List<dynamic> _tables = [];
  bool _isLoading = true;
  StreamSubscription? _realtimeSub;

  @override
  void initState() {
    super.initState();
    _loadTables();
    _realtimeSub = RealtimeService().transactionsStream.listen((_) {
      _loadTables(); // Refresh on any table event
    });
  }

  @override
  void dispose() {
    _realtimeSub?.cancel();
    super.dispose();
  }

  Future<void> _loadTables() async {
    try {
      final response = await ApiService().dio.get('/table',
          options: ApiService().authOptions);
      if (response.data['status'] == 'success') {
        if (mounted) setState(() { _tables = response.data['data'] ?? []; _isLoading = false; });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _createTable() async {
    final numberCtrl = TextEditingController();
    final nameCtrl = TextEditingController();
    final capacityCtrl = TextEditingController(text: '4');

    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Tambah Meja', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: numberCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Nomor Meja')),
            const SizedBox(height: 12),
            TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Nama (opsional)', hintText: 'VIP 1, Outdoor A')),
            const SizedBox(height: 12),
            TextField(controller: capacityCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Kapasitas')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Simpan')),
        ],
      ),
    );

    if (result != true) return;
    try {
      await ApiService().dio.post('/table', data: {
        'number': numberCtrl.text,
        'name': nameCtrl.text.isNotEmpty ? nameCtrl.text : null,
        'capacity': capacityCtrl.text,
      }, options: ApiService().authOptions);
      _loadTables();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gagal: $e')));
    }
  }

  Future<void> _showQR(Map<String, dynamic> table) async {
    final qrCode = table['qrCode'] ?? '';
    final tableNum = table['number'] ?? '?';
    final baseUrl = ApiService().resolveFileUrl('').replaceAll('/uploads', '');
    final orderUrl = '${baseUrl}table/qr/$qrCode';

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: const EdgeInsets.all(32),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('QR Meja $tableNum', style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text('Scan untuk pesan langsung', style: TextStyle(color: Colors.grey.shade600)),
            const SizedBox(height: 24),
            BarcodeWidget(barcode: Barcode.qrCode(), data: orderUrl, width: 200, height: 200, color: Colors.black),
            const SizedBox(height: 16),
            Text(orderUrl, style: TextStyle(fontSize: 10, color: Colors.grey.shade500), textAlign: TextAlign.center),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => Share.share('Pesan dari Meja $tableNum: $orderUrl'),
                    icon: const Icon(Icons.share),
                    label: const Text('Bagikan'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton.icon(
                    onPressed: () => Navigator.pop(ctx),
                    icon: const Icon(Icons.print),
                    label: const Text('Cetak'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _toggleTableStatus(Map<String, dynamic> table) async {
    final currentStatus = table['status'] ?? 'AVAILABLE';
    final newStatus = currentStatus == 'AVAILABLE' ? 'CLEANING' : 'AVAILABLE';
    try {
      await ApiService().dio.put('/table/${table['id']}', data: {'status': newStatus}, options: ApiService().authOptions);
      _loadTables();
    } catch (_) {}
  }

  Future<void> _closeSession(String sessionId) async {
    try {
      await ApiService().dio.put('/table/session/$sessionId/close', options: ApiService().authOptions);
      _loadTables();
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Sesi ditutup, meja tersedia'), backgroundColor: Colors.green));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gagal: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: colorScheme.surface,
      appBar: AppBar(
        title: Text('Manajemen Meja', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loadTables),
          IconButton(icon: const Icon(Icons.add_circle_outline), onPressed: _createTable),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _tables.isEmpty
              ? _buildEmptyState()
              : RefreshIndicator(
                  onRefresh: _loadTables,
                  child: GridView.builder(
                    padding: const EdgeInsets.all(16),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 1.1,
                    ),
                    itemCount: _tables.length,
                    itemBuilder: (context, index) {
                      final table = Map<String, dynamic>.from(_tables[index]);
                      return _buildTableCard(table, index);
                    },
                  ),
                ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _createTable,
        icon: const Icon(Icons.add),
        label: const Text('Tambah Meja'),
        backgroundColor: colorScheme.primary,
        foregroundColor: colorScheme.onPrimary,
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.table_restaurant_rounded, size: 80, color: Colors.grey.shade300),
          const SizedBox(height: 16),
          Text('Belum ada meja', style: GoogleFonts.outfit(fontSize: 18, color: Colors.grey.shade500)),
          const SizedBox(height: 8),
          Text('Tambah meja untuk mulai menerima pesanan QR', style: TextStyle(color: Colors.grey.shade400)),
        ],
      ),
    );
  }

  Widget _buildTableCard(Map<String, dynamic> table, int index) {
    final status = table['status'] ?? 'AVAILABLE';
    final number = table['number'] ?? 0;
    final name = table['name'];
    final sessions = table['sessions'] as List? ?? [];
    final hasActiveSession = sessions.isNotEmpty;
    final activeSession = hasActiveSession ? Map<String, dynamic>.from(sessions[0]) : null;
    final orderCount = (activeSession?['orders'] as List?)?.length ?? 0;

    Color statusColor;
    IconData statusIcon;
    switch (status) {
      case 'OCCUPIED':
        statusColor = Colors.orange;
        statusIcon = Icons.people_rounded;
        break;
      case 'RESERVED':
        statusColor = Colors.purple;
        statusIcon = Icons.event_seat_rounded;
        break;
      case 'CLEANING':
        statusColor = Colors.blue;
        statusIcon = Icons.cleaning_services_rounded;
        break;
      default:
        statusColor = Colors.green;
        statusIcon = Icons.check_circle_rounded;
    }

    return GestureDetector(
      onTap: () => _showQR(table),
      onLongPress: () {
        if (hasActiveSession) {
          _closeSession(activeSession!['id']);
        } else {
          _toggleTableStatus(table);
        }
      },
      child: Container(
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: statusColor.withOpacity(0.3), width: 2),
          boxShadow: [BoxShadow(color: statusColor.withOpacity(0.1), blurRadius: 12, offset: const Offset(0, 4))],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: statusColor.withOpacity(0.1), shape: BoxShape.circle),
              child: Icon(statusIcon, color: statusColor, size: 28),
            ),
            const SizedBox(height: 10),
            Text('Meja $number', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold)),
            if (name != null) Text(name, style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
              decoration: BoxDecoration(color: statusColor.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
              child: Text(
                hasActiveSession ? '$orderCount pesanan' : status,
                style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
      ),
    ).animate().fadeIn(delay: (50 * index).ms).scale(begin: const Offset(0.9, 0.9));
  }
}
