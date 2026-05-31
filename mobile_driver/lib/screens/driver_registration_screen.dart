import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:provider/provider.dart';
import 'package:mobile_driver/config/theme_config.dart';
import 'package:mobile_driver/data/driver_api_service.dart';
import 'package:mobile_driver/providers/auth_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lottie/lottie.dart';

import 'package:image_picker/image_picker.dart';
import 'dart:io';

class DriverRegistrationScreen extends StatefulWidget {
  const DriverRegistrationScreen({super.key});

  @override
  State<DriverRegistrationScreen> createState() => _DriverRegistrationScreenState();
}

class _DriverRegistrationScreenState extends State<DriverRegistrationScreen> {
  int _currentStep = 0;
  final _formKeys = [
    GlobalKey<FormState>(),
    GlobalKey<FormState>(),
    GlobalKey<FormState>(),
  ];

  // Step 1: Personal Info
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _nikCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  final _emergencyContactNameCtrl = TextEditingController();
  final _emergencyContactPhoneCtrl = TextEditingController();

  // Step 2: Vehicle Info
  final _plateCtrl = TextEditingController();
  final _brandCtrl = TextEditingController();
  final _yearCtrl = TextEditingController();
  String _selectedVehicle = 'MOTORCYCLE';

  // Step 3: Documents
  XFile? _ktpImage;
  XFile? _simImage;
  XFile? _stnkImage;
  XFile? _selfieImage;
  final ImagePicker _picker = ImagePicker();

  bool _isSubmitting = false;

