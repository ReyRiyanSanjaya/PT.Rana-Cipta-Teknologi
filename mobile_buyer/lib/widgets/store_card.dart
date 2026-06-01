import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:rana_market/config/theme_config.dart';

/// A polished store card widget for displaying nearby stores.
class StoreCard extends StatelessWidget {
  final String name;
  final String? category;
  final String? address;
  final String? imageUrl;
  final double? rating;
  final double? distance;
  final bool isOpen;
  final VoidCallback? onTap;

  const StoreCard({
    super.key,
    required this.name,
    this.category,
    this.address,
    this.imageUrl,
    this.rating,
    this.distance,
    this.isOpen = true,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        onTap?.call();
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: ThemeConfig.cardColor(context),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: ThemeConfig.borderColor(context)),
          boxShadow: ThemeConfig.cardShadow(context),
        ),
        child: Row(
          children: [
            // Store Image
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: SizedBox(
                width: 64,
                height: 64,
                child: imageUrl != null && imageUrl!.isNotEmpty
                    ? CachedNetworkImage(
                        imageUrl: imageUrl!,
                        fit: BoxFit.cover,
                        placeholder: (_, __) => _buildPlaceholder(isDark),
                        errorWidget: (_, __, ___) => _buildPlaceholder(isDark),
                      )
                    : _buildPlaceholder(isDark),
              ),
            ),
            const SizedBox(width: 14),

            // Store Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Name & Status
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          name,
                          style: GoogleFonts.poppins(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: isDark ? Colors.white : ThemeConfig.textPrimary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: isOpen
                              ? ThemeConfig.colorSuccess.withOpacity(0.1)
                              : Colors.grey.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          isOpen ? 'Buka' : 'Tutup',
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w700,
                            color: isOpen ? ThemeConfig.colorSuccess : Colors.grey,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),

                  // Category & Address
                  if (category != null || address != null)
                    Text(
                      [category, address].where((e) => e != null && e.isNotEmpty).join(' · '),
                      style: TextStyle(
                        fontSize: 11,
                        color: ThemeConfig.secondaryTextColor(context),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  const SizedBox(height: 8),

                  // Rating & Distance
                  Row(
                    children: [
                      if (rating != null) ...[
                        const Icon(Icons.star_rounded, size: 14, color: ThemeConfig.colorRating),
                        const SizedBox(width: 3),
                        Text(
                          rating!.toStringAsFixed(1),
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: isDark ? Colors.white : ThemeConfig.textPrimary,
                          ),
                        ),
                        const SizedBox(width: 12),
                      ],
                      if (distance != null) ...[
                        Icon(Icons.place_outlined, size: 13, color: ThemeConfig.secondaryTextColor(context)),
                        const SizedBox(width: 2),
                        Text(
                          _formatDistance(distance!),
                          style: TextStyle(
                            fontSize: 11,
                            color: ThemeConfig.secondaryTextColor(context),
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),

            // Arrow
            Icon(
              Icons.chevron_right_rounded,
              color: Colors.grey.shade400,
              size: 20,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPlaceholder(bool isDark) {
    return Container(
      color: isDark ? const Color(0xFF2A2A3E) : Colors.grey.shade100,
      child: Center(
        child: Icon(Icons.store_rounded, color: Colors.grey.shade400, size: 24),
      ),
    );
  }

  String _formatDistance(double km) {
    if (km < 1) return '${(km * 1000).round()} m';
    return '${km.toStringAsFixed(1)} km';
  }
}
