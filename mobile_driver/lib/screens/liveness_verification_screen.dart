import 'dart:async';
import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:google_fonts/google_fonts.dart';

class LivenessVerificationScreen extends StatefulWidget {
  const LivenessVerificationScreen({Key? key}) : super(key: key);

  @override
  State<LivenessVerificationScreen> createState() => _LivenessVerificationScreenState();
}

class _LivenessVerificationScreenState extends State<LivenessVerificationScreen> {
  CameraController? _controller;
  bool _isInit = false;

  @override
  void initState() {
    super.initState();
    _initCamera();
  }

  Future<void> _initCamera() async {
    try {
      final cameras = await availableCameras();
      final frontCamera = cameras.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.front,
        orElse: () => cameras.first,
      );

      _controller = CameraController(frontCamera, ResolutionPreset.medium);
      await _controller!.initialize();
      setState(() {
        _isInit = true;
      });

      // Simulasi proses verifikasi AI setelah 3 detik
      Future.delayed(const Duration(seconds: 3), () {
        if (mounted) {
          Navigator.pop(context, true); // Verified
        }
      });
    } catch (e) {
      debugPrint("Camera error: $e");
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          if (_isInit && _controller != null)
            SizedBox.expand(
              child: CameraPreview(_controller!),
            )
          else
            const Center(child: CircularProgressIndicator(color: Colors.green)),
          
          SafeArea(
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: Text(
                    'Verifikasi Keamanan',
                    style: GoogleFonts.outfit(
                      color: Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 32),
                  child: Text(
                    'Posisikan wajah Anda di dalam area terang untuk memastikan Anda adalah pemilik akun yang sah sebelum beroperasi.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.white.withOpacity(0.8)),
                  ),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.black54,
                    shape: BoxShape.circle,
                  ),
                  child: const CircularProgressIndicator(color: Colors.green),
                ),
                const SizedBox(height: 20),
                Text(
                  'Sedang Menganalisis Biometrik...',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 48),
              ],
            ),
          ),
          
          // Kamera frame (oval overlay)
          ColorFiltered(
            colorFilter: ColorFilter.mode(
              Colors.black.withOpacity(0.7),
              BlendMode.srcOut,
            ),
            child: Stack(
              children: [
                Container(
                  decoration: const BoxDecoration(
                    color: Colors.transparent,
                  ),
                ),
                Center(
                  child: Container(
                    height: 350,
                    width: 250,
                    decoration: BoxDecoration(
                      color: Colors.black,
                      borderRadius: BorderRadius.circular(150),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
