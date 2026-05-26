import 'dart:math';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:rana_merchant/config/theme_config.dart';
import 'package:rana_merchant/data/remote/api_service.dart'; // [NEW]
import 'match3_level_map_screen.dart' deferred as match3;
import 'tetris_game_screen.dart' deferred as tetris;
import 'snake_game_screen.dart' deferred as snake;
import 'tts_game_screen.dart' deferred as tts;

class GameScreen extends StatefulWidget {
  const GameScreen({super.key});

  @override
  State<GameScreen> createState() => _GameScreenState();
}

class _GameScreenState extends State<GameScreen> {
  String _selectedGame = 'TETRIS';
  List<dynamic> _leaderboard = []; // [NEW]
  bool _isLoadingLeaderboard = false; // [NEW]

  final List<Map<String, dynamic>> _gameList = [
    {
      'id': 'TETRIS',
      'title': 'Rana Tetris',
      'icon': Icons.grid_view_rounded,
      'description': 'Susun balok secara sempurna untuk membersihkan baris dan skor tinggi.',
      'color': const Color(0xFFE07A5F),
    },
    {
      'id': 'SNAKE',
      'title': 'Rana Snake',
      'icon': Icons.flash_on_rounded,
      'description': 'Kendalikan ular neon untuk memakan energi dan tumbuh lebih panjang.',
      'color': const Color(0xFF00E5FF),
    },
    {
      'id': 'MATCH3',
      'title': 'Match-3 Puzzle',
      'icon': Icons.grid_4x4_rounded,
      'description': 'Mainkan puzzle klasik untuk mengasah otak dan hiburan.',
      'color': const Color(0xFF81B29A),
    },
    {
      'id': 'TTS',
      'title': 'Rana TTS',
      'icon': Icons.extension_rounded,
      'description': 'Asah otak dengan mengisi teka-teki silang yang menantang.',
      'color': const Color(0xFFF2CC8F),
    },
  ];

  @override
  void initState() {
    super.initState();
    _fetchLeaderboard(); // [NEW]
  }

