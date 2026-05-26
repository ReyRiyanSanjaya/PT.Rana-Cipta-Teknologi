# Panduan Setup Localhost — Rana Market

> Panduan singkat untuk menjalankan seluruh ekosistem Rana Market secara lokal di Windows.
> Untuk panduan lengkap, buka: **`docs/installation.html`** di browser.

---

## ⚡ Setup Cepat (3 Langkah)

### Langkah 1 — Siapkan Database

Buka **pgAdmin** atau **SQL Shell (psql)**, jalankan:
```sql
CREATE DATABASE rana_pos;
```

### Langkah 2 — Konfigurasi .env

Edit file **`server\.env`** dan sesuaikan password PostgreSQL Anda:
```env
PORT=4000
DATABASE_URL="postgresql://postgres:PASSWORD_ANDA@localhost:5432/rana_pos?schema=public"
JWT_SECRET="ganti_dengan_string_acak_panjang"
NODE_ENV=development
```
> ⚠️ Ganti `PASSWORD_ANDA` dengan password PostgreSQL Anda. Jangan ada prefix `PASSWORD_` — cukup passwordnya saja.

### Langkah 3 — Jalankan Installer Otomatis

**Double-click** file **`Install manual awal.bat`** di root folder.

Script ini akan otomatis melakukan:
- `npm install` di Server + 3 Dashboard Web
- `flutter pub get` di 3 Aplikasi Mobile
- `npx prisma db push` — sinkronisasi skema database
- `npx prisma generate` — generate Prisma Client
- Seeding data demo (akun, menu, PPOB)

---

## 🚀 Menjalankan Aplikasi (Setelah Setup)

### Semua Layanan Sekaligus
Double-click **`start_all.bat`**

| URL | Layanan |
|---|---|
| `http://localhost:4000` | Backend API |
| `http://localhost:5173` | Dashboard Merchant |
| `http://localhost:5174` | Admin Panel |
| `http://localhost:5175` | Dashboard Distributor |

### Hanya Backend
Double-click **`start_server.bat`**

### Aplikasi Mobile
```bash
cd mobile_buyer   # atau: mobile / mobile_driver
flutter run
```

---

## 🔑 Akun Demo

| Peran | Email | Password |
|---|---|---|
| Merchant | `merchant@rana.com` | `password123` |
| Super Admin | `super@rana.com` | `password123` |

---

## 📁 Referensi Semua File Shortcut (.bat)

| File | Fungsi | Kapan Digunakan |
|---|---|---|
| `Install manual awal.bat` ⭐ | Setup lengkap otomatis (install + DB + seed) | **Pertama kali** di komputer baru |
| `start_all.bat` | Jalankan server + 3 dashboard web | Setiap hari development |
| `start_server.bat` | Jalankan hanya backend API | Saat hanya perlu server |
| `seed_db.bat` | Isi ulang data demo ke database | Jika perlu reset data |
| `update_db.bat` | Sync skema Prisma + generate client | Setelah edit `schema.prisma` |
| `build_apk.bat` | Build APK Release mobile (pilih app) | Deploy APK ke HP |
| `run_test.bat` | Jalankan unit test server | Sebelum commit besar |

---

## 📱 Konfigurasi Mobile App

### Emulator Android
Tidak perlu konfigurasi. App otomatis pakai `http://10.0.2.2:4000`.

### HP Fisik (WiFi yang sama)
1. Cek IP laptop: buka CMD → `ipconfig` → cari **IPv4 Address**
2. Edit `lib/config/api_config.dart` di masing-masing folder mobile:
   ```dart
   static const String _localIp = '192.168.1.8'; // IP Laptop Anda
   ```
3. Tambahkan **Inbound Rule** di Windows Firewall untuk port 4000

---

## 🔄 Update Setelah Pull dari Git

Jika ada perubahan pada `schema.prisma`:
```bash
# Double-click update_db.bat, atau jalankan manual:
cd server
npx prisma db push
npx prisma generate
```

Reset database ke kondisi awal:
```bash
cd server
npx prisma migrate reset   # ⚠️ MENGHAPUS SEMUA DATA!
node prisma/seed.js
npm run seed:menus
npm run seed:ppob
```

---

## ❌ Troubleshooting Cepat

| Error | Solusi |
|---|---|
| `Cannot find module 'mongoose'` | **Jangan** install mongoose. Jalankan: `cd server && npx prisma db push && npx prisma generate` |
| `Authentication failed` (P1000) | Hapus prefix `PASSWORD_` di `.env`. Contoh benar: `postgres:simpledark67@` |
| `npx cannot be loaded` (PowerShell) | Gunakan **CMD** bukan PowerShell. Atau (PowerShell Admin): `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` |
| Service PostgreSQL tidak jalan | `Win + R` → `services.msc` → cari `postgresql-x64-XX` → Start |
| `Port 4000 already in use` | Ubah `PORT=4001` di `.env` |
| `The table does not exist` | Double-click `update_db.bat` |
| Network Error di HP | Pastikan IP di `api_config.dart` benar + Firewall rule port 4000 |
| `flutter pub get` gagal | Jalankan `flutter doctor` untuk diagnosa |
| `Install manual awal.bat` langsung tutup | Klik kanan → Run as administrator |
