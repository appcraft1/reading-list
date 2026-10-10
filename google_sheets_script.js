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
const SHEET_USERS = "Pengguna_Akun";
const SHEET_CONFIG = "Konfigurasi_Sistem";

const ITEM_HEADERS = ["ID", "Judul", "Folder_ID", "Status", "Deskripsi", "Cover_URL", "Dibuat_Pada", "User_ID", "User_Name", "Sub_Items"];
const FOLDER_HEADERS = ["ID", "Nama_Folder", "Warna_Ikon", "User_ID", "Icon_Key", "Setup_Type"];
const USER_HEADERS = ["User_ID", "Username", "Nama", "Password_Hash", "Role", "Dibuat_Pada", "PIN_Keamanan"];
const CONFIG_HEADERS = ["Kunci_Pengaturan", "Nilai", "Keterangan", "Terakhir_Diubah"];

// Data Bawaan Sistem (Inisialisasi Otomatis Saat Spreadsheet Masih Kosong)
const DUMMY_FOLDERS = [
  { id: 'f-manhwa', name: 'Top Manhwa OP', color: 'flame', userId: 'system', icon: 'flame' },
  { id: 'f-novel',  name: 'Webnovel & Buku', color: 'book', userId: 'system', icon: 'book' },
  { id: 'f-anime',  name: 'Anime & Film', color: 'film', userId: 'system', icon: 'film' },
  { id: 'f-santai', name: 'Santai & Slice of Life', color: 'leaf', userId: 'system', icon: 'leaf' }
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
  const userSheet = getOrCreateSheet(SHEET_USERS, USER_HEADERS);
  const configSheet = getOrCreateSheet(SHEET_CONFIG, CONFIG_HEADERS);

  // Upgrade header sheet lama jika belum lengkap
  upgradeSheetHeaders(itemSheet, ITEM_HEADERS);
  upgradeSheetHeaders(folderSheet, FOLDER_HEADERS);
  upgradeSheetHeaders(userSheet, USER_HEADERS);
  upgradeSheetHeaders(configSheet, CONFIG_HEADERS);

  // Inisialisasi default master password jika sheet konfigurasi kosong
  if (configSheet.getLastRow() <= 1) {
    configSheet.appendRow([
      'master_password',
      'admin123',
      'Kata Sandi Master Menu Pengaturan APK (Dapat diganti langsung di sini)',
      new Date().toISOString()
    ]);
  } else {
    // Pastikan baris master_password ada
    const configData = configSheet.getDataRange().getValues();
    let hasMasterPwd = false;
    for (let i = 1; i < configData.length; i++) {
      if (String(configData[i][0] || '').trim().toLowerCase() === 'master_password') {
        hasMasterPwd = true;
        break;
      }
    }
    if (!hasMasterPwd) {
      configSheet.appendRow([
        'master_password',
        'admin123',
        'Kata Sandi Master Menu Pengaturan APK (Dapat diganti langsung di sini)',
        new Date().toISOString()
      ]);
    }
  }

  // Jika masih kosong (hanya ada baris header), isi data awal
  if (itemSheet.getLastRow() <= 1 && folderSheet.getLastRow() <= 1) {
    saveAllData(DUMMY_FOLDERS, DUMMY_ITEMS, 'system', 'Koleksi Bawaan');
  }
}

function getMasterPassword() {
  try {
    const configSheet = getOrCreateSheet(SHEET_CONFIG, CONFIG_HEADERS);
    const data = configSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const key = String(data[i][0] || '').trim().toLowerCase();
      if (key === 'master_password') {
        const val = String(data[i][1] || '').trim();
        return val || 'admin123';
      }
    }
  } catch (e) {
    console.warn('Gagal membaca master_password:', e);
  }
  return 'admin123';
}

