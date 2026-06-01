import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

class MerchantDetailScreen extends StatelessWidget {
  final Map<String, dynamic> merchant;
  const MerchantDetailScreen({super.key, required this.merchant});

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);
    final status = merchant['status'] ?? 'COLD';
    final statusColor = status == 'ACTIVE' ? Colors.green : status == 'WARM' ? Colors.orange : Colors.blue;
    final revenue = (merchant['monthRevenue'] ?? 0).toDouble();
    final creditLimit = (merchant['creditLimit'] ?? 0).toDouble();
    final creditUsed = (merchant['creditUsed'] ?? 0).toDouble();
    final creditAvailable = creditLimit - creditUsed;

    return Scaffold(
      appBar: AppBar(
        title: Text(merchant['storeName'] ?? 'Merchant', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16)),
        actions: [
          if (merchant['waNumber'] != null)
            IconButton(
              icon: const Icon(Icons.chat, color: Colors.green),
              onPressed: () => _openWhatsApp(merchant['waNumber']),
            ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Header card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(colors: [statusColor.withOpacity(0.8), statusColor.withOpacity(0.5)]),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Column(
              children: [
                CircleAvatar(
                  radius: 30,
                  backgroundColor: Colors.white.withOpacity(0.2),
                  child: Icon(Icons.store, color: Colors.white, size: 30),
                ),
                const SizedBox(height: 12),
                Text(merchant['storeName'] ?? '', style: GoogleFonts.outfit(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                Text(merchant['category'] ?? '-', style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 13)),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                  decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(8)),
                  child: Text(status, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ).animate().fadeIn(),
          const SizedBox(height: 16),

          // Info
          _buildInfoSection(context, [
            _buildInfoRow(Icons.location_on, 'Lokasi', merchant['location'] ?? '-'),
            if (merchant['waNumber'] != null)
              _buildInfoRow(Icons.phone, 'WhatsApp', merchant['waNumber']),
            _buildInfoRow(Icons.calendar_today, 'Last Order', '${merchant['daysSinceLastOrder'] ?? '?'} hari lalu'),
          ]),
          const SizedBox(height: 16),

          // Credit
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Kredit', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 14)),
                const SizedBox(height: 12),
                Row(
                  children: [
                    _buildCreditStat('Limit', fmt.format(creditLimit), Colors.teal),
                    _buildCreditStat('Terpakai', fmt.format(creditUsed), Colors.red),
                    _buildCreditStat('Tersedia', fmt.format(creditAvailable), Colors.green),
                  ],
                ),
                if (creditLimit > 0) ...[
                  const SizedBox(height: 12),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: creditLimit > 0 ? creditUsed / creditLimit : 0,
                      backgroundColor: Colors.grey.shade200,
                      valueColor: AlwaysStoppedAnimation(creditUsed / creditLimit > 0.8 ? Colors.red : Colors.teal),
                      minHeight: 8,
                    ),
                  ),
                ],
              ],
            ),
          ).animate().fadeIn(delay: 100.ms),
          const SizedBox(height: 16),

          // Performance
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Performa Bulan Ini', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 14)),
                const SizedBox(height: 12),
                Row(
                  children: [
                    _buildPerfStat('Revenue', revenue > 0 ? fmt.format(revenue) : '-', Icons.attach_money, Colors.teal),
                    _buildPerfStat('Orders', '${merchant['monthOrders'] ?? 0}', Icons.shopping_bag, Colors.indigo),
                    _buildPerfStat('Visits', '${merchant['monthVisits'] ?? 0}', Icons.map, Colors.amber),
                  ],
                ),
              ],
            ),
          ).animate().fadeIn(delay: 200.ms),
          const SizedBox(height: 24),

          // Action buttons
          Row(
            children: [
              Expanded(
                child: FilledButton.icon(
                  onPressed: () => _openWhatsApp(merchant['waNumber']),
                  icon: const Icon(Icons.chat, size: 18),
                  label: const Text('WhatsApp'),
                  style: FilledButton.styleFrom(backgroundColor: Colors.green, padding: const EdgeInsets.symmetric(vertical: 14)),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.map, size: 18),
                  label: const Text('Kunjungi'),
                  style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
                ),
              ),
            ],
          ).animate().fadeIn(delay: 300.ms),
        ],
      ),
    );
  }

  Widget _buildInfoSection(BuildContext context, List<Widget> children) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(children: children),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Icon(icon, size: 18, color: Colors.grey.shade500),
          const SizedBox(width: 12),
          Text(label, style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
          const Spacer(),
          Flexible(child: Text(value, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 12), textAlign: TextAlign.end)),
        ],
      ),
    );
  }

  Widget _buildCreditStat(String label, String value, Color color) {
    return Expanded(
      child: Column(
        children: [
          Text(value, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: color)),
          Text(label, style: TextStyle(fontSize: 10, color: Colors.grey.shade600)),
        ],
      ),
    );
  }

  Widget _buildPerfStat(String label, String value, IconData icon, Color color) {
    return Expanded(
      child: Column(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 4),
          Text(value, style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 13)),
          Text(label, style: TextStyle(fontSize: 9, color: Colors.grey.shade600)),
        ],
      ),
    );
  }

  Future<void> _openWhatsApp(String? number) async {
    if (number == null) return;
    final uri = Uri.parse('https://wa.me/$number');
    if (await canLaunchUrl(uri)) await launchUrl(uri, mode: LaunchMode.externalApplication);
  }
}
