import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:mobile_driver/config/theme_config.dart';
import 'package:mobile_driver/services/webrtc_service.dart';

class VoiceCallScreen extends StatefulWidget {
  final String orderId;
  final String peerName;
  final bool isIncoming;

  const VoiceCallScreen({
    super.key,
    required this.orderId,
    required this.peerName,
    this.isIncoming = false,
  });

  @override
  State<VoiceCallScreen> createState() => _VoiceCallScreenState();
}

class _VoiceCallScreenState extends State<VoiceCallScreen> {
  final _webrtc = WebRTCService();
  String _status = 'connecting'; // connecting, ringing, connected, ended
  Timer? _durationTimer;
  int _durationSeconds = 0;
  bool _isMuted = false;
  bool _isSpeaker = false;

  @override
  void initState() {
    super.initState();

    _webrtc.onCallConnected = () {
      if (mounted) {
        setState(() => _status = 'connected');
        _startDurationTimer();
      }
    };

    _webrtc.onCallEnded = () {
      if (mounted) {
        setState(() => _status = 'ended');
        Future.delayed(const Duration(seconds: 1), () {
          if (mounted) Navigator.pop(context);
        });
      }
    };

    _webrtc.onCallRejected = () {
      if (mounted) {
        setState(() => _status = 'ended');
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Panggilan ditolak')),
        );
        Future.delayed(const Duration(seconds: 1), () {
          if (mounted) Navigator.pop(context);
        });
      }
    };

    if (widget.isIncoming) {
      _status = 'ringing';
    } else {
      _status = 'connecting';
      _webrtc.startCall(widget.orderId, callerName: 'Driver');
    }
  }

  @override
  void dispose() {
    _durationTimer?.cancel();
    super.dispose();
  }

  void _startDurationTimer() {
    _durationTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (mounted) setState(() => _durationSeconds++);
    });
  }

  String _formatDuration() {
    final min = (_durationSeconds ~/ 60).toString().padLeft(2, '0');
    final sec = (_durationSeconds % 60).toString().padLeft(2, '0');
    return '$min:$sec';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1A1A2E),
      body: SafeArea(
        child: Column(
          children: [
            const Spacer(flex: 2),

            // Caller avatar
            Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: ThemeConfig.brandColor.withOpacity(0.2),
                border: Border.all(color: ThemeConfig.brandColor.withOpacity(0.5), width: 3),
              ),
              child: Center(
                child: Text(
                  widget.peerName.isNotEmpty ? widget.peerName[0].toUpperCase() : '?',
                  style: GoogleFonts.outfit(
                    fontSize: 48,
                    fontWeight: FontWeight.bold,
                    color: ThemeConfig.brandColor,
                  ),
                ),
              ),
            ).animate(onPlay: (c) => c.repeat(reverse: true)).scale(
                  begin: const Offset(1, 1),
                  end: const Offset(1.05, 1.05),
                  duration: 1500.ms,
                ),
            const SizedBox(height: 24),

            // Name
            Text(
              widget.peerName,
              style: GoogleFonts.outfit(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 8),

            // Status text
            Text(
              _getStatusText(),
              style: TextStyle(
                color: Colors.white.withOpacity(0.7),
                fontSize: 16,
              ),
            ),

            // Duration (when connected)
            if (_status == 'connected') ...[
              const SizedBox(height: 8),
              Text(
                _formatDuration(),
                style: GoogleFonts.outfit(
                  fontSize: 20,
                  fontWeight: FontWeight.w600,
                  color: Colors.greenAccent,
                ),
              ),
            ],

            const Spacer(flex: 3),

            // Action buttons
            if (_status == 'ringing' && widget.isIncoming)
              _buildIncomingActions()
            else if (_status != 'ended')
              _buildInCallActions(),

            const SizedBox(height: 48),
          ],
        ),
      ),
    );
  }

  String _getStatusText() {
    switch (_status) {
      case 'connecting':
        return 'Menghubungkan...';
      case 'ringing':
        return widget.isIncoming ? 'Panggilan masuk' : 'Berdering...';
      case 'connected':
        return 'Terhubung';
      case 'ended':
        return 'Panggilan berakhir';
      default:
        return '';
    }
  }

  Widget _buildIncomingActions() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        // Reject
        _buildCallButton(
          icon: Icons.call_end_rounded,
          color: Colors.red,
          label: 'Tolak',
          onTap: () {
            _webrtc.rejectCall();
            Navigator.pop(context);
          },
        ),
        // Accept
        _buildCallButton(
          icon: Icons.call_rounded,
          color: Colors.green,
          label: 'Terima',
          onTap: () {
            _webrtc.answerCall();
            setState(() => _status = 'connecting');
          },
        ),
      ],
    );
  }

  Widget _buildInCallActions() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        // Mute
        _buildCallButton(
          icon: _isMuted ? Icons.mic_off_rounded : Icons.mic_rounded,
          color: _isMuted ? Colors.red : Colors.white24,
          label: _isMuted ? 'Unmute' : 'Mute',
          onTap: () {
            _webrtc.toggleMute();
            setState(() => _isMuted = _webrtc.isMuted);
          },
        ),
        // End call
        _buildCallButton(
          icon: Icons.call_end_rounded,
          color: Colors.red,
          size: 72,
          label: 'Akhiri',
          onTap: () {
            _webrtc.endCall();
            Navigator.pop(context);
          },
        ),
        // Speaker
        _buildCallButton(
          icon: _isSpeaker ? Icons.volume_up_rounded : Icons.volume_down_rounded,
          color: _isSpeaker ? Colors.blue : Colors.white24,
          label: 'Speaker',
          onTap: () {
            _webrtc.toggleSpeaker();
            setState(() => _isSpeaker = _webrtc.isSpeakerOn);
          },
        ),
      ],
    );
  }

  Widget _buildCallButton({
    required IconData icon,
    required Color color,
    required String label,
    required VoidCallback onTap,
    double size = 60,
  }) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        GestureDetector(
          onTap: onTap,
          child: Container(
            width: size,
            height: size,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: Colors.white, size: size * 0.45),
          ),
        ),
        const SizedBox(height: 8),
        Text(label, style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 12)),
      ],
    );
  }
}

/// Show incoming call dialog overlay
void showIncomingCallDialog(BuildContext context, String callerName, String orderId) {
  showDialog(
    context: context,
    barrierDismissible: false,
    builder: (ctx) => AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(height: 16),
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: Colors.green.withOpacity(0.1),
            ),
            child: const Icon(Icons.call_rounded, color: Colors.green, size: 40),
          ),
          const SizedBox(height: 16),
          Text('Panggilan Masuk',
              style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Text(callerName, style: TextStyle(color: Colors.grey.shade600, fontSize: 16)),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              // Reject
              GestureDetector(
                onTap: () {
                  WebRTCService().rejectCall();
                  Navigator.pop(ctx);
                },
                child: Container(
                  width: 56,
                  height: 56,
                  decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                  child: const Icon(Icons.call_end_rounded, color: Colors.white),
                ),
              ),
              // Accept
              GestureDetector(
                onTap: () {
                  Navigator.pop(ctx);
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => VoiceCallScreen(
                        orderId: orderId,
                        peerName: callerName,
                        isIncoming: true,
                      ),
                    ),
                  );
                },
                child: Container(
                  width: 56,
                  height: 56,
                  decoration: const BoxDecoration(color: Colors.green, shape: BoxShape.circle),
                  child: const Icon(Icons.call_rounded, color: Colors.white),
                ),
              ),
            ],
          ),
        ],
      ),
    ),
  );
}
