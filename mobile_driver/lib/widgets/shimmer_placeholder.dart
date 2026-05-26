import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

class ShimmerPlaceholder extends StatelessWidget {
  final double width;
  final double height;
  final double borderRadius;
  final EdgeInsets? margin;

  const ShimmerPlaceholder({
    super.key,
    this.width = double.infinity,
    this.height = 16,
    this.borderRadius = 8,
    this.margin,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      margin: margin,
      decoration: BoxDecoration(
        color: Colors.grey.shade200,
        borderRadius: BorderRadius.circular(borderRadius),
      ),
    )
    .animate(onPlay: (controller) => controller.repeat())
    .shimmer(
      duration: 1500.ms,
      color: Colors.white.withValues(alpha: 0.5),
      stops: [0.0, 0.5, 1.0],
    );
  }
}

class ShimmerCard extends StatelessWidget {
  final double width;
  final double height;
  
  const ShimmerCard({super.key, this.width = 160, this.height = 200});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ShimmerPlaceholder(height: height * 0.5, borderRadius: 12),
          const SizedBox(height: 12),
          const ShimmerPlaceholder(height: 16, width: 100),
          const SizedBox(height: 8),
          const ShimmerPlaceholder(height: 14, width: 60),
          const Spacer(),
          const Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              ShimmerPlaceholder(height: 12, width: 40),
              ShimmerPlaceholder(height: 12, width: 30),
            ],
          ),
        ],
      ),
    );
  }
}
