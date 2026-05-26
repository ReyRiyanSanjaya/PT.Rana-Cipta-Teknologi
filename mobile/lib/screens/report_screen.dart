import 'package:rana_merchant/config/merchant_config.dart';
import 'dart:async'; // [NEW]
import 'dart:io';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:fl_chart/fl_chart.dart';
import 'package:shimmer/shimmer.dart';
import 'package:intl/intl.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:rana_merchant/data/local/database_helper.dart';
import 'package:rana_merchant/data/remote/api_service.dart';
import 'package:rana_merchant/screens/expense_screen.dart';
import 'package:rana_merchant/services/sync_service.dart';
import 'package:share_plus/share_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:provider/provider.dart';
import 'package:rana_merchant/providers/auth_provider.dart';
import 'package:rana_merchant/services/ai_service.dart';
import 'package:rana_merchant/services/notification_service.dart';
import 'package:rana_merchant/screens/stock_opname_screen.dart';
import 'package:rana_merchant/screens/flash_sales_screen.dart';
import 'package:rana_merchant/screens/promo_hub_screen.dart';
import 'package:rana_merchant/screens/marketing_screen.dart';
import 'package:rana_merchant/widgets/business_assistant_sheet.dart'; // [NEW]
import 'package:rana_merchant/services/pdf_report_service.dart'; // [NEW]
import 'package:rana_merchant/config/theme_config.dart';
import 'package:flutter_tts/flutter_tts.dart';

class ReportScreen extends StatefulWidget {
  const ReportScreen({super.key});

  @override
  State<ReportScreen> createState() => _ReportScreenState();
}

class _ReportScreenState extends State<ReportScreen> {
  bool _isLoading = true;
  bool _isFetching = false;
  DateTime _startDate = DateTime.now().subtract(const Duration(days: 7));
  DateTime _endDate = DateTime.now();

  Map<String, dynamic> _summary = {};
  List<Map<String, dynamic>> _topProducts = [];
  List<Map<String, dynamic>> _categorySales = [];
  List<Map<String, dynamic>> _paymentMethods = [];
  List<Map<String, dynamic>> _lowStock = [];
  List<Map<String, dynamic>> _expenses = []; // [NEW]
  List<Map<String, dynamic>> _expenseCategories = []; // [NEW]
  List<Map<String, dynamic>> _hourlyStats = []; // [NEW]
  Map<String, dynamic> _growth = {}; // [NEW] Growth Metrics
  List<Map<String, dynamic>> _aiInsights = []; // [NEW] AI Insights
  int _touchedIndex = -1; // [NEW] For Pie Chart interaction
  String get _periodKey =>
      '${_startDate.toIso8601String()}_${_endDate.toIso8601String()}';
  int _touchedExpenseIndex = -1; // [NEW] For Expense Pie Chart interaction
  int? _dailyTarget;
  double _todaySales = 0;
  bool _showTrainingHint = false;
  bool _isGeneratingPdf = false;
  late FlutterTts _flutterTts;
  bool _isSpeaking = false;

  final currency =
      NumberFormat.currency(locale: 'id_ID', symbol: '${MerchantConfig.defaultCurrencySymbol} ', decimalDigits: 0);
  String formatCurrency(dynamic v) {
    num? numVal;
    if (v is num) {
      numVal = v;
    } else if (v is String) {
      numVal = num.tryParse(v);
    }
    final doubleVal = numVal?.toDouble() ?? 0.0;
    final safeVal = doubleVal.isFinite ? doubleVal : 0.0;
    return currency.format(safeVal);
  }

  Future<void> _exportToPdf() async {
    setState(() => _isGeneratingPdf = true);
    try {
      final user = Provider.of<AuthProvider>(context, listen: false).currentUser;
      final storeName = user?['businessName'] ?? 'Toko Rana';
      
      await PdfReportService().generateAndOpenReport(
        startDate: _startDate,
        endDate: _endDate,
        summary: _summary,
        topProducts: _topProducts,
        paymentMethods: _paymentMethods,
        expenses: _expenses,
        storeName: storeName,
      );
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Laporan PDF berhasil dibuat')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal membuat PDF: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isGeneratingPdf = false);
    }
  }

  @override
  void initState() {
    super.initState();
    _initTts();
    _fetchData();
    _loadDailyTarget();
    _loadTrainingHint();
  }

  void _initTts() {
    _flutterTts = FlutterTts();
    _flutterTts.setLanguage("id-ID");
    _flutterTts.setPitch(1.0);
    _flutterTts.setSpeechRate(0.5);

    _flutterTts.setStartHandler(() {
      setState(() => _isSpeaking = true);
    });

    _flutterTts.setCompletionHandler(() {
      setState(() => _isSpeaking = false);
    });

    _flutterTts.setErrorHandler((msg) {
      if (mounted) setState(() => _isSpeaking = false);
    });
  }

  Future<void> _speakSummary() async {
    try {
      final text = await AiService().generateVoiceSummary();
      await _flutterTts.speak(text);
    } catch (e) {
      debugPrint("TTS Error: $e");
    }
  }

  @override
  void dispose() {
    _flutterTts.stop();
    super.dispose();
  }

  Future<void> _fetchData() async {
    if (!mounted || _isFetching) return;
    _isFetching = true;
    setState(() => _isLoading = true);

    try {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      final token = auth.token;
      if (token != null && token.isNotEmpty) {
        ApiService().setToken(token);
      }

      final start =
          DateTime(_startDate.year, _startDate.month, _startDate.day, 0, 0, 0);
      final end =
          DateTime(_endDate.year, _endDate.month, _endDate.day, 23, 59, 59);

      // --- 1. QUICK LOCAL LOAD ---
      try {
        final localSummary =
            await DatabaseHelper.instance.getSalesReport(start: start, end: end);
        final top = await DatabaseHelper.instance
            .getTopSellingProductsDetailed(limit: 5, start: start, end: end);
        final categories = await DatabaseHelper.instance
            .getSalesByCategory(start: start, end: end);
        final payments = await DatabaseHelper.instance
            .getSalesByPaymentMethod(start: start, end: end);
        final lowStock =
            await DatabaseHelper.instance.getLowStockProducts(threshold: 5);
        final expenses =
            await DatabaseHelper.instance.getExpenses(start: start, end: end);

        if (mounted) {
          setState(() {
            _summary = Map<String, dynamic>.from(localSummary);
            _topProducts = List<Map<String, dynamic>>.from(top);
            _categorySales = List<Map<String, dynamic>>.from(categories);
            _paymentMethods = List<Map<String, dynamic>>.from(payments);
            _lowStock = List<Map<String, dynamic>>.from(lowStock);
            _expenses = List<Map<String, dynamic>>.from(expenses);
            _isLoading = false; // Show local data immediately
          });
        }
      } catch (e) {
        debugPrint('Local load error: $e');
        // If local fails, we just continue to remote
      }

      // --- 2. BACKGROUND SYNC & REMOTE LOAD ---
      unawaited(SyncService().syncTransactions().catchError((e) => debugPrint('Sync error: $e')));

      try {
        final results = await Future.wait([
          ApiService().getProfitLoss(
              startDate: start.toIso8601String().split('T')[0],
              endDate: end.toIso8601String().split('T')[0]),
          ApiService().getAnalytics(
              startDate: start.toIso8601String().split('T')[0],
              endDate: end.toIso8601String().split('T')[0]),
          ApiService().getDashboardStats(
              date: DateTime.now().toIso8601String().split('T')[0]),
        ]);

        final remotePnl = results[0];
        final analytics = results[1];
        final todayRemote = results[2];

        if (mounted) {
          setState(() {
            final remotePnlData =
                Map<String, dynamic>.from(remotePnl['pnl'] ?? {});
            final remoteSummary =
                Map<String, dynamic>.from(analytics['summary'] ?? {});
            
            // Merge logic (robust)
            // Revenue
            final remoteRev = (remoteSummary['revenue'] as num?)?.toDouble() ?? 
                              (remotePnlData['revenue'] as num?)?.toDouble() ?? 0.0;
            final localRev = (_summary['grossSales'] as num?)?.toDouble() ?? 0.0;
            _summary['grossSales'] = remoteRev > localRev ? remoteRev : localRev;

            // [NEW] HPP / COGS
            final remoteCogs = (remoteSummary['cogs'] as num?)?.toDouble() ?? 
                               (remotePnlData['cogs'] as num?)?.toDouble() ?? 0.0;
            final localCogs = (_summary['totalCost'] as num?)?.toDouble() ?? 0.0;
            _summary['totalCost'] = remoteCogs > localCogs ? remoteCogs : localCogs;

            // Profit
            final remoteProfit = (remoteSummary['netProfit'] as num?)?.toDouble() ?? 
                                 (remotePnlData['netProfit'] as num?)?.toDouble() ?? 0.0;
            final localProfit = (_summary['netProfit'] as num?)?.toDouble() ?? 0.0;
            if (remoteProfit != 0) {
              _summary['netProfit'] = remoteProfit;
            } else if (localProfit == 0) {
              _summary['netProfit'] = 0.0;
            }

            // [NEW] Transactions count
            final remoteTxns = (remoteSummary['totalTransactions'] as num?)?.toInt() ?? 
                               (remotePnlData['totalTransactions'] as num?)?.toInt() ?? 0;
            final localTxns = (_summary['totalTransactions'] as num?)?.toInt() ?? 0;
            _summary['totalTransactions'] = remoteTxns > localTxns ? remoteTxns : localTxns;

            // [NEW] Expenses
            final remoteExp = (remoteSummary['totalExpenses'] as num?)?.toDouble() ?? 
                              (remotePnlData['totalExpenses'] as num?)?.toDouble() ?? 0.0;
            final localExp = (_summary['totalExpenses'] as num?)?.toDouble() ?? 0.0;
            _summary['totalExpenses'] = remoteExp > localExp ? remoteExp : localExp;

            // [NEW] Today's Sales
            final remoteToday = (todayRemote['revenue'] as num?)?.toDouble() ?? 0.0;
            if (remoteToday > _todaySales) {
              _todaySales = remoteToday;
            }

            // Average Order Value (Recompute or merge)
            final remoteAov = (remoteSummary['averageOrderValue'] as num?)?.toDouble() ?? 0.0;
            if (remoteAov > 0) {
              _summary['averageOrderValue'] = remoteAov;
            }

            _growth = Map<String, dynamic>.from(analytics['growth'] ?? {});
            _hourlyStats =
                List<Map<String, dynamic>>.from(analytics['hourlyStats'] ?? []);
            _aiInsights =
                List<Map<String, dynamic>>.from(analytics['insights'] ?? []);

            final remoteTopRaw = List<Map<String, dynamic>>.from(analytics['topProducts'] ?? const []);
            if (remoteTopRaw.isNotEmpty) {
              _topProducts = remoteTopRaw.map((e) => {
                'name': (e['name'] ?? '').toString(),
                'totalQty': (e['quantity'] as num?)?.toInt() ?? 0,
                'totalRevenue': (e['revenue'] as num?)?.toDouble() ?? 0.0,
              }).toList();
            }

            final remoteCatsRaw = List<Map<String, dynamic>>.from(analytics['categorySales'] ?? const []);
            if (remoteCatsRaw.isNotEmpty) {
              _categorySales = remoteCatsRaw.map((e) => {
                'category': e['category']?.toString() ?? '',
                'totalSales': (e['revenue'] as num?)?.toDouble() ?? 0.0
              }).toList();
            }
            _isLoading = false; // Remote load complete
          });
        }
      } catch (e) {
        debugPrint('Remote load error: $e');
        if (mounted) setState(() => _isLoading = false); // Stop shimmering anyway
      }

      // Heavy AI insights
      unawaited(AiService().generateAdvancedInsights().then((insights) {
        if (mounted) {
          setState(() {
            _aiInsights = [..._aiInsights, ...insights];
          });
          // Speak summary only on first load
          if (_summary['grossSales'] != null) {
             _speakSummary();
          }
        }
      }).catchError((e) => debugPrint('AI Insights error: $e')));

    } catch (e) {
      debugPrint('Error in optimized fetch wrapper: $e');
      if (mounted) setState(() => _isLoading = false);
    } finally {
      _isFetching = false;
    }
  }

  Future<void> _fetchLocalOnly() async {
    final start =
        DateTime(_startDate.year, _startDate.month, _startDate.day, 0, 0, 0);
    final end =
        DateTime(_endDate.year, _endDate.month, _endDate.day, 23, 59, 59);

    final summary =
        await DatabaseHelper.instance.getSalesReport(start: start, end: end);
    final top = await DatabaseHelper.instance
        .getTopSellingProductsDetailed(limit: 5, start: start, end: end);
    final categories = await DatabaseHelper.instance
        .getSalesByCategory(start: start, end: end);
    final payments = await DatabaseHelper.instance
        .getSalesByPaymentMethod(start: start, end: end);
    final lowStock =
        await DatabaseHelper.instance.getLowStockProducts(threshold: 5);
    final expenses =
        await DatabaseHelper.instance.getExpenses(start: start, end: end);

    if (mounted) {
      setState(() {
        _summary = Map<String, dynamic>.from(summary);
        if (_summary['trend'] is List) {
          _summary['trend'] =
              List<Map<String, dynamic>>.from(_summary['trend']);
        }
        _topProducts = List<Map<String, dynamic>>.from(top);
        _categorySales = List<Map<String, dynamic>>.from(categories);
        _paymentMethods = List<Map<String, dynamic>>.from(payments);
        _lowStock = List<Map<String, dynamic>>.from(lowStock);
        _expenses = List<Map<String, dynamic>>.from(expenses);
        _isLoading = false;
      });
    }
  }

  Future<void> _loadDailyTarget() async {
    final prefs = await SharedPreferences.getInstance();
    final value = prefs.getInt('daily_sales_target');
    if (!mounted) return;
    setState(() {
      _dailyTarget = value;
    });
  }

  Future<void> _loadTrainingHint() async {
    final prefs = await SharedPreferences.getInstance();
    final seen = prefs.getBool('report_training_hint_seen') ?? false;
    if (!mounted) return;
    setState(() {
      _showTrainingHint = !seen;
    });
  }

