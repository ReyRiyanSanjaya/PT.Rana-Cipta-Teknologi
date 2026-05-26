import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:rana_market/config/theme_config.dart';

class AddressScreen extends StatefulWidget {
  const AddressScreen({super.key});

  @override
  State<AddressScreen> createState() => _AddressScreenState();
}

class _AddressScreenState extends State<AddressScreen> {
  final List<Map<String, dynamic>> _addresses = [
    {
      'label': 'Rumah',
      'receiver': 'Budi Santoso',
      'phone': '081234567890',
      'address': 'Jl. Mawar Merah No. 12, RT 03/RW 04, Kebayoran Baru, Jakarta Selatan, 12160',
      'isPrimary': true,
    },
    {
      'label': 'Kantor',
      'receiver': 'Budi Santoso',
      'phone': '081234567890',
      'address': 'Gedung Menara Mulia Lt. 14, Jl. Gatot Subroto Kav. 9-11, Jakarta Pusat, 10270',
      'isPrimary': false,
    },
  ];

  @override
  Widget build(BuildContext context) {
    final scale = ThemeConfig.tabletScale(context, mobile: 1.0);

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: const Text('Daftar Alamat', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        centerTitle: true,
      ),
      body: ListView.separated(
        padding: EdgeInsets.all(16 * scale),
        itemCount: _addresses.length,
        separatorBuilder: (_, __) => SizedBox(height: 16 * scale),
        itemBuilder: (context, index) {
          final addr = _addresses[index];
          final isPrimary = addr['isPrimary'] == true;

          return Container(
            padding: EdgeInsets.all(16 * scale),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: isPrimary ? ThemeConfig.brandColor : Colors.grey.shade200, width: isPrimary ? 2 : 1),
              boxShadow: [
                BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 10, offset: const Offset(0, 4))
              ]
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: EdgeInsets.symmetric(horizontal: 8 * scale, vertical: 4 * scale),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(addr['label'], style: TextStyle(fontSize: 12 * scale, fontWeight: FontWeight.bold, color: Colors.grey.shade800)),
                    ),
                    if (isPrimary) ...[
                      SizedBox(width: 8 * scale),
                      Container(
                        padding: EdgeInsets.symmetric(horizontal: 8 * scale, vertical: 4 * scale),
                        decoration: BoxDecoration(
                          color: ThemeConfig.brandColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text('Utama', style: TextStyle(fontSize: 12 * scale, fontWeight: FontWeight.bold, color: ThemeConfig.brandColor)),
                      ),
                    ],
                    const Spacer(),
                    Icon(Icons.more_vert_rounded, color: Colors.grey.shade400, size: 20 * scale),
                  ],
                ),
                SizedBox(height: 12 * scale),
                Text(
                  '${addr['receiver']} | ${addr['phone']}',
                  style: TextStyle(fontSize: 14 * scale, fontWeight: FontWeight.bold),
                ),
                SizedBox(height: 4 * scale),
                Text(
                  addr['address'],
                  style: TextStyle(fontSize: 13 * scale, color: Colors.grey.shade600, height: 1.4),
                ),
              ],
            ),
          ).animate().fadeIn(delay: Duration(milliseconds: 100 * index)).slideY(begin: 0.1);
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {},
        backgroundColor: ThemeConfig.brandColor,
        icon: const Icon(Icons.add_location_alt_rounded, color: Colors.white),
        label: const Text('Tambah Alamat', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
    );
  }
}
