# Generate App Assets

## App Icon
Letakkan file icon di:
- `assets/icon/app_icon.png` (1024x1024, PNG, full icon)
- `assets/icon/app_icon_foreground.png` (1024x1024, PNG, foreground only untuk adaptive icon)

Setelah file siap, jalankan:
```bash
flutter pub run flutter_launcher_icons
```

## Splash Screen
Letakkan file splash di:
- `assets/splash/splash_logo.png` (512x512, PNG, logo di tengah splash)

Setelah file siap, jalankan:
```bash
dart run flutter_native_splash:create
```

## Design Guidelines
- Brand Color: #E07A5F (Terra Cotta)
- Background: #FFF8F0 (Beige)
- Icon harus terlihat jelas di ukuran kecil (48x48)
- Gunakan ikon motor/helm/navigasi sebagai simbol driver
