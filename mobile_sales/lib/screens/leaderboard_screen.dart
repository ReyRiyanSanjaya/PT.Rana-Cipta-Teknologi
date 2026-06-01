import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:rana_sales/data/api_service.dart';
import 'package:provider/provider.dart';
import 'package:rana_sales/providers/auth_provider.dart';

class LeaderboardScreen extends StatefulWidget {
  const LeaderboardScreen({super.key});

  @override
  State<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends State<LeaderboardScreen> {
  List<dynamic> _data = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final data = await ApiService().getLeaderboard();
      if (mounted) setState(() { _data = data; _isLoading = false; });
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final myId = context.read<AuthProvider>().userId;

    return Scaffold(
      appBar: AppBar(
        title: Text('Leaderboard', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _data.isEmpty
              ? Center(child: Text('Belum ada data', style: TextStyle(color: Colors.grey.shade500)))
              : RefreshIndicator(
                  onRefresh: _loadData,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      // Podium
                      if (_data.length >= 3) _buildPodium(),
                      const SizedBox(height: 24),
                      Text('Ranking Lengkap', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16)),
                      const SizedBox(height: 12),
                      ..._data.asMap().entries.map((e) => _buildRankCard(e.key, e.value, e.value['userId'] == myId)),
                    ],
                  ),
                ),
    );
  }

  Widget _buildPodium() {
    final medals = ['🥇', '🥈', '🥉'];
    final colors = [Colors.amber, Colors.grey.shade400, Colors.orange.shade300];

    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        if (_data.length > 1) _buildPodiumItem(_data[1], medals[1], colors[1], 80),
        _buildPodiumItem(_data[0], medals[0], colors[0], 100),
        if (_data.length > 2) _buildPodiumItem(_data[2], medals[2], colors[2], 70),
      ],
    ).animate().fadeIn().scale(begin: const Offset(0.9, 0.9));
  }

  Widget _buildPodiumItem(dynamic entry, String medal, Color color, double height) {
    return Expanded(
      child: Column(
        children: [
          Text(medal, style: const TextStyle(fontSize: 28)),
          const SizedBox(height: 4),
          Text(entry['name']?.toString().split(' ').first ?? '', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 13), textAlign: TextAlign.center),
          Text('${entry['score']} pts', style: TextStyle(color: Colors.indigo.shade700, fontWeight: FontWeight.bold, fontSize: 12)),
          const SizedBox(height: 8),
          Container(
            height: height,
            margin: const EdgeInsets.symmetric(horizontal: 8),
            decoration: BoxDecoration(
              color: color.withOpacity(0.3),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(8)),
            ),
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('${entry['completedVisits']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                  const Text('visits', style: TextStyle(fontSize: 9)),
                  Text('${entry['ecr']}%', style: TextStyle(color: Colors.teal.shade700, fontWeight: FontWeight.bold, fontSize: 11)),
                  const Text('ECR', style: TextStyle(fontSize: 9)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRankCard(int index, dynamic entry, bool isMe) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isMe ? Colors.teal.withOpacity(0.05) : Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isMe ? Colors.teal.withOpacity(0.3) : Colors.grey.shade200),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 28,
            child: Text(
              index < 3 ? ['🥇', '🥈', '🥉'][index] : '#${index + 1}',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: index < 3 ? 18 : 13, color: Colors.grey.shade600),
              textAlign: TextAlign.center,
            ),
          ),
          const SizedBox(width: 12),
          CircleAvatar(
            radius: 18,
            backgroundColor: Colors.teal.shade100,
            child: Text((entry['name'] ?? 'S').substring(0, 2).toUpperCase(), style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.teal.shade700)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(entry['name'] ?? '', style: GoogleFonts.outfit(fontWeight: FontWeight.w600, fontSize: 13)),
                    if (isMe) Container(
                      margin: const EdgeInsets.only(left: 6),
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                      decoration: BoxDecoration(color: Colors.teal, borderRadius: BorderRadius.circular(4)),
                      child: const Text('Anda', style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
                Text('${entry['completedVisits']} visits · ${entry['effectiveCalls']} effective · ECR ${entry['ecr']}%',
                    style: TextStyle(color: Colors.grey.shade600, fontSize: 10)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('${entry['score']}', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.indigo.shade700)),
              const Text('pts', style: TextStyle(fontSize: 9, color: Colors.grey)),
            ],
          ),
        ],
      ),
    ).animate().fadeIn(delay: (30 * index).ms);
  }
}
