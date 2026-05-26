import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:rana_merchant/data/remote/api_service.dart';
import 'package:rana_merchant/services/sound_service.dart';
import 'package:rana_merchant/config/theme_config.dart';

class SnakeGameScreen extends StatefulWidget {
  const SnakeGameScreen({super.key});

  @override
  State<SnakeGameScreen> createState() => _SnakeGameScreenState();
}

enum Direction { up, down, left, right }

class _SnakeGameScreenState extends State<SnakeGameScreen> {
  // Game constants
  static const int rows = 20;
  static const int columns = 20;
  static const int initialSpeed = 150;
  static const int minSpeed = 80;
  
  // Game state
  List<int> snake = [45, 44, 43];
  int food = 100;
  Direction direction = Direction.right;
  Direction lastExecutedDirection = Direction.right;
  List<Direction> directionBuffer = [];
  bool isPlaying = false;
  bool isPaused = false;
  int score = 0;
  int highScore = 0;
  Timer? timer;
  int currentSpeed = initialSpeed;

  @override
  void initState() {
    super.initState();
    _loadHighScore();
  }

  Future<void> _loadHighScore() async {
    final serverScore = await ApiService().getMyHighScore('SNAKE');
    if (mounted) {
      setState(() {
        highScore = serverScore;
      });
    }
  }

  Future<void> _saveHighScore() async {
    if (score > highScore) {
      setState(() {
        highScore = score;
      });
      await ApiService().submitGameScore('SNAKE', score);
    }
  }
  
  void startGame() {
    if (isPlaying) return;
    
    SoundService.playSuccess();
    setState(() {
      snake = [45, 44, 43];
      food = Random().nextInt(rows * columns);
      direction = Direction.right;
      lastExecutedDirection = Direction.right;
      directionBuffer = [];
      isPlaying = true;
      isPaused = false;
      score = 0;
      currentSpeed = initialSpeed;
    });
    
    _startTimer();
  }

  void _startTimer() {
    timer?.cancel();
    timer = Timer.periodic(Duration(milliseconds: currentSpeed), (timer) {
      if (!isPaused) {
        updateSnake();
      }
    });
  }

  void togglePause() {
    if (!isPlaying) return;
    setState(() {
      isPaused = !isPaused;
    });
    HapticFeedback.mediumImpact();
  }

  void updateSnake() {
    setState(() {
      // Process buffered directions
      if (directionBuffer.isNotEmpty) {
        direction = directionBuffer.removeAt(0);
      }
      
      lastExecutedDirection = direction;
      int nextHead;
      switch (direction) {
        case Direction.up:
          if (snake.first < columns) {
            // Wall Collision Top
            gameOver();
            return;
          } else {
            nextHead = snake.first - columns;
          }
          break;
        case Direction.down:
          if (snake.first >= (rows - 1) * columns) {
            // Wall Collision Bottom
            gameOver();
            return;
          } else {
            nextHead = snake.first + columns;
          }
          break;
        case Direction.left:
          if (snake.first % columns == 0) {
            // Wall Collision Left
            gameOver();
            return;
          } else {
            nextHead = snake.first - 1;
          }
          break;
        case Direction.right:
          if ((snake.first + 1) % columns == 0) {
            // Wall Collision Right
            gameOver();
            return;
          } else {
            nextHead = snake.first + 1;
          }
          break;
        default:
          nextHead = snake.first;
      }

      // Check for collision with self
      if (snake.contains(nextHead)) {
        gameOver();
        return;
      }

      snake.insert(0, nextHead);

      // Check if food eaten
      if (snake.first == food) {
        score += 10;
        SoundService.playBeep();
        HapticFeedback.lightImpact();
        
        // Increase speed
        if (currentSpeed > minSpeed) {
          currentSpeed -= 2; // Gradually increase speed
          _startTimer();
        }

        food = Random().nextInt(rows * columns);
        while (snake.contains(food)) {
          food = Random().nextInt(rows * columns);
        }
      } else {
        snake.removeLast();
      }
    });
  }

