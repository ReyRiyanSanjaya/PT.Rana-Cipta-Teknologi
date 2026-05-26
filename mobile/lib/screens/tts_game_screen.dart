import 'dart:async';
import 'dart:math';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:rana_merchant/config/theme_config.dart';
import 'package:rana_merchant/services/sound_service.dart';
import 'package:auto_size_text/auto_size_text.dart';
import 'package:confetti/confetti.dart';

enum TTSMode { huruf, angka }

class TTSGameScreen extends StatefulWidget {
  const TTSGameScreen({super.key});

  @override
  State<TTSGameScreen> createState() => _TTSGameScreenState();
}

class _TTSGameScreenState extends State<TTSGameScreen> {
  // Game Configuration
  final int rows = 12;
  final int cols = 12;

  // Current State
  TTSMode _selectedMode = TTSMode.huruf;
  String _selectedDifficulty = 'Mudah';
  
  late List<List<String?>> grid;
  late List<List<bool>> isLocked; // If cell is locked due to correct word
  String? selectedWordId;
  int? selectedRow;
  int? selectedCol;
  
  // Advanced State
  late ConfettiController _confettiController;
  int _secondsElapsed = 0;
  Timer? _timer;
  int _score = 0;
  int _hintsRemaining = 3;
  Set<String> _completedWords = {};

  // --- TTS HURUF DATA ---
  final Map<String, List<CrosswordWord>> _hurufData = {
    'Mudah': [
      CrosswordWord(id: '1', answer: 'INDONESIA', clue: 'Negara kepulauan terbesar di dunia', startRow: 5, startCol: 1, direction: Axis.horizontal),
      CrosswordWord(id: '2', answer: 'MERAH', clue: 'Warna bendera kita bagian atas', startRow: 1, startCol: 3, direction: Axis.vertical),
      CrosswordWord(id: '3', answer: 'PUTIH', clue: 'Warna bendera kita bagian bawah', startRow: 5, startCol: 8, direction: Axis.vertical),
      CrosswordWord(id: '4', answer: 'GARUDA', clue: 'Burung lambang negara', startRow: 3, startCol: 1, direction: Axis.horizontal),
      CrosswordWord(id: '5', answer: 'MAJU', clue: 'Lawan kata mundur', startRow: 1, startCol: 3, direction: Axis.horizontal),
    ],
    'Sedang': [
      CrosswordWord(id: '1', answer: 'FLUTTER', clue: 'Framework UI buatan Google', startRow: 4, startCol: 2, direction: Axis.horizontal),
      CrosswordWord(id: '2', answer: 'DART', clue: 'Bahasa pemrograman untuk Flutter', startRow: 2, startCol: 5, direction: Axis.vertical),
      CrosswordWord(id: '3', answer: 'WIDGET', clue: 'Komponen dasar tampilan', startRow: 6, startCol: 0, direction: Axis.horizontal),
      CrosswordWord(id: '4', answer: 'CODE', clue: 'Istilah lain untuk kode program', startRow: 1, startCol: 2, direction: Axis.vertical),
      CrosswordWord(id: '5', answer: 'MOBILE', clue: 'Perangkat bergerak ponsel', startRow: 8, startCol: 4, direction: Axis.horizontal),
    ],
    'Sulit': [
      CrosswordWord(id: '1', answer: 'JUPITER', clue: 'Planet terbesar di tata surya', startRow: 3, startCol: 2, direction: Axis.horizontal),
      CrosswordWord(id: '2', answer: 'PLUTO', clue: 'Planet kerdil yang jauh', startRow: 1, startCol: 4, direction: Axis.vertical),
      CrosswordWord(id: '3', answer: 'MARS', clue: 'Planet merah', startRow: 3, startCol: 8, direction: Axis.vertical),
      CrosswordWord(id: '4', answer: 'BUMI', clue: 'Planet berkehidupan', startRow: 6, startCol: 5, direction: Axis.horizontal),
      CrosswordWord(id: '5', answer: 'SATURNUS', clue: 'Planet bercincin unik', startRow: 2, startCol: 0, direction: Axis.horizontal),
    ],
  };

