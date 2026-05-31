@echo off
echo ========================================
echo   Rana Driver - Production Build
echo ========================================
echo.

echo [1/5] Cleaning previous builds...
call flutter clean

echo [2/5] Getting dependencies...
call flutter pub get

echo [3/5] Generating app icons...
call flutter pub run flutter_launcher_icons 2>nul
if %errorlevel% neq 0 (
    echo    [SKIP] Icon generation skipped - replace placeholder assets first
)

echo [4/5] Generating splash screen...
call dart run flutter_native_splash:create 2>nul
if %errorlevel% neq 0 (
    echo    [SKIP] Splash generation skipped - replace placeholder assets first
)

echo [5/5] Building Release APK...
call flutter build apk --release --dart-define=RANA_PROD=true

echo.
echo ========================================
echo   Build Complete!
echo ========================================
echo.
echo APK Location:
echo   build\app\outputs\flutter-apk\app-release.apk
echo.
echo To also build App Bundle (Play Store):
echo   flutter build appbundle --release --dart-define=RANA_PROD=true
echo.
pause
