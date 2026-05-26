import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:rana_merchant/data/remote/api_service.dart';
import 'package:rana_merchant/services/sound_service.dart';

class TetrisGameScreen extends StatefulWidget {
  const TetrisGameScreen({super.key});

  @override
  State<TetrisGameScreen> createState() => _TetrisGameScreenState();
}

enum Tetromino { I, J, L, O, S, T, Z }

class Piece {
  Tetromino type;
  List<Point<int>> cells;
  Color color;

  Piece(this.type, this.cells, this.color);
}

class _TetrisGameScreenState extends State<TetrisGameScreen> {
  static const int rows = 20;
  static const int columns = 10;
  
  List<List<Color?>> board = List.generate(rows, (_) => List.generate(columns, (_) => null));
  List<int> clearingRows = []; // Rows currently being animated for clearing
  Piece? currentPiece;
  Tetromino? nextTetromino;
  Timer? gameTimer;
  int score = 0;
  int highScore = 0;
  int level = 1;
  int linesCleared = 0;
  bool isPlaying = false;
  bool isPaused = false;
  
  final Map<Tetromino, List<Point<int>>> shapes = {
    Tetromino.I: [const Point(0, 3), const Point(0, 4), const Point(0, 5), const Point(0, 6)],
    Tetromino.J: [const Point(0, 3), const Point(1, 3), const Point(1, 4), const Point(1, 5)],
    Tetromino.L: [const Point(0, 5), const Point(1, 3), const Point(1, 4), const Point(1, 5)],
    Tetromino.O: [const Point(0, 4), const Point(0, 5), const Point(1, 4), const Point(1, 5)],
    Tetromino.S: [const Point(0, 4), const Point(0, 5), const Point(1, 3), const Point(1, 4)],
    Tetromino.T: [const Point(0, 4), const Point(1, 3), const Point(1, 4), const Point(1, 5)],
    Tetromino.Z: [const Point(0, 3), const Point(0, 4), const Point(1, 4), const Point(1, 5)],
  };

  final Map<Tetromino, Color> colors = {
    Tetromino.I: Colors.cyan,
    Tetromino.J: Colors.blue,
    Tetromino.L: Colors.orange,
    Tetromino.O: Colors.yellow,
    Tetromino.S: Colors.green,
    Tetromino.T: Colors.purple,
    Tetromino.Z: Colors.red,
  };

  @override
  void initState() {
    super.initState();
    clearingRows = []; // Explicitly initialize
    _loadHighScore();
    nextTetromino = Tetromino.values[Random().nextInt(Tetromino.values.length)];
  }

  Future<void> _loadHighScore() async {
    final serverScore = await ApiService().getMyHighScore('TETRIS');
    if (mounted) {
      setState(() {
        highScore = serverScore;
      });
    }
  }

  void startGame() {
    setState(() {
      board = List.generate(rows, (_) => List.generate(columns, (_) => null));
      clearingRows = []; // [NEW] Explicitly reset
      score = 0;
      level = 1;
      linesCleared = 0;
      isPlaying = true;
      isPaused = false;
      _spawnPiece();
    });
    _startTimer();
  }

  void _startTimer() {
    gameTimer?.cancel();
    int speed = max(100, 600 - (level * 50));
    gameTimer = Timer.periodic(Duration(milliseconds: speed), (timer) {
      if (!isPaused) _moveDown();
    });
  }

  void _spawnPiece() {
    Tetromino type = nextTetromino!;
    nextTetromino = Tetromino.values[Random().nextInt(Tetromino.values.length)];
    
    List<Point<int>> cells = shapes[type]!.map((p) => Point(p.x, p.y)).toList();
    currentPiece = Piece(type, cells, colors[type]!);

    if (_checkCollision(currentPiece!.cells)) {
      _gameOver();
    }
  }

  bool _checkCollision(List<Point<int>> cells) {
    for (var cell in cells) {
      if (cell.x >= rows || cell.y < 0 || cell.y >= columns) return true;
      if (cell.x >= 0 && board[cell.x][cell.y] != null) return true;
    }
    return false;
  }

  List<Point<int>> _getGhostCells() {
    if (currentPiece == null) return [];
    List<Point<int>> ghostCells = currentPiece!.cells.map((p) => Point(p.x, p.y)).toList();
    while (!_checkCollision(ghostCells.map((p) => Point(p.x + 1, p.y)).toList())) {
      ghostCells = ghostCells.map((p) => Point(p.x + 1, p.y)).toList();
    }
    return ghostCells;
  }

  void _hardDrop() {
    if (!isPlaying || isPaused || currentPiece == null) return;
    setState(() {
      currentPiece!.cells = _getGhostCells();
      _lockPiece();
      HapticFeedback.heavyImpact();
    });
  }

  void _moveDown() {
    setState(() {
      List<Point<int>> nextCells = currentPiece!.cells.map((p) => Point(p.x + 1, p.y)).toList();
      if (!_checkCollision(nextCells)) {
        currentPiece!.cells = nextCells;
      } else {
        _lockPiece();
      }
    });
  }

