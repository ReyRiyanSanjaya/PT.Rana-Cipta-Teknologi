import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:rana_merchant/data/remote/api_service.dart';
import 'match3_screen.dart';

class Match3LevelMapScreen extends StatefulWidget {
  const Match3LevelMapScreen({super.key});

  @override
  State<Match3LevelMapScreen> createState() => _Match3LevelMapScreenState();
}

class _Match3LevelMapScreenState extends State<Match3LevelMapScreen> {
  int _unlockedLevel = 1;
  final ScrollController _scrollController = ScrollController();

  // Level Configurations
  final List<Match3LevelData> _levels = [
    const Match3LevelData(number: 1, rows: 6, cols: 6, targetScore: 1000, maxMoves: 15),
    const Match3LevelData(number: 2, rows: 7, cols: 6, targetScore: 1500, maxMoves: 20),
    const Match3LevelData(number: 3, rows: 7, cols: 7, targetScore: 2000, maxMoves: 20),
    const Match3LevelData(number: 4, rows: 8, cols: 7, targetScore: 2500, maxMoves: 25),
    const Match3LevelData(number: 5, rows: 8, cols: 8, targetScore: 3000, maxMoves: 25),
    const Match3LevelData(number: 6, rows: 9, cols: 8, targetScore: 3500, maxMoves: 30),
    const Match3LevelData(number: 7, rows: 9, cols: 9, targetScore: 4000, maxMoves: 30),
    const Match3LevelData(number: 8, rows: 10, cols: 9, targetScore: 5000, maxMoves: 35),
    const Match3LevelData(number: 9, rows: 10, cols: 10, targetScore: 6000, maxMoves: 40),
    const Match3LevelData(number: 10, rows: 10, cols: 10, targetScore: 10000, maxMoves: 50),
  ];

  @override
  void initState() {
    super.initState();
    _loadProgress();
  }

  Future<void> _loadProgress() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _unlockedLevel = prefs.getInt('match3_unlocked_level') ?? 1;
    });
    
    // Auto scroll to latest unlocked level after build
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        // Simple calculation: height per level approx 120
        // Scroll to bottom because level 1 is usually at bottom in these maps
        _scrollController.jumpTo(_scrollController.position.maxScrollExtent);
      }
    });
  }

  Future<void> _updateProgress(int completedLevel, int score) async {
    if (completedLevel >= _unlockedLevel && completedLevel < _levels.length) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt('match3_unlocked_level', completedLevel + 1);
      setState(() {
        _unlockedLevel = completedLevel + 1;
      });
    }
    // Submit score to server (cumulative or max logic handled by backend usually, 
    // but here we just send the level score)
    await ApiService().submitGameScore('MATCH3', score);
  }

  void _startLevel(Match3LevelData level) {
    if (level.number > _unlockedLevel) return;

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => Match3Screen(
          level: level,
          onLevelComplete: (lvl, score) {
            _updateProgress(lvl, score);
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1A1A2E),
      appBar: AppBar(
        title: Text(
          'PETA LEVEL',
          style: GoogleFonts.outfit(fontWeight: FontWeight.w900, letterSpacing: 2),
        ),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: Colors.white,
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              const Color(0xFF2C1B47),
              const Color(0xFF0F0F1A),
            ],
          ),
        ),
        child: ListView.builder(
          controller: _scrollController,
          reverse: true, // Level 1 at bottom
          padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
          itemCount: _levels.length,
          itemBuilder: (context, index) {
            final level = _levels[index];
            final isUnlocked = level.number <= _unlockedLevel;
            final isCurrent = level.number == _unlockedLevel;
            
            // Calculate offset for S-curve path
            // index 0 (level 1) -> center
            // index 1 -> right
            // index 2 -> center
            // index 3 -> left
            double offsetX = 0;
            if (index % 4 == 1) offsetX = 80;
            if (index % 4 == 3) offsetX = -80;

            return Padding(
              padding: const EdgeInsets.only(bottom: 40),
              child: Transform.translate(
                offset: Offset(offsetX, 0),
                child: Center(
                  child: _buildLevelNode(level, isUnlocked, isCurrent),
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildLevelNode(Match3LevelData level, bool isUnlocked, bool isCurrent) {
    return GestureDetector(
      onTap: () => _startLevel(level),
      child: Column(
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isUnlocked 
                  ? (isCurrent ? Colors.amber : Colors.cyan) 
                  : Colors.white.withOpacity(0.1),
              boxShadow: isUnlocked
                  ? [
                      BoxShadow(
                        color: (isCurrent ? Colors.amber : Colors.cyan).withOpacity(0.6),
                        blurRadius: 20,
                        spreadRadius: 2,
                      )
                    ]
                  : [],
              border: Border.all(
                color: Colors.white.withOpacity(isUnlocked ? 0.8 : 0.2),
                width: 3,
              ),
            ),
            child: Center(
              child: isUnlocked
                  ? Text(
                      '${level.number}',
                      style: GoogleFonts.outfit(
                        fontSize: 32,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                      ),
                    )
                  : Icon(
                      Icons.lock_rounded,
                      color: Colors.white.withOpacity(0.3),
                      size: 32,
                    ),
            ),
          ).animate(
              onPlay: (c) {
                if (isCurrent) c.repeat(reverse: true);
              },
            ).scale(
            begin: isCurrent ? const Offset(1, 1) : const Offset(1, 1),
              end: isCurrent ? const Offset(1.1, 1.1) : const Offset(1, 1),
            duration: 1000.ms,
          ),
          if (isUnlocked)
            const SizedBox(height: 8),
          if (isUnlocked)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.black45,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.star, color: Colors.amber, size: 12),
                  const SizedBox(width: 4),
                  Text(
                    'Start',
                    style: GoogleFonts.outfit(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
