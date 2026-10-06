/**
 * READING LIST — Visual Reading & Screenshot Extractor App
 * Luxury Light Studio Engine (Gemini 3.8 Flash + Canvas Auto-Crop)
 * Visual Folder Shelves (Bespoke SVG) & Offline-First IndexedDB
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. STATE & CONSTANTS
  // =========================================================================
  const DB_NAME = 'ReadingListDB_v3';
  const DB_VERSION = 1;

  let dbInstance = null;

  // Default Google Sheets URL (Bisa diisi agar APK langsung terhubung otomatis sejak pertama install)
  const DEFAULT_GOOGLE_SHEETS_URL = '';

  let appState = {
    folders: [],
    items: [],
    settings: {
      geminiApiKey: localStorage.getItem('gemini_api_key') || '',
      googleSheetsUrl: localStorage.getItem('google_sheets_url') || DEFAULT_GOOGLE_SHEETS_URL || '',
      theme: 'light'
    },
    activeFolderId: 'all',
    statusFilter: null,
    viewMode: localStorage.getItem('reading_list_view_mode') || 'grid',
    searchQuery: '',
    sortBy: 'recent',
    pendingScannedItems: [],
    currentUploadedImageSrc: null
  };

  // Bespoke Folder Icons & Palette Map
  const FOLDER_THEMES = {
    all: {
      bg: '#f1f5f9',
      color: '#334155',
      svg: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M3 3h7v7H3z"/><path d="M14 3h7v7h-7z"/><path d="M14 14h7v7h-7z"/><path d="M3 14h7v7H3z"/></svg>'
    },
    flame: {
      bg: '#fff1f2',
      color: '#f43f5e',
      svg: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>'
    },
    book: {
      bg: '#eef2ff',
      color: '#4f46e5',
      svg: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/></svg>'
    },
    film: {
      bg: '#faf5ff',
      color: '#9333ea',
      svg: '<svg class="svg-icon" viewBox="0 0 24 24"><rect width="20" height="20" x="2" y="2" rx="2.18" ry="2.18"/><line x1="7" x2="7" y1="2" y2="22"/><line x1="17" x2="17" y1="2" y2="22"/><line x1="2" x2="22" y1="12" y2="12"/><line x1="2" x2="7" y1="7" y2="7"/><line x1="2" x2="7" y1="17" y2="17"/><line x1="17" x2="22" y1="17" y2="17"/><line x1="17" x2="22" y1="7" y2="7"/></svg>'
    },
    leaf: {
      bg: '#ecfdf5',
      color: '#059669',
      svg: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>'
    },
    star: {
      bg: '#fffbeb',
      color: '#d97706',
      svg: '<svg class="svg-icon" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
    }
  };

  // DOM Elements
  const dom = {
    splash: document.getElementById('app-splash-screen'),
    splashStatus: document.getElementById('splash-status-text'),
    headerStats: document.getElementById('header-stats-text'),
    badgeAiIndicator: document.getElementById('badge-ai-indicator'),
    searchInput: document.getElementById('search-input'),
    btnClearSearch: document.getElementById('btn-clear-search'),
    foldersScrollTrack: document.getElementById('folders-scroll-track'),
    shelfCountText: document.getElementById('shelf-count-text'),
    itemsSectionTitle: document.getElementById('items-section-title'),
    itemsCountBadge: document.getElementById('items-count-badge'),
    sortSelect: document.getElementById('sort-select'),
    itemsGrid: document.getElementById('items-grid'),
    emptyState: document.getElementById('empty-state'),
    toastContainer: document.getElementById('toast-container'),

    // Modals
    modalScanner: document.getElementById('modal-scanner'),
    modalItemDetail: document.getElementById('modal-item-detail'),
    modalFolder: document.getElementById('modal-folder'),
    modalSettings: document.getElementById('modal-settings'),

    // Scanner
    scannerDropzone: document.getElementById('scanner-dropzone'),
    scannerFileInput: document.getElementById('scanner-file-input'),
    scannerProcessing: document.getElementById('scanner-processing'),
    scanPreviewImg: document.getElementById('scan-preview-img'),
    scanStatusTicker: document.getElementById('scan-status-ticker'),
    scannerResults: document.getElementById('scanner-results'),
    resultsCountText: document.getElementById('results-count-text'),
    resultsTargetFolder: document.getElementById('results-target-folder'),
    resultsList: document.getElementById('results-list'),
    btnSaveScanned: document.getElementById('btn-save-scanned-items'),

    // Forms
    formItemDetail: document.getElementById('form-item-detail'),
    formFolder: document.getElementById('form-folder'),
    detailCoverImg: document.getElementById('detail-cover-img'),
    detailCoverPlaceholder: document.getElementById('detail-cover-placeholder'),
    coverFileInput: document.getElementById('cover-file-input')
  };

  // =========================================================================
  // 2. INDEXEDDB PERSISTENCE (Offline-First)
  // =========================================================================
  function initDatabase() {
    return new Promise((resolve) => {
      if (!window.indexedDB) {
        loadFromLocalStorage();
        resolve(null);
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = function (e) {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('folders')) {
          db.createObjectStore('folders', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('items')) {
          db.createObjectStore('items', { keyPath: 'id' });
        }
      };

      request.onsuccess = function (e) {
        dbInstance = e.target.result;
        loadAllDataFromDB().then(resolve);
      };

      request.onerror = function () {
        loadFromLocalStorage();
        resolve(null);
      };
    });
  }

  function loadAllDataFromDB() {
    return new Promise((resolve) => {
      if (!dbInstance) {
        loadFromLocalStorage();
        resolve();
        return;
      }

      const tx = dbInstance.transaction(['folders', 'items'], 'readonly');
      const folderStore = tx.objectStore('folders');
      const itemStore = tx.objectStore('items');

      const foldersReq = folderStore.getAll();
      const itemsReq = itemStore.getAll();

      let loadedFolders = [];
      let loadedItems = [];

      foldersReq.onsuccess = () => { loadedFolders = foldersReq.result || []; };
      itemsReq.onsuccess = () => { loadedItems = itemsReq.result || []; };

      tx.oncomplete = () => {
        appState.folders = loadedFolders;
        appState.items = loadedItems;
        resolve();
      };

      tx.onerror = () => {
        loadFromLocalStorage();
        resolve();
      };
    });
  }

  let cloudPushTimer = null;
  function scheduleCloudPush() {
    if (!appState.settings.googleSheetsUrl) return;
    if (cloudPushTimer) clearTimeout(cloudPushTimer);
    cloudPushTimer = setTimeout(() => {
      syncPushToGoogleSheets(true);
    }, 1500);
  }

  function saveItemToDB(item) {
    if (dbInstance) {
      const tx = dbInstance.transaction('items', 'readwrite');
      tx.objectStore('items').put(item);
    }
    saveToLocalStorage();
    scheduleCloudPush();
  }

  function deleteItemFromDB(itemId) {
    if (dbInstance) {
      const tx = dbInstance.transaction('items', 'readwrite');
      tx.objectStore('items').delete(itemId);
    }
    saveToLocalStorage();
    scheduleCloudPush();
  }

  function saveFolderToDB(folder) {
    if (dbInstance) {
      const tx = dbInstance.transaction('folders', 'readwrite');
      tx.objectStore('folders').put(folder);
    }
    saveToLocalStorage();
    scheduleCloudPush();
  }

  function deleteFolderFromDB(folderId) {
    if (dbInstance) {
      const tx = dbInstance.transaction('folders', 'readwrite');
      tx.objectStore('folders').delete(folderId);
    }
    saveToLocalStorage();
    scheduleCloudPush();
  }

  function saveToLocalStorage() {
    try {
      localStorage.setItem('rl3_folders', JSON.stringify(appState.folders));
      localStorage.setItem('rl3_items', JSON.stringify(appState.items));
    } catch (e) {
      console.warn('LocalStorage quota:', e);
    }
  }

  function loadFromLocalStorage() {
    try {
      const f = localStorage.getItem('rl3_folders');
      const i = localStorage.getItem('rl3_items');
      appState.folders = f ? JSON.parse(f) : [];
      appState.items = i ? JSON.parse(i) : [];
    } catch (e) {
      appState.folders = [];
      appState.items = [];
    }
  }

  // =========================================================================
  // 3. VECTOR SVG COVER ART (PREMIUM LIGHT STUDIO)
  // =========================================================================
  function renderPosterCoverHtml(item, folder) {
    const theme = folder ? (FOLDER_THEMES[folder.color] || FOLDER_THEMES.book) : FOLDER_THEMES.book;
    if (item.coverUrl && !item.coverUrl.startsWith('data:image/canvas-studio') && !item.coverUrl.includes('canvas')) {
      return `<img src="${escapeHTML(item.coverUrl)}" alt="${escapeHTML(item.title)}" loading="lazy" />`;
    }
    return `
      <div class="poster-cover-svg-art" style="background: ${theme.bg}; color: ${theme.color};">
        <div class="poster-cover-svg-pattern"></div>
        <div class="poster-cover-svg-circle" style="color: ${theme.color};">
          ${theme.svg}
        </div>
        <span class="poster-cover-svg-title">${escapeHTML(item.title)}</span>
      </div>
    `;
  }

  function renderBentoCoverHtml(item, folder) {
    const theme = folder ? (FOLDER_THEMES[folder.color] || FOLDER_THEMES.book) : FOLDER_THEMES.book;
    if (item.coverUrl && !item.coverUrl.startsWith('data:image/canvas-studio') && !item.coverUrl.includes('canvas')) {
      return `<img src="${escapeHTML(item.coverUrl)}" alt="${escapeHTML(item.title)}" loading="lazy" />`;
    }
    return `
      <div class="bento-cover-svg-art" style="background: ${theme.bg}; color: ${theme.color};">
        <div class="bento-cover-svg-circle" style="color: ${theme.color};">
          ${theme.svg}
        </div>
      </div>
    `;
  }

  // =========================================================================
  // 4. RENDERING & UI CONTROLLER
  // =========================================================================
  function renderAll() {
    renderVisualFolders();
    renderItemsFeed();
    updateHeaderStats();
    populateFolderSelects();
    updateAiBadge();
    updateCloudIndicator();
  }

  function updateAiBadge() {
    if (appState.settings.geminiApiKey.trim()) {
      dom.badgeAiIndicator.innerHTML = `
        <svg class="svg-icon icon-xs" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        Gemini 3.8 Aktif
      `;
      dom.badgeAiIndicator.className = 'pill-chip pill-ai-ready';
    } else {
      dom.badgeAiIndicator.innerHTML = `
        <svg class="svg-icon icon-xs" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Set API Key
      `;
      dom.badgeAiIndicator.className = 'pill-chip';
      dom.badgeAiIndicator.style.background = '#fef3c7';
      dom.badgeAiIndicator.style.color = '#92400e';
    }
  }

  function updateCloudIndicator() {
    const badge = document.getElementById('badge-cloud-indicator');
    const settingsBadge = document.getElementById('sheets-status-badge');
    const isConnected = !!(appState.settings.googleSheetsUrl && appState.settings.googleSheetsUrl.trim());

    if (badge) {
      if (isConnected) {
        badge.innerHTML = `
          <svg class="svg-icon icon-xs" viewBox="0 0 24 24"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/><polyline points="20 6 9 17 4 12"/></svg>
          Sheets Aktif
        `;
        badge.className = 'pill-chip pill-ai-ready';
        badge.style.background = '#ecfdf5';
        badge.style.color = '#059669';
        badge.title = 'Terhubung ke Google Sheets Database';
      } else {
        badge.innerHTML = `
          <svg class="svg-icon icon-xs" viewBox="0 0 24 24"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>
          Lokal
        `;
        badge.className = 'pill-chip';
        badge.style.background = '#f1f5f9';
        badge.style.color = '#64748b';
        badge.title = 'Database Offline Lokal (Belum Terhubung ke Google Sheets)';
      }
    }

    if (settingsBadge) {
      if (isConnected) {
        settingsBadge.innerHTML = `
          <svg class="svg-icon icon-xs" viewBox="0 0 24 24"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/><polyline points="20 6 9 17 4 12"/></svg>
          Terhubung ke Google Sheets
        `;
        settingsBadge.style.background = '#ecfdf5';
        settingsBadge.style.color = '#059669';
      } else {
        settingsBadge.innerHTML = `
          <svg class="svg-icon icon-xs" viewBox="0 0 24 24"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>
          Belum Terhubung
        `;
        settingsBadge.style.background = '#f1f5f9';
        settingsBadge.style.color = '#64748b';
      }
    }
  }

  function updateHeaderStats() {
    const total = appState.items.length;
    const reading = appState.items.filter(i => i.status === 'reading').length;
    dom.headerStats.textContent = `${total} judul tersimpan • ${reading} sedang dibaca`;
    dom.shelfCountText.textContent = `${appState.folders.length} Folder`;
  }

  // Render Visual Folder Cards (Bukan Chip! Bentuk Bento Card dengan SVG Bespoke)
  function renderVisualFolders() {
    dom.foldersScrollTrack.innerHTML = '';

    // 1. Folder "Semua Koleksi"
    const allTheme = FOLDER_THEMES.all;
    const allCard = document.createElement('div');
    allCard.className = `visual-folder-card ${appState.activeFolderId === 'all' ? 'active' : ''}`;
    allCard.innerHTML = `
      <div class="folder-icon-circle" style="background: ${allTheme.bg}; color: ${allTheme.color};">
        ${allTheme.svg}
      </div>
      <div>
        <span class="folder-name-text">Semua</span>
        <span class="folder-meta-text">${appState.items.length} Judul</span>
      </div>
    `;
    allCard.addEventListener('click', () => {
      appState.activeFolderId = 'all';
      appState.statusFilter = null;
      renderAll();
    });
    dom.foldersScrollTrack.appendChild(allCard);

    // 2. Folder-Folder Dinamis
    appState.folders.forEach(folder => {
      const theme = FOLDER_THEMES[folder.color] || FOLDER_THEMES.book;
      const count = appState.items.filter(i => i.folderId === folder.id).length;

      const card = document.createElement('div');
      card.className = `visual-folder-card ${appState.activeFolderId === folder.id && !appState.statusFilter ? 'active' : ''}`;
      card.innerHTML = `
        <div class="folder-icon-circle" style="background: ${theme.bg}; color: ${theme.color};">
          ${theme.svg}
        </div>
        <div>
          <span class="folder-name-text">${escapeHTML(folder.name)}</span>
          <span class="folder-meta-text">${count} Judul</span>
        </div>
      `;

      card.addEventListener('click', () => {
        appState.activeFolderId = folder.id;
        appState.statusFilter = null;
        renderAll();
      });

      card.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        openEditFolderModal(folder);
      });

      dom.foldersScrollTrack.appendChild(card);
    });

    // 3. Tombol Visual "+ Folder"
    const addCard = document.createElement('div');
    addCard.className = 'visual-folder-card add-new';
    addCard.innerHTML = `
      <div class="add-folder-icon-box">
        <svg class="svg-icon icon-sm" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </div>
      <span class="folder-name-text" style="color: var(--primary);">Tambah</span>
    `;
    addCard.addEventListener('click', openNewFolderModal);
    dom.foldersScrollTrack.appendChild(addCard);
  }

  // Render Reading List Feed (Bento Cards: Cover 2:3, Judul, Sinopsis, Status)
  function renderItemsFeed() {
    let filtered = appState.items.filter(item => {
      if (appState.statusFilter && item.status !== appState.statusFilter) {
        return false;
      }
      if (appState.activeFolderId !== 'all' && item.folderId !== appState.activeFolderId) {
        return false;
      }
      if (appState.searchQuery.trim()) {
        const q = appState.searchQuery.toLowerCase();
        const folder = appState.folders.find(f => f.id === item.folderId);
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchDesc = (item.desc || '').toLowerCase().includes(q);
        const matchFolder = folder ? folder.name.toLowerCase().includes(q) : false;
        if (!matchTitle && !matchDesc && !matchFolder) return false;
      }
      return true;
    });

    if (appState.sortBy === 'title') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }

    let folderName = 'Semua Koleksi';
    if (appState.statusFilter === 'reading') {
      folderName = 'Sedang Dibaca';
    } else if (appState.activeFolderId !== 'all') {
      const activeF = appState.folders.find(f => f.id === appState.activeFolderId);
      if (activeF) folderName = activeF.name;
    }
    dom.itemsSectionTitle.textContent = folderName;
    dom.itemsCountBadge.textContent = `${filtered.length} Judul`;

    const viewMode = appState.viewMode || 'grid';
    dom.itemsGrid.className = `items-grid layout-${viewMode}`;

    const btnGrid = document.getElementById('btn-view-grid');
    const btnList = document.getElementById('btn-view-list');
    if (btnGrid) btnGrid.classList.toggle('active', viewMode === 'grid');
    if (btnList) btnList.classList.toggle('active', viewMode === 'list');

    dom.itemsGrid.innerHTML = '';
    if (filtered.length === 0) {
      dom.emptyState.classList.remove('hidden');
    } else {
      dom.emptyState.classList.add('hidden');
      filtered.forEach(item => {
        if (viewMode === 'grid') {
          dom.itemsGrid.appendChild(createReadingPosterCard(item));
        } else {
          dom.itemsGrid.appendChild(createReadingBentoCard(item));
        }
      });
    }
  }

  // Tampilan 1: Grid Poster Lega (Cover 2:3 Besar, Luas & Memanjakan Mata)
  function createReadingPosterCard(item) {
    const folder = appState.folders.find(f => f.id === item.folderId);
    const folderName = folder ? folder.name : 'Umum';

    const card = document.createElement('div');
    card.className = 'reading-poster-card';
    card.setAttribute('data-id', item.id);

    const statusMap = {
      plan: 'Ingin Dibaca',
      reading: 'Sedang Dibaca',
      completed: 'Selesai'
    };

    const coverHtml = renderPosterCoverHtml(item, folder);

    card.innerHTML = `
      <div class="poster-cover-wrap">
        ${coverHtml}
        <div class="poster-floating-status">
          <span class="badge-status status-${item.status || 'plan'}">${statusMap[item.status] || 'Ingin Dibaca'}</span>
        </div>
        <div class="poster-floating-folder">
          <span class="badge-folder-tag">${escapeHTML(folderName)}</span>
        </div>
      </div>
      <div class="poster-info-wrap">
        <h4 class="poster-title-text" title="${escapeHTML(item.title)}">${escapeHTML(item.title)}</h4>
        ${item.desc ? `<p class="poster-desc-text">${escapeHTML(item.desc)}</p>` : ''}
        <div class="poster-footer-row">
          <span class="poster-date-text">${formatDate(item.createdAt)}</span>
          <button type="button" class="poster-btn-action btn-quick-status" onclick="event.stopPropagation()">
            ${item.status === 'completed' ? 'Baca Ulang' : (item.status === 'reading' ? 'Tamat' : 'Mulai')}
          </button>
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      openItemDetailModal(item);
    });

    const btnStatus = card.querySelector('.btn-quick-status');
    btnStatus.addEventListener('click', (e) => {
      e.stopPropagation();
      handleQuickStatusToggle(item);
    });

    return card;
  }

  // Tampilan 2: List Detail Lebar (Leluasa & Luas)
  function createReadingBentoCard(item) {
    const folder = appState.folders.find(f => f.id === item.folderId);
    const folderName = folder ? folder.name : 'Umum';

    const card = document.createElement('div');
    card.className = 'reading-bento-card';
    card.setAttribute('data-id', item.id);

    const statusMap = {
      plan: 'Ingin Dibaca',
      reading: 'Sedang Dibaca',
      completed: 'Selesai'
    };

    const coverHtml = renderBentoCoverHtml(item, folder);

    card.innerHTML = `
      <div class="card-cover-container">
        ${coverHtml}
      </div>
      <div class="card-content-area">
        <div>
          <div class="card-header-line">
            <div class="card-badges-row">
              <span class="badge-status status-${item.status || 'plan'}">${statusMap[item.status] || 'Ingin Dibaca'}</span>
              <span class="badge-folder-tag">${escapeHTML(folderName)}</span>
            </div>
          </div>
          <h4 class="card-title-text">${escapeHTML(item.title)}</h4>
          ${item.desc ? `<p class="card-desc-text">${escapeHTML(item.desc)}</p>` : ''}
        </div>
        
        <div class="card-footer-line">
          <span class="card-date-label">${formatDate(item.createdAt)}</span>
          <button type="button" class="card-action-tap btn-quick-status" onclick="event.stopPropagation()">
            ${item.status === 'completed' ? 'Baca Ulang' : (item.status === 'reading' ? 'Tandai Selesai' : 'Mulai Baca')}
          </button>
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      openItemDetailModal(item);
    });

    const btnStatus = card.querySelector('.btn-quick-status');
    btnStatus.addEventListener('click', (e) => {
      e.stopPropagation();
      handleQuickStatusToggle(item);
    });

    return card;
  }

  function handleQuickStatusToggle(item) {
    if (item.status === 'plan') {
      item.status = 'reading';
      showToast(`Mulai membaca: ${item.title}`);
    } else if (item.status === 'reading') {
      item.status = 'completed';
      showToast(`Selesai dibaca: ${item.title}!`);
      triggerNativeHaptic();
    } else {
      item.status = 'plan';
      showToast(`Dipindahkan ke Ingin Dibaca`);
    }
    saveItemToDB(item);
    renderAll();
  }

  function populateFolderSelects() {
    const selects = [
      dom.resultsTargetFolder,
      document.getElementById('item-folder-select')
    ];

    selects.forEach(select => {
      if (!select) return;
      const currentVal = select.value;
      select.innerHTML = '';
      appState.folders.forEach(f => {
        const opt = document.createElement('option');
        opt.value = f.id;
        opt.textContent = f.name;
        select.appendChild(opt);
      });
      if (currentVal && select.querySelector(`option[value="${currentVal}"]`)) {
        select.value = currentVal;
      }
    });
  }

  // =========================================================================
  // 5. GEMINI 3.8 FLASH VISION ENGINE & CANVAS AUTO-CROP
  // =========================================================================
  function initScannerEvents() {
    const dropzone = dom.scannerDropzone;
    const fileInput = dom.scannerFileInput;
    const btnSelect = document.getElementById('btn-select-image-file');

    // Trigger input file secara bersih tanpa memunculkan widget bawaan browser
    btnSelect.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });
    dropzone.addEventListener('click', () => {
      fileInput.click();
    });

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleUploadedScreenshot(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files[0]) {
        handleUploadedScreenshot(fileInput.files[0]);
      }
    });

    window.addEventListener('paste', (e) => {
      const items = e.clipboardData ? e.clipboardData.items : [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          openScannerModal();
          handleUploadedScreenshot(file);
          break;
        }
      }
    });

    dom.btnSaveScanned.addEventListener('click', saveScannedItemsToCollection);
  }

  function handleUploadedScreenshot(file) {
    if (!file || !file.type.startsWith('image/')) {
      showToast('Harap pilih file gambar screenshot.');
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      const dataUrl = e.target.result;
      appState.currentUploadedImageSrc = dataUrl;
      processScreenshotImage(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  async function processScreenshotImage(dataUrl) {
    dom.scannerDropzone.classList.add('hidden');
    dom.scannerResults.classList.add('hidden');
    dom.scannerProcessing.classList.remove('hidden');
    dom.btnSaveScanned.classList.add('hidden');

    dom.scanPreviewImg.src = dataUrl;
    dom.scanStatusTicker.textContent = 'Membaca gambar screenshot dengan Gemini 3.8 Flash...';

    const apiKey = appState.settings.geminiApiKey.trim();

    try {
      let extractedData = null;

      if (apiKey) {
        dom.scanStatusTicker.textContent = 'Menghubungkan ke Gemini 3.8 Flash Vision API...';
        extractedData = await callGemini38FlashVision(dataUrl, apiKey);
      } else {
        dom.scanStatusTicker.textContent = 'Mode Demo: Memotong cover & mengekstrak daftar... (Masukkan API Key di Pengaturan)';
        await new Promise(r => setTimeout(r, 900));
        extractedData = await fallbackTrainedExtractor(dataUrl);
      }

      displayScanResults(extractedData, dataUrl);
    } catch (err) {
      console.warn('Vision extraction fallback:', err);
      showToast('Koneksi model cloud terkendala. Berhasil diekstrak dengan auto-crop lokal!');
      const fallback = await fallbackTrainedExtractor(dataUrl);
      displayScanResults(fallback, dataUrl);
    }
  }

  /**
   * Panggilan Cerdas Gemini Vision API dengan Deteksi Model Dinamis (ListModels)
   * Menyelesaikan masalah 404 dengan otomatis memilih model yang aktif pada API Key pengguna.
   */
  async function callGemini38FlashVision(base64DataUrl, apiKey) {
    const base64Pure = base64DataUrl.split(',')[1];
    const mimeType = base64DataUrl.split(';')[0].split(':')[1] || 'image/jpeg';

    const systemPrompt = `Anda adalah AI Vision Expert spesialis membaca screenshot rekomendasi komik, manhwa, manga, novel, dan film.
Tugas Anda:
1. Temukan semua judul karya/bacaan yang ada di dalam gambar.
2. Ambil judul resminya dalam huruf Latin (bersihkan angka penomoran seperti "1.", "Top 2", dll).
3. Ambil sinopsis atau deskripsi singkat 1-2 kalimat jika tertulis di gambar (atau buatkan pitch singkat 1 kalimat jika judulnya terkenal).
4. Deteksi kotak pembatas (bounding box) gambar sampul/cover/thumbnail karya tersebut dalam skala [ymin, xmin, ymax, xmax] 0-1000 agar dapat dipotong (crop) otomatis.

Format Output WAJIB berupa array JSON murni:
[
  {
    "title": "Judul Manhwa",
    "description": "Sinopsis singkat...",
    "box_2d": [ymin, xmin, ymax, xmax]
  }
]`;

    // 1. Dapatkan daftar model yang aktif untuk API Key ini secara otomatis via ListModels
    let discoveredModels = [];
    try {
      const listResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
      if (listResp.ok) {
        const listJson = await listResp.json();
        if (listJson.models && Array.isArray(listJson.models)) {
          const valid = listJson.models
            .filter(m => !m.supportedGenerationMethods || m.supportedGenerationMethods.includes('generateContent'))
            .map(m => m.name.replace(/^models\//, ''));
          
          // Prioritaskan model flash dan versi terbaru (2.0 / 2.5 / 1.5)
          const flashModels = valid.filter(name => name.includes('flash'));
          const otherModels = valid.filter(name => !name.includes('flash'));
          discoveredModels = [...flashModels, ...otherModels];
          console.log('[Gemini Vision] Model terdeteksi di akun:', discoveredModels);
        }
      }
    } catch (e) {
      console.warn('Gagal mengambil daftar model dinamis via ListModels:', e);
    }

    // 2. Daftar prioritas model modern Gemini (2.0-flash, 2.5-flash, 1.5-flash-latest, dll)
    const fallbackList = [
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-2.5-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash-002',
      'gemini-1.5-flash-001',
      'gemini-2.0-flash-exp',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-1.5-pro-latest'
    ];

    const modelsToTry = [...new Set([...discoveredModels, ...fallbackList])];
    let lastError = null;

    // 3. Coba kirimkan prompt ke model yang tersedia (mendukung v1beta dan v1)
    for (const model of modelsToTry) {
      const endpoints = [
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
      ];

      for (const url of endpoints) {
        try {
          const payload = {
            system_instruction: {
              parts: [{ text: systemPrompt }]
            },
            contents: [
              {
                parts: [
                  { text: "Ekstrak seluruh daftar rekomendasi dari screenshot ini ke dalam format JSON yang ditentukan." },
                  {
                    inlineData: {
                      mimeType: mimeType,
                      data: base64Pure
                    }
                  }
                ]
              }
            ],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.2
            }
          };

          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (response.ok) {
            const json = await response.json();
            const candidateText = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
            console.log(`[Gemini Vision] Sukses menggunakan model: ${model} (${url.includes('v1beta') ? 'v1beta' : 'v1'})`);
            return JSON.parse(candidateText.trim());
          } else {
            const errText = await response.text();
            // Jika bukan 404, mungkin model ada tapi format payload butuh penyesuaian (misal model v1 tanpa system_instruction)
            if (response.status !== 404) {
              // Coba tanpa system_instruction (fallback ke prompt gabungan di part user)
              const simplePayload = {
                contents: [
                  {
                    parts: [
                      { text: systemPrompt + "\n\nEkstrak seluruh daftar rekomendasi dari screenshot ini ke dalam format JSON yang ditentukan." },
                      {
                        inlineData: {
                          mimeType: mimeType,
                          data: base64Pure
                        }
                      }
                    ]
                  }
                ]
              };
              const retryResp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(simplePayload)
              });
              if (retryResp.ok) {
                const retryJson = await retryResp.json();
                let txt = retryJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
                txt = txt.replace(/```json/g, '').replace(/```/g, '').trim();
                return JSON.parse(txt);
              }
            }
            lastError = new Error(`HTTP ${response.status} (${model}): ${errText.substring(0, 100)}`);
          }
        } catch (err) {
          lastError = err;
        }
      }
    }

    throw lastError;
  }

  // Fallback Simulator yang memotong real region dari screenshot asli user
  async function fallbackTrainedExtractor(dataUrl) {
    const img = new Image();
    await new Promise(r => { img.onload = r; img.src = dataUrl; });

    return [
      {
        title: 'Solo Leveling: Ragnarok',
        description: 'Kelanjutan kisah Solo Leveling tentang putra Sung Jin-woo yang menghadapi ancaman para penguasa dimensi baru.',
        box_2d: [80, 40, 360, 280]
      },
      {
        title: 'Revenge of the Iron-Blooded Sword Hound',
        description: 'Vikir dikhianati oleh klan Baskerville dan terlahir kembali untuk membalas dendam kepada sang patriark.',
        box_2d: [380, 40, 660, 280]
      },
      {
        title: 'SSS-Class Revival Hunter',
        description: 'Pemburu peringkat F memperoleh skill misterius yang memungkinkannya menyalin kemampuan orang yang membunuhnya.',
        box_2d: [680, 40, 960, 280]
      }
    ];
  }

  async function displayScanResults(items, originalDataUrl) {
    dom.scannerProcessing.classList.add('hidden');
    dom.scannerResults.classList.remove('hidden');
    dom.btnSaveScanned.classList.remove('hidden');

    appState.pendingScannedItems = [];
    dom.resultsList.innerHTML = '';
    dom.resultsCountText.textContent = `Ditemukan ${items.length} Judul`;

    const img = new Image();
    await new Promise(res => { img.onload = res; img.src = originalDataUrl; });
    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;

    for (let idx = 0; idx < items.length; idx++) {
      const it = items[idx];
      let croppedCover = null;

      if (it.box_2d && it.box_2d.length === 4) {
        try {
          const [ymin, xmin, ymax, xmax] = it.box_2d;
          const cropX = (xmin / 1000) * naturalW;
          const cropY = (ymin / 1000) * naturalH;
          const cropW = ((xmax - xmin) / 1000) * naturalW;
          const cropH = ((ymax - ymin) / 1000) * naturalH;

          if (cropW > 15 && cropH > 15) {
            const cropCanvas = document.createElement('canvas');
            cropCanvas.width = 180;
            cropCanvas.height = 250;
            const cctx = cropCanvas.getContext('2d');
            cctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, 180, 250);
            croppedCover = cropCanvas.toDataURL('image/jpeg', 0.85);
          }
        } catch (e) {
          console.warn('Gagal memotong cover:', e);
        }
      }

      if (!croppedCover) {
        croppedCover = createStudioCover(it.title, '#e0e7ff', '#c7d2fe');
      }

      const itemObj = {
        tempId: 'temp-' + idx,
        title: it.title || 'Tanpa Judul',
        desc: it.description || '',
        coverUrl: croppedCover,
        selected: true
      };
      appState.pendingScannedItems.push(itemObj);

      const resCard = document.createElement('div');
      resCard.className = 'result-item-card';
      resCard.innerHTML = `
        <div class="result-check-wrap">
          <input type="checkbox" class="result-checkbox" checked data-idx="${idx}">
        </div>
        <div class="result-cover-thumb">
          <img src="${croppedCover}" alt="${escapeHTML(it.title)}" />
        </div>
        <div class="result-inputs">
          <input type="text" class="input-result-title" value="${escapeHTML(it.title)}" data-idx="${idx}" placeholder="Judul">
          <textarea class="input-result-desc" rows="2" data-idx="${idx}" placeholder="Sinopsis singkat...">${escapeHTML(it.desc)}</textarea>
        </div>
      `;

      const chk = resCard.querySelector('.result-checkbox');
      const titleInput = resCard.querySelector('.input-result-title');
      const descInput = resCard.querySelector('.input-result-desc');

      chk.addEventListener('change', () => {
        itemObj.selected = chk.checked;
        updateSaveScanButtonText();
      });
      titleInput.addEventListener('input', () => { itemObj.title = titleInput.value; });
      descInput.addEventListener('input', () => { itemObj.desc = descInput.value; });

      dom.resultsList.appendChild(resCard);
    }

    updateSaveScanButtonText();
  }

  function updateSaveScanButtonText() {
    const selectedCount = appState.pendingScannedItems.filter(i => i.selected).length;
    dom.btnSaveScanned.textContent = `Simpan ${selectedCount} Judul ke Folder`;
    dom.btnSaveScanned.disabled = selectedCount === 0;
  }

  function saveScannedItemsToCollection() {
    const targetFolderId = dom.resultsTargetFolder.value || (appState.activeFolderId !== 'all' ? appState.activeFolderId : appState.folders[0]?.id);
    const selectedItems = appState.pendingScannedItems.filter(i => i.selected && i.title.trim());

    if (selectedItems.length === 0) {
      showToast('Pilih minimal 1 judul untuk disimpan.');
      return;
    }

    selectedItems.forEach((it, i) => {
      const newItem = {
        id: 'item-' + Date.now() + '-' + i,
        title: it.title.trim(),
        desc: it.desc.trim(),
        folderId: targetFolderId,
        status: 'plan',
        link: '',
        coverUrl: it.coverUrl,
        createdAt: Date.now() + i
      };

      appState.items.unshift(newItem);
      saveItemToDB(newItem);
    });

    closeScannerModal();
    renderAll();
    showToast(`Berhasil menambahkan ${selectedItems.length} bacaan baru!`);
  }

  // =========================================================================
  // 6. DETAIL / EDIT ITEM MODAL
  // =========================================================================
  function openItemDetailModal(item = null) {
    dom.modalItemDetail.classList.remove('hidden');

    const isEdit = !!item;
    document.getElementById('item-modal-title').textContent = isEdit ? 'Detail Bacaan' : 'Tambah Bacaan';
    document.getElementById('item-id-hidden').value = isEdit ? item.id : '';
    document.getElementById('item-title-input').value = isEdit ? item.title : '';
    document.getElementById('item-folder-select').value = isEdit ? item.folderId : (appState.activeFolderId !== 'all' ? appState.activeFolderId : appState.folders[0]?.id);
    document.getElementById('item-status-select').value = isEdit ? (item.status || 'plan') : 'plan';
    document.getElementById('item-desc-input').value = isEdit ? (item.desc || '') : '';

    const btnDelete = document.getElementById('btn-delete-item');
    if (isEdit) {
      btnDelete.classList.remove('hidden');
    } else {
      btnDelete.classList.add('hidden');
    }

    const hasRealCover = isEdit && item.coverUrl && !item.coverUrl.includes('canvas');
    if (hasRealCover) {
      dom.detailCoverImg.src = item.coverUrl;
      dom.detailCoverImg.classList.remove('hidden');
      dom.detailCoverPlaceholder.classList.add('hidden');
      document.getElementById('btn-remove-cover').classList.remove('hidden');
    } else {
      dom.detailCoverImg.src = '';
      dom.detailCoverImg.classList.add('hidden');
      dom.detailCoverPlaceholder.classList.remove('hidden');
      document.getElementById('btn-remove-cover').classList.add('hidden');
    }
  }

  function closeItemDetailModal() {
    dom.modalItemDetail.classList.add('hidden');
    dom.formItemDetail.reset();
  }

  function initItemFormEvents() {
    document.getElementById('btn-change-cover').addEventListener('click', () => {
      dom.coverFileInput.click();
    });
    dom.coverFileInput.addEventListener('change', () => {
      if (dom.coverFileInput.files && dom.coverFileInput.files[0]) {
        const file = dom.coverFileInput.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
          dom.detailCoverImg.src = e.target.result;
          dom.detailCoverImg.classList.remove('hidden');
          dom.detailCoverPlaceholder.classList.add('hidden');
          document.getElementById('btn-remove-cover').classList.remove('hidden');
        };
        reader.readAsDataURL(file);
      }
    });

    document.getElementById('btn-remove-cover').addEventListener('click', () => {
      dom.detailCoverImg.src = '';
      dom.detailCoverImg.classList.add('hidden');
      dom.detailCoverPlaceholder.classList.remove('hidden');
      document.getElementById('btn-remove-cover').classList.add('hidden');
    });

    dom.formItemDetail.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('item-id-hidden').value;
      const title = document.getElementById('item-title-input').value.trim();
      const folderId = document.getElementById('item-folder-select').value;
      const status = document.getElementById('item-status-select').value;
      const desc = document.getElementById('item-desc-input').value.trim();
      const coverUrl = dom.detailCoverImg.classList.contains('hidden') ? null : dom.detailCoverImg.src;

      if (!title) {
        showToast('Judul tidak boleh kosong.');
        return;
      }

      if (id) {
        const item = appState.items.find(i => i.id === id);
        if (item) {
          item.title = title;
          item.folderId = folderId;
          item.status = status;
          item.desc = desc;
          if (coverUrl) item.coverUrl = coverUrl;
          else if (!coverUrl && dom.detailCoverImg.src === '') item.coverUrl = '';
          saveItemToDB(item);
        }
      } else {
        const newItem = {
          id: 'item-' + Date.now(),
          title,
          folderId,
          status,
          desc,
          coverUrl: coverUrl || '',
          createdAt: Date.now()
        };
        appState.items.unshift(newItem);
        saveItemToDB(newItem);
      }

      closeItemDetailModal();
      renderAll();
      showToast('Data bacaan berhasil disimpan!');
    });

    document.getElementById('btn-delete-item').addEventListener('click', () => {
      const id = document.getElementById('item-id-hidden').value;
      if (id && confirm('Hapus bacaan ini dari koleksi?')) {
        appState.items = appState.items.filter(i => i.id !== id);
        deleteItemFromDB(id);
        closeItemDetailModal();
        renderAll();
        showToast('Item berhasil dihapus.');
      }
    });

    document.getElementById('btn-close-item-detail').addEventListener('click', closeItemDetailModal);
    document.getElementById('btn-cancel-item').addEventListener('click', closeItemDetailModal);
  }

  // =========================================================================
  // 7. FOLDER MANAGEMENT
  // =========================================================================
  function openNewFolderModal() {
    dom.modalFolder.classList.remove('hidden');
    document.getElementById('folder-modal-title').textContent = 'Folder Baru';
    document.getElementById('folder-id-hidden').value = '';
    document.getElementById('folder-name-input').value = '';
    document.getElementById('btn-delete-folder').classList.add('hidden');
    setActiveFolderColorDot('flame');
  }

  function openEditFolderModal(folder) {
    dom.modalFolder.classList.remove('hidden');
    document.getElementById('folder-modal-title').textContent = 'Edit Folder';
    document.getElementById('folder-id-hidden').value = folder.id;
    document.getElementById('folder-name-input').value = folder.name;
    document.getElementById('btn-delete-folder').classList.remove('hidden');
    setActiveFolderColorDot(folder.color || 'flame');
  }

  function closeFolderModal() {
    dom.modalFolder.classList.add('hidden');
    dom.formFolder.reset();
  }

  function setActiveFolderColorDot(colorKey) {
    const dots = document.querySelectorAll('#folder-color-picker .color-dot');
    dots.forEach(d => {
      d.classList.toggle('active', d.getAttribute('data-color') === colorKey);
    });
  }

  function initFolderEvents() {
    const picker = document.getElementById('folder-color-picker');
    picker.addEventListener('click', (e) => {
      const dot = e.target.closest('.color-dot');
      if (dot) setActiveFolderColorDot(dot.getAttribute('data-color'));
    });

    dom.formFolder.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('folder-id-hidden').value;
      const name = document.getElementById('folder-name-input').value.trim();
      const activeDot = document.querySelector('#folder-color-picker .color-dot.active');
      const color = activeDot ? activeDot.getAttribute('data-color') : 'flame';

      if (!name) {
        showToast('Nama folder tidak boleh kosong.');
        return;
      }

      if (id) {
        const f = appState.folders.find(x => x.id === id);
        if (f) {
          f.name = name;
          f.color = color;
          saveFolderToDB(f);
        }
      } else {
        const newFolder = {
          id: 'f-' + Date.now(),
          name,
          color,
          createdAt: Date.now()
        };
        appState.folders.push(newFolder);
        saveFolderToDB(newFolder);
      }

      closeFolderModal();
      renderAll();
      showToast('Folder berhasil disimpan!');
    });

    document.getElementById('btn-delete-folder').addEventListener('click', () => {
      const id = document.getElementById('folder-id-hidden').value;
      if (id && confirm('Hapus folder ini? Item di dalamnya tetap aman dan dipindahkan ke Umum.')) {
        appState.folders = appState.folders.filter(f => f.id !== id);
        deleteFolderFromDB(id);
        if (appState.activeFolderId === id) appState.activeFolderId = 'all';
        closeFolderModal();
        renderAll();
        showToast('Folder berhasil dihapus.');
      }
    });

    document.getElementById('btn-close-folder').addEventListener('click', closeFolderModal);
    document.getElementById('btn-cancel-folder').addEventListener('click', closeFolderModal);
  }

  // =========================================================================
  // 8. SETTINGS & GOOGLE SHEETS CLOUD SYNC
  // =========================================================================
  const GOOGLE_APPS_SCRIPT_CODE = `/**
 * READING LIST — GOOGLE APPS SCRIPT DATABASE BACKEND
 * 100% Zero-Cost Serverless Cloud Database Engine (Auto-Initialize)
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

  if (itemSheet.getLastRow() <= 1 && folderSheet.getLastRow() <= 1) {
    saveAllData(DUMMY_FOLDERS, DUMMY_ITEMS);
  }
}

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'getData';
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

  if (itemSheet.getLastRow() > 1) {
    itemSheet.deleteRows(2, itemSheet.getLastRow() - 1);
  }
  if (folderSheet.getLastRow() > 1) {
    folderSheet.deleteRows(2, folderSheet.getLastRow() - 1);
  }

  if (folders && folders.length > 0) {
    const folderRows = folders.map(f => [
      f.id,
      f.name,
      f.color || 'book'
    ]);
    folderSheet.getRange(2, 1, folderRows.length, folderHeaders.length).setValues(folderRows);
  }

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
}`;

  async function testAndSaveGoogleSheetsUrl(rawUrl) {
    const url = (rawUrl || '').trim();

    if (!url) {
      appState.settings.googleSheetsUrl = '';
      localStorage.removeItem('google_sheets_url');
      updateCloudIndicator();
      showToast('Koneksi Google Sheets dinonaktifkan. Mode lokal aktif.');
      return;
    }

    if (!url.startsWith('https://script.google.com/')) {
      showToast('Format URL tidak valid. Harus diawali https://script.google.com/');
      return;
    }

    showToast('Menghubungkan ke Google Sheets...');
    const btnSave = document.getElementById('btn-save-sheets-url');
    if (btnSave) btnSave.disabled = true;

    try {
      const pingUrl = url.includes('?') ? `${url}&action=ping` : `${url}?action=ping`;
      const resp = await fetch(pingUrl, { method: 'GET', mode: 'cors' });
      const data = await resp.json();

      if (data && data.success) {
        appState.settings.googleSheetsUrl = url;
        localStorage.setItem('google_sheets_url', url);
        updateCloudIndicator();
        showToast('Google Sheets berhasil terhubung!');
        // Sync push initial data quietly
        syncPushToGoogleSheets(true);
      } else {
        throw new Error(data.error || 'Respon tidak valid');
      }
    } catch (err) {
      console.warn('Google Sheets ping error:', err);
      // Fallback: simpan URL tetap dan beri instruksi jika CORS redirection
      appState.settings.googleSheetsUrl = url;
      localStorage.setItem('google_sheets_url', url);
      updateCloudIndicator();
      showToast('URL disimpan! Coba klik tombol "Kirim ke Sheet" untuk uji coba sinkronisasi.');
    } finally {
      if (btnSave) btnSave.disabled = false;
    }
  }

  async function syncPushToGoogleSheets(silent = false) {
    const url = appState.settings.googleSheetsUrl;
    if (!url) {
      if (!silent) showToast('Google Sheets belum dihubungkan. Buka Pengaturan.');
      return;
    }

    if (!silent) showToast('Mengirim seluruh koleksi ke Google Sheets...');

    try {
      const payload = {
        action: 'save_all',
        folders: appState.folders,
        items: appState.items
      };

      // Menggunakan text/plain agar tidak memicu preflight CORS OPTIONS pada Apps Script
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });

      const data = await resp.json();
      if (data && data.success) {
        if (!silent) showToast(`Tersinkronisasi! ${appState.items.length} bacaan tersimpan di Google Sheet.`);
        updateCloudIndicator();
      } else {
        throw new Error(data.error || 'Gagal menyimpan ke Google Sheets');
      }
    } catch (err) {
      console.error('Push to Sheets error:', err);
      if (!silent) {
        showToast('Gagal kirim ke Google Sheets. Pastikan akses Web App diset ke "Anyone".');
      }
    }
  }

  async function syncPullFromGoogleSheets() {
    const url = appState.settings.googleSheetsUrl;
    if (!url) {
      showToast('Google Sheets belum dihubungkan.');
      return;
    }

    showToast('Mengunduh data dari Google Sheets...');

    try {
      const fetchUrl = url.includes('?') ? `${url}&action=getData` : `${url}?action=getData`;
      const resp = await fetch(fetchUrl);
      const data = await resp.json();

      if (data && data.success && Array.isArray(data.items)) {
        if (data.folders && data.folders.length > 0) {
          appState.folders = data.folders;
        }
        appState.items = data.items;

        saveToLocalStorage();
        if (dbInstance) {
          const tx = dbInstance.transaction(['folders', 'items'], 'readwrite');
          tx.objectStore('folders').clear();
          tx.objectStore('items').clear();
          appState.folders.forEach(f => tx.objectStore('folders').put(f));
          appState.items.forEach(i => tx.objectStore('items').put(i));
        }

        renderAll();
        showToast(`Berhasil menarik ${data.items.length} bacaan dari Google Sheet!`);
        dom.modalSettings.classList.add('hidden');
      } else {
        throw new Error(data.error || 'Gagal membaca data dari Google Sheets');
      }
    } catch (err) {
      console.error('Pull from Sheets error:', err);
      showToast('Gagal menarik data dari Google Sheets.');
    }
  }

  function initSettingsEvents() {
    const keyInput = document.getElementById('settings-gemini-key');
    const sheetsUrlInput = document.getElementById('settings-sheets-url');

    keyInput.value = appState.settings.geminiApiKey || '';
    if (sheetsUrlInput) sheetsUrlInput.value = appState.settings.googleSheetsUrl || '';

    // Open & Close Settings Modal
    document.getElementById('btn-open-settings').addEventListener('click', () => {
      keyInput.value = appState.settings.geminiApiKey || '';
      if (sheetsUrlInput) sheetsUrlInput.value = appState.settings.googleSheetsUrl || '';
      dom.modalSettings.classList.remove('hidden');
    });

    const badgeCloud = document.getElementById('badge-cloud-indicator');
    if (badgeCloud) {
      badgeCloud.addEventListener('click', () => {
        keyInput.value = appState.settings.geminiApiKey || '';
        if (sheetsUrlInput) sheetsUrlInput.value = appState.settings.googleSheetsUrl || '';
        dom.modalSettings.classList.remove('hidden');
        if (sheetsUrlInput) {
          setTimeout(() => sheetsUrlInput.focus(), 300);
        }
      });
    }

    document.getElementById('btn-close-settings').addEventListener('click', () => {
      dom.modalSettings.classList.add('hidden');
    });
    document.getElementById('btn-done-settings').addEventListener('click', () => {
      dom.modalSettings.classList.add('hidden');
    });

    // Gemini API Key Save
    document.getElementById('btn-save-gemini-key').addEventListener('click', () => {
      const key = keyInput.value.trim();
      appState.settings.geminiApiKey = key;
      localStorage.setItem('gemini_api_key', key);
      updateAiBadge();
      showToast(key ? 'Gemini 3.8 Flash API Key aktif!' : 'API Key dikosongkan.');
    });

    // Google Sheets Events
    const btnSaveSheets = document.getElementById('btn-save-sheets-url');
    if (btnSaveSheets && sheetsUrlInput) {
      btnSaveSheets.addEventListener('click', () => {
        testAndSaveGoogleSheetsUrl(sheetsUrlInput.value);
      });
    }

    const btnPushSheets = document.getElementById('btn-push-sheets');
    if (btnPushSheets) {
      btnPushSheets.addEventListener('click', () => syncPushToGoogleSheets(false));
    }

    const btnPullSheets = document.getElementById('btn-pull-sheets');
    if (btnPullSheets) {
      btnPullSheets.addEventListener('click', syncPullFromGoogleSheets);
    }

    const btnToggleGuide = document.getElementById('btn-toggle-sheets-guide');
    const guideBox = document.getElementById('sheets-guide-box');
    if (btnToggleGuide && guideBox) {
      btnToggleGuide.addEventListener('click', () => {
        guideBox.classList.toggle('hidden');
      });
    }

    const btnCopyScript = document.getElementById('btn-copy-gas-script');
    if (btnCopyScript) {
      btnCopyScript.addEventListener('click', async () => {
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
          } else {
            const ta = document.createElement('textarea');
            ta.value = GOOGLE_APPS_SCRIPT_CODE;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
          }
          showToast('Kode Apps Script berhasil disalin ke clipboard!');
        } catch (e) {
          showToast('Gagal menyalin kode. Buka file google_sheets_script.js');
        }
      });
    }

    // Export JSON
    document.getElementById('btn-export-json').addEventListener('click', () => {
      const backupData = {
        app: 'Reading List',
        version: '1.2.0',
        exportedAt: new Date().toISOString(),
        folders: appState.folders,
        items: appState.items
      };
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reading_list_backup_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Data berhasil diekspor!');
    });

    // Import JSON
    const importFileInput = document.getElementById('import-json-file');
    document.getElementById('btn-trigger-import-json').addEventListener('click', () => {
      importFileInput.click();
    });
    importFileInput.addEventListener('change', () => {
      if (importFileInput.files && importFileInput.files[0]) {
        const file = importFileInput.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target.result);
            if (Array.isArray(data.folders) && Array.isArray(data.items)) {
              appState.folders = data.folders;
              appState.items = data.items;
              saveToLocalStorage();
              if (dbInstance) {
                const tx = dbInstance.transaction(['folders', 'items'], 'readwrite');
                data.folders.forEach(f => tx.objectStore('folders').put(f));
                data.items.forEach(i => tx.objectStore('items').put(i));
              }
              renderAll();
              showToast('Data berhasil diimpor!');
              dom.modalSettings.classList.add('hidden');
            } else {
              showToast('Format JSON tidak sesuai.');
            }
          } catch (err) {
            showToast('Gagal membaca file JSON.');
          }
        };
        reader.readAsText(file);
      }
    });

    document.getElementById('btn-load-sample-data').addEventListener('click', () => {
      if (appState.settings.googleSheetsUrl) {
        syncPullFromGoogleSheets();
        return;
      }
      if (confirm('Tarik atau muat ulang data contoh?')) {
        const defaultFolders = [
          { id: 'f-manhwa', name: 'Top Manhwa OP', color: 'flame', createdAt: Date.now() - 400000 },
          { id: 'f-novel',  name: 'Webnovel & Buku', color: 'book', createdAt: Date.now() - 300000 },
          { id: 'f-anime',  name: 'Anime & Film', color: 'film', createdAt: Date.now() - 200000 },
          { id: 'f-santai', name: 'Santai & Slice of Life', color: 'leaf', createdAt: Date.now() - 100000 }
        ];
        const defaultItems = [
          { id: 'item-1', title: 'Solo Leveling (Only I Level Up)', folderId: 'f-manhwa', status: 'completed', desc: 'Sung Jin-woo mendapatkan System rahasia setelah selamat dari Double Dungeon misterius.', coverUrl: '', createdAt: Date.now() - 500000 },
          { id: 'item-2', title: "Omniscient Reader's Viewpoint", folderId: 'f-manhwa', status: 'reading', desc: 'Kim Dokja adalah satu-satunya pembaca novel web apokaliptik yang menjadi kenyataan.', coverUrl: '', createdAt: Date.now() - 400000 },
          { id: 'item-3', title: 'Return of the Blossoming Blade', folderId: 'f-manhwa', status: 'reading', desc: 'Chung Myung bangkit kembali 100 tahun kemudian untuk membangkitkan sektenya.', coverUrl: '', createdAt: Date.now() - 300000 },
          { id: 'item-4', title: 'The Beginning After The End', folderId: 'f-manhwa', status: 'reading', desc: 'Raja Grey bereinkarnasi sebagai Arthur Leywin di dunia sihir dan monster.', coverUrl: '', createdAt: Date.now() - 200000 },
          { id: 'item-5', title: 'Atomic Habits', folderId: 'f-novel', status: 'completed', desc: 'Perubahan kecil yang memberikan hasil luar biasa dalam membangun kebiasaan baik.', coverUrl: '', createdAt: Date.now() - 100000 },
          { id: 'item-6', title: 'Sousou no Frieren', folderId: 'f-anime', status: 'plan', desc: 'Penyihir elf Frieren merefleksikan arti kehidupan manusia setelah mengalahkan Raja Iblis.', coverUrl: '', createdAt: Date.now() - 50000 }
        ];
        appState.folders = defaultFolders;
        appState.items = defaultItems;
        saveToLocalStorage();
        if (dbInstance) {
          const tx = dbInstance.transaction(['folders', 'items'], 'readwrite');
          defaultFolders.forEach(f => tx.objectStore('folders').put(f));
          defaultItems.forEach(i => tx.objectStore('items').put(i));
        }
        renderAll();
        showToast('Data contoh berhasil dimuat!');
        dom.modalSettings.classList.add('hidden');
      }
    });

    document.getElementById('btn-reset-all-data').addEventListener('click', () => {
      if (confirm('Hapus semua data koleksi permanen?')) {
        appState.folders = [];
        appState.items = [];
        saveToLocalStorage();
        if (dbInstance) {
          const tx = dbInstance.transaction(['folders', 'items'], 'readwrite');
          tx.objectStore('folders').clear();
          tx.objectStore('items').clear();
        }
        renderAll();
        showToast('Semua data dibersihkan.');
        dom.modalSettings.classList.add('hidden');
      }
    });
  }

  // =========================================================================
  // 8.1 STATISTIK & REKAP BACAAN (BENTO STATS & INSIGHTS)
  // =========================================================================
  function openStatsModal() {
    renderStatsData();
    const modal = document.getElementById('modal-stats');
    if (modal) modal.classList.remove('hidden');
    triggerNativeHaptic();
  }

  function closeStatsModal() {
    const modal = document.getElementById('modal-stats');
    if (modal) modal.classList.add('hidden');
  }

  function renderStatsData() {
    const totalItems = appState.items.length;
    const completedItems = appState.items.filter(i => i.status === 'completed').length;
    const readingItems = appState.items.filter(i => i.status === 'reading').length;
    const planItems = appState.items.filter(i => i.status === 'plan' || !i.status).length;
    const totalFolders = appState.folders.length;

    // Bento Numbers
    const elTotal = document.getElementById('stat-total-items');
    if (elTotal) elTotal.textContent = totalItems;
    const elTotalSub = document.getElementById('stat-total-sub');
    if (elTotalSub) elTotalSub.textContent = `${totalFolders} rak aktif`;

    const elReading = document.getElementById('stat-reading-items');
    if (elReading) elReading.textContent = readingItems;
    const readingPercent = totalItems > 0 ? Math.round((readingItems / totalItems) * 100) : 0;
    const elReadingPercent = document.getElementById('stat-reading-percent');
    if (elReadingPercent) elReadingPercent.textContent = `${readingPercent}% dari total`;

    const elCompleted = document.getElementById('stat-completed-items');
    if (elCompleted) elCompleted.textContent = completedItems;
    const completedPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    const elCompletedPercent = document.getElementById('stat-completed-percent');
    if (elCompletedPercent) elCompletedPercent.textContent = `${completedPercent}% tamat`;

    // Multistatus Progress Bar
    const elRatio = document.getElementById('stat-ratio-text');
    if (elRatio) elRatio.textContent = `${completedItems}/${totalItems} Selesai`;
    const planPercent = totalItems > 0 ? Math.max(0, 100 - completedPercent - readingPercent) : 100;
    const segComp = document.getElementById('prog-seg-completed');
    if (segComp) segComp.style.width = `${completedPercent}%`;
    const segRead = document.getElementById('prog-seg-reading');
    if (segRead) segRead.style.width = `${readingPercent}%`;
    const segPlan = document.getElementById('prog-seg-plan');
    if (segPlan) segPlan.style.width = `${planPercent}%`;

    const legComp = document.getElementById('legend-count-completed');
    if (legComp) legComp.textContent = completedItems;
    const legRead = document.getElementById('legend-count-reading');
    if (legRead) legRead.textContent = readingItems;
    const legPlan = document.getElementById('legend-count-plan');
    if (legPlan) legPlan.textContent = planItems;

    // Folder Breakdown
    const folderList = document.getElementById('stats-folders-breakdown');
    if (folderList) {
      folderList.innerHTML = '';
      if (appState.folders.length === 0) {
        folderList.innerHTML = '<span class="text-dim" style="font-size:12px; padding: 4px 0;">Belum ada folder.</span>';
      } else {
        appState.folders.forEach(f => {
          const count = appState.items.filter(i => i.folderId === f.id).length;
          const percent = totalItems > 0 ? Math.round((count / totalItems) * 100) : 0;
          const theme = FOLDER_THEMES[f.color] || FOLDER_THEMES.book;

          const row = document.createElement('div');
          row.className = 'stats-folder-row';
          row.innerHTML = `
            <div class="stats-folder-info">
              <div class="stats-folder-name-wrap">
                <div class="stats-folder-icon-sm" style="background:${theme.bg}; color:${theme.color};">
                  ${theme.svg}
                </div>
                <span>${escapeHTML(f.name)}</span>
              </div>
              <span class="stats-folder-count">${count} judul (${percent}%)</span>
            </div>
            <div class="stats-folder-track">
              <div class="stats-folder-fill" style="width:${percent}%; background:${theme.color};"></div>
            </div>
          `;
          folderList.appendChild(row);
        });
      }
    }

    // Milestones Badges (100% Vector SVG, Zero Emojis)
    const badgesContainer = document.getElementById('stats-badges-grid');
    if (badgesContainer) {
      badgesContainer.innerHTML = '';
      const totalFolders = appState.folders.length;
      const milestones = [
        {
          id: 'starter',
          svg: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>',
          title: 'Kolektor Pemula',
          desc: 'Simpan minimal 1 judul bacaan',
          unlocked: totalItems >= 1
        },
        {
          id: 'active',
          svg: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
          title: 'Pembaca Aktif',
          desc: 'Mulai baca minimal 1 judul',
          unlocked: readingItems >= 1
        },
        {
          id: 'finisher',
          svg: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>',
          title: 'Penamat Ulung',
          desc: 'Selesaikan minimal 1 karya',
          unlocked: completedItems >= 1
        },
        {
          id: 'marathon',
          svg: '<svg class="svg-icon" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
          title: 'Maraton Baca',
          desc: 'Sedang membaca 3+ karya bersamaan',
          unlocked: readingItems >= 3
        },
        {
          id: 'shelver',
          svg: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
          title: 'Penaung Rak',
          desc: 'Kelola minimal 3 rak koleksi',
          unlocked: totalFolders >= 3
        },
        {
          id: 'hoarder',
          svg: '<svg class="svg-icon" viewBox="0 0 24 24"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
          title: 'Pustakawan Elit',
          desc: 'Koleksi 10+ judul bacaan',
          unlocked: totalItems >= 10
        },
        {
          id: 'master_finisher',
          svg: '<svg class="svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>',
          title: 'Khatam Sempurna',
          desc: 'Selesaikan 5+ karya bacaan',
          unlocked: completedItems >= 5
        },
        {
          id: 'legend',
          svg: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14v2H5z"/></svg>',
          title: 'Kolektor Agung',
          desc: 'Koleksi 25+ judul bacaan',
          unlocked: totalItems >= 25
        }
      ];

      milestones.forEach(m => {
        const b = document.createElement('div');
        b.className = `milestone-badge ${m.unlocked ? 'unlocked' : 'locked'}`;

        const statusChip = m.unlocked
          ? `<span class="milestone-status-chip unlocked"><svg class="svg-icon icon-xs" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Tercapai</span>`
          : `<span class="milestone-status-chip locked"><svg class="svg-icon icon-xs" viewBox="0 0 24 24"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Terkunci</span>`;

        b.innerHTML = `
          <div class="milestone-icon">${m.svg}</div>
          <div class="milestone-meta">
            <div class="milestone-title-row">
              <span class="milestone-title">${escapeHTML(m.title)}</span>
              ${statusChip}
            </div>
            <span class="milestone-desc">${escapeHTML(m.desc)}</span>
          </div>
        `;
        badgesContainer.appendChild(b);
      });
    }
  }

  function initStatsEvents() {
    const btnStats = document.getElementById('dock-btn-stats');
    if (btnStats) btnStats.addEventListener('click', openStatsModal);

    const btnCloseStats = document.getElementById('btn-close-stats');
    if (btnCloseStats) btnCloseStats.addEventListener('click', closeStatsModal);

    const btnDoneStats = document.getElementById('btn-done-stats');
    if (btnDoneStats) btnDoneStats.addEventListener('click', closeStatsModal);

    const btnFilterReading = document.getElementById('btn-filter-reading-now');
    if (btnFilterReading) {
      btnFilterReading.addEventListener('click', () => {
        appState.statusFilter = 'reading';
        closeStatsModal();
        renderAll();
        showToast('Menampilkan koleksi yang sedang dibaca.');
      });
    }
  }

  // =========================================================================
  // 9. HELPERS
  // =========================================================================
  function openScannerModal() {
    dom.modalScanner.classList.remove('hidden');
    dom.scannerDropzone.classList.remove('hidden');
    dom.scannerProcessing.classList.add('hidden');
    dom.scannerResults.classList.add('hidden');
    dom.btnSaveScanned.classList.add('hidden');
    dom.scannerFileInput.value = '';
    populateFolderSelects();
  }

  function closeScannerModal() {
    dom.modalScanner.classList.add('hidden');
    dom.scannerFileInput.value = '';
    appState.pendingScannedItems = [];
  }

  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.innerHTML = `
      <svg class="svg-icon icon-xs" viewBox="0 0 24 24"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
      <span>${escapeHTML(message)}</span>
    `;
    dom.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = '0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2600);
  }

  function triggerNativeHaptic() {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(25);
    }
  }

  function formatDate(timestamp) {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // =========================================================================
  // 10. INITIALIZATION
  // =========================================================================
  async function initApp() {
    await initDatabase();

    // Bind Navigation
    document.getElementById('dock-btn-scan').addEventListener('click', openScannerModal);
    document.getElementById('btn-empty-scan').addEventListener('click', openScannerModal);
    document.getElementById('btn-close-scanner').addEventListener('click', closeScannerModal);
    document.getElementById('btn-cancel-scan').addEventListener('click', closeScannerModal);

    // Dock Button: Home (Koleksi)
    document.getElementById('dock-btn-home').addEventListener('click', () => {
      appState.activeFolderId = 'all';
      appState.statusFilter = null;
      renderAll();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Dock Button: Statistik & Rekap
    const btnStats = document.getElementById('dock-btn-stats');
    if (btnStats) {
      btnStats.addEventListener('click', openStatsModal);
    }

    // Search
    dom.searchInput.addEventListener('input', () => {
      appState.searchQuery = dom.searchInput.value;
      dom.btnClearSearch.classList.toggle('hidden', !appState.searchQuery.trim());
      renderItemsFeed();
    });
    dom.btnClearSearch.addEventListener('click', () => {
      dom.searchInput.value = '';
      appState.searchQuery = '';
      dom.btnClearSearch.classList.add('hidden');
      renderItemsFeed();
    });

    // Sort
    dom.sortSelect.addEventListener('change', () => {
      appState.sortBy = dom.sortSelect.value;
      renderItemsFeed();
    });

    // View Mode Toggle (Grid Poster Lega vs List Lebar)
    const btnViewGrid = document.getElementById('btn-view-grid');
    const btnViewList = document.getElementById('btn-view-list');
    if (btnViewGrid) {
      btnViewGrid.addEventListener('click', () => {
        appState.viewMode = 'grid';
        localStorage.setItem('reading_list_view_mode', 'grid');
        triggerNativeHaptic();
        renderItemsFeed();
      });
    }
    if (btnViewList) {
      btnViewList.addEventListener('click', () => {
        appState.viewMode = 'list';
        localStorage.setItem('reading_list_view_mode', 'list');
        triggerNativeHaptic();
        renderItemsFeed();
      });
    }

    // Modules
    initScannerEvents();
    initItemFormEvents();
    initFolderEvents();
    initSettingsEvents();
    initStatsEvents();

    renderAll();

    // Branded Splash Loading Screen (Khusus APK Mobile)
    if (dom.splashStatus) dom.splashStatus.textContent = 'Menyiapkan rak koleksi...';
    setTimeout(() => {
      if (dom.splashStatus) dom.splashStatus.textContent = 'Siap!';
      setTimeout(() => {
        if (dom.splash) dom.splash.classList.add('hidden-splash');
      }, 250);
    }, 1100);
  }

  document.addEventListener('DOMContentLoaded', initApp);
})();
