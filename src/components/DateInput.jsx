import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];
const DAY_NAMES = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

/** Parse YYYY-MM-DD safely without timezone shift */
const parseISO = (iso) => {
    if (!iso) return null;
    const [y, m, d] = iso.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
};

/** Format Date → DD/MM/YYYY */
const formatDisplay = (iso) => {
    const d = parseISO(iso);
    if (!d) return null;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

/** Format Date → YYYY-MM-DD */
const toISO = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const isSameDay = (a, b) =>
    a && b && a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

/**
 * DateInput — Custom date picker with beautiful glow-themed calendar popup.
 *
 * - No native date picker UI (fixes the ugly stock calendar in Tauri)
 * - Shows DD/MM/YYYY display format, stores YYYY-MM-DD value (same as <input type="date">)
 * - Shows placeholder ('dd/mm/yyyy') when empty instead of defaulting to today
 * - Height matches the main CSS input/select exactly (same padding + font-size)
 * - Styled entirely with existing --css-variables from main index.css
 */
const DateInput = ({ name, value, onChange, placeholder = 'dd/mm/yyyy' }) => {
    const [open, setOpen] = useState(false);
    const [viewYear, setViewYear] = useState(() => (parseISO(value) || new Date()).getFullYear());
    const [viewMonth, setViewMonth] = useState(() => (parseISO(value) || new Date()).getMonth());
    const [calPos, setCalPos] = useState({ top: 0, left: 0 });

    const triggerRef = useRef(null);
    const calRef = useRef(null);

    const selectedDate = parseISO(value);
    const today = new Date(); today.setHours(0, 0, 0, 0);

    // Sync view when value changes externally
    useEffect(() => {
        const d = parseISO(value);
        if (d) { setViewYear(d.getFullYear()); setViewMonth(d.getMonth()); }
    }, [value]);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (!triggerRef.current?.contains(e.target) && !calRef.current?.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const openCalendar = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const calWidth = 272;
        let left = rect.left;
        if (left + calWidth > window.innerWidth - 8) left = window.innerWidth - calWidth - 8;
        setCalPos({ top: rect.bottom + 6, left });
        if (!open) {
            const d = parseISO(value) || new Date();
            setViewYear(d.getFullYear());
            setViewMonth(d.getMonth());
        }
        setOpen(o => !o);
    }, [open, value]);

    const selectDate = (date) => {
        onChange({ target: { name, value: toISO(date) } });
        setOpen(false);
    };

    const clear = (e) => {
        e.stopPropagation();
        onChange({ target: { name, value: '' } });
    };

    const prevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
    };

    // Build 6-week grid (Mon-first)
    const buildGrid = () => {
        const first = new Date(viewYear, viewMonth, 1);
        let dow = first.getDay() - 1; // 0=Mon … 6=Sun
        if (dow < 0) dow = 6;
        const cells = [];
        for (let i = dow - 1; i >= 0; i--) cells.push({ d: new Date(viewYear, viewMonth, -i), other: true });
        const last = new Date(viewYear, viewMonth + 1, 0).getDate();
        for (let i = 1; i <= last; i++) cells.push({ d: new Date(viewYear, viewMonth, i), other: false });
        while (cells.length < 42) {
            cells.push({ d: new Date(viewYear, viewMonth + 1, cells.length - last - dow + 1), other: true });
        }
        return cells;
    };

    const displayed = formatDisplay(value);

    // ── Trigger button ────────────────────────────────────────────────────────
    // height:36px + padding-top/bottom:0 matches the new CSS rule on input/select exactly.
    const triggerStyle = {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        height: '36px',
        padding: '0 8px 0 12px',          // vertical padding removed — height is explicit
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
        color: displayed ? 'var(--text-main)' : 'var(--text-muted)',
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: open ? '0 0 0 4px rgba(79, 70, 229, 0.1)' : 'none',
        gap: '6px',
        userSelect: 'none',
    };


    // ── Calendar popup ────────────────────────────────────────────────────────
    const popupStyle = {
        position: 'fixed',
        top: calPos.top,
        left: calPos.left,
        zIndex: 99999,
        width: 272,
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.1)',
        padding: '16px',
        userSelect: 'none',
    };

    const cells = buildGrid();

    return (
        <>
            {/* ── Trigger ── */}
            <div ref={triggerRef} style={triggerStyle} onClick={openCalendar}>
                <span style={{
                    flex: 1,
                    opacity: displayed ? 1 : 0.45,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                }}>
                    {displayed || placeholder}
                </span>

                {/* Clear button */}
                {value && (
                    <button
                        type="button"
                        onClick={clear}
                        title="Clear"
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '0 2px',
                            fontSize: '11px',
                            lineHeight: 1,
                            display: 'flex',
                            alignItems: 'center',
                            borderRadius: '50%',
                            flexShrink: 0,
                            transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                        ✕
                    </button>
                )}

                {/* Calendar icon */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="var(--secondary)" strokeWidth="2" strokeLinecap="round"
                    strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.7 }}>
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
            </div>

            {/* ── Calendar popup via portal ── */}
            {open && createPortal(
                <div ref={calRef} style={popupStyle}>

                    {/* Month/Year header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <button onClick={prevMonth} style={navBtnStyle}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                        </button>

                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '0.02em' }}>
                            {MONTHS[viewMonth]} {viewYear}
                        </span>

                        <button onClick={nextMonth} style={navBtnStyle}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                        </button>
                    </div>

                    {/* Day-of-week headers */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '4px' }}>
                        {DAY_NAMES.map(d => (
                            <div key={d} style={{
                                textAlign: 'center',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                color: 'var(--text-muted)',
                                padding: '4px 0',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>{d}</div>
                        ))}
                    </div>

                    {/* Day grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                        {cells.map(({ d, other }, i) => {
                            const isSelected = isSameDay(d, selectedDate);
                            const isToday = isSameDay(d, today);
                            return (
                                <button
                                    key={i}
                                    onClick={() => selectDate(d)}
                                    style={{
                                        background: isSelected
                                            ? 'var(--primary)'
                                            : isToday ? 'rgba(99,102,241,0.12)' : 'transparent',
                                        border: isToday && !isSelected
                                            ? '1px solid rgba(99,102,241,0.4)'
                                            : '1px solid transparent',
                                        borderRadius: '6px',
                                        color: isSelected
                                            ? '#fff'
                                            : other ? 'var(--text-muted)' : 'var(--text-main)',
                                        opacity: other ? 0.4 : 1,
                                        fontSize: '0.8rem',
                                        fontWeight: isSelected || isToday ? 700 : 400,
                                        cursor: 'pointer',
                                        padding: '6px 2px',
                                        textAlign: 'center',
                                        transition: 'all 0.15s',
                                        lineHeight: 1,
                                    }}
                                    onMouseEnter={e => {
                                        if (!isSelected) {
                                            e.currentTarget.style.background = 'rgba(99,102,241,0.2)';
                                            e.currentTarget.style.color = 'var(--text-main)';
                                            e.currentTarget.style.opacity = '1';
                                        }
                                    }}
                                    onMouseLeave={e => {
                                        if (!isSelected) {
                                            e.currentTarget.style.background = isToday ? 'rgba(99,102,241,0.12)' : 'transparent';
                                            e.currentTarget.style.color = isSelected ? '#fff' : other ? 'var(--text-muted)' : 'var(--text-main)';
                                            e.currentTarget.style.opacity = other ? '0.4' : '1';
                                        }
                                    }}
                                >
                                    {d.getDate()}
                                </button>
                            );
                        })}
                    </div>

                    {/* Footer: Today button */}
                    <div style={{ marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '10px', display: 'flex', justifyContent: 'center' }}>
                        <button
                            onClick={() => selectDate(new Date())}
                            style={{
                                background: 'transparent',
                                border: '1px solid var(--border)',
                                borderRadius: '6px',
                                color: 'var(--secondary)',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                padding: '4px 14px',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                                letterSpacing: '0.02em'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--secondary)'; e.currentTarget.style.background = 'rgba(6,182,212,0.08)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent'; }}
                        >
                            Today
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

const navBtnStyle = {
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    padding: 0,
    transition: 'all 0.15s',
};

export default DateInput;
