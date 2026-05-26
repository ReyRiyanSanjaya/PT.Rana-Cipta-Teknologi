import 'dart:math' as math;
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:intl/intl.dart';
import 'package:rana_merchant/config/app_config.dart';
import 'package:rana_merchant/config/api_config.dart';
import 'package:rana_merchant/data/local/database_helper.dart';
import 'package:rana_merchant/config/merchant_config.dart';
import 'package:rana_merchant/services/notification_service.dart';

class AiService {
  final DatabaseHelper _db = DatabaseHelper.instance;
  final Dio _dio = Dio();

  // [NEW] Advanced Multi-Insight Generation
  Future<List<Map<String, dynamic>>> generateAdvancedInsights(
      {double? lat, double? lng}) async {
    try {
      final now = DateTime.now();
      final start7d = now.subtract(const Duration(days: 7));
      final start3d = now.subtract(const Duration(days: 3));
      final prev3dStart = now.subtract(const Duration(days: 6));
      final prev3dEnd = now.subtract(const Duration(days: 3));
      final start30d = now.subtract(const Duration(days: 30));

      // WAVE 1: Parallel Database Queries
      final results = await Future.wait([
        _db.getLowStockProducts(threshold: MerchantConfig.lowStockWarningThreshold),
        _db.getUnsoldProducts(
          limit: 1,
          minStock: MerchantConfig.lowStockWarningThreshold,
          start: now.subtract(const Duration(days: MerchantConfig.deadStockDaysFilter)),
        ),
        _db.getSalesReport(start: start7d, end: now),
        _db.getTopSellingProductsDetailed(limit: 5, start: start7d, end: now),
        _db.getPeakHours(days: 7),
        _db.getInactiveCustomers(days: MerchantConfig.dormantCustomerDays),
        analyzeCategoryTrends(days: 14),
        _db.getSalesReport(start: prev3dStart, end: prev3dEnd),
        _db.getSalesReport(start: start3d, end: now),
        _db.getSalesByPaymentMethod(start: start7d, end: now),
        _db.getLocalTodayBreakdown(
            start: DateTime(now.year, now.month, now.day),
            end: DateTime(now.year, now.month, now.day, 23, 59)),
        _db.getExpenses(start: start7d, end: now),
        _db.getFrequentlyBoughtTogether(start: start7d, end: now, limit: 10),
        computeStockoutRisks(limit: 5),
        computeReorderSchedule(leadTimeDays: 3, safetyDays: 2, limit: 5),
        _getWeather(lat, lng), // Weather API call
      ]);

      final lowStockItems = results[0] as List<Map<String, dynamic>>;
      final deadStock = results[1] as List<Map<String, dynamic>>;
      final report7d = results[2] as Map<String, dynamic>;
      final topProducts = results[3] as List<Map<String, dynamic>>;
      final peakHours = results[4] as List<Map<String, dynamic>>;
      final inactiveCustomers = results[5] as List<Map<String, dynamic>>;
      final catTrend = results[6] as Map<String, dynamic>;
      final prev3dReport = results[7] as Map<String, dynamic>;
      final recent3dReport = results[8] as Map<String, dynamic>;
      final paymentMethods = results[9] as List<Map<String, dynamic>>;
      final syncStats = results[10] as Map<String, dynamic>;
      final expensesRows = results[11] as List<Map<String, dynamic>>;
      final pairs = results[12] as List<Map<String, dynamic>>;
      final risks = results[13] as List<Map<String, dynamic>>;
      final reorderList = results[14] as List<Map<String, dynamic>>;
      final weatherData = results[15] as Map<String, dynamic>?;

      // WAVE 2: Dependent Data Queries
      List<Map<String, dynamic>> repriceCandidates = [];
      List<Map<String, dynamic>> upsells = [];
      List<Map<String, dynamic>> bundles = [];

      if (topProducts.isNotEmpty) {
        final heroId = topProducts.first['productId']?.toString();
        final depResults = await Future.wait<dynamic>([
          computeSmartRepriceCandidates(
              targetMargin: 0.18,
              maxIncreasePct: 0.2,
              start: start7d,
              end: now,
              limit: 3),
          computeUpsellAddOns(
              forProductId: heroId,
              start: start7d,
              end: now,
              limit: 3,
              addonPriceRatioMax: 0.4),
          computeBundleSuggestions(start: start7d, end: now, limit: 2),
        ]);
        repriceCandidates = depResults[0] as List<Map<String, dynamic>>;
        upsells = depResults[1] as List<Map<String, dynamic>>;
        bundles = depResults[2] as List<Map<String, dynamic>>;
      }

      final List<Map<String, dynamic>> insights = await compute(_analyzeDataInIsolate, {
        'lowStockItems': lowStockItems,
        'deadStock': deadStock,
        'report7d': report7d,
        'topProducts': topProducts,
        'peakHours': peakHours,
        'inactiveCustomers': inactiveCustomers,
        'catTrend': catTrend,
        'prev3dReport': prev3dReport,
        'recent3dReport': recent3dReport,
        'paymentMethods': paymentMethods,
        'syncStats': syncStats,
        'expensesRows': expensesRows,
        'pairs': pairs,
        'risks': risks,
        'reorderList': reorderList,
        'weatherData': weatherData,
        'repriceCandidates': repriceCandidates,
        'upsells': upsells,
        'bundles': bundles,
      });

      return insights;
    } catch (e) {
      if (kDebugMode) debugPrint('Advanced Insight Error: $e');
      return [
        {
          'priority': 0,
          'type': 'INFO',
          'icon': 'lightbulb',
          'short': 'Tips Harian',
          'title': 'Terjadi kendala analisis',
          'message': 'Data penjualan Anda aman. Cobalah buka laporan manual.',
          'action': 'REPORT'
        }
      ];
    }
  }

