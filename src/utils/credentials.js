/**
 * credentials.js — Unified Secure Credential Access
 *
 * Tauri desktop:    stored via @tauri-apps/plugin-store (credentials.json, app data dir)
 * Electron desktop: stored encrypted via OS keychain through electronAPI IPC
 * Web browser:      falls back to localStorage (no secure storage available)
 *
 * Usage:
 *   import { hydrateCredentials, getCredential, setCredential } from '../utils/credentials';
 *
 *   // In App.jsx on mount — loads credentials into memory once:
 *   await hydrateCredentials();
 *
 *   // Anywhere in the app (synchronous after hydration):
 *   const apiKey = getCredential('ch_api_key');
 *   await setCredential('ch_api_key', 'new-value');
 */

import { isTauriApp } from './env';
import { tauriGetCredential, tauriSetCredential, tauriDeleteCredential } from './desktopAPI';

const IS_ELECTRON = typeof window !== 'undefined' && window.electronAPI?.isElectron === true;

// In-memory cache — populated by hydrateCredentials() on startup.
const _cache = {};

const CREDENTIAL_KEYS = ['ch_api_key', 'ch_proxy_url'];

/**
 * Call ONCE at app startup (before any user interaction).
 * Loads credentials into the in-memory cache.
 */
export const hydrateCredentials = async () => {
    if (isTauriApp()) {
        for (const key of CREDENTIAL_KEYS) {
            _cache[key] = await tauriGetCredential(key) || '';
        }
        return;
    }

    if (IS_ELECTRON) {
        // Migrate legacy plaintext values from localStorage to keychain
        for (const key of CREDENTIAL_KEYS) {
            const legacy = localStorage.getItem(key);
            if (legacy) {
                await window.electronAPI.migrateCredential(key, legacy);
                localStorage.removeItem(key);
            }
        }
        _cache['ch_api_key']   = await window.electronAPI.getCredential('ch_api_key')   || '';
        _cache['ch_proxy_url'] = await window.electronAPI.getCredential('ch_proxy_url') || '';
    }
    // Web: reads directly from localStorage on each getCredential() call — no hydration needed
};

/**
 * Synchronous read — works immediately after hydrateCredentials() has run.
 * In web browser mode: reads directly from localStorage.
 */
export const getCredential = (key) => {
    if (isTauriApp() || IS_ELECTRON) return _cache[key] ?? '';
    return localStorage.getItem(key) || '';
};

/**
 * Async write — persists to the appropriate secure store and updates the cache.
 */
export const setCredential = async (key, value) => {
    const val = (value || '').trim();
    _cache[key] = val;

    if (isTauriApp()) {
        await tauriSetCredential(key, val);
    } else if (IS_ELECTRON) {
        await window.electronAPI.setCredential(key, val);
    } else {
        localStorage.setItem(key, val);
    }
};

/**
 * Delete a credential from the store / localStorage.
 */
export const deleteCredential = async (key) => {
    delete _cache[key];

    if (isTauriApp()) {
        await tauriDeleteCredential(key);
    } else if (IS_ELECTRON) {
        await window.electronAPI.deleteCredential(key);
    } else {
        localStorage.removeItem(key);
    }
};
