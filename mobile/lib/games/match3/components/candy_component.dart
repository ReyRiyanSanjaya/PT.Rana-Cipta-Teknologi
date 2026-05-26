import 'dart:math' as math;
import 'dart:ui';
import 'package:flame/components.dart';
import 'package:flame/effects.dart';
import 'package:flutter/material.dart';
import '../match3_types.dart';

class CandyComponent extends PositionComponent {
  final Candy candy;
  math.Point<int> gridPosition;
  bool isSelected = false;

  CandyComponent({
    required this.candy,
    required this.gridPosition,
    required Vector2 position,
    required Vector2 size,
  }) : super(position: position, size: size, anchor: Anchor.center);

  @override
  Future<void> onLoad() async {
    // Pop-in effect
    scale = Vector2.zero();
    add(ScaleEffect.to(Vector2.all(1.0), EffectController(duration: 0.3, curve: Curves.elasticOut)));
  }

  void select() {
    isSelected = true;
    add(ScaleEffect.to(Vector2.all(1.1), EffectController(duration: 0.1)));
  }

  void deselect() {
    isSelected = false;
    add(ScaleEffect.to(Vector2.all(1.0), EffectController(duration: 0.1)));
  }

  @override
  void render(Canvas canvas) {
    final rect = size.toRect();
    final radius = Radius.circular(size.x * 0.25);
    final rrect = RRect.fromRectAndRadius(rect, radius);

    // Base Color with Gradient
    final baseColor = _mapColor(candy.color);
    final gradient = RadialGradient(
      center: Alignment(-0.3, -0.3),
      radius: 0.8,
      colors: [
        baseColor.withOpacity(0.9),
        baseColor,
        Color.lerp(baseColor, Colors.black, 0.4)!,
      ],
      stops: const [0.0, 0.5, 1.0],
    );
    
    final paint = Paint()..shader = gradient.createShader(rect);
    canvas.drawRRect(rrect, paint);

    // Highlight (Gloss)
    final glossPath = Path()
      ..addOval(Rect.fromLTWH(size.x * 0.1, size.y * 0.1, size.x * 0.4, size.y * 0.25));
    canvas.drawPath(glossPath, Paint()..color = Colors.white.withOpacity(0.3));

    // Selection Glow
    if (isSelected) {
      canvas.drawRRect(
        rrect.inflate(4),
        Paint()
          ..color = Colors.white.withOpacity(0.5)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 3,
      );
    }

    // Special Candy Markings
    _renderSpecial(canvas, rect);
  }

  void _renderSpecial(Canvas canvas, Rect rect) {
    final center = rect.center;
    final w = rect.width;
    final h = rect.height;

    if (candy.special == SpecialType.stripedH) {
      final paint = Paint()..color = Colors.white.withOpacity(0.7);
      canvas.drawRect(Rect.fromCenter(center: center, width: w, height: h * 0.2), paint);
    } else if (candy.special == SpecialType.stripedV) {
      final paint = Paint()..color = Colors.white.withOpacity(0.7);
      canvas.drawRect(Rect.fromCenter(center: center, width: w * 0.2, height: h), paint);
    } else if (candy.special == SpecialType.wrapped) {
      final paint = Paint()
        ..color = Colors.white.withOpacity(0.5)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2;
      canvas.drawRect(rect.deflate(w * 0.2), paint);
    } else if (candy.special == SpecialType.colorBomb) {
      // Draw sprinkles
      final rand = _pseudoRandom(candy.hashCode);
      final paint = Paint()..style = PaintingStyle.fill;
      for (int i = 0; i < 8; i++) {
        paint.color = [Colors.red, Colors.blue, Colors.yellow, Colors.green][i % 4];
        final dx = (rand.nextDouble() - 0.5) * w * 0.6;
        final dy = (rand.nextDouble() - 0.5) * h * 0.6;
        canvas.drawCircle(center + Offset(dx, dy), w * 0.08, paint);
      }
    }
  }

  // Deterministic random for sprinkles so they don't jitter
  math.Random _pseudoRandom(int seed) {
    return math.Random(seed);
  }

  Color _mapColor(CandyColor c) {
    switch (c) {
      case CandyColor.red: return const Color(0xFFFF4D6D);
      case CandyColor.blue: return const Color(0xFF4361EE);
      case CandyColor.green: return const Color(0xFF4CC9F0);
      case CandyColor.yellow: return const Color(0xFFF72585);
      case CandyColor.purple: return const Color(0xFF7209B7);
      case CandyColor.orange: return const Color(0xFFFF9E00);
      default: return Colors.grey;
    }
  }
}
