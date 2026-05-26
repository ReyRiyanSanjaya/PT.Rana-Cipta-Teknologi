import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:barcode_widget/barcode_widget.dart';
import 'package:screenshot/screenshot.dart';
import 'package:share_plus/share_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'package:flutter/services.dart';
import 'package:rana_merchant/services/printer_service.dart';
import 'package:rana_merchant/config/theme_config.dart';

class ProductBarcodeScreen extends StatefulWidget {
  final String sku;
  final String? name;
  const ProductBarcodeScreen({super.key, required this.sku, this.name});

  @override
  State<ProductBarcodeScreen> createState() => _ProductBarcodeScreenState();
}

class _ProductBarcodeScreenState extends State<ProductBarcodeScreen> {
  final ScreenshotController _screenshotController = ScreenshotController();
  bool _saving = false;

  Future<File> _captureToFile() async {
    final Uint8List? pngBytes =
        await _screenshotController.capture(pixelRatio: 2.0);
    final dir = await getTemporaryDirectory();
    final file = File('${dir.path}/barcode_${widget.sku}.png');
    if (pngBytes != null) {
      await file.writeAsBytes(pngBytes);
      return file;
    }
    throw Exception('Gagal membuat gambar barcode');
  }

  Future<void> _saveImage() async {
    setState(() => _saving = true);
    try {
      final file = await _captureToFile();
      if (!mounted) return;
      HapticFeedback.lightImpact();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Disimpan: ${file.path}')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Gagal simpan: $e'),
          backgroundColor: ThemeConfig.colorError,
        ),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _shareImage() async {
    try {
      final file = await _captureToFile();
      await Share.shareXFiles([XFile(file.path)], text: 'Barcode ${widget.sku}');
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Gagal bagikan: $e'),
          backgroundColor: ThemeConfig.colorError,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final isDark = colorScheme.brightness == Brightness.dark;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Barcode Produk'),
        actions: [
          IconButton(
            tooltip: 'Salin SKU',
            icon: const Icon(Icons.content_copy),
            onPressed: () async {
              await Clipboard.setData(ClipboardData(text: widget.sku));
              if (!mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('SKU disalin')),
              );
            },
          ),
          PopupMenuButton<String>(
            tooltip: 'Menu',
            onSelected: (value) async {
              switch (value) {
                case 'save':
                  if (!_saving) await _saveImage();
                  break;
                case 'share':
                  await _shareImage();
                  break;
                case 'print':
                  try {
                    final png = await _screenshotController.capture(pixelRatio: 2.0);
                    if (png == null) {
                      throw Exception('Gagal membuat gambar');
                    }
                    final ok = await PrinterService().printBarcodeImage(
                      png,
                      title: widget.name ?? 'Barcode Produk',
                    );
                    if (!mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                      content:
                          Text(ok ? 'Cetak terkirim ke printer' : 'Gagal mengirim cetak'),
                    ));
                  } catch (e) {
                    if (!mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                      content: Text('Gagal cetak: $e'),
                      backgroundColor: ThemeConfig.colorError,
                    ));
                  }
                  break;
                case 'copy_name':
                  final name = widget.name ?? '';
                  if (name.isEmpty) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Nama produk kosong')),
                    );
                    return;
                  }
                  await Clipboard.setData(ClipboardData(text: name));
                  if (!mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Nama produk disalin')),
                  );
                  break;
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'save',
                child: ListTile(
                  leading: Icon(Icons.download),
                  title: Text('Simpan Gambar'),
                ),
              ),
              const PopupMenuItem(
                value: 'share',
                child: ListTile(
                  leading: Icon(Icons.share),
                  title: Text('Bagikan Gambar'),
                ),
              ),
              const PopupMenuItem(
                value: 'print',
                child: ListTile(
                  leading: Icon(Icons.print),
                  title: Text('Cetak Barcode'),
                ),
              ),
              const PopupMenuItem(
                value: 'copy_name',
                child: ListTile(
                  leading: Icon(Icons.content_paste_go),
                  title: Text('Salin Nama Produk'),
                ),
              ),
            ],
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Screenshot(
              controller: _screenshotController,
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isDark ? colorScheme.surface : Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.06),
                      blurRadius: 12,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    BarcodeWidget(
                      barcode: Barcode.code128(),
                      data: widget.sku,
                      width: double.infinity,
                      height: 160,
                      drawText: true,
                      color: colorScheme.onSurface,
                      style: const TextStyle(fontSize: 14),
                    ),
                    const SizedBox(height: 12),
                    if ((widget.name ?? '').isNotEmpty)
                      Text(
                        widget.name!,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: colorScheme.onSurface,
                        ),
                      ),
                    Text(
                      'SKU: ${widget.sku}',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: colorScheme.onSurface.withOpacity(0.7),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: FilledButton.icon(
                    onPressed: _saving ? null : _saveImage,
                    icon: const Icon(Icons.download),
                    label: const Text('Simpan'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _shareImage,
                    icon: const Icon(Icons.share),
                    label: const Text('Bagikan'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () async {
                      try {
                        final png = await _screenshotController.capture(pixelRatio: 2.0);
                        if (png == null) throw Exception('Gagal membuat gambar');
                        final ok = await PrinterService().printBarcodeImage(
                          png,
                          title: widget.name ?? 'Barcode Produk',
                        );
                        if (!mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                          content: Text(ok ? 'Cetak terkirim ke printer' : 'Gagal mengirim cetak'),
                          backgroundColor: ok ? null : ThemeConfig.colorError,
                        ));
                      } catch (e) {
                        if (!mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                          content: Text('Gagal cetak: $e'),
                          backgroundColor: ThemeConfig.colorError,
                        ));
                      }
                    },
                    icon: const Icon(Icons.print),
                    label: const Text('Cetak'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
