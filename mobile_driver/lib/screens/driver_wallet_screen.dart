import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:mobile_driver/config/theme_config.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:mobile_driver/screens/earnings_summary_screen.dart'; // [NEW]

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mobile_driver/config/theme_config.dart';
import 'package:mobile_driver/providers/driver_provider.dart';
import 'package:mobile_driver/screens/earnings_summary_screen.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:mobile_driver/widgets/quest_progress_widget.dart';

class DriverWalletScreen extends StatelessWidget {
  const DriverWalletScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final scale = ThemeConfig.tabletScale(context, mobile: 1.0);
    final driverProv = Provider.of<DriverProvider>(context);
    
    return Scaffold(
      backgroundColor: ThemeConfig.beigeBackground,
      appBar: AppBar(
        title: Text('Dompet Driver', 
          style: GoogleFonts.outfit(fontWeight: FontWeight.w700, color: ThemeConfig.brandColor)),
        backgroundColor: ThemeConfig.beigeBackground,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, size: 20, color: ThemeConfig.brandColor),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.analytics_rounded, color: ThemeConfig.brandColor),
            onPressed: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const EarningsSummaryScreen()));
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        child: Column(
          children: [
            _buildModernBalanceCard(scale, driverProv),
            _buildModernQuickActions(scale),
            const SizedBox(height: 16),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 20),
              child: QuestProgressWidget(
                currentTrips: 7,
                targetTrips: 10,
                questTitle: 'Kejar Bonus Mingguan!',
                reward: 'Rp 50.000',
              ),
            ),
            _buildEarningsChart(scale),
            _buildModernTransactionHistory(scale),
          ],
        ),
      ),
    );
  }

  Widget _buildModernBalanceCard(double scale, DriverProvider prov) {
    return Container(
      margin: const EdgeInsets.all(20),
      height: 220 * scale,
      child: Stack(
        children: [
          // Background Gradient Card
          Container(
            width: double.infinity,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [ThemeConfig.brandColor, const Color(0xFFD32F2F)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(32),
              boxShadow: [
                BoxShadow(
                  color: ThemeConfig.brandColor.withOpacity(0.3),
                  blurRadius: 20,
                  offset: const Offset(0, 10),
                )
              ],
            ),
          ),
          
          // Decorative elements
          Positioned(
            right: -20, top: -20,
            child: Container(
              width: 150, height: 150,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.08),
                shape: BoxShape.circle,
              ),
            ),
          ),

          // Content
          Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'SALDO AKTIF',
                      style: GoogleFonts.outfit(
                        color: Colors.white.withOpacity(0.8),
                        fontSize: 12 * scale,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 1.5,
                      ),
                    ),
                    const Icon(Icons.account_balance_wallet_rounded, color: Colors.white70),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  'Rp${ThemeConfig.formatCurrency(prov.balance)}',
                  style: GoogleFonts.outfit(
                    color: Colors.white,
                    fontSize: 40 * scale,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const Spacer(),
                Row(
                  children: [
                    _buildCompactStat('Hari Ini', 'Rp45.000', scale),
                    const SizedBox(width: 32),
                    _buildCompactStat('Total Trip', '${prov.completedTrips}', scale),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    ).animate().fadeIn().scale(begin: const Offset(0.9, 0.9), curve: Curves.easeOutBack);
  }

  Widget _buildCompactStat(String label, String value, double scale) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 10 * scale, fontWeight: FontWeight.w600),
        ),
        Text(
          value,
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 18),
        ),
      ],
    );
  }

  Widget _buildModernQuickActions(double scale) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        children: [
          Expanded(child: _buildModernActionBtn(Icons.add_circle_rounded, 'Top Up', Colors.blue, scale)),
          const SizedBox(width: 16),
          Expanded(child: _buildModernActionBtn(Icons.outbox_rounded, 'Tarik Saldo', Colors.orange, scale)),
        ],
      ),
    );
  }

  Widget _buildModernActionBtn(IconData icon, String label, Color color, double scale) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: color.withOpacity(0.05),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: color.withOpacity(0.1)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(width: 12),
          Text(
            label,
            style: GoogleFonts.outfit(fontWeight: FontWeight.w700, fontSize: 14, color: color),
          ),
        ],
      ),
    );
  }

  Widget _buildEarningsChart(double scale) {
    return Container(
      margin: const EdgeInsets.all(20),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(32),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Statistik Mingguan',
                style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const Icon(Icons.bar_chart_rounded, color: Colors.green),
            ],
          ),
          const SizedBox(height: 24),
          SizedBox(
            height: 120,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                _buildBar(40, 'S', scale),
                _buildBar(70, 'S', scale),
                _buildBar(50, 'R', scale),
                _buildBar(90, 'K', scale),
                _buildBar(60, 'J', scale),
                _buildBar(80, 'S', scale, isToday: true),
                _buildBar(30, 'M', scale),
              ],
            ),
          ),
          const SizedBox(height: 24),
          const Divider(),
          const SizedBox(height: 16),
          _buildEarningsBreakdown(scale),
        ],
      ),
    ).animate().fadeIn(delay: 400.ms);
  }

  Widget _buildEarningsBreakdown(double scale) {
    return Column(
      children: [
        _buildBreakdownItem('Tarif Perjalanan', 'Rp215.000', scale),
        const SizedBox(height: 8),
        _buildBreakdownItem('Insentif & Bonus', 'Rp25.000', scale),
        const SizedBox(height: 8),
        _buildBreakdownItem('Tip Pelanggan', 'Rp10.000', scale),
      ],
    );
  }

  Widget _buildBreakdownItem(String label, String value, double scale) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
        Text(value, style: GoogleFonts.outfit(fontWeight: FontWeight.w600, fontSize: 14)),
      ],
    );
  }

  Widget _buildBar(double height, String label, double scale, {bool isToday = false}) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        Container(
          width: 12 * scale,
          height: height,
          decoration: BoxDecoration(
            color: isToday ? Colors.green : Colors.green.withOpacity(0.2),
            borderRadius: BorderRadius.circular(6),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          label,
          style: TextStyle(
            fontSize: 10,
            fontWeight: isToday ? FontWeight.bold : FontWeight.normal,
            color: isToday ? Colors.green : Colors.grey,
          ),
        ),
      ],
    );
  }

  Widget _buildModernTransactionHistory(double scale) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Aktivitas Terbaru',
            style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 16),
          _buildModernTxItem('Pendapatan RanaRide', '30 Mar, 14:45', '+Rp15.000', Colors.green, scale),
          _buildModernTxItem('Pendapatan RanaSend', '30 Mar, 12:20', '+Rp35.000', Colors.green, scale),
          _buildModernTxItem('Penarikan Saldo', '29 Mar, 09:15', '-Rp100.000', Colors.red, scale),
          _buildModernTxItem('Top Up Saldo', '28 Mar, 18:30', '+Rp50.000', Colors.blue, scale),
        ],
      ),
    );
  }

  Widget _buildModernTxItem(String title, String date, String amount, Color color, double scale) {
    bool isPositive = amount.startsWith('+');
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.grey.shade100),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(
              isPositive ? Icons.add_rounded : Icons.remove_rounded,
              color: color,
              size: 20,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: GoogleFonts.outfit(fontWeight: FontWeight.w600, fontSize: 15)),
                Text(date, style: TextStyle(color: Colors.grey.shade500, fontSize: 12)),
              ],
            ),
          ),
          Text(
            amount,
            style: GoogleFonts.outfit(
              fontWeight: FontWeight.w800,
              color: color,
              fontSize: 16,
            ),
          ),
        ],
      ),
    );
  }
}

