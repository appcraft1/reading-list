@echo off
title Build APK Reading List Otomatis
echo ========================================================
echo   BUILD APK ANDROID: READING LIST (AI VISION TRACKER)
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
    echo Menambahkan platform Android Capacitor...
    call npx cap add android
) else (
    echo Mensinkronkan Capacitor Android...
    call npx cap sync android
)
echo.

echo [4/4] Mengompilasi APK Baru via Gradle...
if exist "android\gradlew.bat" (
    cd android
    call gradlew.bat assembleDebug
    cd ..
) else (
    echo [INFO] Folder android baru saja diinisialisasi.
    echo Silakan jalankan kembali build.bat atau buka via Android Studio.
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
) else (
    echo [INFO] File APK belum terkompilasi otomatis.
    echo Silakan buka Android Studio dengan perintah: npx cap open android
    echo lalu pilih Build - Build APK(s).
)
pause
