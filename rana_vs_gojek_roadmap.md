# 🚀 Rana Super App — Roadmap Mengalahkan Gojek

## Posisi Saat Ini vs Gojek

| Dimensi | Gojek | Rana (Sekarang) | Gap |
|---|---|---|---|
| Ride Hailing | ✅ GoRide/GoCar | ✅ RanaRide/Car | ~Setara |
| Food Delivery | ✅ GoFood | ✅ RanaFood | ~Setara |
| Courier | ✅ GoSend | ✅ RanaSend | ~Setara |
| Market/Grocery | ✅ GoMart | ✅ RanaMart | ~Setara |
| Digital Wallet | ✅ GoPay | ✅ RanaPay | Perlu depth |
| PPOB/Tagihan | ✅ GoBills | ✅ PpobScreen | ~Setara |
| **PayLater** | ✅ GoPaylater | ❌ | **GAP KRITIS** |
| **Investasi** | ✅ GoInvestasi | ❌ | **GAP KRITIS** |
| **Asuransi** | ✅ GoSure | ❌ | **GAP BESAR** |
| **Tiket** | ✅ GoTix | ❌ | **GAP BESAR** |
| **Live Commerce** | ❌ | ❌ | Peluang diferensiasi |
| **Telemedicine** | ✅ GoMed | ❌ | **GAP besar** |
| Loyalty Program | ✅ GoPoints | ⚠️ (basic) | Perlu upgrade |
| **Group Order** | ✅ | ❌ | **GAP BESAR** |
| Social Review | ⚠️ | ❌ | Peluang |

---

## 🏆 Phase 1 — MVP+ (1–3 Bulan): Fondasi Kompetitif

### 1. 💳 RanaPay Upgrade — PayLater & Tabungan
> Ini adalah **fitur terpenting** yang memisahkan super app dari app biasa

**Features:**
- **RanaPay Later** — cicilan 0% untuk pembelian di ekosistem Rana
- **Saldo Berbunga** — simpan saldo RanaPay dapat bunga harian (integrasi P2P lending / OJK)
- **Split Bill** — bayar patungan dengan teman dalam 1 link
- **Auto-debit** — jadwal pembayaran tagihan otomatis
- **QR Merchant Offline** — bayar di toko fisik tanpa internet (QRIS)

**Backend needed:**
- Ledger service dengan double-entry bookkeeping
- Integration dengan Midtrans/Xendit untuk QRIS
- Kredit scoring sederhana (riwayat order)

---

### 2. 🛒 Group Order & Pre-Order
> Fitur viral yang Gojek belum maksimalkan

**Features:**
- **Group Order** — 1 link, teman tambah item masing-masing, 1 yang bayar
- **Scheduled Delivery** — pesan sekarang, antar jam X
- **Bulk Order** — order untuk kantor/event (min. order khusus)
- **Split Payment** — bayar sesuai porsi masing-masing

**Why it wins:** Viral by nature — user share link ke grup WhatsApp → organic acquisition

---

### 3. ⭐ RanaPoints — Loyalty Tiered Premium
> Gojek punya GoPoints, kita buat lebih engaging

**Tier System:**
```
🥉 Rana Silver  — 0–999 pts      → 2% cashback
🥈 Rana Gold    — 1000–4999 pts  → 4% cashback + priority support  
🥇 Rana Platinum — 5000+ pts     → 7% cashback + free delivery + lounge access
💎 Rana Black   — Invite only    → 10% + dedicated account manager
```

**Point Earning:**
- Setiap transaksi: Rp 1.000 = 1 point
- Review dengan foto: +10 pts
- Referral: +100 pts per user baru
- Daily login streak: 1–5 pts/hari
- Birthday month: 2x points

---

### 4. 📦 Real-time Order Tracking 2.0
> Tracking Gojek sudah bagus, kita buat lebih transparan

