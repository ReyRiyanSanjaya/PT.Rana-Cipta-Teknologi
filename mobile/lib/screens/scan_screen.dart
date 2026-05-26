import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:rana_merchant/services/order_service.dart';
import 'package:flutter/services.dart';
import 'package:permission_handler/permission_handler.dart';

class ScanScreen extends StatefulWidget {
  const ScanScreen({super.key});

  @override
  State<ScanScreen> createState() => _ScanScreenState();
}

class _ScanLinePainter extends CustomPainter {
  final Rect cutOutRect;
  final double progress;
  final Color color;
  final double thickness;

  _ScanLinePainter({
    required this.cutOutRect,
    required this.progress,
    required this.color,
    required this.thickness,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final y = cutOutRect.top + progress * cutOutRect.height;
    final p = Paint()
      ..color = color
      ..strokeWidth = thickness
      ..style = PaintingStyle.stroke;
    final start = Offset(cutOutRect.left, y);
    final end = Offset(cutOutRect.right, y);
    canvas.drawLine(start, end, p);
  }

  @override
  bool shouldRepaint(covariant _ScanLinePainter oldDelegate) {
    return oldDelegate.progress != progress ||
        oldDelegate.cutOutRect != cutOutRect ||
        oldDelegate.color != color ||
        oldDelegate.thickness != thickness;
  }
}
class _ScannerMaskPainter extends CustomPainter {
  final Rect cutOutRect;
  final double borderRadius;
  final Color overlayColor;
  final Color borderColor;
  final double borderWidth;

  _ScannerMaskPainter({
    required this.cutOutRect,
    required this.borderRadius,
    required this.overlayColor,
    required this.borderColor,
    required this.borderWidth,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final layerPaint = Paint();
    canvas.saveLayer(Offset.zero & size, layerPaint);
    final overlayPaint = Paint()..color = overlayColor;
    canvas.drawRect(Offset.zero & size, overlayPaint);

    final clearPaint = Paint()..blendMode = BlendMode.clear;
    final rrect =
        RRect.fromRectAndRadius(cutOutRect, Radius.circular(borderRadius));
    canvas.drawRRect(rrect, clearPaint);
    canvas.restore();

    final borderPaint = Paint()
      ..color = borderColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = borderWidth;
    canvas.drawRRect(rrect, borderPaint);
  }

  @override
  bool shouldRepaint(covariant _ScannerMaskPainter oldDelegate) {
    return oldDelegate.cutOutRect != cutOutRect ||
        oldDelegate.overlayColor != overlayColor ||
        oldDelegate.borderColor != borderColor ||
        oldDelegate.borderWidth != borderWidth ||
        oldDelegate.borderRadius != borderRadius;
  }
}

class _ScanScreenState extends State<ScanScreen> with SingleTickerProviderStateMixin {
  final MobileScannerController _scannerController = MobileScannerController();
  bool _isProcessing = false;
  @override
  void initState() {
    super.initState();
    _lineController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..addListener(() {
        setState(() {
          _lineProgress = _lineController.value;
        });
      });
    _lineController.repeat(reverse: true);
  }
  late final AnimationController _lineController;
  double _lineProgress = 0.0;
  bool _torchOn = false;
  bool _usingFrontCamera = false;

