@echo off
echo ==========================================
echo   Rana POS - Server + Cloudflare Tunnel
echo ==========================================
echo.

:: Jalankan server di background
echo [1/2] Starting Rana Server...
start "Rana Server" cmd /k "cd /d %~dp0server && npm start"

:: Tunggu server ready
echo Waiting for server to start...
timeout /t 5 /nobreak > nul

:: Jalankan Cloudflare Tunnel
echo [2/2] Starting Cloudflare Tunnel...
echo.
echo URL publik akan muncul di bawah (baris: https://xxxx.trycloudflare.com)
echo Copy URL tersebut dan update VITE_API_URL di Vercel
echo.
cloudflared tunnel --url http://localhost:4000

pause
