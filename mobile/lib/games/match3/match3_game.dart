import 'dart:async';
import 'dart:math';
import 'package:flame/components.dart';
import 'package:flame/effects.dart';
import 'package:flame/game.dart';
import 'package:flame/events.dart';
import 'package:flutter/material.dart';
import 'match3_board.dart';
import 'match3_types.dart';
import 'components/candy_component.dart';

enum GameState { ready, animating, win, lose }

class Match3Game extends FlameGame with TapCallbacks {
  final int rows;
  final int cols;
  final int targetScore;
  final int maxMoves;
  
  GameState state = GameState.ready;
  late Match3Board board;
  int score = 0;
  int moves = 0;
  
  // Visual grid
  late List<List<CandyComponent?>> visualGrid;
  
  // Layout
  Vector2 gridOffset = Vector2.zero();
  double cellSize = 0;
  
  Point<int>? selected;

  Match3Game({
    this.rows = 8,
    this.cols = 8,
    this.targetScore = 1000,
    this.maxMoves = 20,
  });

  @override
  Future<void> onLoad() async {
    board = Match3Board(rows: rows, cols: cols);
    visualGrid = List.generate(rows, (_) => List.generate(cols, (_) => null));
    _layout();
    _initialRender();
  }

  void _layout() {
    final w = size.x;
    final h = size.y;
    // Leave some margin
    final availW = w - 40;
    final availH = h - 100; // Space for HUD
    
    cellSize = min(availW / cols, availH / rows);
    final gridW = cols * cellSize;
    final gridH = rows * cellSize;
    
    gridOffset = Vector2((w - gridW) / 2, (h - gridH) / 2 + 40);
  }

  void _initialRender() {
    removeAll(children);
    
    // Draw background board
    for (int r = 0; r < rows; r++) {
      for (int c = 0; c < cols; c++) {
        final pos = _gridToPos(r, c);
        add(
          RectangleComponent(
            position: pos,
            size: Vector2.all(cellSize),
            anchor: Anchor.center,
            paint: Paint()..color = (r + c) % 2 == 0 
                ? Colors.white.withOpacity(0.1) 
                : Colors.white.withOpacity(0.05),
          ),
        );
      }
    }

    // Add candies
    for (int r = 0; r < rows; r++) {
      for (int c = 0; c < cols; c++) {
        final candy = board.grid[r][c];
        if (candy != null) {
          final comp = CandyComponent(
            candy: candy,
            gridPosition: Point(r, c),
            position: _gridToPos(r, c),
            size: Vector2.all(cellSize * 0.9),
          );
          visualGrid[r][c] = comp;
          add(comp);
        }
      }
    }
  }

  Vector2 _gridToPos(int r, int c) {
    return Vector2(
      gridOffset.x + c * cellSize + cellSize / 2,
      gridOffset.y + r * cellSize + cellSize / 2,
    );
  }

  @override
  void onTapDown(TapDownEvent event) {
    if (state != GameState.ready) return;
    
    final p = event.localPosition;
    // Convert screen pos to grid index
    final c = ((p.x - gridOffset.x) / cellSize).floor();
    final r = ((p.y - gridOffset.y) / cellSize).floor();
    
    if (c < 0 || c >= cols || r < 0 || r >= rows) return; // Clicked outside
    
    final clicked = Point(r, c);
    
    if (selected == null) {
      // Select
      selected = clicked;
      visualGrid[r][c]?.select();
    } else {
      final s = selected!;
      visualGrid[s.x][s.y]?.deselect();
      selected = null;
      
      if (s == clicked) return; // Deselect if clicked same
      
      if (board.areAdjacent(s.x, s.y, r, c)) {
        _handleSwap(s, clicked);
      } else {
        // Select new
        selected = clicked;
        visualGrid[r][c]?.select();
      }
    }
  }

  Future<void> _handleSwap(Point<int> p1, Point<int> p2) async {
    state = GameState.animating;
    
    final c1 = visualGrid[p1.x][p1.y]!;
    final c2 = visualGrid[p2.x][p2.y]!;
    
    // Swap in visual grid
    visualGrid[p1.x][p1.y] = c2;
    visualGrid[p2.x][p2.y] = c1;
    c1.gridPosition = p2;
    c2.gridPosition = p1;

    // Animate
    await Future.wait([
      _animateMove(c1, _gridToPos(p2.x, p2.y)),
      _animateMove(c2, _gridToPos(p1.x, p1.y)),
    ]);

    // Swap Logic
    board.swap(p1.x, p1.y, p2.x, p2.y);
    
    // Check Matches
    final matches = board.findMatches();
    if (matches.isEmpty) {
      // Swap Back
      // Visual
      visualGrid[p1.x][p1.y] = c1;
      visualGrid[p2.x][p2.y] = c2;
      c1.gridPosition = p1;
      c2.gridPosition = p2;
      
      // Animate Back
      await Future.wait([
        _animateMove(c1, _gridToPos(p1.x, p1.y)),
        _animateMove(c2, _gridToPos(p2.x, p2.y)),
      ]);
      
      // Logic Back
      board.swap(p1.x, p1.y, p2.x, p2.y);
      state = GameState.ready;
    } else {
      moves++; // Valid move
      await _processMatches(matches);
      
      if (score >= targetScore) {
        state = GameState.win;
      } else if (moves >= maxMoves) {
        state = GameState.lose;
      } else {
        state = GameState.ready;
      }
    }
  }

