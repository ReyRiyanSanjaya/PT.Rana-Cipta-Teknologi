import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:rana_merchant/config/theme_config.dart';
import 'package:rana_merchant/data/remote/api_service.dart';

/// Full-width banner slider dengan rounded card, dots modern,
/// dan progress bar yang terletak di bawah banner (bukan di dalam FlexibleSpace)
class HomeBannerCarousel extends StatelessWidget {
  final List<dynamic> homeBanners;
  final bool isLoadingBanners;
  final PageController bannerPageController;
  final int bannerPageIndex;
  final double bannerProgress;
  final Function(int) onPageChanged;
  final Function(Map) onBannerTap;
  final Function(int) onDotTap;
  final Function(Duration) onPauseAuto;

  const HomeBannerCarousel({
    super.key,
    required this.homeBanners,
    required this.isLoadingBanners,
    required this.bannerPageController,
    required this.bannerPageIndex,
    required this.bannerProgress,
    required this.onPageChanged,
    required this.onBannerTap,
    required this.onDotTap,
    required this.onPauseAuto,
  });

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    // Tinggi lebih kompak — 42% lebar layar, clamp 160–240
    final bannerHeight = (screenWidth * 0.42).clamp(160.0, 240.0);

    if (isLoadingBanners) {
      return _BannerShimmer(height: bannerHeight);
    }

    if (homeBanners.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      children: [
        // ── Slider full width ────────────────────────────────────
        ClipRRect(
          borderRadius: const BorderRadius.vertical(
            bottom: Radius.circular(28),
          ),
          child: SizedBox(
            height: bannerHeight,
            child: PageView.builder(
              controller: bannerPageController,
              itemCount: homeBanners.length,
              onPageChanged: onPageChanged,
              itemBuilder: (_, index) {
                final item = homeBanners[index] as Map;
                final rawUrl = (item['imageUrl'] ?? '').toString();
                final imageUrl = ApiService().resolveFileUrl(rawUrl);
                final hasImage = imageUrl.isNotEmpty;

                return GestureDetector(
                  onTap: () {
                    onPauseAuto(const Duration(seconds: 8));
                    onBannerTap(item);
                  },
                  child: hasImage
                      ? Image.network(
                          imageUrl,
                          fit: BoxFit.cover,
                          width: double.infinity,
                          gaplessPlayback: true,
                          filterQuality: FilterQuality.medium,
                          loadingBuilder: (_, child, progress) {
                            if (progress == null) return child;
                            return _BannerPlaceholder();
                          },
                          errorBuilder: (_, __, ___) => _BannerPlaceholder(),
                        )
                      : _BannerContent(item: item),
                );
              },
            ),
          ),
        ),

        // ── Dots di tengah, di atas SalesSummary ────────────────
        if (homeBanners.length > 1)
          Transform.translate(
            offset: const Offset(0, -4),
            child: Padding(
              padding: const EdgeInsets.only(top: 10, bottom: 2),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  ...List.generate(homeBanners.length, (i) {
                    final isActive = i == bannerPageIndex;
                    return GestureDetector(
                      onTap: () {
                        onPauseAuto(const Duration(seconds: 8));
                        onDotTap(i);
                      },
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 280),
                        curve: Curves.easeOutCubic,
                        margin: const EdgeInsets.symmetric(horizontal: 3),
                        height: 6,
                        width: isActive ? 22 : 6,
                        decoration: BoxDecoration(
                          color: isActive
                              ? ThemeConfig.brandColor
                              : ThemeConfig.brandColor.withOpacity(0.25),
                          borderRadius: BorderRadius.circular(999),
                        ),
                      ),
                    );
                  }),
                  const SizedBox(width: 12),
                  // Mini progress indicator
                  SizedBox(
                    width: 32,
                    height: 4,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(999),
                      child: LinearProgressIndicator(
                        value: bannerProgress,
                        backgroundColor:
                            ThemeConfig.brandColor.withOpacity(0.15),
                        valueColor: AlwaysStoppedAnimation<Color>(
                            ThemeConfig.brandColor),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

// ── Placeholder saat gambar belum/gagal load ──────────────────────────────────
class _BannerPlaceholder extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            ThemeConfig.brandColor.withOpacity(0.12),
            ThemeConfig.brandColor.withOpacity(0.06),
          ],
        ),
      ),
      child: Center(
        child: Icon(Icons.image_outlined,
            size: 40, color: ThemeConfig.brandColor.withOpacity(0.3)),
      ),
    );
  }
}

// ── Banner dari title (tanpa gambar) ─────────────────────────────────────────
class _BannerContent extends StatelessWidget {
  final Map item;
  const _BannerContent({required this.item});

  @override
  Widget build(BuildContext context) {
    final title = item['title']?.toString() ?? '';
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            ThemeConfig.brandColor,
            ThemeConfig.brandColor.withOpacity(0.7),
          ],
        ),
      ),
      padding: const EdgeInsets.all(24),
      child: Align(
        alignment: Alignment.centerLeft,
        child: Text(
          title,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 18,
            fontWeight: FontWeight.bold,
            height: 1.3,
          ),
        ),
      ),
    );
  }
}

// ── Shimmer skeleton ─────────────────────────────────────────────────────────
class _BannerShimmer extends StatelessWidget {
  final double height;
  const _BannerShimmer({required this.height});

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: ThemeConfig.brandColor.withOpacity(0.08),
      highlightColor: ThemeConfig.brandColor.withOpacity(0.18),
      child: Container(
        height: height,
        width: double.infinity,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: const BorderRadius.vertical(
            bottom: Radius.circular(28),
          ),
        ),
      ),
    );
  }
}

/// Dots widget yang bisa dipakai standalone (misal di dalam FlexibleSpace)
class HomeBannerDots extends StatelessWidget {
  final List<dynamic> homeBanners;
  final int bannerPageIndex;
  final Function(int) onDotTap;
  final Function(Duration) onPauseAuto;

  const HomeBannerDots({
    super.key,
    required this.homeBanners,
    required this.bannerPageIndex,
    required this.onDotTap,
    required this.onPauseAuto,
  });

  @override
  Widget build(BuildContext context) {
    if (homeBanners.length <= 1) return const SizedBox.shrink();
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(homeBanners.length, (i) {
        final isActive = i == bannerPageIndex;
        return GestureDetector(
          onTap: () {
            onPauseAuto(const Duration(seconds: 8));
            onDotTap(i);
          },
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 250),
            margin: const EdgeInsets.symmetric(horizontal: 3),
            height: 6,
            width: isActive ? 18 : 6,
            decoration: BoxDecoration(
              color: isActive ? Colors.white : Colors.white.withOpacity(0.4),
              borderRadius: BorderRadius.circular(999),
            ),
          ),
        );
      }),
    );
  }
}
