import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';

class QuestProgressWidget extends StatelessWidget {
  final int currentTrips;
  final int targetTrips;
  final String questTitle;
  final String reward;

  const QuestProgressWidget({
    Key? key,
    required this.currentTrips,
    required this.targetTrips,
    required this.questTitle,
    required this.reward,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    double progress = (currentTrips / targetTrips).clamp(0.0, 1.0);
    bool isCompleted = progress >= 1.0;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isCompleted ? Colors.green.shade50 : Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: isCompleted ? Colors.green.withOpacity(0.3) : Colors.grey.withOpacity(0.2),
          width: 1.5,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                questTitle,
                style: GoogleFonts.outfit(
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                  color: Colors.grey.shade800,
                ),
              ),
              if (isCompleted)
                const Icon(Icons.check_circle_rounded, color: Colors.green, size: 20)
                  .animate()
                  .scale(duration: 400.ms, curve: Curves.elasticOut),
            ],
          ),
          const SizedBox(height: 12),
          Stack(
            children: [
              Container(
                height: 12,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: Colors.grey.shade200,
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              FractionallySizedBox(
                widthFactor: progress,
                child: Container(
                  height: 12,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: isCompleted
                          ? [Colors.green, Colors.greenAccent]
                          : [Colors.orange, Colors.amber],
                    ),
                    borderRadius: BorderRadius.circular(10),
                  ),
                ).animate(target: progress).shimmer(duration: 2.seconds, color: Colors.white30),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '$currentTrips / $targetTrips Trip',
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  color: isCompleted ? Colors.green : Colors.grey.shade600,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: isCompleted ? Colors.green : Colors.orange.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  reward,
                  style: TextStyle(
                    color: isCompleted ? Colors.white : Colors.orange.shade800,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
