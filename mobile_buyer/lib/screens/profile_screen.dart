import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:rana_market/config/theme_config.dart';
import 'package:rana_market/providers/auth_provider.dart';
import 'package:rana_market/screens/login_screen.dart';
import 'package:rana_market/screens/register_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:rana_market/screens/orders_screen.dart';
import 'package:rana_market/screens/market_favorites_screen.dart';
import 'package:rana_market/screens/voucher_screen.dart';
import 'package:rana_market/screens/address_screen.dart';
import 'package:rana_market/screens/help_center_screen.dart';
import 'package:rana_market/screens/loyalty_exchange_screen.dart';
import 'package:rana_market/screens/ride_history_screen.dart';


class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  String? _buyerName;
  String? _buyerPhone;
  int _userPoints = 0;
  bool _loadingPrefs = true;

  @override
  void initState() {
    super.initState();
    _loadBuyerContact();
    _loadPoints();
  }

  Future<void> _loadPoints() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _userPoints = prefs.getInt('user_points') ?? 0;
    });
  }

  Future<void> _loadBuyerContact() async {
    final prefs = await SharedPreferences.getInstance();
    final name = prefs.getString('buyer_name')?.trim();
    final phone = prefs.getString('buyer_phone')?.trim();
    if (!mounted) return;
    setState(() {
      _buyerName = (name != null && name.isNotEmpty) ? name : null;
      _buyerPhone = (phone != null && phone.isNotEmpty) ? phone : null;
      _loadingPrefs = false;
    });
  }

  Future<void> _openContactEditor() async {
    final nameCtrl = TextEditingController(text: _buyerName ?? '');
    final phoneCtrl = TextEditingController(text: _buyerPhone ?? '');

    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) {
        bool saving = false;
        return StatefulBuilder(
          builder: (context, setLocal) {
            return AlertDialog(
              title: const Text('Kontak Pesanan'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: nameCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Nama',
                      border: OutlineInputBorder(),
                    ),
                    textInputAction: TextInputAction.next,
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: phoneCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Nomor WhatsApp',
                      border: OutlineInputBorder(),
                    ),
                    keyboardType: TextInputType.phone,
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: saving ? null : () => Navigator.pop(ctx, false),
                  child: const Text('Batal'),
                ),
                FilledButton(
                  onPressed: saving
                      ? null
                      : () async {
                          final phone = phoneCtrl.text.trim();
                          final name = nameCtrl.text.trim();
                          if (phone.isEmpty) return;
                          setLocal(() => saving = true);
                          final prefs = await SharedPreferences.getInstance();
                          await prefs.setString('buyer_phone', phone);
                          if (name.isNotEmpty) {
                            await prefs.setString('buyer_name', name);
                          } else {
                            await prefs.remove('buyer_name');
                          }
                          if (mounted) {
                            setState(() {
                              _buyerPhone = phone;
                              _buyerName = name.isNotEmpty ? name : null;
                            });
                          }
                          if (context.mounted) Navigator.pop(ctx, true);
                        },
                  child: const Text('Simpan'),
                ),
              ],
            );
          },
        );
      },
    );

    nameCtrl.dispose();
    phoneCtrl.dispose();

    if (result == true && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Kontak pesanan diperbarui')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.user;

    if (!auth.isAuthenticated) {
      return _buildUnauthenticated();
    }

    return _buildAuthenticated(user, auth);
  }

  Widget _buildUnauthenticated() {
    final scale = ThemeConfig.tabletScale(context, mobile: 1.0);
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [ThemeConfig.brandColor.withValues(alpha: 0.1), Colors.white],
          ),
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: EdgeInsets.all(24 * scale),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                SizedBox(height: 40 * scale),
                Container(
                  padding: EdgeInsets.all(32 * scale),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(color: ThemeConfig.brandColor.withValues(alpha: 0.2), blurRadius: 40, offset: const Offset(0, 15))
                    ]
                  ),
                  child: Icon(Icons.lock_person_rounded, size: 80 * scale, color: ThemeConfig.brandColor)
                ).animate().scale(curve: Curves.easeOutBack, duration: 800.ms),
                SizedBox(height: 40 * scale),
                Text('Eksplorasi Tanpa Batas', style: TextStyle(fontSize: 26 * scale, fontWeight: FontWeight.bold, color: Colors.black87)).animate().fadeIn(delay: 200.ms).slideY(begin: 0.2),
                SizedBox(height: 12 * scale),
                Text('Masuk atau daftar sekarang untuk menikmati fitur belanja tercanggih, melacak pesanan, dan mendapatkan rekomendasi pintar.', textAlign: TextAlign.center, style: TextStyle(fontSize: 14 * scale, color: Colors.grey.shade600, height: 1.5)).animate().fadeIn(delay: 300.ms).slideY(begin: 0.2),
                SizedBox(height: 48 * scale),
                _buildContactCard(scale),
                SizedBox(height: 32 * scale),
                Container(
                  width: double.infinity,
                  height: 56 * scale,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(colors: [ThemeConfig.brandColor, Color(0xFFFFA07A)]),
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [BoxShadow(color: ThemeConfig.brandColor.withValues(alpha: 0.3), blurRadius: 15, offset: const Offset(0, 8))]
                  ),
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.transparent,
                      shadowColor: Colors.transparent,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                    onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const LoginScreen())),
                    child: Text('Masuk Sekarang', style: TextStyle(fontSize: 16 * scale, fontWeight: FontWeight.bold, color: Colors.white)),
                  ),
                ).animate().fadeIn(delay: 400.ms).slideY(begin: 0.2),
                SizedBox(height: 16 * scale),
                SizedBox(
                  width: double.infinity,
                  height: 56 * scale,
                  child: OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(color: ThemeConfig.brandColor.withValues(alpha: 0.5), width: 1.5),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                    onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const RegisterScreen())),
                    child: Text('Daftar Akun Baru', style: TextStyle(fontSize: 16 * scale, fontWeight: FontWeight.bold, color: ThemeConfig.brandColor)),
                  ),
                ).animate().fadeIn(delay: 500.ms).slideY(begin: 0.2),
              ]
            )
          )
        )
      )
    );
  }

  Widget _buildContactCard(double scale) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 15, offset: const Offset(0, 8))],
        border: Border.all(color: Colors.grey.shade100)
      ),
      child: ListTile(
        contentPadding: EdgeInsets.symmetric(horizontal: 20 * scale, vertical: 8 * scale),
        leading: Container(
           padding: EdgeInsets.all(10 * scale),
           decoration: BoxDecoration(color: ThemeConfig.brandColor.withValues(alpha: 0.1), shape: BoxShape.circle),
           child: Icon(Icons.phone_in_talk_rounded, color: ThemeConfig.brandColor, size: 24 * scale)
        ),
        title: Text('Kontak Pesanan Tamu', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14 * scale)),
        subtitle: Padding(
           padding: const EdgeInsets.only(top: 4),
           child: _loadingPrefs ? Text('Memuat...', style: TextStyle(fontSize: 12 * scale)) : Text(
               [
                 if ((_buyerName ?? '').isNotEmpty) _buyerName!,
                 if ((_buyerPhone ?? '').isNotEmpty) _buyerPhone!,
               ].join(' • ').isEmpty ? 'Belum diatur' : [
                 if ((_buyerName ?? '').isNotEmpty) _buyerName!,
                 if ((_buyerPhone ?? '').isNotEmpty) _buyerPhone!,
               ].join(' • '),
               style: TextStyle(fontSize: 13 * scale, color: ThemeConfig.brandColor)
           )
        ),
        trailing: Icon(Icons.chevron_right_rounded, color: Colors.grey.shade400),
        onTap: () => _openContactEditor(),
      ),
    ).animate().fadeIn(delay: 350.ms).slideY(begin: 0.2);
  }

  Widget _buildAuthenticated(Map<String, dynamic>? user, AuthProvider auth) {
    final scale = ThemeConfig.tabletScale(context, mobile: 1.0);
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Stack(
              clipBehavior: Clip.none,
              alignment: Alignment.topCenter,
              children: [
                // Glassmorphic Header Background
                Container(
                  height: 340 * scale,
                  width: double.infinity,
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      colors: [ThemeConfig.brandColor, Color(0xFFFFA07A)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.vertical(bottom: Radius.circular(50)),
                  ),
                  child: Stack(
                     children: [
                        Positioned(top: -50, right: -50, child: Container(width: 250, height: 250, decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.1), shape: BoxShape.circle))),
                        Positioned(bottom: -100, left: -50, child: Container(width: 300, height: 300, decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.1), shape: BoxShape.circle))),
                        SafeArea(
                           child: Center(
                             child: Column(
                               mainAxisSize: MainAxisSize.min,
                               children: [
                                 SizedBox(height: 20 * scale),
                                 // Avatar with glowing ring
                                 Container(
                                    padding: EdgeInsets.all(4 * scale),
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      border: Border.all(color: Colors.white.withValues(alpha: 0.6), width: 2),
                                      boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.2), blurRadius: 20, offset: const Offset(0, 10))]
                                    ),
                                    child: CircleAvatar(
                                      radius: 46 * scale,
                                      backgroundColor: Colors.white,
                                      child: Text(
                                        (user?['name'] ?? 'P').substring(0, 1).toUpperCase(),
                                        style: TextStyle(fontSize: 32 * scale, fontWeight: FontWeight.bold, color: ThemeConfig.brandColor),
                                      ),
                                    ),
                                  ).animate().scale(curve: Curves.easeOutBack, duration: 600.ms),
                                  SizedBox(height: 16 * scale),
                                  Text(
                                    user?['name'] ?? 'Pengguna Rana',
                                    style: TextStyle(fontSize: 22 * scale, fontWeight: FontWeight.bold, color: Colors.white, shadows: const [Shadow(color: Colors.black26, blurRadius: 4, offset: Offset(0,2))]),
                                  ).animate().fadeIn(delay: 200.ms).slideY(begin: 0.2),
                                  SizedBox(height: 4 * scale),
                                  Text(
                                    user?['email'] ?? '-',
                                    style: TextStyle(fontSize: 14 * scale, color: Colors.white.withValues(alpha: 0.9)),
                                  ).animate().fadeIn(delay: 300.ms).slideY(begin: 0.2),
                                  SizedBox(height: 4 * scale),
                                  Container(
                                     margin: const EdgeInsets.only(top: 8),
                                     padding: EdgeInsets.symmetric(horizontal: 14 * scale, vertical: 6 * scale),
                                     decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(20)),
                                     child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Icon(Icons.phone_iphone_rounded, color: Colors.white, size: 14 * scale),
                                          SizedBox(width: 6 * scale),
                                          Text((user?['phone'] ?? user?['phoneNumber'] ?? '-').toString(), style: TextStyle(color: Colors.white, fontSize: 13 * scale, fontWeight: FontWeight.w600)),
                                        ]
                                     )
                                  ).animate().fadeIn(delay: 400.ms).slideY(begin: 0.2),
                               ]
                             ),
                           )
                        )
                     ]
                  )
                ),
                
                // Loyalty Card Overlapping
                Positioned(
                  top: 270 * scale,
                  left: 20 * scale, right: 20 * scale,
                  child: _buildLoyaltyCard(scale),
                ),
              ],
            ),
          ),
          
          SliverToBoxAdapter(
             child: Padding(
                padding: EdgeInsets.only(top: 140 * scale, left: 20 * scale, right: 20 * scale, bottom: 40 * scale),
                child: Column(
                  children: [
                    _buildQuickActions(scale),
                    SizedBox(height: 32 * scale),
                    _buildUnifiedSettingsCard(scale, auth),
                    SizedBox(height: 120 * scale), // Padding for bottom nav
                  ],
                )
             )
          )
        ]
      )
    );
  }

  Widget _buildQuickActions(double scale) {
     return Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
           _buildActionIcon(Icons.receipt_long_rounded, 'Pesanan', Colors.blue, scale, onTap: () {
             Navigator.push(context, MaterialPageRoute(builder: (_) => const OrdersScreen()));
           }),
           _buildActionIcon(Icons.directions_bike_rounded, 'Ride', Colors.purple, scale, onTap: () {
             Navigator.push(context, MaterialPageRoute(builder: (_) => const RideHistoryScreen()));
           }),
           _buildActionIcon(Icons.favorite_rounded, 'Favorit', Colors.red, scale, onTap: () {
             Navigator.push(context, MaterialPageRoute(builder: (_) => const MarketFavoritesScreen()));
           }),
           _buildActionIcon(Icons.discount_rounded, 'Voucher', Colors.orange, scale, onTap: () {
             Navigator.push(context, MaterialPageRoute(builder: (_) => const VoucherScreen()));
           }),
        ]
     ).animate().fadeIn(delay: 500.ms).slideY(begin: 0.2);
  }

  Widget _buildActionIcon(IconData icon, String label, Color color, double scale, {VoidCallback? onTap}) {
     return GestureDetector(
       onTap: onTap,
       child: Column(
          children: [
             Container(
               width: 65 * scale, height: 65 * scale,
               decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 15, offset: const Offset(0, 6))],
                  border: Border.all(color: Colors.grey.shade100, width: 1.5)
               ),
               child: Icon(icon, color: color, size: 28 * scale),
             ),
             SizedBox(height: 10 * scale),
             Text(label, style: TextStyle(fontSize: 12 * scale, fontWeight: FontWeight.w700, color: Colors.black87))
          ]
       ),
     );
  }

  Widget _buildUnifiedSettingsCard(double scale, AuthProvider auth) {
    return Container(
       decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 20, offset: const Offset(0, 10))],
          border: Border.all(color: Colors.grey.shade100, width: 1.5)
       ),
       child: Column(
          children: [
             _buildMenuItemCard(Icons.phone_in_talk_rounded, 'Kontak Pesanan', onTap: () => _openContactEditor(), scale: scale),
             const Divider(height: 1, color: Colors.black12, indent: 60),
             _buildMenuItemCard(Icons.help_outline_rounded, 'Pusat Bantuan', onTap: () {
               Navigator.push(context, MaterialPageRoute(builder: (_) => const HelpCenterScreen()));
             }, scale: scale),
             const Divider(height: 1, color: Colors.black12, indent: 60),
             _buildMenuItemCard(Icons.info_outline_rounded, 'Tentang Aplikasi', onTap: () {
                showAboutDialog(
                   context: context,
                   applicationName: 'Rana Market',
                   applicationVersion: '1.0.0',
                   applicationIcon: const Icon(Icons.shopping_bag, color: ThemeConfig.brandColor, size: 48),
                   children: [
                     const Text('Rana Market adalah platform belanja dan eksplorasi terpercaya yang didukung oleh asisten AI.')
                   ]
                );
             }, scale: scale),

             const Divider(height: 1, color: Colors.black12, indent: 60),
             ListTile(
                contentPadding: EdgeInsets.symmetric(horizontal: 20 * scale, vertical: 6 * scale),
                leading: Container(
                   padding: EdgeInsets.all(10 * scale),
                   decoration: BoxDecoration(color: Colors.red.withValues(alpha: 0.1), shape: BoxShape.circle),
                   child: Icon(Icons.logout_rounded, color: Colors.red, size: 22 * scale)
                ),
                title: Text('Keluar Akun', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14 * scale, color: Colors.red)),
                onTap: () async {
                  await auth.logout();
                },
             )
          ]
       )
    ).animate().fadeIn(delay: 600.ms).slideY(begin: 0.2);
  }

  Widget _buildMenuItemCard(IconData icon, String title, {VoidCallback? onTap, required double scale, Color? color}) {
    return ListTile(
      contentPadding: EdgeInsets.symmetric(horizontal: 20 * scale, vertical: 6 * scale),
      leading: Container(
         padding: EdgeInsets.all(10 * scale),
         decoration: BoxDecoration(color: (color ?? ThemeConfig.brandColor).withValues(alpha: 0.1), shape: BoxShape.circle),
         child: Icon(icon, color: color ?? ThemeConfig.brandColor, size: 22 * scale)
      ),
      title: Text(title, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14 * scale)),
      trailing: Icon(Icons.chevron_right_rounded, color: Colors.grey.shade400, size: 24 * scale),
      onTap: onTap,
    );
  }

  Widget _buildLoyaltyCard(double scale) {
    String tier = 'Bronze';
    Color tierColor = Colors.brown.shade400;
    List<Color> gradientColors = [const Color(0xFFCD7F32), const Color(0xFF8B4513)];

    if (_userPoints >= 500) {
      tier = 'Gold';
      tierColor = const Color(0xFFFFD700);
      gradientColors = [const Color(0xFFFFD700), const Color(0xFFDAA520)];
    } else if (_userPoints >= 100) {
      tier = 'Silver';
      tierColor = const Color(0xFFC0C0C0);
      gradientColors = [const Color(0xFFE0E0E0), const Color(0xFF9E9E9E)];
    }

    return Container(
      width: double.infinity,
      height: 150 * scale,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(color: tierColor.withValues(alpha: 0.4), blurRadius: 25, offset: const Offset(0, 15))
        ],
      ),
      child: Stack(
         children: [
            Positioned.fill(
               child: ClipRRect(
                 borderRadius: BorderRadius.circular(24),
                 child: Container(
                    decoration: BoxDecoration(
                       gradient: LinearGradient(colors: gradientColors, begin: Alignment.topLeft, end: Alignment.bottomRight)
                    ),
                    child: Stack(
                       children: [
                          Positioned(right: -20, top: -20, child: Icon(Icons.diamond_outlined, size: 140 * scale, color: Colors.white.withValues(alpha: 0.2))),
                       ]
                    )
                 )
               )
            ),
            Positioned.fill(
               child: Padding(
                  padding: EdgeInsets.all(24 * scale),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('RANA LOYALTY',
                              style: TextStyle(
                                  color: Colors.white.withValues(alpha: 0.9),
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 2,
                                  fontSize: 12 * scale)),
                          Icon(Icons.star_rounded, color: Colors.white, size: 24 * scale),
                        ],
                      ),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Member $tier',
                                  style: TextStyle(
                                      color: Colors.white, fontSize: 24 * scale, fontWeight: FontWeight.w900, shadows: const [Shadow(color: Colors.black26, offset: Offset(0,2), blurRadius: 4)])),
                              SizedBox(height: 6 * scale),
                              Text('$_userPoints Poin Belanja',
                                  style: TextStyle(color: Colors.white.withValues(alpha: 0.95), fontSize: 13 * scale, fontWeight: FontWeight.w600)),
                            ],
                          ),
                          const Spacer(),
                          GestureDetector(
                            onTap: () {
                              Navigator.push(context, MaterialPageRoute(builder: (_) => const LoyaltyExchangeScreen()));
                            },
                            child: Container(
                              padding: EdgeInsets.symmetric(horizontal: 16 * scale, vertical: 10 * scale),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.25),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: Colors.white.withValues(alpha: 0.5), width: 1.5)
                              ),
                              child: Text('Tukarkan',
                                  style: TextStyle(color: Colors.white, fontSize: 13 * scale, fontWeight: FontWeight.bold)),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
               )
            )
         ]
      )
    ).animate().fadeIn(delay: 400.ms).slideY(begin: 0.2);
  }
}
