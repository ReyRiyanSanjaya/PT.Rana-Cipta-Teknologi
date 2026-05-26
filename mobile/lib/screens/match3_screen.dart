import 'package:flame/flame.dart';
import 'package:flame/game.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:lottie/lottie.dart';
import 'package:rana_merchant/config/assets_config.dart';
import '../games/match3/match3_game.dart';

class Match3LevelData {
  final int number;
  final int rows;
  final int cols;
  final int targetScore;
  final int maxMoves;

  const Match3LevelData({
    required this.number,
    required this.rows,
    required this.cols,
    required this.targetScore,
    required this.maxMoves,
  });
}

class Match3Screen extends StatefulWidget {
  final Match3LevelData level;
  final Function(int level, int score) onLevelComplete;

  const Match3Screen({
    super.key,
    required this.level,
    required this.onLevelComplete,
  });

  @override
  State<Match3Screen> createState() => _Match3ScreenState();
}

class _Match3ScreenState extends State<Match3Screen> {
  late Match3Game game;
  bool _dialogShown = false;

  @override
  void initState() {
    super.initState();
    game = Match3Game(
      rows: widget.level.rows,
      cols: widget.level.cols,
      targetScore: widget.level.targetScore,
      maxMoves: widget.level.maxMoves,
    );
    Flame.device.fullScreen();
  }

  @override
  void dispose() {
    Flame.device.setPortrait();
    super.dispose();
  }

  void _checkGameState() {
    if (_dialogShown) return;
    if (game.state == GameState.win) {
      _dialogShown = true;
      WidgetsBinding.instance.addPostFrameCallback((_) => _showResultDialog(true));
    } else if (game.state == GameState.lose) {
      _dialogShown = true;
      WidgetsBinding.instance.addPostFrameCallback((_) => _showResultDialog(false));
    }
  }

  void _showResultDialog(bool isWin) {
    if (isWin) {
      widget.onLevelComplete(widget.level.number, game.score);
    }

    showGeneralDialog(
      context: context,
      barrierDismissible: false,
      barrierLabel: 'Result',
      transitionDuration: const Duration(milliseconds: 400),
      pageBuilder: (context, anim1, anim2) => const SizedBox(),
      transitionBuilder: (context, anim1, anim2, child) {
        return Transform.scale(
          scale: anim1.value,
          child: Opacity(
            opacity: anim1.value,
            child: AlertDialog(
              backgroundColor: const Color(0xFF2C1B47),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(24),
                side: BorderSide(color: isWin ? Colors.amber : Colors.red, width: 2),
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (isWin)
                    Lottie.asset(AssetsConfig.lottieConfettiSuccess, height: 150, repeat: false)
                  else
                    Icon(Icons.close_rounded, size: 80, color: Colors.red.withOpacity(0.8)),
                  const SizedBox(height: 16),
                  Text(
                    isWin ? 'LEVEL COMPLETED!' : 'OUT OF MOVES',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.outfit(
                      fontSize: 24,
                      fontWeight: FontWeight.w900,
                      color: Colors.white,
                      letterSpacing: 1.2,
                    ),
                  ),
                  const SizedBox(height: 12),
                  _buildResultStat('SCORE', '${game.score}'),
                  const SizedBox(height: 8),
                  if (isWin) _buildResultStat('MOVES LEFT', '${game.maxMoves - game.moves}'),
                ],
              ),
              actionsAlignment: MainAxisAlignment.center,
              actions: [
                TextButton(
                  onPressed: () {
                    Navigator.pop(context); // Close dialog
                    Navigator.pop(context); // Exit game (back to map)
                  },
                  child: Text(
                    'KELUAR',
                    style: GoogleFonts.outfit(color: Colors.white54, fontWeight: FontWeight.bold),
                  ),
                ),
                const SizedBox(width: 12),
                if (!isWin)
                  FilledButton(
                    onPressed: () {
                      Navigator.pop(context);
                      setState(() {
                        game.resetLevel();
                        _dialogShown = false;
                      });
                    },
                    style: FilledButton.styleFrom(
                      backgroundColor: Colors.red,
                      padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
                    ),
                    child: Text(
                      'COBA LAGI',
                      style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                  )
                else
                  FilledButton(
                    onPressed: () {
                      Navigator.pop(context); // Close dialog
                      Navigator.pop(context); // Back to map to select next level
                    },
                    style: FilledButton.styleFrom(
                      backgroundColor: Colors.amber,
                      padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
                    ),
                    child: Text(
                      'LANJUT',
                      style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: Colors.black87),
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildResultStat(String label, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Text(
            label,
            style: GoogleFonts.outfit(
              color: Colors.white54,
              fontSize: 10,
              fontWeight: FontWeight.w600,
            ),
          ),
          Text(
            value,
            style: GoogleFonts.outfit(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    _checkGameState();

    return Scaffold(
      backgroundColor: const Color(0xFF1A1A2E), // Deep space blue
      body: Stack(
        children: [
          // Background Gradient
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    const Color(0xFF2C1B47), // Deep purple
                    const Color(0xFF0F0F1A), // Dark
                  ],
                ),
              ),
            ),
          ),
          
          // Game Layer
          Positioned.fill(
            child: GameWidget(game: game),
          ),

          // HUD - Top Bar
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.white.withOpacity(0.1)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.2),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white70, size: 20),
                    ),
                    Column(
                      children: [
                        Text(
                          'LEVEL ${widget.level.number}',
                          style: GoogleFonts.outfit(
                            color: Colors.white70,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1,
                          ),
                        ),
                        Text(
                          '${game.score} / ${widget.level.targetScore}',
                          style: GoogleFonts.outfit(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ],
                    ),
                    _buildStatPill(Icons.touch_app_rounded, '${game.maxMoves - game.moves}', Colors.greenAccent),
                  ],
                ),
              ),
            ),
          ).animate().slideY(begin: -1, duration: 500.ms, curve: Curves.easeOutBack),
        ],
      ),
    );
  }

  Widget _buildStatPill(IconData icon, String value, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 6),
          Text(
            value,
            style: GoogleFonts.outfit(
              color: Colors.white,
              fontWeight: FontWeight.w900,
              fontSize: 16,
            ),
          ),
        ],
      ),
    );
  }
}
