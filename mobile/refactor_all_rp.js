const fs = require('fs');
const path = require('path');

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(fullPath));
        } else if (fullPath.endsWith('.dart')) {
            results.push(fullPath);
        }
    });
    return results;
}

const allDartFiles = walkDir('c:/Riyan/projek/Rana/mobile/lib');
let filesModified = 0;

allDartFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;

    // Replace symbol: 'Rp '
    if (content.includes("symbol: 'Rp '")) {
        content = content.replace(/symbol: 'Rp '/g, "symbol: '${MerchantConfig.defaultCurrencySymbol} '");
        modified = true;
    }
    
    // Replace text: 'Rp '
    if (content.includes("text: 'Rp '")) {
        content = content.replace(/text: 'Rp '/g, "text: '${MerchantConfig.defaultCurrencySymbol} '");
        modified = true;
    }

    // Replace prefixText: 'Rp '
    if (content.includes("prefixText: 'Rp '")) {
        content = content.replace(/prefixText: 'Rp '/g, "prefixText: '${MerchantConfig.defaultCurrencySymbol} '");
        modified = true;
    }

    // Replace Admin Rp
    if (content.includes("Admin Rp ")) {
        content = content.replace(/Admin Rp /g, "Admin \${MerchantConfig.defaultCurrencySymbol} ");
        modified = true;
    }

    // Replace literal Rp inside interpolations
    if (content.includes("'Rp ${")) {
        content = content.replace(/'Rp \$\{/g, "'\\${MerchantConfig.defaultCurrencySymbol} \\${");
        modified = true;
    }
    
    // Replace simple literal case like 'Rp 0' --> this might be tricky, let's catch 'Rp 0'
    if (content.includes("'Rp 0'")) {
        content = content.replace(/'Rp 0'/g, "'\\${MerchantConfig.defaultCurrencySymbol} 0'");
        modified = true;
    }
    
    if (content.includes('"Simpan struk sebagai bukti pembayaran"')) {
        content = content.replace(/"Simpan struk sebagai bukti pembayaran"/g, 'MerchantConfig.receiptFooterText');
        modified = true;
    }

    if (modified) {
        // add import if not there
        const importStatement = "import 'package:rana_merchant/config/merchant_config.dart';";
        // prevent duplicate imports
        if (!content.includes(importStatement)) {
            const firstImport = content.indexOf('import ');
            if (firstImport !== -1) {
                content = content.slice(0, firstImport) + importStatement + '\n' + content.slice(firstImport);
            } else {
                content = importStatement + '\n' + content;
            }
        }
        fs.writeFileSync(file, content);
        filesModified++;
        console.log("Modified:", file);
    }
});

console.log('Total files modified: ' + filesModified);
