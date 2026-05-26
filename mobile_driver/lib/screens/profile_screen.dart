import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mobile_driver/config/theme_config.dart';
import 'package:mobile_driver/providers/auth_provider.dart';
import 'package:mobile_driver/providers/driver_provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';

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
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: ThemeConfig.brandColor)),
        backgroundColor: ThemeConfig.beigeBackground,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_outlined, color: ThemeConfig.brandColor),
            onPressed: () {},
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            _buildProfileHeader(user, driver),
            const SizedBox(height: 32),
            _buildVehicleInfoCard(driver),
            const SizedBox(height: 24),
            _buildStatsRow(driver),
            const SizedBox(height: 32),
            _buildMenuSection(context, auth),
            const SizedBox(height: 40),
            _buildLogoutButton(auth),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileHeader(Map<String, dynamic>? user, DriverProvider driver) {
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
                child: const Icon(Icons.person_rounded, size: 50, color: Colors.grey),
              ),
            ),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: const BoxDecoration(color: Colors.green, shape: BoxShape.circle),
              child: const Icon(Icons.verified_user_rounded, color: Colors.white, size: 16),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Text(user?['name'] ?? 'Rana Driver', 
          style: GoogleFonts.outfit(fontSize: 24, fontWeight: FontWeight.bold)),
        Text(user?['email'] ?? 'driver@rana.com', 
          style: TextStyle(color: Colors.grey.shade600)),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
          decoration: BoxDecoration(
            color: ThemeConfig.brandColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text('Level ${driver.level} Mitra', 
            style: const TextStyle(color: ThemeConfig.brandColor, fontWeight: FontWeight.bold, fontSize: 12)),
        ),
      ],
    ).animate().fadeIn().scale();
  }

  Widget _buildVehicleInfoCard(DriverProvider driver) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10)],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(Icons.directions_bike_rounded, color: ThemeConfig.brandColor, size: 32),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Honda Vario 150', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                Text('B 1234 ABC • Hitam', style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
              ],
            ),
          ),
          TextButton(
            onPressed: () {},
            child: const Text('Edit', style: TextStyle(color: ThemeConfig.brandColor, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Widget _buildStatsRow(DriverProvider driver) {
    return Row(
      children: [
        _buildMiniStat('Rating', '${driver.rating}', Icons.star_rounded, Colors.amber),
        const SizedBox(width: 12),
        _buildMiniStat('Trip', '${driver.completedTrips}', Icons.directions_bike_rounded, Colors.blue),
        const SizedBox(width: 12),
        _buildMiniStat('Tahun', '2022', Icons.calendar_today_rounded, Colors.purple),
      ],
    );
  }

  Widget _buildMiniStat(String label, String value, IconData icon, Color color) {
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
            Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            Text(label, style: TextStyle(color: Colors.grey.shade500, fontSize: 11)),
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
          _buildMenuItem(Icons.person_outline_rounded, 'Data Diri', () {}),
          _buildMenuItem(Icons.description_outlined, 'Dokumen Legal', () {}),
          _buildMenuItem(Icons.help_outline_rounded, 'Pusat Bantuan', () {}),
          _buildMenuItem(Icons.info_outline_rounded, 'Tentang Aplikasi', () {}, isLast: true),
        ],
      ),
    );
  }

  Widget _buildMenuItem(IconData icon, String title, VoidCallback onTap, {bool isLast = false}) {
    return Column(
      children: [
        ListTile(
          onTap: onTap,
          leading: Icon(icon, color: Colors.grey.shade700, size: 22),
          title: Text(title, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 15)),
          trailing: const Icon(Icons.chevron_right_rounded, size: 20),
          contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
        ),
        if (!isLast) const Divider(height: 1, indent: 60, endIndent: 20, color: Colors.black12),
      ],
    );
  }

  Widget _buildLogoutButton(AuthProvider auth) {
    return SizedBox(
      width: double.infinity,
      child: TextButton(
        onPressed: () => auth.logout(),
        style: TextButton.styleFrom(
          foregroundColor: Colors.red,
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: Colors.red),
          ),
        ),
        child: const Text('KELUAR APLIKASI', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1.2)),
      ),
    );
  }
}
