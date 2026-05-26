@echo off
title Rana Market - Setup Instalasi Awal
color 0A

echo.
echo ==============================================================
echo   RANA MARKET - SETUP INSTALASI AWAL LENGKAP
echo   Server + 3 Dashboard Web + 3 Aplikasi Mobile
echo   Database + Seeding + Prisma Generate
echo ==============================================================
echo.
echo   Script ini akan melakukan SEMUA langkah instalasi.
echo   Pastikan hal berikut SUDAH siap sebelum melanjutkan:
echo.
echo   [1] Node.js v18+ sudah terinstall  (cek: node --version)
echo   [2] Flutter SDK sudah terinstall   (cek: flutter --version)
echo   [3] PostgreSQL sudah berjalan      (cek di Services / pgAdmin)
echo   [4] Database "rana_pos" sudah dibuat di PostgreSQL
echo   [5] Password PostgreSQL di server\.env sudah disesuaikan
echo.
echo   Tekan ENTER untuk mulai, atau Ctrl+C untuk batal...
pause >nul
echo.

:: ============================================================
:: CEK KETERSEDIAAN NODE.JS
:: ============================================================
echo [CEK] Memverifikasi Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Node.js tidak ditemukan di sistem!
    echo Download di: https://nodejs.org
    echo.
    pause
    exit /b 1
)
echo [OK] Node.js ditemukan
echo.

:: ============================================================
:: CEK FLUTTER
:: ============================================================
echo [CEK] Memverifikasi Flutter...
where flutter >nul 2>&1
if %errorlevel% neq 0 (
    echo [PERINGATAN] Flutter tidak ditemukan di PATH.
    echo              Langkah instalasi mobile akan dilewati.
    set FLUTTER_AVAILABLE=0
) else (
    echo [OK] Flutter ditemukan
    set FLUTTER_AVAILABLE=1
)
echo.

:: ============================================================
:: CEK FILE .ENV
:: ============================================================
echo [CEK] Memeriksa file server\.env...
if not exist "server\.env" (
    echo.
    echo [ERROR] File server\.env tidak ditemukan!
    echo.
    echo Buat file server\.env dengan isi berikut:
    echo   PORT=4000
    echo   DATABASE_URL=postgresql://postgres:PASSWORD_ANDA@localhost:5432/rana_pos?schema=public
    echo   JWT_SECRET=ganti_dengan_string_acak_panjang
    echo   NODE_ENV=development
    echo.
    echo Ganti PASSWORD_ANDA dengan password PostgreSQL Anda.
    echo.
    pause
    exit /b 1
)
echo [OK] File server\.env ditemukan
echo.

:: ============================================================
:: FASE 1: INSTALL NPM DEPENDENCIES
:: ============================================================
echo ==============================================================
echo   FASE 1 dari 4: Install Dependensi Node.js
echo ==============================================================
echo.

echo [1/4] Server (server/)...
cd server
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install gagal di server/!
    echo Periksa koneksi internet atau hapus folder node_modules lalu coba lagi.
    cd ..
    pause
    exit /b 1
)
cd ..
echo [OK] server/ selesai
echo.

echo [2/4] Dashboard Merchant (client/)...
cd client
call npm install
if %errorlevel% neq 0 (
    echo [WARNING] npm install gagal di client/ - melanjutkan...
)
cd ..
echo [OK] client/ selesai
echo.

echo [3/4] Dashboard Admin (admin_client/)...
cd admin_client
call npm install
if %errorlevel% neq 0 (
    echo [WARNING] npm install gagal di admin_client/ - melanjutkan...
)
cd ..
echo [OK] admin_client/ selesai
echo.

echo [4/4] Dashboard Distributor (distributor_client/)...
cd distributor_client
call npm install
if %errorlevel% neq 0 (
    echo [WARNING] npm install gagal di distributor_client/ - melanjutkan...
)
cd ..
echo [OK] distributor_client/ selesai
echo.

