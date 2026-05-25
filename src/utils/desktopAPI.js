import { isTauriApp, isElectronApp } from './env';

// ── API Fetch ───────────────────────────────────────────────────────────────

/**
 * Custom Tauri fetch that routes through a native Rust reqwest client via IPC.
 *
 * Why: Tauri's default @tauri-apps/plugin-http uses a strict TLS policy that
 * rejects self-signed certificates installed by corporate SSL inspection proxies
 * (common on enterprise laptops). The Rust-side custom_fetch command configures
 * reqwest with danger_accept_invalid_certs(true) and native-tls, matching the
 * robust network behaviour of Electron while also inheriting system proxy env
 * vars (HTTP_PROXY, HTTPS_PROXY, NO_PROXY) automatically.
 *
 * Returns a Fetch-like response object so all callers (chApi.js) work unchanged.
 */
const customTauriFetch = async (url, options = {}) => {
    const { invoke } = await import('@tauri-apps/api/core');

    const method = (options.method || 'GET').toUpperCase();
    const headers = options.headers || {};
    const body = options.body || null;

    const result = await invoke('custom_fetch', { method, url, headers, body });

    return {
        ok: result.ok,
        status: result.status,
        text: async () => result.body,
        json: async () => JSON.parse(result.body),
    };
};

/**
 * Universal fetch that automatically selects the appropriate transport:
 * - Tauri desktop: routes through custom Rust HTTP command (TLS-bypass capable)
 * - Electron / Web: uses native window.fetch
 */
export const apiFetch = async (url, options = {}) => {
    if (isTauriApp()) {
        return customTauriFetch(url, options);
    }
    // Electron or Web browser
    return window.fetch(url, options);
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
