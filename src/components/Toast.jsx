import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimesCircle, FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaTimes, FaCog } from 'react-icons/fa';

const ICONS = {
    error: <FaTimesCircle size={16} />,
    success: <FaCheckCircle size={16} />,
    warning: <FaExclamationTriangle size={16} />,
    info: <FaInfoCircle size={16} />,
};

const COLORS = {
    error: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.45)', text: '#f87171' },
    success: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.45)', text: '#34d399' },
    warning: { bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.45)', text: '#fbbf24' },
    info: { bg: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.45)', text: '#38bdf8' },
};

export default function Toast({ toasts, removeToast }) {
    return createPortal(
        <div style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            maxWidth: '420px',
            width: '100%',
            pointerEvents: 'none'
        }}>
            <AnimatePresence>
                {toasts.map(toast => (
                    <ToastItem key={toast.id} toast={toast} removeToast={removeToast} />
                ))}
            </AnimatePresence>
        </div>,
        document.body
    );
}

function ToastItem({ toast, removeToast }) {
    const c = COLORS[toast.type] || COLORS.info;

    useEffect(() => {
        if (toast.duration === 0) return; // sticky toast
        const timer = setTimeout(() => removeToast(toast.id), toast.duration || 6000);
        return () => clearTimeout(timer);
    }, [toast.id, toast.duration, removeToast]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{
                background: c.bg,
                border: `1px solid ${c.border}`,
                borderRadius: '12px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(12px)',
                pointerEvents: 'all'
            }}
        >
            {/* Icon */}
            <span style={{ color: c.text, marginTop: '2px', flexShrink: 0 }}>
                {ICONS[toast.type]}
            </span>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
                {toast.title && (
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: c.text, marginBottom: '3px' }}>
                        {toast.title}
                    </div>
                )}
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.45', wordBreak: 'break-word' }}>
                    {toast.message}
                </div>
                {toast.action && (
                    <button
                        onClick={toast.action.onClick}
                        style={{ marginTop: '8px', background: 'none', border: `1px solid ${c.border}`, color: c.text, borderRadius: '6px', padding: '4px 10px', fontSize: '0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                    >
                        {toast.action.icon || <FaCog size={10} />} {toast.action.label}
                    </button>
                )}
            </div>

            {/* Close */}
            <button
                onClick={() => removeToast(toast.id)}
                style={{ background: 'none', border: 'none', color: c.text, cursor: 'pointer', padding: '2px', opacity: 0.7, flexShrink: 0, display: 'flex' }}
            >
                <FaTimes size={12} />
            </button>
        </motion.div>
    );
}
