/**
 * UPDATER.JS — Cloud Live OTA & Version Checker
 * Sesuai Standar Plan.md (Fase 5: Cloud OTA Update Engine)
 */

(function () {
  'use strict';

  const LOCAL_VERSION = '1.0.0';
  const LOCAL_VERSION_CODE = 1;
  const REMOTE_VERSION_URL = 'https://raw.githubusercontent.com/appcraft1/reading-list/main/version.json';

  async function checkAppUpdates() {
    try {
      // 1. Cek langsung ke GitHub Raw untuk mengetahui update rilis cloud terbaru
      let response = await fetch(REMOTE_VERSION_URL + '?t=' + Date.now()).catch(() => null);
      if (!response || !response.ok) {
        response = await fetch('version.json?t=' + Date.now()).catch(() => null);
      }
      if (!response || !response.ok) return;

      const remote = await response.json();
      if (remote.versionCode && remote.versionCode > LOCAL_VERSION_CODE) {
        console.log(`[UPDATER] Versi baru ditemukan di Cloud: ${remote.version}`);
        showUpdateNotification(remote);
      }
    } catch (e) {
      // Offline mode: abaikan error pengecekan versi
    }
  }

  function showUpdateNotification(remote) {
    if (document.querySelector('.update-banner')) return;

    const banner = document.createElement('div');
    banner.className = 'update-banner';
    banner.style.cssText = `
      position: fixed; top: 16px; left: 50%; transform: translateX(-50%);
      width: 90%; max-width: 440px; z-index: 99999;
      background: #0f172a; color: #ffffff; border: 1px solid rgba(56, 189, 248, 0.4);
      border-radius: 14px; padding: 12px 16px; box-shadow: 0 12px 36px rgba(0,0,0,0.6);
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      font-family: 'Plus Jakarta Sans', sans-serif; animation: slideDown 0.3s ease;
    `;

    banner.innerHTML = `
      <div style="flex: 1;">
        <div style="font-weight: 800; font-size: 13px; color: #38bdf8;">⚡ Pembaruan Cloud (${remote.version})</div>
        <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">${remote.changeLog || 'Pembaruan fitur & database cloud tersedia.'}</div>
      </div>
      <button type="button" id="btn-reload-update" style="
        background: linear-gradient(135deg, #0284c7, #38bdf8); color: #090a0f; font-weight: 700; font-size: 11.5px;
        padding: 7px 14px; border-radius: 8px; border: none; cursor: pointer; white-space: nowrap;
      ">Perbarui</button>
    `;

    document.body.appendChild(banner);

    const btnReload = banner.querySelector('#btn-reload-update');
    if (btnReload) {
      btnReload.addEventListener('click', () => {
        // Clear caches and reload to fetch newest cloud assets
        if ('caches' in window) {
          caches.keys().then((names) => {
            Promise.all(names.map(name => caches.delete(name))).then(() => {
              window.location.reload(true);
            });
          });
        } else {
          window.location.reload(true);
        }
      });
    }
  }

  // Cek update setelah app aktif
  window.addEventListener('load', () => {
    setTimeout(checkAppUpdates, 2500);
  });
})();
