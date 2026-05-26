/**
 * Fix Subscriptions - Extend all tenants' subscription dates
 * Run: node fix_subscriptions.js
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixSubscriptions() {
    console.log('🔧 Fixing tenant subscriptions...\n');
    
    // Get all tenants
    const tenants = await prisma.tenant.findMany({
        include: { users: { select: { email: true, role: true } } }
    });

    console.log(`Found ${tenants.length} tenant(s):\n`);

    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    for (const tenant of tenants) {
        console.log(`  Tenant: ${tenant.name} (${tenant.id})`);
        console.log(`    Plan: ${tenant.plan}`);
        console.log(`    Status: ${tenant.subscriptionStatus}`);
        console.log(`    Trial Ends: ${tenant.trialEndsAt || 'NULL'}`);
        console.log(`    Sub Ends: ${tenant.subscriptionEndsAt || 'NULL'}`);
        console.log(`    Users: ${tenant.users.map(u => `${u.email} (${u.role})`).join(', ')}`);

        // Update subscription to ACTIVE with 1 year validity
        await prisma.tenant.update({
            where: { id: tenant.id },
            data: {
                subscriptionStatus: 'ACTIVE',
                plan: tenant.plan === 'FREE' ? 'PREMIUM' : tenant.plan,
                subscriptionEndsAt: oneYearFromNow,
                trialEndsAt: oneYearFromNow,
            }
        });

        console.log(`    ✅ Updated → ACTIVE until ${oneYearFromNow.toISOString()}\n`);
    }

    console.log('✅ All subscriptions fixed!');
    await prisma.$disconnect();
}

fixSubscriptions().catch((e) => {
    console.error('❌ Error:', e.message);
    prisma.$disconnect();
    process.exit(1);
});