  Future<void> _dismissTrainingHint() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('report_training_hint_seen', true);
    if (!mounted) return;
    setState(() {
      _showTrainingHint = false;
    });
  }

  Future<void> _saveDailyTarget(int? target) async {
    final prefs = await SharedPreferences.getInstance();
    if (target == null || target <= 0) {
      await prefs.remove('daily_sales_target');
    } else {
      await prefs.setInt('daily_sales_target', target);
    }
    if (!mounted) return;
    setState(() {
      _dailyTarget = target;
    });
  }

  void _showDailyTargetSheet() {
    final controller = TextEditingController(
        text: _dailyTarget != null && _dailyTarget! > 0
            ? _dailyTarget!.toString()
            : '');
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        final bottom = MediaQuery.of(context).viewInsets.bottom;
        final colorScheme = Theme.of(context).colorScheme;
        return Padding(
          padding: EdgeInsets.only(bottom: bottom),
          child: Container(
            decoration: BoxDecoration(
              color: Theme.of(context).scaffoldBackgroundColor,
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(20)),
            ),
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    margin: const EdgeInsets.only(bottom: 20),
                    decoration: BoxDecoration(
                      color: colorScheme.outlineVariant.withOpacity(0.6),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                Text(
                  'Target Penjualan Harian',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: colorScheme.onSurface,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'Masukkan target omzet harian yang ingin dicapai.',
                  style: TextStyle(
                    fontSize: 13,
                    color: colorScheme.onSurface.withOpacity(0.7),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: controller,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Target harian (Rp)',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () {
                          Navigator.pop(context);
                          _saveDailyTarget(null);
                        },
                        child: const Text('Hapus Target'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: FilledButton(
                        onPressed: () {
                          final raw = controller.text.replaceAll('.', '');
                          final parsed = int.tryParse(raw);
                          Navigator.pop(context);
                          _saveDailyTarget(parsed);
                        },
                        child: const Text('Simpan'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildDailyTargetCard() {
    final target = _dailyTarget ?? 0;
    final progress = target > 0 ? (_todaySales / target).clamp(0.0, 2.0) : 0.0;
    final progressPct =
        target > 0 ? (_todaySales / target * 100).clamp(0.0, 999.0) : 0.0;
    final todayLabel = DateFormat('EEEE, dd MMM', 'id_ID').format(
      DateTime.now(),
    );

    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: colorScheme.primary.withOpacity(0.25),
          width: 1.2,
        ),
        boxShadow: [
          BoxShadow(
            color: colorScheme.shadow.withOpacity(0.15),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Target Hari Ini',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: colorScheme.onSurface,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    todayLabel,
                    style: TextStyle(
                      fontSize: 12,
                      color: colorScheme.onSurface.withOpacity(0.6),
                    ),
                  ),
                ],
              ),
              TextButton(
                onPressed: _showDailyTargetSheet,
                child: const Text('Atur Target'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (target <= 0)
            Text(
              'Belum ada target harian. Atur dulu supaya progress bisa dipantau.',
              style: TextStyle(
                fontSize: 13,
                color: colorScheme.onSurface.withOpacity(0.7),
              ),
            )
          else ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Tercapai',
                      style: TextStyle(
                        fontSize: 12,
                        color: colorScheme.onSurface.withOpacity(0.7),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      formatCurrency(_todaySales),
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: colorScheme.primary,
                      ),
                    ),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      'Target',
                      style: TextStyle(
                        fontSize: 12,
                        color: colorScheme.onSurface.withOpacity(0.7),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      formatCurrency(target),
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: colorScheme.primary,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(999),
              child: LinearProgressIndicator(
                value: progress,
                minHeight: 10,
                backgroundColor: colorScheme.surfaceVariant,
                valueColor: AlwaysStoppedAnimation(colorScheme.primary),
              ),
            ),
            const SizedBox(height: 6),
            Align(
              alignment: Alignment.centerRight,
              child: Text(
                '${progressPct.toStringAsFixed(0)}%',
                style: TextStyle(
                  fontSize: 12,
                  color: colorScheme.onSurface.withOpacity(0.7),
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            if (progress >= 1.0)
              Container(
                margin: const EdgeInsets.only(top: 8),
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: colorScheme.primary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(Icons.check_circle,
                        color: colorScheme.primary, size: 16),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Target tercapai! Kerja bagus.',
                        style: TextStyle(
                            color: colorScheme.primary,
                            fontWeight: FontWeight.bold,
                            fontSize: 12),
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ],
      ),
    );
  }

  Widget _buildInsightsCard() {
    final items = <String>[];
    final grossSales = (_summary['grossSales'] as num?)?.toDouble() ?? 0.0;
    final netProfit = (_summary['netProfit'] as num?)?.toDouble() ?? 0.0;

    if (grossSales > 0) {
      final marginPct = (netProfit / grossSales * 100);
      items.add(
          'Margin bersih periode ini sekitar ${marginPct.toStringAsFixed(1)}%.');
      if (marginPct < 5) {
        items.add(
            'Margin masih tipis, pertimbangkan naikkan harga atau negosiasi ulang harga beli.');
      } else if (marginPct > 25) {
        items.add(
            'Margin cukup sehat, bisa coba promo agresif di produk tertentu untuk dorong volume.');
      }
    }

    if (_topProducts.isNotEmpty) {
      final top = _topProducts.first;
      final name = top['name'] ?? '';
      final qty = (top['totalQty'] as num?)?.toInt() ?? 0;
      items.add(
          'Produk terlaris: $name ($qty terjual). Pastikan stok aman dan jadikan produk utama di etalase dan promosi.');
    }

    if (_expenseCategories.isNotEmpty) {
      final topExp = _expenseCategories.first;
      final label = _getCategoryLabel(topExp['category']);
      final total = (topExp['total'] as num?)?.toDouble() ?? 0.0;
      items.add(
          'Pengeluaran terbesar ada di kategori $label (${formatCurrency(total)}). Cek apakah ada biaya yang bisa dipangkas.');
    }

    if (_paymentMethods.length > 1) {
      double totalAmount = 0;
      double nonCash = 0;
      for (final pm in _paymentMethods) {
        final amount = (pm['totalAmount'] as num?)?.toDouble() ?? 0.0;
        totalAmount += amount;
        if (pm['paymentMethod'] != 'CASH') {
          nonCash += amount;
        }
      }
      if (totalAmount > 0 && nonCash > 0) {
        final share = nonCash / totalAmount * 100;
        items.add(
            'Pembayaran non-tunai menyumbang sekitar ${share.toStringAsFixed(1)}% omzet. Pertimbangkan dorong metode ini untuk pencatatan lebih rapi.');
      }
    }

    if (_lowStock.isNotEmpty) {
      final names = _lowStock
          .take(3)
          .map((e) => e['name']?.toString() ?? '')
          .where((e) => e.trim().isNotEmpty)
          .toList();
      if (names.isNotEmpty) {
        items.add(
            'Stok menipis untuk: ${names.join(', ')}. Segera lakukan pembelian ulang agar tidak kehabisan saat permintaan naik.');
      }
    }

    final aiList = List<Map<String, dynamic>>.from(_aiInsights);

    if (items.isEmpty && aiList.isEmpty) {
      return const SizedBox.shrink();
    }

    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: colorScheme.shadow.withOpacity(0.1),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.lightbulb_outline, color: colorScheme.primary),
              const SizedBox(width: 8),
              Text(
                'Insight dari data periode ini',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: colorScheme.onSurface,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...items.map((text) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('• ', style: TextStyle(fontSize: 13)),
                  Expanded(
                    child: Text(
                      text,
                      style: TextStyle(fontSize: 13, color: colorScheme.onSurface),
                    ),
                  ),
                ],
              ),
            );
          }),
          if (aiList.isNotEmpty) ...[
            const SizedBox(height: 4),
            ...aiList.map((i) {
              final reason = (i['reason'] ?? '').toString().trim();
              final confVal = (i['confidence'] as num?)?.toDouble();
              final confStr = confVal != null
                  ? 'Kepercayaan ${((confVal) * 100).round()}%'
                  : '';
              final meta = reason.isNotEmpty && confStr.isNotEmpty
                  ? 'Alasan: $reason • $confStr'
                  : (reason.isNotEmpty ? 'Alasan: $reason' : confStr);
              final typeStr = (i['type'] ?? '').toString();
              final accent = _insightColor(typeStr, colorScheme);
              final icon = _insightIcon(typeStr);
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: InkWell(
                  borderRadius: BorderRadius.circular(12),
                  splashColor: accent.withOpacity(0.15),
                  highlightColor: accent.withOpacity(0.08),
                  onTap: () => _showInsightDetail(i),
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.surface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: accent.withOpacity(0.35)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: accent.withOpacity(0.1),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(icon, color: accent, size: 18),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                (i['message'] ?? '').toString(),
                                style: TextStyle(
                                  fontSize: 13,
                                  color: colorScheme.onSurface,
                                ),
                              ),
                            ),
                          ],
                        ),
                        if (meta.isNotEmpty) ...[
                          const SizedBox(height: 6),
                          Wrap(
                            spacing: 8,
                            runSpacing: 4,
                            crossAxisAlignment: WrapCrossAlignment.center,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: accent.withOpacity(0.12),
                                  borderRadius: BorderRadius.circular(999),
                                ),
                                child: Text(
                                  typeStr.toUpperCase(),
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: accent,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                              if (reason.isNotEmpty)
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: Theme.of(context)
                                        .colorScheme
                                        .surfaceVariant,
                                    borderRadius: BorderRadius.circular(999),
                                  ),
                                  child: ConstrainedBox(
                                    constraints: const BoxConstraints(maxWidth: 150),
                                    child: Text(
                                      'Alasan: $reason',
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: colorScheme.onSurface.withOpacity(0.7),
                                      ),
                                    ),
                                  ),
                                ),
                              if (confStr.isNotEmpty)
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: accent.withOpacity(0.12),
                                    borderRadius: BorderRadius.circular(999),
                                  ),
                                  child: Text(
                                    confStr,
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: accent,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              );
            }),
          ],
        ],
      ),
    );
  }

  void _openSalesForecast() {
    final trend = _summary['trend'] is List
        ? List<Map<String, dynamic>>.from(_summary['trend'])
        : <Map<String, dynamic>>[];
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => SalesForecastScreen(
          trend: trend,
          periodStart: _startDate,
          periodEnd: _endDate,
          dailyTarget: _dailyTarget,
        ),
      ),
    );
  }

  void _openCustomerAnalysis() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => CustomerAnalysisScreen(
          summary: Map<String, dynamic>.from(_summary),
          trend: _summary['trend'] is List
              ? List<Map<String, dynamic>>.from(_summary['trend'])
              : <Map<String, dynamic>>[],
          topProducts: List<Map<String, dynamic>>.from(_topProducts),
          categorySales: List<Map<String, dynamic>>.from(_categorySales),
          paymentMethods: List<Map<String, dynamic>>.from(_paymentMethods),
          hourlyStats: List<Map<String, dynamic>>.from(_hourlyStats),
          periodStart: _startDate,
          periodEnd: _endDate,
        ),
      ),
    );
  }

  // [FIX] Non-blocking Business Assistant
  void _openBusinessAssistant() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      builder: (ctx) => BusinessAssistantSheet(
        startDate: _startDate,
        endDate: _endDate,
        aiInsights: _aiInsights,
      ),
    );
  }

  // --- Header Action ---
  Widget _buildExportButton() {
    return _isGeneratingPdf
        ? const Padding(
            padding: EdgeInsets.all(12),
            child: SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
          )
        : IconButton(
            icon: const Icon(Icons.picture_as_pdf),
            tooltip: 'Export PDF',
            onPressed: _exportToPdf,
          );
  }

  void _runAssistantAction(Map<String, dynamic> a) async {
    final act = a['action']?.toString() ?? '';
    if (act == 'OPEN_STOCK_OPNAME') {
      await Navigator.of(context)
          .push(MaterialPageRoute(builder: (_) => const StockOpnameScreen()));
    } else if (act == 'CREATE_FLASH_SALE') {
      await Navigator.of(context)
          .push(MaterialPageRoute(builder: (_) => const FlashSalesScreen()));
    } else if (act == 'OPEN_PROMO_HUB') {
      await Navigator.of(context)
          .push(MaterialPageRoute(builder: (_) => const PromoHubScreen()));
    } else if (act == 'OPEN_MARKETING') {
      await Navigator.of(context)
          .push(MaterialPageRoute(builder: (_) => const MarketingScreen()));
    } else if (act == 'SCHEDULE_PROMO_NOTIF') {
      await NotificationService().showNotification(
          id: DateTime.now().millisecondsSinceEpoch % 100000,
          title: 'Waktunya promo',
          body: a['desc']?.toString() ?? 'Kirim promo di jam ramai');
    } else if (act == 'SHOW_RESTOCK_PLAN') {
      final payload = Map<String, dynamic>.from(a['payload'] ?? {});
      final plan = List<Map<String, dynamic>>.from(payload['plan'] ?? []);
      if (plan.isEmpty) {
        final ai = AiService();
        final computed = await ai.computeRestockPlan(horizonDays: 7, safety: 0.2);
        _showRestockPlan(computed);
      } else {
        _showRestockPlan(plan);
      }
    } else if (act == 'OPEN_EXPENSES') {
      await Navigator.of(context)
          .push(MaterialPageRoute(builder: (_) => const ExpenseScreen()));
    } else if (act == 'SHOW_TARGET_SUGGESTION') {
      final value = (Map<String, dynamic>.from(a['payload'] ?? {})['value'] as num?)
              ?.toDouble() ??
          0.0;
      await NotificationService().showNotification(
          id: DateTime.now().millisecondsSinceEpoch % 100000,
          title: 'Target Harian Disarankan',
          body:
              'Setel target harian sekitar ${NumberFormat.currency(locale: 'id_ID', symbol: '${MerchantConfig.defaultCurrencySymbol} ', decimalDigits: 0).format(value)} untuk memacu performa tim.');
    } else if (act == 'SHOW_EXPENSE_TOP') {
      final payload = Map<String, dynamic>.from(a['payload'] ?? {});
      final topCats = List<Map<String, dynamic>>.from(payload['topCategories'] ?? []);
      if (topCats.isNotEmpty) {
        _showExpenseTop(topCats);
      } else {
        final rows = await DatabaseHelper.instance.getExpenses(
            start: _startDate, end: _endDate);
        final catMap = <String, double>{};
        for (final e in rows) {
          final cat = (e['category'] ?? 'Lain-lain').toString();
          final amt = (e['amount'] as num?)?.toDouble() ?? 0.0;
          catMap[cat] = (catMap[cat] ?? 0.0) + amt;
        }
        final entries = catMap.entries.toList()
          ..sort((a, b) => b.value.compareTo(a.value));
        final list = entries
            .take(5)
            .map((e) => {'category': e.key, 'total': e.value})
            .toList();
        _showExpenseTop(list);
      }
    } else if (act == 'KULAKAN') {
      await Navigator.of(context)
          .push(MaterialPageRoute(builder: (_) => const StockOpnameScreen()));
    }
  }

  void _showProductDetail(Map<String, dynamic> product) {
    final productId = product['productId'] as String?;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return ProductSalesDetailSheet(
          product: product,
          productId: productId,
          start: DateTime(
              _startDate.year, _startDate.month, _startDate.day, 0, 0, 0),
          end:
              DateTime(_endDate.year, _endDate.month, _endDate.day, 23, 59, 59),
        );
      },
    );
  }

  void _showRestockPlan(List<Map<String, dynamic>> plan) {
    final colorScheme = Theme.of(context).colorScheme;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: colorScheme.surface,
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
              left: 16,
              right: 16,
              top: 16,
              bottom: 16 + MediaQuery.of(ctx).viewInsets.bottom),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.inventory_2, color: colorScheme.primary),
                  const SizedBox(width: 8),
                  Text('Rencana Restock',
                      style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: colorScheme.onSurface)),
                ],
              ),
              const SizedBox(height: 12),
              ...plan.map((p) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(p['name']?.toString() ?? '',
                              style: TextStyle(
                                  fontSize: 12, color: colorScheme.onSurface)),
                        ),
                        Text(
                            'Stok: ${(p['currentStock'] as num?)?.toInt() ?? 0}',
                            style: TextStyle(
                                fontSize: 12,
                                color:
                                    colorScheme.onSurface.withOpacity(0.8))),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: colorScheme.primary.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            'Saran: ${(p['suggestedQty'] as num?)?.toInt() ?? 0}',
                            style: TextStyle(
                                fontSize: 12, color: colorScheme.primary),
                          ),
                        ),
                      ],
                    ),
                  )),
            ],
          ),
        );
      },
    );
  }

  void _showExpenseTop(List<Map<String, dynamic>> topCats) {
    final colorScheme = Theme.of(context).colorScheme;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: colorScheme.surface,
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
              left: 16,
              right: 16,
              top: 16,
              bottom: 16 + MediaQuery.of(ctx).viewInsets.bottom),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.pie_chart, color: colorScheme.primary),
                  const SizedBox(width: 8),
                  Text('Kategori Biaya Terbesar',
                      style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: colorScheme.onSurface)),
                ],
              ),
              const SizedBox(height: 12),
              ...topCats.map((c) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(c['category']?.toString() ?? '',
                              style: TextStyle(
                                  fontSize: 12, color: colorScheme.onSurface)),
                        ),
                        Text(
                            NumberFormat.currency(
                                    locale: 'id_ID',
                                    symbol: '${MerchantConfig.defaultCurrencySymbol} ',
                                    decimalDigits: 0)
                                .format(
                                    (c['total'] as num?)?.toDouble() ?? 0.0),
                            style: TextStyle(
                                fontSize: 12,
                                color:
                                    colorScheme.onSurface.withOpacity(0.8))),
                      ],
                    ),
                  )),
            ],
          ),
        );
      },
    );
  }

  void _showInsightDetail(Map<String, dynamic> i) {
    final colorScheme = Theme.of(context).colorScheme;
    final typeStr = (i['type'] ?? '').toString();
    final accent = _insightColor(typeStr, colorScheme);
    final icon = _insightIcon(typeStr);
    final title = (i['title'] ?? '').toString();
    final short = (i['short'] ?? '').toString();
    final message = (i['message'] ?? '').toString();
    final reason = (i['reason'] ?? '').toString();
    final confVal = (i['confidence'] as num?)?.toDouble();
    final confStr =
        confVal != null ? 'Kepercayaan ${((confVal) * 100).round()}%' : '';
    final action = (i['action'] ?? '').toString();
    final payload = Map<String, dynamic>.from(i['payload'] ?? {});
    final data = Map<String, dynamic>.from(i['data'] ?? {});

    List<Widget> extra = [];
    if (payload['topCategories'] is List) {
      final list =
          List<Map<String, dynamic>>.from(payload['topCategories'] ?? []);
      extra.add(const SizedBox(height: 12));
      extra.add(Text('Ringkasan Kategori Biaya',
          style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: colorScheme.onSurface)));
      extra.add(const SizedBox(height: 8));
      extra.addAll(list.map((e) => Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(e['category']?.toString() ?? '',
                    style:
                        TextStyle(fontSize: 12, color: colorScheme.onSurface)),
              ),
              Text(
                  NumberFormat.currency(
                          locale: 'id_ID', symbol: '${MerchantConfig.defaultCurrencySymbol} ', decimalDigits: 0)
                      .format((e['total'] as num?)?.toDouble() ?? 0.0),
                  style: TextStyle(
                      fontSize: 12,
                      color: colorScheme.onSurface.withOpacity(0.8))),
            ],
          )));
    }
    if (payload['plan'] is List) {
      final list = List<Map<String, dynamic>>.from(payload['plan'] ?? []);
      if (list.isNotEmpty) {
        extra.add(const SizedBox(height: 12));
        extra.add(Text('Rencana Restock',
            style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: colorScheme.onSurface)));
        extra.add(const SizedBox(height: 8));
        extra.addAll(list.take(5).map((p) => Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(p['name']?.toString() ?? '',
                      style:
                          TextStyle(fontSize: 12, color: colorScheme.onSurface)),
                ),
                Text(
                    'Stok ${(p['currentStock'] as num?)?.toInt() ?? 0} • Saran ${(p['suggestedQty'] as num?)?.toInt() ?? 0}',
                    style: TextStyle(
                        fontSize: 11,
                        color: colorScheme.onSurface.withOpacity(0.7))),
              ],
            )));
      }
    }
    if (data['hero'] is Map || data['slow'] is Map) {
      final hero = Map<String, dynamic>.from(data['hero'] ?? {});
      final slow = Map<String, dynamic>.from(data['slow'] ?? {});
      if (hero.isNotEmpty || slow.isNotEmpty) {
        extra.add(const SizedBox(height: 12));
        extra.add(Text('Produk Terkait',
            style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: colorScheme.onSurface)));
        extra.add(const SizedBox(height: 8));
        if (hero.isNotEmpty) {
          extra.add(Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(hero['name']?.toString() ?? '',
                    style:
                        TextStyle(fontSize: 12, color: colorScheme.onSurface)),
              ),
              Text('Laris',
                  style: TextStyle(
                      fontSize: 11,
                      color: colorScheme.onSurface.withOpacity(0.7))),
            ],
          ));
        }
        if (slow.isNotEmpty) {
          extra.add(Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(slow['name']?.toString() ?? '',
                    style:
                        TextStyle(fontSize: 12, color: colorScheme.onSurface)),
              ),
              Text('Lambat',
                  style: TextStyle(
                      fontSize: 11,
                      color: colorScheme.onSurface.withOpacity(0.7))),
            ],
          ));
        }
      }
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: colorScheme.surface,
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
              left: 16,
              right: 16,
              top: 16,
              bottom: 16 + MediaQuery.of(ctx).viewInsets.bottom),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: accent.withOpacity(0.1),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(icon, color: accent),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      title.isNotEmpty
                          ? title
                          : short.isNotEmpty
                              ? short
                              : 'Detail Insight',
                      style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: colorScheme.onSurface),
                    ),
                  ),
                  IconButton(
                      onPressed: () => Navigator.pop(ctx),
                      icon: const Icon(Icons.close))
                ],
              ),
              const SizedBox(height: 12),
              Text(
                message,
                style: TextStyle(fontSize: 13, color: colorScheme.onSurface),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: accent.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      typeStr.toUpperCase(),
                      style: TextStyle(
                          fontSize: 11,
                          color: accent,
                          fontWeight: FontWeight.w700),
                    ),
                  ),
                  const SizedBox(width: 8),
                  if (reason.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: colorScheme.surfaceVariant,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        'Alasan: $reason',
                        style: TextStyle(
                            fontSize: 11,
                            color: colorScheme.onSurface.withOpacity(0.7)),
                      ),
                    ),
                  const SizedBox(width: 8),
                  if (confStr.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: accent.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        confStr,
                        style: TextStyle(
                            fontSize: 11,
                            color: accent,
                            fontWeight: FontWeight.w600),
                      ),
                    ),
                ],
              ),
              ...extra,
              if ((payload['topCategories'] is List && (payload['topCategories'] as List).isNotEmpty) ||
                  (payload['plan'] is List && (payload['plan'] as List).isNotEmpty)) ...[
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    if (payload['topCategories'] is List &&
                        (payload['topCategories'] as List).isNotEmpty)
                      OutlinedButton.icon(
                        onPressed: () {
                          Navigator.pop(ctx);
                          final list = List<Map<String, dynamic>>.from(
                              payload['topCategories'] ?? []);
                          _showExpenseTop(list);
                        },
                        icon: const Icon(Icons.pie_chart),
                        label: const Text('Lihat detail biaya'),
                      ),
                    if (payload['plan'] is List &&
                        (payload['plan'] as List).isNotEmpty)
                      OutlinedButton.icon(
                        onPressed: () {
                          Navigator.pop(ctx);
                          final list =
                              List<Map<String, dynamic>>.from(payload['plan']);
                          _showRestockPlan(list);
                        },
                        icon: const Icon(Icons.inventory_2),
                        label: const Text('Lihat rencana restock'),
                      ),
                  ],
                ),
              ],
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(ctx),
                      child: const Text('Tutup'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  if (action.isNotEmpty && action != 'NONE')
                    Expanded(
                      child: FilledButton(
                        onPressed: () {
                          Navigator.pop(ctx);
                          _runAssistantAction(i);
                        },
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              _getActionIcon(action),
                              size: 18,
                              color: Theme.of(context).colorScheme.onPrimary,
                            ),
                            const SizedBox(width: 8),
                            Text(_getActionLabel(action)),
                          ],
                        ),
                      ),
                    ),
                ],
              )
            ],
          ),
        );
      },
    );
  }

  Widget _buildAiFeatureSection() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isNarrow = constraints.maxWidth < 600;
        final cardWidth =
            isNarrow ? constraints.maxWidth : (constraints.maxWidth - 12) / 2;
        return Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            SizedBox(
              width: cardWidth,
              child: _buildAiFeatureCard(
                title: 'Prediksi Penjualan',
                subtitle: 'Forecast omzet harian untuk 7 hari ke depan',
                icon: Icons.auto_graph,
                colors: const [Color(0xFF4F46E5), Color(0xFF818CF8)],
                onTap: _openSalesForecast,
              ),
            ),
            SizedBox(
              width: cardWidth,
              child: _buildAiFeatureCard(
                title: 'Analisis Pelanggan',
                subtitle: 'Preferensi & kebiasaan belanja dari data transaksi',
                icon: Icons.groups_2_outlined,
                colors: const [Color(0xFFE07A5F), Color(0xFFF2A693)],
                onTap: _openCustomerAnalysis,
              ),
            ),
            SizedBox(
              width: cardWidth,
              child: _buildAiFeatureCard(
                title: 'Asisten Bisnis',
                subtitle: 'Rekomendasi tindakan & tanya jawab cepat',
                icon: Icons.smart_toy,
                colors: const [Color(0xFF10B981), Color(0xFF34D399)],
                onTap: _openBusinessAssistant,
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildAiFeatureCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required List<Color> colors,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            gradient: LinearGradient(
              colors: colors,
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            boxShadow: [
              BoxShadow(
                color: colors.first.withOpacity(0.25),
                blurRadius: 14,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.18),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(icon, color: Colors.white),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        subtitle,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.white.withOpacity(0.9),
                          height: 1.25,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Icon(Icons.chevron_right, color: Colors.white.withOpacity(0.9)),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _pickDateRange() async {
    final picked = await showDateRangePicker(
        context: context,
        firstDate: DateTime(2020),
        lastDate: DateTime.now(),
        initialDateRange: DateTimeRange(start: _startDate, end: _endDate),
        builder: (context, child) {
          final theme = Theme.of(context);
          return Theme(
            data: theme.copyWith(
              colorScheme: theme.colorScheme.copyWith(
                primary: theme.colorScheme.primary,
                secondary: theme.colorScheme.primary,
              ),
            ),
            child: child!,
          );
        });

    if (picked != null) {
      setState(() {
        _startDate = picked.start;
        _endDate = picked.end;
      });
      _fetchData();
    }
  }



  IconData _getCategoryIcon(String? category) {
    switch (category) {
      case 'EXPENSE_PETTY':
        return Icons.wallet;
      case 'EXPENSE_OPERATIONAL':
        return Icons.bolt;
      case 'EXPENSE_PURCHASE':
        return Icons.inventory_2;
      case 'EXPENSE_SALARY':
        return Icons.badge;
      case 'EXPENSE_MARKETING':
        return Icons.campaign;
      case 'EXPENSE_RENT':
        return Icons.store;
      case 'EXPENSE_MAINTENANCE':
        return Icons.build;
      default:
        return Icons.more_horiz;
    }
  }

  String _getCategoryLabel(String? category) {
    switch (category) {
      case 'EXPENSE_PETTY':
        return 'Petty Cash (Harian)';
      case 'EXPENSE_OPERATIONAL':
        return 'Operasional';
      case 'EXPENSE_PURCHASE':
        return 'Pembelian Stok';
      case 'EXPENSE_SALARY':
        return 'Gaji Karyawan';
      case 'EXPENSE_MARKETING':
        return 'Pemasaran';
      case 'EXPENSE_RENT':
        return 'Sewa Tempat';
      case 'EXPENSE_MAINTENANCE':
        return 'Perbaikan';
      case 'EXPENSE_OTHER':
        return 'Lain-lain';
      default:
        return category ?? '-';
    }
  }

  Color _insightColor(String type, ColorScheme scheme) {
    final t = type.toUpperCase();
    if (t == 'ALERT') return const Color(0xFFEF4444);
    if (t == 'TIP') return const Color(0xFF10B981);
    if (t == 'STRATEGY') return const Color(0xFF6D28D9);
    if (t == 'PREDICTION') return const Color(0xFF3B82F6);
    if (t == 'RETENTION') return const Color(0xFFF59E0B);
    if (t == 'CONTEXT') return const Color(0xFF22D3EE);
    return scheme.primary;
  }

  IconData _insightIcon(String type) {
    final t = type.toUpperCase();
    if (t == 'ALERT') return Icons.warning_amber_rounded;
    if (t == 'TIP') return Icons.lightbulb_outline;
    if (t == 'STRATEGY') return Icons.auto_graph;
    if (t == 'PREDICTION') return Icons.auto_graph;
    if (t == 'RETENTION') return Icons.groups_2_outlined;
    if (t == 'CONTEXT') return Icons.cloud_queue;
    return Icons.insights_outlined;
  }

  String _getActionLabel(String action) {
    switch (action) {
      case 'OPEN_STOCK_OPNAME':
      case 'KULAKAN':
        return 'Mulai Stock Opname';
      case 'CREATE_FLASH_SALE':
        return 'Buka Flash Sale';
      case 'OPEN_PROMO_HUB':
        return 'Buka Promo Hub';
      case 'OPEN_MARKETING':
        return 'Buka Marketing';
      case 'SCHEDULE_PROMO_NOTIF':
        return 'Jadwalkan Notifikasi Promo';
      case 'SHOW_RESTOCK_PLAN':
        return 'Lihat Rencana Restock';
      case 'OPEN_EXPENSES':
        return 'Buka Pengeluaran';
      case 'SHOW_TARGET_SUGGESTION':
        return 'Setel Target Harian';
      case 'SHOW_EXPENSE_TOP':
        return 'Lihat Biaya Terbesar';
      case 'REPORT':
        return 'Buka Laporan';
      default:
        return 'Jalankan Aksi';
    }
  }

  IconData _getActionIcon(String action) {
    switch (action) {
      case 'OPEN_STOCK_OPNAME':
      case 'KULAKAN':
        return Icons.inventory_2;
      case 'CREATE_FLASH_SALE':
        return Icons.local_fire_department;
      case 'OPEN_PROMO_HUB':
        return Icons.campaign;
      case 'OPEN_MARKETING':
        return Icons.chat_bubble_outline;
      case 'SCHEDULE_PROMO_NOTIF':
        return Icons.notifications_active;
      case 'SHOW_RESTOCK_PLAN':
        return Icons.inventory_2;
      case 'OPEN_EXPENSES':
        return Icons.receipt_long;
      case 'SHOW_TARGET_SUGGESTION':
        return Icons.flag;
      case 'SHOW_EXPENSE_TOP':
        return Icons.pie_chart;
      case 'REPORT':
        return Icons.assessment;
      default:
        return Icons.play_arrow_rounded;
    }
  }

  void _showExpenseDetail(Map<String, dynamic> expense) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        final date = DateTime.tryParse(expense['date'] ?? '');
        final dateStr = date != null
            ? DateFormat('EEEE, d MMMM yyyy HH:mm').format(date)
            : '-';
        final imagePath = expense['imagePath'];

        final colorScheme = Theme.of(context).colorScheme;
        return Container(
          decoration: BoxDecoration(
            color: Theme.of(context).scaffoldBackgroundColor,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          ),
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 20),
                  decoration: BoxDecoration(
                      color: Theme.of(context)
                          .colorScheme
                          .outlineVariant
                          .withOpacity(0.6),
                      borderRadius: BorderRadius.circular(2)),
                ),
              ),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF8F0),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(_getCategoryIcon(expense['category']),
                        color: Theme.of(context).colorScheme.primary, size: 28),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(_getCategoryLabel(expense['category']),
                            style: TextStyle(
                                fontSize: 14,
                                color: Theme.of(context)
                                    .colorScheme
                                    .onSurface
                                    .withOpacity(0.7))),
                        Text(
                            formatCurrency(
                                (expense['amount'] as num?)?.toDouble() ?? 0.0),
                            style: TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: Theme.of(context).colorScheme.primary)),
                      ],
                    ),
                  ),
                ],
              ),
              const Divider(height: 32),
              _buildDetailItem(Icons.calendar_today, 'Tanggal', dateStr),
              const SizedBox(height: 16),
              _buildDetailItem(
                  Icons.notes, 'Keterangan', expense['description'] ?? '-'),
              if (imagePath != null) ...[
                const SizedBox(height: 24),
                const Text('Bukti Foto:',
                    style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Image.file(
                    File(imagePath),
                    width: double.infinity,
                    height: 200,
                    fit: BoxFit.cover,
                    errorBuilder: (ctx, err, stack) => Container(
                      height: 100,
                      color: Theme.of(context).colorScheme.surfaceVariant,
                      child: const Center(child: Text('File tidak ditemukan')),
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 32),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _confirmDeleteExpense(expense['id']),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        side: BorderSide(
                            color: Theme.of(context).colorScheme.primary),
                        foregroundColor: Theme.of(context).colorScheme.primary,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: const Icon(Icons.delete_outline),
                      label: const Text('Hapus'),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: () async {
                        Navigator.pop(context); // Close bottom sheet
                        final result = await Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (context) =>
                                  ExpenseScreen(expenseToEdit: expense)),
                        );
                        if (result == true) {
                          _fetchData(); // Refresh list
                        }
                      },
                      style: FilledButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        backgroundColor: Theme.of(context).colorScheme.primary,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: const Icon(Icons.edit_outlined),
                      label: const Text('Edit'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: Text('Tutup',
                      style: TextStyle(
                          color: Theme.of(context)
                              .colorScheme
                              .onSurface
                              .withOpacity(0.7))),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _confirmDeleteExpense(int id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Hapus Pengeluaran?'),
        content: const Text(
            'Data yang dihapus tidak dapat dikembalikan. Lanjutkan?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Batal')),
          TextButton(
              onPressed: () => Navigator.pop(context, true),
              style: TextButton.styleFrom(
                  foregroundColor: Theme.of(context).colorScheme.error),
              child: const Text('Hapus')),
        ],
      ),
    );

    if (confirm == true) {
      Navigator.pop(context); // Close bottom sheet
      setState(() => _isLoading = true);
      await DatabaseHelper.instance.deleteExpense(id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: const Text('Pengeluaran dihapus'),
            backgroundColor: Theme.of(context).colorScheme.primary));
      }
      _fetchData();
    }
  }

  Widget _buildDetailItem(IconData icon, String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon,
            size: 18,
            color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6)),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label,
                  style: TextStyle(
                      fontSize: 12,
                      color: Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withOpacity(0.6))),
              const SizedBox(height: 4),
              Text(value,
                  style: TextStyle(
                      fontSize: 15,
                      color: Theme.of(context).colorScheme.onSurface)),
            ],
          ),
        ),
      ],
    );
  }

  // [NEW] Export Feature
  Future<void> _exportReport() async {
    final s = _summary;
    final sb = StringBuffer();
    sb.writeln('=== Laporan Rana Merchant ===');
    sb.writeln(
        'Periode: ${DateFormat('dd MMM yyyy').format(_startDate)} - ${DateFormat('dd MMM yyyy').format(_endDate)}');
    sb.writeln('\n-- Ringkasan --');
    sb.writeln('Omzet: ${formatCurrency(s['grossSales'])}');
    sb.writeln('Laba Bersih: ${formatCurrency(s['netProfit'])}');
    sb.writeln('Pengeluaran: ${formatCurrency(s['totalExpenses'])}');
    sb.writeln('Transaksi: ${s['totalTransactions']}');
    sb.writeln('Rata-rata Order: ${formatCurrency(s['averageOrderValue'])}');
    sb.writeln('\n-- Produk Terlaris --');
    for (var p in _topProducts) {
      final revenue = (p['totalRevenue'] as num?)?.toDouble() ?? 0.0;
      final qty = (p['totalQty'] as num?)?.toInt() ?? 0;
      final profit = (p['totalProfit'] as num?)?.toDouble();
      final margin = (p['profitMargin'] as num?)?.toDouble();
      final marginStr = margin != null
          ? ' (Margin ${(margin * 100).toStringAsFixed(1)}%)'
          : '';
      final profitStr = profit != null && profit != 0
          ? ', Laba: ${formatCurrency(profit)}$marginStr'
          : '';
      sb.writeln(
          '- ${p['name']} ($qty x): ${formatCurrency(revenue)}$profitStr');
    }
    sb.writeln('\n-- Pengeluaran --');
    for (var e in _expenseCategories) {
      sb.writeln(
          '- ${_getCategoryLabel(e['category'])}: ${formatCurrency(e['total'])}');
    }
    sb.writeln('\nDicetak dari Aplikasi Rana Merchant');

    // Use Share Plus to share text
    // Note: Assuming share_plus is imported or available via similar method.
    // Since we saw it in pubspec, we should import it if not present.
    // But wait, the file imports share_plus? No, I need to check imports.
    // If not imported, I cannot use it.
    // Let's check imports in next step or assume user can add it.
    // Actually, I can use a simple dialog with copyable text if share_plus is missing.
    // But I will add the import if needed.

    showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
              title: const Text('Ekspor Laporan'),
              content: SingleChildScrollView(
                child: SelectableText(sb.toString()),
              ),
              actions: [
                TextButton(
                    onPressed: () => Navigator.pop(ctx),
                    child: const Text('Tutup')),
                TextButton(
                    onPressed: () {
                      Share.share(sb.toString(),
                          subject: 'Laporan Rana Merchant');
                      Navigator.pop(ctx);
                    },
                    child: const Text('Bagikan'))
              ],
            ));
  }

  void _setDatePreset(int days) {
    final now = DateTime.now();
    setState(() {
      if (days == 0) {
        // Hari Ini
        _startDate = now;
        _endDate = now;
      } else if (days == 1) {
        // Kemarin
        _startDate = now.subtract(const Duration(days: 1));
        _endDate = now.subtract(const Duration(days: 1));
      } else {
        // Last N days
        _startDate = now.subtract(Duration(days: days - 1));
        _endDate = now;
      }
    });
    _fetchData();
  }

  Widget _buildGlassMetric({
    required String label,
    required String value,
    required IconData icon,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.12),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.2)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: Colors.white, size: 18),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                label,
                style: TextStyle(
                  color: Colors.white.withOpacity(0.7),
                  fontSize: 10,
                  fontWeight: FontWeight.w500,
                ),
              ),
              Text(
                value,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDatePresets() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          _presetButton('Hari Ini', 0),
          const SizedBox(width: 8),
          _presetButton('Kemarin', 1),
          const SizedBox(width: 8),
          _presetButton('7 Hari', 7),
          const SizedBox(width: 8),
          _presetButton('30 Hari', 30),
        ],
      ),
    );
  }

  Widget _presetButton(String label, int days) {
    return ChoiceChip(
      label: Text(label),
      selected: _isPresetSelected(days),
      onSelected: (v) {
        if (v) _setDatePreset(days);
      },
      labelStyle: TextStyle(
        color: _isPresetSelected(days)
            ? Theme.of(context).colorScheme.onPrimary
            : Theme.of(context).colorScheme.onSurface,
        fontWeight: FontWeight.w600,
      ),
      selectedColor: Theme.of(context).colorScheme.primary,
      backgroundColor: Theme.of(context).colorScheme.surfaceVariant,
      shape: const StadiumBorder(),
      visualDensity: VisualDensity.compact,
    );
  }

  bool _isPresetSelected(int days) {
    final now = DateTime.now();
    bool sameDay(DateTime a, DateTime b) =>
        a.year == b.year && a.month == b.month && a.day == b.day;
    if (days == 0) {
      return sameDay(_startDate, now) && sameDay(_endDate, now);
    } else if (days == 1) {
      final y = now.subtract(const Duration(days: 1));
      return sameDay(_startDate, y) && sameDay(_endDate, y);
    } else {
      final start = now.subtract(Duration(days: days - 1));
      return sameDay(_startDate, start) && sameDay(_endDate, now);
    }
  }

  List<Widget> _buildShimmerReportBody() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final baseColor = isDark ? Colors.grey[800]! : Colors.grey[300]!;
    final highlightColor = isDark ? Colors.grey[700]! : Colors.grey[100]!;

    Widget shimmerBox({double? width, double? height, double radius = 12}) {
      return Shimmer.fromColors(
        baseColor: baseColor,
        highlightColor: highlightColor,
        child: Container(
          width: width,
          height: height,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(radius),
          ),
        ),
      );
    }

    return [
      SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: List.generate(4, (i) => Padding(
            padding: const EdgeInsets.only(right: 8),
            child: shimmerBox(width: 80, height: 32, radius: 16),
          )),
        ),
      ),
      const SizedBox(height: 16),
      shimmerBox(width: double.infinity, height: 160, radius: 16),
      const SizedBox(height: 16),
      Row(
        children: [
          Expanded(child: shimmerBox(height: 100, radius: 16)),
          const SizedBox(width: 16),
          Expanded(child: shimmerBox(height: 100, radius: 16)),
        ],
      ),
      const SizedBox(height: 16),
      Row(
        children: [
          Expanded(child: shimmerBox(height: 100, radius: 16)),
          const SizedBox(width: 16),
          Expanded(child: shimmerBox(height: 100, radius: 16)),
        ],
      ),
      const SizedBox(height: 16),
      shimmerBox(width: double.infinity, height: 120, radius: 16),
      const SizedBox(height: 16),
      shimmerBox(width: 120, height: 24, radius: 4), 
      const SizedBox(height: 12),
      Row(
        children: [
          Expanded(child: shimmerBox(height: 80, radius: 16)),
          const SizedBox(width: 12),
          Expanded(child: shimmerBox(height: 80, radius: 16)),
        ],
      ),
      const SizedBox(height: 24),
      shimmerBox(width: 200, height: 24, radius: 4),
      const SizedBox(height: 16),
      shimmerBox(width: double.infinity, height: 340, radius: 16),
      const SizedBox(height: 48),
    ];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      floatingActionButton: Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: FloatingActionButton.extended(
          onPressed: () async {
            // Navigate to Expense Screen
            final result = await Navigator.push(context,
                MaterialPageRoute(builder: (_) => const ExpenseScreen()));
            if (result == true) _fetchData(); // Refresh if expense added
          },
          label: const Text('Catat Pengeluaran',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          icon: const Icon(Icons.add_card, size: 24),
          backgroundColor: Theme.of(context).colorScheme.primary,
          foregroundColor: Theme.of(context).colorScheme.onPrimary,
          elevation: 4,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
      ),
      body: RefreshIndicator(
              onRefresh: _fetchData,
              child: CustomScrollView(
                slivers: [
                  SliverAppBar(
                    pinned: true,
                    floating: false,
                    expandedHeight: 150,
                    backgroundColor: Colors.transparent,
                    elevation: 0,
                    iconTheme: const IconThemeData(color: Colors.white),
                    title: const Text(
                      'Laporan Bisnis',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    flexibleSpace: FlexibleSpaceBar(
                      background: Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              ThemeConfig.brandColor,
                              ThemeConfig.brandColor.withOpacity(0.8),
                              ThemeConfig.brandColor.withOpacity(0.6),
                              ThemeConfig.brandColor.withOpacity(0.4),
                            ],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                        ),
                        child: Stack(
                          children: [
                            Positioned(
                              right: -30,
                              top: -20,
                              child: Icon(
                                Icons.insights,
                                size: 150,
                                color: Colors.white.withOpacity(0.08),
                              ),
                            ),
                            if (_isSpeaking)
                              Positioned(
                                right: 16,
                                bottom: 100,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.2),
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.volume_up, color: Colors.white, size: 16),
                                      const SizedBox(width: 4),
                                      const Text("Ringkasan Suara...", style: TextStyle(color: Colors.white, fontSize: 10)),
                                    ],
                                  ),
                                ),
                              ),
                            Align(
                              alignment: Alignment.bottomLeft,
                              child: Padding(
                                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                                child: SingleChildScrollView(
                                  scrollDirection: Axis.horizontal,
                                  child: Row(
                                    children: [
                                      _buildGlassMetric(
                                        label: 'Omzet',
                                        value: formatCurrency((_summary['grossSales'] as num?)?.toDouble() ?? 0.0),
                                        icon: Icons.payments_outlined,
                                      ),
                                      const SizedBox(width: 8),
                                      Builder(builder: (context) {
                                        final omzet = (_summary['grossSales'] as num?)?.toDouble() ?? 0.0;
                                        final pengeluaran = (_summary['totalExpenses'] as num?)?.toDouble() ?? 0.0;
                                        double hpp = (_summary['totalCost'] as num?)?.toDouble() ?? 0.0;
                                        if (!hpp.isFinite || hpp < 0) hpp = 0.0;

                                        double labaBersih = omzet - hpp - pengeluaran;
                                        
                                        return _buildGlassMetric(
                                          label: 'Laba',
                                          value: formatCurrency(labaBersih),
                                          icon: Icons.trending_up,
                                        );
                                      }),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      title: Text(
                        'Laporan Bisnis',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                          shadows: [
                            Shadow(
                              color: Colors.black.withOpacity(0.3),
                              offset: const Offset(0, 2),
                              blurRadius: 4,
                            ),
                          ],
                        ),
                      ),
                      titlePadding: const EdgeInsets.only(left: 16, bottom: 64),
                    ),
                    actions: [
                      IconButton(
                        icon: const Icon(Icons.share_outlined),
                        onPressed: _exportReport,
                        tooltip: 'Ekspor Laporan',
                      ),
                      IconButton(
                        icon: const Icon(Icons.calendar_today_outlined),
                        onPressed: _pickDateRange,
                        tooltip: 'Pilih Tanggal',
                      ),
                      IconButton(
                        icon: const Icon(Icons.sync),
                        tooltip: 'Sinkronisasi Produk',
                        onPressed: () async {
                          try {
                            ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                    content: Text('Sinkronisasi produk...')));
                            await ApiService().fetchAndSaveProducts();
                            ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                    content: Text(
                                        'Produk tersinkron. Laporan diperbarui.')));
                            await _fetchData();
                          } catch (e) {
                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                                content: Text('Gagal sinkronisasi: $e'),
                                backgroundColor:
                                    Theme.of(context).colorScheme.primary));
                          }
                        },
                      ),
                      Padding(
                        padding:
                            const EdgeInsets.only(right: 16.0, left: 8.0),
                        child: GestureDetector(
                          onTap: _pickDateRange,
                          child: Chip(
                            avatar: Icon(
                              Icons.calendar_today_outlined,
                              size: 16,
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurface
                                  .withOpacity(0.8),
                            ),
                            label: Text(
                              '${DateFormat('dd/MM').format(_startDate)} - ${DateFormat('dd/MM').format(_endDate)}',
                              style: TextStyle(
                                color: Theme.of(context).colorScheme.onSurface,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            backgroundColor:
                                Theme.of(context).colorScheme.surfaceVariant,
                            shape: const StadiumBorder(),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 0),
                          ),
                        ),
                      )
                    ],
                  ),
                  SliverPadding(
                    padding: const EdgeInsets.all(20),
                    sliver: SliverList(
                      delegate: SliverChildListDelegate(
                        _isLoading ? _buildShimmerReportBody() : [
                        _buildDatePresets(),
                        const SizedBox(height: 16),

                        if (_showTrainingHint)
                          Container(
                            padding: const EdgeInsets.all(12),
                            margin: const EdgeInsets.only(bottom: 12),
                            decoration: BoxDecoration(
                              color: Theme.of(context)
                                  .colorScheme
                                  .primary
                                  .withOpacity(0.06),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: Theme.of(context)
                                    .colorScheme
                                    .primary
                                    .withOpacity(0.2),
                              ),
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Icon(
                                  Icons.insights_outlined,
                                  size: 18,
                                  color: Theme.of(context).colorScheme.primary,
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    'Gunakan rentang tanggal di atas lalu lihat kartu ringkasan, grafik tren, dan kategori produk untuk memantau performa toko.',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: Theme.of(context)
                                          .colorScheme
                                          .onSurface
                                          .withOpacity(0.8),
                                    ),
                                  ),
                                ),
                                IconButton(
                                  padding: EdgeInsets.zero,
                                  constraints: const BoxConstraints(),
                                  icon: Icon(
                                    Icons.close,
                                    size: 18,
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onSurface
                                        .withOpacity(0.5),
                                  ),
                                  onPressed: _dismissTrainingHint,
                                ),
                              ],
                            ),
                          ),

                        _buildDailyTargetCard()
                            .animate()
                            .fadeIn(duration: 500.ms)
                            .slideY(begin: 0.2, end: 0),

                        const SizedBox(height: 16),

                        AnimatedSwitcher(
                          duration: const Duration(milliseconds: 300),
                          transitionBuilder: (child, anim) => FadeTransition(
                            opacity: anim,
                            child: SlideTransition(
                              position: Tween<Offset>(
                                begin: const Offset(0, 0.08),
                                end: Offset.zero,
                              ).animate(anim),
                              child: child,
                            ),
                          ),
                          child: KeyedSubtree(
                            key: ValueKey('summary_$_periodKey'),
                            child: _buildSummaryCards(),
                          ),
                        ),

                        const SizedBox(height: 16),

                        _buildInsightsCard()
                            .animate()
                            .fadeIn(delay: 150.ms)
                            .slideY(begin: 0.2, end: 0),

                        const SizedBox(height: 16),

                        Text(
                          'Fitur AI',
                          style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: Theme.of(context).colorScheme.onSurface),
                        ),
                        const SizedBox(height: 12),
                        _buildAiFeatureSection()
                            .animate()
                            .fadeIn(delay: 200.ms)
                            .slideY(begin: 0.12, end: 0),

                        const SizedBox(height: 24),

                        // [FIXED] Chart Section with Header & Legend
                        Text(
                          'Tren Pemasukan & Pengeluaran',
                          style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: Theme.of(context).colorScheme.onSurface),
                        ),
                        const SizedBox(height: 16),
                        AnimatedSwitcher(
                          duration: const Duration(milliseconds: 300),
                          transitionBuilder: (child, anim) => FadeTransition(
                            opacity: anim,
                            child: SlideTransition(
                              position: Tween<Offset>(
                                begin: const Offset(0, 0.08),
                                end: Offset.zero,
                              ).animate(anim),
                              child: child,
                            ),
                          ),
                          child: KeyedSubtree(
                            key: ValueKey('chart_$_periodKey'),
                            child: Container(
                              height: 340,
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: Theme.of(context).colorScheme.surface,
                                borderRadius: BorderRadius.circular(16),
                                boxShadow: [
                                  BoxShadow(
                                      color: Theme.of(context)
                                          .colorScheme
                                          .shadow
                                          .withOpacity(0.15),
                                      blurRadius: 10,
                                      offset: const Offset(0, 4))
                                ],
                              ),
                              child: Column(
                                children: [
                              // Legend
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  _buildChartLegend(
                                      'Penjualan', const Color(0xFF4F46E5)),
                                  const SizedBox(width: 16),
                                  _buildChartLegend(
                                      'Pengeluaran', const Color(0xFFEF4444)),
                                ],
                              ),
                              const SizedBox(height: 16),
                              Expanded(
                                child: _buildSalesChart(
                                    _summary['trend'] is List
                                        ? List<Map<String, dynamic>>.from(
                                            _summary['trend'])
                                        : []),
                              ),
                                ],
                              ),
                            ),
                          ),
                        ),

                        const SizedBox(height: 24),

                        AnimatedSwitcher(
                          duration: const Duration(milliseconds: 300),
                          transitionBuilder: (child, anim) => FadeTransition(
                            opacity: anim,
                            child: SlideTransition(
                              position: Tween<Offset>(
                                begin: const Offset(0, 0.08),
                                end: Offset.zero,
                              ).animate(anim),
                              child: child,
                            ),
                          ),
                          child: KeyedSubtree(
                            key: ValueKey('stats_$_periodKey'),
                            child: Row(
                              children: [
                                Expanded(
                                    child: _buildStatTile(
                                        'Total Transaksi',
                                        '${_summary['totalTransactions']}',
                                        Icons.receipt_long)),
                                const SizedBox(width: 16),
                                Expanded(
                                    child: _buildStatTile(
                                        'Rata-rata Order',
                                        formatCurrency(
                                            _summary['averageOrderValue']),
                                        Icons.shopping_basket_outlined)),
                              ],
                            ),
                          ),
                        ),

                        const SizedBox(height: 32),

                        // [NEW] Hourly Stats
                        if (_hourlyStats.isNotEmpty) ...[
                          Text(
                            'Waktu Tersibuk',
                            style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: Theme.of(context).colorScheme.onSurface),
                          ),
                          const SizedBox(height: 16),
                          Container(
                            height: 250,
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Theme.of(context).colorScheme.surface,
                              borderRadius: BorderRadius.circular(16),
                              boxShadow: [
                                BoxShadow(
                                    color: Theme.of(context)
                                        .colorScheme
                                        .shadow
                                        .withOpacity(0.15),
                                    blurRadius: 10,
                                    offset: const Offset(0, 4))
                              ],
                            ),
                            child: _buildHourlyChart(),
                          ).animate().fadeIn(delay: 250.ms).slideX(),
                          const SizedBox(height: 32),
                        ],

                        // [NEW] Low Stock Alert
                        if (_lowStock.isNotEmpty) ...[
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Theme.of(context)
                                  .colorScheme
                                  .primary
                                  .withOpacity(0.1),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                  color: Theme.of(context)
                                      .colorScheme
                                      .primary
                                      .withOpacity(0.3)),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Icon(Icons.warning_amber_rounded,
                                        color: Theme.of(context)
                                            .colorScheme
                                            .primary),
                                    const SizedBox(width: 8),
                                    Text(
                                      'Stok Menipis!',
                                      style: TextStyle(
                                          color: Theme.of(context)
                                              .colorScheme
                                              .primary,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 16),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                ..._lowStock
                                    .map((e) => Padding(
                                          padding: const EdgeInsets.symmetric(
                                              vertical: 4),
                                          child: Row(
                                            mainAxisAlignment:
                                                MainAxisAlignment.spaceBetween,
                                            children: [
                                              Text(e['name'],
                                                  style: const TextStyle(
                                                      fontWeight:
                                                          FontWeight.w500)),
                                              Text('${e['stock']} tersisa',
                                                  style: TextStyle(
                                                      color: Theme.of(context)
                                                          .colorScheme
                                                          .primary,
                                                      fontWeight:
                                                          FontWeight.bold)),
                                            ],
                                          ),
                                        ))
                                    .toList(),
                              ],
                            ),
                          ).animate().fadeIn(delay: 300.ms).shake(),
                          const SizedBox(height: 32),
                        ],

                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // 3. Category Pie Chart
                            Expanded(
                              flex: 1,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('Kategori Terlaris',
                                      style: TextStyle(
                                          fontSize: 18,
                                          fontWeight: FontWeight.bold,
                                          color: Theme.of(context)
                                              .colorScheme
                                              .onSurface)),
                                  const SizedBox(height: 16),
                                  Container(
                                    height: 250,
                                    padding: const EdgeInsets.all(16),
                                    decoration: BoxDecoration(
                                      color:
                                          Theme.of(context).colorScheme.surface,
                                      borderRadius: BorderRadius.circular(16),
                                      border: Border.all(
                                          color: Theme.of(context)
                                              .colorScheme
                                              .outline
                                              .withOpacity(0.18)),
                                    ),
                                    child: _buildCategoryPieChart(),
                                  ),
                                ],
                              ),
                            ),
                            if (MediaQuery.of(context).size.width > 600)
                              const SizedBox(width: 24),
                            // 4. Payment Methods (Show on side for desktop, below for mobile?)
                            // For simplicity in this responsive view logic, we just stack them or use Expanded on wide
                            if (MediaQuery.of(context).size.width > 600)
                              Expanded(
                                flex: 1,
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('Metode Pembayaran',
                                        style: TextStyle(
                                            fontSize: 18,
                                            fontWeight: FontWeight.bold,
                                            color: Theme.of(context)
                                                .colorScheme
                                                .onSurface)),
                                    const SizedBox(height: 16),
                                    _buildPaymentMethodsList(),
                                  ],
                                ),
                              )
                          ],
                        ).animate().fadeIn(delay: 500.ms),

                        if (MediaQuery.of(context).size.width <= 600) ...[
                          const SizedBox(height: 32),
                          Text('Metode Pembayaran',
                              style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color:
                                      Theme.of(context).colorScheme.onSurface)),
                          const SizedBox(height: 16),
                          _buildPaymentMethodsList(),
                        ],

                        const SizedBox(height: 32),

                        const SizedBox(height: 32),

                        // [NEW] Expense List & Chart
                        if (_expenses.isNotEmpty) ...[
                          const Divider(height: 48),

                          // Expense Analysis Section
                          Text('Analisa Pengeluaran',
                              style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color:
                                      Theme.of(context).colorScheme.onSurface)),
                          const SizedBox(height: 16),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Expense Pie Chart
                              Expanded(
                                flex: 1,
                                child: Container(
                                  height: 250,
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                    color:
                                        Theme.of(context).colorScheme.surface,
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(
                                        color: Theme.of(context)
                                            .colorScheme
                                            .outline
                                            .withOpacity(0.18)),
                                  ),
                                  child: _buildExpensePieChart(),
                                ),
                              ),
                              // Legend for Expenses (Only on wider screens or if needed)
                              if (MediaQuery.of(context).size.width > 600) ...[
                                const SizedBox(width: 24),
                                Expanded(
                                  flex: 1,
                                  child: Column(
                                    children: _expenseCategories.map((e) {
                                      final colors = [
                                        const Color(0xFFE63946),
                                        const Color(0xFFF4A261),
                                        const Color(0xFFE9C46A),
                                        const Color(0xFF2A9D8F),
                                        const Color(0xFF264653),
                                      ];
                                      final idx = _expenseCategories.indexOf(e);
                                      return ListTile(
                                        leading: CircleAvatar(
                                          backgroundColor:
                                              colors[idx % colors.length],
                                          radius: 6,
                                        ),
                                        title: Text(
                                            _getCategoryLabel(e['category']),
                                            style: TextStyle(
                                                fontSize: 14,
                                                color: Theme.of(context)
                                                    .colorScheme
                                                    .onSurface)),
                                        trailing: Text(
                                            formatCurrency((e['total'] as num?)
                                                    ?.toDouble() ??
                                                0.0),
                                            style: TextStyle(
                                                fontWeight: FontWeight.bold,
                                                color: Theme.of(context)
                                                    .colorScheme
                                                    .onSurface)),
                                        dense: true,
                                      );
                                    }).toList(),
                                  ),
                                )
                              ]
                            ],
                          ).animate().fadeIn(delay: 520.ms),

                          const SizedBox(height: 32),

                          Text('Riwayat Pengeluaran',
                              style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color:
                                      Theme.of(context).colorScheme.onSurface)),
                          const SizedBox(height: 16),
                          Container(
                            decoration: BoxDecoration(
                              color: Theme.of(context).colorScheme.surface,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                  color: Theme.of(context)
                                      .colorScheme
                                      .outline
                                      .withOpacity(0.18)),
                            ),
                            child: Column(
                              children: _expenses.map((e) {
                                final date = DateTime.tryParse(e['date'] ?? '');
                                final dateStr = date != null
                                    ? DateFormat('dd MMM HH:mm').format(date)
                                    : '-';
                                return ListTile(
                                  leading: CircleAvatar(
                                    backgroundColor:
                                        Theme.of(context).colorScheme.surface,
                                    child: Icon(_getCategoryIcon(e['category']),
                                        color: Theme.of(context)
                                            .colorScheme
                                            .primary,
                                        size: 20),
                                  ),
                                  title: Text(e['description'] ?? 'Pengeluaran',
                                      style: TextStyle(
                                          fontWeight: FontWeight.w600,
                                          color: Theme.of(context)
                                              .colorScheme
                                              .onSurface)),
                                  subtitle: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(dateStr,
                                          style: TextStyle(
                                              fontSize: 12,
                                              color: Theme.of(context)
                                                  .colorScheme
                                                  .onSurface
                                                  .withOpacity(0.6))),
                                      if (e['imagePath'] != null)
                                        Padding(
                                          padding:
                                              const EdgeInsets.only(top: 4),
                                          child: Row(
                                            children: [
                                              Icon(Icons.attach_file,
                                                  size: 14,
                                                  color: Theme.of(context)
                                                      .colorScheme
                                                      .primary),
                                              const SizedBox(width: 4),
                                              Text('Lihat Bukti',
                                                  style: TextStyle(
                                                      fontSize: 12,
                                                      color: Theme.of(context)
                                                          .colorScheme
                                                          .primary,
                                                      decoration: TextDecoration
                                                          .underline)),
                                            ],
                                          ),
                                        ),
                                    ],
                                  ),
                                  trailing: Text(
                                    '- ${formatCurrency((e['amount'] as num?)?.toDouble() ?? 0.0)}',
                                    style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        color: Theme.of(context)
                                            .colorScheme
                                            .primary),
                                  ),
                                  onTap: () => _showExpenseDetail(e),
                                );
                              }).toList(),
                            ),
                          ).animate().fadeIn(delay: 550.ms),
                          const SizedBox(height: 32),
                        ],

                        // 5. Top Products Table
                        Text('Produk Terlaris',
                            style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color:
                                    Theme.of(context).colorScheme.onSurface)),
                        const SizedBox(height: 16),
                        Container(
                          decoration: BoxDecoration(
                            color: Theme.of(context).colorScheme.surface,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: Theme.of(context)
                                  .colorScheme
                                  .outlineVariant
                                  .withOpacity(0.35),
                            ),
                          ),
                          child: Column(
                            children: [
                              SizedBox(
                                height: 220,
                                child: _buildProductSalesChart(),
                              ),
                              const Divider(height: 1),
                              Padding(
                                padding: const EdgeInsets.all(16),
                                child: Column(
                                  children: _topProducts.isEmpty
                                      ? [
                                          const Padding(
                                            padding: EdgeInsets.all(8),
                                            child: Text(
                                              'Belum ada data penjualan produk',
                                              textAlign: TextAlign.center,
                                            ),
                                          )
                                        ]
                                      : _topProducts
                                          .asMap()
                                          .entries
                                          .map((entry) {
                                          final index = entry.key;
                                          final item = entry.value;
                                          final profit =
                                              (item['totalProfit'] as num?)
                                                  ?.toDouble();
                                          final margin =
                                              (item['profitMargin'] as num?)
                                                  ?.toDouble();
                                          return ListTile(
                                            dense: true,
                                            contentPadding: EdgeInsets.zero,
                                            leading: CircleAvatar(
                                              backgroundColor: index < 3
                                                  ? const Color(0xFFFFF8F0)
                                                  : const Color(0xFFF3F4F6),
                                              child: Text(
                                                '${index + 1}',
                                                style: TextStyle(
                                                  color: index < 3
                                                      ? const Color(0xFFE07A5F)
                                                      : Theme.of(context)
                                                          .colorScheme
                                                          .onSurface
                                                          .withOpacity(0.6),
                                                  fontWeight: FontWeight.bold,
                                                  fontSize: 12,
                                                ),
                                              ),
                                            ),
                                            title: Text(
                                              item['name'],
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                              style: TextStyle(
                                                fontWeight: FontWeight.w600,
                                                color: Theme.of(context)
                                                    .colorScheme
                                                    .onSurface,
                                              ),
                                            ),
                                            subtitle: Text(
                                              '${item['totalQty']} terjual',
                                              style: TextStyle(
                                                fontSize: 12,
                                                color: Theme.of(context)
                                                    .colorScheme
                                                    .onSurface
                                                    .withOpacity(0.6),
                                              ),
                                            ),
                                            trailing: Column(
                                              mainAxisAlignment:
                                                  MainAxisAlignment.center,
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.end,
                                              children: [
                                                Text(
                                                  formatCurrency(
                                                      item['totalRevenue']),
                                                  style: TextStyle(
                                                    fontWeight: FontWeight.bold,
                                                    fontSize: 12,
                                                    color: Theme.of(context)
                                                        .colorScheme
                                                        .primary,
                                                  ),
                                                ),
                                                if (profit != null &&
                                                    profit != 0)
                                                  Text(
                                                    '+ ${formatCurrency(profit)}${margin != null ? ' (${(margin * 100).toStringAsFixed(1)}%)' : ''}',
                                                    style: TextStyle(
                                                      fontSize: 11,
                                                      color: Theme.of(context)
                                                          .colorScheme
                                                          .onSurface
                                                          .withOpacity(0.7),
                                                    ),
                                                  ),
                                              ],
                                            ),
                                            onTap: () =>
                                                _showProductDetail(item),
                                          );
                                        }).toList(),
                                ),
                              ),
                            ],
                          ),
                        ).animate().fadeIn(delay: 600.ms),

                        const SizedBox(height: 48),
                      ]),
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildPaymentMethodsList() {
    return Column(
      children: _paymentMethods.map((pm) {
        final isCash = pm['paymentMethod'] == 'CASH';
        final colorScheme = Theme.of(context).colorScheme;
        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: colorScheme.surface,
            borderRadius: BorderRadius.circular(12),
            border:
                Border.all(color: colorScheme.outlineVariant.withOpacity(0.5)),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                    color:
                        Theme.of(context).colorScheme.primary.withOpacity(0.1),
                    shape: BoxShape.circle),
                child: Icon(
                    isCash ? Icons.payments_outlined : Icons.qr_code_scanner,
                    color: Theme.of(context).colorScheme.primary),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(pm['paymentMethod'] ?? 'Unknown',
                        style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Theme.of(context).colorScheme.onSurface)),
                    Text('${pm['count']} Transaksi',
                        style: TextStyle(
                            color: Theme.of(context)
                                .colorScheme
                                .onSurface
                                .withOpacity(0.6),
                            fontSize: 12)),
                  ],
                ),
              ),
              Text(
                formatCurrency((pm['totalAmount'] as num?)?.toDouble() ?? 0.0),
                style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                    color: Theme.of(context).colorScheme.onSurface),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildProductSalesChart() {
    if (_topProducts.isEmpty) {
      return const Center(child: Text('Belum ada data grafik produk'));
    }

    final spots = <BarChartGroupData>[];
    double maxRevenue = 0;
    final colors = [
      const Color(0xFFE07A5F),
      const Color(0xFF81B29A),
      const Color(0xFFF2CC8F),
      const Color(0xFF3D405B),
      const Color(0xFFE07A5F),
    ];

    for (int i = 0; i < _topProducts.length; i++) {
      final item = _topProducts[i];
      final revenue = (item['totalRevenue'] as num?)?.toDouble() ?? 0.0;
      if (revenue > maxRevenue) {
        maxRevenue = revenue;
      }
      spots.add(
        BarChartGroupData(
          x: i,
          barRods: [
            BarChartRodData(
              toY: revenue,
              gradient: LinearGradient(
                colors: [
                  colors[i % colors.length],
                  colors[i % colors.length].withOpacity(0.7),
                ],
                begin: Alignment.bottomCenter,
                end: Alignment.topCenter,
              ),
              borderRadius: BorderRadius.circular(6),
              width: 14,
            ),
          ],
        ),
      );
    }

    return BarChart(
      BarChartData(
        alignment: BarChartAlignment.spaceAround,
        maxY: maxRevenue <= 0 ? 1 : maxRevenue * 1.2,
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          horizontalInterval: maxRevenue <= 0 ? 1 : maxRevenue / 4,
          getDrawingHorizontalLine: (value) => FlLine(
            color: const Color(0xFFF3F4F6),
            strokeWidth: 1,
          ),
        ),
        barTouchData: BarTouchData(
          enabled: true,
          touchTooltipData: BarTouchTooltipData(
            tooltipPadding:
                const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
            tooltipRoundedRadius: 8,
            getTooltipItem: (group, groupIndex, rod, rodIndex) {
              final item = _topProducts[groupIndex];
              final name = item['name'] as String? ?? '';
              final qty = (item['totalQty'] as num?)?.toInt() ?? 0;
              final revenue = (item['totalRevenue'] as num?)?.toDouble() ?? 0.0;
              return BarTooltipItem(
                '$name\n',
                const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 11),
                children: [
                  TextSpan(
                    text: '${formatCurrency(revenue)}\n',
                    style: const TextStyle(
                        color: Colors.white70,
                        fontWeight: FontWeight.w500,
                        fontSize: 10),
                  ),
                  TextSpan(
                    text: '$qty terjual',
                    style: const TextStyle(
                        color: Colors.white70,
                        fontWeight: FontWeight.w400,
                        fontSize: 10),
                  ),
                ],
              );
            },
          ),
        ),
        titlesData: FlTitlesData(
          topTitles:
              const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles:
              const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 40,
              getTitlesWidget: (value, meta) {
                return Padding(
                  padding: const EdgeInsets.only(right: 4),
                  child: Text(
                    value == 0 ? '0' : '${(value / 1000).round()}k',
                    style: TextStyle(
                      fontSize: 10,
                      color: Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withOpacity(0.7),
                    ),
                  ),
                );
              },
            ),
          ),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              getTitlesWidget: (value, meta) {
                final idx = value.toInt();
                if (idx < 0 || idx >= _topProducts.length) {
                  return const SizedBox.shrink();
                }
                final name = _topProducts[idx]['name'] as String? ?? '';
                return Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    name,
                    style: TextStyle(
                      fontSize: 10,
                      color: Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withOpacity(0.7),
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    textAlign: TextAlign.center,
                  ),
                );
              },
              reservedSize: 40,
            ),
          ),
        ),
        borderData: FlBorderData(show: false),
        barGroups: spots,
      ),
    );
  }

  Widget _buildHourlyChart() {
    if (_hourlyStats.isEmpty) {
      return const Center(child: Text('Belum ada data jam sibuk'));
    }

    // Find max revenue for Y axis scaling
    double maxRev = 0;
    for (var s in _hourlyStats) {
      final r = (s['revenue'] as num?)?.toDouble() ?? 0.0;
      if (r > maxRev) maxRev = r;
    }
    if (maxRev == 0) maxRev = 100000;

    return BarChart(
      BarChartData(
        alignment: BarChartAlignment.spaceAround,
        maxY: maxRev * 1.2,
        barTouchData: BarTouchData(
          touchTooltipData: BarTouchTooltipData(
            getTooltipItem: (group, groupIndex, rod, rodIndex) {
              final hour = _hourlyStats[group.x.toInt()]['hour'];
              return BarTooltipItem(
                '$hour\n',
                const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
                children: <TextSpan>[
                  TextSpan(
                    text: formatCurrency(rod.toY),
                    style: const TextStyle(
                      color: Colors.yellow,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              );
            },
          ),
        ),
        titlesData: FlTitlesData(
          show: true,
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 30,
              getTitlesWidget: (value, meta) {
                final idx = value.toInt();
                if (idx < 0 || idx >= _hourlyStats.length) {
                  return const SizedBox.shrink();
                }
                // Show label every 4 hours to avoid clutter
                if (idx % 4 == 0) {
                  return Padding(
                    padding: const EdgeInsets.only(top: 8.0),
                    child: Text(
                      _hourlyStats[idx]['hour'].toString().substring(0, 2),
                      style: TextStyle(
                        color: Theme.of(context)
                            .colorScheme
                            .onSurface
                            .withOpacity(0.7),
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  );
                }
                return const SizedBox.shrink();
              },
            ),
          ),
          leftTitles:
              const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          topTitles:
              const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles:
              const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        ),
        gridData: const FlGridData(show: false),
        borderData: FlBorderData(show: false),
        barGroups: _hourlyStats.asMap().entries.map((e) {
          final idx = e.key;
          final val = (e.value['revenue'] as num?)?.toDouble() ?? 0.0;
          return BarChartGroupData(
            x: idx,
            barRods: [
              BarChartRodData(
                toY: val,
                color: Theme.of(context).colorScheme.primary,
                width: 8,
                borderRadius: BorderRadius.circular(4),
                backDrawRodData: BackgroundBarChartRodData(
                  show: true,
                  toY: maxRev * 1.2,
                  color: Theme.of(context).colorScheme.surfaceVariant,
                ),
              ),
            ],
          );
        }).toList(),
      ),
    );
  }

  Widget _buildCategoryPieChart() {
    if (_categorySales.isEmpty)
      return const Center(child: Text('Belum ada data'));

    return Stack(
      alignment: Alignment.center,
      children: [
        PieChart(
          PieChartData(
            pieTouchData: PieTouchData(
              touchCallback: (FlTouchEvent event, pieTouchResponse) {
                setState(() {
                  if (!event.isInterestedForInteractions ||
                      pieTouchResponse == null ||
                      pieTouchResponse.touchedSection == null) {
                    _touchedIndex = -1;
                    return;
                  }
                  _touchedIndex =
                      pieTouchResponse.touchedSection!.touchedSectionIndex;
                });
              },
            ),
            sectionsSpace: 2,
            centerSpaceRadius: 40,
            sections: _categorySales.asMap().entries.map((entry) {
              final index = entry.key;
              final data = entry.value;
              final value = (data['totalSales'] as num?)?.toDouble() ?? 0.0;
              final isTouched = index == _touchedIndex;
              final radius = isTouched ? 60.0 : 50.0;
              final totalGross =
                  (_summary['grossSales'] as num?)?.toDouble() ?? 0.0;

              final colors = [
                const Color(0xFFE07A5F), // Terra Cotta
                const Color(0xFF81B29A), // Sage Green
                const Color(0xFFF2CC8F), // Sunset Yellow
                const Color(0xFF3D405B), // Deep Blue
                const Color(0xFFE07A5F).withOpacity(0.7),
              ];

              return PieChartSectionData(
                color: colors[index % colors.length],
                value: value,
                title: isTouched
                    ? formatCurrency(value)
                    : '${((value / (totalGross > 0 ? totalGross : 1.0)) * 100).toStringAsFixed(0)}%',
                radius: radius,
                titleStyle: TextStyle(
                    fontSize: isTouched ? 10 : 12,
                    fontWeight: FontWeight.bold,
                    color: Colors.white),
                badgeWidget: isTouched ? _buildBadge(data['category']) : null,
                badgePositionPercentageOffset: .98,
              );
            }).toList(),
          ),
        ),
        // Center Info
        if (_touchedIndex != -1 && _touchedIndex < _categorySales.length)
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(_categorySales[_touchedIndex]['category'] ?? '',
                  style: const TextStyle(
                      fontWeight: FontWeight.bold, fontSize: 12)),
              // Text(currency.format(_categorySales[_touchedIndex]['totalSales']), style: const TextStyle(fontSize: 10, color: Color(0xFFE07A5F)),
            ],
          )
        else
          Text('Total',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.7),
              )),
      ],
    );
  }

  Widget _buildExpensePieChart() {
    if (_expenseCategories.isEmpty)
      return const Center(child: Text('Belum ada data pengeluaran'));

    final totalExp = (_summary['totalExpenses'] as num?)?.toDouble() ?? 1.0;

    return Stack(
      alignment: Alignment.center,
      children: [
        PieChart(
          PieChartData(
            pieTouchData: PieTouchData(
              touchCallback: (FlTouchEvent event, pieTouchResponse) {
                setState(() {
                  if (!event.isInterestedForInteractions ||
                      pieTouchResponse == null ||
                      pieTouchResponse.touchedSection == null) {
                    _touchedExpenseIndex = -1;
                    return;
                  }
                  _touchedExpenseIndex =
                      pieTouchResponse.touchedSection!.touchedSectionIndex;
                });
              },
            ),
            sectionsSpace: 2,
            centerSpaceRadius: 40,
            sections: _expenseCategories.asMap().entries.map((entry) {
              final index = entry.key;
              final data = entry.value;
              final value = (data['total'] as num?)?.toDouble() ?? 0.0;
              final isTouched = index == _touchedExpenseIndex;
              final radius = isTouched ? 60.0 : 50.0;

              // Different color palette for expenses (Red/Orange based)
              final colors = [
                const Color(0xFFE63946), // Red
                const Color(0xFFF4A261), // Sandy Brown
                const Color(0xFFE9C46A), // Saffron
                const Color(0xFF2A9D8F), // Persian Green (Contrast)
                const Color(0xFF264653), // Charcoal
              ];

              return PieChartSectionData(
                color: colors[index % colors.length],
                value: value,
                title: isTouched
                    ? formatCurrency(value)
                    : '${((value / totalExp) * 100).toStringAsFixed(0)}%',
                radius: radius,
                titleStyle: TextStyle(
                    fontSize: isTouched ? 10 : 12,
                    fontWeight: FontWeight.bold,
                    color: Colors.white),
                badgeWidget: isTouched
                    ? _buildBadge(_getCategoryLabel(data['category']))
                    : null,
                badgePositionPercentageOffset: .98,
              );
            }).toList(),
          ),
        ),
        // Center Info
        if (_touchedExpenseIndex != -1 &&
            _touchedExpenseIndex < _expenseCategories.length)
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                  _getCategoryLabel(
                      _expenseCategories[_touchedExpenseIndex]['category']),
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                      fontWeight: FontWeight.bold, fontSize: 10)),
            ],
          )
        else
          Text(
            'Total',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.7),
            ),
          ),
      ],
    );
  }

  Widget _buildBadge(String text) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(4),
        boxShadow: [
          BoxShadow(
            color: colorScheme.shadow.withOpacity(0.1),
            blurRadius: 4,
          )
        ],
      ),
      child: Text(text,
          style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: colorScheme.onSurface)),
    );
  }

  Widget _buildGradientCard(String title, double value, List<Color> colors,
      IconData icon, double? growth) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border:
            Border.all(color: colorScheme.outlineVariant.withOpacity(0.35)),
        boxShadow: [
          BoxShadow(
            color: colorScheme.shadow.withOpacity(0.08),
            blurRadius: 8,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(title,
                  style: TextStyle(
                      color: colorScheme.onSurface.withOpacity(0.8),
                      fontSize: 14,
                      fontWeight: FontWeight.w600)),
              Icon(icon, color: colorScheme.primary, size: 18),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            formatCurrency(value),
            style: TextStyle(
                color: colorScheme.onSurface,
                fontSize: 24,
                fontWeight: FontWeight.bold),
          ),
          if (growth != null) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                  color: colorScheme.primary.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(8)),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                      growth >= 0
                          ? Icons.arrow_upward_rounded
                          : Icons.arrow_downward_rounded,
                      color: colorScheme.primary,
                      size: 12),
                  const SizedBox(width: 4),
                  Text(
                    '${growth.abs().toStringAsFixed(1)}%',
                    style: TextStyle(
                        color: colorScheme.primary,
                        fontSize: 12,
                        fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            )
          ]
        ],
      ),
    );
  }

  Widget _buildSummaryCards() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isNarrow = constraints.maxWidth < 600;
        final itemWidth =
            isNarrow ? constraints.maxWidth : (constraints.maxWidth - 24) / 3;
        return Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            SizedBox(
                width: itemWidth,
                child: _buildGradientCard(
                    'Omzet',
                    (_summary['grossSales'] as num?)?.toDouble() ?? 0.0,
                    const [Color(0xFF4F46E5), Color(0xFF818CF8)],
                    Icons.attach_money,
                    (_growth['revenue'] as num?)?.toDouble())),
            SizedBox(
                width: itemWidth,
                child: _buildGradientCard(
                    'Biaya',
                    _summary['totalExpenses'] ?? 0.0,
                    const [Color(0xFFE07A5F), Color(0xFFF2A693)],
                    Icons.money_off,
                    (_growth['expenses'] as num?)?.toDouble())),
            SizedBox(width: itemWidth, child: _buildProfitCard()),
          ],
        );
      },
    );
  }

  Widget _buildProfitCard() {
    final omzet = (_summary['grossSales'] as num?)?.toDouble() ?? 0.0;
    final pengeluaran = (_summary['totalExpenses'] as num?)?.toDouble() ?? 0.0;
    double hpp = (_summary['totalCost'] as num?)?.toDouble() ?? 0.0;
    if (!hpp.isFinite || hpp < 0) hpp = 0.0;

    double labaBersih = omzet - hpp - pengeluaran;

    return LayoutBuilder(
      builder: (context, constraints) {
        final isNarrow = constraints.maxWidth < 360;
        final colorScheme = Theme.of(context).colorScheme;
        final valueStyle = TextStyle(
            color: colorScheme.onSurface,
            fontSize: isNarrow ? 11 : 12,
            fontWeight: FontWeight.w600);
        final labelStyle = TextStyle(
            color: colorScheme.onSurface.withOpacity(0.7),
            fontSize: isNarrow ? 11 : 12);
        final totalStyle = TextStyle(
            color: colorScheme.onSurface,
            fontSize: isNarrow ? 20 : 24,
            fontWeight: FontWeight.bold);

        Widget valueText(String s) => Flexible(
              child: Text(s,
                  style: valueStyle,
                  textAlign: TextAlign.right,
                  overflow: TextOverflow.ellipsis,
                  softWrap: false),
            );

        return Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: colorScheme.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
                color: colorScheme.outlineVariant.withOpacity(0.35)),
            boxShadow: [
              BoxShadow(
                color: colorScheme.shadow.withOpacity(0.08),
                blurRadius: 8,
                offset: const Offset(0, 4),
              )
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Laba Bersih',
                      style: TextStyle(
                          color: colorScheme.onSurface.withOpacity(0.8),
                          fontSize: 14,
                          fontWeight: FontWeight.w600)),
                  Icon(Icons.trending_up,
                      color: colorScheme.primary.withOpacity(0.8)),
                ],
              ),
              const SizedBox(height: 12),
              Text(formatCurrency(labaBersih), style: totalStyle),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(child: Text('Omzet', style: labelStyle)),
                  valueText(formatCurrency(omzet)),
                ],
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  Expanded(child: Text('HPP', style: labelStyle)),
                  valueText(formatCurrency(hpp)),
                ],
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  Expanded(child: Text('Pengeluaran', style: labelStyle)),
                  valueText(formatCurrency(pengeluaran)),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildStatTile(String title, String value, IconData icon) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: colorScheme.outlineVariant.withOpacity(0.35),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: colorScheme.primary, size: 20),
          const SizedBox(height: 8),
          Text(value,
              style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: colorScheme.onSurface)),
          const SizedBox(height: 4),
          Text(title,
              style: TextStyle(
                  color: colorScheme.onSurface.withOpacity(0.7), fontSize: 12)),
        ],
      ),
    );
  }

  Widget _buildChartLegend(String label, Color color) {
    return Row(
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 4),
        Text(label,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
      ],
    );
  }

  // Parse trend data for the chart
  // Data structure: [{date: 'YYYY-MM-DD', sales: 123.0, expenses: 50.0}, ...]
  Widget _buildSalesChart(List<Map<String, dynamic>> trendData) {
    if (trendData.isEmpty)
      return const Center(child: Text('Tidak ada data grafik'));

    // Map dates to 0..N indices for X axis
    List<FlSpot> salesSpots = [];
    List<FlSpot> expenseSpots = [];
    double maxVal = 0;

    for (int i = 0; i < trendData.length; i++) {
      final s = (trendData[i]['sales'] as num? ?? 0).toDouble();
      final e = (trendData[i]['expenses'] as num? ?? 0).toDouble();
      if (s > maxVal) maxVal = s;
      if (e > maxVal) maxVal = e;

      salesSpots.add(FlSpot(i.toDouble(), s));
      expenseSpots.add(FlSpot(i.toDouble(), e));
    }

    // Safety for maxVal
    if (maxVal <= 0) maxVal = 100000;
    final interval = maxVal / 4;

    return LineChart(
      LineChartData(
        minY: 0,
        maxY: maxVal * 1.2,
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          horizontalInterval: interval,
          getDrawingHorizontalLine: (value) =>
              const FlLine(color: Color(0xFFF3F4F6), strokeWidth: 1),
        ),
        titlesData: FlTitlesData(
          show: true,
          topTitles:
              const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles:
              const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
                showTitles: true,
                getTitlesWidget: (value, meta) {
                  int idx = value.toInt();
                  if (idx >= 0 && idx < trendData.length) {
                    String dateStr = trendData[idx]['date'] ?? '';
                    // Format YYYY-MM-DD to dd/MM
                    try {
                      final date = DateTime.parse(dateStr);
                      // Only show some labels to avoid crowding if many points
                      if (trendData.length > 10 && idx % 2 != 0)
                        return const SizedBox();

                      return Padding(
                        padding: const EdgeInsets.only(top: 8.0),
                        child: Text(
                          DateFormat('dd/MM').format(date),
                          style: TextStyle(
                            fontSize: 10,
                            color: Theme.of(context)
                                .colorScheme
                                .onSurface
                                .withOpacity(0.7),
                          ),
                        ),
                      );
                    } catch (_) {}
                  }
                  return const SizedBox();
                },
                interval: 1),
          ),
          leftTitles: const AxisTitles(
              sideTitles: SideTitles(
                  showTitles:
                      false)), // Hide Y axis numbers for cleaner look, use TouchTooltip
        ),
        borderData: FlBorderData(show: false),
        lineBarsData: [
          // Sales Line
          LineChartBarData(
            spots: salesSpots,
            isCurved: true,
            color: const Color(0xFF4F46E5),
            barWidth: 3,
            isStrokeCapRound: true,
            dotData: const FlDotData(show: false),
            belowBarData: BarAreaData(
              show: true,
              gradient: LinearGradient(
                colors: [
                  const Color(0xFF4F46E5).withOpacity(0.1),
                  const Color(0xFF4F46E5).withOpacity(0.0)
                ],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
            ),
          ),
          // Expense Line
          LineChartBarData(
            spots: expenseSpots,
            isCurved: true,
            color: const Color(0xFFEF4444),
            barWidth: 3,
            isStrokeCapRound: true,
            dotData: const FlDotData(show: false),
            belowBarData: BarAreaData(show: false),
          ),
        ],
        lineTouchData: LineTouchData(
          touchTooltipData: LineTouchTooltipData(
            getTooltipItems: (touchedSpots) {
              return touchedSpots.map((LineBarSpot touchedSpot) {
                final isSales = touchedSpot.barIndex == 0;
                return LineTooltipItem(
                  '${isSales ? "Penjualan" : "Pengeluaran"}: ${formatCurrency(touchedSpot.y)}',
                  TextStyle(
                      color: isSales
                          ? const Color(0xFFC7D2FE)
                          : const Color(0xFFFECaca),
                      fontWeight: FontWeight.bold,
                      fontSize: 12),
                );
              }).toList();
            },
          ),
        ),
      ),
    );
  }
}

