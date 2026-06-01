import 'dart:async';
import 'dart:math' as math;
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:rana_market/config/theme_config.dart';
import 'package:rana_market/data/market_api_service.dart';
import 'package:rana_market/providers/market_cart_provider.dart';
import 'package:rana_market/screens/product_detail_screen.dart';
import 'package:rana_market/widgets/interactive_widgets.dart';
import 'package:cached_network_image/cached_network_image.dart';

// ─── Message Model ────────────────────────────────────────────────────────────
enum AiIntent {
  greeting, order, promo, budget, health,
  reorder, search, schedule, voice, unknown,
}

enum MessageType {
  text, products, orderStatus, promo,
  budget, health, reorder, smartAction,
}

class AiMessage {
  final String text;
  final bool isMe;
  final MessageType type;
  final List<dynamic>? data;
  final DateTime timestamp;
  final String? emotion; // 'happy','thinking','excited','caring'

  AiMessage({
    required this.text,
    required this.isMe,
    this.type = MessageType.text,
    this.data,
    this.emotion,
  }) : timestamp = DateTime.now();
}

// ─── AI Brain ────────────────────────────────────────────────────────────────
class _RanaAiBrain {
  static AiIntent detectIntent(String text) {
    final t = text.toLowerCase();
    if (_matches(t, ['lacak', 'resi', 'pesanan', 'paket', 'dikirim', 'antar'])) return AiIntent.order;
    if (_matches(t, ['promo', 'diskon', 'voucher', 'murah', 'hemat', 'cashback'])) return AiIntent.promo;
    if (_matches(t, ['budget', 'pengeluaran', 'habis', 'uang', 'saldo', 'bayar'])) return AiIntent.budget;
    if (_matches(t, ['sehat', 'diet', 'kalori', 'nutrisi', 'kcal', 'protein', 'gizi'])) return AiIntent.health;
    if (_matches(t, ['pesan ulang', 'biasanya', 'favorit', 'langganan', 'lagi'])) return AiIntent.reorder;
    if (_matches(t, ['jadwal', 'besok', 'nanti', 'jam', 'pukul', 'malam ini'])) return AiIntent.schedule;
    return AiIntent.search;
  }

  static bool _matches(String text, List<String> keywords) =>
      keywords.any((k) => text.contains(k));

  static String cleanQuery(String text) {
    return text
        .toLowerCase()
        .replaceAll(RegExp(r'\b(tolong|carikan|aku|saya|mau|pengen|cari|yang|buat|dong|ya|deh|boleh|bisa)\b'), '')
        .trim();
  }

  static String respondBudget(double spent, double budget) {
    final pct = (spent / budget * 100).round();
    if (pct < 50) return '💚 Pengeluaranmu masih aman! Sudah terpakai **${pct}%** dari budget Rp ${ThemeConfig.formatCurrency(budget)}. Terus hemat ya!';
    if (pct < 80) return '🟡 Hati-hati, kamu sudah memakai **${pct}%** budget bulan ini (Rp ${ThemeConfig.formatCurrency(spent)} dari Rp ${ThemeConfig.formatCurrency(budget)}). Masih ada ruang, tapi perlu bijak!';
    return '🔴 Budget hampir habis! Terpakai **${pct}%** (Rp ${ThemeConfig.formatCurrency(spent)}). Rana sarankan tunda pembelian non-penting dulu ya.';
  }

  static String respondHealth(String query) {
    if (query.contains('nasi')) return '🥗 Nasi memang enak, tapi kalori-nya lumayan tinggi (±200 kkal/porsi). Mau Rana carikan alternatif yang lebih sehat dengan kalori lebih rendah?';
    if (query.contains('gorengan')) return '⚠️ Gorengan memang lezat, tapi lemak trans-nya cukup tinggi. Coba deh beralih ke camilan yang dipanggang. Mau Rana rekomendasikan?';
    return '🥦 Pilihan sehat itu investasi jangka panjang! Berdasarkan riwayat pesananmu, Rana merekomendasikan menu dengan protein tinggi dan rendah lemak. Mau lihat rekomendasinya?';
  }

  static List<Map<String, dynamic>> getMockReorderItems() {
    return [
      {'name': 'Nasi Goreng Spesial', 'store': 'Warung Bu Sari', 'price': 15000, 'orderedTimes': 8, 'lastOrder': '3 hari lalu'},
      {'name': 'Es Teh Manis', 'store': 'Warung Bu Sari', 'price': 5000, 'orderedTimes': 12, 'lastOrder': '3 hari lalu'},
      {'name': 'Ayam Geprek Sambel Bawang', 'store': 'Geprek Bensu', 'price': 22000, 'orderedTimes': 5, 'lastOrder': '1 minggu lalu'},
    ];
  }

