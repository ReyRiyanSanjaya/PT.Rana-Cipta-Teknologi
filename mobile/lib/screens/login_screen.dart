import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:provider/provider.dart';
import 'package:rana_merchant/providers/auth_provider.dart';
import 'package:rana_merchant/screens/register_screen.dart';
import 'package:rana_merchant/screens/home_screen.dart';
import 'package:rana_merchant/screens/onboarding_merchant_screen.dart';
import 'package:rana_merchant/config/theme_config.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:rana_merchant/services/biometric_service.dart'; // [NEW]

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _phoneCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _isLoading = false;
  final _formKey = GlobalKey<FormState>();
  bool _obscurePass = true;
  bool _rememberPhone = false;
  bool _canUseBiometric = false;

  @override
  void initState() {
    super.initState();
    _loadRememberedPhone();
    _checkBiometric();
  }

  Future<void> _checkBiometric() async {
    final enabled = await BiometricService().isBiometricEnabled();
    final supported = await BiometricService().isBiometricSupported();
    if (enabled && supported && mounted) {
      setState(() => _canUseBiometric = true);
      // Optional: Auto trigger? Maybe annoying. Let user tap button.
    }
  }

  Future<void> _loginBiometric() async {
    final authenticated = await BiometricService().authenticate();
    if (authenticated) {
      // Logic to auto-login
      // In real app, we need to securely store token/credentials.
      // For now, we simulate by using the remembered phone + stored password (if secure storage existed)
      // OR just bypassing if session token is valid.
      // Assuming we just want to bypass the manual entry for now if already "remembered".
      
      // Since we don't have secure storage implementation in this snippet, 
      // we'll assume if biometric passes, we try to login with remembered phone (if exists) 
      // or just navigate if we treat it as a session validation.
      
      // Let's implement a "Quick Login" flow
      if (_phoneCtrl.text.isNotEmpty) {
          // If phone is filled, we might need password. 
          // Ideally Biometric replaces password.
          // We will simulate a successful login here for demo purposes
          // In production: Retrieve encrypted password from SecureStorage using biometric key
          
          await Provider.of<AuthProvider>(context, listen: false).loginDemo(); // Simulating success
          if (!mounted) return;
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (_) => const HomeScreen()),
          );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Masukkan nomor HP terlebih dahulu')),
        );
      }
    }
  }

  Future<void> _loadRememberedPhone() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString('remembered_phone');
    if (saved != null && saved.isNotEmpty) {
      _phoneCtrl.text = saved;
      setState(() {
        _rememberPhone = true;
      });
    }
  }

  Future<void> _login() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _isLoading = true);
    try {
      final phone = _phoneCtrl.text.trim();
      final pass = _passCtrl.text;
      if (phone.toLowerCase() == 'demo' || (phone == '081234567890' && pass == 'demo123')) {
        await Provider.of<AuthProvider>(context, listen: false).loginDemo();
      } else {
        await Provider.of<AuthProvider>(context, listen: false).login(phone, pass);
      }
      final prefs = await SharedPreferences.getInstance();
      if (_rememberPhone) {
        await prefs.setString('remembered_phone', phone);
      } else {
        await prefs.remove('remembered_phone');
      }
      if (!mounted) return;
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const HomeScreen()),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(e.toString()),
        backgroundColor: Theme.of(context).colorScheme.error,
      ));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            return SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
              child: Align(
                alignment: Alignment.topCenter,
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 640),
                  child: ConstrainedBox(
                    constraints: BoxConstraints(minHeight: constraints.maxHeight - 48),
                    child: IntrinsicHeight(
                      child: Column(
                    children: [
                      Container(
                        width: double.infinity,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              scheme.primary.withOpacity(0.18),
                              scheme.primary.withOpacity(0.08),
                            ],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(24),
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 28),
                        child: Column(
                          children: [
                            Icon(Icons.storefront, size: 64, color: scheme.primary)
                                .animate()
                                .scale(duration: 600.ms, curve: Curves.elasticOut),
                            const SizedBox(height: 12),
                            Text(
                              'Rana POS',
                              style: Theme.of(context).textTheme.headlineMedium,
                            )
                                .animate()
                                .fadeIn(delay: 300.ms)
                                .slideY(begin: 0.3),
                            const SizedBox(height: 4),
                            Text(
                              'Masuk untuk mulai berjualan',
                              style: Theme.of(context).textTheme.bodyMedium,
                            ).animate().fadeIn(delay: 450.ms),
                          ],
                        ),
                      ).animate().fadeIn(duration: 350.ms).slideY(begin: 0.2),
                      const SizedBox(height: 20),
                      Card(
                        elevation: 2,
                        child: Padding(
                          padding: const EdgeInsets.all(20.0),
                          child: Form(
                            key: _formKey,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                TextFormField(
                                  controller: _phoneCtrl,
                                  keyboardType: TextInputType.phone,
                                  textInputAction: TextInputAction.next,
                                  autofillHints: const [AutofillHints.telephoneNumber],
                                  decoration: const InputDecoration(
                                    labelText: 'Nomor HP / WhatsApp',
                                    helperText: 'Contoh: 0812… atau +62812…',
                                    prefixIcon: Icon(Icons.phone_iphone),
                                  ),
                                  validator: (v) {
                                    final value = (v ?? '').trim();
                                    if (value.isEmpty) {
                                      return 'Nomor HP wajib diisi';
                                    }
                                    if (value.length < 8) {
                                      return 'Nomor HP tidak valid';
                                    }
                                    return null;
                                  },
                                ),
                                const SizedBox(height: 16),
                                TextFormField(
                                  controller: _passCtrl,
                                  obscureText: _obscurePass,
                                  textInputAction: TextInputAction.done,
                                  autofillHints: const [AutofillHints.password],
                                  decoration: InputDecoration(
                                    labelText: 'Password',
                                    helperText: 'Minimal 6 karakter',
                                    prefixIcon: const Icon(Icons.lock_outline),
                                    suffixIcon: IconButton(
                                      tooltip: _obscurePass ? 'Tampilkan' : 'Sembunyikan',
                                      icon: Icon(
                                        _obscurePass ? Icons.visibility : Icons.visibility_off,
                                      ),
                                      onPressed: () {
                                        setState(() {
                                          _obscurePass = !_obscurePass;
                                        });
                                      },
                                    ),
                                  ),
                                  onFieldSubmitted: (_) async => await _login(),
                                  validator: (v) {
                                    final value = v ?? '';
                                    if (value.isEmpty) {
                                      return 'Password wajib diisi';
                                    }
                                    if (value.length < 6) {
                                      return 'Minimal 6 karakter';
                                    }
                                    return null;
                                  },
                                ),
                                const SizedBox(height: 12),
                                Row(
                                  children: [
                                    Checkbox(
                                      value: _rememberPhone,
                                      onChanged: (v) {
                                        setState(() {
                                          _rememberPhone = v ?? false;
                                        });
                                      },
                                    ),
                                    const SizedBox(width: 4),
                                    const Text('Ingat nomor'),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Align(
                                  alignment: Alignment.centerRight,
                                  child: TextButton(
                                    onPressed: () {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(content: Text('Hubungi admin untuk reset password')),
                                      );
                                    },
                                    child: const Text('Lupa password?'),
                                  ),
                                ),
                                const SizedBox(height: 8),
                                if (_canUseBiometric)
                                  Container(
                                    width: double.infinity,
                                    margin: const EdgeInsets.only(bottom: 12),
                                    child: OutlinedButton.icon(
                                      onPressed: _isLoading ? null : _loginBiometric,
                                      icon: const Icon(Icons.fingerprint),
                                      label: const Text('Masuk dengan Biometrik'),
                                      style: OutlinedButton.styleFrom(
                                        padding: const EdgeInsets.symmetric(vertical: 12),
                                      ),
                                    ),
                                  ),
                                SizedBox(
                                  width: double.infinity,
                                  child: FilledButton(
                                    onPressed: _isLoading
                                        ? null
                                        : () async {
                                            await _login();
                                          },
                                    child: _isLoading
                                        ? const SizedBox(
                                            height: 22,
                                            width: 22,
                                            child: CircularProgressIndicator(strokeWidth: 2),
                                          )
                                        : const Text('Masuk'),
                                  ),
                                ),
                                const SizedBox(height: 8),
                                SizedBox(
                                  width: double.infinity,
                                  child: OutlinedButton(
                                    onPressed: _isLoading
                                        ? null
                                        : () async {
                                            _phoneCtrl.text = '081234567890';
                                            _passCtrl.text = 'demo123';
                                            await _login();
                                          },
                                    child: const Text('Coba Demo (Offline)'),
                                  ),
                                ),
                              ].animate(interval: 50.ms, delay: 200.ms).fadeIn(duration: 400.ms, curve: Curves.easeOutQuad).slideY(begin: 0.2, curve: Curves.easeOutQuad),
                            ),
                          ),
                        ),
                      ).animate().fadeIn().slideY(begin: 0.15),
                      const Spacer(),
                      OutlinedButton.icon(
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const RegisterScreen()),
                          );
                        },
                        icon: const Icon(Icons.person_add_alt_1),
                        label: const Text('Belum punya akun? Daftar gratis'),
                      ).animate().fadeIn(delay: 250.ms),
                    ],
                      ),
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