class SalesForecastScreen extends StatefulWidget {
  final List<Map<String, dynamic>> trend;
  final DateTime periodStart;
  final DateTime periodEnd;
  final int? dailyTarget;

  const SalesForecastScreen({
    super.key,
    required this.trend,
    required this.periodStart,
    required this.periodEnd,
    required this.dailyTarget,
  });

  @override
  State<SalesForecastScreen> createState() => _SalesForecastScreenState();
}

class _SalesForecastScreenState extends State<SalesForecastScreen> {
  late final NumberFormat _currency;
  List<_ForecastPoint> _series = const [];
  List<_ForecastPoint> _forecast = const [];
  double? _mape7;
  bool _ready = false;

  @override
  void initState() {
    super.initState();
    _currency =
        NumberFormat.currency(locale: 'id_ID', symbol: '${MerchantConfig.defaultCurrencySymbol} ', decimalDigits: 0);
    _compute();
  }

  String _fmtCurrency(num v) {
    final value = v.isFinite ? v : 0.0;
    return _currency.format(value);
  }

  void _compute() {
    final history = _normalizeHistory(
      trend: widget.trend,
      start: DateTime(widget.periodStart.year, widget.periodStart.month,
          widget.periodStart.day),
      end: DateTime(
          widget.periodEnd.year, widget.periodEnd.month, widget.periodEnd.day),
    );

    final forecast = _forecastNext(
      history: history,
      horizonDays: 7,
    );

    final combined = <_ForecastPoint>[
      ...history.take(math.max(0, history.length - 21)),
      ...history.skip(math.max(0, history.length - 21)),
      ...forecast,
    ];

    final mape7 = _backtestMape(history: history, horizonDays: 7);

    setState(() {
      _forecast = forecast;
      _series = combined;
      _mape7 = mape7;
      _ready = true;
    });
  }

