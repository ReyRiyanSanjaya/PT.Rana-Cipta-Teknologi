import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:rana_merchant/data/remote/api_service.dart';
import 'package:rana_merchant/providers/auth_provider.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:convert';
import 'dart:io';

class EditProfileScreen extends StatefulWidget {
  final Map<String, dynamic> initialData;

  const EditProfileScreen({super.key, required this.initialData});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _businessNameController;
  late TextEditingController _ownerNameController;
  late TextEditingController _waNumberController;
  late TextEditingController _addressController;
  bool _isLoading = false;
  String? _latitude;
  String? _longitude;
  File? _imageFile;
  String? _imageBase64;
  String? _category;

  @override
  void initState() {
    super.initState();
    _businessNameController = TextEditingController(
        text: (widget.initialData['businessName'] ??
                widget.initialData['store_name'] ??
                widget.initialData['name'] ??
                '')
            .toString());
    _ownerNameController = TextEditingController(
        text: (widget.initialData['ownerName'] ??
                widget.initialData['owner_name'] ??
                widget.initialData['full_name'] ??
                '')
            .toString());
    _waNumberController = TextEditingController(
        text: widget.initialData['waNumber'] ??
            widget.initialData['phone'] ??
            '');
    _addressController =
        TextEditingController(text: widget.initialData['address'] ?? '');

    // Initialize Lat/Long if available
    _latitude = widget.initialData['latitude']?.toString();
    _longitude = widget.initialData['longitude']?.toString();
    _category = widget.initialData['category']?.toString();
    Future.microtask(() => _refreshFromAuth());
  }

