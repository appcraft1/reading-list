/**
 * UPDATER.JS — Cloud Live OTA & Version Checker
 * Sesuai Standar Plan.md (Fase 5: Cloud OTA Update Engine)
 */

(function () {
  'use strict';

  const LOCAL_VERSION = '1.2.0';
  const LOCAL_VERSION_CODE = 4;
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
        // Cek apakah user sudah menutup notifikasi versi ini sebelumnya
        const dismissedVer = localStorage.getItem('dismissed_update_version');
        if (dismissedVer === String(remote.version)) {
          console.log(`[UPDATER] Versi ${remote.version} telah ditutup oleh pengguna sebelumnya.`);
          return;
        }

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
      width: calc(100% - 32px); max-width: 440px; z-index: 99999;
      background: rgba(15, 23, 42, 0.94); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
      color: #ffffff; border: 1px solid rgba(56, 189, 248, 0.35);
      border-radius: 16px; padding: 12px 14px 12px 16px; box-shadow: 0 16px 40px rgba(0,0,0,0.55), 0 0 20px rgba(56, 189, 248, 0.15);
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      animation: bannerSlideDown 0.32s cubic-bezier(0.16, 1, 0.3, 1);
    `;

    banner.innerHTML = `
      <div style="flex: 1; min-width: 0;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="font-weight: 800; font-size: 13px; color: #38bdf8; letter-spacing: -0.2px;">⚡ Pembaruan Cloud (${remote.version})</span>
        </div>
        <div style="font-size: 11px; color: #94a3b8; margin-top: 2px; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
          ${remote.changeLog || 'Pembaruan fitur & database cloud tersedia.'}
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
        <button type="button" id="btn-reload-update" style="
          background: linear-gradient(135deg, #0284c7, #38bdf8); color: #090a0f; font-weight: 700; font-size: 11.5px;
          padding: 7px 13px; border-radius: 10px; border: none; cursor: pointer; white-space: nowrap;
          box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3); transition: transform 0.15s ease;
        ">Perbarui</button>
        <button type="button" id="btn-dismiss-update" aria-label="Tutup Notifikasi" style="
          background: rgba(255, 255, 255, 0.1); color: #94a3b8; border: none; border-radius: 8px;
          width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
          cursor: pointer; font-size: 16px; line-height: 1; transition: background 0.15s ease;
        ">&times;</button>
      </div>
    `;

    document.body.appendChild(banner);

    const btnDismiss = banner.querySelector('#btn-dismiss-update');
    if (btnDismiss) {
      btnDismiss.addEventListener('click', () => {
        // Simpan versi yang ditutup agar tidak muncul kembali
        localStorage.setItem('dismissed_update_version', String(remote.version));
        banner.style.opacity = '0';
        banner.style.transform = 'translate(-50%, -20px)';
        banner.style.transition = '0.25s ease';
        setTimeout(() => banner.remove(), 260);
      });
    }

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

