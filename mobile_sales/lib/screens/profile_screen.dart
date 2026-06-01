import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:provider/provider.dart';
import 'package:rana_sales/config/app_theme.dart';
import 'package:rana_sales/providers/auth_provider.dart';
import 'package:rana_sales/config/api_config.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Text('Profil', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // Profile Card
          _buildProfileCard(auth, isDark).animate().fadeIn(duration: 400.ms).slideY(begin: 0.05),
          const SizedBox(height: 24),

          // Stats Row
          _buildStatsRow(isDark).animate().fadeIn(delay: 200.ms),
          const SizedBox(height: 24),

          // Menu Items
          _buildSectionTitle('Informasi'),
          const SizedBox(height: 8),
          _buildMenuItem(
            icon: Icons.business_rounded,
            label: 'Perusahaan',
            value: 'Rana Market Distributor',
            isDark: isDark,
          ).animate().fadeIn(delay: 300.ms),
          _buildMenuItem(
            icon: Icons.wifi_rounded,
            label: 'Server',
            value: ApiConfig.baseUrl,
            isDark: isDark,
          ).animate().fadeIn(delay: 350.ms),
          _buildMenuItem(
            icon: Icons.info_outline_rounded,
            label: 'Versi Aplikasi',
            value: '1.0.0',
            isDark: isDark,
          ).animate().fadeIn(delay: 400.ms),

          const SizedBox(height: 24),
          _buildSectionTitle('Pengaturan'),
          const SizedBox(height: 8),
          _buildMenuItem(
            icon: Icons.dark_mode_outlined,
            label: 'Tema',
            value: 'Mengikuti Sistem',
            isDark: isDark,
          ).animate().fadeIn(delay: 450.ms),

          const SizedBox(height: 32),

          // Logout Button
          _buildLogoutButton(context, auth).animate().fadeIn(delay: 500.ms),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildProfileCard(AuthProvider auth, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: AppTheme.cardGradient,
        borderRadius: BorderRadius.circular(AppTheme.radiusXl),
        boxShadow: [
          BoxShadow(
            color: AppTheme.primaryTeal.withOpacity(0.3),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        children: [
          // Avatar
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.15),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.white.withOpacity(0.2), width: 2),
            ),
            child: Center(
              child: Text(
                auth.userName.isNotEmpty ? auth.userName.substring(0, 2).toUpperCase() : 'RS',
                style: GoogleFonts.outfit(fontSize: 26, fontWeight: FontWeight.bold, color: Colors.white),
              ),
            ),
          ),
          const SizedBox(height: 14),
          Text(
            auth.userName,
            style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
          ),
          const SizedBox(height: 4),
          Text(
            auth.userEmail,
            style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 13),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.15),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.white.withOpacity(0.1)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.badge_outlined, size: 14, color: Colors.white.withOpacity(0.8)),
                const SizedBox(width: 6),
                const Text(
                  'Sales Representative',
                  style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatsRow(bool isDark) {
    return Row(
      children: [
        _buildStatItem('Bulan Ini', '24', 'Kunjungan', AppTheme.primaryTeal, isDark),
        const SizedBox(width: 12),
        _buildStatItem('Order', '12', 'Dibuat', AppTheme.accentIndigo, isDark),
        const SizedBox(width: 12),
        _buildStatItem('ECR', '78%', 'Rate', AppTheme.accentAmber, isDark),
      ],
    );
  }

  Widget _buildStatItem(String title, String value, String subtitle, Color color, bool isDark) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1E293B) : Colors.white,
          borderRadius: BorderRadius.circular(AppTheme.radiusMd),
          border: Border.all(color: isDark ? Colors.grey.shade800 : Colors.grey.shade200),
        ),
        child: Column(
          children: [
            Text(value, style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.bold, color: color)),
            const SizedBox(height: 2),
            Text(subtitle, style: TextStyle(fontSize: 10, color: Colors.grey.shade500)),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 4),
      child: Text(
        title.toUpperCase(),
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: Colors.grey.shade500,
          letterSpacing: 1,
        ),
      ),
    );
  }

  Widget _buildMenuItem({
    required IconData icon,
    required String label,
    required String value,
    required bool isDark,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
        border: Border.all(color: isDark ? Colors.grey.shade800 : Colors.grey.shade200),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: AppTheme.primaryTeal.withOpacity(0.08),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 18, color: AppTheme.primaryTeal),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: TextStyle(fontSize: 11, color: Colors.grey.shade500, fontWeight: FontWeight.w500)),
                const SizedBox(height: 2),
                Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600), overflow: TextOverflow.ellipsis),
              ],
            ),
          ),
          Icon(Icons.chevron_right_rounded, size: 18, color: Colors.grey.shade400),
        ],
      ),
    );
  }

  Widget _buildLogoutButton(BuildContext context, AuthProvider auth) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: () => _confirmLogout(context, auth),
        icon: const Icon(Icons.logout_rounded, color: AppTheme.danger, size: 18),
        label: const Text('Keluar dari Akun', style: TextStyle(color: AppTheme.danger, fontWeight: FontWeight.w600)),
        style: OutlinedButton.styleFrom(
          side: BorderSide(color: AppTheme.danger.withOpacity(0.3)),
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusMd)),
        ),
      ),
    );
  }

  void _confirmLogout(BuildContext context, AuthProvider auth) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Keluar?', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        content: const Text('Anda yakin ingin keluar dari aplikasi?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
          FilledButton(
            onPressed: () {
              Navigator.pop(ctx);
              auth.logout();
            },
            style: FilledButton.styleFrom(backgroundColor: AppTheme.danger),
            child: const Text('Keluar'),
          ),
        ],
      ),
    );
  }
}
