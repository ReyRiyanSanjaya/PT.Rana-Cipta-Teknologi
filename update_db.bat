@echo off
title Rana Market - Update Database Schema
color 0E

echo.
echo ==============================================================
echo   RANA MARKET - UPDATE DATABASE SCHEMA
echo ==============================================================
echo.
echo   Script ini menyinkronkan perubahan schema Prisma ke database.
echo   Gunakan setiap kali ada perubahan pada schema.prisma
echo.

cd server

echo [1/2] Menjalankan prisma db push...
call npx prisma db push
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Prisma db push gagal!
    echo   Pastikan PostgreSQL berjalan dan DATABASE_URL di .env benar.
    cd ..
    pause
    exit /b 1
)
echo [OK] Schema berhasil disinkronkan!
echo.

echo [2/2] Generating Prisma Client...
call npx prisma generate
if %errorlevel% neq 0 (
    echo [WARNING] Prisma generate gagal.
) else (
    echo [OK] Prisma Client berhasil di-generate!
)

cd ..
echo.
echo ==============================================================
echo   Database schema berhasil diperbarui!
echo   Restart server jika sedang berjalan: Ctrl+C lalu start_server.bat
echo ==============================================================
echo.
pause
