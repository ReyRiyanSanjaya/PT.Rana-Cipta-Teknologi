/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  RANA ECOSYSTEM — Environment Setup (Node.js)                    ║
 * ║  Membaca .env.ecosystem → generate .env per folder               ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Usage: node setup_env.js
 * Atau:  node setup_env.js --prod  (untuk mode production)
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, '.env.ecosystem');

// ─────────────────────────────────────────────────────────────────
// 1. Parse .env.ecosystem
// ─────────────────────────────────────────────────────────────────
if (!fs.existsSync(SOURCE)) {
    console.error('❌ File .env.ecosystem tidak ditemukan!');
    console.error('   Pastikan file ada di root project.');
    process.exit(1);
}

const raw = fs.readFileSync(SOURCE, 'utf-8');
const config = {};

raw.split('\n').forEach(line => {
    const trimmed = line.trim();
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) return;
    const key = trimmed.substring(0, eqIndex).trim();
    let value = trimmed.substring(eqIndex + 1).trim();
    // Remove surrounding quotes if any
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
    }
    config[key] = value;
});

// Resolve ${VAR} references
function resolve(val) {
    if (!val) return val;
    return val.replace(/\$\{(\w+)\}/g, (_, key) => config[key] || '');
}

// Resolve all values
Object.keys(config).forEach(key => {
    config[key] = resolve(config[key]);
});

console.log('');
console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  RANA ECOSYSTEM — Environment Setup                         ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log('');

// ─────────────────────────────────────────────────────────────────
// 2. Generate .env files
// ─────────────────────────────────────────────────────────────────

const timestamp = new Date().toISOString();

function writeEnv(folder, content, label) {
    const filePath = path.join(ROOT, folder, '.env');
    const dir = path.join(ROOT, folder);
    if (!fs.existsSync(dir)) {
        console.log(`   ⚠️  Folder ${folder}/ tidak ada, skip.`);
        return;
    }
    const header = `# Auto-generated from .env.ecosystem\n# Generated: ${timestamp}\n\n`;
    fs.writeFileSync(filePath, header + content.trim() + '\n', 'utf-8');
    console.log(`   ✅ ${folder}/.env — ${label}`);
}

// ── SERVER ──
writeEnv('server', `
PORT=${config.SERVER_PORT || '4000'}
NODE_ENV=${config.NODE_ENV || 'development'}

# Database
DATABASE_URL=${config.DATABASE_URL || ''}

# JWT
JWT_SECRET=${config.JWT_SECRET || ''}

# Admin Seed
ADMIN_EMAIL=${config.ADMIN_EMAIL || 'admin@rana.id'}
ADMIN_PASSWORD=${config.ADMIN_PASSWORD || ''}

# CORS
ALLOWED_ORIGINS=${config.ALLOWED_ORIGINS || ''}

# Chat
CHAT_RETENTION_HOURS=${config.CHAT_RETENTION_HOURS || '168'}

# Digiflazz PPOB
DIGIFLAZZ_USERNAME=${config.DIGIFLAZZ_USERNAME || ''}
DIGIFLAZZ_API_KEY=${config.DIGIFLAZZ_API_KEY || ''}
DIGIFLAZZ_BASE_URL=${config.DIGIFLAZZ_BASE_URL || 'https://api.digiflazz.com/v1'}
DIGIFLAZZ_MODE=${config.DIGIFLAZZ_MODE || 'production'}
DIGIFLAZZ_MARKUP_FLAT=${config.DIGIFLAZZ_MARKUP_FLAT || '0'}
DIGIFLAZZ_MARKUP_PERCENT=${config.DIGIFLAZZ_MARKUP_PERCENT || '0'}
DIGIFLAZZ_WEBHOOK_SECRET=${config.DIGIFLAZZ_WEBHOOK_SECRET || ''}

# OpenAI
OPENAI_API_KEY=${config.OPENAI_API_KEY || ''}
OPENAI_MODEL=${config.OPENAI_MODEL || 'gpt-4.1-mini'}

# Logging
LOG_LEVEL=${config.LOG_LEVEL || 'info'}

# Encryption
SETTINGS_ENCRYPTION_KEY=${config.SETTINGS_ENCRYPTION_KEY || ''}

# Firebase
FCM_SERVER_KEY=${config.FCM_SERVER_KEY || ''}
FIREBASE_PROJECT_ID=${config.FIREBASE_PROJECT_ID || ''}
FIREBASE_SERVICE_ACCOUNT_PATH=${config.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json'}
`, 'Backend API');

