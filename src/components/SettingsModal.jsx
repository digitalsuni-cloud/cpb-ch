import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { isElectronApp } from '../utils/env';
import { FaCode } from 'react-icons/fa';
import Tooltip from './Tooltip';
import { getCredential, setCredential } from '../utils/credentials';

const SettingsModal = ({ isOpen, onClose }) => {
    const [apiKey, setApiKey] = useState('');
    const [proxyUrl, setProxyUrl] = useState('');

    useEffect(() => {
        if (isOpen) {
            setApiKey(getCredential('ch_api_key') || '');
            setProxyUrl(getCredential('ch_proxy_url') || '');
        }
    }, [isOpen]);

    const handleSave = async () => {
        await setCredential('ch_api_key', apiKey.trim());
        await setCredential('ch_proxy_url', proxyUrl.trim());
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0, 0, 0, 0.6)',
                            backdropFilter: 'blur(4px)'
                        }}
                    />

                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="card"
                        style={{
                            position: 'relative',
                            width: '100%',
                            maxWidth: '500px',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            borderRadius: '16px',
                            boxShadow: 'var(--shadow-card)',
                            overflow: 'hidden',
                            zIndex: 1
                        }}
                    >
                        <div style={{ padding: '24px', borderBottom: '1px solid var(--border)' }}>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)' }}>API Integrations / Settings</h2>
                            <p style={{ margin: '8px 0 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                Configure connection parameters to communicate directly with the CloudHealth partner API.
                                Credentials are saved securely within your system keychain.
                            </p>
                        </div>

                        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div className="input-group" style={{ margin: 0 }}>
                                <label>CloudHealth API Key</label>
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={e => setApiKey(e.target.value)}
                                    placeholder="Enter your CloudHealth API Token"
                                    style={{ width: '100%', boxSizing: 'border-box' }}
                                />
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                                    Found in Setup &gt; Administrators &gt; API Keys
                                </span>
                            </div>

                            <div className="input-group" style={{ margin: 0 }}>
                                <label>CORS Proxy URL (Optional)</label>
                                <input
                                    type="text"
                                    value={proxyUrl}
                                    onChange={e => setProxyUrl(e.target.value)}
                                    placeholder="e.g. https://cors-anywhere.herokuapp.com/"
                                    style={{ width: '100%', boxSizing: 'border-box' }}
                                />
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                                    If you run into browser CORS errors while deploying, you can specify a proxy URL prefix to route through. Include trailing slash.
                                </span>
                            </div>

                            {isElectronApp() && (
                                <div className="input-group" style={{ margin: 0 }}>
                                    <label>Advanced Troubleshooting</label>
                                    <Tooltip title="DevTools" content="Open the built-in browser inspector to debug API calls and view console logs" position="top">
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                if (window.electronAPI) {
                                                    window.electronAPI.toggleDevTools();
                                                }
                                            }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                width: '100%',
                                                padding: '10px',
                                                background: 'var(--bg-deep)',
                                                border: '1px solid var(--border)',
                                                color: 'var(--text-main)',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontSize: '0.9rem',
                                                fontWeight: 600,
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                                            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                                        >
                                            <FaCode /> Toggle Developer Tools (Network Inspector)
                                        </button>
                                    </Tooltip>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                                        Open the native Chrome DevTools to inspect live raw API payloads and debug network requests. (Shortcut: Ctrl+Shift+I)
                                    </span>
                                </div>
                            )}
                        </div>

                        <div style={{ padding: '24px', background: 'var(--bg-deep)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button
                                className="button-secondary"
                                onClick={onClose}
                                style={{ padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)' }}
                            >
                                Cancel
                            </button>
                            <button
                                className="button-primary"
                                onClick={handleSave}
                                style={{ padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', background: 'var(--primary)', color: '#fff', border: 'none', fontWeight: 600 }}
                            >
                                Save Settings
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default SettingsModal;
