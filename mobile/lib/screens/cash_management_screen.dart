import 'package:rana_merchant/config/merchant_config.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:rana_merchant/providers/shift_provider.dart';
import 'package:rana_merchant/services/sound_service.dart';

class CashManagementScreen extends StatefulWidget {
  const CashManagementScreen({super.key});

  @override
  State<CashManagementScreen> createState() => _CashManagementScreenState();
}

class _CashManagementScreenState extends State<CashManagementScreen> {
  final _currencyFormat =
      NumberFormat.currency(locale: 'id_ID', symbol: '${MerchantConfig.defaultCurrencySymbol} ', decimalDigits: 0);

  @override
  void initState() {
    super.initState();
    // Refresh data when entering
    Future.microtask(() => context.read<ShiftProvider>().loadCurrentShift());
  }

  void _showMutationDialog(BuildContext context, String type) {
    final amountController = TextEditingController();
    final noteController = TextEditingController();
    final isCashIn = type == 'IN';
    bool isSaving = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Text(isCashIn ? 'Tambah Kas Masuk' : 'Tambah Kas Keluar',
              style: GoogleFonts.poppins(fontWeight: FontWeight.bold)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: amountController,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: 'Jumlah (Rp)',
                  prefixText: '${MerchantConfig.defaultCurrencySymbol} ',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: noteController,
                decoration: InputDecoration(
                  labelText: 'Keterangan',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
            FilledButton(
              onPressed: isSaving ? null : () async {
                final amount = double.tryParse(amountController.text) ?? 0;
                if (amount <= 0) return;
                setDialogState(() => isSaving = true);
                HapticFeedback.lightImpact();
                final success = await context
                    .read<ShiftProvider>()
                    .addMutation(type, amount, noteController.text);
                if (ctx.mounted) {
                  Navigator.pop(ctx);
                  if (success) {
                    SoundService.playBeep();
                    setState(() {});
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                      content: Row(children: [
                        const Icon(Icons.check_circle_rounded, color: Colors.white),
                        const SizedBox(width: 8),
                        Text(isCashIn ? 'Kas masuk berhasil dicatat!' : 'Kas keluar berhasil dicatat!',
                            style: GoogleFonts.outfit(fontWeight: FontWeight.w600)),
                      ]),
                      backgroundColor: const Color(0xFF81B29A),
                      behavior: SnackBarBehavior.floating,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      duration: const Duration(seconds: 2),
                    ));
                  }
                }
              },
              style: FilledButton.styleFrom(
                backgroundColor: isCashIn ? const Color(0xFF81B29A) : const Color(0xFFE07A5F),
              ),
              child: isSaving
                  ? const SizedBox(width: 18, height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Text('Simpan', style: GoogleFonts.poppins(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }

  void _showCloseShiftDialog(BuildContext context, double expectedCash) {
    final actualCashController = TextEditingController();
    bool isSaving = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Text('Tutup Shift',
              style: GoogleFonts.poppins(fontWeight: FontWeight.bold)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF81B29A).withOpacity(0.10),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(children: [
                  const Icon(Icons.info_outline_rounded, size: 16, color: Color(0xFF81B29A)),
                  const SizedBox(width: 8),
                  Expanded(child: Text(
                    'Total Uang Seharusnya: ${_currencyFormat.format(expectedCash)}',
                    style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w600,
                        color: const Color(0xFF81B29A)),
                  )),
                ]),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: actualCashController,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: 'Total Uang Aktual (Dihitung)',
                  prefixText: '${MerchantConfig.defaultCurrencySymbol} ',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  helperText: 'Masukkan jumlah uang tunai yang ada di laci',
                ),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
            FilledButton(
              onPressed: isSaving ? null : () async {
                final actual = double.tryParse(actualCashController.text);
                if (actual == null) return;
                setDialogState(() => isSaving = true);
                HapticFeedback.mediumImpact();
                final success = await context.read<ShiftProvider>().closeShift(actual);
                if (ctx.mounted) {
                  Navigator.pop(ctx);
                  if (success) {
                    SoundService.playBeep();
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                        content: Row(children: [
                          const Icon(Icons.lock_rounded, color: Colors.white),
                          const SizedBox(width: 8),
                          Text('Shift berhasil ditutup!',
                              style: GoogleFonts.outfit(fontWeight: FontWeight.w600)),
                        ]),
                        backgroundColor: const Color(0xFF81B29A),
                        behavior: SnackBarBehavior.floating,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        duration: const Duration(seconds: 2),
                      ));
                      Navigator.pop(context);
                    }
                  }
                }
              },
              style: FilledButton.styleFrom(backgroundColor: const Color(0xFFE07A5F)),
              child: isSaving
                  ? const SizedBox(width: 18, height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Tutup Shift'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final isDark = colorScheme.brightness == Brightness.dark;
    final shiftProvider = context.watch<ShiftProvider>();
    final shift = shiftProvider.currentShift;

    if (shift == null) {
      return Scaffold(
        backgroundColor: colorScheme.surface,
        appBar: AppBar(
          title: const Text('Kelola Kas'),
          backgroundColor: colorScheme.surface,
          foregroundColor: colorScheme.onSurface,
          elevation: 0,
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.point_of_sale_outlined,
                size: 64,
                color: colorScheme.onSurfaceVariant,
              ),
              const SizedBox(height: 16),
              Text('Tidak ada shift yang aktif',
                  style: GoogleFonts.poppins(
                    fontSize: 16,
                    color: colorScheme.onSurfaceVariant,
                  )),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('Kelola Kas',
            style: GoogleFonts.poppins(fontWeight: FontWeight.bold)),
        backgroundColor: colorScheme.surface,
        foregroundColor: colorScheme.onSurface,
        elevation: 0,
      ),
      body: FutureBuilder<Map<String, double>>(
        future: shiftProvider.getShiftSummary(),
        builder: (context, snapshot) {
          if (!snapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }

          final summary = snapshot.data!;
          final startCash = (shift['startCash'] as num).toDouble();
          final cashSales = summary['cashSales'] ?? 0.0;
          final cashIn = summary['cashIn'] ?? 0.0;
          final cashOut = summary['cashOut'] ?? 0.0;
          final expectedCash = startCash + cashSales + cashIn - cashOut;

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildSummaryCard(
                  'Saldo Akhir Diharapkan',
                  expectedCash,
                  Icons.account_balance_wallet,
                  Colors.blue,
                  isBig: true,
                ).animate().fadeIn(duration: 300.ms).slideY(begin: 0.06),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: _buildSummaryCard(
                        'Modal Awal',
                        startCash,
                        Icons.start,
                        Colors.grey,
                      ).animate().fadeIn(delay: 80.ms, duration: 300.ms).slideY(begin: 0.06),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildSummaryCard(
                        'Penjualan Tunai',
                        cashSales,
                        Icons.shopping_cart,
                        Colors.green,
                      ).animate().fadeIn(delay: 140.ms, duration: 300.ms).slideY(begin: 0.06),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: _buildSummaryCard(
                        'Kas Masuk',
                        cashIn,
                        Icons.arrow_downward,
                        Colors.teal,
                      ).animate().fadeIn(delay: 200.ms, duration: 300.ms).slideY(begin: 0.06),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildSummaryCard(
                        'Kas Keluar',
                        cashOut,
                        Icons.arrow_upward,
                        Colors.orange,
                      ).animate().fadeIn(delay: 260.ms, duration: 300.ms).slideY(begin: 0.06),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                Text('Aksi Cepat',
                    style: GoogleFonts.poppins(
                        fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: _buildActionButton(
                        context,
                        'Kas Masuk',
                        Icons.add_circle_outline,
                        Colors.green,
                        () => _showMutationDialog(context, 'IN'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildActionButton(
                        context,
                        'Kas Keluar',
                        Icons.remove_circle_outline,
                        Colors.orange,
                        () => _showMutationDialog(context, 'OUT'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: Tooltip(
                    message: 'Tutup shift dan hitung selisih kas',
                    child: ElevatedButton.icon(
                      onPressed: () =>
                          _showCloseShiftDialog(context, expectedCash),
                      icon: const Icon(Icons.lock_clock),
                      label: Text('Tutup Shift',
                          style:
                              GoogleFonts.poppins(fontWeight: FontWeight.bold)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.red,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                // Could add history list here later
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildSummaryCard(
      String title, double amount, IconData icon, Color color,
      {bool isBig = false}) {
    final colorScheme = Theme.of(context).colorScheme;
    final isDark = colorScheme.brightness == Brightness.dark;

    return Container(
      padding: EdgeInsets.all(isBig ? 20 : 16),
      decoration: BoxDecoration(
        color: isDark ? colorScheme.surfaceVariant : Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: isDark
                ? Colors.black.withOpacity(0.5)
                : Colors.grey.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
        border: Border.all(
          color: isDark ? Colors.white.withOpacity(0.08) : Colors.grey.shade100,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: color, size: isBig ? 24 : 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  title,
                  style: GoogleFonts.poppins(
                    fontSize: isBig ? 14 : 12,
                    color: colorScheme.onSurfaceVariant,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            _currencyFormat.format(amount),
            style: GoogleFonts.poppins(
              fontSize: isBig ? 24 : 18,
              fontWeight: FontWeight.bold,
              color: colorScheme.onSurface,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButton(BuildContext context, String label, IconData icon,
      Color color, VoidCallback onTap) {
    final colorScheme = Theme.of(context).colorScheme;
    final isDark = colorScheme.brightness == Brightness.dark;

    return Tooltip(
      message: label,
      child: Material(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: color.withOpacity(isDark ? 0.6 : 0.3),
              ),
              color: color.withOpacity(isDark ? 0.18 : 0.05),
            ),
            child: Column(
              children: [
                Icon(icon, color: color),
                const SizedBox(height: 8),
                Text(
                  label,
                  style: GoogleFonts.poppins(
                    color: color,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
