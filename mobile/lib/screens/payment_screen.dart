import 'package:rana_merchant/config/merchant_config.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';
import 'package:rana_merchant/providers/cart_provider.dart';
import 'package:provider/provider.dart';
import 'package:rana_merchant/providers/auth_provider.dart';
import 'package:rana_merchant/services/printer_service.dart';
import 'package:rana_merchant/data/local/database_helper.dart';
import 'package:rana_merchant/services/sound_service.dart';
import 'package:rana_merchant/services/sync_service.dart'; // [NEW]
import 'package:rana_merchant/config/theme_config.dart';

class PaymentScreen extends StatefulWidget {
  final CartProvider cart;

  const PaymentScreen({super.key, required this.cart});

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  String method = 'CASH';
  double payAmount = 0;
  bool _isProcessing = false;

  late TextEditingController _amountController;

  @override
  void initState() {
    super.initState();
    _amountController = TextEditingController();
    // Auto-fill amount for QRIS
    if (method == 'QRIS') {
      payAmount = widget.cart.totalAmount;
    }
  }

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  void setAmount(double val) {
    setState(() {
      payAmount = val;
      _amountController.text = val == 0 ? '' : val.toStringAsFixed(0);
      _amountController.selection = TextSelection.fromPosition(
          TextPosition(offset: _amountController.text.length));
    });
  }

