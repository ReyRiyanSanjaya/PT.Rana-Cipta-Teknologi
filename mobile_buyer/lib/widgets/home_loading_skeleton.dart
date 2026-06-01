import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:rana_market/config/theme_config.dart';

/// A beautiful loading skeleton for the home screen.
/// Shows shimmer placeholders that match the actual content layout.
class HomeLoadingSkeleton extends StatelessWidget {
  const HomeLoadingSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final shimmerBase = isDark ? const Color(0xFF1A1A2E) : Colors.grey.shade200;
    final shimmerHighlight = isDark ? const Color(0xFF2A2A3E) : Colors.grey.shade100;

    return SingleChildScrollView(
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 60),

          // Search bar skeleton
          _ShimmerBox(height: 48, borderRadius: 24, baseColor: shimmerBase, highlightColor: shimmerHighlight),
          const SizedBox(height: 24),

          // Stories row
          SizedBox(
            height: 90,
            child: Row(
              children: List.generate(5, (i) => Padding(
                padding: const EdgeInsets.only(right: 16),
                child: Column(
                  children: [
                    _ShimmerBox(width: 60, height: 60, borderRadius: 30, baseColor: shimmerBase, highlightColor: shimmerHighlight),
                    const SizedBox(height: 8),
                    _ShimmerBox(width: 40, height: 10, borderRadius: 4, baseColor: shimmerBase, highlightColor: shimmerHighlight),
                  ],
                ),
              )),
            ),
          ),
          const SizedBox(height: 20),

          // Wallet card skeleton
          _ShimmerBox(height: 100, borderRadius: 20, baseColor: shimmerBase, highlightColor: shimmerHighlight),
          const SizedBox(height: 20),

          // Super app grid skeleton
          GridView.count(
            crossAxisCount: 4,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            children: List.generate(8, (i) => Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _ShimmerBox(width: 44, height: 44, borderRadius: 12, baseColor: shimmerBase, highlightColor: shimmerHighlight),
                const SizedBox(height: 6),
                _ShimmerBox(width: 36, height: 8, borderRadius: 4, baseColor: shimmerBase, highlightColor: shimmerHighlight),
              ],
            )),
          ),
          const SizedBox(height: 24),

          // Section title
          _ShimmerBox(width: 120, height: 16, borderRadius: 4, baseColor: shimmerBase, highlightColor: shimmerHighlight),
          const SizedBox(height: 12),

          // Product cards row
          SizedBox(
            height: 220,
            child: Row(
              children: List.generate(3, (i) => Padding(
                padding: const EdgeInsets.only(right: 12),
                child: _ShimmerBox(width: 150, height: 220, borderRadius: 16, baseColor: shimmerBase, highlightColor: shimmerHighlight),
              )),
            ),
          ),
          const SizedBox(height: 24),

          // Section title
          _ShimmerBox(width: 140, height: 16, borderRadius: 4, baseColor: shimmerBase, highlightColor: shimmerHighlight),
          const SizedBox(height: 12),

          // Store cards
          ...List.generate(3, (i) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _ShimmerBox(height: 80, borderRadius: 16, baseColor: shimmerBase, highlightColor: shimmerHighlight),
          )),
        ],
      ),
    );
  }
}

class _ShimmerBox extends StatelessWidget {
  final double? width;
  final double height;
  final double borderRadius;
  final Color baseColor;
  final Color highlightColor;

  const _ShimmerBox({
    this.width,
    required this.height,
    this.borderRadius = 8,
    required this.baseColor,
    required this.highlightColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: baseColor,
        borderRadius: BorderRadius.circular(borderRadius),
      ),
    ).animate(onPlay: (c) => c.repeat()).shimmer(
      duration: 1200.ms,
      color: highlightColor.withOpacity(0.5),
    );
  }
}
