const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("🔍 Checking Super Admin...");
    const admins = await prisma.user.findMany({
        where: { role: 'SUPER_ADMIN' }
    });

    if (admins.length > 0) {
        console.log(`✅ Found ${admins.length} Super Admin(s):`);
        admins.forEach(u => console.log(`- ${u.email} (${u.name})`));
    } else {
        console.log("❌ No SUPER_ADMIN found!");
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
