import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getCredential, setCredential } from '../utils/credentials';
import { open as openUrl } from '@tauri-apps/plugin-shell';
import { FaCloudDownloadAlt } from 'react-icons/fa';



const SettingsModal = ({ isOpen, onClose, onCheckUpdates }) => {
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
                        {/* ── Header ── */}
                        <div style={{
                            padding: '20px 24px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: '1px solid var(--border)',
                            background: 'rgba(255, 255, 255, 0.02)'
                        }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)', fontWeight: 600 }}>Preferences</h2>
                                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Manage your application settings</p>
                            </div>
                            <button
                                onClick={handleClose}
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-deep)',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.9rem',
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                                    e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)';
                                    e.currentTarget.style.color = '#ef4444';
                                    e.currentTarget.style.transform = 'scale(1.05)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'var(--bg-deep)';
                                    e.currentTarget.style.borderColor = 'var(--border)';
                                    e.currentTarget.style.color = 'var(--text-muted)';
                                    e.currentTarget.style.transform = 'scale(1)';
                                }}
                                aria-label="Close settings"
                            >
                                ✕
                            </button>
                        </div>

                        {/* ── Body ── */}
                        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            
                            {/* API Key Card */}
                            <div style={{
                                background: 'var(--bg-deep)',
                                border: '1px solid var(--border)',
                                borderRadius: '12px',
                                padding: '20px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <h3 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        CloudHealth API Key
                                    </h3>
                                    {saved && (
                                        <span style={{
                                            fontSize: '0.72rem',
                                            color: '#10b981',
                                            background: 'rgba(16,185,129,0.1)',
                                            border: '1px solid rgba(16,185,129,0.2)',
                                            padding: '3px 8px',
                                            borderRadius: '12px',
                                            fontWeight: 600,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}>
                                            ✓ Saved
                                        </span>
                                    )}
                                </div>
                                
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="password"
                                        value={apiKey}
                                        onChange={e => handleChange(e.target.value)}
                                        placeholder="Enter your CloudHealth API Token"
                                        style={{
                                            width: '100%',
                                            boxSizing: 'border-box',
                                            background: 'var(--bg-card)',
                                            border: `1px solid ${apiError ? 'var(--danger)' : 'var(--border)'}`,
                                            borderRadius: '8px',
                                            padding: '12px 14px',
                                            color: 'var(--text-main)',
                                            fontSize: '0.95rem',
                                            transition: 'all 0.2s',
                                            outline: 'none',
                                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
                                        }}
                                        onFocus={e => {
                                            if (!apiError) {
                                                e.target.style.borderColor = 'var(--primary)';
                                                e.target.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.15), inset 0 2px 4px rgba(0,0,0,0.05)';
                                            }
                                        }}
                                        onBlur={e => {
                                            e.target.style.borderColor = apiError ? 'var(--danger)' : 'var(--border)';
                                            e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.05)';
                                        }}
                                    />
                                    {apiError && (
                                        <div style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span>⚠️</span> {apiError}
                                        </div>
                                    )}
                                </div>
                                
                                <div style={{ marginTop: '16px', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <p style={{ margin: 0, lineHeight: 1.5 }}>
                                        Your key is securely stored locally and used to communicate with your CloudHealth Partner tenant.
                                    </p>
                                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                        <button
                                            onClick={() => openUrl('https://apps.cloudhealthtech.com/profile').catch(() => {})}
                                            style={{
                                                background: 'none', border: 'none', padding: 0,
                                                cursor: 'pointer', color: '#38bdf8', fontSize: '0.8rem',
                                                transition: 'color 0.2s', display: 'flex', alignItems: 'center', gap: '4px'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.color = '#7dd3fc'}
                                            onMouseLeave={e => e.currentTarget.style.color = '#38bdf8'}
                                        >
                                            User Profile → API Keys ↗
                                        </button>
                                        <button
                                            onClick={() => openUrl('https://apidocs.cloudhealthtech.com/#documentation_getting-your-api-key').catch(() => {})}
                                            style={{
                                                background: 'none', border: 'none', padding: 0,
                                                cursor: 'pointer', color: '#38bdf8', fontSize: '0.8rem',
                                                transition: 'color 0.2s', display: 'flex', alignItems: 'center', gap: '4px'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.color = '#7dd3fc'}
                                            onMouseLeave={e => e.currentTarget.style.color = '#38bdf8'}
                                        >
                                            API Documentation ↗
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Updates Card */}
                            {onCheckUpdates && (
                                <div style={{
                                    background: 'var(--bg-deep)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '12px',
                                    padding: '20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '16px',
                                    flexWrap: 'wrap'
                                }}>
                                    <div style={{ flex: '1 1 min-content' }}>
                                        <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <FaCloudDownloadAlt style={{ color: '#8b5cf6', fontSize: '1.1rem' }} /> Software Updates
                                        </h3>
                                        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                            Check GitHub for the latest version of Pricebook Studio.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (onCheckUpdates) onCheckUpdates();
                                            onClose();
                                        }}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            padding: '8px 16px', borderRadius: '8px',
                                            background: 'rgba(139, 92, 246, 0.1)', color: '#c4b5fd',
                                            border: '1px solid rgba(139, 92, 246, 0.3)',
                                            cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                                            transition: 'all 0.2s', whiteSpace: 'nowrap'
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)';
                                            e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)';
                                            e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                        }}
                                    >
                                        Check Now
                                    </button>
                                </div>
                            )}
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
