import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:geolocator/geolocator.dart';
import 'package:rana_sales/data/api_service.dart';
import 'package:rana_sales/screens/visit_order_screen.dart';

class VisitsScreen extends StatefulWidget {
  const VisitsScreen({super.key});

  @override
  State<VisitsScreen> createState() => _VisitsScreenState();
}

class _VisitsScreenState extends State<VisitsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;
  List<dynamic> _todayVisits = [];
  List<dynamic> _allVisits = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 3, vsync: this);
    _loadVisits();
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadVisits() async {
    try {
      setState(() => _isLoading = true);
      final today = DateTime.now().toIso8601String().split('T')[0];
      final results = await Future.wait([
        ApiService().getVisits(dateFrom: today, dateTo: today),
        ApiService().getVisits(),
      ]);
      if (mounted) {
        setState(() {
          _todayVisits = results[0];
          _allVisits = results[1];
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<Position?> _getLocation() async {
    try {
      final perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        final req = await Geolocator.requestPermission();
        if (req == LocationPermission.denied || req == LocationPermission.deniedForever) return null;
      }
      return await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
    } catch (_) {
      return null;
    }
  }

  Future<void> _checkIn(String visitId) async {
    final pos = await _getLocation();
    try {
      await ApiService().checkIn(visitId, pos?.latitude ?? 0, pos?.longitude ?? 0);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Check-in berhasil!'), backgroundColor: Colors.green));
      _loadVisits();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gagal: $e'), backgroundColor: Colors.red));
    }
  }

  Future<void> _checkOut(String visitId) async {
    final feedbackCtrl = TextEditingController();
    bool orderCreated = false;
    double orderAmount = 0;

    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: Text('Check-Out', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: feedbackCtrl, decoration: const InputDecoration(labelText: 'Hasil kunjungan', hintText: 'Catatan...'), maxLines: 3),
              const SizedBox(height: 12),
              SwitchListTile(
                title: const Text('Ada order dibuat?', style: TextStyle(fontSize: 14)),
                value: orderCreated,
                onChanged: (v) => setDialogState(() => orderCreated = v),
                contentPadding: EdgeInsets.zero,
              ),
              if (orderCreated)
                TextField(
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Nilai order (Rp)', prefixText: 'Rp '),
                  onChanged: (v) => orderAmount = double.tryParse(v) ?? 0,
                ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Check-Out')),
          ],
        ),
      ),
    );

    if (result != true) return;
    try {
      await ApiService().checkOut(visitId, feedback: feedbackCtrl.text, orderCreated: orderCreated, orderAmount: orderAmount);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Check-out berhasil!'), backgroundColor: Colors.green));
      _loadVisits();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gagal: $e'), backgroundColor: Colors.red));
    }
  }

  Future<void> _createVisit() async {
    final nameCtrl = TextEditingController();
    final objectiveCtrl = TextEditingController(text: 'Regular Visit');

    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Buat Kunjungan', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Nama Merchant')),
            const SizedBox(height: 12),
            TextField(controller: objectiveCtrl, decoration: const InputDecoration(labelText: 'Tujuan')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Buat')),
        ],
      ),
    );

    if (result != true || nameCtrl.text.isEmpty) return;
    try {
      await ApiService().createVisit({
        'merchantName': nameCtrl.text,
        'date': DateTime.now().toIso8601String().split('T')[0],
        'objective': objectiveCtrl.text,
      });
      _loadVisits();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gagal: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final planned = _todayVisits.where((v) => v['status'] == 'PLANNED').toList();
    final inProgress = _todayVisits.where((v) => v['status'] == 'IN_PROGRESS').toList();
    final completed = _todayVisits.where((v) => v['status'] == 'COMPLETED').toList();

    return Scaffold(
      appBar: AppBar(
        title: Text('Kunjungan', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        actions: [IconButton(icon: const Icon(Icons.refresh), onPressed: _loadVisits)],
        bottom: TabBar(
          controller: _tabCtrl,
          tabs: [
            Tab(text: 'Hari Ini (${_todayVisits.length})'),
            const Tab(text: 'Riwayat'),
            const Tab(text: 'Semua'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabCtrl,
              children: [
                // Today
                RefreshIndicator(
                  onRefresh: _loadVisits,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      if (inProgress.isNotEmpty) ...[
                        _buildSectionLabel('SEDANG BERLANGSUNG', Colors.green),
                        ...inProgress.map((v) => _buildVisitCard(v)),
                        const SizedBox(height: 16),
                      ],
                      if (planned.isNotEmpty) ...[
                        _buildSectionLabel('DIRENCANAKAN', Colors.amber),
                        ...planned.map((v) => _buildVisitCard(v)),
                        const SizedBox(height: 16),
                      ],
                      if (completed.isNotEmpty) ...[
                        _buildSectionLabel('SELESAI', Colors.grey),
                        ...completed.map((v) => _buildVisitCard(v)),
                      ],
                      if (_todayVisits.isEmpty)
                        Center(
                          child: Padding(
                            padding: const EdgeInsets.all(40),
                            child: Column(
                              children: [
                                Icon(Icons.map_outlined, size: 60, color: Colors.grey.shade300),
                                const SizedBox(height: 12),
                                Text('Belum ada kunjungan hari ini', style: TextStyle(color: Colors.grey.shade500)),
                              ],
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                // Completed history
                _buildVisitList(_allVisits.where((v) => v['status'] == 'COMPLETED').toList()),
                // All
                _buildVisitList(_allVisits),
              ],
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _createVisit,
        icon: const Icon(Icons.add),
        label: const Text('Kunjungan Baru'),
      ),
    );
  }

  Widget _buildSectionLabel(String text, Color color) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
          const SizedBox(width: 8),
          Text(text, style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: color, letterSpacing: 1)),
        ],
      ),
    );
  }

  Widget _buildVisitCard(dynamic visit) {
    final status = visit['status'] ?? 'PLANNED';
    final isActive = status == 'IN_PROGRESS';
    final isPlanned = status == 'PLANNED';
    final isDone = status == 'COMPLETED';

    Color statusColor = isActive ? Colors.green : isPlanned ? Colors.amber : Colors.grey;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: statusColor.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(visit['merchantName'] ?? '', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 15)),
                    Text(visit['objective'] ?? '', style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(color: statusColor.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
                child: Text(status, style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          if (isDone && visit['orderCreated'] == true) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(Icons.check_circle, color: Colors.green.shade600, size: 14),
                const SizedBox(width: 4),
                Text('Order: Rp ${(visit['orderAmount'] ?? 0).toString()}', style: TextStyle(color: Colors.green.shade700, fontSize: 12, fontWeight: FontWeight.w600)),
              ],
            ),
          ],
          if (visit['feedback'] != null && (visit['feedback'] as String).isNotEmpty) ...[
            const SizedBox(height: 4),
            Text('📝 ${visit['feedback']}', style: TextStyle(color: Colors.grey.shade600, fontSize: 11, fontStyle: FontStyle.italic)),
          ],
          const SizedBox(height: 12),
          // Actions
          if (isPlanned)
            Row(
              children: [
                Expanded(
                  child: FilledButton.icon(
                    onPressed: () => _checkIn(visit['id']),
                    icon: const Icon(Icons.login, size: 16),
                    label: const Text('Check-In'),
                    style: FilledButton.styleFrom(backgroundColor: Colors.teal),
                  ),
                ),
                const SizedBox(width: 8),
                OutlinedButton(
                  onPressed: () async {
                    await ApiService().cancelVisit(visit['id'], 'Dibatalkan');
                    _loadVisits();
                  },
                  child: const Text('Batal', style: TextStyle(fontSize: 12)),
                ),
              ],
            ),
          if (isActive)
            Row(
              children: [
                Expanded(
                  child: FilledButton.icon(
                    onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => VisitOrderScreen(visit: visit))).then((_) => _loadVisits()),
                    icon: const Icon(Icons.shopping_cart, size: 16),
                    label: const Text('Buat Order'),
                    style: FilledButton.styleFrom(backgroundColor: Colors.indigo),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _checkOut(visit['id']),
                    icon: const Icon(Icons.logout, size: 16),
                    label: const Text('Check-Out'),
                  ),
                ),
              ],
            ),
        ],
      ),
    ).animate().fadeIn();
  }

  Widget _buildVisitList(List<dynamic> visits) {
    if (visits.isEmpty) {
      return Center(child: Text('Belum ada data', style: TextStyle(color: Colors.grey.shade500)));
    }
    return RefreshIndicator(
      onRefresh: _loadVisits,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: visits.length,
        itemBuilder: (ctx, i) => _buildVisitCard(visits[i]),
      ),
    );
  }
}
