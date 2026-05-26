import 'package:rana_merchant/config/merchant_config.dart';
import 'dart:io';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:rana_merchant/providers/wallet_provider.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:shimmer/shimmer.dart';
import 'package:rana_merchant/screens/scan_screen.dart'; // Ensure this exists
import 'package:rana_merchant/data/remote/api_service.dart';
import 'package:share_plus/share_plus.dart';
import 'package:rana_merchant/screens/support_screen.dart';

class WalletScreen extends StatefulWidget {
  const WalletScreen({super.key});

  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen>
    with SingleTickerProviderStateMixin {
  final _currency =
      NumberFormat.simpleCurrency(locale: 'id_ID', decimalDigits: 0);
  late TabController _tabController;
  bool _obscureBalance = false;
  String _historyFilter = 'all';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    Future.microtask(() => context.read<WalletProvider>().loadData());
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text('Dompet Merchant',
            style: GoogleFonts.outfit(
                fontWeight: FontWeight.w600,
                color: Theme.of(context).colorScheme.onSurface)),
        backgroundColor: Theme.of(context).colorScheme.surface.withOpacity(0.96),
        elevation: 0,
        centerTitle: true,
        iconTheme: IconThemeData(
            color: Theme.of(context).colorScheme.onSurface),
        actions: [
          IconButton(
            icon: const Icon(Icons.help_outline),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const SupportScreen()),
            ),
          )
        ],
      ),
      body: Consumer<WalletProvider>(
        builder: (context, provider, child) {
          return RefreshIndicator(
            onRefresh: () => provider.loadData(),
            color: Theme.of(context).colorScheme.primary,
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              physics: const AlwaysScrollableScrollPhysics(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 1. Balance Card
                  _buildProfessionalCard(context, provider),

                  const SizedBox(height: 32),

                  // 2. Quick Actions
                  Text('Menu Cepat',
                      style: GoogleFonts.outfit(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Theme.of(context).colorScheme.onSurface)),
                  const SizedBox(height: 16),
                  _buildQuickActions(context),

                  const SizedBox(height: 32),

                  // 3. Pending
                  if (provider.pendingTopUps.isNotEmpty ||
                      provider.pendingWithdrawals.isNotEmpty) ...[
                    _buildPendingSection(provider),
                    const SizedBox(height: 32),
                  ],

                  // 4. History Tabs
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Riwayat Transaksi',
                          style: GoogleFonts.outfit(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: Theme.of(context).colorScheme.onSurface)),
                      Icon(Icons.calendar_today,
                          size: 16, color: Theme.of(context).colorScheme.onSurface.withOpacity(0.4))
                    ],
                  ),
                  const SizedBox(height: 16),
                  _buildHistoryFilterChips(),
                  const SizedBox(height: 12),
                  _buildHistoryTabs(provider),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  // --- Widgets ---

  Widget _buildProfessionalCard(BuildContext context, WalletProvider provider) {
    final colorScheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            colorScheme.primary,
            colorScheme.primary.withBlue(200),
          ],
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: colorScheme.primary.withOpacity(0.3),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            right: -20,
            top: -20,
            child: Icon(
              Icons.account_balance_wallet,
              size: 120,
              color: Colors.white.withOpacity(0.1),
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Total Saldo',
                        style: GoogleFonts.outfit(
                          color: Colors.white.withOpacity(0.8),
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Text(
                            _obscureBalance ? 'Rp ███████' : _currency.format(provider.balance),
                            style: GoogleFonts.outfit(
                              color: Colors.white,
                              fontSize: 32,
                              fontWeight: FontWeight.bold,
                              letterSpacing: -0.5,
                            ),
                          ),
                          const SizedBox(width: 8),
                          InkWell(
                            onTap: () => setState(() => _obscureBalance = !_obscureBalance),
                            borderRadius: BorderRadius.circular(999),
                            child: Container(
                              padding: const EdgeInsets.all(6),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.18),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                _obscureBalance ? Icons.visibility_off_rounded : Icons.visibility_rounded,
                                color: Colors.white,
                                size: 18,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  InkWell(
                    onTap: () => _scanQr(context),
                    borderRadius: BorderRadius.circular(999),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.qr_code_scanner_rounded,
                        color: Colors.white,
                        size: 24,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 32),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(
                        Icons.verified_user_rounded,
                        color: Colors.white,
                        size: 16,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Merchant Pro',
                        style: GoogleFonts.outfit(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      'Aktif',
                      style: GoogleFonts.outfit(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              _buildDailySummaryChips(provider),
            ],
          ),
        ],
      ),
    ).animate().scale(duration: 400.ms, curve: Curves.easeOutBack);
  }

  Widget _buildDailySummaryChips(WalletProvider provider) {
    final colorScheme = Theme.of(context).colorScheme;
    final today = DateTime.now();
    double inTotal = 0;
    double outTotal = 0;
    for (final h in provider.history) {
      try {
        final dt = DateTime.parse(h['occurredAt']);
        if (dt.year == today.year && dt.month == today.month && dt.day == today.day) {
          final amt = double.tryParse(h['amount'].toString()) ?? 0;
          if (h['type'] == 'CASH_IN') {
            inTotal += amt;
          } else if (h['type'] == 'CASH_OUT') {
            outTotal += amt;
          }
        }
      } catch (_) {}
    }
    return Row(
      children: [
        Expanded(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.16),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.white.withOpacity(0.24)),
            ),
            child: Row(
              children: [
                const Icon(Icons.south_west_rounded, color: Colors.white, size: 16),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Masuk Hari Ini',
                    style: GoogleFonts.outfit(color: Colors.white.withOpacity(0.9), fontSize: 12, fontWeight: FontWeight.w600),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Text(
                  _currency.format(inTotal),
                  style: GoogleFonts.outfit(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: colorScheme.surface.withOpacity(0.18),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.white.withOpacity(0.18)),
            ),
            child: Row(
              children: [
                const Icon(Icons.north_east_rounded, color: Colors.white, size: 16),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Keluar Hari Ini',
                    style: GoogleFonts.outfit(color: Colors.white.withOpacity(0.9), fontSize: 12, fontWeight: FontWeight.w600),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Text(
                  _currency.format(outTotal),
                  style: GoogleFonts.outfit(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildQuickActions(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    final actions = [
      {
        'icon': Icons.account_balance_wallet_rounded,
        'label': 'Top Up',
        'desc': 'Isi saldo dompet',
        'color': colorScheme.primary,
        'onTap': () => _showTopUpDialog(context)
      },
      {
        'icon': Icons.south_rounded,
        'label': 'Tarik',
        'desc': 'Tarik ke rekening',
        'color': const Color(0xFFE07A5F),
        'onTap': () => _showWithdrawDialog(context)
      },
      {
        'icon': Icons.sync_alt_rounded,
        'label': 'Kirim',
        'desc': 'Transfer sesama',
        'color': const Color(0xFF3D405B),
        'onTap': () => _showTransferDialog(context)
      },
      {
        'icon': Icons.group_add_rounded,
        'label': 'Ajak',
        'desc': 'Bagikan referral',
        'color': const Color(0xFF81B29A),
        'onTap': () => _showReferralDialog(context)
      },
    ];

    return LayoutBuilder(
      builder: (ctx, constraints) {
        final gap = 12.0;
        final itemWidth = (constraints.maxWidth - gap) / 2;
        return GridView.count(
          crossAxisCount: 2,
          mainAxisSpacing: gap,
          crossAxisSpacing: gap,
          childAspectRatio: itemWidth / 108,
          physics: const NeverScrollableScrollPhysics(),
          shrinkWrap: true,
          children: actions.map((a) {
            final iconColor = a['color'] as Color;
            return Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: a['onTap'] as VoidCallback,
                borderRadius: BorderRadius.circular(20),
                splashColor: iconColor.withOpacity(0.15),
                highlightColor: iconColor.withOpacity(0.08),
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        Color.lerp(iconColor, Colors.white, isDark ? 0.80 : 0.88)!,
                        iconColor.withOpacity(isDark ? 0.22 : 0.18),
                      ],
                    ),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: iconColor.withOpacity(0.12),
                        blurRadius: 14,
                        offset: const Offset(0, 8),
                      )
                    ],
                    border: Border.all(color: iconColor.withOpacity(0.25), width: 1),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.35),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: Colors.white.withOpacity(0.5)),
                        ),
                        child: Icon(a['icon'] as IconData, color: iconColor, size: 24),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              a['label'] as String,
                              style: GoogleFonts.outfit(
                                  fontSize: 13, fontWeight: FontWeight.w700, color: colorScheme.onSurface),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 4),
                            Text(
                              a['desc'] as String,
                              style: GoogleFonts.outfit(
                                  fontSize: 11, color: colorScheme.onSurface.withOpacity(0.65), fontWeight: FontWeight.w500),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      )
                    ],
                  ),
                ).animate().scale(duration: 250.ms, curve: Curves.easeOut),
              ),
            );
          }).toList(),
        );
      },
    );
  }

  Widget _buildHistoryTabs(WalletProvider provider) {
    final all = _applyTimeFilter(provider.history);
    final ins = all.where((i) => i['type'] == 'CASH_IN').toList();
    final outs = all.where((i) => i['type'] == 'CASH_OUT').toList();
    return Column(
      children: [
        Container(
          height: 40,
          decoration: BoxDecoration(
              color:
                  Theme.of(context).colorScheme.surface.withOpacity(0.9),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: Theme.of(context).colorScheme.primary.withOpacity(0.25),
                width: 1.2,
              )),
          child: TabBar(
            controller: _tabController,
            indicator: BoxDecoration(
                color: Theme.of(context)
                    .colorScheme
                    .primary
                    .withOpacity(0.12),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                    color: Theme.of(context)
                        .colorScheme
                        .primary
                        .withOpacity(0.4))),
            labelColor: Theme.of(context).colorScheme.primary,
            unselectedLabelColor:
                Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
            labelStyle:
                GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 13),
            dividerColor: Colors.transparent,
            tabs: const [
              Tab(text: 'Semua'),
              Tab(text: 'Masuk'),
              Tab(text: 'Keluar'),
            ],
          ),
        ),
        const SizedBox(height: 20),
        if (provider.isLoading)
          _buildShimmerHistoryList()
        else
          SizedBox(
            height: 400,
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildHistoryList(all),
                _buildHistoryList(ins),
                _buildHistoryList(outs),
              ],
            ),
          ),
      ],
    );
  }

  Widget _buildShimmerHistoryList() {
    final colorScheme = Theme.of(context).colorScheme;
    final baseColor = colorScheme.surface;
    final highlightColor = colorScheme.onSurface.withOpacity(0.06);
    return Shimmer.fromColors(
      baseColor: baseColor,
      highlightColor: highlightColor,
      child: Column(
        children: List.generate(5, (i) => Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Row(
            children: [
              Container(
                width: 44, height: 44,
                decoration: BoxDecoration(
                  color: Colors.white, borderRadius: BorderRadius.circular(14)),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(height: 13, width: 140, color: Colors.white),
                    const SizedBox(height: 8),
                    Container(height: 10, width: 100, color: Colors.white),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Container(height: 14, width: 80, color: Colors.white),
                  const SizedBox(height: 6),
                  Container(height: 10, width: 50, color: Colors.white),
                ],
              ),
            ],
          ),
        )),
      ),
    );
  }

  Widget _buildHistoryFilterChips() {
    final colorScheme = Theme.of(context).colorScheme;
    return Row(
      children: [
        ChoiceChip(
          label: const Text('Hari ini'),
          selected: _historyFilter == 'today',
          onSelected: (_) => setState(() => _historyFilter = 'today'),
          selectedColor: colorScheme.primary.withOpacity(0.15),
          labelStyle: GoogleFonts.outfit(
              color: _historyFilter == 'today'
                  ? colorScheme.primary
                  : colorScheme.onSurface.withOpacity(0.8),
              fontWeight: FontWeight.w600),
        ),
        const SizedBox(width: 8),
        ChoiceChip(
          label: const Text('Minggu ini'),
          selected: _historyFilter == 'week',
          onSelected: (_) => setState(() => _historyFilter = 'week'),
          selectedColor: colorScheme.primary.withOpacity(0.15),
          labelStyle: GoogleFonts.outfit(
              color: _historyFilter == 'week'
                  ? colorScheme.primary
                  : colorScheme.onSurface.withOpacity(0.8),
              fontWeight: FontWeight.w600),
        ),
        const SizedBox(width: 8),
        ChoiceChip(
          label: const Text('Semua'),
          selected: _historyFilter == 'all',
          onSelected: (_) => setState(() => _historyFilter = 'all'),
          selectedColor: colorScheme.primary.withOpacity(0.15),
          labelStyle: GoogleFonts.outfit(
              color: _historyFilter == 'all'
                  ? colorScheme.primary
                  : colorScheme.onSurface.withOpacity(0.8),
              fontWeight: FontWeight.w600),
        ),
      ],
    );
  }

  List<dynamic> _applyTimeFilter(List<dynamic> src) {
    if (_historyFilter == 'all') return src;
    final now = DateTime.now();
    return src.where((item) {
      try {
        final dt = DateTime.parse(item['occurredAt']);
        if (_historyFilter == 'today') {
          return dt.year == now.year && dt.month == now.month && dt.day == now.day;
        }
        if (_historyFilter == 'week') {
          final startOfWeek = now.subtract(Duration(days: now.weekday - 1));
          final endOfWeek = startOfWeek.add(const Duration(days: 7));
          return dt.isAfter(startOfWeek) && dt.isBefore(endOfWeek);
        }
      } catch (_) {}
      return true;
    }).toList();
  }

  Widget _buildHistoryList(List<dynamic> history) {
    final colorScheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (history.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.history,
                size: 48,
                color: colorScheme.onSurface.withOpacity(0.1)),
            const SizedBox(height: 12),
            Text('Tidak ada riwayat',
                style: GoogleFonts.outfit(
                    color: colorScheme.onSurface.withOpacity(0.4),
                    fontSize: 14)),
          ],
        ),
      );
    }

    return ListView.separated(
      physics: const NeverScrollableScrollPhysics(),
      itemCount: history.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (ctx, i) {
        final item = history[i];
        final isIncome = item['type'] == 'CASH_IN';
        final color = isIncome ? colorScheme.primary : const Color(0xFFE07A5F);

        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: colorScheme.surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: colorScheme.outline.withOpacity(0.08),
              width: 1,
            ),
            boxShadow: [
              BoxShadow(
                color: colorScheme.shadow.withOpacity(isDark ? 0.05 : 0.02),
                blurRadius: 10,
                offset: const Offset(0, 4),
              )
            ],
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(
                  isIncome ? Icons.south_west_rounded : Icons.north_east_rounded,
                  color: color,
                  size: 18,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item['description'] ?? item['category'] ?? 'Transaksi',
                      style: GoogleFonts.outfit(
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                        color: colorScheme.onSurface,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      DateFormat('dd MMM yyyy • HH:mm')
                          .format(DateTime.parse(item['occurredAt'])),
                      style: GoogleFonts.outfit(
                        fontSize: 11,
                        color: colorScheme.onSurface.withOpacity(0.5),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '${isIncome ? '+' : '-'}${_currency.format(double.parse(item['amount'].toString()))}',
                    style: GoogleFonts.outfit(
                      fontWeight: FontWeight.bold,
                      color: color,
                      fontSize: 15,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Berhasil',
                    style: GoogleFonts.outfit(
                      fontSize: 10,
                      color: const Color(0xFF81B29A),
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              )
            ],
          ),
        ).animate().fadeIn(delay: (60 * i).ms, duration: 350.ms).slideX(begin: 0.15, end: 0, curve: Curves.easeOutQuad);
      },
    );
  }

  Widget _buildPendingSection(WalletProvider provider) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
              Text(
                'Menunggu Persetujuan',
                style: GoogleFonts.outfit(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).colorScheme.onSurface)),
        const SizedBox(height: 12),
        ...provider.pendingTopUps.map(
            (e) => _buildPendingCard(e, 'Top Up', Theme.of(context).colorScheme.primary)),
        ...provider.pendingWithdrawals.map(
            (e) => _buildPendingCard(e, 'Penarikan', Theme.of(context).colorScheme.primary)),
      ],
    );
  }

  Widget _buildPendingCard(
      Map<String, dynamic> item, String type, Color color) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          color:
              Theme.of(context).colorScheme.surface.withOpacity(0.9),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: color.withOpacity(0.25),
            width: 1.2,
          ),
          boxShadow: [
            BoxShadow(color: color.withOpacity(0.05), blurRadius: 8)
          ]),
      child: Row(
        children: [
          Icon(Icons.hourglass_top_rounded, color: color),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('$type Pending',
                    style: GoogleFonts.outfit(
                        fontWeight: FontWeight.bold, color: color)),
                Text(_currency.format(item['amount']),
                    style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
              ],
            ),
          ),
          Text(DateFormat('dd MMM').format(DateTime.parse(item['createdAt'])),
              style: GoogleFonts.outfit(
                  fontSize: 12,
                  color: Theme.of(context)
                      .colorScheme
                      .onSurface
                      .withOpacity(0.6))),
        ],
      ),
    );
  }

  // --- Actions ---

  void _scanQr(BuildContext context) async {
    final result = await Navigator.push(
        context, MaterialPageRoute(builder: (_) => const ScanScreen()));
    if (result == true) {
      context.read<WalletProvider>().loadData(); // Reload if success
    }
  }

  void _showReceiveDialog(BuildContext context) {
    showDialog(
        context: context,
            builder: (_) => Dialog(
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(24)),
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: FutureBuilder<Map<String, String>>(
                  future: ApiService().getSystemSettings(),
                  builder: (context, snapshot) {
                    final settings = snapshot.data ?? {};
                    final qrisUrl =
                        (settings['PLATFORM_QRIS_URL'] ?? '').trim();

                    final colorScheme = Theme.of(context).colorScheme;
                    return Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text('Terima Pembayaran',
                            style: GoogleFonts.outfit(
                                fontSize: 18, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 24),
                        if (snapshot.connectionState == ConnectionState.waiting)
                          const SizedBox(
                            width: 200,
                            height: 200,
                            child: Center(child: CircularProgressIndicator()),
                          )
                        else if (qrisUrl != '')
                          ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: Image.network(
                              qrisUrl,
                              width: 200,
                              height: 200,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => Container(
                                width: 200,
                                height: 200,
                                color: colorScheme.surfaceVariant,
                                child: Center(
                                  child: Icon(Icons.qr_code_2,
                                      size: 150,
                                      color: colorScheme.onSurface),
                                ),
                              ),
                            ),
                          )
                        else
                          Container(
                            width: 200,
                            height: 200,
                            color: colorScheme.surfaceVariant,
                            child: Center(
                              child: Icon(Icons.qr_code_2,
                                  size: 150,
                                  color: colorScheme.primary),
                            ),
                          ),
                        const SizedBox(height: 16),
                        Text(
                          qrisUrl != ''
                              ? 'Scan QRIS ini untuk membayar'
                              : 'QRIS belum tersedia. Hubungi admin.',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.outfit(
                              color: colorScheme.onSurface.withOpacity(0.7)),
                        ),
                        const SizedBox(height: 24),
                        FilledButton.icon(
                          onPressed: () async {
                            if (qrisUrl != '') {
                              await Share.share(qrisUrl);
                            }
                            if (context.mounted) Navigator.pop(context);
                          },
                          icon: const Icon(Icons.share),
                          label: const Text('Bagikan'),
                          style: FilledButton.styleFrom(
                            backgroundColor: colorScheme.primary,
                            foregroundColor: colorScheme.onPrimary,
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12)),
                          ),
                        )
                      ],
                    );
                  },
                ),
              ),
            ));
  }

  void _showReferralDialog(BuildContext context) {
    showDialog(
        context: context,
            builder: (_) => Dialog(
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(24)),
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: FutureBuilder<Map<String, dynamic>>(
                  future: ApiService().getReferralInfo(),
                  builder: (context, snapshot) {
                    final colorScheme = Theme.of(context).colorScheme;
                    if (snapshot.connectionState == ConnectionState.waiting) {
                      return SizedBox(
                        width: 200,
                        height: 200,
                        child: Center(
                            child: CircularProgressIndicator(
                                color: colorScheme.primary)),
                      );
                    }

                    if (snapshot.hasError || !snapshot.hasData) {
                      return SizedBox(
                        width: 260,
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text('Program Referral',
                                style: GoogleFonts.outfit(
                                    fontSize: 18, fontWeight: FontWeight.bold, color: colorScheme.onSurface)),
                            const SizedBox(height: 16),
                            Text(
                              'Gagal memuat data referral.',
                              textAlign: TextAlign.center,
                              style: GoogleFonts.outfit(
                                  color:
                                      colorScheme.onSurface.withOpacity(0.7),
                                  fontSize: 13),
                            ),
                            const SizedBox(height: 16),
                            FilledButton(
                              onPressed: () => Navigator.pop(context),
                              style: FilledButton.styleFrom(
                                  backgroundColor: colorScheme.primary,
                                  foregroundColor: colorScheme.onPrimary),
                              child: const Text('Tutup'),
                            )
                          ],
                        ),
                      );
                    }

                    final data = snapshot.data!;
                    final code = (data['code'] ?? '').toString();
                    final program =
                        data['program'] as Map<String, dynamic>? ?? {};
                    final stats = data['stats'] as Map<String, dynamic>? ?? {};

                    final totalReferrals =
                        (stats['totalReferrals'] ?? 0).toString();
                    final totalReleased =
                        (stats['totalRewardReleased'] ?? 0).toString();

                    final shareText = code.isEmpty
                        ? ''
                        : 'Daftar Rana POS pakai kode referral $code untuk dapat saldo wallet.';

                    return Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Program Referral',
                            style: GoogleFonts.outfit(
                                fontSize: 18, fontWeight: FontWeight.bold, color: colorScheme.onSurface)),
                        const SizedBox(height: 8),
                        Text(program['name']?.toString() ?? '',
                            style: GoogleFonts.outfit(
                                fontSize: 14,
                                color: colorScheme.onSurface.withOpacity(0.8))),
                        const SizedBox(height: 24),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color:
                                colorScheme.primary.withOpacity(0.06),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                                color: colorScheme.primary
                                    .withOpacity(0.4)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Kode Referral Kamu',
                                  style: GoogleFonts.outfit(
                                      fontSize: 12,
                                      color: colorScheme.onSurface
                                          .withOpacity(0.8),
                                      fontWeight: FontWeight.w500)),
                              const SizedBox(height: 6),
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    code.isEmpty ? '-' : code,
                                    style: GoogleFonts.outfit(
                                        fontSize: 20,
                                        fontWeight: FontWeight.bold,
                                        letterSpacing: 2,
                                        color: colorScheme.onSurface),
                                  ),
                                  FilledButton(
                                    onPressed: code.isEmpty
                                        ? null
                                        : () {
                                            Share.share(shareText);
                                            Navigator.pop(context);
                                          },
                                    style: FilledButton.styleFrom(
                                        backgroundColor:
                                            colorScheme.primary,
                                        foregroundColor: colorScheme.onPrimary),
                                    child: const Text('BAGIKAN'),
                                  )
                                ],
                              )
                            ],
                          ),
                        ),
                        const SizedBox(height: 20),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Total Referral',
                                    style: GoogleFonts.outfit(
                                        fontSize: 12,
                                        color: colorScheme.onSurface
                                            .withOpacity(0.7))),
                                const SizedBox(height: 4),
                                Text(totalReferrals,
                                    style: GoogleFonts.outfit(
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                        color: colorScheme.onSurface)),
                              ],
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Reward Cair',
                                    style: GoogleFonts.outfit(
                                        fontSize: 12,
                                        color: colorScheme.onSurface
                                            .withOpacity(0.7))),
                                const SizedBox(height: 4),
                                Text(
                                    NumberFormat.simpleCurrency(
                                            locale: 'id_ID', decimalDigits: 0)
                                        .format(
                                            double.tryParse(totalReleased) ??
                                                0),
                                    style: GoogleFonts.outfit(
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                        color: colorScheme.onSurface)),
                              ],
                            ),
                          ],
                        ),
                        const SizedBox(height: 24),
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton(
                            onPressed: () => Navigator.pop(context),
                            style: OutlinedButton.styleFrom(
                                foregroundColor: colorScheme.primary,
                                side: BorderSide(
                                    color: colorScheme.outline
                                        .withOpacity(0.4),
                                    width: 1.2),
                                shape: RoundedRectangleBorder(
                                    borderRadius:
                                        BorderRadius.circular(12))),
                            child: const Text('Tutup'),
                          ),
                        )
                      ],
                    );
                  },
                ),
              ),
            ));
  }

  // Reuse existing dialogs but styled better? To save space, assuming they are imported or redefined here.
  // For brevity, I will redefine them here with better styling matching the red theme.

  void _showTopUpDialog(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => const _TopUpSheet(),
    );
  }

  void _showTransferDialog(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => const _TransferSheet(),
    );
  }

  void _showWithdrawDialog(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => const _WithdrawSheet(),
    );
  }
}

