import 'dart:math';
import 'match3_types.dart';

class Match3Board {
  final int rows;
  final int cols;
  final Random _rand = Random();
  late List<List<Candy?>> grid;

  Match3Board({this.rows = 8, this.cols = 8}) {
    grid = List.generate(rows, (_) => List.generate(cols, (_) => null));
    _fillInitial();
  }

  void _fillInitial() {
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        grid[r][c] = _randomCandy();
        while (_hasMatchAt(r, c)) {
          grid[r][c] = _randomCandy();
        }
      }
    }
  }

  Candy _randomCandy() {
    final color = CandyColor.values[_rand.nextInt(CandyColor.values.length)];
    return Candy(color);
  }

  bool _hasMatchAt(int r, int c) {
    final candy = grid[r][c];
    if (candy == null) return false;
    // Horizontal check
    int h = 1;
    for (int x = c - 1; x >= 0 && grid[r][x]?.color == candy.color; x--) h++;
    for (int x = c + 1; x < cols && grid[r][x]?.color == candy.color; x++) h++;
    if (h >= 3) return true;

    // Vertical check
    int v = 1;
    for (int y = r - 1; y >= 0 && grid[y][c]?.color == candy.color; y--) v++;
    for (int y = r + 1; y < rows && grid[y][c]?.color == candy.color; y++) v++;
    if (v >= 3) return true;

    return false;
  }

  bool areAdjacent(int r1, int c1, int r2, int c2) {
    final dr = (r1 - r2).abs();
    final dc = (c1 - c2).abs();
    return (dr + dc) == 1;
  }

  void swap(int r1, int c1, int r2, int c2) {
    final tmp = grid[r1][c1];
    grid[r1][c1] = grid[r2][c2];
    grid[r2][c2] = tmp;
  }

  List<List<Point<int>>> findMatches() {
    final visited = List.generate(rows, (_) => List.generate(cols, (_) => false));
    final groups = <List<Point<int>>>[];

    // Horizontal
    for (int r = 0; r < rows; r++) {
      for (int c = 0; c < cols; c++) {
        final candy = grid[r][c];
        if (candy == null) continue;
        int end = c + 1;
        while (end < cols && grid[r][end]?.color == candy.color) end++;
        if (end - c >= 3) {
          final group = <Point<int>>[];
          for (int k = c; k < end; k++) {
            if (!visited[r][k]) group.add(Point(r, k));
          }
          if (group.isNotEmpty) groups.add(group);
          // Mark visited
          for (int k = c; k < end; k++) visited[r][k] = true;
        }
        c = end - 1;
      }
    }

    // Reset visited for vertical pass? No, we want to group them together if they intersect.
    // Actually, distinct horizontal and vertical groups are fine, we'll merge intersecting ones later or handle them separately.
    // For simplicity, let's just collect vertical matches now.
    // Note: A "T" shape match will be detected as one H match and one V match. That's okay.

    for (int c = 0; c < cols; c++) {
      for (int r = 0; r < rows; r++) {
        final candy = grid[r][c];
        if (candy == null) continue;
        int end = r + 1;
        while (end < rows && grid[end][c]?.color == candy.color) end++;
        if (end - r >= 3) {
          final group = <Point<int>>[];
          for (int k = r; k < end; k++) {
            // Even if visited horizontally, we add it to vertical group to detect special patterns like T or L
            group.add(Point(k, c)); 
          }
          if (group.isNotEmpty) groups.add(group);
          r = end - 1;
        }
      }
    }
    return groups;
  }

  /// Resolves matches and returns the score and special candies created.
  /// Does NOT refill or apply gravity.
  Map<String, dynamic> resolveMatches(List<List<Point<int>>> matches) {
    int score = 0;
    final created = <Map<String, dynamic>>[];
    final removed = <Point<int>>{};

    for (final group in matches) {
      score += group.length * 10;
      SpecialType special = SpecialType.none;
      Point<int>? specialPos;

      // Determine special candy
      if (group.length == 4) {
        // Line bomb (Striped)
        // Check orientation
        bool isHorizontal = group.every((p) => p.x == group.first.x); // x is row
        special = isHorizontal ? SpecialType.stripedV : SpecialType.stripedH; // If matched horizontally, it creates a vertical stripe (usually) or horizontal? 
        // In Candy Crush: 4 in a row -> striped. Direction depends on swipe? Or just random? Usually swipe direction.
        // For simplicity: horizontal match -> vertical stripe (clears row when activated? No, horizontal stripe clears row).
        // Let's say: 4-match horizontal -> Vertical Stripe Candy (clears column). 
        // Wait, logic: Striped candy has stripes in direction of blast.
        // So if I match 4 horizontally, I usually get a striped candy.
        // Let's stick to: Horizontal match -> StripedH (clears row). Vertical match -> StripedV (clears col).
        special = isHorizontal ? SpecialType.stripedH : SpecialType.stripedV;
      } else if (group.length >= 5) {
        // Color bomb
        special = SpecialType.colorBomb;
      } else {
        // Check for T or L shape (intersecting groups)
        // This logic is complex with separate groups.
        // For now, let's just handle simple 4 and 5 matches.
        // TODO: Handle T/L for Wrapped candy.
      }

      if (special != SpecialType.none) {
        // Create special candy at the first position or random in group
        // Ideally at the position of the swap if involved.
        // For now, middle of the group.
        specialPos = group[group.length ~/ 2];
        final base = grid[specialPos.x][specialPos.y];
        if (base != null) {
          created.add({
            'r': specialPos.x,
            'c': specialPos.y,
            'candy': base.copyWith(special: special)
          });
        }
      }

      for (final p in group) {
        if (specialPos != null && p == specialPos) continue; // Don't remove the spot where special candy forms
        removed.add(p);
      }
    }

    // Apply removal
    for (final p in removed) {
      grid[p.x][p.y] = null;
    }

    // Apply creation
    for (final item in created) {
      grid[item['r']][item['c']] = item['candy'];
    }

    return {
      'score': score,
      'removed': removed.toList(),
      'created': created,
    };
  }

  /// Returns a list of moves: {from: Point, to: Point}
  List<Map<String, Point<int>>> applyGravity() {
    final moves = <Map<String, Point<int>>>[];
    for (int c = 0; c < cols; c++) {
      int write = rows - 1;
      for (int r = rows - 1; r >= 0; r--) {
        if (grid[r][c] != null) {
          if (write != r) {
            grid[write][c] = grid[r][c];
            grid[r][c] = null;
            moves.add({'from': Point(r, c), 'to': Point(write, c)});
          }
          write--;
        }
      }
    }
    return moves;
  }

  /// Returns list of new candies: {r, c, candy}
  List<Map<String, dynamic>> refill() {
    final newCandies = <Map<String, dynamic>>[];
    for (int c = 0; c < cols; c++) {
      for (int r = 0; r < rows; r++) {
        if (grid[r][c] == null) {
          final candy = _randomCandy();
          grid[r][c] = candy;
          newCandies.add({'r': r, 'c': c, 'candy': candy});
        }
      }
    }
    return newCandies;
  }
}