  void _moveLeft() {
    if (!isPlaying || isPaused) return;
    setState(() {
      List<Point<int>> nextCells = currentPiece!.cells.map((p) => Point(p.x, p.y - 1)).toList();
      if (!_checkCollision(nextCells)) {
        currentPiece!.cells = nextCells;
        HapticFeedback.lightImpact();
      }
    });
  }

  void _moveRight() {
    if (!isPlaying || isPaused) return;
    setState(() {
      List<Point<int>> nextCells = currentPiece!.cells.map((p) => Point(p.x, p.y + 1)).toList();
      if (!_checkCollision(nextCells)) {
        currentPiece!.cells = nextCells;
        HapticFeedback.lightImpact();
      }
    });
  }

  void _rotate() {
    if (!isPlaying || isPaused || currentPiece!.type == Tetromino.O) return;
    setState(() {
      Point<int> center = currentPiece!.cells[1];
      List<Point<int>> nextCells = currentPiece!.cells.map((p) {
        int dx = p.x - center.x;
        int dy = p.y - center.y;
        return Point(center.x + dy, center.y - dx);
      }).toList();

      if (!_checkCollision(nextCells)) {
        currentPiece!.cells = nextCells;
        HapticFeedback.mediumImpact();
      }
    });
  }

  void _lockPiece() {
    for (var cell in currentPiece!.cells) {
      if (cell.x >= 0) {
        board[cell.x][cell.y] = currentPiece!.color;
      }
    }
    _clearLines();
  }

  Future<void> _clearLines() async {
    List<int> rowsToClear = [];
    for (int r = rows - 1; r >= 0; r--) {
      if (board[r].every((cell) => cell != null)) {
        rowsToClear.add(r);
      }
    }

    if (rowsToClear.isNotEmpty) {
      // Pause game timer
      gameTimer?.cancel();
      
      setState(() {
        clearingRows = rowsToClear;
      });

      SoundService.playSuccess();
      HapticFeedback.heavyImpact();

      // Wait for animation
      await Future.delayed(const Duration(milliseconds: 300));

      setState(() {
        for (int r in rowsToClear) {
          board.removeAt(r);
          board.insert(0, List.generate(columns, (_) => null));
        }
        
        int cleared = rowsToClear.length;
        linesCleared += cleared;
        score += (cleared * 100) * level;
        level = (linesCleared ~/ 10) + 1;
        clearingRows = [];
      });

      _startTimer();
      _spawnPiece();
    } else {
      _spawnPiece();
    }
  }

  void _gameOver() {
    gameTimer?.cancel();
    isPlaying = false;
    SoundService.playError();
    _saveHighScore();
    _showGameOverDialog();
  }

  Future<void> _saveHighScore() async {
    if (score > highScore) {
      setState(() => highScore = score);
      await ApiService().submitGameScore('TETRIS', score);
    }
  }

