const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(fullPath));
        } else if (fullPath.endsWith('.dart')) {
            results.push(fullPath);
        }
    });
    return results;
}

const files = walk('c:/Riyan/projek/Rana/mobile/lib');
let modifiedCount = 0;

files.forEach(f => {
    const original = fs.readFileSync(f, 'utf8');
    let content = original;

    // The user's script erroneously escaped string interpolations like \${MerchantConfig...}
    // and \${change}, etc. inside Dart files if it replaced 'Rp ' inside an existing string.
    
    // Fix \${MerchantConfig.defaultCurrencySymbol} -> ${MerchantConfig.defaultCurrencySymbol}
    content = content.replace(/\\\$\{MerchantConfig\.defaultCurrencySymbol\}/g, '${MerchantConfig.defaultCurrencySymbol}');
    
    // Fix other common escaped variables caused by the replace script
    content = content.replace(/\\\$\{change/g, '${change');
    content = content.replace(/\\\$\{NumberFormat/g, '${NumberFormat');
    content = content.replace(/\\\$\{p\['/g, "${p['");
    content = content.replace(/\\\$\{amt\}/g, '${amt}');
    content = content.replace(/\\\$\{it\['/g, "${it['");
    content = content.replace(/\\\$\{/g, "${"); // Just unescape all \${ globally since Dart string interpolation uses ${

    if (content !== original) {
        fs.writeFileSync(f, content);
        modifiedCount++;
        console.log('Fixed syntax in:', f);
    }
});
console.log('Total files fixed:', modifiedCount);
