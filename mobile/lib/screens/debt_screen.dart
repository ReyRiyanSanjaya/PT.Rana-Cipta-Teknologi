import 'package:rana_merchant/config/merchant_config.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:shimmer/shimmer.dart';
import 'package:rana_merchant/data/local/database_helper.dart';
import 'package:url_launcher/url_launcher.dart';

class DebtScreen extends StatefulWidget {
  const DebtScreen({super.key});

  @override
  State<DebtScreen> createState() => _DebtScreenState();
}

class _DebtScreenState extends State<DebtScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<Map<String, dynamic>> _debts = [];
  bool _isLoading = true;
  // Summary totals for both tabs (loaded once and cached)
  double _totalPayable = 0;
  double _totalReceivable = 0;
  double _remainingPayable = 0;
  double _remainingReceivable = 0;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) _loadDebts();
    });
    _loadDebts();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadDebts() async {
    if (!mounted) return;
    setState(() => _isLoading = true);

    // Load active tab list
    final type = _tabController.index == 0 ? 'PAYABLE' : 'RECEIVABLE';
    final data = await DatabaseHelper.instance.getDebts(type: type);

    // Load summaries for both tabs
    final payableAll = await DatabaseHelper.instance.getDebts(type: 'PAYABLE');
    final receivableAll = await DatabaseHelper.instance.getDebts(type: 'RECEIVABLE');

    if (mounted) {
      setState(() {
        _debts = data;
        _isLoading = false;
        _totalPayable = payableAll.fold(0.0, (s, d) => s + (d['amount'] as num).toDouble());
        _remainingPayable = payableAll.fold(0.0, (s, d) => s + (d['remainingAmount'] as num).toDouble());
        _totalReceivable = receivableAll.fold(0.0, (s, d) => s + (d['amount'] as num).toDouble());
        _remainingReceivable = receivableAll.fold(0.0, (s, d) => s + (d['remainingAmount'] as num).toDouble());
      });
    }
  }

  void _showSuccessBanner(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(children: [
          const Icon(Icons.check_circle_rounded, color: Colors.white),
          const SizedBox(width: 10),
          Text(message, style: GoogleFonts.outfit(fontWeight: FontWeight.w600)),
        ]),
        backgroundColor: const Color(0xFF81B29A),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  Future<void> _showAddDialog() async {
    final type = _tabController.index == 0 ? 'PAYABLE' : 'RECEIVABLE';
    final title = type == 'PAYABLE' ? 'Catat Hutang Baru' : 'Catat Piutang Baru';

    final nameController = TextEditingController();
    final phoneController = TextEditingController();
    final amountController = TextEditingController();
    final noteController = TextEditingController();
    DateTime? selectedDate;
    bool isSaving = false;

    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          return AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            title: Text(title, style: GoogleFonts.poppins(fontWeight: FontWeight.bold)),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _buildTextField(nameController,
                    label: type == 'PAYABLE' ? 'Nama Pemberi Pinjaman' : 'Nama Peminjam',
                    hint: 'Contoh: Budi / Toko Maju'),
                  const SizedBox(height: 12),
                  _buildTextField(phoneController,
                    label: 'Nomor HP (Opsional)',
                    keyboardType: TextInputType.phone),
                  const SizedBox(height: 12),
                  _buildTextField(amountController,
                    label: 'Jumlah (Rp)',
                    prefix: 'Rp ',
                    keyboardType: TextInputType.number),
                  const SizedBox(height: 12),
                  InkWell(
                    onTap: () async {
                      final date = await showDatePicker(
                        context: ctx,
                        initialDate: DateTime.now().add(const Duration(days: 7)),
                        firstDate: DateTime.now(),
                        lastDate: DateTime.now().add(const Duration(days: 365)),
                      );
                      if (date != null) setDialogState(() => selectedDate = date);
                    },
                    borderRadius: BorderRadius.circular(12),
                    child: InputDecorator(
                      decoration: InputDecoration(
                        labelText: 'Jatuh Tempo',
                        suffixIcon: const Icon(Icons.calendar_today_rounded, size: 18),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: Text(
                        selectedDate != null
                            ? DateFormat('dd MMM yyyy').format(selectedDate!)
                            : 'Pilih Tanggal',
                        style: TextStyle(color: selectedDate != null ? null : Colors.grey),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  _buildTextField(noteController, label: 'Catatan', maxLines: 2),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Batal'),
              ),
              FilledButton(
                onPressed: isSaving ? null : () async {
                  if (nameController.text.isEmpty || amountController.text.isEmpty) return;
                  final amount = double.tryParse(amountController.text.replaceAll('.', '').replaceAll(',', '')) ?? 0;
                  if (amount <= 0) return;

                  setDialogState(() => isSaving = true);
                  HapticFeedback.lightImpact();

                  final data = {
                    'type': type,
                    'partyName': nameController.text,
                    'phoneNumber': phoneController.text,
                    'amount': amount,
                    'remainingAmount': amount,
                    'dueDate': selectedDate?.toIso8601String(),
                    'description': noteController.text,
                    'status': 'UNPAID',
                    'createdAt': DateTime.now().toIso8601String(),
                    'updatedAt': DateTime.now().toIso8601String(),
                  };

                  await DatabaseHelper.instance.addDebt(data);
                  if (mounted) {
                    Navigator.pop(ctx);
                    _showSuccessBanner('${type == 'PAYABLE' ? 'Hutang' : 'Piutang'} berhasil dicatat!');
                    _loadDebts();
                  }
                },
                child: isSaving
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Simpan'),
              ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _showPaymentDialog(Map<String, dynamic> debt) async {
    final amountController = TextEditingController();
    final noteController = TextEditingController();
    final remaining = (debt['remainingAmount'] as num).toDouble();
    final currency = NumberFormat.currency(locale: 'id', symbol: '${MerchantConfig.defaultCurrencySymbol} ', decimalDigits: 0);
    bool isSaving = false;

    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Text('Catat Pembayaran', style: GoogleFonts.poppins(fontWeight: FontWeight.bold)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFE07A5F).withOpacity(0.08),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline_rounded, color: Color(0xFFE07A5F), size: 18),
                    const SizedBox(width: 8),
                    Text('Sisa: ${currency.format(remaining)}',
                        style: GoogleFonts.outfit(fontWeight: FontWeight.w600, color: const Color(0xFFE07A5F))),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              _buildTextField(amountController,
                  label: 'Jumlah Bayar', prefix: 'Rp ', keyboardType: TextInputType.number),
              const SizedBox(height: 12),
              _buildTextField(noteController, label: 'Catatan Pembayaran'),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
            FilledButton(
              onPressed: isSaving ? null : () async {
                final amount = double.tryParse(amountController.text.replaceAll('.', '').replaceAll(',', '')) ?? 0;
                if (amount <= 0 || amount > remaining) {
                  ScaffoldMessenger.of(ctx).showSnackBar(
                    const SnackBar(content: Text('Jumlah tidak valid')),
                  );
                  return;
                }
                setDialogState(() => isSaving = true);
                HapticFeedback.lightImpact();
                await DatabaseHelper.instance.addDebtPayment(debt['id'], amount, noteController.text);
                if (mounted) {
                  Navigator.pop(ctx);
                  _showSuccessBanner('Pembayaran berhasil dicatat!');
                  _loadDebts();
                }
              },
              child: isSaving
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Bayar'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTextField(TextEditingController controller,
      {String? label, String? hint, String? prefix, TextInputType? keyboardType, int maxLines = 1}) {
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      maxLines: maxLines,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        prefixText: prefix,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      ),
    );
  }

  Future<void> _showDetail(Map<String, dynamic> debt) async {
    final payments = await DatabaseHelper.instance.getDebtPayments(debt['id']);
    if (!mounted) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        minChildSize: 0.4,
        maxChildSize: 0.9,
        expand: false,
        builder: (ctx, scrollController) => Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Handle bar
              Center(child: Container(width: 40, height: 4,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2)))),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Detail ${debt['type'] == 'PAYABLE' ? 'Hutang' : 'Piutang'}',
                      style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.bold)),
                  IconButton(
                    icon: const Icon(Icons.delete_outline, color: Colors.red),
                    onPressed: () async {
                      final confirm = await showDialog<bool>(
                        context: ctx,
                        builder: (c) => AlertDialog(
                          title: const Text('Hapus Data?'),
                          content: const Text('Data yang dihapus tidak dapat dikembalikan.'),
                          actions: [
                            TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Batal')),
                            TextButton(
                                onPressed: () => Navigator.pop(c, true),
                                child: const Text('Hapus', style: TextStyle(color: Colors.red))),
                          ],
                        ),
                      );
                      if (confirm == true) {
                        await DatabaseHelper.instance.deleteDebt(debt['id']);
                        if (mounted) {
                          Navigator.pop(ctx);
                          _showSuccessBanner('Data berhasil dihapus.');
                          _loadDebts();
                        }
                      }
                    },
                  ),
                ],
              ),
              const Divider(),
              _detailRow('Nama', debt['partyName']),
              _detailRow('Total', NumberFormat.currency(locale: 'id', symbol: '${MerchantConfig.defaultCurrencySymbol} ', decimalDigits: 0).format(debt['amount'])),
              _detailRow('Sisa',
                  NumberFormat.currency(locale: 'id', symbol: '${MerchantConfig.defaultCurrencySymbol} ', decimalDigits: 0).format(debt['remainingAmount']),
                  isBold: true, color: Colors.red),
              _detailRow('Status', debt['status'] == 'PAID' ? '✓ Lunas' : 'Belum Lunas'),
              _detailRow('Jatuh Tempo',
                  debt['dueDate'] != null
                      ? DateFormat('dd MMM yyyy').format(DateTime.parse(debt['dueDate']))
                      : '-'),
              const SizedBox(height: 16),
              if (debt['phoneNumber'] != null &&
                  debt['phoneNumber'].toString().isNotEmpty &&
                  debt['status'] != 'PAID')
                Container(
                  width: double.infinity,
                  margin: const EdgeInsets.only(bottom: 12),
                  child: ElevatedButton.icon(
                    icon: const Icon(Icons.send_rounded, color: Colors.white, size: 16),
                    label: Text('Kirim Tagihan via WhatsApp',
                        style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF25D366),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: () async {
                      String phone = debt['phoneNumber'].toString();
                      if (phone.startsWith('0')) phone = '62${phone.substring(1)}';
                      final String name = debt['partyName'];
                      final String remain = NumberFormat.currency(locale: 'id_ID', symbol: '${MerchantConfig.defaultCurrencySymbol} ', decimalDigits: 0)
                          .format(debt['remainingAmount']);
                      final String dueDate = debt['dueDate'] != null
                          ? DateFormat('dd MMM yyyy').format(DateTime.parse(debt['dueDate']))
                          : 'Segera';
                      final String msg =
                          'Halo $name, ini pesan dari Rana Merchant.\n\nSekadar mengingatkan terdapat tagihan yang belum lunas sebesar *$remain*.\nMohon diselesaikan sebelum *$dueDate*.\n\nTerima kasih!';
                      final Uri url =
                          Uri.parse('whatsapp://send?phone=$phone&text=${Uri.encodeComponent(msg)}');
                      try {
                        if (!await launchUrl(url)) {
                          await launchUrl(
                              Uri.parse('https://wa.me/$phone?text=${Uri.encodeComponent(msg)}'),
                              mode: LaunchMode.externalApplication);
                        }
                      } catch (_) {
                        if (ctx.mounted) {
                          ScaffoldMessenger.of(ctx).showSnackBar(
                              const SnackBar(content: Text('Gagal membuka WhatsApp.')));
                        }
                      }
                    },
                  ),
                ),
              Text('Riwayat Pembayaran', style: GoogleFonts.poppins(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Expanded(
                child: payments.isEmpty
                    ? Center(
                        child: Text('Belum ada pembayaran',
                            style: GoogleFonts.poppins(color: Colors.grey)))
                    : ListView.builder(
                        controller: scrollController,
                        itemCount: payments.length,
                        itemBuilder: (ctx, i) {
                          final p = payments[i];
                          return ListTile(
                            contentPadding: EdgeInsets.zero,
                            leading: const CircleAvatar(
                              radius: 18,
                              backgroundColor: Color(0x1581B29A),
                              child: Icon(Icons.payments_outlined, color: Color(0xFF81B29A), size: 16),
                            ),
                            title: Text(
                                NumberFormat.currency(locale: 'id', symbol: '${MerchantConfig.defaultCurrencySymbol} ', decimalDigits: 0)
                                    .format(p['amount']),
                                style: GoogleFonts.poppins(fontWeight: FontWeight.w600)),
                            subtitle:
                                Text(DateFormat('dd MMM yyyy HH:mm').format(DateTime.parse(p['date']))),
                            trailing: p['note'] != null && p['note'].toString().isNotEmpty
                                ? Text(p['note'], style: const TextStyle(fontSize: 12, color: Colors.grey))
                                : null,
                          );
                        }),
              ),
              if (debt['status'] != 'PAID')
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    icon: const Icon(Icons.add_rounded),
                    label: const Text('Tambah Pembayaran'),
                    onPressed: () async {
                      Navigator.pop(ctx);
                      await _showPaymentDialog(debt);
                    },
                    style: FilledButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _detailRow(String label, String value, {bool isBold = false, Color? color}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: GoogleFonts.poppins(color: Colors.grey[600])),
          Text(value,
              style: GoogleFonts.poppins(
                  fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
                  color: color)),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final currency = NumberFormat.currency(locale: 'id', symbol: '${MerchantConfig.defaultCurrencySymbol} ', decimalDigits: 0);
    final isPayable = _tabController.index == 0;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text('Hutang & Piutang', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        bottom: TabBar(
          controller: _tabController,
          labelStyle: GoogleFonts.outfit(fontWeight: FontWeight.w600),
          tabs: const [
            Tab(text: 'Hutang'),
            Tab(text: 'Piutang'),
          ],
        ),
      ),
      body: Column(
        children: [
          // ── Summary Header Cards ──────────────────────────────
          AnimatedBuilder(
            animation: _tabController,
            builder: (context, _) {
              final isPayableTab = _tabController.index == 0;
              final total = isPayableTab ? _totalPayable : _totalReceivable;
              final remaining = isPayableTab ? _remainingPayable : _remainingReceivable;
              final paid = total - remaining;
              final progress = total > 0 ? (paid / total).clamp(0.0, 1.0) : 0.0;
              final accentColor = isPayableTab ? const Color(0xFFE07A5F) : const Color(0xFF81B29A);

              return Container(
                margin: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [accentColor, accentColor.withOpacity(0.75)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: accentColor.withOpacity(0.3),
                      blurRadius: 14,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isPayableTab ? 'Total Hutang Saya' : 'Total Piutang Saya',
                      style: GoogleFonts.outfit(color: Colors.white.withOpacity(0.85), fontSize: 12, fontWeight: FontWeight.w500),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      currency.format(total),
                      style: GoogleFonts.outfit(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Sisa Belum Lunas',
                                  style: GoogleFonts.outfit(color: Colors.white70, fontSize: 11)),
                              Text(currency.format(remaining),
                                  style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                            ],
                          ),
                        ),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text('Sudah Terbayar',
                                  style: GoogleFonts.outfit(color: Colors.white70, fontSize: 11)),
                              Text(currency.format(paid),
                                  style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: LinearProgressIndicator(
                        value: progress,
                        minHeight: 6,
                        backgroundColor: Colors.white.withOpacity(0.25),
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text('${(progress * 100).toStringAsFixed(0)}% terbayar',
                        style: GoogleFonts.outfit(color: Colors.white70, fontSize: 11)),
                  ],
                ),
              ).animate().fadeIn(duration: 300.ms).slideY(begin: -0.06);
            },
          ),
          // ── List ──────────────────────────────────────────────
          Expanded(
            child: _isLoading
                ? _buildShimmerList(colorScheme)
                : _debts.isEmpty
                    ? _buildEmptyState(colorScheme, isPayable)
                    : ListView.builder(
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
                        itemCount: _debts.length,
                        itemBuilder: (context, index) {
                          final item = _debts[index];
                          final total = (item['amount'] as num).toDouble();
                          final remaining = (item['remainingAmount'] as num).toDouble();
                          final paid = total - remaining;
                          final progress = total > 0 ? (paid / total).clamp(0.0, 1.0) : 0.0;
                          final isPaid = item['status'] == 'PAID';
                          final isOverdue = !isPaid &&
                              item['dueDate'] != null &&
                              DateTime.tryParse(item['dueDate'])?.isBefore(DateTime.now()) == true;
                          final Color statusColor = isPaid
                              ? const Color(0xFF81B29A)
                              : isOverdue
                                  ? const Color(0xFFE07A5F)
                                  : Colors.orange.shade600;

                          return Dismissible(
                            key: Key('debt_${item['id']}'),
                            direction: isPaid
                                ? DismissDirection.none
                                : DismissDirection.endToStart,
                            background: Container(
                              alignment: Alignment.centerRight,
                              padding: const EdgeInsets.only(right: 20),
                              margin: const EdgeInsets.only(bottom: 12),
                              decoration: BoxDecoration(
                                color: const Color(0xFF81B29A),
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Icon(Icons.payments_rounded, color: Colors.white, size: 24),
                                  const SizedBox(height: 4),
                                  Text('Bayar', style: GoogleFonts.outfit(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                                ],
                              ),
                            ),
                            confirmDismiss: (direction) async {
                              // Don't actually dismiss — open payment dialog instead
                              await _showPaymentDialog(item);
                              return false;
                            },
                            child: Card(
                              margin: const EdgeInsets.only(bottom: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                              elevation: 0,
                              color: isDark ? colorScheme.surface : Colors.white,
                              child: InkWell(
                                onTap: () => _showDetail(item),
                                borderRadius: BorderRadius.circular(16),
                                child: Padding(
                                  padding: const EdgeInsets.all(16),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Container(
                                            width: 44,
                                            height: 44,
                                            decoration: BoxDecoration(
                                              color: statusColor.withOpacity(0.12),
                                              shape: BoxShape.circle,
                                            ),
                                            child: Icon(
                                              isPaid
                                                  ? Icons.check_circle_rounded
                                                  : isOverdue
                                                      ? Icons.warning_rounded
                                                      : Icons.access_time_rounded,
                                              color: statusColor,
                                              size: 22,
                                            ),
                                          ),
                                          const SizedBox(width: 12),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(item['partyName'],
                                                    style: GoogleFonts.outfit(
                                                        fontWeight: FontWeight.bold,
                                                        fontSize: 15,
                                                        color: colorScheme.onSurface)),
                                                const SizedBox(height: 2),
                                                Row(children: [
                                                  Container(
                                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                    decoration: BoxDecoration(
                                                      color: statusColor.withOpacity(0.10),
                                                      borderRadius: BorderRadius.circular(6),
                                                    ),
                                                    child: Text(
                                                      isPaid ? 'Lunas ✓' : isOverdue ? 'Jatuh Tempo!' : 'Belum Lunas',
                                                      style: GoogleFonts.outfit(fontSize: 11, color: statusColor, fontWeight: FontWeight.w600),
                                                    ),
                                                  ),
                                                ]),
                                              ],
                                            ),
                                          ),
                                          Column(
                                            crossAxisAlignment: CrossAxisAlignment.end,
                                            children: [
                                              Text(currency.format(total),
                                                  style: GoogleFonts.outfit(
                                                      fontWeight: FontWeight.bold,
                                                      fontSize: 15,
                                                      color: colorScheme.onSurface)),
                                              if (!isPaid)
                                                Text('Sisa: ${currency.format(remaining)}',
                                                    style: GoogleFonts.outfit(
                                                        fontSize: 11,
                                                        color: statusColor,
                                                        fontWeight: FontWeight.w600)),
                                            ],
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 12),
                                      ClipRRect(
                                        borderRadius: BorderRadius.circular(8),
                                        child: LinearProgressIndicator(
                                          value: progress,
                                          minHeight: 6,
                                          backgroundColor: colorScheme.outline.withOpacity(0.12),
                                          color: statusColor,
                                        ),
                                      ),
                                      const SizedBox(height: 6),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text('${(progress * 100).toStringAsFixed(0)}% terbayar',
                                              style: GoogleFonts.outfit(
                                                  fontSize: 11,
                                                  color: colorScheme.onSurface.withOpacity(0.5))),
                                          if (item['dueDate'] != null)
                                            Text(
                                              'Jatuh tempo: ${DateFormat('dd MMM').format(DateTime.parse(item['dueDate']))}',
                                              style: GoogleFonts.outfit(
                                                  fontSize: 11,
                                                  color: isOverdue ? statusColor : colorScheme.onSurface.withOpacity(0.5)),
                                            ),
                                        ],
                                      ),
                                      // Swipe hint for unpaid items
                                      if (!isPaid) ...[
                                        const SizedBox(height: 6),
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.end,
                                          children: [
                                            Icon(Icons.swipe_left_rounded,
                                                size: 13, color: colorScheme.onSurface.withOpacity(0.3)),
                                            const SizedBox(width: 4),
                                            Text('Geser untuk bayar',
                                                style: GoogleFonts.outfit(
                                                    fontSize: 10,
                                                    color: colorScheme.onSurface.withOpacity(0.3))),
                                          ],
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ).animate().fadeIn(delay: (60 * index).ms, duration: 350.ms).slideY(begin: 0.12, curve: Curves.easeOutQuad);
                        },
                      ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showAddDialog,
        icon: const Icon(Icons.add_rounded),
        label: Text('Catat Baru', style: GoogleFonts.outfit(fontWeight: FontWeight.w600)),
        backgroundColor: colorScheme.primary,
        foregroundColor: colorScheme.onPrimary,
      ).animate().scale(delay: 300.ms, curve: Curves.easeOutBack),
    );
  }

  Widget _buildEmptyState(ColorScheme colorScheme, bool isPayable) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: colorScheme.primary.withOpacity(0.06),
              shape: BoxShape.circle,
            ),
            child: Icon(
              isPayable ? Icons.account_balance_wallet_outlined : Icons.request_quote_outlined,
              size: 52,
              color: colorScheme.primary.withOpacity(0.5),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            isPayable ? 'Tidak Ada Hutang' : 'Tidak Ada Piutang',
            style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold, color: colorScheme.onSurface.withOpacity(0.7)),
          ),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 40),
            child: Text(
              isPayable
                  ? 'Catat semua hutang Anda agar lebih mudah dilacak dan tidak terlewat.'
                  : 'Catat piutang ke pelanggan atau mitra agar mudah ditagih tepat waktu.',
              textAlign: TextAlign.center,
              style: GoogleFonts.outfit(fontSize: 13, color: colorScheme.onSurface.withOpacity(0.45), height: 1.5),
            ),
          ),
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: _showAddDialog,
            icon: const Icon(Icons.add_rounded),
            label: Text('Catat ${isPayable ? 'Hutang' : 'Piutang'} Pertama',
                style: GoogleFonts.outfit(fontWeight: FontWeight.w600)),
          ),
        ],
      ).animate().fadeIn(duration: 400.ms).scale(begin: const Offset(0.92, 0.92)),
    );
  }

  Widget _buildShimmerList(ColorScheme colorScheme) {
    return Shimmer.fromColors(
      baseColor: colorScheme.surface,
      highlightColor: colorScheme.onSurface.withOpacity(0.06),
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
        itemCount: 5,
        itemBuilder: (_, __) => Container(
          margin: const EdgeInsets.only(bottom: 12),
          height: 120,
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
        ),
      ),
    );
  }
}