  static Map<String, dynamic> getMockBudget() {
    return {
      'food': 245000.0,
      'transport': 85000.0,
      'shopping': 120000.0,
      'total': 450000.0,
      'budget': 700000.0,
    };
  }
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
class AiAssistantScreen extends StatefulWidget {
  const AiAssistantScreen({super.key});
  @override
  State<AiAssistantScreen> createState() => _AiAssistantScreenState();
}

class _AiAssistantScreenState extends State<AiAssistantScreen>
    with TickerProviderStateMixin {
  final _msgCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  final _focusNode = FocusNode();
  final List<AiMessage> _messages = [];
  bool _isTyping = false;
  bool _isListening = false;
  String _voiceText = '';
  late stt.SpeechToText _speech;
  late AnimationController _pulseCtrl;
  late AnimationController _waveCtrl;
  String _currentMode = 'chat'; // chat | voice | budget | health
  bool _showModePanel = false;

  static const _suggestions = [
    '🚚 Lacak pesanan',
    '🎁 Ada promo?',
    '🔁 Pesan ulang',
    '💰 Cek budget',
    '🥗 Menu sehat',
    '⏰ Jadwal antar',
  ];

  @override
  void initState() {
    super.initState();
    _speech = stt.SpeechToText();
    _pulseCtrl = AnimationController(vsync: this, duration: const Duration(seconds: 2))..repeat(reverse: true);
    _waveCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 800));
    _addWelcome();
  }

  void _addWelcome() {
    final hour = DateTime.now().hour;
    final greeting = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 19 ? 'Selamat sore' : 'Selamat malam';
    _messages.add(AiMessage(
      text: '$greeting! ✨ Aku **Rana AI 2.0** — asisten super cerdas-mu.\n\nAku bisa bantu:\n• 🎤 Pesan via suara\n• 🔁 Pesan ulang favoritmu\n• 💰 Pantau pengeluaran\n• 🥗 Rekomendasikan menu sehat\n• 📦 Lacak pesanan\n\nMau apa dulu nih?',
      isMe: false,
      emotion: 'happy',
    ));
  }

  @override
  void dispose() {
    _msgCtrl.dispose();
    _scrollCtrl.dispose();
    _focusNode.dispose();
    _pulseCtrl.dispose();
    _waveCtrl.dispose();
    _speech.stop();
    super.dispose();
  }

  // ── Voice ──────────────────────────────────────────────────────────────────
  Future<void> _toggleVoice() async {
    if (_isListening) {
      _speech.stop();
      setState(() { _isListening = false; _currentMode = 'chat'; });
      _waveCtrl.stop();
      if (_voiceText.isNotEmpty) _sendMessage(_voiceText);
      return;
    }
    HapticFeedback.heavyImpact();
    final available = await _speech.initialize(
      onError: (_) => setState(() { _isListening = false; _waveCtrl.stop(); }),
      onStatus: (s) { if (s == 'done') setState(() { _isListening = false; _waveCtrl.stop(); }); },
    );
    if (available) {
      setState(() { _isListening = true; _voiceText = ''; _currentMode = 'voice'; });
      _waveCtrl.repeat(reverse: true);
      _speech.listen(
        onResult: (r) => setState(() => _voiceText = r.recognizedWords),
        localeId: 'id_ID',
      );
    } else {
      PremiumToast.show(context,
        message: 'Mikrofon tidak tersedia di perangkat ini.',
        icon: Icons.mic_off_rounded,
        gradient: [Colors.red, Colors.orange],
      );
    }
  }

  // ── Send ───────────────────────────────────────────────────────────────────
  Future<void> _sendMessage([String? preset]) async {
    final text = (preset ?? _msgCtrl.text).trim();
    if (text.isEmpty) return;
    HapticFeedback.selectionClick();
    setState(() {
      _messages.add(AiMessage(text: text, isMe: true));
      _msgCtrl.clear();
      _isTyping = true;
    });
    _scrollToBottom();
    _focusNode.unfocus();

    // Simulate AI thinking delay
    final intent = _RanaAiBrain.detectIntent(text);
    final thinkMs = 800 + math.Random().nextInt(1000);
    await Future.delayed(Duration(milliseconds: thinkMs));

    if (!mounted) return;
    await _handleIntent(intent, text);
  }

  Future<void> _handleIntent(AiIntent intent, String text) async {
    switch (intent) {
      case AiIntent.order:
        setState(() {
          _isTyping = false;
          _messages.add(AiMessage(
            text: '📦 Saya menemukan pesanan aktif kamu! Berikut status terkini:',
            isMe: false, type: MessageType.orderStatus, emotion: 'thinking',
          ));
        });
        break;

      case AiIntent.promo:
        setState(() {
          _isTyping = false;
          _messages.add(AiMessage(
            text: '🎁 Yeay! Aku menemukan **3 promo eksklusif** yang cocok buat kamu hari ini:',
            isMe: false, type: MessageType.promo, emotion: 'excited',
          ));
        });
        break;

      case AiIntent.budget:
        final data = _RanaAiBrain.getMockBudget();
        final response = _RanaAiBrain.respondBudget(data['total']!, data['budget']!);
        setState(() {
          _isTyping = false;
          _messages.add(AiMessage(
            text: response,
            isMe: false, type: MessageType.budget, data: [data], emotion: 'caring',
          ));
        });
        break;

      case AiIntent.health:
        final response = _RanaAiBrain.respondHealth(text);
        setState(() {
          _isTyping = false;
          _messages.add(AiMessage(
            text: response,
            isMe: false, type: MessageType.health, emotion: 'caring',
          ));
        });
        // Follow-up search
        await Future.delayed(1.2.seconds);
        if (!mounted) return;
        final results = await _trySearch('ayam panggang salad sehat rendah kalori');
        if (mounted && results.isNotEmpty) {
          setState(() => _messages.add(AiMessage(
            text: '🥦 Ini pilihan menu sehat terdekat yang Rana rekomendasikan:',
            isMe: false, type: MessageType.products, data: results,
          )));
        }
        break;

      case AiIntent.reorder:
        final items = _RanaAiBrain.getMockReorderItems();
        setState(() {
          _isTyping = false;
          _messages.add(AiMessage(
            text: '🔁 Berdasarkan riwayat kamu, ini yang biasa dipesan. Mau aku pesankan lagi?',
            isMe: false, type: MessageType.reorder, data: items, emotion: 'happy',
          ));
        });
        break;

      case AiIntent.schedule:
        setState(() {
          _isTyping = false;
          _messages.add(AiMessage(
            text: '⏰ Fitur **Scheduled Order** sedang dalam pengembangan! Kamu bisa jadwalkan pesanan hingga 12 jam ke depan. Untuk sekarang, aku carikan yang bisa antar cepat ya?',
            isMe: false, type: MessageType.smartAction, emotion: 'thinking',
          ));
        });
        break;

      default:
        final q = _RanaAiBrain.cleanQuery(text);
        final results = await _trySearch(q);
        setState(() {
          _isTyping = false;
          if (results.isEmpty) {
            _messages.add(AiMessage(
              text: 'Hmm, saya belum menemukan yang cocok untuk **"$text"**. Mau coba kata kunci lain? Atau aku bisa cari di toko-toko terdekat kamu.',
              isMe: false, emotion: 'thinking',
            ));
          } else {
            _messages.add(AiMessage(
              text: '✨ Ketemu! Saya menemukan **${results.length} produk** terbaik untuk "$text":',
              isMe: false, type: MessageType.products, data: results, emotion: 'excited',
            ));
          }
        });
    }
    _scrollToBottom();
  }

  Future<List<dynamic>> _trySearch(String q) async {
    try { return await MarketApiService().searchGlobal(query: q, limit: 6); }
    catch (_) { return []; }
  }

  void _scrollToBottom() {
    Future.delayed(150.ms, () {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent + 400,
          duration: 450.ms, curve: Curves.easeOutQuart,
        );
      }
    });
  }

  // ── Build ──────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F6FA),
      extendBodyBehindAppBar: true,
      appBar: _buildAppBar(),
      body: Stack(
        children: [
          _buildBackground(),
          Column(
            children: [
              Expanded(
                child: ListView.builder(
                  controller: _scrollCtrl,
                  padding: const EdgeInsets.only(top: 110, bottom: 210),
                  itemCount: _messages.length + (_isTyping ? 1 : 0),
                  itemBuilder: (ctx, i) {
                    if (i == _messages.length && _isTyping) return const _TypingBubble();
                    return _AiMessageBubble(
                      message: _messages[i],
                      onQuickAction: _sendMessage,
                    ).animate().fadeIn(duration: 350.ms).slideY(begin: 0.08);
                  },
                ),
              ),
            ],
          ),
          Positioned(
            bottom: 0, left: 0, right: 0,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (_isListening) _buildVoicePanel(),
                _buildSuggestions(),
                _buildInputBar(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      leading: IconButton(
        icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
        onPressed: () => Navigator.pop(context),
      ),
      title: Row(
        children: [
          AnimatedBuilder(
            animation: _pulseCtrl,
            builder: (_, __) => Container(
              width: 38, height: 38,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [const Color(0xFF667EEA), const Color(0xFF764BA2)],
                  begin: Alignment.topLeft, end: Alignment.bottomRight,
                ),
                shape: BoxShape.circle,
                boxShadow: [BoxShadow(
                  color: const Color(0xFF667EEA).withOpacity(0.3 + _pulseCtrl.value * 0.3),
                  blurRadius: 12, spreadRadius: 2,
                )],
              ),
              child: const Icon(Icons.auto_awesome_rounded, color: Colors.white, size: 20),
            ),
          ),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Rana AI 2.0', style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 16)),
              Row(
                children: [
                  Container(width: 6, height: 6, decoration: const BoxDecoration(color: Color(0xFF43E97B), shape: BoxShape.circle)),
                  const SizedBox(width: 4),
                  Text('Super Intelligent', style: GoogleFonts.poppins(color: Colors.white70, fontSize: 10, fontWeight: FontWeight.w600)),
                ],
              ),
            ],
          ),
        ],
      ),
      actions: [
        IconButton(
          icon: const Icon(Icons.tune_rounded, color: Colors.white70),
          onPressed: () => setState(() => _showModePanel = !_showModePanel),
        ),
        IconButton(
          icon: const Icon(Icons.refresh_rounded, color: Colors.white70),
          onPressed: () {
            HapticFeedback.mediumImpact();
            setState(() { _messages.clear(); _addWelcome(); });
          },
        ),
      ],
      backgroundColor: Colors.transparent,
      elevation: 0,
      flexibleSpace: ClipRect(
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
          child: Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFF1A1A2E), Color(0xFF16213E)],
                begin: Alignment.topLeft, end: Alignment.bottomRight,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildBackground() {
    return Positioned.fill(
      child: AnimatedBuilder(
        animation: _pulseCtrl,
        builder: (_, __) => CustomPaint(painter: _AiBgPainter(_pulseCtrl.value)),
      ),
    );
  }

  Widget _buildVoicePanel() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [Color(0xFF667EEA), Color(0xFF764BA2)]),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [BoxShadow(color: const Color(0xFF667EEA).withOpacity(0.4), blurRadius: 20, offset: const Offset(0, 8))],
      ),
      child: Column(
        children: [
          Row(
            children: [
              const Icon(Icons.mic_rounded, color: Colors.white, size: 20),
              const SizedBox(width: 8),
              Text('Mendengarkan...', style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.w700)),
              const Spacer(),
              GestureDetector(
                onTap: _toggleVoice,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(12)),
                  child: Text('Selesai', style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 12)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (_voiceText.isNotEmpty)
            Text('"$_voiceText"', style: GoogleFonts.poppins(color: Colors.white, fontSize: 14, fontStyle: FontStyle.italic))
          else
            _WaveVisualizer(controller: _waveCtrl),
        ],
      ),
    ).animate().slideY(begin: 0.3, duration: 300.ms, curve: Curves.easeOutBack);
  }

  Widget _buildSuggestions() {
    return SizedBox(
      height: 44,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        scrollDirection: Axis.horizontal,
        itemCount: _suggestions.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (ctx, i) => GestureDetector(
          onTap: () => _sendMessage(_suggestions[i]),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 8)],
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Text(_suggestions[i], style: GoogleFonts.poppins(fontSize: 11.5, fontWeight: FontWeight.w700, color: const Color(0xFF1A1A2E))),
          ),
        ).animate().fadeIn(delay: (80 * i).ms).slideX(begin: 0.2),
      ),
    );
  }

  Widget _buildInputBar() {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 6, 16, 0),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(30),
        boxShadow: [BoxShadow(color: const Color(0xFF667EEA).withOpacity(0.15), blurRadius: 24, offset: const Offset(0, 8))],
        border: Border.all(color: Colors.grey.shade100, width: 1.5),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            const SizedBox(width: 6),
            // Voice button
            GestureDetector(
              onTap: _toggleVoice,
              child: AnimatedBuilder(
                animation: _pulseCtrl,
                builder: (_, __) => Container(
                  margin: const EdgeInsets.all(6),
                  width: 40, height: 40,
                  decoration: BoxDecoration(
                    gradient: _isListening
                        ? const LinearGradient(colors: [Color(0xFF667EEA), Color(0xFF764BA2)])
                        : LinearGradient(colors: [Colors.grey.shade100, Colors.grey.shade200]),
                    shape: BoxShape.circle,
                    boxShadow: _isListening ? [BoxShadow(color: const Color(0xFF667EEA).withOpacity(0.3 + _pulseCtrl.value * 0.3), blurRadius: 12)] : null,
                  ),
                  child: Icon(
                    _isListening ? Icons.mic_rounded : Icons.mic_none_rounded,
                    color: _isListening ? Colors.white : Colors.grey.shade500,
                    size: 20,
                  ),
                ),
              ),
            ),
            Expanded(
              child: TextField(
                controller: _msgCtrl,
                focusNode: _focusNode,
                maxLines: null,
                style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.w600),
                decoration: InputDecoration(
                  hintText: 'Tanya apa saja ke Rana AI...',
                  hintStyle: GoogleFonts.poppins(fontSize: 13, color: Colors.grey.shade400, fontWeight: FontWeight.w500),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 4, vertical: 12),
                ),
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => _sendMessage(),
              ),
            ),
            // Send button
            GestureDetector(
              onTap: _sendMessage,
              child: Container(
                margin: const EdgeInsets.all(6),
                width: 42, height: 42,
                decoration: const BoxDecoration(
                  gradient: LinearGradient(colors: [Color(0xFF667EEA), Color(0xFF764BA2)]),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.send_rounded, color: Colors.white, size: 20),
              ),
            ).animate(onPlay: (c) => c.repeat(reverse: true)).shimmer(duration: 3.seconds, color: const Color(0xFFFFFFFF).withOpacity(0.3)),
          ],
        ),
      ),
    ).animate().slideY(begin: 0.3, duration: 600.ms, curve: Curves.easeOutBack);
  }
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
class _AiMessageBubble extends StatelessWidget {
  final AiMessage message;
  final Function(String) onQuickAction;

