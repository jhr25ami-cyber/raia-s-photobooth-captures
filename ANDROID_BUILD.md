# Build APK Android (Capacitor)

Project ini sudah dikonfigurasi Capacitor. UI/desain/fitur di `public/` **tidak diubah** — hanya disalin ke `www/` sebagai webDir.

## Prasyarat (di komputer lokal)
- Node.js 20+
- Android Studio (JDK 17 sudah bundled) + Android SDK Platform 34
- Bun atau npm

## Langkah build pertama kali

```bash
# 1. install dependencies
bun install

# 2. build www/ dari public/
bun run android:web

# 3. tambahkan platform Android (sekali saja)
bunx cap add android

# 4. sync assets → android project
bunx cap sync android

# 5. buka Android Studio
bunx cap open android
```

Di Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
APK ada di `android/app/build/outputs/apk/debug/app-debug.apk`.

## Update setelah edit file di `public/`

```bash
bun run android:sync
```

Lalu Build APK ulang di Android Studio.

## Konfigurasi
- `capacitor.config.ts` — appId `app.raia.photobooth`, appName `Raia Photobooth`.
- Kamera pakai `getUserMedia` (WebView Android 5+). Permission `CAMERA` otomatis diminta oleh Capacitor.
- Ganti icon/splash: taruh di `android/app/src/main/res/` setelah `cap add android`.
