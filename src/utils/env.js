export const isElectronApp = () => {
    if (navigator.userAgent.toLowerCase().includes('electron')) return true;
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1';
};

/** True when running inside a Tauri native window */
export const isTauriApp = () =>
    typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__;

/** True when running as any desktop app (Tauri or Electron) */
export const isDesktopApp = () => isTauriApp() || isElectronApp();

