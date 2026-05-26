import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:google_fonts/google_fonts.dart';

class WholesaleScanScreen extends StatefulWidget {
  const WholesaleScanScreen({super.key});

  @override
  State<WholesaleScanScreen> createState() => _WholesaleScanScreenState();
}

class _WholesaleScanScreenState extends State<WholesaleScanScreen> {
  final MobileScannerController _scannerController = MobileScannerController();
  bool _isProcessing = false;

  @override
  void dispose() {
    _scannerController.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_isProcessing) return;
    final List<Barcode> barcodes = capture.barcodes;

    for (final barcode in barcodes) {
      if (barcode.rawValue != null) {
        setState(() => _isProcessing = true);
        final String code = barcode.rawValue!;
        Navigator.pop(context, code);
        break;
      }
    }
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
          'Scan Terima Barang',
          style: GoogleFonts.poppins(
            fontWeight: FontWeight.bold,
            color: isDarkTheme ? colorScheme.onPrimary : const Color(0xFFE07A5F),
          ),
        ),
        backgroundColor: isDarkTheme ? Colors.transparent : const Color(0xFFFFF8F0),
        iconTheme: IconThemeData(
          color: isDarkTheme ? colorScheme.onPrimary : const Color(0xFFE07A5F),
        ),
        elevation: 0,
        foregroundColor:
            isDarkTheme ? colorScheme.onPrimary : const Color(0xFFE07A5F),
      ),
      body: Column(
        children: [
          Expanded(
            child: MobileScanner(
              controller: _scannerController,
              onDetect: _onDetect,
            ),
          ),
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: isDarkTheme
                  ? colorScheme.surfaceVariant
                  : Colors.white,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: Column(
              children: [
                Text(
                  'Arahkan kamera ke QR Code',
                  style: GoogleFonts.poppins(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: colorScheme.onSurface,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Scan QR Code pada paket untuk konfirmasi penerimaan barang',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.poppins(
                    color: colorScheme.onSurface.withOpacity(0.7),
                  ),
                ),
                const SizedBox(height: 24),
                if (_isProcessing)
                  CircularProgressIndicator(color: colorScheme.primary)
                else
                  Icon(
                    Icons.qr_code_scanner,
                    size: 48,
                    color: colorScheme.primary,
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