  Future<String> generateVoiceSummary() async {
    try {
      final now = DateTime.now();
      final start = DateTime(now.year, now.month, now.day);
      final report = await _db.getSalesReport(start: start, end: now);

      final gross = (report['grossSales'] as num?)?.toDouble() ?? 0.0;
      final txns = (report['totalTransactions'] as num?)?.toInt() ?? 0;
      final profit = (report['netProfit'] as num?)?.toDouble() ?? 0.0;

      final fmt = NumberFormat.currency(locale: 'id', symbol: '', decimalDigits: 0);
      
      String text = "Halo bos. Berikut ringkasan harian Anda.";
      
      if (txns == 0) {
        text += " Belum ada transaksi hari ini. Tetap semangat!";
      } else {
        text += " Hari ini ada $txns transaksi dengan total omzet ${fmt.format(gross)} rupiah.";
        if (profit > 0) {
          text += " Perkiraan laba bersih Anda adalah ${fmt.format(profit)} rupiah.";
        }
      }

      final insights = await generateAdvancedInsights();
      if (insights.isNotEmpty) {
        final top = insights.first;
        text += " Tips pintar untuk Anda: ${top['message']}";
      }

      return text;
    } catch (e) {
      return "Maaf bos, saya gagal menganalisis data saat ini.";
    }
  }

  Future<Map<String, dynamic>?> _getWeather(double? lat, double? lng) async {
    if (lat == null || lng == null) return null;
    try {
      final hour = DateTime.now().hour;
      if (hour >= 18 || hour < 6) {
        return {'condition': 'Berawan', 'temp': 26, 'icon': 'cloudy'};
      }
      return {'condition': 'Cerah', 'temp': 31, 'icon': 'sunny'};
    } catch (_) {
      return null;
    }
  }

