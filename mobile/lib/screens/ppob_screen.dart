import 'package:rana_merchant/config/merchant_config.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:provider/provider.dart';
import 'package:rana_merchant/config/theme_config.dart';
import 'package:rana_merchant/providers/wallet_provider.dart';
import 'package:rana_merchant/data/remote/api_service.dart';
import 'package:rana_merchant/services/shopee_service.dart';
import 'package:rana_merchant/screens/wallet_screen.dart';
import 'package:intl/intl.dart';
import 'package:shimmer/shimmer.dart'; // [NEW] Loading skeleton
import 'package:shared_preferences/shared_preferences.dart'; // [NEW] Save numbers
import 'package:confetti/confetti.dart'; // [NEW] Success effect

class PpobScreen extends StatefulWidget {
  const PpobScreen({super.key});

  @override
  State<PpobScreen> createState() => _PpobScreenState();
}

class _PpobScreenState extends State<PpobScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  List<Map<String, dynamic>> _services = [
    {'icon': Icons.phone_android, 'label': 'Pulsa', 'code': 'pulsa'},
    {'icon': Icons.wifi, 'label': 'Paket Data', 'code': 'data'},
    {'icon': Icons.lightbulb_outline, 'label': 'Listrik PLN', 'code': 'pln'},
    {'icon': Icons.water_drop_outlined, 'label': 'Air PDAM', 'code': 'pdam'},
    {'icon': Icons.health_and_safety_outlined, 'label': 'BPJS', 'code': 'bpjs'},
    {'icon': Icons.tv, 'label': 'TV Kabel', 'code': 'tv'},
    {'icon': Icons.account_balance_wallet_outlined, 'label': 'E-Wallet', 'code': 'emoney'},
    {'icon': Icons.sports_esports, 'label': 'Voucher Game', 'code': 'game'},
  ];
  bool _isServicesLoading = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    Future.microtask(() {
      context.read<WalletProvider>().loadData();
      _fetchPpobServices();
    });
  }

  Future<void> _fetchPpobServices() async {
    setState(() => _isServicesLoading = true);
    try {
      final remoteServices = await ApiService().getPpobServices();
      if (remoteServices.isNotEmpty && mounted) {
        setState(() {
          // Map remote services to includes icons if possible, or use default icons
          _services = remoteServices.map((s) {
            final label = s['name'] ?? s['label'] ?? '';
            final code = s['code'] ?? '';
            
            // Try to match icon by label or code
            IconData icon = Icons.apps;
            if (label.contains('Pulsa')) icon = Icons.phone_android;
            else if (label.contains('Data') || label.contains('Wifi')) icon = Icons.wifi;
            else if (label.contains('Listrik') || label.contains('PLN')) icon = Icons.lightbulb_outline;
            else if (label.contains('Air') || label.contains('PDAM')) icon = Icons.water_drop_outlined;
            else if (label.contains('BPJS')) icon = Icons.health_and_safety_outlined;
            else if (label.contains('TV')) icon = Icons.tv;
            else if (label.contains('Wallet') || label.contains('E-Money')) icon = Icons.account_balance_wallet_outlined;
            else if (label.contains('Game') || label.contains('Voucher')) icon = Icons.sports_esports;

            return {
              'icon': icon,
              'label': label,
              'code': code,
            };
          }).toList();
        });
      }
    } catch (e) {
      debugPrint('Error fetching PPOB services: $e');
    } finally {
      if (mounted) setState(() => _isServicesLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final bool isDarkTheme = colorScheme.brightness == Brightness.dark;
    
    final List<Color> headerGradientColors = isDarkTheme
        ? [colorScheme.surface, colorScheme.surface]
        : [colorScheme.primary, colorScheme.primary.withOpacity(0.85)];

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new, color: isDarkTheme ? colorScheme.onSurface : Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          children: [
            Text('PPOB & Tagihan',
                style: GoogleFonts.poppins(
                    fontWeight: FontWeight.bold,
                    color: isDarkTheme ? colorScheme.onSurface : Colors.white,
                    fontSize: 18)),
            Text('Powered by Digiflazz',
                style: GoogleFonts.poppins(
                    fontWeight: FontWeight.w400,
                    color: (isDarkTheme ? colorScheme.onSurface : Colors.white).withOpacity(0.8),
                    fontSize: 10)),
          ],
        ),
        flexibleSpace: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: headerGradientColors,
            ),
          ),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(50),
          child: Container(
            color: Theme.of(context).scaffoldBackgroundColor,
            child: TabBar(
                controller: _tabController,
                indicatorColor: colorScheme.primary,
                labelStyle: GoogleFonts.poppins(fontWeight: FontWeight.bold, color: colorScheme.primary),
                unselectedLabelColor: colorScheme.onSurface.withOpacity(0.6),
                labelColor: colorScheme.primary,
                tabs: const [
                  Tab(text: "Layanan"),
                  Tab(text: "Riwayat Transaksi"),
                ]),
          ),
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildServicesTab(),
          _buildHistoryTab(),
        ],
      ),
    );
  }

  Widget _buildServicesTab() {
    final colorScheme = Theme.of(context).colorScheme;
    final isTablet = MediaQuery.of(context).size.shortestSide >= 600;
    final width = MediaQuery.of(context).size.width;
    int crossAxisCount = ThemeConfig.gridColumns(context, mobile: 4);
    double aspectRatio = 0.8;

    if (isTablet) {
      if (width >= 1200) {
        aspectRatio = 0.9;
      } else if (width >= 900) {
        aspectRatio = 0.9;
      } else {
        aspectRatio = 0.85;
      }
    } else if (width <= 360) {
      aspectRatio = 0.8;
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Wallet Balance Card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
                gradient: LinearGradient(
                    colors: [colorScheme.primary, colorScheme.primary.withOpacity(0.8)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight),
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(color: colorScheme.primary.withOpacity(0.3), blurRadius: 15, offset: const Offset(0, 8))
                ]),
            child: Consumer<WalletProvider>(
                builder: (context, wallet, _) {
              final balanceFormat = NumberFormat.currency(locale: 'id', symbol: 'Rp ', decimalDigits: 0);
              return Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Saldo Aktif',
                          style: GoogleFonts.poppins(color: Colors.white.withOpacity(0.9), fontSize: 12)),
                      const SizedBox(height: 4),
                      Text(balanceFormat.format(wallet.balance),
                          style: GoogleFonts.poppins(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  ElevatedButton(
                    onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const WalletScreen())),
                    style: ElevatedButton.styleFrom(
                        backgroundColor: colorScheme.surface,
                        foregroundColor: colorScheme.primary,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                        shape: const StadiumBorder()),
                    child: const Text('Top Up'),
                  )
                ],
              );
            }),
          ).animate().slideY(begin: 0.2, end: 0, duration: 400.ms),

          const SizedBox(height: 24),

          Text('Produk Digital',
              style: GoogleFonts.poppins(
                  fontSize: 18 * ThemeConfig.tabletScale(context, mobile: 1.0),
                  fontWeight: FontWeight.bold,
                  color: colorScheme.onSurface)),
          const SizedBox(height: 16),
          _isServicesLoading
              ? _buildServicesShimmer(crossAxisCount, aspectRatio)
              : GridView.builder(
                  physics: const NeverScrollableScrollPhysics(),
                  shrinkWrap: true,
                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: crossAxisCount,
                    childAspectRatio: aspectRatio,
                    mainAxisSpacing: 16,
                    crossAxisSpacing: 16,
                  ),
                  itemCount: _services.length,
                  itemBuilder: (context, index) {
                    final s = _services[index];
                    return InkWell(
                      onTap: () => _showTransactionModal(context, s['label'], colorScheme.primary),
                      borderRadius: BorderRadius.circular(20),
                      child: Column(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                                color: colorScheme.surface,
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: colorScheme.outline.withOpacity(0.1)),
                                boxShadow: [
                                  BoxShadow(color: colorScheme.shadow.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4))
                                ]),
                            child: Icon(s['icon'] as IconData,
                                color: colorScheme.primary, size: 28 * ThemeConfig.tabletScale(context, mobile: 1.0)),
                          ),
                          const SizedBox(height: 12),
                          Text(s['label'] as String,
                              style: GoogleFonts.poppins(
                                  fontSize: 11 * ThemeConfig.tabletScale(context, mobile: 1.0), 
                                  fontWeight: FontWeight.w500,
                                  color: colorScheme.onSurface),
                              textAlign: TextAlign.center,
                              maxLines: 2)
                        ],
                      ),
                    );
                  },
                ).animate().fade(duration: 600.ms).scale(),
        ],
      ),
    );
  }

  Widget _buildServicesShimmer(int crossAxisCount, double aspectRatio) {
    return GridView.builder(
      physics: const NeverScrollableScrollPhysics(),
      shrinkWrap: true,
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: crossAxisCount,
        childAspectRatio: aspectRatio,
        mainAxisSpacing: 16,
        crossAxisSpacing: 16,
      ),
      itemCount: 8,
      itemBuilder: (context, index) {
        return Shimmer.fromColors(
          baseColor: Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.3),
          highlightColor: Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.1),
          child: Column(
            children: [
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                ),
              ),
              const SizedBox(height: 12),
              Container(
                width: 40,
                height: 10,
                color: Colors.white,
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildHistoryTab() {
    final colorScheme = Theme.of(context).colorScheme;

    return Consumer<WalletProvider>(builder: (context, wallet, _) {
      final ppobHistory = wallet.history.where((txn) {
        final cat = txn['category'] ?? '';
        final desc = txn['description'] ?? '';
        return cat == 'EXPENSE_PURCHASE' || desc.contains('Beli') || desc.contains('PPOB');
      }).toList();

      if (ppobHistory.isEmpty) {
        return Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.history_edu, size: 64, color: colorScheme.onSurface.withOpacity(0.2)),
              const SizedBox(height: 16),
              Text('Belum ada transaksi PPOB', style: GoogleFonts.poppins(color: colorScheme.onSurface.withOpacity(0.5))),
            ],
          ),
        );
      }

      return ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: ppobHistory.length,
        itemBuilder: (context, index) {
          final txn = ppobHistory[index];
          final date = DateTime.tryParse(txn['occurredAt'] ?? '') ?? DateTime.now();
          final fmtDate = DateFormat('dd MMM HH:mm').format(date);
          final amount = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0).format(txn['amount']);

          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
                color: colorScheme.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: colorScheme.outline.withOpacity(0.1)),
                boxShadow: [
                  BoxShadow(color: colorScheme.shadow.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4))
                ]),
            child: ListTile(
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              leading: Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(color: colorScheme.primary.withOpacity(0.1), shape: BoxShape.circle),
                child: Icon(Icons.receipt_long, color: colorScheme.primary),
              ),
              title: Text(txn['description'] ?? 'Transaksi PPOB',
                  style: GoogleFonts.poppins(fontWeight: FontWeight.w600, fontSize: 14, color: colorScheme.onSurface)),
              subtitle: Text(fmtDate,
                  style: GoogleFonts.poppins(fontSize: 12, color: colorScheme.onSurface.withOpacity(0.6))),
              trailing: Text(amount,
                  style: GoogleFonts.poppins(fontWeight: FontWeight.bold, color: colorScheme.primary, fontSize: 14)),
            ),
          ).animate().slideX(begin: 0.1, end: 0, delay: (50 * index).ms);
        },
      );
    });
  }

  void _showTransactionModal(BuildContext context, String serviceName, Color color) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => _TransactionSheet(serviceName: serviceName, color: color),
    );
  }
}

