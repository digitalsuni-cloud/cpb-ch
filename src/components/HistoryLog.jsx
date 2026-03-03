import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getHistoryOptions, clearHistory } from '../utils/history/historyLogger';
import { FaTrash, FaHistory, FaCheckCircle, FaExclamationCircle, FaTimes, FaExpandAlt, FaCompressAlt, FaSearch, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { createPortal } from 'react-dom';

// ─── Diff Viewer with line-level highlighting ──────────────────────────────────
const DiffViewer = ({ before, after, title, onClose }) => {
    const [expanded, setExpanded] = useState(false);

    // Compute per-line diff for highlighting
    const computeDiff = (a, b) => {
        if (!a && !b) return { left: [], right: [] };
        const leftLines = (a || '').split('\n');
        const rightLines = (b || '').split('\n');

        // Trim lines for comparison to avoid highlighting indentation-only changes
        const leftSet = new Set(leftLines.map(l => l.trim()));
        const rightSet = new Set(rightLines.map(l => l.trim()));

        const left = leftLines.map(line => ({
            text: line,
            changed: !rightSet.has(line.trim())
        }));
        const right = rightLines.map(line => ({
            text: line,
            changed: !leftSet.has(line.trim())
        }));
        return { left, right };
    };

    const { left, right } = computeDiff(before, after);

    const renderLines = (lines, side) => (
        <div style={{ flexGrow: 1, overflow: 'auto', padding: '0', background: 'var(--bg-code)', fontFamily: 'monospace', fontSize: '0.82rem', lineHeight: '1.6' }}>
            {lines.map((l, i) => (
                <div
                    key={i}
                    style={{
                        padding: '0 16px',
                        background: l.changed
                            ? (side === 'left' ? 'rgba(239,68,68,0.18)' : 'rgba(16,185,129,0.18)')
                            : 'transparent',
                        borderLeft: l.changed
                            ? (side === 'left' ? '3px solid rgba(239,68,68,0.7)' : '3px solid rgba(16,185,129,0.7)')
                            : '3px solid transparent',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        color: l.changed ? (side === 'left' ? '#fca5a5' : '#6ee7b7') : 'var(--text-secondary)'
                    }}
                >
                    {l.text || '\u00a0'}
                </div>
            ))}
        </div>
    );

    return createPortal(
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)',
            zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: expanded ? '2vh 2vw' : '4vh 24px'
        }}>
            <motion.div
                initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
                style={{
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: '16px', width: '100%', maxWidth: expanded ? '100%' : '1200px',
                    height: expanded ? '100%' : '85vh',
                    display: 'flex', flexDirection: 'column', overflow: 'hidden',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)'
                }}
            >
                {/* Header */}
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-deep)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                    <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: 600 }}>{title}</h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => setExpanded(!expanded)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px 8px', borderRadius: '8px' }}>
                            {expanded ? <FaCompressAlt /> : <FaExpandAlt />}
                        </button>
                        <button onClick={onClose} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px 8px', borderRadius: '8px' }}>
                            <FaTimes />
                        </button>
                    </div>
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', gap: '16px', padding: '8px 16px', background: 'var(--bg-deep)', borderBottom: '1px solid var(--border)', fontSize: '0.78rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: 10, height: 10, background: 'rgba(239,68,68,0.5)', borderRadius: 2, display: 'inline-block' }} /> Removed / Changed</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: 10, height: 10, background: 'rgba(16,185,129,0.5)', borderRadius: 2, display: 'inline-block' }} /> Added / New</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: 10, height: 10, background: 'transparent', border: '1px solid var(--border)', borderRadius: 2, display: 'inline-block' }} /> Unchanged</span>
                </div>

                {/* Panes */}
                <div style={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
                    {before && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: after ? '1px solid var(--border)' : 'none', overflow: 'hidden' }}>
                            <div style={{ padding: '6px 16px', background: 'rgba(239, 68, 68, 0.12)', color: '#fca5a5', fontWeight: 600, borderBottom: '1px solid var(--border)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>
                                Before
                            </div>
                            {renderLines(left, 'left')}
                        </div>
                    )}
                    {after && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <div style={{ padding: '6px 16px', background: 'rgba(16, 185, 129, 0.12)', color: '#6ee7b7', fontWeight: 600, borderBottom: '1px solid var(--border)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>
                                {before ? 'After' : 'Current'}
                            </div>
                            {renderLines(right, 'right')}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>,
        document.body
    );
};

// ─── Change type badge colours ─────────────────────────────────────────────────
const TYPE_COLORS = {
    PRICEBOOK_CREATE: { bg: 'rgba(99,102,241,0.12)', color: '#a5b4fc', label: 'Create Pricebook' },
    PRICEBOOK_UPDATE: { bg: 'rgba(56,189,248,0.12)', color: '#7dd3fc', label: 'Update Pricebook' },
    PRICEBOOK_DELETE: { bg: 'rgba(239,68,68,0.12)', color: '#fca5a5', label: 'Delete Pricebook' },
    ASSIGNMENT_CREATE: { bg: 'rgba(16,185,129,0.12)', color: '#6ee7b7', label: 'Assignment Create' },
    ASSIGNMENT_UPDATE: { bg: 'rgba(56,189,248,0.12)', color: '#7dd3fc', label: 'Assignment Update' },
    ASSIGNMENT_DELETE: { bg: 'rgba(234,179,8,0.12)', color: '#fde68a', label: 'Assignment Delete' },
    CUSTOMER_UNASSIGN: { bg: 'rgba(234,179,8,0.12)', color: '#fde68a', label: 'Customer Unassign' },
};

// ─── Main Component ────────────────────────────────────────────────────────────
const HistoryLog = () => {
    const [history, setHistory] = useState([]);
    const [expandedItems, setExpandedItems] = useState(new Set());
    const [viewingDiff, setViewingDiff] = useState(null);
    // Per-column filter state
    const [colFilters, setColFilters] = useState({ status: '', date: '', type: '', desc: '' });
    const [openCol, setOpenCol] = useState(null); // which column's filter input is open
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    useEffect(() => {
        const loadHistory = () => setHistory(getHistoryOptions());
        loadHistory();
        window.addEventListener('historyUpdated', loadHistory);
        return () => window.removeEventListener('historyUpdated', loadHistory);
    }, []);

    const handleClear = () => {
        if (window.confirm('Are you sure you want to clear all history logs? This cannot be undone.')) {
            clearHistory();
            setHistory([]);
            setExpandedItems(new Set());
        }
    };

    const toggleExpand = (id) => {
        setExpandedItems(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const formatDate = (ts) => {
        const d = new Date(ts);
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const toggleColFilter = (col) => {
        setOpenCol(prev => {
            if (prev === col) {
                setColFilters(f => ({ ...f, [col]: '' }));
                return null;
            }
            return col;
        });
    };

    const setColFilter = (col, val) => {
        setColFilters(f => ({ ...f, [col]: val }));
        setCurrentPage(1); // reset to first page when filter changes
    };

    const hasAnyFilter = Object.values(colFilters).some(v => v.trim().length > 0);

    const filtered = history.filter(item => {
        const { status, date, type: typeF, desc } = colFilters;
        const typeLabel = (TYPE_COLORS[item.type]?.label || item.type).toLowerCase();
        if (status && !item.status.toLowerCase().includes(status.toLowerCase())) return false;
        if (date && !formatDate(item.timestamp).toLowerCase().includes(date.toLowerCase())) return false;
        if (typeF && !typeLabel.includes(typeF.toLowerCase())) return false;
        if (desc && !item.title.toLowerCase().includes(desc.toLowerCase()) && !(item.errorMessage && item.errorMessage.toLowerCase().includes(desc.toLowerCase()))) return false;
        return true;
    });

    const totalPages = Math.ceil(filtered.length / pageSize) || 1;
    const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    // ─── Render detail panel depending on action type ────────────────────────
    const renderDetail = (item) => {
        const isError = item.status === 'ERROR';
        const d = item.details || {};

        return (
            <div style={{ padding: '16px 24px', borderLeft: '4px solid var(--primary)', background: 'rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', gap: '12px' }}>

                {isError && (
                    <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.4)', fontSize: '0.88rem' }}>
                        <strong>Error Detail:</strong> {item.errorMessage}
                    </div>
                )}

                {/* ── Pricebook Create / Update ── */}
                {(item.type === 'PRICEBOOK_CREATE' || item.type === 'PRICEBOOK_UPDATE') && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                            {item.type === 'PRICEBOOK_CREATE' ? 'Created' : 'Updated specification for'} <strong>{d.bookName}</strong>&nbsp;(ID: {d.bookId})
                        </div>
                        {(d.beforeXml || d.afterXml) && (
                            <button onClick={() => setViewingDiff({
                                before: d.beforeXml,
                                after: d.afterXml,
                                title: item.type === 'PRICEBOOK_CREATE' ? `Pricebook Spec — ${d.bookName}` : `Spec Diff — ${d.bookName}`
                            })}
                                style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '6px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
                                {item.type === 'PRICEBOOK_CREATE' ? 'View Spec' : 'View Spec Diff'}
                            </button>
                        )}
                    </div>
                )}

                {/* ── Pricebook Delete ── */}
                {item.type === 'PRICEBOOK_DELETE' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                            Permanently deleted <strong>{d.bookName}</strong>&nbsp;(ID: {d.bookId}) from tenant.
                        </div>
                        {d.beforeXml && (
                            <button onClick={() => setViewingDiff({ before: d.beforeXml, after: null, title: `Deleted Spec — ${d.bookName}` })}
                                style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '6px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
                                View Deleted Spec
                            </button>
                        )}
                    </div>
                )}

                {/* ── Assignment Create / Update ── */}
                {(item.type === 'ASSIGNMENT_CREATE' || item.type === 'ASSIGNMENT_UPDATE') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                        <div>Linked <strong>{d.bookName}</strong> to <strong>{d.customerName}</strong></div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: '20px', rowGap: '6px', alignItems: 'center', background: 'var(--bg-card)', borderRadius: '8px', padding: '10px 14px', border: '1px solid var(--border)' }}>
                            <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Assignment ID</span>
                            <span style={{ fontWeight: 600 }}>{d.assignmentId || '—'}</span>
                            <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Assigned Payer Account ID</span>
                            <span>
                                <span style={{ color: 'var(--danger)', textDecoration: 'line-through', marginRight: '8px' }}>
                                    {Array.isArray(d.beforeAssignment) ? d.beforeAssignment.join(', ') : d.beforeAssignment || 'None'}
                                </span>
                                <span style={{ color: 'var(--text-muted)', marginRight: '8px' }}>→</span>
                                <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                                    {Array.isArray(d.afterAssignment) ? d.afterAssignment.join(', ') : d.afterAssignment || d.payerAccountId || 'None'}
                                </span>
                            </span>
                        </div>
                    </div>
                )}

                {/* ── Assignment Delete ── */}
                {item.type === 'ASSIGNMENT_DELETE' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                        <div>Removed assignment for <strong>{d.customerName}</strong> from pricebook <strong>{d.bookName}</strong></div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: '20px', rowGap: '6px', alignItems: 'center', background: 'var(--bg-card)', borderRadius: '8px', padding: '10px 14px', border: '1px solid var(--border)' }}>
                            <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Assignment ID</span>
                            <span style={{ fontWeight: 600 }}>{d.assignmentId || '—'}</span>
                            <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Assigned Payer Account ID</span>
                            <span style={{ fontWeight: 600 }}>{d.payerAccountId || '—'}</span>
                        </div>
                    </div>
                )}

                {/* ── Customer Unassign ── */}
                {item.type === 'CUSTOMER_UNASSIGN' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                        <div>Removed link between <strong>{d.bookName}</strong> and <strong>{d.customerName}</strong></div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: '20px', rowGap: '6px', alignItems: 'center', background: 'var(--bg-card)', borderRadius: '8px', padding: '10px 14px', border: '1px solid var(--border)' }}>
                            <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Assignment ID</span>
                            <span style={{ fontWeight: 600 }}>{d.assignmentId || '—'}</span>
                            <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Assigned Payer Account ID</span>
                            <span style={{ fontWeight: 600 }}>{d.payerAccountId || '—'}</span>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    if (history.length === 0) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '12px', border: '1px dashed var(--border)', color: 'var(--text-muted)' }}>
                <FaHistory size={32} style={{ marginBottom: '16px', opacity: 0.5 }} />
                <h3>No History Available</h3>
                <p style={{ fontSize: '0.9rem', maxWidth: '300px', margin: '0 auto' }}>
                    Modifications, updates, and deletions applied to the CloudHealth tenant will appear here.
                </p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0' }}>
            {/* Scrollable Content Area */}
            <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', padding: '0' }}>

                {/* Section header — matches "Pricing Execution Summary" style */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', margin: '0 16px', paddingTop: '16px' }}>
                    <div>
                        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>
                            <FaHistory color="var(--primary)" />
                            Action History
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 400 }}>({filtered.length} of {history.length})</span>
                        </h2>
                        <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '680px', lineHeight: '1.55' }}>
                            This log only tracks changes made <strong style={{ color: 'var(--text-secondary)' }}>through this app</strong> and on this PC only. It includes pricebook creates, updates, and deletes; customer assignments and unassignments; and payer account mappings. Changes made directly via the CloudHealth portal or API will not appear here.
                        </p>
                    </div>
                    <button
                        onClick={handleClear}
                        style={{ flexShrink: 0, background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '8px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                    >
                        <FaTrash size={12} /> Clear Log
                    </button>
                </div>

                {/* Table Container */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', margin: '0 16px' }}>
                    <div className="card" style={{ padding: '0', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', marginBottom: '0' }}>
                        <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                                <thead>
                                    <tr style={{ background: 'var(--bg-deep)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 10 }}>
                                        {/* Status column */}
                                        <th style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--text-secondary)', width: '110px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span>Status</span>
                                                <button onClick={() => toggleColFilter('status')} title="Filter by status"
                                                    style={{ background: colFilters.status ? 'rgba(139,92,246,0.2)' : 'none', border: colFilters.status ? '1px solid rgba(139,92,246,0.5)' : '1px solid transparent', color: colFilters.status ? '#a78bfa' : 'var(--text-muted)', cursor: 'pointer', padding: '2px 5px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}>
                                                    <FaSearch size={10} />
                                                </button>
                                            </div>
                                            {openCol === 'status' && (
                                                <input autoFocus type="text" placeholder="SUCCESS / ERROR" value={colFilters.status}
                                                    onChange={e => setColFilter('status', e.target.value)}
                                                    style={{ marginTop: '4px', width: '100%', boxSizing: 'border-box', padding: '4px 8px', fontSize: '0.78rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-deep)', color: 'var(--text-main)', outline: 'none' }} />
                                            )}
                                        </th>

                                        {/* Date/Time column */}
                                        <th style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--text-secondary)', width: '175px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span>Date / Time</span>
                                                <button onClick={() => toggleColFilter('date')} title="Filter by date"
                                                    style={{ background: colFilters.date ? 'rgba(139,92,246,0.2)' : 'none', border: colFilters.date ? '1px solid rgba(139,92,246,0.5)' : '1px solid transparent', color: colFilters.date ? '#a78bfa' : 'var(--text-muted)', cursor: 'pointer', padding: '2px 5px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}>
                                                    <FaSearch size={10} />
                                                </button>
                                            </div>
                                            {openCol === 'date' && (
                                                <input autoFocus type="text" placeholder="e.g. 3/1/2026" value={colFilters.date}
                                                    onChange={e => setColFilter('date', e.target.value)}
                                                    style={{ marginTop: '4px', width: '100%', boxSizing: 'border-box', padding: '4px 8px', fontSize: '0.78rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-deep)', color: 'var(--text-main)', outline: 'none' }} />
                                            )}
                                        </th>

                                        {/* Change Type column */}
                                        <th style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--text-secondary)', width: '170px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span>Change Type</span>
                                                <button onClick={() => toggleColFilter('type')} title="Filter by change type"
                                                    style={{ background: colFilters.type ? 'rgba(139,92,246,0.2)' : 'none', border: colFilters.type ? '1px solid rgba(139,92,246,0.5)' : '1px solid transparent', color: colFilters.type ? '#a78bfa' : 'var(--text-muted)', cursor: 'pointer', padding: '2px 5px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}>
                                                    <FaSearch size={10} />
                                                </button>
                                            </div>
                                            {openCol === 'type' && (
                                                <input autoFocus type="text" placeholder="e.g. Create, Update" value={colFilters.type}
                                                    onChange={e => setColFilter('type', e.target.value)}
                                                    style={{ marginTop: '4px', width: '100%', boxSizing: 'border-box', padding: '4px 8px', fontSize: '0.78rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-deep)', color: 'var(--text-main)', outline: 'none' }} />
                                            )}
                                        </th>

                                        {/* Description column */}
                                        <th style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span>Description</span>
                                                <button onClick={() => toggleColFilter('desc')} title="Filter by description"
                                                    style={{ background: colFilters.desc ? 'rgba(139,92,246,0.2)' : 'none', border: colFilters.desc ? '1px solid rgba(139,92,246,0.5)' : '1px solid transparent', color: colFilters.desc ? '#a78bfa' : 'var(--text-muted)', cursor: 'pointer', padding: '2px 5px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}>
                                                    <FaSearch size={10} />
                                                </button>
                                            </div>
                                            {openCol === 'desc' && (
                                                <input autoFocus type="text" placeholder="Search description..." value={colFilters.desc}
                                                    onChange={e => setColFilter('desc', e.target.value)}
                                                    style={{ marginTop: '4px', width: '100%', boxSizing: 'border-box', padding: '4px 8px', fontSize: '0.78rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-deep)', color: 'var(--text-main)', outline: 'none' }} />
                                            )}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <AnimatePresence>
                                        {paginated.map(item => {
                                            const isExpanded = expandedItems.has(item.id);
                                            const isError = item.status === 'ERROR';
                                            const typeConf = TYPE_COLORS[item.type] || { bg: 'rgba(100,100,100,0.1)', color: 'var(--text-muted)', label: item.type };

                                            return (
                                                <React.Fragment key={item.id}>
                                                    <motion.tr
                                                        onClick={() => toggleExpand(item.id)}
                                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                                        style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', background: isExpanded ? 'var(--bg-deep)' : 'transparent', transition: 'background 0.15s' }}
                                                    >
                                                        {/* Status */}
                                                        <td style={{ padding: '12px 16px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <span style={{ color: isError ? 'var(--danger)' : 'var(--success)', fontSize: '1rem', flexShrink: 0 }}>
                                                                    {isError ? <FaExclamationCircle /> : <FaCheckCircle />}
                                                                </span>
                                                                <span style={{ fontSize: '0.72rem', padding: '2px 7px', borderRadius: '10px', background: isError ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: isError ? 'var(--danger)' : 'var(--success)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                                                    {item.status}
                                                                </span>
                                                            </div>
                                                        </td>

                                                        {/* Date/Time */}
                                                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                                                            {formatDate(item.timestamp)}
                                                        </td>

                                                        {/* Change Type badge */}
                                                        <td style={{ padding: '12px 16px' }}>
                                                            <span style={{ padding: '3px 10px', borderRadius: '10px', background: typeConf.bg, color: typeConf.color, fontWeight: 600, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                                                                {typeConf.label}
                                                            </span>
                                                        </td>

                                                        {/* Description — title only, no type repetition */}
                                                        <td style={{ padding: '12px 16px', width: '100%' }}>
                                                            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                                                                {item.title}
                                                            </span>
                                                        </td>
                                                    </motion.tr>

                                                    {/* Expanded detail row */}
                                                    {isExpanded && (
                                                        <tr style={{ background: 'var(--bg-card)' }}>
                                                            <td colSpan="4" style={{ padding: 0, borderBottom: '2px solid var(--primary)' }}>
                                                                <motion.div
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: 'auto', opacity: 1 }}
                                                                    style={{ overflow: 'hidden' }}
                                                                >
                                                                    {renderDetail(item)}
                                                                </motion.div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </AnimatePresence>
                                    {filtered.length === 0 && (
                                        <tr>
                                            <td colSpan="4" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                No history entries match your filter.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Fixed Pagination Bar at Bottom */}
            {filtered.length > 0 && (
                <div style={{
                    flex: '0 0 auto',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--bg-deep)',
                    padding: '24px 24px 8px 24px',
                    borderTop: '1px solid var(--border)',
                    marginTop: '38px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)', fontSize: '0.9rem', flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
                        <span>Rows per page:</span>
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            style={{ padding: '6px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none' }}
                        >
                            {[10, 20, 30, 40, 50].map(size => (
                                <option key={size} value={size}>{size}</option>
                            ))}
                        </select>
                        <span style={{ marginLeft: '12px' }}>
                            Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} records
                        </span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: currentPage === 1 ? 'var(--bg-deep)' : 'var(--bg-card)', color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-main)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            <FaChevronLeft /> Prev
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>
                            Page {currentPage} of {totalPages}
                        </div>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: currentPage === totalPages ? 'var(--bg-deep)' : 'var(--bg-card)', color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-main)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            Next <FaChevronRight />
                        </button>
                    </div>
                </div>
            )}

            {/* Diff Modal */}
            {viewingDiff && (
                <DiffViewer
                    before={viewingDiff.before}
                    after={viewingDiff.after}
                    title={viewingDiff.title}
                    onClose={() => setViewingDiff(null)}
                />
            )}
        </div>
    );
};

export default HistoryLog;
