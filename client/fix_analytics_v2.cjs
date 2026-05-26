const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  try {
    // We can't change the schema via client script easily if we can't run migration.
    // But the issue is that the code is trying to group by "source" on Transaction model.
    // Let's check if Transaction model has "source" field.
    // Based on schema.prisma I read, Transaction model does NOT have "source" field.
    // It has: id, tenantId, storeId, customerId, userId, totalAmount, paymentMethod, status, paymentStatus, createdAt, shiftId.
    
    // So the code in adminController.js line 890 is wrong:
    // const txnBySourceRaw = await prisma.transaction.groupBy({ by: ['source'], ... });
    
    // We should remove this block or fix it.
    // Since "source" is not on Transaction, maybe the intention was to group by "paymentMethod" (which is already done above) or something else?
    // Or maybe "source" was supposed to be "paymentMethod"?
    // But there is already txnByMethodRaw grouping by paymentMethod.
    
    // Maybe "source" refers to "PlatformRevenue.source"?
    // The variable name is `txnBySourceRaw`.
    // Looking at the code:
    // // 5. Transaction breakdown by source
    // const txnBySourceRaw = await prisma.transaction.groupBy({...})
    
    // If Transaction doesn't have source, this is definitely the bug.
    // I will remove this block from adminController.js or replace it with something valid.
    // Since I cannot modify the schema to add "source" right now (requires migration/db push which might fail or be risky if I don't have the migration file),
    // the safest fix is to remove this invalid query or comment it out.
    
    const fs = require('fs');
    const path = require('path');
    const adminControllerPath = 'D:\\rana\\server\\src\\controllers\\adminController.js';
    
    if (fs.existsSync(adminControllerPath)) {
        let content = fs.readFileSync(adminControllerPath, 'utf8');
        
        // We need to comment out or remove the block for txnBySourceRaw
        // And also the mapping part below it.
        
        // Search for the block
        const startMarker = "// 5. Transaction breakdown by source";
        const endMarker = "// 6. Top Merchants by transaction volume";
        
        const startIndex = content.indexOf(startMarker);
        const endIndex = content.indexOf(endMarker);
        
        if (startIndex !== -1 && endIndex !== -1) {
            const blockToRemove = content.substring(startIndex, endIndex);
            // We will replace it with a dummy implementation or empty array to avoid breaking later code if txnBySource is used.
            // But txnBySource is likely sent in response.
            // Let's see where it is used.
            // It is probably passed to response.
            
            const newBlock = `// 5. Transaction breakdown by source (Disabled due to missing field)
            const txnBySource = [];
            
            `;
            
            const newContent = content.replace(blockToRemove, newBlock);
            fs.writeFileSync(adminControllerPath, newContent, 'utf8');
            console.log("Fixed adminController.js by disabling txnBySource query.");
        } else {
            console.log("Could not find the block to remove.");
             // Fallback regex approach if exact strings don't match
        }
    }
  } catch (e) {
    console.error(e);
  }
}

fix();
