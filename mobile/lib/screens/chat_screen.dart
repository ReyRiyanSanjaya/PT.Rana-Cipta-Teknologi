import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:rana_merchant/data/remote/api_service.dart';
import 'package:rana_merchant/providers/auth_provider.dart';
import 'package:rana_merchant/services/realtime_service.dart';
import 'package:rana_merchant/config/theme_config.dart';
import 'package:intl/intl.dart';
import 'package:rana_merchant/services/sound_service.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:typed_data';
import 'package:flutter/services.dart';
import 'dart:async';
import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'package:emoji_picker_flutter/emoji_picker_flutter.dart' as emoji;

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final ApiService _api = ApiService();
  List<dynamic> _rooms = [];
  bool _isLoading = true;
  StreamSubscription? _chatSub;

  @override
  void initState() {
    super.initState();
    _loadRooms();
    _initSocket();
  }

  void _initSocket() {
    _chatSub = RealtimeService().chatMessageStream.listen((data) {
      if (!mounted) return;
      // Refresh room list to show new last message/unread count
      _loadRooms();
    });
  }

  @override
  void dispose() {
    _chatSub?.cancel();
    super.dispose();
  }

  Future<void> _loadRooms() async {
    setState(() => _isLoading = true);
    final rooms = await _api.fetchChatRooms();
    if (mounted) {
      setState(() {
        _rooms = rooms;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Diskusi Komunitas',
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadRooms,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _rooms.isEmpty
              ? _buildEmptyState()
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: _rooms.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final room = _rooms[index];
                    return _buildRoomCard(room);
                  },
                ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.chat_bubble_outline, size: 64, color: Colors.grey[400]),
          const SizedBox(height: 16),
          Text(
            'Belum ada grup diskusi',
            style: GoogleFonts.outfit(
              fontSize: 16,
              color: Colors.grey[600],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRoomCard(Map<String, dynamic> room) {
    final String name = room['storeName'] ?? room['name'] ?? 'Grup Diskusi';
    final String lastMsg = room['lastMessage']?['content'] ?? 'Belum ada pesan';
    final int unread = room['unread'] ?? 0;
    final String iconLetter = name.isNotEmpty ? name[0].toUpperCase() : 'D';

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.grey.withOpacity(0.1)),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: CircleAvatar(
          backgroundColor: ThemeConfig.brandColor.withOpacity(0.1),
          child: Text(
            iconLetter,
            style: GoogleFonts.outfit(
              color: ThemeConfig.brandColor,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        title: Text(
          name,
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold),
        ),
        subtitle: Text(
          lastMsg,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: GoogleFonts.outfit(fontSize: 13),
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            if (unread > 0)
              Container(
                padding: const EdgeInsets.all(6),
                decoration: const BoxDecoration(
                  color: ThemeConfig.brandColor,
                  shape: BoxShape.circle,
                ),
                child: Text(
                  '$unread',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            const Icon(Icons.chevron_right, size: 20, color: Colors.grey),
          ],
        ),
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => ChatRoomScreen(
                roomId: room['id'].toString(),
                roomName: name,
              ),
            ),
          ).then((_) => _loadRooms());
        },
      ),
    );
  }
}

class ChatRoomScreen extends StatefulWidget {
  final String roomId;
  final String roomName;

  const ChatRoomScreen({
    super.key,
    required this.roomId,
    required this.roomName,
  });

  @override
  State<ChatRoomScreen> createState() => _ChatRoomScreenState();
}

class _ChatRoomScreenState extends State<ChatRoomScreen> {
  final ApiService _api = ApiService();
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  List<dynamic> _messages = [];
  final List<Map<String, dynamic>> _localMessages = [];
  bool _isLoading = true;
  bool _isSending = false;
  late final String _currentUserId;
  late final String _currentUserName;
  StreamSubscription? _chatSub;
  String? _replyToId;
  String? _replyPreview;
  StreamSubscription? _typingSub;
  StreamSubscription? _statusSub;
  final Map<String, DateTime> _typingUsers = {};
  final Map<String, String> _typingNames = {};
  Timer? _typingDebounce;
  final FocusNode _inputFocus = FocusNode();
  bool _emojiVisible = false;