  const _AiMessageBubble({required this.message, required this.onQuickAction});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: Column(
        crossAxisAlignment: message.isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: message.isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              if (!message.isMe) _AiAvatar(emotion: message.emotion),
              const SizedBox(width: 8),
              Flexible(child: _buildBubble(context)),
            ],
          ),
          if (message.type != MessageType.text) const SizedBox(height: 10),
          if (message.type == MessageType.products && message.data != null)
            _ProductsRow(products: message.data!),
          if (message.type == MessageType.orderStatus)
            _OrderStatusCard(),
          if (message.type == MessageType.promo)
            _PromoCards(),
          if (message.type == MessageType.budget && message.data != null)
            _BudgetCard(data: message.data!.first),
          if (message.type == MessageType.reorder && message.data != null)
            _ReorderCards(items: message.data!, onOrder: onQuickAction),
          if (message.type == MessageType.health)
            _HealthTips(),
          const SizedBox(height: 2),
          Padding(
            padding: EdgeInsets.only(left: message.isMe ? 0 : 44),
            child: Text(
              _formatTime(message.timestamp),
              style: GoogleFonts.poppins(fontSize: 9, color: Colors.grey.shade400),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBubble(BuildContext context) {
    final isMe = message.isMe;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
      decoration: BoxDecoration(
        gradient: isMe
            ? const LinearGradient(colors: [Color(0xFF667EEA), Color(0xFF764BA2)], begin: Alignment.topLeft, end: Alignment.bottomRight)
            : null,
        color: isMe ? null : Colors.white,
        borderRadius: BorderRadius.only(
          topLeft: const Radius.circular(20),
          topRight: const Radius.circular(20),
          bottomLeft: Radius.circular(isMe ? 20 : 4),
          bottomRight: Radius.circular(isMe ? 4 : 20),
        ),
        boxShadow: [
          BoxShadow(
            color: isMe ? const Color(0xFF667EEA).withOpacity(0.25) : Colors.black.withOpacity(0.06),
            blurRadius: 12, offset: const Offset(0, 4),
          ),
        ],
      ),
      child: _parseMarkdown(message.text, isMe),
    );
  }

  Widget _parseMarkdown(String text, bool isMe) {
    // Simple bold parsing: **text**
    final parts = text.split('**');
    if (parts.length < 2) {
      return Text(text, style: GoogleFonts.poppins(color: isMe ? Colors.white : const Color(0xFF1A1A2E), fontSize: 13.5, height: 1.5));
    }
    final spans = <TextSpan>[];
    for (int i = 0; i < parts.length; i++) {
      spans.add(TextSpan(
        text: parts[i],
        style: TextStyle(fontWeight: i.isOdd ? FontWeight.w900 : FontWeight.w500),
      ));
    }
    return RichText(
      text: TextSpan(
        style: GoogleFonts.poppins(color: isMe ? Colors.white : const Color(0xFF1A1A2E), fontSize: 13.5, height: 1.5),
        children: spans,
      ),
    );
  }

  String _formatTime(DateTime dt) {
    final h = dt.hour.toString().padLeft(2, '0');
    final m = dt.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }
}

