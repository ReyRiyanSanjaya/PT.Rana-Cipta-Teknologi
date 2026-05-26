import 'dart:math' as math;
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:rana_market/config/theme_config.dart';

// ─── PPOB Data Models ──────────────────────────────────────────────────────
class _PpobCategory {
  final IconData icon;
  final String title;
  final List<Color> gradient;
  final String badge;

  const _PpobCategory({
    required this.icon,
    required this.title,
    required this.gradient,
    this.badge = '',
  });
}

class _PpobPromo {
  final String title;
  final String sub;
  final String code;
  final List<Color> gradient;
  final IconData icon;
  const _PpobPromo({
    required this.title,
    required this.sub,
    required this.code,
    required this.gradient,
    required this.icon,
  });
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
class PpobScreen extends StatefulWidget {
  const PpobScreen({super.key});
  @override
  State<PpobScreen> createState() => _PpobScreenState();
}

class _PpobScreenState extends State<PpobScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseCtrl;
  bool _balanceVisible = true;
  int? _pressedIndex;

  final List<_PpobCategory> _categories = const [
    _PpobCategory(
      icon: Icons.phone_android_rounded,
      title: 'Pulsa & Data',
      gradient: [Color(0xFF667EEA), Color(0xFF764BA2)],
      badge: 'HOT',
    ),
    _PpobCategory(
      icon: Icons.bolt_rounded,
      title: 'Listrik PLN',
      gradient: [Color(0xFFF093FB), Color(0xFFF5576C)],
    ),
    _PpobCategory(
      icon: Icons.water_drop_rounded,
      title: 'PDAM',
      gradient: [Color(0xFF4FACFE), Color(0xFF00F2FE)],
    ),
    _PpobCategory(
      icon: Icons.wifi_tethering_rounded,
      title: 'Internet & TV',
      gradient: [Color(0xFF43E97B), Color(0xFF38F9D7)],
    ),
    _PpobCategory(
      icon: Icons.sports_esports_rounded,
      title: 'Voucher Game',
      gradient: [Color(0xFFFA709A), Color(0xFFFEE140)],
      badge: 'NEW',
    ),
    _PpobCategory(
      icon: Icons.account_balance_wallet_rounded,
      title: 'E-Money',
      gradient: [Color(0xFF30CFD0), Color(0xFF667EEA)],
    ),
    _PpobCategory(
      icon: Icons.health_and_safety_rounded,
      title: 'BPJS',
      gradient: [Color(0xFF11998E), Color(0xFF38EF7D)],
    ),
    _PpobCategory(
      icon: Icons.train_rounded,
      title: 'Tiket Kereta',
      gradient: [Color(0xFFFC4A1A), Color(0xFFF7B733)],
    ),
  ];

  final List<_PpobPromo> _promos = const [
    _PpobPromo(
      title: 'Diskon Pulsa 50%',
      sub: 'Berlaku untuk semua operator',
      code: 'RANA50',
      gradient: [Color(0xFF667EEA), Color(0xFF764BA2)],
      icon: Icons.phone_android_rounded,
    ),
    _PpobPromo(
      title: 'Cashback Listrik',
      sub: 'Hemat hingga Rp 25.000',
      code: 'RANAPLN',
      gradient: [Color(0xFFF093FB), Color(0xFFF5576C)],
      icon: Icons.bolt_rounded,
    ),
    _PpobPromo(
      title: 'Gratis Game Top Up',
      sub: 'Min. transaksi Rp 50.000',
      code: 'RANAGAME',
      gradient: [Color(0xFF4FACFE), Color(0xFF00F2FE)],
      icon: Icons.sports_esports_rounded,
    ),
  ];

  @override
  void initState() {
    super.initState();
    _pulseCtrl = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulseCtrl.dispose();
    super.dispose();
  }

  void _onCategoryTap(_PpobCategory cat) {
    HapticFeedback.mediumImpact();
    _showPpobInputSheet(cat);
  }

