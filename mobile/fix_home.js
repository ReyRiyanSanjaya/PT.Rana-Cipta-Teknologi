const fs = require('fs');
const p = 'c:/Riyan/projek/Rana/mobile/lib/screens/home_screen.dart';
let txt = fs.readFileSync(p, 'utf8');

// The stranded block starts right after the new _buildBannerDotsRow() }
// and ends before // [NEW] Live Ticker
// We can just find the exact index of '  // [NEW] Live Ticker' and backtrack to '  }'
const liveTickerIdx = txt.indexOf('  // [NEW] Live Ticker');
if (liveTickerIdx === -1) {
    console.error("Could not find Live Ticker");
    process.exit(1);
}

// Search backwards for the valid closing brace of _buildBannerDotsRow
const validClosingBraceStr = "    );\r\n  }\r\n    return Padding("; // wait...
// actually, let's just use string replace for the whole block!
let strandedBlock = `    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 0),
      child: Center(
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(_homeBanners.length, (index) {
            final isActive = index == _bannerPageIndex;
            return InkWell(
              onTap: () {
                _pauseBannerAutoFor(const Duration(seconds: 8));
                _bannerPageController.animateToPage(
                  index,
                  duration: const Duration(milliseconds: 300),
                  curve: Curves.easeOutCubic,
                );
              },
              borderRadius: BorderRadius.circular(999),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 250),
                margin: const EdgeInsets.symmetric(horizontal: 4),
                height: 6,
                width: isActive ? 18 : 6,
                decoration: BoxDecoration(
                  color: isActive ? Colors.white : Colors.white.withOpacity(0.4),
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
            );
          }),
        ),
      ),
    );
  }`;

// normalize CRLF vs LF
function normalize(str) { return str.replace(/\r\n/g, '\n'); }

let normTxt = normalize(txt);
let normBlock = normalize(strandedBlock);

if (normTxt.includes(normBlock)) {
    normTxt = normTxt.replace(normBlock, ''); // delete it exactly
    fs.writeFileSync(p, normTxt);
    console.log("SUCCESSFULLY REMOVED THE PADDING BLOCK!");
} else {
    // If exact string fails, try regex from "return Padding(" to "  }\n  // [NEW] Live Ticker"
    const regex = /    return Padding\([\s\S]*?    \);\n  \}\n(?=  \/\/ \[NEW\] Live Ticker)/;
    if (regex.test(normTxt)) {
        normTxt = normTxt.replace(regex, '');
        fs.writeFileSync(p, normTxt);
        console.log("SUCCESSFULLY REMOVED VIA REGEX!");
    } else {
        console.error("COULD NOT FIND THE STRANDED BLOCK!");
    }
}
