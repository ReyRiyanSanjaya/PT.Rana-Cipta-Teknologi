# Rana Sales - Sales Force Automation App

Aplikasi mobile untuk tim sales distributor Rana Market. Terintegrasi penuh dengan ekosistem Rana (server, distributor_client, mobile merchant).

## Fitur

- **Dashboard** — Target harian, pipeline order, revenue bulan ini, ECR
- **Kunjungan** — Plan → Check-in (GPS) → Buat Order → Check-out
- **Buat Order** — Langsung buat wholesale order saat kunjungan ke merchant
- **Merchant** — Daftar merchant dengan status Active/Warm/Cold
- **Route Plan** — Jadwal kunjungan mingguan per hari
- **Leaderboard** — Ranking performa tim sales
- **Profil** — Info akun dan logout

## Integrasi

| Komponen | Koneksi |
|----------|---------|
| Server | `GET/POST /api/distributor/sfa/*` dan `/api/distributor/sales/*` |
| Distributor Client | Data yang sama ditampilkan di web dashboard |
| Mobile Merchant | Merchant menerima notifikasi order dari sales visit |

## Setup

```bash
cd mobile_sales
flutter pub get
flutter run
```

### Konfigurasi Server
Edit `lib/config/api_config.dart`:
- Development: ubah `_localUrl` ke IP server lokal
- Production: build dengan `--dart-define=RANA_PROD=true`

### Login
Gunakan akun tim distributor (role DISTRIBUTOR) yang sudah di-invite via distributor_client → Tim & Akses.

## Arsitektur

```
lib/
├── config/         # API configuration
├── data/           # ApiService (Dio HTTP client)
├── providers/      # State management (Provider)
└── screens/        # UI screens
    ├── login_screen.dart
    ├── main_screen.dart
    ├── dashboard_screen.dart
    ├── visits_screen.dart
    ├── visit_order_screen.dart
    ├── merchants_screen.dart
    ├── leaderboard_screen.dart
    ├── route_plan_screen.dart
    └── profile_screen.dart
```

## Package Name
`com.rana.sales.rana_sales`
