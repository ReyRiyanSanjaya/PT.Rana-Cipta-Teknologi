import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class ThemeConfig {
  // Brand Colors
  static const Color brandColor = Color(0xFFE07A5F); // Soft Terra Cotta
  static const Color beigeBackground = Color(0xFFFFF8F0);
  static const Color colorInfo = Color(0xFF2196F3); // Soft Beige
  static const Color colorRating = Color(0xFFF2CC8F); // Star Color

  // Text Colors
  static const Color textPrimary = Color(0xFF1E293B); // Slate 800
  static const Color textSecondary = Color(0xFF334155); // Slate 700
  static const Color textOnPrimary = Colors.white;

  // Status Colors
  static const Color colorSuccess = Color(0xFF81B29A); // Sage Green
  static const Color colorError = Color(0xFFE63946); // Red
  static const Color colorWarning = Color(0xFFF4A261); // Orange

  // Shadow Colors
  static final Color shadowColor =
      const Color(0xFF64748B).withOpacity(0.1);
  static final Color shadowColorBrand = brandColor.withOpacity(0.2);

  // Dimensions
  static const double radiusSmall = 8.0;
  static const double radiusMedium = 12.0;
  static const double radiusLarge = 16.0; // Market app seems to use 16
  static const double radiusXLarge = 24.0;

  static const double paddingSmall = 8.0;
  static const double paddingMedium = 16.0;
  static const double paddingLarge = 24.0;

  // Fonts
  static const String fontFamily = 'Poppins';

  static TextTheme get textTheme => GoogleFonts.poppinsTextTheme().apply(
        bodyColor: textSecondary,
        displayColor: textPrimary,
      );

  static String formatCurrency(double amount) {
    return amount.toStringAsFixed(0).replaceAll(RegExp(r'\B(?=(\d{3})+(?!\d))'), '.');
  }

  /// Returns adaptive card color based on theme brightness
  static Color cardColor(BuildContext context) {
    return Theme.of(context).brightness == Brightness.dark
        ? const Color(0xFF1A1A2E)
        : Colors.white;
  }

  /// Returns adaptive subtle border color
  static Color borderColor(BuildContext context) {
    return Theme.of(context).brightness == Brightness.dark
        ? const Color(0xFF2A2A3E)
        : Colors.grey.shade200;
  }

  /// Returns adaptive text color for secondary text
  static Color secondaryTextColor(BuildContext context) {
    return Theme.of(context).brightness == Brightness.dark
        ? const Color(0xFF94A3B8)
        : const Color(0xFF64748B);
  }

  /// Returns adaptive shadow for cards
  static List<BoxShadow> cardShadow(BuildContext context) {
    if (Theme.of(context).brightness == Brightness.dark) {
      return [
        BoxShadow(
          color: Colors.black.withOpacity(0.3),
          blurRadius: 12,
          offset: const Offset(0, 4),
        ),
      ];
    }
    return [
      BoxShadow(
        color: Colors.black.withOpacity(0.04),
        blurRadius: 16,
        offset: const Offset(0, 6),
      ),
    ];
  }

  static bool isTablet(BuildContext context) {
    final size = MediaQuery.of(context).size;
    return size.shortestSide >= 600;
  }

  static int gridColumns(BuildContext context, {int mobile = 2}) {
    final w = MediaQuery.of(context).size.width;
    if (!isTablet(context)) return mobile;
    if (w >= 1200) return 5;
    if (w >= 1000) return 4;
    if (w >= 800) return 3;
    return 2;
  }

  static double tabletScale(BuildContext context, {double mobile = 1.0}) {
    return isTablet(context) ? 1.08 : mobile;
  }

  // Theme Data
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: brandColor,
        primary: brandColor,
        onPrimary: textOnPrimary,
        secondary: brandColor,
        surface: Colors.white,
        surfaceContainerHighest: beigeBackground,
      ),
      scaffoldBackgroundColor: beigeBackground,
      textTheme: textTheme,
      appBarTheme: const AppBarTheme(
        backgroundColor: beigeBackground,
        elevation: 0,
        centerTitle: false,
        foregroundColor: brandColor,
        iconTheme: IconThemeData(color: brandColor),
        titleTextStyle: TextStyle(
          color: brandColor,
          fontSize: 20,
          fontWeight: FontWeight.bold,
          fontFamily: fontFamily,
        ),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusLarge),
          side: BorderSide(
            color: brandColor.withOpacity(0.1),
          ),
        ),
        color: Colors.white,
        margin: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: Colors.white,
        indicatorColor: brandColor.withOpacity(0.1),
        iconTheme: WidgetStateProperty.all(
          const IconThemeData(color: brandColor),
        ),
        labelTextStyle: WidgetStateProperty.all(
          const TextStyle(color: brandColor, fontWeight: FontWeight.w600),
        ),
      ),
      dividerColor: brandColor.withOpacity(0.1),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusLarge),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusLarge),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusLarge),
          borderSide: const BorderSide(color: brandColor, width: 1.5),
        ),
        contentPadding: const EdgeInsets.symmetric(
            horizontal: paddingMedium, vertical: paddingMedium),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: brandColor,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radiusMedium),
          ),
          padding: const EdgeInsets.symmetric(
              vertical: paddingMedium, horizontal: paddingLarge),
        ),
      ),
    );
  }

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: ColorScheme.fromSeed(
        seedColor: brandColor,
        brightness: Brightness.dark,
        primary: brandColor,
        surface: const Color(0xFF1A1A2E),
        surfaceContainerHighest: const Color(0xFF0F0F1A),
      ),
      scaffoldBackgroundColor: const Color(0xFF0F0F1A),
      textTheme: GoogleFonts.poppinsTextTheme().apply(
        bodyColor: const Color(0xFFE2E8F0),
        displayColor: Colors.white,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xFF0F0F1A),
        elevation: 0,
        scrolledUnderElevation: 0.5,
        foregroundColor: brandColor,
        iconTheme: IconThemeData(color: brandColor),
        titleTextStyle: TextStyle(
          color: brandColor,
          fontSize: 20,
          fontWeight: FontWeight.bold,
          fontFamily: fontFamily,
        ),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusLarge),
          side: const BorderSide(color: Color(0xFF2A2A3E)),
        ),
        color: const Color(0xFF1A1A2E),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: const Color(0xFF1A1A2E),
        indicatorColor: brandColor.withOpacity(0.15),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const IconThemeData(color: brandColor, size: 26);
          }
          return IconThemeData(color: Colors.grey.shade600, size: 26);
        }),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const TextStyle(color: brandColor, fontWeight: FontWeight.w600, fontSize: 11);
          }
          return TextStyle(color: Colors.grey.shade600, fontWeight: FontWeight.w500, fontSize: 11);
        }),
      ),
      dividerColor: const Color(0xFF2A2A3E),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFF1A1A2E),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusLarge),
          borderSide: const BorderSide(color: Color(0xFF2A2A3E)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusLarge),
          borderSide: const BorderSide(color: Color(0xFF2A2A3E)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusLarge),
          borderSide: const BorderSide(color: brandColor, width: 1.5),
        ),
        contentPadding: const EdgeInsets.symmetric(
            horizontal: paddingMedium, vertical: paddingMedium),
        hintStyle: TextStyle(color: Colors.grey.shade600),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: brandColor,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radiusMedium),
          ),
          padding: const EdgeInsets.symmetric(
              vertical: paddingMedium, horizontal: paddingLarge),
          elevation: 0,
        ),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: Color(0xFF1A1A2E),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(radiusXLarge)),
        ),
        surfaceTintColor: Colors.transparent,
      ),
      dialogTheme: DialogTheme(
        backgroundColor: const Color(0xFF1A1A2E),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(radiusXLarge)),
        surfaceTintColor: Colors.transparent,
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: const Color(0xFF2A2A3E),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(radiusMedium)),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: const Color(0xFF1A1A2E),
        selectedColor: brandColor.withOpacity(0.2),
        side: const BorderSide(color: Color(0xFF2A2A3E)),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(radiusSmall)),
      ),
    );
  }
}
