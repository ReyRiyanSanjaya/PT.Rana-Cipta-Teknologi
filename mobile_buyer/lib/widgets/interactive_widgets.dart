import 'dart:ui';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:rana_market/config/theme_config.dart';

// ═══════════════════════════════════════════════════════════════
// PRESS SCALE BUTTON — scales down on press like native iOS
// ═══════════════════════════════════════════════════════════════
class PressScaleButton extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;
  final double scaleAmount;
  final Duration duration;

  const PressScaleButton({
    super.key,
    required this.child,
    this.onTap,
    this.onLongPress,
    this.scaleAmount = 0.93,
    this.duration = const Duration(milliseconds: 120),
  });

  @override
  State<PressScaleButton> createState() => _PressScaleButtonState();
}

class _PressScaleButtonState extends State<PressScaleButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: widget.duration);
    _scale = Tween<double>(begin: 1.0, end: widget.scaleAmount).animate(
      CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) {
        HapticFeedback.selectionClick();
        _ctrl.forward();
      },
      onTapUp: (_) {
        _ctrl.reverse();
        widget.onTap?.call();
      },
      onTapCancel: () => _ctrl.reverse(),
      onLongPress: () {
        HapticFeedback.mediumImpact();
        _ctrl.reverse();
        widget.onLongPress?.call();
      },
      child: AnimatedBuilder(
        animation: _scale,
        builder: (_, child) => Transform.scale(scale: _scale.value, child: child),
        child: widget.child,
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// RIPPLE CARD — Material ink splash on tap
// ═══════════════════════════════════════════════════════════════
class RippleCard extends StatelessWidget {
  final Widget child;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;
  final Color? color;
  final BorderRadius borderRadius;
  final List<BoxShadow>? boxShadow;
  final EdgeInsetsGeometry? padding;
  final Border? border;

  const RippleCard({
    super.key,
    required this.child,
    this.onTap,
    this.onLongPress,
    this.color,
    this.borderRadius = const BorderRadius.all(Radius.circular(20)),
    this.boxShadow,
    this.padding,
    this.border,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: Ink(
        decoration: BoxDecoration(
          color: color ?? Colors.white,
          borderRadius: borderRadius,
          boxShadow: boxShadow,
          border: border,
        ),
        child: InkWell(
          onTap: () {
            HapticFeedback.selectionClick();
            onTap?.call();
          },
          onLongPress: () {
            HapticFeedback.mediumImpact();
            onLongPress?.call();
          },
          borderRadius: borderRadius,
          splashColor: ThemeConfig.brandColor.withOpacity(0.08),
          highlightColor: ThemeConfig.brandColor.withOpacity(0.04),
          child: padding != null ? Padding(padding: padding!, child: child) : child,
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// SHIMMER LOADING — for skeleton screens
// ═══════════════════════════════════════════════════════════════
class ShimmerBox extends StatelessWidget {
  final double width;
  final double height;
  final double radius;

  const ShimmerBox({
    super.key,
    required this.width,
    required this.height,
    this.radius = 12,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: Colors.grey.shade200,
        borderRadius: BorderRadius.circular(radius),
      ),
    ).animate(onPlay: (c) => c.repeat()).shimmer(
          duration: 1.5.seconds,
          color: Colors.white.withOpacity(0.7),
        );
  }
}

// ═══════════════════════════════════════════════════════════════
// BOUNCY FAB — floating action button with bounce animation
// ═══════════════════════════════════════════════════════════════
class BouncyFab extends StatefulWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final List<Color> gradient;

  const BouncyFab({
    super.key,
    required this.icon,
    required this.label,
    required this.onTap,
    this.gradient = const [ThemeConfig.brandColor, Color(0xFFFFA07A)],
  });

  @override
  State<BouncyFab> createState() => _BouncyFabState();
}

class _BouncyFabState extends State<BouncyFab> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _bounce;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 200));
    _bounce = TweenSequence([
      TweenSequenceItem(tween: Tween(begin: 1.0, end: 0.88), weight: 40),
      TweenSequenceItem(tween: Tween(begin: 0.88, end: 1.12), weight: 30),
      TweenSequenceItem(tween: Tween(begin: 1.12, end: 1.0), weight: 30),
    ]).animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut));
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        HapticFeedback.heavyImpact();
        _ctrl.forward(from: 0);
        widget.onTap();
      },
      child: AnimatedBuilder(
        animation: _bounce,
        builder: (_, child) => Transform.scale(scale: _bounce.value, child: child),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          decoration: BoxDecoration(
            gradient: LinearGradient(colors: widget.gradient),
            borderRadius: BorderRadius.circular(30),
            boxShadow: [
              BoxShadow(
                color: widget.gradient.first.withOpacity(0.4),
                blurRadius: 16,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(widget.icon, color: Colors.white, size: 20),
              const SizedBox(width: 8),
              Text(
                widget.label,
                style: GoogleFonts.poppins(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                  fontSize: 13,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// TOAST NOTIFICATION — premium snackbar-like widget
// ═══════════════════════════════════════════════════════════════
class PremiumToast {
  static void show(
    BuildContext context, {
    required String message,
    IconData icon = Icons.check_circle_rounded,
    List<Color> gradient = const [Color(0xFF43E97B), Color(0xFF38F9D7)],
    Duration duration = const Duration(seconds: 3),
  }) {
    HapticFeedback.lightImpact();
    final overlay = Overlay.of(context);
    late OverlayEntry entry;

    entry = OverlayEntry(
      builder: (_) => _ToastWidget(
        message: message,
        icon: icon,
        gradient: gradient,
        onDismiss: () => entry.remove(),
        duration: duration,
      ),
    );

    overlay.insert(entry);
  }
}

class _ToastWidget extends StatefulWidget {
  final String message;
  final IconData icon;
  final List<Color> gradient;
  final VoidCallback onDismiss;
  final Duration duration;

  const _ToastWidget({
    required this.message,
    required this.icon,
    required this.gradient,
    required this.onDismiss,
    required this.duration,
  });

  @override
  State<_ToastWidget> createState() => _ToastWidgetState();
}

class _ToastWidgetState extends State<_ToastWidget> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _opacity;
  late Animation<Offset> _slide;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 400));
    _opacity = CurvedAnimation(parent: _ctrl, curve: Curves.easeOut);
    _slide = Tween<Offset>(begin: const Offset(0, -0.5), end: Offset.zero)
        .animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeOutBack));
    _ctrl.forward();

    Future.delayed(widget.duration, () {
      if (mounted) {
        _ctrl.reverse().then((_) => widget.onDismiss());
      }
    });
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.of(context).padding.top + 16;
    return Positioned(
      top: top,
      left: 16,
      right: 16,
      child: SlideTransition(
        position: _slide,
        child: FadeTransition(
          opacity: _opacity,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              gradient: LinearGradient(colors: widget.gradient),
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: widget.gradient.first.withOpacity(0.4),
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.25),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(widget.icon, color: Colors.white, size: 18),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    widget.message,
                    style: GoogleFonts.poppins(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                    ),
                  ),
                ),
                GestureDetector(
                  onTap: () => _ctrl.reverse().then((_) => widget.onDismiss()),
                  child: const Icon(Icons.close_rounded, color: Colors.white70, size: 18),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// STAR RATING — animated interactive star rating
// ═══════════════════════════════════════════════════════════════
class StarRatingWidget extends StatefulWidget {
  final double initialRating;
  final int starCount;
  final double size;
  final ValueChanged<double>? onRatingChanged;
  final bool readOnly;

  const StarRatingWidget({
    super.key,
    this.initialRating = 0,
    this.starCount = 5,
    this.size = 28,
    this.onRatingChanged,
    this.readOnly = false,
  });

  @override
  State<StarRatingWidget> createState() => _StarRatingWidgetState();
}

class _StarRatingWidgetState extends State<StarRatingWidget> {
  late double _rating;

  @override
  void initState() {
    super.initState();
    _rating = widget.initialRating;
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(widget.starCount, (i) {
        final value = i + 1.0;
        final filled = _rating >= value;
        final half = !filled && _rating >= value - 0.5;

        return GestureDetector(
          onTap: widget.readOnly
              ? null
              : () {
                  HapticFeedback.selectionClick();
                  setState(() => _rating = value);
                  widget.onRatingChanged?.call(value);
                },
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            padding: const EdgeInsets.symmetric(horizontal: 2),
            child: Icon(
              filled
                  ? Icons.star_rounded
                  : half
                      ? Icons.star_half_rounded
                      : Icons.star_outline_rounded,
              color: (filled || half) ? const Color(0xFFFFB800) : Colors.grey.shade300,
              size: widget.size,
            ),
          ).animate(target: filled ? 1 : 0).scale(
                begin: const Offset(0.8, 0.8),
                end: const Offset(1.0, 1.0),
                duration: 200.ms,
                curve: Curves.easeOutBack,
              ),
        );
      }),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// SWIPEABLE IMAGE GALLERY — horizontal swipe with dot indicator
// ═══════════════════════════════════════════════════════════════
class SwipeableImageGallery extends StatefulWidget {
  final List<String> imageUrls;
  final double height;
  final BorderRadius? borderRadius;

  const SwipeableImageGallery({
    super.key,
    required this.imageUrls,
    this.height = 220,
    this.borderRadius,
  });

  @override
  State<SwipeableImageGallery> createState() => _SwipeableImageGalleryState();
}

class _SwipeableImageGalleryState extends State<SwipeableImageGallery> {
  final _ctrl = PageController();
  int _current = 0;

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        ClipRRect(
          borderRadius: widget.borderRadius ?? BorderRadius.circular(0),
          child: SizedBox(
            height: widget.height,
            child: PageView.builder(
              controller: _ctrl,
              onPageChanged: (i) {
                HapticFeedback.selectionClick();
                setState(() => _current = i);
              },
              itemCount: widget.imageUrls.length,
              itemBuilder: (_, i) => Image.network(
                widget.imageUrls[i],
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(
                  color: Colors.grey.shade100,
                  child: const Icon(Icons.image_outlined, size: 48, color: Colors.grey),
                ),
              ),
            ),
          ),
        ),
        if (widget.imageUrls.length > 1)
          Positioned(
            bottom: 12,
            left: 0,
            right: 0,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(
                widget.imageUrls.length,
                (i) => AnimatedContainer(
                  duration: const Duration(milliseconds: 300),
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  width: _current == i ? 20 : 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: _current == i ? Colors.white : Colors.white54,
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// CONFETTI CELEBRATION — particles burst after success
// ═══════════════════════════════════════════════════════════════
class ConfettiOverlay extends StatefulWidget {
  final Widget child;
  final bool trigger;

  const ConfettiOverlay({super.key, required this.child, required this.trigger});

  @override
  State<ConfettiOverlay> createState() => _ConfettiOverlayState();
}

class _ConfettiOverlayState extends State<ConfettiOverlay> with TickerProviderStateMixin {
  final List<_ConfettiParticle> _particles = [];
  AnimationController? _ctrl;
  final _rng = math.Random();

  @override
  void didUpdateWidget(ConfettiOverlay oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.trigger && !oldWidget.trigger) _burst();
  }

  void _burst() {
    _particles.clear();
    final colors = [
      const Color(0xFFFF6B6B), const Color(0xFFFFE66D), const Color(0xFF4ECDC4),
      const Color(0xFF45B7D1), const Color(0xFF96CEB4), const Color(0xFFFF8B94),
    ];
    for (int i = 0; i < 50; i++) {
      _particles.add(_ConfettiParticle(
        x: 0.5 + (_rng.nextDouble() - 0.5) * 0.6,
        color: colors[_rng.nextInt(colors.length)],
        angle: _rng.nextDouble() * math.pi * 2,
        speed: 0.3 + _rng.nextDouble() * 0.7,
        size: 6 + _rng.nextDouble() * 8,
      ));
    }
    _ctrl?.dispose();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 1800));
    _ctrl!.addListener(() => setState(() {}));
    _ctrl!.forward();
    HapticFeedback.heavyImpact();
  }

  @override
  void dispose() {
    _ctrl?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        widget.child,
        if (_ctrl != null && _ctrl!.isAnimating)
          Positioned.fill(
            child: IgnorePointer(
              child: CustomPaint(painter: _ConfettiPainter(_particles, _ctrl!.value)),
            ),
          ),
      ],
    );
  }
}

class _ConfettiParticle {
  final double x;
  final Color color;
  final double angle;
  final double speed;
  final double size;

  const _ConfettiParticle({
    required this.x,
    required this.color,
    required this.angle,
    required this.speed,
    required this.size,
  });
}

class _ConfettiPainter extends CustomPainter {
  final List<_ConfettiParticle> particles;
  final double progress;

  _ConfettiPainter(this.particles, this.progress);

  @override
  void paint(Canvas canvas, Size size) {
    for (final p in particles) {
      final opacity = (1 - progress).clamp(0.0, 1.0);
      final paint = Paint()..color = p.color.withOpacity(opacity);
      final x = size.width * p.x + math.cos(p.angle) * size.width * 0.4 * progress * p.speed;
      final y = (size.height * 0.3) + math.sin(p.angle) * size.height * 0.5 * progress * p.speed + (size.height * 0.5 * progress * progress * 0.8);
      canvas.save();
      canvas.translate(x, y);
      canvas.rotate(progress * math.pi * 4 * p.speed);
      canvas.drawRRect(
        RRect.fromRectAndRadius(Rect.fromCenter(center: Offset.zero, width: p.size, height: p.size * 0.5), const Radius.circular(2)),
        paint,
      );
      canvas.restore();
    }
  }

  @override
  bool shouldRepaint(_ConfettiPainter old) => old.progress != progress;
}

// ═══════════════════════════════════════════════════════════════
// COUNTER BADGE — animated number badge on icons
// ═══════════════════════════════════════════════════════════════
class CounterBadge extends StatelessWidget {
  final int count;
  final Widget child;
  final Color? color;

  const CounterBadge({
    super.key,
    required this.count,
    required this.child,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        child,
        if (count > 0)
          Positioned(
            top: -6,
            right: -6,
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 300),
              transitionBuilder: (child, anim) => ScaleTransition(scale: anim, child: child),
              child: Container(
                key: ValueKey(count),
                padding: const EdgeInsets.all(4),
                constraints: const BoxConstraints(minWidth: 20, minHeight: 20),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [color ?? const Color(0xFFE63946), (color ?? const Color(0xFFFA709A))],
                  ),
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(color: (color ?? Colors.red).withOpacity(0.4), blurRadius: 6),
                  ],
                ),
                child: Text(
                  count > 99 ? '99+' : '$count',
                  style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w900),
                  textAlign: TextAlign.center,
                ),
              ),
            ),
          ),
      ],
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// PROGRESS STEPPER — animated step progress (e.g. order status)
// ═══════════════════════════════════════════════════════════════
class AnimatedProgressStepper extends StatelessWidget {
  final List<String> steps;
  final int currentStep;
  final List<Color>? colors;

