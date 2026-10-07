Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  PUSH REPOSITORY KE GITHUB (AMAN & BERSIH)" -ForegroundColor Cyan
Write-Host "  Repository: https://github.com/appcraft1/reading-list.git" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Git belum terpasang atau tidak terdeteksi di PATH!" -ForegroundColor Red
    exit 1
}

Write-Host "[1/5] Menyiapkan web assets terbaru..." -ForegroundColor Yellow
node build.js

Write-Host "`n[2/5] Memastikan file APK biner & rahasia tidak ter-commit..." -ForegroundColor Yellow
git rm --cached "Reading List.apk" 2>$null
git rm --cached "*.apk" 2>$null

Write-Host "`n[3/5] Menambahkan file yang aman ke Git staging..." -ForegroundColor Yellow
git add .

Write-Host "`n[4/5] Melakukan commit perubahan..." -ForegroundColor Yellow
git commit -m "feat: live cloud deploy, multi-user role database, AI vision training & adaptive cover art"

Write-Host "`n[5/5] Mendorong (Push) ke GitHub origin main..." -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n========================================================" -ForegroundColor Green
    Write-Host " [SUKSES 100%] Berhasil di-push ke GitHub secara aman!" -ForegroundColor Green
    Write-Host ""
    Write-Host " 1. Cloud Web App Aktif (Live Update Tanpa Install APK):" -ForegroundColor Green
    Write-Host "    https://appcraft1.github.io/reading-list/" -ForegroundColor Cyan
    Write-Host ""
    Write-Host " 2. APK Cloud Gateway Otomatis Dikompilasi di GitHub:" -ForegroundColor Green
    Write-Host "    https://github.com/appcraft1/reading-list/actions" -ForegroundColor Cyan
    Write-Host "========================================================" -ForegroundColor Green
} else {
    Write-Host "`n========================================================" -ForegroundColor Red
    Write-Host " [GAGAL] Push ke GitHub mengalami kendala. Periksa koneksi/autentikasi." -ForegroundColor Red
    Write-Host "========================================================" -ForegroundColor Red
}