  void _showPpobInputSheet(_PpobCategory cat) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _PpobInputSheet(category: cat),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF0F2F8),
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          _buildSliverHeader(),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 24),
                  _buildQuickActions(),
                  const SizedBox(height: 28),
                  _buildSectionHeader('Layanan Populer', 'Lihat Semua'),
                  const SizedBox(height: 16),
                  _buildCategoryGrid(),
                  const SizedBox(height: 28),
                  _buildSectionHeader('Promo Eksklusif', 'Semua Promo'),
                  const SizedBox(height: 16),
                  _buildPromos(),
                  const SizedBox(height: 28),
                  _buildHistorySection(),
                  const SizedBox(height: 100),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSliverHeader() {
    return SliverAppBar(
      expandedHeight: 220,
      pinned: true,
      stretch: true,
      backgroundColor: const Color(0xFF1A1A2E),
      leading: IconButton(
        icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
        onPressed: () => Navigator.pop(context),
      ),
      actions: [
        IconButton(
          icon: const Icon(Icons.notifications_outlined, color: Colors.white),
          onPressed: () {},
        ),
        const SizedBox(width: 4),
      ],
      flexibleSpace: FlexibleSpaceBar(
        collapseMode: CollapseMode.pin,
        background: _buildHeroHeader(),
      ),
      title: AnimatedBuilder(
        animation: _pulseCtrl,
        builder: (_, __) => const Text(
          'Top Up & Tagihan',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
        ),
      ),
    );
  }

  Widget _buildHeroHeader() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF1A1A2E), Color(0xFF16213E), Color(0xFF0F3460)],
        ),
      ),
      child: Stack(
        children: [
          // Decorative circles
          Positioned(
            top: -40, right: -30,
            child: AnimatedBuilder(
              animation: _pulseCtrl,
              builder: (_, __) => Opacity(
                opacity: 0.15 + _pulseCtrl.value * 0.1,
                child: Container(
                  width: 200, height: 200,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [Color(0xFF764BA2), Colors.transparent],
                    ),
                  ),
                ),
              ),
            ),
          ),
          Positioned(
            bottom: -20, left: -40,
            child: AnimatedBuilder(
              animation: _pulseCtrl,
              builder: (_, __) => Opacity(
                opacity: 0.1 + _pulseCtrl.value * 0.08,
                child: Container(
                  width: 180, height: 180,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [Color(0xFF667EEA), Colors.transparent],
                    ),
                  ),
                ),
              ),
            ),
          ),

          // Balance Card
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 56, 20, 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        'Saldo RanaPay',
                        style: GoogleFonts.poppins(
                          color: Colors.white.withOpacity(0.75),
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(width: 8),
                      GestureDetector(
                        onTap: () {
                          HapticFeedback.lightImpact();
                          setState(() => _balanceVisible = !_balanceVisible);
                        },
                        child: Icon(
                          _balanceVisible ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                          color: Colors.white54,
                          size: 16,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  AnimatedSwitcher(
                    duration: const Duration(milliseconds: 300),
                    child: _balanceVisible
                        ? Text(
                            'Rp 2.450.000',
                            key: const ValueKey('visible'),
                            style: GoogleFonts.poppins(
                              color: Colors.white,
                              fontSize: 32,
                              fontWeight: FontWeight.w900,
                              letterSpacing: -0.5,
                            ),
                          )
                        : Text(
                            'Rp ••••••',
                            key: const ValueKey('hidden'),
                            style: GoogleFonts.poppins(
                              color: Colors.white,
                              fontSize: 32,
                              fontWeight: FontWeight.w900,
                              letterSpacing: -0.5,
                            ),
                          ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.trending_up_rounded, color: Color(0xFF43E97B), size: 14),
                      const SizedBox(width: 4),
                      Text(
                        '+Rp 150.000 bulan ini',
                        style: GoogleFonts.poppins(
                          color: const Color(0xFF43E97B),
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActions() {
    final actions = [
      {'icon': Icons.add_rounded, 'label': 'Top Up', 'color': const Color(0xFF667EEA)},
      {'icon': Icons.send_rounded, 'label': 'Transfer', 'color': const Color(0xFF43E97B)},
      {'icon': Icons.history_rounded, 'label': 'Riwayat', 'color': const Color(0xFFF093FB)},
      {'icon': Icons.qr_code_scanner_rounded, 'label': 'Scan QR', 'color': const Color(0xFFFC4A1A)},
    ];

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: actions.asMap().entries.map((e) {
          final idx = e.key;
          final action = e.value;
          return GestureDetector(
            onTap: () {
              HapticFeedback.lightImpact();
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('${action['label']} segera hadir!'),
                  behavior: SnackBarBehavior.floating,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              );
            },
            child: Column(
              children: [
                Container(
                  width: 56, height: 56,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        (action['color'] as Color).withOpacity(0.15),
                        (action['color'] as Color).withOpacity(0.05),
                      ],
                    ),
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: (action['color'] as Color).withOpacity(0.3),
                      width: 1.5,
                    ),
                  ),
                  child: Icon(action['icon'] as IconData, color: action['color'] as Color, size: 24),
                ),
                const SizedBox(height: 8),
                Text(
                  action['label'] as String,
                  style: GoogleFonts.poppins(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.black87),
                ),
              ],
            ),
          ).animate().fadeIn(delay: (80 * idx).ms).slideY(begin: 0.3, curve: Curves.easeOutBack);
        }).toList(),
      ),
    ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.1);
  }

  Widget _buildSectionHeader(String title, String action) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(title, style: GoogleFonts.poppins(fontSize: 17, fontWeight: FontWeight.w800, color: const Color(0xFF1A1A2E))),
        GestureDetector(
          onTap: () {},
          child: Text(action, style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.w600, color: ThemeConfig.brandColor)),
        ),
      ],
    );
  }

  Widget _buildCategoryGrid() {
    return GridView.builder(
      physics: const NeverScrollableScrollPhysics(),
      shrinkWrap: true,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 4,
        mainAxisSpacing: 16,
        crossAxisSpacing: 12,
        childAspectRatio: 0.78,
      ),
      itemCount: _categories.length,
      itemBuilder: (ctx, i) {
        final cat = _categories[i];
        final isPressed = _pressedIndex == i;
        return GestureDetector(
          onTapDown: (_) => setState(() => _pressedIndex = i),
          onTapUp: (_) {
            setState(() => _pressedIndex = null);
            _onCategoryTap(cat);
          },
          onTapCancel: () => setState(() => _pressedIndex = null),
          child: AnimatedScale(
            scale: isPressed ? 0.92 : 1.0,
            duration: const Duration(milliseconds: 100),
            child: Column(
              children: [
                Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Container(
                      width: 60, height: 60,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: cat.gradient,
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(18),
                        boxShadow: [
                          BoxShadow(
                            color: cat.gradient.first.withOpacity(0.4),
                            blurRadius: 12,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      child: Icon(cat.icon, color: Colors.white, size: 26),
                    ),
                    if (cat.badge.isNotEmpty)
                      Positioned(
                        top: -6, right: -8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFC4A1A),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            cat.badge,
                            style: const TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.w900),
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  cat.title,
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.poppins(fontSize: 10.5, fontWeight: FontWeight.w700, color: const Color(0xFF1A1A2E)),
                ),
              ],
            ),
          ),
        ).animate().fadeIn(delay: (60 * i).ms).scale(begin: const Offset(0.7, 0.7), curve: Curves.easeOutBack);
      },
    );
  }

  Widget _buildPromos() {
    return SizedBox(
      height: 160,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: _promos.length,
        separatorBuilder: (_, __) => const SizedBox(width: 14),
        itemBuilder: (ctx, i) {
          final promo = _promos[i];
          return GestureDetector(
            onTap: () {
              HapticFeedback.mediumImpact();
              _showPromoDetail(promo);
            },
            child: Container(
              width: 260,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: promo.gradient,
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: promo.gradient.first.withOpacity(0.35),
                    blurRadius: 16,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Stack(
                children: [
                  // Background icon
                  Positioned(
                    right: -10, bottom: -10,
                    child: Icon(
                      promo.icon,
                      size: 80,
                      color: Colors.white.withOpacity(0.15),
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text('PROMO EKSKLUSIF',
                            style: GoogleFonts.poppins(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w900, letterSpacing: 0.5)),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(promo.title,
                              style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 17, height: 1.2)),
                          const SizedBox(height: 4),
                          Text(promo.sub,
                              style: GoogleFonts.poppins(color: Colors.white.withOpacity(0.85), fontSize: 11)),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Text(
                                  'Klaim Sekarang',
                                  style: GoogleFonts.poppins(
                                    fontWeight: FontWeight.w800,
                                    fontSize: 11,
                                    color: promo.gradient.first,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                                decoration: BoxDecoration(
                                  border: Border.all(color: Colors.white.withOpacity(0.5)),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Text(
                                  promo.code,
                                  style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 11),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ).animate().fadeIn(delay: (150 * i).ms).slideX(begin: 0.3, curve: Curves.easeOutBack);
        },
      ),
    );
  }

  void _showPromoDetail(_PpobPromo promo) {
    showDialog(
      context: context,
      builder: (_) => Dialog(
        backgroundColor: Colors.transparent,
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            gradient: LinearGradient(colors: promo.gradient, begin: Alignment.topLeft, end: Alignment.bottomRight),
            borderRadius: BorderRadius.circular(28),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(promo.icon, color: Colors.white, size: 56),
              const SizedBox(height: 16),
              Text(promo.title, style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 22), textAlign: TextAlign.center),
              const SizedBox(height: 8),
              Text(promo.sub, style: GoogleFonts.poppins(color: Colors.white70, fontSize: 13), textAlign: TextAlign.center),
              const SizedBox(height: 24),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                decoration: BoxDecoration(color: Colors.white.withOpacity(0.25), borderRadius: BorderRadius.circular(16)),
                child: Text(promo.code, style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 18, letterSpacing: 3)),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    HapticFeedback.heavyImpact();
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Kode ${promo.code} berhasil diklaim! 🎉'),
                        backgroundColor: Colors.green,
                        behavior: SnackBarBehavior.floating,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: promo.gradient.first,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: Text('Klaim Voucher', style: GoogleFonts.poppins(fontWeight: FontWeight.w900)),
                ),
              ),
            ],
          ),
        ),
      ).animate().scale(begin: const Offset(0.8, 0.8), duration: 300.ms, curve: Curves.easeOutBack),
    );
  }

  Widget _buildHistorySection() {
    final items = [
      {'title': 'Telkomsel 25GB', 'date': '2 Apr 2026', 'amount': '-Rp 85.000', 'icon': Icons.phone_android_rounded, 'color': const Color(0xFF667EEA)},
      {'title': 'PLN 200 kWh', 'date': '30 Mar 2026', 'amount': '-Rp 200.000', 'icon': Icons.bolt_rounded, 'color': const Color(0xFFF093FB)},
      {'title': 'MLBB 500 Diamonds', 'date': '28 Mar 2026', 'amount': '-Rp 95.000', 'icon': Icons.sports_esports_rounded, 'color': const Color(0xFFFA709A)},
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionHeader('Transaksi Terakhir', 'Semua'),
        const SizedBox(height: 14),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 20, offset: const Offset(0, 8))],
          ),
          child: Column(
            children: items.asMap().entries.map((e) {
              final idx = e.key;
              final item = e.value;
              return Column(
                children: [
                  ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
                    leading: Container(
                      width: 46, height: 46,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(colors: [(item['color'] as Color).withOpacity(0.2), (item['color'] as Color).withOpacity(0.05)]),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Icon(item['icon'] as IconData, color: item['color'] as Color, size: 22),
                    ),
                    title: Text(item['title'] as String, style: GoogleFonts.poppins(fontWeight: FontWeight.w700, fontSize: 13)),
                    subtitle: Text(item['date'] as String, style: GoogleFonts.poppins(fontSize: 11, color: Colors.black45)),
                    trailing: Text(
                      item['amount'] as String,
                      style: GoogleFonts.poppins(fontWeight: FontWeight.w900, fontSize: 14, color: const Color(0xFFE63946)),
                    ),
                  ),
                  if (idx < items.length - 1)
                    Divider(height: 1, color: Colors.grey.shade100, indent: 78),
                ],
              ).animate().fadeIn(delay: (100 * idx).ms).slideX(begin: -0.1);
            }).toList(),
          ),
        ),
      ],
    );
  }
}

