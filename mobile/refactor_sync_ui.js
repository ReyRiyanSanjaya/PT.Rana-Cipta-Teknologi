const fs = require('fs');
const path = 'c:/Riyan/projek/Rana/mobile/lib/screens/home_screen.dart';
let content = fs.readFileSync(path, 'utf8');

// 1. Replace the boolean checks with the new dynamic banner
content = content.replace(
    /if \(_isOffline\) _buildOfflineBanner\(navContext\),\s*if \(_isOffline\) const SizedBox\(height: 16\),/g,
    '_buildSyncAndOfflineBanner(navContext),'
);

// 2. Rename _buildOfflineBanner to _buildOfflineBannerUI
content = content.replace(
    'Widget _buildOfflineBanner(BuildContext navContext) {',
    'Widget _buildOfflineBannerUI(BuildContext navContext) {'
);

const syncingBannerCode = `
  Widget _buildSyncAndOfflineBanner(BuildContext navContext) {
    return StreamBuilder<Map<String, dynamic>>(
      stream: SyncService().statusStream,
      builder: (context, snapshot) {
        final isOnline = snapshot.data?['online'] ?? !_isOffline;
        final isSyncing = snapshot.data?['isSyncing'] ?? SyncService().isSyncing;

        if (!isOnline) {
          return Column(
            children: [
              _buildOfflineBannerUI(navContext),
              const SizedBox(height: 16),
            ],
          );
        }

        if (isSyncing) {
          return Column(
            children: [
              _buildSyncingBannerUI(navContext),
              const SizedBox(height: 16),
            ],
          );
        }

        return const SizedBox.shrink();
      },
    );
  }

  Widget _buildSyncingBannerUI(BuildContext navContext) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.blue.withOpacity(0.16),
              blurRadius: 14,
              offset: const Offset(0, 6),
            ),
          ],
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Colors.blue.shade600,
              Colors.blue.shade400,
            ],
          ),
          border: Border.all(
            color: Colors.white.withOpacity(0.2),
            width: 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.18),
                shape: BoxShape.circle,
              ),
              child: const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Menyinkronkan data...',
                style: GoogleFonts.outfit(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                    fontSize: 12),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOfflineBannerUI(BuildContext navContext) {`;

content = content.replace(
    'Widget _buildOfflineBannerUI(BuildContext navContext) {',
    syncingBannerCode
);

fs.writeFileSync(path, content);
console.log("Successfully replaced offline and sync banners.");
