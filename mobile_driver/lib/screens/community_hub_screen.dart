import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:mobile_driver/config/theme_config.dart';
import 'package:mobile_driver/data/driver_api_service.dart';
import 'package:intl/intl.dart';

class CommunityHubScreen extends StatefulWidget {
  const CommunityHubScreen({super.key});

  @override
  State<CommunityHubScreen> createState() => _CommunityHubScreenState();
}

class _CommunityHubScreenState extends State<CommunityHubScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<dynamic> _posts = [];
  List<dynamic> _leaderboard = [];
  bool _isLoading = true;
  final _postController = TextEditingController();
  bool _isPosting = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _postController.dispose();
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    final api = DriverApiService();

    final results = await Future.wait([
      api.getLeaderboard(type: 'earnings', period: 'week'),
      api.getCommunityPosts(),
    ]);

    if (mounted) {
      setState(() {
        _leaderboard = results[0];
        _posts = results[1];
        _isLoading = false;
      });
    }
  }

  Future<void> _submitPost() async {
    final content = _postController.text.trim();
    if (content.isEmpty) return;

    setState(() => _isPosting = true);
    try {
      await DriverApiService().createCommunityPost(content);
      _postController.clear();
      await _loadData();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Post berhasil dibuat')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isPosting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ThemeConfig.beigeBackground,
      appBar: AppBar(
        title: Text('Community Hub',
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
          tabs: const [
            Tab(text: 'Papan Peringkat'),
            Tab(text: 'Forum Driver'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                _buildLeaderboardTab(),
                _buildForumTab(),
              ],
            ),
    );
  }

  Widget _buildLeaderboardTab() {
    if (_leaderboard.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.leaderboard_rounded, size: 64, color: Colors.grey.shade300),
            const SizedBox(height: 16),
            Text('Belum ada data peringkat minggu ini',
                style: TextStyle(color: Colors.grey.shade500)),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // Top 3 highlight
          if (_leaderboard.length >= 3) _buildTop3Section(),
          const SizedBox(height: 24),
          Text('PERINGKAT LENGKAP',
              style: GoogleFonts.outfit(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.2,
                  color: Colors.grey.shade600)),
          const SizedBox(height: 12),
          ...List.generate(
            _leaderboard.length,
            (index) {
              final item = Map<String, dynamic>.from(_leaderboard[index]);
              return _buildRankItem(item, index);
            },
          ),
        ],
      ),
    );
  }

  Widget _buildTop3Section() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        if (_leaderboard.length > 1) _buildPodium(_leaderboard[1], 2, 100),
        if (_leaderboard.isNotEmpty) _buildPodium(_leaderboard[0], 1, 130),
        if (_leaderboard.length > 2) _buildPodium(_leaderboard[2], 3, 80),
      ],
    ).animate().fadeIn().scale(begin: const Offset(0.9, 0.9));
  }

  Widget _buildPodium(dynamic data, int rank, double height) {
    final item = Map<String, dynamic>.from(data);
    final colors = [Colors.amber, Colors.grey.shade400, Colors.brown.shade300];
    final color = colors[rank - 1];

    return Column(
      children: [
        CircleAvatar(
          radius: rank == 1 ? 32 : 24,
          backgroundColor: color.withOpacity(0.2),
          child: Icon(Icons.person_rounded, color: color, size: rank == 1 ? 32 : 24),
        ),
        const SizedBox(height: 8),
        Text(item['name'] ?? 'Driver',
            style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 12),
            maxLines: 1,
            overflow: TextOverflow.ellipsis),
        Text(item['label'] ?? '',
            style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 11)),
        const SizedBox(height: 8),
        Container(
          width: 60,
          height: height,
          decoration: BoxDecoration(
            color: color.withOpacity(0.3),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(8)),
          ),
          child: Center(
            child: Text('#$rank',
                style: GoogleFonts.outfit(
                    fontWeight: FontWeight.bold, color: color, fontSize: 18)),
          ),
        ),
      ],
    );
  }

  Widget _buildRankItem(Map<String, dynamic> item, int index) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 30,
            child: Text('#${item['rank'] ?? index + 1}',
                style: GoogleFonts.outfit(
                    fontWeight: FontWeight.bold, color: Colors.grey.shade600)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(item['name'] ?? 'Driver',
                style: const TextStyle(fontWeight: FontWeight.w500)),
          ),
          Text(item['label'] ?? '',
              style: GoogleFonts.outfit(
                  fontWeight: FontWeight.bold,
                  color: ThemeConfig.brandColor,
                  fontSize: 13)),
        ],
      ),
    );
  }

  Widget _buildForumTab() {
    return Column(
      children: [
        // Post input
        Container(
          padding: const EdgeInsets.all(16),
          color: Colors.white,
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _postController,
                  decoration: InputDecoration(
                    hintText: 'Bagikan tips atau tanya sesuatu...',
                    hintStyle: TextStyle(color: Colors.grey.shade400),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(24),
                      borderSide: BorderSide.none,
                    ),
                    filled: true,
                    fillColor: Colors.grey.shade100,
                    contentPadding:
                        const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  ),
                  maxLines: 1,
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                onPressed: _isPosting ? null : _submitPost,
                icon: _isPosting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.send_rounded, color: ThemeConfig.brandColor),
              ),
            ],
          ),
        ),
        // Posts list
        Expanded(
          child: RefreshIndicator(
            onRefresh: _loadData,
            child: _posts.isEmpty
                ? ListView(
                    children: [
                      const SizedBox(height: 80),
                      Center(
                        child: Column(
                          children: [
                            Icon(Icons.forum_rounded,
                                size: 64, color: Colors.grey.shade300),
                            const SizedBox(height: 16),
                            Text('Belum ada diskusi',
                                style: TextStyle(color: Colors.grey.shade500)),
                            const SizedBox(height: 8),
                            Text('Jadilah yang pertama berbagi!',
                                style: TextStyle(
                                    color: Colors.grey.shade400, fontSize: 13)),
                          ],
                        ),
                      ),
                    ],
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _posts.length,
                    itemBuilder: (context, index) {
                      final post = Map<String, dynamic>.from(_posts[index]);
                      return _buildForumPost(post, index);
                    },
                  ),
          ),
        ),
      ],
    );
  }

  Widget _buildForumPost(Map<String, dynamic> post, int index) {
    final author = post['author'] is Map
        ? Map<String, dynamic>.from(post['author'])
        : null;
    final name = author?['name'] ?? 'Driver';
    final content = post['content'] ?? '';
    final createdAt = post['createdAt'];
    String timeAgo = '';
    if (createdAt != null) {
      try {
        final dt = DateTime.parse(createdAt.toString());
        final diff = DateTime.now().difference(dt);
        if (diff.inMinutes < 60) {
          timeAgo = '${diff.inMinutes} menit lalu';
        } else if (diff.inHours < 24) {
          timeAgo = '${diff.inHours} jam lalu';
        } else {
          timeAgo = DateFormat('dd MMM yyyy').format(dt);
        }
      } catch (_) {}
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: ThemeConfig.brandColor.withOpacity(0.1),
                child: Text(name.isNotEmpty ? name[0].toUpperCase() : 'D',
                    style: const TextStyle(
                        color: ThemeConfig.brandColor, fontWeight: FontWeight.bold)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    if (timeAgo.isNotEmpty)
                      Text(timeAgo,
                          style: TextStyle(color: Colors.grey.shade500, fontSize: 11)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(content, style: const TextStyle(height: 1.5, fontSize: 14)),
        ],
      ),
    ).animate().fadeIn(delay: (50 * index).ms);
  }
}
