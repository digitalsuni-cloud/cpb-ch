import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getCredential, setCredential } from '../utils/credentials';
import { open as openUrl } from '@tauri-apps/plugin-shell';



const SettingsModal = ({ isOpen, onClose }) => {
    const [apiKey, setApiKey]     = useState('');
    const [apiError, setApiError] = useState('');
    const [saved, setSaved]       = useState(false);
    const debounceRef             = useRef(null);

    // Load key when modal opens
    useEffect(() => {
        if (isOpen) {
            setApiKey(getCredential('ch_api_key') || '');
            setApiError('');
            setSaved(false);
        }
    }, [isOpen]);


    // Auto-save with 600ms debounce after user stops typing
    const handleChange = (val) => {
        setApiKey(val);
        setApiError('');
        setSaved(false);

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            const trimmed = val.trim();
            if (trimmed && trimmed.length < 15) {
                setApiError('API Key appears too short (expected >15 characters).');
                return;
            }
            await setCredential('ch_api_key', trimmed);
            if (trimmed) setSaved(true);
        }, 600);
    };

    // Save on close if there's an unsaved value (e.g. user types then immediately clicks X)
    const handleClose = async () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        const trimmed = apiKey.trim();
        if (trimmed && trimmed.length >= 15) {
            await setCredential('ch_api_key', trimmed);
        }
        onClose();
    };

    const modalContent = (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Static blur layer — never animates, always composited by GPU */}
                    <div style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        zIndex: 9998,
                        backdropFilter: 'blur(6px)',
                        WebkitBackdropFilter: 'blur(6px)',
                        pointerEvents: 'none',
                    }} />

                    {/* Animated overlay — plain colour only, no blur recalc each frame */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        onClick={handleClose}
                        style={{
                            position: 'fixed',
                            top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.55)',
                            zIndex: 9999,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '20px',
                        }}
                    >
                        {/* Card — GPU-promoted, scale+y spring only */}
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 28, mass: 0.8 }}
                            onClick={e => e.stopPropagation()}
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
                                zIndex: 1,
                                willChange: 'transform',
                            }}
                        >
                        {/* ── X close button — absolute top-right corner ── */}
                        <button
                            onClick={handleClose}
                            style={{
                                position: 'absolute',
                                top: '14px',
                                right: '14px',
                                width: '28px',
                                height: '28px',
                                borderRadius: '7px',
                                border: '1px solid var(--border)',
                                background: 'transparent',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.85rem',
                                lineHeight: 1,
                                transition: 'all 0.18s',
                                zIndex: 2,
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                                e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)';
                                e.currentTarget.style.color = '#ef4444';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.borderColor = 'var(--border)';
                                e.currentTarget.style.color = 'var(--text-muted)';
                            }}
                            aria-label="Close settings"
                        >
                            ✕
                        </button>

                        {/* ── Header (no longer contains the X) ── */}
                        <div style={{
                            padding: '20px 52px 20px 24px',   /* right-pad makes room for X */
                            borderBottom: '1px solid var(--border)',
                        }}>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)' }}>
                                API Settings
                            </h2>
                            <p style={{ margin: '6px 0 0', fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                Configure your CloudHealth API key to communicate with your CloudHealth Partner tenant.
                                Your key is stored securely on this device.
                            </p>
                        </div>

                        {/* Body */}
                        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div className="input-group" style={{ margin: 0 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    CloudHealth API Key
                                    {saved && (
                                        <span style={{
                                            fontSize: '0.72rem',
                                            color: 'var(--success)',
                                            background: 'rgba(16,185,129,0.1)',
                                            border: '1px solid rgba(16,185,129,0.3)',
                                            borderRadius: '4px',
                                            padding: '1px 6px',
                                            fontWeight: 600,
                                        }}>
                                            ✓ Saved
                                        </span>
                                    )}
                                </label>
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={e => handleChange(e.target.value)}
                                    placeholder="Enter your CloudHealth API Token"
                                    style={{
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        borderColor: apiError ? 'var(--danger)' : undefined,
                                    }}
                                />
                                {apiError && (
                                    <span style={{ fontSize: '0.8rem', color: 'var(--danger)', marginTop: '4px', display: 'block' }}>
                                        {apiError}
                                    </span>
                                )}
                                <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                        Found Under
                                        <button
                                            onClick={() => openUrl('https://apps.cloudhealthtech.com/profile').catch(() => {})}
                                            style={{
                                                background: 'none', border: 'none', padding: 0,
                                                cursor: 'pointer', color: 'var(--primary)',
                                                fontSize: '0.8rem', fontWeight: 600,
                                                textDecoration: 'underline', textUnderlineOffset: '2px',
                                                transition: 'color 0.15s',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.color = '#818cf8'}
                                            onMouseLeave={e => e.currentTarget.style.color = 'var(--primary)'}
                                        >
                                            User Profile
                                        </button>
                                        <span>→ API Keys</span>
                                    </span>
                                    <button
                                        onClick={() => openUrl('https://apidocs.cloudhealthtech.com/#documentation_getting-your-api-key').catch(() => {})}
                                        style={{
                                            background: 'none', border: 'none', padding: 0,
                                            cursor: 'pointer', color: 'var(--primary)',
                                            fontSize: '0.8rem',
                                            textDecoration: 'underline', textUnderlineOffset: '2px',
                                            transition: 'color 0.15s',
                                            textAlign: 'left',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.color = '#818cf8'}
                                        onMouseLeave={e => e.currentTarget.style.color = 'var(--primary)'}
                                    >
                                        How to get your API key ↗
                                    </button>
                                </div>

                            </div>
                        </div>
                    </motion.div>
                </motion.div>
                </>
            )}

        </AnimatePresence>
    );

    return createPortal(modalContent, document.body);

};

export default SettingsModal;
