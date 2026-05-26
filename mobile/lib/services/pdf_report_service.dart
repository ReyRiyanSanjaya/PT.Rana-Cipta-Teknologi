import 'dart:io';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:path_provider/path_provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:open_file/open_file.dart';

class PdfReportService {
  final currency = NumberFormat.simpleCurrency(locale: 'id_ID', decimalDigits: 0);
  final dateFormat = DateFormat('dd MMM yyyy');

  Future<void> generateAndOpenReport({
    required DateTime startDate,
    required DateTime endDate,
    required Map<String, dynamic> summary,
    required List<Map<String, dynamic>> topProducts,
    required List<Map<String, dynamic>> paymentMethods,
    required List<Map<String, dynamic>> expenses,
    String storeName = 'Toko Rana',
  }) async {
    final pdf = pw.Document();
    
    // Load font if needed (standard fonts are usually fine for simple text, but custom fonts need loading)
    // For simplicity, using standard font.

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(32),
        build: (pw.Context context) {
          return [
            _buildHeader(storeName, startDate, endDate),
            pw.SizedBox(height: 24),
            _buildSummarySection(summary),
            pw.SizedBox(height: 24),
            _buildTopProductsTable(topProducts),
            pw.SizedBox(height: 24),
            _buildPaymentMethodsTable(paymentMethods),
            if (expenses.isNotEmpty) ...[
              pw.SizedBox(height: 24),
              _buildExpensesTable(expenses),
            ],
            pw.SizedBox(height: 40),
            _buildFooter(),
          ];
        },
      ),
    );

    final output = await getTemporaryDirectory();
    final file = File('${output.path}/laporan_bisnis_${DateTime.now().millisecondsSinceEpoch}.pdf');
    await file.writeAsBytes(await pdf.save());
    
    await OpenFile.open(file.path);
  }

  pw.Widget _buildHeader(String storeName, DateTime start, DateTime end) {
    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Text(
          storeName.toUpperCase(),
          style: pw.TextStyle(fontSize: 24, fontWeight: pw.FontWeight.bold),
        ),
        pw.SizedBox(height: 8),
        pw.Text(
          'Laporan Bisnis',
          style: pw.TextStyle(fontSize: 18, color: PdfColors.grey700),
        ),
        pw.Text(
          'Periode: ${dateFormat.format(start)} - ${dateFormat.format(end)}',
          style: const pw.TextStyle(fontSize: 12),
        ),
        pw.Divider(color: PdfColors.grey400),
      ],
    );
  }

  pw.Widget _buildSummarySection(Map<String, dynamic> summary) {
    final omzet = currency.format(summary['grossSales'] ?? 0);
    final profit = currency.format(summary['netProfit'] ?? 0);
    final txns = (summary['totalTransactions'] ?? 0).toString();
    final avg = currency.format(summary['averageBasketSize'] ?? 0);

    return pw.Row(
      mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
      children: [
        _buildStatCard('Total Omzet', omzet, PdfColors.blue700),
        _buildStatCard('Laba Bersih', profit, PdfColors.green700),
        _buildStatCard('Transaksi', txns, PdfColors.orange700),
        _buildStatCard('Rata-rata', avg, PdfColors.purple700),
      ],
    );
  }

  pw.Widget _buildStatCard(String label, String value, PdfColor color) {
    return pw.Container(
      width: 110,
      padding: const pw.EdgeInsets.all(10),
      decoration: pw.BoxDecoration(
        border: pw.Border.all(color: color, width: 1),
        borderRadius: pw.BorderRadius.circular(8),
        color: PdfColors.grey100,
      ),
      child: pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Text(label, style: pw.TextStyle(fontSize: 10, color: color)),
          pw.SizedBox(height: 4),
          pw.Text(value, style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold)),
        ],
      ),
    );
  }

  pw.Widget _buildTopProductsTable(List<Map<String, dynamic>> products) {
    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Text('Produk Terlaris', style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold)),
        pw.SizedBox(height: 8),
        pw.Table.fromTextArray(
          headers: ['No', 'Produk', 'Terjual', 'Total Penjualan'],
          data: List<List<dynamic>>.generate(products.length, (index) {
            final p = products[index];
            return [
              (index + 1).toString(),
              p['name'] ?? '-',
              p['totalQty'].toString(),
              currency.format(p['totalRevenue'] ?? 0),
            ];
          }),
          headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold, color: PdfColors.white),
          headerDecoration: const pw.BoxDecoration(color: PdfColors.blueGrey800),
          rowDecoration: const pw.BoxDecoration(border: pw.Border(bottom: pw.BorderSide(color: PdfColors.grey300))),
          cellAlignment: pw.Alignment.centerLeft,
          cellAlignments: {
            0: pw.Alignment.center,
            2: pw.Alignment.center,
            3: pw.Alignment.centerRight,
          },
        ),
      ],
    );
  }

  pw.Widget _buildPaymentMethodsTable(List<Map<String, dynamic>> methods) {
    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Text('Metode Pembayaran', style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold)),
        pw.SizedBox(height: 8),
        pw.Table.fromTextArray(
          headers: ['Metode', 'Jumlah Transaksi', 'Total Nilai'],
          data: methods.map((m) {
            return [
              m['method'] ?? '-',
              m['count'].toString(),
              currency.format(m['total'] ?? 0),
            ];
          }).toList(),
          headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold, color: PdfColors.white),
          headerDecoration: const pw.BoxDecoration(color: PdfColors.blueGrey800),
          cellAlignments: {
            1: pw.Alignment.center,
            2: pw.Alignment.centerRight,
          },
        ),
      ],
    );
  }

  pw.Widget _buildExpensesTable(List<Map<String, dynamic>> expenses) {
    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Text('Pengeluaran Terakhir', style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold)),
        pw.SizedBox(height: 8),
        pw.Table.fromTextArray(
          headers: ['Tanggal', 'Keterangan', 'Kategori', 'Jumlah'],
          data: expenses.take(10).map((e) {
            return [
              dateFormat.format(DateTime.parse(e['date'])),
              e['description'] ?? '-',
              e['category'] ?? '-',
              currency.format(e['amount'] ?? 0),
            ];
          }).toList(),
          headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold, color: PdfColors.white),
          headerDecoration: const pw.BoxDecoration(color: PdfColors.red800),
          cellAlignments: {
            3: pw.Alignment.centerRight,
          },
        ),
      ],
    );
  }

  pw.Widget _buildFooter() {
    return pw.Column(
      children: [
        pw.Divider(color: PdfColors.grey400),
        pw.Row(
          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
          children: [
            pw.Text('Dibuat otomatis oleh Rana App', style: const pw.TextStyle(fontSize: 10, color: PdfColors.grey600)),
            pw.Text(DateFormat('dd MMM yyyy HH:mm').format(DateTime.now()), style: const pw.TextStyle(fontSize: 10, color: PdfColors.grey600)),
          ],
        ),
      ],
    );
  }
}
