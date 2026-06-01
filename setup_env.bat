@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║  RANA ECOSYSTEM — Environment Setup                         ║
echo ║  Membaca .env.ecosystem dan generate .env per folder        ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

:: Check if .env.ecosystem exists
if not exist ".env.ecosystem" (
    echo [ERROR] File .env.ecosystem tidak ditemukan!
    echo         Pastikan kamu menjalankan script ini dari root project.
    pause
    exit /b 1
)

:: ─────────────────────────────────────────────────────────────────
:: Parse .env.ecosystem into variables
:: ─────────────────────────────────────────────────────────────────
for /f "usebackq tokens=1,* delims==" %%A in (".env.ecosystem") do (
    set "line=%%A"
    if not "!line:~0,1!"=="#" (
        if not "%%B"=="" (
            set "%%A=%%B"
        )
    )
)

echo [INFO] Konfigurasi dibaca dari .env.ecosystem
echo.

:: ─────────────────────────────────────────────────────────────────
:: 1. SERVER .env
:: ─────────────────────────────────────────────────────────────────
echo [1/5] Generating server/.env ...

(
echo # Auto-generated from .env.ecosystem
echo # Generated: %date% %time%
echo.
echo PORT=!SERVER_PORT!
echo NODE_ENV=!NODE_ENV!
echo.
echo # Database
echo DATABASE_URL=!DATABASE_URL!
echo.
echo # JWT
echo JWT_SECRET=!JWT_SECRET!
echo.
echo # Admin Seed
echo ADMIN_EMAIL=!ADMIN_EMAIL!
echo ADMIN_PASSWORD=!ADMIN_PASSWORD!
echo.
echo # CORS
echo ALLOWED_ORIGINS=!ALLOWED_ORIGINS!
echo.
echo # Chat
echo CHAT_RETENTION_HOURS=!CHAT_RETENTION_HOURS!
echo.
echo # Digiflazz PPOB
echo DIGIFLAZZ_USERNAME=!DIGIFLAZZ_USERNAME!
echo DIGIFLAZZ_API_KEY=!DIGIFLAZZ_API_KEY!
echo DIGIFLAZZ_BASE_URL=!DIGIFLAZZ_BASE_URL!
echo DIGIFLAZZ_MODE=!DIGIFLAZZ_MODE!
echo DIGIFLAZZ_MARKUP_FLAT=!DIGIFLAZZ_MARKUP_FLAT!
echo DIGIFLAZZ_MARKUP_PERCENT=!DIGIFLAZZ_MARKUP_PERCENT!
echo.
echo # Encryption
echo SETTINGS_ENCRYPTION_KEY=!SETTINGS_ENCRYPTION_KEY!
echo.
echo # Firebase
echo FCM_SERVER_KEY=!FCM_SERVER_KEY!
echo FIREBASE_PROJECT_ID=!FIREBASE_PROJECT_ID!
echo FIREBASE_SERVICE_ACCOUNT_PATH=!FIREBASE_SERVICE_ACCOUNT_PATH!
) > server\.env

echo        [OK] server/.env

:: ─────────────────────────────────────────────────────────────────
:: 2. CLIENT .env
:: ─────────────────────────────────────────────────────────────────
echo [2/5] Generating client/.env ...

(
echo # Auto-generated from .env.ecosystem
echo VITE_API_URL=!CLIENT_API_URL!
) > client\.env

echo        [OK] client/.env

:: ─────────────────────────────────────────────────────────────────
:: 3. ADMIN CLIENT .env
:: ─────────────────────────────────────────────────────────────────
echo [3/5] Generating admin_client/.env ...

(
echo # Auto-generated from .env.ecosystem
echo VITE_API_URL=!ADMIN_API_URL!
) > admin_client\.env

echo        [OK] admin_client/.env

:: ─────────────────────────────────────────────────────────────────
:: 4. DISTRIBUTOR CLIENT .env
:: ─────────────────────────────────────────────────────────────────
echo [4/5] Generating distributor_client/.env ...

(
echo # Auto-generated from .env.ecosystem
echo VITE_API_URL=!DISTRIBUTOR_API_URL!
) > distributor_client\.env

echo        [OK] distributor_client/.env

:: ─────────────────────────────────────────────────────────────────
:: 5. MOBILE DRIVER .env
:: ─────────────────────────────────────────────────────────────────
echo [5/5] Generating mobile_driver/.env ...

(
echo # Auto-generated from .env.ecosystem
echo API_BASE_URL=!DRIVER_API_URL!
echo RANA_PROD=!DRIVER_PROD!
echo FIREBASE_PROJECT_ID=!FIREBASE_PROJECT_ID!
echo FCM_SERVER_KEY=!FCM_SERVER_KEY!
echo PLAY_STORE_PACKAGE_NAME=!PLAY_STORE_PACKAGE_NAME!
echo PLAY_STORE_APP_NAME=!PLAY_STORE_APP_NAME!
echo LOCAL_DEV_IP=!LOCAL_IP!
echo SERVER_PORT=!SERVER_PORT!
) > mobile_driver\.env

echo        [OK] mobile_driver/.env

:: ─────────────────────────────────────────────────────────────────
:: Done
:: ─────────────────────────────────────────────────────────────────
echo.
echo ════════════════════════════════════════════════════════════════
echo  SELESAI! Semua .env sudah di-generate.
echo.
echo  Langkah selanjutnya:
echo    1. Edit .env.ecosystem (isi JWT_SECRET, DATABASE_URL, dll)
echo    2. Jalankan ulang setup_env.bat
echo    3. Jalankan start_all.bat untuk start semua service
echo.
echo  Port Assignment:
echo    Server:              http://localhost:!SERVER_PORT!
echo    Merchant Client:     http://localhost:!CLIENT_PORT!
echo    Admin Dashboard:     http://localhost:!ADMIN_CLIENT_PORT!
echo    Distributor Portal:  http://localhost:!DISTRIBUTOR_CLIENT_PORT!
echo ════════════════════════════════════════════════════════════════
echo.
pause
