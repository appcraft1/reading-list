Set-Location $PSScriptRoot

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  PUSH REPOSITORY KE GITHUB (AMAN & OPTIMAL)" -ForegroundColor Cyan
Write-Host "  Repository: https://github.com/appcraft1/reading-list.git" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Git belum terpasang atau tidak terdeteksi di PATH!" -ForegroundColor Red
    Read-Host "Tekan Enter untuk keluar"
    exit 1
}

Write-Host "[1/6] Mengoptimalkan buffer koneksi Git ke GitHub..." -ForegroundColor Yellow
git config http.postBuffer 524288000
git config http.version HTTP/1.1

Write-Host "`n[2/6] Menyiapkan web assets terbaru..." -ForegroundColor Yellow
if (Get-Command node -ErrorAction SilentlyContinue) {
    node build.js
} else {
    Write-Host "[INFO] Node tidak terdeteksi, menyalin aset web secara langsung..." -ForegroundColor Gray
    Copy-Item -Path "index.html","style.css","app.js","updater.js","manifest.json","sw.js","version.json","logo.svg","mascot.jpg" -Destination "www" -Force -ErrorAction SilentlyContinue
    if (Test-Path "android\app\src\main\assets\public") {
        Copy-Item -Path "index.html","style.css","app.js","updater.js","manifest.json","sw.js","version.json","logo.svg","mascot.jpg" -Destination "android\app\src\main\assets\public" -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "`n[3/6] Memastikan file APK biner & rahasia tidak ter-commit..." -ForegroundColor Yellow
git rm --cached "Reading List.apk" 2>$null
git rm --cached "*.apk" 2>$null

Write-Host "`n[4/6] Menambahkan file yang aman ke Git staging..." -ForegroundColor Yellow
git add .

Write-Host "`n[5/6] Melakukan commit perubahan..." -ForegroundColor Yellow
git commit -m "feat: cute & clean UI revamp with Bento Rak Hub, 1-tap Pure Checklist, streamlined modal, and PIN security with Google Sheets sync"

Write-Host "`n[6/6] Melakukan sinkronisasi & push ke GitHub..." -ForegroundColor Yellow
# Sinkronkan rebase terlebih dahulu jika ada update dari GitHub Pages bot
git pull --rebase origin main

git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n========================================================" -ForegroundColor Green
    Write-Host " [SUKSES 100%] Berhasil di-push ke GitHub!" -ForegroundColor Green
    Write-Host ""
    Write-Host " 1. Cloud Web App Aktif (Bisa Dipasang Tanpa APK):" -ForegroundColor Green
    Write-Host "    https://appcraft1.github.io/reading-list/" -ForegroundColor Cyan
    Write-Host ""
    Write-Host " 2. Pantau Compile APK di GitHub Actions:" -ForegroundColor Green
    Write-Host "    https://github.com/appcraft1/reading-list/actions" -ForegroundColor Cyan
    Write-Host "========================================================" -ForegroundColor Green
} else {
    Write-Host "`n========================================================" -ForegroundColor Red
    Write-Host " [PERINGATAN] Push ke GitHub belum berhasil." -ForegroundColor Yellow
    Write-Host " Periksa koneksi internet atau status kredensial git Anda." -ForegroundColor Yellow
    Write-Host "========================================================" -ForegroundColor Red
}

Write-Host ""
Read-Host "Tekan Enter untuk menutup jendela ini"