// ... Sheet Classes logic is mostly same but updated Colors ...
// I will keep the logic same but update Colors to Red basically.

class _TopUpSheet extends StatefulWidget {
  const _TopUpSheet();
  @override
  State<_TopUpSheet> createState() => __TopUpSheetState();
}

class __TopUpSheetState extends State<_TopUpSheet> {
  final _amountCtrl = TextEditingController();
  XFile? _imageFile;
  final _picker = ImagePicker();
  bool _isSubmitting = false;
  String _bankInfo = '';
  bool _isBankLoading = false;

  @override
  void initState() {
    super.initState();
    _loadBankInfo();
  }

  Future<void> _loadBankInfo() async {
    setState(() => _isBankLoading = true);
    try {
      final settings = await ApiService().getSystemSettings();
      if (!mounted) return;
      setState(() {
        _bankInfo = (settings['PLATFORM_BANK_INFO'] ?? '').trim();
        _isBankLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _isBankLoading = false);
    }
  }

  Future<void> _pickImage() async {
    final picked = await _picker.pickImage(source: ImageSource.gallery);
    if (picked != null) setState(() => _imageFile = picked);
  }

  Future<void> _submit() async {
    if (_amountCtrl.text.isEmpty || _imageFile == null) return;
    setState(() => _isSubmitting = true);
    try {
      await Provider.of<WalletProvider>(context, listen: false)
          .topUp(double.parse(_amountCtrl.text), _imageFile!);
      if (!context.mounted) return;
      Navigator.pop(context);
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Gagal: $e')));
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Padding(
      padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
          top: 24,
          left: 24,
          right: 24),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Top Up Saldo',
                style: GoogleFonts.outfit(
                    fontSize: 20, 
                    fontWeight: FontWeight.bold,
                    color: colorScheme.onSurface)),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                  color: colorScheme.primary.withOpacity(0.06),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                      color: colorScheme.primary.withOpacity(0.4))),
              child: Row(
                children: [
                  CircleAvatar(
                      backgroundColor: colorScheme.primary,
                      child: Icon(Icons.account_balance, color: colorScheme.onPrimary)),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.
                      start,
                      
                      children: [
                        Text('Rekening Tujuan',
                            style: GoogleFonts.outfit(
                                color: colorScheme.onSurface,
                                fontWeight: FontWeight.bold)),
                        const SizedBox(height: 4),
                        Text(
                            _isBankLoading
                                ? 'Memuat...'
                                : (_bankInfo.trim() == ''
                                    ? 'Belum diatur oleh admin'
                                    : _bankInfo),
                            style: GoogleFonts.outfit(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: colorScheme.onSurface,
                                letterSpacing: 1)),
                      ],
                    ),
                  ),
                  IconButton(
                      icon: Icon(Icons.copy, color: colorScheme.primary),
                      onPressed: () {})
                ],
              ),
            ),
            const SizedBox(height: 24),
            TextField(
                controller: _amountCtrl,
                keyboardType: TextInputType.number,
                style: GoogleFonts.outfit(color: colorScheme.onSurface),
                decoration: InputDecoration(
                    labelText: 'Nominal Transfer', 
                    labelStyle: GoogleFonts.outfit(color: colorScheme.onSurface.withOpacity(0.7)),
                    prefixText: '${MerchantConfig.defaultCurrencySymbol} ',
                    prefixStyle: GoogleFonts.outfit(color: colorScheme.onSurface))),
            const SizedBox(height: 16),
            Text('Bukti Transfer (Wajib)',
                style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: colorScheme.onSurface)),
            const SizedBox(height: 8),
            InkWell(
              onTap: _pickImage,
              child: Container(
                height: 150,
                decoration: BoxDecoration(
                    border: Border.all(
                        color: colorScheme.outline.withOpacity(0.4),
                        width: 2),
                    borderRadius: BorderRadius.circular(16),
                    color: colorScheme.surfaceVariant),
                alignment: Alignment.center,
                child: _imageFile == null
                    ? Column(children: [
                        const SizedBox(height: 50),
                        Icon(Icons.cloud_upload_outlined,
                            size: 40,
                            color: colorScheme.onSurface.withOpacity(0.7)),
                        Text('Tap untuk upload',
                            style: GoogleFonts.outfit(
                                color: colorScheme.onSurface.withOpacity(0.7)))
                      ])
                    : ClipRRect(
                        borderRadius: BorderRadius.circular(14),
                        child: kIsWeb
                            ? Image.network(_imageFile!.path,
                                fit: BoxFit.cover, width: double.infinity)
                            : Image.file(File(_imageFile!.path),
                                fit: BoxFit.cover, width: double.infinity)),
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
                width: double.infinity,
                child: FilledButton(
                    onPressed: _isSubmitting ? null : _submit,
                    style: FilledButton.styleFrom(
                        backgroundColor: colorScheme.primary,
                        foregroundColor: colorScheme.onPrimary,
                        padding: const EdgeInsets.all(16)),
                    child: _isSubmitting
                        ? CircularProgressIndicator(color: colorScheme.onPrimary)
                        : const Text('Kirim Pengajuan'))),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

class _TransferSheet extends StatefulWidget {
  const _TransferSheet();
  @override
  State<_TransferSheet> createState() => __TransferSheetState();
}

class __TransferSheetState extends State<_TransferSheet> {
  final _amountCtrl = TextEditingController();
  final _storeIdCtrl = TextEditingController();
  final _noteCtrl = TextEditingController();
  bool _isSubmitting = false;

  Future<void> _submit() async {
    if (_amountCtrl.text.isEmpty || _storeIdCtrl.text.isEmpty) return;
    setState(() => _isSubmitting = true);
    try {
      await Provider.of<WalletProvider>(context, listen: false).transfer(
          _storeIdCtrl.text, double.parse(_amountCtrl.text), _noteCtrl.text);
      if (!context.mounted) return;
      Navigator.pop(context); // Close sheet on success
    } catch (e) {
      if (!context.mounted) return;
      // Show Modal Error as requested
      showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
                backgroundColor: Theme.of(context).colorScheme.surface,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16)),
                title: Row(
                  children: [
                    Icon(Icons.error_outline, color: Theme.of(context).colorScheme.primary),
                    const SizedBox(width: 10),
                    Text('Transfer Gagal',
                        style: GoogleFonts.outfit(
                            fontWeight: FontWeight.bold, 
                            fontSize: 18,
                            color: Theme.of(context).colorScheme.onSurface))
                  ],
                ),
                content: Text(e.toString().replaceAll('Exception: ', ''),
                    style: GoogleFonts.outfit(color: Theme.of(context).colorScheme.onSurface)),
                actions: [
                  TextButton(
                      onPressed: () => Navigator.pop(ctx),
                      child: Text('OK',
                          style: GoogleFonts.outfit(
                              fontWeight: FontWeight.bold,
                              color: Theme.of(context).colorScheme.primary)))
                ],
              ));
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Padding(
      padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
          top: 24,
          left: 24,
          right: 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Transfer ke Merchant Lain',
              style: GoogleFonts.outfit(
                  fontSize: 20, 
                  fontWeight: FontWeight.bold,
                  color: colorScheme.onSurface)),
          const SizedBox(height: 24),
          TextField(
              controller: _storeIdCtrl,
              style: GoogleFonts.outfit(color: colorScheme.onSurface),
              decoration:
                  InputDecoration(
                      labelText: 'Store ID Penerima',
                      labelStyle: GoogleFonts.outfit(color: colorScheme.onSurface.withOpacity(0.7)))),
          const SizedBox(height: 16),
          TextField(
              controller: _amountCtrl,
              keyboardType: TextInputType.number,
              style: GoogleFonts.outfit(color: colorScheme.onSurface),
              decoration: InputDecoration(
                  labelText: 'Nominal Transfer', 
                  labelStyle: GoogleFonts.outfit(color: colorScheme.onSurface.withOpacity(0.7)),
                  prefixText: '${MerchantConfig.defaultCurrencySymbol} ',
                  prefixStyle: GoogleFonts.outfit(color: colorScheme.onSurface))),
          const SizedBox(height: 16),
          TextField(
              controller: _noteCtrl,
              style: GoogleFonts.outfit(color: colorScheme.onSurface),
              decoration: InputDecoration(
                  labelText: 'Catatan',
                  labelStyle: GoogleFonts.outfit(color: colorScheme.onSurface.withOpacity(0.7)))),
          const SizedBox(height: 24),
          SizedBox(
              width: double.infinity,
              child: FilledButton(
                  onPressed: _isSubmitting ? null : _submit,
                  style: FilledButton.styleFrom(
                      backgroundColor: colorScheme.primary,
                      foregroundColor: colorScheme.onPrimary,
                      padding: const EdgeInsets.all(16)),
                  child: _isSubmitting
                      ? CircularProgressIndicator(color: colorScheme.onPrimary)
                      : const Text('Transfer Sekarang'))),
          const SizedBox(height: 24)
        ],
      ),
    );
  }
}

