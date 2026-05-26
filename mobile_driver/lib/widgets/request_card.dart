import 'dart:async';
import 'package:flutter/material.dart';
import 'package:mobile_driver/config/theme_config.dart';
import 'package:google_fonts/google_fonts.dart';

class RequestCard extends StatefulWidget {
  final Map<String, dynamic> request;
  final VoidCallback onAccept;
  final VoidCallback onIgnore;
  final VoidCallback onTimeout;

  const RequestCard({
    super.key,
    required this.request,
    required this.onAccept,
    required this.onIgnore,
    required this.onTimeout,
  });

  @override
  State<RequestCard> createState() => _RequestCardState();
}

class _RequestCardState extends State<RequestCard> with SingleTickerProviderStateMixin {
  late Timer _timer;
  late int _timeLeft;
  late AnimationController _animCtrl;

  @override
  void initState() {
    super.initState();
    _timeLeft = widget.request['timeLeft'] ?? 20;
    _animCtrl = AnimationController(vsync: this, duration: Duration(seconds: _timeLeft));
    _animCtrl.forward();

    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_timeLeft > 0) {
        setState(() => _timeLeft--);
      } else {
        timer.cancel();
        widget.onTimeout();
      }
    });
  }

  @override
  void dispose() {
    _timer.cancel();
    _animCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isRide = widget.request['type'] == 'RIDE';
    
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 15,
            offset: const Offset(0, 8),
          )
        ],
      ),
      child: Column(
        children: [
          _buildHeader(isRide),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 16),
            child: Divider(height: 1, color: Colors.black12),
          ),
          _buildLocationRow(Icons.radio_button_checked_rounded, Colors.green, widget.request['origin'] ?? 'N/A'),
          const SizedBox(height: 12),
          _buildLocationRow(Icons.location_on_rounded, Colors.red, widget.request['destination'] ?? 'N/A'),
          const SizedBox(height: 20),
          _buildActionButtons(),
        ],
      ),
    );
  }

  Widget _buildHeader(bool isRide) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: (isRide ? Colors.blue : Colors.orange).withOpacity(0.1),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Icon(isRide ? Icons.directions_bike_rounded : Icons.fastfood_rounded, 
                      color: isRide ? Colors.blue : Colors.orange, size: 24),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(isRide ? 'Rana Ride' : 'Rana Food/Delivery', 
                   style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              Row(
                children: [
                  const Icon(Icons.star_rounded, color: Colors.amber, size: 14),
                  const SizedBox(width: 4),
                  Text('${widget.request['rating']} • ${widget.request['customer']}', 
                       style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                ],
              ),
            ],
          ),
        ),
        Text('Rp${ThemeConfig.formatCurrency(widget.request['price'])}', 
             style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w800, color: ThemeConfig.brandColor)),
      ],
    );
  }

  Widget _buildLocationRow(IconData icon, Color color, String address) {
    return Row(
      children: [
        Icon(icon, color: color, size: 18),
        const SizedBox(width: 12),
        Expanded(
          child: Text(address, 
                      maxLines: 1, overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
        ),
      ],
    );
  }

  Widget _buildActionButtons() {
    return Row(
      children: [
        SizedBox(
          width: 64, height: 64,
          child: Stack(
            fit: StackFit.expand,
            children: [
              CircularProgressIndicator(
                value: _timeLeft / (widget.request['timeLeft'] ?? 20),
                strokeWidth: 5,
                backgroundColor: Colors.grey.shade200,
                valueColor: const AlwaysStoppedAnimation<Color>(ThemeConfig.brandColor),
              ),
              Center(
                child: Text('$_timeLeft', 
                  style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold, color: ThemeConfig.brandColor)),
              ),
            ],
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: OutlinedButton(
            onPressed: widget.onIgnore,
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 18),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              side: BorderSide(color: Colors.grey.shade300),
            ),
            child: const Text('ABAIKAN', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey)),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          flex: 2,
          child: ElevatedButton(
            onPressed: widget.onAccept,
            style: ElevatedButton.styleFrom(
              backgroundColor: ThemeConfig.brandColor,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 18),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              elevation: 0,
            ),
            child: const Text('TERIMA', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1.2)),
          ),
        ),
      ],
    );
  }
}
