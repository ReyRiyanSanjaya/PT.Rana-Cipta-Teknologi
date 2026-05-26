import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:flutter_animate/flutter_animate.dart';

class BlogDetailScreen extends StatelessWidget {
  final Map<String, dynamic> post;

  const BlogDetailScreen({super.key, required this.post});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: CustomScrollView(
        slivers: [
          _buildSliverAppBar(context),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildMetaInfo(context),
                  const SizedBox(height: 16),
                  Text(
                    post['title'] ?? 'Untitled',
                    style: GoogleFonts.poppins(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).colorScheme.onSurface,
                        height: 1.3),
                  ).animate().fadeIn().slideY(begin: 0.2, end: 0),
                  const SizedBox(height: 24),
                  Text(
                    post['content'] ??
                        post['summary'] ??
                        'No content available.',
                    style: GoogleFonts.sourceSerif4(
                        // Detailed reading font
                        fontSize: 18,
                        color: Theme.of(context).colorScheme.onSurface.withOpacity(0.8),
                        height: 1.8),
                  ).animate().fadeIn(delay: 200.ms),
                ],
              ),
            ),
          )
        ],
      ),
    );
  }

  Widget _buildSliverAppBar(BuildContext context) {
    return SliverAppBar(
      expandedHeight: 300,
      pinned: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      flexibleSpace: FlexibleSpaceBar(
        background: Stack(
          fit: StackFit.expand,
          children: [
            if (post['imageUrl'] != null && post['imageUrl'] != '')
              Image.network(
                post['imageUrl'],
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) => Container(
                    color: Theme.of(context).colorScheme.primary.withOpacity(0.1),
                    child: Icon(Icons.broken_image,
                        size: 60,
                        color: Theme.of(context).colorScheme.primary.withOpacity(0.4))),
              )
            else
              Container(
                  color: Theme.of(context).colorScheme.primary.withOpacity(0.1),
                  child: Icon(Icons.article,
                      size: 80,
                      color: Theme.of(context).colorScheme.primary.withOpacity(0.4))),

            // Gradient Overlay for text readability if needed, or just style
            Container(
              decoration: BoxDecoration(
                  gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                    Theme.of(context).colorScheme.onSurface.withOpacity(0.3),
                    Colors.transparent,
                    Theme.of(context).colorScheme.onSurface.withOpacity(0.05)
                  ])),
            )
          ],
        ),
      ),
      leading: Container(
        margin: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          shape: BoxShape.circle,
        ),
        child: IconButton(
          icon: Icon(Icons.arrow_back, color: Theme.of(context).colorScheme.onSurface),
          onPressed: () => Navigator.pop(context),
        ),
      ),
    );
  }

  Widget _buildMetaInfo(BuildContext context) {
    final date = post['createdAt'] != null
        ? DateFormat('dd MMM yyyy').format(DateTime.parse(post['createdAt']))
        : 'Unknown Date';
    final tag = (post['tags'] != null && (post['tags'] as List).isNotEmpty)
        ? post['tags'][0]
        : 'General';

    return Row(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(20),
              border:
                  Border.all(color: Theme.of(context).colorScheme.primary.withOpacity(0.3))),
          child: Text(
            tag.toUpperCase(),
            style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: Theme.of(context).colorScheme.primary),
          ),
        ),
        const SizedBox(width: 16),
        Icon(Icons.calendar_today, size: 14, color: Theme.of(context).colorScheme.onSurface.withOpacity(0.4)),
        const SizedBox(width: 6),
        Text(
          date,
          style: GoogleFonts.inter(
              fontSize: 13,
              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
              fontWeight: FontWeight.w500),
        )
      ],
    ).animate().fadeIn().slideX();
  }
}