  @override
  void initState() {
    super.initState();
    final auth = context.read<AuthProvider>();
    _currentUserId = (auth.currentUser?['id'] ?? auth.currentUser?['_id'] ?? '').toString();
    _currentUserName = (auth.currentUser?['name'] ?? auth.currentUser?['userName'] ?? 'Anda').toString();
    _loadMessages();
    _initSocket();
    _loadPendingAttachmentsFromPrefs();
    _inputFocus.addListener(() {
      if (_inputFocus.hasFocus && _emojiVisible) {
        setState(() => _emojiVisible = false);
      }
    });
  }

  void _initSocket() {
    final rt = RealtimeService();
    _chatSub = rt.chatMessageStream.listen((data) {
      if (!mounted) return;
      // Only add if it's for this room
      if (data['roomId']?.toString() == widget.roomId) {
        setState(() {
          // Avoid duplicate if we just sent it and it came back via socket
          final exists = _messages.any((m) => m['id'] == data['id']);
          if (!exists) {
            _messages.add(data);
          }
        });
        _scrollToBottom();
      }
    });
    _typingSub = rt.chatTypingStream.listen((data) {
      if (!mounted) return;
      if (data['roomId']?.toString() != widget.roomId) return;
      final userId = data['userId']?.toString() ?? '';
      final userName = data['userName']?.toString() ?? '';
      if (userId.isEmpty || userId == _currentUserId) return;
      setState(() {
        _typingUsers[userId] = DateTime.now().add(const Duration(seconds: 3));
        if (userName.isNotEmpty) {
          _typingNames[userId] = userName;
        }
      });
      _cleanupTyping();
    });
    _statusSub = rt.chatStatusStream.listen((data) {
      if (!mounted) return;
      if (data['roomId']?.toString() != widget.roomId) return;
      final msgId = data['messageId']?.toString();
      final status = data['status']?.toString();
      if (msgId == null || status == null) return;
      final idx = _messages.indexWhere((m) => (m['id']?.toString() == msgId));
      if (idx >= 0) {
        setState(() {
          _messages[idx]['status'] = status;
        });
      }
    });
  }

  @override
  void dispose() {
    _chatSub?.cancel();
    _typingSub?.cancel();
    _statusSub?.cancel();
    _typingDebounce?.cancel();
    _inputFocus.dispose();
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadMessages() async {
    try {
      final messages = await _api.fetchChatMessages(widget.roomId);
      if (mounted) {
        setState(() {
          final merged = List<Map<String, dynamic>>.from(messages.map((e) => Map<String, dynamic>.from(e)));
          merged.addAll(_localMessages);
          merged.sort((a, b) {
            final ta = DateTime.tryParse(a['createdAt']?.toString() ?? '') ?? DateTime.now();
            final tb = DateTime.tryParse(b['createdAt']?.toString() ?? '') ?? DateTime.now();
            return ta.compareTo(tb);
          });
          _messages = merged;
          _isLoading = false;
        });
        await _api.markChatRoomRead(widget.roomId);
        _scrollToBottom();
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage() async {
    final text = _messageController.text.trim();
    if (text.isEmpty || _isSending) return;

    final localId = _addLocalOutgoingText(text);
    setState(() => _isSending = true);
    try {
      await _api.sendChatMessage(widget.roomId, text, replyToId: _replyToId);
      _messageController.clear();
      setState(() {
        _replyToId = null;
        _replyPreview = null;
        _removeLocalMessage(localId);
      });
      SoundService.playBeep();
      await _loadMessages();
    } catch (e) {
      _markLocalMessageError(localId);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    } finally {
      if (mounted) setState(() => _isSending = false);
    }
  }

  Future<void> _pickImageAndSend() async {
    if (_isSending) return;
    final ImagePicker picker = ImagePicker();
    final XFile? file = await picker.pickImage(source: ImageSource.gallery, imageQuality: 85);
    if (file == null) return;
    final bytes = await file.readAsBytes();
    final tempPath = await _writeTempFile(bytes, file.name);
    final localId = _addLocalOutgoingAttachment(bytes, file.name, 'image/jpeg', filePath: tempPath);
    await _persistPendingAttachments();
    setState(() => _isSending = true);
    try {
      await _api.sendChatAttachment(widget.roomId, bytes, file.name, mimeType: 'image/jpeg', replyToId: _replyToId);
      setState(() {
        _replyToId = null;
        _replyPreview = null;
      });
      SoundService.playBeep();
      _removeLocalMessage(localId);
      await _removePendingAttachmentById(localId);
      try {
        // Cleanup temp file
        final f = File(tempPath);
        if (await f.exists()) await f.delete();
      } catch (_) {}
      await _loadMessages();
    } catch (e) {
      _markLocalMessageError(localId);
      await _persistPendingAttachments();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    } finally {
      if (mounted) setState(() => _isSending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.roomName,
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold),
        ),
      ),
      body: Column(
        children: [
          _buildReplyPreview(),
          _typingIndicator(),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _messages.isEmpty
                    ? Center(child: Text('Belum ada pesan', style: GoogleFonts.outfit()))
                    : ListView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.all(16),
                        itemCount: _messages.length,
                        itemBuilder: (context, index) {
                          final msg = _messages[index];
                          final isMe = msg['userId']?.toString() == _currentUserId;
                          return _buildMessageBubble(msg, isMe);
                        },
                      ),
          ),
          _buildMessageInput(),
        ],
      ),
    );
  }

