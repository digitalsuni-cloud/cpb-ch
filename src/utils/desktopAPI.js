import { isTauriApp, isElectronApp } from './env';

// ── API Fetch ───────────────────────────────────────────────────────────────

let _tauriFetch = null;

const getTauriFetch = async () => {
    if (_tauriFetch) return _tauriFetch;
    
    if (isTauriApp()) {
        try {
            const mod = await import('@tauri-apps/plugin-http');
            _tauriFetch = mod.fetch;
        } catch (e) {
            console.warn('[desktopAPI] Tauri HTTP plugin not available, falling back to fetch:', e);
            _tauriFetch = window.fetch.bind(window);
        }
    } else {
        // Electron or Web browser
        _tauriFetch = window.fetch.bind(window);
    }
    return _tauriFetch;
};

/**
 * Universal fetch that automatically selects Tauri HTTP or browser fetch.
 */
export const apiFetch = async (url, options = {}) => {
    const fetchFn = await getTauriFetch();
    return fetchFn(url, options);
};

// ── Desktop Credential Store ─────────────────────────────────────────────────
// Uses @tauri-apps/plugin-store for Tauri, window.electron for Electron,
// and falls back to localStorage for web.

let _store = null;

const getStore = async () => {
    if (_store) return _store;
    if (isTauriApp()) {
        try {
            const { Store } = await import('@tauri-apps/plugin-store');
            _store = await Store.load('credentials.json', { autoSave: true });
        } catch (e) {
            console.warn('[desktopAPI] Tauri Store plugin not available:', e);
            _store = null;
        }
    }
    return _store;
};

export const tauriGetCredential = async (key) => {
    // 1. Try Tauri Store
    const store = await getStore();
    if (store) {
        const val = await store.get(key);
        return val || '';
    }
    
    // 2. Try Electron IPC
    if (isElectronApp() && window.electron) {
        try {
            return await window.electron.getCredential(key);
        } catch (e) {
            console.warn('[desktopAPI] Electron getCredential failed:', e);
        }
    }
    
    // 3. Fallback to LocalStorage
    return localStorage.getItem(key) || '';
};

export const tauriSetCredential = async (key, value) => {
    // 1. Try Tauri Store
    const store = await getStore();
    if (store) {
        await store.set(key, value);
        return;
    }
    
    // 2. Try Electron IPC
    if (isElectronApp() && window.electron) {
        try {
            await window.electron.setCredential(key, value);
            return;
        } catch (e) {
            console.warn('[desktopAPI] Electron setCredential failed:', e);
        }
    }
    
    // 3. Fallback to LocalStorage
    localStorage.setItem(key, value);
};

export const tauriDeleteCredential = async (key) => {
    // 1. Try Tauri Store
    const store = await getStore();
    if (store) {
        await store.delete(key);
        return;
    }
    
    // 2. Try Electron IPC
    if (isElectronApp() && window.electron) {
        try {
            await window.electron.deleteCredential(key);
            return;
        } catch (e) {
            console.warn('[desktopAPI] Electron deleteCredential failed:', e);
        }
    }
    
    // 3. Fallback to LocalStorage
    localStorage.removeItem(key);
};