  // [NEW] Fetch real leaderboard data
  Future<void> _fetchLeaderboard() async {
    setState(() => _isLoadingLeaderboard = true);
    try {
      final data = await ApiService().getLeaderboard(_selectedGame);
      if (mounted) {
        setState(() {
          _leaderboard = data;
          _isLoadingLeaderboard = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoadingLeaderboard = false);
    }
  }

  @override
  void dispose() {
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text(
          'Game Center',
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
        elevation: 0,
        backgroundColor: Colors.transparent,
      ),
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Pilih Permainan',
                    style: GoogleFonts.outfit(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: colorScheme.onSurface,
                    ),
                  ).animate().fadeIn().slideX(),
                  Text(
                    'Mainkan game seru dan asah kemampuan Anda!',
                    style: GoogleFonts.outfit(
                      fontSize: 14,
                      color: colorScheme.onSurface.withOpacity(0.6),
                    ),
                  ).animate().fadeIn(delay: 100.ms).slideX(),
                ],
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            sliver: SliverGrid(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                mainAxisSpacing: 16,
                crossAxisSpacing: 16,
                childAspectRatio: 0.85,
              ),
              delegate: SliverChildBuilderDelegate(
                (context, index) {
                  final game = _gameList[index];
                  final isSelected = _selectedGame == game['id'];
                  return _buildGameCard(game, isSelected, colorScheme);
                },
                childCount: _gameList.length,
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: _buildSelectedGameSection(colorScheme),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
              child: _buildLeaderboardSection(colorScheme), // [NEW] Real Leaderboard
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 40),
              child: _buildUsageGuide(colorScheme),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLeaderboardSection(ColorScheme colorScheme) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: colorScheme.outline.withOpacity(0.12)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Skor Tertinggi',
                style: GoogleFonts.outfit(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
              Icon(Icons.emoji_events_outlined, color: Colors.orange),
            ],
          ),
          const SizedBox(height: 16),
          if (_isLoadingLeaderboard)
            const Center(child: CircularProgressIndicator())
          else if (_leaderboard.isEmpty)
            Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 20),
                child: Text(
                  'Belum ada skor tercatat',
                  style: GoogleFonts.outfit(color: Colors.grey),
                ),
              ),
            )
          else
            ..._leaderboard.asMap().entries.map((entry) {
              final index = entry.key;
              final data = entry.value;
              return Column(
                children: [
                  _buildLeaderboardItem(
                    '${index + 1}',
                    data['storeName'] ?? 'Anonim',
                    '${data['score'] ?? 0} pts',
                    index == 0,
                  ),
                  if (index < _leaderboard.length - 1) const Divider(height: 24),
                ],
              );
            }).toList(),
        ],
      ),
    ).animate().fadeIn(delay: 150.ms).slideY(begin: 0.1);
  }

  Widget _buildLeaderboardItem(String rank, String name, String score, bool isFirst) {
    return Row(
      children: [
        Container(
          width: 28,
          height: 28,
          decoration: BoxDecoration(
            color: isFirst ? Colors.orange.withOpacity(0.1) : Colors.grey.withOpacity(0.1),
            shape: BoxShape.circle,
          ),
          alignment: Alignment.center,
          child: Text(
            rank,
            style: GoogleFonts.outfit(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: isFirst ? Colors.orange : Colors.grey,
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            name,
            style: GoogleFonts.outfit(
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        Text(
          score,
          style: GoogleFonts.outfit(
            fontWeight: FontWeight.w800,
            color: ThemeConfig.brandColor,
          ),
        ),
      ],
    );
  }

  Widget _buildGameCard(
      Map<String, dynamic> game, bool isSelected, ColorScheme colorScheme) {
    return InkWell(
      onTap: () async {
        setState(() {
          _selectedGame = game['id'];
        });
        _fetchLeaderboard(); // [NEW] Refresh leaderboard on selection
        
        if (game['id'] == 'MATCH3') {
          await match3.loadLibrary();
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => match3.Match3LevelMapScreen()),
          );
        } else if (game['id'] == 'TETRIS') {
          await tetris.loadLibrary();
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => tetris.TetrisGameScreen()),
          );
        } else if (game['id'] == 'SNAKE') {
          await snake.loadLibrary();
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => snake.SnakeGameScreen()),
          );
        } else if (game['id'] == 'TTS') {
          await tts.loadLibrary();
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => tts.TTSGameScreen()),
          );
        }
      },
      borderRadius: BorderRadius.circular(24),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: isSelected ? game['color'] : colorScheme.surface,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
            color: isSelected
                ? Colors.transparent
                : colorScheme.outline.withOpacity(0.12),
            width: 2,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: game['color'].withOpacity(0.3),
                    blurRadius: 12,
                    offset: const Offset(0, 6),
                  )
                ]
              : [],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isSelected
                    ? Colors.white.withOpacity(0.2)
                    : game['color'].withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                game['icon'],
                size: 32,
                color: isSelected ? Colors.white : game['color'],
              ),
            ),
            const SizedBox(height: 12),
            Text(
              game['title'],
              textAlign: TextAlign.center,
              style: GoogleFonts.outfit(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: isSelected ? Colors.white : colorScheme.onSurface,
              ),
            ),
          ],
        ),
      ),
    ).animate()
     .scale(delay: (100 * _gameList.indexOf(game)).ms, duration: 400.ms, curve: Curves.easeOutBack)
     .then() // After popping in, if selected, add continuous shimmer
     .shimmer(
       duration: 2000.ms, 
       color: Colors.white.withOpacity(isSelected ? 0.3 : 0.0), 
       delay: 1000.ms, 
       blendMode: BlendMode.srcATop
     )
     .callback(callback: (_) {}, // To allow repetition of the shimmer effect without repeating the scale
     ).animate(target: isSelected ? 1 : 0, onPlay: (controller) => controller.repeat())
     .shimmer(duration: 3000.ms, color: Colors.white.withOpacity(0.2));
  }

  Widget _buildSelectedGameSection(ColorScheme colorScheme) {
    final currentGame =
        _gameList.firstWhere((element) => element['id'] == _selectedGame);

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: colorScheme.outline.withOpacity(0.12)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        children: [
          Icon(
            currentGame['icon'],
            size: 48,
            color: currentGame['color'],
          ),
          const SizedBox(height: 16),
          Text(
            currentGame['title'],
            style: GoogleFonts.outfit(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: colorScheme.onSurface,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            currentGame['description'],
            textAlign: TextAlign.center,
            style: GoogleFonts.outfit(
              fontSize: 14,
              color: colorScheme.onSurface.withOpacity(0.6),
            ),
          ),
          const SizedBox(height: 32),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: () async {
                if (_selectedGame == 'MATCH3') {
                  await match3.loadLibrary();
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => match3.Match3LevelMapScreen()),
                  );
                } else if (_selectedGame == 'TETRIS') {
                  await tetris.loadLibrary();
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => tetris.TetrisGameScreen(),
                    ),
                  );
                } else if (_selectedGame == 'SNAKE') {
                  await snake.loadLibrary();
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => snake.SnakeGameScreen(),
                    ),
                  );
                } else if (_selectedGame == 'TTS') {
                  await tts.loadLibrary();
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => tts.TTSGameScreen(),
                    ),
                  );
                }
              },
              icon: const Icon(Icons.play_arrow_rounded),
              label: const Text('Mulai Bermain'),
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                backgroundColor: currentGame['color'],
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
            ),
          ),
        ],
      ),
    ).animate().fadeIn().slideY(begin: 0.1);
  }

  Widget _buildUsageGuide(ColorScheme colorScheme) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: colorScheme.outline.withOpacity(0.12)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.blue.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.lightbulb_outline, color: Colors.blue),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Tips Penggunaan',
                  style: GoogleFonts.outfit(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Gunakan game ini untuk meningkatkan engagement pelanggan Anda di toko.',
                  style: GoogleFonts.outfit(
                    fontSize: 13,
                    color: colorScheme.onSurface.withOpacity(0.6),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    ).animate().fadeIn(delay: 200.ms).slideY(begin: 0.1);
  }
}
