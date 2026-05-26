import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:shimmer/shimmer.dart';
import 'package:rana_merchant/data/local/database_helper.dart';
import 'package:url_launcher/url_launcher.dart';

class CustomerScreen extends StatefulWidget {
  final bool isSelectionMode;
  const CustomerScreen({super.key, this.isSelectionMode = false});

  @override
  State<CustomerScreen> createState() => _CustomerScreenState();
}

class _CustomerScreenState extends State<CustomerScreen> {
  List<Map<String, dynamic>> _customers = [];
  bool _isLoading = true;
  final TextEditingController _searchCtrl = TextEditingController();
  String _query = '';

  @override
  void initState() {
    super.initState();
    _searchCtrl.addListener(() {
      setState(() => _query = _searchCtrl.text.trim());
      _search(_searchCtrl.text.trim());
    });
    _loadCustomers();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadCustomers() async {
    setState(() => _isLoading = true);
    final data = await DatabaseHelper.instance.getCustomers();
    if (mounted) setState(() { _customers = data; _isLoading = false; });
  }

  Future<void> _search(String query) async {
    if (query.isEmpty) { _loadCustomers(); return; }
    final data = await DatabaseHelper.instance.searchCustomers(query);
    if (mounted) setState(() => _customers = data);
  }

  void _showSuccess(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Row(children: [
        const Icon(Icons.check_circle_rounded, color: Colors.white),
        const SizedBox(width: 8),
        Text(msg, style: GoogleFonts.outfit(fontWeight: FontWeight.w600)),
      ]),
      backgroundColor: const Color(0xFF81B29A),
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      duration: const Duration(seconds: 2),
    ));
  }

  Future<void> _showAddEditDialog([Map<String, dynamic>? customer]) async {
    final nameCtrl = TextEditingController(text: customer?['name']);
    final phoneCtrl = TextEditingController(text: customer?['phone']);
    final emailCtrl = TextEditingController(text: customer?['email']);
    final addressCtrl = TextEditingController(text: customer?['address']);
    final notesCtrl = TextEditingController(text: customer?['notes']);
    bool isSaving = false;

    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Text(customer == null ? 'Tambah Pelanggan' : 'Edit Pelanggan',
              style: GoogleFonts.poppins(fontWeight: FontWeight.bold)),
          content: SingleChildScrollView(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              _field(nameCtrl, 'Nama Lengkap *'),
              const SizedBox(height: 10),
              _field(phoneCtrl, 'Nomor HP *', type: TextInputType.phone),
              const SizedBox(height: 10),
              _field(emailCtrl, 'Email (Opsional)', type: TextInputType.emailAddress),
              const SizedBox(height: 10),
              _field(addressCtrl, 'Alamat (Opsional)'),
              const SizedBox(height: 10),
              _field(notesCtrl, 'Catatan (Opsional)', maxLines: 2),
            ]),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
            FilledButton(
              onPressed: isSaving ? null : () async {
                if (nameCtrl.text.isEmpty || phoneCtrl.text.isEmpty) {
                  ScaffoldMessenger.of(ctx).showSnackBar(
                      const SnackBar(content: Text('Nama dan No HP wajib diisi')));
                  return;
                }
                setDialogState(() => isSaving = true);
                HapticFeedback.lightImpact();
                final data = {
                  'name': nameCtrl.text, 'phone': phoneCtrl.text,
                  'email': emailCtrl.text, 'address': addressCtrl.text,
                  'notes': notesCtrl.text, 'updatedAt': DateTime.now().toIso8601String(),
                };
                if (customer == null) {
                  data['createdAt'] = DateTime.now().toIso8601String();
                  await DatabaseHelper.instance.addCustomer(data);
                } else {
                  await DatabaseHelper.instance.updateCustomer(customer['id'], data);
                }
                if (mounted) {
                  Navigator.pop(ctx);
                  _showSuccess(customer == null ? 'Pelanggan berhasil ditambahkan!' : 'Data pelanggan diperbarui!');
                  _loadCustomers();
                }
              },
              child: isSaving
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Simpan'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _field(TextEditingController ctrl, String label,
      {TextInputType? type, int maxLines = 1}) {
    return TextField(
      controller: ctrl,
      keyboardType: type,
      maxLines: maxLines,
      decoration: InputDecoration(
        labelText: label,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      ),
    );
  }

  Future<void> _deleteCustomer(int id, String name) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Hapus Pelanggan?'),
        content: Text('Data "$name" akan dihapus dan tidak dapat dikembalikan.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
          TextButton(onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Hapus', style: TextStyle(color: Colors.red))),
        ],
      ),
    );
    if (confirm == true) {
      await DatabaseHelper.instance.deleteCustomer(id);
      _showSuccess('Pelanggan dihapus.');
      _loadCustomers();
    }
  }

  void _contactViaWhatsApp(String? phone) async {
    if (phone == null || phone.isEmpty) return;
    var number = phone.replaceAll(RegExp(r'[^0-9]'), '');
    if (number.startsWith('0')) number = '62${number.substring(1)}';
    final url = Uri.parse('https://wa.me/$number');
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    }
  }

  // Get color based on customer name initial for avatar
  Color _avatarColor(String name) {
    final colors = [
      const Color(0xFF3D5A80), const Color(0xFF98C1D9), const Color(0xFFE07A5F),
      const Color(0xFF81B29A), const Color(0xFFF2CC8F), const Color(0xFF6B4226),
    ];
    if (name.isEmpty) return colors[0];
    return colors[name.codeUnitAt(0) % colors.length];
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text('Pelanggan', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: FilledButton.icon(
              onPressed: () => _showAddEditDialog(),
              icon: const Icon(Icons.add_rounded, size: 18),
              label: Text('Tambah', style: GoogleFonts.outfit(fontWeight: FontWeight.w600)),
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // ── Search Bar ─────────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: TextField(
              controller: _searchCtrl,
              decoration: InputDecoration(
                hintText: 'Cari nama atau nomor HP...',
                hintStyle: GoogleFonts.outfit(color: colorScheme.onSurface.withOpacity(0.4)),
                prefixIcon: Icon(Icons.search_rounded, color: colorScheme.onSurface.withOpacity(0.4)),
                suffixIcon: _query.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear_rounded),
                        onPressed: () { _searchCtrl.clear(); _loadCustomers(); })
                    : null,
                filled: true,
                fillColor: isDark ? colorScheme.surface : Colors.grey.shade100,
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide.none),
                contentPadding: const EdgeInsets.symmetric(vertical: 14),
              ),
            ),
          ),
          // ── Count Bar ──────────────────────────────────────
          if (!_isLoading && _customers.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
              child: Row(children: [
                Text('${_customers.length} pelanggan',
                    style: GoogleFonts.outfit(
                        fontSize: 12, color: colorScheme.onSurface.withOpacity(0.45))),
              ]),
            ),
          // ── List / Empty / Shimmer ─────────────────────────
          Expanded(
            child: _isLoading
                ? _buildShimmer(colorScheme)
                : _customers.isEmpty
                    ? _buildEmptyState(colorScheme)
                    : ListView.builder(
                        padding: const EdgeInsets.fromLTRB(16, 4, 16, 100),
                        itemCount: _customers.length,
                        itemBuilder: (ctx, i) {
                          final c = _customers[i];
                          final name = c['name'] ?? 'Tanpa Nama';
                          final initial = name.isNotEmpty ? name[0].toUpperCase() : '?';
                          final ac = _avatarColor(name);
                          final joinDate = c['createdAt'] != null
                              ? DateFormat('dd MMM yyyy').format(DateTime.tryParse(c['createdAt']) ?? DateTime.now())
                              : null;

                          return Card(
                            margin: const EdgeInsets.only(bottom: 10),
                            elevation: 0,
                            color: isDark ? colorScheme.surface : Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                            child: InkWell(
                              onTap: widget.isSelectionMode
                                  ? () => Navigator.pop(context, c)
                                  : () => _showAddEditDialog(c),
                              borderRadius: BorderRadius.circular(16),
                              child: Padding(
                                padding: const EdgeInsets.all(14),
                                child: Row(children: [
                                  // Avatar
                                  Container(
                                    width: 46, height: 46,
                                    decoration: BoxDecoration(color: ac, shape: BoxShape.circle),
                                    child: Center(child: Text(initial,
                                        style: GoogleFonts.outfit(color: Colors.white,
                                            fontWeight: FontWeight.bold, fontSize: 18))),
                                  ),
                                  const SizedBox(width: 14),
                                  // Info
                                  Expanded(child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(name,
                                          style: GoogleFonts.outfit(
                                              fontWeight: FontWeight.bold,
                                              fontSize: 15,
                                              color: colorScheme.onSurface)),
                                      const SizedBox(height: 2),
                                      Row(children: [
                                        Icon(Icons.phone_outlined, size: 12, color: colorScheme.onSurface.withOpacity(0.45)),
                                        const SizedBox(width: 4),
                                        Text(c['phone'] ?? '-',
                                            style: GoogleFonts.outfit(fontSize: 12,
                                                color: colorScheme.onSurface.withOpacity(0.6))),
                                      ]),
                                      if (c['address'] != null && (c['address'] as String).isNotEmpty) ...[
                                        const SizedBox(height: 2),
                                        Row(children: [
                                          Icon(Icons.location_on_outlined, size: 12, color: colorScheme.onSurface.withOpacity(0.4)),
                                          const SizedBox(width: 4),
                                          Expanded(child: Text(c['address'],
                                              maxLines: 1, overflow: TextOverflow.ellipsis,
                                              style: GoogleFonts.outfit(fontSize: 12,
                                                  color: colorScheme.onSurface.withOpacity(0.5)))),
                                        ]),
                                      ],
                                      if (joinDate != null) ...[
                                        const SizedBox(height: 2),
                                        Text('Bergabung $joinDate',
                                            style: GoogleFonts.outfit(fontSize: 11,
                                                color: colorScheme.onSurface.withOpacity(0.35))),
                                      ]
                                    ],
                                  )),
                                  // Actions
                                  if (!widget.isSelectionMode)
                                    Row(mainAxisSize: MainAxisSize.min, children: [
                                      if (c['phone'] != null && (c['phone'] as String).isNotEmpty)
                                        _iconBtn(
                                          icon: Icons.chat_rounded,
                                          color: const Color(0xFF25D366),
                                          onTap: () => _contactViaWhatsApp(c['phone']),
                                        ),
                                      _iconBtn(
                                        icon: Icons.delete_outline_rounded,
                                        color: Colors.red,
                                        onTap: () => _deleteCustomer(c['id'], name),
                                      ),
                                    ]),
                                  if (widget.isSelectionMode)
                                    Icon(Icons.chevron_right_rounded,
                                        color: colorScheme.onSurface.withOpacity(0.3)),
                                ]),
                              ),
                            ),
                          ).animate()
                              .fadeIn(delay: (50 * i).ms, duration: 300.ms)
                              .slideX(begin: 0.06, curve: Curves.easeOutQuad);
                        },
                      ),
          ),
        ],
      ),
    );
  }

  Widget _iconBtn({required IconData icon, required Color color, required VoidCallback onTap}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Padding(
        padding: const EdgeInsets.all(6),
        child: Icon(icon, color: color, size: 20),
      ),
    );
  }

  Widget _buildEmptyState(ColorScheme colorScheme) {
    final isSearch = _query.isNotEmpty;
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(
              color: colorScheme.primary.withOpacity(0.07),
              shape: BoxShape.circle,
            ),
            child: Icon(
              isSearch ? Icons.search_off_rounded : Icons.people_outline_rounded,
              size: 48, color: colorScheme.primary.withOpacity(0.5),
            ),
          ),
          const SizedBox(height: 18),
          Text(
            isSearch ? 'Tidak Ditemukan' : 'Belum Ada Pelanggan',
            style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold,
                color: colorScheme.onSurface.withOpacity(0.7)),
          ),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 48),
            child: Text(
              isSearch
                  ? 'Tidak ada pelanggan yang cocok dengan "${_query}".'
                  : 'Tambahkan pelanggan pertama Anda untuk melacak riwayat pembelian dan mengirim promosi.',
              textAlign: TextAlign.center,
              style: GoogleFonts.outfit(fontSize: 13,
                  color: colorScheme.onSurface.withOpacity(0.42), height: 1.5),
            ),
          ),
          if (!isSearch) ...[
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: () => _showAddEditDialog(),
              icon: const Icon(Icons.person_add_rounded),
              label: Text('Tambah Pelanggan Pertama',
                  style: GoogleFonts.outfit(fontWeight: FontWeight.w600)),
            ),
          ],
        ],
      ).animate().fadeIn(duration: 400.ms).scale(begin: const Offset(0.92, 0.92)),
    );
  }

  Widget _buildShimmer(ColorScheme colorScheme) {
    return Shimmer.fromColors(
      baseColor: colorScheme.surface,
      highlightColor: colorScheme.onSurface.withOpacity(0.06),
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
        itemCount: 6,
        itemBuilder: (_, __) => Container(
          margin: const EdgeInsets.only(bottom: 10),
          height: 76,
          decoration: BoxDecoration(
              color: Colors.white, borderRadius: BorderRadius.circular(16)),
        ),
      ),
    );
  }
}