  void gameOver() {
    timer?.cancel();
    SoundService.playError();
    _saveHighScore();
    
    setState(() {
      isPlaying = false;
    });
    
    showGeneralDialog(
      context: context,
      barrierDismissible: false,
      barrierLabel: 'Game Over',
      transitionDuration: const Duration(milliseconds: 400),
      pageBuilder: (context, anim1, anim2) => const SizedBox(),
      transitionBuilder: (dialogContext, anim1, anim2, child) {
        return Transform.scale(
          scale: anim1.value,
          child: Opacity(
            opacity: anim1.value,
            child: AlertDialog(
              backgroundColor: const Color(0xFF1A1A2E),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(24),
                side: const BorderSide(color: Colors.cyan, width: 2),
              ),
              title: Center(
                child: Text(
                  'GAME OVER',
                  style: GoogleFonts.outfit(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 4,
                    fontSize: 28,
                  ),
                ),
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _buildStatRow('SKOR AKHIR', '$score', Colors.cyan),
                  const SizedBox(height: 12),
                  _buildStatRow('TERBAIK', '$highScore', const Color(0xFFFF00FF)),
                ],
              ),
              actionsAlignment: MainAxisAlignment.center,
              actions: [
                TextButton(
                  onPressed: () {
                    Navigator.pop(dialogContext);
                    Navigator.pop(context);
                  },
                  child: Text(
                    'KELUAR',
                    style: GoogleFonts.outfit(color: Colors.white70, fontWeight: FontWeight.bold),
                  ),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  onPressed: () {
                    Navigator.pop(dialogContext);
                    startGame();
                  },
                  style: FilledButton.styleFrom(
                    backgroundColor: Colors.cyan,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  ),
                  child: Text(
                    'MAIN LAGI',
                    style: GoogleFonts.outfit(fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildStatRow(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: GoogleFonts.outfit(
              color: color,
              fontWeight: FontWeight.bold,
              fontSize: 12,
              letterSpacing: 1.2,
            ),
          ),
          Text(
            value,
            style: GoogleFonts.outfit(
              color: Colors.white,
              fontWeight: FontWeight.w900,
              fontSize: 22,
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: const Color(0xFF1A1A2E),
      appBar: AppBar(
        title: Text('RANA SNAKE', style: GoogleFonts.outfit(fontWeight: FontWeight.w900, color: Colors.white, fontSize: 20, letterSpacing: 2)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        iconTheme: const IconThemeData(color: Colors.white, size: 20),
        toolbarHeight: 60,
        actions: [
          if (isPlaying)
            IconButton(
              onPressed: togglePause,
              icon: Icon(
                isPaused ? Icons.play_arrow_rounded : Icons.pause_rounded,
                color: Colors.white,
                size: 24,
              ),
            ),
        ],
      ),
      body: Stack(
        children: [
          Column(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _buildScoreTile('SKOR', '$score', Colors.cyan),
                    const SizedBox(width: 12),
                    _buildScoreTile('TERBAIK', '$highScore', const Color(0xFFFF00FF)),
                  ],
                ),
              ),
              Expanded(
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onVerticalDragUpdate: (details) {
                    if (!isPlaying) return;
                    if (details.delta.dy.abs() > details.delta.dx.abs()) {
                      if (details.delta.dy > 0) {
                        _changeDirection(Direction.down);
                      } else if (details.delta.dy < 0) {
                        _changeDirection(Direction.up);
                      }
                    }
                  },
                  onHorizontalDragUpdate: (details) {
                    if (!isPlaying) return;
                    if (details.delta.dx.abs() > details.delta.dy.abs()) {
                      if (details.delta.dx > 0) {
                        _changeDirection(Direction.right);
                      } else if (details.delta.dx < 0) {
                        _changeDirection(Direction.left);
                      }
                    }
                  },
                  child: Container(
                    margin: const EdgeInsets.fromLTRB(12, 4, 12, 12),
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.white.withOpacity(0.08)),
                      borderRadius: BorderRadius.circular(12),
                      color: const Color(0xFF16213E),
                    ),
                    child: GridView.builder(
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: rows * columns,
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: columns,
                      ),
                      itemBuilder: (context, index) {
                        if (snake.contains(index)) {
                          bool isHead = snake.first == index;
                          return Container(
                            padding: EdgeInsets.all(isHead ? 1 : 2),
                            child: Container(
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  begin: Alignment.topLeft,
                                  end: Alignment.bottomRight,
                                  colors: isHead 
                                    ? [Colors.cyan, Colors.cyan.shade700]
                                    : [Colors.cyan.withOpacity(0.7), Colors.cyan.withOpacity(0.4)],
                                ),
                                borderRadius: BorderRadius.circular(isHead ? 6 : 4),
                                boxShadow: [
                                  if (isHead)
                                    BoxShadow(
                                      color: Colors.cyan.withOpacity(0.8),
                                      blurRadius: 8,
                                      spreadRadius: 1,
                                    ),
                                ],
                              ),
                              child: isHead ? Center(
                                child: Container(
                                  width: 4,
                                  height: 4,
                                  decoration: const BoxDecoration(
                                    color: Colors.white,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                              ) : null,
                            ),
                          );
                        } else if (index == food) {
                          return Container(
                            padding: const EdgeInsets.all(4),
                            child: Container(
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                gradient: const RadialGradient(
                                  colors: [Color(0xFFFF00FF), Color(0xFF800080)],
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: const Color(0xFFFF00FF).withOpacity(0.6),
                                    blurRadius: 12,
                                    spreadRadius: 2,
                                  ),
                                ],
                              ),
                            ),
                          ).animate(onPlay: (controller) => controller.repeat())
                            .scale(begin: const Offset(0.7, 0.7), end: const Offset(1.1, 1.1), duration: 600.ms, curve: Curves.easeInOut)
                            .then()
                            .scale(begin: const Offset(1.1, 1.1), end: const Offset(0.7, 0.7));
                        } else {
                          return Center(
                            child: Container(
                              width: 2,
                              height: 2,
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.05),
                                shape: BoxShape.circle,
                              ),
                            ),
                          );
                        }
                      },
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 80), // Space for floating controls
            ],
          ),
          
          // Floating Controls Overlay
          if (isPlaying)
            Positioned(
              bottom: 30,
              left: 0,
              right: 0,
              child: _buildControls(),
            ),

          if (isPaused)
            Positioned.fill(
              child: Container(
                color: Colors.black45,
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'PAUSED',
                        style: GoogleFonts.outfit(
                          color: Colors.white,
                          fontSize: 40,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 8,
                        ),
                      ).animate().scale(duration: 400.ms, curve: Curves.elasticOut),
                      const SizedBox(height: 20),
                      ElevatedButton.icon(
                        onPressed: togglePause,
                        icon: const Icon(Icons.play_arrow_rounded),
                        label: const Text('RESUME'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.cyan,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

          if (!isPlaying)
            Positioned(
              bottom: 40,
              left: 0,
              right: 0,
              child: Center(
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(30),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.cyan.withOpacity(0.3),
                        blurRadius: 20,
                        spreadRadius: 2,
                      ),
                    ],
                  ),
                  child: ElevatedButton.icon(
                    onPressed: startGame,
                    icon: const Icon(Icons.play_circle_fill_rounded, size: 24),
                    label: Text(
                      'MULAI BERMAIN',
                      style: GoogleFonts.outfit(
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.5,
                        fontSize: 14,
                      ),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.cyan,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 18),
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                    ),
                  ),
                ).animate(onPlay: (c) => c.repeat()).shimmer(duration: 2000.ms, color: Colors.white24),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildScoreTile(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.2), width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            label == 'SKOR' ? Icons.emoji_events_rounded : Icons.workspace_premium_rounded,
            size: 14,
            color: color,
          ),
          const SizedBox(width: 6),
          Text(
            value,
            style: GoogleFonts.outfit(
              fontSize: 14,
              color: Colors.white,
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildControls() {
    return Center(
      child: Container(
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.05),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white10, width: 1),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _buildControlButton(
              icon: Icons.keyboard_arrow_left_rounded,
              onPressed: () => _changeDirection(Direction.left),
            ),
            const SizedBox(width: 6),
            Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _buildControlButton(
                  icon: Icons.keyboard_arrow_up_rounded,
                  onPressed: () => _changeDirection(Direction.up),
                ),
                const SizedBox(height: 6),
                _buildControlButton(
                  icon: Icons.keyboard_arrow_down_rounded,
                  onPressed: () => _changeDirection(Direction.down),
                ),
              ],
            ),
            const SizedBox(width: 6),
            _buildControlButton(
              icon: Icons.keyboard_arrow_right_rounded,
              onPressed: () => _changeDirection(Direction.right),
            ),
          ],
        ),
      ),
    );
  }

  void _changeDirection(Direction newDirection) {
    if (!isPlaying || isPaused) return;

    // Check if the new direction is valid relative to the last direction in the buffer 
    // or the last executed direction if the buffer is empty
    Direction referenceDirection = directionBuffer.isNotEmpty ? directionBuffer.last : lastExecutedDirection;

    bool canChange = false;
    switch (newDirection) {
      case Direction.up:
        if (referenceDirection != Direction.down) canChange = true;
        break;
      case Direction.down:
        if (referenceDirection != Direction.up) canChange = true;
        break;
      case Direction.left:
        if (referenceDirection != Direction.right) canChange = true;
        break;
      case Direction.right:
        if (referenceDirection != Direction.left) canChange = true;
        break;
    }

    if (canChange) {
      HapticFeedback.lightImpact();
      setState(() {
        // Buffer up to 2 direction changes to prevent rapid input loss
        if (directionBuffer.length < 2) {
          directionBuffer.add(newDirection);
        }
      });
    }
  }

  Widget _buildControlButton({required IconData icon, required VoidCallback onPressed}) {
    return GestureDetector(
      onTapDown: (_) => onPressed(),
      child: Container(
        width: 42,
        height: 42,
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.05),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: Colors.cyan.withOpacity(0.2), width: 1),
        ),
        child: Icon(icon, size: 28, color: Colors.cyan.withOpacity(0.6)),
      ),
    );
  }
}
