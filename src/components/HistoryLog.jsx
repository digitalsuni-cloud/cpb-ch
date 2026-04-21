import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getHistoryOptions, clearHistory, setHistoryOptions, logAssignmentUpdate, logHistoryEvent } from '../utils/history/historyLogger';
import { useConfirm } from '../context/ConfirmContext';
import { FaTrash, FaHistory, FaCheckCircle, FaExclamationCircle, FaTimes, FaExpandAlt, FaCompressAlt, FaSearch, FaChevronLeft, FaChevronRight, FaFileExport, FaFileImport, FaUndo, FaSyncAlt, FaTimesCircle } from 'react-icons/fa';
import Tooltip from './Tooltip';
import { createPortal } from 'react-dom';
import { diffLines, diffChars } from 'diff';
import { createPriceBook, updatePriceBook, assignPriceBook } from '../utils/chApi';
import { getCredential } from "../utils/credentials";

// ─── Diff Viewer: LCS alignment + intra-line char diff + sync scroll ───────────
const DiffViewer = ({ before, after, title, onClose }) => {
    const [expanded, setExpanded] = useState(false);
    const leftRef = useRef(null);
    const rightRef = useRef(null);
    const syncing = useRef(false);

    const syncScroll = (src, dst) => () => {
        if (syncing.current) return;
        syncing.current = true;
        if (dst.current) {
            dst.current.scrollTop = src.current.scrollTop;
            dst.current.scrollLeft = src.current.scrollLeft;
        }
        requestAnimationFrame(() => { syncing.current = false; });
    };

    // LCS-aligned rows via diffLines
    const alignedRows = useMemo(() => {
        if (!before && !after) return [];

        // Normalize XML: strip trailing zeros after decimal in numeric attribute values
        // e.g.  billingAdjustment="0.0000009800"  →  billingAdjustment="0.00000098"
        //        billingAdjustment="2.0"           →  billingAdjustment="2"
        // Uses pure string regex (no parseFloat) to avoid scientific notation for very small numbers
        const normalizeXml = (xml) => (xml || '')
            .replace(/="(\d+\.\d*[1-9])0+"/g, (_, num) => `="${num}"`)  // strip trailing zeros after last significant digit
            .replace(/="(\d+)\.0+"/g, (_, num) => `="${num}"`);          // strip pure .0 / .00 decimals (e.g. 2.0 → 2)

        const changes = diffLines(normalizeXml(before), normalizeXml(after), { newlineIsToken: false });
        const rows = [];
        const rBuf = [], aBuf = [];
        const flush = () => {
            const len = Math.max(rBuf.length, aBuf.length);
            for (let i = 0; i < len; i++) {
                const l = rBuf[i] ?? null;
                const r = aBuf[i] ?? null;
                rows.push({ l, r, type: l !== null && r !== null ? 'changed' : l !== null ? 'removed' : 'added' });
            }
            rBuf.length = 0; aBuf.length = 0;
        };
        changes.forEach(part => {
            const partLines = part.value.replace(/\n$/, '').split('\n');
            if (part.removed) partLines.forEach(x => rBuf.push(x));
            else if (part.added) partLines.forEach(x => aBuf.push(x));
            else { flush(); partLines.forEach(x => rows.push({ l: x, r: x, type: 'equal' })); }
        });
        flush();
        return rows;
    }, [before, after]);

    // Intra-line char diffs for changed pairs
    const charDiffs = useMemo(() => alignedRows.map(row => {
        if (row.type !== 'changed') return null;
        const changes = diffChars(row.l ?? '', row.r ?? '');
        const left = [], right = [];
        changes.forEach(p => {
            if (p.removed) left.push({ text: p.value, hl: true });
            else if (p.added) right.push({ text: p.value, hl: true });
            else { left.push({ text: p.value, hl: false }); right.push({ text: p.value, hl: false }); }
        });
        return { left, right };
    }), [alignedRows]);

    let leftN = 0, rightN = 0;
    const lineNums = alignedRows.map(row => ({
        l: row.l !== null ? ++leftN : null,
        r: row.r !== null ? ++rightN : null,
    }));

    const changedCount = alignedRows.filter(r => r.type !== 'equal').length;

    const renderPane = (side) => {
        const isLeft = side === 'left';
        const ref = isLeft ? leftRef : rightRef;
        const onScroll = isLeft ? syncScroll(leftRef, rightRef) : syncScroll(rightRef, leftRef);
        return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: isLeft && after ? '1px solid var(--border)' : 'none' }}>
                <div className={isLeft ? 'diff-header-removed' : 'diff-header-added'}
                    style={{ padding: '8px 16px', fontWeight: 600, borderBottom: '1px solid var(--border)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', flexShrink: 0 }}>
                    {isLeft ? 'BEFORE' : (before ? 'AFTER' : 'CURRENT SPECIFICATION')}
                </div>
                <div ref={ref} onScroll={onScroll}
                    style={{ flexGrow: 1, overflow: 'auto', background: 'var(--bg-code)', fontFamily: '"JetBrains Mono", "Fira Code", monospace', fontSize: '0.8rem', lineHeight: '1.5' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
                        <tbody>
                            {alignedRows.map((row, i) => {
                                const line = isLeft ? row.l : row.r;
                                const isEmpty = line === null;
                                const { type } = row;
                                const cd = charDiffs[i];
                                const spans = cd ? (isLeft ? cd.left : cd.right) : null;
                                const lineNo = isLeft ? lineNums[i].l : lineNums[i].r;
                                let rowClass = '';
                                if (!isEmpty) {
                                    if (type === 'removed' && isLeft) rowClass = 'diff-row-removed';
                                    else if (type === 'added' && !isLeft) rowClass = 'diff-row-added';
                                    else if (type === 'changed') rowClass = isLeft ? 'diff-row-removed' : 'diff-row-added';
                                }
                                const textClass = rowClass === 'diff-row-removed' ? 'diff-text-removed' : rowClass === 'diff-row-added' ? 'diff-text-added' : '';
                                return (
                                    <tr key={i} className={rowClass} style={isEmpty ? { background: 'rgba(255,255,255,0.015)' } : {}}>
                                        <td style={{ width: '44px', minWidth: '44px', textAlign: 'right', padding: '0 10px 0 4px', color: 'rgba(255,255,255,0.2)', userSelect: 'none', borderRight: '1px solid rgba(255,255,255,0.05)', fontSize: '0.7rem', verticalAlign: 'top' }}>
                                            {isEmpty ? '' : lineNo}
                                        </td>
                                        <td style={{ width: '16px', minWidth: '16px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, verticalAlign: 'top', padding: '0 2px', userSelect: 'none', color: rowClass === 'diff-row-removed' ? '#f87171' : rowClass === 'diff-row-added' ? '#34d399' : 'transparent' }}>
                                            {isEmpty ? '' : rowClass === 'diff-row-removed' ? '\u2212' : rowClass === 'diff-row-added' ? '+' : ' '}
                                        </td>
                                        <td className={!spans ? textClass : ''}
                                            style={{ padding: '0 16px', whiteSpace: 'pre', color: !rowClass ? 'var(--text-secondary)' : 'inherit', verticalAlign: 'top' }}>
                                            {isEmpty ? '\u00a0' : (
                                                spans
                                                    ? <span>{spans.map((s, si) => (
                                                        <span key={si} style={s.hl ? {
                                                            background: isLeft ? 'rgba(239,68,68,0.45)' : 'rgba(16,185,129,0.45)',
                                                            outline: `1px solid ${isLeft ? 'rgba(239,68,68,0.7)' : 'rgba(16,185,129,0.7)'}`,
                                                            borderRadius: '2px', padding: '0 1px'
                                                        } : {}}>{s.text}</span>
                                                    ))}</span>
                                                    : (line || '\u00a0')
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: expanded ? '0' : '2vh 2vw' }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: expanded ? '0' : '12px', width: '100%', maxWidth: expanded ? '100%' : '1400px', height: expanded ? '100%' : '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.8)' }}
            >
                <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-deep)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                    <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1rem', fontWeight: 600, letterSpacing: '0.5px' }}>{title}</h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => setExpanded(!expanded)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
                            {expanded ? <FaCompressAlt /> : <FaExpandAlt />}
                        </button>
                        <button onClick={onClose} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
                            <FaTimes />
                        </button>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '24px', padding: '10px 20px', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-secondary)', flexShrink: 0, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: 12, height: 12, background: 'rgba(239,68,68,0.4)', border: '1px solid #ef4444', borderRadius: 2, display: 'inline-block' }} /> Removed</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: 12, height: 12, background: 'rgba(16,185,129,0.4)', border: '1px solid #10b981', borderRadius: 2, display: 'inline-block' }} /> Added</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: 12, height: 12, background: 'transparent', border: '1px solid var(--border)', borderRadius: 2, display: 'inline-block' }} /> Unchanged</span>
                    <span style={{ marginLeft: 'auto', fontWeight: 600, color: changedCount > 0 ? '#f59e0b' : 'var(--success)' }}>
                        {changedCount === 0 ? '\u2713 No differences' : `${changedCount} line${changedCount !== 1 ? 's' : ''} changed`}
                    </span>
                </div>
                <div style={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
                    {before && renderPane('left')}
                    {after && renderPane('right')}
                </div>
            </motion.div>
        </div>,
        document.body
    );
};

// ─── Change type badge colours ─────────────────────────────────────────────────
const TYPE_CONFIGS = {
    PRICEBOOK_CREATE: { className: 'history-tag-create', label: 'Create Pricebook' },
    PRICEBOOK_UPDATE: { className: 'history-tag-update', label: 'Update Pricebook' },
    PRICEBOOK_DELETE: { className: 'history-tag-delete', label: 'Delete Pricebook' },
    ASSIGNMENT_CREATE: { className: 'history-tag-assign', label: 'Assignment Create' },
    ASSIGNMENT_UPDATE: { className: 'history-tag-update', label: 'Assignment Update' },
    ASSIGNMENT_DELETE: { className: 'history-tag-unassign', label: 'Assignment Delete' },
    CUSTOMER_UNASSIGN: { className: 'history-tag-unassign', label: 'Customer Unassign' },
    DRY_RUN: { className: 'history-tag-dry', label: 'Dry Run' },
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
    const confirm = useConfirm();
    const fileInputRef = useRef(null);

    // Progress Overlay state
    const [actionProgress, setActionProgress] = useState({ active: false, title: '', status: '', logs: [], done: false, error: false });

    // ── Rollback handler ─────────────────────────────────────────────────────
    const handleRollback = async (item) => {
        const d = item.details || {};
        const apiKey = getCredential('ch_api_key');
        const proxyUrl = getCredential('ch_proxy_url') || '';

        if (!apiKey) {
            await confirm({
                title: 'API Key Required',
                message: 'No CloudHealth API key found. Please configure API access in Settings.',
                variant: 'danger', confirmLabel: 'OK', hideCancel: true
            });
            return;
        }

        // ── UPDATE rollback: push beforeXml back ──────────────────────────────
        if (item.type === 'PRICEBOOK_UPDATE') {
            if (!d.beforeXml) {
                await confirm({ title: 'Cannot Rollback', message: 'No previous specification was captured for this entry.', variant: 'danger', confirmLabel: 'OK', hideCancel: true });
                return;
            }
            const ok = await confirm({
                title: 'Rollback Pricebook Update',
                message: `This will revert "${d.bookName}" (ID: ${d.bookId}) to its specification BEFORE this update.\n\nThis action CANNOT be undone.`,
                variant: 'warning', confirmLabel: 'Yes, Rollback', cancelLabel: 'Cancel'
            });
            if (!ok) return;

            const bookName = d.bookName || 'Pricebook';
            setActionProgress({ active: true, title: `Rolling back "${bookName}"`, status: 'Initializing...', logs: [`Starting rollback for Pricebook ID: ${d.bookId}`], done: false, error: false });

            try {
                setActionProgress(prev => ({ ...prev, status: 'Re-pushing previous specification...', logs: [...prev.logs, 'Connecting to CloudHealth API...'] }));
                await updatePriceBook(d.bookId, d.beforeXml, apiKey, proxyUrl);
                setActionProgress(prev => ({ ...prev, status: 'Logging action to history...', logs: [...prev.logs, '✅ API Update Successful'] }));
                logHistoryEvent({
                    type: 'PRICEBOOK_UPDATE',
                    title: `[Rollback] Reverted "${bookName}" (ID: ${d.bookId}) to its previous specification`,
                    status: 'SUCCESS',
                    details: { bookId: d.bookId, bookName: bookName, beforeXml: d.afterXml, afterXml: d.beforeXml }
                });
                setHistory(getHistoryOptions());
                setActionProgress(prev => ({ ...prev, title: 'Rollback Successful', status: `"${bookName}" has been reverted to its previous specification.`, done: true }));
            } catch (err) {
                logHistoryEvent({
                    type: 'PRICEBOOK_UPDATE',
                    title: `[Rollback Failed] Could not revert "${bookName}" (ID: ${d.bookId})`,
                    status: 'ERROR', errorMessage: err.message,
                    details: { bookId: d.bookId, bookName: bookName, beforeXml: d.afterXml, afterXml: d.beforeXml }
                });
                setHistory(getHistoryOptions());
                setActionProgress(prev => ({ ...prev, title: 'Rollback Failed', status: err.message, done: true, error: true, logs: [...prev.logs, `❌ Error: ${err.message}`] }));
            }
        }

        else if (item.type === 'PRICEBOOK_DELETE') {
            if (!d.beforeXml) {
                await confirm({ title: 'Cannot Restore', message: 'No specification was captured before deletion. Cannot restore.', variant: 'danger', confirmLabel: 'OK', hideCancel: true });
                return;
            }
            const bookName = d.bookName || 'Pricebook';
            const ok = await confirm({
                title: 'Restore Deleted Pricebook',
                message: `This will recreate "${bookName}" with its specification from before it was deleted.\n\nA new Pricebook ID will be assigned by CloudHealth.`,
                variant: 'warning', confirmLabel: 'Restore Pricebook', cancelLabel: 'Cancel'
            });
            if (!ok) return;

            setActionProgress({ active: true, title: `Restoring "${bookName}"`, status: 'Recreating pricebook...', logs: [`Connecting to CloudHealth to recreate "${bookName}"...`], done: false, error: false });
            try {
                const result = await createPriceBook(bookName, d.beforeXml, apiKey, proxyUrl);
                const newId = result?.id || result?.price_book?.id || result?.data?.id || '(new)';
                setActionProgress(prev => ({ ...prev, status: `Created successfully (New ID: ${newId}). Logging history...`, logs: [...prev.logs, `✅ Created with ID: ${newId}`] }));
                logHistoryEvent({
                    type: 'PRICEBOOK_CREATE',
                    title: `[Restore] Recreated deleted pricebook "${bookName}" with new ID: ${newId}`,
                    status: 'SUCCESS',
                    details: { bookId: newId, bookName: bookName, beforeXml: null, afterXml: d.beforeXml }
                });
                setHistory(getHistoryOptions());

                // Offer to reassign to last known customer
                if (d.customerId || d.customerName) {
                    setActionProgress(prev => ({ ...prev, title: 'Restore Successful', status: `"${bookName}" has been recreated with ID: ${newId}.`, done: true }));
                    const reassign = await confirm({
                        title: 'Reassign Pricebook?',
                        message: `The pricebook "${bookName}" was restored with new ID: ${newId}.\n\nWould you like to reassign it back to "${d.customerName || d.customerId}"?`,
                        confirmLabel: 'Reassign Now', cancelLabel: 'Done'
                    });
                    if (reassign) {
                        // Recurse into the reassignment logic
                        handleRollback({
                            type: 'CUSTOMER_UNASSIGN',
                            details: {
                                bookId: newId, bookName: bookName,
                                customerId: d.customerId, customerName: d.customerName,
                                payerAccountId: d.payerAccountId || 'ALL'
                            }
                        });
                    }
                } else {
                    setActionProgress(prev => ({ ...prev, title: 'Restore Successful', status: `"${bookName}" has been recreated with ID: ${newId}.`, done: true }));
                }
            } catch (err) {
                logHistoryEvent({
                    type: 'PRICEBOOK_CREATE',
                    title: `[Restore Failed] Could not recreate pricebook "${bookName}"`,
                    status: 'ERROR', errorMessage: err.message,
                    details: { bookId: null, bookName: bookName, beforeXml: null, afterXml: d.beforeXml }
                });
                setHistory(getHistoryOptions());
                setActionProgress(prev => ({ ...prev, title: 'Restore Failed', status: err.message, done: true, error: true, logs: [...prev.logs, `❌ Error: ${err.message}`] }));
            }
        }

        // ── CREATE rollback: warn strongly then delete ────────────────────────
        else if (item.type === 'PRICEBOOK_CREATE') {
            const step1 = await confirm({
                title: '⚠️ Undo Pricebook Creation',
                message: `This will permanently DELETE "${d.bookName}" (ID: ${d.bookId}) from CloudHealth.\n\nIf any customers are currently assigned to it, they will lose access to this pricebook.`,
                variant: 'danger', confirmLabel: 'Delete Pricebook', cancelLabel: 'Cancel'
            });
            if (!step1) return;
            const step2 = await confirm({
                title: 'Final Confirmation',
                message: `Type-check: You are about to permanently delete "${d.bookName}". Are you absolutely sure?`,
                variant: 'danger', confirmLabel: 'Yes, Delete It', cancelLabel: 'Cancel'
            });
            if (!step2) return;

            setActionProgress({ active: true, title: `Undoing creation of "${d.bookName}"`, status: 'Deleting pricebook...', logs: [`Connecting to CloudHealth to delete ID: ${d.bookId}...`], done: false, error: false });
            try {
                const { deletePriceBook } = await import('../utils/chApi');
                await deletePriceBook(d.bookId, apiKey, proxyUrl);
                setActionProgress(prev => ({ ...prev, status: 'Logging action to history...', logs: [...prev.logs, '✅ Successfully deleted from CloudHealth'] }));
                logHistoryEvent({
                    type: 'PRICEBOOK_DELETE',
                    title: `[Undo] Deleted pricebook "${d.bookName}" (ID: ${d.bookId}) — creation was undone`,
                    status: 'SUCCESS',
                    details: { bookId: d.bookId, bookName: d.bookName, beforeXml: d.afterXml }
                });
                setHistory(getHistoryOptions());
                setActionProgress(prev => ({ ...prev, title: 'Undo Successful', status: `"${d.bookName}" (ID: ${d.bookId}) has been permanently deleted.`, done: true }));
            } catch (err) {
                logHistoryEvent({
                    type: 'PRICEBOOK_DELETE',
                    title: `[Undo Failed] Could not delete pricebook "${d.bookName}" (ID: ${d.bookId})`,
                    status: 'ERROR', errorMessage: err.message,
                    details: { bookId: d.bookId, bookName: d.bookName, beforeXml: d.afterXml }
                });
                setHistory(getHistoryOptions());
                setActionProgress(prev => ({ ...prev, title: 'Undo Failed', status: err.message, done: true, error: true, logs: [...prev.logs, `❌ Error: ${err.message}`] }));
            }
        }

        // ── CUSTOMER_UNASSIGN / ASSIGNMENT_DELETE rollback: re-assign ─────────
        else if (item.type === 'CUSTOMER_UNASSIGN' || item.type === 'ASSIGNMENT_DELETE') {
            if (!d.bookId || !d.customerId) {
                await confirm({ title: 'Cannot Reassign', message: 'Not enough information was captured in this log entry to perform a reassignment.', variant: 'danger', confirmLabel: 'OK', hideCancel: true });
                return;
            }
            const ok = await confirm({
                title: 'Reassign Pricebook',
                message: `This will reassign "${d.bookName}" (ID: ${d.bookId}) back to "${d.customerName || d.customerId}".\n\nPayer Account: ${d.payerAccountId || 'ALL'}`,
                variant: 'warning',
                confirmLabel: 'Yes, Reassign',
                cancelLabel: 'Cancel'
            });
            if (!ok) return;

            setActionProgress({ active: true, title: `Reassigning "${d.bookName}"`, status: 'Creating assignment...', logs: [`Connecting to CloudHealth to link "${d.bookName}" to "${d.customerName || d.customerId}"...`], done: false, error: false });
            try {
                const result = await assignPriceBook(
                    d.bookId,
                    d.customerId,
                    d.payerAccountId || 'ALL',
                    apiKey,
                    proxyUrl
                );
                const newAssignmentId = result?.assignmentId || result?.id || result?.price_book_assignment?.id || '(new)';
                setActionProgress(prev => ({ ...prev, status: 'Logging action to history...', logs: [...prev.logs, `✅ Assigned successfully (ID: ${newAssignmentId})`] }));
                logHistoryEvent({
                    type: 'ASSIGNMENT_CREATE',
                    title: `[Reassign] Re-linked "${d.bookName}" to "${d.customerName || d.customerId}" (Assignment ID: ${newAssignmentId})`,
                    status: 'SUCCESS',
                    details: {
                        bookId: d.bookId, bookName: d.bookName,
                        customerId: d.customerId, customerName: d.customerName,
                        assignmentId: newAssignmentId, payerAccountId: d.payerAccountId,
                        beforeAssignment: null, afterAssignment: d.payerAccountId
                    }
                });
                setHistory(getHistoryOptions());
                setActionProgress(prev => ({ ...prev, title: 'Reassignment Successful', status: `"${d.bookName}" has been reassigned to "${d.customerName || d.customerId}".`, done: true }));
            } catch (err) {
                logHistoryEvent({
                    type: 'ASSIGNMENT_CREATE',
                    title: `[Reassign Failed] Could not re-link "${d.bookName}" to "${d.customerName || d.customerId}"`,
                    status: 'ERROR', errorMessage: err.message,
                    details: {
                        bookId: d.bookId, bookName: d.bookName,
                        customerId: d.customerId, customerName: d.customerName,
                        assignmentId: null, payerAccountId: d.payerAccountId
                    }
                });
                setHistory(getHistoryOptions());
                setActionProgress(prev => ({ ...prev, title: 'Reassignment Failed', status: err.message, done: true, error: true, logs: [...prev.logs, `❌ Error: ${err.message}`] }));
            }
        }
    };

    useEffect(() => {
        const loadHistory = () => setHistory(getHistoryOptions());
        loadHistory();
        window.addEventListener('historyUpdated', loadHistory);
        return () => window.removeEventListener('historyUpdated', loadHistory);
    }, []);

    const handleClear = async () => {
        const isConfirmed = await confirm({
            title: 'Clear History Logs',
            message: 'Are you sure you want to clear all history logs? This cannot be undone.',
            variant: 'danger',
            confirmLabel: 'Clear All',
            cancelLabel: 'Keep Logs'
        });

        if (isConfirmed) {
            clearHistory();
            setHistory([]);
            setExpandedItems(new Set());
        }
    };

    const handleExport = () => {
        if (history.length === 0) return;
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history, null, 2));
        const a = document.createElement('a');
        a.href = dataStr;
        a.download = `cpb_action_history_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handleImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                if (!Array.isArray(importedData)) throw new Error("Invalid format: Must be a JSON array.");
                
                const isConfirmed = await confirm({
                    title: 'Import History Logs',
                    message: `You are about to import ${importedData.length} logs. This will merge them with your current history. Continue?`,
                    confirmLabel: 'Import Logs'
                });

                if (isConfirmed) {
                    // Merge based on unique IDs
                    const currentMap = new Map(history.map(item => [item.id, item]));
                    importedData.forEach(item => {
                        if (item.id) currentMap.set(item.id, item);
                    });
                    
                    const merged = Array.from(currentMap.values()).sort((a, b) => b.timestamp - a.timestamp);
                    setHistoryOptions(merged);
                    // The historyUpdated effect will pick up the change, but let's eagerly set it
                    setHistory(merged);
                }
            } catch(err) {
                console.error("Failed to import", err);
                await confirm({
                    title: 'Import Error',
                    message: 'Could not read the JSON file properly. Ensure it is a valid logs export.',
                    variant: 'danger',
                    confirmLabel: 'Close',
                    hideCancel: true
                });
            } finally {
                // Clear the input so you can select the same file again if needed
                if (e.target) e.target.value = '';
            }
        };
        reader.readAsText(file);
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
        const typeLabel = (TYPE_CONFIGS[item.type]?.label || item.type).toLowerCase();
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'nowrap', gap: '16px' }}>
                        <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', flex: 1, minWidth: 0, wordBreak: 'break-word' }}>
                            {item.type === 'PRICEBOOK_CREATE' ? 'Created' : 'Updated specification for'} <strong>{d.bookName || 'Pricebook'}</strong> <br />
                            ({d.bookId || '—'})
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flexShrink: 0, marginLeft: 'auto' }}>
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
                            {item.status === 'SUCCESS' && (
                                <Tooltip
                                    title={item.type === 'PRICEBOOK_CREATE' ? 'Undo Creation' : 'Rollback to Previous'}
                                    content={item.type === 'PRICEBOOK_CREATE' ? 'Permanently delete this pricebook (with double confirmation)' : 'Re-push the specification from before this update'}
                                    variant="glass"
                                >
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleRollback(item); }}
                                        style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.4)', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,158,11,0.2)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(245,158,11,0.1)'}
                                    >
                                        <FaUndo size={10} /> {item.type === 'PRICEBOOK_CREATE' ? 'Undo' : 'Rollback'}
                                    </button>
                                </Tooltip>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Pricebook Delete ── */}
                {item.type === 'PRICEBOOK_DELETE' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'nowrap', gap: '16px' }}>
                        <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', flex: 1, minWidth: 0, wordBreak: 'break-word' }}>
                            Permanently deleted <strong>{d.bookName || 'Pricebook'}</strong> <br />
                            ({d.bookId || '—'})
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flexShrink: 0, marginLeft: 'auto' }}>
                            {d.beforeXml && (
                                <button onClick={() => setViewingDiff({ before: d.beforeXml, after: null, title: `Deleted Spec — ${d.bookName}` })}
                                    style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '6px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
                                    View Deleted Spec
                                </button>
                            )}
                            {item.status === 'SUCCESS' && d.beforeXml && (
                                <Tooltip title="Restore Pricebook" content="Recreate this pricebook with its original specification" variant="glass">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleRollback(item); }}
                                        style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.4)', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.2)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(16,185,129,0.1)'}
                                    >
                                        <FaUndo size={10} /> Restore
                                    </button>
                                </Tooltip>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Assignment Create / Update ── */}
                {(item.type === 'ASSIGNMENT_CREATE' || item.type === 'ASSIGNMENT_UPDATE') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                        <div>Linked <strong>{d.bookName || 'Pricebook'}</strong> to <strong>{d.customerName || 'Customer'}</strong></div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: '20px', rowGap: '6px', alignItems: 'center', background: 'var(--bg-card)', borderRadius: '8px', padding: '10px 14px', border: '1px solid var(--border)' }}>
                            <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Price Book ID</span>
                            <span style={{ fontWeight: 600 }}>{d.bookId || '—'}</span>
                            <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Assignment ID</span>
                            <span style={{ fontWeight: 600 }}>{d.assignmentId || '—'}</span>
                            <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Assigned Payer Account ID</span>
                            <span>
                                {item.type === 'ASSIGNMENT_UPDATE' && (
                                    <>
                                        <span style={{ color: 'var(--danger)', textDecoration: 'line-through', marginRight: '8px' }}>
                                            {Array.isArray(d.beforeAssignment) ? d.beforeAssignment.join(', ') : d.beforeAssignment || 'None'}
                                        </span>
                                        <span style={{ color: 'var(--text-muted)', marginRight: '8px' }}>→</span>
                                    </>
                                )}
                                <span style={{ color: item.type === 'ASSIGNMENT_UPDATE' ? 'var(--success)' : 'inherit', fontWeight: 600 }}>
                                    {Array.isArray(d.afterAssignment) ? d.afterAssignment.join(', ') : d.afterAssignment || d.payerAccountId || 'None'}
                                </span>
                            </span>
                        </div>
                    </div>
                )}

                {item.type === 'ASSIGNMENT_DELETE' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                            <div>Removed assignment for <strong>{d.customerName}</strong> from pricebook <strong>{d.bookName}</strong></div>
                            {item.status === 'SUCCESS' && d.bookId && d.customerId && (
                                <div style={{ marginLeft: 'auto' }}>
                                    <Tooltip title="Reassign Pricebook" content="Re-create the assignment between this pricebook and customer" variant="glass">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleRollback(item); }}
                                            style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.4)', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.2)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(16,185,129,0.1)'}
                                        >
                                            <FaUndo size={10} /> Reassign
                                        </button>
                                    </Tooltip>
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: '20px', rowGap: '6px', alignItems: 'center', background: 'var(--bg-card)', borderRadius: '8px', padding: '10px 14px', border: '1px solid var(--border)' }}>
                            <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Price Book ID</span>
                            <span style={{ fontWeight: 600 }}>{d.bookId || '—'}</span>
                            <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Assignment ID</span>
                            <span style={{ fontWeight: 600 }}>{d.assignmentId || '—'}</span>
                            <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Assigned Payer Account ID</span>
                            <span style={{ fontWeight: 600 }}>{d.payerAccountId || '—'}</span>
                        </div>
                    </div>
                )}

                {item.type === 'CUSTOMER_UNASSIGN' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                            <div>Removed link between <strong>{d.bookName}</strong> and <strong>{d.customerName}</strong></div>
                            {item.status === 'SUCCESS' && d.bookId && d.customerId && (
                                <div style={{ marginLeft: 'auto' }}>
                                    <Tooltip title="Reassign Pricebook" content="Re-link this pricebook to the customer using the original payer account" variant="glass">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleRollback(item); }}
                                            style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.4)', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.2)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(16,185,129,0.1)'}
                                        >
                                            <FaUndo size={10} /> Reassign
                                        </button>
                                    </Tooltip>
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: '20px', rowGap: '6px', alignItems: 'center', background: 'var(--bg-card)', borderRadius: '8px', padding: '10px 14px', border: '1px solid var(--border)' }}>
                            <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Price Book ID</span>
                            <span style={{ fontWeight: 600 }}>{d.bookId || '—'}</span>
                            <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Assignment ID</span>
                            <span style={{ fontWeight: 600 }}>{d.assignmentId || '—'}</span>
                            <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Assigned Payer Account ID</span>
                            <span style={{ fontWeight: 600 }}>{d.payerAccountId || '—'}</span>
                        </div>
                    </div>
                )}

                {/* ── Dry Run ── */}
                {item.type === 'DRY_RUN' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                        <div>
                            Simulation submitted for <strong>{d.bookName || 'Pricebook'}</strong> assigned to <strong>{d.customerName || d.customerId}</strong>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: '20px', rowGap: '6px', alignItems: 'center', background: 'var(--bg-card)', borderRadius: '8px', padding: '10px 14px', border: '1px solid var(--border)' }}>
                            <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Customer ID</span>
                            <span style={{ fontWeight: 600 }}>{d.customerId || '—'}</span>
                            <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Payer Account ID</span>
                            <span style={{ fontWeight: 600 }}>{d.payerId || '—'}</span>
                            <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Start Month</span>
                            <span style={{ fontWeight: 600 }}>{d.startMonth ? d.startMonth.substring(0, 7) : '—'}</span>
                            <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Temp Pricebook ID</span>
                            <span style={{ fontWeight: 600, color: d.tempBookId ? (d.tempBookDeleted ? 'var(--success)' : 'var(--warning, #f59e0b)') : 'inherit' }}>
                                {d.tempBookId || '—'}
                                {d.tempBookId && (
                                    <span style={{ marginLeft: '8px', fontSize: '0.75rem', fontWeight: 400, color: d.tempBookDeleted ? 'var(--success)' : 'var(--warning, #f59e0b)' }}>
                                        {d.tempBookDeleted ? '(deleted ✓)' : '(remember to delete)'}
                                    </span>
                                )}
                            </span>
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
                <p style={{ fontSize: '0.9rem', maxWidth: '300px', margin: '0 auto', marginBottom: '24px' }}>
                    Modifications, updates, and deletions applied to the CloudHealth tenant will appear here.
                </p>
                <input type="file" ref={fileInputRef} accept=".json" style={{ display: 'none' }} onChange={handleImport} />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{ background: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border)', padding: '10px 20px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(139, 92, 246, 0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                    <FaFileImport size={14} /> Import Logs from File
                </button>
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
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <input type="file" ref={fileInputRef} accept=".json" style={{ display: 'none' }} onChange={handleImport} />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            style={{ flexShrink: 0, background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-main)'; e.currentTarget.style.background = 'var(--bg-card)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
                        >
                            <FaFileImport size={12} /> Import
                        </button>
                        <button
                            onClick={handleExport}
                            disabled={history.length === 0}
                            style={{ flexShrink: 0, background: 'transparent', color: history.length === 0 ? 'var(--text-muted)' : 'var(--text-secondary)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', cursor: history.length === 0 ? 'not-allowed' : 'pointer', fontWeight: 600, transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                            onMouseEnter={e => { if (history.length) { e.currentTarget.style.color = 'var(--text-main)'; e.currentTarget.style.background = 'var(--bg-card)'; } }}
                            onMouseLeave={e => { if (history.length) { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; } }}
                        >
                            <FaFileExport size={12} /> Export
                        </button>
                        <button
                            onClick={handleClear}
                            style={{ flexShrink: 0, background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '8px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s', whiteSpace: 'nowrap', marginLeft: '4px' }}
                        >
                            <FaTrash size={12} /> Clear Log
                        </button>
                    </div>
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
                                                <Tooltip title="Filter" content="Search within status column" position="top">
                                                    <button onClick={() => toggleColFilter('status')}
                                                        style={{ background: colFilters.status ? 'rgba(139,92,246,0.2)' : 'none', border: colFilters.status ? '1px solid rgba(139,92,246,0.5)' : '1px solid transparent', color: colFilters.status ? '#a78bfa' : 'var(--text-muted)', cursor: 'pointer', padding: '2px 5px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}>
                                                        <FaSearch size={10} />
                                                    </button>
                                                </Tooltip>
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
                                                <Tooltip title="Filter" content="Search within date column" position="top">
                                                    <button onClick={() => toggleColFilter('date')}
                                                        style={{ background: colFilters.date ? 'rgba(139,92,246,0.2)' : 'none', border: colFilters.date ? '1px solid rgba(139,92,246,0.5)' : '1px solid transparent', color: colFilters.date ? '#a78bfa' : 'var(--text-muted)', cursor: 'pointer', padding: '2px 5px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}>
                                                        <FaSearch size={10} />
                                                    </button>
                                                </Tooltip>
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
                                                <Tooltip title="Filter" content="Search within type column" position="top">
                                                    <button onClick={() => toggleColFilter('type')}
                                                        style={{ background: colFilters.type ? 'rgba(139,92,246,0.2)' : 'none', border: colFilters.type ? '1px solid rgba(139,92,246,0.5)' : '1px solid transparent', color: colFilters.type ? '#a78bfa' : 'var(--text-muted)', cursor: 'pointer', padding: '2px 5px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}>
                                                        <FaSearch size={10} />
                                                    </button>
                                                </Tooltip>
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
                                                <Tooltip title="Filter" content="Search within description column" position="top">
                                                    <button onClick={() => toggleColFilter('desc')}
                                                        style={{ background: colFilters.desc ? 'rgba(139,92,246,0.2)' : 'none', border: colFilters.desc ? '1px solid rgba(139,92,246,0.5)' : '1px solid transparent', color: colFilters.desc ? '#a78bfa' : 'var(--text-muted)', cursor: 'pointer', padding: '2px 5px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}>
                                                        <FaSearch size={10} />
                                                    </button>
                                                </Tooltip>
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
                                            const typeConf = TYPE_CONFIGS[item.type] || { className: 'history-tag', label: item.type };

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
                                                            <span className={`history-tag ${typeConf.className}`}>
                                                                {typeConf.label}
                                                            </span>
                                                        </td>

                                                        {/* Description */}
                                                        <td style={{ padding: '12px 16px', width: '100%' }}>
                                                            <div style={{
                                                                fontWeight: 500,
                                                                color: 'var(--text-main)',
                                                                fontSize: '0.85rem',
                                                                lineHeight: '1.4'
                                                            }}>
                                                                {item.title}
                                                            </div>
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
            {/* Action Progress Overlay Modal */}
            <AnimatePresence>
                {actionProgress.active && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            style={{ background: 'var(--bg-card)', padding: '32px', borderRadius: '16px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', maxWidth: '400px', width: '100%', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}
                        >
                            <div className={!actionProgress.done ? "spin" : ""} style={{ fontSize: '3rem', color: actionProgress.error ? 'var(--danger)' : (actionProgress.done ? 'var(--success)' : 'var(--primary)'), display: 'flex' }}>
                                {actionProgress.done ? (actionProgress.error ? <FaTimesCircle /> : <FaCheckCircle />) : <FaSyncAlt />}
                            </div>
                            <div style={{ textAlign: 'center', width: '100%' }}>
                                <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-main)', fontSize: '1.2rem', fontWeight: 600 }}>{actionProgress.title}</h3>
                                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.4' }}>{actionProgress.status}</p>
                            </div>
                            {actionProgress.logs.length > 0 && (
                                <div style={{ width: '100%', background: 'var(--bg-subtle)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', maxHeight: '150px', overflowY: 'auto' }}>
                                    {actionProgress.logs.map((L, i) => (
                                        <div key={i} style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', fontFamily: 'monospace' }}>{L}</div>
                                    ))}
                                </div>
                            )}
                            {actionProgress.done && (
                                <button
                                    onClick={() => setActionProgress({ active: false, title: '', status: '', logs: [], done: false, error: false })}
                                    style={{ width: '100%', padding: '12px', background: 'var(--bg-deep)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                                >
                                    Close
                                </button>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default HistoryLog;
