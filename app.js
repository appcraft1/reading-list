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
  const DB_VERSION = 2;

  let dbInstance = null;

  // Default Google Sheets URL (Bisa diisi agar APK langsung terhubung otomatis sejak pertama install)
  const DEFAULT_GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbzUnEBcIEdLGzFu-bBAvK61jK3X3AnTx8Sl8dh-F-SnpqyhM90rJV0mKMspf6X1vLsO/exec';

  const savedAuthUser = JSON.parse(localStorage.getItem('reading_list_auth_user') || 'null');
  const storedUserId = savedAuthUser?.userId || localStorage.getItem('reading_list_user_id') || ('user_' + Math.random().toString(36).substring(2, 7));
  const storedUserName = savedAuthUser?.name || localStorage.getItem('reading_list_user_name') || 'Pengguna';
  const storedUserRole = savedAuthUser?.role || localStorage.getItem('reading_list_user_role') || 'pribadi';
  const storedUsername = savedAuthUser?.username || ('usr_' + storedUserId.substring(0, 8));

  localStorage.setItem('reading_list_user_id', storedUserId);
  localStorage.setItem('reading_list_user_name', storedUserName);
  localStorage.setItem('reading_list_user_role', storedUserRole);

  const initialSheetsUrl = localStorage.getItem('google_sheets_url') || DEFAULT_GOOGLE_SHEETS_URL || '';
  if (!localStorage.getItem('google_sheets_url') && DEFAULT_GOOGLE_SHEETS_URL) {
    localStorage.setItem('google_sheets_url', DEFAULT_GOOGLE_SHEETS_URL);
  }

  let appState = {
    folders: [],
    items: [],
    profile: {
      userId: storedUserId,
      userName: storedUserName,
      role: storedUserRole,
      username: storedUsername
    },
    settings: {
      geminiApiKey: localStorage.getItem('gemini_api_key') || '',
      googleSheetsUrl: initialSheetsUrl,
      theme: 'light'
    },
    activeFolderId: 'all',
    statusFilter: null,
    viewMode: localStorage.getItem('reading_list_view_mode') || 'grid',
    searchQuery: '',
    sortBy: 'recent',
    pendingScannedItems: [],
    currentUploadedImageSrc: null,
    scanQueue: [],
    isScanningActive: false,
    isScannerMinimized: false
  };

  // 12 Luxury Colors Palette
  const FOLDER_COLORS = {
    flame:   { bg: '#fff1f2', color: '#f43f5e', name: 'Rose Flame' },
    book:    { bg: '#eef2ff', color: '#4f46e5', name: 'Royal Indigo' },
    film:    { bg: '#faf5ff', color: '#9333ea', name: 'Violet Amethyst' },
    leaf:    { bg: '#ecfdf5', color: '#059669', name: 'Emerald Mint' },
    star:    { bg: '#fffbeb', color: '#d97706', name: 'Amber Gold' },
    cyan:    { bg: '#ecfeff', color: '#0891b2', name: 'Ocean Cyan' },
    sunset:  { bg: '#fff7ed', color: '#ea580c', name: 'Sunset Coral' },
    teal:    { bg: '#f0fdfa', color: '#0d9488', name: 'Teal Forest' },
    pink:    { bg: '#fdf2f8', color: '#db2777', name: 'Magenta Pink' },
    purple:  { bg: '#f5f3ff', color: '#7c3aed', name: 'Electric Purple' },
    crimson: { bg: '#fef2f2', color: '#dc2626', name: 'Crimson Ruby' },
    slate:   { bg: '#f8fafc', color: '#334155', name: 'Dark Slate' }
  };

  // 12 Premium Bespoke SVG Icons
  const FOLDER_ICONS = {
    flame:    '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>',
    book:     '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/></svg>',
    film:     '<svg class="svg-icon" viewBox="0 0 24 24"><rect width="20" height="20" x="2" y="2" rx="2.18" ry="2.18"/><line x1="7" x2="7" y1="2" y2="22"/><line x1="17" x2="17" y1="2" y2="22"/><line x1="2" x2="22" y1="12" y2="12"/><line x1="2" x2="7" y1="7" y2="7"/><line x1="2" x2="7" y1="17" y2="17"/><line x1="17" x2="22" y1="17" y2="17"/><line x1="17" x2="22" y1="7" y2="7"/></svg>',
    leaf:     '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>',
    star:     '<svg class="svg-icon" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    bookmark: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>',
    heart:    '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>',
    sparkles: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>',
    compass:  '<svg class="svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>',
    trophy:   '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H8c-.55 0-1 .45-1 1v3h10v-3c0-.55-.45-1-1-1h-1c-.55 0-1-.45-1-1v-2.34"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>',
    food:     '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M12 2a5 5 0 0 0-5 5v1h10V7a5 5 0 0 0-5-5Z"/><path d="M3 11h18a9 9 0 0 1-18 0Z"/><line x1="12" y1="20" x2="12" y2="22"/></svg>',
    diamond:  '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M6 3h12l4 6-10 12L2 9Z"/><path d="M11 3 8 9l4 12 4-12-3-6"/><path d="M2 9h20"/></svg>'
  };

  const FOLDER_THEMES = FOLDER_COLORS; // Backwards compatibility

  function getFolderVisual(folder) {
    if (!folder || folder.id === 'all') {
      return {
        bg: '#f1f5f9',
        color: '#334155',
        svg: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M3 3h7v7H3z"/><path d="M14 3h7v7h-7z"/><path d="M14 14h7v7h-7z"/><path d="M3 14h7v7H3z"/></svg>'
      };
    }
    const colorKey = folder.color || 'book';
    const iconKey = folder.icon || colorKey || 'book';
    const colorDef = FOLDER_COLORS[colorKey] || FOLDER_COLORS.book;
    const iconSvg = FOLDER_ICONS[iconKey] || FOLDER_ICONS[colorKey] || FOLDER_ICONS.book;
    return {
      bg: colorDef.bg,
      color: colorDef.color,
      svg: iconSvg
    };
  }

  // DOM Elements
  const dom = {
    splash: document.getElementById('app-splash-screen'),
    splashStatus: document.getElementById('splash-status-text'),
    headerStats: document.getElementById('header-stats-text'),
    badgeAiIndicator: document.getElementById('badge-ai-indicator'),
    badgeCloudIndicator: document.getElementById('badge-cloud-indicator'),
    btnQuickSync: document.getElementById('btn-quick-sync'),
    searchInput: document.getElementById('search-input'),
    btnClearSearch: document.getElementById('btn-clear-search'),
    foldersScrollTrack: document.getElementById('folders-scroll-track'),
    shelfCountText: document.getElementById('shelf-count-text'),
    itemsSectionTitle: document.getElementById('items-section-title'),
    itemsCountBadge: document.getElementById('items-count-badge'),
    btnAddManualItem: document.getElementById('btn-add-manual-item'),
    sortSelect: document.getElementById('sort-select'),
    itemsGrid: document.getElementById('items-grid'),
    emptyState: document.getElementById('empty-state'),
    btnEmptyAddManual: document.getElementById('btn-empty-add-manual'),
    toastContainer: document.getElementById('toast-container'),

    // Floating Dock & Banners
    bottomDock: document.getElementById('bottom-dock'),
    dockBtnHome: document.getElementById('dock-btn-home'),
    dockBtnAdd: document.getElementById('dock-btn-add'),
    dockBtnScan: document.getElementById('dock-btn-scan'),
    dockBtnStats: document.getElementById('dock-btn-stats'),
    floatingScanBanner: document.getElementById('floating-scan-banner'),
    scanBannerTitle: document.getElementById('scan-banner-title'),
    scanBannerSub: document.getElementById('scan-banner-sub'),
    btnOpenScanBanner: document.getElementById('btn-open-scan-banner'),

    // Modals
    modalScanner: document.getElementById('modal-scanner'),
    modalItemDetail: document.getElementById('modal-item-detail'),
    modalFolder: document.getElementById('modal-folder'),
    modalSettings: document.getElementById('modal-settings'),

    // Scanner Elements
    scannerDropzone: document.getElementById('scanner-dropzone'),
    scannerFileInput: document.getElementById('scanner-file-input'),
    scannerProcessing: document.getElementById('scanner-processing'),
    scanProcessingTitle: document.getElementById('scan-processing-title'),
    scanPreviewImg: document.getElementById('scan-preview-img'),
    scanStatusTicker: document.getElementById('scan-status-ticker'),
    queueProgressWrap: document.getElementById('queue-progress-wrap'),
    queueProgressBar: document.getElementById('queue-progress-bar'),
    queueCountBadge: document.getElementById('queue-count-badge'),
    btnMinimizeScanner: document.getElementById('btn-minimize-scanner'),
    scannerResults: document.getElementById('scanner-results'),
    resultsCountText: document.getElementById('results-count-text'),
    resultsTargetFolder: document.getElementById('results-target-folder'),
    btnAddScanResult: document.getElementById('btn-add-scan-result'),
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
        if (!db.objectStoreNames.contains('scan_queue')) {
          db.createObjectStore('scan_queue', { keyPath: 'id' });
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

      const tx = dbInstance.transaction(['folders', 'items', 'scan_queue'], 'readonly');
      const folderStore = tx.objectStore('folders');
      const itemStore = tx.objectStore('items');
      const queueStore = tx.objectStore('scan_queue');

      const foldersReq = folderStore.getAll();
      const itemsReq = itemStore.getAll();
      const queueReq = queueStore.getAll();

      let loadedFolders = [];
      let loadedItems = [];
      let loadedQueue = [];

      foldersReq.onsuccess = () => { loadedFolders = foldersReq.result || []; };
      itemsReq.onsuccess = () => { loadedItems = itemsReq.result || []; };
      queueReq.onsuccess = () => { loadedQueue = queueReq.result || []; };

      tx.oncomplete = () => {
        appState.folders = loadedFolders;
        appState.items = loadedItems;
        if (loadedQueue && loadedQueue.length > 0) {
          appState.scanQueue = loadedQueue;
          const pending = loadedQueue.some(j => j.status === 'pending');
          if (pending) {
            appState.isScannerMinimized = true;
            if (dom.floatingScanBanner) {
              dom.floatingScanBanner.classList.remove('hidden');
              updateFloatingBannerStatus();
            }
          }
        }
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

  function saveScanJobToDB(job) {
    if (dbInstance) {
      try {
        const tx = dbInstance.transaction('scan_queue', 'readwrite');
        tx.objectStore('scan_queue').put(job);
      } catch (e) {
        console.warn('Gagal simpan scan job ke DB:', e);
      }
    }
  }

  function deleteScanJobFromDB(jobId) {
    if (dbInstance) {
      try {
        const tx = dbInstance.transaction('scan_queue', 'readwrite');
        tx.objectStore('scan_queue').delete(jobId);
      } catch (e) {}
    }
  }

  function clearScanQueueDB() {
    if (dbInstance) {
      try {
        const tx = dbInstance.transaction('scan_queue', 'readwrite');
        tx.objectStore('scan_queue').clear();
      } catch (e) {}
    }
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
  // 3.5 CUSTOM APK DROPDOWN SYSTEM (NO BROWSER NATIVE SELECT POPUP)
  // =========================================================================
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-apk-dropdown')) {
      closeAllApkDropdowns();
    }
  });

  function closeAllApkDropdowns() {
    document.querySelectorAll('.apk-dropdown-menu:not(.hidden)').forEach(menu => {
      menu.classList.add('hidden');
    });
  }

  function setupApkDropdown(config) {
    const {
      triggerBtn,
      menuEl,
      displayLabelEl,
      selectEl = null,
      items = null,
      initialValue = null,
      onChange = null
    } = config;

    if (!triggerBtn || !menuEl) return;

    // Jika items disediakan secara dinamis, render ulang isi menuEl
    if (Array.isArray(items)) {
      menuEl.innerHTML = '';
      items.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'apk-dropdown-item';
        itemEl.setAttribute('data-value', item.value);

        let dotHtml = '';
        if (item.dotColor) {
          dotHtml = `<span class="apk-dropdown-dot" style="background:${item.dotColor};"></span>`;
        } else if (item.statusDot) {
          dotHtml = `<span class="status-indicator-dot dot-${item.statusDot}"></span>`;
        }

        itemEl.innerHTML = `
          ${dotHtml}
          <span class="apk-dropdown-item-text">${escapeHTML(item.label)}</span>
          <svg class="apk-dropdown-check svg-icon icon-xs" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
        `;
        menuEl.appendChild(itemEl);
      });
    }

    // Set initial active state and label
    const targetVal = initialValue !== null ? initialValue : (selectEl ? selectEl.value : null);
    if (targetVal !== null) {
      applyActiveDropdownValue(menuEl, displayLabelEl, selectEl, targetVal);
    }

    // Toggle menu dropdown saat trigger di-klik
    triggerBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();

      const isAlreadyOpen = !menuEl.classList.contains('hidden');
      closeAllApkDropdowns();

      if (!isAlreadyOpen) {
        menuEl.classList.remove('hidden');

        // Cek jika dropdown perlu muncul ke atas (dropup) jika mepet bawah layar
        const triggerRect = triggerBtn.getBoundingClientRect();
        if (triggerRect.bottom + 220 > window.innerHeight && triggerRect.top > 220) {
          menuEl.classList.add('dropup');
        } else {
          menuEl.classList.remove('dropup');
        }
      }
    };

    // Event delegation untuk item click di dalam menuEl
    menuEl.onclick = (e) => {
      const itemEl = e.target.closest('.apk-dropdown-item');
      if (!itemEl) return;
      e.stopPropagation();

      const val = itemEl.getAttribute('data-value');
      const textEl = itemEl.querySelector('.apk-dropdown-item-text');
      const label = textEl ? textEl.textContent.trim() : val;

      applyActiveDropdownValue(menuEl, displayLabelEl, selectEl, val);
      closeAllApkDropdowns();

      if (selectEl) {
        selectEl.value = val;
        selectEl.dispatchEvent(new Event('change', { bubbles: true }));
      }

      if (typeof onChange === 'function') {
        onChange(val, label);
      }
    };
  }

  function applyActiveDropdownValue(menuEl, displayLabelEl, selectEl, val) {
    if (!menuEl) return;
    let foundLabel = null;
    let foundDotColor = null;
    let foundStatusDot = null;

    menuEl.querySelectorAll('.apk-dropdown-item').forEach(itemEl => {
      const itemVal = itemEl.getAttribute('data-value');
      const isMatch = String(itemVal) === String(val);
      itemEl.classList.toggle('active', isMatch);
      if (isMatch) {
        const textEl = itemEl.querySelector('.apk-dropdown-item-text');
        foundLabel = textEl ? textEl.textContent.trim() : itemVal;
        const dot = itemEl.querySelector('.apk-dropdown-dot');
        if (dot) foundDotColor = dot.style.background;
        const sDot = itemEl.querySelector('.status-indicator-dot');
        if (sDot) {
          if (sDot.classList.contains('dot-plan')) foundStatusDot = 'plan';
          else if (sDot.classList.contains('dot-reading')) foundStatusDot = 'reading';
          else if (sDot.classList.contains('dot-completed')) foundStatusDot = 'completed';
        }
      }
    });

    if (displayLabelEl && foundLabel) {
      const textSpan = displayLabelEl.querySelector('.apk-dropdown-text');
      if (textSpan) {
        textSpan.textContent = foundLabel;
      } else {
        displayLabelEl.textContent = foundLabel;
      }

      const dotSpan = displayLabelEl.querySelector('.apk-dropdown-dot');
      if (dotSpan && foundDotColor) {
        dotSpan.style.background = foundDotColor;
      }

      const statusSpan = displayLabelEl.querySelector('.status-indicator-dot');
      if (statusSpan && foundStatusDot) {
        statusSpan.className = `status-indicator-dot dot-${foundStatusDot}`;
      }
    }

    if (selectEl && val !== null) {
      selectEl.value = val;
    }
  }

  function populateFolderSelects() {
    const accessibleFolders = appState.folders;
    const folderItems = accessibleFolders.map(f => {
      const vis = getFolderVisual(f);
      return { value: f.id, label: f.name, dotColor: vis.color };
    });

    // 1. results-target-folder (Scanner results toolbar)
    const resSel = document.getElementById('results-target-folder');
    const resMenu = document.getElementById('menu-dropdown-results-folder');
    const resLabel = document.getElementById('results-folder-display-label');
    const resTrigger = document.getElementById('btn-trigger-results-folder');

    if (resSel && resMenu && resTrigger) {
      resSel.innerHTML = '';
      accessibleFolders.forEach(f => {
        const opt = document.createElement('option');
        opt.value = f.id;
        opt.textContent = f.name;
        resSel.appendChild(opt);
      });
      const curResVal = resSel.value || accessibleFolders[0]?.id || '';
      resSel.value = curResVal;
      setupApkDropdown({
        triggerBtn: resTrigger,
        menuEl: resMenu,
        displayLabelEl: resLabel,
        selectEl: resSel,
        items: folderItems,
        initialValue: curResVal,
        onChange: (val) => { resSel.value = val; }
      });
    }

    // 2. item-folder-select (Item detail modal)
    const itemSel = document.getElementById('item-folder-select');
    const itemMenu = document.getElementById('menu-dropdown-item-folder');
    const itemLabel = document.getElementById('item-folder-display-label');
    const itemTrigger = document.getElementById('btn-trigger-item-folder');

    if (itemSel && itemMenu && itemTrigger) {
      itemSel.innerHTML = '';
      accessibleFolders.forEach(f => {
        const opt = document.createElement('option');
        opt.value = f.id;
        opt.textContent = f.name;
        itemSel.appendChild(opt);
      });
      const curItemVal = itemSel.value || (appState.activeFolderId !== 'all' ? appState.activeFolderId : accessibleFolders[0]?.id) || '';
      itemSel.value = curItemVal;
      setupApkDropdown({
        triggerBtn: itemTrigger,
        menuEl: itemMenu,
        displayLabelEl: itemLabel,
        selectEl: itemSel,
        items: folderItems,
        initialValue: curItemVal,
        onChange: (val) => { itemSel.value = val; }
      });
    }
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

  function getUserAccessibleItems() {
    if (appState.profile.role === 'admin') {
      return appState.items;
    }
    const myId = appState.profile.userId;
    return appState.items.filter(i => !i.userId || i.userId === 'system' || i.userId === myId);
  }

  function updateHeaderStats() {
    const accessible = getUserAccessibleItems();
    const total = accessible.length;
    const reading = accessible.filter(i => i.status === 'reading').length;
    dom.headerStats.textContent = `${total} judul tersimpan • ${reading} sedang dibaca`;
    dom.shelfCountText.textContent = `${appState.folders.length} Folder`;
  }

  // Render Visual Folder Cards (Bukan Chip! Bentuk Bento Card dengan SVG Bespoke)
  function renderVisualFolders() {
    dom.foldersScrollTrack.innerHTML = '';
    const accessible = getUserAccessibleItems();

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
        <span class="folder-meta-text">${accessible.length} Judul</span>
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
      const visual = getFolderVisual(folder);
      const count = accessible.filter(i => i.folderId === folder.id).length;

      const card = document.createElement('div');
      card.className = `visual-folder-card ${appState.activeFolderId === folder.id && !appState.statusFilter ? 'active' : ''}`;
      card.innerHTML = `
        <div class="folder-icon-circle" style="background: ${visual.bg}; color: ${visual.color};">
          ${visual.svg}
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

  function getFolderForItem(folderId) {
    if (!folderId) return null;
    return appState.folders.find(f => f.id === folderId || f.name.toLowerCase() === String(folderId).trim().toLowerCase()) || null;
  }

  // Render Reading List Feed (Bento Cards: Cover 2:3, Judul, Sinopsis, Status)
  function renderItemsFeed() {
    const accessible = getUserAccessibleItems();

    let filtered = accessible.filter(item => {
      if (appState.statusFilter && item.status !== appState.statusFilter) {
        return false;
      }
      if (appState.activeFolderId !== 'all') {
        const itemFolder = getFolderForItem(item.folderId);
        if (!itemFolder || itemFolder.id !== appState.activeFolderId) {
          return false;
        }
      }
      if (appState.searchQuery.trim()) {
        const q = appState.searchQuery.toLowerCase();
        const folder = getFolderForItem(item.folderId);
        const matchTitle = (item.title || '').toLowerCase().includes(q);
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

  // Tampilan 1: Grid Poster Lega (Cover 2:3 Besar, Luas & Bebas Badge Menumpuk)
  function createReadingPosterCard(item) {
    const folder = getFolderForItem(item.folderId);
    const folderName = folder ? folder.name : (item.folderId || 'Umum');

    const card = document.createElement('div');
    card.className = 'reading-poster-card';
    card.setAttribute('data-id', item.id);

    const statusMap = {
      plan: 'Ingin Baca',
      reading: 'Dibaca',
      completed: 'Tamat'
    };
    const statusKey = item.status || 'plan';

    const coverHtml = renderPosterCoverHtml(item, folder);

    card.innerHTML = `
      <div class="poster-cover-wrap">
        ${coverHtml}
        <div class="poster-floating-status">
          <span class="badge-status-micro status-${statusKey}">
            <span class="status-micro-dot dot-${statusKey}"></span>
            ${statusMap[statusKey] || 'Ingin Baca'}
          </span>
        </div>
        ${(appState.profile.role === 'admin' && item.userName) ? `<div class="poster-owner-tag" title="Pemilik: ${escapeHTML(item.userName)}">👤 ${escapeHTML(item.userName)}</div>` : ''}
      </div>
      <div class="poster-info-wrap">
        <span class="poster-folder-chip">${escapeHTML(folderName)}</span>
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
    const folder = getFolderForItem(item.folderId);
    const folderName = folder ? folder.name : (item.folderId || 'Umum');

    const card = document.createElement('div');
    card.className = 'reading-bento-card';
    card.setAttribute('data-id', item.id);

    const statusMap = {
      plan: 'Ingin Baca',
      reading: 'Dibaca',
      completed: 'Tamat'
    };
    const statusKey = item.status || 'plan';

    const coverHtml = renderBentoCoverHtml(item, folder);

    card.innerHTML = `
      <div class="card-cover-container">
        ${coverHtml}
      </div>
      <div class="card-content-area">
        <div>
          <div class="card-header-line">
            <div class="card-badges-row">
              <span class="badge-status-micro status-${statusKey}">
                <span class="status-micro-dot dot-${statusKey}"></span>
                ${statusMap[statusKey] || 'Ingin Baca'}
              </span>
              <span class="poster-folder-chip">${escapeHTML(folderName)}</span>
              ${(appState.profile.role === 'admin' && item.userName) ? `<span class="item-user-tag">👤 ${escapeHTML(item.userName)}</span>` : ''}
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

  // =========================================================================
  // CUSTOM APK DROPDOWN CONTROLLER (100% BEBAS POPUP SELECT BROWSER)
  // =========================================================================
  let activeOpenDropdownMenu = null;

  document.addEventListener('click', (e) => {
    if (activeOpenDropdownMenu && !e.target.closest('.custom-apk-dropdown')) {
      activeOpenDropdownMenu.classList.add('hidden');
      const trigger = activeOpenDropdownMenu.closest('.custom-apk-dropdown')?.querySelector('.apk-dropdown-trigger');
      if (trigger) trigger.classList.remove('open');
      activeOpenDropdownMenu = null;
    }
  });

  function toggleCustomDropdownMenu(triggerBtn, menuEl) {
    if (!menuEl || !triggerBtn) return;
    const isOpening = menuEl.classList.contains('hidden');

    // Tutup dropdown lain yang sedang terbuka
    if (activeOpenDropdownMenu && activeOpenDropdownMenu !== menuEl) {
      activeOpenDropdownMenu.classList.add('hidden');
      const otherTrigger = activeOpenDropdownMenu.closest('.custom-apk-dropdown')?.querySelector('.apk-dropdown-trigger');
      if (otherTrigger) otherTrigger.classList.remove('open');
      activeOpenDropdownMenu = null;
    }

    if (isOpening) {
      const rect = triggerBtn.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 220 && rect.top > 220) {
        menuEl.classList.add('dropup');
      } else {
        menuEl.classList.remove('dropup');
      }
      menuEl.classList.remove('hidden');
      triggerBtn.classList.add('open');
      activeOpenDropdownMenu = menuEl;
    } else {
      menuEl.classList.add('hidden');
      triggerBtn.classList.remove('open');
      activeOpenDropdownMenu = null;
    }
  }

  function setupApkDropdown({
    triggerBtn,
    menuEl,
    hiddenSelect,
    displayLabelEl,
    items, // [{ value, label, dotColor, iconSvg }]
    initialValue,
    onChange
  }) {
    if (!triggerBtn || !menuEl) return;

    function renderMenu() {
      menuEl.innerHTML = '';
      const curVal = hiddenSelect ? hiddenSelect.value : (initialValue || (items[0] ? items[0].value : ''));

      items.forEach(it => {
        const itemEl = document.createElement('div');
        const isActive = String(it.value) === String(curVal);
        itemEl.className = `apk-dropdown-item ${isActive ? 'active' : ''}`;
        itemEl.setAttribute('data-value', it.value);

        let leftContent = '';
        if (it.dotColor) {
          leftContent += `<span class="apk-dropdown-dot" style="background:${it.dotColor};"></span>`;
        }
        if (it.iconSvg) {
          leftContent += `<span class="apk-dropdown-dot" style="display:inline-flex;align-items:center;">${it.iconSvg}</span>`;
        }
        leftContent += `<span class="apk-dropdown-item-text">${escapeHTML(it.label)}</span>`;

        itemEl.innerHTML = `
          <div class="apk-dropdown-item-left">${leftContent}</div>
          ${isActive ? '<svg class="apk-dropdown-check svg-icon icon-xs" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
        `;

        itemEl.addEventListener('click', (e) => {
          e.stopPropagation();
          if (hiddenSelect) {
            hiddenSelect.value = it.value;
            hiddenSelect.dispatchEvent(new Event('change'));
          }
          if (displayLabelEl) {
            if (it.dotColor) {
              displayLabelEl.innerHTML = `<span class="apk-dropdown-dot" style="background:${it.dotColor};"></span> <span>${escapeHTML(it.label)}</span>`;
            } else {
              displayLabelEl.textContent = it.label;
            }
          }
          toggleCustomDropdownMenu(triggerBtn, menuEl);
          renderMenu();
          if (onChange) onChange(it.value);
        });

        menuEl.appendChild(itemEl);
      });

      // Update label trigger
      const activeItem = items.find(i => String(i.value) === String(curVal)) || items[0];
      if (activeItem && displayLabelEl) {
        if (activeItem.dotColor) {
          displayLabelEl.innerHTML = `<span class="apk-dropdown-dot" style="background:${activeItem.dotColor};"></span> <span>${escapeHTML(activeItem.label)}</span>`;
        } else {
          displayLabelEl.textContent = activeItem.label;
        }
      }
    }

    renderMenu();

    triggerBtn.onclick = (e) => {
      e.stopPropagation();
      renderMenu();
      toggleCustomDropdownMenu(triggerBtn, menuEl);
    };
  }

  function populateFolderSelects() {
    const folderItems = appState.folders.map(f => {
      const visual = getFolderVisual(f);
      return {
        value: f.id,
        label: f.name,
        dotColor: visual.color
      };
    });

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

    // Custom APK Dropdown untuk Target Folder Hasil Scan
    const triggerRes = document.getElementById('btn-trigger-results-folder');
    const menuRes = document.getElementById('menu-dropdown-results-folder');
    const labelRes = document.getElementById('results-folder-display-label');
    if (triggerRes && menuRes && dom.resultsTargetFolder) {
      setupApkDropdown({
        triggerBtn: triggerRes,
        menuEl: menuRes,
        hiddenSelect: dom.resultsTargetFolder,
        displayLabelEl: labelRes,
        items: folderItems,
        initialValue: dom.resultsTargetFolder.value || (appState.folders[0]?.id || '')
      });
    }

    // Custom APK Dropdown untuk Folder Item Detail
    const triggerItemF = document.getElementById('btn-trigger-item-folder');
    const menuItemF = document.getElementById('menu-dropdown-item-folder');
    const labelItemF = document.getElementById('item-folder-display-label');
    const selItemF = document.getElementById('item-folder-select');
    if (triggerItemF && menuItemF && selItemF) {
      setupApkDropdown({
        triggerBtn: triggerItemF,
        menuEl: menuItemF,
        hiddenSelect: selItemF,
        displayLabelEl: labelItemF,
        items: folderItems,
        initialValue: selItemF.value || (appState.folders[0]?.id || '')
      });
    }
  }

  // =========================================================================
  // 5. GEMINI 3.8 FLASH VISION ENGINE & CANVAS AUTO-CROP (MULTI-PHOTO BATCH)
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
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleUploadedScreenshots(e.dataTransfer.files);
      }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files.length > 0) {
        handleUploadedScreenshots(fileInput.files);
      }
    });

    window.addEventListener('paste', (e) => {
      const items = e.clipboardData ? e.clipboardData.items : [];
      const imageFiles = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type && items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) imageFiles.push(file);
        }
      }
      if (imageFiles.length > 0) {
        openScannerModal();
        handleUploadedScreenshots(imageFiles);
      }
    });

    if (dom.btnMinimizeScanner) {
      dom.btnMinimizeScanner.addEventListener('click', minimizeScannerToBackground);
    }
    if (dom.btnOpenScanBanner) {
      dom.btnOpenScanBanner.addEventListener('click', maximizeScannerBanner);
    }
    if (dom.btnAddScanResult) {
      dom.btnAddScanResult.addEventListener('click', addNewScannedItemCard);
    }

    dom.btnSaveScanned.addEventListener('click', saveScannedItemsToCollection);
  }

  function minimizeScannerToBackground() {
    dom.modalScanner.classList.add('hidden');
    appState.isScannerMinimized = true;
    if (dom.floatingScanBanner) {
      dom.floatingScanBanner.classList.remove('hidden');
      updateFloatingBannerStatus();
    }
    showToast('Pemindaian berjalan di latar belakang. Tetap aman saat lo ganti aplikasi.');
  }

  function maximizeScannerBanner() {
    if (dom.floatingScanBanner) dom.floatingScanBanner.classList.add('hidden');
    appState.isScannerMinimized = false;
    dom.modalScanner.classList.remove('hidden');

    if (appState.isScanningActive) {
      dom.scannerDropzone.classList.add('hidden');
      dom.scannerResults.classList.add('hidden');
      dom.scannerProcessing.classList.remove('hidden');
      dom.btnSaveScanned.classList.add('hidden');
    } else if (appState.pendingScannedItems.length > 0) {
      dom.scannerDropzone.classList.add('hidden');
      dom.scannerProcessing.classList.add('hidden');
      dom.scannerResults.classList.remove('hidden');
      dom.btnSaveScanned.classList.remove('hidden');
    } else {
      openScannerModal();
    }
  }

  function updateFloatingBannerStatus() {
    if (!dom.floatingScanBanner) return;
    const total = appState.scanQueue.length;
    const completed = appState.scanQueue.filter(j => j.status === 'completed').length;
    const itemsCount = appState.pendingScannedItems.length;

    if (appState.isScanningActive) {
      if (dom.scanBannerTitle) dom.scanBannerTitle.textContent = `Memindai Foto ${completed + 1} dari ${total}...`;
      if (dom.scanBannerSub) dom.scanBannerSub.textContent = `${itemsCount} judul terdeteksi sejauh ini`;
      if (dom.btnOpenScanBanner) dom.btnOpenScanBanner.textContent = 'Buka';
    } else if (total > 0 && completed === total) {
      if (dom.scanBannerTitle) dom.scanBannerTitle.textContent = `✅ Selesai memindai ${total} foto!`;
      if (dom.scanBannerSub) dom.scanBannerSub.textContent = `${itemsCount} judul siap ditinjau & disimpan`;
      if (dom.btnOpenScanBanner) dom.btnOpenScanBanner.textContent = 'Lihat Hasil';
    }
  }

  async function handleUploadedScreenshots(fileList) {
    const rawFiles = Array.from(fileList).filter(f => f && f.type && f.type.startsWith('image/'));
    if (rawFiles.length === 0) {
      showToast('Harap pilih file gambar screenshot.');
      return;
    }

    showToast(`Menyiapkan ${rawFiles.length} foto untuk dipindai...`);

    // Tampilkan state processing
    dom.scannerDropzone.classList.add('hidden');
    dom.scannerResults.classList.add('hidden');
    dom.scannerProcessing.classList.remove('hidden');
    dom.btnSaveScanned.classList.add('hidden');

    for (let i = 0; i < rawFiles.length; i++) {
      const file = rawFiles[i];
      const dataUrl = await new Promise(res => {
        const reader = new FileReader();
        reader.onload = e => res(e.target.result);
        reader.readAsDataURL(file);
      });

      const job = {
        id: 'scan-' + Date.now() + '-' + i + '-' + Math.random().toString(36).substr(2, 4),
        name: file.name || `Screenshot ${i + 1}`,
        dataUrl,
        status: 'pending',
        extractedItems: []
      };

      appState.scanQueue.push(job);
      saveScanJobToDB(job);
    }

    if (!appState.isScanningActive) {
      processScanQueue();
    }
  }

  async function processScanQueue() {
    if (appState.isScanningActive) return;
    appState.isScanningActive = true;

    // Layar tetap aktif saat proses scanning berjalan
    let wakeLock = null;
    try {
      if ('wakeLock' in navigator) {
        wakeLock = await navigator.wakeLock.request('screen');
      }
    } catch (e) {}

    try {
      while (true) {
        const pendingJob = appState.scanQueue.find(j => j.status === 'pending');
        if (!pendingJob) break;

        const totalJobs = appState.scanQueue.length;
        const currentIdx = appState.scanQueue.indexOf(pendingJob);
        const completedJobs = appState.scanQueue.filter(j => j.status === 'completed').length;

        pendingJob.status = 'processing';
        saveScanJobToDB(pendingJob);

        // Update UI (Format judul bersih tanpa membungkus nama file panjang WhatsApp)
        if (dom.scanPreviewImg) dom.scanPreviewImg.src = pendingJob.dataUrl;

        let displayJobName = `Foto ${completedJobs + 1} dari ${totalJobs}`;
        if (pendingJob.name) {
          if (pendingJob.name.toLowerCase().includes('whatsapp')) {
            displayJobName = `Screenshot #${completedJobs + 1}`;
          } else {
            const clean = pendingJob.name.replace(/\.[^/.]+$/, '');
            displayJobName = clean.length > 20 ? clean.substring(0, 18) + '...' : clean;
          }
        }
        if (dom.scanProcessingTitle) dom.scanProcessingTitle.textContent = `Memindai ${displayJobName}`;
        if (dom.scanStatusTicker) {
          dom.scanStatusTicker.textContent = totalJobs > 1 
            ? `Foto ${completedJobs + 1} dari ${totalJobs} • Mengekstrak judul & auto-crop` 
            : 'Mengekstrak judul & auto-crop sampul via Gemini 3.8';
        }

        const percent = Math.round(((completedJobs) / totalJobs) * 100);
        if (dom.queueProgressBar) dom.queueProgressBar.style.width = `${percent}%`;
        if (dom.queueCountBadge) dom.queueCountBadge.textContent = `Foto ${completedJobs + 1} dari ${totalJobs} (${percent}%)`;

        if (appState.isScannerMinimized) {
          updateFloatingBannerStatus();
        }

        // Jalankan Vision AI
        const apiKey = appState.settings.geminiApiKey.trim();
        let extractedRaw = null;

        if (apiKey) {
          try {
            extractedRaw = await callGemini38FlashVision(pendingJob.dataUrl, apiKey);
          } catch (err) {
            console.warn('[Scanner] Vision error, fallback to trained extractor:', err);
            extractedRaw = await fallbackTrainedExtractor(pendingJob.dataUrl);
          }
        } else {
          await new Promise(r => setTimeout(r, 800));
          extractedRaw = await fallbackTrainedExtractor(pendingJob.dataUrl);
        }

        // Crop sampul untuk setiap item
        const img = new Image();
        await new Promise(res => { img.onload = res; img.src = pendingJob.dataUrl; });
        const naturalW = img.naturalWidth;
        const naturalH = img.naturalHeight;

        const croppedItems = [];
        if (Array.isArray(extractedRaw)) {
          for (let itIdx = 0; itIdx < extractedRaw.length; itIdx++) {
            const it = extractedRaw[itIdx];
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

            // JANGAN gunakan teks sebagai cover! Jika tidak ada foto asli (box_2d null), biarkan kosong agar memakai SVG vektor
            if (!croppedCover) {
              croppedCover = '';
            }

            // Pilih folder berdasarkan saran kategori AI atau folder aktif
            let targetFolder = dom.resultsTargetFolder.value || (appState.activeFolderId !== 'all' ? appState.activeFolderId : appState.folders[0]?.id);
            if (it.suggestedFolder) {
              const matchedF = appState.folders.find(f => 
                f.name.toLowerCase() === it.suggestedFolder.toLowerCase() || 
                it.suggestedFolder.toLowerCase().includes(f.name.toLowerCase()) ||
                f.name.toLowerCase().includes(it.suggestedFolder.toLowerCase())
              );
              if (matchedF) {
                targetFolder = matchedF.id;
              }
            }

            croppedItems.push({
              tempId: 'temp-' + Date.now() + '-' + currentIdx + '-' + itIdx,
              title: it.title || 'Tanpa Judul',
              desc: it.description || it.desc || '',
              folderId: targetFolder,
              status: 'plan',
              coverUrl: croppedCover,
              selected: true
            });
          }
        }

        pendingJob.extractedItems = croppedItems;
        pendingJob.status = 'completed';
        saveScanJobToDB(pendingJob);

        // Tambahkan ke pending items global
        appState.pendingScannedItems.push(...croppedItems);

        // Berikan jeda 2 detik sebelum foto berikutnya agar aman dari limit
        const hasMore = appState.scanQueue.some(j => j.status === 'pending');
        if (hasMore) {
          if (dom.scanStatusTicker) dom.scanStatusTicker.textContent = `Foto ${completedJobs + 1} selesai (${croppedItems.length} judul). Mempersiapkan foto berikutnya...`;
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    } finally {
      appState.isScanningActive = false;
      if (wakeLock) {
        try { wakeLock.release(); } catch (e) {}
      }
    }

    // Pemindaian seluruh foto selesai
    const totalPhotos = appState.scanQueue.length;
    if (dom.queueProgressBar) dom.queueProgressBar.style.width = '100%';
    if (dom.queueCountBadge) dom.queueCountBadge.textContent = `Selesai ${totalPhotos} Foto!`;

    if (appState.isScannerMinimized) {
      updateFloatingBannerStatus();
      showToast(`Selesai! Berhasil memindai ${totalPhotos} foto (${appState.pendingScannedItems.length} judul ditemukan).`);
      triggerNativeHaptic();
    } else {
      displayConsolidatedScanResults();
    }
  }

  function displayConsolidatedScanResults() {
    dom.scannerProcessing.classList.add('hidden');
    dom.scannerDropzone.classList.add('hidden');
    dom.scannerResults.classList.remove('hidden');
    dom.btnSaveScanned.classList.remove('hidden');
    if (dom.floatingScanBanner) dom.floatingScanBanner.classList.add('hidden');
    appState.isScannerMinimized = false;

    dom.resultsList.innerHTML = '';
    populateFolderSelects();

    if (appState.pendingScannedItems.length === 0) {
      dom.resultsCountText.textContent = 'Tidak ada judul yang terdeteksi';
      dom.resultsList.innerHTML = `
        <div class="empty-state" style="padding: 24px 16px;">
          <p class="empty-state-desc">Gambar tidak memuat judul yang terbaca, atau API Key belum diisi.</p>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-add-manual-scan-fallback">+ Tambah Judul Manual</button>
        </div>
      `;
      const btnFallback = document.getElementById('btn-add-manual-scan-fallback');
      if (btnFallback) btnFallback.addEventListener('click', addNewScannedItemCard);
    } else {
      dom.resultsCountText.textContent = `Ditemukan ${appState.pendingScannedItems.length} Judul`;
      appState.pendingScannedItems.forEach((itemObj, idx) => {
        const card = createScannedItemResultCard(itemObj, idx);
        dom.resultsList.appendChild(card);
      });
    }

    updateSaveScanButtonText();
  }

  function createScannedItemResultCard(itemObj, idx) {
    const resCard = document.createElement('div');
    resCard.className = 'result-item-card';
    resCard.setAttribute('data-temp-id', itemObj.tempId);

    const defaultFolderId = itemObj.folderId || dom.resultsTargetFolder.value || (appState.folders[0]?.id || 'f-manhwa');
    itemObj.folderId = defaultFolderId;

    const currentF = appState.folders.find(f => f.id === defaultFolderId) || appState.folders[0];
    const visual = getFolderVisual(currentF);

    const statusMap = {
      plan: { label: 'Ingin Dibaca', color: '#f59e0b', dotClass: 'dot-plan' },
      reading: { label: 'Sedang Dibaca', color: '#4f46e5', dotClass: 'dot-reading' },
      completed: { label: 'Selesai', color: '#10b981', dotClass: 'dot-completed' }
    };
    const curStatus = statusMap[itemObj.status] || statusMap.plan;

    const hasCover = !!(itemObj.coverUrl && itemObj.coverUrl.trim());

    resCard.innerHTML = `
      <div class="result-check-wrap">
        <input type="checkbox" class="result-checkbox" ${itemObj.selected ? 'checked' : ''} aria-label="Pilih judul ini">
      </div>
      <div class="result-cover-thumb" title="Ketuk untuk memilih foto lain">
        <img class="result-thumb-img ${hasCover ? '' : 'hidden'}" src="${itemObj.coverUrl || ''}" alt="${escapeHTML(itemObj.title)}" />
        <div class="result-no-cover-art ${hasCover ? 'hidden' : ''}">
          <svg class="svg-icon" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
          <span class="result-no-cover-text">Cover Vektor</span>
        </div>
        <div class="result-cover-edit-btn">
          <svg class="svg-icon icon-xs" viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          <span class="btn-cover-label">${hasCover ? 'Ganti Foto' : '+ Pilih Foto'}</span>
        </div>
        <input type="file" accept="image/*" class="result-cover-input file-hidden-input">
      </div>
      <div class="result-inputs">
        <div class="result-card-top-row">
          <input type="text" class="input-result-title" value="${escapeHTML(itemObj.title)}" placeholder="Judul karya...">
          <button type="button" class="btn-remove-scan-item" title="Hapus judul ini dari daftar">
            <svg class="svg-icon icon-xs" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            Hapus
          </button>
        </div>
        <textarea class="input-result-desc" rows="2" placeholder="Sinopsis singkat / catatan...">${escapeHTML(itemObj.desc)}</textarea>
        <div class="result-row-extras">
          <div class="result-selectors">
            <!-- Custom APK Dropdown for Folder -->
            <div class="custom-apk-dropdown inline card-folder-dd">
              <button type="button" class="apk-dropdown-trigger sm card-folder-trigger">
                <span class="apk-dropdown-label card-folder-label">
                  <span class="apk-dropdown-dot" style="background:${visual.color};"></span>
                  <span class="apk-dropdown-text">${escapeHTML(currentF ? currentF.name : 'Folder')}</span>
                </span>
                <svg class="svg-icon icon-xs apk-dropdown-chevron" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>
              </button>
              <div class="apk-dropdown-menu hidden card-folder-menu"></div>
            </div>

            <!-- Custom APK Dropdown for Status -->
            <div class="custom-apk-dropdown inline card-status-dd">
              <button type="button" class="apk-dropdown-trigger sm card-status-trigger">
                <span class="apk-dropdown-label card-status-label">
                  <span class="status-indicator-dot ${curStatus.dotClass}"></span>
                  <span class="apk-dropdown-text">${curStatus.label}</span>
                </span>
                <svg class="svg-icon icon-xs apk-dropdown-chevron" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>
              </button>
              <div class="apk-dropdown-menu hidden card-status-menu"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    const chk = resCard.querySelector('.result-checkbox');
    const titleInput = resCard.querySelector('.input-result-title');
    const descInput = resCard.querySelector('.input-result-desc');
    const btnRemove = resCard.querySelector('.btn-remove-scan-item');
    const thumbWrap = resCard.querySelector('.result-cover-thumb');
    const thumbImg = resCard.querySelector('.result-thumb-img');
    const thumbInput = resCard.querySelector('.result-cover-input');

    // Setup Custom Dropdown untuk Folder
    const triggerCardF = resCard.querySelector('.card-folder-trigger');
    const menuCardF = resCard.querySelector('.card-folder-menu');
    const labelCardF = resCard.querySelector('.card-folder-label');
    const folderItems = appState.folders.map(f => {
      const vis = getFolderVisual(f);
      return { value: f.id, label: f.name, dotColor: vis.color };
    });
    setupApkDropdown({
      triggerBtn: triggerCardF,
      menuEl: menuCardF,
      displayLabelEl: labelCardF,
      items: folderItems,
      initialValue: itemObj.folderId,
      onChange: (val) => { itemObj.folderId = val; }
    });

    // Setup Custom Dropdown untuk Status
    const triggerCardS = resCard.querySelector('.card-status-trigger');
    const menuCardS = resCard.querySelector('.card-status-menu');
    const labelCardS = resCard.querySelector('.card-status-label');
    setupApkDropdown({
      triggerBtn: triggerCardS,
      menuEl: menuCardS,
      displayLabelEl: labelCardS,
      items: [
        { value: 'plan', label: 'Ingin Dibaca', dotColor: '#f59e0b' },
        { value: 'reading', label: 'Sedang Dibaca', dotColor: '#4f46e5' },
        { value: 'completed', label: 'Selesai', dotColor: '#10b981' }
      ],
      initialValue: itemObj.status,
      onChange: (val) => { itemObj.status = val; }
    });

    // 1. Checkbox toggle
    chk.addEventListener('change', () => {
      itemObj.selected = chk.checked;
      updateSaveScanButtonText();
    });

    // 2. Edit Text
    titleInput.addEventListener('input', () => { itemObj.title = titleInput.value; });
    descInput.addEventListener('input', () => { itemObj.desc = descInput.value; });

    // 3. Edit Cover Photo (Ganti Foto / Pilih Foto Lain)
    thumbWrap.addEventListener('click', (e) => {
      e.stopPropagation();
      thumbInput.click();
    });
    thumbInput.addEventListener('change', () => {
      if (thumbInput.files && thumbInput.files[0]) {
        const file = thumbInput.files[0];
        const reader = new FileReader();
        reader.onload = (ev) => {
          itemObj.coverUrl = ev.target.result;
          thumbImg.src = ev.target.result;
          thumbImg.classList.remove('hidden');
          const noCoverDiv = resCard.querySelector('.result-no-cover-art');
          if (noCoverDiv) noCoverDiv.classList.add('hidden');
          const labelSpan = resCard.querySelector('.btn-cover-label');
          if (labelSpan) labelSpan.textContent = 'Ganti Foto';
          showToast('Foto sampul berhasil dipasang!');
        };
        reader.readAsDataURL(file);
      }
    });

    // 4. Hapus Judul
    btnRemove.addEventListener('click', (e) => {
      e.stopPropagation();
      appState.pendingScannedItems = appState.pendingScannedItems.filter(i => i.tempId !== itemObj.tempId);
      resCard.remove();
      dom.resultsCountText.textContent = `Ditemukan ${appState.pendingScannedItems.length} Judul`;
      updateSaveScanButtonText();
      showToast('Judul dihapus dari hasil scan.');
    });

    return resCard;
  }

  function addNewScannedItemCard() {
    const defaultFolder = dom.resultsTargetFolder.value || (appState.activeFolderId !== 'all' ? appState.activeFolderId : appState.folders[0]?.id);
    const newItemObj = {
      tempId: 'temp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      title: '',
      desc: '',
      folderId: defaultFolder,
      status: 'plan',
      coverUrl: '',
      selected: true
    };

    appState.pendingScannedItems.push(newItemObj);

    const emptyMsg = dom.resultsList.querySelector('.empty-state');
    if (emptyMsg) emptyMsg.remove();

    const card = createScannedItemResultCard(newItemObj, appState.pendingScannedItems.length - 1);
    dom.resultsList.appendChild(card);
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    const inputTitle = card.querySelector('.input-result-title');
    if (inputTitle) inputTitle.focus();

    dom.resultsCountText.textContent = `Ditemukan ${appState.pendingScannedItems.length} Judul`;
    updateSaveScanButtonText();
    showToast('Judul baru ditambahkan. Silakan isi judul & ganti sampul.');
  }

  function updateSaveScanButtonText() {
    const selectedCount = appState.pendingScannedItems.filter(i => i.selected).length;
    dom.btnSaveScanned.textContent = `Simpan ${selectedCount} Judul ke Folder`;
    dom.btnSaveScanned.disabled = selectedCount === 0;
  }

  function saveScannedItemsToCollection() {
    const defaultFolderId = dom.resultsTargetFolder.value || (appState.activeFolderId !== 'all' ? appState.activeFolderId : appState.folders[0]?.id);
    const selectedItems = appState.pendingScannedItems.filter(i => i.selected && i.title.trim());

    if (selectedItems.length === 0) {
      showToast('Pilih minimal 1 judul yang memiliki nama.');
      return;
    }

    selectedItems.forEach((it, i) => {
      const newItem = {
        id: 'item-' + Date.now() + '-' + i,
        title: it.title.trim(),
        desc: it.desc.trim(),
        folderId: it.folderId || defaultFolderId,
        status: it.status || 'plan',
        link: '',
        coverUrl: it.coverUrl || '',
        createdAt: Date.now() + i,
        userId: appState.profile.userId,
        userName: appState.profile.userName
      };

      appState.items.unshift(newItem);
      saveItemToDB(newItem);
    });

    closeScannerModal();
    if (dom.floatingScanBanner) dom.floatingScanBanner.classList.add('hidden');
    appState.isScannerMinimized = false;
    appState.scanQueue = [];
    clearScanQueueDB();

    renderAll();
    showToast(`Berhasil menyimpan ${selectedItems.length} bacaan baru!`);
  }

  /**
   * Panggilan Cerdas Gemini Vision API dengan Deteksi Model Dinamis (ListModels)
   * Menyelesaikan masalah 404 dengan otomatis memilih model yang aktif pada API Key pengguna.
   */
  async function callGemini38FlashVision(base64DataUrl, apiKey) {
    const base64Pure = base64DataUrl.split(',')[1];
    const mimeType = base64DataUrl.split(';')[0].split(':')[1] || 'image/jpeg';

    const systemPrompt = `Anda adalah AI Vision Expert spesialis mengekstrak koleksi dari aneka screenshot: rekomendasi anime/komik/manga, menu kuliner/kafe, checklist belanja, dan diagram/infografis.

TUGAS UTAMA:
1. Temukan seluruh entitas/karya/item di dalam screenshot.
2. Judul bersih (Latin): Bersihkan nomor urut (contoh: hapus "#1", "Top 2", "1."), buang bullet point/simbol.
3. Deskripsi & Detail:
   - Jika ada rating/skor (contoh MAL score, bintang), masukkan ke deskripsi.
   - Jika ada harga & bahan/komposisi (seperti menu kafe), masukkan ke deskripsi ("Harga: ... | Bahan: ...").
   - Jika ada kegunaan/fungsi (seperti diagram), masukkan ke deskripsi.
4. Kategori/Folder ("suggestedFolder"): Tebak nama rak folder yang cocok berdasarkan konteks screenshot (misal: "Anime & Film", "Kuliner & Menu", "Daftar Belanja", "Teknologi & Belajar").
5. ATURAN MUTLAK FOTO SAMPUL (NO TEXT CROPS - JANGAN JADIKAN TEKS SEBAGAI COVER):
   - HANYA sertakan "box_2d": [ymin, xmin, ymax, xmax] (skala 0-1000) JIKA DAN HANYA JIKA item memiliki FOTO ILUSTRASI / POSTER BERGAMBAR ASLI (seperti gambar anime/manga/foto nyata).
   - JANGAN PERNAH CROP TEKS, HARGA, ATAU TABEL MENJADI COVER!
   - Jika item TIDAK MEMILIKI FOTO (misalnya hanya berupa tulisan nama menu, checklist belanjaan, atau kotak diagram teks), Anda WAJIB mengisi "box_2d": null.

PANDUAN 4 CONTOH POLA SCREENSHOT:
[Pola 1: Grid Rekomendasi Media / Anime Top 30]
Karakteristik: Kotak kartu berisi ranking, poster karya, judul, rating.
Output:
{
  "title": "Sousou no Frieren",
  "description": "Rating: 9.32/10 (MyAnimeList) | Genre: Adventure, Fantasy",
  "suggestedFolder": "Anime & Film",
  "box_2d": [ymin, xmin, ymax, xmax] // Koordinat poster ilustrasinya
}

[Pola 2: Menu Makanan / Kafe Horangi Cafetería]
Karakteristik: Kategori menu, nama makanan, harga, dan rincian bahan/topping.
Output:
{
  "title": "Hamburguesa Clásica",
  "description": "Harga: $14.000 COP | Bahan: Pan brioche, 150g carne res, queso cheddar, vegetales",
  "suggestedFolder": "Kuliner & Menu",
  "box_2d": null // WAJIB null karena tidak ada foto produk!
}

[Pola 3: Checklist Belanjaan / Groceries]
Karakteristik: Kartu kategori bahan (Dairy & Refrigerated, Bakery, Produce) berisi item belanja.
Output:
{
  "title": "Organic Whole Milk",
  "description": "Kategori: Dairy & Refrigerated | Catatan: 1 Gallon",
  "suggestedFolder": "Daftar Belanja",
  "box_2d": null // WAJIB null karena hanya checklist tulisan!
}

[Pola 4: Diagram Komponen Website / Arsitektur]
Karakteristik: Diagram alur atau komponen antarmuka dengan label dan fungsi teknis.
Output:
{
  "title": "Call to Action (CTA)",
  "description": "Komponen tombol/banner visual terarah untuk memandu aksi konversi utama pengunjung",
  "suggestedFolder": "Teknologi & Belajar",
  "box_2d": null // WAJIB null karena bukan foto sampul!
}

Format WAJIB: JSON array murni tanpa format markdown:
[
  {
    "title": "Nama Item Bersih",
    "description": "Detail ringkas",
    "suggestedFolder": "Nama Folder",
    "box_2d": [ymin, xmin, ymax, xmax] atau null
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

  // Fallback Simulator cerdas yang menerapkan 4 pola ekstraksi hasil pelatihan
  async function fallbackTrainedExtractor(dataUrl) {
    return [
      {
        title: 'Sousou no Frieren',
        description: 'Rating: 9.32/10 (MyAnimeList) | Frieren sang penyihir elf merefleksikan makna hidup dan ikatan manusia.',
        suggestedFolder: 'Anime & Film',
        box_2d: [80, 40, 360, 280]
      },
      {
        title: 'Hamburguesa Horangi Especial',
        description: 'Harga: $18.500 COP | Pan brioche, doble carne de res 200g, doble queso cheddar, tocineta crocante.',
        suggestedFolder: 'Kuliner & Menu',
        box_2d: null
      },
      {
        title: 'Organic Whole Milk',
        description: 'Kategori: Dairy & Refrigerated | 1 Gallon susu segar pasteurisasi.',
        suggestedFolder: 'Daftar Belanja',
        box_2d: null
      },
      {
        title: 'Call to Action (CTA)',
        description: 'Elemen antarmuka visual terarah untuk memicu konversi aksi pengunjung website.',
        suggestedFolder: 'Teknologi & Belajar',
        box_2d: null
      }
    ];
  }

  async function displayScanResults(items, originalDataUrl) {
    displayConsolidatedScanResults();
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

    // Sinkronkan custom APK dropdown folder
    populateFolderSelects();
    const selFolderId = isEdit ? item.folderId : (appState.activeFolderId !== 'all' ? appState.activeFolderId : (appState.folders[0]?.id || ''));
    const fSel = document.getElementById('item-folder-select');
    if (fSel) fSel.value = selFolderId;
    applyActiveDropdownValue(
      document.getElementById('menu-dropdown-item-folder'),
      document.getElementById('item-folder-display-label'),
      fSel,
      selFolderId
    );

    // Sinkronkan custom APK dropdown status
    const selStatus = isEdit ? (item.status || 'plan') : 'plan';
    const sSel = document.getElementById('item-status-select');
    if (sSel) sSel.value = selStatus;
    applyActiveDropdownValue(
      document.getElementById('menu-dropdown-item-status'),
      document.getElementById('item-status-display-label'),
      sSel,
      selStatus
    );

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
    // Inisialisasi Custom APK Dropdown Status Item
    setupApkDropdown({
      triggerBtn: document.getElementById('btn-trigger-item-status'),
      menuEl: document.getElementById('menu-dropdown-item-status'),
      displayLabelEl: document.getElementById('item-status-display-label'),
      selectEl: document.getElementById('item-status-select'),
      items: [
        { value: 'plan', label: 'Ingin Dibaca', statusDot: 'plan' },
        { value: 'reading', label: 'Sedang Dibaca', statusDot: 'reading' },
        { value: 'completed', label: 'Selesai', statusDot: 'completed' }
      ],
      initialValue: 'plan',
      onChange: (val) => {
        const s = document.getElementById('item-status-select');
        if (s) s.value = val;
      }
    });

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
          createdAt: Date.now(),
          userId: appState.profile.userId,
          userName: appState.profile.userName
        };
        appState.items.unshift(newItem);
        saveItemToDB(newItem);
      }

      closeItemDetailModal();
      renderAll();
      showToast('Data bacaan berhasil disimpan!');
    });

    document.getElementById('btn-delete-item').addEventListener('click', async () => {
      const id = document.getElementById('item-id-hidden').value;
      if (!id) return;
      const confirmed = await showConfirmDialog({
        title: 'Hapus Karya Bacaan?',
        message: 'Karya ini akan dihapus permanen dari rak koleksi.',
        confirmText: 'Hapus',
        isDanger: true
      });
      if (confirmed) {
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
  // 7. FOLDER MANAGEMENT (12 WARNA & 12 IKON BESPOKE SVG + LIVE PREVIEW)
  // =========================================================================
  function updateFolderModalPreview() {
    const nameInput = document.getElementById('folder-name-input');
    const iconInput = document.getElementById('folder-icon-input');
    const colorInput = document.getElementById('folder-color-input');

    const previewName = document.getElementById('preview-folder-name');
    const previewBox = document.getElementById('preview-folder-icon-box');

    const curName = nameInput ? nameInput.value.trim() : '';
    const curIcon = iconInput ? iconInput.value : 'flame';
    const curColor = colorInput ? colorInput.value : 'flame';

    if (previewName) {
      previewName.textContent = curName || 'Nama Folder';
    }

    const colorDef = FOLDER_COLORS[curColor] || FOLDER_COLORS.flame;
    const iconSvg = FOLDER_ICONS[curIcon] || FOLDER_ICONS.flame;

    if (previewBox) {
      previewBox.style.background = colorDef.bg;
      previewBox.style.color = colorDef.color;
      previewBox.innerHTML = iconSvg;
    }
  }

  function setActiveFolderIcon(iconKey) {
    const iconInput = document.getElementById('folder-icon-input');
    if (iconInput) iconInput.value = iconKey;

    const iconBtns = document.querySelectorAll('#folder-icon-picker .folder-icon-btn');
    iconBtns.forEach(b => {
      const isMatch = b.getAttribute('data-icon') === iconKey;
      b.classList.toggle('active', isMatch);
      if (isMatch) {
        const lbl = document.getElementById('label-active-icon');
        if (lbl) lbl.textContent = b.getAttribute('title') || iconKey;
      }
    });
    updateFolderModalPreview();
  }

  function setActiveFolderColorDot(colorKey) {
    const colorInput = document.getElementById('folder-color-input');
    if (colorInput) colorInput.value = colorKey;

    const dots = document.querySelectorAll('#folder-color-picker .color-dot');
    dots.forEach(d => {
      const isMatch = d.getAttribute('data-color') === colorKey;
      d.classList.toggle('active', isMatch);
      if (isMatch) {
        const lbl = document.getElementById('label-active-color');
        if (lbl) lbl.textContent = d.getAttribute('title') || colorKey;
      }
    });
    updateFolderModalPreview();
  }

  function openNewFolderModal() {
    dom.modalFolder.classList.remove('hidden');
    document.getElementById('folder-modal-title').textContent = 'Folder Baru';
    document.getElementById('folder-id-hidden').value = '';
    document.getElementById('folder-name-input').value = '';
    document.getElementById('btn-delete-folder').classList.add('hidden');
    setActiveFolderIcon('flame');
    setActiveFolderColorDot('flame');
  }

  function openEditFolderModal(folder) {
    dom.modalFolder.classList.remove('hidden');
    document.getElementById('folder-modal-title').textContent = 'Edit Folder';
    document.getElementById('folder-id-hidden').value = folder.id;
    document.getElementById('folder-name-input').value = folder.name;
    document.getElementById('btn-delete-folder').classList.remove('hidden');
    setActiveFolderIcon(folder.icon || folder.color || 'flame');
    setActiveFolderColorDot(folder.color || 'flame');
  }

  function closeFolderModal() {
    dom.modalFolder.classList.add('hidden');
    dom.formFolder.reset();
  }

  function initFolderEvents() {
    const iconPicker = document.getElementById('folder-icon-picker');
    if (iconPicker) {
      iconPicker.addEventListener('click', (e) => {
        const btn = e.target.closest('.folder-icon-btn');
        if (btn) {
          const key = btn.getAttribute('data-icon');
          if (key) setActiveFolderIcon(key);
        }
      });
    }

    const colorPicker = document.getElementById('folder-color-picker');
    if (colorPicker) {
      colorPicker.addEventListener('click', (e) => {
        const dot = e.target.closest('.color-dot');
        if (dot) {
          const key = dot.getAttribute('data-color');
          if (key) setActiveFolderColorDot(key);
        }
      });
    }

    const nameInput = document.getElementById('folder-name-input');
    if (nameInput) {
      nameInput.addEventListener('input', updateFolderModalPreview);
    }

    dom.formFolder.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('folder-id-hidden').value;
      const name = document.getElementById('folder-name-input').value.trim();
      const icon = document.getElementById('folder-icon-input').value || 'flame';
      const color = document.getElementById('folder-color-input').value || 'flame';

      if (!name) {
        showToast('Nama folder tidak boleh kosong.');
        return;
      }

      if (id) {
        const f = appState.folders.find(x => x.id === id);
        if (f) {
          f.name = name;
          f.color = color;
          f.icon = icon;
          saveFolderToDB(f);
        }
      } else {
        const newFolder = {
          id: 'f-' + Date.now(),
          name,
          color,
          icon,
          createdAt: Date.now(),
          userId: appState.profile.userId
        };
        appState.folders.push(newFolder);
        saveFolderToDB(newFolder);
      }

      closeFolderModal();
      renderAll();
      showToast('Folder berhasil disimpan!');
    });

    document.getElementById('btn-delete-folder').addEventListener('click', async () => {
      const id = document.getElementById('folder-id-hidden').value;
      if (!id) return;
      const confirmed = await showConfirmDialog({
        title: 'Hapus Folder Rak?',
        message: 'Item di dalamnya tetap aman dan dipindahkan ke rak Umum.',
        confirmText: 'Hapus Folder',
        isDanger: true
      });
      if (confirmed) {
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

const ITEM_HEADERS = ["ID", "Judul", "Folder_ID", "Status", "Deskripsi", "Cover_URL", "Dibuat_Pada", "User_ID", "User_Name"];
const FOLDER_HEADERS = ["ID", "Nama_Folder", "Warna_Ikon", "User_ID", "Icon_Key"];
const USER_HEADERS = ["User_ID", "Username", "Nama", "Password_Hash", "Role", "Dibuat_Pada"];

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

  // Upgrade header sheet lama jika belum memiliki kolom User_ID atau Icon_Key
  upgradeSheetHeaders(itemSheet, ITEM_HEADERS);
  upgradeSheetHeaders(folderSheet, FOLDER_HEADERS);
  upgradeSheetHeaders(userSheet, USER_HEADERS);

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

    if (action === 'save_all') {
      const folders = body.folders || [];
      const items = body.items || [];
      const result = saveAllData(folders, items, userId, userName);
      return createJsonResponse({
        success: true,
        message: 'Berhasil menyinkronkan data pengguna ' + userName + ' ke Google Sheet!',
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

function getAllData(reqUserId, reqRole) {
  const itemSheet = getOrCreateSheet(SHEET_ITEMS, ITEM_HEADERS);
  const folderSheet = getOrCreateSheet(SHEET_FOLDERS, FOLDER_HEADERS);

  const itemData = itemSheet.getDataRange().getValues();
  const folderData = folderSheet.getDataRange().getValues();

  const isAdmin = (reqRole === 'admin');

  const folders = [];
  const folderMap = new Map();

  for (let i = 1; i < folderData.length; i++) {
    const row = folderData[i];
    const id = String(row[0] || '').trim();
    const name = String(row[1] || row[0] || '').trim();
    const color = String(row[2] || 'book').trim();
    const folderUserId = String(row[3] || '').trim();

    if (!name) continue;

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

      if (!rawTitle && !rawDesc) continue;
      if (!rawTitle) rawTitle = 'Tanpa Judul';

      if (!isAdmin) {
        const isOwner = (reqUserId && rowUserId === reqUserId) || rowUserId === 'system';
        if (!isOwner) {
          continue;
        }
      }

      if (rawStatus.includes('baca') || rawStatus === 'reading' || rawStatus.includes('sedang')) {
        rawStatus = 'reading';
      } else if (rawStatus.includes('tamat') || rawStatus === 'completed' || rawStatus.includes('selesai')) {
        rawStatus = 'completed';
      } else {
        rawStatus = 'plan';
      }

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

function saveAllData(incomingFolders, incomingItems, currentUserId, currentUserName) {
  const itemSheet = getOrCreateSheet(SHEET_ITEMS, ITEM_HEADERS);
  const folderSheet = getOrCreateSheet(SHEET_FOLDERS, FOLDER_HEADERS);

  const existingItemData = itemSheet.getDataRange().getValues();
  const existingFolderData = folderSheet.getDataRange().getValues();

  const preservedFolders = [];
  for (let i = 1; i < existingFolderData.length; i++) {
    const row = existingFolderData[i];
    const rowId = String(row[0] || '').trim();
    const rowName = String(row[1] || '').trim();
    const rowColor = String(row[2] || 'book').trim();
    const rowUserId = String(row[3] || '').trim();

    if (!rowName) continue;

    if (rowUserId && currentUserId && rowUserId !== currentUserId && rowUserId !== 'system') {
      preservedFolders.push([rowId, rowName, rowColor, rowUserId]);
    }
  }

  const userFolderRows = (incomingFolders || []).map(f => [
    f.id,
    f.name,
    f.color || 'book',
    currentUserId || f.userId || ''
  ]);

  const finalFolderRows = [...preservedFolders, ...userFolderRows];

  if (folderSheet.getLastRow() > 1) {
    folderSheet.deleteRows(2, folderSheet.getLastRow() - 1);
  }
  if (finalFolderRows.length > 0) {
    folderSheet.getRange(2, 1, finalFolderRows.length, FOLDER_HEADERS.length).setValues(finalFolderRows);
  }

  const preservedItems = [];
  if (existingItemData.length > 1) {
    const headerRow = existingItemData[0].map(h => String(h || '').trim().toLowerCase());
    let idxUserId = headerRow.findIndex(h => h.includes('user_id') || h.includes('userid'));
    if (idxUserId === -1) idxUserId = 7;

    for (let i = 1; i < existingItemData.length; i++) {
      const row = existingItemData[i];
      const rowUserId = (idxUserId < row.length) ? String(row[idxUserId] || '').trim() : '';
      
      if (rowUserId && currentUserId && rowUserId !== currentUserId && rowUserId !== 'system') {
        const rowPadded = [...row];
        while (rowPadded.length < ITEM_HEADERS.length) rowPadded.push('');
        preservedItems.push(rowPadded.slice(0, ITEM_HEADERS.length));
      }
    }
  }

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
        userId: appState.profile.userId,
        userName: appState.profile.userName,
        role: appState.profile.role,
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
        if (!silent) showToast(`Tersinkronisasi! Koleksi pengguna ${appState.profile.userName} tersimpan di Google Sheet.`);
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

  async function syncPullFromGoogleSheets(silent = false) {
    const url = appState.settings.googleSheetsUrl;
    if (!url) {
      if (!silent) showToast('Google Sheets belum dihubungkan. Buka Pengaturan.');
      return;
    }

    if (!silent) showToast('Mengunduh data dari Google Sheets...');
    if (dom.btnQuickSync) dom.btnQuickSync.classList.add('syncing');

    try {
      const params = new URLSearchParams({
        action: 'getData',
        userId: appState.profile.userId,
        role: appState.profile.role
      });
      const fetchUrl = url.includes('?') ? `${url}&${params.toString()}` : `${url}?${params.toString()}`;
      const resp = await fetch(fetchUrl);
      const data = await resp.json();

      if (data && data.success && Array.isArray(data.items)) {
        // 1. Smart Merge Folders
        if (data.folders && data.folders.length > 0) {
          data.folders.forEach(remoteF => {
            const exists = appState.folders.some(f => f.id === remoteF.id || f.name.toLowerCase() === remoteF.name.toLowerCase());
            if (!exists) {
              appState.folders.push(remoteF);
            }
          });
        }

        // 2. Smart Merge Items (Google Sheet data updates local without wiping cover arts)
        const itemMap = new Map();

        // Masukkan data lokal dulu
        appState.items.forEach(it => {
          const key = it.id || (it.title ? it.title.trim().toLowerCase() : ('item-' + Math.random()));
          itemMap.set(key, it);
        });

        // Gabungkan data dari Google Sheet
        data.items.forEach(remoteIt => {
          if (!remoteIt.title && !remoteIt.desc) return; // Lewati baris kosong

          // Cari padanan lokal berdasarkan ID atau Judul
          let localMatch = appState.items.find(it => it.id === remoteIt.id);
          if (!localMatch && remoteIt.title) {
            localMatch = appState.items.find(it => it.title && it.title.trim().toLowerCase() === remoteIt.title.trim().toLowerCase());
          }

          // Pertahankan cover lokal jika di Sheet kosong tapi di lokal sudah ada cover
          if (localMatch && localMatch.coverUrl && !remoteIt.coverUrl) {
            remoteIt.coverUrl = localMatch.coverUrl;
          }
          if (localMatch && !remoteIt.id) {
            remoteIt.id = localMatch.id;
          }

          const key = remoteIt.id || (remoteIt.title ? remoteIt.title.trim().toLowerCase() : ('item-' + Math.random()));
          itemMap.set(key, remoteIt);
        });

        appState.items = Array.from(itemMap.values());
        // Urutkan item terbaru di atas
        appState.items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        saveToLocalStorage();
        if (dbInstance) {
          const tx = dbInstance.transaction(['folders', 'items'], 'readwrite');
          tx.objectStore('folders').clear();
          tx.objectStore('items').clear();
          appState.folders.forEach(f => tx.objectStore('folders').put(f));
          appState.items.forEach(i => tx.objectStore('items').put(i));
        }

        renderAll();
        updateCloudIndicator();

        if (!silent) {
          showToast(`Berhasil memuat ${data.items.length} bacaan dari Google Sheet!`);
          if (dom.modalSettings) dom.modalSettings.classList.add('hidden');
        }
      } else {
        throw new Error(data.error || 'Gagal membaca data dari Google Sheets');
      }
    } catch (err) {
      console.error('Pull from Sheets error:', err);
      if (!silent) {
        showToast('Gagal menarik data dari Google Sheets. Periksa URL atau koneksi internet.');
      }
    } finally {
      if (dom.btnQuickSync) dom.btnQuickSync.classList.remove('syncing');
    }
  }

  // =========================================================================
  // 8.0 ACCOUNT & MULTI-USER AUTH SYSTEM (OFFLINE + GOOGLE APPS SCRIPT BACKEND)
  // =========================================================================
  function updateSettingsAccountCard() {
    const nameEl = document.getElementById('settings-display-name') || document.getElementById('settings-account-name');
    const userEl = document.getElementById('settings-display-username') || document.getElementById('settings-account-username');
    const badgeEl = document.getElementById('settings-role-badge') || document.getElementById('settings-account-role-badge');
    const initialEl = document.getElementById('settings-avatar-badge') || document.getElementById('settings-avatar-initial');

    const curName = appState.profile.userName || 'Pengguna';
    const curUsername = appState.profile.username || ('user_' + appState.profile.userId.substring(0, 6));
    const curRole = appState.profile.role || 'pribadi';
    const isAdmin = curRole === 'admin';

    if (nameEl) nameEl.textContent = curName;
    if (userEl) userEl.textContent = '@' + curUsername.replace(/^@/, '');
    if (initialEl) initialEl.textContent = curName.charAt(0).toUpperCase() || 'P';

    if (badgeEl) {
      badgeEl.innerHTML = `
        <svg class="svg-icon icon-xs" viewBox="0 0 24 24"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        ${isAdmin ? 'Mode Admin (Semua Data)' : 'Mode Pribadi (Terisolasi)'}
      `;
      badgeEl.className = `role-badge ${isAdmin ? 'admin' : 'pribadi'}`;
      badgeEl.style.background = isAdmin ? '#fef3c7' : '#eef2ff';
      badgeEl.style.color = isAdmin ? '#b45309' : '#4f46e5';
    }
  }

  function saveAuthSession(user) {
    appState.profile = {
      userId: user.userId,
      userName: user.name || user.userName || 'Pengguna',
      role: user.role || 'pribadi',
      username: user.username || user.userId
    };
    localStorage.setItem('reading_list_auth_user', JSON.stringify(appState.profile));
    localStorage.setItem('reading_list_user_id', appState.profile.userId);
    localStorage.setItem('reading_list_user_name', appState.profile.userName);
    localStorage.setItem('reading_list_user_role', appState.profile.role);
    updateSettingsAccountCard();
  }

  function getLocalRegisteredUsers() {
    try {
      return JSON.parse(localStorage.getItem('reading_list_registered_users') || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveLocalRegisteredUser(newUser) {
    const users = getLocalRegisteredUsers();
    const idx = users.findIndex(u => u.username.toLowerCase() === newUser.username.toLowerCase());
    if (idx >= 0) {
      users[idx] = newUser;
    } else {
      users.push(newUser);
    }
    localStorage.setItem('reading_list_registered_users', JSON.stringify(users));
  }

  function openAuthModal(defaultTab = 'login') {
    const modal = document.getElementById('modal-auth');
    if (!modal) return;
    modal.classList.remove('hidden');

    const tabLogin = document.getElementById('tab-auth-login');
    const tabRegister = document.getElementById('tab-auth-register');
    const formLogin = document.getElementById('form-auth-login');
    const formRegister = document.getElementById('form-auth-register');

    if (defaultTab === 'register') {
      if (tabRegister) tabRegister.classList.add('active');
      if (tabLogin) tabLogin.classList.remove('active');
      if (formRegister) formRegister.classList.remove('hidden');
      if (formLogin) formLogin.classList.add('hidden');
    } else {
      if (tabLogin) tabLogin.classList.add('active');
      if (tabRegister) tabRegister.classList.remove('active');
      if (formLogin) formLogin.classList.remove('hidden');
      if (formRegister) formRegister.classList.add('hidden');
    }
  }

  function closeAuthModal() {
    const modal = document.getElementById('modal-auth');
    if (modal) modal.classList.add('hidden');
  }

  function initAuthSystem() {
    const tabLogin = document.getElementById('tab-auth-login');
    const tabRegister = document.getElementById('tab-auth-register');
    const formLogin = document.getElementById('form-auth-login');
    const formRegister = document.getElementById('form-auth-register');
    const btnCloseAuth = document.getElementById('btn-close-auth');
    const linkToRegister = document.getElementById('link-switch-to-register');
    const linkToLogin = document.getElementById('link-switch-to-login');

    const roleOptPribadi = document.getElementById('role-opt-pribadi');
    const roleOptAdmin = document.getElementById('role-opt-admin');

    if (tabLogin && tabRegister && formLogin && formRegister) {
      tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        formLogin.classList.remove('hidden');
        formRegister.classList.add('hidden');
      });

      tabRegister.addEventListener('click', () => {
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        formRegister.classList.remove('hidden');
        formLogin.classList.add('hidden');
      });
    }

    if (linkToRegister) {
      linkToRegister.addEventListener('click', (e) => {
        e.preventDefault();
        if (tabRegister) tabRegister.click();
      });
    }

    if (linkToLogin) {
      linkToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        if (tabLogin) tabLogin.click();
      });
    }

    if (btnCloseAuth) {
      btnCloseAuth.addEventListener('click', closeAuthModal);
    }

    // Role selector toggle saat mendaftar
    if (roleOptPribadi && roleOptAdmin) {
      roleOptPribadi.addEventListener('click', () => {
        roleOptPribadi.classList.add('selected');
        roleOptAdmin.classList.remove('selected');
        const radio = roleOptPribadi.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
      });

      roleOptAdmin.addEventListener('click', () => {
        roleOptAdmin.classList.add('selected');
        roleOptPribadi.classList.remove('selected');
        const radio = roleOptAdmin.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
      });
    }

    // 1. Submit Form Login
    if (formLogin) {
      formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim().toLowerCase();
        const password = document.getElementById('login-password').value.trim();
        const btnSubmit = document.getElementById('btn-submit-login');

        if (!username || !password) {
          showToast('Username dan PIN/kata sandi wajib diisi.');
          return;
        }

        btnSubmit.disabled = true;
        btnSubmit.innerHTML = 'Memeriksa Akun...';

        try {
          let loggedInUser = null;
          const sheetsUrl = appState.settings.googleSheetsUrl;

          // Coba autentikasi ke Google Sheets Web App terlebih dahulu
          if (sheetsUrl) {
            try {
              const res = await fetch(sheetsUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                  action: 'auth_login',
                  username,
                  password
                })
              });
              const json = await res.json();
              if (json && json.success && json.user) {
                loggedInUser = json.user;
                saveLocalRegisteredUser(json.user);
              } else if (json && json.error) {
                throw new Error(json.error);
              }
            } catch (netErr) {
              console.warn('Login cloud error or offline, fallback to local:', netErr);
            }
          }

          // Fallback lokal jika cloud offline atau akun tersimpan di HP
          if (!loggedInUser) {
            const localUsers = getLocalRegisteredUsers();
            const localFound = localUsers.find(u => u.username.toLowerCase() === username && (u.password === password || u.passwordHash === password));
            if (localFound) {
              loggedInUser = localFound;
            }
          }

          if (!loggedInUser) {
            // Jika akun baru dan offline, izinkan langsung buat sesi lokal
            const fallbackUser = {
              userId: 'usr_' + username.replace(/[^a-z0-9]/g, '').substring(0, 8),
              name: username.charAt(0).toUpperCase() + username.slice(1),
              username: username,
              role: 'pribadi',
              password: password
            };
            saveLocalRegisteredUser(fallbackUser);
            loggedInUser = fallbackUser;
          }

          saveAuthSession(loggedInUser);
          closeAuthModal();
          formLogin.reset();
          renderAll();

          // Tarik data pengguna dari cloud jika terhubung
          if (appState.settings.googleSheetsUrl) {
            syncPullFromGoogleSheets(true);
          }

          showToast(`Berhasil masuk! Selamat datang, ${loggedInUser.name || loggedInUser.userName}.`);
        } catch (err) {
          showToast(err.message || 'Gagal masuk akun. Periksa username dan password.');
        } finally {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = `
            <svg class="svg-icon icon-xs" viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
            Masuk ke Akun
          `;
        }
      });
    }

    // 2. Submit Form Register
    if (formRegister) {
      formRegister.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('reg-name').value.trim();
        const username = document.getElementById('reg-username').value.trim().toLowerCase().replace(/\s+/g, '');
        const password = document.getElementById('reg-password').value.trim();
        const selectedRoleRadio = document.querySelector('input[name="reg-role"]:checked');
        const role = selectedRoleRadio ? selectedRoleRadio.value : 'pribadi';
        const btnSubmit = document.getElementById('btn-submit-register');

        if (!name || !username || !password) {
          showToast('Lengkapi nama, username, dan password.');
          return;
        }

        if (password.length < 4) {
          showToast('Kata sandi/PIN minimal 4 karakter.');
          return;
        }

        btnSubmit.disabled = true;
        btnSubmit.innerHTML = 'Mendaftarkan Akun...';

        try {
          const generatedUserId = 'usr_' + username + '_' + Math.random().toString(36).substring(2, 6);
          const newUser = {
            userId: generatedUserId,
            name: name,
            username: username,
            password: password,
            role: role
          };

          const sheetsUrl = appState.settings.googleSheetsUrl;
          if (sheetsUrl) {
            try {
              const res = await fetch(sheetsUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                  action: 'auth_register',
                  name,
                  username,
                  password,
                  role
                })
              });
              const json = await res.json();
              if (json && json.success && json.user) {
                newUser.userId = json.user.userId || newUser.userId;
              } else if (json && json.error) {
                throw new Error(json.error);
              }
            } catch (netErr) {
              console.warn('Register cloud network error:', netErr);
            }
          }

          saveLocalRegisteredUser(newUser);
          saveAuthSession(newUser);

          // Buat folder default untuk akun baru jika belum ada
          if (appState.folders.length === 0) {
            appState.folders = [
              { id: 'f-bacaan-' + Date.now(), name: 'Bahan Masakan', color: 'flame', icon: 'food', createdAt: Date.now(), userId: newUser.userId },
              { id: 'f-manhwa-' + Date.now(), name: 'Top Manhwa OP', color: 'book', icon: 'book', createdAt: Date.now() + 1, userId: newUser.userId }
            ];
            saveToLocalStorage();
            if (dbInstance) {
              const tx = dbInstance.transaction(['folders'], 'readwrite');
              appState.folders.forEach(f => tx.objectStore('folders').put(f));
            }
          }

          closeAuthModal();
          formRegister.reset();
          renderAll();

          // Sinkronisasi data awal ke Google Sheets jika terhubung
          if (appState.settings.googleSheetsUrl) {
            syncPushToGoogleSheets(true);
          }

          showToast(`Akun ${name} berhasil dibuat!`);
        } catch (err) {
          showToast(err.message || 'Gagal mendaftar akun.');
        } finally {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = `
            <svg class="svg-icon icon-xs" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            Buat Akun & Mulai
          `;
        }
      });
    }
  }

  function initSettingsEvents() {
    const keyInput = document.getElementById('settings-gemini-key');
    const sheetsUrlInput = document.getElementById('settings-sheets-url');

    keyInput.value = appState.settings.geminiApiKey || '';
    if (sheetsUrlInput) sheetsUrlInput.value = appState.settings.googleSheetsUrl || '';

    // Inisialisasi Kartu Akun Aktif
    updateSettingsAccountCard();

    // Event Ganti Akun & Keluar
    const btnSwitchAccount = document.getElementById('btn-open-auth-modal') || document.getElementById('btn-settings-switch-account');
    if (btnSwitchAccount) {
      btnSwitchAccount.addEventListener('click', () => {
        openAuthModal('login');
      });
    }

    const btnLogout = document.getElementById('btn-logout-auth') || document.getElementById('btn-settings-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', async () => {
        const confirmed = await showConfirmDialog({
          title: 'Keluar dari Akun?',
          message: 'Anda akan keluar dari akun ini. Data tetap tersimpan aman di database.',
          confirmText: 'Keluar',
          isDanger: true
        });
        if (confirmed) {
          localStorage.removeItem('reading_list_auth_user');
          const guestId = 'user_' + Math.random().toString(36).substring(2, 7);
          appState.profile = {
            userId: guestId,
            userName: 'Tamu',
            role: 'pribadi',
            username: 'guest_' + guestId.substring(5)
          };
          updateSettingsAccountCard();
          renderAll();
          showToast('Anda telah keluar. Silakan masuk atau daftar.');
          openAuthModal('login');
        }
      });
    }

    // Open & Close Settings Modal
    document.getElementById('btn-open-settings').addEventListener('click', () => {
      keyInput.value = appState.settings.geminiApiKey || '';
      if (sheetsUrlInput) sheetsUrlInput.value = appState.settings.googleSheetsUrl || '';
      updateSettingsAccountCard();
      dom.modalSettings.classList.remove('hidden');
    });

    const badgeCloud = document.getElementById('badge-cloud-indicator');
    if (badgeCloud) {
      badgeCloud.addEventListener('click', () => {
        keyInput.value = appState.settings.geminiApiKey || '';
        if (sheetsUrlInput) sheetsUrlInput.value = appState.settings.googleSheetsUrl || '';
        updateSettingsAccountCard();
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

    document.getElementById('btn-load-sample-data').addEventListener('click', async () => {
      if (appState.settings.googleSheetsUrl) {
        syncPullFromGoogleSheets();
        return;
      }
      const confirmed = await showConfirmDialog({
        title: 'Muat Koleksi Contoh?',
        message: 'Koleksi contoh manhwa & novel akan ditambahkan ke rak lo.',
        confirmText: 'Muat Contoh',
        isDanger: false
      });
      if (confirmed) {
        const defaultFolders = [
          { id: 'f-manhwa', name: 'Top Manhwa OP', color: 'flame', createdAt: Date.now() - 400000 },
          { id: 'f-novel',  name: 'Webnovel & Buku', color: 'book', createdAt: Date.now() - 300000 },
          { id: 'f-anime',  name: 'Anime & Film', color: 'film', createdAt: Date.now() - 200000 },
          { id: 'f-santai', name: 'Santai & Slice of Life', color: 'leaf', createdAt: Date.now() - 100000 }
        ];
        const defaultItems = [
          { id: 'item-1', title: 'Solo Leveling (Only I Level Up)', folderId: 'f-manhwa', status: 'completed', desc: 'Sung Jin-woo mendapatkan System rahasia setelah selamat dari Double Dungeon misterius.', coverUrl: '', createdAt: Date.now() - 500000, userId: appState.profile.userId, userName: appState.profile.userName },
          { id: 'item-2', title: "Omniscient Reader's Viewpoint", folderId: 'f-manhwa', status: 'reading', desc: 'Kim Dokja adalah satu-satunya pembaca novel web apokaliptik yang menjadi kenyataan.', coverUrl: '', createdAt: Date.now() - 400000, userId: appState.profile.userId, userName: appState.profile.userName },
          { id: 'item-3', title: 'Return of the Blossoming Blade', folderId: 'f-manhwa', status: 'reading', desc: 'Chung Myung bangkit kembali 100 tahun kemudian untuk membangkitkan sektenya.', coverUrl: '', createdAt: Date.now() - 300000, userId: appState.profile.userId, userName: appState.profile.userName },
          { id: 'item-4', title: 'The Beginning After The End', folderId: 'f-manhwa', status: 'reading', desc: 'Raja Grey bereinkarnasi sebagai Arthur Leywin di dunia sihir dan monster.', coverUrl: '', createdAt: Date.now() - 200000, userId: appState.profile.userId, userName: appState.profile.userName },
          { id: 'item-5', title: 'Atomic Habits', folderId: 'f-novel', status: 'completed', desc: 'Perubahan kecil yang memberikan hasil luar biasa dalam membangun kebiasaan baik.', coverUrl: '', createdAt: Date.now() - 100000, userId: appState.profile.userId, userName: appState.profile.userName },
          { id: 'item-6', title: 'Sousou no Frieren', folderId: 'f-anime', status: 'plan', desc: 'Penyihir elf Frieren merefleksikan arti kehidupan manusia setelah mengalahkan Raja Iblis.', coverUrl: '', createdAt: Date.now() - 50000, userId: appState.profile.userId, userName: appState.profile.userName }
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

    document.getElementById('btn-reset-all-data').addEventListener('click', async () => {
      const confirmed = await showConfirmDialog({
        title: 'Hapus Semua Data Koleksi?',
        message: 'Seluruh koleksi di HP lo akan dibersihkan permanen. Tindakan ini tidak dapat dibatalkan.',
        confirmText: 'Reset Permanen',
        isDanger: true
      });
      if (confirmed) {
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
    const accessible = getUserAccessibleItems();
    const totalItems = accessible.length;
    const completedItems = accessible.filter(i => i.status === 'completed').length;
    const readingItems = accessible.filter(i => i.status === 'reading').length;
    const planItems = accessible.filter(i => i.status === 'plan' || !i.status).length;
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
          const count = accessible.filter(i => i.folderId === f.id).length;
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

  function showConfirmDialog({ title = 'Konfirmasi Tindakan', message = 'Lanjutkan proses ini?', confirmText = 'Lanjutkan', cancelText = 'Batal', isDanger = false }) {
    return new Promise((resolve) => {
      const modal = document.getElementById('modal-confirm');
      const elTitle = document.getElementById('confirm-title');
      const elMsg = document.getElementById('confirm-message');
      const btnOk = document.getElementById('btn-confirm-ok');
      const btnCancel = document.getElementById('btn-confirm-cancel');
      const iconWrap = document.getElementById('confirm-icon-wrap');

      if (!modal) {
        resolve(window.confirm(message));
        return;
      }

      triggerNativeHaptic();
      if (elTitle) elTitle.textContent = title;
      if (elMsg) elMsg.textContent = message;

      if (btnOk) {
        btnOk.textContent = confirmText;
        if (isDanger) {
          btnOk.style.background = '#ef4444';
          btnOk.style.borderColor = '#ef4444';
          btnOk.style.color = '#ffffff';
        } else {
          btnOk.style.background = '';
          btnOk.style.borderColor = '';
          btnOk.style.color = '';
        }
      }

      if (btnCancel) btnCancel.textContent = cancelText;
      if (iconWrap) {
        iconWrap.className = isDanger ? 'confirm-icon-box' : 'confirm-icon-box info';
      }

      modal.classList.remove('hidden');

      function onOk() {
        modal.classList.add('hidden');
        cleanup();
        triggerNativeHaptic();
        resolve(true);
      }
      function onCancel() {
        modal.classList.add('hidden');
        cleanup();
        resolve(false);
      }
      function cleanup() {
        if (btnOk) btnOk.removeEventListener('click', onOk);
        if (btnCancel) btnCancel.removeEventListener('click', onCancel);
      }

      if (btnOk) btnOk.addEventListener('click', onOk, { once: true });
      if (btnCancel) btnCancel.addEventListener('click', onCancel, { once: true });
    });
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

    // Bind Navigation & Manual Adds
    document.getElementById('dock-btn-scan').addEventListener('click', openScannerModal);
    document.getElementById('btn-empty-scan').addEventListener('click', openScannerModal);
    document.getElementById('btn-close-scanner').addEventListener('click', closeScannerModal);
    document.getElementById('btn-cancel-scan').addEventListener('click', closeScannerModal);

    // Tombol Tambah Manual (+ Judul di header feed, di floating dock, dan di empty state)
    if (dom.btnAddManualItem) {
      dom.btnAddManualItem.addEventListener('click', () => openItemDetailModal(null));
    }
    if (dom.btnEmptyAddManual) {
      dom.btnEmptyAddManual.addEventListener('click', () => openItemDetailModal(null));
    }
    if (dom.dockBtnAdd) {
      dom.dockBtnAdd.addEventListener('click', () => openItemDetailModal(null));
    }

    // Tombol Quick Sync Google Sheets di Header
    if (dom.btnQuickSync) {
      dom.btnQuickSync.addEventListener('click', () => {
        triggerNativeHaptic();
        syncPullFromGoogleSheets(false);
      });
    }

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

    // Sort Custom APK Dropdown
    setupApkDropdown({
      triggerBtn: document.getElementById('btn-trigger-sort'),
      menuEl: document.getElementById('menu-dropdown-sort'),
      displayLabelEl: document.getElementById('sort-display-label'),
      selectEl: dom.sortSelect,
      initialValue: appState.sortBy || 'recent',
      onChange: (val) => {
        appState.sortBy = val;
        renderItemsFeed();
      }
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
    initAuthSystem();

    renderAll();

    // Auto-sync dari Google Sheets saat aplikasi pertama dibuka
    if (appState.settings.googleSheetsUrl) {
      syncPullFromGoogleSheets(true);
    }

    // Event listener saat user berganti aplikasi (multitasking Android):
    // Memastikan antrean scanning resume jika terjeda & auto-pull data terbaru dari Google Sheets
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        if (appState.scanQueue && appState.scanQueue.some(j => j.status === 'pending') && !appState.isScanningActive) {
          processScanQueue();
        }
        if (appState.settings.googleSheetsUrl) {
          syncPullFromGoogleSheets(true);
        }
      }
    });

    window.addEventListener('focus', () => {
      if (appState.scanQueue && appState.scanQueue.some(j => j.status === 'pending') && !appState.isScanningActive) {
        processScanQueue();
      }
      if (appState.settings.googleSheetsUrl) {
        syncPullFromGoogleSheets(true);
      }
    });

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
