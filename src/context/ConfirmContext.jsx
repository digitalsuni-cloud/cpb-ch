import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaExclamationTriangle, FaInfoCircle, FaCheckCircle, FaTimes } from 'react-icons/fa';

const ConfirmContext = createContext();

export const useConfirm = () => {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error('useConfirm must be used within a ConfirmProvider');
    }
    return context.confirm;
};

export const ConfirmProvider = ({ children }) => {
    const [state, setState] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'confirm', // 'confirm' or 'alert'
        variant: 'warning', // 'warning', 'danger', 'info', 'success'
        resolve: null,
        tertiaryLabel: undefined,
    });

    const confirm = useCallback((options) => {
        const {
            title = 'Are you sure?',
            message = '',
            type = 'confirm',
            variant = 'warning',
            confirmLabel = 'Confirm',
            cancelLabel = 'Cancel',
            tertiaryLabel = undefined
        } = typeof options === 'string' ? { message: options } : options;

        return new Promise((resolve) => {
            setState({
                isOpen: true,
                title,
                message,
                type,
                variant,
                confirmLabel,
                cancelLabel,
                tertiaryLabel,
                resolve
            });
        });
    }, []);

    const handleClose = useCallback((value) => {
        if (state.resolve) {
            state.resolve(value);
        }
        setState(prev => ({ ...prev, isOpen: false, resolve: null }));
    }, [state.resolve]);

    const getIcon = () => {
        switch (state.variant) {
            case 'danger': return <FaExclamationTriangle size={24} color="#ef4444" />;
            case 'success': return <FaCheckCircle size={24} color="#10b981" />;
            case 'info': return <FaInfoCircle size={24} color="#3b82f6" />;
            default: return <FaExclamationTriangle size={24} color="#f59e0b" />;
        }
    };

    const getVariantColors = () => {
        switch (state.variant) {
            case 'danger': return { primary: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
            case 'success': return { primary: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };
            case 'info': return { primary: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' };
            default: return { primary: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
        }
    };

    const colors = getVariantColors();

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}
            <AnimatePresence>
                {state.isOpen && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 100000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px',
                        pointerEvents: 'all'
                    }}>
                        {/* Overlay */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => state.type === 'confirm' ? null : handleClose(true)}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: 'rgba(0, 0, 0, 0.75)',
                                backdropFilter: 'blur(8px)'
                            }}
                        />

                        {/* Dialog Card */}
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 10 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            style={{
                                position: 'relative',
                                background: 'var(--bg-card)',
                                border: `1px solid var(--border)`,
                                borderRadius: '20px',
                                width: '100%',
                                maxWidth: '420px',
                                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                        >
                            <div style={{
                                padding: '24px 52px 24px 24px',
                                display: 'flex',
                                gap: '16px',
                                alignItems: 'flex-start'
                            }}>
                                <div style={{
                                    padding: '12px',
                                    borderRadius: '12px',
                                    background: colors.bg,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    {getIcon()}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{
                                        margin: '0 0 8px 0',
                                        fontSize: '1.2rem',
                                        fontWeight: 700,
                                        color: 'var(--text-main)'
                                    }}>
                                        {state.title}
                                    </h3>
                                    <p style={{
                                        margin: 0,
                                        fontSize: '0.95rem',
                                        lineHeight: 1.5,
                                        color: 'var(--text-secondary)'
                                    }}>
                                        {state.message}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleClose(false)}
                                    style={{ position: 'absolute', top: '20px', right: '20px', width: '28px', height: '28px', borderRadius: '7px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', transition: 'all 0.18s', flexShrink: 0, zIndex: 2 }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)'; e.currentTarget.style.color = '#ef4444'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                                    aria-label="Close"
                                >✕</button>
                            </div>

                            <div style={{
                                padding: '16px 24px 24px 24px',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '12px',
                                background: 'var(--bg-subtle)'
                            }}>
                                {state.type === 'confirm' && (
                                    <button
                                        onClick={() => handleClose(false)}
                                        style={{
                                            padding: '10px 20px',
                                            borderRadius: '10px',
                                            border: '1px solid var(--border)',
                                            background: 'transparent',
                                            color: 'var(--text-main)',
                                            fontSize: '0.9rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
                                        onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                    >
                                        {state.cancelLabel}
                                    </button>
                                )}
                                {state.tertiaryLabel && (
                                    <button
                                        onClick={() => handleClose('tertiary')}
                                        style={{
                                            padding: '10px 20px',
                                            borderRadius: '10px',
                                            border: '1px solid var(--primary)',
                                            background: 'transparent',
                                            color: 'var(--primary)',
                                            fontSize: '0.9rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => { e.target.style.background = 'var(--primary)'; e.target.style.color = 'white'; }}
                                        onMouseLeave={(e) => { e.target.style.background = 'transparent'; e.target.style.color = 'var(--primary)'; }}
                                    >
                                        {state.tertiaryLabel}
                                    </button>
                                )}
                                <button
                                    onClick={() => handleClose(true)}
                                    style={{
                                        padding: '10px 24px',
                                        borderRadius: '10px',
                                        border: 'none',
                                        background: state.variant === 'danger' ? '#ef4444' : 'var(--primary)',
                                        color: 'white',
                                        fontSize: '0.9rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        boxShadow: `0 4px 12px ${state.variant === 'danger' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(139, 92, 246, 0.3)'}`
                                    }}
                                    onMouseEnter={(e) => e.target.style.transform = 'translateY(-1px)'}
                                    onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                                >
                                    {state.type === 'alert' ? 'OK' : state.confirmLabel}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </ConfirmContext.Provider>
    );
};
