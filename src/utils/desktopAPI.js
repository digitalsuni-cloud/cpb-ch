/**
 * desktopAPI.js — Tauri-native HTTP adapter
 *
 * When running inside Tauri, all fetch() calls go through Rust (via plugin-http),
 * which means CORS restrictions do not apply. The CloudHealth API is called directly
 * with no proxy needed.
 *
 * Falls back to standard window.fetch for web browser deployments (gh-pages).
 */

import { isTauriApp } from './env';

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
        _tauriFetch = window.fetch.bind(window);
    }
    return _tauriFetch;
};

/**
 * Universal fetch that automatically selects Tauri HTTP or browser fetch.
 * API is identical to the browser fetch() API.
 */
export const apiFetch = async (url, options = {}) => {
    const fetchFn = await getTauriFetch();
    return fetchFn(url, options);
};

// ── Tauri credential store ───────────────────────────────────────────────────
// Uses @tauri-apps/plugin-store for secure, persistent key-value storage.
// In web mode, falls back to localStorage.

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
    const store = await getStore();
    if (!store) return localStorage.getItem(key) || '';
    const val = await store.get(key);
    return val || '';
};

export const tauriSetCredential = async (key, value) => {
    const store = await getStore();
    if (!store) { localStorage.setItem(key, value); return; }
    await store.set(key, value);
};

export const tauriDeleteCredential = async (key) => {
    const store = await getStore();
    if (!store) { localStorage.removeItem(key); return; }
    await store.delete(key);
};
