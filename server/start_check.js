/**
 * Rana Server - Startup Diagnostic & Launcher
 * Run this from the server directory: node start_check.js
 */

const path = require('path');
const fs = require('fs');

console.log('='.repeat(60));
console.log('  RANA SERVER - STARTUP DIAGNOSTIC');
console.log('='.repeat(60));
console.log('');

// 1. Check current working directory
console.log('1. Working Directory:', process.cwd());
const expectedDir = path.resolve(__dirname);
if (process.cwd() !== expectedDir) {
    console.log('   ⚠️  WARNING: CWD mismatch. Expected:', expectedDir);
}

// 2. Check .env file
const envPath = path.join(__dirname, '.env');
console.log('\n2. Checking .env file...');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const hasDB = envContent.includes('DATABASE_URL');
    const hasJWT = envContent.includes('JWT_SECRET');
    const hasPort = envContent.includes('PORT');
    console.log('   ✅ .env file found');
    console.log('   DATABASE_URL:', hasDB ? '✅ SET' : '❌ MISSING');
    console.log('   JWT_SECRET:', hasJWT ? '✅ SET' : '❌ MISSING');
    console.log('   PORT:', hasPort ? '✅ SET' : '⚠️ Missing (will default to 4000)');
} else {
    console.log('   ❌ .env file NOT FOUND at:', envPath);
    console.log('   Server CANNOT start without .env');
    process.exit(1);
}

// 3. Check node_modules
console.log('\n3. Checking node_modules...');
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
    console.log('   ✅ node_modules exists');
} else {
    console.log('   ❌ node_modules NOT FOUND - Run: npm install');
    process.exit(1);
}

// 4. Check critical dependencies
console.log('\n4. Checking critical dependencies...');
const criticalDeps = ['express', 'cors', '@prisma/client', 'bcrypt', 'jsonwebtoken', 'dotenv'];
let allDepsOk = true;
for (const dep of criticalDeps) {
    try {
        require.resolve(dep, { paths: [__dirname] });
        console.log(`   ✅ ${dep}`);
    } catch (e) {
        console.log(`   ❌ ${dep} - MISSING`);
        allDepsOk = false;
    }
}
if (!allDepsOk) {
    console.log('\n   ❌ Some dependencies are missing. Run: npm install');
    process.exit(1);
}

// 5. Check Prisma Client generated
console.log('\n5. Checking Prisma Client...');
try {
    const { PrismaClient } = require('@prisma/client');
    console.log('   ✅ Prisma Client importable');
} catch (e) {
    console.log('   ❌ Prisma Client not generated. Run: npx prisma generate');
    process.exit(1);
}

// 6. Check index.js exists
console.log('\n6. Checking server entry point...');
const indexPath = path.join(__dirname, 'src', 'index.js');
if (fs.existsSync(indexPath)) {
    console.log('   ✅ src/index.js found');
} else {
    console.log('   ❌ src/index.js NOT FOUND');
    process.exit(1);
}

// 7. Test database connection
console.log('\n7. Testing database connection...');
require('dotenv').config({ path: envPath });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDB() {
    try {
        await prisma.$queryRaw`SELECT 1 as test`;
        console.log('   ✅ Database connected successfully!');
        
        // Count users to verify schema
        const userCount = await prisma.user.count();
        console.log(`   ✅ Schema OK - Found ${userCount} user(s) in database`);
        
        await prisma.$disconnect();
        return true;
    } catch (e) {
        console.log('   ❌ Database connection FAILED!');
        console.log('   Error:', e.message);
        console.log('');
        console.log('   Possible fixes:');
        console.log('   - Make sure PostgreSQL is RUNNING');
        console.log('   - Check DATABASE_URL in .env');
        console.log('   - Run: npx prisma db push (to sync schema)');
        await prisma.$disconnect();
        return false;
    }
}

testDB().then((dbOk) => {
    console.log('\n' + '='.repeat(60));
    if (dbOk) {
        console.log('  ✅ ALL CHECKS PASSED - Starting server...');
        console.log('='.repeat(60));
        console.log('');
        
        // Actually start the server
        require('./src/index.js');
    } else {
        console.log('  ❌ DATABASE CHECK FAILED');
        console.log('  Fix the database issue above, then try again.');
        console.log('='.repeat(60));
        process.exit(1);
    }
}).catch((e) => {
    console.log('\n❌ Unexpected error during diagnostics:', e.message);
    process.exit(1);
});
