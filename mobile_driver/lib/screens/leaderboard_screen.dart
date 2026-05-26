import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile_driver/config/theme_config.dart';

class LeaderboardScreen extends StatefulWidget {
  const LeaderboardScreen({super.key});

  @override
  State<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends State<LeaderboardScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Papan Peringkat'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Lokal'),
            Tab(text: 'Nasional'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildLeaderboardList(true),
          _buildLeaderboardList(false),
        ],
      ),
    );
  }

  Widget _buildLeaderboardList(bool isLocal) {
    // Data dummy untuk papan peringkat
    final List<Map<String, dynamic>> leaderboardData = List.generate(10, (index) {
      return {
        'rank': index + 1,
        'name': 'Driver ${isLocal ? 'Lokal' : 'Nasional'} ${index + 1}',
        'score': (10 - index) * 1000,
        'imageUrl': 'https://i.pravatar.cc/150?u=driver${index + 1}',
      };
    });

    return ListView.builder(
      itemCount: leaderboardData.length,
      itemBuilder: (context, index) {
        final driver = leaderboardData[index];
        return Card(
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: ListTile(
            leading: CircleAvatar(
              backgroundImage: NetworkImage(driver['imageUrl']),
            ),
            title: Text(driver['name'], style: const TextStyle(fontWeight: FontWeight.bold)),
            subtitle: Text('Skor: ${driver['score']}'),
            trailing: Text('#${driver['rank']}', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold, color: ThemeConfig.brandColor)),
          ),
        );
      },
    );
  }
}
