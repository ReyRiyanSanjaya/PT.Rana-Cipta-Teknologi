import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:fl_chart/fl_chart.dart';

import 'package:flutter/material.dart';
import 'package:mobile_driver/config/theme_config.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:fl_chart/fl_chart.dart';

class EarningsSummaryScreen extends StatelessWidget {
  const EarningsSummaryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ThemeConfig.beigeBackground,
      appBar: AppBar(
        title: Text('Ringkasan Pendapatan', 
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: ThemeConfig.brandColor)),
        backgroundColor: ThemeConfig.beigeBackground,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new, size: 20, color: ThemeConfig.brandColor),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildPeriodSelector(),
            const SizedBox(height: 24),
            _buildTotalEarningsCard(),
            const SizedBox(height: 24),
            _buildEarningsChart(),
            const SizedBox(height: 24),
            _buildStatsGrid(),
          ],
        ),
      ),
    );
  }

  Widget _buildPeriodSelector() {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 10)
        ],
      ),
      child: Row(
        children: [
          Expanded(child: _buildSelectorChip('Minggu Ini', isActive: true)),
          Expanded(child: _buildSelectorChip('Bulan Ini')),
          Expanded(child: _buildSelectorChip('Pilih Tanggal')),
        ],
      ),
    );
  }

  Widget _buildSelectorChip(String label, {bool isActive = false}) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(
        color: isActive ? ThemeConfig.brandColor : Colors.transparent,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Center(
        child: Text(label, 
          style: TextStyle(
            fontWeight: isActive ? FontWeight.bold : FontWeight.normal, 
            fontSize: 13,
            color: isActive ? Colors.white : Colors.grey.shade600
          )),
      ),
    );
  }

  Widget _buildTotalEarningsCard() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [ThemeConfig.brandColor, const Color(0xFFD32F2F)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(
            color: ThemeConfig.brandColor.withOpacity(0.3),
            blurRadius: 20,
            offset: const Offset(0, 10),
          )
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Total Pendapatan (Minggu Ini)', 
            style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 14, fontWeight: FontWeight.w500)),
          const SizedBox(height: 8),
          Text('Rp1.250.000', 
            style: GoogleFonts.outfit(color: Colors.white, fontSize: 36, fontWeight: FontWeight.bold)),
          const SizedBox(height: 20),
          Container(
            height: 1,
            width: double.infinity,
            color: Colors.white.withOpacity(0.2),
          ),
          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _buildBreakdownItem('Tarif', 'Rp1.100.000'),
              _buildBreakdownItem('Insentif', 'Rp100.000'),
              _buildBreakdownItem('Tip', 'Rp50.000'),
            ],
          ),
        ],
      ),
    ).animate().fadeIn().scale(begin: const Offset(0.9, 0.9));
  }

  Widget _buildBreakdownItem(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 12)),
        Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
      ],
    );
  }

  Widget _buildEarningsChart() {
    return Container(
      height: 200,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10)],
      ),
      child: BarChart(
        BarChartData(
          alignment: BarChartAlignment.spaceAround,
          maxY: 300000,
          barTouchData: BarTouchData(enabled: true),
          titlesData: FlTitlesData(
            show: true,
            bottomTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, getTitlesWidget: _bottomTitles)),
            leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
            topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
            rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
          ),
          gridData: FlGridData(show: false),
          borderData: FlBorderData(show: false),
          barGroups: _chartGroups(),
        ),
      ),
    );
  }

  List<BarChartGroupData> _chartGroups() {
    return [
      _makeGroupData(0, 150000), _makeGroupData(1, 200000), _makeGroupData(2, 180000),
      _makeGroupData(3, 250000), _makeGroupData(4, 120000), _makeGroupData(5, 280000),
      _makeGroupData(6, 70000),
    ];
  }

  BarChartGroupData _makeGroupData(int x, double y) {
    return BarChartGroupData(
      x: x,
      barRods: [
        BarChartRodData(
          toY: y,
          color: ThemeConfig.brandColor,
          width: 16,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
        ),
      ],
    );
  }

  Widget _bottomTitles(double value, TitleMeta meta) {
    const style = TextStyle(color: Colors.grey, fontSize: 10);
    String text;
    switch (value.toInt()) {
      case 0: text = 'Sen'; break;
      case 1: text = 'Sel'; break;
      case 2: text = 'Rab'; break;
      case 3: text = 'Kam'; break;
      case 4: text = 'Jum'; break;
      case 5: text = 'Sab'; break;
      case 6: text = 'Min'; break;
      default: text = ''; break;
    }
    return SideTitleWidget(axisSide: meta.axisSide, space: 4.0, child: Text(text, style: style));
  }

  Widget _buildStatsGrid() {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 16,
      mainAxisSpacing: 16,
      childAspectRatio: 1.8,
      children: [
        _buildStatCard('Total Trip', '85', Icons.directions_bike, Colors.orange),
        _buildStatCard('Jam Online', '42.5 Jam', Icons.timer, Colors.blue),
        _buildStatCard('Penerimaan', '95%', Icons.check_circle, Colors.green),
        _buildStatCard('Penyelesaian', '98%', Icons.flag, Colors.purple),
      ],
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10)],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 24),
          const Spacer(),
          Text(label, style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
          Text(value, style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
