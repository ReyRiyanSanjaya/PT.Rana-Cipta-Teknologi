@echo off
echo ============================================================
echo  RANA ECOSYSTEM — BUILD PRODUCTION
echo  Target: https://rana.web.id
echo ============================================================
echo.

:: ── 1. CLIENT (Merchant App) ────────────────────────────────
echo [1/3] Building Merchant App (client)...
cd client
copy /Y .env.production .env
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: client build gagal!
    pause
    exit /b 1
)
echo DONE: client/dist siap
cd ..
echo.

:: ── 2. ADMIN CLIENT ─────────────────────────────────────────
echo [2/3] Building Admin Dashboard (admin_client)...
cd admin_client
copy /Y .env.production .env
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: admin_client build gagal!
    pause
    exit /b 1
)
echo DONE: admin_client/dist siap
cd ..
echo.

:: ── 3. DISTRIBUTOR CLIENT ───────────────────────────────────
echo [3/3] Building Distributor Portal (distributor_client)...
cd distributor_client
copy /Y .env.production .env
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: distributor_client build gagal!
    pause
    exit /b 1
)
echo DONE: distributor_client/dist siap
cd ..
echo.

echo ============================================================
echo  SEMUA BUILD SELESAI!
echo.
echo  Hasil build:
echo    client/dist         --> upload ke /public_html/rana.web.id/
echo    admin_client/dist   --> upload ke /public_html/admin.rana.web.id/
echo    distributor_client/dist --> upload ke /public_html/distributor.rana.web.id/
echo    server/             --> upload ke /home/norulesbp/nodeapp/server/
echo ============================================================
echo.
pause
