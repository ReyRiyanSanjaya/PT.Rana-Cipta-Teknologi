const fs = require('fs');
const path = 'c:/Riyan/projek/Rana/mobile/lib/screens/home_screen.dart';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "import 'package:rana_merchant/widgets/home/feature_grid.dart';",
  "import 'package:rana_merchant/widgets/home/feature_grid.dart';\nimport 'package:rana_merchant/widgets/home/home_banner_carousel.dart';"
);

const regex = /  Widget _buildHomeBannerCarousel\(\) \{[\s\S]*?Widget _buildBannerDotsRow\(\) \{[\s\S]*?  \}/;
const newMethods = `  Widget _buildHomeBannerCarousel() {
    return HomeBannerCarousel(
      homeBanners: _homeBanners,
      isLoadingBanners: _isLoadingBanners,
      bannerPageController: _bannerPageController,
      bannerPageIndex: _bannerPageIndex,
      bannerProgress: _bannerProgress,
      onPageChanged: (idx) {
        setState(() {
          _bannerPageIndex = idx;
          _bannerProgress = 0.0;
        });
        _prefetchBannerImagesAroundIndex(idx);
      },
      onBannerTap: _handleBannerTap,
      onDotTap: (index) {
        _bannerPageController.animateToPage(
          index,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOutCubic,
        );
      },
      onPauseAuto: _pauseBannerAutoFor,
    );
  }

  Widget _buildBannerDotsRow() {
    return HomeBannerDots(
      homeBanners: _homeBanners,
      bannerPageIndex: _bannerPageIndex,
      onDotTap: (index) {
        _bannerPageController.animateToPage(
          index,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOutCubic,
        );
      },
      onPauseAuto: _pauseBannerAutoFor,
    );
  }`;

content = content.replace(regex, newMethods);
fs.writeFileSync(path, content);