**Features:**
- **Live ETA Counter** — countdown detik ke detik, bukan estimasi kasar
- **Driver Live Chat** — chat langsung dari halaman tracking
- **Proof of Delivery** — foto saat barang diterima (untuk RanaSend)
- **Route Visualization** — animasi rute pengemudi di peta
- **Delay Notif** — push notif auto jika ETA mundur >5 menit

---

## 🌱 Phase 2 — Growth (3–6 Bulan): Diferensiasi

### 5. 📹 RanaLive — Live Commerce
> Gojek **TIDAK PUNYA INI**. Ini adalah moat terbesar Rana vs Gojek

**Konsep:**
- UMKM bisa live streaming jual produk langsung di app
- Viewer bisa tap produk → langsung masuk keranjang
- Flash sale eksklusif hanya saat live
- Interaksi gifting virtual dengan koin → konversi ke voucher diskon

**Why this wins:**
- TikTok Shop model di dalam super app
- UMKM Indonesia butuh platform ini
- Gojek tidak akan bisa copy cepat karena beda DNA

---

### 6. 🏥 RanaSehat — Telemedicine & Apotek
> GoMed hanya delivery obat. Kita bundles konsultasi + obat

**Features:**
- **Konsultasi Dokter** — video call dokter umum (Rp 15.000–50.000)
- **Resep Digital** — dokter kasih resep → langsung order obat
- **Apotek Partner** — delivery obat < 60 menit
- **Reminder Minum Obat** — notifikasi push terjadwal
- **Rekam Medis** — riwayat kesehatan tersimpan di app

---

### 7. 🎫 RanaTiket — Event & Perjalanan
> Bundling tiket dengan transportasi = nilai unik

**Features:**
- **Tiket Konser/Event** — integrasi ticketing
- **Reservasi Resto** — meja + pesan makanan sebelum datang
- **Paket Wisata Lokal** — day trip UMKM guide
- **Tiket Kereta/Bus** — integrasi KAI/Damri API
- **Hotel Lokal** — penginapan UMKM & homestay

---

### 8. 📊 RanaBisnis — Dashboard UMKM
> Gojek punya GoBiz. Kita buat lebih powerful untuk UMKM kecil

**Features:**
- **Analitik Penjualan** — grafik real-time omzet, produk terlaris
- **Manajemen Stok** — notif stok hampir habis
- **Promosi Builder** — buat voucher/diskon sendiri tanpa developer
- **Export Laporan** — PDF/Excel untuk pembukuan
- **Multi-outlet** — 1 akun bisa kelola banyak cabang
- **Integrasi Kasir** — QR scan di toko fisik terintegrasi RanaPay

---

## 🔥 Phase 3 — Dominance (6–12 Bulan): Fitur yang Gojek Tidak Miliki

### 9. 🤖 Rana AI Assistant 2.0 — Super Intelligent
> Bukan sekadar chatbot — ini personal concierge

**Capabilities:**
- **Voice Order** — "Rana, pesan nasi goreng biasa dari warung pak Budi"
- **Smart Reorder** — AI prediksi kamu mau pesan apa hari ini (berdasarkan pola)
- **Price Alert** — "Produk favoritmu turun harga, mau pesan?"
- **Budget Planner** — "Kamu biasanya habis Rp 500rb/minggu di food, bulan ini sudah 80%"
- **Health AI** — rekomendasi menu sehat berdasarkan riwayat pembelian
- **Negotiation Bot** — AI negosiasi harga dengan seller untuk bulk order

---

### 10. 🌱 Rana Hijau — Green Super App
> ESG/sustainability angle — Gojek baru mulai, kita bisa lead

**Features:**
- **Carbon Footprint Tracker** — setiap order tampilkan emisi CO2
- **Green Delivery Option** — antar pakai motor listrik, harga sama
- **Offset Donation** — bulatkan kembalian untuk tanam pohon
- **Eco Badge** — toko yang pakai kemasan ramah lingkungan dapat badge
- **Rana Hijau Points** — pilih green option = poin ekstra
- **Report Tahunan** — "Tahun ini kamu selamatkan X kg CO2"

---

### 11. 🛡️ RanaAman — Safety & Emergency
> Gojek punya fitur keselamatan, tapi kita bisa lebih jauh

