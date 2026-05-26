import 'package:flutter/material.dart';
import 'dart:async';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:provider/provider.dart';
import 'package:rana_merchant/providers/auth_provider.dart';
import 'package:rana_merchant/screens/edit_profile_screen.dart';
import 'package:rana_merchant/screens/printer_settings_screen.dart';
import 'package:rana_merchant/screens/receipt_settings_screen.dart';
import 'package:rana_merchant/screens/privacy_policy_screen.dart';
import 'package:rana_merchant/screens/support_screen.dart';
import 'package:rana_merchant/screens/guideline_screen.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:rana_merchant/data/remote/api_service.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';
import 'package:rana_merchant/services/support_read_service.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:rana_merchant/data/local/database_helper.dart';
import 'package:rana_merchant/services/printer_service.dart';
import 'package:rana_merchant/services/sync_service.dart';
import 'package:rana_merchant/screens/login_screen.dart';
import 'package:rana_merchant/config/theme_config.dart';
import 'package:rana_merchant/services/biometric_service.dart'; // [NEW]
import 'package:rana_merchant/screens/subscription_screen.dart';
import 'package:flutter/services.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  String _version = '1.0.0';
  int _unreadSupportCount = 0;
  bool _autoSyncEnabled = false;
  bool _autoConnectEnabled = false;
  bool _printerConnected = false;
  String? _printerAddress;
  int _productCount = 0;
  int _pendingTxnCount = 0;
  int _pendingExpenseCount = 0;
  bool _online = false;
  DateTime? _lastSyncAt;
  StreamSubscription<Map<String, dynamic>>? _syncSub;
  bool _biometricEnabled = false;
  bool _canUseBiometric = false;

  @override
  void initState() {
    super.initState();
    _loadVersion();
    Future.microtask(_refreshSupportBadge);
    Future.microtask(_loadSettingsAndStatus);
    _syncSub = SyncService().statusStream.listen((status) {
      if (!mounted) return;
      setState(() {
        _online = status['online'] == true;
        final last = status['lastSyncAt']?.toString();
        _lastSyncAt = (last != null && last.isNotEmpty) ? DateTime.tryParse(last) : _lastSyncAt;
      });
    });
    _checkBiometricSupport();
    _refreshProfileSilently();
  }

  Future<void> _refreshProfileSilently() async {
    try {
      await Provider.of<AuthProvider>(context, listen: false).refreshProfile();
    } catch (_) {}
  }

  Future<void> _checkBiometricSupport() async {
    final supported = await BiometricService().isBiometricSupported();
    if (supported && mounted) {
      final enabled = await BiometricService().isBiometricEnabled();
      setState(() {
        _canUseBiometric = true;
        _biometricEnabled = enabled;
      });
    }
  }

  @override
  void dispose() {
    _syncSub?.cancel();
    super.dispose();
  }

  Future<void> _loadVersion() async {
    final info = await PackageInfo.fromPlatform();
    if (mounted) {
      setState(() {
        _version = info.version;
      });
    }
  }

  Future<void> _loadSettingsAndStatus() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _autoSyncEnabled = prefs.getBool('auto_sync_enabled') ?? false;
      _autoConnectEnabled = prefs.getBool('auto_connect_printer') ?? true;
      _printerAddress = prefs.getString('last_printer_address');

      final products = await DatabaseHelper.instance.getAllProducts();
      final pendingTxns = await DatabaseHelper.instance.getPendingTransactions();
      final pendingExpenses = await DatabaseHelper.instance.getPendingExpenses();

      _productCount = products.length;
      _pendingTxnCount = pendingTxns.length;
      _pendingExpenseCount = pendingExpenses.length;
      _printerConnected = PrinterService().isConnected;
      _online = SyncService().isOnline;
      _lastSyncAt = SyncService().lastSyncAt;

      if (_autoSyncEnabled) {
        SyncService().startAutoSync();
      }
      if (_autoConnectEnabled && !_printerConnected) {
        await PrinterService().autoConnect();
        _printerConnected = PrinterService().isConnected;
      }
    } catch (_) {}
    if (mounted) setState(() {});
  }

  Future<void> _toggleAutoSync(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('auto_sync_enabled', value);
    setState(() => _autoSyncEnabled = value);
    if (value) {
      SyncService().startAutoSync();
    } else {
      SyncService().stopAutoSync();
    }
  }

  Future<void> _toggleAutoConnect(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('auto_connect_printer', value);
    setState(() => _autoConnectEnabled = value);
    if (value) {
      try {
        await PrinterService().autoConnect();
        setState(() => _printerConnected = PrinterService().isConnected);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Row(children: [
              Icon(_printerConnected ? Icons.print_rounded : Icons.print_disabled_rounded, color: Colors.white),
              const SizedBox(width: 8),
              Text(_printerConnected ? 'Printer berhasil terhubung!' : 'Gagal auto-connect printer',
                  style: GoogleFonts.outfit(fontWeight: FontWeight.w600)),
            ]),
            backgroundColor: _printerConnected ? const Color(0xFF81B29A) : const Color(0xFFE07A5F),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            duration: const Duration(seconds: 2),
          ));
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Row(children: [
              const Icon(Icons.error_outline_rounded, color: Colors.white),
              const SizedBox(width: 8),
              Expanded(child: Text('Gagal auto-connect: $e',
                  style: GoogleFonts.outfit(fontWeight: FontWeight.w600))),
            ]),
            backgroundColor: Theme.of(context).colorScheme.error,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ));
        }
      }
    }
  }

  Future<void> _connectPrinterNow() async {
    try {
      await PrinterService().autoConnect();
      setState(() => _printerConnected = PrinterService().isConnected);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Row(children: [
            Icon(_printerConnected ? Icons.check_circle_rounded : Icons.print_disabled_rounded, color: Colors.white),
            const SizedBox(width: 8),
            Text(_printerConnected ? 'Printer berhasil terhubung!' : 'Tidak ada printer yang terhubung',
                style: GoogleFonts.outfit(fontWeight: FontWeight.w600)),
          ]),
          backgroundColor: _printerConnected ? const Color(0xFF81B29A) : const Color(0xFFE07A5F),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          duration: const Duration(seconds: 2),
        ));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Row(children: [
            const Icon(Icons.error_outline_rounded, color: Colors.white),
            const SizedBox(width: 8),
            Expanded(child: Text('Gagal menghubungkan: $e',
                style: GoogleFonts.outfit(fontWeight: FontWeight.w600))),
          ]),
          backgroundColor: Theme.of(context).colorScheme.error,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ));
      }
    }
  }

  Future<void> _disconnectPrinter() async {
    try {
      await PrinterService().disconnect();
      setState(() => _printerConnected = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Row(children: [
            const Icon(Icons.link_off_rounded, color: Colors.white),
            const SizedBox(width: 8),
            Text('Koneksi printer diputus', style: GoogleFonts.outfit(fontWeight: FontWeight.w600)),
          ]),
          backgroundColor: const Color(0xFF81B29A),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          duration: const Duration(seconds: 2),
        ));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Row(children: [
            const Icon(Icons.error_outline_rounded, color: Colors.white),
            const SizedBox(width: 8),
            Expanded(child: Text('Gagal memutuskan: $e',
                style: GoogleFonts.outfit(fontWeight: FontWeight.w600))),
          ]),
          backgroundColor: Theme.of(context).colorScheme.error,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ));
      }
    }
  }

  Future<void> _refreshSupportBadge() async {
    try {
      final unread = await SupportReadService().getUnreadCount();
      if (!mounted) return;
      setState(() {
        _unreadSupportCount = unread;
      });
    } catch (_) {}
  }

  String _resolveStoreImageUrl(Map<String, dynamic>? user) {
    if (user == null) return '';
    final keys = [
      'storeImage',
      'storeImageUrl',
      'store_image',
      'imageUrl',
      'logoUrl',
      'photoUrl',
      'logo',
      'photo',
    ];
    for (final key in keys) {
      final value = user[key];
      if (value != null) {
        final s = value.toString().trim();
        if (s.isNotEmpty) {
          if (s.startsWith('http')) return s; // Handle full URLs from demo/etc
          return ApiService().resolveFileUrl(s);
        }
      }
    }
    return '';
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final bool isDarkTheme = colorScheme.brightness == Brightness.dark;
    final List<Color> headerGradientColors = isDarkTheme
        ? [
            colorScheme.surface.withOpacity(0.98),
            colorScheme.surface.withOpacity(0.94),
          ]
        : [
            colorScheme.primary.withOpacity(0.9),
            colorScheme.primary.withOpacity(0.8),
          ];

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: Consumer<AuthProvider>(
        builder: (context, auth, _) {
          final user = auth.currentUser;
          final businessName = (user?['businessName'] ?? user?['store_name'] ?? user?['name'] ?? 'Toko Saya').toString();
          final ownerName = user?['ownerName'] ?? user?['owner_name'] ?? user?['name'] ?? user?['full_name'] ?? 'Pemilik Toko';
          final initial =
              businessName.isNotEmpty ? businessName[0].toUpperCase() : 'T';
          final storeImageUrl = _resolveStoreImageUrl(user);

          return CustomScrollView(
            slivers: [
              // 1. Professional App Bar
              SliverAppBar(
                pinned: true,
                backgroundColor: Colors.transparent,
                elevation: 0,
                centerTitle: true,
                flexibleSpace: Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: headerGradientColors,
                    ),
                  ),
                ),
                title: Text(
                  'Pengaturan',
                  style: GoogleFonts.outfit(
                      color: Theme.of(context).colorScheme.onPrimary,
                      fontWeight: FontWeight.bold),
                ),
                actions: [
                  IconButton(
                    icon: Icon(Icons.logout_rounded,
                        color: Theme.of(context).colorScheme.onPrimary),
                    tooltip: 'Keluar',
                    onPressed: () => _confirmLogout(context),
                  )
                ],
              ),

              // 2. Profile Header Card
              SliverToBoxAdapter(
                child: Container(
                  margin: const EdgeInsets.all(20),
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        Theme.of(context).colorScheme.surface.withOpacity(0.98),
                        Theme.of(context).colorScheme.surface.withOpacity(0.94),
                      ],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: Theme.of(context)
                          .colorScheme
                          .outline
                          .withOpacity(0.18),
                      width: 1.5,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Theme.of(context)
                            .colorScheme
                            .primary
                            .withOpacity(0.05),
                        blurRadius: 20,
                        offset: const Offset(0, 10),
                      )
                    ],
                  ),
                  child: Row(
                    children: [
                      Hero(
                        tag: 'profile_image',
                        child: Container(
                          width: 80,
                          height: 80,
                          decoration: BoxDecoration(
                            color: Theme.of(context)
                                .colorScheme
                                .primary
                                .withOpacity(0.1),
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: Theme.of(context).colorScheme.primary.withOpacity(0.2),
                              width: 2,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.1),
                                blurRadius: 10,
                                offset: const Offset(0, 4),
                              )
                            ],
                            image: storeImageUrl.isNotEmpty
                                ? DecorationImage(
                                    image: NetworkImage(storeImageUrl),
                                    fit: BoxFit.cover,
                                  )
                                : null,
                          ),
                          alignment: Alignment.center,
                          child: storeImageUrl.isEmpty
                              ? Text(
                                  initial,
                                  style: GoogleFonts.outfit(
                                      fontSize: 32,
                                      fontWeight: FontWeight.bold,
                                      color:
                                          Theme.of(context).colorScheme.primary),
                                )
                              : null,
                        ),
                      ),
                      const SizedBox(width: 20),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Text(
                                          businessName,
                                          style: GoogleFonts.outfit(
                                              fontSize: 22,
                                              fontWeight: FontWeight.bold,
                                              color:
                                                  Theme.of(context).colorScheme.onSurface),
                                        ),
                                        const SizedBox(width: 6),
                                        Icon(Icons.verified, size: 18, color: Colors.blue.shade400),
                                      ],
                                    ),
                                  ),
                                if ((user?['subscriptionStatus'] ?? 'FREE') == 'PREMIUM')
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF2CC8F).withOpacity(0.2),
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(color: const Color(0xFFF2CC8F), width: 1),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const Icon(Icons.stars_rounded, size: 14, color: Color(0xFFF2CC8F)),
                                        const SizedBox(width: 4),
                                        Text('PRO', 
                                          style: GoogleFonts.outfit(
                                            fontSize: 10, 
                                            fontWeight: FontWeight.bold,
                                            color: const Color(0xFFF2CC8F),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              ownerName,
                              style: GoogleFonts.outfit(
                                  fontSize: 14,
                                  color: Theme.of(context)
                                      .colorScheme
                                      .onSurface
                                      .withOpacity(0.7)),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              [
                                if (user?['email'] != null && user!['email'].toString().isNotEmpty) user!['email'],
                                if ((user?['waNumber'] ?? user?['phone']) != null) (user?['waNumber'] ?? user?['phone']).toString()
                              ].join(' • '),
                              style: GoogleFonts.outfit(
                                  fontSize: 12,
                                  color: Theme.of(context)
                                      .colorScheme
                                      .onSurface
                                      .withOpacity(0.5)),
                            ),
                            const SizedBox(height: 12),
                            InkWell(
                              onTap: () async {
                                final auth = Provider.of<AuthProvider>(context, listen: false);
                                try {
                                  await auth.refreshProfile();
                                } catch (_) {}
                                final latest = auth.currentUser ?? user ?? {};
                                if (!context.mounted) return;
                                Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                        builder: (_) => EditProfileScreen(
                                            initialData: latest))).then((value) {
                                              if (value == true) _loadSettingsAndStatus();
                                            });
                              },
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                decoration: BoxDecoration(
                                  color: Theme.of(context).colorScheme.primary.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      'Edit Profil',
                                      style: GoogleFonts.outfit(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w600,
                                          color: Theme.of(context)
                                              .colorScheme
                                              .primary),
                                    ),
                                    const SizedBox(width: 4),
                                    Icon(Icons.edit_rounded,
                                        size: 14,
                                        color:
                                            Theme.of(context).colorScheme.primary)
                                  ],
                                ),
                              ),
                            )
                          ],
                        ),
                      )
                    ],
                  ),
                ),
              ),

              // 2.1 Profile Completeness & Stats Dash
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Column(
                    children: [
                      _buildProfileCompleteness(user),
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        decoration: BoxDecoration(
                          color: colorScheme.surfaceVariant.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: colorScheme.outlineVariant.withOpacity(0.5)),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                          children: [
                            _buildMiniStat('Produk', _productCount.toString(), Icons.inventory_2_outlined),
                            _buildVerticalDivider(),
                            _buildMiniStat('Rating', '4.8', Icons.star_outline_rounded),
                            _buildVerticalDivider(),
                            _buildMiniStat('Tingkat', (user?['subscriptionStatus'] ?? 'FREE'), Icons.workspace_premium_outlined),
                          ],
                        ),
                      ),
                      const SizedBox(height: 10),
                    ],
                  ),
                ),
              ),

              // 2b. Store Status Card
              SliverToBoxAdapter(
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 20),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        Theme.of(context).colorScheme.surface.withOpacity(0.98),
                        Theme.of(context).colorScheme.surface.withOpacity(0.94),
                      ],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                        color: Theme.of(context).colorScheme.outline.withOpacity(0.18),
                        width: 1.5),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Status Toko',
                          style: GoogleFonts.outfit(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: Theme.of(context).colorScheme.onSurface)),
                      const SizedBox(height: 12),
                      _buildDetailRow(Icons.category_outlined, 'Kategori', (user?['category'] ?? '-').toString(), context),
                      const SizedBox(height: 8),
                      _buildDetailRow(Icons.location_on_outlined, 'Alamat', (user?['address'] ?? '-').toString(), context),
                      const SizedBox(height: 16),
                      Divider(color: Theme.of(context).colorScheme.outline.withOpacity(0.1)),
                      const SizedBox(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Status Sistem',
                              style: GoogleFonts.outfit(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                  color: Theme.of(context).colorScheme.onSurface.withOpacity(0.7))),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: _statusChip(
                              icon: Icons.inventory_2_rounded,
                              label: 'Produk',
                              value: _productCount.toString(),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: _statusChip(
                              icon: Icons.sync_problem_rounded,
                              label: 'Pending Transaksi',
                              value: _pendingTxnCount.toString(),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: _statusChip(
                              icon: Icons.receipt_long_rounded,
                              label: 'Pending Biaya',
                              value: _pendingExpenseCount.toString(),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: _statusChip(
                              icon: _online ? Icons.wifi_rounded : Icons.wifi_off_rounded,
                              label: 'Koneksi',
                              value: _online ? 'Online' : 'Offline',
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: _statusChip(
                              icon: Icons.update_rounded,
                              label: 'Sinkronisasi',
                              value: _lastSyncAt != null
                                  ? DateFormat('dd MMM yyyy HH:mm', 'id_ID').format(_lastSyncAt!)
                                  : 'Belum',
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: _statusChip(
                              icon: _printerConnected ? Icons.print_rounded : Icons.print_disabled_rounded,
                              label: 'Printer',
                              value: _printerConnected
                                  ? (_printerAddress ?? 'Terhubung')
                                  : 'Tidak Terhubung',
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text('Auto Sync',
                                    style: GoogleFonts.outfit(
                                        color: Theme.of(context).colorScheme.onSurface)),
                                Switch(
                                  value: _autoSyncEnabled,
                                  onChanged: _toggleAutoSync,
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: TextButton.icon(
                              onPressed: () async {
                                try {
                                  await SyncService().syncTransactions();
                                  if (!mounted) return;
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('Sinkronisasi dimulai')),
                                  );
                                } catch (e) {
                                  if (!mounted) return;
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text('Gagal sinkronisasi: $e'),
                                      backgroundColor: Theme.of(context).colorScheme.error,
                                    ),
                                  );
                                }
                              },
                              icon: const Icon(Icons.sync_rounded),
                              label: const Text('Sinkronkan Sekarang'),
                            ),
                          ),
                        ],
                      )
                    ],
                  ),
                ),
              ),

              // 3. Settings Groups
              SliverList(
                delegate: SliverChildListDelegate([
                  _buildSectionHeader('Toko & Perangkat'),
                  _buildReferralCard(),
                  _buildSettingsGroup([
                    if (_canUseBiometric)
                      _buildSettingsItem(
                        icon: Icons.fingerprint,
                        title: 'Login Biometrik',
                        subtitle: 'Masuk dengan sidik jari/wajah',
                        trailing: Switch(
                          value: _biometricEnabled,
                          onChanged: (val) async {
                            final success = await BiometricService().authenticate(reason: 'Verifikasi untuk mengubah pengaturan');
                            if (success) {
                              await BiometricService().setBiometricEnabled(val);
                              setState(() => _biometricEnabled = val);
                            }
                          },
                        ),
                      ),
                    if (_canUseBiometric) _buildDivider(),
                    _buildSettingsItem(
                      icon: Icons.print_rounded,
                      title: 'Printer Bluetooth',
                      subtitle: 'Atur koneksi printer struk',
                      onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (_) => const PrinterSettingsScreen())),
                    ),
                    _buildDivider(),
                    _buildSettingsItem(
                      icon: Icons.link_rounded,
                      title: 'Auto-connect Printer',
                      subtitle: 'Hubungkan otomatis ke printer terakhir',
                      trailing: Switch(
                        value: _autoConnectEnabled,
                        onChanged: _toggleAutoConnect,
                      ),
                    ),
                    _buildDivider(),
                    _buildSettingsItem(
                      icon: Icons.sync_rounded,
                      title: 'Hubungkan Sekarang',
                      subtitle: 'Coba koneksi ke printer',
                      onTap: _connectPrinterNow,
                    ),
                    _buildDivider(),
                    _buildSettingsItem(
                      icon: Icons.link_off_rounded,
                      title: 'Putuskan Koneksi Printer',
                      onTap: _disconnectPrinter,
                    ),
                    _buildDivider(),
                    _buildSettingsItem(
                      icon: Icons.receipt_long_rounded,
                      title: 'Pengaturan Struk',
                      subtitle: 'Ukuran kertas, footer, dll',
                      onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (_) => const ReceiptSettingsScreen())),
                    ),
                  ]),
                  _buildSectionHeader('Informasi & Bantuan'),
                  _buildSettingsGroup([
                    _buildSettingsItem(
                      icon: Icons.workspace_premium_rounded,
                      title: 'Paket Berlangganan',
                      subtitle: 'Atur membership & fitur premium',
                      onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (_) => const SubscriptionScreen())),
                    ),
                    _buildDivider(),
                    _buildSettingsItem(
                      icon: Icons.menu_book_rounded,
                      title: 'Panduan Pengguna',
                      subtitle: 'Cara penggunaan aplikasi',
                      onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (_) => const GuidelineScreen())),
                    ),
                    _buildDivider(),
                    _buildSettingsItem(
                      icon: Icons.privacy_tip_outlined,
                      title: 'Kebijakan Privasi',
                      onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (_) => const PrivacyPolicyScreen())),
                    ),
                    _buildDivider(),
                    _buildSettingsItem(
                      icon: Icons.support_agent_rounded,
                      title: 'Hubungi Bantuan',
                      subtitle: 'Pusat Bantuan & Chat Admin',
                      badgeCount: _unreadSupportCount,
                      onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                  builder: (_) => const SupportScreen()))
                          .then((_) => _refreshSupportBadge()),
                    ),
                    _buildDivider(),
                    _buildSettingsItem(
                      icon: Icons.info_outline_rounded,
                      title: 'Versi Aplikasi',
                      trailing: Text('v$_version',
                          style: GoogleFonts.outfit(
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurface
                                  .withOpacity(0.6))),
                    ),
                  ]),
                  const SizedBox(height: 40),
                  Center(
                    child: Text(
                      'Rana Merchant App\nMade with ❤️ for UMKM',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.outfit(
                          color: Theme.of(context)
                              .colorScheme
                              .onSurface
                              .withOpacity(0.4),
                          fontSize: 12),
                    ),
                  ),
                  const SizedBox(height: 40),
                ]),
              )
            ],
          );
        },
      ),
    );
  }

  Widget _buildProfileCompleteness(Map<String, dynamic>? user) {
    if (user == null) return const SizedBox.shrink();
    
    int completed = 0;
    final fields = ['businessName', 'name', 'address', 'waNumber', 'email'];
    for (var f in fields) {
      if (user[f] != null && user[f].toString().isNotEmpty) completed++;
    }
    if (_resolveStoreImageUrl(user).isNotEmpty) completed++;
    
    double progress = completed / 6.0;
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorScheme.surfaceVariant.withOpacity(0.15),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colorScheme.outlineVariant.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Kelengkapan Profil',
                style: GoogleFonts.outfit(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: colorScheme.onSurface,
                ),
              ),
              Text(
                '${(progress * 100).toInt()}%',
                style: GoogleFonts.outfit(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: colorScheme.primary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 8,
              backgroundColor: colorScheme.surfaceVariant,
              valueColor: AlwaysStoppedAnimation<Color>(colorScheme.primary),
            ),
          ),
          if (progress < 1.0) ...[
            const SizedBox(height: 8),
            Text(
              'Lengkapi profil untuk fitur lebih lengkap',
              style: GoogleFonts.outfit(
                fontSize: 11,
                color: colorScheme.onSurface.withOpacity(0.5),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildReferralActionButton({
    required String label,
    required IconData icon,
    required VoidCallback onPressed,
    required BuildContext context,
    bool isPrimary = false,
  }) {
    final colorScheme = Theme.of(context).colorScheme;
    return ElevatedButton.icon(
      onPressed: onPressed,
      icon: Icon(icon, size: 16),
      label: Text(label),
      style: ElevatedButton.styleFrom(
        backgroundColor: isPrimary ? colorScheme.primary : colorScheme.surfaceVariant.withOpacity(0.5),
        foregroundColor: isPrimary ? colorScheme.onPrimary : colorScheme.onSurfaceVariant,
        elevation: 0,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  Widget _buildVerticalDivider() {
    return Container(
      height: 30,
      width: 1,
      color: Theme.of(context).colorScheme.outlineVariant.withOpacity(0.5),
    );
  }

  Widget _buildDetailRow(IconData icon, String label, String value, BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 16, color: Theme.of(context).colorScheme.primary.withOpacity(0.7)),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: GoogleFonts.outfit(
                  fontSize: 11,
                  color: Theme.of(context).colorScheme.onSurface.withOpacity(0.5),
                ),
              ),
              Text(
                value,
                style: GoogleFonts.outfit(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: Theme.of(context).colorScheme.onSurface,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildMiniStat(String label, String value, IconData icon) {
    final colorScheme = Theme.of(context).colorScheme;
    return Column(
      children: [
        Icon(icon, size: 18, color: colorScheme.primary.withOpacity(0.7)),
        const SizedBox(height: 4),
        Text(
          value,
          style: GoogleFonts.outfit(
            fontSize: 14,
            fontWeight: FontWeight.bold,
            color: colorScheme.onSurface,
          ),
        ),
        Text(
          label,
          style: GoogleFonts.outfit(
            fontSize: 10,
            color: colorScheme.onSurface.withOpacity(0.5),
          ),
        ),
      ],
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 8, 24, 12),
      child: Text(
        title.toUpperCase(),
        style: GoogleFonts.outfit(
            fontSize: 12,
            fontWeight: FontWeight.bold,
            letterSpacing: 1.2,
            color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6)),
      ),
    );
  }

  Widget _buildSettingsGroup(List<Widget> children) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Theme.of(context).colorScheme.surface.withOpacity(0.98),
            Theme.of(context).colorScheme.surface.withOpacity(0.94),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
            color: Theme.of(context).colorScheme.outline.withOpacity(0.18),
            width: 1.5),
      ),
      child: Column(children: children),
    );
  }

  Widget _statusChip({required IconData icon, required String label, required String value}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceVariant,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(icon, size: 18, color: Theme.of(context).colorScheme.onSurface.withOpacity(0.8)),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: GoogleFonts.outfit(
                        fontSize: 11,
                        color: Theme.of(context).colorScheme.onSurface.withOpacity(0.7))),
                Text(value,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.outfit(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Theme.of(context).colorScheme.onSurface)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReferralCard() {
    final currency =
        NumberFormat.simpleCurrency(locale: 'id_ID', decimalDigits: 0);
    return FutureBuilder<Map<String, dynamic>>(
      future: ApiService().getReferralInfo(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    Theme.of(context).colorScheme.surface.withOpacity(0.98),
                    Theme.of(context).colorScheme.surface.withOpacity(0.94),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                    color:
                        Theme.of(context).colorScheme.outline.withOpacity(0.18),
                    width: 1.5),
              ),
              child: Row(
                children: [
                  const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    'Memuat informasi referral...',
                    style: GoogleFonts.outfit(
                        fontSize: 13,
                        color: Theme.of(context)
                            .colorScheme
                            .onSurface
                            .withOpacity(0.7)),
                  ),
                ],
              ),
            ),
          );
        }

        if (snapshot.hasError || !snapshot.hasData) {
          return const SizedBox.shrink();
        }

        final data = snapshot.data ?? {};
        final code = (data['code'] ?? '').toString();
        final program = data['program'] is Map<String, dynamic>
            ? data['program'] as Map<String, dynamic>
            : <String, dynamic>{};
        final stats = data['stats'] is Map<String, dynamic>
            ? data['stats'] as Map<String, dynamic>
            : <String, dynamic>{};

        if (code.isEmpty) {
          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    Theme.of(context).colorScheme.surface.withOpacity(0.98),
                    Theme.of(context).colorScheme.surface.withOpacity(0.94),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                    color:
                        Theme.of(context).colorScheme.outline.withOpacity(0.18),
                    width: 1.5),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Program Referral',
                    style: GoogleFonts.outfit(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Theme.of(context).colorScheme.onSurface),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Belum ada kode referral aktif untuk toko ini.',
                    style: GoogleFonts.outfit(
                        fontSize: 13,
                        color: Theme.of(context)
                            .colorScheme
                            .onSurface
                            .withOpacity(0.7)),
                  ),
                ],
              ),
            ),
          );
        }

        final totalReferrals = (stats['totalReferrals'] ?? 0).toString();
        final totalReleased =
            double.tryParse((stats['totalRewardReleased'] ?? 0).toString()) ??
                0;
        final programName = program['name']?.toString() ?? '';
        final shareText =
            'Daftar Rana POS pakai kode referral $code untuk dapat saldo wallet.';

        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  Theme.of(context).colorScheme.surface.withOpacity(0.98),
                  Theme.of(context).colorScheme.surface.withOpacity(0.94),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                  color:
                      Theme.of(context).colorScheme.outline.withOpacity(0.18),
                  width: 1.5),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Program Referral',
                  style: GoogleFonts.outfit(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: Theme.of(context).colorScheme.onSurface),
                ),
                if (programName.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    programName,
                    style: GoogleFonts.outfit(
                        fontSize: 13,
                        color: Theme.of(context)
                            .colorScheme
                            .onSurface
                            .withOpacity(0.7)),
                  ),
                ],
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Kode Referral',
                          style: GoogleFonts.outfit(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurface
                                  .withOpacity(0.6)),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          code,
                          style: GoogleFonts.outfit(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 2,
                              color: Theme.of(context).colorScheme.primary),
                        ),
                      ],
                    ),
                    Row(
                      children: [
                        _buildReferralActionButton(
                          label: 'Salin',
                          icon: Icons.copy_rounded,
                          onPressed: () {
                            // Copy to clipboard
                            Clipboard.setData(ClipboardData(text: code));
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Kode referral disalin!')),
                            );
                          },
                          context: context,
                        ),
                        const SizedBox(width: 8),
                        _buildReferralActionButton(
                          label: 'Bagikan',
                          icon: Icons.share_rounded,
                          isPrimary: true,
                          onPressed: () {
                            Share.share(shareText);
                          },
                          context: context,
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildReferralStat('Total Referral', totalReferrals, context),
                        const SizedBox(height: 12),
                        _buildReferralStat('Reward Cair', currency.format(totalReleased), context),
                      ],
                    ),
                    TextButton.icon(
                      onPressed: _showReferralsDialog,
                      icon: const Icon(Icons.list_alt_rounded, size: 18),
                      label: const Text('Lihat Detail'),
                      style: TextButton.styleFrom(
                        foregroundColor: Theme.of(context).colorScheme.primary,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildReferralStat(String label, String value, BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.outfit(
              fontSize: 11,
              color: Theme.of(context)
                  .colorScheme
                  .onSurface
                  .withOpacity(0.6)),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: GoogleFonts.outfit(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: Theme.of(context).colorScheme.onSurface),
        ),
      ],
    );
  }

  void _showReferralsDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        height: MediaQuery.of(context).size.height * 0.7,
        decoration: BoxDecoration(
          color: Theme.of(context).scaffoldBackgroundColor,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            Container(
              margin: const EdgeInsets.symmetric(vertical: 12),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.withOpacity(0.3),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              child: Row(
                children: [
                  Text(
                    'Referral Saya',
                    style: GoogleFonts.outfit(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    onPressed: () => Navigator.pop(ctx),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
            ),
            Expanded(
              child: FutureBuilder<List<dynamic>>(
                future: ApiService().getMyReferrals(),
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (snapshot.hasError || snapshot.data == null || snapshot.data!.isEmpty) {
                    return Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.people_outline_rounded, size: 64, color: Colors.grey.withOpacity(0.5)),
                          const SizedBox(height: 16),
                          Text(
                            'Belum ada referral',
                            style: GoogleFonts.outfit(color: Colors.grey),
                          ),
                        ],
                      ),
                    );
                  }

                  final referrals = snapshot.data!;
                  return ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: referrals.length,
                    itemBuilder: (context, index) {
                      final item = referrals[index];
                      final name = item['businessName'] ?? item['name'] ?? 'Toko Baru';
                      final date = item['createdAt'] != null 
                        ? DateFormat('dd MMM yyyy').format(DateTime.parse(item['createdAt'].toString()))
                        : '-';
                      
                      return Card(
                        elevation: 0,
                        color: Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.3),
                        margin: const EdgeInsets.only(bottom: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: Theme.of(context).colorScheme.primary.withOpacity(0.1),
                            backgroundImage: _resolveStoreImageUrl(item).isNotEmpty 
                              ? NetworkImage(_resolveStoreImageUrl(item)) 
                              : null,
                            child: _resolveStoreImageUrl(item).isEmpty 
                              ? Text(name[0].toUpperCase(), style: TextStyle(color: Theme.of(context).colorScheme.primary))
                              : null,
                          ),
                          title: Text(name, style: GoogleFonts.outfit(fontWeight: FontWeight.w600)),
                          subtitle: Text('Terdaftar pada $date', style: GoogleFonts.outfit(fontSize: 12)),
                          trailing: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.green.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Text('Aktif', style: TextStyle(color: Colors.green, fontSize: 10, fontWeight: FontWeight.bold)),
                          ),
                        ),
                      );
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSettingsItem({
    required IconData icon,
    required String title,
    String? subtitle,
    Widget? trailing,
    VoidCallback? onTap,
    int? badgeCount,
  }) {
    return ListTile(
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
      leading: Stack(
        clipBehavior: Clip.none,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surfaceVariant,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon,
                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.8),
                size: 20),
          ),
          if (badgeCount != null && badgeCount > 0)
            Positioned(
              right: -4,
              top: -4,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primary,
                  borderRadius: BorderRadius.circular(999),
                ),
                constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
                child: Center(
                  child: Text(
                    badgeCount > 99 ? '99+' : badgeCount.toString(),
                    style: GoogleFonts.outfit(
                      color: Theme.of(context).colorScheme.onPrimary,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
      title: Text(title,
          style: GoogleFonts.outfit(
              fontSize: 16,
              fontWeight: FontWeight.w500,
              color: Theme.of(context).colorScheme.onSurface)),
      subtitle: subtitle != null
          ? Text(subtitle,
              style: GoogleFonts.outfit(
                  fontSize: 13,
                  color:
                      Theme.of(context).colorScheme.onSurface.withOpacity(0.7)))
          : null,
      trailing: trailing ??
          Icon(Icons.arrow_forward_ios,
              size: 14,
              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.4)),
    );
  }

  Widget _buildDivider() {
    return Divider(
        height: 1,
        thickness: 1,
        color: Theme.of(context).colorScheme.outlineVariant);
  }

  void _confirmLogout(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Konfirmasi'),
        content: const Text('Apakah Anda yakin ingin keluar dari aplikasi?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Batal'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              Provider.of<AuthProvider>(context, listen: false).logout().then((_) {
                if (!context.mounted) return;
                Navigator.pushAndRemoveUntil(
                  context,
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                  (route) => false,
                );
              });
            },
            style: TextButton.styleFrom(
                foregroundColor: Theme.of(context).colorScheme.primary),
            child: const Text('Keluar'),
          ),
        ],
      ),
    );
  }
}