// ─── PPOB Input Bottom Sheet ────────────────────────────────────────────────
class _PpobInputSheet extends StatefulWidget {
  final _PpobCategory category;
  const _PpobInputSheet({required this.category});

  @override
  State<_PpobInputSheet> createState() => _PpobInputSheetState();
}

class _PpobInputSheetState extends State<_PpobInputSheet> {
  final _phoneCtrl = TextEditingController();
  String? _selectedNominal;
  bool _isLoading = false;

  final List<Map<String, String>> _nominals = [
    {'label': 'Rp 10.000', 'value': '10000'},
    {'label': 'Rp 20.000', 'value': '20000'},
    {'label': 'Rp 50.000', 'value': '50000'},
    {'label': 'Rp 100.000', 'value': '100000'},
    {'label': 'Rp 150.000', 'value': '150000'},
    {'label': 'Rp 200.000', 'value': '200000'},
  ];

  @override
  void dispose() {
    _phoneCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
      ),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(24, 12, 24, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle
            Center(
              child: Container(
                width: 44, height: 4,
                decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
              ),
            ),
            const SizedBox(height: 20),

            // Title
            Row(
              children: [
                Container(
                  width: 48, height: 48,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(colors: widget.category.gradient),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(widget.category.icon, color: Colors.white, size: 24),
                ),
                const SizedBox(width: 14),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(widget.category.title,
                        style: GoogleFonts.poppins(fontWeight: FontWeight.w800, fontSize: 18)),
                    Text('Bayar mudah, cepat, aman',
                        style: GoogleFonts.poppins(fontSize: 12, color: Colors.black45)),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Phone Input
            Text('Nomor / ID Pelanggan',
                style: GoogleFonts.poppins(fontWeight: FontWeight.w700, fontSize: 13)),
            const SizedBox(height: 8),
            TextField(
              controller: _phoneCtrl,
              keyboardType: TextInputType.phone,
              style: GoogleFonts.poppins(fontWeight: FontWeight.w700, fontSize: 16),
              decoration: InputDecoration(
                hintText: 'Contoh: 08xxxxxxxxxx',
                hintStyle: GoogleFonts.poppins(color: Colors.black26, fontWeight: FontWeight.w400),
                filled: true,
                fillColor: const Color(0xFFF8F9FE),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                prefixIcon: Container(
                  margin: const EdgeInsets.all(10),
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(colors: widget.category.gradient.map((c) => c.withOpacity(0.2)).toList()),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(Icons.phone_rounded, color: widget.category.gradient.first, size: 16),
                ),
                suffixIcon: _phoneCtrl.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.cancel_rounded, color: Colors.black26),
                        onPressed: () => setState(() => _phoneCtrl.clear()),
                      )
                    : null,
              ),
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 24),

            // Nominal Selection
            Text('Pilih Nominal',
                style: GoogleFonts.poppins(fontWeight: FontWeight.w700, fontSize: 13)),
            const SizedBox(height: 12),
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 3,
                mainAxisSpacing: 10,
                crossAxisSpacing: 10,
                childAspectRatio: 2.2,
              ),
              itemCount: _nominals.length,
              itemBuilder: (_, i) {
                final nom = _nominals[i];
                final isSelected = _selectedNominal == nom['value'];
                return GestureDetector(
                  onTap: () {
                    HapticFeedback.lightImpact();
                    setState(() => _selectedNominal = nom['value']);
                  },
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    decoration: BoxDecoration(
                      gradient: isSelected
                          ? LinearGradient(colors: widget.category.gradient)
                          : null,
                      color: isSelected ? null : const Color(0xFFF8F9FE),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isSelected ? widget.category.gradient.first : Colors.grey.shade200,
                        width: isSelected ? 2 : 1,
                      ),
                      boxShadow: isSelected ? [
                        BoxShadow(color: widget.category.gradient.first.withOpacity(0.3), blurRadius: 8, offset: const Offset(0, 4)),
                      ] : null,
                    ),
                    child: Center(
                      child: Text(
                        nom['label']!,
                        style: GoogleFonts.poppins(
                          fontWeight: FontWeight.w700,
                          fontSize: 12,
                          color: isSelected ? Colors.white : Colors.black87,
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: 28),

            // Pay Button
            SizedBox(
              width: double.infinity,
              height: 58,
              child: ElevatedButton(
                onPressed: (_phoneCtrl.text.isNotEmpty && _selectedNominal != null && !_isLoading)
                    ? () async {
                        HapticFeedback.heavyImpact();
                        setState(() => _isLoading = true);
                        await Future.delayed(const Duration(seconds: 2));
                        if (mounted) {
                          Navigator.pop(context);
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Pembayaran berhasil! 🎉'),
                              backgroundColor: Colors.green,
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        }
                      }
                    : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  shadowColor: Colors.transparent,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                  padding: EdgeInsets.zero,
                ),
                child: Ink(
                  decoration: BoxDecoration(
                    gradient: (_phoneCtrl.text.isNotEmpty && _selectedNominal != null)
                        ? LinearGradient(colors: widget.category.gradient)
                        : null,
                    color: (_phoneCtrl.text.isEmpty || _selectedNominal == null) ? Colors.grey.shade200 : null,
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: Center(
                    child: _isLoading
                        ? const CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5)
                        : Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.lock_rounded, color: Colors.white, size: 18),
                              const SizedBox(width: 8),
                              Text(
                                'Bayar Sekarang',
                                style: GoogleFonts.poppins(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 16,
                                  color: (_phoneCtrl.text.isEmpty || _selectedNominal == null) ? Colors.black26 : Colors.white,
                                ),
                              ),
                            ],
                          ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
