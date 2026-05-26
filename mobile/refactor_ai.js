const fs = require('fs');

const path = 'c:/Riyan/projek/Rana/mobile/lib/services/ai_service.dart';
let content = fs.readFileSync(path, 'utf8');

// Refactor computeChurnScores
const churnRegex = /  Future<List<Map<String, dynamic>>> computeChurnScores\(\{[\s\S]*?    return out\.take\(limit\)\.toList\(\);\n  \}/m;

const churnReplacement = `  Future<List<Map<String, dynamic>>> computeChurnScores({
    int daysInactive = 14,
    DateTime? start,
    DateTime? end,
    int limit = 10,
  }) async {
    final customers = await _db.getCustomers();
    final now = end ?? DateTime.now();
    
    final futures = customers.map((c) async {
      final cid = c['id'].toString();
      final stats = await _db.getCustomerStats(cid);
      final lastVisit = stats['lastVisit'] as DateTime?;
      if (lastVisit == null) return null;

      final diff = now.difference(lastVisit).inDays;
      if (diff >= daysInactive) {
        return {
          ...c,
          'daysInactive': diff,
          'lastVisit': lastVisit,
          'churnProbability': math.min(1.0, diff / 60.0)
        };
      }
      return null;
    });

    final results = await Future.wait(futures);
    final out = results.whereType<Map<String, dynamic>>().toList();

    out.sort((a, b) => (b['daysInactive'] as int).compareTo(a['daysInactive'] as int));
    return out.take(limit).toList();
  }`;

// Refactor computeRfmSegments
const rfmRegex = /  Future<Map<String, dynamic>> computeRfmSegments\(\{[\s\S]*?    return \{'segments': segments, 'summary': summary\};\n  \}/m;

const rfmReplacement = `  Future<Map<String, dynamic>> computeRfmSegments({
    DateTime? start,
    DateTime? end,
  }) async {
    final s = start ?? DateTime.now().subtract(const Duration(days: 30));
    final e = end ?? DateTime.now();
    final customers = await _db.getCustomers();

    final segments = <String, List<Map<String, dynamic>>>{
      'Champion': [],
      'Loyal': [],
      'AtRisk': [],
      'AboutToSleep': [],
      'New': [],
    };

    final futures = customers.map((c) async {
      final cid = c['id'].toString();
      final stats = await _db.getCustomerStats(cid, start: s, end: e);
      final recency = (stats['daysSinceLastVisit'] as num?)?.toInt() ?? 999;
      final frequency = (stats['totalTransactions'] as num?)?.toInt() ?? 0;
      final monetary = (stats['totalSpent'] as num?)?.toDouble() ?? 0.0;

      String seg = 'New';
      if (recency <= 7 && frequency >= 5) seg = 'Champion';
      else if (recency <= 14 && frequency >= 3) seg = 'Loyal';
      else if (recency > 21) seg = 'AtRisk';
      else if (recency > 14) seg = 'AboutToSleep';

      return {'segment': seg, 'data': {...c, 'monetary': monetary, 'lastVisit': stats['lastVisit']}};
    });

    final results = await Future.wait(futures);
    for (final res in results) {
      if (res != null) {
        segments[res['segment']]!.add(res['data'] as Map<String, dynamic>);
      }
    }

    final summary = segments.map((key, value) => MapEntry(key, value.length));
    return {'segments': segments, 'summary': summary};
  }`;


if (churnRegex.test(content) && rfmRegex.test(content)) {
    content = content.replace(churnRegex, churnReplacement);
    content = content.replace(rfmRegex, rfmReplacement);
    fs.writeFileSync(path, content);
    console.log("Successfully replaced computeChurnScores and computeRfmSegments.");
} else {
    console.log("Failed to match regexes.");
}
