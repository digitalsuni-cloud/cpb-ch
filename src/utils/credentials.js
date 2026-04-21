/**
 * credentials.js — Unified Secure Credential Access
 *
 * In Electron: credentials are stored encrypted via OS keychain
 *   (macOS Keychain, Windows DPAPI, Linux libsecret) through
 *   Electron's safeStorage API. The plaintext API key never touches
 *   localStorage or disk unencrypted.
 *
 * In Web browser (gh-pages): falls back to localStorage as before,
 *   since there is no Electron IPC available.
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

const IS_ELECTRON = typeof window !== 'undefined' && window.electronAPI?.isElectron === true;

// In-memory cache — populated by hydrateCredentials() on startup.
// Allows synchronous getCredential() calls throughout the app after hydration.
const _cache = {};

/**
 * Call ONCE at app startup (before any user interaction).
 * Loads credentials from OS keychain into memory and migrates
 * any legacy plaintext values from localStorage.
 */
export const hydrateCredentials = async () => {
    if (!IS_ELECTRON) return; // Web: localStorage.getItem() is used directly

    // ── Migrate legacy plaintext values from localStorage ─────────────────
    // If a previous version stored credentials in localStorage, move them
    // to the secure keychain and wipe the plaintext immediately.
    const legacyApiKey   = localStorage.getItem('ch_api_key');
    const legacyProxyUrl = localStorage.getItem('ch_proxy_url');

    if (legacyApiKey) {
        await window.electronAPI.migrateCredential('ch_api_key', legacyApiKey);
        localStorage.removeItem('ch_api_key');
        console.log('[credentials] Migrated ch_api_key from localStorage to secure keychain.');
    }
    if (legacyProxyUrl) {
        await window.electronAPI.migrateCredential('ch_proxy_url', legacyProxyUrl);
        localStorage.removeItem('ch_proxy_url');
        console.log('[credentials] Migrated ch_proxy_url from localStorage to secure keychain.');
    }

    // ── Load from keychain into memory cache ─────────────────────────────
    _cache['ch_api_key']   = await window.electronAPI.getCredential('ch_api_key')   || '';
    _cache['ch_proxy_url'] = await window.electronAPI.getCredential('ch_proxy_url') || '';
};

/**
 * Synchronous read — works immediately after hydrateCredentials() has run.
 * In web browser mode: reads directly from localStorage.
 */
export const getCredential = (key) => {
    if (IS_ELECTRON) return _cache[key] ?? '';
    return localStorage.getItem(key) || '';
};

/**
 * Async write — persists to OS keychain (Electron) or localStorage (web).
 * Also updates the in-memory cache so subsequent getCredential() calls
 * return the new value immediately.
 */
export const setCredential = async (key, value) => {
    const val = (value || '').trim();
    _cache[key] = val;
    if (IS_ELECTRON) {
        await window.electronAPI.setCredential(key, val);
    } else {
        localStorage.setItem(key, val);
    }
};

/**
 * Delete a credential from keychain / localStorage.
 */
export const deleteCredential = async (key) => {
    delete _cache[key];
    if (IS_ELECTRON) {
        await window.electronAPI.deleteCredential(key);
    } else {
        localStorage.removeItem(key);
    }
};
