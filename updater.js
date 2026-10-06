/**
 * UPDATER.JS — Cloud Live OTA & Version Checker
 * Sesuai Standar Plan.md (Fase 5: Cloud OTA Update Engine)
 */

(function () {
  'use strict';

  const LOCAL_VERSION = '1.0.0';
  const LOCAL_VERSION_CODE = 1;
  const VERSION_CHECK_URL = 'version.json';

  async function checkAppUpdates() {
    try {
      const response = await fetch(VERSION_CHECK_URL + '?t=' + Date.now());
      if (!response.ok) return;

      const remote = await response.json();
      if (remote.versionCode && remote.versionCode > LOCAL_VERSION_CODE) {
        console.log(`[UPDATER] Versi baru ditemukan: ${remote.version}`);
        showUpdateNotification(remote);
      }
    } catch (e) {
      // Offline mode: abaikan error pengecekan versi
    }
  }

  function showUpdateNotification(remote) {
    const banner = document.createElement('div');
    banner.className = 'update-banner';
    banner.style.cssText = `
      position: fixed; top: 12px; left: 50%; transform: translateX(-50%);
      width: 92%; max-width: 480px; z-index: 99999;
      background: #1e293b; color: #ffffff; border: 1px solid #38bdf8;
      border-radius: 14px; padding: 12px 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.7);
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      font-family: Plus Jakarta Sans, sans-serif;
    `;

    banner.innerHTML = `
      <div>
        <div style="font-weight: 800; font-size: 13px; color: #38bdf8;">Pembaruan Tersedia (${remote.version})</div>
        <div style="font-size: 11.5px; color: #94a3b8;">${remote.changeLog || 'Peningkatan performa dan perbaikan bug.'}</div>
      </div>
      <button type="button" id="btn-reload-update" style="
        background: #38bdf8; color: #090a0f; font-weight: 700; font-size: 11px;
        padding: 6px 12px; border-radius: 8px; border: none; cursor: pointer; white-space: nowrap;
      ">Perbarui</button>
    `;

    document.body.appendChild(banner);

    const btnReload = banner.querySelector('#btn-reload-update');
    if (btnReload) {
      btnReload.addEventListener('click', () => {
        window.location.reload(true);
      });
    }
  }

  // Cek update setelah app aktif
  window.addEventListener('load', () => {
    setTimeout(checkAppUpdates, 3000);
  });
})();
