import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';
import 'package:rana_market/config/theme_config.dart';
import 'package:rana_market/data/market_api_service.dart';

class RideHistoryScreen extends StatefulWidget {
  const RideHistoryScreen({super.key});

  @override
  State<RideHistoryScreen> createState() => _RideHistoryScreenState();
}

class _RideHistoryScreenState extends State<RideHistoryScreen> {
  List<dynamic> _rides = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadRides();
  }

  Future<void> _loadRides() async {
    setState(() => _isLoading = true);
    final rides = await MarketApiService().getRideHistory();
    if (mounted) {
      setState(() {
        _rides = rides;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ThemeConfig.beigeBackground,
      appBar: AppBar(
        title: Text('Riwayat Perjalanan',
            style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: ThemeConfig.brandColor)),
        backgroundColor: ThemeConfig.beigeBackground,
        elevation: 0,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _rides.isEmpty
              ? _buildEmpty()
              : RefreshIndicator(
                  onRefresh: _loadRides,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _rides.length,
                    itemBuilder: (context, index) {
                      final ride = Map<String, dynamic>.from(_rides[index]);
                      return _buildRideCard(ride, index);
                    },
                  ),
                ),
    );
  }

  Widget _buildEmpty() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.directions_bike_rounded, size: 72, color: Colors.grey.shade300),
          const SizedBox(height: 16),
          Text('Belum ada riwayat perjalanan', style: TextStyle(color: Colors.grey.shade500, fontSize: 16)),
        ],
      ),
    );
  }

  Widget _buildRideCard(Map<String, dynamic> ride, int index) {
    final type = ride['type'] ?? 'RIDE';
    final status = ride['status'] ?? 'COMPLETED';
    final origin = ride['originAddress'] ?? '-';
    final dest = ride['destAddress'] ?? '-';
    final price = (ride['price'] as num?)?.toDouble() ?? 0;
    final driver = ride['driver'];
    final driverName = driver?['name'] ?? '-';
    final driverPlate = driver?['vehiclePlate'] ?? '-';
    final createdAt = ride['createdAt'];

    String dateStr = '';
    if (createdAt != null) {
      try {
        final dt = DateTime.parse(createdAt.toString()).toLocal();
        dateStr = DateFormat('dd MMM yyyy, HH:mm').format(dt);
      } catch (_) {}
    }

    Color statusColor;
    String statusText;
    switch (status) {
      case 'COMPLETED':
        statusColor = Colors.green;
        statusText = 'Selesai';
        break;
      case 'CANCELLED':
        statusColor = Colors.red;
        statusText = 'Dibatalkan';
        break;
      default:
        statusColor = Colors.orange;
        statusText = status;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header: type + status + date
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: (type == 'SEND' ? Colors.orange : Colors.blue).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  type == 'SEND' ? Icons.local_shipping_rounded : Icons.directions_bike_rounded,
                  color: type == 'SEND' ? Colors.orange : Colors.blue,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(type == 'SEND' ? 'RanaSend' : 'RanaRide',
                        style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
                    Text(dateStr, style: TextStyle(color: Colors.grey.shade500, fontSize: 12)),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(statusText,
                    style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 11)),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Route
          Row(
            children: [
              const Icon(Icons.radio_button_checked, color: Colors.green, size: 14),
              const SizedBox(width: 8),
              Expanded(child: Text(origin, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13))),
            ],
          ),
          Padding(
            padding: const EdgeInsets.only(left: 6),
            child: Container(width: 2, height: 16, color: Colors.grey.shade300),
          ),
          Row(
            children: [
              const Icon(Icons.location_on, color: Colors.red, size: 14),
              const SizedBox(width: 8),
              Expanded(child: Text(dest, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13))),
            ],
          ),
          const Divider(height: 24),

          // Driver + Price
          Row(
            children: [
              Icon(Icons.person_rounded, color: Colors.grey.shade400, size: 18),
              const SizedBox(width: 8),
              Text('$driverName • $driverPlate', style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
              const Spacer(),
              Text('Rp${ThemeConfig.formatCurrency(price)}',
                  style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16, color: ThemeConfig.brandColor)),
            ],
          ),
        ],
      ),
    ).animate().fadeIn(delay: (50 * index).ms);
  }
}
