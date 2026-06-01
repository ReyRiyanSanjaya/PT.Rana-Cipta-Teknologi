import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:rana_sales/data/api_service.dart';

class RoutePlanScreen extends StatefulWidget {
  const RoutePlanScreen({super.key});

  @override
  State<RoutePlanScreen> createState() => _RoutePlanScreenState();
}

class _RoutePlanScreenState extends State<RoutePlanScreen> with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;
  List<dynamic> _plans = [];
  List<dynamic> _waitlist = [];
  bool _isLoading = true;
  bool _isGenerating = false;

  static const _dayLabels = {
    'MONDAY': 'Senin', 'TUESDAY': 'Selasa', 'WEDNESDAY': 'Rabu',
    'THURSDAY': 'Kamis', 'FRIDAY': 'Jumat', 'SATURDAY': 'Sabtu', 'SUNDAY': 'Minggu',
  };
  static const _dayOrder = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 2, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    try {
      setState(() => _isLoading = true);
      final results = await Future.wait([
        ApiService().getRoutePlans(),
        ApiService().getWaitlist(),
      ]);
      if (mounted) setState(() { _plans = results[0]; _waitlist = results[1]; _isLoading = false; });
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _generatePlan() async {
    // Show config dialog
    int frequency = 1;
    int maxPerDay = 8;
    int satMax = 4;

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: Text('Generate Route Plan', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('AI akan membuat jadwal kunjungan berdasarkan:', style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
              const SizedBox(height: 8),
              Text('• Territory yang di-assign ke Anda', style: TextStyle(fontSize: 12, color: Colors.grey.shade700)),
              Text('• Jarak antar merchant (proximity)', style: TextStyle(fontSize: 12, color: Colors.grey.shade700)),
              Text('• Merchant yang lama tidak dikunjungi diprioritaskan', style: TextStyle(fontSize: 12, color: Colors.grey.shade700)),
              const SizedBox(height: 16),
              Text('Frekuensi Kunjungan / Bulan', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
              Slider(
                value: frequency.toDouble(),
                min: 1, max: 4, divisions: 3,
                label: '${frequency}x/bulan',
                onChanged: (v) => setDialogState(() => frequency = v.round()),
              ),
              Text('Max Kunjungan / Hari (Senin-Jumat)', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
              Slider(
                value: maxPerDay.toDouble(),
                min: 4, max: 12, divisions: 8,
                label: '$maxPerDay merchant',
                onChanged: (v) => setDialogState(() => maxPerDay = v.round()),
              ),
              Text('Max Kunjungan Sabtu (setengah hari)', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
              Slider(
                value: satMax.toDouble(),
                min: 2, max: 6, divisions: 4,
                label: '$satMax merchant',
                onChanged: (v) => setDialogState(() => satMax = v.round()),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
            FilledButton.icon(
              onPressed: () => Navigator.pop(ctx, true),
              icon: const Icon(Icons.auto_awesome, size: 16),
              label: const Text('Generate'),
            ),
          ],
        ),
      ),
    );

    if (confirm != true) return;

    setState(() => _isGenerating = true);
    try {
      final result = await ApiService().generateRoutePlan(
        visitFrequency: frequency,
        maxVisitsPerDay: maxPerDay,
        saturdayMax: satMax,
      );
      if (mounted) {
        final scheduled = result['scheduled'] ?? 0;
        final waitlistCount = result['waitlistCount'] ?? 0;
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('✅ Route plan dibuat! $scheduled merchant dijadwalkan, $waitlistCount di waitlist'),
          backgroundColor: Colors.green,
        ));
        _loadData();
      }
    } catch (e) {
      if (mounted) {
        String msg = e.toString();
        if (msg.contains('territory')) msg = 'Anda belum di-assign territory. Hubungi SPV.';
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg), backgroundColor: Colors.red));
      }
    } finally {
      if (mounted) setState(() => _isGenerating = false);
    }
  }

  String _getTodayDay() {
    final weekday = DateTime.now().weekday;
    return _dayOrder[weekday - 1 < _dayOrder.length ? weekday - 1 : 0];
  }

  @override
  Widget build(BuildContext context) {
    final today = _getTodayDay();
    final byDay = <String, List<dynamic>>{};
    for (final plan in _plans) {
      final day = plan['dayOfWeek'] ?? 'MONDAY';
      byDay.putIfAbsent(day, () => []).add(plan);
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('Route Plan', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loadData),
        ],
        bottom: TabBar(
          controller: _tabCtrl,
          tabs: [
            Tab(text: 'Jadwal (${_plans.length})'),
            Tab(text: 'Waitlist (${_waitlist.length})'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabCtrl,
              children: [
                // Tab 1: Route Plans
                _plans.isEmpty
                    ? _buildEmptyState()
                    : RefreshIndicator(
                        onRefresh: _loadData,
                        child: ListView(
                          padding: const EdgeInsets.all(16),
                          children: [
                            // Today highlight
                            if (byDay.containsKey(today)) ...[
                              Container(
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(colors: [Colors.teal.shade50, Colors.teal.shade100.withOpacity(0.5)]),
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(color: Colors.teal.shade200),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Icon(Icons.today, color: Colors.teal.shade700, size: 18),
                                        const SizedBox(width: 8),
                                        Text('Hari Ini - ${_dayLabels[today]}', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: Colors.teal.shade800)),
                                        const Spacer(),
                                        Text('${byDay[today]!.fold<int>(0, (s, p) => s + ((p['merchants'] as List?)?.length ?? 0))} merchant', style: TextStyle(color: Colors.teal.shade600, fontSize: 11)),
                                      ],
                                    ),
                                    const SizedBox(height: 12),
                                    ...byDay[today]!.map((plan) => _buildPlanCard(plan, isToday: true)),
                                  ],
                                ),
                              ).animate().fadeIn(),
                              const SizedBox(height: 24),
                            ],
                            // Other days
                            ..._dayOrder.where((d) => byDay.containsKey(d) && d != today).map((day) => Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(_dayLabels[day] ?? day, style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.grey.shade700)),
                                const SizedBox(height: 8),
                                ...byDay[day]!.map((plan) => _buildPlanCard(plan)),
                                const SizedBox(height: 16),
                              ],
                            )),
                          ],
                        ),
                      ),
                // Tab 2: Waitlist
                _waitlist.isEmpty
                    ? Center(child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.check_circle_outline, size: 50, color: Colors.green.shade300),
                          const SizedBox(height: 8),
                          Text('Semua merchant terjadwal!', style: TextStyle(color: Colors.grey.shade500)),
                        ],
                      ))
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _waitlist.length,
                        itemBuilder: (ctx, i) => _buildWaitlistCard(_waitlist[i], i),
                      ),
              ],
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _isGenerating ? null : _generatePlan,
        icon: _isGenerating
            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
            : const Icon(Icons.auto_awesome),
        label: Text(_isGenerating ? 'Generating...' : 'AI Generate'),
        backgroundColor: _isGenerating ? Colors.grey : Colors.teal,
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.route, size: 60, color: Colors.grey.shade300),
            const SizedBox(height: 16),
            Text('Belum ada route plan', style: GoogleFonts.outfit(fontSize: 16, color: Colors.grey.shade600)),
            const SizedBox(height: 8),
            Text('Tekan tombol "AI Generate" untuk membuat jadwal kunjungan otomatis berdasarkan territory Anda',
                textAlign: TextAlign.center, style: TextStyle(color: Colors.grey.shade400, fontSize: 13)),
          ],
        ),
      ),
    );
  }

  Widget _buildPlanCard(dynamic plan, {bool isToday = false}) {
    final merchants = plan['merchants'] as List? ?? [];
    final isAuto = plan['isAutoGenerated'] == true;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isToday ? Colors.teal.shade200 : Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(plan['name'] ?? 'Route', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 13))),
              if (isAuto)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(color: Colors.purple.shade50, borderRadius: BorderRadius.circular(4)),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.auto_awesome, size: 10, color: Colors.purple.shade600),
                      const SizedBox(width: 3),
                      Text('AI', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.purple.shade600)),
                    ],
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: merchants.asMap().entries.map((e) {
              final m = e.value;
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircleAvatar(
                      radius: 10,
                      backgroundColor: Colors.teal.shade100,
                      child: Text('${m['order'] ?? e.key + 1}', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.teal.shade700)),
                    ),
                    const SizedBox(width: 6),
                    Text(m['merchantName'] ?? '', style: const TextStyle(fontSize: 11)),
                    if (m['daysSinceVisit'] != null && m['daysSinceVisit'] > 14)
                      Padding(
                        padding: const EdgeInsets.only(left: 4),
                        child: Icon(Icons.priority_high, size: 12, color: Colors.red.shade400),
                      ),
                  ],
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildWaitlistCard(dynamic item, int index) {
    final priority = item['priority'] ?? 'LOW';
    final priorityColor = priority == 'HIGH' ? Colors.red : priority == 'MEDIUM' ? Colors.orange : Colors.grey;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: priorityColor.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          Container(
            width: 36, height: 36,
            decoration: BoxDecoration(color: priorityColor.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
            child: Center(child: Icon(Icons.store, color: priorityColor, size: 18)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item['merchantName'] ?? '', style: GoogleFonts.outfit(fontWeight: FontWeight.w600, fontSize: 13)),
                Text(item['location'] ?? '', style: TextStyle(color: Colors.grey.shade500, fontSize: 10), maxLines: 1, overflow: TextOverflow.ellipsis),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(color: priorityColor.withOpacity(0.1), borderRadius: BorderRadius.circular(4)),
                child: Text(priority, style: TextStyle(color: priorityColor, fontSize: 9, fontWeight: FontWeight.bold)),
              ),
              const SizedBox(height: 2),
              Text('${item['daysSinceVisit'] ?? '?'}d ago', style: TextStyle(color: Colors.grey.shade500, fontSize: 10)),
            ],
          ),
        ],
      ),
    ).animate().fadeIn(delay: (20 * index).ms);
  }
}
