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
