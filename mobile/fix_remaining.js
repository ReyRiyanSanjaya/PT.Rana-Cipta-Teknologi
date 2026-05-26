const fs = require('fs');

function addImport(file) {
    let content = fs.readFileSync(file, 'utf8');
    const imp = "import 'package:rana_merchant/config/merchant_config.dart';";
    if (!content.includes(imp)) {
        content = imp + '\n' + content;
        fs.writeFileSync(file, content);
    }
}

addImport('c:/Riyan/projek/Rana/mobile/lib/screens/flash_sales_screen.dart');
addImport('c:/Riyan/projek/Rana/mobile/lib/screens/payment_screen.dart');
addImport('c:/Riyan/projek/Rana/mobile/lib/screens/ppob_screen.dart');

let home = fs.readFileSync('c:/Riyan/projek/Rana/mobile/lib/screens/home_screen.dart', 'utf8');
home = home.replace('_buildOfflineBanner(navContext)', '_buildOfflineBannerUI(navContext)');
fs.writeFileSync('c:/Riyan/projek/Rana/mobile/lib/screens/home_screen.dart', home);