// ─── AI Avatar ────────────────────────────────────────────────────────────────
class _AiAvatar extends StatelessWidget {
  final String? emotion;
  const _AiAvatar({this.emotion});

  @override
  Widget build(BuildContext context) {
    final icon = switch (emotion) {
      'happy' => Icons.sentiment_very_satisfied_rounded,
      'thinking' => Icons.psychology_rounded,
      'excited' => Icons.auto_awesome_rounded,
      'caring' => Icons.favorite_rounded,
      _ => Icons.smart_toy_rounded,
    };
    return Container(
      width: 32, height: 32,
      decoration: const BoxDecoration(
        gradient: LinearGradient(colors: [Color(0xFF667EEA), Color(0xFF764BA2)]),
        shape: BoxShape.circle,
      ),
      child: Icon(icon, color: Colors.white, size: 16),
    );
  }
}

// ─── Typing Bubble ────────────────────────────────────────────────────────────
class _TypingBubble extends StatelessWidget {
  const _TypingBubble();
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 6, 16, 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          const _AiAvatar(emotion: 'thinking'),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: const BorderRadius.only(topLeft: Radius.circular(20), topRight: Radius.circular(20), bottomLeft: Radius.circular(4), bottomRight: Radius.circular(20)),
              boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 12)],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: List.generate(3, (i) =>
                Container(
                  margin: const EdgeInsets.symmetric(horizontal: 2),
                  width: 7, height: 7,
                  decoration: const BoxDecoration(color: Color(0xFF667EEA), shape: BoxShape.circle),
                ).animate(onPlay: (c) => c.repeat()).moveY(begin: 0, end: -4, delay: (150 * i).ms, duration: 450.ms, curve: Curves.easeInOut),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Sub-Widgets ──────────────────────────────────────────────────────────────
class _ProductsRow extends StatelessWidget {
  final List<dynamic> products;
  const _ProductsRow({required this.products});
  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 210,
      child: ListView.builder(
        padding: const EdgeInsets.only(left: 44),
        scrollDirection: Axis.horizontal,
        itemCount: products.length,
        itemBuilder: (ctx, i) {
          final p = products[i];
          final img = p['imageUrl'] != null ? MarketApiService().resolveFileUrl(p['imageUrl']) : null;
          final price = (p['price'] as num?)?.toDouble() ?? 0;
          return PressScaleButton(
            onTap: () => Navigator.push(ctx, MaterialPageRoute(
              builder: (_) => ProductDetailScreen(product: p, storeId: p['storeId']?.toString() ?? '', storeName: p['store']?['name'] ?? 'Toko'))),
            child: Container(
              width: 140, margin: const EdgeInsets.only(right: 12, bottom: 4),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18),
                boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.07), blurRadius: 12, offset: const Offset(0, 4))]),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                ClipRRect(borderRadius: const BorderRadius.vertical(top: Radius.circular(18)),
                  child: img != null ? CachedNetworkImage(imageUrl: img, height: 110, width: 140, fit: BoxFit.cover,
                    errorWidget: (_, __, ___) => Container(height: 110, color: Colors.grey.shade100, child: const Icon(Icons.image, color: Colors.grey)))
                  : Container(height: 110, color: Colors.grey.shade100, child: const Icon(Icons.image, color: Colors.grey))),
                Padding(padding: const EdgeInsets.all(10), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(p['name'] ?? '', maxLines: 2, overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.poppins(fontWeight: FontWeight.w700, fontSize: 11.5, height: 1.3)),
                  const SizedBox(height: 4),
                  Text('Rp${ThemeConfig.formatCurrency(price)}',
                    style: GoogleFonts.poppins(fontWeight: FontWeight.w900, color: const Color(0xFF667EEA), fontSize: 13)),
                ])),
              ]),
            ),
          ).animate().fadeIn(delay: (80 * i).ms).slideX(begin: 0.3, curve: Curves.easeOutBack);
        },
      ),
    );
  }
}

