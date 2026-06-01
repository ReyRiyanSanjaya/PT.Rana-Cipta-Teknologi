import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';
import 'package:mobile_driver/config/api_config.dart';

/// Service to handle network connectivity and retry logic
class ConnectivityService {
  static final ConnectivityService _instance = ConnectivityService._internal();
  factory ConnectivityService() => _instance;
  ConnectivityService._internal();

  bool _isOnline = true;
  final _connectivityController = StreamController<bool>.broadcast();

  bool get isOnline => _isOnline;
  Stream<bool> get connectivityStream => _connectivityController.stream;

  // Queue of pending operations to retry when back online
  final List<_PendingOperation> _pendingQueue = [];

  /// Execute an API call with automatic retry
  Future<T> withRetry<T>(
    Future<T> Function() operation, {
    int maxRetries = ApiConfig.maxRetries,
    Duration delay = ApiConfig.retryDelay,
    bool queueOnFailure = false,
    String? operationId,
  }) async {
    int attempts = 0;
    Exception? lastError;

    while (attempts < maxRetries) {
      try {
        final result = await operation();
        // If we were offline and now succeeded, mark as online
        if (!_isOnline) {
          _isOnline = true;
          _connectivityController.add(true);
          _retryPendingOperations();
        }
        return result;
      } on DioException catch (e) {
        lastError = e;
        attempts++;

        // Don't retry on client errors (4xx)
        if (e.response != null && e.response!.statusCode != null) {
          final statusCode = e.response!.statusCode!;
          if (statusCode >= 400 && statusCode < 500) {
            throw e;
          }
        }

        // Network errors - mark as offline
        if (e.type == DioExceptionType.connectionTimeout ||
            e.type == DioExceptionType.receiveTimeout ||
            e.type == DioExceptionType.connectionError) {
          _isOnline = false;
          _connectivityController.add(false);
        }

        if (attempts < maxRetries) {
          // Exponential backoff
          final waitTime = delay * (1 << (attempts - 1));
          debugPrint('[Retry] Attempt $attempts/$maxRetries, waiting ${waitTime.inSeconds}s');
          await Future.delayed(waitTime);
        }
      } catch (e) {
        lastError = e is Exception ? e : Exception(e.toString());
        attempts++;
        if (attempts < maxRetries) {
          await Future.delayed(delay * attempts);
        }
      }
    }

    // All retries exhausted
    if (queueOnFailure && operationId != null) {
      _pendingQueue.add(_PendingOperation(
        id: operationId,
        operation: operation,
        createdAt: DateTime.now(),
      ));
      debugPrint('[Queue] Operation $operationId queued for retry when online');
    }

    throw lastError ?? Exception('Operation failed after $maxRetries attempts');
  }

  /// Retry all pending operations
  Future<void> _retryPendingOperations() async {
    if (_pendingQueue.isEmpty) return;

    debugPrint('[Queue] Retrying ${_pendingQueue.length} pending operations');
    final queue = List<_PendingOperation>.from(_pendingQueue);
    _pendingQueue.clear();

    for (final op in queue) {
      // Skip operations older than 5 minutes
      if (DateTime.now().difference(op.createdAt).inMinutes > 5) continue;

      try {
        await op.operation();
        debugPrint('[Queue] Operation ${op.id} succeeded');
      } catch (e) {
        debugPrint('[Queue] Operation ${op.id} failed again: $e');
      }
    }
  }

  /// Check connectivity by pinging the server
  Future<bool> checkConnectivity() async {
    try {
      final dio = Dio(BaseOptions(
        connectTimeout: const Duration(seconds: 5),
        receiveTimeout: const Duration(seconds: 5),
      ));
      final response = await dio.get('${ApiConfig.serverUrl}/api/health');
      _isOnline = response.statusCode == 200;
    } catch (_) {
      _isOnline = false;
    }
    _connectivityController.add(_isOnline);
    return _isOnline;
  }

  void dispose() {
    _connectivityController.close();
  }
}

class _PendingOperation {
  final String id;
  final Future Function() operation;
  final DateTime createdAt;

  _PendingOperation({
    required this.id,
    required this.operation,
    required this.createdAt,
  });
}
