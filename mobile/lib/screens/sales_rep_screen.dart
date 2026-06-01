import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:rana_merchant/data/remote/api_service.dart';
import 'package:url_launcher/url_launcher.dart';

/// Screen showing the assigned distributor sales rep info for this merchant
class SalesRepScreen extends StatefulWidget {
  const SalesRepScreen({super.key});

  @override
  State<SalesRepScreen> createState() => _SalesRepScreenState();
}

class _SalesRepScreenState extends State<SalesRepScreen> {
  Map<String, dynamic>? _data;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      setState(() { _isLoading = true; _error = null; });
      final response = await ApiService().dio.get(
        '/distributor/sales/rep-info-me',
        options: ApiService().authOptions,
      );
      if (response.data['status'] == 'success') {
        setState(() { _data = response.data['data']; _isLoading = false; });
      } else {
        setState(() { _error = 'Gagal memuat data'; _isLoading = false; });
      }
    } catch (e) {
      setState(() { _error = 'Belum terhubung dengan distributor'; _isLoading = false; });
    }
  }

  Future<void> _callSalesRep(String? email) async {
    if (email == null) return;
    final uri = Uri(scheme: 'mailto', path: email);
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: colorScheme.surface,
      appBar: AppBar(
        title: Text('Sales Rep Saya', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _buildEmptyState()
              : _data == null
                  ? _buildEmptyState()
                  : RefreshIndicator(
                      onRefresh: _loadData,
                      child: ListView(
                        padding: const EdgeInsets.all(16),
                        children: [
                          _buildDistributorCard(),
                          const SizedBox(height: 16),
                          if (_data!['salesRep'] != null) _buildSalesRepCard(),
                          if (_data!['salesRep'] == null) _buildNoSalesRep(),
                          const SizedBox(height: 16),
                          _buildStatsCard(),
                          if (_data!['routePlan'] != null) ...[
                            const SizedBox(height: 16),
                            _buildRoutePlanCard(),
                          ],
                        ],
                      ),
                    ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.people_outline, size: 80, color: Colors.grey.shade300),
          const SizedBox(height: 16),
          Text('Belum Terhubung', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.grey.shade600)),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 40),
            child: Text(
              'Anda belum terdaftar sebagai mitra distributor. Hubungi distributor untuk bergabung.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey.shade500, fontSize: 14),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDistributorCard() {
    final distributor = _data!['distributor'] as Map<String, dynamic>?;
    if (distributor == null) return const SizedBox();

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: [Colors.teal.shade600, Colors.teal.shade400]),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(12)),
                child: const Icon(Icons.business, color: Colors.white, size: 24),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Distributor Anda', style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 12)),
                    Text(distributor['name'] ?? 'Unknown', style: GoogleFonts.outfit(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _buildStatChip('Credit Limit', 'Rp ${_formatNumber(_data!['creditLimit'] ?? 0)}', Icons.credit_card),
              const SizedBox(width: 12),
              _buildStatChip('Digunakan', 'Rp ${_formatNumber(_data!['creditUsed'] ?? 0)}', Icons.money_off),
            ],
          ),
        ],
      ),
    ).animate().fadeIn().slideY(begin: 0.1);
  }

  Widget _buildStatChip(String label, String value, IconData icon) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(color: Colors.white.withOpacity(0.15), borderRadius: BorderRadius.circular(10)),
        child: Row(
          children: [
            Icon(icon, color: Colors.white.withOpacity(0.8), size: 16),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 10)),
                Text(value, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSalesRepCard() {
    final rep = _data!['salesRep'] as Map<String, dynamic>;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.teal.withOpacity(0.2)),
        boxShadow: [BoxShadow(color: Colors.teal.withOpacity(0.05), blurRadius: 12, offset: const Offset(0, 4))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Sales Representative', style: GoogleFonts.outfit(fontSize: 13, color: Colors.grey.shade600, fontWeight: FontWeight.w500)),
          const SizedBox(height: 12),
          Row(
            children: [
              CircleAvatar(
                radius: 28,
                backgroundColor: Colors.teal.shade100,
                child: Text(
                  (rep['name'] ?? 'S').substring(0, 2).toUpperCase(),
                  style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.teal.shade700),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(rep['name'] ?? 'Unknown', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold)),
                    Text(rep['email'] ?? '', style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                    if (rep['lastVisit'] != null)
                      Text('Kunjungan terakhir: ${rep['lastVisit']}', style: TextStyle(color: Colors.grey.shade500, fontSize: 11)),
                  ],
                ),
              ),
              IconButton(
                onPressed: () => _callSalesRep(rep['email']),
                icon: Icon(Icons.email_outlined, color: Colors.teal.shade600),
              ),
            ],
          ),
        ],
      ),
    ).animate().fadeIn(delay: 100.ms).slideY(begin: 0.1);
  }

  Widget _buildNoSalesRep() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        children: [
          Icon(Icons.person_search, size: 40, color: Colors.grey.shade400),
          const SizedBox(height: 8),
          Text('Belum ada sales rep ditugaskan', style: TextStyle(color: Colors.grey.shade600, fontSize: 14)),
          Text('Distributor akan menugaskan sales rep untuk toko Anda', style: TextStyle(color: Colors.grey.shade400, fontSize: 12)),
        ],
      ),
    ).animate().fadeIn(delay: 100.ms);
  }

  Widget _buildStatsCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        children: [
          _buildInfoTile('Total Kunjungan', '${_data!['totalVisits'] ?? 0}', Icons.map_outlined, Colors.indigo),
          Container(width: 1, height: 40, color: Colors.grey.shade200),
          _buildInfoTile('Kunjungan Terakhir', _data!['lastVisitDate'] ?? '-', Icons.calendar_today, Colors.orange),
        ],
      ),
    ).animate().fadeIn(delay: 200.ms);
  }

  Widget _buildInfoTile(String label, String value, IconData icon, Color color) {
    return Expanded(
      child: Column(
        children: [
          Icon(icon, color: color, size: 22),
          const SizedBox(height: 6),
          Text(value, style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.bold)),
          Text(label, style: TextStyle(color: Colors.grey.shade500, fontSize: 10)),
        ],
      ),
    );
  }

  Widget _buildRoutePlanCard() {
    final route = _data!['routePlan'] as Map<String, dynamic>;
    final dayLabels = {
      'MONDAY': 'Senin', 'TUESDAY': 'Selasa', 'WEDNESDAY': 'Rabu',
      'THURSDAY': 'Kamis', 'FRIDAY': 'Jumat', 'SATURDAY': 'Sabtu', 'SUNDAY': 'Minggu'
    };

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.indigo.shade50,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.indigo.shade100),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: Colors.indigo.shade100, borderRadius: BorderRadius.circular(10)),
            child: Icon(Icons.route, color: Colors.indigo.shade700, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Jadwal Kunjungan', style: GoogleFonts.outfit(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.indigo.shade800)),
                Text('${route['name']} · Setiap ${dayLabels[route['day']] ?? route['day']}', style: TextStyle(color: Colors.indigo.shade600, fontSize: 12)),
              ],
            ),
          ),
        ],
      ),
    ).animate().fadeIn(delay: 300.ms);
  }

  String _formatNumber(num value) {
    if (value >= 1000000) return '${(value / 1000000).toStringAsFixed(1)}Jt';
    if (value >= 1000) return '${(value / 1000).toStringAsFixed(0)}Rb';
    return value.toString();
  }
}
