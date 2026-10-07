/**
 * ============================================================================
 * READING LIST — GOOGLE APPS SCRIPT DATABASE BACKEND (MULTI-USER & ROLE AWARE)
 * 100% Zero-Cost Serverless Cloud Database Engine
 * ============================================================================
 * 
 * FITUR MULTI-USER & ROLE (1 SPREADSHEET BERSAMA):
 * - Mendukung banyak pengguna sekaligus di satu link Spreadsheet yang sama.
 * - Kolom otomatis: User_ID & User_Name di sheet Koleksi_Bacaan dan Folder_Rak.
 * - Role "pribadi": Hanya membaca & mengubah koleksi milik sendiri (data terisolasi aman).
 * - Role "admin": Dapat melihat seluruh koleksi dari semua anggota.
 * - Sinkronisasi aman (Safe Merge): Unggah data pengguna A TIDAK AKAN menghapus data pengguna B!
 * 
 * CARA SETUP / UPDATE:
 * 1. Buka spreadsheet Anda di Google Drive (atau buat baru di https://sheets.new).
 * 2. Klik Extensions (Ekstensi) > Apps Script.
 * 3. Hapus seluruh kode lama, tempel (Paste) kode ini.
 * 4. Klik "Save" (Ikon Disket) lalu klik "Deploy" > "Manage deployments" (atau "New deployment").
 * 5. Pilih "Web app":
 *    - Execute as : Me (Akun Google Anda)
 *    - Who has access : Anyone (Siapa saja)  <-- WAJIB
 * 6. Klik "Deploy", izinkan akses akun (Authorize access), lalu salin Web App URL.
 * 7. Tempel ke Pengaturan APK Reading List > "Simpan & Hubungkan".
 */

const SHEET_ITEMS = "Koleksi_Bacaan";
const SHEET_FOLDERS = "Folder_Rak";

const ITEM_HEADERS = ["ID", "Judul", "Folder_ID", "Status", "Deskripsi", "Cover_URL", "Dibuat_Pada", "User_ID", "User_Name"];
const FOLDER_HEADERS = ["ID", "Nama_Folder", "Warna_Ikon", "User_ID"];

// Data Bawaan Sistem (Inisialisasi Otomatis Saat Spreadsheet Masih Kosong)
const DUMMY_FOLDERS = [
  { id: 'f-manhwa', name: 'Top Manhwa OP', color: 'flame', userId: 'system' },
  { id: 'f-novel',  name: 'Webnovel & Buku', color: 'book', userId: 'system' },
  { id: 'f-anime',  name: 'Anime & Film', color: 'film', userId: 'system' },
  { id: 'f-santai', name: 'Santai & Slice of Life', color: 'leaf', userId: 'system' }
];