  const AnimatedProgressStepper({
    super.key,
    required this.steps,
    required this.currentStep,
    this.colors,
  });

  @override
  Widget build(BuildContext context) {
    final activeColors = colors ?? [ThemeConfig.brandColor, const Color(0xFFFFA07A)];

    return Row(
      children: steps.asMap().entries.map((e) {
        final i = e.key;
        final step = e.value;
        final isActive = i <= currentStep;
        final isCurrent = i == currentStep;

        return Expanded(
          child: Row(
            children: [
              Column(
                children: [
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 400),
                    curve: Curves.easeInOut,
                    width: isCurrent ? 32 : 24,
                    height: isCurrent ? 32 : 24,
                    decoration: BoxDecoration(
                      gradient: isActive
                          ? LinearGradient(colors: activeColors)
                          : null,
                      color: isActive ? null : Colors.grey.shade200,
                      shape: BoxShape.circle,
                      boxShadow: isActive && isCurrent ? [
                        BoxShadow(color: activeColors.first.withOpacity(0.4), blurRadius: 10),
                      ] : null,
                    ),
                    child: Icon(
                      isActive ? Icons.check_rounded : Icons.circle_outlined,
                      color: isActive ? Colors.white : Colors.grey.shade400,
                      size: isCurrent ? 18 : 14,
                    ),
                  ).animate(target: isActive ? 1 : 0).scale(
                        begin: const Offset(0.8, 0.8),
                        end: const Offset(1.0, 1.0),
                        duration: 400.ms,
                        curve: Curves.easeOutBack,
                      ),
                  const SizedBox(height: 4),
                  Text(
                    step,
                    style: GoogleFonts.poppins(
                      fontSize: 9,
                      fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
                      color: isActive ? activeColors.first : Colors.grey.shade400,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
              if (i < steps.length - 1)
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(bottom: 18),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 600),
                      height: 3,
                      decoration: BoxDecoration(
                        gradient: (i < currentStep)
                            ? LinearGradient(colors: activeColors)
                            : null,
                        color: (i < currentStep) ? null : Colors.grey.shade200,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        );
      }).toList(),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// GRADIENT TEXT — text with gradient fill
// ═══════════════════════════════════════════════════════════════
class GradientText extends StatelessWidget {
  final String text;
  final TextStyle style;
  final List<Color> colors;

  const GradientText(
    this.text, {
    super.key,
    required this.style,
    this.colors = const [ThemeConfig.brandColor, Color(0xFFFFA07A)],
  });

  @override
  Widget build(BuildContext context) {
    return ShaderMask(
      blendMode: BlendMode.srcIn,
      shaderCallback: (bounds) => LinearGradient(colors: colors).createShader(
        Rect.fromLTWH(0, 0, bounds.width, bounds.height),
      ),
      child: Text(text, style: style),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// SLIDE UP PANEL — premium bottom panel that slides up
// ═══════════════════════════════════════════════════════════════
class SlideUpPanel {
  static Future<T?> show<T>(
    BuildContext context, {
    required Widget Function(BuildContext, ScrollController) builder,
    double initialChildSize = 0.5,
    double maxChildSize = 0.9,
    bool snap = true,
  }) {
    return showModalBottomSheet<T>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: initialChildSize,
        maxChildSize: maxChildSize,
        minChildSize: 0.3,
        snap: snap,
        snapSizes: [initialChildSize, maxChildSize],
        builder: (ctx2, scrollCtrl) => Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
            boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 30, offset: Offset(0, -4))],
          ),
          child: Column(
            children: [
              const SizedBox(height: 12),
              Container(
                width: 40, height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade200,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Expanded(child: builder(ctx2, scrollCtrl)),
            ],
          ),
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// ANIMATED COUNTER — numbers count up from 0 to value
// ═══════════════════════════════════════════════════════════════
class AnimatedCounter extends StatefulWidget {
  final double value;
  final TextStyle style;
  final String prefix;
  final String suffix;
  final Duration duration;

  const AnimatedCounter({
    super.key,
    required this.value,
    required this.style,
    this.prefix = '',
    this.suffix = '',
    this.duration = const Duration(milliseconds: 1200),
  });

  @override
  State<AnimatedCounter> createState() => _AnimatedCounterState();
}

class _AnimatedCounterState extends State<AnimatedCounter>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _anim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: widget.duration);
    _anim = Tween<double>(begin: 0, end: widget.value).animate(
      CurvedAnimation(parent: _ctrl, curve: Curves.easeOut),
    );
    _ctrl.forward();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _anim,
      builder: (_, __) => Text(
        '${widget.prefix}${_anim.value.toInt()}${widget.suffix}',
        style: widget.style,
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// NEON GLOW BUTTON — glowing button for premium CTAs
// ═══════════════════════════════════════════════════════════════
class NeonGlowButton extends StatefulWidget {
  final String label;
  final IconData? icon;
  final VoidCallback onTap;
  final List<Color> colors;
  final double borderRadius;

  const NeonGlowButton({
    super.key,
    required this.label,
    required this.onTap,
    this.icon,
    this.colors = const [ThemeConfig.brandColor, Color(0xFFFFA07A)],
    this.borderRadius = 18,
  });

  @override
  State<NeonGlowButton> createState() => _NeonGlowButtonState();
}

class _NeonGlowButtonState extends State<NeonGlowButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _glowCtrl;
  late Animation<double> _glowAnim;

  @override
  void initState() {
    super.initState();
    _glowCtrl = AnimationController(vsync: this, duration: const Duration(seconds: 2))
      ..repeat(reverse: true);
    _glowAnim = Tween<double>(begin: 0.4, end: 0.8).animate(
      CurvedAnimation(parent: _glowCtrl, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _glowCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return PressScaleButton(
      onTap: widget.onTap,
      child: AnimatedBuilder(
        animation: _glowAnim,
        builder: (_, child) => Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(colors: widget.colors),
            borderRadius: BorderRadius.circular(widget.borderRadius),
            boxShadow: [
              BoxShadow(
                color: widget.colors.first.withOpacity(_glowAnim.value),
                blurRadius: 24,
                spreadRadius: 2,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: child,
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              if (widget.icon != null) ...[
                Icon(widget.icon, color: Colors.white, size: 20),
                const SizedBox(width: 8),
              ],
              Text(
                widget.label,
                style: GoogleFonts.poppins(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
