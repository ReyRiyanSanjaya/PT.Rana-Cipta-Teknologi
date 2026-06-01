import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:rana_sales/config/app_theme.dart';
import 'package:rana_sales/data/api_service.dart';
import 'package:rana_sales/providers/auth_provider.dart';
import 'package:rana_sales/screens/leaderboard_screen.dart';
import 'package:rana_sales/screens/route_plan_screen.dart';
import 'package:rana_sales/screens/notifications_screen.dart';
import 'package:rana_sales/screens/sales_analytics_screen.dart';
import 'package:rana_sales/screens/receivables_screen.dart';
import 'package:rana_sales/screens/kpi_screen.dart';
import 'package:rana_sales/screens/promotions_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Map<String, dynamic>? _dashboard;
  Map<String, dynamic>? _targets;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      setState(() => _isLoading = true);
      final results = await Future.wait([
        ApiService().getSfaDashboard(),
        ApiService().getTargets(),
      ]);
      if (mounted) {
        setState(() {
          _dashboard = results[0];
          _targets = results[1];
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _fmtCurrency(num value) {
    if (value >= 1000000) return 'Rp ${(value / 1000000).toStringAsFixed(1)}Jt';
    if (value >= 1000) return 'Rp ${(value / 1000).toStringAsFixed(0)}Rb';
    return 'Rp ${value.toStringAsFixed(0)}';
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      body: SafeArea(
        child: _isLoading
            ? _buildLoadingState()
            : RefreshIndicator(
                onRefresh: _loadData,
                color: AppTheme.primaryTeal,
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 100),
                  children: [
                    // Header
                    _buildHeader(auth, isDark),
                    const SizedBox(height: 24),

                    // Today Stats
                    if (_dashboard != null) ...[
                      _buildTodayCard(),
                      const SizedBox(height: 16),
                      _buildPipelineCard(isDark),
                      const SizedBox(height: 16),
                      _buildMonthCard(isDark),
                      const SizedBox(height: 16),
                      _buildTargetProgress(isDark),
                      const SizedBox(height: 24),
                      _buildQuickActionsHeader(),
                      const SizedBox(height: 12),
                      _buildQuickActions(),
                    ],
                  ],
                ),
              ),
      ),
    );
  }

  Widget _buildLoadingState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: AppTheme.primaryTeal.withOpacity(0.1),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Center(
              child: SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(strokeWidth: 2.5, color: AppTheme.primaryTeal),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text('Memuat dashboard...', style: TextStyle(color: Colors.grey.shade500, fontSize: 13)),
        ],
      ),
    );
  }

  Widget _buildHeader(AuthProvider auth, bool isDark) {
    return Row(
      children: [
        // Avatar
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            gradient: AppTheme.primaryGradient,
            borderRadius: BorderRadius.circular(14),
            boxShadow: [
              BoxShadow(
                color: AppTheme.primaryTeal.withOpacity(0.25),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Center(
            child: Text(
              auth.userName.isNotEmpty ? auth.userName.substring(0, 2).toUpperCase() : 'RS',
              style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
            ),
          ),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Halo, ${auth.userName.split(' ').first}! 👋',
                style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 2),
              Text(
                DateFormat('EEEE, d MMMM yyyy', 'id_ID').format(DateTime.now()),
                style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
              ),
            ],
          ),
        ),
        // Notification Button
        _buildIconButton(
          Icons.notifications_outlined,
          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const NotificationsScreen())),
        ),
        const SizedBox(width: 8),
        _buildIconButton(
          Icons.emoji_events_outlined,
          color: AppTheme.accentAmber,
          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const LeaderboardScreen())),
        ),
      ],
    ).animate().fadeIn(duration: 400.ms);
  }

  Widget _buildIconButton(IconData icon, {VoidCallback? onTap, Color? color}) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: isDark ? Colors.grey.shade800.withOpacity(0.5) : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(icon, size: 20, color: color ?? (isDark ? Colors.grey.shade300 : Colors.grey.shade700)),
      ),
    );
  }

  Widget _buildTodayCard() {
    final today = _dashboard!['today'] as Map<String, dynamic>;
    final planned = today['planned'] ?? 0;
    final completed = today['completed'] ?? 0;
    final progress = planned > 0 ? completed / planned : 0.0;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: AppTheme.cardGradient,
        borderRadius: BorderRadius.circular(AppTheme.radiusXl),
        boxShadow: [
          BoxShadow(
            color: AppTheme.primaryTeal.withOpacity(0.3),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '📍 Kunjungan Hari Ini',
                  style: TextStyle(color: Colors.white.withOpacity(0.9), fontSize: 12, fontWeight: FontWeight.w500),
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '${today['inProgress'] ?? 0} aktif',
                  style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '$completed',
                style: GoogleFonts.outfit(color: Colors.white, fontSize: 48, fontWeight: FontWeight.bold, height: 1),
              ),
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Text(
                  ' / $planned',
                  style: GoogleFonts.outfit(color: Colors.white.withOpacity(0.6), fontSize: 22),
                ),
              ),
              const Spacer(),
              // Circular progress
              SizedBox(
                width: 52,
                height: 52,
                child: Stack(
                  children: [
                    CircularProgressIndicator(
                      value: progress,
                      strokeWidth: 5,
                      backgroundColor: Colors.white.withOpacity(0.15),
                      valueColor: const AlwaysStoppedAnimation(Colors.white),
                    ),
                    Center(
                      child: Text(
                        '${(progress * 100).toInt()}%',
                        style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Progress bar
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: progress,
              backgroundColor: Colors.white.withOpacity(0.15),
              valueColor: const AlwaysStoppedAnimation(Colors.white),
              minHeight: 6,
            ),
          ),
        ],
      ),
    ).animate().fadeIn(delay: 100.ms).slideY(begin: 0.05);
  }

  Widget _buildPipelineCard(bool isDark) {
    final pipeline = _dashboard!['pipeline'] as Map<String, dynamic>;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        border: Border.all(color: isDark ? Colors.grey.shade800 : Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.inventory_2_outlined, size: 18, color: AppTheme.accentIndigo),
              const SizedBox(width: 8),
              Text('Pipeline Order', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 14)),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _buildPipelineStat('Pending', pipeline['pending'] ?? 0, AppTheme.warning),
              _buildPipelineStat('Proses', pipeline['processing'] ?? 0, AppTheme.info),
              _buildPipelineStat('Kirim', pipeline['shipped'] ?? 0, const Color(0xFF8B5CF6)),
              _buildPipelineStat('Total', pipeline['total'] ?? 0, AppTheme.primaryTeal),
            ],
          ),
        ],
      ),
    ).animate().fadeIn(delay: 200.ms).slideY(begin: 0.05);
  }

  Widget _buildPipelineStat(String label, int value, Color color) {
    return Expanded(
      child: Column(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Center(
              child: Text(
                '$value',
                style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: color, fontSize: 16),
              ),
            ),
          ),
          const SizedBox(height: 6),
          Text(label, style: TextStyle(fontSize: 10, color: Colors.grey.shade600, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }

  Widget _buildMonthCard(bool isDark) {
    final month = _dashboard!['month'] as Map<String, dynamic>;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        border: Border.all(color: isDark ? Colors.grey.shade800 : Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.insights_rounded, size: 18, color: AppTheme.success),
              const SizedBox(width: 8),
              Text('Performa Bulan Ini', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 14)),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _buildMonthStat('Revenue', _fmtCurrency(month['revenue'] ?? 0), Icons.attach_money_rounded, AppTheme.success),
              _buildMonthStat('ECR', '${month['ecr'] ?? 0}%', Icons.trending_up_rounded, AppTheme.accentIndigo),
              _buildMonthStat('Visits', '${month['completedVisits'] ?? 0}', Icons.place_rounded, AppTheme.primaryTeal),
              _buildMonthStat('Effective', '${month['effectiveCalls'] ?? 0}', Icons.check_circle_outline, AppTheme.accentAmber),
            ],
          ),
        ],
      ),
    ).animate().fadeIn(delay: 300.ms).slideY(begin: 0.05);
  }

  Widget _buildMonthStat(String label, String value, IconData icon, Color color) {
    return Expanded(
      child: Column(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 18),
          ),
          const SizedBox(height: 6),
          Text(value, style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 12)),
          Text(label, style: TextStyle(fontSize: 9, color: Colors.grey.shade500)),
        ],
      ),
    );
  }

  Widget _buildTargetProgress(bool isDark) {
    if (_targets == null) return const SizedBox();
    final myTarget = (_targets!['targets'] as List?)?.firstWhere(
      (t) => t['userId'] == context.read<AuthProvider>().userId,
      orElse: () => null,
    );
    if (myTarget == null) return const SizedBox();

    final achievement = myTarget['achievement'] as Map<String, dynamic>? ?? {};

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        border: Border.all(color: isDark ? Colors.grey.shade800 : Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.flag_rounded, size: 18, color: const Color(0xFF8B5CF6)),
              const SizedBox(width: 8),
              Text('Target Saya', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 14)),
              const Spacer(),
              GestureDetector(
                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const KpiScreen())),
                child: Text('Detail →', style: TextStyle(fontSize: 12, color: AppTheme.primaryTeal, fontWeight: FontWeight.w600)),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildProgressBar('Revenue', achievement['revenue'] ?? 0, AppTheme.primaryTeal),
          const SizedBox(height: 12),
          _buildProgressBar('Orders', achievement['orders'] ?? 0, AppTheme.accentIndigo),
          const SizedBox(height: 12),
          _buildProgressBar('Visits', achievement['visits'] ?? 0, AppTheme.accentAmber),
        ],
      ),
    ).animate().fadeIn(delay: 400.ms).slideY(begin: 0.05);
  }

  Widget _buildProgressBar(String label, int percent, Color color) {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: TextStyle(fontSize: 12, color: Colors.grey.shade600, fontWeight: FontWeight.w500)),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text('$percent%', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: color)),
            ),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(6),
          child: LinearProgressIndicator(
            value: percent / 100,
            backgroundColor: color.withOpacity(0.08),
            valueColor: AlwaysStoppedAnimation(color),
            minHeight: 8,
          ),
        ),
      ],
    );
  }

  Widget _buildQuickActionsHeader() {
    return Row(
      children: [
        Text('Aksi Cepat', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 15)),
        const Spacer(),
        Text('${_quickActionItems.length} menu', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
      ],
    ).animate().fadeIn(delay: 450.ms);
  }

  List<_QuickAction> get _quickActionItems => [
    _QuickAction('Route Plan', Icons.route_rounded, AppTheme.accentIndigo, () => Navigator.push(context, MaterialPageRoute(builder: (_) => const RoutePlanScreen()))),
    _QuickAction('Leaderboard', Icons.emoji_events_rounded, AppTheme.accentAmber, () => Navigator.push(context, MaterialPageRoute(builder: (_) => const LeaderboardScreen()))),
    _QuickAction('KPI Target', Icons.flag_rounded, const Color(0xFF8B5CF6), () => Navigator.push(context, MaterialPageRoute(builder: (_) => const KpiScreen()))),
    _QuickAction('Analytics', Icons.bar_chart_rounded, AppTheme.primaryTeal, () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SalesAnalyticsScreen()))),
    _QuickAction('Piutang', Icons.account_balance_wallet_rounded, AppTheme.danger, () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ReceivablesScreen()))),
    _QuickAction('Promosi', Icons.local_offer_rounded, const Color(0xFFEC4899), () => Navigator.push(context, MaterialPageRoute(builder: (_) => const PromotionsScreen()))),
  ];

  Widget _buildQuickActions() {
    final items = _quickActionItems;
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 1.05,
      ),
      itemCount: items.length,
      itemBuilder: (ctx, i) {
        final item = items[i];
        final isDark = Theme.of(context).brightness == Brightness.dark;
        return GestureDetector(
          onTap: item.onTap,
          child: Container(
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B) : Colors.white,
              borderRadius: BorderRadius.circular(AppTheme.radiusLg),
              border: Border.all(color: isDark ? Colors.grey.shade800 : Colors.grey.shade200),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: item.color.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(item.icon, color: item.color, size: 22),
                ),
                const SizedBox(height: 8),
                Text(
                  item.label,
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: isDark ? Colors.grey.shade300 : Colors.grey.shade700),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ).animate().fadeIn(delay: (500 + i * 50).ms).scale(begin: const Offset(0.9, 0.9));
      },
    );
  }
}

class _QuickAction {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  _QuickAction(this.label, this.icon, this.color, this.onTap);
}
