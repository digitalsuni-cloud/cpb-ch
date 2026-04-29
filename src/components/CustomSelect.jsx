import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

/**
 * CustomSelect — A styled dropdown that matches the glow theme.
 *
 * Props:
 *   name      — field name (used in onChange synthetic event)
 *   value     — current value string
 *   onChange  — handler: (e) => void, where e.target = { name, value }
 *   options   — [{ value: string, label: string, disabled?: bool }, ...]
 *   disabled  — disable the whole control
 *   style     — optional extra styles on the trigger
 */

const CustomSelect = ({ name, value, onChange, options = [], disabled = false, style = {} }) => {
    const [open, setOpen] = useState(false);
    const [dropPos, setDropPos] = useState({ top: undefined, bottom: undefined, left: 0, width: 0 });


    const triggerRef = useRef(null);
    const dropRef    = useRef(null);

    const selected = options.find(o => o.value === value) || options[0];

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (!triggerRef.current?.contains(e.target) && !dropRef.current?.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const openDropdown = useCallback(() => {
        if (disabled) return;
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const MAX_DROP_HEIGHT = 268;           // maxHeight(260) + padding(6*2) + border(2)
        const spaceBelow = window.innerHeight - rect.bottom - 8;
        const spaceAbove = rect.top - 8;
        const placeBelow = spaceBelow >= MAX_DROP_HEIGHT || spaceBelow >= spaceAbove;
        
        const pos = { left: rect.left, width: rect.width, top: undefined, bottom: undefined };
        if (placeBelow) {
            pos.top = rect.bottom + 4;
        } else {
            pos.bottom = window.innerHeight - rect.top + 4;
        }
        setDropPos(pos);
        setOpen(o => !o);
    }, [options.length, disabled]);


    const select = (opt) => {
        onChange({ target: { name, value: opt.value } });
        setOpen(false);
    };

    // ── Trigger ──────────────────────────────────────────────────────────────
    const triggerStyle = {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        height: '36px',
        padding: '0 8px 0 12px',
        fontSize: '0.9rem',
        fontFamily: 'Inter, monospace',
        boxSizing: 'border-box',
        backgroundColor: 'var(--input-bg)',
        backgroundImage: 'linear-gradient(90deg, transparent, var(--border-glow), transparent)',
        backgroundSize: '100% 1px',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'top',
        border: `1px solid ${open ? 'var(--primary)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-md)',
        color: 'var(--text-main)',
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: open ? '0 0 0 4px rgba(79, 70, 229, 0.1)' : 'none',
        userSelect: 'none',
        gap: '8px',
        ...style
    };

    // ── Dropdown popup ────────────────────────────────────────────────────────
    const dropStyle = {
        position: 'fixed',
        ...(dropPos.top !== undefined ? { top: dropPos.top } : {}),
        ...(dropPos.bottom !== undefined ? { bottom: dropPos.bottom } : {}),
        left: dropPos.left,
        width: Math.max(dropPos.width, 120),
        zIndex: 99999,
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 16px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.1)',
        padding: '6px',
        maxHeight: '260px',
        overflowY: 'auto',
        overflowX: 'hidden',
        /* custom scrollbar */
        scrollbarWidth: 'thin',
        scrollbarColor: 'var(--border) transparent',
    };


    return (
        <>
            {/* ── Trigger ── */}
            <div ref={triggerRef} style={triggerStyle} onClick={openDropdown}>
                <span style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {selected?.label ?? value}
                </span>

                {/* Chevron — rotates when open */}
                <svg
                    width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="var(--text-muted)" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round"
                    style={{
                        flexShrink: 0,
                        transition: 'transform 0.2s',
                        transform: open ? 'rotate(180deg)' : 'rotate(0deg)'
                    }}
                >
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </div>

            {/* ── Dropdown via portal ── */}
            {open && createPortal(
                <div ref={dropRef} style={dropStyle}>
                    {options.map((opt) => {
                        const isSelected = opt.value === value;
                        return (
                            <div
                                key={opt.value}
                                onClick={() => select(opt)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '9px 12px',
                                    borderRadius: 'calc(var(--radius-md) - 2px)',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    fontFamily: 'Inter, monospace',
                                    fontWeight: isSelected ? 600 : 400,
                                    color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                                    background: isSelected ? 'rgba(99,102,241,0.1)' : 'transparent',
                                    transition: 'all 0.12s',
                                    userSelect: 'none',
                                }}
                                onMouseEnter={e => {
                                    if (!isSelected) {
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                                        e.currentTarget.style.color = 'var(--text-main)';
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (!isSelected) {
                                        e.currentTarget.style.background = 'transparent';
                                    }
                                }}
                            >
                                {/* Checkmark for selected */}
                                <svg
                                    width="13" height="13" viewBox="0 0 24 24" fill="none"
                                    stroke={isSelected ? 'var(--primary)' : 'transparent'}
                                    strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                                    style={{ flexShrink: 0 }}
                                >
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                {opt.label}
                            </div>
                        );
                    })}
                </div>,
                document.body
            )}
        </>
    );
};

export default CustomSelect;
