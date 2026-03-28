import React, { useRef, useState, useEffect } from 'react';
import { usePriceBook } from '../context/PriceBookContext';
import { parseXMLToState } from '../utils/converter';
import { motion, AnimatePresence } from 'framer-motion';
import { getAssignedPriceBooks, getPriceBookSpecification, searchCustomerByName, getSingleCustomerAssignment, fetchAllCustomers } from '../utils/chApi';
import { isElectronApp } from '../utils/env';
import { FaSyncAlt } from 'react-icons/fa';
import Tooltip from './Tooltip';
import { useConfirm } from '../context/ConfirmContext';

const ImportSection = () => {
    const { state, dispatch } = usePriceBook();
    const confirm = useConfirm();
    const fileInput = useRef(null);
    const containerRef = useRef(null);
    const [activeTab, setActiveTab] = useState('file');
    const [isDragging, setIsDragging] = useState(false);
    const [textInput, setTextInput] = useState('');

    // API State
    const [apiData, setApiData] = useState(state.directoryCache || { customers: [], books: [], assignments: [] });
    const [isLoadingBooks, setIsLoadingBooks] = useState(false);

    // Selections
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [selectedBookId, setSelectedBookId] = useState('');
    const [selectedAssignmentId, setSelectedAssignmentId] = useState('');

    // Single Lookup State
    const [lookupQuery, setLookupQuery] = useState('');
    const [lookupResult, setLookupResult] = useState(null);
    const [lookupOptions, setLookupOptions] = useState([]);
    const [isLookingUp, setIsLookingUp] = useState(false);
    const [lookupError, setLookupError] = useState('');

    const [isImporting, setIsImporting] = useState(false);

    // Disable auto-load effect since we have a button now
    useEffect(() => {
        if (state.directoryCache) {
            setApiData(state.directoryCache);
        }
    }, [state.directoryCache]);

    const loadApiBooks = async () => {
        const apiKey = localStorage.getItem('ch_api_key');
        const proxyUrl = localStorage.getItem('ch_proxy_url') || '';

        if (!apiKey) {
            confirm({ title: 'Configuration Missing', message: 'No API Key configured. Please configure it in the settings.', type: 'alert', variant: 'warning' });
            return;
        }

        setIsLoadingBooks(true);
        try {
            const data = await getAssignedPriceBooks(apiKey, proxyUrl);

            // Extract distinct entities for individual dropdowns
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

            const newData = {
                assignments: data,
                customers: Array.from(customersMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
                books: Array.from(booksMap.values()).sort((a, b) => a.name.localeCompare(b.name))
            };

            dispatch({ type: 'SET_DIRECTORY_CACHE', payload: newData });
            setApiData(newData);

        } catch (err) {
            console.error(err);
            confirm({ title: 'Connection Error', message: "Failed to load assigned price books: " + err.message, type: 'alert', variant: 'danger' });
        } finally {
            setIsLoadingBooks(false);
        }
    };

    const performImport = async (xml, targetBookId, selectedBookName, customerApiId = '', payerId = '') => {
        const syntheticJsonPayload = {
            book_name: selectedBookName,
            specification: xml,
            cxAPIId: targetBookId
        };
        const newState = parseXMLToState(xml, syntheticJsonPayload);
        if (newState) {
            const hasData = state.priceBook.ruleGroups.some(g => g.startDate || g.rules.some(r => r.name || r.adjustment));
            if (!hasData || await confirm({
                title: 'Confirm Import',
                message: "Importing will overwrite current data. Continue?",
                variant: 'danger',
                confirmLabel: 'Overwrite Data'
            })) {
                newState.cxAPIId = targetBookId;
                newState.bookName = selectedBookName;
                newState.customerApiId = customerApiId;
                newState.cxPayerId = payerId;
                dispatch({ type: 'IMPORT_DATA', payload: newState });
            }
        } else {
            confirm({ title: 'Parse Error', message: "Failed to parse the fetched specification.", type: 'alert', variant: 'danger' });
        }
    };

    const fetchAssignmentTarget = async (targetId) => {
        const apiKey = localStorage.getItem('ch_api_key');
        const proxyUrl = localStorage.getItem('ch_proxy_url') || '';

        setIsLookingUp(true);
        setLookupError('');
        setLookupResult(null);
        setLookupOptions([]);

        try {
            const assignment = await getSingleCustomerAssignment(targetId, apiKey, proxyUrl);
            if (!assignment) {
                setLookupError(`No price book assigned to customer ID ${targetId}`);
            } else {
                setLookupResult(assignment);
            }
        } catch (err) {
            console.error(err);
            setLookupError(err.message);
        } finally {
            setIsLookingUp(false);
        }
    };

    const handleSingleLookup = async () => {
        if (!lookupQuery.trim()) return;

        const apiKey = localStorage.getItem('ch_api_key');
        const proxyUrl = localStorage.getItem('ch_proxy_url') || '';

        if (!apiKey) {
            confirm({ title: 'Configuration Missing', message: 'No API Key configured. Please configure it in the settings.', type: 'alert', variant: 'warning' });
            return;
        }

        setIsLookingUp(true);
        setLookupError('');
        setLookupResult(null);
        setLookupOptions([]);

        try {
            let targetId = lookupQuery.trim();

            if (!/^\d+$/.test(targetId)) {
                // Name lookup
                const results = await searchCustomerByName(targetId, apiKey, proxyUrl);
                if (results.length === 0) {
                    throw new Error(`No customer found matching "${targetId}"`);
                }

                // Use Promise.all to fetch assignments concurrently for much faster lookup speeds
                const validOptions = (await Promise.all(
                    results.map(async (potentialCustomer) => {
                        try {
                            const assignment = await getSingleCustomerAssignment(potentialCustomer.id.toString(), apiKey, proxyUrl);
                            if (assignment) return potentialCustomer;
                        } catch (e) {
                            // Ignore execution errors on individual lookups
                        }
                        return null;
                    })
                )).filter(Boolean);

                if (validOptions.length === 0) {
                    throw new Error(`Found customers matching "${targetId}", but none have active pricebooks.`);
                } else if (validOptions.length > 1) {
                    setLookupOptions(validOptions);
                    return; // Wait for user choice, keep data in options
                }

                // Only 1 result has a CPB - proceed automatically
                targetId = validOptions[0].id.toString();
            }

            // A single ID to fetch
            await fetchAssignmentTarget(targetId);
        } catch (err) {
            console.error(err);
            setLookupError(err.message);
        } finally {
            setIsLookingUp(false);
        }
    };

    const handleLookupImport = async () => {
        if (!lookupResult) return;
        const apiKey = localStorage.getItem('ch_api_key');
        const proxyUrl = localStorage.getItem('ch_proxy_url') || '';

        setIsImporting(true);
        try {
            const xml = await getPriceBookSpecification(lookupResult.price_book_id, apiKey, proxyUrl);
            performImport(xml, lookupResult.price_book_id.toString(), lookupResult.book_name, lookupResult.target_client_api_id.toString(), lookupResult.billing_account_owner_id || 'ALL');
        } catch (err) {
            console.error(err);
            confirm({ title: 'Sync Error', message: "Failed to import from API: " + err.message, type: 'alert', variant: 'danger' });
        } finally {
            setIsImporting(false);
        }
    };

    const handleApiImport = async () => {
        if (!selectedBookId) return;

        const apiKey = localStorage.getItem('ch_api_key');
        const proxyUrl = localStorage.getItem('ch_proxy_url') || '';

        let targetBookId = selectedBookId;
        let selectedBookName = apiData.books.find(b => b.id.toString() === selectedBookId)?.name || 'Imported Book';

        let importedCustomer = '';
        let importedPayer = '';

        // If assignment is selected, fetch the associated pricebook ID
        if (selectedAssignmentId) {
            const assignment = apiData.assignments.find(a => a.assignment_id.toString() === selectedAssignmentId);
            if (assignment) {
                targetBookId = assignment.id.toString();
                selectedBookName = assignment.book_name;
                importedCustomer = assignment.target_client_api_id.toString();
                importedPayer = assignment.billing_account_owner_id || 'ALL';
            }
        }

        setIsImporting(true);
        try {
            const xml = await getPriceBookSpecification(targetBookId, apiKey, proxyUrl);
            performImport(xml, targetBookId, selectedBookName, importedCustomer, importedPayer);
        } catch (err) {
            console.error(err);
            confirm({ title: 'Sync Error', message: "Failed to import from API: " + err.message, type: 'alert', variant: 'danger' });
        } finally {
            setIsImporting(false);
        }
    };

    const processContent = async (content) => {
        try {
            let newState;
            const trimmed = content.trim();

            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                let json;
                try {
                    // Try standard parse first
                    json = JSON.parse(trimmed);
                } catch (e) {
                    console.warn("Standard JSON parse failed, attempting loose parse...", e);
                    try {
                        // Try removing newlines
                        const loose = trimmed.replace(/[\r\n]+/g, ' ');
                        json = JSON.parse(loose);
                    } catch (e2) {
                        console.warn("Loose JSON parse failed, attempting manual extraction...", e2);

                        // Manual fallback similar to OG script.js
                        const bookNameMatch = trimmed.match(/"book_name"\s*:\s*"([^"]*)"/);
                        const specStart = trimmed.indexOf('"specification"');

                        if (specStart !== -1) {
                            const specColon = trimmed.indexOf(':', specStart);
                            const specQuoteStart = trimmed.indexOf('"', specColon + 1);

                            if (specQuoteStart !== -1) {
                                let specContent = trimmed.substring(specQuoteStart + 1);

                                // Find closing quote, respecting escapes
                                let specQuoteEnd = -1;
                                for (let i = 0; i < specContent.length; i++) {
                                    if (specContent[i] === '"' && (i === 0 || specContent[i - 1] !== '\\')) {
                                        specQuoteEnd = i;
                                        break;
                                    }
                                }

                                if (specQuoteEnd !== -1) {
                                    specContent = specContent.substring(0, specQuoteEnd);

                                    // Unescape the extracted content
                                    const xmlString = specContent
                                        .replace(/\\"/g, '"')
                                        .replace(/\\n/g, '\n')
                                        .replace(/\\r/g, '\r')
                                        .replace(/\\t/g, '\t')
                                        .replace(/\\\\/g, '\\');

                                    json = {
                                        book_name: bookNameMatch ? bookNameMatch[1] : 'Unknown',
                                        specification: xmlString
                                    };
                                }
                            }
                        }
                    }
                }

                if (json && json.specification) {
                    newState = parseXMLToState(json.specification, json);
                } else {
                    confirm({
                        title: 'Parse Error',
                        message: "Failed to parse JSON. Please ensure it contains a valid 'specification' field.",
                        type: 'alert',
                        variant: 'danger'
                    });
                    return;
                }
            } else {
                newState = parseXMLToState(trimmed);
            }

            if (newState) {
                // Check if current state has meaningful data
                const hasData = state.priceBook.ruleGroups.some(g => g.startDate || g.rules.some(r => r.name || r.adjustment));

                if (!hasData || await confirm({
                    title: 'Confirm Import',
                    message: "Importing will overwrite current data. Continue?",
                    variant: 'danger',
                    confirmLabel: 'Overwrite Data'
                })) {
                    dispatch({ type: 'IMPORT_DATA', payload: newState });
                    setTextInput('');
                }
            }
        } catch (err) {
            console.error(err);
            confirm({ title: 'Import Error', message: "Failed to import: " + err.message, type: 'alert', variant: 'danger' });
        }
    };

    const handleFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => processContent(ev.target.result);
        reader.readAsText(file);
        if (e.target.value) e.target.value = '';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => processContent(ev.target.result);
            reader.readAsText(file);
        }
    };

    return (
        <div ref={containerRef} style={{
            boxShadow: 'none',
            border: 'none',
            padding: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <div
                className="card"
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                    maxWidth: '100%',
                    padding: 0,
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                    margin: 0,
                    borderColor: 'var(--border)',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    background: 'var(--bg-card)'
                }}
            >
                {/* Header */}
                <div
                    style={{
                        flex: '0 0 auto',
                        padding: '10px 24px',
                        background: 'rgba(139, 92, 246, 0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid var(--border)'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.2rem' }}>📥</span>
                        <span style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-main)' }}>
                            Import Existing Pricebook...
                        </span>
                    </div>
                </div>

                {/* Body */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', minHeight: 0 }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 24px' }}>
                        <div style={{ flex: '0 0 auto', display: 'flex', gap: '8px', marginBottom: '24px', padding: '4px', background: 'var(--bg-deep)', borderRadius: '12px' }}>
                            <Tooltip style={{ flex: 1, display: 'flex' }} title="File Upload" content="Select an XML or JSON pricebook specification from your computer" position="top">
                                <button
                                    onClick={() => setActiveTab('file')}
                                    style={{
                                        flex: 1,
                                        padding: '8px 12px',
                                        background: activeTab === 'file' ? 'var(--bg-card)' : 'transparent',
                                        color: activeTab === 'file' ? 'var(--primary)' : 'var(--text-muted)',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        transition: 'all 0.2s',
                                        boxShadow: activeTab === 'file' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    📂 Upload File
                                </button>
                            </Tooltip>
                            <Tooltip style={{ flex: 1, display: 'flex' }} title="Text Import" content="Paste raw XML or JSON content directly to parse it into the builder" position="top">
                                <button
                                    onClick={() => setActiveTab('text')}
                                    style={{
                                        flex: 1,
                                        padding: '8px 12px',
                                        background: activeTab === 'text' ? 'var(--bg-card)' : 'transparent',
                                        color: activeTab === 'text' ? 'var(--primary)' : 'var(--text-muted)',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        transition: 'all 0.2s',
                                        boxShadow: activeTab === 'text' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    📝 Paste Pricebook content
                                </button>
                            </Tooltip>
                            {isElectronApp() && (
                                <Tooltip style={{ flex: 1, display: 'flex' }} title="Live Sync" content="Browse and import your existing pricebooks directly from CloudHealth API" position="top">
                                    <button
                                        onClick={() => setActiveTab('api')}
                                        style={{
                                            flex: 1,
                                            padding: '8px 12px',
                                            background: activeTab === 'api' ? 'var(--bg-card)' : 'transparent',
                                            color: activeTab === 'api' ? 'var(--primary)' : 'var(--text-muted)',
                                            border: 'none',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontWeight: 600,
                                            transition: 'all 0.2s',
                                            boxShadow: activeTab === 'api' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px'
                                        }}
                                    >
                                        ☁️ CloudHealth Live Sync
                                    </button>
                                </Tooltip>
                            )}
                        </div>

                        <AnimatePresence mode="wait">
                            {activeTab === 'file' ? (
                                <motion.div
                                    key="file"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    transition={{ duration: 0.2 }}
                                    style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100px' }}
                                >
                                    <div
                                        className={`drop-zone ${isDragging ? 'active' : ''}`}
                                        onDragEnter={handleDragOver}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        onClick={() => fileInput.current?.click()}
                                        style={{
                                            border: `2px dashed ${isDragging ? 'var(--primary)' : 'var(--border)'}`,
                                            borderRadius: '12px',
                                            flex: 1,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            padding: '16px',
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                            background: isDragging ? 'rgba(139, 92, 246, 0.05)' : 'transparent',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <input
                                            type="file"
                                            ref={fileInput}
                                            onChange={handleFile}
                                            style={{ display: 'none' }}
                                            accept=".json,.xml,.txt"
                                        />
                                        <div style={{ fontSize: '2.5rem', marginBottom: '12px', opacity: 0.8 }}>📂</div>
                                        <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: 'var(--text-main)' }}>Click or Drag File to Upload</h3>
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Supports .json, .xml, .txt</p>
                                    </div>
                                </motion.div>
                            ) : activeTab === 'text' ? (
                                <motion.div
                                    key="text"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ duration: 0.2 }}
                                    style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
                                >
                                    <textarea
                                        value={textInput}
                                        onChange={(e) => setTextInput(e.target.value)}
                                        placeholder="Paste your JSON or XML content here..."
                                        style={{
                                            flex: 1,
                                            fontFamily: 'monospace',
                                            resize: 'vertical',
                                            marginBottom: '16px',
                                            fontSize: '0.9rem',
                                            colorScheme: 'dark'
                                        }}
                                    />
                                    <div style={{ flex: '0 0 auto', textAlign: 'center' }}>
                                        <button
                                            className="button"
                                            onClick={() => processContent(textInput)}
                                            disabled={!textInput.trim()}
                                            style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                                        >
                                            Load Configuration
                                        </button>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="api"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ duration: 0.2 }}
                                    style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
                                >
                                    {!localStorage.getItem('ch_api_key') ? (
                                        <div style={{
                                            flex: 1,
                                            width: '100%',
                                            padding: '16px',
                                            background: 'var(--bg-deep)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '12px',
                                            color: 'var(--text-main)',
                                            marginBottom: '16px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            gap: '20px'
                                        }}>
                                            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔑</div>
                                                <h3 style={{ color: 'var(--text-main)', margin: '0 0 8px 0' }}>API Key Required</h3>
                                                <p style={{ margin: 0 }}>Please configure your CloudHealth API Token in the settings (Gear Icon) to use this integration.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', gap: '20px', alignItems: 'stretch' }}>

                                            {/* LEFT SIDE: Targeted Lookup */}
                                            <div style={{
                                                flex: 1,
                                                padding: '24px',
                                                background: 'var(--bg-card)',
                                                border: '1px solid var(--border)',
                                                borderRadius: '12px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '16px'
                                            }}>
                                                <div style={{ flex: 1 }}>
                                                    <h3 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        🎯 Quick Customer Search
                                                    </h3>
                                                    <p style={{ margin: '0 0 8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                                        Quickly search for a client and fetch their active custom pricebook seamlessly online.
                                                    </p>
                                                </div>

                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    <input
                                                        type="text"
                                                        value={lookupQuery}
                                                        onChange={(e) => setLookupQuery(e.target.value)}
                                                        placeholder="Customer Name or API ID..."
                                                        style={{
                                                            flex: 1,
                                                            height: '42px',
                                                            fontSize: '0.9rem'
                                                        }}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleSingleLookup()}
                                                    />
                                                    <button
                                                        onClick={handleSingleLookup}
                                                        disabled={isLookingUp || !lookupQuery.trim()}
                                                        className="button"
                                                        style={{
                                                            height: '42px',
                                                            padding: '0 20px',
                                                            fontSize: '0.9rem',
                                                            opacity: isLookingUp ? 0.7 : 1,
                                                            boxSizing: 'border-box',
                                                            margin: 0,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}
                                                    >
                                                        {isLookingUp ? 'Searching...' : 'Find'}
                                                    </button>
                                                </div>

                                                {lookupError && (
                                                    <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', fontSize: '0.9rem' }}>
                                                        {lookupError}
                                                    </div>
                                                )}

                                                {lookupOptions.length > 0 && (
                                                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '4px' }}>Multiple customers found. Please select one:</div>
                                                        {lookupOptions.map(opt => (
                                                            <button
                                                                key={opt.id}
                                                                onClick={() => fetchAssignmentTarget(opt.id.toString())}
                                                                className="button-ghost"
                                                                style={{
                                                                    width: '100%',
                                                                    justifyContent: 'flex-start',
                                                                    padding: '12px 16px',
                                                                    borderRadius: '8px',
                                                                    background: 'var(--bg-deep)'
                                                                }}
                                                            >
                                                                <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>
                                                                    {opt.name} <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>({opt.id})</span>
                                                                </span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}

                                                {lookupResult && (
                                                    <div style={{
                                                        marginTop: '16px',
                                                        padding: '16px',
                                                        borderRadius: '8px',
                                                        background: 'var(--bg-deep)',
                                                        border: '1px solid var(--primary)',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '12px'
                                                    }}>
                                                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Target Found:</div>
                                                        <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '4px' }}>
                                                            {lookupResult.customer_name}
                                                        </div>
                                                        <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: '1.6' }}>
                                                            <span style={{ color: 'var(--text-secondary)' }}>Customer ID:</span> {lookupResult.target_client_api_id} <br />
                                                            <span style={{ color: 'var(--text-secondary)' }}>PriceBook ID:</span> {lookupResult.price_book_id} <br />
                                                            <span style={{ color: 'var(--text-secondary)' }}>PriceBook Name:</span> {lookupResult.book_name} <br />
                                                            <span style={{ color: 'var(--text-secondary)' }}>Payer Account:</span> {lookupResult.billing_account_owner_id}
                                                        </div>

                                                        <button
                                                            onClick={handleLookupImport}
                                                            disabled={isImporting}
                                                            className="button"
                                                            style={{
                                                                width: '100%',
                                                                marginTop: '8px',
                                                                padding: '10px 14px',
                                                                fontSize: '0.9rem',
                                                                fontWeight: 'bold',
                                                                justifyContent: 'center',
                                                                opacity: isImporting ? 0.7 : 1
                                                            }}
                                                        >
                                                            {isImporting ? 'Downloading...' : 'Import Found Pricebook'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* RIGHT SIDE: Global Browser */}
                                            <div style={{
                                                flex: 1,
                                                padding: '24px',
                                                background: 'var(--bg-card)',
                                                border: '1px solid var(--border)',
                                                borderRadius: '12px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '16px'
                                            }}>
                                                <div style={{ flex: 1 }}>
                                                    <h3 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            🌍 List all active Pricebooks
                                                        </div>
                                                        {apiData.assignments.length > 0 && (
                                                            <Tooltip title="Refresh" content="Re-fetch the entire directory catalog from CloudHealth API" position="top">
                                                                <button
                                                                    onClick={loadApiBooks}
                                                                    disabled={isLoadingBooks}
                                                                    style={{
                                                                        padding: '6px 12px',
                                                                        fontSize: '0.85rem',
                                                                        borderRadius: '8px',
                                                                        background: 'rgba(139, 92, 246, 0.1)',
                                                                        color: 'var(--primary)',
                                                                        border: '1px solid rgba(139, 92, 246, 0.2)',
                                                                        cursor: isLoadingBooks ? 'not-allowed' : 'pointer',
                                                                        opacity: isLoadingBooks ? 0.6 : 1,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '6px',
                                                                        fontWeight: 600,
                                                                        transition: 'all 0.2s ease',
                                                                        boxShadow: 'none'
                                                                    }}
                                                                    onMouseEnter={(e) => {
                                                                        if (!isLoadingBooks) e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)';
                                                                    }}
                                                                    onMouseLeave={(e) => {
                                                                        if (!isLoadingBooks) e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)';
                                                                    }}
                                                                >
                                                                    <FaSyncAlt className={isLoadingBooks ? 'spin' : ''} /> Refresh
                                                                </button>
                                                            </Tooltip>
                                                        )}
                                                    </h3>
                                                    <p style={{ margin: '0 0 12px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                                        Lookup mappings across all assigned accounts globally. <em>This lookup parses all pricebook data in your organization.</em>
                                                    </p>
                                                </div>

                                                {isLoadingBooks ? (
                                                    <motion.div
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        style={{
                                                            flex: 1,
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            minHeight: '200px',
                                                            background: 'rgba(139, 92, 246, 0.05)',
                                                            borderRadius: '12px',
                                                            border: '1px dashed var(--primary)'
                                                        }}
                                                    >
                                                        <motion.div
                                                            animate={{ rotate: 360 }}
                                                            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                                            style={{ fontSize: '2.5rem', marginBottom: '16px' }}
                                                        >
                                                            ⏳
                                                        </motion.div>
                                                        <h4 style={{ margin: '0 0 8px 0', color: 'var(--primary)' }}>Syncing Directory</h4>
                                                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '280px', textAlign: 'center' }}>
                                                            Collecting globally assigned pricebooks securely from CloudHealth...
                                                        </p>
                                                    </motion.div>
                                                ) : apiData.assignments.length === 0 ? (
                                                    <div style={{ marginTop: 'auto' }}>
                                                        <button onClick={loadApiBooks} className="button" style={{ width: '100%', padding: '10px 14px', fontSize: '0.9rem', fontWeight: 'bold', justifyContent: 'center' }}>
                                                            Scan All Connected Pricebooks
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                                                        <div>
                                                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>1. Select Customer (Target Client)</label>
                                                            <select
                                                                value={selectedCustomerId}
                                                                onChange={e => {
                                                                    const cid = e.target.value;
                                                                    setSelectedCustomerId(cid);
                                                                    setSelectedAssignmentId('');
                                                                    setSelectedBookId('');

                                                                    if (cid) {
                                                                        const matches = apiData.assignments.filter(a => a.is_assigned && a.target_client_api_id?.toString() === cid);
                                                                        if (matches.length > 0) {
                                                                            setSelectedBookId(matches[0].id.toString());
                                                                            setSelectedAssignmentId(matches[0].assignment_id?.toString() ?? '');
                                                                        }
                                                                    }
                                                                }}
                                                                style={{
                                                                    fontSize: '0.9rem'
                                                                }}
                                                            >
                                                                <option value="">-- All Customers --</option>
                                                                {apiData.customers
                                                                    .filter(c => c.id != null)
                                                                    .map(c => (
                                                                        <option key={c.id} value={c.id}>{c.name !== 'Unknown Customer' ? c.name : c.id}</option>
                                                                    ))}
                                                            </select>
                                                        </div>

                                                        <div>
                                                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>2. Select Price Book</label>
                                                            <select
                                                                value={selectedBookId}
                                                                onChange={e => {
                                                                    setSelectedBookId(e.target.value);
                                                                    setSelectedAssignmentId('');
                                                                    if (e.target.value) {
                                                                        const matchingAssignments = apiData.assignments.filter(a => a.is_assigned && a.id.toString() === e.target.value);
                                                                        if (matchingAssignments.length === 1 && !selectedCustomerId) {
                                                                            setSelectedCustomerId(matchingAssignments[0].target_client_api_id?.toString() ?? '');
                                                                        }
                                                                    }
                                                                }}
                                                                style={{
                                                                    fontSize: '0.9rem'
                                                                }}
                                                            >
                                                                <option value="">-- All Price Books --</option>
                                                                {selectedCustomerId ? (
                                                                    apiData.assignments
                                                                        .filter(a => a.is_assigned && a.target_client_api_id?.toString() === selectedCustomerId)
                                                                        .filter((a, index, self) => index === self.findIndex((t) => t.id === a.id))
                                                                        .map(b => (
                                                                            <option key={b.id} value={b.id}>{b.book_name} ({b.id})</option>
                                                                        ))
                                                                ) : (
                                                                    apiData.books
                                                                        .filter(b => b.id != null)
                                                                        .map(b => (
                                                                            <option key={b.id} value={b.id}>{b.name} ({b.id})</option>
                                                                        ))
                                                                )}
                                                            </select>
                                                        </div>

                                                        <div>
                                                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>3. Billing Account Name</label>
                                                            <select
                                                                value={selectedAssignmentId}
                                                                onChange={e => {
                                                                    setSelectedAssignmentId(e.target.value);
                                                                    if (e.target.value) {
                                                                        const match = apiData.assignments.find(a => a.assignment_id != null && a.assignment_id.toString() === e.target.value);
                                                                        if (match) {
                                                                            setSelectedCustomerId(match.target_client_api_id?.toString() ?? '');
                                                                            setSelectedBookId(match.id.toString());
                                                                        }
                                                                    }
                                                                }}
                                                                style={{
                                                                    fontSize: '0.9rem'
                                                                }}
                                                            >
                                                                <option value="" disabled>-- Select a Mapped Assignment --</option>
                                                                {apiData.assignments
                                                                    .filter(a => a.is_assigned && a.assignment_id != null)
                                                                    .filter(a => (!selectedCustomerId || a.target_client_api_id?.toString() === selectedCustomerId) &&
                                                                        (!selectedBookId || a.id.toString() === selectedBookId))
                                                                    .map(a => (
                                                                        <option key={a.assignment_id} value={a.assignment_id}>
                                                                            {a.billing_account_owner_id !== 'ALL' && a.billing_account_owner_id !== 'N/A' ? `${a.billing_account_owner_id} (ID: ${a.assignment_id})` : `All Accounts (ID: ${a.assignment_id})`}
                                                                        </option>
                                                                    ))}
                                                            </select>
                                                        </div>

                                                        <button
                                                            onClick={handleApiImport}
                                                            disabled={!selectedBookId && !selectedAssignmentId || isImporting}
                                                            style={{
                                                                width: '100%',
                                                                marginTop: '8px',
                                                                padding: '10px 14px',
                                                                fontSize: '0.9rem',
                                                                background: (!selectedBookId && !selectedAssignmentId) || isImporting ? 'var(--bg-deep)' : 'var(--primary)',
                                                                color: (!selectedBookId && !selectedAssignmentId) || isImporting ? 'var(--text-muted)' : '#fff',
                                                                border: 'none',
                                                                borderRadius: '8px',
                                                                fontWeight: 600,
                                                                cursor: (!selectedBookId && !selectedAssignmentId) || isImporting ? 'not-allowed' : 'pointer',
                                                                opacity: isImporting ? 0.7 : 1
                                                            }}
                                                        >
                                                            {isImporting ? 'Pulling from CloudHealth...' : 'Import Selected Price Book'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}
export default ImportSection;
