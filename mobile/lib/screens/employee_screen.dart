import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:shimmer/shimmer.dart';
import 'package:rana_merchant/data/local/database_helper.dart';

class EmployeeScreen extends StatefulWidget {
  const EmployeeScreen({super.key});

  @override
  State<EmployeeScreen> createState() => _EmployeeScreenState();
}

class _EmployeeScreenState extends State<EmployeeScreen> {
  List<Map<String, dynamic>> _employees = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadEmployees();
  }

  Future<void> _loadEmployees() async {
    setState(() => _isLoading = true);
    final data = await DatabaseHelper.instance.getEmployees();
    if (mounted) setState(() { _employees = data; _isLoading = false; });
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

  Future<void> _showAddEditDialog([Map<String, dynamic>? employee]) async {
    final nameCtrl = TextEditingController(text: employee?['name']);
    final pinCtrl = TextEditingController(text: employee?['pin']);
    final phoneCtrl = TextEditingController(text: employee?['phone']);
    String selectedRole = employee?['role'] ?? 'CASHIER';
    bool isActive = employee == null ? true : (employee['isActive'] == 1);
    bool isSaving = false;

    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Text(employee == null ? 'Tambah Pegawai' : 'Edit Pegawai',
              style: GoogleFonts.poppins(fontWeight: FontWeight.bold)),
          content: SingleChildScrollView(
            child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
              _field(nameCtrl, 'Nama Pegawai *'),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                value: selectedRole,
                decoration: InputDecoration(
                    labelText: 'Peran (Role)',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12))),
                items: const [
                  DropdownMenuItem(value: 'CASHIER', child: Text('Kasir')),
                  DropdownMenuItem(value: 'ADMIN', child: Text('Admin')),
                  DropdownMenuItem(value: 'OWNER', child: Text('Pemilik')),
                ],
                onChanged: (val) { if (val != null) setDialogState(() => selectedRole = val); },
              ),
              const SizedBox(height: 10),
              _field(pinCtrl, 'PIN Akses (4-6 Digit) *',
                  type: TextInputType.number, maxLength: 6,
                  hint: 'Digunakan untuk login kasir'),
              const SizedBox(height: 10),
              _field(phoneCtrl, 'Nomor HP (Opsional)', type: TextInputType.phone),
              if (employee != null) ...[
                const SizedBox(height: 10),
                Container(
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.grey.shade300),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: SwitchListTile(
                    title: Text('Status Aktif', style: GoogleFonts.outfit()),
                    subtitle: Text(isActive ? 'Bisa mengakses kasir' : 'Akses dinonaktifkan',
                        style: GoogleFonts.outfit(fontSize: 12)),
                    value: isActive,
                    onChanged: (val) => setDialogState(() => isActive = val),
                    activeColor: const Color(0xFF81B29A),
                  ),
                ),
              ],
            ]),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
            FilledButton(
              onPressed: isSaving ? null : () async {
                if (nameCtrl.text.isEmpty || pinCtrl.text.length < 4) {
                  ScaffoldMessenger.of(ctx).showSnackBar(
                      const SnackBar(content: Text('Nama wajib diisi & PIN minimal 4 digit')));
                  return;
                }
                setDialogState(() => isSaving = true);
                HapticFeedback.lightImpact();
                final data = {
                  'name': nameCtrl.text, 'role': selectedRole,
                  'pin': pinCtrl.text, 'phone': phoneCtrl.text, 'isActive': isActive ? 1 : 0,
                };
                if (employee == null) {
                  data['createdAt'] = DateTime.now().toIso8601String();
                  await DatabaseHelper.instance.addEmployee(data);
                } else {
                  await DatabaseHelper.instance.updateEmployee(employee['id'], data);
                }
                if (mounted) {
                  Navigator.pop(ctx);
                  _showSuccess(employee == null ? 'Pegawai berhasil ditambahkan!' : 'Data pegawai diperbarui!');
                  _loadEmployees();
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
    nameCtrl.dispose(); pinCtrl.dispose(); phoneCtrl.dispose();
  }

  Widget _field(TextEditingController ctrl, String label,
      {TextInputType? type, int? maxLength, String? hint, int maxLines = 1}) {
    return TextField(
      controller: ctrl,
      keyboardType: type,
      maxLength: maxLength,
      maxLines: maxLines,
      decoration: InputDecoration(
        labelText: label,
        helperText: hint,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        counterText: '',
      ),
    );
  }

  Future<void> _deleteEmployee(int id, String name) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Hapus Pegawai?'),
        content: Text('Data "$name" akan dihapus dan tidak dapat dikembalikan.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
          TextButton(onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Hapus', style: TextStyle(color: Colors.red))),
        ],
      ),
    );
    if (confirm == true) {
      await DatabaseHelper.instance.deleteEmployee(id);
      _showSuccess('Pegawai dihapus.');
      _loadEmployees();
    }
  }

  Color _roleColor(String role) {
    switch (role) {
      case 'OWNER': return const Color(0xFFE07A5F);
      case 'ADMIN': return const Color(0xFF3D5A80);
      default: return const Color(0xFF81B29A);
    }
  }

  String _roleLabel(String role) {
    switch (role) {
      case 'OWNER': return 'Pemilik';
      case 'ADMIN': return 'Admin';
      default: return 'Kasir';
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text('Manajemen Pegawai', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
      ),
      body: _isLoading
          ? _buildShimmer(colorScheme)
          : _employees.isEmpty
              ? _buildEmptyState(colorScheme)
              : ListView.builder(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
                  itemCount: _employees.length,
                  itemBuilder: (ctx, i) {
                    final emp = _employees[i];
                    final isActive = emp['isActive'] == 1;
                    final role = emp['role'] ?? 'CASHIER';
                    final rColor = _roleColor(role);
                    final name = emp['name'] ?? '-';
                    final initial = name.isNotEmpty ? name[0].toUpperCase() : '?';

                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      elevation: 0,
                      color: isDark ? colorScheme.surface : Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                      child: InkWell(
                        onTap: () => _showAddEditDialog(emp),
                        borderRadius: BorderRadius.circular(18),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Row(children: [
                            // Avatar with active indicator
                            Stack(
                              children: [
                                Container(
                                  width: 50, height: 50,
                                  decoration: BoxDecoration(
                                    color: rColor.withOpacity(0.14),
                                    shape: BoxShape.circle,
                                  ),
                                  child: Center(
                                    child: Text(initial,
                                        style: GoogleFonts.outfit(
                                            fontSize: 20, fontWeight: FontWeight.bold,
                                            color: rColor)),
                                  ),
                                ),
                                Positioned(
                                  bottom: 0, right: 0,
                                  child: Container(
                                    width: 14, height: 14,
                                    decoration: BoxDecoration(
                                      color: isActive ? const Color(0xFF81B29A) : Colors.grey[400],
                                      shape: BoxShape.circle,
                                      border: Border.all(color: Colors.white, width: 2),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(width: 14),
                            Expanded(child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(name,
                                    style: GoogleFonts.outfit(fontWeight: FontWeight.bold,
                                        fontSize: 15, color: colorScheme.onSurface)),
                                const SizedBox(height: 4),
                                Row(children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: rColor.withOpacity(0.12),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(_roleLabel(role),
                                        style: GoogleFonts.outfit(fontSize: 11,
                                            color: rColor, fontWeight: FontWeight.w600)),
                                  ),
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: isActive
                                          ? const Color(0xFF81B29A).withOpacity(0.10)
                                          : Colors.grey.withOpacity(0.10),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(isActive ? 'Aktif' : 'Nonaktif',
                                        style: GoogleFonts.outfit(fontSize: 11,
                                            color: isActive ? const Color(0xFF81B29A) : Colors.grey,
                                            fontWeight: FontWeight.w600)),
                                  ),
                                ]),
                                if (emp['phone'] != null && (emp['phone'] as String).isNotEmpty) ...[
                                  const SizedBox(height: 4),
                                  Row(children: [
                                    Icon(Icons.phone_outlined, size: 12,
                                        color: colorScheme.onSurface.withOpacity(0.4)),
                                    const SizedBox(width: 4),
                                    Text(emp['phone'],
                                        style: GoogleFonts.outfit(fontSize: 12,
                                            color: colorScheme.onSurface.withOpacity(0.55))),
                                  ]),
                                ],
                              ],
                            )),
                            IconButton(
                              icon: const Icon(Icons.delete_outline_rounded, color: Colors.red),
                              onPressed: () => _deleteEmployee(emp['id'], name),
                            ),
                          ]),
                        ),
                      ),
                    ).animate()
                        .fadeIn(delay: (60 * i).ms, duration: 350.ms)
                        .slideY(begin: 0.10, curve: Curves.easeOutQuad);
                  },
                ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddEditDialog(),
        icon: const Icon(Icons.add_rounded),
        label: Text('Tambah Pegawai', style: GoogleFonts.outfit(fontWeight: FontWeight.w600)),
        backgroundColor: colorScheme.primary,
        foregroundColor: colorScheme.onPrimary,
      ).animate().scale(delay: 300.ms, curve: Curves.easeOutBack),
    );
  }

  Widget _buildEmptyState(ColorScheme colorScheme) {
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
            child: Icon(Icons.badge_outlined, size: 48, color: colorScheme.primary.withOpacity(0.5)),
          ),
          const SizedBox(height: 18),
          Text('Belum Ada Pegawai',
              style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold,
                  color: colorScheme.onSurface.withOpacity(0.7))),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 48),
            child: Text(
              'Tambahkan data pegawai untuk mengelola hak akses kasir dan memantau aktivitas toko.',
              textAlign: TextAlign.center,
              style: GoogleFonts.outfit(fontSize: 13,
                  color: colorScheme.onSurface.withOpacity(0.42), height: 1.5),
            ),
          ),
          const SizedBox(height: 20),
          FilledButton.icon(
            onPressed: () => _showAddEditDialog(),
            icon: const Icon(Icons.person_add_rounded),
            label: Text('Tambah Pegawai Pertama',
                style: GoogleFonts.outfit(fontWeight: FontWeight.w600)),
          ),
        ],
      ).animate().fadeIn(duration: 400.ms).scale(begin: const Offset(0.92, 0.92)),
    );
  }

  Widget _buildShimmer(ColorScheme colorScheme) {
    return Shimmer.fromColors(
      baseColor: colorScheme.surface,
      highlightColor: colorScheme.onSurface.withOpacity(0.06),
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
        itemCount: 5,
        itemBuilder: (_, __) => Container(
          margin: const EdgeInsets.only(bottom: 12),
          height: 88,
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18)),
        ),
      ),
    );
  }
}
