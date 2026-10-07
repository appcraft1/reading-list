Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  PUSH REPOSITORY KE GITHUB (AMAN & OPTIMAL)" -ForegroundColor Cyan
Write-Host "  Repository: https://github.com/appcraft1/reading-list.git" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Git belum terpasang atau tidak terdeteksi di PATH!" -ForegroundColor Red
    exit 1
}

Write-Host "[1/6] Mengoptimalkan buffer koneksi Git ke GitHub..." -ForegroundColor Yellow
git config http.postBuffer 524288000
git config http.version HTTP/1.1

Write-Host "`n[2/6] Menyiapkan web assets terbaru..." -ForegroundColor Yellow
node build.js

Write-Host "`n[3/6] Memastikan file APK biner & rahasia tidak ter-commit..." -ForegroundColor Yellow
git rm --cached "Reading List.apk" 2>$null
git rm --cached "*.apk" 2>$null

Write-Host "`n[4/6] Menambahkan file yang aman ke Git staging..." -ForegroundColor Yellow
git add .

Write-Host "`n[5/6] Melakukan commit perubahan..." -ForegroundColor Yellow
git commit -m "fix: github action apk build runner and cloud configuration"

Write-Host "`n[6/6] Melakukan sinkronisasi & push ke GitHub..." -ForegroundColor Yellow
# Sinkronkan rebase terlebih dahulu jika ada update dari GitHub Pages bot
git pull --rebase origin main 2>$null

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
    Write-Host " [INFO] Jika muncul 'Internal Server Error', server GitHub sedang sibuk." -ForegroundColor Yellow
    Write-Host " Tunggu 1-2 menit lalu jalankan ulang script ini." -ForegroundColor Yellow
    Write-Host "========================================================" -ForegroundColor Red
}
