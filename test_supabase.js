const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres:Ranacipta123@@db.fmklvqjzhbsrriilnmns.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
});

client.connect()
    .then(() => {
        console.log('✅ Koneksi ke Supabase BERHASIL');
        return client.query('SELECT version()');
    })
    .then(res => {
        console.log('PostgreSQL:', res.rows[0].version);
        return client.end();
    })
    .catch(err => {
        console.error('❌ Koneksi GAGAL:', err.message);
        process.exit(1);
    });