  static List<Map<String, dynamic>> _analyzeDataInIsolate(Map<String, dynamic> data) {
    List<Map<String, dynamic>> insights = [];

    final lowStockItems = data['lowStockItems'] as List<Map<String, dynamic>>;
    final deadStock = data['deadStock'] as List<Map<String, dynamic>>;
    final report7d = data['report7d'] as Map<String, dynamic>;
    final topProducts = data['topProducts'] as List<Map<String, dynamic>>;
    final peakHours = data['peakHours'] as List<Map<String, dynamic>>;
    final inactiveCustomers = data['inactiveCustomers'] as List<Map<String, dynamic>>;
    final weatherData = data['weatherData'] as Map<String, dynamic>?;
    final repriceCandidates = data['repriceCandidates'] as List<Map<String, dynamic>>;
    final prev3dReport = data['prev3dReport'] as Map<String, dynamic>;
    final recent3dReport = data['recent3dReport'] as Map<String, dynamic>;

    final totalSales = (report7d['grossSales'] as num?)?.toDouble() ?? 0.0;

    // 1. ANALYZE STOCK
    if (lowStockItems.isNotEmpty) {
      insights.add({
        'priority': 100,
        'type': 'ALERT',
        'icon': 'inventory_2',
        'color': 0xFFE63946,
        'short': 'Stok Kritis',
        'title': 'Restock Segera',
        'message': '${lowStockItems.length} produk hampir habis. Segera belanja agar tidak kehilangan omzet.',
        'action': 'OPEN_STOCK',
        'actionLabel': 'Atur Stok',
        'progress': 0.2,
        'data': lowStockItems.first
      });
    }

    // 2. DEAD STOCK
    if (deadStock.isNotEmpty) {
      final item = deadStock.first;
      insights.add({
        'priority': 80,
        'type': 'TIP',
        'icon': 'percent',
        'color': 0xFFF4A261,
        'short': 'Rekomendasi Promo',
        'title': 'Cuci Gudang',
        'message': '${item['name']} belum terjual 2 minggu. Buat diskon khusus untuk menarik pembeli.',
        'action': 'PROMO',
        'actionLabel': 'Buat Promo',
        'data': item
      });
    }

    // 3. WEATHER CONTEXT
    if (weatherData != null) {
      final condition = weatherData['condition'] as String?;
      if (condition == 'Cerah') {
        insights.add({
          'priority': 90,
          'type': 'TIP',
          'icon': 'wb_sunny',
          'color': 0xFFE9C46A,
          'short': 'Konteks Cuaca',
          'title': 'Cuaca Cerah Hari Ini',
          'message': 'Cuaca mendukung untuk promosi luar ruangan. Tingkatkan stok minuman dingin!',
          'action': 'POS',
          'actionLabel': 'Buka Kasir'
        });
      }
    }

    // 4. SALES PREDICTION
    if (totalSales > 0) {
      final avgDaily = totalSales / 7;
      final predicted = avgDaily * 1.15;
      insights.add({
        'priority': 60,
        'type': 'PREDICTION',
        'icon': 'trending_up',
        'color': 0xFF2A9D8F,
        'short': 'Proyeksi Bisnis',
        'title': 'Target Besok',
        'message': 'Potensi omzet besok mencapai ${NumberFormat.simpleCurrency(locale: 'id', decimalDigits: 0).format(predicted)}. Siapkan stok populer!',
        'action': 'REPORT',
        'actionLabel': 'Lihat Laporan',
        'progress': 0.75,
      });
    }

    // 5. CHURN PREVENTION
    if (inactiveCustomers.isNotEmpty) {
      insights.add({
        'priority': 72,
        'type': 'ALERT',
        'icon': 'person_off',
        'color': 0xFFE76F51,
        'short': 'Pelanggan Pasif',
        'title': 'Cegah Pelanggan Kabur',
        'message': '${inactiveCustomers.length} pelanggan setia tidak berkunjung >14 hari. Berikan promo "Kangen Belanja"!',
        'action': 'PROMO',
        'actionLabel': 'Beri Promo',
      });
    }

    // 6. MONTHLY FORECASTING
    if (totalSales > 0) {
      final monthlyEstimate = totalSales * 4;
      insights.add({
        'priority': 55,
        'type': 'PREDICTION',
        'icon': 'insights',
        'color': 0xFF457B9D,
        'short': 'Estimasi Bulanan',
        'title': 'Target Omzet Bulan Ini',
        'message': 'Omzet Anda diprediksi mencapai ${NumberFormat.simpleCurrency(locale: 'id', decimalDigits: 0).format(monthlyEstimate)}.',
        'action': 'REPORT',
        'actionLabel': 'Detail Laporan',
        'progress': 0.6,
      });
    }

    // TOP PRODUCTS
    if (topProducts.isNotEmpty) {
      final hero = topProducts.first;
      insights.add({
        'priority': 65,
        'type': 'STRATEGY',
        'icon': 'trending_up',
        'color': 0xFF264653,
        'short': 'Produk Andalan',
        'title': 'Andalkan ${hero['name']}',
        'message': '${hero['name']} paling laris minggu ini. Dorong lagi di etalase dan promo!',
        'action': 'REPORT',
        'actionLabel': 'Lihat Detail',
        'data': hero
      });
    }

    // TRENDS
    final prevGross = (prev3dReport['grossSales'] as num?)?.toDouble() ?? 0.0;
    final recentGross = (recent3dReport['grossSales'] as num?)?.toDouble() ?? 0.0;
    if (prevGross > 0 && recentGross < prevGross * 0.7) {
      insights.add({
        'priority': 76,
        'type': 'ALERT',
        'icon': 'trending_down',
        'color': 0xFFEF4444,
        'short': 'Omzet Turun',
        'title': 'Deteksi Penurunan',
        'message': 'Omzet 3 hari terakhir turun tajam dibanding periode sebelumnya.',
        'action': 'PROMO',
        'actionLabel': 'Buat Promo'
      });
    }

    // Final sorting
    insights.sort((a, b) => (b['priority'] as int).compareTo(a['priority'] as int));
    
    if (insights.isEmpty) {
      insights.add({
        'priority': 10,
        'type': 'INFO',
        'icon': 'lightbulb',
        'short': 'Tips Harian',
        'title': 'Semangat!',
        'message': 'Pantau terus performa bisnis Anda.',
        'action': 'REPORT',
        'actionLabel': 'Lihat Laporan'
      });
    }

    return insights;
  }