  // --- TTS ANGKA DATA ---
  final Map<String, List<CrosswordWord>> _angkaData = {
    'Mudah': [
      CrosswordWord(id: '1', answer: '144', clue: '12 x 12 = ?', startRow: 5, startCol: 2, direction: Axis.horizontal),
      CrosswordWord(id: '2', answer: '100', clue: '10 x 10 = ?', startRow: 3, startCol: 2, direction: Axis.vertical),
      CrosswordWord(id: '3', answer: '400', clue: '20 x 20 = ?', startRow: 5, startCol: 4, direction: Axis.vertical),
      CrosswordWord(id: '4', answer: '25', clue: '5 x 5 = ?', startRow: 7, startCol: 3, direction: Axis.horizontal),
      CrosswordWord(id: '5', answer: '50', clue: '25 + 25 = ?', startRow: 7, startCol: 4, direction: Axis.vertical),
    ],
    'Sedang': [
      CrosswordWord(id: '1', answer: '1024', clue: '2 pangkat 10 = ?', startRow: 4, startCol: 2, direction: Axis.horizontal),
      CrosswordWord(id: '2', answer: '1000', clue: '10 pangkat 3 = ?', startRow: 4, startCol: 2, direction: Axis.vertical),
      CrosswordWord(id: '3', answer: '42', clue: '6 x 7 = ?', startRow: 7, startCol: 2, direction: Axis.horizontal),
      CrosswordWord(id: '4', answer: '256', clue: '16 x 16 = ?', startRow: 6, startCol: 5, direction: Axis.vertical),
      CrosswordWord(id: '5', answer: '500', clue: 'Setengah dari 1000', startRow: 8, startCol: 3, direction: Axis.horizontal),
    ],
    'Sulit': [
      CrosswordWord(id: '1', answer: '314', clue: 'Tiga angka pertama Pi tanpa koma', startRow: 3, startCol: 3, direction: Axis.horizontal),
      CrosswordWord(id: '2', answer: '360', clue: 'Derajat satu lingkaran penuh', startRow: 3, startCol: 3, direction: Axis.vertical),
      CrosswordWord(id: '3', answer: '1440', clue: 'Jumlah menit dalam satu hari', startRow: 5, startCol: 2, direction: Axis.horizontal),
      CrosswordWord(id: '4', answer: '404', clue: 'Kode error web \"Not Found\"', startRow: 5, startCol: 3, direction: Axis.vertical),
      CrosswordWord(id: '5', answer: '2024', clue: 'Tahun kabisat setelah 2020', startRow: 8, startCol: 3, direction: Axis.horizontal),
    ],
  };

  List<CrosswordWord> get words => 
    _selectedMode == TTSMode.huruf 
      ? (_hurufData[_selectedDifficulty] ?? [])
      : (_angkaData[_selectedDifficulty] ?? []);

  @override
  void initState() {
    super.initState();
    _confettiController = ConfettiController(duration: const Duration(seconds: 4));
    _initializeGrid();
    _startTimer();
  }
  
  @override
  void dispose() {
    _confettiController.dispose();
    _timer?.cancel();
    super.dispose();
  }

