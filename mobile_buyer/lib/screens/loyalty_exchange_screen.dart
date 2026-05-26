import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:rana_market/config/theme_config.dart';

class LoyaltyExchangeScreen extends StatelessWidget {
  const LoyaltyExchangeScreen({super.key});

  final List<Map<String, dynamic>> _rewards = const [
    {
      'title': 'Voucher Rp 20.000',
      'cost': 200,
      'icon': Icons.discount_rounded,
    },
    {
      'title': 'Gratis Ongkir Super',
      'cost': 150,
      'icon': Icons.local_shipping_rounded,
    },
    {
      'title': 'Merchandise Topi Rana',
      'cost': 800,
      'icon': Icons.redeem_rounded,
    },
    {
      'title': 'Pulsa Rp 10.000',
      'cost': 110,
      'icon': Icons.phone_android_rounded,
    },
  ];

  @override
  Widget build(BuildContext context) {
    final scale = ThemeConfig.tabletScale(context, mobile: 1.0);

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        title: const Text('Rana Loyalty', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
        centerTitle: true,
      ),
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  height: 300 * scale,
                  width: double.infinity,
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Color(0xFFCD7F32), Color(0xFF8B4513)], // Bronze Theme
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.vertical(bottom: Radius.circular(40)),
                  ),
                  child: Stack(
                    children: [
                      Positioned(right: -50, top: -50, child: Icon(Icons.diamond_outlined, size: 250, color: Colors.white.withValues(alpha: 0.1))),
                      SafeArea(
                        child: Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text('Poin Tersedia', style: TextStyle(fontSize: 16 * scale, color: Colors.white.withValues(alpha: 0.9))),
                              SizedBox(height: 8 * scale),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.star_rounded, color: Colors.yellow, size: 36 * scale),
                                  SizedBox(width: 8 * scale),
                                  Text('250', style: TextStyle(fontSize: 48 * scale, fontWeight: FontWeight.bold, color: Colors.white)),
                                ],
                              ).animate().scale(curve: Curves.easeOutBack, duration: 800.ms),
                              SizedBox(height: 16 * scale),
                              Container(
                                padding: EdgeInsets.symmetric(horizontal: 16 * scale, vertical: 6 * scale),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.2),
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(color: Colors.white.withValues(alpha: 0.5))
                                ),
                                child: Text('Member Bronze', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13 * scale)),
                              ),
                            ],
                          ),
                        ),
                      )
                    ],
                  ),
                ),
              ],
            ),
          ),
          SliverPadding(
            padding: EdgeInsets.all(20 * scale),
            sliver: SliverToBoxAdapter(
              child: Text('Katalog Hadiah', style: TextStyle(fontSize: 18 * scale, fontWeight: FontWeight.bold, color: Colors.black87)),
            ),
          ),
          SliverPadding(
            padding: EdgeInsets.symmetric(horizontal: 20 * scale),
            sliver: SliverGrid(
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                mainAxisSpacing: 16 * scale,
                crossAxisSpacing: 16 * scale,
                childAspectRatio: 0.85,
              ),
              delegate: SliverChildBuilderDelegate(
                (context, index) {
                  final reward = _rewards[index];
                  return Container(
                    padding: EdgeInsets.all(16 * scale),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 15, offset: const Offset(0, 8))],
                      border: Border.all(color: Colors.grey.shade100, width: 1.5)
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          padding: EdgeInsets.all(16 * scale),
                          decoration: BoxDecoration(
                            color: ThemeConfig.brandColor.withValues(alpha: 0.1),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(reward['icon'] as IconData, size: 32 * scale, color: ThemeConfig.brandColor),
                        ),
                        SizedBox(height: 16 * scale),
                        Text(
                          reward['title'] as String,
                          style: TextStyle(fontSize: 14 * scale, fontWeight: FontWeight.bold),
                          textAlign: TextAlign.center,
                          maxLines: 2,
                        ),
                        SizedBox(height: 8 * scale),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.star_rounded, color: Colors.orange, size: 16 * scale),
                            SizedBox(width: 4 * scale),
                            Text(
                              '${reward['cost']} Poin',
                              style: TextStyle(fontSize: 13 * scale, fontWeight: FontWeight.bold, color: Colors.orange),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ).animate().fadeIn(delay: Duration(milliseconds: 100 * index)).slideY(begin: 0.2);
                },
                childCount: _rewards.length,
              ),
            ),
          ),
          SliverPadding(padding: EdgeInsets.only(bottom: 40 * scale))
        ],
      ),
    );
  }
}