  @override
  Widget build(BuildContext context) {
    double total = widget.cart.totalAmount;
    double change = payAmount - total;

    // Quick cash suggestions
    final suggestions = [total, 20000.0, 50000.0, 100000.0];

    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SingleChildScrollView(
        child: Container(
          decoration: BoxDecoration(
            color:
                Theme.of(context).colorScheme.surface.withOpacity(0.98),
            gradient: Theme.of(context).brightness == Brightness.dark
                ? LinearGradient(
                    colors: [
                      Theme.of(context)
                          .colorScheme
                          .surface
                          .withOpacity(0.88),
                      Theme.of(context)
                          .colorScheme
                          .surface
                          .withOpacity(0.96),
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  )
                : null,
            borderRadius:
                const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Pembayaran',
                        style: GoogleFonts.poppins(
                            fontWeight: FontWeight.bold, fontSize: 20 * ThemeConfig.tabletScale(context, mobile: 1.0))),
                    IconButton(
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(Icons.close))
                  ],
                ),
                const SizedBox(height: 24),
                Row(
                  children: [
                    _buildMethodCard('CASH', Icons.payments, true),
                    const SizedBox(width: 12),
                    _buildMethodCard('QRIS', Icons.qr_code_2, false),
                  ],
                ),
                if (method == 'CASH') ...[
                  const SizedBox(height: 24),
                  TextField(
                    keyboardType: TextInputType.number,
                    style: GoogleFonts.poppins(
                        fontSize: 24 * ThemeConfig.tabletScale(context, mobile: 1.0), fontWeight: FontWeight.bold),
                    decoration: InputDecoration(
                        prefixText: 'Rp ',
                        labelText: 'Nominal Diterima',
                        border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12)),
                        filled: true,
                        fillColor: Theme.of(context)
                            .colorScheme
                            .surface
                            .withOpacity(0.95)),
                    controller: _amountController,
                    onChanged: (v) {
                      setState(() => payAmount = double.tryParse(v) ?? 0);
                    },
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    children: suggestions.map((amt) {
                      if (amt < total && amt != total)
                        return const SizedBox.shrink();
                      return ActionChip(
                        label: Text(
                            '${MerchantConfig.defaultCurrencySymbol} ${NumberFormat.decimalPattern('id').format(amt)}'),
                        onPressed: () => setAmount(amt),
                        backgroundColor: payAmount == amt
                            ? Theme.of(context)
                                .colorScheme
                                .primary
                                .withOpacity(0.18)
                            : Theme.of(context)
                                .colorScheme
                                .surface
                                .withOpacity(0.98),
                        side: BorderSide(
                            color: payAmount == amt
                                ? Theme.of(context).colorScheme.primary
                                : Theme.of(context)
                                    .colorScheme
                                    .outline
                                    .withOpacity(0.2)),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 24),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                        color: Theme.of(context)
                            .colorScheme
                            .surface
                            .withOpacity(0.95),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                            color: change >= 0
                                ? ThemeConfig.colorSuccess.withOpacity(0.4)
                                : ThemeConfig.colorError.withOpacity(0.4))),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Kembalian',
                            style: GoogleFonts.poppins(fontSize: 16 * ThemeConfig.tabletScale(context, mobile: 1.0))),
                        Text(
                            '${MerchantConfig.defaultCurrencySymbol} ${change < 0 ? 0 : NumberFormat.decimalPattern('id').format(change)}',
                            style: GoogleFonts.poppins(
                                fontSize: 20 * ThemeConfig.tabletScale(context, mobile: 1.0),
                                fontWeight: FontWeight.bold,
                                color: change >= 0
                                ? ThemeConfig.colorSuccess
                                : ThemeConfig.colorError)),
                      ],
                    ),
                  )
                ],
              const SizedBox(height: 24),
                FilledButton(
                  onPressed: _isProcessing ||
                          (method == 'CASH' && payAmount < total)
                      ? null
                      : () async {
                          setState(() => _isProcessing = true);
                          try {
                            final auth = Provider.of<AuthProvider>(context,
                                listen: false);
                            final user = auth.currentUser;

                            String? storeId = user?['storeId'];
                            String? tenantId = user?['tenantId'];

                            if (tenantId == null) {
                              final tenant =
                                  await DatabaseHelper.instance.getTenantInfo();
                              tenantId = tenant?['id'];
                            }

                            if (tenantId == null) {
                              throw Exception(
                                  'Data sesi tidak valid. Silakan login ulang.');
                            }

                            final cashierId = user?['id'] ?? 'OFFLINE_CASHIER';

                            final items = List<Map<String, dynamic>>.from(
                                widget.cart.items.values.map((e) => {
                                      'name': e.name,
                                      'quantity': e.quantity,
                                      'price': e.price,
                                    }));
                            final totalAmt = widget.cart.totalAmount;
                            final discAmt = widget.cart.discountAmount;

                            await widget.cart.checkout(
                              tenantId,
                              storeId ?? tenantId,
                              cashierId,
                              paymentMethod: method,
                              customerName: widget.cart.customerName,
                              notes: widget.cart.notes,
                            );

                            if (!mounted) return;

                            SoundService.playSuccess();

                            Future(() async {
                              try {
                                await SyncService().syncTransactions();
                              } catch (e) {
                                if (!mounted) return;
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text(
                                        'Transaksi tersimpan dan akan disinkronkan saat online.'),
                                  ),
                                );
                              }
                            });

                            final txnData = {
                              'offlineId':
                                  'TXN-${DateTime.now().millisecondsSinceEpoch}',
                              'totalAmount': totalAmt,
                              'payAmount': payAmount,
                              'changeAmount': change,
                              'cashierName': user?['name'] ?? 'Kasir',
                              'customerName': widget.cart.customerName,
                              'discount': discAmt,
                              'storeId': storeId
                            };

                            Navigator.pop(context, true);

                            showDialog(
                                context: context,
                                barrierDismissible: false,
                                builder: (ctx) => AlertDialog(
                                      shape: RoundedRectangleBorder(
                                          borderRadius:
                                              BorderRadius.circular(20)),
                                      title: Column(
                                        children: [
                                          const Icon(Icons.check_circle,
                                              color: ThemeConfig.colorSuccess, size: 64)
                                              .animate()
                                              .scale(duration: 500.ms, curve: Curves.elasticOut)
                                              .fadeIn(duration: 300.ms),
                                          const SizedBox(height: 16),
                                          Text('Transaksi Berhasil',
                                              style: GoogleFonts.poppins(
                                                  fontWeight: FontWeight.bold))
                                              .animate()
                                              .fadeIn(delay: 200.ms)
                                              .slideY(begin: 0.2, end: 0, curve: Curves.easeOut),
                                        ],
                                      ),
                                      content: Text(
                                          'Pembayaran telah berhasil disimpan.',
                                          textAlign: TextAlign.center,
                                          style: GoogleFonts.poppins()),
                                      actions: [
                                        OutlinedButton.icon(
                                          onPressed: () async {
                                            await PrinterService().printReceipt(
                                                txnData, items,
                                                storeName: 'RANA STORE');
                                          },
                                          icon: const Icon(Icons.print),
                                          label: const Text('Cetak Struk'),
                                          style: OutlinedButton.styleFrom(
                                            foregroundColor: Theme.of(context)
                                                .colorScheme
                                                .primary,
                                            side: BorderSide(
                                                color: Theme.of(context)
                                                    .colorScheme
                                                    .primary),
                                            padding: const EdgeInsets.all(16),
                                            minimumSize:
                                                const Size.fromHeight(50),
                                            shape: RoundedRectangleBorder(
                                                borderRadius:
                                                    BorderRadius.circular(12)),
                                          ),
                                        ),
                                        const SizedBox(height: 12),
                                        FilledButton(
                                          onPressed: () {
                                            Navigator.pop(ctx);
                                          },
                                          style: FilledButton.styleFrom(
                                              backgroundColor: Theme.of(context)
                                                  .colorScheme
                                                  .primary,
                                              minimumSize:
                                                  const Size.fromHeight(50),
                                              shape: RoundedRectangleBorder(
                                                  borderRadius:
                                                      BorderRadius.circular(
                                                          12))),
                                          child: const Text('Tutup'),
                                        )
                                      ],
                                      actionsAlignment:
                                          MainAxisAlignment.center,
                                    ));
                          } catch (e) {
                            setState(() => _isProcessing = false);
                            ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('Error: $e')));
                          }
                        },
                  style: FilledButton.styleFrom(
                      backgroundColor: Theme.of(context).colorScheme.primary,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12))),
                  child: _isProcessing
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(color: Colors.white))
                      : Text('SELESAIKAN',
                          style:
                              GoogleFonts.poppins(fontWeight: FontWeight.bold)),
                )
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMethodCard(String id, IconData icon, bool selected) {
    final isSelected = method == id;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() {
          method = id;
          payAmount = (id == 'QRIS' ? widget.cart.totalAmount : 0);
        }),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
              color: isSelected
                  ? ThemeConfig.brandColor
                  : Theme.of(context)
                      .colorScheme
                      .surface
                      .withOpacity(0.98),
              gradient: (!isSelected &&
                      Theme.of(context).brightness == Brightness.dark)
                  ? LinearGradient(
                      colors: [
                        Theme.of(context)
                            .colorScheme
                            .surface
                            .withOpacity(0.92),
                        Theme.of(context)
                            .colorScheme
                            .surface
                            .withOpacity(0.98),
                      ],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    )
                  : null,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                  color: isSelected
                      ? ThemeConfig.brandColor
                      : Theme.of(context)
                          .colorScheme
                          .outline
                          .withOpacity(0.2)),
              boxShadow: isSelected
                  ? [
                      BoxShadow(
                          color: ThemeConfig.brandColor.withOpacity(0.3),
                          blurRadius: 8,
                          offset: const Offset(0, 4))
                    ]
                  : []),
          child: Column(
            children: [
              Icon(icon,
                  color: isSelected
                      ? Colors.white
                      : Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withOpacity(0.6),
                  size: 28 * ThemeConfig.tabletScale(context, mobile: 1.0)),
              const SizedBox(height: 8),
              Text(id,
                  style: GoogleFonts.poppins(
                      fontSize: 12 * ThemeConfig.tabletScale(context, mobile: 1.0),
                      color: isSelected
                          ? Colors.white
                          : Theme.of(context)
                              .colorScheme
                              .onSurface
                              .withOpacity(0.6),
                      fontWeight: FontWeight.bold))
            ],
          ),
        ),
      ),
    );
  }
}

class TransactionSuccessDialog extends StatefulWidget {
  const TransactionSuccessDialog({super.key});

  @override
  State<TransactionSuccessDialog> createState() =>
      _TransactionSuccessDialogState();
}

class _TransactionSuccessDialogState extends State<TransactionSuccessDialog> {
  @override
  void initState() {
    super.initState();
    Future.delayed(const Duration(seconds: 2), () {
      // 2 seconds is snappy enough
      if (mounted) Navigator.of(context).pop();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.check_circle, color: Colors.green, size: 80)
                .animate()
                .scale(duration: 600.ms, curve: Curves.elasticOut)
                .fadeIn(duration: 300.ms),
            const SizedBox(height: 24),
            Text('Transaksi Berhasil!',
                style: GoogleFonts.poppins(
                    fontSize: 24 * ThemeConfig.tabletScale(context, mobile: 1.0),
                    fontWeight: FontWeight.bold,
                    color: ThemeConfig.colorSuccess))
                .animate()
                .fadeIn(delay: 250.ms)
                .slideY(begin: 0.2, end: 0, curve: Curves.easeOut),
          ],
        ),
      ),
    );
  }
}