  Future<void> _processMatches(List<List<Point<int>>> matches) async {
    while (matches.isNotEmpty) {
      // Resolve
      final result = board.resolveMatches(matches);
      score += result['score'] as int;
      
      final removed = result['removed'] as List<Point<int>>;
      final created = result['created'] as List<Map<String, dynamic>>;

      // Animate Removal
      await _animateRemoval(removed);
      
      // Create Special Candies
      for (final item in created) {
        final r = item['r'] as int;
        final c = item['c'] as int;
        final candy = item['candy'] as Candy;
        
        final comp = CandyComponent(
          candy: candy,
          gridPosition: Point(r, c),
          position: _gridToPos(r, c),
          size: Vector2.all(cellSize * 0.9),
        );
        // Start small
        comp.scale = Vector2.zero();
        visualGrid[r][c] = comp;
        add(comp);
        
        // Pop in
        comp.add(ScaleEffect.to(Vector2.all(1.0), EffectController(duration: 0.3, curve: Curves.elasticOut)));
      }
      if (created.isNotEmpty) await Future.delayed(const Duration(milliseconds: 300));

      // Gravity
      final moves = board.applyGravity();
      await _animateGravity(moves);
      
      // Refill
      final newCandies = board.refill();
      await _animateRefill(newCandies);
      
      // Check again
      matches = board.findMatches();
      
      // Small delay between chain reactions
      if (matches.isNotEmpty) await Future.delayed(const Duration(milliseconds: 200));
    }
  }

  Future<void> _animateMove(PositionComponent comp, Vector2 target) async {
    final completer = Completer();
    comp.add(MoveEffect.to(
      target,
      EffectController(duration: 0.2, curve: Curves.easeInOut),
      onComplete: () => completer.complete(),
    ));
    return completer.future;
  }

  Future<void> _animateRemoval(List<Point<int>> points) async {
    final futures = <Future>[];
    for (final p in points) {
      final comp = visualGrid[p.x][p.y];
      if (comp != null) {
        visualGrid[p.x][p.y] = null;
        final completer = Completer();
        comp.add(ScaleEffect.to(
          Vector2.zero(),
          EffectController(duration: 0.2),
          onComplete: () {
            remove(comp);
            completer.complete();
          },
        ));
        futures.add(completer.future);
      }
    }
    await Future.wait(futures);
  }

  Future<void> _animateGravity(List<Map<String, Point<int>>> moves) async {
    final futures = <Future>[];
    for (final move in moves) {
      final from = move['from']!;
      final to = move['to']!;
      
      // Note: visualGrid[from.x][from.y] might be null if it was removed, 
      // but gravity only moves existing items. 
      // Wait, visualGrid is updated in _animateRemoval so grid[from] should be null if removed.
      // But applyGravity operates on the logical grid which has already had matches removed.
      // So visualGrid[from] corresponds to the candy that is FALLING.
      // visualGrid[to] should be empty (null).
      
      final comp = visualGrid[from.x][from.y];
      if (comp != null) {
        visualGrid[to.x][to.y] = comp;
        visualGrid[from.x][from.y] = null;
        comp.gridPosition = to;
        futures.add(_animateMove(comp, _gridToPos(to.x, to.y)));
      }
    }
    await Future.wait(futures);
  }

  Future<void> _animateRefill(List<Map<String, dynamic>> newCandies) async {
    final futures = <Future>[];
    for (final item in newCandies) {
      final r = item['r'] as int;
      final c = item['c'] as int;
      final candy = item['candy'] as Candy;
      
      // Spawn above the board
      final startPos = _gridToPos(-1, c);
      final targetPos = _gridToPos(r, c);
      
      final comp = CandyComponent(
        candy: candy,
        gridPosition: Point(r, c),
        position: startPos,
        size: Vector2.all(cellSize * 0.9),
      );
      
      visualGrid[r][c] = comp;
      add(comp);
      
      futures.add(_animateMove(comp, targetPos));
    }
    await Future.wait(futures);
  }

  void resetLevel() {
    score = 0;
    moves = 0;
    state = GameState.ready;
    board = Match3Board(rows: rows, cols: cols);
    _initialRender();
  }
}
