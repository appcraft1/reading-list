@echo off
for /r "android\app\build\outputs\apk\debug" %%F in (*.apk) do (
    copy /y "%%F" "Reading List.apk"
    echo [SUKSES] %%~nxF disalin ke Reading List.apk
)
echo ========================================================
echo File APK Reading List.apk siap di root folder!
echo ========================================================
pause
