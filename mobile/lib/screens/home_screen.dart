import 'dart:ui'; // For Glassmorphism
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:google_fonts/google_fonts.dart'; // [NEW]
import 'package:provider/provider.dart';
import 'package:rana_merchant/services/sound_service.dart';
import 'package:intl/intl.dart';
import 'package:rana_merchant/providers/auth_provider.dart';
import 'package:rana_merchant/providers/cart_provider.dart';
import 'package:rana_merchant/data/remote/api_service.dart';
import 'package:rana_merchant/data/local/database_helper.dart';
import 'package:rana_merchant/screens/expense_screen.dart';
import 'package:rana_merchant/screens/add_product_screen.dart';
import 'package:rana_merchant/screens/report_screen.dart';
import 'package:rana_merchant/screens/history_screen.dart';
import 'package:rana_merchant/screens/marketing_screen.dart';
import 'package:rana_merchant/screens/settings_screen.dart';
import 'package:rana_merchant/screens/subscription_screen.dart';
import 'package:rana_merchant/screens/stock_opname_screen.dart';
import 'package:rana_merchant/screens/purchase_screen.dart';
import 'package:rana_merchant/screens/order_list_screen.dart';
import 'package:rana_merchant/providers/wallet_provider.dart'; // [FIX] Added missing import
import 'package:rana_merchant/screens/wallet_screen.dart';
import 'package:rana_merchant/screens/maintenance_screen.dart';
import 'package:rana_merchant/config/assets_config.dart';
import 'package:lottie/lottie.dart';
import 'package:rana_merchant/screens/scan_screen.dart';
import 'package:rana_merchant/services/notification_service.dart';
import 'package:rana_merchant/widgets/product_card.dart';
import 'package:rana_merchant/widgets/empty_state.dart';
import 'package:rana_merchant/constants.dart';
import 'package:rana_merchant/services/ai_service.dart';
import 'package:rana_merchant/providers/subscription_provider.dart'; // [NEW]
import 'package:rana_merchant/screens/announcements_screen.dart'; // [NEW] feature
import 'package:rana_merchant/screens/support_screen.dart'; // [NEW] feature
import 'package:rana_merchant/screens/guideline_screen.dart';
import 'package:rana_merchant/screens/pos_screen.dart'; // [NEW] feature
import 'package:rana_merchant/screens/payment_screen.dart'; // [NEW] Refactored
import 'package:rana_merchant/services/sync_service.dart'; // [NEW]
import 'package:rana_merchant/services/connectivity_service.dart'; // [NEW]
import 'package:rana_merchant/widgets/no_connection_screen.dart'; // [NEW]
import 'package:rana_merchant/services/support_read_service.dart';
import 'package:rana_merchant/screens/wholesale_main_screen.dart';
import 'package:rana_merchant/screens/ppob_screen.dart'; // [NEW] feature
import 'package:rana_merchant/screens/notification_screen.dart'; // [NEW]
import 'package:rana_merchant/screens/chat_screen.dart'; // [NEW]
import 'package:rana_merchant/screens/debt_screen.dart'; // [NEW]
import 'package:rana_merchant/screens/customer_screen.dart'; // [NEW]
import 'package:rana_merchant/screens/employee_screen.dart'; // [NEW]
import 'package:rana_merchant/screens/blog_detail_screen.dart'; // [NEW]
import 'package:rana_merchant/screens/blog_list_screen.dart'; // [NEW]
import 'package:rana_merchant/screens/subscription_pending_screen.dart'; // [NEW] Lock Screen
import 'package:rana_merchant/screens/subscription_expired_screen.dart'; // [NEW] Expired Screen
import 'package:rana_merchant/providers/theme_provider.dart'; // [NEW] Theme Provider
import 'package:rana_merchant/screens/login_screen.dart';
import 'dart:async'; // For Timer
import 'package:flutter/services.dart';
import 'package:rana_merchant/screens/flash_sales_screen.dart';
import 'package:rana_merchant/screens/promo_hub_screen.dart';
import 'package:flutter/foundation.dart' show kDebugMode;
import 'package:rana_merchant/services/realtime_service.dart';
import 'package:rana_merchant/services/order_service.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:rana_merchant/screens/game_screen.dart';
import 'package:rana_merchant/screens/match3_level_map_screen.dart'; // [FIX] import map screen
import 'package:rana_merchant/screens/receipt_scan_screen.dart'; // [NEW] Scan Struk

