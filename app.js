/**
 * READING LIST — Visual Reading & Checklist Hub App
 * Cute & Clean Aesthetic • Bento Rak Hub • Pure Checklist Stream • PIN Security
 * Offline-First IndexedDB + Google Sheets Cloud Database
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. STATE & CONSTANTS
  // =========================================================================
  const DB_NAME = 'ReadingListDB_v3';
  const DB_VERSION = 2;

  let dbInstance = null;

  // Default Google Sheets Database URL & Default Gemini 3.8 Flash Vision API Key
  const DEFAULT_GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbzUnEBcIEdLGzFu-bBAvK61jK3X3AnTx8Sl8dh-F-SnpqyhM90rJV0mKMspf6X1vLsO/exec';
  const DEFAULT_GEMINI_API_KEY = 'AQ.Ab8RN6IK338PSezP_5zanZDJCFAwSjs9OJoThXba1uvg2QFs_A';
  const DEFAULT_MASTER_PASSWORD = 'admin123';

  const savedAuthUser = JSON.parse(localStorage.getItem('reading_list_auth_user') || 'null');
  const storedUserId = savedAuthUser?.userId || localStorage.getItem('reading_list_user_id') || ('user_' + Math.random().toString(36).substring(2, 7));
  const storedUserName = savedAuthUser?.name || localStorage.getItem('reading_list_user_name') || 'Pengguna';
  const storedUserRole = savedAuthUser?.role || localStorage.getItem('reading_list_user_role') || 'pribadi';
  const storedUsername = savedAuthUser?.username || ('usr_' + storedUserId.substring(0, 8));

  localStorage.setItem('reading_list_user_id', storedUserId);
  localStorage.setItem('reading_list_user_name', storedUserName);
  localStorage.setItem('reading_list_user_role', storedUserRole);

  let initialSheetsUrl = localStorage.getItem('google_sheets_url');
  if (!initialSheetsUrl || !initialSheetsUrl.trim() || !initialSheetsUrl.includes('/exec')) {
    initialSheetsUrl = DEFAULT_GOOGLE_SHEETS_URL;
    localStorage.setItem('google_sheets_url', DEFAULT_GOOGLE_SHEETS_URL);
  }

  let initialGeminiKey = localStorage.getItem('gemini_api_key');
  if (!initialGeminiKey || !initialGeminiKey.trim()) {
    initialGeminiKey = DEFAULT_GEMINI_API_KEY;
    localStorage.setItem('gemini_api_key', DEFAULT_GEMINI_API_KEY);
  }

  let initialMasterPassword = localStorage.getItem('reading_list_master_password');
  if (!initialMasterPassword || !initialMasterPassword.trim()) {
    initialMasterPassword = DEFAULT_MASTER_PASSWORD;
    localStorage.setItem('reading_list_master_password', DEFAULT_MASTER_PASSWORD);
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
      geminiApiKey: initialGeminiKey,
      googleSheetsUrl: initialSheetsUrl,
      masterPassword: initialMasterPassword,
      theme: 'light'
    },
    currentView: 'hub', // 'hub' | 'folder'
    activeFolderId: 'all',
    folderFilter: 'all', // 'all' | 'uncompleted' | 'completed'
    folderSearchQuery: '',
    searchQuery: '',
    pendingScannedItems: [],
    currentUploadedImageSrc: null,
    scanQueue: [],
    isScanningActive: false,
    isScannerMinimized: false
  };

  // 12 Luxury Colors Palette + All Theme
  const FOLDER_COLORS = {
    all:     { bg: '#f1f5f9', color: '#334155', name: 'Semua Koleksi' },
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

  // 12 Premium Bespoke SVG Icons + All Icon
  const FOLDER_ICONS = {
    all:      '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M3 3h7v7H3z"/><path d="M14 3h7v7h-7z"/><path d="M14 14h7v7h-7z"/><path d="M3 14h7v7H3z"/></svg>',
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

  function getFolderVisual(folder) {
    if (!folder || folder.id === 'all') {
      return {
        bg: '#f1f5f9',
        color: '#334155',
        svg: FOLDER_ICONS.all || '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M3 3h7v7H3z"/><path d="M14 3h7v7h-7z"/><path d="M14 14h7v7h-7z"/><path d="M3 14h7v7H3z"/></svg>'
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

  // DOM Elements mapping
  const dom = {
    splash: document.getElementById('app-splash-screen'),
    splashStatus: document.getElementById('splash-status-text'),
    headerStats: document.getElementById('header-stats-text'),
    badgeAiIndicator: document.getElementById('badge-ai-indicator'),
    badgeCloudIndicator: document.getElementById('badge-cloud-indicator'),
    btnQuickSync: document.getElementById('btn-quick-sync'),
    btnOpenSettings: document.getElementById('btn-open-settings'),
    btnOpenProfile: document.getElementById('btn-open-profile'),
    headerAvatarBadge: document.getElementById('header-avatar-badge'),
    headerUserName: document.getElementById('header-user-name'),
    searchInput: document.getElementById('search-input'),
    btnClearSearch: document.getElementById('btn-clear-search'),
    toastContainer: document.getElementById('toast-container'),

    // View 1: Hub Semua Rak
    viewFoldersHub: document.getElementById('view-folders-hub'),
    foldersBentoGrid: document.getElementById('folders-bento-grid'),
    emptyShelvesState: document.getElementById('empty-shelves-state'),
    btnCreateShelf: document.getElementById('btn-create-shelf'),
    btnEmptyCreateShelf: document.getElementById('btn-empty-create-shelf'),
    hubShelvesCountText: document.getElementById('hub-shelves-count-text'),

    // View 2: Detail Rak (Ceklis Bersih)
    viewFolderItems: document.getElementById('view-folder-items'),
    btnBackToHub: document.getElementById('btn-back-to-hub'),
    folderHeroIconBox: document.getElementById('folder-hero-icon-box'),
    folderHeroTitleText: document.getElementById('folder-hero-title-text'),
    folderHeroProgressBadge: document.getElementById('folder-hero-progress-badge'),
    folderHeroPctText: document.getElementById('folder-hero-pct-text'),
    folderHeroProgressFill: document.getElementById('folder-hero-progress-fill'),
    btnFolderMenu: document.getElementById('btn-folder-menu'),
    btnAddItemToShelf: document.getElementById('btn-add-item-to-shelf'),
    folderItemsSearchInput: document.getElementById('folder-items-search-input'),
    countFilterAll: document.getElementById('count-filter-all'),
    countFilterUncompleted: document.getElementById('count-filter-uncompleted'),
    countFilterCompleted: document.getElementById('count-filter-completed'),
    folderChecklistContainer: document.getElementById('folder-checklist-container'),
    emptyChecklistState: document.getElementById('empty-checklist-state'),
    btnEmptyAddChecklist: document.getElementById('btn-empty-add-checklist'),

    // Floating Dock & Banners
    bottomDock: document.getElementById('bottom-dock'),
    dockBtnHome: document.getElementById('dock-btn-home'),
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
    modalProfile: document.getElementById('modal-profile'),
    modalSettingsPwd: document.getElementById('modal-settings-pwd'),
    modalStats: document.getElementById('modal-stats'),
    modalAuth: document.getElementById('modal-auth'),

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
    itemDoneCheckbox: document.getElementById('item-done-checkbox'),
    toggleStatusTitle: document.getElementById('toggle-status-title'),
    toggleStatusDesc: document.getElementById('toggle-status-desc')
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
  // 3. CUSTOM APK DROPDOWN SYSTEM (NO BROWSER POPUP)
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

    if (Array.isArray(items)) {
      menuEl.innerHTML = '';
      items.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'apk-dropdown-item';
        itemEl.setAttribute('data-value', item.value);

        let dotHtml = '';
        if (item.dotColor) {
          dotHtml = `<span class="apk-dropdown-dot" style="background:${item.dotColor};"></span>`;
        }

        itemEl.innerHTML = `
          ${dotHtml}
          <span class="apk-dropdown-item-text">${escapeHTML(item.label)}</span>
          <svg class="apk-dropdown-check svg-icon icon-xs" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
        `;
        menuEl.appendChild(itemEl);
      });
    }

    const targetVal = initialValue !== null ? initialValue : (selectEl ? selectEl.value : null);
    if (targetVal !== null) {
      applyActiveDropdownValue(menuEl, displayLabelEl, selectEl, targetVal);
    }

    triggerBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();

      const isAlreadyOpen = !menuEl.classList.contains('hidden');
      closeAllApkDropdowns();

      if (!isAlreadyOpen) {
        menuEl.classList.remove('hidden');
        const triggerRect = triggerBtn.getBoundingClientRect();
        if (triggerRect.bottom + 220 > window.innerHeight && triggerRect.top > 220) {
          menuEl.classList.add('dropup');
        } else {
          menuEl.classList.remove('dropup');
        }
      }
    };

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

    menuEl.querySelectorAll('.apk-dropdown-item').forEach(itemEl => {
      const itemVal = itemEl.getAttribute('data-value');
      const isMatch = String(itemVal) === String(val);
      itemEl.classList.toggle('active', isMatch);
      if (isMatch) {
        const textEl = itemEl.querySelector('.apk-dropdown-item-text');
        foundLabel = textEl ? textEl.textContent.trim() : itemVal;
        const dot = itemEl.querySelector('.apk-dropdown-dot');
        if (dot) foundDotColor = dot.style.background;
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
    }

    if (selectEl && val !== null) {
      selectEl.value = val;
    }
  }

  function populateFolderSelects() {
    const accessibleFolders = getUserAccessibleFolders();
    const folderItems = accessibleFolders.map(f => {
      const vis = getFolderVisual(f);
      return { value: f.id, label: f.name, dotColor: vis.color };
    });

    // 1. results-target-folder (Scanner)
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

    // 2. item-folder-select (Item Modal)
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
  // 4. NAVIGATION & VIEW CONTROLLER
  // =========================================================================
  function navigateToHub() {
    appState.currentView = 'hub';
    appState.activeFolderId = 'all';

    const shell = document.getElementById('app-shell');
    if (shell) shell.classList.remove('is-in-folder-view');

    if (dom.viewFoldersHub) dom.viewFoldersHub.classList.remove('hidden');
    if (dom.viewFolderItems) dom.viewFolderItems.classList.add('hidden');

    if (dom.dockBtnHome) dom.dockBtnHome.classList.add('active');
    renderFoldersHub();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function navigateToFolder(folderId) {
    const folder = appState.folders.find(f => f.id === folderId);
    if (!folder) {
      navigateToHub();
      return;
    }

    appState.currentView = 'folder';
    appState.activeFolderId = folderId;
    appState.folderFilter = 'all';
    appState.folderSearchQuery = '';

    const shell = document.getElementById('app-shell');
    if (shell) shell.classList.add('is-in-folder-view');

    if (dom.folderItemsSearchInput) dom.folderItemsSearchInput.value = '';

    // Update filter pills active state
    document.querySelectorAll('.filter-pill').forEach(pill => {
      pill.classList.toggle('active', pill.getAttribute('data-filter') === 'all');
    });

    if (dom.viewFoldersHub) dom.viewFoldersHub.classList.add('hidden');
    if (dom.viewFolderItems) dom.viewFolderItems.classList.remove('hidden');

    renderFolderChecklist(folderId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderAll() {
    updateHeaderStats();
    populateFolderSelects();
    updateAiBadge();
    updateCloudIndicator();

    if (appState.currentView === 'folder' && appState.activeFolderId !== 'all') {
      renderFolderChecklist(appState.activeFolderId);
    } else {
      renderFoldersHub();
    }
  }

  function updateAiBadge() {
    if (appState.settings.geminiApiKey.trim()) {
      dom.badgeAiIndicator.innerHTML = `
        <svg class="svg-icon icon-xs" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        Gemini 3.8
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
          Sheets
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
        badge.title = 'Database Offline Lokal';
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

  function getUserAccessibleFolders() {
    if (appState.profile.role === 'admin') {
      return appState.folders;
    }
    const myId = appState.profile.userId;
    return appState.folders.filter(f => !f.userId || f.userId === 'system' || f.userId === myId);
  }

  function updateHeaderStats() {
    const accessible = getUserAccessibleItems();
    const accessibleFolders = getUserAccessibleFolders();
    const total = accessible.length;
    const completed = accessible.filter(i => i.status === 'completed').length;
    const uncompleted = total - completed;

    if (dom.headerStats) {
      dom.headerStats.textContent = `${total} item • ${completed} selesai`;
    }
    if (dom.hubShelvesCountText) {
      dom.hubShelvesCountText.textContent = `${accessibleFolders.length} Rak Koleksi • ${uncompleted} belum dicek`;
    }
  }

  // =========================================================================
  // 5. VIEW 1: BENTO RAK HUB RENDERING
  // =========================================================================
  function renderFoldersHub() {
    if (!dom.foldersBentoGrid) return;
    dom.foldersBentoGrid.innerHTML = '';

    const accessibleFolders = getUserAccessibleFolders();
    const accessibleItems = getUserAccessibleItems();

    let filteredFolders = accessibleFolders;
    if (appState.searchQuery.trim()) {
      const q = appState.searchQuery.toLowerCase();
      filteredFolders = accessibleFolders.filter(f => {
        const matchName = f.name.toLowerCase().includes(q);
        const hasMatchingItems = accessibleItems.some(i => i.folderId === f.id && (i.title || '').toLowerCase().includes(q));
        return matchName || hasMatchingItems;
      });
    }

    if (filteredFolders.length === 0 && !appState.searchQuery.trim()) {
      if (dom.emptyShelvesState) dom.emptyShelvesState.classList.remove('hidden');
      return;
    } else {
      if (dom.emptyShelvesState) dom.emptyShelvesState.classList.add('hidden');
    }

    filteredFolders.forEach(folder => {
      const visual = getFolderVisual(folder);
      const itemsInFolder = accessibleItems.filter(i => i.folderId === folder.id);
      const total = itemsInFolder.length;
      const completed = itemsInFolder.filter(i => i.status === 'completed').length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      const isAllDone = total > 0 && completed === total;

      // Category label
      const categoryTag = folder.setupType === 'recipe' ? 'Resep' : (folder.setupType === 'checklist' ? 'Ceklis' : 'Bacaan');

      // Preview snippets of up to 2 items
      const previewItems = itemsInFolder.slice(0, 2);

      const card = document.createElement('div');
      card.className = `pinterest-shelf-card ${isAllDone ? 'is-completed' : ''}`;
      card.setAttribute('data-id', folder.id);

      card.innerHTML = `
        <div class="shelf-card-top">
          <div class="shelf-card-icon-box" style="background: ${visual.bg}; color: ${visual.color};">
            ${visual.svg}
          </div>
          <div class="shelf-top-pills">
            <span class="shelf-tag-category">${categoryTag}</span>
            <span class="shelf-badge-status ${isAllDone ? 'done' : ''}">
              ${total > 0 ? (isAllDone ? '✓ 100%' : `${completed}/${total}`) : 'Kosong'}
            </span>
          </div>
        </div>

        <div class="shelf-card-main">
          <h3 class="shelf-card-title">${escapeHTML(folder.name)}</h3>
          
          <div class="shelf-preview-snippets">
            ${previewItems.length > 0 ? previewItems.map(item => `
              <div class="shelf-snippet-row ${item.status === 'completed' ? 'done' : ''}">
                <span class="shelf-snippet-bullet" style="background: ${item.status === 'completed' ? '#10b981' : visual.color};"></span>
                <span class="shelf-snippet-text">${escapeHTML(item.title)}</span>
              </div>
            `).join('') : `
              <span class="shelf-empty-snippet">Ketuk untuk mulai ceklis</span>
            `}
            ${total > 2 ? `<span class="shelf-more-count">+${total - 2} item lainnya</span>` : ''}
          </div>
        </div>

        <div class="shelf-card-bottom">
          <div class="shelf-meter-track">
            <div class="shelf-meter-fill" style="width: ${pct}%; background: linear-gradient(90deg, ${visual.color} 0%, #06b6d4 100%);"></div>
          </div>
          <div class="shelf-meter-labels">
            <span class="shelf-items-count">${total} item tersimpan</span>
            <span class="shelf-pct-label">${pct}%</span>
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        triggerNativeHaptic();
        navigateToFolder(folder.id);
      });

      card.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        openEditFolderModal(folder);
      });

      dom.foldersBentoGrid.appendChild(card);
    });

    // Add "+ Buat Rak Baru" Pinterest Card
    const addCard = document.createElement('div');
    addCard.className = 'pinterest-shelf-card add-shelf-card';
    addCard.innerHTML = `
      <div class="add-shelf-inner">
        <div class="add-shelf-icon-box">
          <svg class="svg-icon icon-sm" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </div>
        <h4 class="add-shelf-title">Buat Rak Baru</h4>
        <p class="add-shelf-sub">Tambah kategori atau koleksi baru</p>
      </div>
    `;
    addCard.addEventListener('click', () => {
      triggerNativeHaptic();
      openNewFolderModal();
    });
    dom.foldersBentoGrid.appendChild(addCard);
  }

  // =========================================================================
  // 6. VIEW 2: PURE CHECKLIST STREAM RENDERING
  // =========================================================================
  function renderFolderChecklist(folderId) {
    const folder = appState.folders.find(f => f.id === folderId);
    if (!folder) {
      navigateToHub();
      return;
    }

    const visual = getFolderVisual(folder);
    const allFolderItems = getUserAccessibleItems().filter(i => i.folderId === folder.id);
    const totalCount = allFolderItems.length;
    const completedCount = allFolderItems.filter(i => i.status === 'completed').length;
    const uncompletedCount = totalCount - completedCount;
    const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    // Update Hero
    if (dom.folderHeroIconBox) {
      dom.folderHeroIconBox.style.background = visual.bg;
      dom.folderHeroIconBox.style.color = visual.color;
      dom.folderHeroIconBox.innerHTML = visual.svg;
    }
    if (dom.folderHeroTitleText) {
      dom.folderHeroTitleText.textContent = folder.name;
    }
    if (dom.folderHeroProgressBadge) {
      dom.folderHeroProgressBadge.textContent = `${completedCount}/${totalCount} Selesai`;
    }
    if (dom.folderHeroPctText) {
      dom.folderHeroPctText.textContent = `${pct}%`;
    }
    if (dom.folderHeroProgressFill) {
      dom.folderHeroProgressFill.style.width = `${pct}%`;
      dom.folderHeroProgressFill.style.background = `linear-gradient(90deg, ${visual.color} 0%, #06b6d4 100%)`;
    }

    // Filter counts
    if (dom.countFilterAll) dom.countFilterAll.textContent = totalCount;
    if (dom.countFilterUncompleted) dom.countFilterUncompleted.textContent = uncompletedCount;
    if (dom.countFilterCompleted) dom.countFilterCompleted.textContent = completedCount;

    // Filter items
    let filteredItems = allFolderItems;
    if (appState.folderFilter === 'uncompleted') {
      filteredItems = filteredItems.filter(i => i.status !== 'completed');
    } else if (appState.folderFilter === 'completed') {
      filteredItems = filteredItems.filter(i => i.status === 'completed');
    }

    if (appState.folderSearchQuery.trim()) {
      const q = appState.folderSearchQuery.toLowerCase();
      filteredItems = filteredItems.filter(i => (i.title || '').toLowerCase().includes(q));
    }

    // Sort: uncompleted on top, then by recent
    filteredItems.sort((a, b) => {
      const aDone = a.status === 'completed' ? 1 : 0;
      const bDone = b.status === 'completed' ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    if (!dom.folderChecklistContainer) return;
    dom.folderChecklistContainer.innerHTML = '';

    if (filteredItems.length === 0) {
      if (dom.emptyChecklistState) dom.emptyChecklistState.classList.remove('hidden');
    } else {
      if (dom.emptyChecklistState) dom.emptyChecklistState.classList.add('hidden');
      filteredItems.forEach(item => {
        const itemCard = createChecklistRow(item, folder);
        dom.folderChecklistContainer.appendChild(itemCard);
      });
    }
  }

  function createChecklistRow(item, folder) {
    const isDone = item.status === 'completed';
    const row = document.createElement('div');
    row.className = `checklist-item-card ${isDone ? 'is-done' : ''}`;
    row.setAttribute('data-id', item.id);

    row.innerHTML = `
      <button type="button" class="cute-checklist-btn ${isDone ? 'checked' : ''}" aria-label="${isDone ? 'Tandai belum selesai' : 'Tandai selesai'}">
        <svg class="svg-icon icon-xs" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
      </button>
      <div class="checklist-info-col">
        <span class="checklist-title ${isDone ? 'strike' : ''}">${escapeHTML(item.title)}</span>
        <div class="checklist-meta-row">
          <span>${formatDate(item.createdAt)}</span>
          ${(appState.profile.role === 'admin' && item.userName) ? `<span class="checklist-user-tag">👤 ${escapeHTML(item.userName)}</span>` : ''}
        </div>
      </div>
      <div class="checklist-actions">
        <button type="button" class="checklist-action-btn btn-edit" title="Edit Item">
          <svg class="svg-icon icon-xs" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        </button>
        <button type="button" class="checklist-action-btn delete btn-delete" title="Hapus Item">
          <svg class="svg-icon icon-xs" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    `;

    // 1-Tap Toggle Status
    const checkBtn = row.querySelector('.cute-checklist-btn');
    checkBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerNativeHaptic();
      item.status = item.status === 'completed' ? 'plan' : 'completed';
      saveItemToDB(item);
      renderFolderChecklist(appState.activeFolderId);
      updateHeaderStats();
      showToast(item.status === 'completed' ? `✓ "${item.title}" selesai diceklis!` : `"${item.title}" ditandai belum selesai.`);
    });

    // Edit button
    row.querySelector('.btn-edit').addEventListener('click', (e) => {
      e.stopPropagation();
      openItemDetailModal(item);
    });

    // Delete button
    row.querySelector('.btn-delete').addEventListener('click', async (e) => {
      e.stopPropagation();
      const confirmed = await showConfirmDialog({
        title: 'Hapus Item Ceklis?',
        message: `Yakin ingin menghapus "${item.title}"?`,
        confirmText: 'Hapus',
        isDanger: true
      });
      if (confirmed) {
        appState.items = appState.items.filter(i => i.id !== item.id);
        deleteItemFromDB(item.id);
        renderFolderChecklist(appState.activeFolderId);
        updateHeaderStats();
        showToast('Item berhasil dihapus.');
      }
    });

    // Row click opens edit modal
    row.addEventListener('click', () => {
      openItemDetailModal(item);
    });

    return row;
  }

  // =========================================================================
  // 7. STREAMLINED ITEM DETAIL MODAL (GAMBAR 1)
  // =========================================================================
  function openItemDetailModal(item = null) {
    if (!dom.modalItemDetail) return;
    dom.modalItemDetail.classList.remove('hidden');

    const isEdit = !!item;
    document.getElementById('item-modal-title').textContent = isEdit ? 'Detail Item Ceklis' : 'Tambah Item Ceklis';
    document.getElementById('item-id-hidden').value = isEdit ? item.id : '';
    document.getElementById('item-title-input').value = isEdit ? item.title : '';

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

    // Status Checkbox Only
    const isDone = isEdit ? (item.status === 'completed') : false;
    if (dom.itemDoneCheckbox) {
      dom.itemDoneCheckbox.checked = isDone;
      updateToggleStatusText(isDone);
    }

    const btnDelete = document.getElementById('btn-delete-item');
    if (btnDelete) {
      btnDelete.classList.toggle('hidden', !isEdit);
    }

    setTimeout(() => {
      const titleInp = document.getElementById('item-title-input');
      if (titleInp && !isEdit) titleInp.focus();
    }, 150);
  }

  function updateToggleStatusText(isDone) {
    if (dom.toggleStatusTitle) {
      dom.toggleStatusTitle.textContent = isDone ? 'Sudah Dicek / Selesai' : 'Belum Selesai';
    }
    if (dom.toggleStatusDesc) {
      dom.toggleStatusDesc.textContent = isDone ? 'Item ini telah ditandai selesai' : 'Centang jika item ini sudah dicek atau selesai';
    }
  }

  function closeItemDetailModal() {
    if (dom.modalItemDetail) dom.modalItemDetail.classList.add('hidden');
    if (dom.formItemDetail) dom.formItemDetail.reset();
  }

  function initItemFormEvents() {
    if (dom.itemDoneCheckbox) {
      dom.itemDoneCheckbox.addEventListener('change', () => {
        updateToggleStatusText(dom.itemDoneCheckbox.checked);
        triggerNativeHaptic();
      });
    }

    if (dom.formItemDetail) {
      dom.formItemDetail.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('item-id-hidden').value;
        const title = document.getElementById('item-title-input').value.trim();
        const folderId = document.getElementById('item-folder-select').value || (appState.folders[0]?.id || 'f-umum');
        const isDone = dom.itemDoneCheckbox ? dom.itemDoneCheckbox.checked : false;
        const status = isDone ? 'completed' : 'plan';

        if (!title) {
          showToast('Nama item tidak boleh kosong.');
          return;
        }

        if (id) {
          const item = appState.items.find(i => i.id === id);
          if (item) {
            item.title = title;
            item.folderId = folderId;
            item.status = status;
            saveItemToDB(item);
          }
        } else {
          const newItem = {
            id: 'item-' + Date.now(),
            title,
            folderId,
            status,
            desc: '',
            coverUrl: '',
            createdAt: Date.now(),
            userId: appState.profile.userId,
            userName: appState.profile.userName
          };
          appState.items.unshift(newItem);
          saveItemToDB(newItem);
        }

        closeItemDetailModal();
        renderAll();
        showToast('Item berhasil disimpan!');
      });
    }

    const btnDelete = document.getElementById('btn-delete-item');
    if (btnDelete) {
      btnDelete.addEventListener('click', async () => {
        const id = document.getElementById('item-id-hidden').value;
        if (!id) return;
        const confirmed = await showConfirmDialog({
          title: 'Hapus Item Ceklis?',
          message: 'Item ini akan dihapus permanen dari rak.',
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
    }

    const btnClose = document.getElementById('btn-close-item-detail');
    if (btnClose) btnClose.addEventListener('click', closeItemDetailModal);

    const btnCancel = document.getElementById('btn-cancel-item');
    if (btnCancel) btnCancel.addEventListener('click', closeItemDetailModal);
  }

  // =========================================================================
  // 8. FOLDER / RAK MANAGEMENT MODAL
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

    if (previewName) previewName.textContent = curName || 'Nama Folder';

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
    if (!dom.modalFolder) return;
    dom.modalFolder.classList.remove('hidden');
    document.getElementById('folder-modal-title').textContent = 'Buat Rak Baru';
    document.getElementById('folder-id-hidden').value = '';
    document.getElementById('folder-name-input').value = '';
    document.getElementById('btn-delete-folder').classList.add('hidden');
    setActiveFolderIcon('book');
    setActiveFolderColorDot('book');
    setTimeout(() => {
      const inp = document.getElementById('folder-name-input');
      if (inp) inp.focus();
    }, 150);
  }

  function openEditFolderModal(folder) {
    if (!dom.modalFolder) return;
    dom.modalFolder.classList.remove('hidden');
    document.getElementById('folder-modal-title').textContent = 'Edit Rak Koleksi';
    document.getElementById('folder-id-hidden').value = folder.id;
    document.getElementById('folder-name-input').value = folder.name;
    document.getElementById('btn-delete-folder').classList.remove('hidden');
    setActiveFolderIcon(folder.icon || folder.color || 'book');
    setActiveFolderColorDot(folder.color || 'book');
  }

  function closeFolderModal() {
    if (dom.modalFolder) dom.modalFolder.classList.add('hidden');
    if (dom.formFolder) dom.formFolder.reset();
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

    if (dom.formFolder) {
      dom.formFolder.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('folder-id-hidden').value;
        const name = document.getElementById('folder-name-input').value.trim();
        const icon = document.getElementById('folder-icon-input').value || 'book';
        const color = document.getElementById('folder-color-input').value || 'book';

        if (!name) {
          showToast('Nama rak tidak boleh kosong.');
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
        showToast('Rak koleksi berhasil disimpan!');
      });
    }

    const btnDeleteFolder = document.getElementById('btn-delete-folder');
    if (btnDeleteFolder) {
      btnDeleteFolder.addEventListener('click', async () => {
        const id = document.getElementById('folder-id-hidden').value;
        if (!id) return;
        const confirmed = await showConfirmDialog({
          title: 'Hapus Rak Koleksi?',
          message: 'Item di dalamnya akan dipindahkan ke rak umum.',
          confirmText: 'Hapus Rak',
          isDanger: true
        });
        if (confirmed) {
          appState.folders = appState.folders.filter(f => f.id !== id);
          deleteFolderFromDB(id);
          if (appState.activeFolderId === id) {
            navigateToHub();
          }
          closeFolderModal();
          renderAll();
          showToast('Rak berhasil dihapus.');
        }
      });
    }

    const btnClose = document.getElementById('btn-close-folder');
    if (btnClose) btnClose.addEventListener('click', closeFolderModal);
    const btnCancel = document.getElementById('btn-cancel-folder');
    if (btnCancel) btnCancel.addEventListener('click', closeFolderModal);
  }

  // =========================================================================
  // 9. SETTINGS MODAL DISPLAY
  // =========================================================================
  function openSettingsModal() {
    const keyInput = document.getElementById('settings-gemini-key');
    const sheetsUrlInput = document.getElementById('settings-sheets-url');
    if (keyInput) keyInput.value = appState.settings.geminiApiKey || '';
    if (sheetsUrlInput) sheetsUrlInput.value = appState.settings.googleSheetsUrl || '';

    updateSettingsAccountCard();
    if (dom.modalSettings) dom.modalSettings.classList.remove('hidden');
  }

  // =========================================================================
  // 10. AI SCREENSHOT SCANNER (GEMINI 3.8 FLASH VISION)
  // =========================================================================
  function initScannerEvents() {
    const dropzone = dom.scannerDropzone;
    const fileInput = dom.scannerFileInput;
    const btnSelect = document.getElementById('btn-select-image-file');

    if (btnSelect && fileInput) {
      btnSelect.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
      });
    }
    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());
      dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
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
    }

    if (dom.btnMinimizeScanner) dom.btnMinimizeScanner.addEventListener('click', minimizeScannerToBackground);
    if (dom.btnOpenScanBanner) dom.btnOpenScanBanner.addEventListener('click', maximizeScannerBanner);
    if (dom.btnAddScanResult) dom.btnAddScanResult.addEventListener('click', addNewScannedItemCard);
    if (dom.btnSaveScanned) dom.btnSaveScanned.addEventListener('click', saveScannedItemsToCollection);
  }

  function minimizeScannerToBackground() {
    if (dom.modalScanner) dom.modalScanner.classList.add('hidden');
    appState.isScannerMinimized = true;
    if (dom.floatingScanBanner) {
      dom.floatingScanBanner.classList.remove('hidden');
      updateFloatingBannerStatus();
    }
    showToast('Pemindaian berjalan di latar belakang.');
  }

  function maximizeScannerBanner() {
    if (dom.floatingScanBanner) dom.floatingScanBanner.classList.add('hidden');
    appState.isScannerMinimized = false;
    if (dom.modalScanner) dom.modalScanner.classList.remove('hidden');

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
      if (dom.scanBannerSub) dom.scanBannerSub.textContent = `${itemsCount} judul siap disimpan`;
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

    try {
      while (true) {
        const pendingJob = appState.scanQueue.find(j => j.status === 'pending');
        if (!pendingJob) break;

        const totalJobs = appState.scanQueue.length;
        const currentIdx = appState.scanQueue.indexOf(pendingJob);
        const completedJobs = appState.scanQueue.filter(j => j.status === 'completed').length;

        pendingJob.status = 'processing';
        saveScanJobToDB(pendingJob);

        if (dom.scanPreviewImg) dom.scanPreviewImg.src = pendingJob.dataUrl;

        let displayJobName = `Foto ${completedJobs + 1} dari ${totalJobs}`;
        if (dom.scanProcessingTitle) dom.scanProcessingTitle.textContent = `Memindai ${displayJobName}`;
        if (dom.scanStatusTicker) dom.scanStatusTicker.textContent = `Mengekstrak judul ceklis via Gemini 3.8 Flash`;

        const percent = Math.round(((completedJobs) / totalJobs) * 100);
        if (dom.queueProgressBar) dom.queueProgressBar.style.width = `${percent}%`;
        if (dom.queueCountBadge) dom.queueCountBadge.textContent = `Foto ${completedJobs + 1} dari ${totalJobs} (${percent}%)`;

        if (appState.isScannerMinimized) updateFloatingBannerStatus();

        const apiKey = appState.settings.geminiApiKey.trim();
        let extractedRaw = null;

        if (apiKey) {
          try {
            extractedRaw = await callGemini38FlashVision(pendingJob.dataUrl, apiKey);
          } catch (err) {
            console.warn('[Scanner] Vision error:', err);
            showToast('Gagal memindai gambar dengan AI: ' + (err.message || 'Error'), 'warning');
            extractedRaw = [];
          }
        } else {
          showToast('Masukkan Gemini API Key di Pengaturan untuk memindai cover atau screenshot!', 'warning');
          extractedRaw = [];
        }

        const itemsExtracted = [];
        if (Array.isArray(extractedRaw)) {
          for (let itIdx = 0; itIdx < extractedRaw.length; itIdx++) {
            const it = extractedRaw[itIdx];
            let targetFolder = dom.resultsTargetFolder ? dom.resultsTargetFolder.value : (appState.folders[0]?.id || 'f-umum');
            if (it.suggestedFolder) {
              const matchedF = appState.folders.find(f =>
                f.name.toLowerCase() === it.suggestedFolder.toLowerCase() ||
                it.suggestedFolder.toLowerCase().includes(f.name.toLowerCase()) ||
                f.name.toLowerCase().includes(it.suggestedFolder.toLowerCase())
              );
              if (matchedF) targetFolder = matchedF.id;
            }

            itemsExtracted.push({
              tempId: 'temp-' + Date.now() + '-' + currentIdx + '-' + itIdx,
              title: it.title || 'Item Ceklis Baru',
              folderId: targetFolder,
              status: 'plan',
              selected: true
            });
          }
        }

        pendingJob.extractedItems = itemsExtracted;
        pendingJob.status = 'completed';
        saveScanJobToDB(pendingJob);
        appState.pendingScannedItems.push(...itemsExtracted);

        const hasMore = appState.scanQueue.some(j => j.status === 'pending');
        if (hasMore) {
          await new Promise(r => setTimeout(r, 1200));
        }
      }
    } finally {
      appState.isScanningActive = false;
    }

    const totalPhotos = appState.scanQueue.length;
    if (dom.queueProgressBar) dom.queueProgressBar.style.width = '100%';
    if (dom.queueCountBadge) dom.queueCountBadge.textContent = `Selesai ${totalPhotos} Foto!`;

    if (appState.isScannerMinimized) {
      updateFloatingBannerStatus();
      showToast(`Selesai memindai ${totalPhotos} foto (${appState.pendingScannedItems.length} judul ditemukan)!`);
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
          <p class="empty-state-desc">Belum ada judul terdeteksi. Tambah judul manual yuk.</p>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-add-manual-scan-fallback">+ Tambah Judul Manual</button>
        </div>
      `;
      const btnFallback = document.getElementById('btn-add-manual-scan-fallback');
      if (btnFallback) btnFallback.addEventListener('click', addNewScannedItemCard);
    } else {
      dom.resultsCountText.textContent = `Ditemukan ${appState.pendingScannedItems.length} Item Ceklis`;
      appState.pendingScannedItems.forEach((itemObj) => {
        const card = createScannedItemResultCard(itemObj);
        dom.resultsList.appendChild(card);
      });
    }

    updateSaveScanButtonText();
  }

  function createScannedItemResultCard(itemObj) {
    const resCard = document.createElement('div');
    resCard.className = 'result-item-card';
    resCard.setAttribute('data-temp-id', itemObj.tempId);

    const defaultFolderId = itemObj.folderId || (dom.resultsTargetFolder ? dom.resultsTargetFolder.value : (appState.folders[0]?.id || 'f-umum'));
    itemObj.folderId = defaultFolderId;

    const currentF = appState.folders.find(f => f.id === defaultFolderId) || appState.folders[0];
    const visual = getFolderVisual(currentF);

    resCard.innerHTML = `
      <div class="result-check-wrap">
        <input type="checkbox" class="result-checkbox" ${itemObj.selected ? 'checked' : ''} aria-label="Pilih item ini">
      </div>
      <div class="result-inputs" style="flex: 1;">
        <div class="result-card-top-row">
          <input type="text" class="input-result-title" value="${escapeHTML(itemObj.title)}" placeholder="Nama item ceklis...">
          <button type="button" class="btn-remove-scan-item" title="Hapus judul">
            <svg class="svg-icon icon-xs" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
        <div class="result-row-extras">
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
        </div>
      </div>
    `;

    const chk = resCard.querySelector('.result-checkbox');
    const titleInput = resCard.querySelector('.input-result-title');
    const btnRemove = resCard.querySelector('.btn-remove-scan-item');

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

    chk.addEventListener('change', () => {
      itemObj.selected = chk.checked;
      updateSaveScanButtonText();
    });

    titleInput.addEventListener('input', () => {
      itemObj.title = titleInput.value;
    });

    btnRemove.addEventListener('click', (e) => {
      e.stopPropagation();
      appState.pendingScannedItems = appState.pendingScannedItems.filter(i => i.tempId !== itemObj.tempId);
      resCard.remove();
      dom.resultsCountText.textContent = `Ditemukan ${appState.pendingScannedItems.length} Item Ceklis`;
      updateSaveScanButtonText();
    });

    return resCard;
  }

  function addNewScannedItemCard() {
    const defaultFolder = dom.resultsTargetFolder ? dom.resultsTargetFolder.value : (appState.folders[0]?.id || 'f-umum');
    const newItemObj = {
      tempId: 'temp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      title: '',
      folderId: defaultFolder,
      status: 'plan',
      selected: true
    };

    appState.pendingScannedItems.push(newItemObj);
    const emptyMsg = dom.resultsList.querySelector('.empty-state');
    if (emptyMsg) emptyMsg.remove();

    const card = createScannedItemResultCard(newItemObj);
    dom.resultsList.appendChild(card);
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    const inputTitle = card.querySelector('.input-result-title');
    if (inputTitle) inputTitle.focus();

    dom.resultsCountText.textContent = `Ditemukan ${appState.pendingScannedItems.length} Item Ceklis`;
    updateSaveScanButtonText();
  }

  function updateSaveScanButtonText() {
    const selectedCount = appState.pendingScannedItems.filter(i => i.selected).length;
    dom.btnSaveScanned.textContent = `Simpan ${selectedCount} Item ke Rak`;
    dom.btnSaveScanned.disabled = selectedCount === 0;
  }

  function saveScannedItemsToCollection() {
    const defaultFolderId = dom.resultsTargetFolder ? dom.resultsTargetFolder.value : (appState.folders[0]?.id || 'f-umum');
    const selectedItems = appState.pendingScannedItems.filter(i => i.selected && i.title.trim());

    if (selectedItems.length === 0) {
      showToast('Pilih minimal 1 item yang memiliki nama.');
      return;
    }

    selectedItems.forEach((it, i) => {
      const newItem = {
        id: 'item-' + Date.now() + '-' + i,
        title: it.title.trim(),
        folderId: it.folderId || defaultFolderId,
        status: it.status || 'plan',
        desc: '',
        coverUrl: '',
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
    showToast(`Berhasil menyimpan ${selectedItems.length} item ceklis baru!`);

    if (appState.currentView === 'folder' && appState.activeFolderId) {
      renderFolderChecklist(appState.activeFolderId);
    }
  }

  async function callGemini38FlashVision(base64DataUrl, apiKey) {
    const base64Pure = base64DataUrl.split(',')[1];
    const mimeType = base64DataUrl.split(';')[0].split(':')[1] || 'image/jpeg';

    const systemPrompt = `Anda adalah AI Vision Expert spesialis mengekstrak item ceklis dari screenshot rekomendasi anime, manga, novel, menu, atau daftar belanja.
Ekstrak daftar judul bersih dalam format JSON array:
[
  {
    "title": "Nama Item / Judul Bersih",
    "suggestedFolder": "Kategori / Nama Rak"
  }
]`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
    const payload = {
      contents: [{
        parts: [
          { text: systemPrompt + "\n\nEkstrak seluruh item dari screenshot ini ke dalam format JSON." },
          { inlineData: { mimeType, data: base64Pure } }
        ]
      }]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const json = await response.json();
      let text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(text);
    }
    throw new Error('Gemini vision API error: ' + response.status);
  }

  async function fallbackTrainedExtractor() {
    return [];
  }

  function openScannerModal() {
    if (!dom.modalScanner) return;
    dom.modalScanner.classList.remove('hidden');
    dom.scannerDropzone.classList.remove('hidden');
    dom.scannerProcessing.classList.add('hidden');
    dom.scannerResults.classList.add('hidden');
    dom.btnSaveScanned.classList.add('hidden');
    if (dom.scannerFileInput) dom.scannerFileInput.value = '';
    populateFolderSelects();
  }

  function closeScannerModal() {
    if (dom.modalScanner) dom.modalScanner.classList.add('hidden');
    if (dom.scannerFileInput) dom.scannerFileInput.value = '';
    appState.pendingScannedItems = [];
  }

  // =========================================================================
  // 11. GOOGLE SHEETS CLOUD SYNC & SETTINGS
  // =========================================================================
  const GOOGLE_APPS_SCRIPT_CODE = `// Script Backend Google Sheets (Lihat file google_sheets_script.js)`;

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
        syncPushToGoogleSheets(true);
      } else {
        throw new Error(data.error || 'Respon tidak valid');
      }
    } catch (err) {
      console.warn('Google Sheets ping error:', err);
      appState.settings.googleSheetsUrl = url;
      localStorage.setItem('google_sheets_url', url);
      updateCloudIndicator();
      showToast('URL disimpan! Coba klik tombol "Kirim ke Sheet".');
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
        pin: appState.settings.pin || '',
        folders: appState.folders,
        items: appState.items
      };

      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });

      const data = await resp.json();
      if (data && data.success) {
        if (!silent) showToast(`Tersinkronisasi! Data tersimpan di Google Sheets.`);
        updateCloudIndicator();
      } else {
        throw new Error(data.error || 'Gagal menyimpan ke Google Sheets');
      }
    } catch (err) {
      console.error('Push to Sheets error:', err);
      if (!silent) {
        showToast('Gagal kirim ke Google Sheets. Pastikan akses Web App diset "Anyone".');
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
        // Sync Master Password if provided from Google Sheets
        if (data.masterPassword !== undefined && data.masterPassword !== null && String(data.masterPassword).trim()) {
          appState.settings.masterPassword = String(data.masterPassword).trim();
          localStorage.setItem('reading_list_master_password', appState.settings.masterPassword);
        }

        // Merge Folders
        if (data.folders && data.folders.length > 0) {
          data.folders.forEach(remoteF => {
            const exists = appState.folders.some(f => f.id === remoteF.id || f.name.toLowerCase() === remoteF.name.toLowerCase());
            if (!exists) {
              appState.folders.push(remoteF);
            }
          });
        }

        // Merge Items
        const itemMap = new Map();
        appState.items.forEach(it => {
          const key = it.id || (it.title ? it.title.trim().toLowerCase() : ('item-' + Math.random()));
          itemMap.set(key, it);
        });

        data.items.forEach(remoteIt => {
          if (!remoteIt.title && !remoteIt.desc) return;
          let localMatch = appState.items.find(it => it.id === remoteIt.id);
          if (!localMatch && remoteIt.title) {
            localMatch = appState.items.find(it => it.title && it.title.trim().toLowerCase() === remoteIt.title.trim().toLowerCase());
          }
          if (localMatch && !remoteIt.id) {
            remoteIt.id = localMatch.id;
          }
          const key = remoteIt.id || (remoteIt.title ? remoteIt.title.trim().toLowerCase() : ('item-' + Math.random()));
          itemMap.set(key, remoteIt);
        });

        appState.items = Array.from(itemMap.values());
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
          showToast(`Berhasil memuat ${data.items.length} item dari Google Sheet!`);
        }
      } else {
        throw new Error(data.error || 'Gagal membaca data dari Google Sheets');
      }
    } catch (err) {
      console.error('Pull from Sheets error:', err);
      if (!silent) {
        showToast('Gagal menarik data dari Google Sheets. Periksa URL atau koneksi.');
      }
    } finally {
      if (dom.btnQuickSync) dom.btnQuickSync.classList.remove('syncing');
    }
  }

  function updateSettingsAccountCard() {
    const nameEl = document.getElementById('settings-display-name');
    const userEl = document.getElementById('settings-display-username');
    const badgeEl = document.getElementById('settings-role-badge');
    const initialEl = document.getElementById('settings-avatar-badge');
    const headerAvatar = document.getElementById('header-avatar-badge');
    const headerName = document.getElementById('header-user-name');

    const curName = appState.profile.userName || 'Pengguna';
    const curUsername = appState.profile.username || ('user_' + appState.profile.userId.substring(0, 6));
    const curRole = appState.profile.role || 'pribadi';
    const isAdmin = curRole === 'admin';

    if (nameEl) nameEl.textContent = curName;
    if (userEl) userEl.textContent = '@' + curUsername.replace(/^@/, '');
    if (initialEl) initialEl.textContent = curName.charAt(0).toUpperCase() || 'P';

    if (headerAvatar) headerAvatar.textContent = curName.charAt(0).toUpperCase() || 'P';
    if (headerName) headerName.textContent = curName;

    if (badgeEl) {
      badgeEl.innerHTML = `
        <svg class="svg-icon icon-xs" viewBox="0 0 24 24"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        ${isAdmin ? 'Mode Admin (Semua Data)' : 'Mode Pribadi (Terisolasi)'}
      `;
      badgeEl.className = `role-badge ${isAdmin ? 'admin' : 'pribadi'}`;
      badgeEl.style.background = isAdmin ? '#fef3c7' : '#eef2ff';
      badgeEl.style.color = isAdmin ? '#b45309' : '#4f46e5';
    }

    renderProfileModalData();
  }

  // =========================================================================
  // 11.5 CUTE & BRIGHT PROFILE MODAL (LUCU, CERAH, AKSES LUAR PENGATURAN)
  // =========================================================================
  function openProfileModal() {
    renderProfileModalData();
    if (dom.modalProfile) dom.modalProfile.classList.remove('hidden');
    triggerNativeHaptic();
  }

  function closeProfileModal() {
    if (dom.modalProfile) dom.modalProfile.classList.add('hidden');
  }

  function renderProfileModalData() {
    const curName = appState.profile.userName || 'Pengguna';
    const curUsername = appState.profile.username || ('user_' + appState.profile.userId.substring(0, 6));
    const curRole = appState.profile.role || 'pribadi';
    const isAdmin = curRole === 'admin';

    const modalAvatar = document.getElementById('profile-modal-avatar');
    const modalName = document.getElementById('profile-modal-name');
    const modalUsername = document.getElementById('profile-modal-username');
    const modalRole = document.getElementById('profile-modal-role');
    const modalRoleText = document.getElementById('profile-modal-role-text');

    if (modalAvatar) modalAvatar.textContent = curName.charAt(0).toUpperCase() || 'P';
    if (modalName) modalName.textContent = curName;
    if (modalUsername) modalUsername.textContent = '@' + curUsername.replace(/^@/, '');
    if (modalRole) modalRole.className = `profile-role-pill ${isAdmin ? 'admin' : ''}`;
    if (modalRoleText) modalRoleText.textContent = isAdmin ? 'Mode Admin (Semua Data)' : 'Mode Pribadi (Terisolasi)';

    // Stats
    const accessibleItems = getUserAccessibleItems();
    const accessibleFolders = getUserAccessibleFolders();
    const totalItems = accessibleItems.length;
    const completedItems = accessibleItems.filter(i => i.status === 'completed').length;

    const elShelves = document.getElementById('profile-stat-shelves');
    const elItems = document.getElementById('profile-stat-items');
    const elCompleted = document.getElementById('profile-stat-completed');

    if (elShelves) elShelves.textContent = accessibleFolders.length;
    if (elItems) elItems.textContent = totalItems;
    if (elCompleted) elCompleted.textContent = completedItems;
  }

  async function executeLogout() {
    const confirmed = await showConfirmDialog({
      title: 'Keluar dari Akun?',
      message: 'Anda akan keluar dari akun ini. Data Anda tetap tersimpan aman di database.',
      confirmText: 'Keluar',
      isDanger: true
    });
    if (confirmed) {
      localStorage.removeItem('reading_list_auth_user');
      localStorage.removeItem('reading_list_user_id');
      localStorage.removeItem('reading_list_user_name');
      localStorage.removeItem('reading_list_user_role');
      const guestId = 'user_' + Math.random().toString(36).substring(2, 7);
      appState.profile = {
        userId: guestId,
        userName: 'Tamu',
        role: 'pribadi',
        username: 'guest_' + guestId.substring(5)
      };
      updateSettingsAccountCard();
      closeProfileModal();
      if (dom.modalSettings) dom.modalSettings.classList.add('hidden');
      
      try {
        renderAll();
      } catch (err) {
        console.warn('renderAll error during logout:', err);
      }

      showToast('Anda telah keluar.');

      const loginUser = document.getElementById('login-username');
      const loginPwd = document.getElementById('login-password');
      if (loginUser) loginUser.value = '';
      if (loginPwd) loginPwd.value = '';

      openAuthModal('login');
    }
  }

  function initProfileEvents() {
    const btnOpen = document.getElementById('btn-open-profile');
    if (btnOpen) btnOpen.addEventListener('click', openProfileModal);

    const btnClose = document.getElementById('btn-close-profile');
    if (btnClose) btnClose.addEventListener('click', closeProfileModal);

    const btnLogout = document.getElementById('btn-profile-logout');
    if (btnLogout) btnLogout.addEventListener('click', executeLogout);
  }

  // =========================================================================
  // 11.8 MASTER PASSWORD SECURITY SYSTEM (TERHUBUNG KE GOOGLE SHEETS)
  // =========================================================================
  function openProtectedSettings() {
    triggerNativeHaptic();
    const modalPwd = document.getElementById('modal-settings-pwd');
    const inputPwd = document.getElementById('input-settings-master-pwd');
    const errorHint = document.getElementById('pwd-error-hint');
    const pwdCard = modalPwd ? modalPwd.querySelector('.modal-pwd-card') : null;

    if (!modalPwd || !inputPwd) {
      if (dom.modalSettings) dom.modalSettings.classList.remove('hidden');
      return;
    }

    inputPwd.value = '';
    if (errorHint) errorHint.classList.add('hidden');
    if (pwdCard) pwdCard.classList.remove('shake');
    modalPwd.classList.remove('hidden');
    setTimeout(() => { inputPwd.focus(); }, 120);
  }

  function closeProtectedSettingsModal() {
    const modalPwd = document.getElementById('modal-settings-pwd');
    const inputPwd = document.getElementById('input-settings-master-pwd');
    const errorHint = document.getElementById('pwd-error-hint');
    if (modalPwd) modalPwd.classList.add('hidden');
    if (inputPwd) inputPwd.value = '';
    if (errorHint) errorHint.classList.add('hidden');
  }

  function initMasterPasswordSecurityEvents() {
    const btnCancel = document.getElementById('btn-pwd-cancel');
    if (btnCancel) {
      btnCancel.addEventListener('click', closeProtectedSettingsModal);
    }

    const formPwd = document.getElementById('form-settings-pwd');
    const inputPwd = document.getElementById('input-settings-master-pwd');
    const errorHint = document.getElementById('pwd-error-hint');
    const modalPwd = document.getElementById('modal-settings-pwd');
    const pwdCard = modalPwd ? modalPwd.querySelector('.modal-pwd-card') : null;

    if (formPwd && inputPwd) {
      formPwd.addEventListener('submit', async (e) => {
        e.preventDefault();
        const candidate = inputPwd.value.trim();
        if (!candidate) return;

        const currentMaster = appState.settings.masterPassword || DEFAULT_MASTER_PASSWORD;

        // 1. Cek secara lokal (instan & offline-ready)
        if (candidate === currentMaster) {
          closeProtectedSettingsModal();
          openSettingsModal();
          showToast('Akses Pengaturan Terbuka!');
          return;
        }

        // 2. Jika lokal belum cocok tapi terhubung ke Google Sheets, verifikasi langsung ke Cloud
        // (Sangat berguna saat admin baru saja ganti password di spreadsheet dan APK belum sync)
        const sheetsUrl = appState.settings.googleSheetsUrl;
        if (sheetsUrl && sheetsUrl.startsWith('https://script.google.com/')) {
          const btnSubmit = document.getElementById('btn-pwd-submit');
          if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = 'Memeriksa ke Cloud...';
          }
          try {
            const verifyUrl = sheetsUrl.includes('?') 
              ? `${sheetsUrl}&action=verify_settings_pwd&password=${encodeURIComponent(candidate)}`
              : `${sheetsUrl}?action=verify_settings_pwd&password=${encodeURIComponent(candidate)}`;
            const resp = await fetch(verifyUrl);
            const data = await resp.json();

            if (data && data.success && data.valid) {
              const updatedMaster = data.masterPassword || candidate;
              appState.settings.masterPassword = updatedMaster;
              localStorage.setItem('reading_list_master_password', updatedMaster);
              closeProtectedSettingsModal();
              openSettingsModal();
              showToast('Akses Pengaturan Terbuka (Sandi Diperbarui dari Google Sheet)!');
              return;
            }
          } catch (netErr) {
            console.warn('[MasterPassword] Cloud verify error:', netErr);
          } finally {
            if (btnSubmit) {
              btnSubmit.disabled = false;
              btnSubmit.innerHTML = `
                <svg class="svg-icon icon-xs" viewBox="0 0 24 24"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Buka Pengaturan
              `;
            }
          }
        }

        // 3. Jika gagal / salah
        triggerNativeHaptic();
        if (errorHint) errorHint.classList.remove('hidden');
        if (pwdCard) {
          pwdCard.classList.remove('shake');
          void pwdCard.offsetWidth;
          pwdCard.classList.add('shake');
          setTimeout(() => { if (pwdCard) pwdCard.classList.remove('shake'); }, 450);
        }
        inputPwd.select();
      });
    }
  }

  function initSettingsEvents() {
    const keyInput = document.getElementById('settings-gemini-key');
    const sheetsUrlInput = document.getElementById('settings-sheets-url');

    const btnOpenSettings = document.getElementById('btn-open-settings');
    if (btnOpenSettings) {
      btnOpenSettings.addEventListener('click', openProtectedSettings);
    }

    const badgeCloud = document.getElementById('badge-cloud-indicator');
    if (badgeCloud) {
      badgeCloud.addEventListener('click', openProtectedSettings);
    }

    const btnCloseSettings = document.getElementById('btn-close-settings');
    if (btnCloseSettings) {
      btnCloseSettings.addEventListener('click', () => {
        if (dom.modalSettings) dom.modalSettings.classList.add('hidden');
      });
    }

    const btnDoneSettings = document.getElementById('btn-done-settings');
    if (btnDoneSettings) {
      btnDoneSettings.addEventListener('click', () => {
        if (dom.modalSettings) dom.modalSettings.classList.add('hidden');
      });
    }

    // Gemini Key Save
    const btnSaveGeminiKey = document.getElementById('btn-save-gemini-key');
    if (btnSaveGeminiKey && keyInput) {
      btnSaveGeminiKey.addEventListener('click', () => {
        const key = keyInput.value.trim();
        appState.settings.geminiApiKey = key;
        localStorage.setItem('gemini_api_key', key);
        updateAiBadge();
        showToast(key ? 'Gemini 3.8 Flash API Key aktif!' : 'API Key dikosongkan.');
      });
    }

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
      btnPullSheets.addEventListener('click', () => syncPullFromGoogleSheets(false));
    }

    const btnSyncMasterPwd = document.getElementById('btn-sync-master-pwd');
    if (btnSyncMasterPwd) {
      btnSyncMasterPwd.addEventListener('click', async () => {
        triggerNativeHaptic();
        await syncPullFromGoogleSheets(false);
      });
    }

    const btnToggleGuide = document.getElementById('btn-toggle-sheets-guide');
    const guideBox = document.getElementById('sheets-guide-box');
    if (btnToggleGuide && guideBox) {
      btnToggleGuide.addEventListener('click', () => {
        guideBox.classList.toggle('hidden');
      });
    }

    // Switch Account & Logout
    const btnSwitchAccount = document.getElementById('btn-open-auth-modal');
    if (btnSwitchAccount) {
      btnSwitchAccount.addEventListener('click', () => {
        openAuthModal('login');
      });
    }

    const btnLogout = document.getElementById('btn-logout-auth');
    if (btnLogout) {
      btnLogout.addEventListener('click', executeLogout);
    }

    // Export & Import JSON
    const btnExport = document.getElementById('btn-export-json');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        const backupData = {
          app: 'Reading List',
          version: '2.0.0',
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
    }

    const importFileInput = document.getElementById('import-json-file');
    const btnTriggerImport = document.getElementById('btn-trigger-import-json');
    if (btnTriggerImport && importFileInput) {
      btnTriggerImport.addEventListener('click', () => importFileInput.click());
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
                if (dom.modalSettings) dom.modalSettings.classList.add('hidden');
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
    }

    // Sample Data & Reset
    const btnSample = document.getElementById('btn-load-sample-data');
    if (btnSample) {
      btnSample.addEventListener('click', async () => {
        const confirmed = await showConfirmDialog({
          title: 'Muat Koleksi Contoh?',
          message: 'Koleksi contoh anime, manhwa, dan resep akan ditambahkan ke rak lo.',
          confirmText: 'Muat Contoh',
          isDanger: false
        });
        if (confirmed) {
          const defaultFolders = [
            { id: 'f-anime',  name: 'Anime & Film', color: 'film', icon: 'film', createdAt: Date.now() - 400000, userId: appState.profile.userId },
            { id: 'f-manhwa', name: 'Top Manhwa OP', color: 'flame', icon: 'flame', createdAt: Date.now() - 300000, userId: appState.profile.userId },
            { id: 'f-novel',  name: 'Webnovel & Buku', color: 'book', icon: 'book', createdAt: Date.now() - 200000, userId: appState.profile.userId },
            { id: 'f-resep',  name: 'Resep Masakan', color: 'leaf', icon: 'food', createdAt: Date.now() - 100000, userId: appState.profile.userId }
          ];
          const defaultItems = [
            { id: 'item-1', title: 'Sousou no Frieren (Eps 1-28)', folderId: 'f-anime', status: 'completed', createdAt: Date.now() - 500000, userId: appState.profile.userId, userName: appState.profile.userName },
            { id: 'item-2', title: 'Solo Leveling Season 1', folderId: 'f-manhwa', status: 'completed', createdAt: Date.now() - 400000, userId: appState.profile.userId, userName: appState.profile.userName },
            { id: 'item-3', title: "Omniscient Reader's Viewpoint", folderId: 'f-manhwa', status: 'plan', createdAt: Date.now() - 300000, userId: appState.profile.userId, userName: appState.profile.userName },
            { id: 'item-4', title: 'Atomic Habits', folderId: 'f-novel', status: 'completed', createdAt: Date.now() - 200000, userId: appState.profile.userId, userName: appState.profile.userName },
            { id: 'item-5', title: 'Rendang Daging Sapi Padang', folderId: 'f-resep', status: 'plan', createdAt: Date.now() - 100000, userId: appState.profile.userId, userName: appState.profile.userName }
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
          if (dom.modalSettings) dom.modalSettings.classList.add('hidden');
        }
      });
    }

    const btnReset = document.getElementById('btn-reset-all-data');
    if (btnReset) {
      btnReset.addEventListener('click', async () => {
        const confirmed = await showConfirmDialog({
          title: 'Hapus Semua Data Koleksi?',
          message: 'Seluruh rak dan item ceklis di HP lo akan dibersihkan permanen.',
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
          navigateToHub();
          renderAll();
          showToast('Semua data dibersihkan.');
          if (dom.modalSettings) dom.modalSettings.classList.add('hidden');
        }
      });
    }
  }

  // =========================================================================
  // 12. STATISTIK & PENCAPAIAN CEKLIS
  // =========================================================================
  function openStatsModal() {
    renderStatsData();
    if (dom.modalStats) dom.modalStats.classList.remove('hidden');
    triggerNativeHaptic();
  }

  function closeStatsModal() {
    if (dom.modalStats) dom.modalStats.classList.add('hidden');
  }

  function renderStatsData() {
    const accessible = getUserAccessibleItems();
    const totalItems = accessible.length;
    const completedItems = accessible.filter(i => i.status === 'completed').length;
    const uncompletedItems = totalItems - completedItems;
    const totalFolders = getUserAccessibleFolders().length;

    // Numbers
    const elTotal = document.getElementById('stat-total-items');
    if (elTotal) elTotal.textContent = totalItems;
    const elTotalSub = document.getElementById('stat-total-sub');
    if (elTotalSub) elTotalSub.textContent = `${totalFolders} rak aktif`;

    const elReading = document.getElementById('stat-reading-items');
    if (elReading) elReading.textContent = uncompletedItems;
    const uncompletedPct = totalItems > 0 ? Math.round((uncompletedItems / totalItems) * 100) : 0;
    const elReadingPercent = document.getElementById('stat-reading-percent');
    if (elReadingPercent) elReadingPercent.textContent = `${uncompletedPct}% dari total`;

    const elCompleted = document.getElementById('stat-completed-items');
    if (elCompleted) elCompleted.textContent = completedItems;
    const completedPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    const elCompletedPercent = document.getElementById('stat-completed-percent');
    if (elCompletedPercent) elCompletedPercent.textContent = `${completedPercent}% selesai`;

    // Progress Multibar
    const elRatio = document.getElementById('stat-ratio-text');
    if (elRatio) elRatio.textContent = `${completedItems}/${totalItems} Selesai`;
    const segComp = document.getElementById('prog-seg-completed');
    if (segComp) segComp.style.width = `${completedPercent}%`;
    const segPlan = document.getElementById('prog-seg-plan');
    if (segPlan) segPlan.style.width = `${uncompletedPct}%`;

    const legComp = document.getElementById('legend-count-completed');
    if (legComp) legComp.textContent = completedItems;
    const legPlan = document.getElementById('legend-count-plan');
    if (legPlan) legPlan.textContent = uncompletedItems;

    // Folder Breakdown
    const folderList = document.getElementById('stats-folders-breakdown');
    if (folderList) {
      folderList.innerHTML = '';
      const accessibleFolders = getUserAccessibleFolders();
      if (accessibleFolders.length === 0) {
        folderList.innerHTML = '<span class="text-dim" style="font-size:12px; padding: 4px 0;">Belum ada rak koleksi.</span>';
      } else {
        accessibleFolders.forEach(f => {
          const itemsInF = accessible.filter(i => i.folderId === f.id);
          const fCount = itemsInF.length;
          const fCompleted = itemsInF.filter(i => i.status === 'completed').length;
          const fPct = fCount > 0 ? Math.round((fCompleted / fCount) * 100) : 0;
          const visual = getFolderVisual(f);

          const row = document.createElement('div');
          row.className = 'stats-folder-row';
          row.innerHTML = `
            <div class="stats-folder-info">
              <div class="stats-folder-name-wrap">
                <div class="stats-folder-icon-sm" style="background:${visual.bg}; color:${visual.color}; flex-shrink: 0;">
                  ${visual.svg}
                </div>
                <span>${escapeHTML(f.name)}</span>
              </div>
              <span class="stats-folder-count">${fCompleted}/${fCount} (${fPct}%)</span>
            </div>
            <div class="stats-folder-track">
              <div class="stats-folder-fill" style="width:${fPct}%; background:${visual.color};"></div>
            </div>
          `;
          folderList.appendChild(row);
        });
      }
    }

    // Milestones Badges Tailored for Checklists
    const badgesContainer = document.getElementById('stats-badges-grid');
    if (badgesContainer) {
      badgesContainer.innerHTML = '';
      const hasPerfectFolder = getUserAccessibleFolders().some(f => {
        const inF = accessible.filter(i => i.folderId === f.id);
        return inF.length > 0 && inF.every(i => i.status === 'completed');
      });

      const milestones = [
        {
          id: 'first_check',
          svg: '<svg class="svg-icon" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>',
          title: 'Centang Pertama',
          desc: 'Selesaikan minimal 1 item ceklis',
          unlocked: completedItems >= 1
        },
        {
          id: 'collector',
          svg: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/></svg>',
          title: 'Kolektor Ceklis',
          desc: 'Miliki minimal 5 item dalam rak',
          unlocked: totalItems >= 5
        },
        {
          id: 'finisher_5',
          svg: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>',
          title: 'Penyelesai Handal',
          desc: 'Selesaikan 5+ item ceklis',
          unlocked: completedItems >= 5
        },
        {
          id: 'shelver',
          svg: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
          title: 'Master Rak',
          desc: 'Kelola minimal 3 rak berbeda',
          unlocked: totalFolders >= 3
        },
        {
          id: 'pro_20',
          svg: '<svg class="svg-icon" viewBox="0 0 24 24"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
          title: 'Pustakawan Rajin',
          desc: 'Miliki 20+ item total di rak',
          unlocked: totalItems >= 20
        },
        {
          id: 'finisher_15',
          svg: '<svg class="svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>',
          title: 'Juara Produktif',
          desc: 'Selesaikan 15+ item ceklis',
          unlocked: completedItems >= 15
        },
        {
          id: 'perfect_shelf',
          svg: '<svg class="svg-icon" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
          title: 'Koleksi Sempurna',
          desc: 'Tuntaskan 100% item di minimal 1 rak',
          unlocked: hasPerfectFolder
        },
        {
          id: 'legend',
          svg: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14v2H5z"/></svg>',
          title: 'Legenda Ceklis',
          desc: 'Kelola 50+ item ceklis total',
          unlocked: totalItems >= 50
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
    const btnClose = document.getElementById('btn-close-stats');
    if (btnClose) btnClose.addEventListener('click', closeStatsModal);
    const btnDone = document.getElementById('btn-done-stats');
    if (btnDone) btnDone.addEventListener('click', closeStatsModal);
  }

  // =========================================================================
  // 13. AUTHENTICATION SYSTEM (LOGIN & REGISTER)
  // =========================================================================
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
    if (idx >= 0) users[idx] = newUser;
    else users.push(newUser);
    localStorage.setItem('reading_list_registered_users', JSON.stringify(users));
  }

  function openAuthModal(defaultTab = 'login') {
    if (!dom.modalAuth) return;
    dom.modalAuth.classList.remove('hidden');

    const tabLogin = document.getElementById('tab-auth-login');
    const tabRegister = document.getElementById('tab-auth-register');
    const formLogin = document.getElementById('form-auth-login');
    const formRegister = document.getElementById('form-auth-register');
    const btnCloseAuth = document.getElementById('btn-close-auth');

    const activeAuth = JSON.parse(localStorage.getItem('reading_list_auth_user') || 'null');
    const hasRealAccount = activeAuth && activeAuth.userId && !activeAuth.userId.startsWith('user_');
    if (btnCloseAuth) {
      btnCloseAuth.classList.toggle('hidden', !hasRealAccount);
    }

    if (defaultTab === 'register') {
      if (tabRegister) tabRegister.classList.add('active');
      if (tabLogin) tabLogin.classList.remove('active');
      if (formRegister) formRegister.classList.remove('hidden');
      if (formLogin) formLogin.classList.add('hidden');
      setTimeout(() => {
        const regName = document.getElementById('reg-name');
        if (regName) regName.focus();
      }, 150);
    } else {
      if (tabLogin) tabLogin.classList.add('active');
      if (tabRegister) tabRegister.classList.remove('active');
      if (formLogin) formLogin.classList.remove('hidden');
      if (formRegister) formRegister.classList.add('hidden');
      setTimeout(() => {
        const logUser = document.getElementById('login-username');
        if (logUser) logUser.focus();
      }, 150);
    }
  }

  function closeAuthModal() {
    if (dom.modalAuth) dom.modalAuth.classList.add('hidden');
  }

  function initAuthSystem() {
    const tabLogin = document.getElementById('tab-auth-login');
    const tabRegister = document.getElementById('tab-auth-register');
    const formLogin = document.getElementById('form-auth-login');
    const formRegister = document.getElementById('form-auth-register');
    const btnCloseAuth = document.getElementById('btn-close-auth');
    const linkToRegister = document.getElementById('link-switch-to-register');
    const linkToLogin = document.getElementById('link-switch-to-login');

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

    if (linkToRegister) linkToRegister.addEventListener('click', (e) => { e.preventDefault(); if (tabRegister) tabRegister.click(); });
    if (linkToLogin) linkToLogin.addEventListener('click', (e) => { e.preventDefault(); if (tabLogin) tabLogin.click(); });
    if (btnCloseAuth) btnCloseAuth.addEventListener('click', closeAuthModal);

    // Show/Hide Password Eye Toggle
    document.querySelectorAll('.btn-toggle-pwd').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = btn.getAttribute('data-target');
        const targetInput = document.getElementById(targetId);
        if (!targetInput) return;
        const isPwd = targetInput.type === 'password';
        targetInput.type = isPwd ? 'text' : 'password';
        const iconEyeOff = btn.querySelector('.icon-eye-off');
        const iconEye = btn.querySelector('.icon-eye');
        if (iconEyeOff && iconEye) {
          iconEyeOff.classList.toggle('hidden', isPwd);
          iconEye.classList.toggle('hidden', !isPwd);
        }
      });
    });

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

          if (sheetsUrl) {
            try {
              const res = await fetch(sheetsUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'auth_login', username, password })
              });
              const json = await res.json();
              if (json && json.success && json.user) {
                loggedInUser = json.user;
                saveLocalRegisteredUser(json.user);
              }
            } catch (netErr) {}
          }

          if (!loggedInUser) {
            const localUsers = getLocalRegisteredUsers();
            const localFound = localUsers.find(u => u.username.toLowerCase() === username && (u.password === password || u.passwordHash === password));
            if (localFound) loggedInUser = localFound;
          }

          if (!loggedInUser) {
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

          // Tampilkan loading splash screen setelah login berhasil
          showSplashScreen(`Menyiapkan koleksi ${loggedInUser.name || loggedInUser.userName}...`);
          renderAll();

          if (appState.settings.googleSheetsUrl) {
            try {
              await syncPullFromGoogleSheets(true);
            } catch (syncErr) {
              console.warn('[Auth] Sync pull error:', syncErr);
            }
          }
          await new Promise(r => setTimeout(r, 700));
          hideSplashScreen(200);

          showToast(`Selamat datang, ${loggedInUser.name || loggedInUser.userName}!`);
        } catch (err) {
          showToast('Gagal masuk akun. Periksa username dan password.');
        } finally {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = `
            <svg class="svg-icon icon-xs" viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
            Masuk ke Koleksi
          `;
        }
      });
    }

    if (formRegister) {
      formRegister.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('reg-name').value.trim();
        const username = document.getElementById('reg-username').value.trim().toLowerCase().replace(/\s+/g, '');
        const password = document.getElementById('reg-password').value.trim();
        const role = 'pribadi';
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
          const newUser = { userId: generatedUserId, name, username, password, role };

          const sheetsUrl = appState.settings.googleSheetsUrl;
          if (sheetsUrl) {
            try {
              const res = await fetch(sheetsUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'auth_register', name, username, password, role })
              });
              const json = await res.json();
              if (json && json.success && json.user) {
                newUser.userId = json.user.userId || newUser.userId;
              }
            } catch (netErr) {}
          }

          saveLocalRegisteredUser(newUser);
          saveAuthSession(newUser);

          if (appState.folders.length === 0) {
            appState.folders = [
              { id: 'f-anime-' + Date.now(), name: 'Anime & Film', color: 'film', icon: 'film', createdAt: Date.now(), userId: newUser.userId },
              { id: 'f-manhwa-' + Date.now(), name: 'Top Manhwa OP', color: 'flame', icon: 'flame', createdAt: Date.now() + 1, userId: newUser.userId }
            ];
            saveToLocalStorage();
            if (dbInstance) {
              const tx = dbInstance.transaction(['folders'], 'readwrite');
              appState.folders.forEach(f => tx.objectStore('folders').put(f));
            }
          }

          closeAuthModal();
          formRegister.reset();

          // Tampilkan loading splash screen setelah register berhasil
          showSplashScreen(`Menyiapkan koleksi baru ${name}...`);
          renderAll();

          if (appState.settings.googleSheetsUrl) {
            try {
              await syncPushToGoogleSheets(true);
            } catch (syncErr) {
              console.warn('[Auth] Sync push error:', syncErr);
            }
          }
          await new Promise(r => setTimeout(r, 700));
          hideSplashScreen(200);

          showToast(`Akun ${name} berhasil dibuat!`);
        } catch (err) {
          showToast('Gagal mendaftar akun.');
        } finally {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = `
            <svg class="svg-icon icon-xs" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            Buat Akun & Mulai Rak Saya
          `;
        }
      });
    }
  }

  // =========================================================================
  // 14. HELPERS & DIALOGS
  // =========================================================================
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
    }, 2400);
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
          btnOk.style.background = '#f43f5e';
          btnOk.style.color = '#ffffff';
        } else {
          btnOk.style.background = '';
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

  function showSplashScreen(statusText = 'Menyiapkan koleksi kamu...') {
    const splash = document.getElementById('app-splash-screen');
    const splashStatus = document.getElementById('splash-status-text');
    if (splashStatus) splashStatus.textContent = statusText;
    if (splash) {
      splash.style.display = 'flex';
      void splash.offsetWidth;
      splash.classList.remove('hidden-splash');
    }
  }

  function hideSplashScreen(delayMs = 400) {
    const splash = document.getElementById('app-splash-screen');
    const splashStatus = document.getElementById('splash-status-text');
    setTimeout(() => {
      if (splashStatus) splashStatus.textContent = 'Siap!';
      if (splash) {
        splash.classList.add('hidden-splash');
        setTimeout(() => {
          splash.style.display = 'none';
        }, 500);
      }
    }, delayMs);
  }

  // =========================================================================
  // 15. INITIALIZATION
  // =========================================================================
  async function initApp() {
    try {
      await initDatabase();

      // Navigation: Dock Buttons
      if (dom.dockBtnHome) {
        dom.dockBtnHome.addEventListener('click', () => {
          triggerNativeHaptic();
          navigateToHub();
        });
      }

      if (dom.dockBtnScan) {
        dom.dockBtnScan.addEventListener('click', () => {
          triggerNativeHaptic();
          openScannerModal();
        });
      }

      if (dom.dockBtnStats) {
        dom.dockBtnStats.addEventListener('click', () => {
          triggerNativeHaptic();
          openStatsModal();
        });
      }

      // Hub Buttons
      if (dom.btnCreateShelf) dom.btnCreateShelf.addEventListener('click', openNewFolderModal);
      if (dom.btnEmptyCreateShelf) dom.btnEmptyCreateShelf.addEventListener('click', openNewFolderModal);

      // Folder Detail View Buttons
      if (dom.btnBackToHub) {
        dom.btnBackToHub.addEventListener('click', () => {
          triggerNativeHaptic();
          navigateToHub();
        });
      }

      if (dom.btnAddItemToShelf) {
        dom.btnAddItemToShelf.addEventListener('click', () => {
          triggerNativeHaptic();
          openItemDetailModal(null);
        });
      }

      if (dom.btnEmptyAddChecklist) {
        dom.btnEmptyAddChecklist.addEventListener('click', () => {
          triggerNativeHaptic();
          openItemDetailModal(null);
        });
      }

      if (dom.btnFolderMenu) {
        dom.btnFolderMenu.addEventListener('click', () => {
          const folder = appState.folders.find(f => f.id === appState.activeFolderId);
          if (folder) openEditFolderModal(folder);
        });
      }

      // Folder Filter Pills
      document.querySelectorAll('.filter-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          triggerNativeHaptic();
          document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          appState.folderFilter = pill.getAttribute('data-filter') || 'all';
          renderFolderChecklist(appState.activeFolderId);
        });
      });

      // Folder Internal Search
      if (dom.folderItemsSearchInput) {
        dom.folderItemsSearchInput.addEventListener('input', () => {
          appState.folderSearchQuery = dom.folderItemsSearchInput.value;
          renderFolderChecklist(appState.activeFolderId);
        });
      }

      // Top Header Search Bar (Hub Search)
      if (dom.searchInput) {
        dom.searchInput.addEventListener('input', () => {
          appState.searchQuery = dom.searchInput.value;
          if (dom.btnClearSearch) {
            dom.btnClearSearch.classList.toggle('hidden', !appState.searchQuery.trim());
          }
          if (appState.currentView === 'hub') {
            renderFoldersHub();
          }
        });
      }
      if (dom.btnClearSearch && dom.searchInput) {
        dom.btnClearSearch.addEventListener('click', () => {
          dom.searchInput.value = '';
          appState.searchQuery = '';
          dom.btnClearSearch.classList.add('hidden');
          if (appState.currentView === 'hub') {
            renderFoldersHub();
          }
        });
      }

      // Quick Sync Button
      if (dom.btnQuickSync) {
        dom.btnQuickSync.addEventListener('click', () => {
          triggerNativeHaptic();
          syncPullFromGoogleSheets(false);
        });
      }

      // Scanner modal close
      const btnCloseScanner = document.getElementById('btn-close-scanner');
      if (btnCloseScanner) btnCloseScanner.addEventListener('click', closeScannerModal);
      const btnCancelScan = document.getElementById('btn-cancel-scan');
      if (btnCancelScan) btnCancelScan.addEventListener('click', closeScannerModal);

      // Initialize all event listeners
      try { initScannerEvents(); } catch (e) { console.warn('initScannerEvents:', e); }
      try { initItemFormEvents(); } catch (e) { console.warn('initItemFormEvents:', e); }
      try { initFolderEvents(); } catch (e) { console.warn('initFolderEvents:', e); }
      try { initMasterPasswordSecurityEvents(); } catch (e) { console.warn('initMasterPasswordSecurityEvents:', e); }
      try { initProfileEvents(); } catch (e) { console.warn('initProfileEvents:', e); }
      try { initSettingsEvents(); } catch (e) { console.warn('initSettingsEvents:', e); }
      try { initStatsEvents(); } catch (e) { console.warn('initStatsEvents:', e); }
      try { initAuthSystem(); } catch (e) { console.warn('initAuthSystem:', e); }

      renderAll();

      const activeAuth = JSON.parse(localStorage.getItem('reading_list_auth_user') || 'null');
      const hasRealAccount = activeAuth && activeAuth.userId && !activeAuth.userId.startsWith('user_');

      if (!hasRealAccount) {
        hideSplashScreen();
        setTimeout(() => {
          openAuthModal('login');
        }, 120);
      } else {
        if (appState.settings && appState.settings.googleSheetsUrl) {
          syncPullFromGoogleSheets(true);
        }
      }

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          if (appState.scanQueue && appState.scanQueue.some(j => j.status === 'pending') && !appState.isScanningActive) {
            processScanQueue();
          }
          if (appState.settings && appState.settings.googleSheetsUrl) {
            syncPullFromGoogleSheets(true);
          }
        }
      });
    } catch (err) {
      console.error('[CRITICAL] Exception in initApp:', err);
    } finally {
      setTimeout(hideSplashScreen, 800);
    }
  }

  setTimeout(hideSplashScreen, 2000);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
