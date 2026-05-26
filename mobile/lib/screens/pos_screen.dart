import 'package:rana_merchant/config/merchant_config.dart';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:shimmer/shimmer.dart';
import 'package:intl/intl.dart';
import 'package:rana_merchant/providers/cart_provider.dart';
import 'package:rana_merchant/data/local/database_helper.dart';
import 'package:rana_merchant/widgets/product_card.dart';
import 'package:rana_merchant/services/sound_service.dart';
import 'package:rana_merchant/screens/scan_screen.dart';
import 'package:rana_merchant/screens/payment_screen.dart';
import 'package:rana_merchant/services/sync_service.dart';
import 'package:flutter/services.dart';
import 'package:rana_merchant/widgets/cart_widget.dart';
import 'package:rana_merchant/providers/shift_provider.dart';
import 'package:rana_merchant/screens/cash_management_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:rana_merchant/config/theme_config.dart';
import 'package:rana_merchant/services/voice_command_service.dart'; // [NEW]

class PosScreen extends StatefulWidget {
  const PosScreen({super.key});

  @override
  State<PosScreen> createState() => _PosScreenState();
}

class _PosScreenState extends State<PosScreen> {
  List<Map<String, dynamic>> _products = [];
  List<Map<String, dynamic>> _filteredProducts = [];
  bool _isLoading = true;
  String _searchQuery = '';
  String _selectedCategory = 'All';
  final _startCashController = TextEditingController();

