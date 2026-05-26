import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:rana_merchant/config/assets_config.dart';
import 'package:rana_merchant/config/theme_config.dart';
import 'package:rana_merchant/data/remote/api_service.dart';
import 'package:rana_merchant/screens/add_product_screen.dart';
import 'package:rana_merchant/screens/maintenance_screen.dart';
import 'package:rana_merchant/screens/order_list_screen.dart';
import 'package:rana_merchant/screens/ppob_screen.dart';
import 'package:rana_merchant/screens/receipt_scan_screen.dart';
import 'package:rana_merchant/screens/report_screen.dart';
import 'package:rana_merchant/screens/scan_screen.dart';
import 'package:rana_merchant/screens/settings_screen.dart';
import 'package:rana_merchant/screens/stock_opname_screen.dart';
import 'package:rana_merchant/screens/support_screen.dart';
import 'package:rana_merchant/screens/wholesale_main_screen.dart';
import 'package:rana_merchant/screens/marketing_screen.dart';
import 'package:rana_merchant/screens/flash_sales_screen.dart';
import 'package:rana_merchant/screens/promo_hub_screen.dart';
import 'package:rana_merchant/screens/game_screen.dart';
import 'package:rana_merchant/screens/debt_screen.dart';
import 'package:rana_merchant/screens/customer_screen.dart';
import 'package:rana_merchant/screens/employee_screen.dart';
import 'package:rana_merchant/screens/pos_screen.dart';
import 'package:rana_merchant/screens/match3_level_map_screen.dart';
import 'package:shimmer/shimmer.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter/services.dart';

class FeatureGrid extends StatefulWidget {
  final Map<String, dynamic> maintenanceMap;
  final int newOrdersCount;
  final int unreadSupportCount;
  final Function(int) onSwitchTab;

  const FeatureGrid({
    super.key,
    required this.maintenanceMap,
    required this.newOrdersCount,
    required this.unreadSupportCount,
    required this.onSwitchTab,
  });

  @override
  State<FeatureGrid> createState() => _FeatureGridState();
}

class _FeatureGridState extends State<FeatureGrid> {
  bool _menuExpanded = false;
  int? _pressedMenuIndex;
  late Future<List<dynamic>> _menusFuture;

  @override
  void initState() {
    super.initState();
    _menusFuture = ApiService().fetchAppMenus();
  }

  @override
  void didUpdateWidget(FeatureGrid oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Optional: Refresh menus if needed when parent rebuilds
    // but usually RealtimeService handles specific updates.
  }

  IconData _getIcon(String name) {
    switch (name.toUpperCase()) {
      case 'POS': return Icons.point_of_sale;
      case 'PRODUCT': return Icons.inventory_2;
      case 'REPORT': return Icons.bar_chart;
      case 'STOCK': return Icons.inventory_2;
      case 'ADS': return Icons.campaign;
      case 'FLASH_SALE': return Icons.flash_on;
      case 'PROMO': return Icons.local_offer;
      case 'SUPPORT': return Icons.support_agent;
      case 'SETTINGS': return Icons.settings;
      case 'KULAKAN': return Icons.storefront;
      case 'PPOB': return Icons.payment;
      case 'WALLET': return Icons.account_balance_wallet;
      case 'SCAN': return Icons.qr_code_scanner;
      case 'ORDER': return Icons.shopping_bag;
      case 'GAME': return Icons.sports_esports;
      case 'DEBT': return Icons.account_balance_wallet_outlined;
      case 'CUSTOMER': return Icons.people;
      case 'EMPLOYEE': return Icons.badge;
      case 'SCAN_RECEIPT': return Icons.receipt_long;
      case 'INVENTORY_2': return Icons.inventory_2;
      case 'PERCENT': return Icons.percent;
      case 'TRENDING_UP': return Icons.trending_up;
      case 'ANALYTICS': return Icons.analytics;
      case 'PRICE_CHANGE': return Icons.price_change;
      case 'TRENDING_DOWN': return Icons.trending_down;
      case 'SCHEDULE': return Icons.schedule;
      case 'PERSON_ADD': return Icons.person_add;
      case 'LOYALTY': return Icons.loyalty;
      case 'SHOPPING_CART': return Icons.shopping_cart;
      case 'ATTACH_MONEY': return Icons.attach_money;
      case 'CLOUD': return Icons.cloud;
      case 'ACCESS_TIME_FILLED': return Icons.access_time_filled;
      case 'WATER_DROP': return Icons.water_drop;
      case 'WB_SUNNY': return Icons.wb_sunny;
      case 'LIGHTBULB': return Icons.lightbulb;
      default: return Icons.circle;
    }
  }