  @override
  void dispose() {
    _businessNameController.dispose();
    _ownerNameController.dispose();
    _waNumberController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  Future<void> _refreshFromAuth() async {
    setState(() => _isLoading = true);
    try {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      await auth.refreshProfile();
      final profile = auth.currentUser ?? {};
      final bn = (profile['businessName'] ??
              profile['store_name'] ??
              profile['name'] ??
              '')
          .toString();
      final on = (profile['ownerName'] ??
              profile['owner_name'] ??
              profile['full_name'] ??
              '')
          .toString();
      final wa = (profile['waNumber'] ?? profile['phone'] ?? '').toString();
      final addr = (profile['address'] ?? '').toString();
      final lat = profile['latitude']?.toString();
      final lng = profile['longitude']?.toString();
      if (bn.isNotEmpty) _businessNameController.text = bn;
      if (on.isNotEmpty) _ownerNameController.text = on;
      if (wa.isNotEmpty) _waNumberController.text = wa;
      if (addr.isNotEmpty) _addressController.text = addr;
      _latitude = lat ?? _latitude;
      _longitude = lng ?? _longitude;
      _category = profile['category']?.toString() ?? _category;
    } catch (_) {
      // ignore
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String? _getInitialImage() {
    final d = widget.initialData;
    final keys = ['storeImage', 'storeImageUrl', 'store_image', 'imageUrl', 'logoUrl', 'photoUrl', 'logo', 'photo'];
    for (final k in keys) {
      if (d[k] != null && d[k].toString().isNotEmpty) return d[k].toString();
    }
    return null;
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.gallery, imageQuality: 70);
    
    if (pickedFile != null) {
      final file = File(pickedFile.path);
      final bytes = await file.readAsBytes();
      setState(() {
        _imageFile = file;
        _imageBase64 = base64Encode(bytes);
      });
    }
  }

  Future<void> _getCurrentLocation() async {
    setState(() => _isLoading = true);
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        throw Exception('Layanan lokasi tidak aktif');
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          throw Exception('Izin lokasi ditolak');
        }
      }

      if (permission == LocationPermission.deniedForever) {
        throw Exception('Izin lokasi ditolak permanen');
      }

      Position position = await Geolocator.getCurrentPosition();

      setState(() {
        _latitude = position.latitude.toString();
        _longitude = position.longitude.toString();
      });

      try {
        List<Placemark> placemarks = await placemarkFromCoordinates(
          position.latitude,
          position.longitude,
        );

        if (placemarks.isNotEmpty) {
          Placemark place = placemarks[0];
          String address = [
            place.street,
            place.subLocality,
            place.locality,
            place.subAdministrativeArea,
            place.postalCode
          ]
              .where((element) => element != null && element.isNotEmpty)
              .join(', ');

          if (address.isNotEmpty) {
            _addressController.text = address;
          }
        }
      } catch (e) {
        // Ignore geocoding errors, just keep coordinates
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Lokasi berhasil diperbarui'),
              backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('Gagal mengambil lokasi: $e'),
              backgroundColor: const Color(0xFFE07A5F)),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _showChangePasswordDialog() async {
    final oldPassController = TextEditingController();
    final newPassController = TextEditingController();
    final confirmPassController = TextEditingController();
    final formKey = GlobalKey<FormState>();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Ubah Password',
            style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        content: Form(
          key: formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: oldPassController,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'Password Lama'),
                validator: (v) => v!.isEmpty ? 'Wajib diisi' : null,
              ),
              TextFormField(
                controller: newPassController,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'Password Baru'),
                validator: (v) => v!.length < 6 ? 'Minimal 6 karakter' : null,
              ),
              TextFormField(
                controller: confirmPassController,
                obscureText: true,
                decoration: const InputDecoration(
                    labelText: 'Konfirmasi Password Baru'),
                validator: (v) =>
                    v != newPassController.text ? 'Password tidak sama' : null,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (formKey.currentState!.validate()) {
                Navigator.pop(context); // Close dialog first
                setState(() => _isLoading = true);
                try {
                  await ApiService().changePassword(
                    oldPassController.text,
                    newPassController.text,
                  );
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                          content: Text('Password berhasil diubah'),
                          backgroundColor: const Color(0xFFE07A5F)),
                    );
                  }
                } catch (e) {
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                          content: Text(e.toString()),
                          backgroundColor: Colors.red),
                    );
                  }
                } finally {
                  if (mounted) setState(() => _isLoading = false);
                }
              }
            },
            style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFE07A5F)),
            child: const Text('Simpan'),
          ),
        ],
      ),
    );
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      await ApiService().updateStoreProfile(
        businessName: _businessNameController.text.trim(),
        ownerName: _ownerNameController.text.trim(),
        waNumber: _waNumberController.text.trim(),
        address: _addressController.text.trim(),
        category: _category,
        latitude: _latitude,
        longitude: _longitude,
        storeImageBase64: _imageBase64,
      );

      if (mounted) {
        // Refresh global state
        await Provider.of<AuthProvider>(context, listen: false)
            .refreshProfile();

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Profil berhasil diperbarui'),
            backgroundColor: Color(0xFF81B29A),
          ),
        );
        Navigator.pop(context, true); // Return success result
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Gagal memperbarui profil: $e'),
            backgroundColor: Color(0xFFE07A5F),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: colorScheme.surface,
      appBar: AppBar(
        title: Text('Edit Profil Toko',
            style: GoogleFonts.outfit(
                color: colorScheme.onSurface, fontWeight: FontWeight.bold)),
        backgroundColor: colorScheme.surface,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new, color: colorScheme.onSurface),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Stack(
                  children: [
                    Container(
                      width: 100,
                      height: 100,
                      decoration: BoxDecoration(
                        color: colorScheme.surfaceVariant,
                        shape: BoxShape.circle,
                        image: _imageFile != null
                            ? DecorationImage(image: FileImage(_imageFile!), fit: BoxFit.cover)
                            : _getInitialImage() != null
                                ? DecorationImage(
                                    image: NetworkImage(ApiService().resolveFileUrl(_getInitialImage()!)),
                                    fit: BoxFit.cover)
                                : null,
                      ),
                      child: (_imageFile == null && _getInitialImage() == null)
                          ? Icon(Icons.store, size: 50, color: colorScheme.onSurfaceVariant)
                          : null,
                    ),
                    Positioned(
                      bottom: 0,
                      right: 0,
                      child: GestureDetector(
                        onTap: _pickImage,
                        child: CircleAvatar(
                          radius: 18,
                          backgroundColor: colorScheme.primary,
                          child: Icon(Icons.camera_alt, size: 18, color: colorScheme.onPrimary),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 30),
              _buildLabel('Nama Toko'),
              _buildTextField(
                controller: _businessNameController,
                hint: 'Contoh: Toko Berkah',
                icon: Icons.store_mall_directory_outlined,
                validator: (v) =>
                    v!.isEmpty ? 'Nama toko tidak boleh kosong' : null,
              ),
              const SizedBox(height: 20),
              _buildLabel('Nama Pemilik'),
              _buildTextField(
                controller: _ownerNameController,
                hint: 'Contoh: Ahmad Subarjo',
                icon: Icons.person_outline,
                validator: (v) =>
                    v!.isEmpty ? 'Nama pemilik tidak boleh kosong' : null,
              ),
              const SizedBox(height: 20),
              _buildLabel('Nomor WhatsApp'),
              _buildTextField(
                controller: _waNumberController,
                hint: 'Contoh: 081234567890',
                icon: Icons.chat_outlined,
                keyboardType: TextInputType.phone,
                validator: (v) =>
                    v!.isEmpty ? 'Nomor WA tidak boleh kosong' : null,
              ),
              const SizedBox(height: 20),
              _buildLabel('Kategori Bisnis'),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  color: colorScheme.surfaceVariant.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: colorScheme.outlineVariant),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButtonFormField<String>(
                    value: _category,
                    decoration: const InputDecoration(
                      border: InputBorder.none,
                      isDense: true,
                    ),
                    items: const [
                      DropdownMenuItem(value: 'Apotik', child: Text('Apotik / Kesehatan')),
                      DropdownMenuItem(value: 'Kedai Makanan', child: Text('Kedai Makanan / Resto')),
                      DropdownMenuItem(value: 'Outlet Ponsel', child: Text('Outlet Ponsel / Pulsa')),
                      DropdownMenuItem(value: 'Toko Baju', child: Text('Toko Baju / Fashion')),
                      DropdownMenuItem(value: 'Kelontong', child: Text('Toko Kelontong / Sembako')),
                      DropdownMenuItem(value: 'Lainnya', child: Text('Lainnya')),
                    ],
                    onChanged: (val) => setState(() => _category = val),
                    validator: (v) => v == null ? 'Pilih Kategori' : null,
                  ),
                ),
              ),
              const SizedBox(height: 20),
              _buildLabel('Alamat Lengkap'),
              _buildTextField(
                controller: _addressController,
                hint: 'Contoh: Jl. Sudirman No. 123, Jakarta',
                icon: Icons.location_on_outlined,
                maxLines: 3,
                validator: (v) =>
                    v!.isEmpty ? 'Alamat tidak boleh kosong' : null,
              ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: _isLoading ? null : _getCurrentLocation,
                icon: const Icon(Icons.my_location, size: 18),
                label: const Text('Ambil Lokasi Saat Ini'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: colorScheme.primary,
                  side: BorderSide(color: colorScheme.primary),
                ),
              ),
              if (_latitude != null)
                Padding(
                  padding: const EdgeInsets.only(top: 8.0),
                  child: Text(
                    'Koordinat: $_latitude, $_longitude',
                    style: GoogleFonts.outfit(fontSize: 12, color: colorScheme.onSurface.withOpacity(0.6)),
                  ),
                ),
              const SizedBox(height: 30),
              Divider(color: colorScheme.outlineVariant, thickness: 1),
              const SizedBox(height: 20),
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text('Keamanan Akun',
                    style: GoogleFonts.outfit(
                        fontWeight: FontWeight.bold, fontSize: 16, color: colorScheme.onSurface)),
                subtitle: Text('Ubah password akun anda',
                    style: GoogleFonts.outfit(color: colorScheme.onSurface.withOpacity(0.6))),
                trailing: TextButton(
                  onPressed: _showChangePasswordDialog,
                  child: const Text('Ubah Password'),
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _saveProfile,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: colorScheme.primary,
                    foregroundColor: colorScheme.onPrimary,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    elevation: 0,
                  ),
                  child: _isLoading
                      ? SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: colorScheme.onPrimary,
                          ),
                        )
                      : Text(
                          'Simpan Perubahan',
                          style: GoogleFonts.outfit(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        text,
        style: GoogleFonts.outfit(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: Theme.of(context).colorScheme.onSurface.withOpacity(0.7),
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    TextInputType? keyboardType,
    int maxLines = 1,
    String? Function(String?)? validator,
  }) {
    final colorScheme = Theme.of(context).colorScheme;
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      maxLines: maxLines,
      validator: validator,
      style: GoogleFonts.outfit(
        fontSize: 16,
        color: colorScheme.onSurface,
      ),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: GoogleFonts.outfit(color: colorScheme.onSurface.withOpacity(0.4)),
        prefixIcon: Icon(icon, color: colorScheme.onSurface.withOpacity(0.4)),
        filled: true,
        fillColor: colorScheme.surfaceVariant.withOpacity(0.3),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: colorScheme.outline.withOpacity(0.2)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: colorScheme.primary),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: colorScheme.error),
        ),
      ),
    );
  }
}