class _OrderStatusCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(left: 44),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white, borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF667EEA).withOpacity(0.3)),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 12)],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(color: const Color(0xFF667EEA).withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
            child: const Icon(Icons.local_shipping_rounded, color: Color(0xFF667EEA), size: 20)),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Sedang Dikirim 🚚', style: GoogleFonts.poppins(fontWeight: FontWeight.w800, color: const Color(0xFF667EEA), fontSize: 13)),
            Text('INV/2026/RANA/1234', style: GoogleFonts.poppins(fontSize: 10, color: Colors.grey)),
          ])),
        ]),
        const SizedBox(height: 14),
        AnimatedProgressStepper(steps: const ['Dikonfirmasi', 'Diproses', 'Dikirim', 'Tiba'], currentStep: 2),
        const SizedBox(height: 14),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(color: const Color(0xFFF0F2F8), borderRadius: BorderRadius.circular(12)),
          child: Row(children: [
            const Icon(Icons.access_time_rounded, size: 14, color: Colors.grey),
            const SizedBox(width: 6),
            Text('Estimasi tiba: 15–20 menit', style: GoogleFonts.poppins(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.grey.shade700)),
          ]),
        ),
      ]),
    ).animate().fadeIn(delay: 200.ms).slideY(begin: 0.2);
  }
}

