@echo off
setlocal
cd /d "%~dp0"
title Push Reading List ke GitHub (Aman & Terverifikasi)

echo ========================================================
echo   PUSH REPOSITORY KE GITHUB (MAIN BRANCH)
echo   Repository: https://github.com/appcraft1/reading-list.git
echo ========================================================
echo.

:: 1. Deteksi Git di PATH atau lokasi instalasi standar Windows
where git >nul 2>nul
if %errorlevel% neq 0 (
    if exist "C:\Program Files\Git\cmd\git.exe" (
        set "PATH=C:\Program Files\Git\cmd;%PATH%"
    ) else if exist "%LOCALAPPDATA%\Programs\Git\cmd\git.exe" (
        set "PATH=%LOCALAPPDATA%\Programs\Git\cmd;%PATH%"
    ) else if exist "C:\Program Files (x86)\Git\cmd\git.exe" (
        set "PATH=C:\Program Files (x86)\Git\cmd;%PATH%"
    ) else (
        echo [ERROR] Git belum terpasang atau tidak terdeteksi di komputer ini.
        echo Silakan unduh dan install Git di: https://git-scm.com/
        goto :finish
    )
)

echo [1/6] Mengoptimalkan buffer koneksi Git ke GitHub...
git config http.postBuffer 524288000
git config http.version HTTP/1.1
echo [OK] Buffer Git berhasil dioptimalkan.
echo.

echo [2/6] Menyiapkan dan menyinkronkan web assets terbaru...
where node >nul 2>nul
if %errorlevel% equ 0 (
    call node build.js
) else (
    echo [INFO] Node.js tidak terdeteksi di PATH, menyinkronkan aset via PowerShell...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Copy-Item -Path 'index.html','style.css','app.js','updater.js','manifest.json','sw.js','version.json','logo.svg','mascot.jpg' -Destination 'www' -Force -ErrorAction SilentlyContinue; if (Test-Path 'android\app\src\main\assets\public') { Copy-Item -Path 'index.html','style.css','app.js','updater.js','manifest.json','sw.js','version.json','logo.svg','mascot.jpg' -Destination 'android\app\src\main\assets\public' -Force -ErrorAction SilentlyContinue }"
    echo [OK] Aset berhasil disinkronkan ke folder www dan android.
)
echo.

echo [3/6] Memastikan file APK biner tidak menumpuk di repo Git...
git rm --cached "Reading List.apk" 2>nul
git rm --cached "*.apk" 2>nul
echo [OK] Staging bersih dari file biner.
echo.

echo [4/6] Menambahkan perubahan ke Git staging...
git add .
echo [OK] Seluruh berkas siap di-commit.
echo.

echo [5/6] Melakukan commit perubahan...
git commit -m "feat: cute & clean UI revamp with Bento Rak Hub, 1-tap Pure Checklist, streamlined modal, and PIN security with Google Sheets sync"
if %errorlevel% neq 0 (
    echo [INFO] Tidak ada perubahan baru atau commit sudah dibuat sebelumnya.
)
echo.

echo [6/6] Melakukan sinkronisasi dan push ke GitHub...
echo Menarik update terbaru dari GitHub (rebase)...
git pull --rebase origin main
echo.
echo Mengunggah perubahan ke GitHub...
git push origin main

if %errorlevel% equ 0 goto :push_success
goto :push_failed

:push_success
echo.
echo ========================================================
echo  [SUKSES 100%%] Berhasil di-push ke GitHub secara aman!
echo.
echo  1. Cloud Web App Otomatis Aktif (Live Update):
echo     https://appcraft1.github.io/reading-list/
echo.
echo  2. Pantau Compile APK di GitHub Actions:
echo     https://github.com/appcraft1/reading-list/actions
echo ========================================================
goto :finish

:push_failed
echo.
echo ========================================================
echo  [PERINGATAN] Push ke GitHub belum berhasil.
echo.
echo  Penyebab umum:
echo  1. Koneksi internet terputus atau server GitHub sedang sibuk.
echo  2. Kredensial / login GitHub di komputer belum tersimpan.
echo     (Jalankan 'git push origin main' di terminal untuk login)
echo  3. Terdapat perubahan remote yang bentrok.
echo ========================================================
goto :finish

:finish
echo.
echo ========================================================
echo  Jendela ini tidak akan tertutup otomatis.
echo  Tekan tombol apa saja pada keyboard untuk menutup...
echo ========================================================
pause
