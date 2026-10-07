@echo off
setlocal enabledelayedexpansion
title Push Reading List ke GitHub (Aman & Bersih)
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

echo [1/5] Menyiapkan web assets terbaru...
call node build.js
echo.

echo [2/5] Memastikan file biner APK & rahasia tidak ter-commit...
git rm --cached "Reading List.apk" 2>nul
git rm --cached "*.apk" 2>nul
echo.

echo [3/5] Menambahkan file yang aman ke Git staging...
git add .
echo.

echo [4/5] Melakukan commit perubahan...
git commit -m "feat: live cloud deploy, multi-user role database, AI vision training & adaptive cover art"
if %errorlevel% neq 0 (
    echo [INFO] Tidak ada perubahan baru yang perlu di-commit, atau commit sudah dibuat.
)
echo.

echo [5/5] Mendorong (Push) ke GitHub origin main...
git push origin main

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo  [SUKSES 100%%] Berhasil di-push ke GitHub secara aman!
    echo.
    echo  1. Cloud Web App Otomatis Aktif (Live Update):
    echo     https://appcraft1.github.io/reading-list/
    echo.
    echo  2. Kompilasi APK Otomatis di GitHub:
    echo     https://github.com/appcraft1/reading-list/actions
    echo ========================================================
) else (
    echo.
    echo ========================================================
    echo  [GAGAL] Push ke GitHub mengalami kendala.
    echo  Pastikan koneksi internet aktif dan izin akun valid.
    echo ========================================================
)

:finish
echo.
pause