  Color _getColor(String key) {
    return const Color(0xFFE07A5F); // Terra Cotta
  }

  Widget _getScreen(String route) {
    final normalized = route.toLowerCase().replaceAll('/', '').replaceAll('_', '');
    switch (normalized) {
      case 'pos': return const PosScreen();
      case 'products': return const AddProductScreen();
      case 'reports': return const ReportScreen();
      case 'stock': return const StockOpnameScreen();
      case 'marketing': return const MarketingScreen();
      case 'flashsale': return const FlashSalesScreen();
      case 'promo': return const PromoHubScreen();
      case 'support': return const SupportScreen();
      case 'settings': return const SettingsScreen();
      case 'kulakan': return const WholesaleMainScreen();
      case 'ppob': return const PpobScreen();
      case 'orders': return const OrderListScreen();
      case 'game': return const GameScreen();
      case 'match3': return const Match3LevelMapScreen();
      case 'debt': return const DebtScreen();
      case 'customer': return const CustomerScreen();
      case 'employee': return const EmployeeScreen();
      case 'scanreceipt': return const ReceiptScanScreen();
      default: return const SizedBox.shrink();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;

    return FutureBuilder<List<dynamic>>(
      future: _menusFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return _buildLoadingSkeleton(context, isDark, colorScheme);
        }

        List<dynamic> menuItems = _processMenuItems(snapshot);
        
        final width = MediaQuery.of(context).size.width;
        int crossAxisCount = width <= 360 ? 3 : 4;
        int itemsToShow = crossAxisCount * 2;
        bool hasMore = menuItems.length > itemsToShow;
        
        List<dynamic> displayedItems = _getDisplayedItems(menuItems, itemsToShow, hasMore);

        return GridView.builder(
          physics: const NeverScrollableScrollPhysics(),
          shrinkWrap: true,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: crossAxisCount,
              mainAxisSpacing: 20,
              crossAxisSpacing: 16,
              childAspectRatio: _calculateAspectRatio(width)),
          itemCount: displayedItems.length,
          itemBuilder: (ctx, i) {
            final m = displayedItems[i];
            return _buildMenuItem(ctx, i, m, colorScheme);
          },
        );
      },
    );
  }

  List<dynamic> _processMenuItems(AsyncSnapshot<List<dynamic>> snapshot) {
    List<dynamic> menuItems = [];
    if (!snapshot.hasData || snapshot.data!.isEmpty) {
      menuItems = [
        {'label': 'Kasir', 'key': 'POS', 'route': '/pos'},
        {'label': 'Laporan', 'key': 'REPORT', 'route': '/reports'},
        {'label': 'Hutang', 'key': 'DEBT', 'route': '/debt'},
        {'label': 'Pelanggan', 'key': 'CUSTOMER', 'route': '/customer'},
        {'label': 'Pegawai', 'key': 'EMPLOYEE', 'route': '/employee'},
        {'label': 'Stok', 'key': 'STOCK', 'route': '/stock'},
        {'label': 'Kulakan', 'key': 'KULAKAN', 'route': '/kulakan'},
        {'label': 'Promosi', 'key': 'PROMO', 'route': '/promo'},
        {'label': 'Bantuan', 'key': 'SUPPORT', 'route': '/support'},
        {'label': 'PPOB', 'key': 'PPOB', 'route': '/ppob'},
        {'label': 'Game', 'key': 'GAME', 'route': '/game'},
      ];
    } else {
      menuItems = List.from(snapshot.data!);
      // Combine Stock & Product: Remove standalone Product menu
      menuItems.removeWhere((m) =>
          m['key'] == 'SETTINGS' ||
          m['key'] == 'CHAT' ||
          m['key'] == 'PRODUCT' ||
          m['route'] == '/products' ||
          m['route'] == '/chat');

      _ensureEssentialMenus(menuItems);
    }
    return menuItems;
  }

  void _ensureEssentialMenus(List<dynamic> menuItems) {
    final essentials = [
      {'label': 'Stok', 'key': 'STOCK', 'route': '/stock'},
      {'label': 'Hutang', 'key': 'DEBT', 'route': '/debt'},
      {'label': 'Pelanggan', 'key': 'CUSTOMER', 'route': '/customer'},
      {'label': 'Pegawai', 'key': 'EMPLOYEE', 'route': '/employee'},
    ];
    
    for (var item in essentials) {
      if (!menuItems.any((m) => m['key'] == item['key'])) {
        menuItems.add(item);
      }
    }
    
    if (!menuItems.any((m) => m['key'] == 'PROMO' || m['route'] == '/promo')) {
      menuItems.add({'label': 'Promosi', 'key': 'PROMO', 'route': '/promo'});
    }
    if (!menuItems.any((m) => m['key'] == 'GAME' || m['route'] == '/game')) {
      menuItems.add({'label': 'Game', 'key': 'GAME', 'route': '/game'});
    }
    if (!menuItems.any((m) => m['key'] == 'SCAN_RECEIPT' || m['route'] == '/scan_receipt')) {
      menuItems.add({'label': 'Scan Struk', 'key': 'SCAN_RECEIPT', 'route': '/scan_receipt'});
    }
  }

  List<dynamic> _getDisplayedItems(List<dynamic> menuItems, int itemsToShow, bool hasMore) {
    if (!hasMore) return menuItems;
    
    if (!_menuExpanded) {
      var list = menuItems.take(itemsToShow - 1).toList();
      list.add({'label': 'Lainnya', 'key': 'MORE', 'route': '/more', 'icon': 'MORE'});
      return list;
    } else {
      var list = List.from(menuItems);
      list.add({'label': 'Sembunyikan', 'key': 'LESS', 'route': '/less', 'icon': 'LESS'});
      return list;
    }
  }

  double _calculateAspectRatio(double width) {
    if (width >= 1100) return 0.9;
    if (width >= 800) return 0.85;
    if (width <= 360) return 0.95;
    return 0.8;
  }

  Widget _buildMenuItem(BuildContext context, int i, dynamic m, ColorScheme colorScheme) {
    final String label = m['label'] ?? 'Menu';
    final String key = m['key'] ?? '';
    final String route = m['route'] ?? '';

    if (key == 'MORE' || key == 'LESS') {
      return _buildExpandButton(context, key == 'MORE', colorScheme);
    }

    final IconData icon = _getIcon(m['icon'] ?? key);
    final Color color = _getColor(key);

    return InkWell(
      onTapDown: (_) => setState(() => _pressedMenuIndex = i),
      onTapCancel: () => setState(() => _pressedMenuIndex = null),
      onTap: () => _handleMenuTap(context, key, label, route),
      overlayColor: WidgetStateProperty.all(color.withOpacity(0.08)),
      borderRadius: BorderRadius.circular(20),
      child: Column(
        children: [
          _buildIconStack(i, icon, color, key, route),
          const SizedBox(height: 10),
          _buildLabel(label, colorScheme),
        ],
      ),
    ).animate().fade(duration: 400.ms, delay: (50 * i).ms).slideY(begin: 0.15, end: 0);
  }

  Widget _buildExpandButton(BuildContext context, bool isMore, ColorScheme colorScheme) {
    return InkWell(
      onTap: () {
        HapticFeedback.lightImpact();
        setState(() => _menuExpanded = isMore);
      },
      borderRadius: BorderRadius.circular(20),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(24),
              color: colorScheme.surfaceContainerHighest.withOpacity(0.5),
              border: Border.all(color: colorScheme.outline.withOpacity(0.14)),
            ),
            child: Icon(isMore ? Icons.grid_view_rounded : Icons.expand_less_rounded, 
                color: colorScheme.onSurfaceVariant, size: 28),
          ),
          const SizedBox(height: 10),
          Text(isMore ? 'Lainnya' : 'Sembunyikan',
            style: GoogleFonts.outfit(fontSize: 13, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }

  void _handleMenuTap(BuildContext context, String key, String label, String route) {
    HapticFeedback.lightImpact();
    setState(() => _pressedMenuIndex = null);

    final normalizedRoute = route.toLowerCase().replaceAll('/', '').replaceAll('_', '');
    final normalizedKey = key.toUpperCase();

    final maint = widget.maintenanceMap[normalizedKey] ?? widget.maintenanceMap[key];
    if (maint != null && maint['active'] == true) {
      Navigator.of(context, rootNavigator: true).push(MaterialPageRoute(builder: (_) => MaintenanceScreen(
        title: label,
        message: maint['message'] ?? 'Fitur sedang dalam perawatan',
        until: maint['until']?.toString(),
        animationAsset: AssetsConfig.lottieLivePulse,
      )));
      return;
    }

    if (normalizedRoute == 'orders') { widget.onSwitchTab(1); return; }
    if (normalizedRoute == 'scan') { widget.onSwitchTab(2); return; }
    if (normalizedRoute == 'reports') { widget.onSwitchTab(3); return; }
    if (normalizedRoute == 'settings') { widget.onSwitchTab(4); return; }

    final screen = _getScreen(route);
    if (screen is SizedBox) return; // Don't push empty screen

    // For better UX in Super App, open major features in root navigator (covering bottom bar)
    Navigator.of(context, rootNavigator: true).push(MaterialPageRoute(builder: (_) => screen));
  }

  Widget _buildIconStack(int i, IconData icon, Color color, String key, String route) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        AnimatedScale(
          scale: _pressedMenuIndex == i ? 0.98 : 1.0,
          duration: const Duration(milliseconds: 120),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(24),
              gradient: LinearGradient(
                colors: [Theme.of(context).colorScheme.surface, color.withOpacity(0.10)],
              ),
              boxShadow: [
                BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 16, offset: const Offset(0, 6)),
                BoxShadow(color: color.withOpacity(0.14), blurRadius: 8, offset: const Offset(0, 4)),
              ],
              border: Border.all(color: Theme.of(context).colorScheme.outline.withOpacity(0.14)),
            ),
            child: Icon(icon, color: color, size: 28),
          ),
        ),
        _buildBadge(key, route),
      ],
    ).animate().scale(duration: 350.ms, curve: Curves.easeOutBack);
  }

  Widget _buildBadge(String key, String route) {
    int count = 0;
    if (route == '/orders') count = widget.newOrdersCount;
    else if (key == 'SUPPORT' || route == '/support') count = widget.unreadSupportCount;

    if (count <= 0) return const SizedBox.shrink();

    return Positioned(
      right: -2, top: -2,
      child: Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          color: Colors.redAccent, shape: BoxShape.circle,
          border: Border.all(color: Colors.white, width: 2),
        ),
        constraints: const BoxConstraints(minWidth: 22, minHeight: 22),
        child: Center(
          child: Text(count > 99 ? '!' : count.toString(),
            style: GoogleFonts.outfit(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
          ),
        ),
      ),
    );
  }

  Widget _buildLabel(String label, ColorScheme colorScheme) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Flexible(
          child: Text(label,
            style: GoogleFonts.outfit(fontSize: 13, fontWeight: FontWeight.w600, height: 1.2),
            textAlign: TextAlign.center, maxLines: 2, overflow: TextOverflow.ellipsis,
          ),
        ),
        const SizedBox(width: 4),
        Icon(Icons.chevron_right, size: 14, color: colorScheme.onSurface.withOpacity(0.3)),
      ],
    );
  }

  Widget _buildLoadingSkeleton(BuildContext context, bool isDark, ColorScheme colorScheme) {
    return Shimmer.fromColors(
      baseColor: isDark ? colorScheme.surfaceContainerHighest.withOpacity(0.5) : Colors.grey.shade300,
      highlightColor: isDark ? colorScheme.surfaceContainerHighest : Colors.grey.shade100,
      child: GridView.builder(
        physics: const NeverScrollableScrollPhysics(),
        shrinkWrap: true,
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 4, mainAxisSpacing: 20, crossAxisSpacing: 16, childAspectRatio: 0.8),
        itemCount: 8,
        itemBuilder: (_, __) => Column(
          children: [
            Container(height: 56, width: 56, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24))),
            const SizedBox(height: 10),
            Container(height: 12, width: 48, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
          ],
        ),
      ),
    );
  }
}
