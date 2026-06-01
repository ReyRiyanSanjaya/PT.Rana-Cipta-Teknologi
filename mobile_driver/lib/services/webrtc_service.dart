import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:mobile_driver/services/socket_service.dart';

/// WebRTC Voice Call Service using Socket.IO as signaling server.
/// No third-party VoIP provider needed.
class WebRTCService {
  static final WebRTCService _instance = WebRTCService._internal();
  factory WebRTCService() => _instance;
  WebRTCService._internal();

  RTCPeerConnection? _peerConnection;
  MediaStream? _localStream;
  String? _currentOrderId;
  bool _isCalling = false;
  bool _isInCall = false;

  // Callbacks
  Function(String callerName, String orderId)? onIncomingCall;
  VoidCallback? onCallConnected;
  VoidCallback? onCallEnded;
  VoidCallback? onCallRejected;

  bool get isCalling => _isCalling;
  bool get isInCall => _isInCall;

  // STUN/TURN servers (Google's free STUN + optional self-hosted TURN)
  static const Map<String, dynamic> _iceConfig = {
    'iceServers': [
      {'urls': 'stun:stun.l.google.com:19302'},
      {'urls': 'stun:stun1.l.google.com:19302'},
      {'urls': 'stun:stun2.l.google.com:19302'},
    ]
  };

  /// Initialize listeners for incoming calls
  void init() {
    final socket = SocketService();

    // Listen for incoming call offer
    socket.onRaw('call:offer', (data) {
      if (data is! Map) return;
      final callerName = data['callerName'] ?? 'Pelanggan';
      final orderId = data['orderId'] ?? '';
      final offer = data['offer'];

      if (_isInCall) {
        // Already in a call, reject
        socket.emitRaw('call:reject', {'orderId': orderId});
        return;
      }

      _currentOrderId = orderId;
      onIncomingCall?.call(callerName, orderId);

      // Store the offer to use when answering
      _pendingOffer = offer;
    });

    // Listen for call answer
    socket.onRaw('call:answer', (data) async {
      if (data is! Map) return;
      final answer = data['answer'];
      if (answer != null && _peerConnection != null) {
        await _peerConnection!.setRemoteDescription(
          RTCSessionDescription(answer['sdp'], answer['type']),
        );
        _isInCall = true;
        _isCalling = false;
        onCallConnected?.call();
      }
    });

    // Listen for ICE candidates
    socket.onRaw('call:ice-candidate', (data) async {
      if (data is! Map) return;
      final candidate = data['candidate'];
      if (candidate != null && _peerConnection != null) {
        await _peerConnection!.addCandidate(
          RTCIceCandidate(
            candidate['candidate'],
            candidate['sdpMid'],
            candidate['sdpMLineIndex'],
          ),
        );
      }
    });

    // Listen for call end
    socket.onRaw('call:end', (data) {
      _endCallLocally();
    });

    // Listen for call rejection
    socket.onRaw('call:reject', (data) {
      _isCalling = false;
      onCallRejected?.call();
      _cleanup();
    });
  }

  dynamic _pendingOffer;

  /// Start a voice call to the other party in the order room
  Future<void> startCall(String orderId, {String callerName = 'Driver'}) async {
    if (_isInCall || _isCalling) return;

    _currentOrderId = orderId;
    _isCalling = true;

    try {
      // Get microphone access
      _localStream = await navigator.mediaDevices.getUserMedia({
        'audio': true,
        'video': false,
      });

      // Create peer connection
      _peerConnection = await createPeerConnection(_iceConfig);

      // Add local audio track
      _localStream!.getAudioTracks().forEach((track) {
        _peerConnection!.addTrack(track, _localStream!);
      });

      // Handle ICE candidates
      _peerConnection!.onIceCandidate = (candidate) {
        SocketService().emitRaw('call:ice-candidate', {
          'orderId': _currentOrderId,
          'candidate': {
            'candidate': candidate.candidate,
            'sdpMid': candidate.sdpMid,
            'sdpMLineIndex': candidate.sdpMLineIndex,
          },
        });
      };

      // Handle connection state
      _peerConnection!.onConnectionState = (state) {
        debugPrint('[WebRTC] Connection state: $state');
        if (state == RTCPeerConnectionState.RTCPeerConnectionStateConnected) {
          _isInCall = true;
          _isCalling = false;
          onCallConnected?.call();
        } else if (state == RTCPeerConnectionState.RTCPeerConnectionStateDisconnected ||
            state == RTCPeerConnectionState.RTCPeerConnectionStateFailed) {
          _endCallLocally();
        }
      };

      // Create offer
      final offer = await _peerConnection!.createOffer({
        'offerToReceiveAudio': true,
        'offerToReceiveVideo': false,
      });
      await _peerConnection!.setLocalDescription(offer);

      // Send offer via signaling
      SocketService().emitRaw('call:offer', {
        'orderId': orderId,
        'offer': {'sdp': offer.sdp, 'type': offer.type},
        'callerName': callerName,
      });
    } catch (e) {
      debugPrint('[WebRTC] Start call error: $e');
      _isCalling = false;
      _cleanup();
    }
  }

