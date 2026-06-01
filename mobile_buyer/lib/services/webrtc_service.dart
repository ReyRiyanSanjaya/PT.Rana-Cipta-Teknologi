import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:rana_market/services/socket_service.dart';
import 'package:provider/provider.dart';
import 'package:flutter/material.dart';

/// WebRTC Voice Call Service for buyer (receives calls from driver)
class BuyerWebRTCService {
  static final BuyerWebRTCService _instance = BuyerWebRTCService._internal();
  factory BuyerWebRTCService() => _instance;
  BuyerWebRTCService._internal();

  RTCPeerConnection? _peerConnection;
  MediaStream? _localStream;
  String? _currentOrderId;
  bool _isInCall = false;

  Function(String callerName, String orderId)? onIncomingCall;
  VoidCallback? onCallConnected;
  VoidCallback? onCallEnded;

  bool get isInCall => _isInCall;

  static const Map<String, dynamic> _iceConfig = {
    'iceServers': [
      {'urls': 'stun:stun.l.google.com:19302'},
      {'urls': 'stun:stun1.l.google.com:19302'},
    ]
  };

  dynamic _pendingOffer;

  void init(SocketService socket) {
    socket.onRaw('call:offer', (data) {
      if (data is! Map) return;
      final callerName = data['callerName'] ?? 'Driver';
      final orderId = data['orderId'] ?? '';
      final offer = data['offer'];

      if (_isInCall) {
        socket.emitRaw('call:reject', {'orderId': orderId});
        return;
      }

      _currentOrderId = orderId;
      _pendingOffer = offer;
      onIncomingCall?.call(callerName, orderId);
    });

    socket.onRaw('call:ice-candidate', (data) async {
      if (data is! Map) return;
      final candidate = data['candidate'];
      if (candidate != null && _peerConnection != null) {
        await _peerConnection!.addCandidate(RTCIceCandidate(
          candidate['candidate'], candidate['sdpMid'], candidate['sdpMLineIndex'],
        ));
      }
    });

    socket.onRaw('call:end', (data) {
      _endCallLocally();
    });
  }

  Future<void> answerCall(SocketService socket) async {
    if (_pendingOffer == null || _currentOrderId == null) return;

    try {
      _localStream = await navigator.mediaDevices.getUserMedia({'audio': true, 'video': false});
      _peerConnection = await createPeerConnection(_iceConfig);

      _localStream!.getAudioTracks().forEach((track) {
        _peerConnection!.addTrack(track, _localStream!);
      });

      _peerConnection!.onIceCandidate = (candidate) {
        socket.emitRaw('call:ice-candidate', {
          'orderId': _currentOrderId,
          'candidate': {'candidate': candidate.candidate, 'sdpMid': candidate.sdpMid, 'sdpMLineIndex': candidate.sdpMLineIndex},
        });
      };

      _peerConnection!.onConnectionState = (state) {
        if (state == RTCPeerConnectionState.RTCPeerConnectionStateConnected) {
          _isInCall = true;
          onCallConnected?.call();
        } else if (state == RTCPeerConnectionState.RTCPeerConnectionStateDisconnected ||
            state == RTCPeerConnectionState.RTCPeerConnectionStateFailed) {
          _endCallLocally();
        }
      };

      await _peerConnection!.setRemoteDescription(
        RTCSessionDescription(_pendingOffer['sdp'], _pendingOffer['type']),
      );

      final answer = await _peerConnection!.createAnswer({'offerToReceiveAudio': true, 'offerToReceiveVideo': false});
      await _peerConnection!.setLocalDescription(answer);

      socket.emitRaw('call:answer', {
        'orderId': _currentOrderId,
        'answer': {'sdp': answer.sdp, 'type': answer.type},
      });

      _isInCall = true;
      _pendingOffer = null;
      onCallConnected?.call();
    } catch (e) {
      debugPrint('[BuyerWebRTC] Answer error: $e');
      _cleanup();
    }
  }

  void rejectCall(SocketService socket) {
    if (_currentOrderId != null) {
      socket.emitRaw('call:reject', {'orderId': _currentOrderId});
    }
    _pendingOffer = null;
    _cleanup();
  }

  void endCall(SocketService socket) {
    if (_currentOrderId != null) {
      socket.emitRaw('call:end', {'orderId': _currentOrderId});
    }
    _endCallLocally();
  }

  void toggleMute() {
    if (_localStream != null) {
      final track = _localStream!.getAudioTracks().first;
      track.enabled = !track.enabled;
    }
  }

  bool get isMuted {
    if (_localStream == null) return false;
    final tracks = _localStream!.getAudioTracks();
    return tracks.isNotEmpty && !tracks.first.enabled;
  }

  void _endCallLocally() {
    _isInCall = false;
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
