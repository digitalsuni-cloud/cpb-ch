const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const isDev = process.env.NODE_ENV === 'development';

// ── Override userData path to 'CloudHealth Pricebook Studio' ──────────────────
// Electron defaults to using package.json "name" field ("cpb-react") for the
// userData directory. We override it here to use the correct product name.
// MUST be called synchronously before app.whenReady() so Chromium picks it up.
// We use process.env.APPDATA on Windows for reliability before app is ready.
(function overrideUserDataPath() {
    try {
        let appDataRoot;
        if (process.platform === 'win32') {
            // Use env var directly — most reliable on Windows before app ready
            appDataRoot = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
        } else if (process.platform === 'darwin') {
            appDataRoot = path.join(os.homedir(), 'Library', 'Application Support');
        } else {
            appDataRoot = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
        }
        const newUserData = path.join(appDataRoot, 'CloudHealth Pricebook Studio');
        app.setPath('userData', newUserData);
        console.log(`[userData] Set to: ${newUserData}`);
    } catch (e) {
        console.error('[userData] Failed to override path:', e.message);
    }
})();

// ── Migrate data from old cpb-react userData to new CloudHealth Pricebook Studio ──
function migrateOldUserData() {
    try {
        const newUserData = app.getPath('userData');
        const oldUserData = path.join(path.dirname(newUserData), 'cpb-react');

        // Nothing to migrate if old folder doesn't exist
        if (!fs.existsSync(oldUserData)) return;

        const oldLocalStorage = path.join(oldUserData, 'Local Storage');
        // If old folder exists but has no Local Storage, nothing meaningful to migrate
        if (!fs.existsSync(oldLocalStorage)) return;

        const newLocalStorage = path.join(newUserData, 'Local Storage');
        // Don't overwrite if the new app already has its own data
        if (fs.existsSync(newLocalStorage)) return;

        console.log(`[Migration] Found old data at: ${oldUserData}`);
        console.log(`[Migration] Migrating to: ${newUserData}`);

        // Folders to migrate (all Chromium profile storage)
        const foldersToMigrate = [
            'Local Storage',
            'IndexedDB',
            'Session Storage',
            'Cookies',
            'Preferences'
        ];

        for (const folder of foldersToMigrate) {
            const src = path.join(oldUserData, folder);
            const dest = path.join(newUserData, folder);
            if (fs.existsSync(src) && !fs.existsSync(dest)) {
                fs.cpSync(src, dest, { recursive: true });
                console.log(`[Migration] Copied: ${folder}`);
            }
        }

        console.log('[Migration] Complete — old data preserved at original location as backup.');
    } catch (err) {
        // Migration failure should never block the app from starting
        console.error('[Migration] Failed (non-fatal):', err.message);
    }
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1400,
        height: 900,
        title: "CloudHealth Pricebook Studio",
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false // Disabling web security disables CORS completely for API calls
        },
        autoHideMenuBar: true
    });

    if (isDev) {
        win.loadURL('http://localhost:5173/');
        win.webContents.openDevTools();
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    // ── Find-in-page (Native Electron API) ───────────────────────────────────
    ipcMain.on('find-in-page', (e, text, options) => {
        if (!text) {
            win.webContents.stopFindInPage('clearSelection');
            return;
        }
        win.webContents.findInPage(text, options);
    });

    win.webContents.on('found-in-page', (event, result) => {
        win.webContents.send('find-in-page-results', {
            active: result.activeMatchOrdinal,
            count: result.matches
        });
    });

    win.webContents.on('did-finish-load', () => {
        win.webContents.executeJavaScript(`
            (function() {
                const { ipcRenderer } = require('electron');
                if (document.getElementById('__electron_find_bar__')) return;

                const bar = document.createElement('div');
                bar.id = '__electron_find_bar__';
                bar.style.cssText = [
                    'position:fixed', 'top:12px', 'right:12px', 'z-index:999999',
                    'display:none', 'align-items:center', 'gap:8px',
                    'background:var(--bg-card,#1e1e2e)', 'border:1px solid var(--border,#3d3d5c)',
                    'border-radius:12px', 'padding:8px 12px',
                    'box-shadow:0 12px 32px rgba(0,0,0,0.6)',
                    'font-family:Inter,system-ui,sans-serif', 'backdrop-filter:blur(8px)'
                ].join(';');

                const input = document.createElement('input');
                input.placeholder = 'Find in page…';
                input.style.cssText = [
                    'background:var(--bg-deep,#13131f)', 'border:1px solid var(--border,#3d3d5c)',
                    'border-radius:8px', 'padding:6px 12px', 'color:var(--text-main,#fff)',
                    'width:220px', 'outline:none', 'font-size:13px', 'transition:border-color 0.2s'
                ].join(';');
                input.onfocus = () => input.style.borderColor = 'var(--primary,#8b5cf6)';
                input.onblur = () => input.style.borderColor = 'var(--border,#3d3d5c)';

                const counter = document.createElement('span');
                counter.style.cssText = 'color:var(--text-muted,#888);min-width:70px;text-align:center;font-size:12px;font-variant-numeric:tabular-nums';

                const mkBtn = (label, title) => {
                    const b = document.createElement('button');
                    b.innerHTML = label;
                    b.title = title;
                    b.style.cssText = 'background:none;border:none;color:var(--text-muted,#aaa);cursor:pointer;font-size:16px;padding:4px;line-height:1;display:flex;align-items:center;transition:color 0.2s';
                    b.onmouseenter = () => b.style.color = 'var(--text-main,#fff)';
                    b.onmouseleave = () => b.style.color = 'var(--text-muted,#aaa)';
                    return b;
                };
                
                const btnPrev  = mkBtn('↑', 'Previous (Shift+Enter)');
                const btnNext  = mkBtn('↓', 'Next (Enter)');
                const btnClose = mkBtn('✕', 'Close (Esc)');

                input.addEventListener('input', () => {
                    ipcRenderer.send('find-in-page', input.value, { forward: true, findNext: false });
                });

                input.addEventListener('keydown', e => {
                    if (e.key === 'Enter') { 
                        e.preventDefault();
                        ipcRenderer.send('find-in-page', input.value, { forward: !e.shiftKey, findNext: true });
                    }
                    if (e.key === 'Escape') { btnClose.click(); }
                    e.stopPropagation();
                });

                btnNext.addEventListener('click', () => {
                    ipcRenderer.send('find-in-page', input.value, { forward: true, findNext: true });
                });

                btnPrev.addEventListener('click', () => {
                    ipcRenderer.send('find-in-page', input.value, { forward: false, findNext: true });
                });

                btnClose.addEventListener('click', () => {
                    bar.style.display = 'none';
                    ipcRenderer.send('find-in-page', '');
                    input.value = '';
                    counter.textContent = '';
                });

                ipcRenderer.on('find-in-page-results', (e, result) => {
                    if (input.value) {
                        counter.textContent = result.count > 0 ? (result.active + ' / ' + result.count) : '0 results';
                    } else {
                        counter.textContent = '';
                    }
                });

                bar.append(input, btnPrev, btnNext, counter, btnClose);
                document.body.appendChild(bar);

                document.addEventListener('keydown', e => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
                        e.preventDefault();
                        bar.style.display = 'flex';
                        input.focus();
                        input.select();
                    }
                });
            })();
        `);
    });

    // Enable Ctrl+Shift+I / Cmd+Option+I to open DevTools
    win.webContents.on('before-input-event', (event, input) => {
        if ((input.control || input.meta) && input.shift && input.key.toLowerCase() === 'i') {
            win.webContents.toggleDevTools();
            event.preventDefault();
        }
    });
}

app.whenReady().then(() => {
    migrateOldUserData();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

ipcMain.on('toggle-dev-tools', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.webContents.toggleDevTools();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