  Future<void> _pickImage(String type) async {
    try {
      final XFile? image = await _picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 85,
      );
      if (image != null) {
        setState(() {
          if (type == 'ktp') _ktpImage = image;
          if (type == 'sim') _simImage = image;
          if (type == 'stnk') _stnkImage = image;
          if (type == 'selfie') _selfieImage = image;
        });
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal mengambil gambar: $e')),
      );
    }
  }

  @override
  void initState() {
    super.initState();
    _loadUserInitialData();
  }

  Future<void> _loadUserInitialData() async {
    final prefs = await SharedPreferences.getInstance();
    final name = prefs.getString('buyer_name');
    final phone = prefs.getString('buyer_phone');
    if (name != null) _nameCtrl.text = name;
    if (phone != null) _phoneCtrl.text = phone;
  }

  Future<void> _submit() async {
    // Validate all forms first
    bool allValid = true;
    for (var formKey in _formKeys) {
      if (!formKey.currentState!.validate()) {
        allValid = false;
      }
    }

    if (!allValid) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Mohon lengkapi semua data dengan benar.')),
      );
      return;
    }

    if (_ktpImage == null || _simImage == null || _stnkImage == null || _selfieImage == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Mohon unggah semua dokumen yang diperlukan.')),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final apiService = DriverApiService();
      final data = {
        'role': 'DRIVER',
        // Step 1
        'name': _nameCtrl.text,
        'email': _emailCtrl.text,
        'password': _passwordCtrl.text,
        'phone': _phoneCtrl.text,
        'nik': _nikCtrl.text,
        'address': _addressCtrl.text,
        'emergency_contact_name': _emergencyContactNameCtrl.text,
        'emergency_contact_phone': _emergencyContactPhoneCtrl.text,
        // Step 2
        'vehicle_type': _selectedVehicle,
        'vehicle_plate': _plateCtrl.text,
        'vehicle_brand': _brandCtrl.text,
        'vehicle_year': _yearCtrl.text,
        // Step 3
        'ktp_image': kIsWeb ? await _ktpImage!.readAsBytes() : _ktpImage!.path,
        'sim_image': kIsWeb ? await _simImage!.readAsBytes() : _simImage!.path,
        'stnk_image': kIsWeb ? await _stnkImage!.readAsBytes() : _stnkImage!.path,
        'selfie_image': kIsWeb ? await _selfieImage!.readAsBytes() : _selfieImage!.path,
      };

      await apiService.registerDriver(data);
      
      if (!mounted) return;
      
      _showSuccessDialog();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal mendaftar: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  void _showSuccessDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        backgroundColor: Theme.of(context).cardTheme.color,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: ThemeConfig.colorSuccess.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.check_circle, color: ThemeConfig.colorSuccess, size: 64),
            ),
            const SizedBox(height: 24),
            Text(
              'Pendaftaran Berhasil!',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            Text(
              'Terima kasih telah bergabung. Data Anda sedang diverifikasi oleh tim kami. Kami akan menghubungi Anda segera melalui WhatsApp.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(height: 1.5),
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.of(context).pop(); // Close dialog
                  Navigator.of(context).pop(); // Back to login
                },
                child: const Text('KEMBALI KE LOGIN'),
              ),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ThemeConfig.beigeBackground,
      appBar: AppBar(
        title: Text('Pendaftaran Mitra Driver', 
          style: GoogleFonts.outfit(fontWeight: FontWeight.w700, color: ThemeConfig.brandColor)),
        backgroundColor: ThemeConfig.beigeBackground,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, size: 20, color: ThemeConfig.brandColor),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Theme(
        data: Theme.of(context).copyWith(
          colorScheme: const ColorScheme.light(primary: ThemeConfig.brandColor),
          canvasColor: ThemeConfig.beigeBackground,
        ),
        child: Stepper(
          type: StepperType.horizontal,
          elevation: 0,
          currentStep: _currentStep,
          onStepContinue: () {
            final isLastStep = _currentStep == getSteps().length - 1;
            if (_formKeys[_currentStep].currentState!.validate()) {
              if (isLastStep) {
                _submit();
              } else {
                setState(() => _currentStep += 1);
              }
            }
          },
          onStepCancel: _currentStep == 0 ? null : () => setState(() => _currentStep -= 1),
          steps: getSteps(),
          controlsBuilder: (context, details) {
            final isLastStep = _currentStep == getSteps().length - 1;
            return Container(
              margin: const EdgeInsets.only(top: 32, bottom: 32),
              child: Row(
                children: [
                  Expanded(
                    child: ElevatedButton(
                      onPressed: details.onStepContinue,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: ThemeConfig.brandColor,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        padding: const EdgeInsets.symmetric(vertical: 18),
                        elevation: 4,
                        shadowColor: ThemeConfig.brandColor.withOpacity(0.4),
                      ),
                      child: _isSubmitting 
                          ? const SizedBox(
                              height: 20, width: 20,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : Text(isLastStep ? 'KIRIM PENDAFTARAN' : 'LANJUTKAN', 
                              style: const TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1)),
                    ),
                  ),
                  if (_currentStep != 0)
                    const SizedBox(width: 12),
                  if (_currentStep != 0)
                    TextButton(
                      onPressed: details.onStepCancel,
                      style: TextButton.styleFrom(
                        foregroundColor: ThemeConfig.brandColor,
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
                      ),
                      child: const Text('KEMBALI', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  List<Step> getSteps() => [
        Step(
          state: _currentStep > 0 ? StepState.complete : StepState.indexed,
          isActive: _currentStep >= 0,
          title: const Text('Akun'),
          content: Form(
            key: _formKeys[0],
            child: _buildStep1(),
          ),
        ),
        Step(
          state: _currentStep > 1 ? StepState.complete : StepState.indexed,
          isActive: _currentStep >= 1,
          title: const Text('Kendaraan'),
          content: Form(
            key: _formKeys[1],
            child: _buildStep2(),
          ),
        ),
        Step(
          isActive: _currentStep >= 2,
          title: const Text('Dokumen'),
          content: Form(
            key: _formKeys[2],
            child: _buildStep3(),
          ),
        ),
      ];

  Widget _buildStep1() {
    return Column(
      children: [
        _buildModernField(
          controller: _nameCtrl,
          label: 'Nama Lengkap',
          icon: Icons.person_outline_rounded,
          validator: (v) => v!.isEmpty ? 'Nama harus diisi' : null,
        ),
        const SizedBox(height: 20),
        _buildModernField(
          controller: _emailCtrl,
          label: 'Email',
          icon: Icons.email_outlined,
          keyboardType: TextInputType.emailAddress,
          validator: (v) => v!.isEmpty ? 'Email harus diisi' : null,
        ),
        const SizedBox(height: 20),
        _buildModernField(
          controller: _passwordCtrl,
          label: 'Password',
          icon: Icons.lock_outline,
          obscureText: true,
          validator: (v) {
            if (v == null || v.isEmpty) return 'Password harus diisi';
            if (v.length < 8) return 'Password minimal 8 karakter';
            if (!RegExp(r'[A-Z]').hasMatch(v)) return 'Harus ada huruf besar';
            if (!RegExp(r'[a-z]').hasMatch(v)) return 'Harus ada huruf kecil';
            if (!RegExp(r'[0-9]').hasMatch(v)) return 'Harus ada angka';
            return null;
          },
        ),
        const SizedBox(height: 20),
        _buildModernField(
          controller: _phoneCtrl,
          label: 'Nomor WhatsApp',
          icon: Icons.phone_android_rounded,
          keyboardType: TextInputType.phone,
          validator: (v) => v!.isEmpty ? 'Nomor HP harus diisi' : null,
        ),
        const SizedBox(height: 20),
        _buildModernField(
          controller: _nikCtrl,
          label: 'NIK (Nomor Induk Kependudukan)',
          icon: Icons.badge_outlined,
          keyboardType: TextInputType.number,
          validator: (v) => v!.length != 16 ? 'NIK harus 16 digit' : null,
        ),
        const SizedBox(height: 20),
        _buildModernField(
          controller: _addressCtrl,
          label: 'Alamat Sesuai KTP',
          icon: Icons.home_outlined,
          validator: (v) => v!.isEmpty ? 'Alamat harus diisi' : null,
        ),
        const SizedBox(height: 20),
        _buildModernField(
          controller: _emergencyContactNameCtrl,
          label: 'Nama Kontak Darurat',
          icon: Icons.contact_emergency_outlined,
          validator: (v) => v!.isEmpty ? 'Nama kontak darurat harus diisi' : null,
        ),
        const SizedBox(height: 20),
        _buildModernField(
          controller: _emergencyContactPhoneCtrl,
          label: 'Nomor Kontak Darurat',
          icon: Icons.phone_forwarded_outlined,
          keyboardType: TextInputType.phone,
          validator: (v) => v!.isEmpty ? 'Nomor kontak darurat harus diisi' : null,
        ),
      ],
    );
  }

  Widget _buildStep2() {
    return Column(
      children: [
        _buildVehicleSelector(),
        const SizedBox(height: 20),
        _buildModernField(
          controller: _plateCtrl,
          label: 'Nomor Plat Kendaraan',
          icon: Icons.confirmation_number_outlined,
          hint: 'Contoh: B 1234 ABC',
          validator: (v) => v!.isEmpty ? 'Plat nomor harus diisi' : null,
        ),
        const SizedBox(height: 20),
        _buildModernField(
          controller: _brandCtrl,
          label: 'Merk & Tipe Kendaraan',
          icon: Icons.car_repair_outlined,
          hint: 'Contoh: Honda Vario 150',
          validator: (v) => v!.isEmpty ? 'Merk kendaraan harus diisi' : null,
        ),
        const SizedBox(height: 20),
        _buildModernField(
          controller: _yearCtrl,
          label: 'Tahun Kendaraan',
          icon: Icons.calendar_today_outlined,
          keyboardType: TextInputType.number,
          validator: (v) => v!.length != 4 ? 'Tahun harus 4 digit' : null,
        ),
      ],
    );
  }

  Widget _buildStep3() {
    return Column(
      children: [
        _buildDocUploadCard('Foto KTP', Icons.badge_outlined, _ktpImage, () => _pickImage('ktp')),
        const SizedBox(height: 16),
        _buildDocUploadCard('Foto SIM', Icons.credit_card_outlined, _simImage, () => _pickImage('sim')),
        const SizedBox(height: 16),
        _buildDocUploadCard('Foto STNK', Icons.article_outlined, _stnkImage, () => _pickImage('stnk')),
        const SizedBox(height: 16),
        _buildDocUploadCard('Selfie dengan KTP', Icons.camera_alt_outlined, _selfieImage, () => _pickImage('selfie')),
      ],
    );
  }

  Widget _buildDocumentSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildDocUploadCard('KTP / ID Card', Icons.badge_outlined, _ktpImage, () => _pickImage('ktp')),
        const SizedBox(height: 16),
        _buildDocUploadCard('SIM / License', Icons.credit_card_outlined, _simImage, () => _pickImage('sim')),
        const SizedBox(height: 16),
        _buildDocUploadCard('STNK Kendaraan', Icons.article_outlined, _stnkImage, () => _pickImage('stnk')),
      ],
    );
  }



  Widget _buildDocUploadCard(String label, IconData icon, XFile? imageFile, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 140,
        width: double.infinity,
        decoration: BoxDecoration(
          color: Theme.of(context).cardTheme.color,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
            color: imageFile != null ? ThemeConfig.brandColor : Theme.of(context).dividerColor,
            width: imageFile != null ? 2 : 1,
          ),
          boxShadow: [
            BoxShadow(
              color: ThemeConfig.shadowColor,
              blurRadius: 10,
              offset: const Offset(0, 4),
            )
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(24),
          child: imageFile == null 
            ? Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: ThemeConfig.brandColor.withOpacity(0.1),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(icon, color: ThemeConfig.brandColor, size: 28),
                  ),
                  const SizedBox(height: 12),
                  Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text('Ketuk untuk unggah dokumen', style: Theme.of(context).textTheme.bodySmall),
                ],
              )
            : Stack(
                fit: StackFit.expand,
                children: [
                  kIsWeb 
                    ? Image.network(imageFile.path, fit: BoxFit.cover)
                    : Image.file(File(imageFile.path), fit: BoxFit.cover),
                  Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [Colors.transparent, Colors.black.withOpacity(0.7)],
                      ),
                    ),
                  ),
                  Positioned(
                    bottom: 12,
                    left: 16,
                    right: 16,
                    child: Row(
                      children: [
                        const Icon(Icons.check_circle, color: ThemeConfig.colorSuccess, size: 20),
                        const SizedBox(width: 8),
                        Expanded( 
                          child: Text(
                            label,
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                          ),
                        ),
                        const Icon(Icons.refresh, color: Colors.white, size: 20),
                      ],
                    ),
                  ),
                ],
              ),
        ),
      ),
    ).animate(target: imageFile != null ? 1 : 0).shimmer(duration: 500.ms, color: ThemeConfig.brandColor.withOpacity(0.1));
  }

  Widget _buildHeader() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: ThemeConfig.brandColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(20),
          ),
          child: const Icon(Icons.directions_bike_rounded, color: ThemeConfig.brandColor, size: 32),
        ).animate().scale(curve: Curves.easeOutBack),
        const SizedBox(height: 24),
        Text(
          'Mulai Hasilkan Uang\nSebagai Mitra Rana',
          style: GoogleFonts.outfit(fontSize: 28, fontWeight: FontWeight.w800, height: 1.2),
        ).animate().fadeIn(delay: 200.ms).slideY(begin: 0.1),
        const SizedBox(height: 12),
        Text(
          'Daftarkan kendaraan Anda dan jadilah bagian dari revolusi ekonomi lokal.',
          style: Theme.of(context).textTheme.bodyLarge?.copyWith(height: 1.5),
        ).animate().fadeIn(delay: 400.ms).slideY(begin: 0.1),
      ],
    );
  }

  Widget _buildModernField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    String? hint,
    TextInputType? keyboardType,
    String? Function(String?)? validator,
    bool obscureText = false,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: ThemeConfig.shadowColor,
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: TextFormField(
        controller: controller,
        keyboardType: keyboardType,
        validator: validator,
        obscureText: obscureText,
        style: const TextStyle(fontWeight: FontWeight.w500),
        decoration: InputDecoration(
          labelText: label,
          hintText: hint,
          prefixIcon: Icon(icon, color: ThemeConfig.brandColor, size: 22),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(20),
            borderSide: BorderSide.none,
          ),
          filled: true,
          fillColor: Theme.of(context).cardTheme.color,
          labelStyle: Theme.of(context).textTheme.bodyMedium,
          floatingLabelStyle: const TextStyle(color: ThemeConfig.brandColor, fontWeight: FontWeight.bold),
          contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
        ),
      ),
    ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.1, end: 0);
  }

  Widget _buildVehicleSelector() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Pilih Jenis Kendaraan', 
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        const SizedBox(height: 16),
        Row(
          children: [
            _buildVehicleOption('MOTORCYCLE', Icons.directions_bike_rounded, 'Motor'),
            const SizedBox(width: 16),
            _buildVehicleOption('CAR', Icons.directions_car_rounded, 'Mobil'),
          ],
        ),
      ],
    );
  }

  Widget _buildVehicleOption(String value, IconData icon, String label) {
    final isSelected = _selectedVehicle == value;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _selectedVehicle = value),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
            color: isSelected ? ThemeConfig.brandColor : Theme.of(context).cardTheme.color,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isSelected ? ThemeConfig.brandColor : Theme.of(context).dividerColor,
              width: 2,
            ),
            boxShadow: isSelected ? [
              BoxShadow(
                color: ThemeConfig.brandColor.withOpacity(0.3),
                blurRadius: 10,
                offset: const Offset(0, 4),
              )
            ] : [],
          ),
          child: Column(
            children: [
              Icon(icon, color: isSelected ? Colors.white : Theme.of(context).textTheme.bodyMedium?.color, size: 32),
              const SizedBox(height: 8),
              Text(
                label,
                style: TextStyle(
                  color: isSelected ? Colors.white : Theme.of(context).textTheme.bodyMedium?.color,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSubmitButton() {
    return SizedBox(
      width: double.infinity,
      height: 64,
      child: ElevatedButton(
        onPressed: _isSubmitting ? null : _submit,
        child: _isSubmitting 
          ? const CircularProgressIndicator(color: Colors.white)
          : const Text('Kirim Pendaftaran', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
      ),
    ).animate(target: _isSubmitting ? 0 : 1).shimmer(duration: 2000.ms);
  }
}