// Transaction Sheet with Shimmer & Save Number
class _TransactionSheet extends StatefulWidget {
  final String serviceName;
  final Color color;
  const _TransactionSheet({required this.serviceName, required this.color});

  @override
  State<_TransactionSheet> createState() => _TransactionSheetState();
}

class _TransactionSheetState extends State<_TransactionSheet> {
  List<Map<String, dynamic>>? _products;
  bool _isLoading = true;
  String? _selectedSku;
  final TextEditingController _customerController = TextEditingController();
  bool _isPostpaid = false;
  bool _isInquiryLoading = false;
  Map<String, dynamic>? _inquiry;
  List<String> _recentNumbers = [];

  String _formatCurrency(dynamic value) {
    if (value == null) return '-';
    final numValue = value is num ? value : num.tryParse(value.toString());
    if (numValue == null) return '-';
    return NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0).format(numValue);
  }

  @override
  void initState() {
    super.initState();
    _loadProducts();
    _loadRecentNumbers();
  }

  @override
  void dispose() {
    _customerController.dispose();
    super.dispose();
  }

  Future<void> _loadRecentNumbers() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _recentNumbers = prefs.getStringList('ppob_recent_numbers') ?? [];
    });
  }

  Future<void> _saveRecentNumber(String number) async {
    final prefs = await SharedPreferences.getInstance();
    if (number.isNotEmpty && !_recentNumbers.contains(number)) {
      _recentNumbers.insert(0, number); // save matching number to top
      if (_recentNumbers.length > 5) _recentNumbers.removeLast();
      await prefs.setStringList('ppob_recent_numbers', _recentNumbers);
    }
  }

  void _loadProducts() async {
    final prods = await ShopeeService().getProducts(widget.serviceName);
    if (mounted) {
      setState(() {
        _products = prods;
        _isLoading = false;
        _isPostpaid = prods.any((p) => p['isPostpaid'] == true);
      });
    }
  }

  // Handle fake payment success with beautiful receipt
  void _executePayment() async {
    final num = _customerController.text;
    await _saveRecentNumber(num);
    
    if (mounted) {
      Navigator.pop(context); // close sheet
      _showSuccessReceipt();   // show receipt instead
    }
  }
  
  void _showSuccessReceipt() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return _SuccessReceiptDialog(
          serviceName: widget.serviceName,
          accountNumber: _customerController.text,
          total: _isPostpaid && _inquiry != null 
            ? ((_inquiry!['amount'] ?? 0) + (_inquiry!['admin_fee'] ?? 0))
            : (_products?.firstWhere((p) => p['id'] == _selectedSku)['price'] ?? 0),
        );
      }
    );
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Padding(
      padding: EdgeInsets.fromLTRB(24, 24, 24, MediaQuery.of(context).viewInsets.bottom + 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(color: widget.color.withOpacity(0.1), shape: BoxShape.circle),
                child: Icon(Icons.payment, color: widget.color)),
            const SizedBox(width: 12),
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(widget.serviceName, style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.bold, color: colorScheme.onSurface)),
              Text("Powered by Digiflazz", style: GoogleFonts.poppins(fontSize: 10, color: colorScheme.onSurface.withOpacity(0.5)))
            ])
          ]),
          const SizedBox(height: 24),
          
          // Number input with PopupMenuButton for recent numbers
          Row(
            children: [
              Expanded(
                child: TextField(
                  keyboardType: TextInputType.number,
                  controller: _customerController,
                  style: GoogleFonts.poppins(color: colorScheme.onSurface),
                  decoration: InputDecoration(
                      labelText: 'Nomor Pelanggan / HP',
                      labelStyle: GoogleFonts.poppins(color: colorScheme.onSurface.withOpacity(0.6)),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: colorScheme.outline)),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: colorScheme.outline.withOpacity(0.3))),
                      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: widget.color)),
                      filled: true,
                      fillColor: colorScheme.surface,
                      suffixIcon: _recentNumbers.isEmpty
                        ? Icon(Icons.contact_phone_outlined, color: colorScheme.onSurface.withOpacity(0.5))
                        : PopupMenuButton<String>(
                            icon: Icon(Icons.history, color: widget.color),
                            tooltip: 'Pilih nomor tersimpan',
                            onSelected: (String result) {
                              setState(() {
                                _customerController.text = result;
                              });
                            },
                            itemBuilder: (BuildContext context) {
                              return _recentNumbers.map((String num) {
                                return PopupMenuItem<String>(
                                  value: num,
                                  child: Text(num, style: GoogleFonts.poppins(fontWeight: FontWeight.w600)),
                                );
                              }).toList();
                            },
                          ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          
          // Shimmer Loading Skeleton
          if (_isLoading)
            Container(
              height: 200,
              decoration: BoxDecoration(border: Border.all(color: colorScheme.outline.withOpacity(0.2)), borderRadius: BorderRadius.circular(16)),
              child: ListView.builder(
                itemCount: 4,
                itemBuilder: (ctx, i) => Shimmer.fromColors(
                  baseColor: colorScheme.surfaceVariant.withOpacity(0.1),
                  highlightColor: colorScheme.surfaceVariant.withOpacity(0.3),
                  child: ListTile(
                    title: Container(height: 14, width: 100, color: Colors.white),
                    trailing: Container(height: 18, width: 60, color: Colors.white),
                  ),
                ),
              ),
            )
          else if (_products != null && _products!.isNotEmpty)
            Container(
              height: 200, // Limit height
              decoration: BoxDecoration(border: Border.all(color: colorScheme.outline.withOpacity(0.2)), borderRadius: BorderRadius.circular(16)),
              child: ListView.separated(
                itemCount: _products!.length,
                separatorBuilder: (_, __) => Divider(height: 1, color: colorScheme.outline.withOpacity(0.1)),
                itemBuilder: (ctx, i) {
                  final p = _products![i];
                  final isSelected = _selectedSku == p['id'];
                  return ListTile(
                    selected: isSelected,
                    selectedTileColor: widget.color.withOpacity(0.1),
                    title: Text(p['name'],
                        style: GoogleFonts.poppins(fontSize: 14, fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400, color: isSelected ? widget.color : colorScheme.onSurface)),
                    trailing: Text(p['price'] != null ? '${MerchantConfig.defaultCurrencySymbol} ${p['price']}' : (p['admin'] != null ? 'Admin ${MerchantConfig.defaultCurrencySymbol} ${p['admin']}' : ''),
                        style: GoogleFonts.poppins(fontWeight: FontWeight.bold, fontSize: 13, color: isSelected ? widget.color : colorScheme.onSurface)),
                    onTap: () => setState(() {
                      _selectedSku = p['id'];
                      _inquiry = null;
                    }),
                  );
                },
              ),
            )
          else
            TextField(
              keyboardType: TextInputType.number,
              style: GoogleFonts.poppins(color: colorScheme.onSurface),
              decoration: InputDecoration(
                  labelText: 'Nominal (Rp)',
                  labelStyle: GoogleFonts.poppins(color: colorScheme.onSurface.withOpacity(0.6)),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: colorScheme.outline)),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: colorScheme.outline.withOpacity(0.3))),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: widget.color)),
                  filled: true,
                  fillColor: colorScheme.surface,
                  prefixText: 'Rp ',
                  prefixStyle: GoogleFonts.poppins(color: colorScheme.onSurface)),
            ),
            
          // If Postpaid, Inquiry button. Else, direct Payment button
          if (_isPostpaid) ...[
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isInquiryLoading
                    ? null
                    : () async {
                        final customerNo = _customerController.text.trim();
                        if (customerNo.isEmpty) return;
                        setState(() { _isInquiryLoading = true; _inquiry = null; });
                        try {
                          final data = await ApiService().checkDigitalBill(customerNo, widget.serviceName, productId: _selectedSku);
                          if (mounted) setState(() => _inquiry = data);
                        } catch (e) {
                          if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Inquiry gagal: $e')));
                        } finally {
                          if (mounted) setState(() => _isInquiryLoading = false);
                        }
                      },
                style: ElevatedButton.styleFrom(backgroundColor: widget.color, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)), elevation: 0),
                child: _isInquiryLoading
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : Text('Cek Tagihan', style: GoogleFonts.poppins(fontWeight: FontWeight.bold)),
              ),
            ),
          ] else ...[
             // Prepaid Pay Button
             const SizedBox(height: 12),
             if (_selectedSku != null)
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _executePayment,
                  style: ElevatedButton.styleFrom(
                      backgroundColor: widget.color,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      elevation: 0),
                  child: Text('Beli Sekarang', style: GoogleFonts.poppins(fontWeight: FontWeight.bold)),
                ),
              )
          ],
          
          if (_inquiry != null) ...[
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: colorScheme.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: widget.color.withOpacity(0.3))),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Detail Tagihan', style: GoogleFonts.poppins(fontWeight: FontWeight.bold, color: colorScheme.onSurface)),
                  const Divider(),
                  _buildDetailRow('Nama Pelanggan', _inquiry!['customer_name'] ?? '-', colorScheme),
                  _buildDetailRow('Tagihan', _formatCurrency(_inquiry!['amount']), colorScheme, isBold: true),
                  _buildDetailRow('Admin', _formatCurrency(_inquiry!['admin_fee']), colorScheme),
                  const Divider(),
                  _buildDetailRow('Total Bayar', _formatCurrency((_inquiry!['amount'] ?? 0) + (_inquiry!['admin_fee'] ?? 0)), colorScheme, isBold: true, valueColor: widget.color),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _executePayment,
                      style: ElevatedButton.styleFrom(backgroundColor: widget.color, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)), elevation: 0),
                      child: Text('Bayar Sekarang', style: GoogleFonts.poppins(fontWeight: FontWeight.bold)),
                    ),
                  )
                ],
              ),
            ).animate().slideY(begin: 0.1, end: 0),
          ]
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value, ColorScheme colorScheme, {bool isBold = false, Color? valueColor}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: GoogleFonts.poppins(fontSize: 12, color: colorScheme.onSurface.withOpacity(0.6))),
          Text(value, style: GoogleFonts.poppins(fontSize: 12, fontWeight: isBold ? FontWeight.bold : FontWeight.w400, color: valueColor ?? colorScheme.onSurface)),
        ],
      ),
    );
  }
}