:: ============================================================
:: FASE 2: FLUTTER PUB GET
:: ============================================================
if "%FLUTTER_AVAILABLE%"=="1" (
    echo ==============================================================
    echo   FASE 2 dari 4: Install Dependensi Flutter
    echo ==============================================================
    echo.

    echo [5/7] Rana Seller App - mobile/...
    cd mobile
    call flutter pub get
    if %errorlevel% neq 0 (
        echo [WARNING] flutter pub get gagal di mobile/ - melanjutkan...
    )
    cd ..
    echo [OK] mobile/ selesai
    echo.

    echo [6/7] Rana Buyer App - mobile_buyer/...
    cd mobile_buyer
    call flutter pub get
    if %errorlevel% neq 0 (
        echo [WARNING] flutter pub get gagal di mobile_buyer/ - melanjutkan...
    )
    cd ..
    echo [OK] mobile_buyer/ selesai
    echo.

    echo [7/7] Rana Driver App - mobile_driver/...
    cd mobile_driver
    call flutter pub get
    if %errorlevel% neq 0 (
        echo [WARNING] flutter pub get gagal di mobile_driver/ - melanjutkan...
    )
    cd ..
    echo [OK] mobile_driver/ selesai
    echo.
) else (
    echo [SKIP] Fase 2 dilewati karena Flutter tidak tersedia di PATH
    echo.
)

:: ============================================================
:: FASE 3: PRISMA DB PUSH + GENERATE
:: ============================================================
echo ==============================================================
echo   FASE 3 dari 4: Setup Database (Prisma)
echo ==============================================================
echo.
echo Menyinkronkan skema database ke PostgreSQL...
echo.
cd server

call npx prisma db push
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Prisma db push gagal!
    echo.
    echo Kemungkinan penyebab:
    echo   - PostgreSQL tidak berjalan
    echo   - Password di server\.env salah
    echo     (pastikan tidak ada prefix PASSWORD_ di depan password)
    echo   - Database "rana_pos" belum dibuat
    echo.
    echo Cara buat database - buka pgAdmin atau psql, jalankan:
    echo   CREATE DATABASE rana_pos;
    echo.
    cd ..
    pause
    exit /b 1
)
echo [OK] Schema berhasil disinkronkan!
echo.

echo Generating Prisma Client...
call npx prisma generate
if %errorlevel% neq 0 (
    echo [WARNING] Prisma generate gagal - mungkin tidak kritis, melanjutkan...
) else (
    echo [OK] Prisma Client siap!
)
cd ..
echo.

:: ============================================================
:: FASE 4: SEEDING DATABASE
:: ============================================================
echo ==============================================================
echo   FASE 4 dari 4: Seeding Data Awal
echo ==============================================================
echo.
cd server

echo [Seed 1/3] Data akun demo dan produk contoh...
call node prisma/seed.js
if %errorlevel% neq 0 (
    echo [WARNING] seed.js gagal - mungkin data sudah ada, melanjutkan...
)
echo.

echo [Seed 2/3] Data menu navigasi dashboard...
call npm run seed:menus
if %errorlevel% neq 0 (
    echo [WARNING] seed:menus gagal - mungkin data sudah ada, melanjutkan...
)
echo.

echo [Seed 3/3] Data produk PPOB (Pulsa, Token Listrik)...
call npm run seed:ppob
if %errorlevel% neq 0 (
    echo [WARNING] seed:ppob gagal - mungkin data sudah ada, melanjutkan...
)
cd ..
echo.

:: ============================================================
:: SELESAI
:: ============================================================
echo.
echo ==============================================================
echo   INSTALASI AWAL SELESAI!
echo ==============================================================
echo.
echo   Akun Demo yang Tersedia:
echo   Merchant   : merchant@rana.com  / password123
echo   SuperAdmin : super@rana.com     / password123
echo.
echo   Langkah Selanjutnya:
echo   - Double-click start_all.bat   untuk semua layanan
echo   - Double-click start_server.bat untuk hanya backend
echo.
echo   URL Layanan:
echo   Backend API    : http://localhost:4000
echo   Dashboard      : http://localhost:5173
echo   Admin Panel    : http://localhost:5174
echo   Distributor    : http://localhost:5175
echo ==============================================================
echo.
pause
