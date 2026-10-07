@echo off
setlocal enabledelayedexpansion
title Push Reading List ke GitHub (Aman & Optimal)
echo ========================================================
echo   PUSH REPOSITORY KE GITHUB (MAIN BRANCH)
echo   Repository: https://github.com/appcraft1/reading-list.git
echo ========================================================
echo.

where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Git belum terpasang atau tidak terdeteksi di PATH!
    echo Unduh Git di https://git-scm.com/
    goto :finish
)

echo [1/6] Mengoptimalkan buffer koneksi Git ke GitHub...
git config http.postBuffer 524288000
git config http.version HTTP/1.1
echo.

echo [2/6] Menyiapkan web assets terbaru...
call node build.js
echo.

echo [3/6] Memastikan file biner APK & rahasia tidak ter-commit...
git rm --cached "Reading List.apk" 2>nul
git rm --cached "*.apk" 2>nul
echo.

echo [4/6] Menambahkan file yang aman ke Git staging...
git add .
echo.

echo [5/6] Melakukan commit perubahan...
git commit -m "fix: github action apk build runner and cloud configuration"
if %errorlevel% neq 0 (
    echo [INFO] Tidak ada perubahan baru yang perlu di-commit, atau commit sudah dibuat.
)
echo.

echo [6/6] Melakukan sinkronisasi & push ke GitHub...
git pull --rebase origin main 2>nul
git push origin main

if %errorlevel% equ 0 (
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
) else (
    echo.
    echo ========================================================
    echo  [INFO] Jika muncul 'Internal Server Error', server GitHub sedang sibuk.
    echo  Tunggu 1-2 menit lalu jalankan ulang file ini.
    echo ========================================================
)

:finish
echo.
pause
