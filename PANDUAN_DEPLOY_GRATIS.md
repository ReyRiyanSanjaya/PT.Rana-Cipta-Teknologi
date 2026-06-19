# 🚀 Panduan Deploy: Supabase + Cloudflare Tunnel + Vercel

Stack:
- **Database** → Supabase ✅
- **Backend** → Laptop kamu + Cloudflare Tunnel
- **Frontend** → Vercel

---

## ✅ SELESAI — Database Supabase

- Project ref: `fmklvqjzhbsrriilnmns`
- Schema sudah di-migrate ✅
- Server `.env` sudah diupdate ke Supabase ✅

---

## STEP 1 — Jalankan Server + Tunnel

### Cara Cepat (1 klik)

Dobel klik file:
```
start_tunnel.bat
```

Ini akan:
1. Buka window baru → jalankan server Express di port 4000
2. Jalankan Cloudflare Tunnel → expose ke internet

### Cara Manual

Terminal 1 — jalankan server:
```bash
cd server
npm start
```

Terminal 2 — jalankan tunnel:
```bash
cloudflared tunnel --url http://localhost:4000
```

### Output yang Muncul

Di terminal tunnel akan muncul baris seperti:
```
+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
|  https://abc-def-123.trycloudflare.com                                                     |
+--------------------------------------------------------------------------------------------+
```

**Copy URL tersebut** — ini URL publik backend kamu.

---

## STEP 2 — Deploy Frontend ke Vercel

Push ke GitHub dulu:
```bash
git add .
git commit -m "chore: add cloudflare tunnel setup"
git push origin main
```

Deploy **3 frontend** di Vercel. Untuk setiap frontend:

### A. Merchant Client (`/client`)

1. https://vercel.com → **New Project** → import repo
2. **Root Directory**: `client`
3. **Environment Variables**:
   - `VITE_API_URL` = `https://abc-def-123.trycloudflare.com/api`
4. Deploy

### B. Admin Client (`/admin_client`)

1. Vercel → **New Project** → import repo yang sama
2. **Root Directory**: `admin_client`
3. **Environment Variables**:
   - `VITE_API_URL` = `https://abc-def-123.trycloudflare.com/api`
4. Deploy

### C. Distributor Client (`/distributor_client`)

1. Vercel → **New Project** → import repo yang sama
2. **Root Directory**: `distributor_client`
3. **Environment Variables**:
   - `VITE_API_URL` = `https://abc-def-123.trycloudflare.com/api`
4. Deploy

---

## STEP 3 — Update CORS di Server

Setelah dapat URL Vercel, update `ALLOWED_ORIGINS` di `server/.env`:

```env
ALLOWED_ORIGINS=https://rana-client.vercel.app,https://rana-admin.vercel.app,https://rana-distributor.vercel.app
```

Lalu restart server.

---

## ⚠️ Catatan Penting

| Kondisi | Dampak |
|---------|--------|
| Laptop mati | Backend tidak bisa diakses |
| Restart tunnel | URL berubah → update `VITE_API_URL` di Vercel |
| Internet putus | Backend tidak bisa diakses |

**Kalau URL tunnel berubah**, update `VITE_API_URL` di Vercel:
- Vercel Dashboard → Project → Settings → Environment Variables → Edit

---

## Troubleshooting

**Server gagal start?**
```bash
cd server
npm install
npm start
```

**Tunnel tidak muncul URL?**
- Pastikan server sudah jalan di port 4000 dulu
- Coba: `cloudflared tunnel --url http://localhost:4000`

**CORS error di frontend?**
- Pastikan `ALLOWED_ORIGINS` di `server/.env` sudah berisi URL Vercel
- Restart server setelah edit `.env`

**Cek koneksi database:**
```
https://abc-def-123.trycloudflare.com/api/health
```