class _PromoCards extends StatelessWidget {
  final _promos = const [
    {'title': 'Diskon 50%', 'sub': 'Semua menu makanan', 'code': 'RANA50', 'colors': [Color(0xFF667EEA), Color(0xFF764BA2)]},
    {'title': 'Cashback 25rb', 'sub': 'Min. transaksi 75rb', 'code': 'CB25K', 'colors': [Color(0xFFF093FB), Color(0xFFF5576C)]},
    {'title': 'Gratis Ongkir', 'sub': 'Radius hingga 10 km', 'code': 'FREEONGKIR', 'colors': [Color(0xFF43E97B), Color(0xFF38F9D7)]},
  ];
  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 120,
      child: ListView.builder(
        padding: const EdgeInsets.only(left: 44),
        scrollDirection: Axis.horizontal,
        itemCount: _promos.length,
        itemBuilder: (_, i) {
          final p = _promos[i];
          final colors = p['colors'] as List<Color>;
          return GestureDetector(
            onTap: () {
              HapticFeedback.mediumImpact();
              PremiumToast.show(context,
                message: 'Kode ${p['code']} disalin! 🎉',
                icon: Icons.copy_rounded,
                gradient: colors,
              );
            },
            child: Container(
              width: 200, margin: const EdgeInsets.only(right: 12),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: LinearGradient(colors: colors),
                borderRadius: BorderRadius.circular(18),
                boxShadow: [BoxShadow(color: colors.first.withOpacity(0.3), blurRadius: 12, offset: const Offset(0, 6))],
              ),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                Text(p['title'] as String, style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 17)),
                Text(p['sub'] as String, style: GoogleFonts.poppins(color: Colors.white70, fontSize: 11)),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(color: Colors.white.withOpacity(0.25), borderRadius: BorderRadius.circular(8)),
                  child: Text(p['code'] as String, style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 12, letterSpacing: 1)),
                ),
              ]),
            ),
          ).animate().slideX(begin: 0.3, delay: (100 * i).ms, curve: Curves.easeOutBack);
        },
      ),
    );
  }
}

