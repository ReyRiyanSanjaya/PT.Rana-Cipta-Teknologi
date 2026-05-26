import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:rana_market/config/theme_config.dart';

class HelpCenterScreen extends StatelessWidget {
  const HelpCenterScreen({super.key});

  final List<Map<String, String>> _faqs = const [
    {
      'q': 'Bagaimana cara melacak pesanan saya?',
      'a': 'Anda dapat melacak pesanan melalui menu "Pesanan Saya" di halaman Profil. Klik pada pesanan yang sedang aktif untuk melihat status pengiriman secara real-time.'
    },
    {
      'q': 'Apakah saya bisa membatalkan pesanan?',
      'a': 'Pesanan hanya dapat dibatalkan jika penjual belum memproses atau mengirim barang. Anda akan menemukan tombol "Batalkan Pesanan" di detail pesanan jika fitur ini masih tersedia.'
    },
    {
      'q': 'Metode pembayaran apa saja yang diterima?',
      'a': 'Kami menerima berbagai metode pembayaran termasuk Saldo RanaPay, Kartu Kredit/Debit, Virtual Account Bank (BCA, Mandiri, BNI, BRI), dan e-Wallet (OVO, GoPay, Dana).'
    },
    {
      'q': 'Bagaimana cara menukarkan Poin Rana Royalty?',
      'a': 'Kumpulkan poin dari setiap transaksi Anda. Poin dapat ditukarkan dengan Voucher Diskon atau Gratis Ongkir melalui banner "Tukarkan Poin" di bagian profil Anda.'
    },
  ];

  @override
  Widget build(BuildContext context) {
    final scale = ThemeConfig.tabletScale(context, mobile: 1.0);

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: const Text('Pusat Bantuan', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        centerTitle: true,
      ),
      body: Stack(
        children: [
          ListView(
            padding: EdgeInsets.only(bottom: 100 * scale),
            children: [
              Container(
                width: double.infinity,
                padding: EdgeInsets.all(24 * scale),
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [ThemeConfig.brandColor, Color(0xFFFFA07A)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: Column(
                  children: [
                    Icon(Icons.support_agent_rounded, size: 64 * scale, color: Colors.white),
                    SizedBox(height: 16 * scale),
                    Text(
                      'Halo, ada yang bisa kami bantu?',
                      style: TextStyle(fontSize: 20 * scale, fontWeight: FontWeight.bold, color: Colors.white),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
              Padding(
                padding: EdgeInsets.all(16 * scale),
                child: Text('Pertanyaan Populer (FAQ)', style: TextStyle(fontSize: 16 * scale, fontWeight: FontWeight.bold, color: Colors.black87)),
              ),
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _faqs.length,
                itemBuilder: (context, index) {
                  return Container(
                    margin: EdgeInsets.symmetric(horizontal: 16 * scale, vertical: 8 * scale),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 10, offset: const Offset(0, 4))
                      ],
                      border: Border.all(color: Colors.grey.shade100)
                    ),
                    child: ExpansionTile(
                      shape: const Border(),
                      iconColor: ThemeConfig.brandColor,
                      title: Text(
                        _faqs[index]['q']!,
                        style: TextStyle(fontSize: 14 * scale, fontWeight: FontWeight.w600, color: Colors.black87),
                      ),
                      children: [
                        Padding(
                          padding: EdgeInsets.only(left: 16 * scale, right: 16 * scale, bottom: 16 * scale, top: 4 * scale),
                          child: Text(
                            _faqs[index]['a']!,
                            style: TextStyle(fontSize: 13 * scale, color: Colors.grey.shade600, height: 1.5),
                          ),
                        )
                      ],
                    ),
                  ).animate().fadeIn(delay: Duration(milliseconds: 100 * index)).slideY(begin: 0.1);
                },
              ),
            ],
          ),
          Positioned(
            left: 0, right: 0, bottom: 0,
            child: Container(
              padding: EdgeInsets.all(16 * scale),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, -5))],
              ),
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: ThemeConfig.brandColor,
                  padding: EdgeInsets.symmetric(vertical: 16 * scale),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                icon: Icon(Icons.forum_rounded, size: 20 * scale, color: Colors.white),
                label: Text('Chat Tim Support', style: TextStyle(fontSize: 16 * scale, fontWeight: FontWeight.bold, color: Colors.white)),
                onPressed: () {
                   ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Menyambungkan ke Live Agent...')));
                },
              ),
            )
          )
        ],
      ),
    );
  }
}
