import 'package:flutter/material.dart';
import 'package:blue_thermal_printer/blue_thermal_printer.dart';
import 'package:rana_merchant/services/printer_service.dart';
import 'package:google_fonts/google_fonts.dart';

class PrinterSettingsScreen extends StatefulWidget {
  const PrinterSettingsScreen({super.key});

  @override
  State<PrinterSettingsScreen> createState() => _PrinterSettingsScreenState();
}

class _PrinterSettingsScreenState extends State<PrinterSettingsScreen> {
  final PrinterService _printerService = PrinterService();
  List<BluetoothDevice> _devices = [];
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadDevices();
  }

  Future<void> _loadDevices() async {
    setState(() => _isLoading = true);
    final devices = await _printerService.getBondedDevices();
    setState(() {
      _devices = devices;
      _isLoading = false;
    });
  }

  Future<void> _connect(BluetoothDevice device) async {
    setState(() => _isLoading = true);
    bool success = await _printerService.connect(device);
    setState(() => _isLoading = false);

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text("Berhasil Terhubung"), backgroundColor: Colors.green));
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text("Gagal Terhubung"), backgroundColor: Colors.red));
    }
  }

  Future<void> _disconnect() async {
    await _printerService.disconnect();
    setState(() {});
    if (mounted)
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text("Terputus")));
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    bool isConnected = _printerService.isConnected;

    return Scaffold(
      backgroundColor: colorScheme.surface,
      appBar: AppBar(
        title: Text('Perangkat & Printer',
            style: GoogleFonts.poppins(color: colorScheme.onSurface)),
        backgroundColor: colorScheme.surface,
        iconTheme: IconThemeData(color: colorScheme.onSurface),
        elevation: 0,
        actions: [
          if (isConnected)
            IconButton(
                onPressed: _disconnect,
                icon: const Icon(Icons.bluetooth_disabled),
                tooltip: 'Putuskan Koneksi')
        ],
      ),
      body: Column(
        children: [
          // Status Header
          Container(
            padding: const EdgeInsets.all(24),
            width: double.infinity,
            color: isConnected
                ? colorScheme.primaryContainer.withOpacity(0.3)
                : colorScheme.surfaceVariant.withOpacity(0.3),
            child: Column(
              children: [
                Icon(
                    isConnected
                        ? Icons.bluetooth_connected
                        : Icons.bluetooth_searching,
                    size: 48,
                    color: isConnected ? colorScheme.primary : colorScheme.outline),
                const SizedBox(height: 16),
                Text(
                  isConnected
                      ? "Terhubung ke ${_printerService.connectedDevice?.name ?? 'Unknown'}"
                      : "Belum Terhubung",
                  style: GoogleFonts.poppins(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: isConnected
                          ? colorScheme.primary
                          : colorScheme.onSurfaceVariant),
                  textAlign: TextAlign.center,
                ),
                if (isConnected) ...[
                  const SizedBox(height: 16),
                  FilledButton.icon(
                      onPressed: () => _printerService.printTest(),
                      icon: const Icon(Icons.print),
                      label: const Text("Tes Print"),
                      style: FilledButton.styleFrom(
                          backgroundColor: colorScheme.primary))
                ]
              ],
            ),
          ),

          Divider(height: 1, color: colorScheme.outlineVariant),
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text("Perangkat Tersedia (Paired)",
                    style: GoogleFonts.poppins(
                        fontWeight: FontWeight.bold,
                        color: colorScheme.onSurface)),
                IconButton(
                    onPressed: _loadDevices,
                    icon: Icon(Icons.refresh, color: colorScheme.primary))
              ],
            ),
          ),

          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _devices.isEmpty
                    ? Center(
                        child:
                            Column(mainAxisSize: MainAxisSize.min, children: [
                        Icon(Icons.bluetooth_disabled,
                            size: 48, color: colorScheme.outline),
                        const SizedBox(height: 8),
                        Text(
                            "Tidak ada perangkat bluetooth ditemukan.\nPastikan bluetooth aktif dan sudah dipairing.",
                            textAlign: TextAlign.center,
                            style:
                                TextStyle(color: colorScheme.onSurfaceVariant))
                      ]))
                    : ListView.builder(
                        itemCount: _devices.length,
                        itemBuilder: (context, index) {
                          final device = _devices[index];
                          bool isThisConnected = isConnected &&
                              _printerService.connectedDevice?.address ==
                                  device.address;

                          return ListTile(
                            leading: Icon(Icons.print,
                                color: isThisConnected
                                    ? colorScheme.primary
                                    : colorScheme.outline),
                            title: Text(device.name ?? "Unknown Device",
                                style: TextStyle(color: colorScheme.onSurface)),
                            subtitle: Text(device.address ?? "-",
                                style: TextStyle(
                                    color: colorScheme.onSurfaceVariant)),
                            trailing: isThisConnected
                                ? Icon(Icons.check_circle,
                                    color: colorScheme.primary)
                                : OutlinedButton(
                                    onPressed: () => _connect(device),
                                    style: OutlinedButton.styleFrom(
                                      foregroundColor: colorScheme.primary,
                                      side: BorderSide(
                                          color: colorScheme.primary),
                                    ),
                                    child: const Text("Hubungkan")),
                          );
                        },
                      ),
          )
        ],
      ),
    );
  }
}
