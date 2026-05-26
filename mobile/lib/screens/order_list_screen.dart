import 'package:rana_merchant/config/merchant_config.dart';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shimmer/shimmer.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:rana_merchant/config/theme_config.dart';
import 'package:intl/intl.dart';
import 'package:rana_merchant/screens/scan_screen.dart';
import 'package:rana_merchant/services/order_service.dart';
import 'package:rana_merchant/services/realtime_service.dart';
import 'package:rana_merchant/services/sync_service.dart';
import 'package:rana_merchant/data/local/database_helper.dart';

class OrderListScreen extends StatefulWidget {
  const OrderListScreen({super.key});

  @override
  State<OrderListScreen> createState() => _OrderListScreenState();
}

class _OrderListScreenState extends State<OrderListScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final OrderService _orderService = OrderService();
  final RealtimeService _realtimeService = RealtimeService();
  StreamSubscription<Map<String, dynamic>>? _syncSub;

  List<dynamic> _orders = [];
  bool _isLoading = true;
  String? _error;
  late final TextEditingController _searchController;
  bool _searchMode = false;
  String _searchQuery = '';
  bool _online = SyncService().isOnline;
  DateTime? _lastSyncAt = SyncService().lastSyncAt;
  int _pendingTxnCount = 0;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _loadOrders();
    _realtimeService.addTransactionListener(_handleRealtimeTransaction);
    _syncSub = SyncService().statusStream.listen((status) {
      if (!mounted) return;
      setState(() {
        _online = status['online'] == true;
        final last = status['lastSyncAt']?.toString();
        _lastSyncAt =
            (last != null && last.isNotEmpty) ? DateTime.tryParse(last) : _lastSyncAt;
      });
    });
    _loadSyncStatus();
    _searchController = TextEditingController();
    _searchController.addListener(() {
      setState(() {
        _searchQuery = _searchController.text.trim();
      });
    });
  }

  Future<void> _loadOrders() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final orders = await _orderService.getIncomingOrders();
      setState(() {
        _orders = orders.whereType<Map<String, dynamic>>().toList();
        _isLoading = false;
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _error = e.toString();
        });
      }
    }
  }

  @override
  void dispose() {
    _realtimeService.removeTransactionListener(_handleRealtimeTransaction);
    _syncSub?.cancel();
    _searchController.dispose();
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadSyncStatus() async {
    try {
      final pending = await DatabaseHelper.instance.getPendingTransactions();
      if (mounted) {
        setState(() {
          _pendingTxnCount = pending.length;
        });
      }
    } catch (_) {}
  }

  List<dynamic> _getOrdersByStatus(String tab) {
    final List<Map<String, dynamic>> orders =
        _orders.whereType<Map<String, dynamic>>().toList();
    List<Map<String, dynamic>> list = const [];
    if (tab == 'Masuk') {
      list = orders.where((o) => (o['orderStatus']?.toString() ?? '') == 'PENDING').toList();
    } else if (tab == 'Disiapkan') {
      list = orders.where((o) => (o['orderStatus']?.toString() ?? '') == 'ACCEPTED').toList();
    } else if (tab == 'Siap Ambil') {
      list = orders.where((o) => (o['orderStatus']?.toString() ?? '') == 'READY').toList();
    } else if (tab == 'Selesai') {
      list = orders.where((o) => (o['orderStatus']?.toString() ?? '') == 'COMPLETED').toList();
    }
    return _filterByQuery(list);
  }

  List<dynamic> _filterByQuery(List<dynamic> list) {
    if (_searchQuery.isEmpty) return list;
    final q = _searchQuery.toLowerCase();
    return list.where((raw) {
      if (raw is! Map) return false;
      final o = Map<String, dynamic>.from(raw);
      final id = o['id']?.toString().toLowerCase() ?? '';
      final code = o['pickupCode']?.toString().toLowerCase() ?? '';
      final name = o['customerName']?.toString().toLowerCase() ?? '';
      final phone = o['customerPhone']?.toString().toLowerCase() ?? '';
      bool hit = id.contains(q) || code.contains(q) || name.contains(q) || phone.contains(q);
      if (hit) return true;
      final items = o['transactionItems'];
      if (items is List) {
        for (final rawItem in items) {
          if (rawItem is Map) {
            final product = rawItem['product'];
            if (product is Map) {
              final pn = product['name']?.toString().toLowerCase() ?? '';
              if (pn.contains(q)) return true;
            }
          }
        }
      }
      return false;
    }).toList();
  }

  int _countStatus(String status) {
    return _orders.where((o) => o is Map && o['orderStatus'] == status).length;
  }

  void _toggleSearch() {
    setState(() {
      _searchMode = !_searchMode;
      if (!_searchMode) {
        _searchController.clear();
      }
    });
  }

  Future<void> _handleUpdateStatus(String orderId, String newStatus) async {
    try {
      await _orderService.updateOrderStatus(orderId, newStatus);
      ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Status diperbarui: $newStatus')));
      _loadOrders(); // Refresh
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Gagal update: $e'),
          backgroundColor: ThemeConfig.colorError));
    }
  }

  void _handleRealtimeTransaction(Map<String, dynamic> data) {
    if (!mounted) return;
    _loadOrders();
  }

  Future<void> _handleScan() async {
    final result = await Navigator.push(
        context, MaterialPageRoute(builder: (_) => const ScanScreen()));

    if (result is Map<String, dynamic>) {
      final String? orderId = result['id'] as String?;
      final String? pickupCode = result['pickupCode'] as String?;

      await _loadOrders();

      Map<String, dynamic>? matched;
      if (orderId != null) {
        try {
          matched =
              _orders.whereType<Map<String, dynamic>>().firstWhere((o) => o['id'] == orderId);
        } catch (_) {}
      }
      if (matched == null && pickupCode != null) {
        try {
          matched = _orders
              .whereType<Map<String, dynamic>>()
              .firstWhere((o) => o['pickupCode'] == pickupCode);
        } catch (_) {}
      }

      if (matched != null) {
        _showOrderDetail(matched);
      } else {
        _showSuccessDialog();
      }
    }
  }

  void _showSuccessDialog() {
    showDialog(
        context: context,
        builder: (_) => AlertDialog(
              icon: const Icon(Icons.check_circle,
                  color: ThemeConfig.colorSuccess, size: 60),
              title: const Text('Transaksi Selesai'),
              content: const Text('Barang berhasil diambil oleh konsumen.'),
              actions: [
                TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('OK'))
              ],
            ));
  }

  void _showOrderDetail(Map<String, dynamic> order) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) {
        final sheetColorScheme = Theme.of(ctx).colorScheme;

        return Container(
          decoration: BoxDecoration(
            color: Theme.of(ctx).scaffoldBackgroundColor,
          ),
          child: Padding(
            padding: EdgeInsets.only(
              left: 16,
              right: 16,
              top: 12,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 16,
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: sheetColorScheme.onSurface.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Detail Pesanan Pickup',
                    style: GoogleFonts.poppins(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: sheetColorScheme.onSurface,
                    ),
                  ),
                  const SizedBox(height: 12),
                  _OrderCard(
                    order: order,
                    onUpdateStatus: (_) {},
                    onScan: () {},
                    onOpenDetail: () {},
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
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
    final Color headerTextColor =
        isDarkTheme ? colorScheme.onSurface : Colors.white;
    final Color headerPillBg =
        isDarkTheme ? Colors.white.withOpacity(0.06) : Colors.black.withOpacity(0.18);

    Widget buildShimmerOrderList() {
      final isDark = Theme.of(context).brightness == Brightness.dark;
      final baseColor = isDark ? Colors.grey[800]! : Colors.grey[300]!;
      final highlightColor = isDark ? Colors.grey[700]! : Colors.grey[100]!;

      return ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: 5,
        itemBuilder: (ctx, i) => Shimmer.fromColors(
          baseColor: baseColor,
          highlightColor: highlightColor,
          child: Container(
            margin: const EdgeInsets.only(bottom: 12),
            height: 140,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: headerPillBg,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Daftar Pesanan (Pickup)',
                  style: GoogleFonts.poppins(
                    fontWeight: FontWeight.bold,
                    color: headerTextColor,
                  )),
              const SizedBox(height: 2),
              Text(
                'PO Online • Tap kartu untuk detail',
                style: GoogleFonts.poppins(
                  fontSize: 11,
                  color: headerTextColor.withOpacity(0.9),
                ),
              ),
              const SizedBox(height: 6),
              _buildStatusBadge()
            ],
          ),
        ),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        foregroundColor: headerTextColor,
        elevation: 0,
        toolbarHeight: 72,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(bottom: Radius.circular(16)),
        ),
        flexibleSpace: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: headerGradientColors,
            ),
          ),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: Container(
              decoration: BoxDecoration(
                color: headerPillBg,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    icon: Icon(_searchMode ? Icons.close_rounded : Icons.search_rounded),
                    tooltip: _searchMode ? 'Tutup pencarian' : 'Cari pesanan',
                    onPressed: _toggleSearch,
                  ),
                  Container(
                    width: 1,
                    height: 24,
                    color: headerTextColor.withOpacity(0.2),
                  ),
                  IconButton(
                    icon: const Icon(Icons.refresh_rounded),
                    tooltip: 'Muat ulang',
                    onPressed: _loadOrders,
                  ),
                ],
              ),
            ),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: Size.fromHeight(_searchMode ? 106 : 60),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (_searchMode)
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 6, 16, 10),
                  child: Container(
                    decoration: BoxDecoration(
                      color: headerPillBg,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: TextField(
                      controller: _searchController,
                      style: TextStyle(color: headerTextColor),
                      cursorColor: headerTextColor,
                      decoration: InputDecoration(
                        hintText: 'Cari nama, nomor, kode pickup, atau ID',
                        hintStyle: TextStyle(color: headerTextColor.withOpacity(0.75)),
                        prefixIcon: Icon(Icons.search_rounded, color: headerTextColor),
                        suffixIcon: (_searchQuery.isNotEmpty)
                            ? IconButton(
                                icon: Icon(Icons.clear_rounded, color: headerTextColor),
                                onPressed: () => _searchController.clear(),
                              )
                            : null,
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                    ),
                  ),
                ),
              TabBar(
                controller: _tabController,
                labelColor: headerTextColor,
                unselectedLabelColor: headerTextColor.withOpacity(0.7),
                isScrollable: true,
                labelStyle: GoogleFonts.poppins(fontWeight: FontWeight.bold),
                indicatorColor: headerTextColor,
                tabs: [
                  Tab(
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text('Masuk'),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: headerPillBg,
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            _countStatus('PENDING').toString(),
                            style: TextStyle(color: headerTextColor, fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Tab(
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text('Disiapkan'),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: headerPillBg,
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            _countStatus('ACCEPTED').toString(),
                            style: TextStyle(color: headerTextColor, fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Tab(
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text('Siap Ambil'),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: headerPillBg,
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            _countStatus('READY').toString(),
                            style: TextStyle(color: headerTextColor, fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Tab(
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text('Selesai'),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: headerPillBg,
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            _countStatus('COMPLETED').toString(),
                            style: TextStyle(color: headerTextColor, fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
      body: LayoutBuilder(
        builder: (context, constraints) {
          final isWide = constraints.maxWidth >= 900;
          final content = _isLoading
              ? buildShimmerOrderList()
              : _error != null
                  ? Center(
                      child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                          Text(_error!,
                              style:
                                  const TextStyle(color: Color(0xFFE07A5F)),
                              textAlign: TextAlign.center),
                          TextButton(
                              onPressed: _loadOrders,
                              child: const Text('Coba Lagi'))
                        ]))
                  : TabBarView(
                      controller: _tabController,
                      children: [
                        _buildOrderList('Masuk'),
                        _buildOrderList('Disiapkan'),
                        _buildOrderList('Siap Ambil'),
                        _buildOrderList('Selesai'),
                      ],
                    );

          if (!isWide) return content;

          return Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 900),
              child: content,
            ),
          );
        },
      ),
    );
  }

  Widget _buildStatusBadge() {
    final text = _online ? 'Realtime' : 'Offline';
    final color = _online ? ThemeConfig.colorSuccess : Colors.grey;
    String syncText = '';
    if (_lastSyncAt != null) {
      final h = _lastSyncAt!.hour.toString().padLeft(2, '0');
      final m = _lastSyncAt!.minute.toString().padLeft(2, '0');
      final s = _lastSyncAt!.second.toString().padLeft(2, '0');
      final t = '$h:$m:$s';
      syncText = ' • $t';
    }
    String pendingText = '';
    if (_pendingTxnCount > 0) {
      pendingText = ' • $_pendingTxnCount pending';
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: _online
            ? ThemeConfig.colorSuccess.withOpacity(0.12)
            : Colors.grey.withOpacity(0.12),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
            color: _online
                ? ThemeConfig.colorSuccess.withOpacity(0.4)
                : Colors.grey.withOpacity(0.4)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(color: _online ? ThemeConfig.colorSuccess : Colors.grey, shape: BoxShape.circle),
          ),
          const SizedBox(width: 6),
          Text('$text$syncText$pendingText',
              style: GoogleFonts.poppins(
                  fontSize: 11, color: color, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  Widget _buildOrderList(String statusFilter) {
    final filtered = _getOrdersByStatus(statusFilter);

    if (filtered.isEmpty) {
      final statusLabel = {
        'Masuk': 'Pesanan Masuk',
        'Disiapkan': 'Pesanan Disiapkan',
        'Siap Ambil': 'Siap Diambil',
        'Selesai': 'Pesanan Selesai',
      }[statusFilter] ?? statusFilter;
      final statusIcon = {
        'Masuk': Icons.inbox_rounded,
        'Disiapkan': Icons.restaurant_rounded,
        'Siap Ambil': Icons.shopping_bag_rounded,
        'Selesai': Icons.check_circle_outline_rounded,
      }[statusFilter] ?? Icons.shopping_bag_outlined;
      final colorScheme = Theme.of(context).colorScheme;
      return RefreshIndicator(
        onRefresh: _loadOrders,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: SizedBox(
            height: MediaQuery.of(context).size.height * 0.65,
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    padding: const EdgeInsets.all(22),
                    decoration: BoxDecoration(
                      color: colorScheme.primary.withOpacity(0.07),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(statusIcon, size: 48, color: colorScheme.primary.withOpacity(0.5)),
                  ),
                  const SizedBox(height: 18),
                  Text(
                    'Tidak Ada $statusLabel',
                    style: GoogleFonts.outfit(fontSize: 17, fontWeight: FontWeight.bold,
                        color: colorScheme.onSurface.withOpacity(0.7)),
                  ),
                  const SizedBox(height: 8),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 48),
                    child: Text(
                      statusFilter == 'Masuk'
                          ? 'Pesanan baru dari pelanggan akan muncul di sini secara otomatis.'
                          : 'Belum ada pesanan dengan status ini.',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.outfit(fontSize: 13, color: colorScheme.onSurface.withOpacity(0.42), height: 1.5),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Text('↓ Tarik ke bawah untuk memuat ulang',
                      style: GoogleFonts.outfit(fontSize: 11, color: colorScheme.onSurface.withOpacity(0.3))),
                ],
              ).animate().fadeIn(duration: 400.ms).scale(begin: const Offset(0.93, 0.93)),
            ),
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadOrders,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: filtered.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          final data = Map<String, dynamic>.from(
              filtered[index] as Map<String, dynamic>);
          final orderId = data['id']?.toString();
          return _OrderCard(
            order: data,
            onUpdateStatus: (newStatus) {
              if (orderId != null && orderId.isNotEmpty) {
                _handleUpdateStatus(orderId, newStatus);
              } else {
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                    content: Text('ID pesanan tidak valid'),
                    backgroundColor: ThemeConfig.colorError));
              }
            },
            onScan: _handleScan,
            onOpenDetail: () => _showOrderDetail(data),
          ).animate().fadeIn(delay: (60 * index).ms).slideY(begin: 0.1, end: 0, curve: Curves.easeOutQuad);
        },
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  final Map<String, dynamic> order;
  final Function(String) onUpdateStatus;
  final VoidCallback onScan;
  final VoidCallback onOpenDetail;

  const _OrderCard(
      {required this.order,
      required this.onUpdateStatus,
      required this.onScan,
      required this.onOpenDetail});

  @override
  Widget build(BuildContext context) {
    final fmtPrice =
        NumberFormat.currency(locale: 'id_ID', symbol: '${MerchantConfig.defaultCurrencySymbol} ', decimalDigits: 0);
    final colorScheme = Theme.of(context).colorScheme;
    final status = (order['orderStatus']?.toString() ?? 'UNKNOWN');
    Color statusColor = colorScheme.onSurface.withOpacity(0.6);
    String displayStatus = status;

    if (status == 'PENDING') {
      statusColor = colorScheme.primary;
      displayStatus = 'BARU';
    }
    if (status == 'ACCEPTED') {
      statusColor = colorScheme.secondary;
      displayStatus = 'DISIAPKAN';
    }
    if (status == 'READY') {
      statusColor = colorScheme.tertiary;
      displayStatus = 'SIAP AMBIL';
    }
    if (status == 'COMPLETED') {
      statusColor = colorScheme.outline;
      displayStatus = 'SELESAI';
    }

    // Safe access to items
    final List items = (order['transactionItems'] is List)
        ? List<dynamic>.from(order['transactionItems'])
        : const [];
    final idStr = order['id']?.toString() ?? '';
    final idShort = idStr.isEmpty
        ? '-'
        : (idStr.length > 15 ? idStr.substring(0, 15) : idStr);
    final customerName = order['customerName']?.toString() ?? 'No Name';
    final customerPhone = order['customerPhone']?.toString() ?? '-';
    final pickupCode = order['pickupCode']?.toString();
    final createdAtStr = order['createdAt']?.toString();
    DateTime? createdAt;
    try {
      if (createdAtStr != null) {
        createdAt = DateTime.tryParse(createdAtStr)?.toLocal();
      }
    } catch (_) {}

    final num computedTotal = (() {
      final totals = items.map<num>((item) {
        final q = (item is Map && item['quantity'] is num)
            ? (item['quantity'] as num)
            : 1;
        final p =
            (item is Map && item['price'] is num) ? (item['price'] as num) : 0;
        return q * p;
      }).fold<num>(0, (a, b) => a + b);
      final raw = order['totalAmount'];
      if (raw is num) return raw;
      return totals;
    })();

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onOpenDetail,
        child: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                colorScheme.surface.withOpacity(0.98),
                colorScheme.surface.withOpacity(0.94),
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: colorScheme.outline.withOpacity(0.18),
              width: 1.5,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.04),
                blurRadius: 8,
                offset: const Offset(0, 2),
              )
            ],
          ),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    idShort,
                    style: GoogleFonts.sourceCodePro(
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                      color: colorScheme.onSurface.withOpacity(0.7),
                    ),
                  ),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.timelapse,
                            size: 12, color: statusColor),
                        const SizedBox(width: 6),
                        Text(
                          displayStatus,
                          style: TextStyle(
                            color: statusColor,
                            fontWeight: FontWeight.bold,
                            fontSize: 10,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  const CircleAvatar(
                    child: Icon(Icons.person, color: Colors.white),
                    radius: 20,
                    backgroundColor: ThemeConfig.brandColor,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          customerName,
                          style: GoogleFonts.poppins(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                        Row(
                          children: [
                            Icon(Icons.call_outlined,
                                size: 14,
                                color: colorScheme.onSurface.withOpacity(0.5)),
                            const SizedBox(width: 6),
                            Text(
                              customerPhone,
                              style: GoogleFonts.poppins(
                                color: colorScheme.onSurface.withOpacity(0.6),
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                        if (pickupCode != null && pickupCode.isNotEmpty)
                          Text(
                            'Kode: $pickupCode',
                            style: GoogleFonts.sourceCodePro(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurface
                                  .withOpacity(0.8),
                              letterSpacing: 2,
                            ),
                          ),
                        if (createdAt != null)
                          Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Row(
                              children: [
                                Icon(Icons.schedule,
                                    size: 14,
                                    color: colorScheme.onSurface
                                        .withOpacity(0.5)),
                                const SizedBox(width: 6),
                                Text(
                                  DateFormat('dd MMM yyyy, HH:mm')
                                      .format(createdAt),
                                  style: GoogleFonts.poppins(
                                    color: colorScheme.onSurface
                                        .withOpacity(0.6),
                                    fontSize: 11,
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: items.map<Widget>((raw) {
                  final item =
                      raw is Map ? Map<String, dynamic>.from(raw) : {};
                  final product = item['product'] is Map
                      ? Map<String, dynamic>.from(item['product'])
                      : const {};
                  final q =
                      (item['quantity'] is num) ? (item['quantity'] as num) : 1;
                  final p = (item['price'] is num) ? (item['price'] as num) : 0;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          "${q.toInt()}x ${product['name'] ?? 'Item'}",
                          style: const TextStyle(
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        Text(
                          fmtPrice.format(q * p),
                          style: TextStyle(
                            color: colorScheme.onSurface.withOpacity(0.6),
                          ),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ),
              Divider(color: colorScheme.primary.withOpacity(0.2)),
              Align(
                alignment: Alignment.centerRight,
                child: Text(
                  "Total: ${fmtPrice.format(computedTotal)}",
                  style: GoogleFonts.poppins(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                    color: colorScheme.primary,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              if (status == 'PENDING')
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: () => onUpdateStatus('ACCEPTED'),
                    icon: const Icon(Icons.soup_kitchen),
                    label: const Text('Siapkan Pesanan'),
                    style: FilledButton.styleFrom(
                      backgroundColor: colorScheme.primary,
                    ),
                  ),
                ),
              if (status == 'ACCEPTED')
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: () => onUpdateStatus('READY'),
                    icon: const Icon(Icons.check_circle_outline),
                    label: const Text('Selesai Disiapkan'),
                    style: FilledButton.styleFrom(
                      backgroundColor: colorScheme.secondary,
                    ),
                  ),
                ),
              if (status == 'READY')
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: onScan,
                    icon: const Icon(Icons.qr_code_scanner),
                    label: const Text('Scan QR Konsumen'),
                    style: FilledButton.styleFrom(
                      backgroundColor: colorScheme.tertiary,
                      padding: const EdgeInsets.all(16),
                    ),
                  ),
                ),
              if (status == 'READY')
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Center(
                    child: Text(
                      'Tunggu konsumen datang dan scan QR mereka.',
                      style: TextStyle(
                        color: colorScheme.onSurface.withOpacity(0.6),
                        fontSize: 12,
                        fontStyle: FontStyle.italic,
                      ),
                    ),
                  ),
                ),
              if (status == 'COMPLETED')
                Center(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: const [
                      Icon(Icons.task_alt, color: Color(0xFF81B29A)),
                      SizedBox(width: 8),
                      Text(
                        'Transaksi Berhasil',
                        style: TextStyle(
                          color: ThemeConfig.colorSuccess,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
