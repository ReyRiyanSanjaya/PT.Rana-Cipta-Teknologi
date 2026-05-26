# 🐸 Analisis Lengkap Source Code — Rana Market

> **Tanggal Analisis:** 7 April 2026  
> **Versi Proyek:** 1.0.0  
> **Total Sub-Project:** 7 (1 Backend + 3 Web Dashboard + 3 Mobile App)

---

## 📋 Daftar Isi

1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Arsitektur & Tech Stack](#2-arsitektur--tech-stack)
3. [Struktur Proyek (Monorepo)](#3-struktur-proyek-monorepo)
4. [Detail Setiap Sub-Project](#4-detail-setiap-sub-project)
5. [Skema Database (Prisma)](#5-skema-database-prisma)
6. [Alur & Mekanisme Kerja](#6-alur--mekanisme-kerja)
7. [Daftar Library & Versi Lengkap](#7-daftar-library--versi-lengkap)
8. [Insight & Temuan Penting](#8-insight--temuan-penting)
9. [Kelebihan](#9-kelebihan)
10. [Kekurangan & Rekomendasi](#10-kekurangan--rekomendasi)

---

## 1. Ringkasan Eksekutif

**Rana Market** adalah platform hybrid **Point of Sales (POS) + Marketplace + Ride-Hailing** yang dirancang untuk UMKM di Indonesia. Platform ini merupakan **super-app** yang mirip Gojek/Grab tetapi dibungkus dengan POS untuk para penjual.

### Fitur Utama:
| Domain | Fitur |
|--------|-------|
| **POS Kasir** | Transaksi kasir, cetak struk, manajemen shift, mode offline |
| **Inventory** | Stok real-time, varian produk, stock opname, barcode scanning |
| **Laporan** | Dashboard laba rugi, grafik penjualan, riwayat transaksi, ekspor |
| **Marketplace** | Toko online, keranjang, checkout, review & rating, favorit |
| **Wholesale/Kulakan** | B2B marketplace, pricing tier, kredit limit, diskon distributor |
| **PPOB** | Pulsa, token listrik, tagihan (integrasi Digiflazz) |
| **Ride-Hailing** | Ride, Send (kurir), Food delivery + tracking driver real-time |
| **Wallet** | Saldo digital, top-up, withdraw, transfer antar toko |
| **Flash Sale** | Promo flash sale, diskon terjadwal |
| **Referral** | Kode referral, reward otomatis |
| **Community** | Forum/komunitas, topic, post, komentar, like |
| **Chat** | Real-time chat rooms, typing indicator, online presence |
| **Blog** | Sistem blog CMS lengkap |
| **Support** | Sistem tiket support dengan live chat |
| **Notifikasi** | Push notification via WhatsApp & Socket.io |
| **Gamification** | Mini games (Snake, Tetris, Match-3, TTS) |
| **Driver App** | Registrasi driver, dashboard, navigasi, wallet driver |
| **Admin Panel** | Super admin dashboard, merchant management, monitoring |
| **Distributor** | Portal B2B untuk distributor/supplier |

---

## 2. Arsitektur & Tech Stack

### 2.1 Arsitektur Keseluruhan

```
┌─────────────────────────────────────────────────────────────────┐
│                    RANA MARKET ECOSYSTEM                         │
├──────────┬──────────┬──────────┬──────────┬──────────┬──────────┤
│ Merchant │  Admin   │Distributor│ Mobile   │ Mobile   │ Mobile   │
│ Web App  │ Web App  │ Web App  │ Seller   │ Buyer    │ Driver   │
│ (React)  │ (React)  │(React+TS)│(Flutter) │(Flutter) │(Flutter) │
│ :5173    │ :5174    │ :5175    │ Android  │ Android  │ Android  │
├──────────┴──────────┴──────────┴──────────┴──────────┴──────────┤
│                    REST API + WebSocket                          │
│                 Express.js Server (:4000)                        │
├───────────────┬────────────┬────────────┬───────────────────────┤
│ Prisma ORM    │ Socket.io  │ JWT Auth   │ External Services     │
│               │            │            │ - Digiflazz (PPOB)    │
│               │            │            │ - WhatsApp API        │
├───────────────┴────────────┴────────────┴───────────────────────┤
│                    PostgreSQL Database                           │
│                    (~45 Models/Tabel)                            │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Tech Stack Summary

| Layer | Teknologi | Versi |
|-------|-----------|-------|
| **Backend Runtime** | Node.js | — |
| **Backend Framework** | Express.js | ^4.18.2 |
| **ORM** | Prisma Client | ^5.7.0 |
| **Database** | PostgreSQL | — |
| **Realtime** | Socket.io | ^4.8.3 |
| **Auth** | JWT (jsonwebtoken) | ^9.0.2 |
| **Process Manager** | PM2 (ecosystem.config.js) | — |
| **Frontend (Merchant)** | React + Vite | React ^18.2.0, Vite ^5.4.21 |
| **Frontend (Admin)** | React + Vite | React ^19.2.0, Vite ^7.2.4 |
| **Frontend (Distributor)** | React + Vite + TypeScript | React ^18.3.1, Vite ^6.3.5 |
| **CSS Framework** | TailwindCSS | v3 (client) / v4 (admin) |
| **Mobile (Seller)** | Flutter/Dart | SDK ≥3.0.0 |
| **Mobile (Buyer)** | Flutter/Dart | SDK ≥3.1.0 |
| **Mobile (Driver)** | Flutter/Dart | SDK ≥3.1.0 |
| **State (Web)** | React Context + Zustand | Zustand ^5.0.3 (distributor) |
| **State (Mobile)** | Provider | ^6.0.5 |
| **Deployment** | Vercel (Web) + PM2 (Server) | — |

---

## 3. Struktur Proyek (Monorepo)

```
rana-main/
├── server/                 # Backend API (Node.js + Express + Prisma)
│   ├── src/
│   │   ├── index.js        # Entry point (8.4KB)
│   │   ├── socket.js       # WebSocket handler (9.9KB)
│   │   ├── controllers/    # 26 controller + 1 subfolder (admin/)
│   │   ├── routes/         # 24 route files + 1 subfolder (admin/)
│   │   ├── middleware/     # 3 middleware (auth, role, subscription)
│   │   ├── services/       # 3 services (digiflazz, whatsapp, aggregation)
│   │   ├── utils/          # 2 utility (notification, response)
│   │   └── models/         # Model helpers
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema (1095 baris, ~45 model)
│   │   ├── seed.js         # Data seeder utama
│   │   ├── seed_*.js       # 10+ file seeder khusus
│   │   └── migrations/     # Database migrations
│   ├── uploads/            # File upload storage
│   ├── ecosystem.config.js # PM2 configuration
│   └── package.json
│
├── client/                 # Dashboard Merchant (React + Vite)
│   └── src/
│       ├── pages/          # 27 halaman + subfolder admin
│       ├── components/     # 14 komponen + 6 subfolder
│       ├── context/        # React Context providers
│       ├── hooks/          # Custom hooks
│       ├── services/       # API service layer
│       └── utils/          # Utility functions
│
├── admin_client/           # Dashboard Admin (React + Vite)
│   └── src/
│       ├── pages/          # 32 halaman (no subfolder)
│       ├── components/     # UI components + Sidebar
│       └── lib/            # Utility libraries
│
├── distributor_client/     # Portal Distributor (React + Vite + TypeScript)
│   └── src/
│       ├── pages/          # 10+ halaman + auth/orders/products
│       ├── components/     # Reusable components
│       ├── api/            # API layer
│       ├── store/          # Zustand state stores
│       ├── hooks/          # Custom hooks
│       └── lib/            # Utility libraries
│
├── mobile/                 # Aplikasi Mobile Seller (Flutter)
│   └── lib/
│       ├── screens/        # 54 screen
│       ├── providers/      # Provider state management
│       ├── services/       # API + Local services
│       ├── models/         # Data models
│       ├── widgets/        # Reusable widgets
│       ├── games/          # Mini-game modules
│       ├── config/         # App configuration
│       ├── data/           # Local data layer
│       └── utils/          # Utilities
│
├── mobile_buyer/           # Aplikasi Mobile Buyer (Flutter)
│   └── lib/
│       ├── screens/        # 28 screen
│       ├── providers/      # State management
│       ├── services/       # API services
│       ├── widgets/        # Widgets
│       └── config/         # Configuration
│
├── mobile_driver/          # Aplikasi Mobile Driver (Flutter)
│   └── lib/
│       ├── screens/        # 13 screen
│       ├── providers/      # State management
│       ├── services/       # API services
│       └── widgets/        # Widgets
│
├── docs/                   # Dokumentasi HTML
├── start_all.bat           # Launcher semua service
├── start_server.bat        # Launcher server saja
├── seed_db.bat             # Seeder database
├── build_apk.bat           # Build APK Android
├── update_db.bat           # Update schema DB
└── README.md               # Dokumentasi utama
```

---

## 4. Detail Setiap Sub-Project

### 4.1 Server (Backend API)

**Entry Point:** `server/src/index.js`  
**Port:** 4000  

#### Middleware Pipeline:
1. **CORS** — Mengizinkan semua origin secara dinamis
2. **Helmet** — Security HTTP headers (crossOriginResourcePolicy dimatikan)
3. **Compression** — Gzip untuk semua response
4. **Rate Limiting** — 3000 request per 15 menit per IP
5. **Body Parser** — JSON & URL-encoded, limit 50MB (untuk upload Base64)
6. **Morgan** — HTTP request logging (mode dev)
7. **Static Files** — Serving `/uploads` directory

#### API Routes (24 endpoint groups):

| Route | Controller | Fungsi |
|-------|-----------|--------|
| `/api/auth` | authController | Login, Register, Token |
| `/api/reports` | reportController (44KB) | Laporan penjualan, laba rugi |
| `/api/transactions` | transactionController | CRUD transaksi POS |
| `/api/products` | productController (20KB) | Manajemen produk |
| `/api/subscriptions` | subscriptionController | Langganan & paket |
| `/api/purchases` | purchaseController | Pembelian/kulakan |
| `/api/orders` | merchantOrderController | Order management merchant |
| `/api/market` | marketController (19KB) | API publik marketplace |
| `/api/system` | systemController (26KB) | System settings & monitoring |
| `/api/admin` | adminController (85KB!) | Super admin operations |
| `/api/wallet` | walletController (10KB) | Wallet digital |
| `/api/inventory` | inventoryController | Manajemen stok |
| `/api/tickets` | merchantTicketController | Tiket support |
| `/api/wholesale` | wholesaleController (25KB) | B2B wholesale |
| `/api/distributor` | distributorController (20KB) | Portal distributor |
| `/api/ppob` | ppobController (26KB) | Produk digital (PPOB) |
| `/api/blog` | blogController | Blog CMS |
| `/api/referral` | referralController | Sistem referral |
| `/api/community` | communityController | Forum komunitas |
| `/api/chat` | chatController | Real-time chat |
| `/api/contact` | contact | Contact form |
| `/api/careers` | careers | Lowongan kerja |
| `/api/driver` | driverController | API driver |
| `/api/service-requests` | serviceRequestController | Ride/Send/Food |

#### Middleware Authentication:
- **JWT Bearer Token** — Verifikasi via `authorization` header
- **Role-Based Access** — `role.js` middleware memfilter berdasarkan UserRole
- **Subscription Check** — Memblokir aksi write jika langganan expired; GET (read-only) tetap diizinkan

#### WebSocket (Socket.io) Architecture:
- **Authentication** — JWT-based, mendukung koneksi guest
- **Room System:**
  - `tenant:{id}` — Semua user dalam satu tenant
  - `store:{id}` — Staff di satu toko
  - `order:{id}` — Tracking pesanan real-time
  - `driver_zone` — Semua driver online
  - `admin:super` — Notifikasi admin
  - `chat:{roomId}` — Chat rooms
  - `public` — Guest/public data
- **Events:** Typing indicator, pesan baru, driver location update, online presence

#### External Services:
1. **Digiflazz** (`digiflazzService.js`) — Penyedia PPOB (pulsa, token listrik, dsb)
2. **WhatsApp** (`whatsappService.js`) — Notifikasi ke merchant via WhatsApp
3. **Aggregation** (`aggregationService.js`) — Agregasi data penjualan harian

#### Auto-Seed & Maintenance:
- Auto-seed blog posts jika kosong
- Auto-seed Super Admin jika belum ada
- Auto-cleanup chat messages (>24 jam) setiap jam

### 4.2 Client — Dashboard Merchant

**Framework:** React 18 + Vite 5  
**CSS:** TailwindCSS 3  
**Port:** 5173  

#### Halaman (27 pages):
| Halaman | Ukuran | Fungsi |
|---------|--------|--------|
| Landing.jsx | 42KB | Landing page publik |
| Dashboard.jsx | 36KB | Dashboard utama merchant |
| POSMode.jsx | 45KB | Kasir/POS mode |
| Inventory.jsx | 65KB | Manajemen stok |
| Reports.jsx | 42KB | Laporan penjualan |
| ProfitLoss.jsx | 41KB | Laporan laba rugi |
| Transactions.jsx | 21KB | Riwayat transaksi |
| Wallet.jsx | 33KB | Saldo digital |
| Subscription.jsx | 33KB | Manajemen langganan |
| FlashSales.jsx | 35KB | Promo flash sale |
| Features.jsx | 77KB! | Showcase fitur |
| Settings.jsx | 18KB | Pengaturan toko |
| Stores.jsx | 17KB | Manajemen cabang |
| Support.jsx | 23KB | Tiket support |
| Community.jsx | 31KB | Forum komunitas |
| Contact.jsx | 17KB | Halaman contact |
| Careers.jsx | 56KB | Lowongan kerja |
| Blog*.jsx | ~12KB | Blog list & detail |
| Register/Login | ~21KB | Autentikasi |

#### Komponen Canggih:
- **3D Components** — Menggunakan React Three Fiber + Drei  
- **AI Assistant** — Komponen asisten AI (21KB)
- **Live Dashboard Preview** — Preview dashboard real-time  
- **Magnetic Button** — Efek interaktif magnet  
- **Merchant Growth Map** — Peta pertumbuhan merchant  
- **Trusted By Leaders** — Social proof section  
- **Typewriter Text** — Efek animasi teks  

### 4.3 Admin Client — Dashboard Super Admin

**Framework:** React 19 + Vite 7 (terbaru!)  
**CSS:** TailwindCSS 4  
**Port:** 5174  

#### Halaman (32 pages):

| Halaman | Ukuran | Fungsi |
|---------|--------|--------|
| Dashboard.jsx | 12KB | Dashboard admin |
| Merchants.jsx | 28KB | Daftar merchant |
| MerchantDetail.jsx | 29KB | Detail merchant |
| Reports.jsx | 42KB | Laporan platform |
| Transactions.jsx | 32KB | Transaksi platform |
| Settings.jsx | 45KB | Konfigurasi sistem |
| Support.jsx | 32KB | Tiket support |
| Kulakan.jsx | 54KB | Manajemen wholesale |
| ContentManager.jsx | 59KB! | CMS konten |
| ChatRooms.jsx | 48KB | Manajemen chat |
| ReferralMonitoring.jsx | 30KB | Monitor referral |
| BlogManager.jsx | 25KB | Blog CMS |
| CareersAdmin.jsx | 28KB | Manajemen karir |
| AppMenus.jsx | 32KB | Manajemen menu app |
| AcquisitionMap.jsx | 20KB | Peta akuisisi (Leaflet) |
| AdminUsers.jsx | 17KB | Manajemen user |
| Announcements.jsx | 9KB | Pengumuman global |
| AuditLogs.jsx | 8KB | Log audit |
| Broadcasts.jsx | 11KB | Broadcast messages |
| SubscriptionRequests.jsx | 20KB | Persetujuan langganan |
| Withdrawals.jsx | 13KB | Persetujuan penarikan |
| TopUps.jsx | 13KB | Persetujuan top-up |
| Packages.jsx | 7KB | Paket langganan |
| Profile.jsx | 15KB | Profil admin |

#### Library Tambahan:
- **Leaflet + React-Leaflet** — Peta interaktif merchant
- **Radix UI** — Komponen UI (Avatar, Collapsible, Dropdown, dll)
- **QRCode.react** — Generator QR code
- **React-to-Print** — Cetak langsung dari browser
- **React-Quill-New** — Rich text editor

### 4.4 Distributor Client — Portal Distributor

**Framework:** React 18 + Vite 6 + **TypeScript**  
**CSS:** TailwindCSS 3  
**State Management:** **Zustand** ^5.0.3  
**Port:** 5175  

#### Halaman:
- Dashboard, Inventory, Products, Orders, Merchants, Reports, Discounts, Shipments, Settings
- Auth (Login/Register)

#### Keunikan:
- Satu-satunya web client yang menggunakan **TypeScript**
- Menggunakan **Zustand** untuk state management (lebih modern dari Context)
- Menggunakan **React Three Fiber** untuk elemen 3D
- Menggunakan **date-fns** untuk utility tanggal (ringan)

### 4.5 Mobile Seller — Flutter App (54 Screens!)

**Package Name:** `rana_merchant`  
**Deskripsi:** Aplikasi Kelola Toko & Pesanan UMKM

#### Screen Terbesar (by file size):
| Screen | Ukuran | Fungsi |
|--------|--------|--------|
| report_screen.dart | **222KB** | Laporan komprehensif |
| home_screen.dart | **180KB** | Dashboard utama |
| promo_hub_screen.dart | **110KB** | Hub promo & marketing |
| flash_sales_screen.dart | 66KB | Flash sale management |
| settings_screen.dart | 64KB | Pengaturan |
| wallet_screen.dart | 62KB | Wallet digital |
| marketing_screen.dart | 62KB | Tools marketing |
| purchase_screen.dart | 47KB | Pembelian/kulakan |
| stock_opname_screen.dart | 47KB | Stock opname |
| register_screen.dart | 46KB | Registrasi |
| pos_screen.dart | 41KB | Mode kasir POS |
| debt_screen.dart | 40KB | Manajemen hutang |
| ppob_screen.dart | 35KB | PPOB/produk digital |
| tts_game_screen.dart | 36KB | Game TTS (Teka-teki Silang) |

#### Fitur Mobile Eksklusif:
- **Bluetooth Thermal Printer** — Cetak struk via Bluetooth
- **Barcode/QR Scanner** — Mobile Scanner + Barcode generator
- **OCR Receipt Scan** — Google ML Kit Text Recognition
- **Speech to Text** — Kontrol suara
- **Text to Speech** — Baca hasil laporan
- **Offline-First** — SQLite (sqflite) + background sync (workmanager)
- **Geolocation** — Geolocator + OpenStreetMap (flutter_map)
- **Digital Signage** — Mode display digital untuk toko
- **Mini Games** — Snake, Tetris, Match-3, TTS (gamification)
- **Lottie Animations** — Animasi premium
- **Biometric Auth** — Login via fingerprint/face (local_auth)
- **Wakelock** — Screen tetap aktif saat di POS mode
- **PDF Export** — Generate laporan PDF
- **Confetti** — Efek celebrasi
- **Shimmer** — Loading skeleton

### 4.6 Mobile Buyer — Flutter App (28 Screens)

**Package Name:** `rana_market`  
**Deskripsi:** Aplikasi Pesan Antar Makanan & Belanja UMKM

#### Screen Utama:
| Screen | Ukuran | Fungsi |
|--------|--------|--------|
| market_home_screen.dart | **105KB** | Home marketplace |
| market_cart_screen.dart | 65KB | Keranjang belanja |
| product_detail_screen.dart | 45KB | Detail produk |
| ai_assistant_screen.dart | 45KB | Asisten AI |
| order_detail_screen.dart | 41KB | Detail pesanan |
| ppob_screen.dart | 37KB | PPOB untuk pembeli |
| store_detail_screen.dart | 34KB | Detail toko |
| profile_screen.dart | 26KB | Profil user |
| orders_screen.dart | 24KB | Daftar pesanan |
| market_search_screen.dart | 23KB | Pencarian produk |
| ride_booking_screen.dart | 21KB | Pesan ride/kurir |
| ride_order_tracking_screen.dart | 20KB | Tracking driver |
| map_explore_screen.dart | 17KB | Eksplorasi peta |
| ar_explore_screen.dart | 15KB | AR Explore |

#### Fitur Buyer Eksklusif:
- **AR Explore** — Augmented Reality untuk menjelajah toko
- **AI Assistant** — Asisten AI untuk rekomendasi
- **QR Scanner** — Scan QR code toko
- **Ride Booking + Tracking** — Pesan ojek/kurir + live tracking
- **Cached Network Image** — Optimisasi gambar
- **Hive** — Local storage cepat
- **Speech to Text / Compass / Sensors** — Fitur device native
- **Vibration** — Haptic feedback

### 4.7 Mobile Driver — Flutter App (13 Screens)

**Package Name:** `mobile_driver`  
**Deskripsi:** Aplikasi Driver

#### Screen:
| Screen | Ukuran | Fungsi |
|--------|--------|--------|
| driver_dashboard_screen.dart | 34KB | Dashboard driver |
| driver_registration_screen.dart | 24KB | Registrasi driver |
| driver_trip_execution_screen.dart | 21KB | Eksekusi trip |
| driver_wallet_screen.dart | 12KB | Wallet driver |
| earnings_summary_screen.dart | 8KB | Ringkasan pendapatan |
| login_screen.dart | 8KB | Login |
| profile_screen.dart | 7KB | Profil |
| community_hub_screen.dart | 5KB | Komunitas driver |
| liveness_verification_screen.dart | 4KB | Verifikasi wajah |
| set_destination_screen.dart | 2KB | Set destinasi |

#### Fitur Driver Eksklusif:
- **Mapbox Navigation** — Turn-by-turn navigation
- **Real-time Location** — GPS tracking ke buyer/merchant
- **Image Picker** — Upload dokumen KTP/SIM/STNK
- **Carousel Slider** — Promo display
- **Liveness Verification** — KYC driver

---

## 5. Skema Database (Prisma)

### Total: ~45 Model, 1095 baris

### Domain Model Groups:

#### 🏢 Core Tenancy & IAM (Multi-tenant)
| Model | Fungsi |
|-------|--------|
| `Tenant` | Organisasi/bisnis (multi-tenant) |
| `User` | User dengan role (OWNER, ADMIN, STORE_MANAGER, CASHIER, SUPER_ADMIN, DISTRIBUTOR) |
| `Store` | Cabang toko (dengan geolokasi, wallet balance) |
| `LoginHistory` | Riwayat login |
| `SystemSettings` | Konfigurasi sistem key-value |

#### 📦 Products & Inventory
| Model | Fungsi |
|-------|--------|
| `Product` | Produk (SKU, barcode, harga, stok, rating) |
| `Category` | Kategori produk per tenant |
| `Stock` | Stok per toko per produk |
| `InventoryLog` | Log perubahan stok (IN/OUT/ADJUSTMENT) |
| `Review` | Review produk |
| `Favorite` | Favorit user |

#### 💰 Transactions & Finance
| Model | Fungsi |
|-------|--------|
| `Transaction` | Transaksi POS (offline idempotency, multi-payment) |
| `TransactionItem` | Item dalam transaksi (snapshot harga) |
| `CashflowLog` | Log arus kas (IN/OUT) |
| `DebtRecord` | Hutang pelanggan |
| `Purchase` / `PurchaseItem` | Pembelian dari supplier |
| `Supplier` | Data supplier |

#### 💳 Wallet & Subscription
| Model | Fungsi |
|-------|--------|
| `WalletTransfer` | Transfer antar toko |
| `Withdrawal` | Penarikan saldo |
| `TopUpRequest` | Top-up saldo |
| `SubscriptionPackage` | Paket langganan |
| `SubscriptionRequest` | Permintaan upgrade |

#### 🛒 B2B Wholesale
| Model | Fungsi |
|-------|--------|
| `Distributor` | Profil distributor (KYC, balance) |
| `Warehouse` | Gudang distributor |
| `WholesaleProduct` | Produk wholesale (pricing tiers) |
| `WholesaleCategory` | Kategori wholesale |
| `WholesaleOrder` / `OrderItem` | Order wholesale |
| `WholesaleDiscount` | Diskon wholesale |
| `DistributorCustomer` | Relasi distributor-tenant (kredit limit) |

#### 📱 PPOB & Digital
| Model | Fungsi |
|-------|--------|
| `PpobTransaction` | Transaksi produk digital |

#### 🗣️ Community & Chat
| Model | Fungsi |
|-------|--------|
| `ChatRoom` / `ChatMessage` / `ChatMember` | Sistem chat |
| `CommunityTopic` / `CommunityPost` | Forum komunitas |
| `CommunityComment` / `CommunityPostLike` | Interaksi komunitas |

#### 🏷️ Marketing & Promo
| Model | Fungsi |
|-------|--------|
| `FlashSale` / `FlashSaleItem` | Flash sale |
| `ReferralCode` / `Referral` / `ReferralReward` | Sistem referral |
| `Announcement` | Pengumuman global |

#### 🎫 Support & Content
| Model | Fungsi |
|-------|--------|
| `SupportTicket` / `TicketMessage` | Tiket support |
| `Notification` | Notifikasi per tenant |
| `BlogPost` | Artikel blog |
| `ContactMessage` | Pesan kontak |
| `JobApplication` | Lamaran kerja |

#### 🚗 Driver & Ride-Hailing
| Model | Fungsi |
|-------|--------|
| `Driver` | Profil driver (KYC lengkap, rating, lokasi) |
| `ServiceRequest` | Request RIDE/SEND/FOOD |

### Enum Types (18):
`SubscriptionPlan` (FREE/BASIC/PREMIUM/ENTERPRISE), `SubscriptionStatus`, `UserRole` (6 role), `ApprovalStatus`, `TransactionStatus`, `PaymentStatus`, `DebtStatus`, `WithdrawalStatus`, `TopUpStatus`, `TicketStatus`, `PpobStatus`, `DiscountType`, `WholesaleOrderStatus`, `CashType`, `DriverStatus`, `ServiceType` (RIDE/SEND/FOOD), `ServiceStatus`, `ReferralStatus`, `ApplicationStatus`

---

## 6. Alur & Mekanisme Kerja

### 6.1 Alur Registrasi & Multi-Tenancy

```
1. User Register → POST /api/auth/register
2. Server buat Tenant baru + User sebagai OWNER
3. Trial 7 hari dimulai otomatis
4. User bisa tambah Store → setiap Tenant bisa punya multi-cabang
5. User bisa tambah karyawan (CASHIER, STORE_MANAGER)
6. Setelah trial habis → aksi Write diblokir → user harus subscribe
```

### 6.2 Alur Transaksi POS (Offline-First)

```
1. Kasir buka POS Mode (mobile/web)
2. Scan barcode ATAU pilih produk manual
3. Tambah ke keranjang → hitung subtotal, tax, diskon
4. Pilih metode bayar (CASH/QRIS/Transfer)
5. Proses pembayaran → hitung kembalian
6. Transaksi disimpan lokal (SQLite) → offlineId untuk idempotency
7. Background sync ke server → POST /api/transactions
8. Server: kurangi stok, catat CashflowLog, update DailySalesSummary
9. Socket.io emit ke room tenant → update dashboard real-time
10. Cetak struk via Bluetooth thermal printer (mobile) atau browser print
```

### 6.3 Alur Marketplace (Buyer → Merchant → Driver)

```
1. Buyer buka app → lihat toko terdekat (geolokasi)
2. Pilih toko → lihat produk → tambah ke keranjang
3. Checkout → pilih RIDE/SEND/FOOD → set alamat
4. ServiceRequest dibuat → status: SEARCHING
5. Socket.io broadcast ke driver_zone
6. Driver accept → status: ACCEPTED
7. Driver menuju merchant → status: ARRIVED (pickup)
8. Driver mengambil barang → status: IN_TRANSIT
9. Socket.io emit driver_location_update ke room order:{id}
10. Buyer melihat driver di peta real-time
11. Barang diantar → status: COMPLETED
12. Rating & Review
```

### 6.4 Alur Wholesale/Kulakan (B2B)

```
1. Distributor daftar → approval oleh Super Admin
2. Upload produk wholesale → set pricing tiers (minQty → harga)
3. Merchant browse katalog wholesale
4. Pilih produk → cek MOQ → tambah ke keranjang
5. Checkout → pilih alamat + metode bayar
6. Order status: PENDING → PAID → PROCESSING → SHIPPED → DELIVERED
7. Distributor bisa set credit limit & payment term per merchant
```

### 6.5 Alur PPOB (Integrasi Digiflazz)

```
1. Merchant masuk menu PPOB
2. Pilih kategori (Pulsa, Token Listrik, Paket Data, dll)
3. Input nomor pelanggan + pilih nominal
4. Server kirim request ke Digiflazz API
5. PpobTransaction dibuat → status: PENDING
6. Callback/polling dari Digiflazz → status: SUCCESS/FAILED
7. SN (Serial Number) dikirim ke pelanggan
8. Selisih harga beli-jual → profit merchant
```

### 6.6 Alur Autentikasi & Otorisasi

```
1. Login → POST /api/auth/login → bcrypt verify password
2. Server generate JWT token → payload: {userId, tenantId, storeId, role}
3. Client simpan token → kirim di header: Authorization: Bearer <token>
4. Middleware auth.js → verify token → inject req.user
5. Middleware role.js → check role apakah diizinkan
6. Middleware subscription.js → check tenant subscription status
7. WebSocket → token dikirim via handshake.auth.token
```

### 6.7 Alur Real-time (WebSocket)

```
Server Setup:
1. HTTP Server dibuat → Socket.io attach
2. Auth middleware → verify JWT atau izinkan Guest

Client Connection:
1. Connect dengan token → join room berdasarkan role
2. Events:
   - transaction_created → update dashboard real-time
   - new_order → notif ke merchant
   - order_status_update → update buyer
   - driver_moved → tracking di peta
   - new_message → chat/ticket real-time
   - typing → indicator ketik
   - chat:online_members → daftar user online
```

---

## 7. Daftar Library & Versi Lengkap

### 7.1 Server (Node.js)

| Library | Versi | Fungsi |
|---------|-------|--------|
| `@prisma/client` | ^5.7.0 | ORM Client |
| `prisma` (dev) | ^5.7.0 | Schema tooling |
| `express` | ^4.18.2 | Web framework |
| `bcrypt` | ^5.1.1 | Password hashing |
| `jsonwebtoken` | ^9.0.2 | JWT token |
| `cors` | ^2.8.5 | Cross-origin support |
| `helmet` | ^7.1.0 | Security headers |
| `compression` | ^1.8.1 | Gzip response |
| `express-rate-limit` | ^6.11.2 | Rate limiting |
| `morgan` | ^1.10.0 | HTTP logging |
| `multer` | ^2.0.2 | File upload |
| `pg` | ^8.11.3 | PostgreSQL driver |
| `socket.io` | ^4.8.3 | WebSocket server |
| `dotenv` | ^16.3.1 | Environment variables |
| `nodemon` (dev) | ^3.0.2 | Auto-restart |

### 7.2 Client — Merchant Web

| Library | Versi | Fungsi |
|---------|-------|--------|
| `react` | ^18.2.0 | UI Framework |
| `react-dom` | ^18.2.0 | DOM rendering |
| `react-router-dom` | ^6.20.1 | Routing |
| `axios` | ^1.6.2 | HTTP client |
| `socket.io-client` | ^4.8.3 | WebSocket client |
| `recharts` | ^2.10.3 | Grafik/chart |
| `framer-motion` | ^12.25.0 | Animasi |
| `gsap` | ^3.14.2 | Animasi advanced |
| `@react-three/fiber` | 8.16.8 | 3D rendering |
| `@react-three/drei` | 9.108.3 | 3D helper components |
| `three` | 0.165.0 | 3D engine |
| `lucide-react` | ^0.294.0 | Icon library |
| `react-quill` | ^2.0.0 | Rich text editor |
| `react-markdown` | ^10.1.0 | Markdown renderer |
| `dompurify` | ^3.3.1 | XSS sanitizer |
| `emoji-picker-react` | ^4.17.2 | Emoji picker |
| `vite` (dev) | ^5.4.21 | Build tool |
| `tailwindcss` (dev) | ^3.3.5 | CSS framework |

### 7.3 Admin Client

| Library | Versi | Fungsi |
|---------|-------|--------|
| `react` | ^19.2.0 | UI Framework (terbaru!) |
| `react-router-dom` | ^7.11.0 | Routing (terbaru!) |
| `axios` | ^1.13.2 | HTTP client |
| `leaflet` | ^1.9.4 | Peta |
| `react-leaflet` | ^5.0.0 | Peta React |
| `qrcode.react` | ^4.2.0 | QR code generator |
| `react-to-print` | ^3.2.0 | Print dari browser |
| `react-quill-new` | ^3.7.0 | Rich text editor |
| `sweetalert2` | ^11.14.5 | Alert dialog |
| `recharts` | ^3.6.0 | Charts |
| `framer-motion` | ^12.29.2 | Animasi |
| `lucide-react` | ^0.562.0 | Icons |
| `@radix-ui/*` | various | UI primitives |
| `class-variance-authority` | ^0.7.1 | Variant styling |
| `clsx` | ^2.1.1 | Class merge |
| `tailwind-merge` | ^3.4.0 | Tailwind class merge |
| `vite` (dev) | ^7.2.4 | Build tool (terbaru!) |
| `tailwindcss` (dev) | ^4.1.18 | CSS framework (v4!) |

### 7.4 Distributor Client

| Library | Versi | Fungsi |
|---------|-------|--------|
| `react` | ^18.3.1 | UI Framework |
| `react-router-dom` | ^7.3.0 | Routing |
| `zustand` | ^5.0.3 | State management |
| `axios` | ^1.13.4 | HTTP client |
| `date-fns` | ^4.1.0 | Tanggal utility |
| `recharts` | ^3.7.0 | Charts |
| `framer-motion` | ^12.29.2 | Animasi |
| `@react-three/fiber` | ^8.16.0 | 3D |
| `three` | ^0.182.0 | 3D engine |
| `typescript` (dev) | ~5.8.3 | Type checking |
| `vite` (dev) | ^6.3.5 | Build tool |

### 7.5 Mobile Seller (Flutter)

| Library | Versi | Fungsi |
|---------|-------|--------|
| `provider` | ^6.0.5 | State management |
| `dio` | ^5.3.3 | HTTP client |
| `sqflite` | ^2.3.0 | SQLite (offline) |
| `shared_preferences` | ^2.5.4 | Key-value storage |
| `google_fonts` | ^6.1.0 | Tipografi |
| `intl` | ^0.20.2 | Internationalization |
| `fl_chart` | ^0.68.0 | Charts |
| `mobile_scanner` | ^3.5.0 | QR/Barcode scan |
| `image_picker` | ^1.2.1 | Ambil foto |
| `blue_thermal_printer` | ^1.2.3 | Cetak struk |
| `permission_handler` | ^11.0.1 | Permission |
| `screenshot` | ^3.0.0 | Screenshot |
| `share_plus` | ^7.1.0 | Share file |
| `barcode` | ^2.2.4 | Barcode generator |
| `workmanager` | ^0.7.0 | Background sync |
| `uuid` | ^4.2.1 | UUID generator |
| `geolocator` | ^10.1.0 | GPS |
| `flutter_map` | ^8.0.0 | OpenStreetMap |
| `flutter_animate` | ^4.5.2 | Animasi |
| `lottie` | ^3.1.0 | Lottie animation |
| `socket_io_client` | ^3.1.3 | WebSocket |
| `flutter_local_notifications` | ^17.0.0 | Notifikasi lokal |
| `flame` | ^1.11.0 | Game engine |
| `speech_to_text` | ^7.3.0 | Voice input |
| `local_auth` | ^3.0.1 | Biometric |
| `pdf` | ^3.11.3 | PDF generator |
| `google_mlkit_text_recognition` | ^0.15.1 | OCR |
| `flutter_blue_plus` | ^2.2.1 | Bluetooth |
| `confetti` | ^0.8.0 | Celebration effect |
| `shimmer` | ^3.0.0 | Loading skeleton |
| `flutter_tts` | ^4.2.5 | Text to speech |

### 7.6 Mobile Buyer (Flutter)

| Library | Versi | Fungsi |
|---------|-------|--------|
| `provider` | ^6.0.5 | State management |
| `dio` | ^5.3.2 | HTTP client |
| `cached_network_image` | ^3.3.0 | Caching gambar |
| `geolocator` | ^10.1.0 | GPS |
| `flutter_map` | ^6.0.0 | Peta |
| `qr_flutter` | ^4.1.0 | QR code display |
| `socket_io_client` | ^2.0.3 | WebSocket |
| `hive` / `hive_flutter` | ^2.2.3 | Fast local storage |
| `speech_to_text` | ^7.3.0 | Voice |
| `vibration` | ^2.0.1 | Haptic |
| `mobile_scanner` | ^5.2.3 | QR scan |
| `camera` | ^0.10.5 | Kamera |
| `sensors_plus` | ^4.0.0 | Sensor device |
| `fl_chart` | ^0.66.2 | Charts |

### 7.7 Mobile Driver (Flutter)

| Library | Versi | Fungsi |
|---------|-------|--------|
| `flutter_mapbox_navigation` | ^0.1.5 | Turn-by-turn navigation |
| `image_picker` | ^1.0.7 | Upload dokumen |
| `carousel_slider` | ^5.1.1 | Carousel UI |
| + semua lib yang sama dengan buyer | | |

---

## 8. Insight & Temuan Penting

### 8.1 Skala Proyek
- **Total file source code:** ~200+ files
- **Total size kode signifikan:** ~3MB+ (tanpa node_modules/pubspec.lock)
- **Screen terbesar:** `report_screen.dart` pada mobile seller = **222KB** dalam SATU file! Ini sangat besar dan menunjukkan kurangnya modularisasi.
- **Controller terbesar:** `adminController.js` = **85KB** — satu file menangani SEMUA operasi admin.

### 8.2 Arsitektur Multi-Tenant
- Setiap `Tenant` bisa memiliki banyak `Store`, `User`, `Product`
- Isolasi data dilakukan di level query (filter by `tenantId`)
- Tidak menggunakan Row-Level Security (RLS) di database level
- JWT payload membawa `tenantId` + `storeId` + `role`

### 8.3 Perbedaan Versi Antar Sub-Project
Terdapat inkonsistensi versi yang signifikan:
- React: v18 (merchant & distributor) vs v19 (admin)
- Vite: v5 (merchant), v6 (distributor), v7 (admin)
- TailwindCSS: v3 (merchant & distributor), v4 (admin)
- socket.io-client: v4.8.3 (merchant & admin) vs v2.0.3 (buyer mobile)

### 8.4 Offline-First Strategy (Mobile Seller)
- **SQLite** (`sqflite`) untuk data lokal
- **Background sync** via `workmanager`
- `offlineId` pada `Transaction` model untuk idempotency (prevent duplikasi saat sync)
- Pattern: write ke lokal → background sync → server reconcile

### 8.5 Gamification
Platform menyertakan mini-games di mobile seller:
- Snake Game, Tetris, Match-3, TTS (Teka-Teki Silang)
- Menggunakan **Flame** game engine
- Strategi engagement untuk merchant agar sering buka app

---

## 9. Kelebihan

### ✅ 1. Ekosistem Lengkap (Super-App)
Platform mencakup seluruh lifecycle bisnis UMKM: POS kasir, inventori, marketplace, wholesale, PPOB, ride-hailing, wallet digital, komunitas, blog, dan support. Sangat jarang ada platform yang mencakup semua ini dalam satu codebase.

### ✅ 2. Multi-Tenant Architecture
Arsitektur multi-tenant memungkinkan satu instance server melayani banyak bisnis berbeda dengan isolasi data. Ini efisien untuk SaaS model.

### ✅ 3. Offline-First Mobile
Strategi offline-first pada mobile seller sangat tepat untuk pasar UMKM Indonesia yang sering memiliki koneksi internet tidak stabil. Menggunakan SQLite + WorkManager + offlineId idempotency.

### ✅ 4. Real-time Communication
Socket.io diimplementasikan dengan baik: room-based architecture, typing indicators, online presence tracking, dan driver location broadcasting.

### ✅ 5. Script Otomatisasi (.bat)
Tersedia berbagai script `.bat` untuk setup, seed, update DB, build APK — mempermudah developer baru memulai proyek.

### ✅ 6. Subscription Gating
Middleware subscription yang memblokir write access saat trial habis sambil tetap mengizinkan read access — UX yang baik untuk konversi ke paid.

### ✅ 7. UI/UX Modern
Penggunaan Framer Motion, GSAP, Three.js, Lottie, dan Radix UI menunjukkan fokus pada pengalaman pengguna yang premium.

### ✅ 8. Dokumentasi & Setup
Dokumentasi setup yang detail dalam bahasa Indonesia (SETUP_LOCALHOST.md), troubleshooting table, dan docs HTML terpisah.

### ✅ 9. Comprehensive Seed Data
10+ file seeder untuk berbagai skenario (demo, production, testing) — mempermudah development dan demo.

### ✅ 10. PM2 Production Setup
Konfigurasi PM2 dengan cluster mode, max memory restart, dan environment separation (dev/prod).

---

## 10. Kekurangan & Rekomendasi

### ❌ 1. File Terlalu Besar (God Files)
**Masalah:** Banyak file yang sangat besar tanpa pemecahan:
- `adminController.js` = 85KB (satu file untuk SEMUA admin logic)
- `report_screen.dart` = 222KB (satu file untuk SEMUA laporan)
- `home_screen.dart` = 180KB
- `Features.jsx` = 77KB

**Rekomendasi:** Pecah menjadi modul/komponen kecil. Contoh: `adminController.js` → `admin/merchantController.js`, `admin/subscriptionController.js`, dll.

### ❌ 2. Inkonsistensi Versi Library
**Masalah:** Setiap sub-project menggunakan versi library yang berbeda-beda secara signifikan:
- React 18 vs 19
- Vite 5 vs 6 vs 7
- Tailwind 3 vs 4

**Rekomendasi:** Standardisasi versi antar sub-project. Gunakan workspace manager (npm workspaces atau turborepo) untuk konsistensi.

### ❌ 3. Tidak Ada Testing
**Masalah:** Tidak ditemukan unit test, integration test, atau e2e test yang terstruktur. File `test_*.js` yang ada adalah script debugging ad-hoc, bukan testing framework.

**Rekomendasi:** Implementasikan Jest untuk server, React Testing Library untuk web, dan Flutter test untuk mobile.

### ❌ 4. Keamanan JWT Hardcoded
**Masalah:** JWT secret memiliki fallback hardcoded:
```js
process.env.JWT_SECRET || 'super_secret_key_change_in_prod'
```
Jika `.env` tidak di-set, semua environment menggunakan secret yang sama.

**Rekomendasi:** Hapus fallback value, paksa konfigurasi via environment variable. Crash saat startup jika tidak ada.

### ❌ 5. Tidak Ada Input Validation
**Masalah:** Tidak ditemukan library validasi (seperti Joi, Zod, atau express-validator). Validasi input tampaknya dilakukan secara manual (atau tidak sama sekali) di tiap controller.

**Rekomendasi:** Implementasikan library validasi centralized. Zod recommended karena bisa share schema antara frontend dan backend.

### ❌ 6. CORS Terlalu Terbuka
**Masalah:** `cors({ origin: true })` mengizinkan semua origin. Socket.io juga `origin: "*"`. Ini risiko keamanan di production.

**Rekomendasi:** Whitelist domain yang diizinkan berdasarkan environment.

### ❌ 7. Database Multi-Tenancy Tanpa RLS
**Masalah:** Isolasi data tenant hanya dilakukan di level aplikasi (query filter), bukan di database level. Jika ada bug di controller, data tenant lain bisa bocor.

**Rekomendasi:** Implementasikan PostgreSQL Row-Level Security atau gunakan middleware yang otomatis inject tenant filter.

### ❌ 8. Tidak Ada Logging Terstruktur
**Masalah:** Hanya menggunakan `console.log`/`console.error` dan Morgan. Tidak ada structured logging (JSON format, log levels, correlation IDs).

**Rekomendasi:** Gunakan Winston atau Pino untuk structured logging.

### ❌ 9. Monorepo Tanpa Tooling
**Masalah:** Proyek berbentuk monorepo tetapi tidak menggunakan workspace tooling (npm workspaces, Turborepo, Nx). Setiap sub-project di-install dan build secara independen.

**Rekomendasi:** Adopsi npm workspaces atau Turborepo untuk dependency management dan build pipeline yang lebih efisien.

### ❌ 10. Multiple PrismaClient Instances
**Masalah:** `new PrismaClient()` dipanggil di beberapa tempat berbeda (index.js, socket.js, middleware/subscription.js), potensi connection pool exhaustion.

**Rekomendasi:** Gunakan singleton pattern — satu instance PrismaClient yang di-share.

### ❌ 11. Rate Limit Terlalu Tinggi
**Masalah:** 3000 request per 15 menit per IP = 200 request/menit. Ini sudah tinggi dan mungkin tidak cukup protektif untuk endpoint sensitif.

**Rekomendasi:** Implementasikan rate limit per-route (lebih ketat untuk auth endpoint).

### ❌ 12. Mount Route Duplikat
**Masalah:** Di `index.js`, `/api/products` di-mount DUA KALI (baris 64 dan 73), yang bisa menyebabkan konflik routing.

**Rekomendasi:** Hapus salah satu duplikat.

### ❌ 13. Tidak Ada Caching
**Masalah:** Tidak ditemukan implementasi caching (Redis, in-memory cache). Semua request langsung ke database.

**Rekomendasi:** Implementasikan Redis untuk caching data yang sering diakses (produk populer, konfigurasi sistem).

### ❌ 14. Chat Retention Terlalu Agresif
**Masalah:** Chat messages dihapus otomatis setelah 24 jam. Ini bisa menjadi masalah untuk history percakapan.

**Rekomendasi:** Implementasikan soft delete atau buat configurable retention period.

---

## 📊 Ringkasan Statistik

| Metrik | Nilai |
|--------|-------|
| Total Sub-Project | 7 |
| Total Database Models | ~45 |
| Total Enum Types | 18+ |
| Server Controllers | 26 |
| Server Routes | 24 |
| Merchant Web Pages | 27 |
| Admin Web Pages | 32 |
| Distributor Web Pages | 10+ |
| Mobile Seller Screens | 54 |
| Mobile Buyer Screens | 28 |
| Mobile Driver Screens | 13 |
| Prisma Schema Lines | 1,095 |
| Total Unique Libraries | ~100+ |
| Bahasa Pemrograman | JavaScript, TypeScript, Dart, SQL |
| Framework | Express, React, Flutter |

---

> **Catatan:** Analisis ini berdasarkan static code review tanpa menjalankan aplikasi. Beberapa aspek seperti performa runtime, bug potensial, dan UX flow mungkin memerlukan analisis dinamis lebih lanjut.

---
*Dianalisis oleh Antigravity AI — 7 April 2026*