  void _startTimer() {
    _timer?.cancel();
    _secondsElapsed = 0;
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (mounted) setState(() => _secondsElapsed++);
    });
  }

  String get _formattedTime {
    int minutes = _secondsElapsed ~/ 60;
    int seconds = _secondsElapsed % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  void _initializeGrid() {
    grid = List.generate(rows, (_) => List.generate(cols, (_) => null));
    isLocked = List.generate(rows, (_) => List.generate(cols, (_) => false));
    selectedWordId = null;
    selectedRow = null;
    selectedCol = null;
    _completedWords.clear();
    _score = 0;
    // Reset hints based on difficulty
    if (_selectedDifficulty == 'Mudah') _hintsRemaining = 5;
    else if (_selectedDifficulty == 'Sedang') _hintsRemaining = 3;
    else _hintsRemaining = 1;

    for (var word in words) {
      for (int i = 0; i < word.answer.length; i++) {
        int r = word.startRow + (word.direction == Axis.vertical ? i : 0);
        int c = word.startCol + (word.direction == Axis.horizontal ? i : 0);
        if (r < rows && c < cols) {
          if (grid[r][c] == null) {
            grid[r][c] = '';
          }
        }
      }
    }
  }

  void _changeMode(TTSMode newMode) {
    if (newMode != _selectedMode) {
      SoundService.playClick();
      setState(() {
        _selectedMode = newMode;
        _initializeGrid();
        _startTimer();
      });
    }
  }

  void _changeDifficulty(String newValue) {
    if (newValue != _selectedDifficulty) {
      SoundService.playClick();
      setState(() {
        _selectedDifficulty = newValue;
        _initializeGrid();
        _startTimer();
      });
    }
  }

  void _useHint() {
    if (_hintsRemaining <= 0) {
      SoundService.playError();
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('Bantuan (Hint) sudah habis!', style: GoogleFonts.outfit(color: Colors.white)),
        backgroundColor: Colors.orange,
        behavior: SnackBarBehavior.floating,
      ));
      return;
    }

    if (selectedWordId == null) {
      SoundService.playError();
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('Pilih kotak/kata dulu untuk menggunakan bantuan.', style: GoogleFonts.outfit(color: Colors.white)),
        backgroundColor: Colors.orange,
        behavior: SnackBarBehavior.floating,
      ));
      return;
    }

    final word = words.firstWhere((w) => w.id == selectedWordId);
    if (_completedWords.contains(word.id)) {
      SoundService.playError();
      return; // Already solved
    }

    // Find empty or wrong cells in this word
    List<Point<int>> availableCells = [];
    for (int i = 0; i < word.answer.length; i++) {
      int r = word.startRow + (word.direction == Axis.vertical ? i : 0);
      int c = word.startCol + (word.direction == Axis.horizontal ? i : 0);
      if (grid[r][c] != word.answer[i]) {
        availableCells.add(Point(r, c));
      }
    }

    if (availableCells.isNotEmpty) {
      SoundService.playSuccess(); // small ping
      setState(() {
        _hintsRemaining--;
        // Pick random empty/wrong cell
        final p = availableCells[Random().nextInt(availableCells.length)];
        // Find which letter it is
        int idx = (word.direction == Axis.horizontal) ? (p.y - word.startCol) : (p.x - word.startRow);
        grid[p.x.toInt()][p.y.toInt()] = word.answer[idx];
        
        // Move selection there so user sees it
        selectedRow = p.x.toInt();
        selectedCol = p.y.toInt();
        
        _checkInstantValidation(word);
      });
    }
  }

  void _onCellTap(int row, int col) {
    if (grid[row][col] == null) return;
    SoundService.playClick();
    setState(() {
      bool isSameCell = selectedRow == row && selectedCol == col;

      if (isSameCell && selectedWordId != null) {
        final currentWord = words.firstWhere((w) => w.id == selectedWordId);
        final otherWord = words.firstWhere(
          (w) => _isCellInWord(w, row, col) && w.id != selectedWordId,
          orElse: () => currentWord,
        );
        if (otherWord != currentWord) selectedWordId = otherWord.id;
      } else {
        selectedRow = row;
        selectedCol = col;
        var word = words.firstWhere(
          (w) => _isCellInWord(w, row, col) && w.direction == Axis.horizontal,
          orElse: () => words.firstWhere(
            (w) => _isCellInWord(w, row, col),
            orElse: () => words.first,
          ),
        );
        selectedWordId = word.id;
      }
    });
  }

  bool _isCellInWord(CrosswordWord word, int row, int col) {
    if (word.direction == Axis.horizontal) {
      return row == word.startRow && col >= word.startCol && col < word.startCol + word.answer.length;
    } else {
      return col == word.startCol && row >= word.startRow && row < word.startRow + word.answer.length;
    }
  }

  void _onKeyPress(String char) {
    if (selectedRow == null || selectedCol == null) return;
    if (isLocked[selectedRow!][selectedCol!]) return; // Cannot edit locked cells

    SoundService.playClick();
    setState(() {
      grid[selectedRow!][selectedCol!] = char;

      if (selectedWordId != null) {
        final currentWord = words.firstWhere((w) => w.id == selectedWordId);
        _checkInstantValidation(currentWord);

        int currentIndex = (currentWord.direction == Axis.horizontal)
            ? (selectedCol! - currentWord.startCol)
            : (selectedRow! - currentWord.startRow);

        if (currentIndex < currentWord.answer.length - 1) {
          if (currentWord.direction == Axis.horizontal) {
            selectedCol = selectedCol! + 1;
          } else {
            selectedRow = selectedRow! + 1;
          }
        }
      }
    });
  }

  void _checkInstantValidation(CrosswordWord word) {
    if (_completedWords.contains(word.id)) return; // Already solved

    bool isWordCorrect = true;
    for (int i = 0; i < word.answer.length; i++) {
        int r = word.startRow + (word.direction == Axis.vertical ? i : 0);
        int c = word.startCol + (word.direction == Axis.horizontal ? i : 0);
        if (grid[r][c] != word.answer[i]) {
          isWordCorrect = false;
          break;
        }
    }

    if (isWordCorrect) {
      // Lock it and score!
      SoundService.playSuccess();
      _completedWords.add(word.id);
      
      // Calculate score = length * 10, bonus if done quick
      int wordScore = word.answer.length * 10;
      int timeBonus = max(0, 50 - _secondsElapsed);
      _score += (wordScore + timeBonus);

      for (int i = 0; i < word.answer.length; i++) {
        int r = word.startRow + (word.direction == Axis.vertical ? i : 0);
        int c = word.startCol + (word.direction == Axis.horizontal ? i : 0);
        isLocked[r][c] = true;
      }

      // Check if whole board is done
      if (_completedWords.length == words.length) {
        _timer?.cancel();
        _confettiController.play();
        _showSuccessDialog();
      }
    }
  }

  void _checkAllAnswers() {
    // Failsafe button checking overall status
    if (_completedWords.length == words.length) {
      _showSuccessDialog();
    } else {
      SoundService.playError();
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('Terus berusaha! Masih ada kata yang salah atau belum diisi.', style: GoogleFonts.outfit(color: Colors.white)),
        backgroundColor: ThemeConfig.colorError,
        behavior: SnackBarBehavior.floating,
      ));
    }
  }

  void _showSuccessDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(28),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.1),
                blurRadius: 30,
                offset: const Offset(0, 15),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: ThemeConfig.colorSuccess.withOpacity(0.15),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.emoji_events_rounded, color: ThemeConfig.colorSuccess, size: 64),
              ).animate().scale(curve: Curves.elasticOut, duration: 800.ms),
              const SizedBox(height: 20),
              Text(
                'Luar Biasa!',
                style: GoogleFonts.outfit(fontSize: 28, fontWeight: FontWeight.w800, color: ThemeConfig.textPrimary),
              ),
              const SizedBox(height: 8),
              Text(
                'Skor Anda: $_score',
                style: GoogleFonts.outfit(color: ThemeConfig.brandColor, fontSize: 24, fontWeight: FontWeight.bold),
              ),
              Text(
                'Waktu: $_formattedTime',
                style: GoogleFonts.outfit(color: ThemeConfig.textSecondary, fontSize: 16, fontWeight: FontWeight.w500),
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () {
                    Navigator.pop(context); // close dialog
                    Navigator.pop(context); // close game
                  },
                  style: FilledButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    backgroundColor: ThemeConfig.brandColor,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: Text('Keluar Permainan', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    String currentClue = '';
    if (selectedWordId != null) {
      final word = words.firstWhere((w) => w.id == selectedWordId);
      currentClue = word.clue;
    }

    return Scaffold(
      extendBodyBehindAppBar: true,
      backgroundColor: const Color(0xFFF4F6F9), // Sleek gaming bg
      appBar: AppBar(
        title: Text('Rana TTS Pro', style: GoogleFonts.outfit(fontWeight: FontWeight.w800)),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(color: Colors.white.withOpacity(0.6), shape: BoxShape.circle),
            child: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          ),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16.0),
            child: IconButton(
              icon: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [ThemeConfig.colorSuccess, Colors.greenAccent],
                    begin: Alignment.topLeft, end: Alignment.bottomRight,
                  ),
                  shape: BoxShape.circle,
                  boxShadow: [BoxShadow(color: ThemeConfig.colorSuccess.withOpacity(0.4), blurRadius: 8, offset: const Offset(0, 4))],
                ),
                child: const Icon(Icons.check_rounded, color: Colors.white, size: 20),
              ),
              onPressed: _checkAllAnswers,
            ),
          ),
        ],
      ),
      body: Stack(
        children: [
          // Elegant decorative blocks
          Positioned(top: -100, right: -100, child: Container(width: 300, height: 300, decoration: BoxDecoration(shape: BoxShape.circle, color: ThemeConfig.brandColor.withOpacity(0.04)))),
          Positioned(bottom: 150, left: -50, child: Container(width: 200, height: 200, decoration: BoxDecoration(shape: BoxShape.circle, color: ThemeConfig.colorSuccess.withOpacity(0.03)))),
          
          SafeArea(
            child: Column(
              children: [
                _buildTopStatsBar(),
                const SizedBox(height: 12),
                _buildDifficultySelector(),
                const SizedBox(height: 12),
                _buildClueCard(currentClue),
                const SizedBox(height: 12),
                Expanded(
                  child: Center(
                    child: InteractiveViewer(
                      boundaryMargin: const EdgeInsets.all(32),
                      minScale: 0.8,
                      maxScale: 2.5,
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        margin: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(24),
                          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 20, offset: const Offset(0, 10))],
                        ),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: List.generate(rows, (r) {
                            return Row(
                              mainAxisSize: MainAxisSize.min,
                              children: List.generate(cols, (c) => _buildGridCell(r, c)),
                            );
                          }),
                        ),
                      ),
                    ),
                  ),
                ).animate().scale(delay: 100.ms, curve: Curves.easeOutQuart),
                _buildKeyboard(),
              ],
            ),
          ),
          Align(
            alignment: Alignment.topCenter,
            child: ConfettiWidget(
              confettiController: _confettiController,
              blastDirectionality: BlastDirectionality.explosive,
              emissionFrequency: 0.05,
              numberOfParticles: 30,
              gravity: 0.3,
              colors: const [Colors.green, Colors.blue, Colors.pink, Colors.orange, Colors.yellow],
            ),
          ),
        ],
      ),
    );
  }
  
  // Advanced Top Stats Bar
  Widget _buildTopStatsBar() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 8, offset: const Offset(0,4))],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Timer
          Row(
            children: [
              const Icon(Icons.timer_outlined, color: Colors.blueGrey, size: 20),
              const SizedBox(width: 6),
              Text(
                _formattedTime,
                style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.blueGrey),
              ),
            ],
          ),
          // Mode Changer Segmented
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(12)),
            child: Row(
              children: [
                GestureDetector(
                  onTap: () => _changeMode(TTSMode.huruf),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: _selectedMode == TTSMode.huruf ? ThemeConfig.brandColor : Colors.transparent,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text('Abjad', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: _selectedMode == TTSMode.huruf ? Colors.white : Colors.grey, fontSize: 12)),
                  ),
                ),
                GestureDetector(
                  onTap: () => _changeMode(TTSMode.angka),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: _selectedMode == TTSMode.angka ? const Color(0xFFE07A5F) : Colors.transparent,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text('123', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: _selectedMode == TTSMode.angka ? Colors.white : Colors.grey, fontSize: 12)),
                  ),
                ),
              ],
            ),
          ),
          // Score
          Row(
            children: [
              const Icon(Icons.star_rounded, color: Colors.amber, size: 20),
              const SizedBox(width: 4),
              Text(
                '$_score',
                style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.amber.shade700),
              ).animate(key: ValueKey(_score)).scale(curve: Curves.elasticOut),
            ],
          ),
        ],
      ),
    ).animate().fadeIn().slideY(begin: -0.2);
  }

  Widget _buildDifficultySelector() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24),
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(50),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 10, offset: const Offset(0, 4))],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: ['Mudah', 'Sedang', 'Sulit'].map((difficulty) {
          final isSelected = _selectedDifficulty == difficulty;
          Color activeCol = ThemeConfig.brandColor;
          if (difficulty == 'Sedang') activeCol = Colors.orange;
          if (difficulty == 'Sulit') activeCol = ThemeConfig.colorError;

          return GestureDetector(
            onTap: () => _changeDifficulty(difficulty),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
              decoration: BoxDecoration(
                color: isSelected ? activeCol : Colors.transparent,
                borderRadius: BorderRadius.circular(50),
              ),
              child: Text(
                difficulty,
                style: GoogleFonts.outfit(
                  fontWeight: FontWeight.bold,
                  color: isSelected ? Colors.white : ThemeConfig.textSecondary,
                  fontSize: 14,
                ),
              ),
            ),
          );
        }).toList(),
      ),
    ).animate().fadeIn().slideY(begin: -0.2, delay: 100.ms);
  }

  Widget _buildClueCard(String currentClue) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
            decoration: BoxDecoration(
              gradient: LinearGradient(colors: [Colors.white, Colors.indigo.shade50], begin: Alignment.topLeft, end: Alignment.bottomRight),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.white, width: 2),
              boxShadow: [BoxShadow(color: ThemeConfig.shadowColor, blurRadius: 16, offset: const Offset(0, 8))],
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.tips_and_updates_rounded, color: ThemeConfig.brandColor, size: 20),
                    const SizedBox(width: 8),
                    Text(
                      'PERTANYAAN',
                      style: GoogleFonts.outfit(fontSize: 12, fontWeight: FontWeight.w800, letterSpacing: 1.2, color: ThemeConfig.brandColor),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 300),
                  child: AutoSizeText(
                    currentClue.isEmpty ? 'Pilih kotak untuk melihat petunjuk' : currentClue,
                    key: ValueKey(currentClue),
                    style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w700, color: ThemeConfig.textPrimary, height: 1.3),
                    textAlign: TextAlign.center,
                    maxLines: 2,
                  ),
                ),
              ],
            ),
          ),
          // Floating Hint Button
          Positioned(
            right: -10, top: -10,
            child: GestureDetector(
              onTap: _useHint,
              child: Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.amber,
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 3),
                  boxShadow: [BoxShadow(color: Colors.amber.withOpacity(0.5), blurRadius: 12, offset: const Offset(0, 4))],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.auto_fix_high_rounded, color: Colors.white, size: 18),
                    if (_hintsRemaining > 0)
                      Padding(
                        padding: const EdgeInsets.only(left: 4),
                        child: Text('$_hintsRemaining', style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 12)),
                      ),
                  ],
                ),
              ).animate(onPlay: (controller) => controller.repeat(reverse: true)).scaleXY(begin: 1.0, end: 1.05, duration: 1000.ms),
            ),
          )
        ],
      ),
    ).animate().fadeIn(duration: 500.ms).slideY(begin: 0.1);
  }

  Widget _buildGridCell(int r, int c) {
    final isCellValid = grid[r][c] != null;
    final isSelected = r == selectedRow && c == selectedCol;
    final isInSelectedWord = selectedWordId != null && _isCellInWord(words.firstWhere((w) => w.id == selectedWordId), r, c);
    final locked = isLocked[r][c];

    String? cellNumber;
    try {
      final word = words.firstWhere((w) => w.startRow == r && w.startCol == c);
      cellNumber = word.id;
    } catch (_) {}

    if (!isCellValid) {
      return Container(width: 38, height: 38, margin: const EdgeInsets.all(2), color: Colors.transparent);
    }

    final isFilled = grid[r][c] != '';
    
    // Smooth coloring logic
    Color cellColor = Colors.grey.shade50; // default void
    Color textColor = ThemeConfig.textPrimary;
    Color borderColor = Colors.grey.shade300;

    if (locked) {
      cellColor = ThemeConfig.colorSuccess.withOpacity(0.15);
      textColor = ThemeConfig.colorSuccess;
      borderColor = ThemeConfig.colorSuccess.withOpacity(0.5);
    } else if (isSelected) {
      cellColor = ThemeConfig.brandColor;
      textColor = Colors.white;
      borderColor = ThemeConfig.brandColor;
    } else if (isInSelectedWord) {
      cellColor = ThemeConfig.brandColor.withOpacity(0.15);
      textColor = ThemeConfig.brandColor;
      borderColor = ThemeConfig.brandColor.withOpacity(0.5);
    } else if (isFilled) {
      cellColor = Colors.white;
    }

    return GestureDetector(
      onTap: () => _onCellTap(r, c),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        width: 38, height: 38,
        margin: const EdgeInsets.all(2),
        decoration: BoxDecoration(
          color: cellColor,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: borderColor, width: isSelected ? 2 : 1),
          boxShadow: isSelected ? [BoxShadow(color: ThemeConfig.brandColor.withOpacity(0.3), blurRadius: 8, offset: const Offset(0, 4))] : [],
        ),
        alignment: Alignment.center,
        child: Stack(
          children: [
            Center(
              child: Text(
                grid[r][c] ?? '',
                style: GoogleFonts.outfit(
                  fontWeight: FontWeight.w900,
                  fontSize: 18,
                  color: textColor,
                ),
              ).animate(key: ValueKey('${r}_${c}_${grid[r][c]}_$locked')).scale(curve: Curves.easeOutBack, duration: 400.ms),
            ),
            if (cellNumber != null)
              Positioned(
                top: 2, left: 4,
                child: Text(
                  cellNumber,
                  style: GoogleFonts.outfit(
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    color: isSelected ? Colors.white.withOpacity(0.9) : (locked ? ThemeConfig.colorSuccess : ThemeConfig.brandColor),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildKeyboard() {
    bool isNumber = _selectedMode == TTSMode.angka;
    return Container(
      padding: const EdgeInsets.fromLTRB(8, 16, 8, 24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.08), blurRadius: 24, offset: const Offset(0, -5))],
      ),
      child: isNumber 
        ? Column(
            children: [
              _buildKeyboardRow(['1','2','3','4','5']),
              const SizedBox(height: 12),
              _buildKeyboardRow(['6','7','8','9','0']),
              const SizedBox(height: 12),
              _buildKeyboardRow(['DEL']),
            ],
          )
        : Column(
            children: [
              _buildKeyboardRow(['Q','W','E','R','T','Y','U','I','O','P']),
              const SizedBox(height: 12),
              _buildKeyboardRow(['A','S','D','F','G','H','J','K','L']),
              const SizedBox(height: 12),
              _buildKeyboardRow(['Z','X','C','V','B','N','M','DEL']),
            ],
          ),
    ).animate().slideY(begin: 1, end: 0, duration: 600.ms, curve: Curves.easeOutQuart);
  }

  Widget _buildKeyboardRow(List<String> keys) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: keys.map((key) {
        bool isDel = key == 'DEL';
        double btnW = isDel ? 64 : (_selectedMode == TTSMode.angka ? 56 : 32); 
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 3.0),
          child: _MechanicalKey(
            width: btnW,
            isDel: isDel,
            label: key,
            onPressed: () {
              if (isDel) {
                if (selectedRow != null && selectedCol != null) {
                  if (!isLocked[selectedRow!][selectedCol!]) {
                    SoundService.playClick();
                    setState(() => grid[selectedRow!][selectedCol!] = '');
                  }
                }
              } else {
                _onKeyPress(key);
              }
            },
          ),
        );
      }).toList(),
    );
  }
}

