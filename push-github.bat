@echo off
setlocal enabledelayedexpansion
title Push Reading List ke GitHub
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

echo [1/4] Menyiapkan web assets terbaru...
call node build.js
echo.

echo [2/4] Menambahkan seluruh file ke Git staging...
git add .
echo.

echo [3/4] Melakukan commit perubahan...
git commit -m "feat: multi-user role database, AI vision training & adaptive cover art"
if %errorlevel% neq 0 (
    echo [INFO] Tidak ada perubahan baru yang perlu di-commit, atau commit sudah dibuat.
)
echo.

echo [4/4] Mendorong (Push) ke GitHub origin main...
git push origin main

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo  [SUKSES 100%%] Berhasil di-push ke GitHub!
    echo  GitHub Actions akan otomatis mengompilasi APK terbaru:
    echo  https://github.com/appcraft1/reading-list/actions
    echo ========================================================
) else (
    echo.
    echo ========================================================
    echo  [GAGAL] Push ke GitHub mengalami kendala.
    echo  Pastikan Anda sudah login Git atau memiliki izin push.
    echo ========================================================
)

:finish
echo.
pause
