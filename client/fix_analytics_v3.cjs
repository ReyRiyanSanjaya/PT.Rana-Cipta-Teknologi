
const fs = require('fs');
const path = require('path');

async function fix() {
    const adminControllerPath = 'D:\\rana\\server\\src\\controllers\\adminController.js';
    
    if (fs.existsSync(adminControllerPath)) {
        let content = fs.readFileSync(adminControllerPath, 'utf8');
        
        // We will replace it with a dummy implementation or empty array to avoid breaking later code if txnBySource is used.
        // We look for the exact string from the file read earlier.
        
        const blockToRemove = `            // 5. Transaction breakdown by source
            const txnBySourceRaw = await prisma.transaction.groupBy({
                by: ['source'],
                where: txnWhere,
                _count: { _all: true },
                _sum: { totalAmount: true }
            });
            const txnBySource = txnBySourceRaw.map(t => ({
                source: t.source || 'UNKNOWN',
                count: t._count._all,
                amount: t._sum.totalAmount || 0
            }));`;

        const newBlock = `            // 5. Transaction breakdown by source (Disabled due to missing field)
            const txnBySource = [];`;
            
        if (content.includes('// 5. Transaction breakdown by source')) {
            // Let's use a regex to be safer about whitespace or exact match failing due to newlines
            // But strict replacement is better if we are sure.
            // The read output shows consistent indentation.
            
            // Try strict replacement first
            let newContent = content.replace(blockToRemove, newBlock);
            
            if (content === newContent) {
                console.log("Strict replacement failed, trying regex...");
                // Fallback: replace from "// 5. Transaction breakdown by source" until "// 6. Top Merchants"
                 const regex = /\/\/ 5\. Transaction breakdown by source[\s\S]*?(?=\/\/ 6\. Top Merchants)/;
                 newContent = content.replace(regex, newBlock + '\n\n            ');
            }
            
            if (content !== newContent) {
                fs.writeFileSync(adminControllerPath, newContent, 'utf8');
                console.log("Fixed adminController.js by disabling txnBySource query.");
            } else {
                 console.log("Could not find the block to remove (regex failed too).");
            }
        } else {
            console.log("Could not find the start marker.");
        }
    }
}

fix();
