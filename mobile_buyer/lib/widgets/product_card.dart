import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:rana_market/config/theme_config.dart';

/// A polished product card widget with consistent styling.
/// Supports discount badges, ratings, and add-to-cart action.
class ProductCard extends StatelessWidget {
  final String name;
  final double price;
  final double? originalPrice;
  final String? imageUrl;
  final double? rating;
  final int? soldCount;
  final String? storeName;
  final VoidCallback? onTap;
  final VoidCallback? onAddToCart;
  final double width;

  const ProductCard({
    super.key,
    required this.name,
    required this.price,
    this.originalPrice,
    this.imageUrl,
    this.rating,
    this.soldCount,
    this.storeName,
    this.onTap,
    this.onAddToCart,
    this.width = 160,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final hasDiscount = originalPrice != null && originalPrice! > price;
    final discountPercent = hasDiscount
        ? ((originalPrice! - price) / originalPrice! * 100).round()
        : 0;

    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        onTap?.call();
      },
      child: Container(
        width: width,
        decoration: BoxDecoration(
          color: ThemeConfig.cardColor(context),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: ThemeConfig.borderColor(context)),
          boxShadow: ThemeConfig.cardShadow(context),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image Section
            Stack(
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                  child: AspectRatio(
                    aspectRatio: 1.1,
                    child: imageUrl != null && imageUrl!.isNotEmpty
                        ? CachedNetworkImage(
                            imageUrl: imageUrl!,
                            fit: BoxFit.cover,
                            placeholder: (_, __) => Container(
                              color: isDark ? const Color(0xFF2A2A3E) : Colors.grey.shade100,
                              child: Center(
                                child: Icon(Icons.image_outlined, color: Colors.grey.shade400, size: 28),
                              ),
                            ),
                            errorWidget: (_, __, ___) => Container(
                              color: isDark ? const Color(0xFF2A2A3E) : Colors.grey.shade100,
                              child: Center(
                                child: Icon(Icons.broken_image_outlined, color: Colors.grey.shade400, size: 28),
                              ),
                            ),
                          )
                        : Container(
                            color: isDark ? const Color(0xFF2A2A3E) : Colors.grey.shade100,
                            child: Center(
                              child: Icon(Icons.shopping_bag_outlined, color: Colors.grey.shade400, size: 28),
                            ),
                          ),
                  ),
                ),
                // Discount Badge
                if (hasDiscount)
                  Positioned(
                    top: 8,
                    left: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                      decoration: BoxDecoration(
                        color: ThemeConfig.colorError,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        '-$discountPercent%',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
              ],
            ),

            // Content Section
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Product Name
                    Text(
                      name,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.poppins(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: isDark ? Colors.white : ThemeConfig.textPrimary,
                        height: 1.3,
                      ),
                    ),
                    const Spacer(),

                    // Price
                    Text(
                      'Rp ${ThemeConfig.formatCurrency(price)}',
                      style: GoogleFonts.poppins(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: ThemeConfig.brandColor,
                      ),
                    ),
                    if (hasDiscount)
                      Text(
                        'Rp ${ThemeConfig.formatCurrency(originalPrice!)}',
                        style: TextStyle(
                          fontSize: 10,
                          color: Colors.grey.shade500,
                          decoration: TextDecoration.lineThrough,
                          decorationColor: Colors.grey.shade500,
                        ),
                      ),

                    const SizedBox(height: 6),

                    // Rating & Sold
                    Row(
                      children: [
                        if (rating != null) ...[
                          const Icon(Icons.star_rounded, size: 12, color: ThemeConfig.colorRating),
                          const SizedBox(width: 2),
                          Text(
                            rating!.toStringAsFixed(1),
                            style: TextStyle(fontSize: 10, color: Colors.grey.shade600, fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(width: 4),
                        ],
                        if (soldCount != null)
                          Text(
                            '${soldCount}x terjual',
                            style: TextStyle(fontSize: 10, color: Colors.grey.shade500),
                          ),
                        const Spacer(),
                        if (onAddToCart != null)
                          GestureDetector(
                            onTap: () {
                              HapticFeedback.mediumImpact();
                              onAddToCart?.call();
                            },
                            child: Container(
                              width: 26,
                              height: 26,
                              decoration: BoxDecoration(
                                color: ThemeConfig.brandColor,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Icon(Icons.add_rounded, color: Colors.white, size: 16),
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
