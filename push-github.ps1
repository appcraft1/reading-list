Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  PUSH REPOSITORY KE GITHUB (MAIN BRANCH)" -ForegroundColor Cyan
Write-Host "  Repository: https://github.com/appcraft1/reading-list.git" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Git belum terpasang atau tidak terdeteksi di PATH!" -ForegroundColor Red
    exit 1
}

Write-Host "[1/4] Menyiapkan web assets terbaru..." -ForegroundColor Yellow
node build.js

Write-Host "`n[2/4] Menambahkan seluruh file ke Git staging..." -ForegroundColor Yellow
git add .

Write-Host "`n[3/4] Melakukan commit perubahan..." -ForegroundColor Yellow
git commit -m "feat: multi-user role database, AI vision training & adaptive cover art"

Write-Host "`n[4/4] Mendorong (Push) ke GitHub origin main..." -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n========================================================" -ForegroundColor Green
    Write-Host " [SUKSES 100%] Berhasil di-push ke GitHub!" -ForegroundColor Green
    Write-Host " GitHub Actions akan otomatis mengompilasi APK terbaru:" -ForegroundColor Green
    Write-Host " https://github.com/appcraft1/reading-list/actions" -ForegroundColor Cyan
    Write-Host "========================================================" -ForegroundColor Green
} else {
    Write-Host "`n========================================================" -ForegroundColor Red
    Write-Host " [GAGAL] Push ke GitHub mengalami kendala. Periksa koneksi/autentikasi." -ForegroundColor Red
    Write-Host "========================================================" -ForegroundColor Red
}