  Future<Map<String, dynamic>> answerBusinessQuery(String query) async {
    final q = query.toLowerCase();
    final currency = NumberFormat.currency(locale: 'id_ID', symbol: '${MerchantConfig.defaultCurrencySymbol} ', decimalDigits: 0);
    final now = DateTime.now();

    final allProducts = await _db.getAllProducts();
    final start7d = now.subtract(const Duration(days: 7));
    final start30d = now.subtract(const Duration(days: 30));
    
    final sales7d = await _db.getSalesReport(start: start7d, end: now);
    final top7d = await _db.getTopSellingProductsDetailed(limit: 5, start: start7d, end: now);
    
    final lowStock = allProducts.where((p) => (p['stock'] ?? 0) <= MerchantConfig.lowStockWarningThreshold).toList();
    double totalAssetValue = 0;
    for (var p in allProducts) {
      totalAssetValue += ((p['purchasePrice'] ?? 0) * (p['stock'] ?? 0));
    }

    try {
      final contextBundle = {
        'query': query,
        'store_stats': {
          'total_products': allProducts.length,
          'low_stock_count': lowStock.length,
          'asset_value': totalAssetValue,
          'sales_7d': sales7d['grossSales'],
          'profit_7d': sales7d['netProfit'],
          'top_products': top7d.map((p) => {'name': p['name'], 'sold': p['totalQty']}).toList(),
        },
        'timestamp': now.toIso8601String(),
      };

      final response = await _dio.post(
        ApiConfig.aiAgent,
        data: contextBundle,
        options: Options(headers: {'Content-Type': 'application/json'},
          sendTimeout: const Duration(seconds: 5),
          receiveTimeout: const Duration(seconds: 10),
        ),
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        return {
          'answer': response.data['answer'],
          'type': response.data['type'] ?? 'INFO',
          'items': response.data['items'],
          'is_external': true,
        };
      }
    } catch (e) {
      if (kDebugMode) debugPrint('External AI Agent unreachable: $e');
    }

    // FALLBACK LOCAL LOGIC
    if (q.contains('stok') || q.contains('barang')) {
      return {'answer': 'Kondisi stok Anda saat ini memiliki ${lowStock.length} produk kritis.'};
    }
    
    return {'answer': 'Maaf bos, saya sedang mempelajari data Anda lebih lanjut.'};
  }