class _WithdrawSheet extends StatefulWidget {
  const _WithdrawSheet();
  @override
  State<_WithdrawSheet> createState() => __WithdrawSheetState();
}

class __WithdrawSheetState extends State<_WithdrawSheet> {
  final _amountCtrl = TextEditingController();
  final _bankCtrl = TextEditingController();
  final _accountCtrl = TextEditingController();
  bool _isSubmitting = false;

  Future<void> _submit() async {
    if (_amountCtrl.text.isEmpty) return;
    setState(() => _isSubmitting = true);
    try {
      await Provider.of<WalletProvider>(context, listen: false).withdraw(
          double.parse(_amountCtrl.text), _bankCtrl.text, _accountCtrl.text);
      if (!context.mounted) return;
      Navigator.pop(context);
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Gagal: $e')));
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Padding(
      padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
          top: 24,
          left: 24,
          right: 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Tarik Saldo',
              style: GoogleFonts.outfit(
                  fontSize: 20, 
                  fontWeight: FontWeight.bold,
                  color: colorScheme.onSurface)),
          const SizedBox(height: 24),
          TextField(
              controller: _amountCtrl,
              keyboardType: TextInputType.number,
              style: GoogleFonts.outfit(color: colorScheme.onSurface),
              decoration: InputDecoration(
                  labelText: 'Nominal Penarikan', 
                  labelStyle: GoogleFonts.outfit(color: colorScheme.onSurface.withOpacity(0.7)),
                  prefixText: '${MerchantConfig.defaultCurrencySymbol} ',
                  prefixStyle: GoogleFonts.outfit(color: colorScheme.onSurface))),
          const SizedBox(height: 16),
          TextField(
              controller: _bankCtrl,
              style: GoogleFonts.outfit(color: colorScheme.onSurface),
              decoration: InputDecoration(
                  labelText: 'Nama Bank',
                  labelStyle: GoogleFonts.outfit(color: colorScheme.onSurface.withOpacity(0.7)))),
          const SizedBox(height: 16),
          TextField(
              controller: _accountCtrl,
              keyboardType: TextInputType.number,
              style: GoogleFonts.outfit(color: colorScheme.onSurface),
              decoration: InputDecoration(
                  labelText: 'Nomor Rekening',
                  labelStyle: GoogleFonts.outfit(color: colorScheme.onSurface.withOpacity(0.7)))),
          const SizedBox(height: 24),
          SizedBox(
              width: double.infinity,
              child: FilledButton(
                  onPressed: _isSubmitting ? null : _submit,
                  style: FilledButton.styleFrom(
                      backgroundColor: colorScheme.primary,
                      foregroundColor: colorScheme.onPrimary,
                      padding: const EdgeInsets.all(16)),
                  child: _isSubmitting
                      ? CircularProgressIndicator(color: colorScheme.onPrimary)
                      : const Text('Ajukan Penarikan'))),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}
