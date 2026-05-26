import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:rana_market/providers/orders_provider.dart';
import 'package:rana_market/providers/market_cart_provider.dart';
import 'package:rana_market/services/socket_service.dart';
import 'package:rana_market/services/notification_service.dart';
import 'package:rana_market/screens/order_detail_screen.dart';
import 'package:rana_market/data/market_api_service.dart';
import 'package:lottie/lottie.dart';
import 'package:rana_market/config/app_config.dart';
import 'package:rana_market/config/theme_config.dart';
import 'package:flutter_animate/flutter_animate.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  StreamSubscription? _socketSub;
  bool _loading = true;
  String? _phone;
  final TextEditingController _phoneCtrl = TextEditingController();

  static const _activeStatuses = {
    'PENDING', 'ACCEPTED', 'PROCESSING', 'READY_TO_PICKUP', 'READY',
    'ON_DELIVERY'
  };
  static const _completedStatuses = {'COMPLETED', 'DELIVERED'};
  static const _cancelledStatuses = {'CANCELLED', 'REJECTED'};

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadSavedPhone();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _socketSub?.cancel();
    _phoneCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadSavedPhone() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = (prefs.getString('buyer_phone') ?? '').trim();
    if (!mounted) return;
    setState(() {
      _phone = raw.isEmpty ? null : raw;
      _phoneCtrl.text = _phone ?? '';
    });
    if (_phone != null) {
      await _initialLoad();
    } else if (mounted) {
      setState(() => _loading = false);
    }
  }

  Future<void> _savePhone(String phone) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('buyer_phone', phone);
    if (!mounted) return;
    setState(() {
      _phone = phone;
      _phoneCtrl.text = phone;
    });
  }

  Future<void> _initialLoad() async {
    final phone = (_phone ?? '').trim();
    if (phone.isEmpty) {
      if (mounted) setState(() => _loading = false);
      return;
    }
    final prov = Provider.of<OrdersProvider>(context, listen: false);
    final socket = Provider.of<SocketService>(context, listen: false);

    _socketSub?.cancel();

    final list = await MarketApiService().getMyOrders(phone: phone);
    prov.setAll(list);

    for (final o in prov.orders) {
      final id = o['id'].toString();
      socket.joinOrder(id);
    }

    _socketSub = socket.orderStatusStream.listen((data) {
      if (!mounted) return;
      final id = data['id']?.toString();
      if (id != null) {
        prov.updateFromSocket(id, data);
        final status = data['orderStatus'] ?? data['status'] ?? 'UPDATED';
        NotificationService().show(
          id: DateTime.now().millisecondsSinceEpoch % 100000,
          title: 'Status Pesanan Diperbarui',
          body: 'Order ${id.substring(0, 8)}: $status',
          payload: id,
        );
      }
    });

    if (mounted) setState(() => _loading = false);
  }

  Future<void> _cancelOrder(String orderId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Batalkan Pesanan',
            style: TextStyle(fontWeight: FontWeight.bold)),
        content: const Text(
            'Apakah kamu yakin ingin membatalkan pesanan ini? Tindakan ini tidak dapat dibatalkan.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Tidak'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Ya, Batalkan'),
          ),
        ],
      ),
    );
    if (confirm != true) return;
    try {
      await MarketApiService().cancelOrder(orderId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Pesanan berhasil dibatalkan'),
            backgroundColor: Colors.green,
          ),
        );
        setState(() => _loading = true);
        await _initialLoad();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Gagal: $e')));
      }
    }
  }

  void _reorder(Map<String, dynamic> order) async {
    final cart = Provider.of<MarketCartProvider>(context, listen: false);
    final store = order['store'] ?? {};
    final items = order['transactionItems'] as List<dynamic>? ?? [];

    if (items.isEmpty) return;

    try {
      // Check if current cart is from different store
      if (cart.itemCount > 0 && cart.activeStoreName != store['name']) {
        final reset = await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('Ganti Toko?'),
            content: Text(
                'Keranjang Anda berisi produk dari ${cart.activeStoreName}. Ingin menghapus dan menggantinya dengan produk dari ${store['name']}?'),
            actions: [
              TextButton(
                  onPressed: () => Navigator.pop(ctx, false),
                  child: const Text('Tidak')),
              TextButton(
                  onPressed: () => Navigator.pop(ctx, true),
                  child: const Text('Ya, Ganti')),
            ],
          ),
        );
        if (reset != true) return;
        cart.clearCart();
      }

      for (final item in items) {
        final product = item['product'] ?? {};
        cart.addToCart(
          (store['id'] ?? '').toString(),
          (store['name'] ?? '').toString(),
          (product['id'] ?? '').toString(),
          (product['name'] ?? item['productName'] ?? item['name'] ?? 'Produk')
              .toString(),
          (item['price'] as num).toDouble(),
          imageUrl: product['imageUrl'] ?? product['image'],
          quantity: (item['quantity'] as num).toInt(),
          storeAddress: store['address'] ?? store['location'],
          storeLat: (store['latitude'] as num?)?.toDouble(),
          storeLong: (store['longitude'] as num?)?.toDouble(),
        );
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content:
                Text('Produk dari ${store['name']} ditambahkan ke keranjang'),
            action: SnackBarAction(
              label: 'LIHAT',
              onPressed: () {
                // Navigate to home/cart if needed, or just let user know
              },
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Gagal beli lagi: $e')));
      }
    }
  }

  String _getStatusText(String status) {
    switch (status) {
      case 'PENDING':
        return 'Menunggu Konfirmasi';
      case 'ACCEPTED':
      case 'PROCESSING':
        return 'Sedang Diproses';
      case 'READY_TO_PICKUP':
        return 'Siap Diambil';
      case 'ON_DELIVERY':
        return 'Sedang Diantar';
      case 'READY':
        return 'Siap';
      case 'COMPLETED':
      case 'DELIVERED':
        return 'Selesai';
      case 'CANCELLED':
      case 'REJECTED':
        return 'Dibatalkan';
      default:
        return status;
    }
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'PENDING':
        return ThemeConfig.colorWarning;
      case 'ACCEPTED':
      case 'PROCESSING':
        return ThemeConfig.colorInfo;
      case 'ON_DELIVERY':
        return Colors.blue;
      case 'READY_TO_PICKUP':
      case 'READY':
        return ThemeConfig.colorSuccess;
      case 'COMPLETED':
      case 'DELIVERED':
        return ThemeConfig.colorSuccess;
      case 'CANCELLED':
      case 'REJECTED':
        return ThemeConfig.colorError;
      default:
        return Colors.grey;
    }
  }

  String _formatCurrency(num number) {
    return NumberFormat.currency(
            locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0)
        .format(number);
  }

  String _getItemSummary(Map<String, dynamic> order) {
    final items = order['transactionItems'] as List<dynamic>? ?? [];
    if (items.isEmpty) return 'Tidak ada item';
    final summaries = items.map((item) {
      final qty = item['quantity'] ?? 1;
      String name = 'Item';
      if (item['productName'] != null) {
        name = item['productName'];
      } else if (item['name'] != null) {
        name = item['name'];
      } else if (item['product'] is Map) {
        name = item['product']['name'] ?? 'Item';
      }
      return '$qty x $name';
    }).toList();
    if (summaries.length <= 2) return summaries.join(', ');
    return '${summaries.take(2).join(', ')} +${summaries.length - 2} lainnya';
  }

  @override
  Widget build(BuildContext context) {
    final scale = ThemeConfig.tabletScale(context, mobile: 1.0);

    return Scaffold(
      backgroundColor: ThemeConfig.beigeBackground,
      appBar: AppBar(
        title: Text('Pesanan Saya',
            style:
                TextStyle(fontSize: 18 * scale, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        actions: [
          if (_phone != null)
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: () async {
                setState(() => _loading = true);
                await _initialLoad();
              },
            )
        ],
        bottom: _phone == null
            ? null
            : TabBar(
                controller: _tabController,
                labelColor: ThemeConfig.brandColor,
                unselectedLabelColor: Colors.grey,
                indicatorColor: ThemeConfig.brandColor,
                tabs: const [
                  Tab(text: 'Aktif'),
                  Tab(text: 'Selesai'),
                  Tab(text: 'Dibatalkan'),
                ],
              ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _phone == null
              ? _buildLoginView()
              : Consumer<OrdersProvider>(
                  builder: (ctx, prov, _) {
                    final activeOrders = prov.orders
                        .where((o) => _activeStatuses
                            .contains(o['orderStatus'] ?? 'PENDING'))
                        .toList();
                    final completedOrders = prov.orders
                        .where((o) => _completedStatuses
                            .contains(o['orderStatus'] ?? ''))
                        .toList();
                    final cancelledOrders = prov.orders
                        .where((o) => _cancelledStatuses
                            .contains(o['orderStatus'] ?? ''))
                        .toList();

                    return TabBarView(
                      controller: _tabController,
                      children: [
                        _buildOrderList(activeOrders, showCancel: true),
                        _buildOrderList(completedOrders, showCancel: false),
                        _buildOrderList(cancelledOrders, showCancel: false),
                      ],
                    );
                  },
                ),
    );
  }

  Widget _buildOrderList(List<dynamic> orders, {required bool showCancel}) {
    final scale = ThemeConfig.tabletScale(context, mobile: 1.0);

    if (orders.isEmpty) {
      return ListView(
        children: [
          SizedBox(height: MediaQuery.of(context).size.height * 0.15),
          Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                SizedBox(
                  height: 160 * scale,
                  child: Lottie.network(
                    AppConfig.emptyOrderLottieUrl,
                    fit: BoxFit.contain,
                    errorBuilder: (_, __, ___) => const Icon(
                        Icons.shopping_bag_outlined,
                        size: 80,
                        color: Colors.grey),
                  ),
                ),
                const SizedBox(height: 16),
                Text('Tidak ada pesanan di sini',
                    style:
                        TextStyle(color: Colors.grey, fontSize: 16 * scale)),
              ],
            ),
          ),
        ],
      );
    }

    return RefreshIndicator(
      onRefresh: () async {
        setState(() => _loading = true);
        await _initialLoad();
      },
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: orders.length,
        separatorBuilder: (_, __) => const SizedBox(height: 16),
        itemBuilder: (ctx, i) {
          final o = orders[i] as Map<String, dynamic>;
          final status = o['orderStatus'] ?? 'PENDING';
          final statusText = _getStatusText(status);
          final statusColor = _getStatusColor(status);
          final total = o['totalAmount'] ?? 0;
          final storeName = o['store']?['name'] ?? 'Toko';
          final fulfillment = o['fulfillmentType'] == 'DELIVERY'
              ? 'Diantar'
              : 'Ambil Sendiri';
          final date = o['createdAt'] != null
              ? DateTime.tryParse(o['createdAt'].toString())
              : null;
          final dateStr =
              date != null ? DateFormat('dd MMM HH:mm').format(date) : '';
          final items = o['transactionItems'] as List<dynamic>? ?? [];
          String? firstImage;
          if (items.isNotEmpty) {
            final firstItem = items.first;
            final product = firstItem['product'];
            if (product is Map) {
              final raw = product['imageUrl'] ?? product['image'];
              if (raw != null) {
                firstImage =
                    MarketApiService().resolveFileUrl(raw.toString());
              }
            }
          }

          final canCancel = showCancel && status == 'PENDING';

          return InkWell(
            onTap: () => Navigator.push(context,
                MaterialPageRoute(builder: (_) => OrderDetailScreen(order: o))),
            borderRadius: BorderRadius.circular(16),
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  )
                ],
              ),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Row(
                          children: [
                            const Icon(Icons.store,
                                size: 18, color: ThemeConfig.brandColor),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(storeName,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 14)),
                                  Text(fulfillment,
                                      style: TextStyle(
                                          fontSize: 10,
                                          color: Colors.grey.shade600)),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: statusColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(statusText,
                            style: TextStyle(
                                color: statusColor,
                                fontSize: 10,
                                fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const Divider(height: 1),
                  const SizedBox(height: 12),
                  // Item row
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 60,
                        height: 60,
                        decoration: BoxDecoration(
                          color: Colors.grey.shade100,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.grey.shade200),
                        ),
                        child: firstImage != null
                            ? ClipRRect(
                                borderRadius: BorderRadius.circular(12),
                                child: Image.network(firstImage,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) => const Icon(
                                        Icons.image_not_supported,
                                        color: Colors.grey,
                                        size: 24)),
                              )
                            : const Icon(Icons.shopping_bag_outlined,
                                color: Colors.grey, size: 24),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(_getItemSummary(o),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w500)),
                            if (dateStr.isNotEmpty)
                              Padding(
                                padding: const EdgeInsets.only(top: 4),
                                child: Text(dateStr,
                                    style: TextStyle(
                                        color: Colors.grey.shade400,
                                        fontSize: 11)),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  // Footer
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      if (canCancel)
                        OutlinedButton.icon(
                          onPressed: () =>
                              _cancelOrder(o['id'].toString()),
                          icon: const Icon(Icons.cancel_outlined,
                              size: 14, color: Colors.red),
                          label: const Text('Batalkan',
                              style:
                                  TextStyle(color: Colors.red, fontSize: 12)),
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: Colors.red),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 4),
                            minimumSize: const Size(0, 0),
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8)),
                          ),
                        )
                      else if (status == 'COMPLETED' || status == 'DELIVERED')
                        FilledButton.icon(
                          onPressed: () => _reorder(o),
                          icon: const Icon(Icons.refresh, size: 14),
                          label: const Text('Beli Lagi', style: TextStyle(fontSize: 12)),
                          style: FilledButton.styleFrom(
                            backgroundColor: ThemeConfig.brandColor,
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                            minimumSize: const Size(0, 0),
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                        )
                      else
                        const SizedBox.shrink(),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          const Text('Total Belanja',
                              style:
                                  TextStyle(fontSize: 10, color: Colors.grey)),
                          Text(_formatCurrency(total),
                              style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                  color: ThemeConfig.brandColor)),
                        ],
                      )
                    ],
                  )
                ],
              ),
            ).animate().fadeIn(duration: 300.ms).slideY(begin: 0.05),
          );
        },
      ),
    );
  }

  Widget _buildLoginView() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const SizedBox(height: 40),
        const Icon(Icons.receipt_long, size: 72, color: Colors.grey),
        const SizedBox(height: 16),
        const Text('Masukkan nomor WhatsApp',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            textAlign: TextAlign.center),
        const SizedBox(height: 8),
        const Text(
            'Nomor ini dipakai untuk menampilkan riwayat pesanan kamu.',
            style: TextStyle(color: Colors.grey),
            textAlign: TextAlign.center),
        const SizedBox(height: 24),
        TextField(
          controller: _phoneCtrl,
          keyboardType: TextInputType.phone,
          decoration: const InputDecoration(
            labelText: 'Nomor WhatsApp',
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 12),
        FilledButton(
          onPressed: () async {
            final phone = _phoneCtrl.text.trim();
            if (phone.isEmpty) return;
            setState(() => _loading = true);
            await _savePhone(phone);
            await _initialLoad();
          },
          child: const Text('Lihat Pesanan'),
        ),
      ],
    );
  }
}
