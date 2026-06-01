import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mobile_driver/config/theme_config.dart';
import 'package:mobile_driver/providers/auth_provider.dart';
import 'package:mobile_driver/providers/driver_provider.dart';
import 'package:mobile_driver/data/driver_api_service.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:url_launcher/url_launcher.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final driver = Provider.of<DriverProvider>(context);
    final user = auth.user;

    return Scaffold(
      backgroundColor: ThemeConfig.beigeBackground,
      appBar: AppBar(
        title: Text('Profil Driver',
            style: GoogleFonts.outfit(
                fontWeight: FontWeight.bold, color: ThemeConfig.brandColor)),
        backgroundColor: ThemeConfig.beigeBackground,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            _buildProfileHeader(user, driver),
            const SizedBox(height: 32),
            _buildVehicleInfoCard(context, driver),
            const SizedBox(height: 24),
            _buildStatsRow(driver),
            const SizedBox(height: 32),
            _buildMenuSection(context, auth),
            const SizedBox(height: 40),
            _buildLogoutButton(context, auth),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileHeader(
      Map<String, dynamic>? user, DriverProvider driver) {
    final profile = driver.driverProfile;
    final name = user?['name'] ?? profile?['name'] ?? 'Rana Driver';
    final email = user?['email'] ?? profile?['email'] ?? '';

    return Column(
      children: [
        Stack(
          alignment: Alignment.bottomRight,
          children: [
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: ThemeConfig.brandColor, width: 2),
              ),
              child: CircleAvatar(
                radius: 50,
                backgroundColor: Colors.grey.shade200,
                child: Text(
                  name.isNotEmpty ? name[0].toUpperCase() : 'D',
                  style: GoogleFonts.outfit(
                      fontSize: 36,
                      fontWeight: FontWeight.bold,
                      color: ThemeConfig.brandColor),
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: const BoxDecoration(
                  color: Colors.green, shape: BoxShape.circle),
              child: const Icon(Icons.verified_user_rounded,
                  color: Colors.white, size: 16),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Text(name,
            style: GoogleFonts.outfit(fontSize: 24, fontWeight: FontWeight.bold)),
        if (email.isNotEmpty)
          Text(email, style: TextStyle(color: Colors.grey.shade600)),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
          decoration: BoxDecoration(
            color: ThemeConfig.brandColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text('Level ${driver.level} Mitra',
              style: const TextStyle(
                  color: ThemeConfig.brandColor,
                  fontWeight: FontWeight.bold,
                  fontSize: 12)),
        ),
      ],
    ).animate().fadeIn().scale();
  }

  Widget _buildVehicleInfoCard(BuildContext context, DriverProvider driver) {
    final profile = driver.driverProfile;
    final vehicleBrand = profile?['vehicleBrand'] ?? 'Belum diatur';
    final vehiclePlate = profile?['vehiclePlate'] ?? '-';
    final vehicleType = profile?['vehicleType'] ?? 'MOTORCYCLE';

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10)
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(
                vehicleType == 'CAR'
                    ? Icons.directions_car_rounded
                    : Icons.directions_bike_rounded,
                color: ThemeConfig.brandColor,
                size: 32),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(vehicleBrand,
                    style: const TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 16)),
                Text(vehiclePlate,
                    style:
                        TextStyle(color: Colors.grey.shade600, fontSize: 13)),
              ],
            ),
          ),
          TextButton(
            onPressed: () => _showEditVehicleDialog(context, driver),
            child: const Text('Edit',
                style: TextStyle(
                    color: ThemeConfig.brandColor, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  void _showEditVehicleDialog(BuildContext context, DriverProvider driver) {
    final profile = driver.driverProfile;
    final brandCtrl =
        TextEditingController(text: profile?['vehicleBrand'] ?? '');
    final plateCtrl =
        TextEditingController(text: profile?['vehiclePlate'] ?? '');
    final yearCtrl =
        TextEditingController(text: profile?['vehicleYear'] ?? '');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
        child: Container(
          padding: const EdgeInsets.all(32),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Edit Kendaraan',
                  style:
                      GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 24),
              TextField(
                controller: brandCtrl,
                decoration: const InputDecoration(labelText: 'Merk & Tipe'),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: plateCtrl,
                decoration: const InputDecoration(labelText: 'Nomor Plat'),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: yearCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Tahun'),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () async {
                    try {
                      await DriverApiService().updateDriverProfile({
                        'vehicleBrand': brandCtrl.text,
                        'vehiclePlate': plateCtrl.text,
                        'vehicleYear': yearCtrl.text,
                      });
                      if (ctx.mounted) Navigator.pop(ctx);
                      driver.loadProfile();
                    } catch (e) {
                      if (ctx.mounted) {
                        ScaffoldMessenger.of(ctx).showSnackBar(
                            SnackBar(content: Text('Gagal: $e')));
                      }
                    }
                  },
                  child: const Text('SIMPAN'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatsRow(DriverProvider driver) {
    final profile = driver.driverProfile;
    final joinYear = profile?['createdAt'] != null
        ? DateTime.tryParse(profile!['createdAt'].toString())?.year.toString() ?? '-'
        : '-';

    return Row(
      children: [
        _buildMiniStat(
            'Rating', '${driver.rating}', Icons.star_rounded, Colors.amber),
        const SizedBox(width: 12),
        _buildMiniStat('Trip', '${driver.completedTrips}',
            Icons.directions_bike_rounded, Colors.blue),
        const SizedBox(width: 12),
        _buildMiniStat(
            'Bergabung', joinYear, Icons.calendar_today_rounded, Colors.purple),
      ],
    );
  }

  Widget _buildMiniStat(
      String label, String value, IconData icon, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(height: 8),
            Text(value,
                style:
                    const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            Text(label,
                style: TextStyle(color: Colors.grey.shade500, fontSize: 11)),
          ],
        ),
      ),
    );
  }

  Widget _buildMenuSection(BuildContext context, AuthProvider auth) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        children: [
          _buildMenuItem(Icons.person_outline_rounded, 'Data Diri', () {
            _showPersonalDataDialog(context);
          }),
          _buildMenuItem(Icons.description_outlined, 'Dokumen Legal', () {
            _showDocumentsInfo(context);
          }),
          _buildMenuItem(Icons.help_outline_rounded, 'Pusat Bantuan', () {
            _openSupport();
          }),
          _buildMenuItem(Icons.info_outline_rounded, 'Tentang Aplikasi', () {
            _showAboutDialog(context);
          }, isLast: true),
        ],
      ),
    );
  }

  void _showPersonalDataDialog(BuildContext context) {
    final driver = Provider.of<DriverProvider>(context, listen: false);
    final profile = driver.driverProfile;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: const EdgeInsets.all(32),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Data Diri',
                style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 24),
            _buildDataRow('Nama', profile?['name'] ?? '-'),
            _buildDataRow('Email', profile?['email'] ?? '-'),
            _buildDataRow('Telepon', profile?['phone'] ?? '-'),
            _buildDataRow('NIK', profile?['nik'] ?? '-'),
            _buildDataRow('Alamat', profile?['address'] ?? '-'),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildDataRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(label, style: TextStyle(color: Colors.grey.shade600)),
          ),
          Expanded(
            child: Text(value,
                style: const TextStyle(fontWeight: FontWeight.w500)),
          ),
        ],
      ),
    );
  }

  void _showDocumentsInfo(BuildContext context) {
    final driver = Provider.of<DriverProvider>(context, listen: false);
    final profile = driver.driverProfile;

    final hasKtp = profile?['ktpImage'] != null;
    final hasSim = profile?['simImage'] != null;
    final hasStnk = profile?['stnkImage'] != null;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: const EdgeInsets.all(32),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Dokumen Legal',
                style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 24),
            _buildDocStatus('KTP', hasKtp),
            _buildDocStatus('SIM', hasSim),
            _buildDocStatus('STNK', hasStnk),
            const SizedBox(height: 16),
            Text('Hubungi support untuk update dokumen',
                style: TextStyle(color: Colors.grey.shade500, fontSize: 12)),
          ],
        ),
      ),
    );
  }

  Widget _buildDocStatus(String label, bool uploaded) {
    return ListTile(
      leading: Icon(
        uploaded ? Icons.check_circle_rounded : Icons.cancel_rounded,
        color: uploaded ? Colors.green : Colors.red,
      ),
      title: Text(label),
      subtitle: Text(uploaded ? 'Terverifikasi' : 'Belum diunggah'),
    );
  }

  void _openSupport() async {
    final url = Uri.parse('https://wa.me/628887992299?text=Halo, saya driver Rana butuh bantuan');
    try {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    } catch (_) {}
  }

  void _showAboutDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text('Rana Driver',
            style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Versi 1.0.0'),
            SizedBox(height: 8),
            Text('Aplikasi mitra driver untuk ekosistem Rana Market.'),
            SizedBox(height: 16),
            Text('© 2024 PT Rana Cipta Teknologi',
                style: TextStyle(fontSize: 12, color: Colors.grey)),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('TUTUP'),
          ),
        ],
      ),
    );
  }

  Widget _buildMenuItem(IconData icon, String title, VoidCallback onTap,
      {bool isLast = false}) {
    return Column(
      children: [
        ListTile(
          onTap: onTap,
          leading: Icon(icon, color: Colors.grey.shade700, size: 22),
          title: Text(title,
              style:
                  const TextStyle(fontWeight: FontWeight.w500, fontSize: 15)),
          trailing: const Icon(Icons.chevron_right_rounded, size: 20),
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
        ),
        if (!isLast)
          const Divider(
              height: 1, indent: 60, endIndent: 20, color: Colors.black12),
      ],
    );
  }

  Widget _buildLogoutButton(BuildContext context, AuthProvider auth) {
    return SizedBox(
      width: double.infinity,
      child: TextButton(
        onPressed: () {
          showDialog(
            context: context,
            builder: (ctx) => AlertDialog(
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20)),
              title: const Text('Keluar Aplikasi?'),
              content: const Text(
                  'Anda akan keluar dari akun dan perlu login kembali.'),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('BATAL'),
                ),
                ElevatedButton(
                  style:
                      ElevatedButton.styleFrom(backgroundColor: Colors.red),
                  onPressed: () {
                    Navigator.pop(ctx);
                    auth.logout();
                  },
                  child: const Text('KELUAR',
                      style: TextStyle(color: Colors.white)),
                ),
              ],
            ),
          );
        },
        style: TextButton.styleFrom(
          foregroundColor: Colors.red,
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: Colors.red),
          ),
        ),
        child: const Text('KELUAR APLIKASI',
            style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1.2)),
      ),
    );
  }
}