**Features:**
- **Tombol SOS** — tekan 3 detik → kirim lokasi ke kontak darurat
- **Trusted Contact** — share perjalanan live ke keluarga
- **Liveness Check Driver** — verifikasi wajah driver sebelum berangkat
- **Accident Detection** — sensor HP deteksi kecelakaan → auto SOS
- **Insurance Micro** — perlindungan perjalanan Rp 1.000/trip

---

### 12. 💰 RanaInvest — Investasi Mikro UMKM
> Inovatif: User investasi di UMKM lokal, dapat return

**Model:**
- User bisa investasi mulai Rp 10.000 di UMKM partner
- UMKM pakai dana untuk modal → bagi hasil 8–15% p.a.
- Kupon special di merchant yang diinvestasi
- Transparansi penggunaan dana lewat dashboard
- Regulasi: Kolaborasi OJK / P2P Lending berlisensi

---

### 13. 👥 RanaCommunity — Social Commerce Layer
> Belanja lebih seru dengan teman

**Features:**
- **Review + Foto/Video** — seperti Tokopedia tapi embedded
- **Wishlist publik** — share wishlist ke teman
- **Follow UMKM Favorit** — notifications produk baru
- **RanaBlog** — konten resep, tips dari seller
- **Leaderboard** — siapa paling banyak bantu UMKM bulan ini
- **Referral Story** — share produk ke IG Story dengan link langsung

---

## 📱 Fitur UX yang Harus Ada (Tapi Sering Diabaikan)

| Fitur | Impact | Effort |
|---|---|---|
| **Dark Mode** | Tinggi | Rendah |
| **Offline Mode** — lihat riwayat tanpa internet | Tinggi | Sedang |
| **Widget Home Screen** — saldo & shortcut | Sedang | Sedang |
| **Apple Watch/WearOS** — notif & tracking | Tinggi | Tinggi |
| **Multiple Language** — Inggris, Sunda, Jawa, Batak | Tinggi | Rendah |
| **Accessibility** — screen reader, font besar | Sedang | Sedang |
| **Biometric Pay** — fingerprint/face untuk RanaPay | Tinggi | Rendah |
| **Family Account** — 1 akun untuk kelola keluarga | Tinggi | Sedang |

---

## 🎯 Killer Differentiator vs Gojek

> [!IMPORTANT]
> Ini 3 hal yang jika dikerjakan dengan baik, **Gojek tidak bisa copy dengan cepat**

### 1. 🏘️ Fokus Hiperloka UMKM
Gojek sudah terlalu besar dan fokus ke enterprise. **Rana bisa jadi champion UMKM lokal** — merchant kecil yang belum terjangkau Gojek karena fee terlalu tinggi.

### 2. 📹 RanaLive Commerce
Model TikTok Shop tapi **terintegrasi dengan delivery, payment, dan loyalty** dalam satu ekosistem. Ini BUKAN sekadar fitur, ini adalah **business model baru**.

### 3. 💚 Komunitas & Trust
Rana bisa bangun **trust yang lebih personal** karena fokus lokal. Seller dan buyer bisa saling kenal. Community-driven super app yang Gojek yang sudah corporate tidak bisa replikasi.

---

## 🗺️ Prioritas Implementasi (Rekomendasi Urutan)

```
SEKARANG → Biometric Pay + Group Order + RanaPoints Tiers
1 BULAN  → RanaPay Later + QRIS Offline + Scheduled Order  
2 BULAN  → RanaLive MVP + RanaBisnis Dashboard
3 BULAN  → RanaSehat + RanaTiket
6 BULAN  → RanaInvest + Carbon Tracker + AI 2.0
1 TAHUN  → Full ecosystem dominance
```

---

> [!TIP]
> **Strategi utama:** Jangan copycat Gojek feature by feature. Sebagai super app lokal UMKM, Rana harus **win the trust** dan **win the community** lebih dulu. Fitur teknis bisa menyusul, tapi community moat sangat sulit direbut.
