import 'package:rana_merchant/config/merchant_config.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:rana_merchant/config/api_config.dart'; // [NEW] Config
import 'package:rana_merchant/config/theme_config.dart'; // [NEW] Config
import 'package:rana_merchant/widgets/tap_scale.dart';

class ProductCard extends StatelessWidget {
  final Map<String, dynamic> product;
  final int quantity;
  final VoidCallback onTap;

  const ProductCard({
    super.key,
    required this.product,
    required this.quantity,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final currency =
        NumberFormat.currency(locale: 'id_ID', symbol: '${MerchantConfig.defaultCurrencySymbol} ', decimalDigits: 0);
    final rawImageUrl = product['imageUrl']?.toString();
    final hasImage = rawImageUrl != null && rawImageUrl.isNotEmpty;
    final imageUrl = !hasImage
        ? null
        : (rawImageUrl.startsWith('http')
            ? rawImageUrl
            : '${ApiConfig.serverUrl}$rawImageUrl');
    final productName = (product['name'] ?? '').toString();
    final initial = productName.isNotEmpty
        ? productName.substring(0, 1).toUpperCase()
        : '?';
    final screenWidth = MediaQuery.of(context).size.width;
    final isSmallScreen = screenWidth <= 360;
    final scale = ThemeConfig.fontScale(context);

    return TapScale(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(isSmallScreen ? 14 : 20),
          border: Border.all(
            color: quantity > 0
                ? Theme.of(context).colorScheme.primary
                : Theme.of(context).colorScheme.primary.withOpacity(0.25),
            width: quantity > 0 ? 2 : 1.2,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              flex: 5,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Container(
                    decoration: BoxDecoration(
                      color: Theme.of(context)
                          .colorScheme
                          .surface
                          .withOpacity(0.7),
                      borderRadius: BorderRadius.vertical(
                          top: Radius.circular(isSmallScreen ? 12 : 18)),
                    ),
                    child: hasImage
                        ? ClipRRect(
                            borderRadius: BorderRadius.vertical(
                                top: Radius.circular(isSmallScreen ? 12 : 18)),
                            child: Image.network(imageUrl!,
                                fit: BoxFit.cover,
                                cacheWidth: 200,
                                errorBuilder: (_, __, ___) => Center(
                                    child: Text(initial,
                                        style: GoogleFonts.poppins(
                                    fontSize: 28 * scale,
                                            fontWeight: FontWeight.bold,
                                            color: Theme.of(context)
                                                .colorScheme
                                                .onSurface
                                                .withOpacity(0.3))))),
                          )
                        : Center(
                            child: Text(initial,
                                style: GoogleFonts.poppins(
                                    fontSize: 28 * scale,
                                    fontWeight: FontWeight.bold,
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onSurface
                                        .withOpacity(0.3)))),
                  ),
                  if (quantity > 0)
                    Positioned(
                      right: 6,
                      top: 6,
                      child: Container(
                        padding: EdgeInsets.symmetric(
                            horizontal: isSmallScreen ? 5 : 8, vertical: isSmallScreen ? 2 : 4),
                        decoration: BoxDecoration(
                          color: ThemeConfig.brandColor,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          "${quantity}x",
                          style: GoogleFonts.poppins(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 11 * scale),
                        ),
                      ).animate().scale(duration: 200.ms),
                    ),
                ],
              ),
            ),
            Expanded(
              flex: 4,
              child: Padding(
                padding: EdgeInsets.all(isSmallScreen ? 6 : 10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.start,
                  children: [
                    Text(
                      productName,
                      maxLines: isSmallScreen ? 1 : 2,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.poppins(
                          fontWeight: FontWeight.w600,
                          fontSize: 12 * scale,
                          height: 1.2,
                          color: Theme.of(context).colorScheme.onSurface),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      currency.format(product['sellingPrice'] ?? 0),
                      style: GoogleFonts.poppins(
                          color: Theme.of(context).colorScheme.primary,
                          fontWeight: FontWeight.bold,
                          fontSize: 12 * scale),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Stok: ${product['stock'] ?? 0}',
                      style: GoogleFonts.poppins(
                        fontSize: 9 * scale,
                        color: Theme.of(context).colorScheme.onSurface.withOpacity(0.7),
                      ),
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