  void _onDetect(BarcodeCapture capture) async {
    if (_isProcessing) return;
    final List<Barcode> barcodes = capture.barcodes;

    for (final barcode in barcodes) {
      if (barcode.rawValue != null) {
        setState(() => _isProcessing = true);
        final code = barcode.rawValue!;
        await _scannerController.stop();

        try {
          final order = await OrderService().scanQrOrder(code);

          if (mounted) {
            HapticFeedback.mediumImpact();
            await SystemSound.play(SystemSoundType.click);
            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                content: Text('Scan berhasil! Pesanan sudah terverifikasi.'),
                backgroundColor: Color(0xFFE07A5F)));
            if (Navigator.of(context).canPop()) {
              Navigator.pop(context, order);
            }
          }
        } catch (e) {
          if (mounted) {
            HapticFeedback.lightImpact();
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                content: Text('Scan gagal, coba lagi ya. ($e)'),
                backgroundColor: const Color(0xFFE07A5F)));
            await Future.delayed(const Duration(seconds: 2));
            setState(() => _isProcessing = false);
            await _scannerController.start();
          }
        }
        break;
      }
    }
  }

  Future<void> _enterManualCode() async {
    final controller = TextEditingController();
    final formKey = GlobalKey<FormState>();
    await showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Masukkan Kode Manual'),
        content: Form(
          key: formKey,
          child: TextFormField(
            controller: controller,
            decoration: const InputDecoration(
              labelText: 'Kode / Nomor Order',
              prefixIcon: Icon(Icons.qr_code),
            ),
            validator: (v) => (v == null || v.trim().isEmpty)
                ? 'Tidak boleh kosong'
                : null,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Batal'),
          ),
          FilledButton(
            onPressed: () async {
              if (!(formKey.currentState?.validate() ?? false)) return;
              final code = controller.text.trim();
              setState(() => _isProcessing = true);
              try {
                final order = await OrderService().scanQrOrder(code);
                if (!mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                    content: Text('Verifikasi berhasil!'),
                    backgroundColor: Color(0xFFE07A5F)));
                Navigator.of(ctx).pop();
                if (Navigator.of(context).canPop()) {
                  Navigator.pop(context, order);
                }
              } catch (e) {
                if (!mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                  content: Text('Gagal verifikasi: $e'),
                  backgroundColor: const Color(0xFFE07A5F),
                ));
                setState(() => _isProcessing = false);
              }
            },
            child: const Text('Verifikasi'),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _lineController.dispose();
    _scannerController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final bool isDarkTheme = colorScheme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor:
          isDarkTheme ? colorScheme.surface : const Color(0xFFFFF8F0),
      appBar: AppBar(
        title: Text(
          'Scan QR Pickup',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            color: isDarkTheme ? colorScheme.onPrimary : const Color(0xFFE07A5F),
          ),
        ),
        backgroundColor: isDarkTheme ? Colors.transparent : const Color(0xFFFFF8F0),
        iconTheme: IconThemeData(
          color: isDarkTheme ? colorScheme.onPrimary : const Color(0xFFE07A5F),
        ),
        centerTitle: true,
        elevation: 0,
        foregroundColor:
            isDarkTheme ? colorScheme.onPrimary : const Color(0xFFE07A5F),
      ),
      body: Stack(
        children: [
          Positioned.fill(
            child: MobileScanner(
              controller: _scannerController,
              onDetect: _onDetect,
              errorBuilder: (context, error, child) {
                return Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.camera_alt_outlined, size: 48),
                        const SizedBox(height: 12),
                        Text(
                          'Kamera tidak tersedia atau izin ditolak.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Theme.of(context).colorScheme.onSurface),
                        ),
                        const SizedBox(height: 12),
                        FilledButton(
                          onPressed: () async {
                            await openAppSettings();
                          },
                          child: const Text('Buka Pengaturan'),
                        )
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          Positioned(
            top: 16,
            left: 16,
            right: 16,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: isDarkTheme
                    ? colorScheme.surface.withOpacity(0.75)
                    : Colors.white.withOpacity(0.85),
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.08),
                    blurRadius: 12,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Arahkan kamera ke QR Code',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: colorScheme.onSurface,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Pastikan QR berada dalam kotak pemindaian',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: colorScheme.onSurface.withOpacity(0.7),
                    ),
                  ),
                ],
              ),
            ),
          ),
          LayoutBuilder(
            builder: (context, constraints) {
              final double width = constraints.maxWidth;
              final double height = constraints.maxHeight;
              final double boxSize = width * 0.75;
              final double left = (width - boxSize) / 2;
              final double top = (height - boxSize) / 2;
              final rect = Rect.fromLTWH(left, top, boxSize, boxSize);
              return CustomPaint(
                size: Size(width, height),
                painter: _ScannerMaskPainter(
                  cutOutRect: rect,
                  borderRadius: 20,
                  overlayColor: Colors.black.withOpacity(0.45),
                  borderColor: colorScheme.primary,
                  borderWidth: 3,
                ),
              );
            },
          ),
          LayoutBuilder(
            builder: (context, constraints) {
              final double width = constraints.maxWidth;
              final double height = constraints.maxHeight;
              final double boxSize = width * 0.75;
              final double left = (width - boxSize) / 2;
              final double top = (height - boxSize) / 2;
              final rect = Rect.fromLTWH(left, top, boxSize, boxSize);
              return CustomPaint(
                size: Size(width, height),
                painter: _ScanLinePainter(
                  cutOutRect: rect,
                  progress: _lineProgress,
                  color:
                      _isProcessing ? colorScheme.secondary : colorScheme.primary,
                  thickness: _isProcessing ? 3 : 2,
                ),
              );
            },
          ),
          // Controls
          Positioned(
            left: 16,
            right: 16,
            bottom: 24,
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDarkTheme
                    ? colorScheme.surfaceVariant
                    : Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.08),
                    blurRadius: 12,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Row(
                children: [
                  IconButton.filled(
                    onPressed: () async {
                      await _scannerController.toggleTorch();
                      setState(() => _torchOn = !_torchOn);
                    },
                    icon: Icon(_torchOn ? Icons.flash_on : Icons.flashlight_off),
                    tooltip: 'Flash',
                  ),
                  const SizedBox(width: 12),
                  IconButton.filled(
                    onPressed: () async {
                      await _scannerController.switchCamera();
                      setState(() => _usingFrontCamera = !_usingFrontCamera);
                    },
                    icon: Icon(_usingFrontCamera
                        ? Icons.camera_front
                        : Icons.camera_rear),
                    tooltip: 'Ganti Kamera',
                  ),
                  const Spacer(),
                  TextButton.icon(
                    onPressed: _isProcessing
                        ? null
                        : () async {
                            try {
                              await _enterManualCode();
                            } catch (_) {
                              HapticFeedback.lightImpact();
                            }
                          },
                    icon: const Icon(Icons.edit),
                    label: const Text('Masukkan Kode'),
                  ),
                  const SizedBox(width: 12),
                  if (_isProcessing)
                    SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: colorScheme.primary,
                      ),
                    )
                  else
                    const Icon(Icons.qr_code_scanner, size: 28),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
