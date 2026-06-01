import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mobile_driver/config/theme_config.dart';
import 'package:mobile_driver/providers/driver_provider.dart';
import 'package:mobile_driver/screens/earnings_summary_screen.dart';
import 'package:mobile_driver/data/driver_api_service.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';

class DriverWalletScreen extends StatefulWidget {
  const DriverWalletScreen({super.key});

  @override
  State<DriverWalletScreen> createState() => _DriverWalletScreenState();
}

class _DriverWalletScreenState extends State<DriverWalletScreen> {
  List<dynamic> _transactions = [];
  Map<String, dynamic> _earnings = {};
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadWalletData();
  }

  Future<void> _loadWalletData() async {
    setState(() => _isLoading = true);
    try {
      final api = DriverApiService();
      final results = await Future.wait([
        api.getWalletTransactions(limit: 10),
        api.getEarnings(period: 'week'),
      ]);

      if (mounted) {
        setState(() {
          final walletData = results[0] as Map<String, dynamic>;
          _transactions = (walletData['transactions'] as List<dynamic>?) ?? [];
          _earnings = results[1] as Map<String, dynamic>;
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('Load Wallet Error: $e');
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scale = ThemeConfig.tabletScale(context, mobile: 1.0);
    final driverProv = Provider.of<DriverProvider>(context);

    return Scaffold(
      backgroundColor: ThemeConfig.beigeBackground,
      appBar: AppBar(
        title: Text('Dompet Driver',
            style: GoogleFonts.outfit(
                fontWeight: FontWeight.w700, color: ThemeConfig.brandColor)),
        backgroundColor: ThemeConfig.beigeBackground,
        elevation: 0,
        automaticallyImplyLeading: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.analytics_rounded, color: ThemeConfig.brandColor),
            onPressed: () {
              Navigator.push(context,
                  MaterialPageRoute(builder: (_) => const EarningsSummaryScreen()));
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadWalletData,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            children: [
              _buildBalanceCard(scale, driverProv),
              _buildQuickActions(context, scale),
              const SizedBox(height: 16),
              _buildWeeklyChart(scale),
              _buildTransactionHistory(scale),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBalanceCard(double scale, DriverProvider prov) {
    return Container(
      margin: const EdgeInsets.all(20),
      height: 200 * scale,
      child: Stack(
        children: [
          Container(
            width: double.infinity,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [ThemeConfig.brandColor, Color(0xFFD32F2F)],
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
          Padding(
            padding: const EdgeInsets.all(28),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('SALDO AKTIF',
                        style: GoogleFonts.outfit(
                          color: Colors.white.withOpacity(0.8),
                          fontSize: 12 * scale,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 1.5,
                        )),
                    const Icon(Icons.account_balance_wallet_rounded,
                        color: Colors.white70),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  'Rp${ThemeConfig.formatCurrency(prov.balance)}',
                  style: GoogleFonts.outfit(
                    color: Colors.white,
                    fontSize: 36 * scale,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const Spacer(),
                Row(
                  children: [
                    _buildCompactStat('Hari Ini',
                        'Rp${ThemeConfig.formatCurrency(prov.todayEarnings)}', scale),
                    const SizedBox(width: 32),
                    _buildCompactStat('Trip Hari Ini', '${prov.todayTrips}', scale),
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
        Text(label.toUpperCase(),
            style: TextStyle(
                color: Colors.white.withOpacity(0.6),
                fontSize: 10 * scale,
                fontWeight: FontWeight.w600)),
        Text(value,
            style: const TextStyle(
                color: Colors.white, fontWeight: FontWeight.w700, fontSize: 16)),
      ],
    );
  }

  Widget _buildQuickActions(BuildContext context, double scale) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        children: [
          Expanded(
            child: GestureDetector(
              onTap: () => _showTopUpDialog(context),
              child: _buildActionBtn(Icons.add_circle_rounded, 'Top Up', Colors.blue, scale),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: GestureDetector(
              onTap: () => _showWithdrawDialog(context),
              child: _buildActionBtn(Icons.outbox_rounded, 'Tarik Saldo', Colors.orange, scale),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionBtn(IconData icon, String label, Color color, double scale) {
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
          Text(label,
              style: GoogleFonts.outfit(
                  fontWeight: FontWeight.w700, fontSize: 14, color: color)),
        ],
      ),
    );
  }

  void _showTopUpDialog(BuildContext context) {
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
            Text('Top Up Saldo',
                style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            const Text(
              'Untuk top up saldo, silakan transfer ke rekening berikut dan konfirmasi via WhatsApp support.',
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                children: [
                  _buildInfoRow('Bank', 'BCA'),
                  _buildInfoRow('No. Rekening', '123-456-7890'),
                  _buildInfoRow('Atas Nama', 'PT Rana Cipta Teknologi'),
                ],
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('MENGERTI'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showWithdrawDialog(BuildContext context) {
    final amountCtrl = TextEditingController();
    final bankCtrl = TextEditingController();
    final accountCtrl = TextEditingController();
    final holderCtrl = TextEditingController();
    final prov = Provider.of<DriverProvider>(context, listen: false);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
        child: Container(
          padding: const EdgeInsets.all(32),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Tarik Saldo',
                    style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Text('Saldo tersedia: Rp${ThemeConfig.formatCurrency(prov.balance)}',
                    style: TextStyle(color: Colors.grey.shade600)),
                const SizedBox(height: 24),
                TextField(
                  controller: amountCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Jumlah Penarikan',
                    prefixText: 'Rp ',
                    hintText: 'Min. 10.000',
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: bankCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Nama Bank',
                    hintText: 'BCA, BNI, Mandiri, dll',
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: accountCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Nomor Rekening',
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: holderCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Nama Pemilik Rekening',
                  ),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () async {
                      final amount = double.tryParse(amountCtrl.text.replaceAll('.', '')) ?? 0;
                      if (amount < 10000) {
                        ScaffoldMessenger.of(ctx).showSnackBar(
                            const SnackBar(content: Text('Minimum penarikan Rp10.000')));
                        return;
                      }
                      if (bankCtrl.text.isEmpty || accountCtrl.text.isEmpty) {
                        ScaffoldMessenger.of(ctx).showSnackBar(
                            const SnackBar(content: Text('Lengkapi data bank')));
                        return;
                      }

                      try {
                        await DriverApiService().requestWithdrawal(
                          amount: amount,
                          bankName: bankCtrl.text,
                          accountNumber: accountCtrl.text,
                          accountHolder: holderCtrl.text.isNotEmpty ? holderCtrl.text : null,
                        );
                        if (ctx.mounted) Navigator.pop(ctx);
                        if (mounted) {
                          prov.refreshStats();
                          _loadWalletData();
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Penarikan berhasil diajukan')),
                          );
                        }
                      } catch (e) {
                        if (ctx.mounted) {
                          ScaffoldMessenger.of(ctx).showSnackBar(
                              SnackBar(content: Text('Gagal: $e')));
                        }
                      }
                    },
                    child: const Text('AJUKAN PENARIKAN'),
                  ),
                ),
                const SizedBox(height: 8),
                Center(
                  child: Text('Biaya admin 2.5% (min Rp2.500)',
                      style: TextStyle(color: Colors.grey.shade500, fontSize: 12)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: Colors.grey.shade600)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _buildWeeklyChart(double scale) {
    final dailyEarnings = (_earnings['dailyEarnings'] as Map<String, dynamic>?) ?? {};
    final totalEarnings = (_earnings['totalEarnings'] as num?)?.toDouble() ?? 0;
    final totalTrips = (_earnings['totalTrips'] as num?)?.toInt() ?? 0;

    // Build bars from real data
    final now = DateTime.now();
    final dayLabels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
    final bars = <Widget>[];
    double maxVal = 1;

    for (final entry in dailyEarnings.entries) {
      final val = (entry.value as num).toDouble();
      if (val > maxVal) maxVal = val;
    }

    for (int i = 6; i >= 0; i--) {
      final date = now.subtract(Duration(days: i));
      final key = DateFormat('yyyy-MM-dd').format(date);
      final val = (dailyEarnings[key] as num?)?.toDouble() ?? 0;
      final height = maxVal > 0 ? (val / maxVal) * 100 : 0.0;
      final isToday = i == 0;
      bars.add(_buildBar(height, dayLabels[date.weekday - 1], scale, isToday: isToday));
    }

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
              Text('Statistik Mingguan',
                  style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold)),
              const Icon(Icons.bar_chart_rounded, color: Colors.green),
            ],
          ),
          const SizedBox(height: 24),
          _isLoading
              ? const SizedBox(height: 120, child: Center(child: CircularProgressIndicator()))
              : SizedBox(
                  height: 120,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: bars,
                  ),
                ),
          const SizedBox(height: 24),
          const Divider(),
          const SizedBox(height: 16),
          _buildBreakdownRow('Total Pendapatan', 'Rp${ThemeConfig.formatCurrency(totalEarnings)}'),
          const SizedBox(height: 8),
          _buildBreakdownRow('Total Trip', '$totalTrips trip'),
        ],
      ),
    ).animate().fadeIn(delay: 400.ms);
  }

  Widget _buildBreakdownRow(String label, String value) {
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
          height: height.clamp(4, 100),
          decoration: BoxDecoration(
            color: isToday ? Colors.green : Colors.green.withOpacity(0.2),
            borderRadius: BorderRadius.circular(6),
          ),
        ),
        const SizedBox(height: 8),
        Text(label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: isToday ? FontWeight.bold : FontWeight.normal,
              color: isToday ? Colors.green : Colors.grey,
            )),
      ],
    );
  }

  Widget _buildTransactionHistory(double scale) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Aktivitas Terbaru',
              style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.w700)),
          const SizedBox(height: 16),
          if (_isLoading)
            const Center(child: CircularProgressIndicator())
          else if (_transactions.isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(32),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
              ),
              child: Column(
                children: [
                  Icon(Icons.receipt_long_rounded, size: 48, color: Colors.grey.shade300),
                  const SizedBox(height: 12),
                  Text('Belum ada transaksi',
                      style: TextStyle(color: Colors.grey.shade500)),
                ],
              ),
            )
          else
            ...List.generate(_transactions.length, (index) {
              final tx = Map<String, dynamic>.from(_transactions[index]);
              return _buildTxItem(tx, scale);
            }),
        ],
      ),
    );
  }

  Widget _buildTxItem(Map<String, dynamic> tx, double scale) {
    final type = tx['type'] ?? '';
    final amount = (tx['amount'] as num?)?.toDouble() ?? 0;
    final description = tx['description'] ?? type;
    final createdAt = tx['createdAt'];

    String dateStr = '';
    if (createdAt != null) {
      try {
        final dt = DateTime.parse(createdAt.toString()).toLocal();
        dateStr = DateFormat('dd MMM, HH:mm').format(dt);
      } catch (_) {}
    }

    final isPositive = amount >= 0;
    final color = isPositive ? Colors.green : Colors.red;
    final amountStr = isPositive
        ? '+Rp${ThemeConfig.formatCurrency(amount)}'
        : '-Rp${ThemeConfig.formatCurrency(amount.abs())}';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade100),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(
              isPositive ? Icons.add_rounded : Icons.remove_rounded,
              color: color, size: 20,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(description,
                    style: GoogleFonts.outfit(fontWeight: FontWeight.w600, fontSize: 14),
                    maxLines: 1, overflow: TextOverflow.ellipsis),
                Text(dateStr, style: TextStyle(color: Colors.grey.shade500, fontSize: 12)),
              ],
            ),
          ),
          Text(amountStr,
              style: GoogleFonts.outfit(fontWeight: FontWeight.w800, color: color, fontSize: 15)),
        ],
      ),
    );
  }
}
