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

    // Enable native shortcut (Ctrl+Shift+I or Cmd+Option+I) to open DevTools
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
    if (win) {
        win.webContents.toggleDevTools();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
