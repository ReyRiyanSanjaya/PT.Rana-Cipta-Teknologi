import 'package:flutter/material.dart';
import 'package:mobile_driver/config/theme_config.dart';
import 'package:mobile_driver/data/driver_api_service.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';

class EarningsSummaryScreen extends StatefulWidget {
  const EarningsSummaryScreen({super.key});

  @override
  State<EarningsSummaryScreen> createState() => _EarningsSummaryScreenState();
}

class _EarningsSummaryScreenState extends State<EarningsSummaryScreen> {
  String _selectedPeriod = 'week';
  Map<String, dynamic> _earnings = {};
  Map<String, dynamic> _stats = {};
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    final api = DriverApiService();

    final results = await Future.wait([
      api.getEarnings(period: _selectedPeriod),
      api.getDriverStats(),
    ]);

    if (mounted) {
      setState(() {
        _earnings = results[0] as Map<String, dynamic>;
        _stats = results[1] as Map<String, dynamic>;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ThemeConfig.beigeBackground,
      appBar: AppBar(
        title: Text('Ringkasan Pendapatan',
            style: GoogleFonts.outfit(
                fontWeight: FontWeight.bold, color: ThemeConfig.brandColor)),
        backgroundColor: ThemeConfig.beigeBackground,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new,
              size: 20, color: ThemeConfig.brandColor),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _loadData,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildPeriodSelector(),
              const SizedBox(height: 24),
              _isLoading
                  ? const SizedBox(
                      height: 200,
                      child: Center(child: CircularProgressIndicator()))
                  : Column(
                      children: [
                        _buildTotalEarningsCard(),
                        const SizedBox(height: 24),
                        _buildEarningsChart(),
                        const SizedBox(height: 24),
                        _buildStatsGrid(),
                      ],
                    ),
            ],
          ),
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
          Expanded(child: _buildSelectorChip('Hari Ini', 'today')),
          Expanded(child: _buildSelectorChip('Minggu Ini', 'week')),
          Expanded(child: _buildSelectorChip('Bulan Ini', 'month')),
        ],
      ),
    );
  }

  Widget _buildSelectorChip(String label, String value) {
    final isActive = _selectedPeriod == value;
    return GestureDetector(
      onTap: () {
        setState(() => _selectedPeriod = value);
        _loadData();
      },
      child: Container(
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
                color: isActive ? Colors.white : Colors.grey.shade600,
              )),
        ),
      ),
    );
  }

  Widget _buildTotalEarningsCard() {
    final totalEarnings = (_earnings['totalEarnings'] as num?)?.toDouble() ?? 0;
    final totalTrips = (_earnings['totalTrips'] as num?)?.toInt() ?? 0;

    String periodLabel;
    switch (_selectedPeriod) {
      case 'today':
        periodLabel = 'Hari Ini';
        break;
      case 'month':
        periodLabel = 'Bulan Ini';
        break;
      default:
        periodLabel = 'Minggu Ini';
    }

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [ThemeConfig.brandColor, Color(0xFFD32F2F)],
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
          Text('Total Pendapatan ($periodLabel)',
              style: TextStyle(
                  color: Colors.white.withOpacity(0.8),
                  fontSize: 14,
                  fontWeight: FontWeight.w500)),
          const SizedBox(height: 8),
          Text('Rp${ThemeConfig.formatCurrency(totalEarnings)}',
              style: GoogleFonts.outfit(
                  color: Colors.white, fontSize: 36, fontWeight: FontWeight.bold)),
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
              _buildBreakdownItem('Total Trip', '$totalTrips'),
              _buildBreakdownItem('Rata-rata/Trip',
                  totalTrips > 0
                      ? 'Rp${ThemeConfig.formatCurrency(totalEarnings / totalTrips)}'
                      : 'Rp0'),
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
        Text(label,
            style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 12)),
        Text(value,
            style: const TextStyle(
                color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
      ],
    );
  }

  Widget _buildEarningsChart() {
    final dailyEarnings =
        (_earnings['dailyEarnings'] as Map<String, dynamic>?) ?? {};

    if (dailyEarnings.isEmpty) {
      return Container(
        height: 200,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
        ),
        child: Center(
          child: Text('Belum ada data grafik',
              style: TextStyle(color: Colors.grey.shade500)),
        ),
      );
    }

    // Sort by date and build chart data
    final sortedKeys = dailyEarnings.keys.toList()..sort();
    final barGroups = <BarChartGroupData>[];
    double maxY = 1;

    for (int i = 0; i < sortedKeys.length && i < 7; i++) {
      final val = (dailyEarnings[sortedKeys[i]] as num).toDouble();
      if (val > maxY) maxY = val;
      barGroups.add(BarChartGroupData(
        x: i,
        barRods: [
          BarChartRodData(
            toY: val,
            color: ThemeConfig.brandColor,
            width: 16,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
          ),
        ],
      ));
    }

    return Container(
      height: 200,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10)
        ],
      ),
      child: BarChart(
        BarChartData(
          alignment: BarChartAlignment.spaceAround,
          maxY: maxY * 1.2,
          barTouchData: BarTouchData(
            enabled: true,
            touchTooltipData: BarTouchTooltipData(
              getTooltipItem: (group, groupIndex, rod, rodIndex) {
                return BarTooltipItem(
                  'Rp${ThemeConfig.formatCurrency(rod.toY)}',
                  const TextStyle(
                      color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                );
              },
            ),
          ),
          titlesData: FlTitlesData(
            show: true,
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                getTitlesWidget: (value, meta) {
                  final idx = value.toInt();
                  if (idx >= 0 && idx < sortedKeys.length) {
                    try {
                      final dt = DateTime.parse(sortedKeys[idx]);
                      return SideTitleWidget(
                        axisSide: meta.axisSide,
                        space: 4,
                        child: Text(DateFormat('dd').format(dt),
                            style: const TextStyle(color: Colors.grey, fontSize: 10)),
                      );
                    } catch (_) {}
                  }
                  return const SizedBox.shrink();
                },
              ),
            ),
            leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          ),
          gridData: const FlGridData(show: false),
          borderData: FlBorderData(show: false),
          barGroups: barGroups,
        ),
      ),
    );
  }

  Widget _buildStatsGrid() {
    final todayTrips = (_stats['todayTrips'] as num?)?.toInt() ?? 0;
    final totalTrips = (_stats['totalTrips'] as num?)?.toInt() ?? 0;
    final rating = (_stats['rating'] as num?)?.toDouble() ?? 0;

    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 16,
      mainAxisSpacing: 16,
      childAspectRatio: 1.8,
      children: [
        _buildStatCard('Trip Hari Ini', '$todayTrips', Icons.directions_bike, Colors.orange),
        _buildStatCard('Total Trip', '$totalTrips', Icons.flag, Colors.blue),
        _buildStatCard('Rating', '$rating ★', Icons.star, Colors.amber),
        _buildStatCard('Status', _stats['status'] ?? 'OFFLINE', Icons.circle, Colors.green),
      ],
    );
  }

  Widget _buildStatCard(
      String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10)
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 24),
          const Spacer(),
          Text(label, style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
          Text(value,
              style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