  /// Answer an incoming call
  Future<void> answerCall() async {
    if (_pendingOffer == null || _currentOrderId == null) return;

    try {
      // Get microphone access
      _localStream = await navigator.mediaDevices.getUserMedia({
        'audio': true,
        'video': false,
      });

      // Create peer connection
      _peerConnection = await createPeerConnection(_iceConfig);

      // Add local audio track
      _localStream!.getAudioTracks().forEach((track) {
        _peerConnection!.addTrack(track, _localStream!);
      });

      // Handle ICE candidates
      _peerConnection!.onIceCandidate = (candidate) {
        SocketService().emitRaw('call:ice-candidate', {
          'orderId': _currentOrderId,
          'candidate': {
            'candidate': candidate.candidate,
            'sdpMid': candidate.sdpMid,
            'sdpMLineIndex': candidate.sdpMLineIndex,
          },
        });
      };

      // Handle connection state
      _peerConnection!.onConnectionState = (state) {
        if (state == RTCPeerConnectionState.RTCPeerConnectionStateConnected) {
          _isInCall = true;
          onCallConnected?.call();
        } else if (state == RTCPeerConnectionState.RTCPeerConnectionStateDisconnected ||
            state == RTCPeerConnectionState.RTCPeerConnectionStateFailed) {
          _endCallLocally();
        }
      };

      // Set remote description (the offer)
      await _peerConnection!.setRemoteDescription(
        RTCSessionDescription(_pendingOffer['sdp'], _pendingOffer['type']),
      );

      // Create answer
      final answer = await _peerConnection!.createAnswer({
        'offerToReceiveAudio': true,
        'offerToReceiveVideo': false,
      });
      await _peerConnection!.setLocalDescription(answer);

      // Send answer via signaling
      SocketService().emitRaw('call:answer', {
        'orderId': _currentOrderId,
        'answer': {'sdp': answer.sdp, 'type': answer.type},
      });

      _isInCall = true;
      _pendingOffer = null;
      onCallConnected?.call();
    } catch (e) {
      debugPrint('[WebRTC] Answer call error: $e');
      _cleanup();
    }
  }

  /// Reject an incoming call
  void rejectCall() {
    if (_currentOrderId != null) {
      SocketService().emitRaw('call:reject', {'orderId': _currentOrderId});
    }
    _pendingOffer = null;
    _cleanup();
  }

  /// End the current call
  void endCall() {
    if (_currentOrderId != null) {
      SocketService().emitRaw('call:end', {'orderId': _currentOrderId});
    }
    _endCallLocally();
  }

  /// Toggle microphone mute
  void toggleMute() {
    if (_localStream != null) {
      final audioTrack = _localStream!.getAudioTracks().first;
      audioTrack.enabled = !audioTrack.enabled;
    }
  }

  bool get isMuted {
    if (_localStream == null) return false;
    final tracks = _localStream!.getAudioTracks();
    if (tracks.isEmpty) return false;
    return !tracks.first.enabled;
  }

  /// Toggle speaker
  void toggleSpeaker() {
    if (_localStream != null) {
      // WebRTC handles speaker via platform
      Helper.setSpeakerphoneOn(!_speakerOn);
      _speakerOn = !_speakerOn;
    }
  }

  bool _speakerOn = false;
  bool get isSpeakerOn => _speakerOn;

  void _endCallLocally() {
    _isInCall = false;
    _isCalling = false;
    onCallEnded?.call();
    _cleanup();
  }

  void _cleanup() {
    _peerConnection?.close();
    _peerConnection = null;
    _localStream?.dispose();
    _localStream = null;
    _currentOrderId = null;
  }
}
