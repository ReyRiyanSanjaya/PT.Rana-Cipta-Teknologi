import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';
import 'package:rana_sales/data/api_service.dart';

class ReceivablesScreen extends StatefulWidget {
  const ReceivablesScreen({super.key});

  @override
  State<ReceivablesScreen> createState() => _ReceivablesScreenState();
}

class _ReceivablesScreenState extends State<ReceivablesScreen> {
  Map<String, dynamic>? _data;
  bool _isLoading = true;
  String _filter = 'pending';

  final _fmt = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      setState(() => _isLoading = true);
      final data = await ApiService().getReceivables(status: _filter);
      if (mounted) setState(() { _data = data; _isLoading = false; });
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _markPaid(String orderId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Konfirmasi Pembayaran'),
        content: const Text('Tandai piutang ini sebagai sudah dibayar?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Ya, Sudah Bayar')),
        ],
      ),
    );
    if (confirm != true) return;

    try {
      await ApiService().markReceivablePaid(orderId);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Berhasil ditandai lunas'), backgroundColor: Colors.green));
      _loadData();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gagal: $e'), backgroundColor: Colors.red));
    }
  }

  @override
  Widget build(BuildContext context) {
    final receivables = (_data?['receivables'] as List?) ?? [];
    final summary = _data?['summary'] as Map<String, dynamic>? ?? {};

    return Scaffold(
      appBar: AppBar(
        title: Text('Piutang / Collection', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadData,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Summary
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(colors: [Colors.red.shade400, Colors.orange.shade400]),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Row(
                      children: [
                        Expanded(child: Column(
                          children: [
                            Text('Total Piutang', style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 11)),
                            Text(_fmt.format(summary['totalReceivable'] ?? 0), style: GoogleFonts.outfit(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                          ],
                        )),
                        Container(width: 1, height: 40, color: Colors.white.withOpacity(0.3)),
                        Expanded(child: Column(
                          children: [
                            Text('Overdue', style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 11)),
                            Text(_fmt.format(summary['overdueAmount'] ?? 0), style: GoogleFonts.outfit(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                            Text('${summary['overdueCount'] ?? 0} invoice', style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 10)),
                          ],
                        )),
                      ],
                    ),
                  ).animate().fadeIn(),
                  const SizedBox(height: 16),

                  // Filter
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _buildChip('Belum Bayar', 'pending'),
                        _buildChip('Overdue', 'overdue'),
                        _buildChip('Lunas', 'paid'),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),

                  // List
                  if (receivables.isEmpty)
                    Padding(
                      padding: const EdgeInsets.all(40),
                      child: Column(
                        children: [
                          Icon(Icons.check_circle_outline, size: 50, color: Colors.grey.shade300),
                          const SizedBox(height: 8),
                          Text('Tidak ada piutang', style: TextStyle(color: Colors.grey.shade500)),
                        ],
                      ),
                    )
                  else
                    ...receivables.asMap().entries.map((e) => _buildReceivableCard(e.value, e.key)),
                ],
              ),
            ),
    );
  }

  Widget _buildChip(String label, String value) {
    final selected = _filter == value;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label, style: TextStyle(fontSize: 12, color: selected ? Colors.white : null)),
        selected: selected,
        onSelected: (_) { setState(() => _filter = value); _loadData(); },
        selectedColor: Colors.red.shade400,
      ),
    );
  }

  Widget _buildReceivableCard(dynamic item, int index) {
    final isOverdue = item['isOverdue'] == true;
    final days = item['daysSinceOrder'] ?? 0;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: isOverdue ? Colors.red.withOpacity(0.3) : Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(item['customerName'] ?? '', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 14)),
                    Text('${item['orderNumber'] ?? ''} · $days hari lalu', style: TextStyle(color: Colors.grey.shade500, fontSize: 11)),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(_fmt.format(item['amount'] ?? 0), style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 14, color: isOverdue ? Colors.red : Colors.teal.shade700)),
                  if (isOverdue)
                    Text('${item['daysOverdue']}d overdue', style: const TextStyle(color: Colors.red, fontSize: 10, fontWeight: FontWeight.bold)),
                ],
              ),
            ],
          ),
          if (_filter != 'paid') ...[
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => _markPaid(item['id']),
                icon: const Icon(Icons.check, size: 16),
                label: const Text('Tandai Lunas', style: TextStyle(fontSize: 12)),
                style: OutlinedButton.styleFrom(foregroundColor: Colors.green),
              ),
            ),
          ],
        ],
      ),
    ).animate().fadeIn(delay: (20 * index).ms);
  }
}
