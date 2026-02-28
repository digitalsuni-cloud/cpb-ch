import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSyncAlt, FaTrash, FaCheckCircle, FaTimesCircle, FaEdit, FaEye, FaTimes, FaBookOpen, FaPen, FaUserEdit, FaCheckSquare, FaRegSquare, FaChevronLeft, FaChevronRight, FaAlignLeft, FaExpand, FaCompress } from 'react-icons/fa';
import { getAssignedPriceBooks, deletePriceBook, deletePriceBookAssignment, deleteBaseAssignment, getPriceBookSpecification } from '../utils/chApi';
import { usePriceBook } from '../context/PriceBookContext';
import { parseXMLToState } from '../utils/converter';
import ToggleSwitch from './ToggleSwitch';

let directoryCache = { customers: [], books: [], assignments: [] };

const DirectorySection = ({ setActiveView, setDeployHint }) => {
    const { dispatch, state } = usePriceBook();
    const [apiData, setApiData] = useState(directoryCache);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showUnassigned, setShowUnassigned] = useState(false);

    // Filter states
    const [filterCustomer, setFilterCustomer] = useState('');
    const [filterBook, setFilterBook] = useState('');
    const [filterPayer, setFilterPayer] = useState('');

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    // Modal state for viewing XML
    const [viewingXml, setViewingXml] = useState(null);
    const [viewingXmlTitle, setViewingXmlTitle] = useState('');
    const [xmlExpanded, setXmlExpanded] = useState(false);

    // Overlay state for destructive actions
    const [actionProgress, setActionProgress] = useState({ active: false, title: '', status: '', logs: [], done: false, error: false });

    const loadDirectory = async () => {
        const apiKey = localStorage.getItem('ch_api_key');
        const proxyUrl = localStorage.getItem('ch_proxy_url') || '';

        if (!apiKey) {
            setError('Please configure your API Key in Settings first.');
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const data = await getAssignedPriceBooks(apiKey, proxyUrl);

            const customersMap = new Map();
            const booksMap = new Map();

            data.forEach(item => {
                if (!customersMap.has(item.target_client_api_id)) {
                    customersMap.set(item.target_client_api_id, { id: item.target_client_api_id, name: item.customer_name });
                }
                if (!booksMap.has(item.id)) {
                    booksMap.set(item.id, { id: item.id, name: item.book_name });
                }
            });

            const newCacheState = {
                assignments: data,
                customers: Array.from(customersMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
                books: Array.from(booksMap.values()).sort((a, b) => a.name.localeCompare(b.name))
            };
            
            directoryCache = newCacheState;
            setApiData(newCacheState);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Only auto-load on first mount — if data is already cached in memory, keep it
        if (directoryCache.assignments.length === 0) {
            loadDirectory();
        } else {
            setApiData(directoryCache);
        }
    }, []);

    const handleUnassign = async (assignmentId, customerName, bookName) => {
        // Strip the trailing " (ID)" portion from the display name for the title
        const cleanName = customerName ? customerName.replace(/\s*\(\d+\)$/, '') : customerName;
        const shortBook = bookName && bookName.length > 25 ? `${bookName.substring(0, 23)}…` : (bookName || 'Pricebook');
        if (!window.confirm(`Are you sure you want to unassign this Pricebook from ${cleanName}?`)) return;
        const apiKey = localStorage.getItem('ch_api_key');
        const proxyUrl = localStorage.getItem('ch_proxy_url') || '';
        try {
            setActionProgress({ active: true, title: `Unassigning Pricebook for ${cleanName}`, status: `Removing assignment from ${cleanName}...`, logs: [], done: false, error: false });
            // Delete the BASE assignment (price_book_assignments) — this removes the customer link entirely
            await deleteBaseAssignment(assignmentId, apiKey, proxyUrl);
            setActionProgress(prev => ({ ...prev, status: 'Reloading directory...', logs: [...prev.logs, `✅ Unassigned “${shortBook}” from ${cleanName}`] }));
            await loadDirectory();
            setActionProgress(prev => ({ ...prev, status: 'Successfully completed.', done: true }));
        } catch (err) {
            setActionProgress(prev => ({ ...prev, status: `Failed: ${err.message}`, logs: [...prev.logs, `❌ Error: ${err.message}`], done: true, error: true }));
        }
    };

    const handleDeleteBook = async (bookId, bookName) => {
        if (!window.confirm(`CRITICAL: Are you completely sure you want to delete Pricebook "${bookName}" globally? This cannot be undone.`)) return;
        const apiKey = localStorage.getItem('ch_api_key');
        const proxyUrl = localStorage.getItem('ch_proxy_url') || '';

        // Truncate long pricebook names for the modal title
        const truncatedName = bookName.length > 30 ? `${bookName.substring(0, 28)}…` : bookName;
        const assignmentsToRemove = apiData.assignments.filter(a => a.id === bookId && a.is_assigned);

        try {
            setActionProgress({ active: true, title: `Deleting Pricebook — ${truncatedName}`, status: `Starting deletion...`, logs: [], done: false, error: false });

            for (let i = 0; i < assignmentsToRemove.length; i++) {
                const asgn = assignmentsToRemove[i];
                const cleanCust = asgn.customer_name ? asgn.customer_name.replace(/\s*\(\d+\)$/, '') : asgn.customer_name;

                // Step A: Remove payer account link first if one exists
                if (asgn.account_assignment_id) {
                    setActionProgress(prev => ({ ...prev, status: `Removing payer link for ${cleanCust}...`, logs: [...prev.logs, `Removing payer account link for ${cleanCust}...`] }));
                    await deletePriceBookAssignment(asgn.account_assignment_id, apiKey, proxyUrl);
                    setActionProgress(prev => ({ ...prev, logs: [...prev.logs, `✅ Payer account link removed for ${cleanCust}`] }));
                }

                // Step B: Remove the base customer assignment
                setActionProgress(prev => ({ ...prev, status: `Unassigning from ${cleanCust}...`, logs: [...prev.logs, `Unassigning from customer ${cleanCust}...`] }));
                await deleteBaseAssignment(asgn.assignment_id, apiKey, proxyUrl);
                setActionProgress(prev => ({ ...prev, logs: [...prev.logs, `✅ Unassigned from ${cleanCust}`] }));
            }

            setActionProgress(prev => ({ ...prev, status: `Deleting pricebook from CloudHealth...`, logs: [...prev.logs, `Executing global deletion request...`] }));
            await deletePriceBook(bookId, apiKey, proxyUrl);
            setActionProgress(prev => ({ ...prev, status: `Successfully deleted.`, logs: [...prev.logs, `✅ Permanently deleted ${bookName}`], done: true }));

            await loadDirectory();
        } catch (err) {
            setActionProgress(prev => ({ ...prev, status: `Failed: ${err.message}`, logs: [...prev.logs, `❌ Fatal Error: ${err.message}`], done: true, error: true }));
        }
    };

    const handleModify = async (bookId, bookName, customerId, payerId) => {
        // Check for existing data in the builder and warn before overwriting
        const hasExistingData = state.priceBook.ruleGroups.some(g => g.startDate || g.rules.some(r => r.name || r.adjustment));
        if (hasExistingData && !window.confirm(`You have unsaved configuration in the builder.\n\nLoading "${bookName}" will overwrite it. Continue?`)) return;

        const apiKey = localStorage.getItem('ch_api_key');
        const proxyUrl = localStorage.getItem('ch_proxy_url') || '';
        try {
            const xml = await getPriceBookSpecification(bookId, apiKey, proxyUrl);
            const syntheticJsonPayload = {
                book_name: bookName,
                specification: xml,
                cxAPIId: bookId,
                customerApiId: customerId,
                cxPayerId: payerId === 'ALL' ? '' : (payerId === 'N/A' ? '' : payerId)
            };
            const newState = parseXMLToState(xml, syntheticJsonPayload);
            dispatch({ type: 'IMPORT_DATA', payload: newState });
            setActiveView('builder');
        } catch (err) {
            alert(`Failed to fetch and parse pricebook: ${err.message}`);
        }
    };

    const handleEditAssignment = async (bookId, bookName, customerId, payerId) => {
        // Warn if builder already has data
        const hasExistingData = state.priceBook.ruleGroups.some(g => g.startDate || g.rules.some(r => r.name || r.adjustment));
        if (hasExistingData && !window.confirm(`You have unsaved configuration in the builder.\n\nLoading "${bookName}" into Deploy will overwrite it. Continue?`)) return;

        const apiKey = localStorage.getItem('ch_api_key');
        const proxyUrl = localStorage.getItem('ch_proxy_url') || '';
        try {
            const xml = await getPriceBookSpecification(bookId, apiKey, proxyUrl);
            const syntheticJsonPayload = {
                book_name: bookName,
                specification: xml,
                cxAPIId: bookId,
                customerApiId: customerId,
                cxPayerId: payerId === 'ALL' || payerId === 'N/A' ? '' : payerId
            };
            const newState = parseXMLToState(xml, syntheticJsonPayload);
            dispatch({ type: 'IMPORT_DATA', payload: newState });
            // Signal DeploySection to auto-open the Assign to Customer panel
            if (setDeployHint) setDeployHint(true);
            setActiveView('deploy');
        } catch (err) {
            alert(`Failed to load assignment into deploy context: ${err.message}`);
        }
    };

    const handleViewSummary = async (bookId, bookName, customerId, payerId) => {
        const hasExistingData = state.priceBook.ruleGroups.some(g => g.startDate || g.rules.some(r => r.name || r.adjustment));
        if (hasExistingData && !window.confirm(`You have unsaved configuration in the builder.\n\nLoading "${bookName}" will overwrite it. Continue?`)) return;

        const apiKey = localStorage.getItem('ch_api_key');
        const proxyUrl = localStorage.getItem('ch_proxy_url') || '';
        try {
            const xml = await getPriceBookSpecification(bookId, apiKey, proxyUrl);
            const syntheticJsonPayload = {
                book_name: bookName,
                specification: xml,
                cxAPIId: bookId,
                customerApiId: customerId,
                cxPayerId: payerId === 'ALL' || payerId === 'N/A' ? '' : payerId
            };
            const newState = parseXMLToState(xml, syntheticJsonPayload);
            dispatch({ type: 'IMPORT_DATA', payload: newState });
            setActiveView('preview');
        } catch (err) {
            alert(`Failed to load pricebook summary: ${err.message}`);
        }
    };

    const handleViewXml = async (bookId, bookName) => {
        const apiKey = localStorage.getItem('ch_api_key');
        const proxyUrl = localStorage.getItem('ch_proxy_url') || '';
        try {
            const xml = await getPriceBookSpecification(bookId, apiKey, proxyUrl);
            setViewingXml(xml);
            setViewingXmlTitle(`Specification: ${bookName}`);
        } catch (err) {
            alert(`Failed to view XML: ${err.message}`);
        }
    };

    // Lightweight syntax highlighter for XML viewer
    const highlightXml = (code) => {
        if (!code) return '';
        const escapeHtml = (str) =>
            str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        const escaped = escapeHtml(code);
        return escaped.replace(/(&lt;\/?[a-zA-Z0-9]+)(\s*.*?)(&gt;)/g, (m, p1, p2, p3) => {
            const tagName = p1.replace(/&lt;\/?/, '');

            let tagClass = 'hl-tag';
            if (tagName === 'RuleGroup') tagClass = 'hl-tag-group';
            else if (tagName === 'BillingRule' || tagName === 'BasicBillingRule') tagClass = 'hl-tag-rule';
            else if (tagName === 'Product') tagClass = 'hl-tag-product';
            else if (tagName === 'Comment' || tagName === 'CHTBillingRules') tagClass = 'hl-tag-meta';
            else if (['UsageType', 'Operation', 'RecordType', 'SavingsPlanOfferingType', 'InstanceProperties', 'LineItemDescription'].includes(tagName)) tagClass = 'hl-tag-prop';

            const attrs = p2.replace(/([a-zA-Z0-9]+)=(&quot;[^&]*&quot;|"[^"]*")/g, (m2, attrName, attrValue) => {
                return `<span class="hl-key">${attrName}</span>=<span class="hl-string">${attrValue}</span>`;
            });

            return `<span class="${tagClass}">${p1}</span>${attrs}<span class="${tagClass}">${p3}</span>`;
        });
    };

    const filteredData = apiData.assignments.filter(a => {
        if (!showUnassigned && !a.is_assigned) return false;
        if (filterCustomer && !(a.customer_name.toLowerCase().includes(filterCustomer.toLowerCase()) || (a.target_client_api_id && a.target_client_api_id.toString().includes(filterCustomer)))) return false;
        if (filterBook && !(a.book_name.toLowerCase().includes(filterBook.toLowerCase()) || a.id.toString().includes(filterBook))) return false;
        if (filterPayer && !(a.billing_account_owner_id && a.billing_account_owner_id.toString().toLowerCase().includes(filterPayer.toLowerCase()))) return false;
        return true;
    });

    const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
    const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    useEffect(() => {
        if (currentPage > totalPages) setCurrentPage(1);
    }, [filteredData.length, totalPages, currentPage]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', background: 'var(--bg-card)', padding: '16px 24px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <ToggleSwitch
                        label="Show Unassigned"
                        checked={showUnassigned}
                        onChange={setShowUnassigned}
                    />
                    <button
                        onClick={loadDirectory}
                        disabled={isLoading}
                        style={{
                            padding: '10px 16px', borderRadius: '8px', background: 'var(--primary)', color: '#fff', border: 'none',
                            display: 'flex', alignItems: 'center', gap: '8px', cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: 600
                        }}
                    >
                        <FaSyncAlt className={isLoading ? 'spin' : ''} /> Refresh Directory
                    </button>
                </div>
            </div>

            {error && (
                <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '8px', border: '1px solid var(--danger)' }}>
                    {error}
                </div>
            )}

            <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden', flex: 1 }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-deep)', borderBottom: '1px solid var(--border)' }}>
                                <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        Assigned Customer
                                        <input
                                            type="text"
                                            placeholder="Filter Customer..."
                                            value={filterCustomer}
                                            onChange={(e) => setFilterCustomer(e.target.value)}
                                            style={{ width: '100%', marginTop: '4px', padding: '6px 12px', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                </th>
                                <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        Pricebook Name
                                        <input
                                            type="text"
                                            placeholder="Filter Pricebook..."
                                            value={filterBook}
                                            onChange={(e) => setFilterBook(e.target.value)}
                                            style={{ width: '100%', marginTop: '4px', padding: '6px 12px', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                </th>
                                <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        Payer Mapping
                                        <input
                                            type="text"
                                            placeholder="Filter Payer Account..."
                                            value={filterPayer}
                                            onChange={(e) => setFilterPayer(e.target.value)}
                                            style={{ width: '100%', marginTop: '4px', padding: '6px 12px', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                </th>
                                <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)', minWidth: '220px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <div>Actions</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontWeight: 'normal', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                                            {[
                                                { icon: <FaEye size={10} />, color: '#38bdf8', bg: 'rgba(56,189,248,0.1)', border: 'rgba(56,189,248,0.3)', label: 'View XML Spec' },
                                                { icon: <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '12px', height: '12px' }}><FaBookOpen size={10} style={{ position: 'absolute' }} /><FaPen size={6} style={{ position: 'absolute', bottom: '-1px', right: '-2px', filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))' }} /></span>, color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)', label: 'Edit Pricebook Rules' },
                                                { icon: <FaAlignLeft size={10} />, color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.3)', label: 'View Summary' },
                                                { icon: <FaUserEdit size={10} />, color: '#38bdf8', bg: 'rgba(56,189,248,0.1)', border: 'rgba(56,189,248,0.3)', label: 'Edit Assignment' },
                                                { icon: <FaTimes size={10} />, color: '#eab308', bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.3)', label: 'Unassign from Customer' },
                                                { icon: <FaTrash size={10} />, color: 'var(--danger)', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', label: 'Delete Global Pricebook' },
                                            ].map(({ icon, color, bg, border, label }) => (
                                                <span key={label} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                                    <span style={{ width: '20px', height: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: bg, border: `1px solid ${border}`, borderRadius: '4px', color, flexShrink: 0 }}>
                                                        {icon}
                                                    </span>
                                                    {label}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.length === 0 && !isLoading ? (
                                <tr>
                                    <td colSpan="4" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        No matching global assignments found.
                                    </td>
                                </tr>
                            ) : paginatedData.map((item, idx) => (
                                <tr key={`${item.id}-${item.assignment_id || 'none'}-${idx}`} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s', opacity: item.is_assigned ? 1 : 0.65 }}>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ fontWeight: item.is_assigned ? 600 : 'normal' }}>{item.customer_name ? item.customer_name.replace(/\s*\(\d+\)$/, '') : ''}</div>
                                        {item.target_client_api_id && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>API ID: {item.target_client_api_id}</div>}
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <div
                                            onClick={() => handleViewXml(item.id, item.book_name)}
                                            style={{ fontWeight: 600, color: 'var(--primary)', cursor: 'pointer', display: 'inline-block' }}
                                            onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                            onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                                            title="Click to Read Raw XML Specification"
                                        >
                                            {item.book_name} ( {item.id} )
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', whiteSpace: 'nowrap' }}>
                                            Created: {item.created_at} &nbsp; LastUpdated: {item.updated_at}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px', color: (item.billing_account_owner_id === 'ALL' || item.billing_account_owner_id === 'N/A' || !item.is_assigned) ? 'var(--text-secondary)' : 'var(--accent)' }}>
                                        <div style={{ fontWeight: 600 }}>
                                            {item.billing_account_owner_id}
                                            {item.billing_account_owner_id === 'N/A' && (
                                                <span style={{ marginLeft: '6px', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'normal', fontStyle: 'italic' }} title="Assigned to customer but no payer account mapping yet">(not yet mapped)</span>
                                            )}
                                        </div>
                                        {item.assignment_id && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Assignment ID: {item.assignment_id}</div>}
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap', alignItems: 'center' }}>
                                            <button
                                                onClick={() => handleViewXml(item.id, item.book_name)}
                                                style={{ width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', borderRadius: '6px', cursor: 'pointer', flexShrink: 0 }}
                                                title="View Raw XML Specification"
                                            >
                                                <FaEye size={13} />
                                            </button>
                                            <button
                                                onClick={() => handleModify(item.id, item.book_name, item.target_client_api_id || '', item.billing_account_owner_id)}
                                                style={{ width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', borderRadius: '6px', cursor: 'pointer', flexShrink: 0, position: 'relative', overflow: 'visible' }}
                                                title="Edit Pricebook Rules"
                                            >
                                                <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '16px', height: '16px' }}>
                                                    <FaBookOpen size={14} style={{ position: 'absolute' }} />
                                                    <FaPen size={7} style={{ position: 'absolute', bottom: '-2px', right: '-4px', filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.6))' }} />
                                                </span>
                                            </button>
                                            <button
                                                onClick={() => handleViewSummary(item.id, item.book_name, item.target_client_api_id || '', item.billing_account_owner_id)}
                                                style={{ width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)', color: '#a78bfa', borderRadius: '6px', cursor: 'pointer', flexShrink: 0 }}
                                                title="View Pricebook Summary"
                                            >
                                                <FaAlignLeft size={13} />
                                            </button>
                                            <button
                                                onClick={() => handleEditAssignment(item.id, item.book_name, item.target_client_api_id || '', item.billing_account_owner_id)}
                                                style={{ width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', borderRadius: '6px', cursor: 'pointer', flexShrink: 0 }}
                                                title="Edit Assignment (Customer / Payer Account)"
                                            >
                                                <FaUserEdit size={13} />
                                            </button>
                                            {item.is_assigned && (
                                                <button
                                                    onClick={() => handleUnassign(item.assignment_id, item.customer_name, item.book_name)}
                                                    style={{ width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', color: '#eab308', borderRadius: '6px', cursor: 'pointer', flexShrink: 0 }}
                                                    title="Unassign from Customer"
                                                >
                                                    <FaTimes size={13} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDeleteBook(item.id, item.book_name)}
                                                style={{ width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--danger)', borderRadius: '6px', cursor: 'pointer', flexShrink: 0 }}
                                                title="Delete Global Pricebook Permanently"
                                            >
                                                <FaTrash size={13} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Controls */}
            {filteredData.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)', fontSize: '0.9rem', flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
                        <span>Rows per page:</span>
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            style={{ padding: '6px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-deep)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none' }}
                        >
                            {[10, 20, 30, 40, 50].map(size => (
                                <option key={size} value={size}>{size}</option>
                            ))}
                        </select>
                        <span style={{ marginLeft: '12px' }}>
                            Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} records
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

            {/* View/Progress Modals attached to body so transformed layouts don't capture position fixed */}
            {typeof document !== 'undefined' ? createPortal(
                <>
                    {/* XML View Modal */}
                    <AnimatePresence>
                        {viewingXml && (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: xmlExpanded ? '2vh 2vw' : '10vh 24px', overflowY: 'auto' }}
                                onClick={() => setViewingXml(null)}
                            >
                                <motion.div
                                    initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', width: '100%', maxWidth: xmlExpanded ? '100%' : '800px', height: xmlExpanded ? '100%' : 'auto', maxHeight: xmlExpanded ? '100%' : '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', transition: 'all 0.3s ease-in-out' }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-deep)' }}>
                                        <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.2rem', fontWeight: 600 }}>{viewingXmlTitle}</h3>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => setXmlExpanded(!xmlExpanded)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }} title={xmlExpanded ? "Restore" : "Maximize"}>
                                                {xmlExpanded ? <FaCompress /> : <FaExpand />}
                                            </button>
                                            <button onClick={() => setViewingXml(null)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', transition: 'all 0.2s', ':hover': { color: 'var(--text-main)', background: 'var(--border)' } }} title="Close">
                                                <FaTimes />
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ padding: '24px', overflowX: 'auto', overflowY: 'auto', flexGrow: 1, background: 'var(--bg-code)' }}>
                                        <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: '1.5' }} dangerouslySetInnerHTML={{ __html: highlightXml(viewingXml) }} />
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

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
                                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{actionProgress.status}</p>
                                    </div>
                                    {actionProgress.logs.length > 0 && (
                                        <div style={{ width: '100%', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', maxHeight: '150px', overflowY: 'auto' }}>
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
                </>,
                document.body
            ) : null}
        </div>
    );
};

export default DirectorySection;
