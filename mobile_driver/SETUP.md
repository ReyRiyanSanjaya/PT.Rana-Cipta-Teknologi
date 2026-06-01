# Rana Driver - Developer Setup Guide

## Quick Start (5 menit)

```bash
# 1. Clone & install
cd mobile_driver
flutter pub get

# 2. Generate placeholder icons
dart run tools/generate_placeholder_icons.dart

# 3. Run di emulator
flutter run
```

## Full Setup (Production)

### Step 1: Firebase Setup

1. Buka [Firebase Console](https://console.firebase.google.com)
2. Buat project baru: `rana-driver`
3. Tambahkan Android app:
   - Package name: `com.rana.driver`
   - App nickname: `Rana Driver`
4. Download `google-services.json`
5. Letakkan di: `android/app/google-services.json`
6. Di Firebase Console > Cloud Messaging, copy Server Key
7. Tambahkan ke server `.env`:
   ```
   FCM_SERVER_KEY=your_server_key
   ```

### Step 2: Android Signing

```bash
# Generate keystore
keytool -genkey -v -keystore android/rana-driver.jks -keyalg RSA -keysize 2048 -validity 10000 -alias rana-driver
```

Buat file `android/key.properties`:
```properties
storePassword=YOUR_PASSWORD
keyPassword=YOUR_PASSWORD
keyAlias=rana-driver
storeFile=rana-driver.jks
```

### Step 3: App Icon & Splash

1. Siapkan file:
   - `assets/icon/app_icon.png` (1024x1024)
   - `assets/icon/app_icon_foreground.png` (1024x1024, transparent bg)
   - `assets/splash/splash_logo.png` (512x512)

2. Generate:
```bash
flutter pub run flutter_launcher_icons
dart run flutter_native_splash:create
```

### Step 4: Environment Variables

Saat build, gunakan dart-define:

```bash
# Development (default)
flutter run

# Staging
flutter run --dart-define=API_BASE_URL=https://staging.rana-app.com/api

# Production
flutter build apk --release --dart-define=RANA_PROD=true

# Custom server (physical device)
flutter run --dart-define=API_BASE_URL=http://192.168.1.100:4000/api
```

### Step 5: Build & Deploy

```bash
# APK untuk testing
flutter build apk --release --dart-define=RANA_PROD=true

# AAB untuk Play Store
flutter build appbundle --release --dart-define=RANA_PROD=true
```

Atau jalankan: `build_release.bat`

---

## Environment Variables Reference

| Variable | Scope | Default | Description |
|----------|-------|---------|-------------|
| `RANA_PROD` | Mobile | `false` (debug) / `true` (release) | Aktifkan mode produksi |
| `API_BASE_URL` | Mobile | Auto-detect | Override URL API server |
| `FCM_SERVER_KEY` | Server | - | Firebase Cloud Messaging key |
| `FIREBASE_PROJECT_ID` | Server | - | Firebase project ID |
| `DATABASE_URL` | Server | - | PostgreSQL connection string |
| `JWT_SECRET` | Server | - | Secret untuk JWT token |
| `PORT` | Server | 4000 | Port server |
| `ALLOWED_ORIGINS` | Server | localhost:5173,5174,5175 | CORS origins |

---

## Troubleshooting

### Firebase not working
- Pastikan `google-services.json` ada di `android/app/`
- Pastikan `build.gradle.kts` sudah include Google Services plugin
- App akan tetap berjalan tanpa Firebase (graceful fallback)

### GPS not working on emulator
- Buka Extended Controls > Location di emulator
- Set koordinat manual (Jakarta: -6.2, 106.8)

### Socket not connecting
- Pastikan server berjalan di port 4000
- Cek CORS config di server
- Untuk physical device, gunakan IP laptop (bukan localhost)

### Build error: minSdk
- minSdk sudah diset ke 23 (Android 6.0)
- Jika ada plugin yang butuh lebih tinggi, update di `android/app/build.gradle.kts`
