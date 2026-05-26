import 'package:rana_merchant/config/merchant_config.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:rana_merchant/services/ai_service.dart';
import 'package:rana_merchant/services/notification_service.dart';
import 'package:rana_merchant/data/local/database_helper.dart';
import 'package:rana_merchant/screens/stock_opname_screen.dart';
import 'package:rana_merchant/screens/flash_sales_screen.dart';
import 'package:rana_merchant/screens/promo_hub_screen.dart';
import 'package:rana_merchant/screens/marketing_screen.dart';
import 'package:rana_merchant/screens/expense_screen.dart';

class BusinessAssistantSheet extends StatefulWidget {
  final DateTime startDate;
  final DateTime endDate;
  final List<Map<String, dynamic>> aiInsights;

  const BusinessAssistantSheet({
    super.key,
    required this.startDate,
    required this.endDate,
    required this.aiInsights,
  });

  @override
  State<BusinessAssistantSheet> createState() => _BusinessAssistantSheetState();
}

class _BusinessAssistantSheetState extends State<BusinessAssistantSheet> {
  final TextEditingController _queryCtrl = TextEditingController();
  List<Map<String, dynamic>> _actions = [];
  Map<String, dynamic>? _answer;
  bool _isLoading = true;
  final AiService _ai = AiService();

  @override
  void initState() {
    super.initState();
    _loadRecommendations();
  }

  Future<void> _loadRecommendations() async {
    try {
      final actions = await _ai.generateActionRecommendations(
          periodStart: widget.startDate, periodEnd: widget.endDate);
      if (mounted) {
        setState(() {
          _actions = actions;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _askAi(String query) async {
    if (query.trim().isEmpty) return;
    setState(() => _answer = null);
    // Optional: show local loading for answer
    try {
      final res = await _ai.answerBusinessQuery(query);
      if (mounted) setState(() => _answer = res);
    } catch (e) {
      // Handle error silently or show snackbar
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

  Widget _buildAnswerWidget(Map<String, dynamic> answer, ColorScheme colorScheme) {
    final type = answer['type']?.toString() ?? '';
    if (type == 'LIST') {
      final items = List<Map<String, dynamic>>.from(answer['items'] ?? []);
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: items.map((e) => Row(
          children: [
            Expanded(child: Text(e['name']?.toString() ?? '', style: TextStyle(fontSize: 12, color: colorScheme.onSurface))),
            Text('${e['qty'] ?? 0}', style: TextStyle(fontSize: 12, color: colorScheme.onSurface.withOpacity(0.8))),
          ],
        )).toList(),
      );
    }
    if (type == 'INFO') {
      final v = (answer['value'] as num?)?.toDouble() ?? 0.0;
      return Text('Target: ${NumberFormat.simpleCurrency(locale: 'id', decimalDigits: 0).format(v)}',
          style: TextStyle(fontSize: 12, color: colorScheme.onSurface));
    }
    final items = List<Map<String, dynamic>>.from(answer['items'] ?? []);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: items.map((i) => Text(i['message']?.toString() ?? '',
          style: TextStyle(fontSize: 12, color: colorScheme.onSurface))).toList(),
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
      // Simplified: Just open stock opname or handle properly
       await Navigator.of(context)
          .push(MaterialPageRoute(builder: (_) => const StockOpnameScreen()));
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
    } else if (act == 'KULAKAN') {
      await Navigator.of(context)
          .push(MaterialPageRoute(builder: (_) => const StockOpnameScreen()));
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final insights = widget.aiInsights.take(10).toList();

    return Padding(
      padding: EdgeInsets.only(
          left: 16,
          right: 16,
          top: 16,
          bottom: 16 + MediaQuery.of(context).viewInsets.bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.smart_toy, color: colorScheme.primary),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Asisten Bisnis',
                  style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: colorScheme.onSurface),
                ),
              ),
              IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close))
            ],
          ),
          const SizedBox(height: 12),
          
          if (_isLoading)
             Padding(
              padding: const EdgeInsets.all(32.0),
              child: Center(
                child: Column(
                  children: [
                    CircularProgressIndicator(color: colorScheme.primary),
                    const SizedBox(height: 16),
                    Text("Menganalisis performa bisnis...", style: TextStyle(color: colorScheme.onSurface.withOpacity(0.7))),
                  ],
                ),
              ),
            )
          else 
            Flexible( // [FIX] Use Flexible with ScrollView to prevent overflow
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: _queryCtrl,
                      decoration: InputDecoration(
                        hintText: 'Tanya: “Produk apa yang perlu dipromosikan?”',
                        prefixIcon: const Icon(Icons.search),
                        border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                      onSubmitted: _askAi,
                    ),
                    const SizedBox(height: 12),
                    if (_answer != null)
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: colorScheme.surface,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                              color: colorScheme.outlineVariant.withOpacity(0.35)),
                        ),
                        child: _buildAnswerWidget(_answer!, colorScheme),
                      ),
                    const SizedBox(height: 12),
                    Text('Rekomendasi Tindakan',
                        style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: colorScheme.onSurface)),
                    const SizedBox(height: 8),
                    ..._actions.map((a) => Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: ListTile(
                            tileColor: colorScheme.surface,
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                                side: BorderSide(
                                    color: colorScheme.outlineVariant
                                        .withOpacity(0.35))),
                            leading: Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: colorScheme.primary.withOpacity(0.1),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                _getActionIcon(a['action']?.toString() ?? ''),
                                color: colorScheme.primary,
                                size: 18,
                              ),
                            ),
                            title: Text(a['label'].toString(),
                                style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: colorScheme.onSurface)),
                            subtitle: Text(a['desc'].toString(),
                                style: TextStyle(
                                    fontSize: 12,
                                    color: colorScheme.onSurface.withOpacity(0.7))),
                            trailing: FilledButton.icon(
                              onPressed: () => _runAssistantAction(a),
                              icon: Icon(
                                _getActionIcon(a['action']?.toString() ?? ''),
                                size: 18,
                              ),
                              label: const Text('Jalankan'),
                            ),
                          ),
                        )),
                    const SizedBox(height: 12),
                    Text('Insight Terkini',
                        style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: colorScheme.onSurface)),
                    const SizedBox(height: 8),
                    ...insights.map((i) {
                      final typeStr = (i['type'] ?? '').toString();
                      final accent = _insightColor(typeStr, colorScheme);
                      final icon = _insightIcon(typeStr);
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: colorScheme.surface,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: accent.withOpacity(0.35)),
                          ),
                          child: Row(
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
                                  i['message']?.toString() ?? '',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: colorScheme.onSurface,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