  List<String> _categories = ['All'];
  StreamSubscription? _syncSubscription;
  StreamSubscription<Map<String, dynamic>>? _statusSub;
  bool _online = true;
  DateTime? _lastSyncAt;
  int _pendingTxnCount = 0;
  bool _showTrainingHint = false;
  bool _showVoiceHint = true;
  bool _isListening = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(() => context.read<ShiftProvider>().loadCurrentShift());
    _loadProducts();
    _loadPendingCount();
    // [NEW] Listen for real-time stock updates
    _syncSubscription = SyncService().onDataChanged.listen((_) {
      if (!mounted) return;
      _loadProducts();
      _loadPendingCount();
    });
    _statusSub = SyncService().statusStream.listen((map) {
      final online = map['online'] == true;
      final last = map['lastSyncAt']?.toString();
      setState(() {
        _online = online;
        _lastSyncAt = last != null && last.isNotEmpty
            ? DateTime.tryParse(last)
            : _lastSyncAt;
      });
    });
    _loadTrainingHint();
    _loadVoiceHint();
    VoiceCommandService().initialize().then((avail) {
      if (mounted && avail) {
        // Voice ready
      }
    });
  }

  Future<void> _loadVoiceHint() async {
    final prefs = await SharedPreferences.getInstance();
    final seen = prefs.getBool('pos_voice_hint_seen') ?? false;
    if (!mounted) return;
    setState(() {
      _showVoiceHint = !seen;
    });
  }

  Future<void> _dismissVoiceHint() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('pos_voice_hint_seen', true);
    if (!mounted) return;
    setState(() {
      _showVoiceHint = false;
    });
  }

  void _toggleVoiceCommand() {
    if (_isListening) {
      VoiceCommandService().stopListening();
      setState(() => _isListening = false);
    } else {
      setState(() => _isListening = true);
      VoiceCommandService().startListening(
        onResult: (text) {
          // Process live
          debugPrint("Voice: $text");
          // Optionally show toast or feedback
        },
        onStatus: (status) {
          if (status == 'done' || status == 'notListening') {
             if (mounted) setState(() => _isListening = false);
          }
        },
      );
      // We also need a way to capture the FINAL result. 
      // The simple service implementation above sends partial results.
      // Let's modify the service usage or just rely on the stream.
      // Actually, let's wrap the logic here.
      
      // Re-implement slightly for better control
       VoiceCommandService().stopListening(); // Safety
       VoiceCommandService().startListening(
        onResult: (text) {
          // Debounce or wait for pause? 
          // For now, let's just parse every update but only act if confident?
          // No, better to wait for final.
          // The current service implementation is simple. Let's act on end or keywords.
          
          final cmd = VoiceCommandService().parseCommand(text, _products);
          if (cmd != null) {
            _executeVoiceCommand(cmd);
            VoiceCommandService().stopListening(); // Stop after successful command
            setState(() => _isListening = false);
          }
        },
        onStatus: (status) {
           debugPrint("Voice Status: $status");
           if (status == 'done' || status == 'notListening') {
             if (mounted) setState(() => _isListening = false);
           }
        }
      );
    }
  }

  void _executeVoiceCommand(Map<String, dynamic> cmd) {
    final action = cmd['action'];
    final cart = Provider.of<CartProvider>(context, listen: false);
    
    if (action == 'ADD_ITEM') {
      final p = cmd['product'];
      final qty = cmd['qty'] as int;
      final stock = (p['stock'] ?? 0) as int;
      
      if (stock <= 0) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Stok ${p['name']} habis')),
        );
        SoundService.playError();
        return;
      }
      
      cart.addItem(p['id'], p['name'], p['sellingPrice'], quantity: qty, maxStock: stock);
      SoundService.playBeep();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Ditambahkan: $qty ${p['name']}')),
      );
    } else if (action == 'CHECKOUT') {
      if (cart.itemCount > 0) {
         _showCartSheet(context, cart);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Keranjang kosong')),
        );
      }
    } else if (action == 'CLEAR_CART') {
      cart.clear();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Keranjang dikosongkan')),
      );
    }
  }

  @override
  void dispose() {
    _syncSubscription?.cancel();
    _statusSub?.cancel();
    super.dispose();
  }

  Future<void> _loadProducts() async {
    final data = await DatabaseHelper.instance.getAllProducts();

    final Set<String> uniqueCats = {'All'};
    for (var p in data) {
      if (p['category'] != null && p['category'].toString().isNotEmpty) {
        uniqueCats.add(p['category']);
      }
    }

    if (mounted) {
      setState(() {
        _products = data;
        _categories = uniqueCats.toList();
        _filterProducts();
        _isLoading = false;
      });
    }
  }

  Future<void> _loadPendingCount() async {
    final pending = await DatabaseHelper.instance.getPendingTransactions();
    if (!mounted) return;
    setState(() {
      _pendingTxnCount = pending.length;
    });
  }

  Future<void> _loadTrainingHint() async {
    final prefs = await SharedPreferences.getInstance();
    final seen = prefs.getBool('pos_training_hint_seen') ?? false;
    if (!mounted) return;
    setState(() {
      _showTrainingHint = !seen;
    });
  }

  Future<void> _dismissTrainingHint() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('pos_training_hint_seen', true);
    if (!mounted) return;
    setState(() {
      _showTrainingHint = false;
    });
  }

  Widget _buildShimmerGrid(int crossAxisCount, double childAspectRatio, double spacing) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final baseColor = isDark ? Colors.grey[800]! : Colors.grey[300]!;
    final highlightColor = isDark ? Colors.grey[700]! : Colors.grey[100]!;

    return GridView.builder(
      padding: const EdgeInsets.fromLTRB(6, 6, 6, 6),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: crossAxisCount,
        childAspectRatio: childAspectRatio,
        crossAxisSpacing: spacing,
        mainAxisSpacing: spacing,
      ),
      itemCount: crossAxisCount * 4,
      itemBuilder: (ctx, i) {
        return Shimmer.fromColors(
          baseColor: baseColor,
          highlightColor: highlightColor,
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.white, width: 2),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Container(
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.vertical(top: Radius.circular(10)),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(8.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(height: 12, width: double.infinity, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
                      const SizedBox(height: 8),
                      Container(height: 10, width: 60, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
                      const SizedBox(height: 10),
                      Container(height: 14, width: 80, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
                      const SizedBox(height: 8),
                      Container(height: 32, width: double.infinity, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8))),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  String _normalizeText(String input) {
    final lower = input.toLowerCase();
    final buffer = StringBuffer();
    var lastIsSpace = false;
    for (var i = 0; i < lower.length; i++) {
      final code = lower.codeUnitAt(i);
      final isDigit = code >= 48 && code <= 57;
      final isLetter = code >= 97 && code <= 122;
      if (isLetter || isDigit) {
        buffer.writeCharCode(code);
        lastIsSpace = false;
      } else {
        if (!lastIsSpace) {
          buffer.write(' ');
          lastIsSpace = true;
        }
      }
    }
    final result = buffer.toString().trim();
    return result.replaceAll(RegExp(r'\s+'), ' ');
  }

  int _levenshteinDistance(String s, String t) {
    if (identical(s, t)) return 0;
    if (s.isEmpty) return t.length;
    if (t.isEmpty) return s.length;

    final m = s.length;
    final n = t.length;
    var previous = List<int>.generate(n + 1, (index) => index);
    var current = List<int>.filled(n + 1, 0);

    for (var i = 1; i <= m; i++) {
      current[0] = i;
      final sc = s.codeUnitAt(i - 1);
      for (var j = 1; j <= n; j++) {
        final tc = t.codeUnitAt(j - 1);
        final cost = sc == tc ? 0 : 1;
        final deletion = previous[j] + 1;
        final insertion = current[j - 1] + 1;
        final substitution = previous[j - 1] + cost;
        var value = deletion;
        if (insertion < value) value = insertion;
        if (substitution < value) value = substitution;
        current[j] = value;
      }
      final temp = previous;
      previous = current;
      current = temp;
    }
    return previous[n];
  }

  bool _matchesQuery(String name, String sku, String normalizedQuery) {
    if (normalizedQuery.isEmpty) return true;
    final combined = _normalizeText('$name $sku');
    if (combined.isEmpty) return false;
    if (combined.contains(normalizedQuery)) return true;

    final tokens = combined.split(' ');
    final qLen = normalizedQuery.length;
    final maxDist = qLen <= 4 ? 1 : 2;
    for (final token in tokens) {
      if (token.isEmpty) continue;
      final dist = _levenshteinDistance(token, normalizedQuery);
      if (dist <= maxDist) return true;
    }
    return false;
  }

  void _filterProducts() {
    final rawQuery = _searchQuery.trim();
    final normalizedQuery = _normalizeText(rawQuery);
    final selectedCat = _selectedCategory;
    final source = _products;

    List<Map<String, dynamic>> next;
    if (normalizedQuery.isEmpty &&
        (selectedCat == 'All' || selectedCat.isEmpty)) {
      next = List<Map<String, dynamic>>.from(source);
    } else {
      next = <Map<String, dynamic>>[];
      for (final p in source) {
        final cat = (p['category'] ?? 'Lainnya').toString();
        final name = (p['name'] ?? '').toString();
        final sku = (p['sku'] ?? '').toString();
        final matchCat = selectedCat == 'All' ||
            cat.toLowerCase() == selectedCat.toLowerCase();
        final matchQuery = _matchesQuery(name, sku, normalizedQuery);
        if (matchCat && matchQuery) {
          next.add(p);
        }
      }
    }

    setState(() {
      _filteredProducts = next;
    });
  }

  @override
  Widget build(BuildContext context) {
    var cart = Provider.of<CartProvider>(context);
    final shiftProvider = context.watch<ShiftProvider>();
    final currency =
        NumberFormat.currency(locale: 'id_ID', symbol: '${MerchantConfig.defaultCurrencySymbol} ', decimalDigits: 0);
    final screenWidth = MediaQuery.of(context).size.width;
    final isTablet = screenWidth >= 600; // Adjusted breakpoint for tablets

    // Compact grid: more products per screen
    double gridSpacing = screenWidth < 360 ? 4 : 8;
    final availableGridWidth = isTablet ? screenWidth - 380 : screenWidth;
    const double minTileWidth =
        130; // target compact tile width, safer for height
    int gridCrossAxisCount =
        (availableGridWidth / minTileWidth).floor().clamp(2, 8);
    double gridChildAspectRatio = 0.78;

    if (!isTablet && gridCrossAxisCount < 3) {
      gridCrossAxisCount = 3;
    }

    final productBody = Column(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            border: Border(
                bottom: BorderSide(
                    color: Theme.of(context)
                        .colorScheme
                        .outline
                        .withOpacity(0.2))),
            borderRadius: const BorderRadius.only(
              bottomLeft: Radius.circular(12),
              bottomRight: Radius.circular(12),
            ),
          ),
          child: Column(
            children: [
              TextField(
                decoration: InputDecoration(
                  hintText: 'Cari Produk...',
                  isDense: true,
                  hintStyle: GoogleFonts.poppins(
                      color: Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withOpacity(0.4),
                      fontSize: 12),
                  prefixIcon: Icon(Icons.search,
                      color: Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withOpacity(0.4)),
                  filled: true,
                  fillColor:
                      Theme.of(context).colorScheme.surface.withOpacity(0.7),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: BorderSide(
                        color: Theme.of(context)
                            .colorScheme
                            .outline
                            .withOpacity(0.2)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: BorderSide(
                        color: Theme.of(context).colorScheme.primary),
                  ),
                  contentPadding:
                      const EdgeInsets.symmetric(vertical: 6, horizontal: 10),
                ),
                onChanged: (val) {
                  _searchQuery = val;
                  _filterProducts();
                },
              ),
              const SizedBox(height: 8),
              SizedBox(
                height: 28,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: _categories.length,
                  itemBuilder: (ctx, i) {
                    final cat = _categories[i];
                    final isSelected = _selectedCategory == cat;
                    return Padding(
                      padding: const EdgeInsets.only(right: 4),
                      child: InkWell(
                        onTap: () {
                          SoundService.playBeep(); // [FIX] Add sound
                          setState(() {
                            _selectedCategory = cat;
                            _filterProducts();
                          });
                        },
                        borderRadius: BorderRadius.circular(14),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                              color: isSelected
                                  ? Theme.of(context)
                                      .colorScheme
                                      .primary
                                      .withOpacity(0.1)
                                  : Theme.of(context).colorScheme.surface,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                  color: isSelected
                                      ? Theme.of(context).colorScheme.primary
                                      : Theme.of(context)
                                          .colorScheme
                                          .outline
                                          .withOpacity(0.3),
                                  width: 1.5)),
                          child: Text(
                            cat,
                            style: GoogleFonts.poppins(
                                color: isSelected
                                    ? Theme.of(context).colorScheme.primary
                                    : Theme.of(context)
                                        .colorScheme
                                        .onSurface
                                        .withOpacity(0.7),
                                fontWeight: FontWeight.w600,
                                fontSize: 11),
                          ),
                        ),
                      ),
                    ).animate().fadeIn(delay: (20 * i).ms).slideX(begin: 0.1, end: 0, curve: Curves.easeOut);
                  },
                ),
              )
            ],
          ),
        ),
        if (_showVoiceHint)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primary.withOpacity(0.08),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: Theme.of(context).colorScheme.primary.withOpacity(0.2),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.mic, size: 20, color: Theme.of(context).colorScheme.primary),
                      const SizedBox(width: 8),
                      Text(
                        'Coba Perintah Suara!',
                        style: GoogleFonts.poppins(
                          fontWeight: FontWeight.bold,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                      ),
                      const Spacer(),
                      InkWell(
                        onTap: _dismissVoiceHint,
                        child: Icon(Icons.close, size: 18, color: Theme.of(context).colorScheme.onSurface.withOpacity(0.5)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Gunakan ikon mikrofon di atas untuk transaksi cepat tanpa ketik.',
                    style: GoogleFonts.poppins(fontSize: 12),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _buildVoiceChip('"Tambah Kopi 2"'),
                      _buildVoiceChip('"Pesan Nasi Goreng 1"'),
                      _buildVoiceChip('"Bayar"'),
                      _buildVoiceChip('"Hapus Semua"'),
                    ],
                  ),
                ],
              ),
            ),
          ),
        if (_showTrainingHint)
          Padding(
            padding: const EdgeInsets.fromLTRB(8, 8, 8, 0),
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primary.withOpacity(0.06),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: Theme.of(context).colorScheme.primary.withOpacity(0.2),
                ),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    Icons.lightbulb_outline,
                    size: 18,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Tips: Ketik nama atau SKU, atau gunakan tombol scan untuk mencari produk lebih cepat. Pencarian juga toleran salah ketik.',
                      style: GoogleFonts.poppins(
                        fontSize: 11 * ThemeConfig.tabletScale(context, mobile: 1.0),
                        color: Theme.of(context)
                            .colorScheme
                            .onSurface
                            .withOpacity(0.8),
                      ),
                    ),
                  ),
                  IconButton(
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    icon: Icon(
                      Icons.close,
                      size: 18,
                      color: Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withOpacity(0.5),
                    ),
                    onPressed: _dismissTrainingHint,
                  ),
                ],
              ),
            ),
          ),

        // -- Product Grid --
        Expanded(
          child: _isLoading
              ? _buildShimmerGrid(gridCrossAxisCount, gridChildAspectRatio, gridSpacing)
              : _filteredProducts.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.search_off,
                              size: 64,
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurface
                                  .withOpacity(0.3)),
                          const SizedBox(height: 16),
                          Text('Produk tidak ditemukan',
                              style: GoogleFonts.poppins(
                                  fontSize: 14 * ThemeConfig.tabletScale(context, mobile: 1.0),
                                  color: Theme.of(context)
                                      .colorScheme
                                      .onSurface
                                      .withOpacity(0.4)))
                        ],
                      ),
                    )
                  : GridView.builder(
                      padding: const EdgeInsets.fromLTRB(6, 6, 6, 6),
                      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: gridCrossAxisCount,
                        childAspectRatio: gridChildAspectRatio,
                        crossAxisSpacing: gridSpacing,
                        mainAxisSpacing: gridSpacing,
                      ),
                      itemCount: _filteredProducts.length,
                      itemBuilder: (ctx, i) {
                        final product = _filteredProducts[i];
                        final qty = cart.items[product['id']]?.quantity ?? 0;
                        final stock = (product['stock'] ?? 0) as int;
                        return ProductCard(
                          product: product,
                          quantity: qty,
                          onTap: () {
                            if (stock <= 0) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                    content:
                                        Text('Stok produk ini sudah habis')),
                              );
                              SoundService.playError();
                              return;
                            }
                            if (qty >= stock) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                    content: Text(
                                        'Maksimal stok tersedia hanya $stock')),
                              );
                              SoundService.playError();
                              return;
                            }
                            SoundService.playBeep();
                            cart.addItem(product['id'], product['name'],
                                product['sellingPrice'],
                                maxStock: stock,
                                sku: product['sku'],
                                imageUrl: product['imageUrl'],
                                basePrice: (product['costPrice'] is num)
                                    ? (product['costPrice'] as num).toDouble()
                                    : 0.0);
                          },
                        ).animate().fadeIn(delay: (30 * i).ms, duration: 400.ms).slideY(begin: 0.05, end: 0, delay: (30 * i).ms, duration: 400.ms, curve: Curves.easeOutQuad);
                      },
                    ),
        ),
      ],
    );

    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        elevation: 0,
        centerTitle: false,
        title: Row(
          children: [
            Expanded(
              child: Text('Kasir',
                  style: GoogleFonts.poppins(
                      fontWeight: FontWeight.bold,
                      color: colorScheme.primary,
                      fontSize: 18)),
            ),
            _buildStatusBadge(),
          ],
        ),
        toolbarHeight: 44,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1.0),
          child: Container(
              color: colorScheme.primary.withOpacity(0.1), height: 1.0),
        ),
        actions: [
          _buildActionButton(
            context,
            Icons.mic_rounded,
            _toggleVoiceCommand,
            tooltip: 'Perintah Suara',
            isActive: _isListening,
            activeColor: Colors.redAccent,
          ),
          const SizedBox(width: 8),
          _buildActionButton(
            context,
            Icons.qr_code_scanner,
            () async {
              await Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => const ScanScreen(),
                ),
              );
            },
            tooltip: 'Scan produk atau QR pelanggan',
          ),
          const SizedBox(width: 8),
          _buildActionButton(
            context,
            Icons.sync,
            () async {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Sinkronisasi data...'),
                ),
              );
              try {
                await SyncService().syncTransactions();
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Sinkronisasi Selesai'),
                      backgroundColor: Color(0xFF81B29A),
                    ),
                  );
                }
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Gagal Sync: $e'),
                      backgroundColor: const Color(0xFFE07A5F),
                    ),
                  );
                }
              }
            },
            tooltip: 'Sinkronkan transaksi dengan server',
          ),
          const SizedBox(width: 8),
          _buildActionButton(
            context,
            Icons.account_balance_wallet_outlined,
            () async {
              await Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => const CashManagementScreen(),
                ),
              );
            },
            tooltip: 'Kelola kas dan tutup shift',
          ),
          const SizedBox(width: 8),
          // Only show cart button on mobile
          if (!isTablet)
            Stack(
              children: [
                _buildActionButton(
                  context,
                  Icons.shopping_bag_outlined,
                  () => _showCartSheet(context, cart),
                  tooltip: 'Lihat keranjang belanja',
                ),
                if (cart.itemCount > 0)
                  Positioned(
                    right: 4,
                    top: 4,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.primary,
                          shape: BoxShape.circle),
                      child: Text('${cart.itemCount}',
                          style: TextStyle(
                              color: Theme.of(context).colorScheme.onPrimary,
                              fontSize: 10,
                              fontWeight: FontWeight.bold)),
                    ).animate().scale(duration: 200.ms),
                  )
              ],
            ),
          const SizedBox(width: 16),
        ],
      ),
      body: shiftProvider.isLoading
          ? Center(
              child: CircularProgressIndicator(
                  color: Theme.of(context).colorScheme.primary))
          : !shiftProvider.isShiftOpen
              ? _buildOpenShiftView(context)
              : isTablet
                  ? Row(
                      children: [
                        Expanded(child: productBody),
                        SizedBox(
                          width: 380,
                          child: CartWidget(
                            isEmbedded: true,
                            onCheckoutSuccess: _loadProducts,
                          ),
                        )
                      ],
                    )
                  : productBody,
      floatingActionButton:
          (!isTablet && shiftProvider.isShiftOpen && cart.itemCount > 0)
              ? FloatingActionButton.extended(
                  onPressed: () => _showCartSheet(context, cart),
                  icon: const Icon(Icons.shopping_bag_outlined),
                  label: Text(
                    '${cart.itemCount} Item  •  ${currency.format(cart.totalAmount)}',
                    style: GoogleFonts.poppins(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  backgroundColor: Theme.of(context).colorScheme.primary,
                  foregroundColor: Theme.of(context).colorScheme.onPrimary,
                  elevation: 4,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(24),
                  ),
                  tooltip: 'Buka keranjang dan proses pembayaran',
                ).animate().slideY(begin: 1, curve: Curves.easeOutBack)
              : null,
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
    );
  }

  Widget _buildActionButton(
      BuildContext context, IconData icon, VoidCallback onTap,
      {String? tooltip, bool isActive = false, Color? activeColor}) {
    final color = activeColor ?? Theme.of(context).colorScheme.primary;
    return Container(
      decoration: BoxDecoration(
        color: isActive 
            ? color.withOpacity(0.2) 
            : Theme.of(context).colorScheme.surface,
        border: Border.all(
            color: isActive
                ? color
                : Theme.of(context).colorScheme.primary.withOpacity(0.15)),
        borderRadius: BorderRadius.circular(8),
      ),
      child: IconButton(
        icon: Icon(icon,
            color: isActive 
                ? color
                : Theme.of(context).colorScheme.onSurface, 
            size: 18),
        onPressed: onTap,
        tooltip: tooltip,
        splashRadius: 20,
      ),
    );
  }

  Widget _buildStatusBadge() {
    final text = _online ? 'Realtime' : 'Offline';
    final color = _online ? const Color(0xFF16A34A) : const Color(0xFF64748B);
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
            ? const Color(0xFF22C55E).withOpacity(0.12)
            : const Color(0xFF94A3B8).withOpacity(0.12),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
            color: _online
                ? const Color(0xFF22C55E).withOpacity(0.4)
                : const Color(0xFF94A3B8).withOpacity(0.4)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 6),
          Text('$text$syncText$pendingText',
              style: GoogleFonts.poppins(
                  fontSize: 11, color: color, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  Widget _buildOpenShiftView(BuildContext context) {
    return Center(
      child: Container(
        constraints: const BoxConstraints(maxWidth: 400),
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primary.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.storefront,
                size: 64,
                color: Theme.of(context).colorScheme.primary,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Buka Kasir',
              style: GoogleFonts.poppins(
                fontSize: 24 * ThemeConfig.tabletScale(context, mobile: 1.0),
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Masukkan modal awal untuk memulai shift penjualan hari ini.',
              textAlign: TextAlign.center,
              style: GoogleFonts.poppins(
                fontSize: 14 * ThemeConfig.tabletScale(context, mobile: 1.0),
                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.7),
              ),
            ),
            const SizedBox(height: 32),
            TextField(
              controller: _startCashController,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: 'Modal Awal (Rp)',
                prefixText: '${MerchantConfig.defaultCurrencySymbol} ',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                filled: true,
                fillColor:
                    Theme.of(context).colorScheme.surface.withOpacity(0.7),
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: () async {
                  final amount = double.tryParse(_startCashController.text);
                  if (amount == null) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                          content: Text('Masukkan jumlah yang valid')),
                    );
                    return;
                  }

                  // Use a hardcoded cashier ID for now or get from auth
                  // In real app, get from AuthProvider.
                  const cashierId = 'current_user';

                  final success = await context
                      .read<ShiftProvider>()
                      .openShift(cashierId, amount);

                  if (success) {
                    SoundService.playBeep();
                    _startCashController.clear();
                  } else {
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                            content: Text(
                                'Gagal membuka shift: ${context.read<ShiftProvider>().errorMessage}')),
                      );
                    }
                  }
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Theme.of(context).colorScheme.primary,
                  foregroundColor: Theme.of(context).colorScheme.onPrimary,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: Text(
                  'Buka Shift',
                  style: GoogleFonts.poppins(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildVoiceChip(String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Text(
        label,
        style: GoogleFonts.poppins(fontSize: 10, fontWeight: FontWeight.w500),
      ),
    );
  }

  void _showCartSheet(BuildContext context, CartProvider cart) {
    final media = MediaQuery.of(context);
    final isTablet = media.size.width >= 600;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) {
        final sheetHeightFactor = isTablet ? 0.9 : 0.85;

        return Center(
            child: Container(
          constraints: BoxConstraints(
            maxWidth: isTablet ? 600 : double.infinity,
          ),
          height: media.size.height * sheetHeightFactor,
          child: CartWidget(
            onClose: () => Navigator.pop(context),
            onCheckoutSuccess: _loadProducts,
          ),
        ));
      },
    );
  }
}