  Future<Map<String, dynamic>> analyzeCategoryTrends({int days = 14}) async {
    final now = DateTime.now();
    final startCurr = now.subtract(Duration(days: days));
    final endCurr = now;
    final startPrev = now.subtract(Duration(days: days * 2));
    final endPrev = now.subtract(Duration(days: days));
    final results = await Future.wait([
      _db.getSalesByCategory(start: startCurr, end: endCurr),
      _db.getSalesByCategory(start: startPrev, end: endPrev),
    ]);
    final currRows = results[0];
    final prevRows = results[1];
    final currMap = <String, double>{};
    for (final r in currRows) {
      final cat = (r['category'] ?? 'Lainnya').toString();
      final val = (r['totalSales'] as num?)?.toDouble() ?? 0.0;
      currMap[cat] = val;
    }
    final prevMap = <String, double>{};
    for (final r in prevRows) {
      final cat = (r['category'] ?? 'Lainnya').toString();
      final val = (r['totalSales'] as num?)?.toDouble() ?? 0.0;
      prevMap[cat] = val;
    }
    final cats = <String>{...currMap.keys, ...prevMap.keys};
    Map<String, dynamic>? topGrowth;
    Map<String, dynamic>? topDecline;
    for (final c in cats) {
      final curr = currMap[c] ?? 0.0;
      final prev = prevMap[c] ?? 0.0;
      double pct;
      if (prev <= 0 && curr > 0) {
        pct = 100.0;
      } else if (prev > 0 && curr <= 0) {
        pct = -100.0;
      } else if (prev > 0) {
        pct = ((curr - prev) / prev) * 100.0;
      } else {
        pct = 0.0;
      }
      final row = {
        'category': c,
        'growthPct': pct,
        'current': curr,
        'prev': prev
      };
      if (topGrowth == null ||
          (row['growthPct'] as double) > (topGrowth['growthPct'] as double)) {
        topGrowth = row;
      }
      if (topDecline == null ||
          (row['growthPct'] as double) < (topDecline['growthPct'] as double)) {
        topDecline = row;
      }
    }
    return {'topGrowth': topGrowth, 'topDecline': topDecline};
  }

  Future<List<Map<String, dynamic>>> computeSmartRepriceCandidates({
    double targetMargin = 0.18,
    double maxIncreasePct = 0.2,
    DateTime? start,
    DateTime? end,
    int limit = 5,
  }) async {
    final s = start ?? DateTime.now().subtract(const Duration(days: 14));
    final e = end ?? DateTime.now();
    final rows = await _db.getTopSellingProductsDetailed(
        limit: 20, start: s, end: e);
    final out = <Map<String, dynamic>>[];
    for (final r in rows) {
      final margin = (r['profitMargin'] as num?)?.toDouble() ?? 0.0;
      if (margin > 0 && margin < targetMargin) {
        final qty = (r['totalQty'] as num?)?.toInt() ?? 0;
        final rev = (r['totalRevenue'] as num?)?.toDouble() ?? 0.0;
        final prof = (r['totalProfit'] as num?)?.toDouble() ?? 0.0;
        if (qty <= 0) continue;
        final avgCost = (rev - prof) / qty;
        final currPrice = (r['sellingPrice'] as num?)?.toDouble() ?? (rev / qty);
        final targetPrice = avgCost / (1 - targetMargin);
        double suggested = math.max(currPrice, targetPrice);
        final cap = currPrice * (1 + maxIncreasePct);
        if (suggested > cap) suggested = cap;
        suggested = _roundSmartPrice(suggested);
        out.add({
          'productId': r['productId'],
          'name': r['name'],
          'currentPrice': currPrice,
          'suggestedPrice': suggested,
          'marginNow': margin,
          'marginTarget': targetMargin,
          'deltaPct':
              currPrice > 0 ? ((suggested - currPrice) / currPrice) * 100 : 0.0
        });
      }
    }
    out.sort((a, b) => ((b['deltaPct'] as num?)?.toDouble() ?? 0.0)
        .compareTo(((a['deltaPct'] as num?)?.toDouble() ?? 0.0)));
    return out.take(limit).toList();
  }

  double _roundSmartPrice(double price) {
    if (price <= 0) return 0.0;
    if (price < 10000) {
      final step = 500.0;
      return (price / step).round() * step;
    } else {
      final step = 1000.0;
      return (price / step).round() * step;
    }
  }

