import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:mobile_driver/config/theme_config.dart';
import 'package:mobile_driver/data/driver_api_service.dart';

class LeaderboardScreen extends StatefulWidget {
  const LeaderboardScreen({super.key});

  @override
  State<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends State<LeaderboardScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _period = 'week';
  List<dynamic> _tripsLeaderboard = [];
  List<dynamic> _earningsLeaderboard = [];
  List<dynamic> _ratingLeaderboard = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadLeaderboards();
  }

  Future<void> _loadLeaderboards() async {
    setState(() => _isLoading = true);
    final api = DriverApiService();

    final results = await Future.wait([
      api.getLeaderboard(type: 'trips', period: _period),
      api.getLeaderboard(type: 'earnings', period: _period),
      api.getLeaderboard(type: 'rating', period: _period),
    ]);

    if (mounted) {
      setState(() {
        _tripsLeaderboard = results[0];
        _earningsLeaderboard = results[1];
        _ratingLeaderboard = results[2];
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ThemeConfig.beigeBackground,
      appBar: AppBar(
        title: Text('Papan Peringkat',
            style: GoogleFonts.outfit(
                fontWeight: FontWeight.bold, color: ThemeConfig.brandColor)),
        backgroundColor: ThemeConfig.beigeBackground,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new,
              size: 20, color: ThemeConfig.brandColor),
          onPressed: () => Navigator.pop(context),
        ),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: ThemeConfig.brandColor,
          labelColor: ThemeConfig.brandColor,
          unselectedLabelColor: Colors.grey,
          labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
          tabs: const [
            Tab(text: 'Trip'),
            Tab(text: 'Pendapatan'),
            Tab(text: 'Rating'),
          ],
        ),
      ),
      body: Column(
        children: [
          _buildPeriodSelector(),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : TabBarView(
                    controller: _tabController,
                    children: [
                      _buildLeaderboardList(_tripsLeaderboard, Icons.directions_bike_rounded, Colors.blue),
                      _buildLeaderboardList(_earningsLeaderboard, Icons.monetization_on_rounded, Colors.green),
                      _buildLeaderboardList(_ratingLeaderboard, Icons.star_rounded, Colors.amber),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildPeriodSelector() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          _buildPeriodChip('Hari Ini', 'today'),
          const SizedBox(width: 8),
          _buildPeriodChip('Minggu Ini', 'week'),
          const SizedBox(width: 8),
          _buildPeriodChip('Bulan Ini', 'month'),
        ],
      ),
    );
  }

  Widget _buildPeriodChip(String label, String value) {
    final isActive = _period == value;
    return GestureDetector(
      onTap: () {
        setState(() => _period = value);
        _loadLeaderboards();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isActive ? ThemeConfig.brandColor : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isActive ? ThemeConfig.brandColor : Colors.grey.shade300,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isActive ? Colors.white : Colors.grey.shade700,
            fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
            fontSize: 12,
          ),
        ),
      ),
    );
  }

  Widget _buildLeaderboardList(List<dynamic> data, IconData icon, Color color) {
    if (data.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 64, color: Colors.grey.shade300),
            const SizedBox(height: 16),
            Text('Belum ada data peringkat',
                style: TextStyle(color: Colors.grey.shade500)),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadLeaderboards,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: data.length,
        itemBuilder: (context, index) {
          final item = Map<String, dynamic>.from(data[index]);
          return _buildLeaderboardCard(item, index, icon, color);
        },
      ),
    );
  }

  Widget _buildLeaderboardCard(
      Map<String, dynamic> item, int index, IconData icon, Color color) {
    final rank = item['rank'] ?? (index + 1);
    final name = item['name'] ?? 'Driver';
    final label = item['label'] ?? '${item['score']}';
    final rating = (item['rating'] as num?)?.toDouble() ?? 0;

    final isTop3 = rank <= 3;
    final medalColors = [Colors.amber, Colors.grey.shade400, Colors.brown.shade300];

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: isTop3
            ? Border.all(color: medalColors[rank - 1], width: 1.5)
            : null,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: Row(
        children: [
          // Rank badge
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: isTop3
                  ? medalColors[rank - 1].withOpacity(0.2)
                  : Colors.grey.shade100,
              shape: BoxShape.circle,
            ),
            child: Center(
              child: isTop3
                  ? Icon(Icons.emoji_events_rounded,
                      color: medalColors[rank - 1], size: 20)
                  : Text('#$rank',
                      style: GoogleFonts.outfit(
                          fontWeight: FontWeight.bold,
                          color: Colors.grey.shade600)),
            ),
          ),
          const SizedBox(width: 16),
          // Driver info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name,
                    style: GoogleFonts.outfit(
                        fontWeight: FontWeight.w600, fontSize: 15)),
                Row(
                  children: [
                    Icon(Icons.star_rounded, color: Colors.amber, size: 14),
                    const SizedBox(width: 2),
                    Text('$rating',
                        style: TextStyle(
                            color: Colors.grey.shade600, fontSize: 12)),
                  ],
                ),
              ],
            ),
          ),
          // Score
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              label,
              style: GoogleFonts.outfit(
                  fontWeight: FontWeight.bold, color: color, fontSize: 13),
            ),
          ),
        ],
      ),
    ).animate().fadeIn(delay: (50 * index).ms).slideX(begin: 0.05);
  }
}
