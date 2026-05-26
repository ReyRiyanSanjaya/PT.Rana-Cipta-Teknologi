import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:wakelock_plus/wakelock_plus.dart';
import 'package:rana_merchant/services/digital_signage_service.dart';

class DigitalSignageScreen extends StatefulWidget {
  const DigitalSignageScreen({super.key});

  @override
  State<DigitalSignageScreen> createState() => _DigitalSignageScreenState();
}

class _DigitalSignageScreenState extends State<DigitalSignageScreen> {
  final PageController _pageController = PageController();
  final DigitalSignageService _service = DigitalSignageService();
  Timer? _timer;
  int _currentPage = 0;
  
  // Mock data
  late List<String> _images;
  late List<Map<String, String>> _texts;

  @override
  void initState() {
    super.initState();
    WakelockPlus.enable(); // Keep screen on
    _images = _service.getPromoImages();
    _texts = _service.getPromoTexts();
    
    // Auto scroll carousel
    _timer = Timer.periodic(const Duration(seconds: 5), (Timer timer) {
      if (_currentPage < _images.length - 1) {
        _currentPage++;
      } else {
        _currentPage = 0;
      }

      if (_pageController.hasClients) {
        _pageController.animateToPage(
          _currentPage,
          duration: const Duration(milliseconds: 800),
          curve: Curves.easeInOut,
        );
      }
    });
  }

  @override
  void dispose() {
    WakelockPlus.disable(); // Allow screen off
    _timer?.cancel();
    _pageController.dispose();
    super.dispose();
  }

  bool _isDismissing = false;

  void _dismiss() {
    if (_isDismissing) return;
    _isDismissing = true;
    if (Navigator.canPop(context)) {
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _dismiss, // Tap anywhere to exit
      onPanDown: (_) => _dismiss(),
      child: Scaffold(
        backgroundColor: Colors.black,
        body: Stack(
          children: [
            PageView.builder(
              controller: _pageController,
              itemCount: _images.length,
              itemBuilder: (context, index) {
                return Stack(
                  fit: StackFit.expand,
                  children: [
                    Image.network(
                      _images[index],
                      fit: BoxFit.cover,
                      errorBuilder: (ctx, err, _) => Container(
                         color: Colors.blueGrey[900],
                         child: const Center(child: Icon(Icons.image, size: 64, color: Colors.white24)),
                      ),
                      loadingBuilder: (ctx, child, progress) {
                        if (progress == null) return child;
                        return Center(child: CircularProgressIndicator(
                          value: progress.expectedTotalBytes != null
                              ? progress.cumulativeBytesLoaded / progress.expectedTotalBytes!
                              : null,
                          color: Colors.white,
                        ));
                      },
                    ),
                    // Gradient overlay
                    Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.black.withOpacity(0.3),
                            Colors.transparent,
                            Colors.black.withOpacity(0.7),
                          ],
                        ),
                      ),
                    ),
                    // Text Content
                    Positioned(
                      bottom: 80,
                      left: 32,
                      right: 32,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                           Text(
                             _texts[index % _texts.length]['title']!,
                             style: GoogleFonts.poppins(
                               fontSize: 32,
                               fontWeight: FontWeight.bold,
                               color: Colors.white,
                               shadows: [const Shadow(blurRadius: 10, color: Colors.black)],
                             ),
                           ),
                           const SizedBox(height: 8),
                           Text(
                             _texts[index % _texts.length]['subtitle']!,
                             style: GoogleFonts.poppins(
                               fontSize: 18,
                               color: Colors.white.withOpacity(0.9),
                               shadows: [const Shadow(blurRadius: 10, color: Colors.black)],
                             ),
                           ),
                        ],
                      ),
                    ),
                  ],
                );
              },
            ),
            
            // Branding / Logo
            Positioned(
              top: 40,
              left: 32,
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.store, color: Colors.white, size: 24),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    'Rana Merchant',
                    style: GoogleFonts.outfit(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
            
            // Tap to start hint
            Positioned(
              bottom: 40,
              left: 0,
              right: 0,
              child: Center(
                child: TweenAnimationBuilder<double>(
                  tween: Tween(begin: 0.0, end: 1.0),
                  duration: const Duration(seconds: 1),
                  builder: (context, val, child) {
                    return Opacity(
                      opacity: val,
                      child: child,
                    );
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(30),
                      border: Border.all(color: Colors.white.withOpacity(0.3)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.touch_app, color: Colors.white, size: 20),
                        const SizedBox(width: 8),
                        Text(
                          'Ketuk layar untuk memulai transaksi',
                          style: GoogleFonts.poppins(color: Colors.white),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
