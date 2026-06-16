# PANDUAN DEPLOY RANA ECOSYSTEM KE CPANEL
## Host: kaliurang.idweb.host | Domain: rana.web.id

---

## LANGKAH 1 — BUAT DATABASE POSTGRESQL DI CPANEL

1. Login cPanel → **PostgreSQL Databases**
2. Buat database baru: `rana` → nama lengkapnya: `norulesbp_rana`
3. Buat user baru: `ranauser` + password kuat → nama lengkap: `norulesbp_ranauser`
4. Tambahkan user ke database dengan **semua privileges**
5. Catat: host biasanya `localhost`, port `5432`

---

## LANGKAH 2 — SETUP NODE.JS APP DI CPANEL

1. cPanel → **Setup Node.js App**
2. Klik **Create Application**
3. Isi form:
   - **Node.js version**: pilih yang terbaru (18.x atau 20.x)
   - **Application mode**: Production
   - **Application root**: `nodeapp/server`
   - **Application URL**: `rana.web.id` (atau subdomain `api.rana.web.id`)
   - **Application startup file**: `app.js`
4. Klik **Create**
5. Catat **path virtual environment** yang diberikan cPanel

---

## LANGKAH 3 — UPLOAD SERVER

Upload seluruh folder `server/` ke `/home/norulesbp/nodeapp/server/` via **File Manager** atau FTP.

**Yang wajib diupload:**
```
server/
├── app.js              ← entry point Passenger
├── package.json
├── package-lock.json
├── src/                ← seluruh source code
├── prisma/             ← schema + migrations
└── uploads/            ← folder kosong (buat jika belum ada)
```

**Yang TIDAK perlu diupload:**
- `node_modules/` (akan di-install via cPanel)
- `*.bat`, debug files

---

## LANGKAH 4 — SET ENVIRONMENT VARIABLES DI CPANEL

Di halaman Setup Node.js App → **Environment Variables**, tambahkan:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `4000` |
| `DATABASE_URL` | `postgresql://norulesbp_ranauser:PASSWORD@localhost:5432/norulesbp_rana` |
| `JWT_SECRET` | `7c0b53788d8566e9b72cfd8265d312cee3440fa96cf14848a457ae129800bfd5fca4cf463a219094e581fa99ad5092d3eff91924d48eb1f98c5786231e43a4d9` |
| `ADMIN_EMAIL` | `admin@rana.web.id` |
| `ADMIN_PASSWORD` | `Admin!12345` |
| `ALLOWED_ORIGINS` | `https://rana.web.id,https://www.rana.web.id,https://admin.rana.web.id,https://distributor.rana.web.id` |
| `CHAT_RETENTION_HOURS` | `168` |
| `LOG_LEVEL` | `info` |

---

## LANGKAH 5 — INSTALL NODE MODULES DI CPANEL

Di halaman **Setup Node.js App**, klik tombol **Run NPM Install**.

Atau via SSH Terminal cPanel:
```bash
cd ~/nodeapp/server
npm install --omit=dev
```

---

## LANGKAH 6 — JALANKAN PRISMA MIGRATE

Via SSH Terminal cPanel:
```bash
cd ~/nodeapp/server
npx prisma generate
npx prisma db push
```

---

## LANGKAH 7 — UPLOAD FRONTEND FILES

### A. Merchant App (client) → `rana.web.id`
Upload semua isi `client/dist/` ke:
```
/home/norulesbp/public_html/rana.web.id/
```
*Pastikan file `.htaccess` ikut terupload (dari `client/public/.htaccess`)*

### B. Admin Dashboard → `admin.rana.web.id`
1. Buat subdomain `admin.rana.web.id` di cPanel → **Subdomains**
2. Set document root: `/public_html/admin.rana.web.id`
3. Upload semua isi `admin_client/dist/` ke folder tersebut
4. Upload file `.htaccess` (dari `admin_client/public/.htaccess`)

### C. Distributor Portal → `distributor.rana.web.id`
1. Buat subdomain `distributor.rana.web.id` di cPanel → **Subdomains**
2. Set document root: `/public_html/distributor.rana.web.id`
3. Upload semua isi `distributor_client/dist/` ke folder tersebut
4. Upload file `.htaccess` (dari `distributor_client/public/.htaccess`)

---

## LANGKAH 8 — KONFIGURASI API PROXY (PENTING)

Karena server Node.js berjalan di Passenger, semua request `/api/` harus diteruskan ke Node.js app.

Tambahkan `.htaccess` di `/public_html/rana.web.id/`:

```apache
Options -MultiViews
RewriteEngine On

# Teruskan /api/ ke Node.js Passenger app
RewriteCond %{REQUEST_URI} ^/api/
RewriteRule ^api/(.*)$ http://localhost:4000/api/$1 [P,L]

# SPA routing — semua non-file ke index.html
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.html [QSA,L]
```

*Catatan: Jika cPanel menggunakan Passenger dengan subdomain terpisah untuk API, skip bagian proxy.*

---

## LANGKAH 9 — START APLIKASI

Di cPanel → **Setup Node.js App** → klik **Restart** pada aplikasi rana-server.

---

## LANGKAH 10 — VERIFIKASI

Buka browser dan test:
- `https://rana.web.id` — Merchant App
- `https://rana.web.id/api/health` — API Health Check (harus return JSON `{"status":"healthy"}`)
- `https://admin.rana.web.id` — Admin Dashboard
- `https://distributor.rana.web.id` — Distributor Portal

Login admin:
- Email: `admin@rana.web.id`
- Password: `Admin!12345`

---

## CATATAN PENTING

- **WebSocket (Socket.IO)**: Passenger mendukung WebSocket, tapi mungkin perlu konfigurasi tambahan. Jika chat/realtime tidak berfungsi, Socket.IO akan otomatis fallback ke HTTP polling.
- **Upload files**: Folder `server/uploads/` harus writeable: `chmod 755 uploads`
- **SSL**: Aktifkan SSL gratis via **Let's Encrypt** di cPanel untuk semua domain/subdomain

---

## STRUKTUR AKHIR DI SERVER

```
/home/norulesbp/
├── nodeapp/
│   └── server/          ← Node.js backend (Passenger)
│       ├── app.js
│       ├── src/
│       ├── prisma/
│       └── uploads/
└── public_html/
    ├── rana.web.id/     ← Merchant App (React)
    ├── admin.rana.web.id/   ← Admin Dashboard (React)
    └── distributor.rana.web.id/  ← Distributor Portal (React+TS)
```