import 'package:shimmer/shimmer.dart'; // [FIX] Add shimmer import for feature grid skeleton
import 'package:rana_merchant/config/theme_config.dart';
import 'package:rana_merchant/widgets/cart_widget.dart';
import 'package:rana_merchant/widgets/home/feature_grid.dart';
import 'package:rana_merchant/widgets/home/home_banner_carousel.dart';
import 'package:rana_merchant/widgets/home/home_wallet_card.dart';
import 'package:rana_merchant/widgets/home/sales_summary_card.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:rana_merchant/screens/digital_signage_screen.dart'; // [NEW]

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<Map<String, dynamic>> products = [];
  bool isLoading = true;
  String _selectedCategory = 'All';
  int _bottomNavIndex = 0;
  int _newOrdersCount = 0;
  int _unreadNotificationCount = 0;
  int _unreadSupportCount = 0;
  String? _storeName;
  final List<GlobalKey<NavigatorState>> _tabNavigatorKeys =
      List.generate(5, (_) => GlobalKey<NavigatorState>());
  final ScrollController _scrollController = ScrollController();
  bool _isScrolled = false;
  List<Map<String, dynamic>> _aiInsights = [];
  Map<String, int> _aiInsightFeedback = {};
  Future<List<dynamic>>? _announcementsFuture;
  Future<List<dynamic>>? _blogFuture;
  DateTime? _lastAnnouncementsFetch;
  DateTime? _lastBlogFetch;
  final Duration _infoTtl = Duration(minutes: 10);
  final GlobalKey<ScaffoldState> _scaffoldKey =
      GlobalKey<ScaffoldState>(); // [FIX] Added Key
  Timer? _autoSyncTimer;
  StreamSubscription? _syncSubscription; // [NEW]
  final RealtimeService _realtimeService = RealtimeService();
  final OrderService _orderService = OrderService();
  bool _showBeginnerTip = false;
  bool _shouldShowOnboardingSuccess = false;
  bool _showHomeTour = false;
  int _homeTourStep = 0;
  int _desktopSelectedIndex = 0; // [NEW] Tablet/Desktop Navigation Index
  bool _isOffline = false; // [NEW] Offline Status
  Map<String, dynamic> _maintenanceMap = {};
  StreamSubscription<Map<String, dynamic>>? _maintSub;
  StreamSubscription<void>? _menusSub;
  StreamSubscription<bool>? _connSub;
  bool _walletObscureBalance = false;
  final PageController _bannerPageController =
      PageController(viewportFraction: 1.0);
  Timer? _bannerAutoTimer;
  bool _bannerAutoPaused = false;
  int _bannerPageIndex = 0;
  List<dynamic> _homeBanners = [];
  bool _isLoadingBanners = false;
  Timer? _bannerProgressTimer;
  double _bannerProgress = 0.0;
  bool _walletExpanded = true;
  final PageController _blogPageController =
      PageController(viewportFraction: 0.86);
  int _blogPageIndex = 0;
  final PageController _aiPageController =
      PageController(viewportFraction: 0.92);
  int _aiPageIndex = 0;
  final FlutterTts _tts = FlutterTts();
  bool _isSpeaking = false;

  Future<void> _prefetchBannerImagesAroundIndex(int index) async {
    if (!mounted) return;
    final prev = index - 1;
    final next = index + 1;
    for (final idx in [prev, next]) {
      if (idx < 0 || idx >= _homeBanners.length) continue;
      final item = _homeBanners[idx] as Map;
      final raw = (item['imageUrl'] ?? '').toString();
      final url = ApiService().resolveFileUrl(raw);
      if (url.isEmpty) continue;
      if (url.contains('images.unsplash.com')) continue;
      try {
        await precacheImage(NetworkImage(url), context);
      } catch (_) {}
    }
  }

  String _buildInsightKey(Map<String, dynamic> insight) {
    final type = insight['type']?.toString() ?? '';
    final title = insight['title']?.toString() ?? '';
    final action = insight['action']?.toString() ?? '';
    return '${type}_${title}_$action';
  }

  int _feedbackRankForInsight(
      Map<String, dynamic> insight, Map<String, int> feedback) {
    final key = _buildInsightKey(insight);
    final value = feedback[key] ?? 0;
    if (value == 1) return 2;
    if (value == -1) return 0;
    return 1;
  }

  // [NEW] Icon Mapper
  IconData _getIcon(String name) {
    switch (name.toUpperCase()) {
      case 'POS':
        return Icons.point_of_sale;
      case 'PRODUCT':
        return Icons.inventory_2;
      case 'REPORT':
        return Icons.bar_chart;
      case 'STOCK':
        return Icons.inventory_2; // [NEW]
      case 'ADS':
        return Icons.campaign;
      case 'FLASH_SALE':
        return Icons.flash_on;
      case 'PROMO':
        return Icons.local_offer;
      case 'SUPPORT':
        return Icons.support_agent;
      case 'SETTINGS':
        return Icons.settings;
      case 'KULAKAN':
        return Icons.storefront;
      case 'PPOB':
        return Icons.payment;
      case 'WALLET':
        return Icons.account_balance_wallet;
      case 'SCAN':
        return Icons.qr_code_scanner;
      case 'ORDER':
        return Icons.shopping_bag;
      case 'GAME':
        return Icons.sports_esports;
      case 'DEBT':
        return Icons.account_balance_wallet_outlined;
      case 'CUSTOMER':
        return Icons.people;
      case 'EMPLOYEE':
        return Icons.badge;
      case 'SCAN_RECEIPT':
        return Icons.receipt_long;
      case 'INVENTORY_2':
        return Icons.inventory_2;
      case 'PERCENT':
        return Icons.percent;
      case 'TRENDING_UP':
        return Icons.trending_up;
      case 'ANALYTICS':
        return Icons.analytics;
      case 'PRICE_CHANGE':
        return Icons.price_change;
      case 'TRENDING_DOWN':
        return Icons.trending_down;
      case 'SCHEDULE':
        return Icons.schedule;
      case 'PERSON_ADD':
        return Icons.person_add;
      case 'LOYALTY':
        return Icons.loyalty;
      case 'SHOPPING_CART':
        return Icons.shopping_cart;
      case 'ATTACH_MONEY':
        return Icons.attach_money;
      case 'CLOUD':
        return Icons.cloud;
      case 'ACCESS_TIME_FILLED':
        return Icons.access_time_filled;
      case 'WATER_DROP':
        return Icons.water_drop;
      case 'WB_SUNNY':
        return Icons.wb_sunny;
      case 'LIGHTBULB':
        return Icons.lightbulb;
      default:
        return Icons.circle;
    }
  }

  // [NEW] Route Mapper
  Widget _getScreen(String route) {
    switch (route) {
      case '/pos':
        return const PosScreen();
      case '/products':
        return const AddProductScreen();
      case '/reports':
        return const ReportScreen();
      case '/stock':
        return const StockOpnameScreen(); // [NEW]
      case '/marketing':
        return const MarketingScreen();
      case '/flashsale':
        return const FlashSalesScreen();
      case '/promo':
        return const PromoHubScreen();
      case '/support':
        return const SupportScreen();
      case '/settings':
        return const SettingsScreen();
      case '/kulakan':
        return const WholesaleMainScreen();
      case '/ppob':
        return const PpobScreen();
      case '/wallet':
        return const WalletScreen();
      case '/orders':
        return const OrderListScreen();
      case '/game':
        return const GameScreen();
      case '/match3':
        return const Match3LevelMapScreen();
      case '/debt':
        return const DebtScreen();
      case '/customer':
        return const CustomerScreen();
      case '/employee':
        return const EmployeeScreen();
      case '/scan_receipt':
        return const ReceiptScanScreen(); // [NEW]
      default:
        return const SizedBox.shrink();
    }
  }

  // [NEW] Color Mapper (Simple hash or predefined)
  Color _getColor(String key) {
    return const Color(0xFFE07A5F); // Terra Cotta
  }

  Timer? _idleTimer; // [NEW]

  @override
  void initState() {
    super.initState();
    _resetIdleTimer(); // [NEW] Start idle timer

    // [NEW] 1. Load Local Data First (Instant UI)
    _loadProducts();

    // [NEW] 2. Listen for Realtime/Sync Updates
    _syncSubscription = SyncService().onDataChanged.listen((_) {
      if (mounted) _loadProducts();
    });

    ConnectivityService().startMonitoring();
    _connSub = ConnectivityService().onStatusChanged.listen((isOnline) async {
      if (!mounted) return;
      setState(() {
        _isOffline = !isOnline;
      });
      if (isOnline && !SyncService().isSyncing) {
        await SyncService().syncProducts();
        await SyncService().syncTransactions();
      }
    });

    _loadInsight();
    _loadStoreInfo();
    _loadHomeBanners();
    _loadBeginnerTipFlag();
    // Onboarding dan home tour dinonaktifkan
    _refreshHomeInfo(force: true);
    Future.microtask(() async {
      _maintenanceMap = await ApiService().fetchMenuMaintenance();
      if (mounted) setState(() {});
    });
    RealtimeService().init();
    _maintSub = RealtimeService().maintenanceStream.listen((map) {
      _maintenanceMap = map;
      if (mounted) setState(() {});
    });
    _menusSub = RealtimeService().menusUpdateStream.listen((_) {
      setState(() {
        // Updated menus via RealtimeService
      });
    });
    // [NEW] Load Wallet Data for Home Card
    Future.microtask(() => context.read<WalletProvider>().loadData());

    // Check Subscription after build
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      SyncService().startAutoSync(interval: const Duration(seconds: 60));
      RealtimeService().startAutoManage();
      final sub = Provider.of<SubscriptionProvider>(context, listen: false);
      try {
        await sub.codeCheckSubscription();
        if (kDebugMode && mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                  'Status: ${sub.status.toString().split('.').last} (Locked: ${sub.isLocked})'),
              backgroundColor: sub.isLocked
                  ? ThemeConfig.brandColor
                  : ThemeConfig.colorSuccess,
              duration: const Duration(seconds: 2),
            ),
          );
        }
      } catch (e) {
        if (kDebugMode && mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error cek langganan: $e')),
          );
        }
      }

      if (sub.isLocked && mounted) {
        _showSubscriptionModal();
      }
    });

    _scrollController.addListener(() {
      _resetIdleTimer(); // [NEW] Reset timer on scroll
      if (_scrollController.offset > 50 && !_isScrolled)
        setState(() => _isScrolled = true);
      if (_scrollController.offset <= 50 && _isScrolled)
        setState(() => _isScrolled = false);
    });

    _refreshNewOrdersCountFromApi();
    _refreshNotificationBadge();
    _refreshSupportBadge();
    _realtimeService.init();
    _realtimeService.addTransactionListener(_handleRealtimeOrderEvent);
    _checkOnboardingSuccessFlag();
  }

  void _resetIdleTimer() {
    _idleTimer?.cancel();
    _idleTimer = Timer(const Duration(minutes: 5), () { // 5 minutes idle
      if (mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const DigitalSignageScreen()),
        ).then((_) => _resetIdleTimer());
      }
    });
  }

  Future<void> _loadHomeBanners() async {
    try {
      if (mounted) setState(() => _isLoadingBanners = true);
      final rawBanners = await ApiService().getWholesaleBanners();
      final filteredBanners = rawBanners.where((b) {
        if (b is! Map) return false;
        final v = b['isActive'];
        if (v == null) return true;
        if (v is bool) return v;
        if (v is num) return v != 0;
        final s = v.toString().toUpperCase();
        return s == 'ACTIVE' || s == '1' || s == 'TRUE';
      }).toList();
      if (!mounted) return;
      if (!mounted) return;
      
      setState(() {
        _homeBanners = filteredBanners;
        _bannerPageIndex = 0;
        _isLoadingBanners = false;
      });
      _bannerAutoTimer?.cancel();
      _bannerProgressTimer?.cancel();
      if (_homeBanners.length > 1) {
        _bannerAutoTimer = Timer.periodic(const Duration(seconds: 6), (_) {
          if (!mounted) return;
          if (!_bannerPageController.hasClients) return;
          if (_bannerAutoPaused) return;
          final nextIndex = (_bannerPageIndex + 1) % _homeBanners.length;
          _bannerPageController.animateToPage(
            nextIndex,
            duration: const Duration(milliseconds: 450),
            curve: Curves.easeOutCubic,
          );
        });
        _bannerProgress = 0.0;
        _bannerProgressTimer = Timer.periodic(const Duration(milliseconds: 60), (_) {
          if (!mounted) return;
          if (_bannerAutoPaused) return;
          setState(() {
            final next = _bannerProgress + 0.01;
            _bannerProgress = next > 1.0 ? 1.0 : next;
          });
        });
        await _prefetchBannerImagesAroundIndex(_bannerPageIndex);
      }
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _homeBanners = [];
        _bannerPageIndex = 0;
        _isLoadingBanners = false;
      });
    }
  }

  void _pauseBannerAutoFor(Duration d) {
    setState(() {
      _bannerAutoPaused = true;
    });
    Timer(d, () {
      if (!mounted) return;
      setState(() {
        _bannerAutoPaused = false;
      });
    });
  }

  Future<void> _handleBannerTap(Map item) async {
    final type = (item['actionType'] ?? '').toString().toUpperCase();
    final target = (item['actionTarget'] ?? '').toString();
    if (target.isEmpty) return;

    if (type == 'EXTERNAL_URL') {
      final uri = Uri.tryParse(target);
      if (uri == null) return;
      try {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } catch (_) {}
      return;
    }

    if (type == 'INTERNAL_ROUTE') {
      final route = target;
      if (route == '/orders') {
        _switchTab(1);
        return;
      }
      if (route == '/scan') {
        _switchTab(2);
        return;
      }
      if (route == '/reports') {
        _switchTab(3);
        return;
      }
      if (route == '/settings') {
        _switchTab(4);
        return;
      }
      final screen = _getScreen(route);
      if (route == '/kulakan') {
        Navigator.of(context, rootNavigator: true)
            .push(MaterialPageRoute(builder: (_) => screen));
        return;
      }
      Navigator.push(context, MaterialPageRoute(builder: (_) => screen));
    }
  }

  Future<void> _loadBeginnerTipFlag() async {
    final prefs = await SharedPreferences.getInstance();
    final hasCompleted = prefs.getBool('has_completed_onboarding') ?? false;
    final hasDismissed = prefs.getBool('has_dismissed_beginner_tip') ?? false;
    if (!mounted) return;
    setState(() {
      _showBeginnerTip = hasCompleted && !hasDismissed;
    });
  }

  Future<void> _dismissBeginnerTip() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('has_dismissed_beginner_tip', true);
    if (!mounted) return;
    setState(() {
      _showBeginnerTip = false;
    });
  }

  Future<void> _maybeStartHomeTour() async {
    final prefs = await SharedPreferences.getInstance();
    final hasCompleted = prefs.getBool('has_completed_onboarding') ?? false;
    final hasSeenTour = prefs.getBool('has_seen_home_tour') ?? false;
    if (!mounted || !hasCompleted || hasSeenTour) return;
    setState(() {
      _showHomeTour = true;
      _homeTourStep = 0;
    });
  }

  Future<void> _checkOnboardingSuccessFlag() async {
    final prefs = await SharedPreferences.getInstance();
    final should = prefs.getBool('should_show_onboarding_success') ?? false;
    if (!mounted || !should) return;
    await prefs.setBool('should_show_onboarding_success', false);
    setState(() {
      _shouldShowOnboardingSuccess = true;
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !_shouldShowOnboardingSuccess) return;
      _showOnboardingSuccessSheet();
    });
  }

  Future<void> _finishHomeTour() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('has_seen_home_tour', true);
    if (!mounted) return;
    setState(() {
      _showHomeTour = false;
    });
  }

  Future<void> _advanceHomeTour() async {
    if (!_showHomeTour) return;
    if (_homeTourStep < 2) {
      setState(() {
        _homeTourStep++;
      });
      return;
    }
    await _finishHomeTour();
  }

  Future<void> _skipHomeTour() async {
    if (!_showHomeTour) return;
    await _finishHomeTour();
  }

  Future<void> _loadStoreInfo() async {
    try {
      final tenant = await DatabaseHelper.instance.getTenantInfo();
      if (!mounted) return;
      setState(() {
        _storeName = tenant?['businessName']?.toString();
      });
    } catch (_) {}
  }

  @override
  void dispose() {
    _idleTimer?.cancel(); // [NEW]
    _syncSubscription?.cancel(); // [NEW]
    _autoSyncTimer?.cancel();
    _bannerAutoTimer?.cancel();
    _bannerProgressTimer?.cancel();
    _bannerPageController.dispose();
    _connSub?.cancel();
    _maintSub?.cancel();
    _menusSub?.cancel();
    _scrollController.dispose();
    _realtimeService.removeTransactionListener(_handleRealtimeOrderEvent);
    _realtimeService.dispose();
    super.dispose();
  }

  void _switchTab(int idx) {
    if (idx == _bottomNavIndex) {
      _tabNavigatorKeys[idx].currentState?.popUntil((r) => r.isFirst);
      return;
    }
    setState(() {
      _bottomNavIndex = idx;
      if (idx == 0) {
        _refreshHomeInfo();
      }
    });
  }

  void _refreshHomeInfo({bool force = false}) {
    final now = DateTime.now();
    final needAnn =
        force || _lastAnnouncementsFetch == null || now.difference(_lastAnnouncementsFetch!) > _infoTtl;
    final needBlog =
        force || _lastBlogFetch == null || now.difference(_lastBlogFetch!) > _infoTtl;
    if (needAnn) {
      _announcementsFuture = ApiService().getAnnouncements();
      _lastAnnouncementsFetch = DateTime.now();
    }
    if (needBlog) {
      _blogFuture = ApiService().getBlogPosts();
      _lastBlogFetch = DateTime.now();
    }
  }

  void _handleRealtimeOrderEvent(Map<String, dynamic> data) {
    if (!mounted) return;
    final source = data['source']?.toString();
    if (source == 'MARKET') {
      _refreshNewOrdersCountFromApi();

      // Play Sound
      SoundService.playBeep();

      // Show Notification
      NotificationService().showNotification(
          id: DateTime.now().millisecondsSinceEpoch ~/ 1000,
          title: 'Pesanan Baru!',
          body: 'Ada pesanan baru masuk. Segera proses!',
          payload: 'NEW_ORDER');
    }
  }

  Future<void> _refreshNewOrdersCountFromApi() async {
    try {
      final orders = await _orderService.getIncomingOrders();
      final int pendingCount = orders
          .where((o) =>
              o is Map &&
              o['orderStatus'] ==
                  'PENDING') // Count all PENDING orders (including COD)
          .length;
      if (!mounted) return;
      setState(() {
        _newOrdersCount = pendingCount;
      });
    } catch (_) {}
  }

  void _showOnboardingSuccessSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        final media = MediaQuery.of(ctx);
        return Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Theme.of(ctx).colorScheme.surface,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: SafeArea(
            top: false,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: Colors.grey[300],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                SizedBox(
                  height: 160,
                  child: Lottie.asset(
                    AssetsConfig.lottieConfettiSuccess,
                    repeat: false,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'Toko Anda siap jualan',
                  style: GoogleFonts.poppins(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  'Produk pertama Anda sudah dibuat. Tambah produk lagi supaya pelanggan lebih banyak pilihan.',
                  style: GoogleFonts.poppins(
                    fontSize: 13,
                    color: const Color(0xFF64748B),
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: () {
                      Navigator.pop(ctx);
                    },
                    child: const Text('Masuk ke Beranda'),
                  ),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: () {
                      Navigator.pop(ctx);
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const AddProductScreen(),
                        ),
                      );
                    },
                    child: const Text('Tambah produk lagi'),
                  ),
                ),
                SizedBox(height: media.viewInsets.bottom + 8),
              ],
            ),
          ),
        );
      },
    );
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

  Widget _buildHomeTourOverlay(BuildContext context) {
    String title;
    String description;
    Alignment highlightAlignment;
    IconData stepIcon;
    String stepLabel;

    if (_homeTourStep == 0) {
      title = 'Mulai dari Kasir';
      description =
          'Gunakan menu Kasir untuk mencatat setiap transaksi agar laporan selalu rapi.';
      highlightAlignment = const Alignment(0, -0.1);
      stepIcon = Icons.point_of_sale;
      stepLabel = 'Kasir';
    } else if (_homeTourStep == 1) {
      title = 'Atur Produk';
      description =
          'Kelola stok dan harga produk dari menu Produk supaya jualan lebih teratur.';
      highlightAlignment = const Alignment(0, 0.2);
      stepIcon = Icons.inventory_2;
      stepLabel = 'Produk';
    } else {
      title = 'Lihat Laporan';
      description =
          'Pantau omzet harian dan performa toko melalui menu Laporan.';
      highlightAlignment = const Alignment(0, 0.85);
      stepIcon = Icons.bar_chart;
      stepLabel = 'Laporan';
    }

    return IgnorePointer(
      ignoring: false,
      child: Container(
        color: Colors.black.withOpacity(0.55),
        child: Stack(
          children: [
            Align(
              alignment: highlightAlignment,
              child: TweenAnimationBuilder<double>(
                tween: Tween(begin: 1, end: 1.08),
                duration: const Duration(milliseconds: 900),
                curve: Curves.easeInOut,
                builder: (context, value, child) {
                  return Transform.scale(
                    scale: value,
                    child: Container(
                      width: 140,
                      height: 140,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 3),
                        color: Colors.white.withOpacity(0.06),
                      ),
                    ),
                  );
                },
              ),
            ),
            Align(
              alignment: Alignment.bottomCenter,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.08),
                        borderRadius: BorderRadius.circular(50),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            stepIcon,
                            size: 16,
                            color: Colors.white,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            stepLabel,
                            style: GoogleFonts.poppins(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Container(
                            width: 4,
                            height: 4,
                            decoration: const BoxDecoration(
                              color: Colors.white54,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            'Langkah ${_homeTourStep + 1} dari 3',
                            style: GoogleFonts.poppins(
                              color: Colors.white70,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      title,
                      textAlign: TextAlign.center,
                      style: GoogleFonts.poppins(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      description,
                      textAlign: TextAlign.center,
                      style: GoogleFonts.poppins(
                        color: Colors.white70,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Container(
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.06),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          SizedBox(
                            width: double.infinity,
                            child: FilledButton(
                              onPressed: _advanceHomeTour,
                              child: Text(
                                _homeTourStep == 2 ? 'Mengerti' : 'Lanjut',
                              ),
                            ),
                          ),
                          TextButton(
                            onPressed: _skipHomeTour,
                            child: const Text(
                              'Lewati panduan',
                              style: TextStyle(color: Colors.white70),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _refreshNotificationBadge() async {
    try {
      final notifs = await ApiService().fetchNotifications();
      final announcements = await ApiService().getAnnouncements();
      int unreadCount = 0;
      DateTime? latestCreatedAt;
      Map<String, dynamic>? latestItem;

      for (final n in notifs.whereType<Map>()) {
        final isUnread =
            n['isRead'] == false || n['isRead'] == 0 || n['isRead'] == null;
        if (isUnread) unreadCount++;

        final created = n['createdAt'];
        DateTime? createdAt;
        if (created is String) {
          createdAt = DateTime.tryParse(created);
        } else if (created is DateTime) {
          createdAt = created;
        }
        if (createdAt != null &&
            (latestCreatedAt == null || createdAt.isAfter(latestCreatedAt))) {
          latestCreatedAt = createdAt;
          latestItem = n.cast<String, dynamic>();
        }
      }

      for (final a in announcements.whereType<Map>()) {
        final created = a['createdAt'];
        DateTime? createdAt;
        if (created is String) {
          createdAt = DateTime.tryParse(created);
        } else if (created is DateTime) {
          createdAt = created;
        }
        if (createdAt != null &&
            (latestCreatedAt == null || createdAt.isAfter(latestCreatedAt))) {
          latestCreatedAt = createdAt;
          latestItem = a.cast<String, dynamic>();
        }
      }

      if (latestCreatedAt != null && latestItem != null) {
        final prefs = await SharedPreferences.getInstance();
        final lastSeenMillis = prefs.getInt('last_notification_seen_at') ?? 0;
        final latestMillis = latestCreatedAt.millisecondsSinceEpoch;
        if (latestMillis > lastSeenMillis) {
          final title = latestItem['title']?.toString() ?? 'Notifikasi baru';
          final body = (latestItem['body'] ??
                  latestItem['message'] ??
                  latestItem['content'] ??
                  '')
              .toString();
          await NotificationService().showNotification(
            id: latestMillis % 100000,
            title: title,
            body: body.isEmpty ? 'Ada pemberitahuan baru dari Rana.' : body,
          );
          await prefs.setInt('last_notification_seen_at', latestMillis);
        }
      }

      if (!mounted) return;
      setState(() {
        _unreadNotificationCount = unreadCount;
      });
    } catch (_) {}
  }

  Future<T?> _pushInActiveNavigator<T>(Widget screen) {
    final nav = _tabNavigatorKeys[_bottomNavIndex].currentState;
    if (nav != null) {
      return nav.push<T>(MaterialPageRoute(builder: (_) => screen));
    }
    return Navigator.push<T>(
        context, MaterialPageRoute(builder: (_) => screen));
  }

  // [NEW] Helper for online-only navigation
  void _navigateToProtected(Widget screen) async {
    // Show loading feedback
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
          content: Text('Memeriksa koneksi...'),
          duration: Duration(milliseconds: 500)),
    );

    // Add timeout to prevent hanging
    bool isOnline = false;
    try {
      isOnline = await ConnectivityService()
          .hasInternetConnection()
          .timeout(const Duration(seconds: 3), onTimeout: () => false);
    } catch (e) {
      isOnline = false;
    }

    if (!mounted) return;

    ScaffoldMessenger.of(context).hideCurrentSnackBar(); // Hide loading

    if (isOnline) {
      Navigator.push(context, MaterialPageRoute(builder: (_) => screen));
    } else {
      Navigator.push(
          context,
          MaterialPageRoute(
              builder: (_) => NoConnectionScreen(onRetry: () {
                    Navigator.maybePop(context);
                    _navigateToProtected(screen); // Retry
                  })));
    }
  }

  void _showSubscriptionModal() {
    showModalBottomSheet(
        context: context,
        isDismissible: false, // Force them to interact
        enableDrag: false,
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        builder: (_) => Container(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.lock_clock,
                      size: 48, color: ThemeConfig.brandColor),
                  const SizedBox(height: 16),
                  Text('Masa Uji Coba Habis',
                      style: GoogleFonts.poppins(
                          fontSize: 20, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  const Text(
                      'Silakan berlangganan untuk melanjutkan menggunakan fitur lengkap Rana.'),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                        onPressed: () {
                          Navigator.maybePop(context);
                          Navigator.push(
                              context,
                              MaterialPageRoute(
                                  builder: (_) => const SubscriptionScreen()));
                        },
                        child: const Text('Berlangganan Sekarang')),
                  )
                ],
              ),
            ));
  }

  Future<void> _loadInsight() async {
    double? lat;
    double? lng;
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (serviceEnabled) {
        LocationPermission permission = await Geolocator.checkPermission();
        if (permission == LocationPermission.denied) {
          permission = await Geolocator.requestPermission();
        }
        if (permission == LocationPermission.whileInUse ||
            permission == LocationPermission.always) {
          Position position = await Geolocator.getCurrentPosition();
          lat = position.latitude;
          lng = position.longitude;
        }
      }
    } catch (e) {
      debugPrint('Error getting location: $e');
    }

    final insights =
        await AiService().generateAdvancedInsights(lat: lat, lng: lng);
    if (!mounted) return;
    final feedback = await _loadAiInsightFeedback(insights);
    if (!mounted) return;
    final sorted = [...insights];
    sorted.sort((a, b) {
      final pa = (a['priority'] as int?) ?? 0;
      final pb = (b['priority'] as int?) ?? 0;
      if (pa != pb) {
        return pb.compareTo(pa);
      }
      final ra = _feedbackRankForInsight(a, feedback);
      final rb = _feedbackRankForInsight(b, feedback);
      return rb.compareTo(ra);
    });
    setState(() {
      _aiInsights = sorted;
      _aiInsightFeedback = feedback;
    });
  }

  Future<Map<String, int>> _loadAiInsightFeedback(
      List<Map<String, dynamic>> insights) async {
    final prefs = await SharedPreferences.getInstance();
    final map = <String, int>{};
    for (final insight in insights) {
      final key = _buildInsightKey(insight);
      final value = prefs.getInt('ai_feedback_$key') ?? 0;
      if (value != 0) {
        map[key] = value;
      }
    }
    return map;
  }

  Future<void> _toggleInsightFeedback(
      Map<String, dynamic> insight, int value) async {
    final key = _buildInsightKey(insight);
    final current = _aiInsightFeedback[key] ?? 0;
    final next = current == value ? 0 : value;

    setState(() {
      if (next == 0) {
        _aiInsightFeedback.remove(key);
      } else {
        _aiInsightFeedback[key] = next;
      }
    });

    final prefs = await SharedPreferences.getInstance();
    if (next == 0) {
      await prefs.remove('ai_feedback_$key');
    } else {
      await prefs.setInt('ai_feedback_$key', next);
    }

    if (!mounted || next == 0) return;

    final isPositive = next == 1;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          isPositive
              ? 'Terima kasih, insight ini membantu.'
              : 'Terima kasih, kami akan perbaiki insight seperti ini.',
        ),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  Future<void> _loadProducts() async {
    // [FIX] Optimized for Offline-First & Realtime
    if (products.isEmpty) {
      setState(() => isLoading = true);
    }

    final localProds = await DatabaseHelper.instance.getAllProducts();

    if (mounted) {
      setState(() {
        products = localProds;
        isLoading = false;
      });
    }
  }

  String _searchQuery = '';
  List<Map<String, dynamic>> get _filteredProducts {
    var filtered = products;

    // Filter by Category
    if (_selectedCategory != 'All') {
      filtered = filtered.where((p) {
        final cat = p['category'] ?? 'All';
        return cat == _selectedCategory;
      }).toList();
    }

    // Filter by Search
    if (_searchQuery.isNotEmpty) {
      filtered = filtered
          .where((p) =>
              p['name']
                  .toString()
                  .toLowerCase()
                  .contains(_searchQuery.toLowerCase()) ||
              p['sku']
                  .toString()
                  .toLowerCase()
                  .contains(_searchQuery.toLowerCase()))
          .toList();
    }

    return filtered;
  }

  @override
  Widget build(BuildContext context) {
    var cart = Provider.of<CartProvider>(context);
    final sub = Provider.of<SubscriptionProvider>(context);

    // [SECURITY] Hard Lock if Expired
    if (sub.isLocked) {
      return Scaffold(
        body: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(32),
          decoration: BoxDecoration(
              gradient: LinearGradient(
                  colors: [ThemeConfig.brandColor, ThemeConfig.brandColor.withOpacity(0.8)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight)),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surface,
                    shape: BoxShape.circle),
                child: const Icon(Icons.lock_person,
                    size: 64, color: ThemeConfig.brandColor),
              ),
              const SizedBox(height: 32),
              Text('Akses Terkunci',
                  style: GoogleFonts.poppins(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      color: Colors.white)),
              const SizedBox(height: 16),
              Text(
                  'Masa uji coba atau paket berlangganan Anda telah habis. Silakan perbarui langganan untuk melanjutkan operasional toko.',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.poppins(
                      fontSize: 16, color: Colors.white.withOpacity(0.9))),
              const SizedBox(height: 48),
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                          builder: (_) => const SubscriptionScreen())),
                  style: ElevatedButton.styleFrom(
                      backgroundColor: Theme.of(context).colorScheme.surface,
                      foregroundColor: Theme.of(context).colorScheme.primary,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16))),
                  child: Text('Perpanjang Sekarang',
                      style: GoogleFonts.poppins(
                          fontSize: 18, fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(height: 24),
              TextButton(
                  onPressed: () => sub.codeCheckSubscription(), // Retry
                  child: const Text('Refresh Status',
                      style: TextStyle(color: Colors.white70)))
            ],
          ),
        ),
      );
    }

    // [NEW] Lock if Pending
    if (sub.status == SubscriptionStatus.pending) {
      return const SubscriptionPendingScreen();
    }

    return Scaffold(
      key: _scaffoldKey, // [FIX] Assigned Key
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: LayoutBuilder(
        builder: (context, constraints) {
          bool isDesktop = constraints.maxWidth >= 600;

          if (isDesktop) {
            return _buildDesktopLayout(context, constraints, cart);
          } else {
            final mobile = WillPopScope(
              onWillPop: () async {
                final nav = _tabNavigatorKeys[_bottomNavIndex].currentState;
                if (nav != null && nav.canPop()) {
                  nav.pop();
                  return false;
                }
                return true;
              },
              child: Scaffold(
                backgroundColor: Theme.of(context).scaffoldBackgroundColor,
                extendBody: false,
                body: IndexedStack(
                  index: _bottomNavIndex,
                  children: [
                    _buildTabNavigator(
                        tabIndex: 0,
                        rootBuilder: (ctx) => _buildSuperAppHome(ctx, cart)),
                    _buildTabNavigator(
                        tabIndex: 1,
                        rootBuilder: (_) => const OrderListScreen()),
                    _buildTabNavigator(
                        tabIndex: 2, rootBuilder: (_) => const ScanScreen()),
                    _buildTabNavigator(
                        tabIndex: 3, rootBuilder: (_) => const ReportScreen()),
                    _buildTabNavigator(
                        tabIndex: 4,
                        rootBuilder: (_) => const SettingsScreen()),
                  ],
                ),
                bottomNavigationBar: SafeArea(
                  top: false,
                  child: Container(
                    height: 70,
                    margin: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                    decoration: BoxDecoration(
                      color: Colors.transparent,
                      borderRadius: BorderRadius.circular(35),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.08),
                          blurRadius: 20,
                          offset: const Offset(0, 10),
                        ),
                      ],
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(35),
                      child: BackdropFilter(
                        filter: ImageFilter.blur(sigmaX: 6, sigmaY: 6),
                        child: Container(
                          color: Theme.of(context)
                              .colorScheme
                              .surface
                              .withOpacity(0.95),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceAround,
                            children: [
                              _buildNavItem(0, Icons.grid_view_rounded, 'Home'),
                              _buildNavItem(1, Icons.receipt_long_rounded, 'Pesanan', badge: _newOrdersCount),
                              _buildCenterScanButton(),
                              _buildNavItem(3, Icons.bar_chart_rounded, 'Laporan'),
                              _buildNavItem(4, Icons.person_rounded, 'Akun'),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            );

            return mobile;
          }
        },
      ),
    );
  }

  Widget _buildCenterScanButton() {
    return GestureDetector(
      onTap: () {
        HapticFeedback.mediumImpact();
        _switchTab(2);
      },
      child: Container(
        width: 56,
        height: 56,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              ThemeConfig.brandColor,
              ThemeConfig.brandColor.withOpacity(0.8),
            ],
          ),
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: ThemeConfig.brandColor.withOpacity(0.4),
              blurRadius: 16,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: const Icon(Icons.qr_code_scanner_rounded, color: Colors.white, size: 28),
      )
      .animate(target: _bottomNavIndex == 2 ? 1 : 0)
      .scale(begin: const Offset(1, 1), end: const Offset(1.1, 1.1), duration: 200.ms),
    );
  }

  Widget _buildNavItem(int index, IconData icon, String label, {bool isCenter = false, int badge = 0}) {
    final isSelected = _bottomNavIndex == index;
    final colorScheme = Theme.of(context).colorScheme;
    final activeColor = ThemeConfig.brandColor;
    final inactiveColor = colorScheme.onSurface.withOpacity(0.4);

    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        if (index == _bottomNavIndex) {
          _tabNavigatorKeys[index].currentState?.popUntil((r) => r.isFirst);
          return;
        }
        _switchTab(index);
      },
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOutBack,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? activeColor.withOpacity(0.1) : Colors.transparent,
          borderRadius: BorderRadius.circular(24),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              color: isSelected ? activeColor : inactiveColor,
              size: 24,
            ),
            if (isSelected) ...[
              const SizedBox(width: 8),
              Text(
                label,
                style: GoogleFonts.outfit(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: activeColor,
                ),
              ).animate().fade(duration: 200.ms).slideX(begin: -0.2, end: 0),
            ],
            if (badge > 0 && !isSelected) ...[
              const SizedBox(width: 4),
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: Colors.red,
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 1.5),
                ),
              ).animate().scale(duration: 300.ms, curve: Curves.elasticOut),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildTabNavigator(
      {required int tabIndex,
      required Widget Function(BuildContext) rootBuilder}) {
    return Navigator(
      key: _tabNavigatorKeys[tabIndex],
      onGenerateRoute: (settings) => MaterialPageRoute(
        settings: settings,
        builder: (ctx) => rootBuilder(ctx),
      ),
    );
  }

  // [NEW] Super App Home Body (Pro Version)
  Widget _buildSuperAppHome(BuildContext navContext, CartProvider cart) {
    final scaffoldBg = Theme.of(navContext).scaffoldBackgroundColor;

    return Scaffold(
      backgroundColor: scaffoldBg,
      appBar: null,
      body: RefreshIndicator(
        onRefresh: () async {
          _refreshHomeInfo(force: true);
          _refreshNewOrdersCountFromApi();
          _refreshNotificationBadge();
          _refreshSupportBadge();
          _loadInsight();
          context.read<WalletProvider>().loadData();
          await _loadHomeBanners();
          await _loadProducts();
          final sub = Provider.of<SubscriptionProvider>(context, listen: false);
          await sub.codeCheckSubscription();
        },
        color: ThemeConfig.brandColor,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(), // [UX] Ensure it can always pull-to-refresh
          controller: _scrollController,
          slivers: [
            _buildSliverAppBar(navContext),
            SliverToBoxAdapter(
              child: Column(
                children: [
                  if (_isOffline) _buildOfflineBannerUI(navContext),
                  if (_showBeginnerTip) const SizedBox(height: 16),
                  if (_showBeginnerTip) _buildBeginnerTipBanner(navContext),
                  if (_showBeginnerTip) const SizedBox(height: 16),
                  _buildLiveTicker(),
                  const SizedBox(height: 16),
                  const SalesSummaryCard()
                      .animate()
                      .fade(duration: 300.ms)
                      .slideY(begin: 0.05, end: 0),
                  const SizedBox(height: 24),
                  FeatureGrid(
                    maintenanceMap: _maintenanceMap,
                    newOrdersCount: _newOrdersCount,
                    unreadSupportCount: _unreadSupportCount,
                    onSwitchTab: _switchTab,
                  ),
                  _buildLowStockAlert(),
                  if (_aiInsights.isNotEmpty) _buildAiInsightSection(navContext),
                  const SizedBox(height: 24),
                  _buildAnnouncementsSection(navContext),
                  const SizedBox(height: 16),
                  _buildBlogCarousel(navContext)
                      .animate()
                      .fade(delay: 500.ms)
                      .slideX(begin: 0.2),
                  const SizedBox(height: 24),
                  _buildHelpSectionHeader(navContext),
                  const SizedBox(height: 12),
                  _buildHelpSection(navContext)
                      .animate()
                      .fade(delay: 300.ms)
                      .slideY(begin: 0.08, end: 0),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // [OPTIMIZATION] Extracted Widgets from _buildSuperAppHome

  
  Widget _buildSyncAndOfflineBanner(BuildContext navContext) {
    return StreamBuilder<Map<String, dynamic>>(
      stream: SyncService().statusStream,
      builder: (context, snapshot) {
        final isOnline = snapshot.data?['online'] ?? !_isOffline;
        final isSyncing = snapshot.data?['isSyncing'] ?? SyncService().isSyncing;

        if (!isOnline) {
          return Column(
            children: [
              _buildOfflineBannerUI(navContext),
              const SizedBox(height: 16),
            ],
          );
        }

        if (isSyncing) {
          return Column(
            children: [
              _buildSyncingBannerUI(navContext),
              const SizedBox(height: 16),
            ],
          );
        }

        return const SizedBox.shrink();
      },
    );
  }

  Widget _buildSyncingBannerUI(BuildContext navContext) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.blue.withOpacity(0.16),
              blurRadius: 14,
              offset: const Offset(0, 6),
            ),
          ],
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Colors.blue.shade600,
              Colors.blue.shade400,
            ],
          ),
          border: Border.all(
            color: Colors.white.withOpacity(0.2),
            width: 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.18),
                shape: BoxShape.circle,
              ),
              child: const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Menyinkronkan data...',
                style: GoogleFonts.outfit(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                    fontSize: 12),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOfflineBannerUI(BuildContext navContext) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Theme.of(navContext).colorScheme.primary.withOpacity(0.16),
              blurRadius: 14,
              offset: const Offset(0, 6),
            ),
          ],
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Theme.of(navContext).colorScheme.primary,
              Theme.of(navContext).colorScheme.primary.withOpacity(0.92),
            ],
          ),
          border: Border.all(
            color: Colors.white.withOpacity(0.2),
            width: 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.18),
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.wifi_off,
                  color: Theme.of(navContext).colorScheme.onPrimary,
                  size: 16),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Mode Offline — data tersimpan lokal',
                style: GoogleFonts.outfit(
                    color: Theme.of(navContext).colorScheme.onPrimary,
                    fontWeight: FontWeight.w600,
                    fontSize: 12),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 12),
            TextButton(
              onPressed: () async {
                try {
                  await SyncService().syncTransactions();
                  await SyncService().syncProducts();
                  if (!mounted) return;
                  ScaffoldMessenger.of(navContext).showSnackBar(
                    SnackBar(
                      content: Text('Sinkronisasi dicoba'),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                } catch (_) {
                  if (!mounted) return;
                  ScaffoldMessenger.of(navContext).showSnackBar(
                    SnackBar(
                      content: Text('Gagal sinkron, cek koneksi'),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                }
              },
              style: TextButton.styleFrom(
                foregroundColor: Theme.of(navContext).colorScheme.onPrimary,
                backgroundColor: Colors.white.withOpacity(0.18),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('Coba Sinkron', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBeginnerTipBanner(BuildContext navContext) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Theme.of(navContext)
                  .colorScheme
                  .surface
                  .withOpacity(0.98),
              Theme.of(navContext)
                  .colorScheme
                  .surface
                  .withOpacity(0.94),
            ],
          ),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: Theme.of(navContext)
                .colorScheme
                .outline
                .withOpacity(0.18),
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: Theme.of(navContext)
                    .colorScheme
                    .primary
                    .withOpacity(0.08),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.lightbulb_outline,
                color: Theme.of(navContext).colorScheme.primary,
                size: 18,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Tips untuk kamu',
                    style: GoogleFonts.poppins(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Theme.of(navContext)
                          .colorScheme
                          .primary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Tambah lebih banyak produk agar pelanggan mudah memilih.',
                    style: GoogleFonts.poppins(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: Theme.of(navContext)
                          .colorScheme
                          .onSurface,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            InkWell(
              onTap: _dismissBeginnerTip,
              borderRadius: BorderRadius.circular(16),
              child: Padding(
                padding: const EdgeInsets.all(4),
                child: Icon(
                  Icons.close,
                  size: 16,
                  color: Theme.of(navContext)
                      .colorScheme
                      .onSurface
                      .withOpacity(0.5),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLowStockAlert() {
    return Builder(builder: (ctx) {
      final lowItems = products.where((p) => (p['stock'] ?? 0) <= 5).toList();
      if (lowItems.isEmpty) return const SizedBox.shrink();
      return Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
        child: GestureDetector(
          onTap: () => Navigator.push(ctx, MaterialPageRoute(builder: (_) => const StockOpnameScreen())),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFE07A5F).withOpacity(0.1),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE07A5F).withOpacity(0.5)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.warning_amber_rounded, color: Color(0xFFE07A5F), size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '${lowItems.length} Produk Hampir Habis! Segera Restok.',
                        style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: const Color(0xFFE07A5F), fontSize: 13),
                      ),
                    ),
                    Icon(Icons.arrow_forward_ios_rounded, color: const Color(0xFFE07A5F).withOpacity(0.7), size: 14),
                  ],
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 6, runSpacing: 4,
                  children: lowItems.take(4).map((p) => Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE07A5F).withOpacity(0.15),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      '${p['name']} (${p['stock']})',
                      style: GoogleFonts.outfit(fontSize: 11, fontWeight: FontWeight.w600, color: const Color(0xFFE07A5F)),
                    ),
                  )).toList(),
                ),
              ],
            ),
          ).animate().fadeIn(duration: 400.ms).slideY(begin: -0.08),
        ),
      );
    });
  }

  Widget _buildAiInsightSection(BuildContext navContext) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Rana AI Insight',
                style: GoogleFonts.poppins(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color:
                      Theme.of(navContext).colorScheme.onSurface,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(20),
                  color: Theme.of(navContext)
                      .colorScheme
                      .primary
                      .withOpacity(0.08),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.auto_awesome,
                      size: 14,
                      color: Theme.of(navContext)
                          .colorScheme
                          .primary,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'Insight pintar toko kamu',
                      style: GoogleFonts.poppins(
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                        color: Theme.of(navContext)
                            .colorScheme
                            .primary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        _buildAiInsightsCarousel(navContext)
            .animate()
            .fade(delay: 300.ms)
            .slideX(),
      ],
    );
  }

  Widget _buildAiInsightsCarousel(BuildContext context) {
    if (_aiInsights.isEmpty) return const SizedBox.shrink();
    return Column(
      children: [
        SizedBox(
          height: 180,
          child: PageView.builder(
            controller: _aiPageController,
            itemCount: _aiInsights.length,
            onPageChanged: (idx) => setState(() => _aiPageIndex = idx),
            itemBuilder: (context, index) {
              final insight = _aiInsights[index];
              return _buildAiInsightCard(context, insight);
            },
          ),
        ),
        if (_aiInsights.length > 1) ...[
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(_aiInsights.length, (i) {
              final active = i == _aiPageIndex;
              return AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                margin: const EdgeInsets.symmetric(horizontal: 4),
                width: active ? 18 : 6,
                height: 6,
                decoration: BoxDecoration(
                  color: active
                      ? Theme.of(context).colorScheme.primary
                      : Theme.of(context).colorScheme.primary.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(10),
                ),
              );
            }),
          ),
        ],
      ],
    );
  }

  Future<void> _speakInsight(String text) async {
    if (_isSpeaking) {
      await _tts.stop();
      setState(() => _isSpeaking = false);
      return;
    }
    setState(() => _isSpeaking = true);
    await _tts.setLanguage("id-ID");
    await _tts.setPitch(1.0);
    await _tts.speak(text);
    _tts.setCompletionHandler(() {
      if (mounted) setState(() => _isSpeaking = false);
    });
  }

  void _handleInsightAction(String? action, Map<String, dynamic>? data) {
    if (action == null) return;
    switch (action) {
      case 'OPEN_STOCK':
        Navigator.of(context, rootNavigator: true)
            .push(MaterialPageRoute(builder: (_) => const StockOpnameScreen()));
        break;
      case 'PROMO':
        Navigator.of(context, rootNavigator: true)
            .push(MaterialPageRoute(builder: (_) => const PromoHubScreen()));
        break;
      case 'POS':
        Navigator.of(context, rootNavigator: true)
            .push(MaterialPageRoute(builder: (_) => const PosScreen()));
        break;
      case 'REPORT':
        Navigator.of(context, rootNavigator: true)
            .push(MaterialPageRoute(builder: (_) => const ReportScreen()));
        break;
      case 'EXPENSES':
        // Handle expenses action
        break;
    }
  }

  Widget _buildAiInsightCard(BuildContext context, Map<String, dynamic> insight) {
    final colorScheme = Theme.of(context).colorScheme;
    final title =
        insight['title']?.toString() ?? insight['short']?.toString() ?? 'Insight';
    final content =
        insight['message']?.toString() ?? insight['content']?.toString() ?? '';
    final type = insight['type']?.toString() ?? 'INFO';
    final iconName = insight['icon']?.toString();
    final colorHex = insight['color'] as int?;
    final progress = (insight['progress'] as num?)?.toDouble();
    final action = insight['action']?.toString();
    final actionLabel = insight['actionLabel']?.toString();

    Color typeColor;
    IconData typeIcon;

    if (colorHex != null) {
      typeColor = Color(colorHex);
    } else {
      switch (type) {
        case 'ALERT':
        case 'WARNING':
          typeColor = Colors.orange;
          break;
        case 'SUCCESS':
        case 'TIP':
          typeColor = Colors.green;
          break;
        case 'STRATEGY':
        case 'PREDICTION':
          typeColor = colorScheme.primary;
          break;
        default:
          typeColor = colorScheme.primary;
      }
    }

    if (iconName != null) {
      typeIcon = _getIcon(iconName);
    } else {
      switch (type) {
        case 'ALERT':
        case 'WARNING':
          typeIcon = Icons.warning_amber_rounded;
          break;
        case 'SUCCESS':
        case 'TIP':
          typeIcon = Icons.check_circle_outline_rounded;
          break;
        default:
          typeIcon = Icons.lightbulb_outline_rounded;
      }
    }

    return Container(
      margin: const EdgeInsets.only(right: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: typeColor.withOpacity(0.15), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: typeColor.withOpacity(0.05),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: typeColor.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(typeIcon, color: typeColor, size: 18),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  title,
                  style: GoogleFonts.outfit(
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                    color: colorScheme.onSurface,
                  ),
                ),
              ),
              IconButton(
                onPressed: () => _speakInsight("$title. $content"),
                icon: Icon(
                  _isSpeaking ? Icons.stop_circle_rounded : Icons.volume_up_rounded,
                  color: typeColor.withOpacity(0.6),
                  size: 22,
                ),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Expanded(
            child: Text(
              content,
              style: GoogleFonts.outfit(
                fontSize: 13,
                color: colorScheme.onSurface.withOpacity(0.7),
                height: 1.4,
              ),
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          if (progress != null) ...[
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: progress,
                backgroundColor: typeColor.withOpacity(0.1),
                valueColor: AlwaysStoppedAnimation<Color>(typeColor),
                minHeight: 6,
              ),
            ),
          ],
          if (actionLabel != null || true) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                if (actionLabel != null)
                  Expanded(
                    child: FilledButton(
                      onPressed: () => _handleInsightAction(action, insight['data']),
                      style: FilledButton.styleFrom(
                        backgroundColor: typeColor,
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: Text(
                        actionLabel,
                        style: GoogleFonts.outfit(
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ),
                if (actionLabel != null) const SizedBox(width: 8),
                _buildInsightFeedback(insight),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildInsightFeedback(Map<String, dynamic> insight) {
    final key = _buildInsightKey(insight);
    final feedback = _aiInsightFeedback[key] ?? 0;
    return Row(
      children: [
        IconButton(
          icon: Icon(
            feedback == 1 ? Icons.thumb_up_rounded : Icons.thumb_up_outlined,
            size: 18,
            color: feedback == 1 ? Colors.green : Colors.grey,
          ),
          onPressed: () {
            setState(() {
              _aiInsightFeedback[key] = feedback == 1 ? 0 : 1;
            });
          },
        ),
        IconButton(
          icon: Icon(
            feedback == -1 ? Icons.thumb_down_rounded : Icons.thumb_down_outlined,
            size: 18,
            color: feedback == -1 ? Colors.red : Colors.grey,
          ),
          onPressed: () {
            setState(() {
              _aiInsightFeedback[key] = feedback == -1 ? 0 : -1;
            });
          },
        ),
      ],
    );
  }

  Widget _buildAnnouncementsSection(BuildContext navContext) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Info Terkini',
                  style: GoogleFonts.poppins(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color:
                          Theme.of(navContext).colorScheme.onSurface)),
              InkWell(
                onTap: () => Navigator.push(
                    navContext,
                    MaterialPageRoute(
                        builder: (_) => const AnnouncementsScreen())),
                child: Text('Lihat Semua',
                    style: GoogleFonts.poppins(
                        color: Theme.of(navContext).colorScheme.primary,
                        fontWeight: FontWeight.w600)),
              )
            ],
          ),
        ),
        const SizedBox(height: 16),
        const SizedBox.shrink(),
      ],
    );
  }

  Widget _buildHelpSectionHeader(BuildContext navContext) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text('Panduan & Bantuan',
              style: GoogleFonts.poppins(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color:
                      Theme.of(navContext).colorScheme.onSurface)),
          TextButton(
              onPressed: () => Navigator.push(
                  navContext,
                  MaterialPageRoute(
                      builder: (_) => const SupportScreen())),
              child: Text('Bantuan',
                  style: GoogleFonts.poppins(
                      color:
                          Theme.of(navContext).colorScheme.primary,
                      fontWeight: FontWeight.w600)))
        ],
      ),
    );
  }

  PreferredSizeWidget _buildTopAppBar(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final user = authProvider.currentUser;
    final hour = DateTime.now().hour;
    String greeting;
    if (hour < 11) {
      greeting = 'Selamat pagi,';
    } else if (hour < 15) {
      greeting = 'Selamat siang,';
    } else if (hour < 18) {
      greeting = 'Selamat sore,';
    } else {
      greeting = 'Selamat malam,';
    }
    final rawBusinessName = (user?['businessName'] ?? '').toString().trim();
    final storeName = rawBusinessName.isNotEmpty ? rawBusinessName : (_storeName ?? 'TOKO');
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return AppBar(
      toolbarHeight: 72,
      backgroundColor: isDark ? colorScheme.surface : ThemeConfig.brandColor,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(20)),
      ),
      flexibleSpace: Container(
        decoration: BoxDecoration(
          gradient: isDark
              ? LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    colorScheme.surface,
                    colorScheme.surface.withOpacity(0.96),
                  ],
                )
              : LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    ThemeConfig.brandColor,
                    ThemeConfig.brandColor.withOpacity(0.92),
                  ],
                ),
        ),
      ),
      leadingWidth: 66,
      leading: Container(
        margin: const EdgeInsets.only(left: 8),
        decoration: BoxDecoration(
          color: isDark ? Colors.white.withOpacity(0.1) : Colors.white.withOpacity(0.15),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white.withOpacity(0.1)),
        ),
        child: IconButton(
          icon: Icon(Icons.grid_view_rounded, color: isDark ? colorScheme.onSurface : Colors.white, size: 22),
          onPressed: () => _scaffoldKey.currentState?.openDrawer(),
          padding: EdgeInsets.zero,
        ),
      ),
      titleSpacing: 0,
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            greeting,
            style: GoogleFonts.outfit(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: isDark ? colorScheme.onSurface.withOpacity(0.9) : Colors.white.withOpacity(0.9),
            ),
          ),
          Row(
            children: [
              Icon(
                Icons.storefront_rounded,
                color: isDark ? colorScheme.onSurface : Colors.white,
                size: 20,
              ).animate().scale(delay: 300.ms),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  storeName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.outfit(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: isDark ? colorScheme.onSurface : Colors.white,
                    height: 1.2,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
      actions: [
        Consumer<ThemeProvider>(
          builder: (context, themeProvider, _) {
            final isDarkTheme = themeProvider.mode == ThemeMode.dark;
            return Container(
              margin: const EdgeInsets.only(right: 8),
              decoration: BoxDecoration(
                color: isDark ? Colors.white.withOpacity(0.1) : Colors.white.withOpacity(0.15),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white.withOpacity(0.1)),
              ),
              child: IconButton(
                icon: Icon(
                  isDarkTheme ? Icons.light_mode_rounded : Icons.dark_mode_rounded,
                  color: isDark ? colorScheme.onSurface : Colors.white,
                  size: 20,
                ),
                onPressed: () {
                  themeProvider.toggle();
                },
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 40, minHeight: 40),
              ),
            );
          },
        ),
        Container(
          margin: const EdgeInsets.only(right: 8),
          decoration: BoxDecoration(
            color: isDark ? Colors.white.withOpacity(0.1) : Colors.white.withOpacity(0.15),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.white.withOpacity(0.1)),
          ),
          child: IconButton(
            icon: Icon(Icons.chat_bubble_outline_rounded,
                color: isDark ? colorScheme.onSurface : Colors.white, size: 20),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const ChatScreen()),
              );
            },
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 40, minHeight: 40),
          ),
        ),
        Container(
          margin: const EdgeInsets.only(right: 12),
          decoration: BoxDecoration(
            color: isDark ? Colors.white.withOpacity(0.1) : Colors.white.withOpacity(0.15),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.white.withOpacity(0.1)),
          ),
          child: IconButton(
            icon: Icon(Icons.notifications_outlined,
                color: isDark ? colorScheme.onSurface : Colors.white, size: 22),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (context) => const NotificationScreen()),
              );
            },
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 40, minHeight: 40),
          ),
        ),
      ],
    );
  }

  Widget _buildSliverAppBar(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final user = authProvider.currentUser;
    final wallet = Provider.of<WalletProvider>(context);
    final themeProvider = Provider.of<ThemeProvider>(context);
    final bannerHeight =
        (MediaQuery.of(context).size.width * 0.68).clamp(340.0, 520.0).toDouble();

    // 1. Dynamic Greeting
    final hour = DateTime.now().hour;
    String greeting;
    if (hour < 11) {
      greeting = 'Selamat pagi,';
    } else if (hour < 15) {
      greeting = 'Selamat siang,';
    } else if (hour < 18) {
      greeting = 'Selamat sore,';
    } else {
      greeting = 'Selamat malam,';
    }

    final ownerName = user?['name']?.toString() ?? 'PARTNER';
    String storeName;
    final rawBusinessName = (user?['businessName'] ?? '').toString().trim();
    if (rawBusinessName.isNotEmpty) {
      storeName = rawBusinessName;
    } else {
      storeName = (_storeName ?? 'TOKO');
    }
    String logoUrl = '';
    final logoKeys = ['storeImage', 'storeImageUrl', 'imageUrl', 'logoUrl', 'photoUrl'];
    for (final key in logoKeys) {
      final v = user?[key];
      if (v != null) {
        final s = v.toString().trim();
        if (s.isNotEmpty) {
          logoUrl = ApiService().resolveFileUrl(s);
          break;
        }
      }
    }
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final width = MediaQuery.of(context).size.width;
    final isNarrow = width < 360;
    final isCompact = width < 420;
    final showWalletAmount = width >= 460;
    final formattedBalance = NumberFormat.currency(
      locale: 'id_ID',
      symbol: 'Rp',
      decimalDigits: 0,
    ).format(wallet.balance);

    Widget actionContainer({
      required Widget child,
      EdgeInsets margin = const EdgeInsets.only(right: 8, top: 8, bottom: 8),
      BorderRadius borderRadius = const BorderRadius.all(Radius.circular(12)),
      Color? backgroundColor,
    }) {
      return Container(
        margin: margin,
        decoration: BoxDecoration(
          color: backgroundColor ??
              (isDark ? Colors.white.withOpacity(0.1) : Colors.white.withOpacity(0.15)),
          borderRadius: borderRadius,
          border: Border.all(color: Colors.white.withOpacity(0.1)),
        ),
        child: child,
      );
    }

    Widget badgeCounter(int count) {
      if (count <= 0) return const SizedBox.shrink();
      final label = count > 99 ? '99+' : count.toString();
      return Positioned(
        right: 2,
        top: 2,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
          decoration: BoxDecoration(
            color: colorScheme.error,
            borderRadius: BorderRadius.circular(999),
            border: Border.all(
              color: isDark ? colorScheme.surface : Colors.white,
              width: 1,
            ),
          ),
          constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: GoogleFonts.outfit(
              color: colorScheme.onError,
              fontSize: 9,
              fontWeight: FontWeight.w800,
              height: 1.1,
            ),
          ),
        ),
      );
    }

    Widget iconAction({
      required IconData icon,
      required VoidCallback onTap,
      int badgeCount = 0,
      double iconSize = 22,
      EdgeInsets margin = const EdgeInsets.only(right: 8, top: 8, bottom: 8),
    }) {
      return actionContainer(
        margin: margin,
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            IconButton(
              icon: Icon(icon,
                  color: isDark ? colorScheme.onSurface : Colors.white,
                  size: iconSize),
              onPressed: onTap,
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(minWidth: 40, minHeight: 40),
            ),
            badgeCounter(badgeCount),
          ],
        ),
      );
    }

    Widget menuAction({
      required List<PopupMenuEntry<String>> items,
      required ValueChanged<String> onSelected,
      EdgeInsets margin = const EdgeInsets.only(right: 16, top: 8, bottom: 8),
    }) {
      return actionContainer(
        margin: margin,
        child: PopupMenuButton<String>(
          tooltip: 'Menu',
          onSelected: onSelected,
          itemBuilder: (_) => items,
          offset: const Offset(0, 44),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          child: SizedBox(
            width: 40,
            height: 40,
            child: Center(
              child: Icon(
                Icons.more_vert_rounded,
                color: isDark ? colorScheme.onSurface : Colors.white,
                size: 20,
              ),
            ),
          ),
        ),
      );
    }

    return SliverAppBar(
      pinned: true,
      floating: false,
      snap: false,
      expandedHeight: bannerHeight,
      backgroundColor: isDark ? colorScheme.surface : ThemeConfig.brandColor,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      toolbarHeight: 56,
      leadingWidth: 48,
      leading: Padding(
        padding: const EdgeInsets.only(left: 8),
        child: CircleAvatar(
          radius: 20,
          backgroundColor: isDark ? colorScheme.primary.withOpacity(0.2) : Colors.white.withOpacity(0.9),
          child: logoUrl.isNotEmpty
              ? ClipOval(
                  child: Image.network(
                    logoUrl,
                    width: 40,
                    height: 40,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Center(
                      child: Text(
                        (storeName.isNotEmpty ? storeName[0] : 'T'),
                        style: GoogleFonts.outfit(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: isDark ? colorScheme.onSurface : ThemeConfig.brandColor,
                        ),
                      ),
                    ),
                  ),
                )
              : Text(
                  (storeName.isNotEmpty ? storeName[0] : 'T'),
                  style: GoogleFonts.outfit(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: isDark ? colorScheme.onSurface : ThemeConfig.brandColor,
                  ),
                ),
        ),
      ),
      titleSpacing: 0,
      centerTitle: false,
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            greeting,
            style: GoogleFonts.outfit(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: isDark ? colorScheme.onSurface.withOpacity(0.9) : Colors.white.withOpacity(0.9),
            ),
          ),
          Row(
            children: [
              Icon(
                Icons.storefront_rounded,
                color: isDark ? colorScheme.onSurface : Colors.white,
                size: 20,
              ).animate().scale(delay: 300.ms),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  storeName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.outfit(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: isDark ? colorScheme.onSurface : Colors.white,
                    height: 1.2,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
      actions: [
        if (!isCompact)
          iconAction(
            icon: themeProvider.mode == ThemeMode.dark
                ? Icons.light_mode_rounded
                : Icons.dark_mode_rounded,
            onTap: themeProvider.toggle,
          ),
        if (!isNarrow)
          iconAction(
            icon: Icons.chat_bubble_outline_rounded,
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const ChatScreen()),
              );
            },
            badgeCount: _unreadSupportCount,
          ),
        iconAction(
          icon: Icons.notifications_outlined,
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const NotificationScreen()),
            );
          },
          badgeCount: _unreadNotificationCount,
        ),
        if (!isNarrow)
          actionContainer(
            margin: const EdgeInsets.only(right: 12, top: 8, bottom: 8),
            borderRadius: BorderRadius.circular(999),
            backgroundColor:
                isDark ? Colors.white.withOpacity(0.12) : Colors.white.withOpacity(0.22),
            child: InkWell(
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const WalletScreen()),
                );
              },
              borderRadius: BorderRadius.circular(999),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.account_balance_wallet_outlined,
                      size: 22,
                      color: isDark ? colorScheme.onSurface : Colors.white,
                    ),
                    if (showWalletAmount) ...[
                      const SizedBox(width: 8),
                      Text(
                        formattedBalance,
                        style: GoogleFonts.outfit(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: isDark ? colorScheme.onSurface : Colors.white,
                        ),
                      ),
                    ]
                  ],
                ),
              ),
            ),
          ),
        if (isNarrow || isCompact)
          menuAction(
            items: [
              if (isCompact)
                PopupMenuItem(
                  value: 'theme',
                  child: Text(
                    themeProvider.mode == ThemeMode.dark ? 'Tema terang' : 'Tema gelap',
                  ),
                ),
              if (isNarrow)
                const PopupMenuItem(
                  value: 'chat',
                  child: Text('Chat'),
                ),
              const PopupMenuItem(
                value: 'wallet',
                child: Text('Dompet'),
              ),
            ],
            onSelected: (value) {
              switch (value) {
                case 'theme':
                  themeProvider.toggle();
                  break;
                case 'chat':
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const ChatScreen()),
                  );
                  break;
                case 'wallet':
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const WalletScreen()),
                  );
                  break;
              }
            },
          ),
      ],
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          bottom: Radius.circular(44),
        ),
      ),
      flexibleSpace: FlexibleSpaceBar(
        collapseMode: CollapseMode.parallax,
        background: ClipRRect(
          borderRadius: const BorderRadius.vertical(bottom: Radius.circular(44)),
          child: Stack(
            fit: StackFit.expand,
            children: [
              if (_isLoadingBanners)
                Shimmer.fromColors(
                  baseColor: isDark ? colorScheme.surfaceVariant.withOpacity(0.5) : Colors.white.withOpacity(0.2),
                  highlightColor: isDark ? colorScheme.surfaceVariant : Colors.white.withOpacity(0.5),
                  child: Container(color: Colors.white),
                )
              else if (_homeBanners.isEmpty)
                Container(color: Theme.of(context).colorScheme.surface)
              else
                PageView.builder(
                  controller: _bannerPageController,
                  itemCount: _homeBanners.length,
                  onPageChanged: (idx) {
                    setState(() {
                      _bannerPageIndex = idx;
                      _bannerProgress = 0.0;
                    });
                    _prefetchBannerImagesAroundIndex(idx);
                  },
                  itemBuilder: (_, index) {
                    final item = _homeBanners[index] as Map;
                    final rawImageUrl = (item['imageUrl'] ?? '').toString();
                    final imageUrl = ApiService().resolveFileUrl(rawImageUrl);
                    final hasImage = imageUrl.isNotEmpty;
                    return InkWell(
                      onTap: () {
                        _pauseBannerAutoFor(const Duration(seconds: 8));
                        _handleBannerTap(item);
                      },
                      child: hasImage
                          ? Image.network(
                              imageUrl,
                              fit: BoxFit.cover,
                              gaplessPlayback: true,
                              filterQuality: FilterQuality.low,
                              errorBuilder: (context, error, stackTrace) =>
                                  Container(color: Theme.of(context).colorScheme.surface),
                            )
                          : Container(color: Theme.of(context).colorScheme.surface),
                    );
                  },
                ),
              if (_homeBanners.length > 1)
                Positioned(
                  left: 0,
                  right: 0,
                  bottom: 16,
                  child: _buildBannerDotsRow(),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildWalletAction(BuildContext context, IconData icon, String label, VoidCallback onTap, bool isDark) {
    return Column(
      children: [
        Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(16),
            child: Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: isDark ? Colors.white.withOpacity(0.1) : Colors.white.withOpacity(0.2),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isDark ? Colors.white.withOpacity(0.1) : Colors.white.withOpacity(0.2),
                  width: 1,
                ),
              ),
              child: Icon(icon, color: isDark ? Theme.of(context).colorScheme.onSurface : Colors.white, size: 24),
            ),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          label,
          style: GoogleFonts.outfit(
            color: isDark ? Theme.of(context).colorScheme.onSurface.withOpacity(0.9) : Colors.white.withOpacity(0.9),
            fontSize: 12,
            fontWeight: FontWeight.w500,
          ),
        )
      ],
    );
  }

  Widget _buildAppBarAction(
    BuildContext context, {
    required IconData icon,
    required int badgeCount,
    required VoidCallback onTap,
    Color? iconColor,
    Color? bgColor,
  }) {
    final colorScheme = Theme.of(context).colorScheme;
    return Stack(
      alignment: Alignment.center,
      children: [
        Container(
          decoration: BoxDecoration(
            color: bgColor ?? colorScheme.surface.withOpacity(0.5),
            shape: BoxShape.circle,
          ),
          child: IconButton(
            onPressed: onTap,
            icon: Icon(icon, color: iconColor ?? colorScheme.onSurface, size: 20),
            padding: const EdgeInsets.all(8),
            constraints: const BoxConstraints(),
          ),
        ),
        if (badgeCount > 0)
          Positioned(
            right: 0,
            top: 0,
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: Colors.redAccent,
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 1.5),
              ),
              constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
              child: Text(
                badgeCount > 9 ? '9+' : '$badgeCount',
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 8,
                    fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildHomeBannerCarousel() {
    return HomeBannerCarousel(
      homeBanners: _homeBanners,
      isLoadingBanners: _isLoadingBanners,
      bannerPageController: _bannerPageController,
      bannerPageIndex: _bannerPageIndex,
      bannerProgress: _bannerProgress,
      onPageChanged: (idx) {
        setState(() {
          _bannerPageIndex = idx;
          _bannerProgress = 0.0;
        });
        _prefetchBannerImagesAroundIndex(idx);
      },
      onBannerTap: _handleBannerTap,
      onDotTap: (index) {
        _bannerPageController.animateToPage(
          index,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOutCubic,
        );
      },
      onPauseAuto: _pauseBannerAutoFor,
    );
  }

  Widget _buildBannerDotsRow() {
    return HomeBannerDots(
      homeBanners: _homeBanners,
      bannerPageIndex: _bannerPageIndex,
      onDotTap: (index) {
        _bannerPageController.animateToPage(
          index,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOutCubic,
        );
      },
      onPauseAuto: _pauseBannerAutoFor,
    );
  }


  // [NEW] Live Ticker
  Widget _buildLiveTicker() {
    return FutureBuilder<List<dynamic>>(
      future: _announcementsFuture,
      builder: (context, snapshot) {
        if (!snapshot.hasData || snapshot.data!.isEmpty) {
          return const SizedBox.shrink();
        }

        // Find a promo or just take the latest
        final item = snapshot.data!.first;
        final text = "${item['title']}: ${item['content']}";

        return Container(
          margin: const EdgeInsets.symmetric(horizontal: 24),
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
          decoration: BoxDecoration(
            color: ThemeConfig.brandColor.withOpacity(0.08),
            borderRadius: BorderRadius.circular(999),
            border: Border.all(
              color: Theme.of(context).colorScheme.outline.withOpacity(0.14),
              width: 1,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 26,
                height: 26,
                decoration: BoxDecoration(
                  color: ThemeConfig.brandColor.withOpacity(0.12),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.campaign, size: 14, color: ThemeConfig.brandColor),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  text,
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    color: ThemeConfig.brandColor,
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8),
              TextButton(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const AnnouncementsScreen()),
                  );
                },
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  foregroundColor: Colors.white,
                  backgroundColor: ThemeConfig.brandColor,
                  minimumSize: const Size(0, 0),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
                child: const Text(
                  'Detail',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  // [NEW] Help Section
  Widget _buildHelpSection(BuildContext navContext) {
    final colorScheme = Theme.of(navContext).colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Row(
        children: [
          Expanded(
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: colorScheme.surface,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                    color: colorScheme.outline.withOpacity(0.12), width: 1),
                boxShadow: [
                  BoxShadow(
                      color: Colors.black.withOpacity(0.04),
                      blurRadius: 12,
                      offset: const Offset(0, 6))
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: ThemeConfig.brandColor.withOpacity(0.1),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.menu_book_rounded,
                            color: ThemeConfig.brandColor, size: 22),
                      ),
                      const SizedBox(width: 12),
                      Text('Panduan',
                          style: GoogleFonts.outfit(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: colorScheme.onSurface)),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Langkah-langkah dan tips memakai Rana.',
                    style: GoogleFonts.outfit(
                      fontSize: 12,
                      color: colorScheme.onSurface.withOpacity(0.7),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: TextButton(
                      onPressed: () => Navigator.push(
                          navContext,
                          MaterialPageRoute(
                              builder: (_) => const GuidelineScreen())),
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 8),
                        foregroundColor: ThemeConfig.brandColor,
                        minimumSize: const Size(0, 0),
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(999),
                          side: BorderSide(
                            color: ThemeConfig.brandColor.withOpacity(0.3),
                            width: 1,
                          ),
                        ),
                      ),
                      child: const Text('Lihat Panduan',
                          style: TextStyle(
                              fontSize: 12, fontWeight: FontWeight.w700)),
                    ),
                  )
                ],
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: colorScheme.surface,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                    color: colorScheme.outline.withOpacity(0.12), width: 1),
                boxShadow: [
                  BoxShadow(
                      color: Colors.black.withOpacity(0.04),
                      blurRadius: 12,
                      offset: const Offset(0, 6))
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: ThemeConfig.brandColor.withOpacity(0.1),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.support_agent_rounded,
                            color: ThemeConfig.brandColor, size: 22),
                      ),
                      const SizedBox(width: 12),
                      Text('Bantuan',
                          style: GoogleFonts.outfit(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: colorScheme.onSurface)),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Tim kami siap membantu. FAQ & support.',
                    style: GoogleFonts.outfit(
                      fontSize: 12,
                      color: colorScheme.onSurface.withOpacity(0.7),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: TextButton(
                      onPressed: () => Navigator.push(
                          navContext,
                          MaterialPageRoute(
                              builder: (_) => const SupportScreen())),
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 8),
                        foregroundColor: Colors.white,
                        backgroundColor: ThemeConfig.brandColor,
                        minimumSize: const Size(0, 0),
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(999),
                        ),
                      ),
                      child: const Text('Hubungi Support',
                          style: TextStyle(
                              fontSize: 12, fontWeight: FontWeight.w700)),
                    ),
                  )
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // [UPDATED] Glassmorphism Wallet Card
  Widget _buildWalletCard(BuildContext context) {
    return HomeWalletCard(
      scrollOffset: _scrollController.hasClients ? _scrollController.offset : 0.0,
      walletObscureBalance: _walletObscureBalance,
      walletExpanded: _walletExpanded,
      onToggleObscure: () => setState(() => _walletObscureBalance = !_walletObscureBalance),
      onToggleExpanded: () => setState(() => _walletExpanded = !_walletExpanded),
    );
  }

  // [UPDATED] Feature Grid with Modern Cards
  // Removed internal _buildFeatureGrid, now using external widget in widgets/home/feature_grid.dart

  // [NEW] Drawer for Mobile Navigation
  // Redundant _buildDrawer removed.

  // [NEW] Info Terkini Widget (Announcements)
  // Removed internal _buildInfoTerkini
  Widget _buildSalesSummaryCard(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final now = DateTime.now();
    final start = DateTime(now.year, now.month, now.day, 0, 0, 0);
    final end = DateTime(now.year, now.month, now.day, 23, 59, 59);
    return FutureBuilder<Map<String, dynamic>>(
      future: DatabaseHelper.instance.getSalesReport(start: start, end: end),
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Container(
              height: 120,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(20),
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    colorScheme.surface.withOpacity(0.98),
                    colorScheme.surface.withOpacity(0.94),
                  ],
                ),
                border: Border.all(
                  color: colorScheme.outline.withOpacity(0.12),
                  width: 1,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.04),
                    blurRadius: 12,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
            ).animate(onPlay: (c) => c.repeat()).shimmer(duration: 1200.ms),
          );
        }
        final data = snapshot.data!;
        final grossSales = (data['grossSales'] as num?)?.toDouble() ?? 0.0;
        final totalTransactions = (data['totalTransactions'] as num?)?.toInt() ?? 0;
        final aov = totalTransactions > 0 ? grossSales / totalTransactions : 0.0;
        final netProfit = (data['netProfit'] as num?)?.toDouble() ?? 0.0;
        final List<num> trendRaw =
            (data['trend'] as List?)?.whereType<num>().toList() ?? [];
        final List<double> trend =
            trendRaw.map((e) => (e as num).toDouble()).toList();
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  colorScheme.surface.withOpacity(0.98),
                  colorScheme.surface.withOpacity(0.94),
                ],
              ),
              border: Border.all(
                color: colorScheme.outline.withOpacity(0.12),
                width: 1,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.04),
                  blurRadius: 12,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Ringkasan Penjualan Hari Ini',
                      style: GoogleFonts.outfit(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: colorScheme.onSurface,
                      ),
                    ),
                    TextButton(
                      onPressed: () {
                        Navigator.push(context,
                            MaterialPageRoute(builder: (_) => const ReportScreen()));
                      },
                      child: Text(
                        'Lihat Detail',
                        style: GoogleFonts.outfit(
                          fontWeight: FontWeight.w600,
                          color: ThemeConfig.brandColor,
                        ),
                      ),
                    )
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: colorScheme.primaryContainer.withOpacity(0.18),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: colorScheme.primary.withOpacity(0.24),
                            width: 1,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Omzet',
                              style: GoogleFonts.outfit(
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                                color: colorScheme.primary,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              NumberFormat.currency(
                                      locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0)
                                  .format(grossSales),
                              style: GoogleFonts.outfit(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: colorScheme.onSurface,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: colorScheme.secondaryContainer.withOpacity(0.18),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: colorScheme.secondary.withOpacity(0.24),
                            width: 1,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Transaksi',
                              style: GoogleFonts.outfit(
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                                color: colorScheme.secondary,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              totalTransactions.toString(),
                              style: GoogleFonts.outfit(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: colorScheme.onSurface,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: colorScheme.tertiaryContainer.withOpacity(0.18),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: colorScheme.tertiary.withOpacity(0.24),
                            width: 1,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'AOV',
                              style: GoogleFonts.outfit(
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                                color: colorScheme.tertiary,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              NumberFormat.currency(
                                      locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0)
                                  .format(aov),
                              style: GoogleFonts.outfit(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: colorScheme.onSurface,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                if (trend.length >= 2)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    decoration: BoxDecoration(
                      color: colorScheme.surface.withOpacity(0.6),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: colorScheme.outline.withOpacity(0.18),
                        width: 1,
                      ),
                    ),
                    child: SizedBox(
                      height: 80,
                      child: LineChart(
                        LineChartData(
                          titlesData: const FlTitlesData(show: false),
                          gridData: const FlGridData(show: false),
                          borderData: FlBorderData(show: false),
                          lineTouchData: const LineTouchData(enabled: false),
                          minY: trend.reduce((a, b) => a < b ? a : b).toDouble(),
                          maxY: trend.reduce((a, b) => a > b ? a : b).toDouble(),
                          lineBarsData: [
                            LineChartBarData(
                              spots: List.generate(
                                trend.length,
                                (i) => FlSpot(i.toDouble(), trend[i].toDouble()),
                              ),
                              isCurved: true,
                              barWidth: 2.2,
                              color: colorScheme.primary,
                              dotData: const FlDotData(show: false),
                              belowBarData: BarAreaData(
                                show: true,
                                gradient: LinearGradient(
                                  begin: Alignment.topCenter,
                                  end: Alignment.bottomCenter,
                                  colors: [
                                    colorScheme.primary.withOpacity(0.35),
                                    colorScheme.primary.withOpacity(0.0),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                if (trend.length >= 2) const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: colorScheme.secondaryContainer.withOpacity(0.16),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: colorScheme.secondary.withOpacity(0.24),
                      width: 1,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.trending_up, size: 16, color: colorScheme.secondary),
                      const SizedBox(width: 8),
                      Text(
                        'Profit bersih: ${NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0).format(netProfit)}',
                        style: GoogleFonts.outfit(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: colorScheme.onSurface,
                        ),
                      ),
                    ],
                  ),
                )
              ],
            ),
          ),
        );
      },
    );
  }

  // [NEW] Dynamic Blog Carousel (Renamed from _buildInfoCarousel)
  Widget _buildBlogCarousel(BuildContext navContext) {
    final colorScheme = Theme.of(navContext).colorScheme;
    return Column(
      children: [
        // Header
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text("Berita & Edukasi",
                  style: GoogleFonts.outfit(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Theme.of(navContext).colorScheme.onSurface)),
              TextButton(
                  onPressed: () => Navigator.push(
                      navContext,
                      MaterialPageRoute(
                          builder: (_) => const BlogListScreen())),
                  child: Text("Lihat Semua",
                      style: GoogleFonts.outfit(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: ThemeConfig.brandColor)))
            ],
          ),
        ),
        const SizedBox(height: 16),
        // List
        FutureBuilder<List<dynamic>>(
          future: _blogFuture,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Row(
                  children: List.generate(3, (i) {
                    return Container(
                      width: 300,
                      height: 240,
                      margin: const EdgeInsets.only(right: 20),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [
                            Theme.of(context)
                                .colorScheme
                                .surface
                                .withOpacity(0.98),
                            Theme.of(context)
                                .colorScheme
                                .surface
                                .withOpacity(0.94),
                          ],
                        ),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: Theme.of(context)
                              .colorScheme
                              .primary
                              .withOpacity(0.2),
                          width: 1.2,
                        ),
                      ),
                    )
                        .animate(onPlay: (c) => c.repeat())
                        .shimmer(duration: 1200.ms, delay: (i * 150).ms);
                  }),
                ),
              );
            }
            if (!snapshot.hasData || snapshot.data!.isEmpty)
              return const SizedBox.shrink();

            final posts = snapshot.data!;
            return Column(
              children: [
                SizedBox(
                  height: 280,
                  child: PageView.builder(
                    controller: _blogPageController,
                    itemCount: posts.length,
                    onPageChanged: (idx) {
                      setState(() => _blogPageIndex = idx);
                    },
                    itemBuilder: (_, index) {
                      final post = posts[index];
                      return AnimatedBuilder(
                        animation: _blogPageController,
                        builder: (context, child) {
                          double page = 0.0;
                          if (_blogPageController.hasClients &&
                              _blogPageController.position.haveDimensions) {
                            page = _blogPageController.page ?? _blogPageIndex.toDouble();
                          } else {
                            page = _blogPageIndex.toDouble();
                          }
                          final delta = (page - index).clamp(-1.0, 1.0);
                          final scale = 1 - (delta.abs() * 0.06);
                          final opacity = (1 - delta.abs()).clamp(0.5, 1.0).toDouble();
                          return Opacity(
                            opacity: opacity,
                            child: Transform.scale(
                              scale: scale,
                              child: GestureDetector(
                                onTap: () {
                                  Navigator.push(
                                      navContext,
                                      MaterialPageRoute(
                                          builder: (_) => BlogDetailScreen(post: post)));
                                },
                                child: Container(
                                  margin: const EdgeInsets.symmetric(horizontal: 8),
                                  decoration: BoxDecoration(
                                    color: colorScheme.surface,
                                    borderRadius: BorderRadius.circular(20),
                                    boxShadow: [
                                      BoxShadow(
                                          color: Colors.black.withOpacity(0.06),
                                          blurRadius: 16,
                                          offset: const Offset(0, 8))
                                    ],
                                    border: Border.all(
                                      color: colorScheme.outline.withOpacity(0.12),
                                      width: 1,
                                    ),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      SizedBox(
                                        height: 150,
                                        child: ClipRRect(
                                          borderRadius: const BorderRadius.vertical(
                                              top: Radius.circular(20)),
                                          child: Stack(
                                            fit: StackFit.expand,
                                            children: [
                                              if (post['imageUrl'] != null &&
                                                  post['imageUrl'] != '')
                                                Image.network(post['imageUrl'], fit: BoxFit.cover)
                                              else
                                                Container(
                                                    color: ThemeConfig.brandColor.withOpacity(0.1),
                                                    child: Icon(Icons.article_rounded,
                                                        size: 40,
                                                        color: ThemeConfig.brandColor.withOpacity(0.4))),
                                              Positioned(
                                                right: 10,
                                                top: 10,
                                                child: TextButton(
                                                  onPressed: () {
                                                    Navigator.push(
                                                        navContext,
                                                        MaterialPageRoute(
                                                            builder: (_) =>
                                                                BlogDetailScreen(post: post)));
                                                  },
                                                  style: TextButton.styleFrom(
                                                    backgroundColor:
                                                        ThemeConfig.brandColor.withOpacity(0.9),
                                                    foregroundColor: Colors.white,
                                                    padding: const EdgeInsets.symmetric(
                                                        horizontal: 10, vertical: 6),
                                                    shape: RoundedRectangleBorder(
                                                        borderRadius:
                                                            BorderRadius.circular(999)),
                                                  ),
                                                  child: const Text('Lihat', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                      Padding(
                                        padding: const EdgeInsets.all(16),
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              post['tags']?.isNotEmpty == true
                                                  ? post['tags'][0].toUpperCase()
                                                  : 'BERITA',
                                              style: GoogleFonts.outfit(
                                                color: ThemeConfig.brandColor,
                                                fontSize: 12,
                                                fontWeight: FontWeight.w600,
                                              ),
                                            ),
                                            const SizedBox(height: 8),
                                            Text(
                                              post['title'] ?? 'No Title',
                                              style: GoogleFonts.outfit(
                                                fontSize: 16,
                                                fontWeight: FontWeight.bold,
                                                color: ThemeConfig.textPrimary,
                                                height: 1.3,
                                              ),
                                              maxLines: 2,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                            const SizedBox(height: 8),
                                            Text(
                                              post['readTime'] ?? '3 min baca',
                                              style: GoogleFonts.outfit(
                                                color: ThemeConfig.textSecondary,
                                                fontSize: 12,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          );
                        },
                      );
                    },
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(posts.length, (i) {
                    final active = i == _blogPageIndex;
                    return AnimatedContainer(
                      duration: const Duration(milliseconds: 250),
                      margin: const EdgeInsets.symmetric(horizontal: 4),
                      width: active ? 20 : 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: active ? Colors.white : Colors.white.withOpacity(0.4),
                        borderRadius: BorderRadius.circular(999),
                      ),
                    );
                  }),
                ),
              ],
            );
          },
        )
      ],
    );
  }

  Widget _buildStaticInfoCard(Color color, String title, String sub) {
    // Renamed old helper just in case

    return Container(
      width: 240,
      height: 120,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(16)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                  color: Colors.white, borderRadius: BorderRadius.circular(8)),
              child: Text(title,
                  style: TextStyle(
                      color: color,
                      fontSize: 10,
                      fontWeight: FontWeight.bold))),
          const SizedBox(height: 8),
          Text(sub,
              style: GoogleFonts.poppins(
                  fontSize: 14, fontWeight: FontWeight.bold),
              maxLines: 2)
        ],
      ),
    );
  }

  Widget _buildSingleAiCard(
      BuildContext context, Map<String, dynamic> insight) {
    final type = insight['type'];
    final iconStr = insight['icon'];
    final action = insight['action'];
    final colorScheme = Theme.of(context).colorScheme;
    final String title = insight['title'] ?? '';
    final String message = insight['message'] ?? '';
    final String shortLabel = insight['short'] ?? 'Insight';
    final String reason = insight['reason'] ?? '';
    final String insightKey = _buildInsightKey(insight);
    final int feedback = _aiInsightFeedback[insightKey] ?? 0;
    final bool isLiked = feedback == 1;
    final bool isDisliked = feedback == -1;
    final int score = (insight['priority'] as int?) ?? 50;

    Color themeColor = const Color(0xFFE07A5F);
    if (type == 'ALERT') themeColor = const Color(0xFFE63946);
    if (type == 'POSITIVE') themeColor = const Color(0xFF2A9D8F);
    if (type == 'TIP') themeColor = const Color(0xFFE9C46A);
    if (type == 'INFO') themeColor = const Color(0xFFE07A5F);

    if (insight['color'] != null) {
      themeColor = Color(insight['color']);
    }

    IconData icon = Icons.auto_awesome;
    if (iconStr == 'alert' || iconStr == 'inventory_2')
      icon = Icons.warning_amber_rounded;
    if (iconStr == 'percent') icon = Icons.percent;
    if (iconStr == 'trending_up') icon = Icons.trending_up;
    if (iconStr == 'trending_down') icon = Icons.trending_down;
    if (iconStr == 'rain' || iconStr == 'water_drop') icon = Icons.water_drop;
    if (iconStr == 'sun' || iconStr == 'wb_sunny') icon = Icons.wb_sunny;
    if (iconStr == 'chart') icon = Icons.bar_chart;
    if (iconStr == 'smart_toy') icon = Icons.smart_toy;
    if (iconStr == 'access_time_filled') icon = Icons.access_time_filled;
    if (iconStr == 'waving_hand') icon = Icons.waving_hand;
    if (iconStr == 'lightbulb') icon = Icons.lightbulb;

    final String subtitleLabel;
    switch (type) {
      case 'ALERT':
        subtitleLabel = 'Peringatan penting dari data toko kamu';
        break;
      case 'PREDICTION':
        subtitleLabel = 'Prediksi cerdas berbasis histori penjualan';
        break;
      case 'TIP':
        subtitleLabel = 'Rekomendasi praktis untuk optimalkan toko';
        break;
      case 'RETENTION':
        subtitleLabel = 'Insight pelanggan agar mereka tetap loyal';
        break;
      case 'CONTEXT':
        subtitleLabel = 'Insight kontekstual sesuai situasi hari ini';
        break;
      case 'STRATEGY':
        subtitleLabel = 'Strategi yang bisa langsung kamu eksekusi';
        break;
      default:
        subtitleLabel = 'Insight otomatis dari Rana AI';
        break;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            colorScheme.surface.withOpacity(0.98),
            colorScheme.surface.withOpacity(0.94),
          ],
        ),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: themeColor.withOpacity(0.24),
          width: 1.2,
        ),
        boxShadow: [
          BoxShadow(
            color: themeColor.withOpacity(0.2),
            blurRadius: 18,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(11),
                decoration: BoxDecoration(
                  color: themeColor.withOpacity(0.12),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: themeColor, size: 24),
              ).animate(onPlay: (c) => c.repeat(reverse: true)).scale(
                  begin: const Offset(0.96, 0.96),
                  end: const Offset(1.04, 1.04),
                  duration: 2200.ms),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          'Rana AI',
                          style: GoogleFonts.outfit(
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                            color: colorScheme.onSurface.withOpacity(0.7),
                          ),
                        ),
                        const SizedBox(width: 4),
                        Icon(
                          Icons.auto_awesome,
                          size: 14,
                          color: themeColor.withOpacity(0.9),
                        ),
                        const Spacer(),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: themeColor.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 6,
                                height: 6,
                                decoration: BoxDecoration(
                                  color: themeColor,
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                shortLabel,
                                style: GoogleFonts.outfit(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                  color: themeColor,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      title,
                      style: GoogleFonts.outfit(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: colorScheme.onSurface,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitleLabel,
                      style: GoogleFonts.outfit(
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                        color: colorScheme.onSurface.withOpacity(0.65),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: Container(
                            height: 6,
                            decoration: BoxDecoration(
                              color: colorScheme.surfaceContainerHighest
                                  .withOpacity(0.5),
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: LayoutBuilder(
                              builder: (context, c) {
                                final w = c.maxWidth * (score / 100.0);
                                return Align(
                                  alignment: Alignment.centerLeft,
                                  child: Container(
                                    width: w,
                                    height: 6,
                                    decoration: BoxDecoration(
                                      color: themeColor,
                                      borderRadius: BorderRadius.circular(999),
                                    ),
                                  ),
                                );
                              },
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: themeColor.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            'Skor ${score}%',
                            style: GoogleFonts.outfit(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: themeColor,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Scrollable Content Area (Fixed Height to prevent overflow)
          SizedBox(
            height: action == 'NONE' ? 120 : 85,
            child: SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    message,
                    style: GoogleFonts.outfit(
                      fontSize: 13,
                      height: 1.4,
                      color: colorScheme.onSurface.withOpacity(0.75),
                    ),
                  ),
                  if (reason.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(
                      'Kenapa insight ini muncul: $reason',
                      style: GoogleFonts.outfit(
                        fontSize: 11,
                        height: 1.4,
                        color: colorScheme.onSurface.withOpacity(0.6),
                      ),
                    ),
                  ],
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _buildRecommendations(type, action)
                        .map((label) {
                      return Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: themeColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(999),
                          border: Border.all(
                              color: themeColor.withOpacity(0.2), width: 1),
                        ),
                        child: Text(
                          label,
                          style: GoogleFonts.outfit(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: themeColor,
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),
          ),
          if (action != 'NONE') ...[
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  if (action == 'KULAKAN') {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                          builder: (_) => const PurchaseScreen()),
                    );
                  } else if (action == 'PROMO' || action == 'MARKETING') {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                          builder: (_) => const MarketingScreen()),
                    );
                  } else if (action == 'REPORT') {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const ReportScreen()),
                    );
                  }
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: themeColor,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      action == 'KULAKAN'
                          ? 'Mulai Belanja'
                          : action == 'PROMO'
                              ? 'Buat Promo'
                              : action == 'REPORT'
                                  ? 'Lihat Laporan'
                                  : 'Lihat Detail',
                      style: GoogleFonts.outfit(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(width: 8),
                    const Icon(
                      Icons.arrow_forward_rounded,
                      size: 18,
                    ),
                  ],
                ),
              ),
            ),
          ],
          const Spacer(),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Seberapa membantu insight ini?',
                style: GoogleFonts.outfit(
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                  color: colorScheme.onSurface.withOpacity(0.6),
                ),
              ),
              Row(
                children: [
                  IconButton(
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    icon: Icon(
                      Icons.thumb_up_alt_rounded,
                      size: 18,
                      color: isLiked
                          ? themeColor
                          : colorScheme.onSurface.withOpacity(0.4),
                    ),
                    onPressed: () => _toggleInsightFeedback(insight, 1),
                  ),
                  const SizedBox(width: 4),
                  IconButton(
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    icon: Icon(
                      Icons.thumb_down_alt_rounded,
                      size: 18,
                      color: isDisliked
                          ? themeColor
                          : colorScheme.onSurface.withOpacity(0.4),
                    ),
                    onPressed: () => _toggleInsightFeedback(insight, -1),
                  ),
                ],
              ),
            ],
          )
        ],
      ),
    );
  }

  List<String> _buildRecommendations(String? type, String? action) {
    final List<String> labels = [];
    switch (action) {
      case 'KULAKAN':
        labels.addAll([
          'Restock produk kritis',
          'Cek stok gudang',
          'Buka halaman belanja',
        ]);
        break;
      case 'PROMO':
      case 'MARKETING':
        labels.addAll([
          'Buat diskon khusus',
          'Pasang banner promo',
          'Dorong di etalase',
        ]);
        break;
      case 'REPORT':
        labels.addAll([
          'Lihat laporan harian',
          'Cek margin & top product',
          'Evaluasi target',
        ]);
        break;
      default:
        labels.addAll([
          'Tandai tugas dilakukan',
          'Pantau dampak setelah aksi',
        ]);
        break;
    }
    if (type == 'ALERT') {
      labels.insert(0, 'Prioritaskan peringatan');
    } else if (type == 'PREDICTION') {
      labels.insert(0, 'Siapkan stok populer');
    }
    return labels;
  }

  Widget _buildHeader(BuildContext context, {bool isMobile = false}) {
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

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      decoration: BoxDecoration(
          gradient: LinearGradient(
              colors: headerGradientColors,
              begin: Alignment.topLeft,
              end: Alignment.bottomRight)),
      child: SafeArea(
        // For mobile status bar
        bottom: false,
        child: Row(
          children: [
            if (isMobile)
              IconButton(
                  onPressed: () => Scaffold.of(context).openDrawer(),
                  icon: const Icon(Icons.menu, color: Colors.white)),

            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('Rana POS',
                    style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 20)),
                Row(
                  children: [
                    Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                            color: Color(0xFF81B29A), shape: BoxShape.circle)),
                    const SizedBox(width: 6),
                    Text('CONNECTED',
                        style: TextStyle(
                            color: Color(0xFF81B29A),
                            fontSize: 10,
                            fontWeight: FontWeight.bold)),
                  ],
                )
              ],
            ),
            const Spacer(), // Replaces TextField
            IconButton(
              onPressed: () => Navigator.push(context,
                  MaterialPageRoute(builder: (_) => const PromoHubScreen())),
              icon: const Icon(Icons.local_offer, color: Colors.white),
              tooltip: 'Promosi',
            ),
            IconButton(
              onPressed: () => Navigator.push(context,
                  MaterialPageRoute(builder: (_) => const PurchaseScreen())),
              icon: const Icon(Icons.storefront, color: Colors.white),
              tooltip: 'Kulakan',
            ),
            IconButton(
              onPressed: () async {
                setState(() => isLoading = true);
                await ApiService().syncAllData();
                _loadProducts();
              },
              icon: const Icon(Icons.sync, color: Colors.white),
              tooltip: 'Sync Data',
            ),
            // [NEW] Notification Icon
            IconButton(
              onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (_) => const NotificationScreen())),
              icon:
                  const Icon(Icons.notifications_outlined, color: Colors.white),
              tooltip: 'Notifikasi',
            ),
            IconButton(
              onPressed: () => _scaffoldKey.currentState?.openEndDrawer(),
              icon: const Icon(Icons.menu_rounded, color: Colors.white),
              tooltip: 'Keranjang',
            ),
            IconButton(
              onPressed: () async {
                final auth = context.read<AuthProvider>();
                await auth.logout();
                if (!context.mounted) return;
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                  (_) => false,
                );
              },
              icon: const Icon(Icons.logout, color: Colors.white),
              tooltip: 'Logout',
            )
          ],
        ),
      ),
    );
  }

  Widget _buildCategoryTabs() {
    return Container(
      color: Theme.of(context).colorScheme.surface,
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Row(
          children: AppConstants.productCategories.map((cat) {
            final isSelected = _selectedCategory == cat;
            return Padding(
              padding: const EdgeInsets.only(right: 12),
              child: ActionChip(
                label: Text(cat),
                labelStyle: TextStyle(
                    color: isSelected
                        ? Colors.white
                        : Theme.of(context).colorScheme.onSurface,
                    fontWeight:
                        isSelected ? FontWeight.bold : FontWeight.normal),
                backgroundColor: isSelected
                    ? ThemeConfig.brandColor
                    : Theme.of(context).colorScheme.surface.withOpacity(0.6),
                side: BorderSide.none,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20)),
                onPressed: () {
                  SoundService.playBeep();
                  setState(() => _selectedCategory = cat);
                },
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _buildProductGrid(BuildContext context, CartProvider cart,
      {required int crossAxisCount, required double aspectRatio}) {
    if (isLoading) {
      final colorScheme = Theme.of(context).colorScheme;
      return GridView.builder(
        padding: const EdgeInsets.all(24),
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: crossAxisCount,
          childAspectRatio: aspectRatio,
          crossAxisSpacing: 16,
          mainAxisSpacing: 16,
        ),
        itemCount: 8,
        itemBuilder: (context, index) {
          return Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  colorScheme.surface.withOpacity(0.98),
                  colorScheme.surface.withOpacity(0.94),
                ],
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: colorScheme.outline.withOpacity(0.12),
                width: 1,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.04),
                  blurRadius: 12,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    height: 90,
                    decoration: BoxDecoration(
                      color: colorScheme.surfaceContainerHighest.withOpacity(0.4),
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    height: 12,
                    decoration: BoxDecoration(
                      color: colorScheme.surfaceContainerHighest.withOpacity(0.4),
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    height: 12,
                    width: 80,
                    decoration: BoxDecoration(
                      color: colorScheme.surfaceContainerHighest.withOpacity(0.35),
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  const Spacer(),
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          height: 36,
                          decoration: BoxDecoration(
                            color: colorScheme.primary.withOpacity(0.08),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: colorScheme.primary.withOpacity(0.18),
                              width: 1,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: colorScheme.surfaceContainerHighest.withOpacity(0.4),
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ).animate(onPlay: (c) => c.repeat()).shimmer(duration: 1200.ms, delay: (index * 100).ms);
        },
      );
    }
    if (_filteredProducts.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: EmptyState(
          icon: Icons.search_off,
          title: 'Produk tidak ditemukan',
          description: 'Coba hapus filter atau tambah produk baru.',
          primaryActionLabel: 'Tambah Produk',
          onPrimaryAction: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const AddProductScreen()),
            );
          },
          secondaryActionLabel: 'Hapus Filter',
          onSecondaryAction: () {
            setState(() {
              _selectedCategory = 'All';
              _searchQuery = '';
            });
          },
        ),
      );
    }

    return GridView.builder(
      padding: const EdgeInsets.all(24),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: crossAxisCount,
        childAspectRatio: aspectRatio,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
      ),
      itemCount: _filteredProducts.length,
      itemBuilder: (context, index) {
        final product = _filteredProducts[index];
        final qty = cart.items[product['id']]?.quantity ?? 0;

        final stock = (product['stock'] ?? 0) as int;
        return ProductCard(
          product: product,
          quantity: qty,
          onTap: () {
            if (stock <= 0) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Stok produk ini sudah habis')),
              );
              SoundService.playError();
              return;
            }
            if (qty >= stock) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Maksimal stok tersedia hanya $stock')),
              );
              SoundService.playError();
              return;
            }
            SoundService.playBeep();
            cart.addItem(
                product['id'], product['name'], product['sellingPrice'],
                maxStock: stock);
          },
        ).animate().fadeIn(duration: 400.ms, delay: (index * 50).ms).slideY(begin: 0.1, end: 0, curve: Curves.easeOutQuad);
      },
    ).animate().fadeIn(
        duration: 500
            .ms); // Fade in the whole grid, items have their own animations inside ProductCard
  }

  void _showCartModal(BuildContext context, CartProvider cart) {
    showModalBottomSheet(
        context: context,
        useRootNavigator: true,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (_) => DraggableScrollableSheet(
            initialChildSize: 0.9,
            builder: (_, ctrl) => Container(
                  decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.surface,
                      borderRadius: const BorderRadius.vertical(
                          top: Radius.circular(24))),
                  child: CartWidget(
                    scrollController: ctrl,
                    onClose: () => Navigator.pop(context),
                    onCheckoutSuccess: () async {
                      await _loadProducts();
                    },
                  ),
                )));
  }

  void _filterProducts(String query) {
    setState(() {
      _searchQuery = query;
    });
  }

  // --- Tablet/Desktop Layout Support ---

  Widget _buildDesktopLayout(
      BuildContext context, BoxConstraints constraints, CartProvider cart) {
    final bool hideCartSidebar = _desktopSelectedIndex == 7;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildDesktopNavigationRail(),
        Expanded(
          flex: hideCartSidebar ? 10 : 7,
          child: _buildDesktopContent(context, cart),
        ),
        if (!hideCartSidebar)
          Container(
            width: 380,
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              border: Border(
                  left: BorderSide(
                      color: Theme.of(context)
                          .colorScheme
                          .outline
                          .withOpacity(0.2))),
              boxShadow: [
                BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 10,
                    offset: const Offset(-4, 0))
              ],
            ),
            child: CartWidget(
              isEmbedded: true,
              onCheckoutSuccess: () async {
                await _loadProducts();
              },
            ),
          ),
      ],
    );
  }

  Widget _buildDesktopNavigationRail() {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        border: Border(
            right: BorderSide(
                color: Theme.of(context).colorScheme.outline.withOpacity(0.2))),
      ),
      child: NavigationRail(
        selectedIndex: _desktopSelectedIndex,
        onDestinationSelected: (int index) {
          setState(() {
            _desktopSelectedIndex = index;
            if (index == 0) _bottomNavIndex = 0;
            if (index == 1) _bottomNavIndex = 1;
            if (index == 2) _bottomNavIndex = 0;
            if (index == 3) _bottomNavIndex = 4;
            if (index == 4) _bottomNavIndex = 0;
            if (index == 5) _bottomNavIndex = 3;
            if (index == 6) _bottomNavIndex = 0;
            if (index == 7) _bottomNavIndex = 0;
          });
        },
        labelType: NavigationRailLabelType.all,
        leading: Padding(
          padding: const EdgeInsets.symmetric(vertical: 24),
          child: Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
                color: const Color(0xFFE07A5F).withOpacity(0.1),
                shape: BoxShape.circle),
            child: const Icon(Icons.storefront,
                color: Color(0xFFE07A5F), size: 28),
          ),
        ),
        destinations: const [
          NavigationRailDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: Text('Beranda'),
          ),
          NavigationRailDestination(
            icon: Icon(Icons.history_outlined),
            selectedIcon: Icon(Icons.history),
            label: Text('Aktivitas'),
          ),
          NavigationRailDestination(
            icon: Icon(Icons.account_balance_wallet_outlined),
            selectedIcon: Icon(Icons.account_balance_wallet),
            label: Text('Keuangan'),
          ),
          NavigationRailDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: Text('Profil'),
          ),
          NavigationRailDestination(
            icon: Icon(Icons.inventory_2_outlined),
            selectedIcon: Icon(Icons.inventory_2),
            label: Text('Produk'),
          ),
          NavigationRailDestination(
            icon: Icon(Icons.bar_chart_outlined),
            selectedIcon: Icon(Icons.bar_chart),
            label: Text('Laporan'),
          ),
          NavigationRailDestination(
            icon: Icon(Icons.payments_outlined),
            selectedIcon: Icon(Icons.payments),
            label: Text('PPOB'),
          ),
          NavigationRailDestination(
            icon: Icon(Icons.storefront_outlined),
            selectedIcon: Icon(Icons.storefront),
            label: Text('Kulakan'),
          ),
        ],
      ),
    );
  }

  Widget _buildDesktopContent(BuildContext context, CartProvider cart) {
    if (_desktopSelectedIndex == 0) {
      final width = MediaQuery.of(context).size.width;
      final crossAxisCount = ThemeConfig.gridColumns(context, mobile: 3);

      return Column(
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(bottom: BorderSide(color: Color(0xFFF3F4F6))),
            ),
            child: Row(
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Kasir',
                        style: GoogleFonts.outfit(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: const Color(0xFF1E293B))),
                    Text(
                        DateFormat('EEEE, d MMMM yyyy', 'id_ID')
                            .format(DateTime.now()),
                        style: GoogleFonts.outfit(
                            color: Colors.grey[500], fontSize: 14))
                  ],
                ),
                const Spacer(),
                // Search Bar
                Container(
                  width: 300,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(
                      color: Colors.grey[100],
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.grey[200]!)),
                  child: TextField(
                    onChanged: _filterProducts,
                    decoration: const InputDecoration(
                      hintText: 'Cari produk...',
                      border: InputBorder.none,
                      icon: Icon(Icons.search, color: Colors.grey),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                IconButton(
                  onPressed: _loadProducts,
                  icon: const Icon(Icons.refresh),
                  tooltip: 'Refresh Data',
                )
              ],
            ),
          ),

          // Categories
          _buildCategoryTabs(),

          Expanded(
            child: _buildProductGrid(context, cart,
                crossAxisCount: crossAxisCount, aspectRatio: 0.85),
          ),
        ],
      );
    }

    if (_desktopSelectedIndex == 1) {
      return const OrderListScreen();
    }

    if (_desktopSelectedIndex == 2) {
      return const WalletScreen();
    }

    if (_desktopSelectedIndex == 3) {
      return const SettingsScreen();
    }

    if (_desktopSelectedIndex == 4) {
      return const AddProductScreen();
    }

    if (_desktopSelectedIndex == 5) {
      return const ReportScreen();
    }

    if (_desktopSelectedIndex == 6) {
      return const PpobScreen();
    }

    if (_desktopSelectedIndex == 7) {
      return const WholesaleMainScreen();
    }

    return const SizedBox.shrink();
  }

  // Floating Quick Actions removed per request
}
