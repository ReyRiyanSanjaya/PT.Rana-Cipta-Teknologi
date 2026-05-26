import 'dart:io';

void main() async {
  final apkPath = r'C:\Data Riyan\projek\Rana\builds\rana-merchant-release.apk';
  final outPath1 = r'C:\Data Riyan\projek\Rana\builds\rana_apk_size.txt';
  final outPath2 = r'C:\Data Riyan\projek\Rana\mobile\tool\apk_size_output.txt';
  try {
    final file = File(apkPath);
    if (!await file.exists()) {
      await File(outPath1).writeAsString('NOT_FOUND');
      await File(outPath2).writeAsString('NOT_FOUND');
      stdout.writeln('NOT_FOUND');
      return;
    }
    final bytes = await file.length();
    final kb = bytes / 1024;
    final mb = kb / 1024;
    final content =
        'bytes=$bytes\nKB=${kb.toStringAsFixed(2)}\nMB=${mb.toStringAsFixed(2)}';
    await File(outPath1).writeAsString(content);
    await File(outPath2).writeAsString(content);
    stdout.writeln(content);
  } catch (e) {
    try {
      await File(outPath1).writeAsString('ERROR: $e');
    } catch (_) {}
    try {
      await File(outPath2).writeAsString('ERROR: $e');
    } catch (_) {}
    stdout.writeln('ERROR: $e');
  }
}
