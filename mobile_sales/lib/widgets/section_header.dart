import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:rana_sales/config/app_theme.dart';

/// A reusable section header with optional action button.
class SectionHeader extends StatelessWidget {
  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;
  final IconData? icon;
  final Color? iconColor;

  const SectionHeader({
    super.key,
    required this.title,
    this.actionLabel,
    this.onAction,
    this.icon,
    this.iconColor,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        if (icon != null) ...[
          Icon(icon, size: 18, color: iconColor ?? AppTheme.primaryTeal),
          const SizedBox(width: 8),
        ],
        Text(
          title,
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 15),
        ),
        const Spacer(),
        if (actionLabel != null)
          GestureDetector(
            onTap: onAction,
            child: Text(
              actionLabel!,
              style: const TextStyle(
                fontSize: 12,
                color: AppTheme.primaryTeal,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
      ],
    );
  }
}
