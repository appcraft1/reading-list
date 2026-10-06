# PowerShell Icon Generator menggunakan System.Drawing bawaan Windows
Add-Type -AssemblyName System.Drawing

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$srcImgPath = Join-Path $rootDir "mascot.jpg"
$fallbackBrain = "C:\Users\Asep\.gemini\antigravity-ide\brain\f305f649-c532-4315-af35-16931117f303\reading_list_mascot_1791318084371.jpg"

if (-not (Test-Path $srcImgPath) -and (Test-Path $fallbackBrain)) {
    Copy-Item $fallbackBrain $srcImgPath -Force
}

if (-not (Test-Path $srcImgPath)) {
    Write-Host "[INFO] mascot.jpg belum ditemukan, icon generator akan berjalan saat file gambar siap." -ForegroundColor Yellow
    exit 0
}

Write-Host "🎨 Membuat logo & icon APK Android untuk Reading List..." -ForegroundColor Cyan

$srcImg = [System.Drawing.Image]::FromFile($srcImgPath)

# Dimensi Mipmap Android
$mipmapSizes = @{
    "mipmap-mdpi"    = 48
    "mipmap-hdpi"    = 72
    "mipmap-xhdpi"   = 96
    "mipmap-xxhdpi"  = 144
    "mipmap-xxxhdpi" = 192
}

$resDir = Join-Path $rootDir "android\app\src\main\res"

if (Test-Path (Join-Path $rootDir "android")) {
    foreach ($entry in $mipmapSizes.GetEnumerator()) {
        $folderName = $entry.Key
        $size = $entry.Value
        $targetDir = Join-Path $resDir $folderName

        if (-not (Test-Path $targetDir)) {
            New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
        }

        # 1. Standard Square & Round Icon
        $bmp = New-Object System.Drawing.Bitmap $size, $size
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.DrawImage($srcImg, 0, 0, $size, $size)
        $g.Dispose()

        $bmp.Save((Join-Path $targetDir "ic_launcher.png"), [System.Drawing.Imaging.ImageFormat]::Png)
        $bmp.Save((Join-Path $targetDir "ic_launcher_round.png"), [System.Drawing.Imaging.ImageFormat]::Png)
        $bmp.Dispose()

        # 2. Adaptive Foreground Icon (12% padding)
        $fgBmp = New-Object System.Drawing.Bitmap $size, $size
        $gFg = [System.Drawing.Graphics]::FromImage($fgBmp)
        $gFg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $gFg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        
        $pad = [int]($size * 0.12)
        $innerSize = $size - ($pad * 2)
        $gFg.DrawImage($srcImg, $pad, $pad, $innerSize, $innerSize)
        $gFg.Dispose()

        $fgBmp.Save((Join-Path $targetDir "ic_launcher_foreground.png"), [System.Drawing.Imaging.ImageFormat]::Png)
        $fgBmp.Dispose()
        
        Write-Host "  -> Berhasil: $folderName (${size}x${size}px)" -ForegroundColor Green
    }

    # 3. Splash Screen di Drawable
    $drawableDir = Join-Path $resDir "drawable"
    if (Test-Path $drawableDir) {
        $splashBmp = New-Object System.Drawing.Bitmap 480, 480
        $gSplash = [System.Drawing.Graphics]::FromImage($splashBmp)
        $gSplash.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $gSplash.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $gSplash.Clear([System.Drawing.Color]::FromArgb(9, 10, 15))
        $gSplash.DrawImage($srcImg, 40, 40, 400, 400)
        $gSplash.Dispose()
        $splashBmp.Save((Join-Path $drawableDir "splash.png"), [System.Drawing.Imaging.ImageFormat]::Png)
        $splashBmp.Dispose()
    }
}

$srcImg.Dispose()
Write-Host "✅ Seluruh icon APK berhasil diperbarui!" -ForegroundColor Green
