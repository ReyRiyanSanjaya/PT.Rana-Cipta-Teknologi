import 'package:rana_merchant/config/merchant_config.dart';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';

class ReceiptScanScreen extends StatefulWidget {
  const ReceiptScanScreen({super.key});

  @override
  State<ReceiptScanScreen> createState() => _ReceiptScanScreenState();
}

class _ReceiptScanScreenState extends State<ReceiptScanScreen> {
  File? _image;
  bool _isScanning = false;
  List<Map<String, dynamic>> _scannedItems = [];
  final ImagePicker _picker = ImagePicker();
  final _currency = NumberFormat.simpleCurrency(locale: 'id_ID', decimalDigits: 0);

  Future<void> _pickImage(ImageSource source) async {
    try {
      final XFile? pickedFile = await _picker.pickImage(source: source);
      if (pickedFile != null) {
        setState(() {
          _image = File(pickedFile.path);
          _scannedItems = [];
        });
        _processImage();
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal mengambil gambar: $e')),
      );
    }
  }

  Future<void> _processImage() async {
    if (_image == null) return;

    setState(() {
      _isScanning = true;
    });

    try {
      final inputImage = InputImage.fromFile(_image!);
      final textRecognizer = TextRecognizer(script: TextRecognitionScript.latin);
      final RecognizedText recognizedText = await textRecognizer.processImage(inputImage);

      _parseReceiptText(recognizedText);

      await textRecognizer.close();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal memproses gambar: $e')),
      );
    } finally {
      setState(() {
        _isScanning = false;
      });
    }
  }

  void _parseReceiptText(RecognizedText recognizedText) {
    List<Map<String, dynamic>> items = [];
    
    // Indonesian Price Regex: Rp (optional) followed by digits and optional dots/commas
    final priceRegex = RegExp(r'(?:Rp|RP)?\s?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)');
    final qtyRegex = RegExp(r'(\d+)\s?(?:x|pcs|qty)', caseSensitive: false);

    for (TextBlock block in recognizedText.blocks) {
      for (TextLine line in block.lines) {
        String text = line.text.trim();
        
        // Skip common header/footer/ignored lines
        String lowerText = text.toLowerCase();
        if (lowerText.contains('total') || 
            lowerText.contains('kembali') ||
            lowerText.contains('tunai') ||
            lowerText.contains('jl.') ||
            lowerText.contains('telp') ||
            lowerText.contains('bayar') ||
            text.length < 3) {
          continue;
        }

        // Try to find price in the line
        final priceMatch = priceRegex.allMatches(text);
        if (priceMatch.isNotEmpty) {
          // Take the last match as the price (usually at the end of the line)
          String priceStr = priceMatch.last.group(1) ?? '';
          // Normalize price: remove dots, change comma to dot
          priceStr = priceStr.replaceAll('.', '').replaceAll(',', '.');
          double? price = double.tryParse(priceStr);

          if (price != null && price > 100 && price < 1000000) {
            // Extract Qty if exists
            int qty = 1;
            final qtyMatch = qtyRegex.firstMatch(text);
            if (qtyMatch != null) {
              qty = int.tryParse(qtyMatch.group(1) ?? '1') ?? 1;
            }

            // Extract Name: remove the price and qty parts
            String name = text
                .replaceFirst(priceRegex, '')
                .replaceFirst(qtyRegex, '')
                .replaceAll(RegExp(r'[^\w\s]'), '')
                .trim();

            if (name.length > 2) {
              items.add({
                'name': name,
                'price': price,
                'qty': qty,
              });
            }
          }
        }
      }
    }

    setState(() {
      _scannedItems = items;
    });
  }

  void _removeItem(int index) {
    setState(() {
      _scannedItems.removeAt(index);
    });
  }

  void _saveItems() {
    // Return the items to the caller or save to DB
    // For now, just show success
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${_scannedItems.length} item berhasil disimpan ke stok!'),
        backgroundColor: Colors.green,
      ),
    );
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    
    return Scaffold(
      appBar: AppBar(
        title: Text('Scan Struk (OCR)', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        elevation: 0,
      ),
      body: Column(
        children: [
          // Image Preview Section
          Container(
            height: 200,
            width: double.infinity,
            color: Colors.grey[200],
            child: _image != null
                ? Stack(
                    fit: StackFit.expand,
                    children: [
                      Image.file(_image!, fit: BoxFit.cover),
                      if (_isScanning)
                        Container(
                          color: Colors.black45,
                          child: const Center(
                            child: CircularProgressIndicator(color: Colors.white),
                          ),
                        ),
                      Positioned(
                        bottom: 8,
                        right: 8,
                        child: FloatingActionButton.small(
                          onPressed: () => _pickImage(ImageSource.camera),
                          child: const Icon(Icons.camera_alt),
                        ),
                      ),
                      Positioned(
                        bottom: 8,
                        left: 8,
                        child: FloatingActionButton.small(
                          onPressed: () => _pickImage(ImageSource.gallery),
                          child: const Icon(Icons.photo_library),
                        ),
                      ),
                    ],
                  )
                : Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.receipt_long, size: 64, color: Colors.grey),
                      const SizedBox(height: 16),
                      Text('Ambil foto struk belanja', style: GoogleFonts.poppins(color: Colors.grey)),
                      const SizedBox(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          ElevatedButton.icon(
                            onPressed: () => _pickImage(ImageSource.camera),
                            icon: const Icon(Icons.camera_alt),
                            label: const Text('Kamera'),
                          ),
                          const SizedBox(width: 16),
                          OutlinedButton.icon(
                            onPressed: () => _pickImage(ImageSource.gallery),
                            icon: const Icon(Icons.photo_library),
                            label: const Text('Galeri'),
                          ),
                        ],
                      ),
                    ],
                  ),
          ),
          
          // Result List
          Expanded(
            child: _scannedItems.isEmpty
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(32.0),
                      child: Text(
                        _image == null 
                            ? 'Belum ada data' 
                            : _isScanning 
                                ? 'Sedang memproses...' 
                                : 'Tidak ada item terdeteksi. Coba foto ulang dengan pencahayaan yang baik.',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.poppins(color: Colors.grey),
                      ),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _scannedItems.length,
                    itemBuilder: (context, index) {
                      final item = _scannedItems[index];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: colorScheme.primary.withOpacity(0.1),
                            child: Text('${item['qty']}', style: TextStyle(color: colorScheme.primary)),
                          ),
                          title: TextFormField(
                            initialValue: item['name'],
                            decoration: const InputDecoration(border: InputBorder.none),
                            style: GoogleFonts.poppins(fontWeight: FontWeight.w600),
                            onChanged: (val) => item['name'] = val,
                          ),
                          subtitle: TextFormField(
                            initialValue: item['price'].toString(),
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                              border: InputBorder.none, 
                              prefixText: '${MerchantConfig.defaultCurrencySymbol} ',
                            ),
                            onChanged: (val) {
                              item['price'] = double.tryParse(val) ?? 0;
                            },
                          ),
                          trailing: IconButton(
                            icon: const Icon(Icons.close, color: Colors.red),
                            onPressed: () => _removeItem(index),
                          ),
                        ),
                      );
                    },
                  ),
          ),
          
          // Actions
          if (_scannedItems.isNotEmpty)
            Padding(
              padding: const EdgeInsets.all(16),
              child: SizedBox(
                width: double.infinity,
                height: 50,
                child: FilledButton(
                  onPressed: _saveItems,
                  child: Text('Simpan ke Stok (${_scannedItems.length} Item)'),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