  Widget _buildMessageBubble(Map<String, dynamic> msg, bool isMe) {
    final colorScheme = Theme.of(context).colorScheme;
    final String senderName = msg['userName'] ?? 'User';
    final String content = msg['content'] ?? '';
    final DateTime createdAt = DateTime.parse(msg['createdAt'] ?? DateTime.now().toIso8601String());
    final String time = DateFormat('HH:mm').format(createdAt);
    final String imageUrl = msg['imageUrl']?.toString() ?? '';
    final dynamic imageBytesDyn = msg['imageBytes'];
    final Uint8List? imageBytes = imageBytesDyn is Uint8List
        ? imageBytesDyn
        : (imageBytesDyn is List<int> ? Uint8List.fromList(imageBytesDyn) : null);
    final String status = msg['status']?.toString() ?? '';

    final bubble = Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isMe ? ThemeConfig.brandColor : Colors.grey[200],
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(isMe ? 16 : 0),
            bottomRight: Radius.circular(isMe ? 0 : 16),
          ),
        ),
        child: Column(
          crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            if (!isMe)
              Text(
                senderName,
                style: GoogleFonts.outfit(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: ThemeConfig.brandColor,
                ),
              ),
            const SizedBox(height: 2),
            if (imageUrl.isNotEmpty)
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.network(
                  imageUrl,
                  width: MediaQuery.of(context).size.width * 0.6,
                  fit: BoxFit.cover,
                ),
              )
            else if (imageBytes != null)
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.memory(
                  imageBytes,
                  width: MediaQuery.of(context).size.width * 0.6,
                  fit: BoxFit.cover,
                ),
              )
            else
              Text(
                content,
                style: GoogleFonts.outfit(
                  color: isMe ? Colors.white : Colors.black87,
                  fontSize: 14,
                ),
              ),
            const SizedBox(height: 4),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  time,
                  style: TextStyle(
                    fontSize: 10,
                    color: isMe ? Colors.white70 : Colors.black45,
                  ),
                ),
                if (isMe) ...[
                  const SizedBox(width: 6),
                  if (status == 'error')
                    IconButton(
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                      onPressed: () => _retrySendLocal(msg['id']?.toString() ?? ''),
                      icon: Icon(Icons.refresh_rounded, size: 16, color: isMe ? Colors.white70 : Colors.black38),
                    )
                  else
                    Icon(
                      status == 'read'
                          ? Icons.done_all_rounded
                          : status == 'delivered'
                              ? Icons.done_all_rounded
                              : Icons.done_rounded,
                      size: 14,
                      color: status == 'read'
                          ? Colors.lightBlueAccent
                          : (isMe ? Colors.white70 : Colors.black38),
                    ),
                ]
              ],
            ),
          ],
        ),
      ),
    );
    return GestureDetector(
      onLongPress: () async {
        final action = await showModalBottomSheet<String>(
          context: context,
          builder: (ctx) {
            return SafeArea(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  ListTile(
                    leading: const Icon(Icons.reply_rounded),
                    title: const Text('Balas'),
                    onTap: () {
                      Navigator.pop(ctx, 'reply');
                    },
                  ),
                  ListTile(
                    leading: const Icon(Icons.copy_rounded),
                    title: const Text('Salin'),
                    onTap: () {
                      Navigator.pop(ctx, 'copy');
                    },
                  ),
                ],
              ),
            );
          },
        );
        if (action == 'reply') {
          setState(() {
            _replyToId = msg['id']?.toString();
            _replyPreview = content.isNotEmpty ? content : (imageUrl.isNotEmpty ? '[Gambar]' : '');
          });
        } else if (action == 'copy') {
          await Clipboard.setData(ClipboardData(text: content));
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Disalin')));
        }
      },
      child: bubble,
    );
  }

  Widget _buildMessageInput() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            color: Colors.white,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.05),
                blurRadius: 10,
                offset: const Offset(0, -5),
              ),
            ],
          ),
          child: SafeArea(
            child: Row(
              children: [
                IconButton(
                  onPressed: _isSending ? null : _pickImageAndSend,
                  icon: Icon(Icons.attach_file_rounded, color: _isSending ? Colors.grey : ThemeConfig.brandColor),
                ),
                Expanded(
                  child: TextField(
                    controller: _messageController,
                    focusNode: _inputFocus,
                    style: GoogleFonts.outfit(),
                    decoration: InputDecoration(
                      hintText: 'Ketik pesan...',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide.none,
                      ),
                      filled: true,
                      fillColor: Colors.grey[100],
                      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                    ),
                    maxLines: null,
                    onChanged: (_) {
                      _typingDebounce?.cancel();
                      _typingDebounce = Timer(const Duration(milliseconds: 400), () {
                        RealtimeService().emitTyping(widget.roomId, userId: _currentUserId, userName: _currentUserName);
                      });
                    },
                  ),
                ),
                IconButton(
                  onPressed: () {
                    setState(() {
                      _emojiVisible = !_emojiVisible;
                    });
                    if (_emojiVisible) {
                      _inputFocus.unfocus();
                    }
                  },
                  icon: Icon(
                    Icons.emoji_emotions_rounded,
                    color: ThemeConfig.brandColor,
                  ),
                ),
                const SizedBox(width: 4),
                IconButton(
                  onPressed: _isSending ? null : _sendMessage,
                  icon: Icon(
                    Icons.send_rounded,
                    color: _isSending ? Colors.grey : ThemeConfig.brandColor,
                  ),
                ),
              ],
            ),
          ),
        ),
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 200),
          child: _emojiVisible
              ? SizedBox(
                  height: 280,
                  child: emoji.EmojiPicker(
                    onEmojiSelected: (category, emoji) {
                      _messageController
                        ..text += emoji.emoji
                        ..selection = TextSelection.fromPosition(
                            TextPosition(offset: _messageController.text.length));
                      RealtimeService().emitTyping(widget.roomId, userId: _currentUserId, userName: _currentUserName);
                    },
                    config: const emoji.Config(
                      columns: 7,
                      emojiSizeMax: 28,
                      bgColor: Color(0xFFF7F7F7),
                      indicatorColor: Colors.blueAccent,
                      enableSkinTones: true,
                      recentTabBehavior: emoji.RecentTabBehavior.RECENT,
                    ),
                  ),
                )
              : const SizedBox.shrink(),
        ),
      ],
    );
  }

  Widget _buildReplyPreview() {
    if (_replyPreview == null) return const SizedBox.shrink();
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(color: Colors.grey[100]),
      child: Row(
        children: [
          const Icon(Icons.reply_rounded, size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              _replyPreview!,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.outfit(fontSize: 13, color: Colors.black87),
            ),
          ),
          IconButton(
            onPressed: () => setState(() {
              _replyPreview = null;
              _replyToId = null;
            }),
            icon: const Icon(Icons.close_rounded, size: 18),
          ),
        ],
      ),
    );
  }

  void _cleanupTyping() {
    Timer(const Duration(seconds: 4), () {
      if (!mounted) return;
      final now = DateTime.now();
      _typingUsers.removeWhere((_, expire) => expire.isBefore(now));
      setState(() {});
    });
  }

  Widget _typingIndicator() {
    if (_typingUsers.isEmpty) return const SizedBox.shrink();
    final now = DateTime.now();
    _typingUsers.removeWhere((_, expire) => expire.isBefore(now));
    final ids = _typingUsers.keys.toList();
    if (ids.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: ids.map((id) {
          final name = _typingNames[id] ?? 'Seseorang';
          return Row(
            children: [
              const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
              const SizedBox(width: 8),
              Text('$name sedang mengetik...', style: GoogleFonts.outfit(fontSize: 12, color: Colors.black54)),
            ],
          );
        }).toList(),
      ),
    );
  }

  String _addLocalOutgoingText(String content) {
    final id = 'local-${DateTime.now().millisecondsSinceEpoch}';
    final map = {
      'id': id,
      'userId': _currentUserId,
      'userName': _currentUserName,
      'content': content,
      'createdAt': DateTime.now().toIso8601String(),
      'status': 'sending'
    };
    _localMessages.add(map);
    _messages.add(map);
    _scrollToBottom();
    return id;
  }

  void _removeLocalMessage(String id) {
    _localMessages.removeWhere((m) => m['id'] == id);
    _messages.removeWhere((m) => m['id'] == id);
  }

  void _markLocalMessageError(String id) {
    final idxLocal = _localMessages.indexWhere((m) => m['id'] == id);
    if (idxLocal >= 0) _localMessages[idxLocal]['status'] = 'error';
    final idx = _messages.indexWhere((m) => m['id'] == id);
    if (idx >= 0) _messages[idx]['status'] = 'error';
    setState(() {});
  }

  Future<void> _retrySendLocal(String id) async {
    if (_isSending) return;
    final idx = _localMessages.indexWhere((m) => m['id'] == id);
    if (idx < 0) return;
    final content = _localMessages[idx]['content']?.toString() ?? '';
    final Uint8List? bytes = _localMessages[idx]['imageBytes'] is Uint8List
        ? _localMessages[idx]['imageBytes'] as Uint8List
        : (_localMessages[idx]['imageBytes'] is List<int>
            ? Uint8List.fromList((_localMessages[idx]['imageBytes'] as List<int>))
            : null);
    final String? filePath = _localMessages[idx]['filePath']?.toString();
    setState(() {
      _isSending = true;
      _localMessages[idx]['status'] = 'sending';
    });
    try {
      if (bytes != null) {
        final filename = _localMessages[idx]['filename']?.toString() ?? 'image.jpg';
        final mimeType = _localMessages[idx]['mimeType']?.toString() ?? 'image/jpeg';
        await _api.sendChatAttachment(widget.roomId, bytes, filename, mimeType: mimeType, replyToId: _replyToId);
      } else if (filePath != null && filePath.isNotEmpty) {
        final f = File(filePath);
        final exists = await f.exists();
        if (!exists) throw Exception('File lampiran tidak ditemukan');
        final b = await f.readAsBytes();
        final filename = _localMessages[idx]['filename']?.toString() ?? 'image.jpg';
        final mimeType = _localMessages[idx]['mimeType']?.toString() ?? 'image/jpeg';
        await _api.sendChatAttachment(widget.roomId, b, filename, mimeType: mimeType, replyToId: _replyToId);
      } else {
        if (content.isEmpty) {
          throw Exception('Konten kosong');
        }
        await _api.sendChatMessage(widget.roomId, content, replyToId: _replyToId);
      }
      _removeLocalMessage(id);
      await _removePendingAttachmentById(id);
      if (filePath != null && filePath.isNotEmpty) {
        try {
          final f = File(filePath);
          if (await f.exists()) await f.delete();
        } catch (_) {}
      }
      await _loadMessages();
    } catch (e) {
      _markLocalMessageError(id);
      await _persistPendingAttachments();
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _isSending = false);
    }
  }

  String _addLocalOutgoingAttachment(Uint8List bytes, String filename, String mimeType, {String? filePath}) {
    final id = 'local-${DateTime.now().millisecondsSinceEpoch}';
    final map = {
      'id': id,
      'userId': _currentUserId,
      'userName': _currentUserName,
      'content': '',
      'imageBytes': bytes,
      'filename': filename,
      'mimeType': mimeType,
      'filePath': filePath,
      'roomId': widget.roomId,
      'createdAt': DateTime.now().toIso8601String(),
      'status': 'sending'
    };
    _localMessages.add(map);
    _messages.add(map);
    _scrollToBottom();
    return id;
  }

  Future<String> _writeTempFile(Uint8List bytes, String filename) async {
    final dir = await getTemporaryDirectory();
    final path = '${dir.path}/chat_${DateTime.now().millisecondsSinceEpoch}_$filename';
    final f = File(path);
    await f.writeAsBytes(bytes);
    return path;
  }

  Future<void> _persistPendingAttachments() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      // Only store attachments
      final pending = _localMessages.where((m) => (m['imageBytes'] != null || (m['filePath']?.toString().isNotEmpty ?? false))).map((m) {
        return {
          'id': m['id'],
          'roomId': m['roomId'] ?? widget.roomId,
          'filename': m['filename'],
          'mimeType': m['mimeType'],
          'filePath': m['filePath'],
          'createdAt': m['createdAt'],
          'status': m['status'],
        };
      }).toList();
      await prefs.setString('chat_pending_attachments', jsonEncode(pending));
    } catch (_) {}
  }

  Future<void> _loadPendingAttachmentsFromPrefs() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString('chat_pending_attachments');
      if (raw == null || raw.isEmpty) return;
      final list = jsonDecode(raw);
      if (list is! List) return;
      for (final item in list) {
        if (item is! Map) continue;
        final map = Map<String, dynamic>.from(item);
        if (map['roomId']?.toString() != widget.roomId) continue;
        final filePath = map['filePath']?.toString() ?? '';
        if (filePath.isEmpty) continue;
        try {
          final f = File(filePath);
          if (await f.exists()) {
            final bytes = await f.readAsBytes();
            final id = map['id']?.toString() ?? 'local-${DateTime.now().millisecondsSinceEpoch}';
            final local = {
              'id': id,
              'userId': _currentUserId,
              'userName': _currentUserName,
              'content': '',
              'imageBytes': bytes,
              'filename': map['filename']?.toString() ?? 'image.jpg',
              'mimeType': map['mimeType']?.toString() ?? 'image/jpeg',
              'filePath': filePath,
              'roomId': widget.roomId,
              'createdAt': map['createdAt']?.toString() ?? DateTime.now().toIso8601String(),
              'status': map['status']?.toString() ?? 'error',
            };
            _localMessages.add(local);
            _messages.add(local);
          }
        } catch (_) {}
      }
      setState(() {});
    } catch (_) {}
  }

  Future<void> _removePendingAttachmentById(String id) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString('chat_pending_attachments');
      if (raw == null || raw.isEmpty) return;
      final list = (jsonDecode(raw) as List).map((e) => Map<String, dynamic>.from(e)).toList();
      list.removeWhere((m) => (m['id']?.toString() == id));
      await prefs.setString('chat_pending_attachments', jsonEncode(list));
    } catch (_) {}
  }
}
