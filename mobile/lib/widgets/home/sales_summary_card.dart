import 'package:rana_merchant/config/merchant_config.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:rana_merchant/config/theme_config.dart';
import 'package:rana_merchant/data/local/database_helper.dart';
import 'package:rana_merchant/screens/report_screen.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:fl_chart/fl_chart.dart';

class SalesSummaryCard extends StatelessWidget {
  const SalesSummaryCard({super.key});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final now = DateTime.now();
    final start = DateTime(now.year, now.month, now.day, 0, 0, 0);
    final end = DateTime(now.year, now.month, now.day, 23, 59, 59);

    return FutureBuilder<Map<String, dynamic>>(
      future: DatabaseHelper.instance.getSalesReport(start: start, end: end),
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const _SalesSummaryLoading();
        }
        final data = snapshot.data!;
        final grossSales = (data['grossSales'] as num?)?.toDouble() ?? 0.0;
        final totalTransactions = (data['totalTransactions'] as num?)?.toInt() ?? 0;
        final aov = totalTransactions > 0 ? grossSales / totalTransactions : 0.0;
        final netProfit = (data['netProfit'] as num?)?.toDouble() ?? 0.0;
        final List<num> trendRaw =
            (data['trend'] as List?)?.whereType<num>().toList() ?? [];
        final List<double> trend =
            trendRaw.map((e) => (e as num).toDouble()).toList();

        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  colorScheme.surface.withOpacity(0.98),
                  colorScheme.surface.withOpacity(0.94),
                ],
              ),
              border: Border.all(
                color: colorScheme.outline.withOpacity(0.12),
                width: 1,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.04),
                  blurRadius: 12,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Ringkasan Penjualan Hari Ini',
                      style: GoogleFonts.outfit(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: colorScheme.onSurface,
                      ),
                    ),
                    TextButton(
                      onPressed: () {
                        Navigator.push(context,
                            MaterialPageRoute(builder: (_) => const ReportScreen()));
                      },
                      child: Text(
                        'Lihat Detail',
                        style: GoogleFonts.outfit(
                          fontWeight: FontWeight.w600,
                          color: ThemeConfig.brandColor,
                        ),
                      ),
                    )
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    _buildSummaryItem(
                      context,
                      label: 'Omzet',
                      value: NumberFormat.currency(
                              locale: 'id_ID', symbol: '${MerchantConfig.defaultCurrencySymbol} ', decimalDigits: 0)
                          .format(grossSales),
                      color: colorScheme.primary,
                      bgColor: colorScheme.primaryContainer.withOpacity(0.18),
                    ),
                    const SizedBox(width: 12),
                    _buildSummaryItem(
                      context,
                      label: 'Transaksi',
                      value: totalTransactions.toString(),
                      color: colorScheme.secondary,
                      bgColor: colorScheme.secondaryContainer.withOpacity(0.18),
                    ),
                    const SizedBox(width: 12),
                    _buildSummaryItem(
                      context,
                      label: 'AOV',
                      value: NumberFormat.currency(
                              locale: 'id_ID', symbol: '${MerchantConfig.defaultCurrencySymbol} ', decimalDigits: 0)
                          .format(aov),
                      color: colorScheme.tertiary,
                      bgColor: colorScheme.tertiaryContainer.withOpacity(0.18),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                if (trend.length >= 2) _buildTrendChart(context, trend),
                if (trend.length >= 2) const SizedBox(height: 12),
                _buildNetProfit(context, netProfit),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildSummaryItem(BuildContext context,
      {required String label,
      required String value,
      required Color color,
      required Color bgColor}) {
    final colorScheme = Theme.of(context).colorScheme;
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: color.withOpacity(0.24),
            width: 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: GoogleFonts.outfit(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: color,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              value,
              style: GoogleFonts.outfit(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: colorScheme.onSurface,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTrendChart(BuildContext context, List<double> trend) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: colorScheme.surface.withOpacity(0.6),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: colorScheme.outline.withOpacity(0.18),
          width: 1,
        ),
      ),
      child: SizedBox(
        height: 80,
        child: LineChart(
          LineChartData(
            titlesData: const FlTitlesData(show: false),
            gridData: const FlGridData(show: false),
            borderData: FlBorderData(show: false),
            lineTouchData: const LineTouchData(enabled: false),
            minY: trend.reduce((a, b) => a < b ? a : b).toDouble(),
            maxY: trend.reduce((a, b) => a > b ? a : b).toDouble(),
            lineBarsData: [
              LineChartBarData(
                spots: List.generate(
                  trend.length,
                  (i) => FlSpot(i.toDouble(), trend[i].toDouble()),
                ),
                isCurved: true,
                barWidth: 2.2,
                color: colorScheme.primary,
                dotData: const FlDotData(show: false),
                belowBarData: BarAreaData(
                  show: true,
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      colorScheme.primary.withOpacity(0.35),
                      colorScheme.primary.withOpacity(0.0),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNetProfit(BuildContext context, double netProfit) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: colorScheme.secondaryContainer.withOpacity(0.16),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: colorScheme.secondary.withOpacity(0.24),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.trending_up, size: 16, color: colorScheme.secondary),
          const SizedBox(width: 8),
          Text(
            'Profit bersih: ${NumberFormat.currency(locale: 'id_ID', symbol: '${MerchantConfig.defaultCurrencySymbol} ', decimalDigits: 0).format(netProfit)}',
            style: GoogleFonts.outfit(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: colorScheme.onSurface,
            ),
          ),
        ],
      ),
    );
  }
}

class _SalesSummaryLoading extends StatelessWidget {
  const _SalesSummaryLoading();

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Container(
        height: 120,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              colorScheme.surface.withOpacity(0.98),
              colorScheme.surface.withOpacity(0.94),
            ],
          ),
          border: Border.all(
            color: colorScheme.outline.withOpacity(0.12),
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 12,
              offset: const Offset(0, 6),
            ),
          ],
        ),
      ),
    ).animate(onPlay: (c) => c.repeat()).shimmer(duration: 1200.ms);
  }
}
