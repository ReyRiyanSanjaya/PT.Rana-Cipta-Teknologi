import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:rana_market/config/theme_config.dart';
import 'package:rana_market/data/market_api_service.dart';

class RideRatingScreen extends StatefulWidget {
  final Map<String, dynamic> orderData;
  final Map<String, dynamic>? driverInfo;

  const RideRatingScreen({super.key, required this.orderData, this.driverInfo});

  @override
  State<RideRatingScreen> createState() => _RideRatingScreenState();
}

class _RideRatingScreenState extends State<RideRatingScreen> {
  int _rating = 5;
  final _commentCtrl = TextEditingController();
  bool _isSubmitting = false;
  double _tipAmount = 0;
  final List<String> _quickFeedback = [
    'Ramah',
    'Cepat',
    'Aman',
    'Bersih',
    'Tahu Jalan',
  ];
  final Set<String> _selectedFeedback = {};
  final List<double> _tipOptions = [0, 2000, 5000, 10000, 20000];

  @override
  Widget build(BuildContext context) {
    final driverName = widget.driverInfo?['name'] ?? 'Driver';
    final driverPlate = widget.driverInfo?['plate'] ?? '-';
    final price = (widget.orderData['price'] as num?)?.toDouble() ?? 0;

    return Scaffold(
      backgroundColor: ThemeConfig.beigeBackground,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const SizedBox(height: 32),
              const Icon(Icons.check_circle_rounded, color: Colors.green, size: 72)
                  .animate().scale(curve: Curves.elasticOut),
              const SizedBox(height: 20),
              Text('Perjalanan Selesai!',
                  style: GoogleFonts.outfit(fontSize: 24, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Text('Rp${ThemeConfig.formatCurrency(price)}',
                  style: GoogleFonts.outfit(fontSize: 32, fontWeight: FontWeight.w800, color: ThemeConfig.brandColor)),
              const SizedBox(height: 32),

              // Driver info card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 28,
                      backgroundColor: ThemeConfig.brandColor.withOpacity(0.1),
                      child: Text(driverName[0].toUpperCase(),
                          style: GoogleFonts.outfit(fontSize: 24, fontWeight: FontWeight.bold, color: ThemeConfig.brandColor)),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(driverName, style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16)),
                          Text(driverPlate, style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),

              // Rating stars
              Text('Beri Rating', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(5, (index) {
                  return GestureDetector(
                    onTap: () => setState(() => _rating = index + 1),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 6),
                      child: Icon(
                        index < _rating ? Icons.star_rounded : Icons.star_outline_rounded,
                        color: Colors.amber,
                        size: 44,
                      ),
                    ),
                  );
                }),
              ),
              const SizedBox(height: 24),

              // Quick feedback chips
              Wrap(
                spacing: 8,
                runSpacing: 8,
                alignment: WrapAlignment.center,
                children: _quickFeedback.map((label) {
                  final isSelected = _selectedFeedback.contains(label);
                  return GestureDetector(
                    onTap: () {
                      setState(() {
                        if (isSelected) {
                          _selectedFeedback.remove(label);
                        } else {
                          _selectedFeedback.add(label);
                        }
                      });
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      decoration: BoxDecoration(
                        color: isSelected ? ThemeConfig.brandColor : Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: isSelected ? ThemeConfig.brandColor : Colors.grey.shade300,
                        ),
                      ),
                      child: Text(label,
                          style: TextStyle(
                            color: isSelected ? Colors.white : Colors.grey.shade700,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                          )),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 24),

              // Comment field
              TextField(
                controller: _commentCtrl,
                maxLines: 3,
                decoration: InputDecoration(
                  hintText: 'Tulis komentar (opsional)...',
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
              const SizedBox(height: 32),

              // Tip section
              Text('Beri Tip (Opsional)', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                alignment: WrapAlignment.center,
                children: _tipOptions.map((amount) {
                  final isSelected = _tipAmount == amount;
                  return GestureDetector(
                    onTap: () => setState(() => _tipAmount = amount),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      decoration: BoxDecoration(
                        color: isSelected ? Colors.green : Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: isSelected ? Colors.green : Colors.grey.shade300,
                        ),
                      ),
                      child: Text(
                        amount == 0 ? 'Tidak' : 'Rp${ThemeConfig.formatCurrency(amount)}',
                        style: TextStyle(
                          color: isSelected ? Colors.white : Colors.grey.shade700,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 32),

              // Submit button
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : _submitRating,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: ThemeConfig.brandColor,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: _isSubmitting
                      ? const CircularProgressIndicator(color: Colors.white)
                      : Text('KIRIM RATING', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16)),
                ),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Lewati', style: TextStyle(color: Colors.grey)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _submitRating() async {
    setState(() => _isSubmitting = true);
    try {
      final requestId = widget.orderData['id']?.toString();
      if (requestId != null) {
        final comment = [
          ..._selectedFeedback,
          if (_commentCtrl.text.trim().isNotEmpty) _commentCtrl.text.trim(),
        ].join('. ');

        await MarketApiService().rateDriver(requestId, _rating.toDouble(), comment: comment.isNotEmpty ? comment : null);

        // Send tip if selected
        if (_tipAmount > 0) {
          try {
            await MarketApiService().giveTip(requestId, _tipAmount);
          } catch (_) {}
        }
      }
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gagal: $e')));
        Navigator.pop(context);
      }
    }
  }
}
