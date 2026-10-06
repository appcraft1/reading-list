# 📱 PANDUAN LENGKAP PEMBUATAN APK ANDROID DARI WEB APP
> **Blueprint Arsitektur, Struktur File, Skrip Otomasi, dan Alur Kompilasi Lengkap**  
> *Dokumen ini dirancang sebagai referensi mandiri (master blueprint). Jika Anda ingin mengubah proyek web lain menjadi aplikasi Android (APK), cukup berikan file markdown ini kepada AI Assistant atau ikuti langkah-langkah di dalamnya.*

---

## 📑 DAFTAR ISI
1. [Arsitektur & Konsep Hybrid](#1-arsitektur--konsep-hybrid)
2. [Peta Struktur File & Direktori Proyek](#2-peta-struktur-file--direktori-proyek)
3. [Tabel Peran Setiap File yang Dibuat](#3-tabel-peran-setiap-file-yang-dibuat)
4. [Prasyarat & Setup Environment](#4-prasyarat--setup-environment)
5. [Langkah Pembuatan APK dari Nol (Step-by-Step)](#5-langkah-pembuatan-apk-dari-nol-step-by-step)
6. [Koleksi Template Kode Lengkap (Siap Copy-Paste)](#6-koleksi-template-kode-lengkap-siap-copy-paste)
   - [6.1 package.json](#61-packagejson)
   - [6.2 capacitor.config.json](#62-capacitorconfigjson)
   - [6.3 build.js (Asset Bundler)](#63-buildjs-asset-bundler)
   - [6.4 generate-icons.ps1 (Generator Icon Android)](#64-generate-iconsps1-generator-icon-android)
   - [6.5 build.bat (1-Click Build Runner)](#65-buildbat-1-click-build-runner)
   - [6.6 salin-apk.bat](#66-salin-apkbat)
   - [6.7 deploy-cloud.bat (Live Update OTA)](#67-deploy-cloudbat-live-update-ota)
   - [6.8 MainActivity.java & Native Bridge](#68-mainactivityjava--native-bridge)
   - [6.9 NotificationReceiver.java](#69-notificationreceiverjava)
   - [6.10 Penyesuaian build.gradle & AndroidManifest.xml](#610-penyesuaian-buildgradle--androidmanifestxml)
7. [Dua Alur Pembaruan Aplikasi (Update Workflow)](#7-dua-alur-pembaruan-aplikasi-update-workflow)
8. [Tips & Troubleshooting Error Umum](#8-tips--troubleshooting-error-umum)

---

## 1. ARSITEKTUR & KONSEP HYBRID

Aplikasi ini menggunakan pendekatan **Modern Hybrid Application** berbasis **Capacitor 8.x**.

```
+-------------------------------------------------------------------------+
|                          HP ANDROID USER                                |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  |                     Native Android Shell (APK)                    |  |
|  |  - MainActivity (BridgeActivity)                                  |  |
|  |  - AndroidNotificationBridge (JavascriptInterface)                |  |
|  |  - NotificationReceiver (BroadcastReceiver / AlarmManager)        |  |
|  |                                                                   |  |
|  |  +-------------------------------------------------------------+  |  |
|  |  |                   Chromium WebView Layer                    |  |  |
|  |  |                                                             |  |  |
|  |  |   [MODE A: CLOUD LIVE UPDATE]                               |  |  |
|  |  |   Memuat: https://master-finance-asep.web.app (Firebase)    |  |  |
|  |  |   -> Fitur update instan tanpa kirim/install ulang APK      |  |  |
|  |  |                                                             |  |  |
|  |  |   [MODE B: OFFLINE LOCAL FALLBACK]                          |  |  |
|  |  |   Memuat: file:///android_asset/public/index.html           |  |  |
|  |  |   -> Jalan 100% saat tidak ada sinyal internet              |  |  |
|  |  +-------------------------------------------------------------+  |  |
|  +-------------------------------------------------------------------+  |
+-------------------------------------------------------------------------+
```

### Keunggulan Desain Ini:
1. **Performa Native WebView**: Menggunakan engine Chromium bawaan Android, mendukung CSS Modern (Backdrop Filter, Flexbox/Grid, Animasi Spring).
2. **Dual-Mode Live Update & Offline**:
   - Jika ada internet, aplikasi terhubung ke URL Cloud Hosting yang dapat di-update kapan saja dengan 1 kali klik.
   - Jika offline atau belum deploy cloud, aplikasi membaca file lokal yang tersimpan di dalam APK (`assets/public/`).
3. **Native Bridge Interface**: JavaScript di Web App dapat memanggil fungsi Android Native (Getar HP, Munculkan Notifikasi Push Bar, Jadwalkan Alarm).

---

## 2. PETA STRUKTUR FILE & DIREKTORI PROYEK

Berikut hierarki file proyek yang dibangun dan diorganisir:

```
personal-finance-app/
│
├── 📄 index.html                  # Halaman utama antarmuka (Mobile-First UI)
├── 📄 style.css                   # Token desain, animasi, tema Day/Night, responsif
├── 📄 app.js                      # Mesin logika keuangan, state management & controller
├── 📄 manifest.json               # Konfigurasi PWA (nama app, start_url, theme_color)
├── 📄 sw.js                       # Service Worker untuk caching offline
├── 📄 mascot.jpg                  # File gambar sumber logo aplikasi (resolusi tinggi)
├── 📄 version.json                # Metadata nomor versi & informasi changelog
│
├── ⚙️ package.json                # Dependencies Capacitor & skrip NPM
├── ⚙️ capacitor.config.json       # Konfigurasi appId, appName, live server URL
│
├── 🛠️ build.js                    # Skrip Node.js pemroses asset & sinkronisasi folder
├── 🛠️ generate-icons.ps1          # Skrip PowerShell pemotong icon Android (Mipmap)
├── 🛠️ build.bat                   # File eksekusi Windows (1-Click Build APK)
├── 🛠️ salin-apk.bat               # File penyalin cepat APK dari folder build Android
├── 🛠️ deploy-cloud.bat            # File 1-Click Update Web App ke Firebase Hosting
│
├── 📁 www/                        # Folder hasil build web assets (siap di-deploy)
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   ├── mascot.jpg
│   └── ...
│
├── 📁 android/                    # Proyek Android Studio Native (dihasilkan Capacitor)
│   ├── build.gradle               # Gradle konfigurasi level root
│   ├── gradlew.bat                # Wrapper Gradle Windows
│   └── app/
│       ├── build.gradle           # Konfigurasi target SDK, nama APK, versioning
│       └── src/main/
│           ├── AndroidManifest.xml # Izin sistem (Internet, Notifikasi, Vibrate)
│           ├── assets/public/      # Salinan web assets yang tertanam di dalam APK
│           ├── java/com/masterfinance/app/
│           │   ├── MainActivity.java           # BridgeActivity + JavascriptInterface
│           │   └── NotificationReceiver.java   # Handler notifikasi terjadwal
│           └── res/
│               ├── drawable/                   # Splash screen
│               └── mipmap-*/                   # Icon APK (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)
│
└── 📦 MasterFinance.apk           # HASIL AKHIR: File APK siap dipasang di HP Android
```

---

## 3. TABEL PERAN SETIAP FILE YANG DIBUAT

| Nama File / Folder | Kategori | Peran & Tanggung Jawab Utama |
|---|---|---|
| `package.json` | Konfigurasi | Mendaftarkan `@capacitor/core`, `@capacitor/cli`, dan `@capacitor/android`. |
| `capacitor.config.json` | Konfigurasi | Mengatur `appId` unik (misal `com.masterfinance.app`), nama aplikasi di layar HP, dan URL server cloud untuk live update. |
| `build.js` | Otomasi | Membersihkan/membuat folder `www/`, memproses path asset, dan menyalin file web ke `android/app/src/main/assets/public/`. |
| `generate-icons.ps1` | Otomasi | Membaca `mascot.jpg` dan otomatis menghasilkan semua varian icon Android (`ic_launcher.png`, `ic_launcher_round.png`, `ic_launcher_foreground.png`, dan `splash.png`) dengan padding aman. |
| `build.bat` | Otomasi | Skrip Windows 1-klik yang menjalankan rantai: `build.js` ➔ `generate-icons.ps1` ➔ `cap sync` ➔ `gradlew assembleDebug` ➔ salin APK ke root folder. |
| `salin-apk.bat` | Utilitas | Menyalin file `.apk` yang selesai di-build oleh Android Studio GUI langsung ke folder proyek utama. |
| `deploy-cloud.bat` | Otomasi Cloud | Menjalankan build asset dan meng-upload file ke Firebase Hosting sehingga pengguna aplikasi HP langsung mendapatkan update tanpa instal ulang. |
| `MainActivity.java` | Native Java | Activity utama Android turunan `BridgeActivity`. Membuka WebView dan menyuntikkan class `AndroidNotificationBridge` ke JavaScript (`window.AndroidNativeNotification`). |
| `NotificationReceiver.java` | Native Java | Menerima broadcast dari `AlarmManager` untuk memunculkan notifikasi push terjadwal (misal: pengingat Jumat sore). |
| `AndroidManifest.xml` | Native Android | Mendaftarkan izin akses (`INTERNET`, `POST_NOTIFICATIONS`, `VIBRATE`, `USE_BIOMETRIC`) dan mendaftarkan BroadcastReceiver. |
| `android/app/build.gradle` | Konfigurasi Build | Menentukan `minSdkVersion` (22), `targetSdkVersion` (34+), versi kode, serta memformat nama output APK (contoh: `MasterFinance-v1.2.apk`). |

---

## 4. PRASYARAT & SETUP ENVIRONMENT

Sebelum membuat APK, pastikan perangkat komputer memiliki perangkat lunak berikut:

1. **Node.js (LTS)**: Versi 18 atau 20+ (Termasuk `npm` dan `npx`).
   - Cek di terminal: `node -v` dan `npm -v`.
2. **Java Development Kit (JDK)**: JDK 17 atau JDK 21 (Temurin / Oracle / OpenJDK).
   - Pastikan path `JAVA_HOME` sudah diarahkan di Environment Variables Windows.
   - Cek di terminal: `java -version`.
3. **Android Studio**:
   - Install komponen **Android SDK Platform** (API 34/35) dan **Android SDK Build-Tools**.
   - Tambahkan `ANDROID_HOME` (biasanya `C:\Users\<Username>\AppData\Local\Android\Sdk`) ke Environment Variables.
4. **PowerShell**: Bawaan Windows 10/11 untuk mengeksekusi skrip generator icon.

---

## 5. LANGKAH PEMBUATAN APK DARI NOL (STEP-BY-STEP)

Jika Anda memiliki folder proyek web baru (misal: `my-new-app/` yang berisi `index.html`, `style.css`, `app.js`), ikuti 7 langkah standar ini:

```
[Web Project Baru] 
       │
       ▼
1. Siapkan Viewport & Icon 
       │
       ▼
2. npm init & Install Capacitor 
       │
       ▼
3. Buat capacitor.config.json & build.js 
       │
       ▼
4. npx cap add android 
       │
       ▼
5. Pasang Skrip Icon (generate-icons.ps1) & Bridge Java 
       │
       ▼
6. Jalankan build.bat (atau via Android Studio) 
       │
       ▼
[Selesai: File APK Siap di Root Folder]
```

### Langkah 1: Siapkan Viewport Mobile di `index.html`
Pastikan `<head>` di file `index.html` menyertakan viewport yang mendukung notch / safe area HP:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
```

### Langkah 2: Inisialisasi NPM & Pasang Capacitor
Di folder proyek Anda, buka terminal dan jalankan:
```bash
npm init -y
npm install @capacitor/core@latest @capacitor/cli@latest @capacitor/android@latest
```

### Langkah 3: Siapkan Konfigurasi `capacitor.config.json`
Buat file `capacitor.config.json` di root direktori (lihat template di Bagian 6.2).

### Langkah 4: Siapkan Skrip Bundler `build.js`
Buat file `build.js` untuk menyalin asset web ke folder `www/` (lihat template di Bagian 6.3). Jalankan:
```bash
node build.js
```

### Langkah 5: Generate Platform Android
Jalankan perintah Capacitor untuk membuat folder native Android:
```bash
npx cap add android
```
*Perintah ini akan secara otomatis membuat folder `android/` lengkap dengan Gradle wrapper.*

### Langkah 6: Kustomisasi Android & Pasang Icon
1. Letakkan gambar logo aplikasi berukuran persegi (min 512x512 px) dengan nama `mascot.jpg` di root folder.
2. Jalankan `generate-icons.ps1` via PowerShell untuk membuat icon di semua folder `mipmap-*`.
3. Tambahkan izin di `android/app/src/main/AndroidManifest.xml` (lihat Bagian 6.10).
4. Update `android/app/src/main/java/<package>/MainActivity.java` untuk mendukung notifikasi native.

### Langkah 7: Kompilasi APK
Pilih salah satu metode berikut:

#### Opsi A: Lewat Skrip Otomatis (Command Line)
Cukup klik ganda file `build.bat` di Windows Explorer. Skrip akan mengompilasi APK dan meletakkannya di root folder dengan nama `MasterFinance.apk`.

#### Opsi B: Lewat Android Studio (GUI)
1. Buka folder `android/` di Android Studio:
   ```bash
   npx cap open android
   ```
2. Tunggu Gradle Sync selesai.
3. Klik menu **Build** ➔ **Build Bundle(s) / APK(s)** ➔ **Build APK(s)**.
4. Setelah selesai, klik ganda `salin-apk.bat` untuk mengambil file APK ke root folder.

---

## 6. KOLEKSI TEMPLATE KODE LENGKAP (SIAP COPY-PASTE)

Bagian ini menyediakan seluruh source code template yang dibuat pada proyek ini. Anda bisa langsung membuat file-file ini di proyek baru.

### 6.1 `package.json`
```json
{
  "name": "personal-finance-app",
  "version": "1.0.0",
  "description": "Aplikasi Finansial Mandiri Android",
  "main": "app.js",
  "scripts": {
    "build": "node build.js",
    "cap:add": "node build.js && npx cap add android",
    "cap:sync": "node build.js && npx cap sync",
    "cap:open": "node build.js && npx cap open android"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "type": "commonjs",
  "dependencies": {
    "@capacitor/android": "^8.5.2",
    "@capacitor/cli": "^8.5.2",
    "@capacitor/core": "^8.5.2"
  }
}
```

---

### 6.2 `capacitor.config.json`
```json
{
  "appId": "com.masterfinance.app",
  "appName": "Master Finance",
  "webDir": "www",
  "server": {
    "url": "https://master-finance-asep.web.app",
    "cleartext": true,
    "androidScheme": "https",
    "allowNavigation": [
      "master-finance-asep.web.app",
      "*.web.app",
      "*.firebaseapp.com"
    ]
  }
}
```
> *Catatan: Jika Anda belum memiliki server cloud, hilangkan bagian `"server"` agar aplikasi selalu membaca file lokal di dalam APK.*

---

### 6.3 `build.js` (Asset Bundler)
```javascript
const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const wwwDir = path.join(rootDir, 'www');

// 1. Buat folder www jika belum ada
if (!fs.existsSync(wwwDir)) {
  fs.mkdirSync(wwwDir, { recursive: true });
}

// 2. Salin logo maskot
const mascotSrc = path.join(rootDir, 'mascot.jpg');
if (fs.existsSync(mascotSrc)) {
  fs.copyFileSync(mascotSrc, path.join(wwwDir, 'mascot.jpg'));
  console.log('✅ Logo mascot.jpg berhasil disalin ke www/');
}

// 3. Proses & Salin index.html
const indexSrc = path.join(rootDir, 'index.html');
if (fs.existsSync(indexSrc)) {
  let html = fs.readFileSync(indexSrc, 'utf8');
  // Pastikan path image memakai relative path di APK
  fs.writeFileSync(path.join(wwwDir, 'index.html'), html, 'utf8');
  console.log('✅ index.html diproses dan ditulis ke www/index.html');
}

// 4. Salin asset web utama
const assets = ['style.css', 'app.js', 'manifest.json', 'sw.js', 'version.json'];
assets.forEach(asset => {
  const src = path.join(rootDir, asset);
  const dest = path.join(wwwDir, asset);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`✅ Menyalin ${asset} ke www/`);
  }
});

// 5. Sinkronisasi langsung ke assets Android jika folder android ada
const androidAssetsDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'assets', 'public');
if (fs.existsSync(androidAssetsDir)) {
  const allFiles = ['index.html', 'style.css', 'app.js', 'manifest.json', 'sw.js', 'version.json', 'mascot.jpg'];
  allFiles.forEach(file => {
    const src = path.join(wwwDir, file);
    const dest = path.join(androidAssetsDir, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    }
  });
  console.log('✅ Android assets public directory synced langsung!');
}

console.log('\n🎉 Persiapan build asset selesai!');
```

---

### 6.4 `generate-icons.ps1` (Generator Icon Android)
```powershell
# PowerShell Icon Generator menggunakan System.Drawing bawaan Windows
Add-Type -AssemblyName System.Drawing

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$srcImgPath = Join-Path $rootDir "mascot.jpg"

if (-not (Test-Path $srcImgPath)) {
    Write-Host "[ERROR] mascot.jpg tidak ditemukan di root folder!" -ForegroundColor Red
    exit 1
}

Write-Host "🎨 Membuat logo & icon APK lucu untuk Android..." -ForegroundColor Cyan

$srcImg = [System.Drawing.Image]::FromFile($srcImgPath)

# Dimensi Mipmap Android
$mipmapSizes = @{
    "mipmap-mdpi"    = 48
    "mipmap-hdpi"    = 72
    "mipmap-xhdpi"   = 96
    "mipmap-xxhdpi"  = 144
    "mipmap-xxxhdpi" = 192
}

$resDir = Join-Path $rootDir "android\app\src\main\res"

foreach ($entry in $mipmapSizes.GetEnumerator()) {
    $folderName = $entry.Key
    $size = $entry.Value
    $targetDir = Join-Path $resDir $folderName

    if (-not (Test-Path $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    }

    # 1. Standard Square & Round Icon
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($srcImg, 0, 0, $size, $size)
    $g.Dispose()

    $bmp.Save((Join-Path $targetDir "ic_launcher.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Save((Join-Path $targetDir "ic_launcher_round.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()

    # 2. Adaptive Foreground Icon (dengan 12% safe padding untuk Android Adaptive Icon)
    $fgBmp = New-Object System.Drawing.Bitmap $size, $size
    $gFg = [System.Drawing.Graphics]::FromImage($fgBmp)
    $gFg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $gFg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    
    $pad = [int]($size * 0.12)
    $innerSize = $size - ($pad * 2)
    $gFg.DrawImage($srcImg, $pad, $pad, $innerSize, $innerSize)
    $gFg.Dispose()

    $fgBmp.Save((Join-Path $targetDir "ic_launcher_foreground.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $fgBmp.Dispose()
    
    Write-Host "  -> Berhasil: $folderName (${size}x${size}px)" -ForegroundColor Green
}

# 3. Splash Screen di Drawable
$drawableDir = Join-Path $resDir "drawable"
if (Test-Path $drawableDir) {
    $splashBmp = New-Object System.Drawing.Bitmap 480, 480
    $gSplash = [System.Drawing.Graphics]::FromImage($splashBmp)
    $gSplash.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $gSplash.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $gSplash.Clear([System.Drawing.Color]::White)
    $gSplash.DrawImage($srcImg, 40, 40, 400, 400)
    $gSplash.Dispose()
    $splashBmp.Save((Join-Path $drawableDir "splash.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $splashBmp.Dispose()
}

$srcImg.Dispose()
Write-Host "✅ Seluruh icon APK berhasil diperbarui!" -ForegroundColor Green
```

---

### 6.5 `build.bat` (1-Click Build Runner)
```batch
@echo off
title Build APK Otomatis
echo ========================================================
echo   BUILD APK ANDROID TERBARU & SINKRONISASI ASSET
echo ========================================================
echo.

echo [1/4] Menyiapkan web assets...
call node build.js
echo.

echo [2/4] Mengenerate icon APK Android...
powershell -ExecutionPolicy Bypass -File generate-icons.ps1
echo.

echo [3/4] Sinkronisasi asset ke proyek Android...
if not exist android (
    call npx cap add android
) else (
    call npx cap sync android
)
echo.

echo [4/4] Mengompilasi APK Baru via Gradle...
cd android
call gradlew.bat assembleDebug
cd ..

echo.
echo Menyalin file APK terbaru ke folder utama...
for /r "android\app\build\outputs\apk\debug" %%F in (*.apk) do (
    copy /y "%%F" "MasterFinance.apk" >nul
    echo [SUKSES] %%~nxF berhasil disalin ke MasterFinance.apk
)

if exist "MasterFinance.apk" (
    echo ========================================================
    echo  [SUKSES 100%%] APK BARU TELAH SIAP: MasterFinance.apk
    echo ========================================================
) else (
    echo [INFO] File APK belum terkompilasi otomatis.
    echo Silakan buka Android Studio lalu Build APK(s) manual.
)
pause
```

---

### 6.6 `salin-apk.bat`
```batch
@echo off
for /r "android\app\build\outputs\apk\debug" %%F in (*.apk) do (
    copy /y "%%F" "MasterFinance.apk"
    echo [SUKSES] %%~nxF disalin ke MasterFinance.apk
)
echo ========================================================
echo File APK terbaru siap di root folder!
echo ========================================================
pause
```

---

### 6.7 `deploy-cloud.bat` (Live Update OTA)
```batch
@echo off
title Update Otomatis ke Cloud
echo ========================================================
echo   UPDATE KE CLOUD HOSTING (TANPA INSTALL ULANG APK!)
echo ========================================================
echo.
echo [1/3] Menyiapkan file web terbaru...
call node build.js
echo.
echo [2/3] Memeriksa status login Firebase...
call npx -y firebase-tools login
echo.
echo [3/3] Mengupload file web ke Cloud Firebase Hosting...
call npx -y firebase-tools deploy --only hosting
echo.
echo ========================================================
echo  [SUKSES] Web App telah ter-update di Cloud!
echo  Buka aplikasi di HP, fitur otomatis langsung terbarui.
echo ========================================================
pause
```

---

### 6.8 `MainActivity.java` & Native Bridge
Simpan di: `android/app/src/main/java/com/masterfinance/app/MainActivity.java`

```java
package com.masterfinance.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Vibrator;
import android.os.VibrationEffect;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String CHANNEL_ID = "master_finance_channel";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createNotificationChannel();

        // Minta izin runtime notifikasi untuk Android 13+ (API 33+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, 101);
            }
        }

        setupBridgeInterface();
    }

    @Override
    public void onResume() {
        super.onResume();
        setupBridgeInterface();
    }

    private void setupBridgeInterface() {
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView webView = getBridge().getWebView();
                webView.clearCache(true);
                // Menghubungkan Java ke window.AndroidNativeNotification di JavaScript
                webView.addJavascriptInterface(new AndroidNotificationBridge(this), "AndroidNativeNotification");
            }
        } catch (Exception ignored) {}
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            CharSequence name = "Master Finance";
            String description = "Notifikasi Transaksi & Pengingat";
            int importance = NotificationManager.IMPORTANCE_HIGH;
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, name, importance);
            channel.setDescription(description);
            channel.enableVibration(true);

            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }

    public static class AndroidNotificationBridge {
        private final Context context;

        public AndroidNotificationBridge(Context context) {
            this.context = context;
        }

        @JavascriptInterface
        public void sendNotification(String title, String message) {
            try {
                Intent intent = new Intent(context, MainActivity.class);
                intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                PendingIntent pendingIntent = PendingIntent.getActivity(
                    context, 0, intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
                );

                NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setContentTitle(title)
                    .setContentText(message)
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(message))
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setContentIntent(pendingIntent)
                    .setAutoCancel(true);

                NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
                if (manager != null) {
                    manager.notify((int) System.currentTimeMillis(), builder.build());
                }
            } catch (Exception ignored) {}
        }

        @JavascriptInterface
        public void triggerVibration(int durationMs) {
            try {
                Vibrator v = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
                if (v != null && v.hasVibrator()) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        v.vibrate(VibrationEffect.createOneShot(durationMs > 0 ? durationMs : 50, VibrationEffect.DEFAULT_AMPLITUDE));
                    } else {
                        v.vibrate(durationMs > 0 ? durationMs : 50);
                    }
                }
            } catch (Exception ignored) {}
        }
    }
}
```

---

### 6.9 `NotificationReceiver.java`
Simpan di: `android/app/src/main/java/com/masterfinance/app/NotificationReceiver.java`

```java
package com.masterfinance.app;

import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;

public class NotificationReceiver extends BroadcastReceiver {
    private static final String CHANNEL_ID = "master_finance_channel";

    @Override
    public void onReceive(Context context, Intent intent) {
        String title = intent.getStringExtra("title");
        String message = intent.getStringExtra("message");
        if (title == null) title = "Master Finance";
        if (message == null) message = "Waktunya evaluasi keuangan mingguan Anda!";

        Intent openApp = new Intent(context, MainActivity.class);
        openApp.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context, 102, openApp,
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(message)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(message))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true);

        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.notify((int) System.currentTimeMillis(), builder.build());
        }
    }
}
```

---

### 6.10 Penyesuaian `build.gradle` & `AndroidManifest.xml`

#### Edit `android/app/src/main/AndroidManifest.xml`:
Tambahkan permission di dalam tag `<manifest>`:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.USE_BIOMETRIC" />

<application ...>
    <!-- Tambahkan receiver untuk alarm terjadwal -->
    <receiver android:name=".NotificationReceiver" android:exported="false">
        <intent-filter>
            <action android:name="ACTION_INVESTMENT_REMINDER" />
        </intent-filter>
    </receiver>
</application>
```

#### Edit `android/app/build.gradle`:
Tambahkan penamaan file otomatis di dalam blok `android { ... }`:
```groovy
applicationVariants.all { variant ->
    variant.outputs.all {
        outputFileName = "MasterFinance-v${variant.versionName}.apk"
    }
}
```

---

## 7. DUA ALUR PEMBARUAN APLIKASI (UPDATE WORKFLOW)

```
               KAPAN HARUS PILIH METODE MANA?
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   Hanya Ganti UI, Rumus,           Ganti Nama App, Izin Android,
  Kategori, atau Bug JavaScript     Logo APK, atau Kode Java Native
            │                                 │
            ▼                                 ▼
   [ALUR 1: CLOUD LIVE UPDATE]         [ALUR 2: BUILD APK BARU]
   Jalankan: deploy-cloud.bat         Jalankan: build.bat
   Waktu: ~10 Detik                   Waktu: ~1-2 Menit
   Efek: HP User langsung update      Efek: Kirim file .apk baru ke HP
```

### Alur 1: Live Update Cepat (Tanpa Kirim APK)
Gunakan jika Anda hanya mengedit `index.html`, `style.css`, atau `app.js`:
1. Klik ganda file `deploy-cloud.bat`.
2. Tunggu proses upload selesai.
3. Buka aplikasi di HP (pastikan terkoneksi internet), aplikasi akan langsung memuat tampilan dan fitur terbaru!

### Alur 2: Build File APK Baru
Gunakan jika Anda mengubah icon aplikasi, menambah perizinan Android, atau ingin membagikan file APK installer ke teman:
1. Klik ganda file `build.bat`.
2. Tunggu kompilasi selesai.
3. Ambil file `MasterFinance.apk` di root folder dan kirim ke HP (via WhatsApp, Google Drive, atau kabel USB).

---

## 8. TIPS & TROUBLESHOOTING ERROR UMUM

1. **Gradle Build Error / JAVA_HOME tidak ditemukan**:
   - Pastikan JDK 17 atau 21 sudah terinstall.
   - Buka *System Properties* ➔ *Environment Variables* ➔ Tambahkan System Variable:
     - `JAVA_HOME` = `C:\Program Files\Eclipse Adoptium\jdk-17...` (sesuai lokasi JDK Anda).
     - Tambahkan `%JAVA_HOME%\bin` ke variabel `Path`.

2. **Tampilan di HP terpotong Poni / Kamera Depan (Notch)**:
   - Gunakan CSS SafeArea di `style.css`:
     ```css
     padding-top: env(safe-area-inset-top, 24px);
     padding-bottom: env(safe-area-inset-bottom, 16px);
     ```

3. **WebView menampilkan Halaman Putih (Blank White Screen)**:
   - Pastikan script di `index.html` menggunakan path relatif (`src="./app.js"` bukan `src="/app.js"`).
   - Pastikan tidak ada sintaks JavaScript modern yang tidak didukung versi WebView lama perangkat.

4. **Notifikasi Tidak Muncul di Android 13+**:
   - Pastikan izin `POST_NOTIFICATIONS` sudah ada di `AndroidManifest.xml` dan fungsi `requestPermissions` dipanggil di `MainActivity.onCreate()`.
