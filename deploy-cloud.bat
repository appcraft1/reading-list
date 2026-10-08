
@echo off
setlocal enabledelayedexpansion
title Update Otomatis ke Cloud Firebase
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

if not exist ".firebaserc" (
    echo [INFO] Project Firebase belum dipilih untuk Reading List.
    echo Silakan pilih atau buat project Firebase Anda di bawah ini:
    echo.
    call npx -y firebase-tools use --add
    echo.
)

echo [3/3] Mengupload file web ke Cloud Firebase Hosting...
call npx -y firebase-tools deploy --only hosting
echo.

if %errorlevel% equ 0 (
    echo ========================================================
    echo  [SUKSES 100%%] Web App telah ter-update di Firebase Cloud!
    echo  Buka aplikasi di HP, fitur otomatis langsung terbarui.
    echo ========================================================
) else (
    echo ========================================================
    echo  [INFO] Jika Anda ingin deploy ke project tertentu:
    echo  Ketik: npx firebase-tools use --add
    echo  Lalu jalankan deploy-cloud.bat kembali.
    echo ========================================================
)

pause
