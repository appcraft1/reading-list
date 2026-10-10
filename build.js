const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const wwwDir = path.join(rootDir, 'www');

console.log('🚀 [Reading List] Memulai proses bundling aset web...');

// 1. Buat folder www jika belum ada
if (!fs.existsSync(wwwDir)) {
  fs.mkdirSync(wwwDir, { recursive: true });
}

// 2. Pastikan file mascot.jpg ada di root
const mascotSrc = path.join(rootDir, 'mascot.jpg');


if (fs.existsSync(mascotSrc)) {
  fs.copyFileSync(mascotSrc, path.join(wwwDir, 'mascot.jpg'));
  console.log('✅ mascot.jpg berhasil disalin ke www/');
}

// 3. Salin & verifikasi index.html
const indexSrc = path.join(rootDir, 'index.html');
if (fs.existsSync(indexSrc)) {
  let html = fs.readFileSync(indexSrc, 'utf8');
  fs.writeFileSync(path.join(wwwDir, 'index.html'), html, 'utf8');
  console.log('✅ index.html berhasil ditulis ke www/index.html');
}

// 4. Salin seluruh aset pendukung
const assets = ['style.css', 'app.js', 'updater.js', 'manifest.json', 'sw.js', 'version.json', 'logo.svg'];
assets.forEach(asset => {
  const src = path.join(rootDir, asset);
  const dest = path.join(wwwDir, asset);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`✅ Menyalin ${asset} ke www/`);
  }
});

// 5. Sinkronisasi langsung ke assets Android jika folder android ada
const androidAssetsDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'assets', 'public');
if (fs.existsSync(path.join(rootDir, 'android'))) {
  try {
    if (fs.existsSync(androidAssetsDir)) {
      fs.rmSync(androidAssetsDir, { recursive: true, force: true });
    }
  } catch(e) {}
  fs.mkdirSync(androidAssetsDir, { recursive: true });

  const allFiles = ['index.html', 'style.css', 'app.js', 'updater.js', 'manifest.json', 'sw.js', 'version.json', 'logo.svg', 'mascot.jpg'];
  allFiles.forEach(file => {
    const src = path.join(wwwDir, file);
    const dest = path.join(androidAssetsDir, file);
    if (fs.existsSync(src)) {
      const buf = fs.readFileSync(src);
      fs.writeFileSync(dest, buf);
    }
  });
  console.log('✅ Aset Android native (/assets/public/) dibuat ulang sebagai berkas fisik bersih!');
}

console.log('\n🎉 Selesai! Seluruh aset siap untuk dijalankan lokal atau dikompilasi jadi APK.');
