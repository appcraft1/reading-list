/**
 * ============================================================================
 * READING LIST — GOOGLE APPS SCRIPT DATABASE BACKEND
 * 100% Zero-Cost Serverless Cloud Database Engine (Auto-Initialize)
 * ============================================================================
 * 
 * SCRIPT INI OTOMATIS:
 * - Menjalankan setup sheet "Koleksi_Bacaan" & "Folder_Rak" otomatis saat dibuka/diakses.
 * - Mengisi data awal (dummy manhwa, novel & anime) langsung ke Google Sheet.
 * - Frontend aplikasi 100% bersih tanpa hardcoded dummy data.
 * 
 * CARA SETUP:
 * 1. Buka spreadsheet baru di https://sheets.new
 * 2. Klik Extensions (Ekstensi) > Apps Script.
 * 3. Hapus semua kode default, tempel (Paste) seluruh file ini.
 * 4. Klik "Save" (Ikon Disket) lalu klik "Deploy" > "New deployment".
 * 5. Pilih "Web app":
 *    - Execute as : Me (Akun Google Anda)
 *    - Who has access : Anyone (Siapa saja)  <-- WAJIB
 * 6. Klik "Deploy", izinkan akses akun (Authorize access), lalu salin Web App URL.
 * 7. Tempel ke Pengaturan APK Reading List > "Simpan & Hubungkan".
 */

const SHEET_ITEMS = "Koleksi_Bacaan";
const SHEET_FOLDERS = "Folder_Rak";

// Data Awal / Dummy (Tersimpan di Google Sheet, Bukan di Frontend)
const DUMMY_FOLDERS = [
  { id: 'f-manhwa', name: 'Top Manhwa OP', color: 'flame' },
  { id: 'f-novel',  name: 'Webnovel & Buku', color: 'book' },
  { id: 'f-anime',  name: 'Anime & Film', color: 'film' },
  { id: 'f-santai', name: 'Santai & Slice of Life', color: 'leaf' }
];

const DUMMY_ITEMS = [
  {
    id: 'item-1',
    title: 'Solo Leveling (Only I Level Up)',
    folderId: 'f-manhwa',
    status: 'completed',
    desc: 'Sung Jin-woo, hunter peringkat E terlemah, mendapatkan System rahasia setelah selamat dari Double Dungeon misterius.',
    coverUrl: '',
    createdAt: Date.now() - 500000
  },
  {
    id: 'item-2',
    title: "Omniscient Reader's Viewpoint",
    folderId: 'f-manhwa',
    status: 'reading',
    desc: 'Kim Dokja adalah satu-satunya pembaca novel web apokaliptik yang tiba-tiba menjadi kenyataan di dunia nyata.',
    coverUrl: '',
    createdAt: Date.now() - 400000
  },
  {
    id: 'item-3',
    title: 'Return of the Blossoming Blade',
    folderId: 'f-manhwa',
    status: 'reading',
    desc: 'Chung Myung, Pendekar Pedang Suci Gunung Hua, bangkit kembali 100 tahun kemudian untuk membangkitkan sektenya yang hancur.',
    coverUrl: '',
    createdAt: Date.now() - 300000
  },
  {
    id: 'item-4',
    title: 'The Beginning After The End',
    folderId: 'f-manhwa',
    status: 'reading',
    desc: 'Raja Grey bereinkarnasi sebagai Arthur Leywin di dunia sihir dan monster untuk memulai kehidupan baru.',
    coverUrl: '',
    createdAt: Date.now() - 200000
  },
  {
    id: 'item-5',
    title: 'Atomic Habits',
    folderId: 'f-novel',
    status: 'completed',
    desc: 'Perubahan kecil yang memberikan hasil luar biasa dalam membangun kebiasaan baik dan menghilangkan kebiasaan buruk.',
    coverUrl: '',
    createdAt: Date.now() - 100000
  },
  {
    id: 'item-6',
    title: 'Sousou no Frieren',
    folderId: 'f-anime',
    status: 'plan',
    desc: 'Penyihir elf Frieren merefleksikan arti kehidupan manusia setelah kelompok pahlawan berhasil mengalahkan Raja Iblis.',
    coverUrl: '',
    createdAt: Date.now() - 50000
  }
];

function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('📚 Reading List')
      .addItem('⚡ Inisialisasi Database Otomatis', 'setupDatabase')
      .addToUi();
  } catch (e) {}
  setupDatabase();
}

