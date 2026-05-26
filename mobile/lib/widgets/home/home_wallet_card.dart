import 'package:rana_merchant/config/merchant_config.dart';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:rana_merchant/config/theme_config.dart';
import 'package:rana_merchant/providers/wallet_provider.dart';
import 'package:rana_merchant/screens/wallet_screen.dart';

class HomeWalletCard extends StatelessWidget {
  final double scrollOffset;
  final bool walletObscureBalance;
  final bool walletExpanded;
  final VoidCallback onToggleObscure;
  final VoidCallback onToggleExpanded;

  const HomeWalletCard({
    super.key,
    required this.scrollOffset,
    required this.walletObscureBalance,
    required this.walletExpanded,
    required this.onToggleObscure,
    required this.onToggleExpanded,
  });

  @override
  Widget build(BuildContext context) {
    final wallet = Provider.of<WalletProvider>(context);
    final colorScheme = Theme.of(context).colorScheme;
    final isDark = colorScheme.brightness == Brightness.dark;
    final hasPendingTopUps = wallet.pendingTopUps.isNotEmpty;
    final hasPendingWithdrawals = wallet.pendingWithdrawals.isNotEmpty;
    double? delta;
    if (wallet.history.isNotEmpty) {
      final h = wallet.history.first;
      final amt = h is Map ? h['amount'] : null;
      if (amt is num) {
        delta = amt.toDouble();
      }
    }

    final t = (scrollOffset / 340.0).clamp(0.0, 1.0);
    final blurSigma = 6.0 + (2.0 * t);

    return Transform.translate(
      offset: const Offset(0, 0),
      child: Align(
        alignment: Alignment.center,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(22),
              boxShadow: [
                BoxShadow(
                  color: ThemeConfig.brandColor.withOpacity(0.25),
                  blurRadius: 18,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(22),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: blurSigma, sigmaY: blurSigma),
                child: Stack(
                  children: [
                    // Background
                    Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [
                            colorScheme.surface.withOpacity(0.98),
                            colorScheme.surface.withOpacity(0.96),
                          ],
                        ),
                        border: Border.all(
                          color: colorScheme.outline.withOpacity(0.16),
                          width: 1.2,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Theme.of(context).colorScheme.shadow.withOpacity(0.06),
                            blurRadius: 12,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                    ),
                    Positioned(
                      top: -24,
                      right: -24,
                      child: Container(
                        width: 96,
                        height: 96,
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.08),
                          shape: BoxShape.circle,
                        ),
                      ),
                    ),
                    Positioned(
                      bottom: -18,
                      left: -18,
                      child: Container(
                        width: 72,
                        height: 72,
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.08),
                          shape: BoxShape.circle,
                        ),
                      ),
                    ),
                    Positioned(
                      top: 0,
                      left: 0,
                      right: 0,
                      child: Container(
                        height: 8,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.white.withOpacity(0.12),
                              Colors.transparent,
                            ],
                          ),
                        ),
                      ),
                    ),
                    // Content
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(5),
                                    decoration: BoxDecoration(
                                      color: Colors.white.withOpacity(0.14),
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: const Icon(
                                      Icons.account_balance_wallet_rounded,
                                      color: Colors.white,
                                      size: 15,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    'Dompet Toko',
                                    style: GoogleFonts.outfit(
                                      color: colorScheme.onSurface,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                              Row(
                                children: [
                                  GestureDetector(
                                    onTap: () {
                                      HapticFeedback.selectionClick();
                                      onToggleObscure();
                                    },
                                    child: Container(
                                      padding: const EdgeInsets.all(5),
                                      decoration: BoxDecoration(
                                        color: colorScheme.primary.withOpacity(0.08),
                                        shape: BoxShape.circle,
                                      ),
                                      child: Icon(
                                        walletObscureBalance
                                            ? Icons.visibility_off_rounded
                                            : Icons.visibility_rounded,
                                        color: colorScheme.primary,
                                        size: 15,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  GestureDetector(
                                    onTap: () {
                                      HapticFeedback.selectionClick();
                                      onToggleExpanded();
                                    },
                                    child: Container(
                                      padding: const EdgeInsets.all(5),
                                      decoration: BoxDecoration(
                                        color: colorScheme.primary.withOpacity(0.08),
                                        shape: BoxShape.circle,
                                      ),
                                      child: Icon(
                                        walletExpanded
                                            ? Icons.unfold_less_rounded
                                            : Icons.unfold_more_rounded,
                                        color: colorScheme.primary,
                                        size: 15,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Total Saldo Aktif',
                                style: GoogleFonts.outfit(
                                  color: colorScheme.onSurface.withOpacity(0.68),
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const SizedBox(height: 2),
                              RichText(
                                text: TextSpan(
                                  children: [
                                    TextSpan(
                                      text: '${MerchantConfig.defaultCurrencySymbol} ',
                                      style: GoogleFonts.outfit(
                                        color: colorScheme.onSurface.withOpacity(0.75),
                                        fontSize: 13,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                    TextSpan(
                                      text: walletObscureBalance
                                          ? '••••••••'
                                          : NumberFormat.currency(
                                                  locale: 'id_ID',
                                                  symbol: '',
                                                  decimalDigits: 0)
                                              .format(wallet.balance),
                                      style: GoogleFonts.outfit(
                                        color: colorScheme.onSurface,
                                        fontSize: 26,
                                        fontWeight: FontWeight.bold,
                                        letterSpacing: -1,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          if (delta != null && delta != 0) ...[
                            const SizedBox(height: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: (delta >= 0 ? Colors.green : Colors.redAccent).withOpacity(0.12),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: (delta >= 0 ? Colors.green : Colors.redAccent).withOpacity(0.24),
                                  width: 1,
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    delta >= 0 ? Icons.trending_up : Icons.trending_down,
                                    size: 14,
                                    color: delta >= 0 ? Colors.green : Colors.redAccent,
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    '${delta >= 0 ? '+' : '-'}${NumberFormat.currency(locale: 'id_ID', symbol: '${MerchantConfig.defaultCurrencySymbol} ', decimalDigits: 0).format(delta.abs())}',
                                    style: GoogleFonts.outfit(
                                      color: colorScheme.onSurface,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                          if (hasPendingTopUps || hasPendingWithdrawals)
                            const SizedBox(height: 10),
                          if (hasPendingTopUps || hasPendingWithdrawals)
                            SingleChildScrollView(
                              scrollDirection: Axis.horizontal,
                              child: Row(
                                children: [
                                  if (hasPendingTopUps)
                                    _buildWalletStatusChip(
                                      context: context,
                                      icon: Icons.timelapse_rounded,
                                      label: '${wallet.pendingTopUps.length} Top Up tertunda',
                                    ),
                                  if (hasPendingTopUps && hasPendingWithdrawals)
                                    const SizedBox(width: 6),
                                  if (hasPendingWithdrawals)
                                    _buildWalletStatusChip(
                                      context: context,
                                      icon: Icons.south_west_rounded,
                                      label: '${wallet.pendingWithdrawals.length} Tarik dana tertunda',
                                    ),
                                ],
                              ),
                            ),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              Expanded(
                                child: _buildWalletQuickAction(
                                  context,
                                  icon: Icons.add_circle_outline_rounded,
                                  label: 'Top Up',
                                  onTap: () {
                                    Navigator.push(context, MaterialPageRoute(builder: (_) => const WalletScreen()));
                                  },
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: _buildWalletQuickAction(
                                  context,
                                  icon: Icons.arrow_circle_up_rounded,
                                  label: 'Tarik Dana',
                                  onTap: () {
                                    Navigator.push(context, MaterialPageRoute(builder: (_) => const WalletScreen()));
                                  },
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: _buildWalletQuickAction(
                                  context,
                                  icon: Icons.history_rounded,
                                  label: 'Riwayat',
                                  onTap: () {
                                    Navigator.push(context, MaterialPageRoute(builder: (_) => const WalletScreen()));
                                  },
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildWalletQuickAction(
    BuildContext context, {
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      decoration: BoxDecoration(
        color: colorScheme.primary.withOpacity(0.06),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: colorScheme.primary.withOpacity(0.18), width: 1.2),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: () {
            HapticFeedback.lightImpact();
            onTap();
          },
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 10),
            child: Column(
              children: [
                Icon(icon, color: colorScheme.primary, size: 20),
                const SizedBox(height: 4),
                Text(
                  label,
                  style: GoogleFonts.outfit(
                    color: colorScheme.onSurface,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildWalletStatusChip({
    required BuildContext context,
    required IconData icon,
    required String label,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.14),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Colors.white.withOpacity(0.22),
          width: 0.8,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: 13,
            color: Colors.white.withOpacity(0.88),
          ),
          const SizedBox(width: 6),
          Text(
            label,
            style: GoogleFonts.outfit(
              color: Colors.white.withOpacity(0.92),
              fontSize: 10.5,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
