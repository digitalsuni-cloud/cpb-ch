const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

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

    // ── Find-in-page (Cmd/Ctrl+F) ─────────────────────────────────────────────
    // Inject a lightweight floating search bar after the page loads
    win.webContents.on('did-finish-load', () => {
        win.webContents.executeJavaScript(`
            (function() {
                if (document.getElementById('__electron_find_bar__')) return;

                const bar = document.createElement('div');
                bar.id = '__electron_find_bar__';
                bar.style.cssText = [
                    'position:fixed', 'top:8px', 'right:12px', 'z-index:99999',
                    'display:none', 'align-items:center', 'gap:6px',
                    'background:var(--bg-card,#1e1e2e)', 'border:1px solid var(--border,#3d3d5c)',
                    'border-radius:10px', 'padding:6px 10px',
                    'box-shadow:0 8px 24px rgba(0,0,0,0.55)',
                    'font-family:Inter,system-ui,sans-serif'
                ].join(';');

                const input = document.createElement('input');
                input.placeholder = 'Find in page…';
                input.style.cssText = [
                    'background:var(--bg-deep,#13131f)', 'border:1px solid var(--border,#3d3d5c)',
                    'border-radius:6px', 'padding:4px 10px', 'color:var(--text-main,#fff)',
                    'width:200px', 'outline:none', 'font-size:13px'
                ].join(';');

                const counter = document.createElement('span');
                counter.style.cssText = 'color:var(--text-muted,#888);min-width:60px;text-align:center;font-size:12px';

                const mkBtn = (label) => {
                    const b = document.createElement('button');
                    b.textContent = label;
                    b.style.cssText = 'background:none;border:none;color:var(--text-muted,#aaa);cursor:pointer;font-size:14px;padding:0 4px;line-height:1';
                    return b;
                };
                const btnPrev  = mkBtn('↑');
                const btnNext  = mkBtn('↓');
                const btnClose = mkBtn('✕');

                let activeIdx = 0, results = 0;
                const updateCounter = () => {
                    counter.textContent = results > 0 ? (activeIdx + 1) + ' / ' + results : (input.value ? '0 results' : '');
                };

                input.addEventListener('input', () => {
                    activeIdx = 0;
                    if (!input.value) { window.find('', false, false, false, false, true); counter.textContent = ''; results = 0; return; }
                    const found = window.find(input.value, false, false, true, false, true);
                    results = found ? 1 : 0;
                    updateCounter();
                });

                input.addEventListener('keydown', e => {
                    if (e.key === 'Enter') { e.shiftKey ? btnPrev.click() : btnNext.click(); }
                    if (e.key === 'Escape') { btnClose.click(); }
                    e.stopPropagation();
                });

                btnNext.addEventListener('click', () => {
                    if (!input.value) return;
                    window.find(input.value, false, false, true);
                    activeIdx = (activeIdx + 1) % Math.max(results, 1);
                    updateCounter();
                });

                btnPrev.addEventListener('click', () => {
                    if (!input.value) return;
                    window.find(input.value, false, true, true);
                    if (activeIdx > 0) activeIdx--;
                    updateCounter();
                });

                btnClose.addEventListener('click', () => {
                    bar.style.display = 'none';
                    window.find('', false, false, false, false, true);
                    input.value = '';
                    counter.textContent = '';
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
