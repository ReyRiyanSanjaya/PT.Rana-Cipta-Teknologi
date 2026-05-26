import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:rana_market/config/theme_config.dart';

class VoucherScreen extends StatefulWidget {
  const VoucherScreen({super.key});

  @override
  State<VoucherScreen> createState() => _VoucherScreenState();
}

class _VoucherScreenState extends State<VoucherScreen> {
  // Mock data for vouchers
  final List<Map<String, dynamic>> _vouchers = [
    {
      'title': 'Gratis Ongkir Super',
      'desc': 'Min. belanja Rp50.000',
      'discount': '100%',
      'type': 'shipping',
      'exp': 'Hari ini',
    },
    {
      'title': 'Diskon Spesial Rana',
      'desc': 'Potongan harga hingga Rp20.000',
      'discount': 'Rp20K',
      'type': 'discount',
      'exp': 'Berlaku 3 Hari',
    },
    {
      'title': 'Cashback Member Baru',
      'desc': 'Cashback 50% max Rp50.000 (Poin)',
      'discount': '50%',
      'type': 'cashback',
      'exp': 'Berlaku 7 Hari',
    },
  ];

  @override
  Widget build(BuildContext context) {
    final scale = ThemeConfig.tabletScale(context, mobile: 1.0);

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: const Text('Voucher Saya', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        centerTitle: true,
      ),
      body: ListView.separated(
        padding: EdgeInsets.all(16 * scale),
        itemCount: _vouchers.length,
        separatorBuilder: (_, __) => SizedBox(height: 16 * scale),
        itemBuilder: (context, index) {
          final v = _vouchers[index];
          final isShipping = v['type'] == 'shipping';
          final primaryColor = isShipping ? Colors.green : ThemeConfig.brandColor;

          return Container(
            height: 110 * scale,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                )
              ],
              border: Border.all(color: Colors.grey.shade100, width: 1),
            ),
            child: Row(
              children: [
                // Left Ticket Stub
                Container(
                  width: 100 * scale,
                  decoration: BoxDecoration(
                    color: primaryColor.withValues(alpha: 0.1),
                    borderRadius: const BorderRadius.horizontal(left: Radius.circular(16)),
                    border: Border(
                      right: BorderSide(color: Colors.grey.shade300, width: 1, style: BorderStyle.none),
                    )
                  ),
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(isShipping ? Icons.local_shipping_rounded : Icons.discount_rounded, color: primaryColor, size: 32 * scale),
                        SizedBox(height: 8 * scale),
                        Text(
                          v['discount'],
                          style: TextStyle(
                            fontSize: 18 * scale,
                            fontWeight: FontWeight.bold,
                            color: primaryColor,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                // Dashed Line Emulation
                Container(
                   width: 1,
                   color: Colors.grey.shade300,
                ),
                // Right Content
                Expanded(
                  child: Padding(
                    padding: EdgeInsets.all(12 * scale),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          v['title'],
                          style: TextStyle(fontSize: 15 * scale, fontWeight: FontWeight.bold),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        SizedBox(height: 4 * scale),
                        Text(
                          v['desc'],
                          style: TextStyle(fontSize: 12 * scale, color: Colors.grey.shade600),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const Spacer(),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                Icon(Icons.timer_rounded, size: 12 * scale, color: Colors.red),
                                SizedBox(width: 4 * scale),
                                Text(v['exp'], style: TextStyle(fontSize: 10 * scale, color: Colors.red, fontWeight: FontWeight.bold)),
                              ],
                            ),
                            Text(
                              'Gunakan',
                              style: TextStyle(fontSize: 12 * scale, fontWeight: FontWeight.bold, color: ThemeConfig.brandColor),
                            ),
                          ],
                        )
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ).animate().fadeIn(delay: Duration(milliseconds: 100 * index)).slideX(begin: 0.1);
        },
      ),
    );
  }
}