  Future<List<Map<String, dynamic>>> computeUpsellAddOns({
    required String? forProductId,
    required DateTime start,
    required DateTime end,
    required int limit,
    required double addonPriceRatioMax,
  }) async {
    final pairs = await _db.getFrequentlyBoughtTogether(
        start: start, end: end, limit: 50);
    final out = <Map<String, dynamic>>[];
    for (final p in pairs) {
      bool isPrimaryA =
          forProductId == null || p['productIdA'].toString() == forProductId;
      bool isPrimaryB =
          forProductId == null || p['productIdB'].toString() == forProductId;

      if (isPrimaryA || isPrimaryB) {
        final primaryName = isPrimaryA ? p['nameA'] : p['nameB'];
        final addonName = isPrimaryA ? p['nameB'] : p['nameA'];
        final primaryPrice =
            (isPrimaryA ? p['priceA'] : p['priceB'] as num).toDouble();
        final addonPrice =
            (isPrimaryA ? p['priceB'] : p['priceA'] as num).toDouble();

        if (addonPrice <= primaryPrice * addonPriceRatioMax) {
          out.add({
            'primaryName': primaryName,
            'addonName': addonName,
            'addonPrice': addonPrice,
            'pairCount': p['pairCount'],
          });
        }
      }
    }
    out.sort((a, b) =>
        (b['pairCount'] as int).compareTo(a['pairCount'] as int));
    return out.take(limit).toList();
  }

  Future<List<Map<String, dynamic>>> computeBundleSuggestions({
    double targetMargin = 0.18,
    double maxDiscountPct = 0.3,
    DateTime? start,
    DateTime? end,
    int limit = 5,
  }) async {
    final s = start ?? DateTime.now().subtract(const Duration(days: 14));
    final e = end ?? DateTime.now();
    final pairs =
        await _db.getFrequentlyBoughtTogether(start: s, end: e, limit: 20);
    final out = <Map<String, dynamic>>[];
    for (final p in pairs) {
      final priceA = (p['priceA'] as num?)?.toDouble() ?? 0.0;
      final costA = (p['costA'] as num?)?.toDouble() ?? 0.0;
      final priceB = (p['priceB'] as num?)?.toDouble() ?? 0.0;
      final costB = (p['costB'] as num?)?.toDouble() ?? 0.0;
      final stockA = (p['stockA'] as num?)?.toInt() ?? 0;
      final stockB = (p['stockB'] as num?)?.toInt() ?? 0;
      if (stockA <= 0 || stockB <= 0) continue;
      final comboPrice = priceA + priceB;
      final comboCost = costA + costB;
      if (comboPrice <= 0 || comboCost <= 0 || comboCost >= comboPrice) continue;
      final targetPrice = comboCost / (1 - targetMargin);
      double suggested = math.min(comboPrice, targetPrice);
      final minAllowed = comboPrice * (1 - maxDiscountPct);
      if (suggested < minAllowed) suggested = minAllowed;
      suggested = _roundSmartPrice(suggested);
      final discountPct =
          comboPrice > 0 ? ((comboPrice - suggested) / comboPrice) * 100.0 : 0.0;
      out.add({
        'productIdA': p['productIdA'],
        'productIdB': p['productIdB'],
        'nameA': p['nameA'],
        'nameB': p['nameB'],
        'stockA': stockA,
        'stockB': stockB,
        'suggestedBundlePrice': suggested,
        'discountPct': discountPct,
        'targetMargin': targetMargin,
        'originalComboPrice': comboPrice
      });
    }
    out.sort((a, b) => ((b['discountPct'] as num?)?.toDouble() ?? 0.0)
        .compareTo(((a['discountPct'] as num?)?.toDouble() ?? 0.0)));
    return out.take(limit).toList();
  }

  Future<List<Map<String, dynamic>>> computeStockoutRisks({int limit = 10}) async {
    final all = await _db.getAllProducts();
    final now = DateTime.now();
    final start = now.subtract(const Duration(days: 14));
    final out = <Map<String, dynamic>>[];
    for (final p in all) {
      final stock = (p['stock'] as num?)?.toDouble() ?? 0.0;
      if (stock <= 0) continue;
      final sales = await _db.getTopSellingProductsDetailed(
          limit: 1, start: start, end: now);
      final match = sales.firstWhere(
          (s) => s['productId'].toString() == p['id'].toString(),
          orElse: () => {});
      if (match.isNotEmpty) {
        final dailyVel = (match['totalQty'] as num).toDouble() / 14.0;
        if (dailyVel > 0) {
          final daysCover = stock / dailyVel;
          if (daysCover <= 5) {
            out.add({
              'productId': p['id'],
              'name': p['name'],
              'stock': stock,
              'dailyVelocity': dailyVel,
              'daysCover': daysCover
            });
          }
        }
      }
    }
    out.sort((a, b) =>
        (a['daysCover'] as double).compareTo(b['daysCover'] as double));
    return out.take(limit).toList();
  }