  List<_ForecastPoint> _normalizeHistory({
    required List<Map<String, dynamic>> trend,
    required DateTime start,
    required DateTime end,
  }) {
    final byDate = <String, double>{};
    for (final row in trend) {
      final dateStr = (row['date'] ?? '').toString();
      if (dateStr.isEmpty) continue;
      final parsed = DateTime.tryParse(dateStr);
      if (parsed == null) continue;
      final day = DateTime(parsed.year, parsed.month, parsed.day);
      final key = DateFormat('yyyy-MM-dd').format(day);
      final sales = (row['sales'] as num?)?.toDouble() ??
          (row['dailyTotal'] as num?)?.toDouble() ??
          0.0;
      byDate[key] = (byDate[key] ?? 0.0) + (sales.isFinite ? sales : 0.0);
    }

    final points = <_ForecastPoint>[];
    for (var d = start; !d.isAfter(end); d = d.add(const Duration(days: 1))) {
      final key = DateFormat('yyyy-MM-dd').format(d);
      points.add(_ForecastPoint(date: d, actual: byDate[key] ?? 0.0));
    }
    return points;
  }

  List<_ForecastPoint> _forecastNext({
    required List<_ForecastPoint> history,
    required int horizonDays,
  }) {
    if (history.isEmpty) return const [];

    final values = history.map((p) => p.actual ?? 0.0).toList();
    final avg = values.isEmpty
        ? 0.0
        : values.reduce((a, b) => a + b) / math.max(1, values.length);

    final weekdaySum = List<double>.filled(8, 0.0);
    final weekdayCount = List<int>.filled(8, 0);
    for (final p in history) {
      final w = p.date.weekday;
      weekdaySum[w] += (p.actual ?? 0.0);
      weekdayCount[w] += 1;
    }

    final weekdayFactor = List<double>.filled(8, 1.0);
    for (var w = 1; w <= 7; w++) {
      final wAvg = weekdayCount[w] == 0 ? avg : weekdaySum[w] / weekdayCount[w];
      final factor = avg <= 0 ? 1.0 : (wAvg / avg);
      weekdayFactor[w] = factor.clamp(0.5, 1.8);
    }

    const alpha = 0.35;
    var level = history.first.actual ?? 0.0;
    for (var i = 1; i < history.length; i++) {
      level = alpha * (history[i].actual ?? 0.0) + (1 - alpha) * level;
    }

    final k = math.min(14, history.length - 1);
    final diffs = <double>[];
    if (k > 1) {
      for (var i = history.length - k; i < history.length; i++) {
        final prev = history[i - 1].actual ?? 0.0;
        diffs.add((history[i].actual ?? 0.0) - prev);
      }
    }
    diffs.sort();
    final slope = diffs.isEmpty
        ? 0.0
        : diffs[diffs.length ~/ 2].clamp(-avg * 0.2, avg * 0.2);

    final residuals = <double>[];
    var rollingLevel = history.first.actual ?? 0.0;
    for (var i = 1; i < history.length; i++) {
      final pred =
          (rollingLevel + slope) * weekdayFactor[history[i].date.weekday];
      residuals.add((history[i].actual ?? 0.0) - pred);
      rollingLevel =
          alpha * (history[i].actual ?? 0.0) + (1 - alpha) * rollingLevel;
    }
    final std = _stdDev(residuals);
    final interval = std.isFinite ? (1.28 * std).abs() : 0.0;

    final out = <_ForecastPoint>[];
    final lastDay = history.last.date;
    for (var h = 1; h <= horizonDays; h++) {
      final day = lastDay.add(Duration(days: h));
      final base = (level + slope * h) * weekdayFactor[day.weekday];
      final y = base.isFinite ? base : 0.0;
      out.add(
        _ForecastPoint(
          date: day,
          actual: null,
          predicted: math.max(0.0, y),
          lower: math.max(0.0, y - interval),
          upper: math.max(0.0, y + interval),
        ),
      );
    }
    return out;
  }