function updateMasterPasswordInSheet(newPassword) {
  try {
    const configSheet = getOrCreateSheet(SHEET_CONFIG, CONFIG_HEADERS);
    const data = configSheet.getDataRange().getValues();
    const cleanPwd = String(newPassword || '').trim();
    for (let i = 1; i < data.length; i++) {
      const key = String(data[i][0] || '').trim().toLowerCase();
      if (key === 'master_password') {
        configSheet.getRange(i + 1, 2).setValue(cleanPwd);
        configSheet.getRange(i + 1, 4).setValue(new Date().toISOString());
        return true;
      }
    }
    configSheet.appendRow(['master_password', cleanPwd, 'Kata Sandi Master Menu Pengaturan APK', new Date().toISOString()]);
    return true;
  } catch (e) {
    console.warn('Gagal update master_password:', e);
    return false;
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
        masterPassword: getMasterPassword(),
        timestamp: Date.now()
      });
    }

    if (action === 'verify_settings_pwd') {
      const candidate = String((e && e.parameter && e.parameter.password) || '').trim();
      const currentMaster = getMasterPassword();
      return createJsonResponse({
        success: true,
        valid: (candidate === currentMaster),
        masterPassword: currentMaster,
        timestamp: Date.now()
      });
    }

    if (action === 'getData' || action === 'sync_all') {
      const data = getAllData(reqUserId, reqRole);
      return createJsonResponse({
        success: true,
        folders: data.folders,
        items: data.items,
        pin: data.userPin || '',
        masterPassword: getMasterPassword(),
        reqUserId: reqUserId,
        reqRole: reqRole,
        timestamp: Date.now()
      });
    }

    return createJsonResponse({
      success: true,
      message: 'Reading List Multi-User API Active',
      masterPassword: getMasterPassword()
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

    // =========================================================================
    // GEMINI VISION PROXY (SERVERLESS BACKEND UNTUK AUTH / SERVICE ACCOUNT KEY)
    // =========================================================================
    if (action === 'gemini_vision_proxy') {
      const apiKey = String(body.apiKey || '').trim();
      const base64DataUrl = String(body.dataUrl || '');
      const mimeType = String(body.mimeType || 'image/jpeg');
      const base64Pure = base64DataUrl.includes(',') ? base64DataUrl.split(',')[1] : base64DataUrl;

      if (!apiKey) {
        return createJsonResponse({ success: false, error: 'API Key belum diisi.' });
      }

      const systemPrompt = "Anda adalah AI Vision Expert spesialis mengekstrak item ceklis dari screenshot rekomendasi anime, manga, novel, menu, atau daftar belanja.\nEkstrak daftar judul bersih dalam format JSON array:\n[\n  {\n    \"title\": \"Nama Item / Judul Bersih\",\n    \"suggestedFolder\": \"Kategori / Nama Rak\"\n  }\n]";

      const models = [
        'gemini-3.8-flash',
        'gemini-3.7-flash',
        'gemini-3.6-flash',
        'gemini-3.1-pro',
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-1.5-flash'
      ];

      let lastError = '';
      for (let m = 0; m < models.length; m++) {
        const modelName = models[m];
        
        // Mode 1: Header x-goog-api-key (Standar Google untuk AQ. Authorization Key)
        // Mode 2: Query param ?key= (Standar legacy untuk AIza API Key)
        const authConfigs = [
          {
            url: 'https://generativelanguage.googleapis.com/v1beta/models/' + modelName + ':generateContent',
            headers: { 'x-goog-api-key': apiKey }
          },
          {
            url: 'https://generativelanguage.googleapis.com/v1beta/models/' + modelName + ':generateContent?key=' + encodeURIComponent(apiKey),
            headers: {}
          }
        ];

        for (let a = 0; a < authConfigs.length; a++) {
          try {
            const conf = authConfigs[a];
            const payload = {
              contents: [{
                parts: [
                  { text: systemPrompt + '\n\nEkstrak seluruh item dari screenshot ini ke dalam format JSON.' },
                  { inlineData: { mimeType: mimeType, data: base64Pure } }
                ]
              }]
            };

            const options = {
              method: 'post',
              contentType: 'application/json',
              payload: JSON.stringify(payload),
              headers: conf.headers,
              muteHttpExceptions: true
            };

            const res = UrlFetchApp.fetch(conf.url, options);
            const code = res.getResponseCode();
            const textRes = res.getContentText();

            if (code === 200) {
              const parsedRes = JSON.parse(textRes);
              let rawText = (parsedRes.candidates && parsedRes.candidates[0] && parsedRes.candidates[0].content && parsedRes.candidates[0].content.parts && parsedRes.candidates[0].content.parts[0] && parsedRes.candidates[0].content.parts[0].text) || '';
              rawText = rawText.replace(/```json/gi, '').replace(/```/gi, '').trim();
              const items = JSON.parse(rawText);
              if (Array.isArray(items) && items.length > 0) {
                return createJsonResponse({ success: true, items: items, modelUsed: modelName });
              }
            } else {
              lastError = 'HTTP ' + code + ': ' + textRes;
            }
          } catch (fetchErr) {
            lastError = fetchErr.toString();
          }
        }
      }

      return createJsonResponse({ success: false, error: lastError || 'Gagal memindai gambar via Gemini.' });
    }

    // =========================================================================
    // AUTH: REGISTRASI & LOGIN AKUN PENGGUNA
    // =========================================================================
    if (action === 'auth_register') {
      const username = String(body.username || '').trim().toLowerCase();
      const password = String(body.password || '').trim();
      const name = String(body.name || username).trim();
      const userRole = String(body.role || 'pribadi').trim();

      if (!username || !password) {
        return createJsonResponse({ success: false, error: 'Username dan PIN / Password wajib diisi.' });
      }

      const userSheet = getOrCreateSheet(SHEET_USERS, USER_HEADERS);
      const userData = userSheet.getDataRange().getValues();

      for (let i = 1; i < userData.length; i++) {
        if (String(userData[i][1] || '').trim().toLowerCase() === username) {
          return createJsonResponse({ success: false, error: 'Username sudah digunakan oleh akun lain. Silakan pakai username berbeda.' });
        }
      }

      const newUserId = 'usr_' + username.replace(/[^a-z0-9]/g, '') + '_' + Math.random().toString(36).substring(2, 6);
      userSheet.appendRow([newUserId, username, name, password, userRole, Date.now()]);

      return createJsonResponse({
        success: true,
        message: 'Registrasi akun berhasil!',
        user: { userId: newUserId, username: username, name: name, role: userRole }
      });
    }

    if (action === 'auth_login') {
      const username = String(body.username || '').trim().toLowerCase();
      const password = String(body.password || '').trim();

      const userSheet = getOrCreateSheet(SHEET_USERS, USER_HEADERS);
      const userData = userSheet.getDataRange().getValues();

      for (let i = 1; i < userData.length; i++) {
        const rowUsername = String(userData[i][1] || '').trim().toLowerCase();
        const rowPassword = String(userData[i][3] || '').trim();
        if (rowUsername === username) {
          if (rowPassword === password) {
            const foundUser = {
              userId: String(userData[i][0] || '').trim(),
              username: rowUsername,
              name: String(userData[i][2] || rowUsername).trim(),
              role: String(userData[i][4] || 'pribadi').trim()
            };
            return createJsonResponse({
              success: true,
              message: 'Login berhasil!',
              user: foundUser
            });
          } else {
            return createJsonResponse({ success: false, error: 'PIN / Password salah.' });
          }
        }
      }

      return createJsonResponse({ success: false, error: 'Akun dengan username tersebut belum terdaftar. Silakan pilih tab Daftar Akun.' });
    }

    // =========================================================================
    // MASTER PASSWORD PENGATURAN APK (KONFIGURASI GLOBAL SPREADSHEET)
    // =========================================================================
    if (action === 'verify_settings_pwd') {
      const candidate = String(body.password || '').trim();
      const currentMaster = getMasterPassword();
      return createJsonResponse({
        success: true,
        valid: (candidate === currentMaster),
        masterPassword: currentMaster,
        timestamp: Date.now()
      });
    }

    if (action === 'update_master_password') {
      const newPwd = String(body.password || '').trim();
      if (!newPwd) {
        return createJsonResponse({ success: false, error: 'Kata sandi master baru tidak boleh kosong.' });
      }
      updateMasterPasswordInSheet(newPwd);
      return createJsonResponse({
        success: true,
        message: 'Kata sandi master berhasil diubah di Google Sheet!',
        masterPassword: newPwd,
        timestamp: Date.now()
      });
    }

    if (action === 'update_pin') {
      const pinVal = String(body.pin || '').trim();
      const userSheet = getOrCreateSheet(SHEET_USERS, USER_HEADERS);
      const userData = userSheet.getDataRange().getValues();
      let updated = false;

      for (let i = 1; i < userData.length; i++) {
        const rowUid = String(userData[i][0] || '').trim();
        if (rowUid === userId || (!rowUid && userData[i][1] === userName)) {
          // Pastikan baris memiliki kolom ke-7 (PIN_Keamanan)
          userSheet.getRange(i + 1, 7).setValue(pinVal);
          updated = true;
          break;
        }
      }

      return createJsonResponse({
        success: true,
        message: 'PIN Keamanan berhasil diperbarui di Google Sheet!',
        pin: pinVal,
        timestamp: Date.now()
      });
    }

    if (action === 'save_all') {
      const folders = body.folders || [];
      const items = body.items || [];
      const pinVal = body.pin !== undefined ? String(body.pin).trim() : null;

      if (pinVal !== null && userId) {
        try {
          const userSheet = getOrCreateSheet(SHEET_USERS, USER_HEADERS);
          const userData = userSheet.getDataRange().getValues();
          for (let i = 1; i < userData.length; i++) {
            const rowUid = String(userData[i][0] || '').trim();
            if (rowUid === userId) {
              userSheet.getRange(i + 1, 7).setValue(pinVal);
              break;
            }
          }
        } catch (e) {
          console.warn('Gagal sinkron PIN ke userSheet:', e);
        }
      }

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
      icon: (row.length > 4 && row[4]) ? String(row[4]).trim() : (color || 'book'),
      setupType: (row.length > 5 && row[5]) ? String(row[5]).trim() : 'visual',
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
    let idxSubItems = headerRow.findIndex(h => h.includes('sub_items') || h.includes('subitems') || h.includes('bumbu') || h.includes('bahan'));

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
      let rawSubItems = [];
      if (idxSubItems !== -1 && idxSubItems < row.length && row[idxSubItems]) {
        try {
          rawSubItems = JSON.parse(String(row[idxSubItems]));
        } catch (e) {
          rawSubItems = [];
        }
      }

      // Abaikan baris kosong
      if (!rawTitle && !rawDesc) continue;
      if (!rawTitle) rawTitle = 'Tanpa Judul';

      // Filter hak akses:
      // Jika role bukan admin, periksa kepemilikan data:
      if (!isAdmin) {
        // Mode Pribadi: Hanya ambil data milik user ini (reqUserId), atau template bawaan ('system')
        const isOwner = (reqUserId && rowUserId === reqUserId) || rowUserId === 'system';
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
        subItems: Array.isArray(rawSubItems) ? rawSubItems : [],
        createdAt: isNaN(rawDate) ? Date.now() : rawDate,
        userId: rowUserId || reqUserId || '',
        userName: rowUserName || (rowUserId === 'system' ? 'Koleksi Bawaan' : '')
      });
    }
  }

  // 3. Baca PIN Keamanan Pengguna jika ada
  let userPin = '';
  try {
    const userSheet = getOrCreateSheet(SHEET_USERS, USER_HEADERS);
    const userData = userSheet.getDataRange().getValues();
    for (let i = 1; i < userData.length; i++) {
      const rowUid = String(userData[i][0] || '').trim();
      const rowUname = String(userData[i][1] || '').trim().toLowerCase();
      if ((reqUserId && rowUid === reqUserId) || (reqUserId && rowUname === reqUserId.toLowerCase())) {
        if (userData[i].length > 6 && userData[i][6] !== undefined && userData[i][6] !== '') {
          userPin = String(userData[i][6]).trim();
        }
        break;
      }
    }
  } catch (e) {
    console.warn('Gagal membaca PIN dari userSheet:', e);
  }

  return { folders, items, userPin };
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
    const rowIcon = (row.length > 4 && row[4]) ? String(row[4]).trim() : (rowColor || 'book');

    if (!rowName) continue;

    // Jika folder ini milik pengguna LAIN, pertahankan!
    if (rowUserId && currentUserId && rowUserId !== currentUserId && rowUserId !== 'system') {
      const rowSetup = (row.length > 5 && row[5]) ? String(row[5]).trim() : 'visual';
      preservedFolders.push([rowId, rowName, rowColor, rowUserId, rowIcon, rowSetup]);
    }
  }

  // Siapkan baris folder milik pengguna sekarang
  const userFolderRows = (incomingFolders || []).map(f => [
    f.id,
    f.name,
    f.color || 'book',
    currentUserId || f.userId || '',
    f.icon || f.color || 'book',
    f.setupType || 'visual'
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
    currentUserName || it.userName || '',
    JSON.stringify(it.subItems || [])
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
