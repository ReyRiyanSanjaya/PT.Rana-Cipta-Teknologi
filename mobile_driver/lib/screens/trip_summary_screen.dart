import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:mobile_driver/config/theme_config.dart';

class TripSummaryScreen extends StatelessWidget {
  final Map<String, dynamic> tripData;

  const TripSummaryScreen({super.key, required this.tripData});

  @override
  Widget build(BuildContext context) {
    final type = tripData['type'] ?? 'RIDE';
    final price = (tripData['price'] as num?)?.toDouble() ?? 0;
    final origin = tripData['origin'] ?? tripData['originAddress'] ?? '-';
    final dest = tripData['destination'] ?? tripData['destAddress'] ?? '-';
    final customer = tripData['customer'] ?? tripData['customerName'] ?? 'Pelanggan';

    return Scaffold(
      backgroundColor: ThemeConfig.beigeBackground,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const Spacer(),
              // Success animation
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.green.shade50,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.check_rounded, color: Colors.green, size: 64),
              ).animate().scale(curve: Curves.elasticOut, duration: 800.ms),
              const SizedBox(height: 24),
              Text('Trip Selesai!',
                  style: GoogleFonts.outfit(fontSize: 28, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Text('Pendapatan dari trip ini',
                  style: TextStyle(color: Colors.grey.shade600)),
              const SizedBox(height: 12),
              Text('+Rp${ThemeConfig.formatCurrency(price)}',
                  style: GoogleFonts.outfit(fontSize: 40, fontWeight: FontWeight.w800, color: Colors.green)),
              const SizedBox(height: 40),

              // Trip details card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                ),
                child: Column(
                  children: [
                    _buildDetailRow(Icons.category_rounded, 'Tipe', type == 'SEND' ? 'RanaSend' : 'RanaRide'),
                    const Divider(height: 24),
                    _buildDetailRow(Icons.person_rounded, 'Pelanggan', customer),
                    const Divider(height: 24),
                    _buildRouteSection(origin, dest),
                    const Divider(height: 24),
                    _buildDetailRow(Icons.payments_rounded, 'Pembayaran', 'Tunai'),
                  ],
                ),
              ).animate().fadeIn(delay: 400.ms).slideY(begin: 0.1),
              const Spacer(),

              // Action buttons
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(context),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 18),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        side: BorderSide(color: Colors.grey.shade300),
                      ),
                      child: Text('OFFLINE', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: Colors.grey.shade600)),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    flex: 2,
                    child: ElevatedButton(
                      onPressed: () => Navigator.pop(context),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: ThemeConfig.brandColor,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 18),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      child: Text('CARI TRIP LAGI', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDetailRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, color: Colors.grey.shade400, size: 20),
        const SizedBox(width: 12),
        Text(label, style: TextStyle(color: Colors.grey.shade600, fontSize: 14)),
        const Spacer(),
        Text(value, style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 14)),
      ],
    );
  }

  Widget _buildRouteSection(String origin, String dest) {
    return Column(
      children: [
        Row(
          children: [
            const Icon(Icons.radio_button_checked, color: Colors.green, size: 16),
            const SizedBox(width: 12),
            Expanded(child: Text(origin, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13))),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            const Icon(Icons.location_on, color: Colors.red, size: 16),
            const SizedBox(width: 12),
            Expanded(child: Text(dest, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13))),
          ],
        ),
      ],
    );
  }
}
