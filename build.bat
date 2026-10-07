@echo off
setlocal enabledelayedexpansion
title Build APK Reading List Otomatis
echo ========================================================
echo   BUILD APK ANDROID: READING LIST (AI VISION TRACKER)
echo ========================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js belum terinstall di komputer ini!
    echo Silakan unduh Node.js di https://nodejs.org
    goto :finish
)

if not exist "node_modules\@capacitor\cli" (
    echo [0/4] Menginstall modul Capacitor ke node_modules...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Gagal menginstall dependensi npm.
        goto :finish
    )
    echo.
)

echo [1/4] Menyiapkan web assets...
call node build.js
echo.

echo [2/4] Sinkronisasi platform Android Capacitor...
if not exist "android" (
    echo Menambahkan platform Android Capacitor...
    call npx @capacitor/cli add android
) else (
    echo Mensinkronkan Capacitor Android...
    call npx @capacitor/cli sync android
)
echo.

echo [3/4] Mengenerate icon APK Android...
powershell -ExecutionPolicy Bypass -File generate-icons.ps1
echo.

echo [4/4] Mengompilasi APK Baru via Gradle...
if exist "android\gradlew.bat" (
    cd android
    call gradlew.bat assembleDebug
    cd ..
) else (
    echo [INFO] Folder android baru saja diinisialisasi.
)

echo.
echo Menyalin file APK terbaru ke folder utama...
for /r "android\app\build\outputs\apk\debug" %%F in (*.apk) do (
    copy /y "%%F" "Reading List.apk" >nul
    echo [SUKSES] %%~nxF berhasil disalin ke Reading List.apk
)

if exist "Reading List.apk" (
    echo ========================================================
    echo  [SUKSES 100%%] APK BARU TELAH SIAP: Reading List.apk
    echo ========================================================
    goto :finish
)

echo.
echo ========================================================
echo [INFO] File APK belum terkompilasi otomatis karena laptop
echo Anda belum terkonfigurasi Java JDK / Android SDK.
echo.
echo 2 SOLUSI CEPAT:
echo 1. Opsi A (Paling Mudah): Gunakan GitHub Actions Cloud Build.
echo    Cukup 'git push origin main', APK otomatis dibuat di GitHub.
echo.
echo 2. Opsi B: Buka proyek via Android Studio:
echo    Ketik: npx cap open android
echo ========================================================

:finish
echo.
pause
