import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import 'package:rana_sales/data/api_service.dart';

class SalesAnalyticsScreen extends StatefulWidget {
  const SalesAnalyticsScreen({super.key});

  @override
  State<SalesAnalyticsScreen> createState() => _SalesAnalyticsScreenState();
}

class _SalesAnalyticsScreenState extends State<SalesAnalyticsScreen> {
  Map<String, dynamic>? _data;
  bool _isLoading = true;
  int _period = 30;

  final _fmt = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      setState(() => _isLoading = true);
      final data = await ApiService().getSalesAnalytics(period: _period);
      if (mounted) setState(() { _data = data; _isLoading = false; });
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _fmtShort(num v) {
    if (v >= 1000000) return '${(v / 1000000).toStringAsFixed(1)}Jt';
    if (v >= 1000) return '${(v / 1000).toStringAsFixed(0)}Rb';
    return v.toString();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Sales Analytics', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        actions: [
          PopupMenuButton<int>(
            icon: const Icon(Icons.calendar_today, size: 20),
            onSelected: (v) { setState(() => _period = v); _loadData(); },
            itemBuilder: (_) => [
              const PopupMenuItem(value: 7, child: Text('7 Hari')),
              const PopupMenuItem(value: 30, child: Text('30 Hari')),
              const PopupMenuItem(value: 90, child: Text('90 Hari')),
            ],
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _data == null
              ? Center(child: Text('Gagal memuat data', style: TextStyle(color: Colors.grey.shade500)))
              : RefreshIndicator(
                  onRefresh: _loadData,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      _buildSummaryCards(),
                      const SizedBox(height: 20),
                      _buildRevenueChart(),
                      const SizedBox(height: 20),
                      _buildTopMerchants(),
                      const SizedBox(height: 20),
                      _buildTopProducts(),
                    ],
                  ),
                ),
    );
  }

  Widget _buildSummaryCards() {
    final summary = _data!['summary'] as Map<String, dynamic>;
    final growth = summary['revenueGrowth'] ?? 0;

    return Column(
      children: [
        // Revenue card
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: LinearGradient(colors: [Colors.teal.shade600, Colors.green.shade400]),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Total Revenue', style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 12)),
              const SizedBox(height: 4),
              Text(_fmt.format(summary['totalRevenue'] ?? 0), style: GoogleFonts.outfit(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(growth >= 0 ? Icons.trending_up : Icons.trending_down, color: Colors.white, size: 16),
                  const SizedBox(width: 4),
                  Text('${growth >= 0 ? '+' : ''}$growth% vs bulan lalu', style: const TextStyle(color: Colors.white, fontSize: 12)),
                ],
              ),
            ],
          ),
        ).animate().fadeIn(),
        const SizedBox(height: 12),
        Row(
          children: [
            _buildMiniStat('Orders', '${summary['totalOrders'] ?? 0}', Colors.indigo),
            const SizedBox(width: 8),
            _buildMiniStat('Avg Value', _fmtShort(summary['avgOrderValue'] ?? 0), Colors.amber),
            const SizedBox(width: 8),
            _buildMiniStat('Merchants', '${summary['uniqueCustomers'] ?? 0}', Colors.purple),
          ],
        ).animate().fadeIn(delay: 100.ms),
      ],
    );
  }

  Widget _buildMiniStat(String label, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: color.withOpacity(0.05),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Column(
          children: [
            Text(value, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: color)),
            Text(label, style: TextStyle(fontSize: 10, color: Colors.grey.shade600)),
          ],
        ),
      ),
    );
  }

  Widget _buildRevenueChart() {
    final dailyRevenue = _data!['dailyRevenue'] as List? ?? [];
    if (dailyRevenue.isEmpty) return const SizedBox();

    final spots = dailyRevenue.asMap().entries.map((e) {
      return FlSpot(e.key.toDouble(), (e.value['revenue'] ?? 0).toDouble());
    }).toList();

    final maxY = spots.map((s) => s.y).reduce((a, b) => a > b ? a : b);

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
          Text('Revenue Harian', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 14)),
          const SizedBox(height: 16),
          SizedBox(
            height: 180,
            child: LineChart(
              LineChartData(
                gridData: FlGridData(show: true, drawVerticalLine: false, horizontalInterval: maxY > 0 ? maxY / 4 : 1),
                titlesData: FlTitlesData(
                  leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 50, getTitlesWidget: (v, _) => Text(_fmtShort(v), style: const TextStyle(fontSize: 9)))),
                  bottomTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                ),
                borderData: FlBorderData(show: false),
                lineBarsData: [
                  LineChartBarData(
                    spots: spots,
                    isCurved: true,
                    color: Colors.teal,
                    barWidth: 2.5,
                    dotData: const FlDotData(show: false),
                    belowBarData: BarAreaData(show: true, color: Colors.teal.withOpacity(0.1)),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    ).animate().fadeIn(delay: 200.ms);
  }

  Widget _buildTopMerchants() {
    final merchants = _data!['topMerchants'] as List? ?? [];
    if (merchants.isEmpty) return const SizedBox();

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
          Text('Top Merchants', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 14)),
          const SizedBox(height: 12),
          ...merchants.take(5).toList().asMap().entries.map((e) {
            final m = e.value;
            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Row(
                children: [
                  CircleAvatar(radius: 14, backgroundColor: Colors.teal.shade100, child: Text('${e.key + 1}', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.teal.shade700))),
                  const SizedBox(width: 10),
                  Expanded(child: Text(m['name'] ?? '', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500))),
                  Text(_fmtShort(m['revenue'] ?? 0), style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.teal.shade700)),
                ],
              ),
            );
          }),
        ],
      ),
    ).animate().fadeIn(delay: 300.ms);
  }

  Widget _buildTopProducts() {
    final products = _data!['topProducts'] as List? ?? [];
    if (products.isEmpty) return const SizedBox();

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
          Text('Top Produk', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 14)),
          const SizedBox(height: 12),
          ...products.take(5).toList().asMap().entries.map((e) {
            final p = e.value;
            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Row(
                children: [
                  CircleAvatar(radius: 14, backgroundColor: Colors.indigo.shade100, child: Text('${e.key + 1}', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.indigo.shade700))),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(p['name'] ?? '', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                        Text('${p['qty'] ?? 0} ${p['unit'] ?? 'pcs'}', style: TextStyle(fontSize: 10, color: Colors.grey.shade500)),
                      ],
                    ),
                  ),
                  Text(_fmtShort(p['revenue'] ?? 0), style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.indigo.shade700)),
                ],
              ),
            );
          }),
        ],
      ),
    ).animate().fadeIn(delay: 400.ms);
  }
}