class _BudgetCard extends StatelessWidget {
  final Map<String, dynamic> data;
  const _BudgetCard({required this.data});
  @override
  Widget build(BuildContext context) {
    final total = data['total'] as double;
    final budget = data['budget'] as double;
    final pct = total / budget;
    final color = pct < 0.5 ? const Color(0xFF43E97B) : pct < 0.8 ? const Color(0xFFFFB800) : const Color(0xFFE63946);

    return Container(
      margin: const EdgeInsets.only(left: 44),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white, borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 14)],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text('💰 Budget Bulan Ini', style: GoogleFonts.poppins(fontWeight: FontWeight.w800, fontSize: 14)),
          Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
            child: Text('${(pct * 100).round()}% terpakai', style: GoogleFonts.poppins(color: color, fontWeight: FontWeight.w800, fontSize: 11))),
        ]),
        const SizedBox(height: 14),
        ClipRRect(borderRadius: BorderRadius.circular(6),
          child: LinearProgressIndicator(value: pct.clamp(0.0, 1.0), minHeight: 10, backgroundColor: Colors.grey.shade100,
            valueColor: AlwaysStoppedAnimation(color))),
        const SizedBox(height: 14),
        ...[
          ['🍔 Makanan', data['food'] as double, const Color(0xFFF093FB)],
          ['🚗 Transport', data['transport'] as double, const Color(0xFF4FACFE)],
          ['🛍️ Belanja', data['shopping'] as double, const Color(0xFFFFB800)],
        ].map((item) => Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Row(children: [
            Text(item[0] as String, style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.w600)),
            const Spacer(),
            Text('Rp${ThemeConfig.formatCurrency(item[1] as double)}',
              style: GoogleFonts.poppins(fontWeight: FontWeight.w800, color: item[2] as Color, fontSize: 12)),
          ]),
        )),
        Divider(color: Colors.grey.shade100),
        Row(children: [
          Text('Total', style: GoogleFonts.poppins(fontWeight: FontWeight.w900, fontSize: 14)),
          const Spacer(),
          Text('Rp${ThemeConfig.formatCurrency(total)} / Rp${ThemeConfig.formatCurrency(budget)}',
            style: GoogleFonts.poppins(fontWeight: FontWeight.w900, color: color, fontSize: 13)),
        ]),
      ]),
    ).animate().fadeIn(delay: 200.ms).slideY(begin: 0.2);
  }
}