  Future<List<Map<String, dynamic>>> computeReorderSchedule({
    int leadTimeDays = 3,
    int safetyDays = 2,
    int limit = 10,
  }) async {
    final risks = await computeStockoutRisks(limit: 50);
    final out = <Map<String, dynamic>>[];
    final threshold = leadTimeDays + safetyDays;
    for (final r in risks) {
      final days = r['daysCover'] as double;
      if (days <= threshold) {
        out.add({
          ...r,
          'reorderUrgency': (threshold - days) / threshold,
          'daysUntilThreshold': days - leadTimeDays
        });
      }
    }
    out.sort((a, b) => (b['reorderUrgency'] as double)
        .compareTo(a['reorderUrgency'] as double));
    return out.take(limit).toList();
  }

  Future<List<Map<String, dynamic>>> computeRestockPlan({
    int horizonDays = 7,
    double safety = 0.2,
  }) async {
    final risks = await computeStockoutRisks(limit: 50);
    final out = <Map<String, dynamic>>[];
    for (final r in risks) {
      final vel = r['dailyVelocity'] as double;
      final stock = r['stock'] as double;
      final needed = (vel * horizonDays * (1 + safety)) - stock;
      if (needed > 0) {
        out.add({
          'productId': r['productId'],
          'name': r['name'],
          'suggestedQty': needed.ceil(),
          'velocity': vel
        });
      }
    }
    return out;
  }

  Future<Map<String, dynamic>> computeRfmSegments({
    DateTime? start,
    DateTime? end,
  }) async {
    final s = start ?? DateTime.now().subtract(const Duration(days: 30));
    final e = end ?? DateTime.now();
    final customers = await _db.getCustomers();
    final segments = <String, List<Map<String, dynamic>>>{
      'Champion': [],
      'Loyal': [],
      'AtRisk': [],
      'AboutToSleep': [],
      'New': [],
    };

    final futures = customers.map((c) async {
      final cid = c['id'].toString();
      final stats = await _db.getCustomerStats(cid, start: s, end: e);
      final recency = (stats['daysSinceLastVisit'] as num?)?.toInt() ?? 999;
      final frequency = (stats['totalTransactions'] as num?)?.toInt() ?? 0;
      final monetary = (stats['totalSpent'] as num?)?.toDouble() ?? 0.0;

      String seg = 'New';
      if (recency <= 7 && frequency >= 5) seg = 'Champion';
      else if (recency <= 14 && frequency >= 3) seg = 'Loyal';
      else if (recency > 21) seg = 'AtRisk';
      else if (recency > 14) seg = 'AboutToSleep';

      return {'segment': seg, 'data': {...c, 'monetary': monetary, 'lastVisit': stats['lastVisit']}};
    });

    final results = await Future.wait(futures);
    for (final res in results) {
      if (res != null) {
        segments[res['segment'] as String]!.add(res['data'] as Map<String, dynamic>);
      }
    }

    final summary = segments.map((key, value) => MapEntry(key, value.length));
    return {'segments': segments, 'summary': summary};
  }

  Future<List<Map<String, dynamic>>> computeChurnScores({
    int daysInactive = MerchantConfig.dormantCustomerDays,
    DateTime? start,
    DateTime? end,
    int limit = 10,
  }) async {
    final customers = await _db.getCustomers();
    final now = end ?? DateTime.now();

    final futures = customers.map((c) async {
      final cid = c['id'].toString();
      final stats = await _db.getCustomerStats(cid);
      final lastVisit = stats['lastVisit'] as DateTime?;
      if (lastVisit == null) return null;

      final diff = now.difference(lastVisit).inDays;
      if (diff >= daysInactive) {
        return {
          ...c,
          'daysInactive': diff,
          'lastVisit': lastVisit,
          'churnProbability': math.min(1.0, diff / 60.0)
        };
      }
      return null;
    });

    final results = await Future.wait(futures);
    final out = results.whereType<Map<String, dynamic>>().toList();

    out.sort((a, b) => (b['daysInactive'] as int).compareTo(a['daysInactive'] as int));
    return out.take(limit).toList();
  }

