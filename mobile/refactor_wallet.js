const fs = require('fs');

const inPath = 'c:/Riyan/projek/Rana/mobile/lib/screens/home_screen.dart';
let content = fs.readFileSync(inPath, 'utf8');

let startIndex = content.indexOf('  Widget _buildWalletCard(BuildContext context) {');
let endIndex = content.indexOf('  // [UPDATED] Feature Grid with Modern Cards');

const replacement = `  Widget _buildWalletCard(BuildContext context) {
    return HomeWalletCard(
      scrollOffset: _scrollController.hasClients ? _scrollController.offset : 0.0,
      walletObscureBalance: _walletObscureBalance,
      walletExpanded: _walletExpanded,
      onToggleObscure: () => setState(() => _walletObscureBalance = !_walletObscureBalance),
      onToggleExpanded: () => setState(() => _walletExpanded = !_walletExpanded),
    );
  }
`;

if (startIndex !== -1 && endIndex !== -1) {
    let toReplace = content.substring(startIndex, endIndex);
    content = content.replace(toReplace, replacement + '\n');

    if (!content.includes("import 'package:rana_merchant/widgets/home/home_wallet_card.dart';")) {
      content = content.replace(
          "import 'package:rana_merchant/widgets/home/home_banner_carousel.dart';",
          "import 'package:rana_merchant/widgets/home/home_banner_carousel.dart';\nimport 'package:rana_merchant/widgets/home/home_wallet_card.dart';"
      );
    }

    fs.writeFileSync(inPath, content);
    console.log("Replaced WalletCard.");
} else {
    console.log("Could not find start or end index.");
}