function setupDatabase() {
  const itemHeaders = ["ID", "Judul", "Folder_ID", "Status", "Deskripsi", "Cover_URL", "Dibuat_Pada"];
  const folderHeaders = ["ID", "Nama_Folder", "Warna_Ikon"];

  const itemSheet = getOrCreateSheet(SHEET_ITEMS, itemHeaders);
  const folderSheet = getOrCreateSheet(SHEET_FOLDERS, folderHeaders);

  // Jika masih kosong (hanya ada baris header), otomatis isi dummy data
  if (itemSheet.getLastRow() <= 1 && folderSheet.getLastRow() <= 1) {
    saveAllData(DUMMY_FOLDERS, DUMMY_ITEMS);
  }
}

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'getData';

    // Pastikan database dan data awal sudah siap otomatis
    setupDatabase();

    if (action === 'ping') {
      return createJsonResponse({
        success: true,
        message: 'Google Sheets Connected Successfully',
        timestamp: Date.now()
      });
    }

    if (action === 'getData' || action === 'sync_all') {
      const data = getAllData();
      return createJsonResponse({
        success: true,
        folders: data.folders,
        items: data.items,
        timestamp: Date.now()
      });
    }

    return createJsonResponse({
      success: true,
      message: 'Reading List API Active'
    });
  } catch (err) {
    return createJsonResponse({
      success: false,
      error: err.toString()
    });
  }
}

function doPost(e) {
  try {
    let body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }

    const action = body.action || 'save_all';

    if (action === 'save_all') {
      const folders = body.folders || [];
      const items = body.items || [];
      saveAllData(folders, items);
      return createJsonResponse({
        success: true,
        message: 'Berhasil menyinkronkan seluruh koleksi ke Google Sheet!',
        totalItems: items.length,
        totalFolders: folders.length,
        timestamp: Date.now()
      });
    }

    return createJsonResponse({
      success: false,
      error: 'Aksi tidak valid: ' + action
    });
  } catch (err) {
    return createJsonResponse({
      success: false,
      error: err.toString()
    });
  }
}

function getOrCreateSheet(sheetName, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#eef2ff").setFontColor("#1e1b4b");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getAllData() {
  const itemHeaders = ["ID", "Judul", "Folder_ID", "Status", "Deskripsi", "Cover_URL", "Dibuat_Pada"];
  const folderHeaders = ["ID", "Nama_Folder", "Warna_Ikon"];

  const itemSheet = getOrCreateSheet(SHEET_ITEMS, itemHeaders);
  const folderSheet = getOrCreateSheet(SHEET_FOLDERS, folderHeaders);

  const itemData = itemSheet.getDataRange().getValues();
  const folderData = folderSheet.getDataRange().getValues();

  const items = [];
  for (let i = 1; i < itemData.length; i++) {
    const row = itemData[i];
    if (row[0]) {
      items.push({
        id: String(row[0]),
        title: String(row[1] || ''),
        folderId: String(row[2] || ''),
        status: String(row[3] || 'plan'),
        desc: String(row[4] || ''),
        coverUrl: String(row[5] || ''),
        createdAt: row[6] ? Number(row[6]) : Date.now()
      });
    }
  }

  const folders = [];
  for (let i = 1; i < folderData.length; i++) {
    const row = folderData[i];
    if (row[0]) {
      folders.push({
        id: String(row[0]),
        name: String(row[1] || ''),
        color: String(row[2] || 'book')
      });
    }
  }

  return { folders, items };
}

function saveAllData(folders, items) {
  const itemHeaders = ["ID", "Judul", "Folder_ID", "Status", "Deskripsi", "Cover_URL", "Dibuat_Pada"];
  const folderHeaders = ["ID", "Nama_Folder", "Warna_Ikon"];

  const itemSheet = getOrCreateSheet(SHEET_ITEMS, itemHeaders);
  const folderSheet = getOrCreateSheet(SHEET_FOLDERS, folderHeaders);

  // Bersihkan data lama jika ada (sisakan header di baris 1)
  if (itemSheet.getLastRow() > 1) {
    itemSheet.deleteRows(2, itemSheet.getLastRow() - 1);
  }
  if (folderSheet.getLastRow() > 1) {
    folderSheet.deleteRows(2, folderSheet.getLastRow() - 1);
  }

  // Tulis Folder
  if (folders && folders.length > 0) {
    const folderRows = folders.map(f => [
      f.id,
      f.name,
      f.color || 'book'
    ]);
    folderSheet.getRange(2, 1, folderRows.length, folderHeaders.length).setValues(folderRows);
  }

  // Tulis Items
  if (items && items.length > 0) {
    const itemRows = items.map(it => [
      it.id,
      it.title,
      it.folderId || '',
      it.status || 'plan',
      it.desc || '',
      it.coverUrl || '',
      it.createdAt || Date.now()
    ]);
    itemSheet.getRange(2, 1, itemRows.length, itemHeaders.length).setValues(itemRows);
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
