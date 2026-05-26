@echo off
echo ==========================================
echo    Rana POS - Local Server Launcher
echo ==========================================
echo.

echo [1/3] Memeriksa konfigurasi...
cd server
if not exist .env (
    echo.
    echo [ERROR] File server/.env tidak ditemukan!
    echo.
    echo Silakan buat file server/.env dengan isi berikut:
    echo.
    echo   PORT=4000
    echo   DATABASE_URL="postgresql://postgres:PASSWORD_ANDA@localhost:5432/rana_pos?schema=public"
    echo   JWT_SECRET="string_acak_minimal_32_karakter"
    echo   NODE_ENV=development
    echo.
    echo Ganti PASSWORD_ANDA dengan password PostgreSQL Anda.
    echo.
    pause
    exit
)

echo [2/3] Installing dependencies (jika diperlukan)...
call npm install

echo [3/3] Starting Server...
echo.
echo Server berjalan di http://localhost:4000
echo Tekan Ctrl+C untuk berhenti.
echo.
call npm run dev
pause
