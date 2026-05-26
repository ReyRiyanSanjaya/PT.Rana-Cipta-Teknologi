import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:mobile_driver/providers/driver_provider.dart';
import 'package:flutter_animate/flutter_animate.dart';

class SetDestinationScreen extends StatefulWidget {
  const SetDestinationScreen({super.key});

  @override
  State<SetDestinationScreen> createState() => _SetDestinationScreenState();
}

class _SetDestinationScreenState extends State<SetDestinationScreen> {
  final _searchCtrl = TextEditingController();
  final List<Map<String, String>> _searchResults = [
    {'name': 'Rumah', 'address': 'Jl. Cempaka Putih No. 12, Jakarta Pusat'},
    {'name': 'Kantor', 'address': 'Menara Mandiri, Jl. Jenderal Sudirman, Jakarta Selatan'},
    {'name': 'Stasiun Gambir', 'address': 'Jl. Medan Merdeka Timur, Jakarta Pusat'},
    {'name': 'Mall Grand Indonesia', 'address': 'Jl. M.H. Thamrin No.1, Jakarta Pusat'},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: Text('Atur Tujuan', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        foregroundColor: Colors.black87,
      ),
      body: Column(
        children: [
          _buildSearchBar(),
          const Divider(height: 1),
          Expanded(
            child: ListView.builder(
              itemCount: _searchResults.length,
              itemBuilder: (context, index) {
                final item = _searchResults[index];
                return ListTile(
                  leading: Icon(item['name'] == 'Rumah' ? Icons.home_rounded : item['name'] == 'Kantor' ? Icons.work_rounded : Icons.location_on_rounded, color: Colors.grey.shade600),
                  title: Text(item['name']!, style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Text(item['address']!, maxLines: 1, overflow: TextOverflow.ellipsis),
                  onTap: () {
                    Provider.of<DriverProvider>(context, listen: false).setDestination(item['address']!);
                    Navigator.pop(context);
                  },
                ).animate().fadeIn(delay: (100 * index).ms).slideX(begin: 0.1);
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: TextField(
        controller: _searchCtrl,
        decoration: InputDecoration(
          hintText: 'Cari alamat tujuan...',
          prefixIcon: const Icon(Icons.search, color: Colors.grey),
          filled: true,
          fillColor: Colors.grey.shade100,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide.none,
          ),
        ),
      ),
    );
  }
}
