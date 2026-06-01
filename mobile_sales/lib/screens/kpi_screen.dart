import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:rana_sales/data/api_service.dart';
import 'package:rana_sales/providers/auth_provider.dart';

class KpiScreen extends StatefulWidget {
  const KpiScreen({super.key});

  @override
  State<KpiScreen> createState() => _KpiScreenState();
}

class _KpiScreenState extends State<KpiScreen> {
  Map<String, dynamic>? _targets;
  Map<String, dynamic>? _companyTarget;
  bool _isLoading = true;
  bool _isGenerating = false;

  final _fmt = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      setState(() => _isLoading = true);
      final results = await Future.wait([
        ApiService().getTargets(),
        ApiService().getCompanyTarget(),
      ]);
      if (mounted) setState(() { _targets = results[0]; _companyTarget = results[1]; _isLoading = false; });
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _showGenerateDialog() async {
    final revenueCtrl = TextEditingController(text: '${(_companyTarget?['companyRevenueTarget'] ?? 50000000).toInt()}');
    final orderCtrl = TextEditingController();
    final visitCtrl = TextEditingController();
    int growth = (_companyTarget?['growthPercent'] ?? 10).toInt();
    String mode = 'balanced';

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: Row(
            children: [
              const Icon(Icons.auto_awesome, color: Colors.amber, size: 20),
              const SizedBox(width: 8),
              Text('AI Generate KPI', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16)),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: Colors.blue.shade50, borderRadius: BorderRadius.circular(8)),
                  child: Text('AI akan menghitung target per sales berdasarkan data historis 3 bulan, potensi territory, dan growth target.',
                      style: TextStyle(fontSize: 11, color: Colors.blue.shade700)),
                ),
                const SizedBox(height: 16),
                Text('Target Omset Perusahaan (Hope Target)', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                const SizedBox(height: 4),
                TextField(
                  controller: revenueCtrl,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    prefixText: 'Rp ',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  ),
                ),
                const SizedBox(height: 12),
                Text('Target Order (opsional)', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                const SizedBox(height: 4),
                TextField(
                  controller: orderCtrl,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    hintText: 'Auto-calculate',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  ),
                ),
                const SizedBox(height: 12),
                Text('Growth Expectation', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                Slider(
                  value: growth.toDouble(),
                  min: 0, max: 50, divisions: 10,
                  label: '+$growth%',
                  onChanged: (v) => setDialogState(() => growth = v.round()),
                ),
                Text('+$growth% dari rata-rata historis', style: TextStyle(fontSize: 10, color: Colors.grey.shade600)),
                const SizedBox(height: 12),
                Text('Mode Distribusi', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                const SizedBox(height: 4),
                Wrap(
                  spacing: 6,
                  children: [
                    ChoiceChip(label: const Text('Balanced', style: TextStyle(fontSize: 11)), selected: mode == 'balanced', onSelected: (_) => setDialogState(() => mode = 'balanced'), selectedColor: Colors.teal.shade100),
                    ChoiceChip(label: const Text('Performance', style: TextStyle(fontSize: 11)), selected: mode == 'performance', onSelected: (_) => setDialogState(() => mode = 'performance'), selectedColor: Colors.indigo.shade100),
                    ChoiceChip(label: const Text('Equal', style: TextStyle(fontSize: 11)), selected: mode == 'equal', onSelected: (_) => setDialogState(() => mode = 'equal'), selectedColor: Colors.amber.shade100),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  mode == 'balanced' ? '60% historis + 25% potensi + 15% tenure' : mode == 'performance' ? '100% berdasarkan performa historis' : 'Dibagi rata ke semua sales',
                  style: TextStyle(fontSize: 10, color: Colors.grey.shade500, fontStyle: FontStyle.italic),
                ),
              ],
            ),
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
      final revenue = double.tryParse(revenueCtrl.text) ?? 50000000;
      final orders = int.tryParse(orderCtrl.text);
      final visits = int.tryParse(visitCtrl.text);

      await ApiService().generateKpiTargets(
        companyRevenueTarget: revenue,
        companyOrderTarget: orders,
        companyVisitTarget: visits,
        growthPercent: growth,
        fairnessMode: mode,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('✅ KPI target berhasil di-generate!'), backgroundColor: Colors.green));
        _loadData();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gagal: $e'), backgroundColor: Colors.red));
    } finally {
      if (mounted) setState(() => _isGenerating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final myId = context.read<AuthProvider>().userId;

    return Scaffold(
      appBar: AppBar(
        title: Text('KPI & Target', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loadData),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadData,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Company target
                  if (_companyTarget != null && _companyTarget!['companyRevenueTarget'] != null)
                    _buildCompanyTargetCard(),
                  const SizedBox(height: 16),

                  // My target
                  _buildMyTarget(myId),
                  const SizedBox(height: 16),

                  // Team targets
                  Text('Target Tim', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16)),
                  const SizedBox(height: 8),
                  ...(_targets?['targets'] as List? ?? []).map((t) => _buildTargetCard(t, t['userId'] == myId)),
                ],
              ),
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _isGenerating ? null : _showGenerateDialog,
        icon: _isGenerating
            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
            : const Icon(Icons.auto_awesome),
        label: Text(_isGenerating ? 'Generating...' : 'AI Generate KPI'),
        backgroundColor: _isGenerating ? Colors.grey : Colors.amber.shade700,
      ),
    );
  }

  Widget _buildCompanyTargetCard() {
    final target = _companyTarget!;
    final revenue = (target['companyRevenueTarget'] ?? 0).toDouble();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: [Colors.indigo.shade600, Colors.purple.shade400]),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.flag, color: Colors.white, size: 18),
              const SizedBox(width: 8),
              Text('Company Target (Hope)', style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 12)),
            ],
          ),
          const SizedBox(height: 8),
          Text(_fmt.format(revenue), style: GoogleFonts.outfit(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
          if (target['growthPercent'] != null)
            Text('+${target['growthPercent']}% growth target', style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 11)),
        ],
      ),
    ).animate().fadeIn();
  }

  Widget _buildMyTarget(String myId) {
    final targets = _targets?['targets'] as List? ?? [];
    final myTarget = targets.firstWhere((t) => t['userId'] == myId, orElse: () => null);
    if (myTarget == null) return const SizedBox();

    final achievement = myTarget['achievement'] as Map<String, dynamic>? ?? {};

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.teal.shade50,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.teal.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.person, color: Colors.teal.shade700, size: 18),
              const SizedBox(width: 8),
              Text('Target Saya', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.teal.shade800)),
              const Spacer(),
              if (myTarget['isAutoGenerated'] == true)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(color: Colors.purple.shade50, borderRadius: BorderRadius.circular(4)),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    Icon(Icons.auto_awesome, size: 10, color: Colors.purple.shade600),
                    const SizedBox(width: 3),
                    Text('AI', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.purple.shade600)),
                  ]),
                ),
            ],
          ),
          const SizedBox(height: 12),
          _buildProgressRow('Revenue', _fmt.format(myTarget['revenue'] ?? 0), achievement['revenue'] ?? 0, Colors.teal),
          const SizedBox(height: 8),
          _buildProgressRow('Orders', '${myTarget['orders'] ?? 0}', achievement['orders'] ?? 0, Colors.indigo),
          const SizedBox(height: 8),
          _buildProgressRow('Visits', '${myTarget['visits'] ?? 0}', achievement['visits'] ?? 0, Colors.amber),
        ],
      ),
    ).animate().fadeIn(delay: 100.ms);
  }

  Widget _buildProgressRow(String label, String target, int percent, Color color) {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: TextStyle(fontSize: 12, color: Colors.grey.shade700)),
            Text('$percent% · Target: $target', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: color)),
          ],
        ),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: (percent / 100).clamp(0.0, 1.0),
            backgroundColor: color.withOpacity(0.1),
            valueColor: AlwaysStoppedAnimation(percent >= 100 ? Colors.green : color),
            minHeight: 8,
          ),
        ),
      ],
    );
  }

  Widget _buildTargetCard(dynamic target, bool isMe) {
    final achievement = target['achievement'] as Map<String, dynamic>? ?? {};
    final revPercent = achievement['revenue'] ?? 0;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isMe ? Colors.teal.shade50 : Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isMe ? Colors.teal.shade200 : Colors.grey.shade200),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 18,
            backgroundColor: Colors.teal.shade100,
            child: Text((target['userName'] ?? 'S').substring(0, 2).toUpperCase(), style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.teal.shade700)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(target['userName'] ?? '', style: GoogleFonts.outfit(fontWeight: FontWeight.w600, fontSize: 13)),
                    if (isMe) Container(
                      margin: const EdgeInsets.only(left: 6),
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                      decoration: BoxDecoration(color: Colors.teal, borderRadius: BorderRadius.circular(4)),
                      child: const Text('Anda', style: TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
                Text('Target: ${_fmt.format(target['revenue'] ?? 0)}', style: TextStyle(color: Colors.grey.shade600, fontSize: 10)),
              ],
            ),
          ),
          SizedBox(
            width: 44, height: 44,
            child: Stack(
              alignment: Alignment.center,
              children: [
                CircularProgressIndicator(
                  value: (revPercent / 100).clamp(0.0, 1.0),
                  strokeWidth: 4,
                  backgroundColor: Colors.grey.shade200,
                  valueColor: AlwaysStoppedAnimation(revPercent >= 100 ? Colors.green : revPercent >= 70 ? Colors.teal : Colors.amber),
                ),
                Text('$revPercent%', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