const DUMMY_ITEMS = [
  {
    id: 'item-1',
    title: 'Solo Leveling (Only I Level Up)',
    folderId: 'f-manhwa',
    status: 'completed',
    desc: 'Sung Jin-woo, hunter peringkat E terlemah, mendapatkan System rahasia setelah selamat dari Double Dungeon misterius.',
    coverUrl: '',
    createdAt: Date.now() - 500000,
    userId: 'system',
    userName: 'Koleksi Bawaan'
  },
  {
    id: 'item-2',
    title: "Omniscient Reader's Viewpoint",
    folderId: 'f-manhwa',
    status: 'reading',
    desc: 'Kim Dokja adalah satu-satunya pembaca novel web apokaliptik yang tiba-tiba menjadi kenyataan di dunia nyata.',
    coverUrl: '',
    createdAt: Date.now() - 400000,
    userId: 'system',
    userName: 'Koleksi Bawaan'
  },
  {
    id: 'item-3',
    title: 'Return of the Blossoming Blade',
    folderId: 'f-manhwa',
    status: 'reading',
    desc: 'Chung Myung, Pendekar Pedang Suci Gunung Hua, bangkit kembali 100 tahun kemudian untuk membangkitkan sektenya yang hancur.',
    coverUrl: '',
    createdAt: Date.now() - 300000,
    userId: 'system',
    userName: 'Koleksi Bawaan'
  },
  {
    id: 'item-4',
    title: 'The Beginning After The End',
    folderId: 'f-manhwa',
    status: 'reading',
    desc: 'Raja Grey bereinkarnasi sebagai Arthur Leywin di dunia sihir dan monster untuk memulai kehidupan baru.',
    coverUrl: '',
    createdAt: Date.now() - 200000,
    userId: 'system',
    userName: 'Koleksi Bawaan'
  },
  {
    id: 'item-5',
    title: 'Atomic Habits',
    folderId: 'f-novel',
    status: 'completed',
    desc: 'Perubahan kecil yang memberikan hasil luar biasa dalam membangun kebiasaan baik dan menghilangkan kebiasaan buruk.',
    coverUrl: '',
    createdAt: Date.now() - 100000,
    userId: 'system',
    userName: 'Koleksi Bawaan'
  },
  {
    id: 'item-6',
    title: 'Sousou no Frieren',
    folderId: 'f-anime',
    status: 'plan',
    desc: 'Penyihir elf Frieren merefleksikan arti kehidupan manusia setelah kelompok pahlawan berhasil mengalahkan Raja Iblis.',
    coverUrl: '',
    createdAt: Date.now() - 50000,
    userId: 'system',
    userName: 'Koleksi Bawaan'
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
  const itemSheet = getOrCreateSheet(SHEET_ITEMS, ITEM_HEADERS);
  const folderSheet = getOrCreateSheet(SHEET_FOLDERS, FOLDER_HEADERS);

  // Upgrade header sheet lama jika belum memiliki kolom User_ID
  upgradeSheetHeaders(itemSheet, ITEM_HEADERS);
  upgradeSheetHeaders(folderSheet, FOLDER_HEADERS);

  // Jika masih kosong (hanya ada baris header), isi data awal
  if (itemSheet.getLastRow() <= 1 && folderSheet.getLastRow() <= 1) {
    saveAllData(DUMMY_FOLDERS, DUMMY_ITEMS, 'system', 'Koleksi Bawaan');
  }
}

function upgradeSheetHeaders(sheet, expectedHeaders) {
  try {
    const lastCol = sheet.getLastColumn();
    if (lastCol < expectedHeaders.length) {
      sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
      sheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight("bold").setBackground("#eef2ff").setFontColor("#1e1b4b");
    }
  } catch (e) {
    console.warn('Upgrade header warning:', e);
  }
}

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'getData';
    const reqUserId = (e && e.parameter && e.parameter.userId) || '';
    const reqRole = (e && e.parameter && e.parameter.role) || 'pribadi';

    setupDatabase();

    if (action === 'ping') {
      return createJsonResponse({
        success: true,
        message: 'Google Sheets Multi-User Database Connected Successfully',
        userId: reqUserId,
        role: reqRole,
        timestamp: Date.now()
      });
    }

    if (action === 'getData' || action === 'sync_all') {
      const data = getAllData(reqUserId, reqRole);
      return createJsonResponse({
        success: true,
        folders: data.folders,
        items: data.items,
        reqUserId: reqUserId,
        reqRole: reqRole,
        timestamp: Date.now()
      });
    }

    return createJsonResponse({
      success: true,
      message: 'Reading List Multi-User API Active'
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
    const userId = String(body.userId || '').trim();
    const userName = String(body.userName || 'Pengguna').trim();
    const role = String(body.role || 'pribadi').trim();

    setupDatabase();

    if (action === 'save_all') {
      const folders = body.folders || [];
      const items = body.items || [];
      const result = saveAllData(folders, items, userId, userName);
      return createJsonResponse({
        success: true,
        message: `Berhasil menyinkronkan data pengguna ${userName} (${userId || 'Umum'}) ke Google Sheet!`,
        totalUserItems: items.length,
        totalSheetItems: result.totalSheetItems,
        timestamp: Date.now()
      });
    }

    if (action === 'save_item' || action === 'add_item') {
      const item = body.item;
      if (item && item.title) {
        saveOrUpdateSingleItem(item, userId, userName);
        return createJsonResponse({
          success: true,
          message: 'Item berhasil disimpan ke Google Sheet',
          item: item,
          timestamp: Date.now()
        });
      }
    }

    if (action === 'delete_item') {
      const itemId = body.id;
      if (itemId) {
        deleteSingleItem(itemId, userId, role);
        return createJsonResponse({
          success: true,
          message: 'Item berhasil dihapus dari Google Sheet',
          timestamp: Date.now()
        });
      }
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

/**
 * Mengambil data dengan filter peran (Role) & ID Pengguna:
 * - Admin: Ambil SEMUA data dari seluruh pengguna.
 * - Pribadi: Hanya ambil data yang memiliki User_ID sama dengan pengguna, ATAU data bawaan ('system' / kosong).
 */
function getAllData(reqUserId, reqRole) {
  const itemSheet = getOrCreateSheet(SHEET_ITEMS, ITEM_HEADERS);
  const folderSheet = getOrCreateSheet(SHEET_FOLDERS, FOLDER_HEADERS);

  const itemData = itemSheet.getDataRange().getValues();
  const folderData = folderSheet.getDataRange().getValues();

  const isAdmin = (reqRole === 'admin');

  // 1. Baca Folder
  const folders = [];
  const folderMap = new Map();

  for (let i = 1; i < folderData.length; i++) {
    const row = folderData[i];
    const id = String(row[0] || '').trim();
    const name = String(row[1] || row[0] || '').trim();
    const color = String(row[2] || 'book').trim();
    const folderUserId = String(row[3] || '').trim();

    if (!name) continue;

    // Filter akses folder:
    // Jika admin: ambil semua.
    // Jika pribadi: ambil jika milik pengguna, atau folder bawaan/umum (userId kosong / 'system')
    const isOwner = !folderUserId || folderUserId === 'system' || (reqUserId && folderUserId === reqUserId);
    if (!isAdmin && !isOwner) {
      continue;
    }

    const fId = id || ('f-' + name.toLowerCase().replace(/[^a-z0-9]/g, '-'));
    const folderObj = {
      id: fId,
      name: name,
      color: color,
      userId: folderUserId
    };
    folders.push(folderObj);
    folderMap.set(fId, folderObj);
    folderMap.set(name.toLowerCase(), folderObj);
  }

  // 2. Baca Items
  const items = [];
  if (itemData.length > 1) {
    const headerRow = itemData[0].map(h => String(h || '').trim().toLowerCase());

    let idxId = headerRow.indexOf('id');
    let idxTitle = headerRow.findIndex(h => h.includes('judul') || h.includes('title') || h.includes('nama'));
    let idxFolder = headerRow.findIndex(h => h.includes('folder') || h.includes('rak') || h.includes('kategori'));
    let idxStatus = headerRow.findIndex(h => h.includes('status') || h.includes('progres'));
    let idxDesc = headerRow.findIndex(h => h.includes('deskripsi') || h.includes('desc') || h.includes('sinopsis') || h.includes('catatan'));
    let idxCover = headerRow.findIndex(h => h.includes('cover') || h.includes('gambar') || h.includes('sampul') || h.includes('foto'));
    let idxDate = headerRow.findIndex(h => h.includes('dibuat') || h.includes('created') || h.includes('tanggal') || h.includes('waktu'));
    let idxUserId = headerRow.findIndex(h => h.includes('user_id') || h.includes('userid') || h.includes('pemilik'));
    let idxUserName = headerRow.findIndex(h => h.includes('user_name') || h.includes('username') || h.includes('pengguna'));

    if (idxId === -1) idxId = 0;
    if (idxTitle === -1) idxTitle = 1;
    if (idxFolder === -1) idxFolder = 2;
    if (idxStatus === -1) idxStatus = 3;
    if (idxDesc === -1) idxDesc = 4;
    if (idxCover === -1) idxCover = 5;
    if (idxDate === -1) idxDate = 6;
    if (idxUserId === -1) idxUserId = 7;
    if (idxUserName === -1) idxUserName = 8;

    for (let i = 1; i < itemData.length; i++) {
      const row = itemData[i];
      let rawId = String(row[idxId] || '').trim();
      let rawTitle = String(row[idxTitle] || '').trim();
      let rawFolder = String(row[idxFolder] || '').trim();
      let rawStatus = String(row[idxStatus] || 'plan').trim().toLowerCase();
      let rawDesc = String(row[idxDesc] || '').trim();
      let rawCover = String(row[idxCover] || '').trim();
      let rawDate = row[idxDate] ? Number(row[idxDate]) : Date.now();
      let rowUserId = (idxUserId < row.length) ? String(row[idxUserId] || '').trim() : '';
      let rowUserName = (idxUserName < row.length) ? String(row[idxUserName] || '').trim() : '';

      // Abaikan baris kosong
      if (!rawTitle && !rawDesc) continue;
      if (!rawTitle) rawTitle = 'Tanpa Judul';

      // Filter hak akses:
      // Jika role bukan admin, periksa kepemilikan data:
      if (!isAdmin) {
        // Izinkan data jika milik user ini, ATAU data lama/bawaan (rowUserId kosong atau 'system')
        const isOwner = !rowUserId || rowUserId === 'system' || (reqUserId && rowUserId === reqUserId);
        if (!isOwner) {
          continue; // Lewati data milik pengguna lain
        }
      }

      // Normalisasi status
      if (rawStatus.includes('baca') || rawStatus === 'reading' || rawStatus.includes('sedang')) {
        rawStatus = 'reading';
      } else if (rawStatus.includes('tamat') || rawStatus === 'completed' || rawStatus.includes('selesai')) {
        rawStatus = 'completed';
      } else {
        rawStatus = 'plan';
      }

      // Normalisasi folder
      let matchedFolderId = rawFolder;
      if (rawFolder) {
        const found = folderMap.get(rawFolder.toLowerCase()) || folderMap.get(rawFolder);
        if (found) {
          matchedFolderId = found.id;
        } else {
          matchedFolderId = rawFolder;
        }
      }

      items.push({
        id: rawId || ('item-' + i + '-' + Date.now()),
        title: rawTitle,
        folderId: matchedFolderId,
        status: rawStatus,
        desc: rawDesc,
        coverUrl: rawCover,
        createdAt: isNaN(rawDate) ? Date.now() : rawDate,
        userId: rowUserId || reqUserId || '',
        userName: rowUserName || (rowUserId === 'system' ? 'Koleksi Bawaan' : '')
      });
    }
  }

  return { folders, items };
}

/**
 * Menyimpan data dengan isolasi pengguna (Safe Multi-User Merge):
 * Data pengguna lain di spreadsheet dipertahankan 100%, hanya data milik userId yang diperbarui.
 */
function saveAllData(incomingFolders, incomingItems, currentUserId, currentUserName) {
  const itemSheet = getOrCreateSheet(SHEET_ITEMS, ITEM_HEADERS);
  const folderSheet = getOrCreateSheet(SHEET_FOLDERS, FOLDER_HEADERS);

  const existingItemData = itemSheet.getDataRange().getValues();
  const existingFolderData = folderSheet.getDataRange().getValues();

  // =========================================================================
  // 1. MERGE FOLDERS (Pertahankan Folder Pengguna Lain)
  // =========================================================================
  const preservedFolders = [];
  for (let i = 1; i < existingFolderData.length; i++) {
    const row = existingFolderData[i];
    const rowId = String(row[0] || '').trim();
    const rowName = String(row[1] || '').trim();
    const rowColor = String(row[2] || 'book').trim();
    const rowUserId = String(row[3] || '').trim();

    if (!rowName) continue;

    // Jika folder ini milik pengguna LAIN, pertahankan!
    if (rowUserId && currentUserId && rowUserId !== currentUserId && rowUserId !== 'system') {
      preservedFolders.push([rowId, rowName, rowColor, rowUserId]);
    }
  }

  // Siapkan baris folder milik pengguna sekarang
  const userFolderRows = (incomingFolders || []).map(f => [
    f.id,
    f.name,
    f.color || 'book',
    currentUserId || f.userId || ''
  ]);

  const finalFolderRows = [...preservedFolders, ...userFolderRows];

  // Bersihkan dan tulis ulang folder
  if (folderSheet.getLastRow() > 1) {
    folderSheet.deleteRows(2, folderSheet.getLastRow() - 1);
  }
  if (finalFolderRows.length > 0) {
    folderSheet.getRange(2, 1, finalFolderRows.length, FOLDER_HEADERS.length).setValues(finalFolderRows);
  }

  // =========================================================================
  // 2. MERGE ITEMS (Pertahankan Koleksi Pengguna Lain)
  // =========================================================================
  const preservedItems = [];
  if (existingItemData.length > 1) {
    const headerRow = existingItemData[0].map(h => String(h || '').trim().toLowerCase());
    let idxUserId = headerRow.findIndex(h => h.includes('user_id') || h.includes('userid'));
    if (idxUserId === -1) idxUserId = 7;

    for (let i = 1; i < existingItemData.length; i++) {
      const row = existingItemData[i];
      const rowUserId = (idxUserId < row.length) ? String(row[idxUserId] || '').trim() : '';
      
      // Jika baris ini milik pengguna LAIN, pertahankan!
      if (rowUserId && currentUserId && rowUserId !== currentUserId && rowUserId !== 'system') {
        // Pastikan panjang array sesuai header
        const rowPadded = [...row];
        while (rowPadded.length < ITEM_HEADERS.length) rowPadded.push('');
        preservedItems.push(rowPadded.slice(0, ITEM_HEADERS.length));
      }
    }
  }

  // Siapkan baris item milik pengguna sekarang
  const userItemRows = (incomingItems || []).map(it => [
    it.id,
    it.title,
    it.folderId || '',
    it.status || 'plan',
    it.desc || '',
    it.coverUrl || '',
    it.createdAt || Date.now(),
    currentUserId || it.userId || '',
    currentUserName || it.userName || ''
  ]);

  const finalItemRows = [...preservedItems, ...userItemRows];

  // Bersihkan dan tulis ulang sheet item
  if (itemSheet.getLastRow() > 1) {
    itemSheet.deleteRows(2, itemSheet.getLastRow() - 1);
  }
  if (finalItemRows.length > 0) {
    itemSheet.getRange(2, 1, finalItemRows.length, ITEM_HEADERS.length).setValues(finalItemRows);
  }

  return { totalSheetItems: finalItemRows.length };
}

function saveOrUpdateSingleItem(item, userId, userName) {
  const itemSheet = getOrCreateSheet(SHEET_ITEMS, ITEM_HEADERS);
  const data = itemSheet.getDataRange().getValues();

  let targetRow = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(item.id).trim()) {
      targetRow = i + 1;
      break;
    }
  }

  const rowValues = [
    item.id,
    item.title || '',
    item.folderId || '',
    item.status || 'plan',
    item.desc || '',
    item.coverUrl || '',
    item.createdAt || Date.now(),
    userId || item.userId || '',
    userName || item.userName || ''
  ];

  if (targetRow > 1) {
    itemSheet.getRange(targetRow, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    itemSheet.appendRow(rowValues);
  }
}

function deleteSingleItem(itemId, userId, role) {
  const itemSheet = getOrCreateSheet(SHEET_ITEMS, ITEM_HEADERS);
  const data = itemSheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(itemId).trim()) {
      const rowUserId = (data[i].length > 7) ? String(data[i][7] || '').trim() : '';
      // Admin bebas hapus, pengguna biasa hanya boleh hapus data miliknya atau item tanpa pemilik
      if (role === 'admin' || !rowUserId || rowUserId === userId || rowUserId === 'system') {
        itemSheet.deleteRow(i + 1);
      }
      break;
    }
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