// Custom receipt full-screen dialog
class _SuccessReceiptDialog extends StatefulWidget {
  final String serviceName;
  final String accountNumber;
  final dynamic total;

  const _SuccessReceiptDialog({
    required this.serviceName,
    required this.accountNumber,
    required this.total,
  });

  @override
  State<_SuccessReceiptDialog> createState() => _SuccessReceiptDialogState();
}

class _SuccessReceiptDialogState extends State<_SuccessReceiptDialog> {
  late ConfettiController _confettiController;

  @override
  void initState() {
    super.initState();
    _confettiController = ConfettiController(duration: const Duration(seconds: 3));
    _confettiController.play();
  }

  @override
  void dispose() {
    _confettiController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Stack(
        alignment: Alignment.center,
        children: [
          // Dark blurred background
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: Container(color: Colors.black87),
          ),
          // Receipt Card
          Container(
            width: MediaQuery.of(context).size.width * 0.85,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.green.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.check_circle_rounded, color: Colors.green, size: 64),
                ).animate().scale(curve: Curves.elasticOut, duration: 800.ms),
                const SizedBox(height: 16),
                Text('Transaksi Berhasil', style: GoogleFonts.poppins(fontSize: 20, fontWeight: FontWeight.bold)),
                Text(DateFormat('dd MMMM yyyy HH:mm').format(DateTime.now()), style: GoogleFonts.poppins(color: Colors.grey, fontSize: 12)),
                const SizedBox(height: 24),
                
                // Details table
                _buildReceiptRow('Layanan', widget.serviceName),
                _buildReceiptRow('No. Pembayaran', widget.accountNumber),
                const Divider(height: 32),
                _buildReceiptRow('TOTAL', NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0).format(widget.total), isBold: true, color: Colors.blue),
                const SizedBox(height: 32),
                
                // Share & Close
                Row(
                  children: [
                    Expanded(
                      child: TextButton.icon(
                        icon: const Icon(Icons.share, size: 18),
                        label: Text('Bagikan', style: GoogleFonts.poppins(fontWeight: FontWeight.bold)),
                        onPressed: () {
                          // Share receipt logic (requires share_plus plugin, omitted for simplicity unless user asks)
                        },
                      ),
                    ),
                    Expanded(
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Theme.of(context).primaryColor,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: () => Navigator.pop(context),
                        child: Text('Tutup', style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ).animate().slideY(begin: 0.1, duration: 300.ms),
          
          Align(
            alignment: Alignment.topCenter,
            child: ConfettiWidget(
              confettiController: _confettiController,
              blastDirectionality: BlastDirectionality.explosive,
              colors: const [Colors.green, Colors.blue, Colors.orange, Colors.pink],
            ),
          )
        ],
      ),
    );
  }

  Widget _buildReceiptRow(String label, String value, {bool isBold = false, Color? color}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: GoogleFonts.poppins(color: Colors.grey)),
          Text(value, style: GoogleFonts.poppins(color: color ?? Colors.black, fontWeight: isBold ? FontWeight.bold : FontWeight.w500)),
        ],
      ),
    );
  }
}