  void _showGameOverDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1A1A2E),
        title: Text('GAME OVER', style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.bold)),
        content: Text('Skor: $score\nTerbaik: $highScore', style: GoogleFonts.outfit(color: Colors.white70)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('TUTUP')),
          FilledButton(onPressed: () { Navigator.pop(ctx); startGame(); }, child: const Text('MAIN LAGI')),
        ],
      ),
    );
  }

  @override
  void dispose() {
    gameTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F0F1E),
      appBar: AppBar(
        title: Text('RANA TETRIS', style: GoogleFonts.outfit(fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: 2)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          if (isPlaying) IconButton(
            icon: Icon(isPaused ? Icons.play_arrow_rounded : Icons.pause_rounded, color: Colors.white, size: 30),
            onPressed: () => setState(() => isPaused = !isPaused),
          )
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 8.0),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Left Panel: Stats and Controls (Scrollable to prevent overflow)
            SizedBox(
              width: 90, // Slightly reduced to give more space to game
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                child: Column(
                  children: [
                    _buildStatBox('SCORE', '$score', Colors.cyan),
                    const SizedBox(height: 6),
                    _buildStatBox('LEVEL', '$level', Colors.orange),
                    const SizedBox(height: 6),
                    _buildStatBox('BEST', '$highScore', Colors.purple),
                    const SizedBox(height: 6),
                    _buildNextPieceBox(),
                    const SizedBox(height: 12),
                    _buildControls(),
                    const SizedBox(height: 10),
                  ],
                ),
              ),
            ),
            
            // Right Panel: Game Field
            const SizedBox(width: 8),
            Expanded(
              child: Center(
                child: _buildGameField(),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatBox(String label, String value, Color color) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 6), // More compact
      decoration: BoxDecoration(
        color: color.withOpacity(0.05),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withOpacity(0.2), width: 1.0),
      ),
      child: Column(
        children: [
          Text(label, style: GoogleFonts.outfit(color: color, fontSize: 8, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
          Text(value, style: GoogleFonts.outfit(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w900)),
        ],
      ),
    );
  }

  Widget _buildNextPieceBox() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.white10, width: 1.0),
      ),
      child: Column(
        children: [
          Text('NEXT', style: GoogleFonts.outfit(color: Colors.white60, fontSize: 8, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
          const SizedBox(height: 4),
          Container(
            height: 25,
            width: 25,
            alignment: Alignment.center,
            child: _buildNextPiecePreview(),
          ),
        ],
      ),
    );
  }

  Widget _buildNextPiecePreview() {
    if (nextTetromino == null) return const SizedBox();
    
    return Icon(
      _getTetrominoIcon(nextTetromino!),
      size: 20, // More compact
      color: colors[nextTetromino],
    ).animate(key: ValueKey(nextTetromino)).scale(duration: 300.ms, curve: Curves.easeOutBack);
  }

  IconData _getTetrominoIcon(Tetromino type) {
    switch (type) {
      case Tetromino.I: return Icons.horizontal_rule_rounded;
      case Tetromino.O: return Icons.square_rounded;
      default: return Icons.grid_view_rounded;
    }
  }

  Widget _buildGameField() {
    return GestureDetector(
      onVerticalDragEnd: (details) {
        if (details.primaryVelocity! > 500) _hardDrop();
      },
      child: AspectRatio(
        aspectRatio: columns / rows,
        child: Container(
          decoration: BoxDecoration(
            border: Border.all(color: Colors.white.withOpacity(0.1), width: 2),
            borderRadius: BorderRadius.circular(12),
            color: const Color(0xFF16213E).withOpacity(0.5),
          ),
          clipBehavior: Clip.antiAlias, // Ensures nothing bleeds out
          child: LayoutBuilder(
            builder: (context, constraints) {
              final ghostCells = _getGhostCells();
              
              return GridView.builder(
                physics: const NeverScrollableScrollPhysics(),
                itemCount: rows * columns,
                padding: EdgeInsets.zero, // Added padding zero
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: columns,
                  childAspectRatio: 1.0,
                ),
                itemBuilder: (context, index) {
                  int r = index ~/ columns;
                  int c = index % columns;
                  
                  Color? cellColor = board[r][c];
                  bool isGhost = false;
                  bool isClearing = (clearingRows ?? []).contains(r);
                  
                  if (cellColor == null && currentPiece != null && !isClearing) {
                    for (var cell in currentPiece!.cells) {
                      if (cell.x == r && cell.y == c) {
                        cellColor = currentPiece!.color;
                      }
                    }
                    if (cellColor == null) {
                      for (var cell in ghostCells) {
                        if (cell.x == r && cell.y == c) {
                          cellColor = currentPiece!.color.withOpacity(0.15);
                          isGhost = true;
                        }
                      }
                    }
                  }

                  Widget cell = AnimatedContainer(
                    duration: const Duration(milliseconds: 50),
                    margin: const EdgeInsets.all(0.5),
                    decoration: BoxDecoration(
                      color: isClearing ? Colors.white : (cellColor ?? Colors.white.withOpacity(0.01)),
                      borderRadius: BorderRadius.circular(2),
                      gradient: (cellColor != null && !isGhost && !isClearing) ? LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          cellColor,
                          cellColor.withOpacity(0.7),
                        ],
                      ) : null,
                      border: (cellColor != null && !isGhost && !isClearing) ? Border.all(
                        color: Colors.white.withOpacity(0.3),
                        width: 0.5,
                      ) : (isGhost ? Border.all(color: currentPiece!.color.withOpacity(0.3), width: 0.5) : null),
                      boxShadow: isClearing ? [
                        BoxShadow(color: Colors.white.withOpacity(0.5), blurRadius: 4, spreadRadius: 1)
                      ] : null,
                    ),
                  );

                  if (isClearing) {
                    return cell.animate()
                      .shimmer(duration: 300.ms, color: Colors.white)
                      .fadeOut(duration: 300.ms);
                  }

                  return cell;
                },
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildControls() {
    if (!isPlaying) {
      return Center(
        child: FilledButton(
          onPressed: startGame,
          style: FilledButton.styleFrom(
            backgroundColor: Colors.cyan,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            padding: const EdgeInsets.symmetric(vertical: 10),
            minimumSize: const Size(double.infinity, 40),
          ),
          child: Text('START', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 11)),
        ).animate().scale(),
      );
    }

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        _buildControlButton(Icons.rotate_right_rounded, _rotate, color: Colors.purple),
        const SizedBox(height: 6),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _buildControlButton(Icons.keyboard_arrow_left_rounded, _moveLeft),
            const SizedBox(width: 4),
            _buildControlButton(Icons.keyboard_arrow_right_rounded, _moveRight),
          ],
        ),
        const SizedBox(height: 6),
        _buildControlButton(Icons.keyboard_arrow_down_rounded, _moveDown),
        const SizedBox(height: 6),
        _buildControlButton(Icons.keyboard_double_arrow_down_rounded, _hardDrop, color: Colors.orange, isWide: true),
      ],
    );
  }

  Widget _buildControlButton(IconData icon, VoidCallback onPressed, {Color color = Colors.cyan, bool isWide = false}) {
    return GestureDetector(
      onTapDown: (_) => onPressed(),
      child: Container(
        width: isWide ? 70 : 36,
        height: 36,
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: color.withOpacity(0.4), width: 1.0),
        ),
        child: Icon(icon, color: color, size: 20),
      ),
    );
  }
}
