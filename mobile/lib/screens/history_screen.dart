import 'package:flutter/material.dart';
import 'package:rana_merchant/data/local/database_helper.dart';
import 'package:rana_merchant/services/digital_receipt_service.dart';
import 'package:rana_merchant/services/sync_service.dart';
import 'package:shimmer/shimmer.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  List<Map<String, dynamic>> _transactions = [];
  bool _isLoading = true;
  bool _isFetching = false;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    if (!mounted || _isFetching) return;
    _isFetching = true;
    setState(() => _isLoading = true);

    try {
      Future(() async {
        try {
          await SyncService().syncTransactionHistory();
        } catch (_) {}
      });

      final db = DatabaseHelper.instance;
      final allTxns = await db.getAllTransactions();
      if (!mounted) return;
      setState(() {
        _transactions = allTxns;
        _isLoading = false;
      });
    } finally {
      _isFetching = false;
    }
  }

  Widget _buildShimmerList() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final baseColor = isDark ? Colors.grey[800]! : Colors.grey[300]!;
    final highlightColor = isDark ? Colors.grey[700]! : Colors.grey[100]!;

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: 8,
      itemBuilder: (ctx, i) => Shimmer.fromColors(
        baseColor: baseColor,
        highlightColor: highlightColor,
        child: Container(
          margin: const EdgeInsets.only(bottom: 12),
          height: 80,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final body = _isLoading
        ? CustomScrollView(
            slivers: [
              _buildSliverAppBar(),
              SliverFillRemaining(child: _buildShimmerList()),
            ],
          )
        : _transactions.isEmpty
            ? RefreshIndicator(
                onRefresh: _loadHistory,
                child: CustomScrollView(
                  slivers: [
                    _buildSliverAppBar(),
                    SliverFillRemaining(
                      child: Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(24),
                              decoration: BoxDecoration(
                                color: const Color(0xFFE07A5F).withOpacity(0.08),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.receipt_long_outlined,
                                  size: 52, color: Color(0xFFE07A5F)),
                            ),
                            const SizedBox(height: 20),
                            const Text('Belum Ada Transaksi',
                                style: TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold)),
                            const SizedBox(height: 8),
                            const Padding(
                              padding: EdgeInsets.symmetric(horizontal: 40),
                              child: Text(
                                'Riwayat penjualan dari kasir akan muncul di sini. Mulai transaksi pertama Anda!',
                                textAlign: TextAlign.center,
                                style: TextStyle(color: Colors.grey, fontSize: 13, height: 1.5),
                              ),
                            ),
                            const SizedBox(height: 16),
                            const Text('↓ Tarik ke bawah untuk memuat ulang',
                                style: TextStyle(fontSize: 11, color: Colors.grey)),
                          ],
                        ).animate().fadeIn(duration: 400.ms).scale(begin: const Offset(0.92, 0.92)),
                      ),
                    ),
                  ],
                ),
              )
            : RefreshIndicator(
                onRefresh: _loadHistory,
                child: CustomScrollView(
                  slivers: [
                    _buildSliverAppBar(),
                    SliverPadding(
                      padding: const EdgeInsets.all(16),
                      sliver: SliverList(
                        delegate: SliverChildBuilderDelegate(
                          (context, index) {
                            final txn = _transactions[index];
                            final isSynced = txn['status'] == 'SYNCED';
                            final date =
                                DateTime.tryParse(txn['occurredAt'] ?? '') ??
                                    DateTime.now();
                            final dateStr =
                                DateFormat('dd MMM HH:mm').format(date);

                            return Container(
                              margin: const EdgeInsets.only(bottom: 12),
                              decoration: BoxDecoration(
                                color: Theme.of(context)
                                    .colorScheme
                                    .surface
                                    .withOpacity(0.98),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: const Color(0xFFE07A5F)
                                      .withOpacity(0.12),
                                  width: 1.5,
                                ),
                              ),
                              child: ListTile(
                                contentPadding: const EdgeInsets.symmetric(
                                    horizontal: 16, vertical: 8),
                                leading: CircleAvatar(
                                  backgroundColor: isSynced
                                      ? Colors.green.shade50
                                      : Colors.orange.shade50,
                                  child: Icon(
                                    isSynced ? Icons.check_circle : Icons.sync,
                                    color:
                                        isSynced ? Colors.green : Colors.orange,
                                    size: 20,
                                  ),
                                ),
                                title: Text(
                                  'Order #${txn['offlineId'].toString().substring(0, 8)}',
                                  style: const TextStyle(
                                      fontWeight: FontWeight.bold),
                                ),
                                subtitle: Text(
                                  '$dateStr • Rp ${NumberFormat('#,##0', 'id_ID').format(txn['total'] ?? 0)}',
                                ),
                                trailing: Icon(
                                  Icons.chevron_right,
                                  color: Theme.of(context)
                                      .colorScheme
                                      .onSurface
                                      .withOpacity(0.5),
                                ),
                                onTap: () async {
                                  // Fetch items from DB
                                  final db = DatabaseHelper.instance;
                                  final items = await db
                                      .getItemsForTransaction(txn['offlineId']);
                                  if (context.mounted) {
                                    _showPhoneDialog(context, txn, items);
                                  }
                                },
                              ),
                            ).animate().fadeIn(delay: (50 * index).ms).slideY(begin: 0.1, end: 0, curve: Curves.easeOutQuad);
                          },
                          childCount: _transactions.length,
                        ),
                      ),
                    ),
                  ],
                ),
              );

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: LayoutBuilder(
        builder: (context, constraints) {
          if (constraints.maxWidth < 900) return body;

          return Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 800),
              child: body,
            ),
          );
        },
      ),
    );
  }

  SliverAppBar _buildSliverAppBar() {
    return SliverAppBar(
      pinned: true,
      backgroundColor: Colors.transparent,
      iconTheme: const IconThemeData(color: Color(0xFFE07A5F)),
      title: const Text(
        'Riwayat Transaksi',
        style:
            TextStyle(fontWeight: FontWeight.bold, color: Color(0xFFE07A5F)),
      ),
      centerTitle: true,
    );
  }

  void _showPhoneDialog(BuildContext context, Map<String, dynamic> txn,
      List<Map<String, dynamic>> items) {
    final phoneCtrl = TextEditingController();
    showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
              title: const Text('Kirim Struk via WA'),
              content: TextField(
                controller: phoneCtrl,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                    labelText: 'Nomor WhatsApp (62...)',
                    hintText: '628123456789'),
              ),
              actions: [
                TextButton(
                    onPressed: () => Navigator.pop(ctx),
                    child: const Text('Batal')),
                FilledButton(
                    onPressed: () {
                      Navigator.pop(ctx);
                      DigitalReceiptService.sendViaWhatsApp(
                          phoneCtrl.text, txn, items);
                    },
                    child: const Text('Kirim'))
              ],
            ));
  }
}
