import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import 'package:rana_merchant/data/remote/api_service.dart';

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
    final bannerHeight =
        (MediaQuery.of(context).size.width * 0.68).clamp(340.0, 520.0).toDouble();

    if (isLoadingBanners) {
      return Padding(
        padding: EdgeInsets.zero,
        child: ClipRRect(
          borderRadius: const BorderRadius.only(
            bottomLeft: Radius.circular(28),
            bottomRight: Radius.circular(28),
          ),
          child: SizedBox(
            height: bannerHeight,
            child: Shimmer.fromColors(
              baseColor: Theme.of(context).colorScheme.primary.withOpacity(0.08),
              highlightColor: Theme.of(context).colorScheme.surface.withOpacity(0.22),
              child: Container(color: Colors.white),
            ),
          ),
        ),
      );
    }
    if (homeBanners.isEmpty) {
      return const SizedBox.shrink();
    }

    return SizedBox(
      height: bannerHeight,
      child: Stack(
        children: [
          PageView.builder(
            controller: bannerPageController,
            itemCount: homeBanners.length,
            onPageChanged: onPageChanged,
            itemBuilder: (_, index) {
              final item = homeBanners[index] as Map;
              final rawImageUrl = (item['imageUrl'] ?? '').toString();
              final imageUrl = ApiService().resolveFileUrl(rawImageUrl);
              final hasImage = imageUrl.isNotEmpty;
              return InkWell(
                onTap: () {
                  onPauseAuto(const Duration(seconds: 8));
                  onBannerTap(item);
                },
                child: hasImage
                    ? Image.network(
                        imageUrl,
                        fit: BoxFit.cover,
                        gaplessPlayback: true,
                        filterQuality: FilterQuality.low,
                        errorBuilder: (context, error, stackTrace) =>
                            Container(color: Theme.of(context).colorScheme.surface),
                      )
                    : Container(color: Theme.of(context).colorScheme.surface),
              );
            },
          ),
          if (homeBanners.length > 1)
            Positioned(
              left: 16,
              right: 16,
              bottom: 28,
              child: IgnorePointer(
                ignoring: true,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(999),
                  child: LinearProgressIndicator(
                    value: bannerProgress,
                    minHeight: 4,
                    backgroundColor: Theme.of(context)
                        .colorScheme
                        .surfaceVariant
                        .withOpacity(0.4),
                    valueColor: AlwaysStoppedAnimation<Color>(
                      Theme.of(context).colorScheme.primary,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

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
    if (homeBanners.length <= 1) {
      return const SizedBox.shrink();
    }
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 0),
      child: Center(
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(homeBanners.length, (index) {
            final isActive = index == bannerPageIndex;
            return InkWell(
              onTap: () {
                onPauseAuto(const Duration(seconds: 8));
                onDotTap(index);
              },
              borderRadius: BorderRadius.circular(999),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 250),
                margin: const EdgeInsets.symmetric(horizontal: 4),
                height: 6,
                width: isActive ? 18 : 6,
                decoration: BoxDecoration(
                  color: isActive ? Colors.white : Colors.white.withOpacity(0.4),
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
            );
          }),
        ),
      ),
    );
  }
}