  String generateSmartPriceCaption({
    required String name,
    required double originalPrice,
    required double newPrice,
    DateTime? promoEndsAt,
    String? category,
  }) {
    final fmt = NumberFormat.simpleCurrency(locale: 'id', decimalDigits: 0);
    final diff =
        ((originalPrice - newPrice) / originalPrice * 100).toStringAsFixed(0);
    String text =
        "🔥 PROMO FLASH SALE: $name 🔥\n\nHanya hari ini! Dapatkan $name seharga ${fmt.format(newPrice)} (Hemat $diff% dari harga normal ${fmt.format(originalPrice)}).";

    if (promoEndsAt != null) {
      final dateStr = DateFormat('d MMM yyyy, HH:mm').format(promoEndsAt);
      text += "\n\nPromo berakhir pada: $dateStr WIB";
    }

    text += "\n\nBuruan beli sebelum kehabisan! 🚀";
    return text;
  }

  String generateBundleCaption({
    required String nameA,
    required String nameB,
    required double originalComboPrice,
    required double bundlePrice,
    double? discountPct,
  }) {
    final fmt = NumberFormat.simpleCurrency(locale: 'id', decimalDigits: 0);
    final disc = discountPct ??
        ((originalComboPrice - bundlePrice) / originalComboPrice * 100.0);
    return "🎁 PAKET HEMAT: $nameA + $nameB 🎁\n\nBeli paket ini cuma ${fmt.format(bundlePrice)}! Anda hemat ${disc.toStringAsFixed(0)}% dibanding beli satuan (${fmt.format(originalComboPrice)}).\n\nStok terbatas, sikat sekarang! ✨";
  }

  String generateUpsellCaption({
    required String primaryName,
    required String addonName,
    required double addonPrice,
  }) {
    final fmt = NumberFormat.simpleCurrency(locale: 'id', decimalDigits: 0);
    return "💡 REKOMENDASI: Tambah $addonName? 💡\n\nCuma nambah ${fmt.format(addonPrice)} saja kalau beli bareng $primaryName. Lebih untung dan pas banget buat nemenin belanjaan Bos! 🚀";
  }

  Future<List<Map<String, dynamic>>> generateActionRecommendations({
    DateTime? periodStart,
    DateTime? periodEnd,
  }) async {
    final s = periodStart ?? DateTime.now().subtract(const Duration(days: 7));
    final e = periodEnd ?? DateTime.now();
    
    final lowStock = await _db.getLowStockProducts(threshold: MerchantConfig.lowStockWarningThreshold);
    final deadStock = await _db.getUnsoldProducts(limit: 5, minStock: MerchantConfig.lowStockWarningThreshold, start: s);
    final reprice = await computeSmartRepriceCandidates(start: s, end: e, limit: 3);
    final churn = await computeChurnScores(daysInactive: MerchantConfig.dormantCustomerDays, limit: 3);

    final actions = <Map<String, dynamic>>[];

    if (lowStock.isNotEmpty) {
      actions.add({
        'priority': 100,
        'label': 'Restock produk menipis',
        'desc': '${lowStock.length} produk hampir habis',
        'action': 'OPEN_STOCK_OPNAME',
        'payload': {'first': lowStock.first}
      });
    }

    if (deadStock.isNotEmpty) {
      actions.add({
        'priority': 85,
        'label': 'Cuci gudang barang macet',
        'desc': '${deadStock.length} produk tidak laku 14 hari',
        'action': 'CREATE_FLASH_SALE',
        'payload': {'products': deadStock}
      });
    }

    for (var r in reprice) {
      actions.add({
        'priority': 75,
        'label': 'Update harga ${r['name']}',
        'desc': 'Target margin ${ (r['marginTarget'] * 100).toStringAsFixed(0)}%',
        'action': 'SMART_REPRICE',
        'payload': r
      });
    }

    if (churn.isNotEmpty) {
      actions.add({
        'priority': 90,
        'label': 'Panggil pelanggan setia',
        'desc': '${churn.length} orang sudah lama tidak belanja',
        'action': 'OPEN_PROMO_HUB',
        'payload': {'churn': churn}
      });
    }

    actions.sort((a, b) => (b['priority'] as int).compareTo(a['priority'] as int));
    return actions;
  }
}