class _ReorderCards extends StatelessWidget {
  final List<dynamic> items;
  final Function(String) onOrder;
  const _ReorderCards({required this.items, required this.onOrder});
  @override
  Widget build(BuildContext context) {
    return Column(
      children: items.map((raw) {
        final item = raw as Map<String, dynamic>;
        return
        Container(
          margin: const EdgeInsets.only(left: 44, bottom: 10),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white, borderRadius: BorderRadius.circular(18),
            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 12)],
          ),
          child: Row(children: [
            Container(width: 44, height: 44,
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [ThemeConfig.brandColor, Color(0xFFFFA07A)]),
                borderRadius: BorderRadius.circular(12)),
              child: const Icon(Icons.fastfood_rounded, color: Colors.white, size: 22)),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(item['name'] as String, style: GoogleFonts.poppins(fontWeight: FontWeight.w800, fontSize: 13)),
              Text('${item['store']} • ${item['lastOrder']}', style: GoogleFonts.poppins(fontSize: 10, color: Colors.grey)),
              Text('Dipesan ${item['orderedTimes']}x', style: GoogleFonts.poppins(fontSize: 10, color: const Color(0xFF667EEA), fontWeight: FontWeight.w700)),
            ])),
            const SizedBox(width: 8),
            Column(children: [
              Text('Rp${ThemeConfig.formatCurrency((item['price'] as num).toDouble())}',
                style: GoogleFonts.poppins(fontWeight: FontWeight.w900, color: ThemeConfig.brandColor, fontSize: 13)),
              const SizedBox(height: 6),
              NeonGlowButton(label: 'Pesan', icon: Icons.add_rounded, onTap: () => onOrder('pesan ${item['name']}'),
                colors: const [Color(0xFF667EEA), Color(0xFF764BA2)]),
            ]),
          ]),
        ),
      ).toList(),
    );
  }
}

class _HealthTips extends StatelessWidget {
  final _tips = const [
    {'icon': '🥦', 'title': 'Sayuran Hijau', 'cal': '~50 kkal', 'tip': 'Tinggi serat & vitamin'},
    {'icon': '🍗', 'title': 'Ayam Panggang', 'cal': '~165 kkal', 'tip': 'Protein tinggi, lemak rendah'},
    {'icon': '🥚', 'title': 'Telur Rebus', 'cal': '~78 kkal', 'tip': 'Lengkap nutrisinya'},
  ];
  @override
  Widget build(BuildContext context) {
    return Column(
      children: _tips.map((t) => Container(
        margin: const EdgeInsets.only(left: 44, bottom: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white, borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFF43E97B).withOpacity(0.3)),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 10)],
        ),
        child: Row(children: [
          Text(t['icon'] as String, style: const TextStyle(fontSize: 28)),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(t['title'] as String, style: GoogleFonts.poppins(fontWeight: FontWeight.w800, fontSize: 13)),
            Text(t['tip'] as String, style: GoogleFonts.poppins(fontSize: 11, color: Colors.grey)),
          ])),
          Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(color: const Color(0xFF43E97B).withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
            child: Text(t['cal'] as String, style: GoogleFonts.poppins(color: const Color(0xFF43E97B), fontWeight: FontWeight.w800, fontSize: 11))),
        ]),
      )).toList(),
    );
  }
}

class _WaveVisualizer extends StatelessWidget {
  final AnimationController controller;
  const _WaveVisualizer({required this.controller});
  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (_, __) => Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: List.generate(12, (i) {
          final h = 4.0 + math.sin((controller.value * math.pi * 2) + (i * 0.5)) * 14;
          return Container(
            margin: const EdgeInsets.symmetric(horizontal: 2),
            width: 4, height: h.abs() + 4,
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.7 + (math.sin(i * 0.8) * 0.3)),
              borderRadius: BorderRadius.circular(2),
            ),
          );
        }),
      ),
    );
  }
}

// ─── Background Painter ───────────────────────────────────────────────────────
class _AiBgPainter extends CustomPainter {
  final double progress;
  _AiBgPainter(this.progress);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..style = PaintingStyle.fill;

    // Top orb
    paint.color = const Color(0xFF667EEA).withOpacity(0.06 + progress * 0.03);
    canvas.drawCircle(Offset(size.width * 0.8, -30), 160, paint);

    // Bottom orb
    paint.color = const Color(0xFF764BA2).withOpacity(0.04 + progress * 0.02);
    canvas.drawCircle(Offset(size.width * 0.1, size.height * 0.8), 120, paint);
  }

  @override
  bool shouldRepaint(_AiBgPainter old) => old.progress != progress;
}