  double? _backtestMape({
    required List<_ForecastPoint> history,
    required int horizonDays,
  }) {
    if (history.length < 10) return null;
    final testDays = math.min(horizonDays, history.length - 3);
    if (testDays <= 0) return null;

    double apeSum = 0.0;
    int n = 0;

    for (var i = history.length - testDays; i < history.length; i++) {
      final train = history.sublist(0, i);
      final pred = _forecastNext(history: train, horizonDays: 1);
      if (pred.isEmpty) continue;
      final yHat = pred.first.predicted ?? 0.0;
      final y = history[i].actual ?? 0.0;
      if (y <= 0) continue;
      apeSum += ((y - yHat).abs() / y);
      n += 1;
    }

    if (n == 0) return null;
    return (apeSum / n) * 100.0;
  }

  double _stdDev(List<double> xs) {
    if (xs.length < 2) return 0.0;
    final mean = xs.reduce((a, b) => a + b) / xs.length;
    var sumSq = 0.0;
    for (final x in xs) {
      final d = x - mean;
      sumSq += d * d;
    }
    return math.sqrt(sumSq / (xs.length - 1));
  }

  @override
  Widget build(BuildContext context) {
    final totalForecast =
        _forecast.fold<double>(0.0, (sum, p) => sum + (p.predicted ?? 0.0));
    final tomorrow = _forecast.isEmpty ? null : _forecast.first.predicted;
    final target = widget.dailyTarget;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Prediksi Penjualan'),
      ),
      body: !_ready
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surface,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: Theme.of(context)
                            .colorScheme
                            .shadow
                            .withOpacity(0.25),
                        blurRadius: 12,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Periode data: ${DateFormat('d MMM yyyy').format(widget.periodStart)} – ${DateFormat('d MMM yyyy').format(widget.periodEnd)}',
                        style: TextStyle(
                            fontSize: 12,
                            color: Theme.of(context)
                                .colorScheme
                                .onSurface
                                .withOpacity(0.7)),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: _miniStat(
                              label: 'Prediksi besok',
                              value: tomorrow == null
                                  ? '-'
                                  : _fmtCurrency(tomorrow),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _miniStat(
                              label: 'Total 7 hari',
                              value: _fmtCurrency(totalForecast),
                            ),
                          ),
                        ],
                      ),
                      if (_mape7 != null) ...[
                        const SizedBox(height: 10),
                        Text(
                          'Estimasi akurasi 7 hari (MAPE): ${_mape7!.toStringAsFixed(1)}%',
                          style: TextStyle(
                            fontSize: 12,
                            color: Theme.of(context)
                                .colorScheme
                                .onSurface
                                .withOpacity(0.7),
                          ),
                        ),
                      ],
                      if (target != null && target > 0 && tomorrow != null) ...[
                        const SizedBox(height: 10),
                        _targetHint(
                            target: target.toDouble(), tomorrow: tomorrow),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'Grafik penjualan & prediksi',
                  style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Theme.of(context).colorScheme.onSurface),
                ),
                const SizedBox(height: 12),
                Container(
                  height: 320,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surface,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: Theme.of(context)
                            .colorScheme
                            .shadow
                            .withOpacity(0.25),
                        blurRadius: 12,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: _buildForecastChart(),
                ),
                const SizedBox(height: 16),
                _buildForecastTable(),
              ],
            ),
    );
  }

  Widget _miniStat({required String label, required String value}) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceVariant,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
            color: Theme.of(context).colorScheme.outline.withOpacity(0.18)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: TextStyle(
                  fontSize: 12,
                  color: Theme.of(context)
                      .colorScheme
                      .onSurface
                      .withOpacity(0.7))),
          const SizedBox(height: 6),
          Text(
            value,
            style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).colorScheme.onSurface),
          ),
        ],
      ),
    );
  }

  Widget _targetHint({required double target, required double tomorrow}) {
    final pct = target <= 0 ? 0.0 : (tomorrow / target);
    final meets = pct >= 1.0;
    final text = meets
        ? 'Prediksi besok berpotensi melampaui target harian.'
        : 'Prediksi besok sekitar ${(pct * 100).clamp(0, 999).toStringAsFixed(0)}% dari target harian.';
    return Row(
      children: [
        Icon(meets ? Icons.check_circle : Icons.info_outline,
            size: 16,
            color: meets
                ? Theme.of(context).colorScheme.primary
                : Theme.of(context).colorScheme.onSurface.withOpacity(0.7)),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            text,
            style: TextStyle(
                fontSize: 12,
                color:
                    Theme.of(context).colorScheme.onSurface.withOpacity(0.7)),
          ),
        ),
      ],
    );
  }

  Widget _buildForecastChart() {
    if (_series.isEmpty) {
      return const Center(child: Text('Belum ada data'));
    }

    final pointsToShow =
        _series.length > 30 ? _series.sublist(_series.length - 30) : _series;

    final actualSpots = <FlSpot>[];
    final forecastSpots = <FlSpot>[];
    final lowerSpots = <FlSpot>[];
    final upperSpots = <FlSpot>[];

    double maxY = 0.0;
    for (var i = 0; i < pointsToShow.length; i++) {
      final p = pointsToShow[i];
      final a = p.actual;
      final f = p.predicted;
      if (a != null) {
        actualSpots.add(FlSpot(i.toDouble(), a));
        maxY = math.max(maxY, a);
      }
      if (f != null) {
        forecastSpots.add(FlSpot(i.toDouble(), f));
        maxY = math.max(maxY, f);
      }
      if (p.lower != null && p.upper != null) {
        lowerSpots.add(FlSpot(i.toDouble(), p.lower!));
        upperSpots.add(FlSpot(i.toDouble(), p.upper!));
        maxY = math.max(maxY, p.upper!);
      }
    }

    final intervalY = maxY <= 0 ? 1.0 : maxY;

    return LineChart(
      LineChartData(
        minY: 0,
        maxY: intervalY * 1.1,
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          getDrawingHorizontalLine: (value) => FlLine(
              color:
                  Theme.of(context).colorScheme.outlineVariant.withOpacity(0.4),
              strokeWidth: 1),
        ),
        borderData: FlBorderData(show: false),
        titlesData: FlTitlesData(
          topTitles:
              const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles:
              const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          leftTitles:
              const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              interval: pointsToShow.length > 12 ? 2 : 1,
              getTitlesWidget: (value, meta) {
                final idx = value.toInt();
                if (idx < 0 || idx >= pointsToShow.length) {
                  return const SizedBox();
                }
                return Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(
                    DateFormat('dd/MM').format(pointsToShow[idx].date),
                    style: TextStyle(
                        fontSize: 10,
                        color: Theme.of(context)
                            .colorScheme
                            .onSurface
                            .withOpacity(0.7)),
                  ),
                );
              },
            ),
          ),
        ),
        lineTouchData: LineTouchData(
          touchTooltipData: LineTouchTooltipData(
            getTooltipItems: (touchedSpots) {
              return touchedSpots.map((s) {
                final isForecast = s.barIndex == 1;
                final label = isForecast ? 'Prediksi' : 'Aktual';
                return LineTooltipItem(
                  '$label: ${_fmtCurrency(s.y)}',
                  TextStyle(
                    color: isForecast
                        ? const Color(0xFFFECACA)
                        : const Color(0xFFC7D2FE),
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                );
              }).toList();
            },
          ),
        ),
        lineBarsData: [
          LineChartBarData(
            spots: actualSpots,
            isCurved: true,
            color: const Color(0xFF4F46E5),
            barWidth: 3,
            dotData: const FlDotData(show: false),
            belowBarData: BarAreaData(
              show: true,
              gradient: LinearGradient(
                colors: [
                  const Color(0xFF4F46E5).withOpacity(0.10),
                  const Color(0xFF4F46E5).withOpacity(0.0),
                ],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
            ),
          ),
          LineChartBarData(
            spots: forecastSpots,
            isCurved: true,
            color: const Color(0xFFEF4444),
            barWidth: 3,
            dotData: const FlDotData(show: true),
            belowBarData: BarAreaData(show: false),
          ),
          if (lowerSpots.isNotEmpty && upperSpots.isNotEmpty) ...[
            LineChartBarData(
              spots: upperSpots,
              isCurved: true,
              color: const Color(0xFFEF4444).withOpacity(0.20),
              barWidth: 1,
              dotData: const FlDotData(show: false),
              belowBarData: BarAreaData(show: false),
            ),
            LineChartBarData(
              spots: lowerSpots,
              isCurved: true,
              color: const Color(0xFFEF4444).withOpacity(0.20),
              barWidth: 1,
              dotData: const FlDotData(show: false),
              belowBarData: BarAreaData(show: false),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildForecastTable() {
    if (_forecast.isEmpty) return const SizedBox.shrink();
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Theme.of(context).colorScheme.shadow.withOpacity(0.1),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Rincian 7 hari ke depan',
            style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).colorScheme.onSurface),
          ),
          const SizedBox(height: 12),
          ..._forecast.map((p) {
            final y = p.predicted ?? 0.0;
            final range = (p.lower != null && p.upper != null)
                ? '${_fmtCurrency(p.lower!)} – ${_fmtCurrency(p.upper!)}'
                : '-';
            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      DateFormat('EEE, d MMM').format(p.date),
                      style: TextStyle(
                          fontSize: 13,
                          color: Theme.of(context).colorScheme.onSurface),
                    ),
                  ),
                  Text(
                    _fmtCurrency(y),
                    style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).colorScheme.onSurface),
                  ),
                  const SizedBox(width: 12),
                  SizedBox(
                    width: 140,
                    child: Text(
                      range,
                      textAlign: TextAlign.right,
                      style: TextStyle(
                          fontSize: 11,
                          color: Theme.of(context)
                              .colorScheme
                              .onSurface
                              .withOpacity(0.7)),
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }
}

class ProductSalesDetailSheet extends StatefulWidget {
  final Map<String, dynamic> product;
  final String? productId;
  final DateTime start;
  final DateTime end;

  const ProductSalesDetailSheet({
    super.key,
    required this.product,
    required this.productId,
    required this.start,
    required this.end,
  });

  @override
  State<ProductSalesDetailSheet> createState() =>
      _ProductSalesDetailSheetState();
}

class _ProductSalesDetailSheetState extends State<ProductSalesDetailSheet> {
  bool _loading = true;
  List<Map<String, dynamic>> _daily = const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (widget.productId == null) {
      setState(() {
        _loading = false;
        _daily = const [];
      });
      return;
    }
    final data = await DatabaseHelper.instance.getProductSalesDetail(
      productId: widget.productId!,
      start: widget.start,
      end: widget.end,
    );
    if (!mounted) return;
    setState(() {
      _daily = data;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final currencyLocal =
        NumberFormat.currency(locale: 'id_ID', symbol: '${MerchantConfig.defaultCurrencySymbol} ', decimalDigits: 0);
    String fmt(num? v) {
      final d = (v ?? 0).toDouble();
      final safe = d.isFinite ? d : 0.0;
      return currencyLocal.format(safe);
    }

    final name = widget.product['name']?.toString() ?? '';
    final qty = (widget.product['totalQty'] as num?)?.toInt() ?? 0;
    final revenue = (widget.product['totalRevenue'] as num?)?.toDouble() ?? 0.0;
    final profit = (widget.product['totalProfit'] as num?)?.toDouble() ?? 0.0;
    final margin = (widget.product['profitMargin'] as num?)?.toDouble() ?? 0.0;
    final marginPct = revenue > 0 ? (profit / revenue * 100) : (margin * 100);

    final colorScheme = Theme.of(context).colorScheme;
    final df = DateFormat('dd MMM', 'id_ID');

    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Container(
        decoration: BoxDecoration(
          color: Theme.of(context).scaffoldBackgroundColor,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        ),
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        child: SafeArea(
          top: false,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: colorScheme.outlineVariant.withOpacity(0.6),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: colorScheme.primary.withOpacity(0.08),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(Icons.shopping_bag_outlined,
                        color: colorScheme.primary),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          name,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: colorScheme.onSurface,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '$qty terjual pada periode ini',
                          style: TextStyle(
                            fontSize: 12,
                            color: colorScheme.onSurface.withOpacity(0.7),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: colorScheme.surfaceVariant,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Omzet',
                            style: TextStyle(
                              fontSize: 11,
                              color: colorScheme.onSurface.withOpacity(0.7),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            fmt(revenue),
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: colorScheme.onSurface,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: colorScheme.surfaceVariant,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Laba',
                            style: TextStyle(
                              fontSize: 11,
                              color: colorScheme.onSurface.withOpacity(0.7),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            fmt(profit),
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: colorScheme.onSurface,
                            ),
                          ),
                          if (revenue > 0 || margin > 0)
                            Padding(
                              padding: const EdgeInsets.only(top: 2),
                              child: Text(
                                '${marginPct.toStringAsFixed(1)}% margin',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: colorScheme.onSurface.withOpacity(0.7),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              if (widget.productId == null)
                Text(
                  'Detail harian hanya tersedia untuk data yang tersimpan di perangkat.',
                  style: TextStyle(
                    fontSize: 12,
                    color: colorScheme.onSurface.withOpacity(0.7),
                  ),
                )
              else if (_loading)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 24),
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (_daily.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  child: Text(
                    'Belum ada breakdown harian untuk periode ini.',
                    style: TextStyle(
                      fontSize: 12,
                      color: colorScheme.onSurface.withOpacity(0.7),
                    ),
                  ),
                )
              else
                SizedBox(
                  height: 220,
                  child: ListView.separated(
                    itemCount: _daily.length,
                    separatorBuilder: (_, __) => const Divider(height: 12),
                    itemBuilder: (ctx, i) {
                      final row = _daily[i];
                      final dateStr = row['date']?.toString() ?? '';
                      DateTime? date;
                      try {
                        date = DateTime.parse(dateStr);
                      } catch (_) {}
                      final qtyDay = (row['totalQty'] as num?)?.toInt() ?? 0;
                      final revDay =
                          (row['totalRevenue'] as num?)?.toDouble() ?? 0.0;
                      final profDay =
                          (row['totalProfit'] as num?)?.toDouble() ?? 0.0;
                      final mDay = revDay > 0 ? (profDay / revDay * 100) : 0.0;
                      return Row(
                        children: [
                          Expanded(
                            flex: 2,
                            child: Text(
                              date != null ? df.format(date) : dateStr,
                              style: TextStyle(
                                fontSize: 12,
                                color: colorScheme.onSurface.withOpacity(0.8),
                              ),
                            ),
                          ),
                          Expanded(
                            flex: 2,
                            child: Text(
                              '$qtyDay pcs',
                              style: TextStyle(
                                fontSize: 12,
                                color: colorScheme.onSurface.withOpacity(0.7),
                              ),
                            ),
                          ),
                          Expanded(
                            flex: 3,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(
                                  fmt(revDay),
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w500,
                                    color: colorScheme.onSurface,
                                  ),
                                ),
                                Text(
                                  '+ ${fmt(profDay)} (${mDay.toStringAsFixed(1)}%)',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color:
                                        colorScheme.onSurface.withOpacity(0.7),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: Text(
                    'Tutup',
                    style: TextStyle(
                      color: colorScheme.onSurface.withOpacity(0.8),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class CustomerAnalysisScreen extends StatelessWidget {
  final Map<String, dynamic> summary;
  final List<Map<String, dynamic>> trend;
  final List<Map<String, dynamic>> topProducts;
  final List<Map<String, dynamic>> categorySales;
  final List<Map<String, dynamic>> paymentMethods;
  final List<Map<String, dynamic>> hourlyStats;
  final DateTime periodStart;
  final DateTime periodEnd;

  CustomerAnalysisScreen({
    super.key,
    required this.summary,
    required this.trend,
    required this.topProducts,
    required this.categorySales,
    required this.paymentMethods,
    required this.hourlyStats,
    required this.periodStart,
    required this.periodEnd,
  });

  final NumberFormat _currency =
      NumberFormat.currency(locale: 'id_ID', symbol: '${MerchantConfig.defaultCurrencySymbol} ', decimalDigits: 0);

  String _fmtCurrency(num v) {
    final value = v.isFinite ? v : 0.0;
    return _currency.format(value);
  }

  @override
  Widget build(BuildContext context) {
    final totalTransactions =
        (summary['totalTransactions'] as num?)?.toInt() ?? 0;
    final aov = (summary['averageOrderValue'] as num?)?.toDouble() ?? 0.0;
    final gross = (summary['grossSales'] as num?)?.toDouble() ?? 0.0;

    final topPay = _topPayment();
    final topCat = _topCategories();
    final topHours = _topHours();
    final weekday = _weekdayPattern();

    return Scaffold(
      appBar: AppBar(
          title: Text('Analisis Pelanggan',
              style:
                  TextStyle(color: Theme.of(context).colorScheme.onSurface))),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Theme.of(context).colorScheme.shadow.withOpacity(0.06),
                  blurRadius: 12,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Periode: ${DateFormat('d MMM yyyy').format(periodStart)} – ${DateFormat('d MMM yyyy').format(periodEnd)}',
                  style: TextStyle(
                    fontSize: 12,
                    color: Theme.of(context)
                        .colorScheme
                        .onSurface
                        .withOpacity(0.7),
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: _metricTile(
                        context,
                        'Transaksi',
                        '$totalTransactions',
                        Icons.receipt_long,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _metricTile(
                        context,
                        'Rata-rata order',
                        _fmtCurrency(aov),
                        Icons.shopping_basket_outlined,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                _metricTile(
                  context,
                  'Omzet periode',
                  _fmtCurrency(gross),
                  Icons.attach_money,
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Preferensi',
            style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).colorScheme.onSurface),
          ),
          const SizedBox(height: 12),
          _infoCard(
            context,
            title: 'Metode pembayaran favorit',
            icon: Icons.credit_card,
            children: [
              if (topPay == null)
                const Text('Belum ada data pembayaran.')
              else
                Text('${topPay.label} • ${topPay.share.toStringAsFixed(0)}%'),
            ],
          ),
          const SizedBox(height: 12),
          _infoCard(
            context,
            title: 'Kategori paling diminati',
            icon: Icons.category_outlined,
            children: [
              if (topCat.isEmpty)
                const Text('Belum ada data kategori.')
              else
                ...topCat.map((c) => Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child:
                          Text('${c.label} • ${c.share.toStringAsFixed(0)}%'),
                    )),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            'Kebiasaan belanja',
            style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).colorScheme.onSurface),
          ),
          const SizedBox(height: 12),
          _infoCard(
            context,
            title: 'Jam tersibuk',
            icon: Icons.schedule,
            children: [
              if (topHours.isEmpty)
                const Text('Belum ada data jam transaksi.')
              else
                ...topHours.map((h) => Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: Text('${h.label} • ${_fmtCurrency(h.value)}'),
                    )),
            ],
          ),
          const SizedBox(height: 12),
          if (hourlyStats.isNotEmpty)
            _chartCard(
              context,
              title: 'Sebaran omzet per jam',
              child: _hourlyBarChart(context),
            ),
          const SizedBox(height: 12),
          _infoCard(
            context,
            title: 'Hari paling ramai',
            icon: Icons.calendar_month,
            children: [
              if (weekday.isEmpty)
                const Text('Belum ada data tren harian.')
              else
                ...weekday.map((d) => Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child:
                          Text('${d.label} • ${d.share.toStringAsFixed(0)}%'),
                    )),
            ],
          ),
          const SizedBox(height: 12),
          _chartCard(
            context,
            title: 'Produk favorit',
            child: _topProductsList(context),
          ),
          const SizedBox(height: 16),
          Text(
            'Segmentasi Pelanggan (RFM)',
            style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).colorScheme.onSurface),
          ),
          const SizedBox(height: 12),
          FutureBuilder<Map<String, dynamic>>(
            future: AiService()
                .computeRfmSegments(start: periodStart, end: periodEnd),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }
              final data = Map<String, dynamic>.from(snapshot.data ?? {});
              final summary =
                  Map<String, int>.from(data['summary'] ?? <String, int>{});
              final segments = Map<String, List<Map<String, dynamic>>>.from(
                  data['segments'] ?? <String, List<Map<String, dynamic>>>{});
              return _infoCard(
                context,
                title: 'Ringkasan RFM',
                icon: Icons.groups_2_outlined,
                children: [
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final k in ['Champion', 'Loyal', 'Potential', 'AtRisk', 'Hibernating'])
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: Theme.of(context)
                                .colorScheme
                                .surfaceVariant,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            '$k • ${summary[k] ?? 0}',
                            style: TextStyle(
                                fontSize: 12,
                                color: Theme.of(context)
                                    .colorScheme
                                    .onSurface),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text('Contoh pelanggan Champion', style: const TextStyle(fontSize: 13)),
                  const SizedBox(height: 6),
                  ...List<Map<String, dynamic>>.from(segments['Champion'] ?? const [])
                      .map((c) => Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Text(c['name']?.toString() ?? '',
                                    style: TextStyle(
                                        fontSize: 12,
                                        color: Theme.of(context)
                                            .colorScheme
                                            .onSurface)),
                              ),
                              Text(
                                'F${c['frequency']} • Rp ${(c['monetary'] as num?)?.toInt() ?? 0}',
                                style: TextStyle(
                                    fontSize: 12,
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onSurface
                                        .withOpacity(0.7)),
                              ),
                            ],
                          )),
                ],
              );
            },
          ),
          const SizedBox(height: 16),
          Text(
            'Pelanggan berisiko churn',
            style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).colorScheme.onSurface),
          ),
          const SizedBox(height: 12),
          FutureBuilder<List<Map<String, dynamic>>>(
            future: AiService()
                .computeChurnScores(start: periodStart, end: periodEnd),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }
              final items =
                  List<Map<String, dynamic>>.from(snapshot.data ?? const []);
              if (items.isEmpty) {
                return _infoCard(
                  context,
                  title: 'Risiko churn',
                  icon: Icons.report_gmailerrorred_outlined,
                  children: const [Text('Belum ada pelanggan berisiko tinggi')],
                );
              }
              return _infoCard(
                context,
                title: 'Daftar pelanggan berisiko',
                icon: Icons.report_gmailerrorred_outlined,
                children: items
                    .map((c) => Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(c['name']?.toString() ?? '',
                                  style: TextStyle(
                                      fontSize: 12,
                                      color: Theme.of(context)
                                          .colorScheme
                                          .onSurface)),
                            ),
                            Text(
                              'Terakhir ${(c['lastVisit'] as DateTime?) != null ? DateFormat('d MMM', 'id_ID').format(c['lastVisit'] as DateTime) : '-'} • Skor ${(c['riskScore'] as num?)?.toStringAsFixed(2) ?? '0'}',
                              style: TextStyle(
                                  fontSize: 12,
                                  color: Theme.of(context)
                                      .colorScheme
                                      .onSurface
                                      .withOpacity(0.7)),
                            ),
                          ],
                        ))
                    .toList(),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _metricTile(
      BuildContext context, String label, String value, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Theme.of(context).colorScheme.outlineVariant.withOpacity(0.35),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surfaceVariant,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: Theme.of(context)
                    .colorScheme
                    .outlineVariant
                    .withOpacity(0.35),
              ),
            ),
            child: Icon(icon, size: 18, color: const Color(0xFFE07A5F)),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: TextStyle(
                        fontSize: 12,
                        color: Theme.of(context)
                            .colorScheme
                            .onSurface
                            .withOpacity(0.7))),
                const SizedBox(height: 4),
                Text(
                  value,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: Theme.of(context).colorScheme.onSurface),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _infoCard(
    BuildContext context, {
    required String title,
    required IconData icon,
    required List<Widget> children,
  }) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: colorScheme.shadow.withOpacity(0.06),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: const Color(0xFFE07A5F)),
              const SizedBox(width: 8),
              Text(
                title,
                style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: colorScheme.onSurface),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...children.map((w) => DefaultTextStyle.merge(
                style: TextStyle(
                    fontSize: 13,
                    color: colorScheme.onSurface.withOpacity(0.9)),
                child: w,
              )),
        ],
      ),
    );
  }

  Widget _chartCard(BuildContext context,
      {required String title, required Widget child}) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: colorScheme.shadow.withOpacity(0.06),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: colorScheme.onSurface),
          ),
          const SizedBox(height: 12),
          SizedBox(height: 220, child: child),
        ],
      ),
    );
  }

  _LabeledShare? _topPayment() {
    if (paymentMethods.isEmpty) return null;
    double total = 0.0;
    for (final pm in paymentMethods) {
      total += (pm['totalAmount'] as num?)?.toDouble() ?? 0.0;
    }
    if (total <= 0) return null;
    final sorted = [...paymentMethods];
    sorted.sort((a, b) => ((b['totalAmount'] as num?)?.toDouble() ?? 0.0)
        .compareTo((a['totalAmount'] as num?)?.toDouble() ?? 0.0));
    final top = sorted.first;
    final label = (top['paymentMethod'] ?? 'UNKNOWN').toString();
    final amount = (top['totalAmount'] as num?)?.toDouble() ?? 0.0;
    return _LabeledShare(
        label: label, share: (amount / total) * 100, value: amount);
  }

  List<_LabeledShare> _topCategories() {
    if (categorySales.isEmpty) return const [];
    double total = 0.0;
    for (final c in categorySales) {
      total += (c['totalSales'] as num?)?.toDouble() ??
          (c['revenue'] as num?)?.toDouble() ??
          0.0;
    }
    if (total <= 0) return const [];

    final sorted = [...categorySales];
    sorted.sort((a, b) => ((b['totalSales'] as num?)?.toDouble() ??
            (b['revenue'] as num?)?.toDouble() ??
            0.0)
        .compareTo(((a['totalSales'] as num?)?.toDouble() ??
            (a['revenue'] as num?)?.toDouble() ??
            0.0)));

    return sorted.take(3).map((c) {
      final label = (c['category'] ?? '').toString();
      final amount = (c['totalSales'] as num?)?.toDouble() ??
          (c['revenue'] as num?)?.toDouble() ??
          0.0;
      return _LabeledShare(
          label: label.isEmpty ? '-' : label,
          share: (amount / total) * 100,
          value: amount);
    }).toList();
  }

  List<_LabeledShare> _topHours() {
    if (hourlyStats.isEmpty) return const [];
    final sorted = [...hourlyStats];
    sorted.sort((a, b) => ((b['revenue'] as num?)?.toDouble() ?? 0.0)
        .compareTo((a['revenue'] as num?)?.toDouble() ?? 0.0));
    return sorted.take(3).map((h) {
      final label = (h['hour'] ?? '-').toString();
      final value = (h['revenue'] as num?)?.toDouble() ?? 0.0;
      return _LabeledShare(label: label, share: 0, value: value);
    }).toList();
  }

  List<_LabeledShare> _weekdayPattern() {
    if (trend.isEmpty) return const [];
    final sum = List<double>.filled(8, 0.0);
    double total = 0.0;

    for (final row in trend) {
      final dateStr = (row['date'] ?? '').toString();
      final parsed = DateTime.tryParse(dateStr);
      if (parsed == null) continue;
      final day = DateTime(parsed.year, parsed.month, parsed.day);
      final sales = (row['sales'] as num?)?.toDouble() ??
          (row['dailyTotal'] as num?)?.toDouble() ??
          0.0;
      final v = sales.isFinite ? sales : 0.0;
      sum[day.weekday] += v;
      total += v;
    }

    if (total <= 0) return const [];
    final labels = <int, String>{
      1: 'Senin',
      2: 'Selasa',
      3: 'Rabu',
      4: 'Kamis',
      5: 'Jumat',
      6: 'Sabtu',
      7: 'Minggu',
    };
    final out = <_LabeledShare>[];
    for (var w = 1; w <= 7; w++) {
      out.add(_LabeledShare(
          label: labels[w] ?? '$w',
          share: (sum[w] / total) * 100,
          value: sum[w]));
    }
    out.sort((a, b) => b.share.compareTo(a.share));
    return out.take(3).toList();
  }

  Widget _hourlyBarChart(BuildContext context) {
    final sorted = [...hourlyStats];
    sorted.sort((a, b) =>
        (a['hour'] ?? '').toString().compareTo((b['hour'] ?? '').toString()));

    final bars = <BarChartGroupData>[];
    double maxY = 0.0;
    for (var i = 0; i < sorted.length; i++) {
      final v = (sorted[i]['revenue'] as num?)?.toDouble() ?? 0.0;
      maxY = math.max(maxY, v);
      bars.add(
        BarChartGroupData(
          x: i,
          barRods: [
            BarChartRodData(
              toY: v,
              width: 10,
              borderRadius: BorderRadius.circular(4),
              gradient: LinearGradient(
                colors: [
                  const Color(0xFFE07A5F),
                  const Color(0xFFF2A693),
                ],
                begin: Alignment.bottomCenter,
                end: Alignment.topCenter,
              ),
            ),
          ],
        ),
      );
    }

    return BarChart(
      BarChartData(
        maxY: maxY <= 0 ? 1.0 : maxY * 1.15,
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          getDrawingHorizontalLine: (value) =>
              const FlLine(color: Color(0xFFF3F4F6), strokeWidth: 1),
        ),
        borderData: FlBorderData(show: false),
        titlesData: FlTitlesData(
          topTitles:
              const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles:
              const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          leftTitles:
              const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              interval: sorted.length > 10 ? 2 : 1,
              getTitlesWidget: (value, meta) {
                final idx = value.toInt();
                if (idx < 0 || idx >= sorted.length) return const SizedBox();
                final label = (sorted[idx]['hour'] ?? '').toString();
                if (label.isEmpty) return const SizedBox();
                return Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(
                    label.replaceAll(':00', ''),
                    style: TextStyle(
                      fontSize: 10,
                      color: Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withOpacity(0.7),
                    ),
                  ),
                );
              },
            ),
          ),
        ),
        barGroups: bars,
      ),
    );
  }

  Widget _topProductsList(BuildContext context) {
    if (topProducts.isEmpty) {
      return const Center(child: Text('Belum ada data produk'));
    }

    final items = topProducts.take(6).toList();

    return ListView.separated(
      itemCount: items.length,
      separatorBuilder: (_, __) => const Divider(height: 16),
      itemBuilder: (context, index) {
        final p = items[index];
        final name = (p['name'] ?? '').toString();
        final qty = (p['totalQty'] as num?)?.toInt() ??
            (p['quantity'] as num?)?.toInt() ??
            0;
        final rev = (p['totalRevenue'] as num?)?.toDouble() ??
            (p['revenue'] as num?)?.toDouble() ??
            0.0;
        return Row(
          children: [
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surfaceVariant,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: Theme.of(context)
                      .colorScheme
                      .outlineVariant
                      .withOpacity(0.35),
                ),
              ),
              alignment: Alignment.center,
              child: Text(
                '${index + 1}',
                style: const TextStyle(
                    fontWeight: FontWeight.bold, color: Color(0xFFE07A5F)),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name.isEmpty ? '-' : name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).colorScheme.onSurface),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '$qty terjual',
                    style: TextStyle(
                      fontSize: 12,
                      color: Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withOpacity(0.7),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 10),
            Text(
              _fmtCurrency(rev),
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).colorScheme.onSurface,
              ),
            ),
          ],
        );
      },
    );
  }
}

class _ForecastPoint {
  final DateTime date;
  final double? actual;
  final double? predicted;
  final double? lower;
  final double? upper;

  const _ForecastPoint({
    required this.date,
    required this.actual,
    this.predicted,
    this.lower,
    this.upper,
  });
}

class _LabeledShare {
  final String label;
  final double share;
  final double value;

  const _LabeledShare({
    required this.label,
    required this.share,
    required this.value,
  });
}