// Custom 3D Mechanical Key Widget for Professional Look
class _MechanicalKey extends StatefulWidget {
  final double width;
  final bool isDel;
  final String label;
  final VoidCallback onPressed;

  const _MechanicalKey({required this.width, required this.isDel, required this.label, required this.onPressed});

  @override
  State<_MechanicalKey> createState() => _MechanicalKeyState();
}

class _MechanicalKeyState extends State<_MechanicalKey> {
  bool _isPressed = false;

  void _handleTapDown(TapDownDetails details) {
    setState(() => _isPressed = true);
  }

  void _handleTapUp(TapUpDetails details) {
    setState(() => _isPressed = false);
    widget.onPressed();
  }

  void _handleTapCancel() {
    setState(() => _isPressed = false);
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: _handleTapDown,
      onTapUp: _handleTapUp,
      onTapCancel: _handleTapCancel,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 50),
        width: widget.width,
        height: 48,
        margin: EdgeInsets.only(top: _isPressed ? 4 : 0, bottom: _isPressed ? 0 : 4),
        decoration: BoxDecoration(
          color: widget.isDel ? (_isPressed ? Colors.red.shade100 : Colors.red.shade50) : (_isPressed ? Colors.grey.shade200 : Colors.white),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: widget.isDel ? Colors.red.shade200 : Colors.grey.shade300, width: 1.5),
          boxShadow: _isPressed 
            ? null 
            : [
                BoxShadow(
                  color: widget.isDel ? Colors.red.shade200 : Colors.grey.shade300,
                  offset: const Offset(0, 4),
                )
              ],
        ),
        alignment: Alignment.center,
        child: widget.isDel
            ? const Icon(Icons.backspace_rounded, size: 20, color: ThemeConfig.colorError)
            : Text(widget.label, style: GoogleFonts.outfit(fontWeight: FontWeight.w800, fontSize: 18, color: ThemeConfig.textPrimary)),
      ),
    );
  }
}

class CrosswordWord {
  final String id;
  final String answer;
  final String clue;
  final int startRow;
  final int startCol;
  final Axis direction;

  CrosswordWord({
    required this.id, required this.answer, required this.clue,
    required this.startRow, required this.startCol, required this.direction,
  });
}
