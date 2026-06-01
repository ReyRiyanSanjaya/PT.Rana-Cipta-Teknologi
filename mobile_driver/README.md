# Rana Driver - Aplikasi Mitra Driver

Aplikasi mobile untuk mitra driver Rana, terintegrasi penuh dengan ekosistem Rana (Server, Admin Panel, Client App).

## Arsitektur

```
mobile_driver/
├── lib/
│   ├── config/          # API config, theme, app config
│   ├── data/            # API service (Dio HTTP client)
│   ├── providers/       # State management (Provider/ChangeNotifier)
│   ├── screens/         # UI screens
│   ├── services/        # Socket, notifications, telematics, voice
│   ├── widgets/         # Reusable widgets
│   └── main.dart        # Entry point
├── android/             # Android native config
└── pubspec.yaml         # Dependencies
```

## Fitur

- ✅ Login & Registrasi Driver (KYC dengan upload dokumen)
- ✅ Dashboard real-time dengan peta & surge zones
- ✅ Terima/tolak pesanan dengan countdown timer
- ✅ Trip execution (pickup → transit → complete)
- ✅ Navigasi ke Google Maps
- ✅ Dompet digital (saldo, riwayat, penarikan)
- ✅ Ringkasan pendapatan dengan grafik
- ✅ Papan peringkat (trip, pendapatan, rating)
- ✅ Community hub (forum driver)
- ✅ Gamifikasi (XP, level, quest)
- ✅ Crash detection (accelerometer)
- ✅ Fatigue warning (8+ jam online)
- ✅ Voice assistant (terima/tolak pesanan via suara)
- ✅ Real-time socket (order dispatch, location tracking)
- ✅ Retry mechanism (auto-retry saat koneksi putus)
- ✅ Profil & kendaraan

## Setup Development

### Prerequisites
- Flutter SDK >= 3.1.0
- Android Studio / VS Code
- Server Rana berjalan di localhost:4000

### Install
```bash
flutter pub get
```

### Run (Development)
```bash
# Emulator Android
flutter run

# Device fisik (ganti IP di lib/config/api_config.dart)
flutter run --dart-define=API_BASE_URL=http://192.168.1.XXX:4000/api
```

### Run (Web)
```bash
flutter run -d chrome
```

## Build Production

### APK (Direct Install)
```bash
flutter build apk --release --dart-define=RANA_PROD=true
```

### App Bundle (Play Store)
```bash
flutter build appbundle --release --dart-define=RANA_PROD=true
```

### Atau gunakan script:
```bash
build_release.bat
```

## Signing (Production)

1. Generate keystore:
```bash
keytool -genkey -v -keystore rana-driver.jks -keyalg RSA -keysize 2048 -validity 10000 -alias rana-driver
```

2. Buat file `android/key.properties`:
```properties
storePassword=YOUR_PASSWORD
keyPassword=YOUR_PASSWORD
keyAlias=rana-driver
storeFile=path/to/rana-driver.jks
```

## Integrasi Backend

### Endpoints yang digunakan:
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | /api/auth/login | Login driver |
| POST | /api/auth/register | Register driver + KYC |
| GET | /api/driver/profile | Profil driver |
| PUT | /api/driver/profile | Update profil |
| PUT | /api/driver/status | Toggle online/offline |
| PUT | /api/driver/location | Update GPS |
| GET | /api/driver/stats | Dashboard stats |
| GET | /api/driver/wallet | Saldo & transaksi |
| POST | /api/driver/wallet/withdraw | Penarikan saldo |
| GET | /api/driver/earnings | Ringkasan pendapatan |
| GET | /api/driver/trips | Riwayat trip |
| GET | /api/driver/active-trip | Trip aktif |
| GET | /api/driver/available-requests | Pesanan tersedia |
| POST | /api/driver/accept/:id | Terima pesanan |
| PUT | /api/driver/trip/:id/status | Update status trip |
| GET | /api/driver/leaderboard | Papan peringkat |
| GET | /api/driver/community | Forum driver |
| POST | /api/driver/community | Buat post forum |

### Socket Events:
| Event | Direction | Deskripsi |
|-------|-----------|-----------|
| new_order_driver | Server → Client | Pesanan baru masuk |
| driver_location_update | Client → Server | Update lokasi GPS |
| order_status | Server → Client | Status pesanan berubah |

## Environment Variables

Build dengan dart-define:
```bash
flutter build apk --dart-define=RANA_PROD=true --dart-define=API_BASE_URL=https://api.rana-app.com/api
```

| Variable | Default | Deskripsi |
|----------|---------|-----------|
| RANA_PROD | false (debug) / true (release) | Mode produksi |
| API_BASE_URL | (auto-detect) | Override base URL API |