// ── CLIENT (Merchant) ──
writeEnv('client', `
VITE_API_URL=${config.CLIENT_API_URL || 'http://localhost:4000/api'}
`, 'Merchant Frontend');

// ── ADMIN CLIENT ──
writeEnv('admin_client', `
VITE_API_URL=${config.ADMIN_API_URL || 'http://localhost:4000/api'}
`, 'Admin Dashboard');

// ── DISTRIBUTOR CLIENT ──
writeEnv('distributor_client', `
VITE_API_URL=${config.DISTRIBUTOR_API_URL || 'http://localhost:4000/api'}
`, 'Distributor Portal');

// ── MOBILE DRIVER ──
writeEnv('mobile_driver', `
API_BASE_URL=${config.DRIVER_API_URL || 'http://localhost:4000/api'}
RANA_PROD=${config.DRIVER_PROD || 'false'}
FIREBASE_PROJECT_ID=${config.FIREBASE_PROJECT_ID || ''}
FCM_SERVER_KEY=${config.FCM_SERVER_KEY || ''}
PLAY_STORE_PACKAGE_NAME=${config.PLAY_STORE_PACKAGE_NAME || 'com.rana.driver'}
PLAY_STORE_APP_NAME=${config.PLAY_STORE_APP_NAME || 'Rana Driver'}
LOCAL_DEV_IP=${config.LOCAL_IP || '192.168.1.x'}
SERVER_PORT=${config.SERVER_PORT || '4000'}
`, 'Driver App');

// ── MOBILE MERCHANT ──
writeEnv('mobile', `
API_BASE_URL=${config.MERCHANT_APP_API_URL || 'http://localhost:4000/api'}
RANA_PROD=${config.MERCHANT_APP_PROD || 'false'}
LOCAL_DEV_IP=${config.LOCAL_IP || '192.168.1.x'}
SERVER_PORT=${config.SERVER_PORT || '4000'}
`, 'Merchant Mobile App');

// ── MOBILE BUYER ──
writeEnv('mobile_buyer', `
API_BASE_URL=${config.BUYER_APP_API_URL || 'http://localhost:4000/api'}
RANA_PROD=${config.BUYER_APP_PROD || 'false'}
LOCAL_DEV_IP=${config.LOCAL_IP || '192.168.1.x'}
SERVER_PORT=${config.SERVER_PORT || '4000'}
`, 'Buyer App');

// ── MOBILE SALES ──
writeEnv('mobile_sales', `
API_BASE_URL=${config.SALES_APP_API_URL || 'http://localhost:4000/api'}
RANA_PROD=${config.SALES_APP_PROD || 'false'}
LOCAL_DEV_IP=${config.LOCAL_IP || '192.168.1.x'}
SERVER_PORT=${config.SERVER_PORT || '4000'}
`, 'Sales Force App');

// ─────────────────────────────────────────────────────────────────
// 3. Summary
// ─────────────────────────────────────────────────────────────────
console.log('');
console.log('════════════════════════════════════════════════════════════════');
console.log('  SELESAI! Semua .env sudah di-generate.');
console.log('');
console.log('  Port Assignment:');
console.log(`    Server:              http://localhost:${config.SERVER_PORT || '4000'}`);
console.log(`    Merchant Client:     http://localhost:${config.CLIENT_PORT || '5173'}`);
console.log(`    Admin Dashboard:     http://localhost:${config.ADMIN_CLIENT_PORT || '5174'}`);
console.log(`    Distributor Portal:  http://localhost:${config.DISTRIBUTOR_CLIENT_PORT || '5175'}`);
console.log(`    Mobile Apps:         http://${config.LOCAL_IP || '192.168.1.x'}:${config.SERVER_PORT || '4000'}`);
console.log('');
console.log('  Tips:');
console.log('    - Edit .env.ecosystem lalu jalankan ulang: node setup_env.js');
console.log('    - Untuk production: uncomment baris PROD di .env.ecosystem');
console.log('    - Jalankan start_all.bat untuk start semua web service');
console.log('════════════════════════════════════════════════════════════════');
console.log('');
