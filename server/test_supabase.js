const net = require('net');
const { Client } = require('pg');

async function testTCP(host, port) {
    return new Promise((resolve) => {
        const sock = new net.Socket();
        sock.setTimeout(5000);
        sock.connect(port, host, () => {
            console.log(`✅ TCP ${host}:${port} → REACHABLE`);
            sock.destroy(); resolve(true);
        });
        sock.on('error', (e) => { console.log(`❌ TCP ${host}:${port} → ${e.message}`); resolve(false); });
        sock.on('timeout', () => { console.log(`❌ TCP ${host}:${port} → TIMEOUT`); sock.destroy(); resolve(false); });
    });
}

(async () => {
    await testTCP('aws-1-us-east-1.pooler.supabase.com', 6543);
    await testTCP('aws-1-us-east-1.pooler.supabase.com', 5432);

    const client = new Client({
        host: 'aws-1-us-east-1.pooler.supabase.com',
        port: 6543,
        database: 'postgres',
        user: 'postgres.ysgllcseevaryclzcyle',
        password: 'Ranacipta123.',
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
    });
    try {
        await client.connect();
        const res = await client.query('SELECT current_user');
        console.log('✅ PostgreSQL BERHASIL:', res.rows[0].current_user);
        await client.end();
    } catch (err) {
        console.log('❌ PostgreSQL GAGAL:', err.message);
    }
})();
