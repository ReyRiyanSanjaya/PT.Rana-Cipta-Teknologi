import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';

class GuidelineScreen extends StatefulWidget {
  const GuidelineScreen({super.key});

  @override
  State<GuidelineScreen> createState() => _GuidelineScreenState();
}

class _GuidelineScreenState extends State<GuidelineScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  final List<Map<String, dynamic>> _topics = [
    {
      'id': 'start',
      'title': 'Mulai Berjualan',
      'icon': Icons.storefront_rounded,
      'color': const Color(0xFFE07A5F),
      'articles': [
        {
          'title': 'Cara mengatur profil toko',
          'content':
              'Masuk ke menu Pengaturan > Toko & Perangkat untuk mengubah nama toko, alamat, dan jam operasional. Pastikan data sesuai dengan profil usaha Anda agar struk dan laporan menjadi rapi.'
        },
        {
          'title': 'Menambahkan produk pertama',
          'content':
              'Pergi ke tab "Scan" atau menu Produk, lalu tekan tombol "+" di pojok kanan bawah. Masukkan foto, nama, kategori, dan harga produk. Aktifkan juga opsi "Lacak stok" bila ingin stok berkurang otomatis.'
        },
        {
          'title': 'Membuat kategori produk',
          'content':
              'Buka menu Produk, pilih Kelola Kategori. Tambahkan kategori seperti Minuman, Makanan, Snack, atau Lainnya. Kategori membantu kasir mencari produk lebih cepat.'
        },
        {
          'title': 'Pengaturan jam operasional',
          'content':
              'Di Pengaturan > Profil Toko, atur jam operasional agar sesuai dengan jam buka-tutup toko. Informasi ini digunakan pada beberapa fitur integrasi dan tampilan info toko.'
        },
      ]
    },
    {
      'id': 'orders',
      'title': 'Pesanan',
      'icon': Icons.receipt_long_rounded,
      'color': const Color(0xFF3D405B),
      'articles': [
        {
          'title': 'Menerima pesanan baru',
          'content':
              'Saat pesanan masuk, Anda akan mendapatkan notifikasi. Buka tab "PO Online" untuk melihat detail dan menerima pesanan, cek jumlah item dan catatan pelanggan sebelum konfirmasi.'
        },
        {
          'title': 'Proses penyiapan & pickup',
          'content':
              'Setelah diterima, ubah status menjadi "Disiapkan". Jika pesanan sudah siap diambil driver/pelanggan, ubah ke status "Siap Ambil" agar pelanggan mendapat notifikasi bahwa pesanan telah siap.'
        },
        {
          'title': 'Membatalkan pesanan dengan aman',
          'content':
              'Jika harus membatalkan pesanan, berikan alasan yang jelas di kolom catatan atau hubungi pelanggan terlebih dahulu. Pastikan juga mengikuti ketentuan platform terkait pembatalan.'
        },
      ]
    },
    {
      'id': 'products',
      'title': 'Produk & Stok',
      'icon': Icons.inventory_2_rounded,
      'color': const Color(0xFF81B29A),
      'articles': [
        {
          'title': 'Mengatur varian produk',
          'content':
              'Saat edit produk, Anda bisa menambahkan varian seperti "Ukuran" (Regular/Large) atau "Topping". Setiap varian dapat memiliki harga berbeda sesuai kebutuhan.'
        },
        {
          'title': 'Manajemen stok otomatis',
          'content':
              'Aktifkan "Lacak Stok" di edit produk. Stok akan berkurang otomatis saat ada penjualan di kasir maupun pesanan online sehingga meminimalkan risiko kehabisan stok tanpa diketahui.'
        },
        {
          'title': 'Penyesuaian stok (stock opname)',
          'content':
              'Untuk menyesuaikan stok, buka menu Produk, pilih produk yang ingin diubah, lalu sesuaikan jumlah stok dengan kondisi aktual di toko. Gunakan catatan internal bila perlu.'
        },
        {
          'title': 'Menyembunyikan produk yang sedang habis',
          'content':
              'Jika stok suatu produk sedang kosong dan tidak ingin ditampilkan di kasir/pesanan online, Anda bisa nonaktifkan status produk atau atur stok menjadi 0.'
        },
      ]
    },
    {
      'id': 'finance',
      'title': 'Laporan',
      'icon': Icons.bar_chart_rounded,
      'color': const Color(0xFFF2CC8F),
      'articles': [
        {
          'title': 'Membaca laporan penjualan',
          'content':
              'Tab Laporan menampilkan grafik omzet harian, mingguan, dan bulanan. Anda juga bisa melihat produk terlaris, rata-rata transaksi, dan tren penjualan untuk membantu pengambilan keputusan usaha.'
        },
        {
          'title': 'Export laporan ke Excel',
          'content':
              'Fitur export tersedia di pojok kanan atas halaman Laporan. File akan tersimpan di folder Download HP Anda dan dapat dibuka dengan Excel atau Google Sheets untuk analisa lebih lanjut.'
        },
        {
          'title': 'Laporan kas harian',
          'content':
              'Gunakan laporan kas harian untuk mengecek total uang masuk dan keluar setiap hari. Cocok untuk rekonsiliasi dengan uang fisik di kasir.'
        },
        {
          'title': 'Memahami margin keuntungan',
          'content':
              'Jika Anda mengisi harga modal pada produk, sistem dapat membantu menghitung estimasi margin keuntungan dari penjualan sehingga Anda bisa memantau profit usaha.'
        },
      ]
    },
    {
      'id': 'promo',
      'title': 'Promosi',
      'icon': Icons.campaign_rounded,
      'color': const Color(0xFFE07A5F),
      'articles': [
        {
          'title': 'Membuat Flash Sale',
          'content':
              'Masuk ke menu Promosi > Flash Sale. Pilih produk dan tentukan diskon serta durasi waktunya. Gunakan banner atau poster di toko agar pelanggan mengetahui adanya promo.'
        },
        {
          'title': 'Memberikan diskon manual di kasir',
          'content':
              'Saat membuat transaksi di kasir, Anda bisa menambahkan diskon per-item atau diskon total transaksi sesuai kebutuhan, misalnya promo khusus pelanggan tetap.'
        },
        {
          'title': 'Program referral Rana',
          'content':
              'Buka menu Pengaturan > Program Referral untuk melihat kode referral Anda. Bagikan kode tersebut ke teman pelaku usaha lain untuk mendapatkan benefit sesuai program yang sedang berjalan.'
        },
      ]
    },
    {
      'id': 'device',
      'title': 'Printer',
      'icon': Icons.print_rounded,
      'color': const Color(0xFF3D405B),
      'articles': [
        {
          'title': 'Menghubungkan Printer Bluetooth',
          'content':
              'Buka Pengaturan > Printer Bluetooth. Pastikan bluetooth HP menyala, lalu tekan tombol scan dan pilih printer thermal Anda dari daftar perangkat yang ditemukan.'
        },
        {
          'title': 'Mengatur ukuran kertas & struk',
          'content':
              'Di menu Pengaturan Struk Anda dapat memilih ukuran kertas (58mm/80mm), menambahkan catatan di footer, serta mengatur data yang ingin tampil di struk.'
        },
        {
          'title': 'Mengatasi struk tidak tercetak',
          'content':
              'Jika struk tidak tercetak, cek kembali koneksi Bluetooth, daya baterai printer, dan kertas. Lakukan uji cetak dari menu Printer Bluetooth untuk memastikan perangkat terhubung.'
        },
      ]
    },
    {
      'id': 'ppob',
      'title': 'Tagihan & PPOB',
      'icon': Icons.electric_bolt_rounded,
      'color': const Color(0xFF81B29A),
      'articles': [
        {
          'title': 'Membayar tagihan listrik, pulsa, dan data',
          'content':
              'Masuk ke menu PPOB/Tagihan, pilih kategori (Pulsa, Paket Data, Listrik, dll), masukkan nomor tujuan, lalu konfirmasi detail sebelum membayar.'
        },
        {
          'title': 'Cek status pembayaran PPOB',
          'content':
              'Setelah pembayaran, Anda dapat melihat status transaksi di riwayat PPOB. Jika status tertunda, tunggu beberapa saat sebelum melakukan pengecekan ulang.'
        },
        {
          'title': 'Penanganan jika saldo terpotong tapi produk belum masuk',
          'content':
              'Jika saldo sudah terpotong tetapi produk belum diterima pelanggan, catat ID transaksi PPOB lalu hubungi tim bantuan melalui menu Bantuan & Support agar dapat dibantu pengecekan.'
        },
      ]
    },
    {
      'id': 'account',
      'title': 'Akun & Pengaturan',
      'icon': Icons.settings_rounded,
      'color': const Color(0xFFF2CC8F),
      'articles': [
        {
          'title': 'Mengubah data pemilik & nomor HP',
          'content':
              'Buka Pengaturan > Edit Profil Toko untuk mengubah nama pemilik, nomor HP, dan email. Pastikan nomor HP aktif untuk keperluan verifikasi.'
        },
        {
          'title': 'Pengaturan keamanan & keluar akun',
          'content':
              'Gunakan tombol Keluar di pojok kanan atas halaman Pengaturan untuk logout dari perangkat. Jangan bagikan akun ke orang yang tidak dipercaya.'
        },
        {
          'title': 'Mode gelap (Dark Mode)',
          'content':
              'Aplikasi mendukung mode terang dan gelap sesuai pengaturan tema di perangkat Anda. Aktifkan dark mode di sistem HP bila ingin tampilan aplikasi lebih nyaman di malam hari.'
        },
      ]
    },
    {
      'id': 'support',
      'title': 'Bantuan & Support',
      'icon': Icons.support_agent_rounded,
      'color': const Color(0xFFE07A5F),
      'articles': [
        {
          'title': 'Menghubungi admin via WhatsApp',
          'content':
              'Dari menu Bantuan, gunakan tombol Chat WhatsApp Admin untuk menghubungi tim support Rana. Sertakan penjelasan singkat kendala dan ID transaksi bila ada.'
        },
        {
          'title': 'Membuat tiket bantuan di aplikasi',
          'content':
              'Buka menu Bantuan & Support, lalu tekan tombol "Buat Tiket Bantuan". Isi judul dan detail masalah, atau gunakan template yang sudah disediakan agar penanganan lebih cepat.'
        },
        {
          'title': 'Memantau respon dan status tiket',
          'content':
              'Semua tiket yang sudah dibuat akan muncul di daftar tiket bantuan. Bila ada balasan dari admin, Anda akan melihat indikator belum dibaca dan dapat membalas langsung di layar percakapan.'
        },
      ]
    },
  ];

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final filteredTopics = _searchQuery.isEmpty
        ? _topics
        : _topics.where((t) {
            final title = t['title'].toString().toLowerCase();
            final articles = t['articles'] as List;
            final hasArticle = articles.any((a) =>
                a['title'].toString().toLowerCase().contains(_searchQuery) ||
                a['content'].toString().toLowerCase().contains(_searchQuery));
            return title.contains(_searchQuery) || hasArticle;
          }).toList();

    return Scaffold(
      backgroundColor: colorScheme.surface,
      appBar: AppBar(
        title: Text('Panduan Pengguna',
            style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: colorScheme.onSurface)),
        backgroundColor: colorScheme.surface,
        iconTheme: IconThemeData(color: colorScheme.onSurface),
        elevation: 0,
      ),
      body: Column(
        children: [
          // Header Search
          Container(
            padding: const EdgeInsets.fromLTRB(20, 10, 20, 20),
            decoration: BoxDecoration(
              color: colorScheme.surface,
              borderRadius: const BorderRadius.vertical(bottom: Radius.circular(24)),
              boxShadow: [
                BoxShadow(
                  color: colorScheme.shadow.withOpacity(0.05),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Halo, ada yang bisa kami bantu?',
                  style: GoogleFonts.outfit(
                    fontSize: 20,
                    fontWeight: FontWeight.w600,
                    color: colorScheme.onSurface,
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _searchController,
                  onChanged: (val) => setState(() => _searchQuery = val.toLowerCase()),
                  style: GoogleFonts.outfit(color: colorScheme.onSurface),
                  decoration: InputDecoration(
                    hintText: 'Cari topik bantuan (cth: stok, printer)...',
                    hintStyle: GoogleFonts.outfit(color: colorScheme.onSurface.withOpacity(0.4)),
                    prefixIcon: Icon(Icons.search, color: colorScheme.primary),
                    filled: true,
                    fillColor: colorScheme.surfaceVariant.withOpacity(0.3),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  ),
                ),
              ],
            ),
          ),

          // Content
          Expanded(
            child: filteredTopics.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.search_off_rounded, size: 64, color: colorScheme.outline),
                        const SizedBox(height: 16),
                        Text('Tidak ditemukan topik "$_searchQuery"',
                            style: GoogleFonts.outfit(color: colorScheme.onSurfaceVariant)),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(20),
                    itemCount: filteredTopics.length,
                    itemBuilder: (context, index) {
                      final topic = filteredTopics[index];
                      return _buildTopicCard(topic);
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildTopicCard(Map<String, dynamic> topic) {
    final colorScheme = Theme.of(context).colorScheme;
    final articles = topic['articles'] as List;
    // If searching, only show relevant articles or all if topic matches
    final visibleArticles = _searchQuery.isEmpty
        ? articles
        : articles.where((a) =>
            a['title'].toString().toLowerCase().contains(_searchQuery) ||
            a['content'].toString().toLowerCase().contains(_searchQuery) ||
            topic['title'].toString().toLowerCase().contains(_searchQuery)).toList();

    if (visibleArticles.isEmpty) return const SizedBox.shrink();

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colorScheme.outline.withOpacity(0.1)),
        boxShadow: [
          BoxShadow(
            color: colorScheme.shadow.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          initiallyExpanded: _searchQuery.isNotEmpty,
          leading: Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: (topic['color'] as Color).withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(topic['icon'], color: topic['color']),
          ),
          title: Text(
            topic['title'],
            style: GoogleFonts.outfit(
              fontWeight: FontWeight.w600,
              fontSize: 16,
              color: colorScheme.onSurface,
            ),
          ),
          children: visibleArticles.map((article) => _buildArticleItem(article)).toList(),
        ),
      ),
    ).animate().fadeIn().slideY(begin: 0.1, curve: Curves.easeOut);
  }

  Widget _buildArticleItem(dynamic article) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Divider(color: colorScheme.outlineVariant),
          const SizedBox(height: 8),
          Text(
            article['title'],
            style: GoogleFonts.outfit(
              fontWeight: FontWeight.w600,
              fontSize: 14,
              color: colorScheme.onSurface,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            article['content'],
            style: GoogleFonts.outfit(
              fontSize: 13,
              color: colorScheme.onSurfaceVariant,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }
}
