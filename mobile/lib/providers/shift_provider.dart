import 'package:flutter/material.dart';
import 'package:rana_merchant/data/local/database_helper.dart';

class ShiftProvider with ChangeNotifier {
  Map<String, dynamic>? _currentShift;
  bool _isLoading = false;
  String? _errorMessage;

  Map<String, dynamic>? get currentShift => _currentShift;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get isShiftOpen => _currentShift != null;

  ShiftProvider() {
    loadCurrentShift();
  }

  Future<void> loadCurrentShift() async {
    _isLoading = true;
    notifyListeners();
    try {
      // In a real multi-user scenario, we might filter by current logged in cashier.
      // For now, per requirements/current impl, we just get the open shift on this device.
      _currentShift = await DatabaseHelper.instance.getOpenShift("default");
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> openShift(String cashierId, double startCash) async {
    _isLoading = true;
    notifyListeners();
    try {
      final shiftData = {
        'offlineId': DateTime.now().millisecondsSinceEpoch.toString(),
        'cashierId': cashierId,
        'openedAt': DateTime.now().toIso8601String(),
        'startCash': startCash,
        'status': 'OPEN',
        'synced': 0
      };
      await DatabaseHelper.instance.openShift(shiftData);
      await loadCurrentShift();
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> closeShift(double actualEndCash) async {
    if (_currentShift == null) return false;

    _isLoading = true;
    notifyListeners();
    try {
      final summary = await getShiftSummary();
      final startCash = (_currentShift!['startCash'] as num).toDouble();
      final cashSales = summary['cashSales'] ?? 0.0;
      final cashIn = summary['cashIn'] ?? 0.0;
      final cashOut = summary['cashOut'] ?? 0.0;
      
      final expectedEndCash = startCash + cashSales + cashIn - cashOut;
      final difference = actualEndCash - expectedEndCash;

      await DatabaseHelper.instance.closeShift(
        _currentShift!['offlineId'],
        actualEndCash,
        expectedEndCash,
        difference,
      );
      
      _currentShift = null; // Shift is now closed
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> addMutation(String type, double amount, String description) async {
    if (_currentShift == null) return false;

    try {
      final mutationData = {
        'shiftId': _currentShift!['offlineId'],
        'type': type,
        'amount': amount,
        'description': description,
        'createdAt': DateTime.now().toIso8601String(),
        'synced': 0
      };
      await DatabaseHelper.instance.addCashMutation(mutationData);
      notifyListeners(); // Notify to update any listeners showing current stats
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      return false;
    }
  }

  Future<Map<String, double>> getShiftSummary() async {
    if (_currentShift == null) return {};
    
    final openedAtStr = _currentShift!['openedAt'] as String;
    final openedAt = DateTime.parse(openedAtStr);
    
    return await DatabaseHelper.instance.getShiftSummary(
      _currentShift!['offlineId'],
      openedAt,
    );
  }
}
