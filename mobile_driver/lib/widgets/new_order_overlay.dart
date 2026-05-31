import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:vibration/vibration.dart';
import 'package:mobile_driver/config/theme_config.dart';
import 'package:mobile_driver/services/notification_service.dart';

/// Overlay widget that shows a modal notification when a new order arrives
class NewOrderOverlay extends StatefulWidget {
  final Map<String, dynamic> orderData;
  final VoidCallback onAccept;
  final VoidCallback onReject;
  final VoidCallback onTimeout;

  const NewOrderOverlay({
    super.key,
    required this.orderData,
    required this.onAccept,
    required this.onReject,
    required this.onTimeout,
  });

  @override
  State<NewOrderOverlay> createState() => _NewOrderOverlayState();
}

class _NewOrderOverlayState extends State<NewOrderOverlay>
    with SingleTickerProviderStateMixin {
  late Timer _countdownTimer;
  int _secondsLeft = 30;
  late AnimationController _pulseCtrl;

  @override
  void initState() {
    super.initState();
    _pulseCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    )..repeat(reverse: true);

    // Vibrate to alert driver
    _vibrate();

    // Show local notification (for when screen is off)
    NotificationService().show(
      id: DateTime.now().millisecondsSinceEpoch ~/ 1000,
      title: 'Pesanan Baru!',
      body: '${widget.orderData['origin'] ?? widget.orderData['originAddress'] ?? ''} → ${widget.orderData['destination'] ?? widget.orderData['destAddress'] ?? ''}',
      payload: widget.orderData['id']?.toString(),
    );

    // Start countdown
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_secondsLeft <= 0) {
        timer.cancel();
        widget.onTimeout();
      } else {
        setState(() => _secondsLeft--);
      }
    });
  }

  @override
  void dispose() {
    _countdownTimer.cancel();
    _pulseCtrl.dispose();
    super.dispose();
  }

  Future<void> _vibrate() async {
    try {
      final hasVibrator = await Vibration.hasVibrator();
      if (hasVibrator == true) {
        Vibration.vibrate(pattern: [0, 300, 200, 300, 200, 300]);
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final type = widget.orderData['type'] ?? 'RIDE';
    final origin = widget.orderData['origin'] ?? widget.orderData['originAddress'] ?? '-';
    final dest = widget.orderData['destination'] ?? widget.orderData['destAddress'] ?? '-';
    final price = (widget.orderData['price'] as num?)?.toDouble() ?? 0;
    final isUrgent = _secondsLeft < 10;

    return Material(
      color: Colors.black54,
      child: SafeArea(
        child: Column(
          children: [
            const Spacer(),
            Container(
              margin: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(32),
                boxShadow: [
                  BoxShadow(
                    color: ThemeConfig.brandColor.withOpacity(0.3),
                    blurRadius: 30,
                    offset: const Offset(0, 15),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Header with countdown
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                    decoration: BoxDecoration(
                      color: isUrgent ? Colors.red.shade50 : ThemeConfig.brandColor.withOpacity(0.05),
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: isUrgent ? Colors.red : ThemeConfig.brandColor,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.delivery_dining_rounded, color: Colors.white, size: 20),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'PESANAN BARU MASUK!',
                            style: GoogleFonts.outfit(
                              fontWeight: FontWeight.w800,
                              fontSize: 14,
                              letterSpacing: 1,
                              color: isUrgent ? Colors.red : ThemeConfig.brandColor,
                            ),
                          ),
                        ),
                        // Countdown circle
                        AnimatedBuilder(
                          animation: _pulseCtrl,
                          builder: (context, child) {
                            return Transform.scale(
                              scale: isUrgent ? 1.0 + (_pulseCtrl.value * 0.15) : 1.0,
                              child: Container(
                                width: 48,
                                height: 48,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: isUrgent ? Colors.red : ThemeConfig.brandColor,
                                ),
                                child: Center(
                                  child: Text(
                                    '$_secondsLeft',
                                    style: GoogleFonts.outfit(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w900,
                                      fontSize: 18,
                                    ),
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                      ],
                    ),
                  ),

                  // Order details
                  Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      children: [
                        // Type + Price
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: (type == 'SEND' ? Colors.orange : Colors.blue).withOpacity(0.1),
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Icon(
                                type == 'SEND' ? Icons.local_shipping_rounded : Icons.directions_bike_rounded,
                                color: type == 'SEND' ? Colors.orange : Colors.blue,
                                size: 28,
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    type == 'SEND' ? 'RanaSend' : (type == 'FOOD' ? 'RanaFood' : 'RanaRide'),
                                    style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 18),
                                  ),
                                  Text('Pembayaran Tunai', style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                                ],
                              ),
                            ),
                            Text(
                              'Rp${ThemeConfig.formatCurrency(price)}',
                              style: GoogleFonts.outfit(fontSize: 22, fontWeight: FontWeight.w900, color: ThemeConfig.brandColor),
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),

                        // Route
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.grey.shade50,
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Column(
                            children: [
                              Row(
                                children: [
                                  const Icon(Icons.radio_button_checked, color: Colors.green, size: 16),
                                  const SizedBox(width: 10),
                                  Expanded(child: Text(origin, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500))),
                                ],
                              ),
                              Padding(
                                padding: const EdgeInsets.only(left: 7),
                                child: Align(
                                  alignment: Alignment.centerLeft,
                                  child: Container(width: 2, height: 20, color: Colors.grey.shade300),
                                ),
                              ),
                              Row(
                                children: [
                                  const Icon(Icons.location_on, color: Colors.red, size: 16),
                                  const SizedBox(width: 10),
                                  Expanded(child: Text(dest, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500))),
                                ],
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 24),

                        // Action buttons
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton(
                                onPressed: widget.onReject,
                                style: OutlinedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(vertical: 18),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                  side: BorderSide(color: Colors.grey.shade300),
                                ),
                                child: Text('ABAIKAN', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: Colors.grey.shade500)),
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              flex: 2,
                              child: ElevatedButton(
                                onPressed: widget.onAccept,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: ThemeConfig.brandColor,
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(vertical: 18),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                  elevation: 4,
                                  shadowColor: ThemeConfig.brandColor.withOpacity(0.4),
                                ),
                                child: Text('TERIMA', style: GoogleFonts.outfit(fontWeight: FontWeight.w800, fontSize: 16, letterSpacing: 1)),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ).animate().slideY(begin: 1, curve: Curves.easeOutBack, duration: 500.ms),
            const Spacer(),
          ],
        ),
      ),
    );
  }
}

/// Helper to show the new order overlay as a full-screen modal
void showNewOrderModal(BuildContext context, Map<String, dynamic> orderData, {
  required VoidCallback onAccept,
  required VoidCallback onReject,
}) {
  showGeneralDialog(
    context: context,
    barrierDismissible: false,
    barrierColor: Colors.transparent,
    pageBuilder: (ctx, anim1, anim2) {
      return NewOrderOverlay(
        orderData: orderData,
        onAccept: () {
          Navigator.of(ctx).pop();
          onAccept();
        },
        onReject: () {
          Navigator.of(ctx).pop();
          onReject();
        },
        onTimeout: () {
          Navigator.of(ctx).pop();
          onReject();
        },
      );
    },
  );
}
