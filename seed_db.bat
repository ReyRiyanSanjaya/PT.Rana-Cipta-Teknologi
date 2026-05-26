@echo off
title Rana Market - Seeding Database
color 0B

echo.
echo ==============================================================
echo   RANA MARKET - SEEDING DATABASE
echo ==============================================================
echo.

cd server

if not exist ".env" (
    echo [ERROR] File server\.env tidak ditemukan!
    echo Pastikan Anda sudah mengkonfigurasi server\.env terlebih dahulu.
    pause
    exit /b 1
)

echo [Seed 1/3] Data akun demo dan produk contoh...
call node prisma/seed.js
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Seeding gagal! Kemungkinan penyebab:
    echo   - PostgreSQL tidak berjalan
    echo   - Password di .env salah
    echo   - Database rana_pos belum dibuat
    echo   - Schema belum disinkronkan (jalankan update_db.bat)
    cd ..
    pause
    exit /b 1
)
echo.

echo [Seed 2/3] Data menu navigasi dashboard...
call npm run seed:menus
if %errorlevel% neq 0 (
    echo [WARNING] seed:menus gagal - mungkin data sudah ada
)
echo.

echo [Seed 3/3] Data produk PPOB (Pulsa, Token Listrik)...
call npm run seed:ppob
if %errorlevel% neq 0 (
    echo [WARNING] seed:ppob gagal - mungkin data sudah ada
)

cd ..
echo.
echo ==============================================================
echo   Seeding Selesai!
echo.
echo   Akun yang tersedia:
echo   Merchant   : merchant@rana.com  / password123
echo   SuperAdmin : super@rana.com     / password123
echo ==============================================================
echo.
pause
