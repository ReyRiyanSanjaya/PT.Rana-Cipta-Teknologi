import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mobile_driver/config/theme_config.dart';
import 'package:mobile_driver/providers/auth_provider.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mobile_driver/config/theme_config.dart';
import 'package:mobile_driver/providers/auth_provider.dart';
import 'package:mobile_driver/screens/driver_registration_screen.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _isLoading = false;
  bool _obscureText = true;

  Future<void> _login() async {
    if (_emailCtrl.text.isEmpty || _passCtrl.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Mohon isi email dan password')));
      return;
    }

    setState(() => _isLoading = true);
    final navigator = Navigator.of(context);

    try {
      await Provider.of<AuthProvider>(context, listen: false)
          .login(_emailCtrl.text, _passCtrl.text);
      if (!mounted) return;
      navigator.pop(true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Login Gagal: $e')));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ThemeConfig.beigeBackground,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 60),
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: ThemeConfig.brandColor.withOpacity(0.1),
                      blurRadius: 20,
                      offset: const Offset(0, 10),
                    )
                  ],
                ),
                child: const Icon(Icons.directions_bike_rounded,
                    size: 64, color: ThemeConfig.brandColor),
              ).animate().scale(duration: 600.ms, curve: Curves.easeOutBack),
              const SizedBox(height: 32),
              Text(
                'Rana Driver',
                textAlign: TextAlign.center,
                style: GoogleFonts.outfit(
                  fontSize: 32, 
                  fontWeight: FontWeight.bold,
                  color: ThemeConfig.brandColor
                ),
              ).animate().fadeIn(delay: 200.ms),
              const SizedBox(height: 8),
              const Text(
                'Masuk untuk mulai menerima pesanan',
                textAlign: TextAlign.center,
                style: TextStyle(color: ThemeConfig.textSecondary),
              ).animate().fadeIn(delay: 400.ms),
              const SizedBox(height: 48),
              
              _buildInputField(
                controller: _emailCtrl,
                label: 'Email',
                icon: Icons.email_outlined,
                keyboardType: TextInputType.emailAddress,
              ).animate().fadeIn(delay: 600.ms).slideX(begin: -0.1),
              
              const SizedBox(height: 20),
              
              _buildInputField(
                controller: _passCtrl,
                label: 'Password',
                icon: Icons.lock_outline,
                obscureText: _obscureText,
                suffixIcon: IconButton(
                  icon: Icon(
                      _obscureText ? Icons.visibility_off : Icons.visibility),
                  onPressed: () =>
                      setState(() => _obscureText = !_obscureText),
                ),
              ).animate().fadeIn(delay: 700.ms).slideX(begin: 0.1),
              
              const SizedBox(height: 12),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: () {},
                  child: const Text('Lupa Password?', 
                    style: TextStyle(color: ThemeConfig.brandColor, fontWeight: FontWeight.w600)),
                ),
              ),
              
              const SizedBox(height: 32),
              
              ElevatedButton(
                onPressed: _isLoading ? null : _login,
                style: ElevatedButton.styleFrom(
                  backgroundColor: ThemeConfig.brandColor,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 18),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16)),
                  elevation: 4,
                  shadowColor: ThemeConfig.brandColor.withOpacity(0.4),
                ),
                child: _isLoading
                    ? const SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(
                            color: Colors.white, strokeWidth: 2.5))
                    : const Text('MASUK SEKARANG',
                        style: TextStyle(
                            fontSize: 16, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
              ).animate().fadeIn(delay: 900.ms).scale(),
              
              const SizedBox(height: 40),
              
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('Belum punya akun?', 
                    style: TextStyle(color: Colors.grey.shade600)),
                  TextButton(
                    onPressed: () {
                      Navigator.push<bool>(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const DriverRegistrationScreen()))
                      .then((ok) {
                        if (ok == true && mounted) {
                          // Handle post-registration logic if needed
                        }
                      });
                    },
                    child: const Text('Daftar Mitra', 
                      style: TextStyle(
                        color: ThemeConfig.brandColor, 
                        fontWeight: FontWeight.bold,
                        decoration: TextDecoration.underline
                      )),
                  )
                ],
              ).animate().fadeIn(delay: 1100.ms),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInputField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    bool obscureText = false,
    Widget? suffixIcon,
    TextInputType? keyboardType,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: TextField(
        controller: controller,
        obscureText: obscureText,
        keyboardType: keyboardType,
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: Icon(icon, color: ThemeConfig.brandColor, size: 22),
          suffixIcon: suffixIcon,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide.none,
          ),
          filled: true,
          fillColor: Colors.white,
          labelStyle: TextStyle(color: Colors.grey.shade500),
          floatingLabelStyle: const TextStyle(color: ThemeConfig.brandColor, fontWeight: FontWeight.bold),
        ),
      ),
    );
  }
}
