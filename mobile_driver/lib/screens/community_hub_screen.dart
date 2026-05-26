import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';

class CommunityHubScreen extends StatefulWidget {
  const CommunityHubScreen({super.key});

  @override
  State<CommunityHubScreen> createState() => _CommunityHubScreenState();
}

class _CommunityHubScreenState extends State<CommunityHubScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: Text('Community Hub', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        foregroundColor: Colors.black87,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.green,
          labelColor: Colors.green,
          unselectedLabelColor: Colors.grey,
          tabs: const [
            Tab(text: 'Papan Peringkat'),
            Tab(text: 'Forum Driver'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildLeaderboardTab(),
          _buildForumTab(),
        ],
      ),
    );
  }

  Widget _buildLeaderboardTab() {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        _buildLeaderboardCard('Pendapatan Tertinggi (Mingguan)', 'Rp1.850.000', '#1', Colors.amber),
        const SizedBox(height: 16),
        _buildLeaderboardCard('Trip Terbanyak (Mingguan)', '125 Trips', '#3', Colors.blue),
        const SizedBox(height: 16),
        _buildLeaderboardCard('Rating Tertinggi', '4.98', '#12', Colors.purple),
      ],
    );
  }

  Widget _buildLeaderboardCard(String title, String value, String rank, Color color) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Row(
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: TextStyle(color: color, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Text(value, style: GoogleFonts.outfit(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.black87)),
            ],
          ),
          const Spacer(),
          Column(
            children: [
              Text('Peringkat Anda', style: TextStyle(color: color, fontSize: 11)),
              Text(rank, style: GoogleFonts.outfit(fontSize: 32, fontWeight: FontWeight.bold, color: color)),
            ],
          ),
        ],
      ),
    ).animate().fadeIn().slideX(begin: 0.2);
  }

  Widget _buildForumTab() {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        _buildForumPost(
          'Rudi Santoso', '2 jam lalu',
          'Tips Gacor Hari Senin: Coba mangkal di sekitar stasiun kereta di pagi hari. Pasti banyak orderan!',
          15, 3
        ),
        const SizedBox(height: 16),
        _buildForumPost(
          'Siti Aminah', '5 jam lalu',
          'Ada yang tau info penutupan jalan di area Sudirman hari ini? Mau ke sana tapi ragu.',
          8, 5
        ),
      ],
    );
  }

  Widget _buildForumPost(String name, String time, String content, int likes, int comments) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(child: Text(name[0])),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(name, style: const TextStyle(fontWeight: FontWeight.bold)),
                  Text(time, style: const TextStyle(color: Colors.grey, fontSize: 12)),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(content, style: const TextStyle(height: 1.5)),
          const SizedBox(height: 16),
          Row(
            children: [
              Icon(Icons.thumb_up_alt_outlined, color: Colors.grey.shade600, size: 18),
              const SizedBox(width: 4),
              Text('$likes'),
              const SizedBox(width: 16),
              Icon(Icons.comment_outlined, color: Colors.grey.shade600, size: 18),
              const SizedBox(width: 4),
              Text('$comments'),
              const Spacer(),
              const Text('Balas', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
            ],
          ),
        ],
      ),
    );
  }
}
