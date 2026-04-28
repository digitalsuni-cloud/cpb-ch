import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { usePriceBook } from '../context/PriceBookContext';
import { generateXML } from '../utils/converter';
import { createPriceBook, updatePriceBook, deletePriceBook, assignPriceBook, performDryRun, getPriceBookSpecification, getSingleCustomerAssignment, fetchAllCustomers, fetchAllPriceBooks, fetchPriceBookById, fetchAllPriceBookAssignments, fetchAwsAccountAssignments, clearAwsCache, ApiAuthError } from '../utils/chApi';
import ToggleSwitch from './ToggleSwitch';
import { logPricebookCreate, logPricebookUpdate, logAssignmentUpdate, logDryRun } from '../utils/history/historyLogger';
import { FaWindows, FaApple, FaLinux, FaDownload, FaSyncAlt, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import Tooltip from './Tooltip';
import { useConfirm } from '../context/ConfirmContext';
import { getCredential } from "../utils/credentials";
import CustomSelect from './CustomSelect';


const DeploySection = ({ autoAssign = false, onAutoAssignConsumed, showToast }) => {
    const { state, dispatch } = usePriceBook();
    const confirm = useConfirm();
    const [actionType, setActionType] = useState('update'); // 'update' or 'create'
    const [priceBookId, setPriceBookId] = useState(state.priceBook.cxAPIId || '');
    const [newPricebookName, setNewPricebookName] = useState('');
    const [assignCustomer, setAssignCustomer] = useState(false);
    const [customerId, setCustomerId] = useState(state.priceBook.customerApiId || '');
    const [billingAccountOwnerId, setBillingAccountOwnerId] = useState(state.priceBook.cxPayerId || 'ALL');
    const [customerOptions, setCustomerOptions] = useState([]);
    const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
    const [priceBookOptions, setPriceBookOptions] = useState([]);
    const [isLoadingPriceBooks, setIsLoadingPriceBooks] = useState(false);
    const [priceBookAssignments, setPriceBookAssignments] = useState([]);
    const [assignPayerOptions, setAssignPayerOptions] = useState([]);
    const [isLoadingAssignPayers, setIsLoadingAssignPayers] = useState(false);
    const [dryRunPayerOptions, setDryRunPayerOptions] = useState([]);
    const [isLoadingDryRunPayers, setIsLoadingDryRunPayers] = useState(false);

    // Fetch customers (standard list for suggestions)
    useEffect(() => {
        let mounted = true;
        const loadCustomers = async () => {
            const apiKey = getCredential('ch_api_key');
            if (!apiKey) return;
            setIsLoadingCustomers(true);
            try {
                const proxyUrl = getCredential('ch_proxy_url') || '';
                const customers = await fetchAllCustomers(apiKey, proxyUrl);
                if (mounted) setCustomerOptions(customers || []);
            } catch (e) {
                console.warn('Failed to fetch customers', e);
            } finally {
                if (mounted) setIsLoadingCustomers(false);
            }
        };
        loadCustomers();
        return () => { mounted = false; };
    }, []);

    // Fetch pricebooks (lightweight list for suggestions)
    useEffect(() => {
        let mounted = true;
        const loadPriceBooks = async () => {
            const apiKey = getCredential('ch_api_key');
            if (!apiKey) return;
            setIsLoadingPriceBooks(true);
            try {
                const proxyUrl = getCredential('ch_proxy_url') || '';
                // We only fetch the base books and assignments (IDs), no heavy customer expansion here
                const [books, assignments] = await Promise.all([
                    fetchAllPriceBooks(apiKey, proxyUrl),
                    fetchAllPriceBookAssignments(apiKey, proxyUrl).catch(() => [])
                ]);
                if (mounted) {
                    setPriceBookOptions(books || []);
                    setPriceBookAssignments(assignments || []);
                }
            } catch (e) {
                console.warn('Failed to fetch initial pricebook view', e);
            } finally {
                if (mounted) setIsLoadingPriceBooks(false);
            }
        };
        loadPriceBooks();
        return () => { mounted = false; };
    }, []);

    // Lazy-fetch for manually entered Price Book metadata
    const [inferredPriceBook, setInferredPriceBook] = useState(null); // { id, name }
    const [isFetchingInfo, setIsFetchingInfo] = useState(false);

    // Debounced ID Lookup for Price Book Name when typed manually
    useEffect(() => {
        if (!priceBookId || priceBookId.length < 8) {
            setInferredPriceBook(null);
            return;
        }

        const timer = setTimeout(async () => {
            // Already known?
            if (priceBookOptions.some(pb => String(pb.id) === String(priceBookId))) return;

            const apiKey = getCredential('ch_api_key');
            const proxyUrl = getCredential('ch_proxy_url') || '';
            if (!apiKey) return;

            setIsFetchingInfo(true);
            try {
                const pb = await fetchPriceBookById(priceBookId, apiKey, proxyUrl);
                setInferredPriceBook({ id: priceBookId, name: pb.book_name || pb.name });
            } catch (e) {
                // Silent fail for typo/non-existent IDs
                setInferredPriceBook(null);
            } finally {
                setIsFetchingInfo(false);
            }
        }, 800);

        return () => clearTimeout(timer);
    }, [priceBookId, priceBookOptions]);

    const findPriceBookMatch = (id) => {
        if (!id) return null;
        const local = priceBookOptions.find(pb => String(pb.id) === String(id));
        if (local) return { id: local.id, book_name: local.book_name };
        if (inferredPriceBook && String(inferredPriceBook.id) === String(id)) return { id: inferredPriceBook.id, book_name: inferredPriceBook.name };
        return null;
    };

    const selectedPriceBook = findPriceBookMatch(priceBookId);

    // Dry Run Helpers
    const getMonthOptions = () => {
        const options = [];
        const d = new Date();
        for (let i = 0; i < 12; i++) {
            const label = d.toLocaleString('default', { month: 'short' }) + ' ' + d.getFullYear();
            const yearStr = d.getFullYear();
            const monthStr = String(d.getMonth() + 1).padStart(2, '0');
            options.push({ label, value: `${yearStr}-${monthStr}-01` });
            d.setMonth(d.getMonth() - 1);
        }
        return options;
    };
    const monthOptions = getMonthOptions();

    // Auto-extract first numeric sequence from Context's Payer IDs, otherwise empty.
    const extractPayerId = (str) => {
        if (!str) return '';
        const match = str.match(/\d+/);
        return match ? match[0] : '';
    };

    // States for Dry Run and Deployment
    const [isDryRun, setIsDryRun] = useState(false);
    const [dryRunStartDate, setDryRunStartDate] = useState(monthOptions[0].value);
    const [dryRunPayerId, setDryRunPayerId] = useState(() => String(extractPayerId(state.priceBook.cxPayerId) || ''));
    const [dryRunCustomerId, setDryRunCustomerId] = useState(String(state.priceBook.customerApiId || ''));

    // Helper: fetch payer options for a given customer, optionally force-refreshing the cache.
    // Only fires the API call if 'cid' exactly matches a known customer ID — ignores partial text input.
    const loadPayerOptions = async (cid, setter, loadingSetter, forceRefresh = false) => {
        if (!cid || cid.trim() === '') { setter([]); return; }
        // Guard: only proceed if the entered value is a known customer ID (prevents per-keystroke calls)
        const isKnown = customerOptions.some(c => String(c.id) === cid.trim());
        if (!isKnown && !forceRefresh) { setter([]); return; }
        const apiKey = getCredential('ch_api_key');
        const proxyUrl = getCredential('ch_proxy_url') || '';
        if (!apiKey) return;
        if (forceRefresh) clearAwsCache(cid.trim());
        loadingSetter(true);
        try {
            const assignments = await fetchAwsAccountAssignments(cid.trim(), apiKey, proxyUrl, forceRefresh);
            const opts = [...new Set(assignments.map(a => a.payer_account_owner_id).filter(Boolean))];
            setter(opts);
        } catch (e) {
            console.warn('Failed to load payer options', e);
        } finally {
            loadingSetter(false);
        }
    };

    // Fetch payer options when Assign-section customer ID changes
    const prevAssignCustomer = useRef(customerId);
    useEffect(() => {
        if (prevAssignCustomer.current !== customerId) {
            setBillingAccountOwnerId('');
            prevAssignCustomer.current = customerId;
        }
        loadPayerOptions(customerId, setAssignPayerOptions, setIsLoadingAssignPayers);
    }, [customerId, customerOptions]);

    useEffect(() => {
        if (assignPayerOptions.length > 0 && !billingAccountOwnerId) {
            setBillingAccountOwnerId(assignPayerOptions[0]);
        }
    }, [assignPayerOptions]);

    // Fetch payer options when Dry Run customer ID changes
    const prevDryRunCustomer = useRef(dryRunCustomerId);
    useEffect(() => {
        if (prevDryRunCustomer.current !== dryRunCustomerId) {
            setDryRunPayerId('');
            prevDryRunCustomer.current = dryRunCustomerId;
        }
        loadPayerOptions(dryRunCustomerId, setDryRunPayerOptions, setIsLoadingDryRunPayers);
    }, [dryRunCustomerId, customerOptions]);

    useEffect(() => {
        if (dryRunPayerOptions.length > 0 && !dryRunPayerId) {
            setDryRunPayerId(dryRunPayerOptions[0]);
        }
    }, [dryRunPayerOptions]);


    // Smart auto-name: fetch fresh list, use base name as-is if free, else bump highest existing version
    useEffect(() => {
        const currentName = state.priceBook.bookName || 'New Pricebook';

        // Strip any existing version suffix (space/_/- followed by v<number>)
        const versionPattern = /[\s_-]v(\d+)$/i;
        const baseName = currentName.replace(versionPattern, '').trim();

        const apiKey = getCredential('ch_api_key');

        if (!apiKey) {
            // No API key yet — just use the base name
            setNewPricebookName(baseName);
            return;
        }

        let cancelled = false;
        const proxyUrl = getCredential('ch_proxy_url') || '';

        (async () => {
            let freshBooks = priceBookOptions; // start with cached
            try {
                // Force-refresh to check against truly latest list
                const fetched = await fetchAllPriceBooks(apiKey, proxyUrl, true);
                if (!cancelled) {
                    freshBooks = fetched || [];
                    setPriceBookOptions(freshBooks);
                }
            } catch (e) {
                console.warn('Could not refresh pricebook list for name check', e);
            }

            if (cancelled) return;

            // Check if base name (no version) already exists
            const exactMatch = freshBooks.some(
                pb => pb.book_name?.toLowerCase() === baseName.toLowerCase()
            );

            if (!exactMatch) {
                setNewPricebookName(baseName);
                return;
            }

            // Base name taken — find highest existing versioned name
            const escapedBase = baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const versionRegex = new RegExp(`^${escapedBase}[\\s_-]v(\\d+)$`, 'i');
            let maxVersion = 1;
            freshBooks.forEach(pb => {
                const m = pb.book_name?.match(versionRegex);
                if (m) maxVersion = Math.max(maxVersion, parseInt(m[1], 10));
            });

            // Preserve separator style from existing versioned books (default: space)
            const existingSample = freshBooks.find(pb => versionRegex.test(pb.book_name));
            let sep = ' ';
            if (existingSample) {
                const afterBase = existingSample.book_name.slice(baseName.length, -(String(maxVersion).length + 1));
                sep = afterBase || ' ';
            }

            setNewPricebookName(`${baseName}${sep}v${maxVersion + 1}`);
        })();

        return () => { cancelled = true; };
    }, [state.priceBook.bookName]);

    // Sync state if global context changes (e.g. from Directory loading)
    useEffect(() => {
        if (state.priceBook.cxAPIId) setPriceBookId(state.priceBook.cxAPIId);
        if (state.priceBook.customerApiId) setCustomerId(state.priceBook.customerApiId);
    }, [state.priceBook.cxAPIId, state.priceBook.customerApiId]);

    const selectedCustomer = customerOptions && customerOptions.find ? customerOptions.find(c => String(c.id) === String(customerId)) : null;
    const dryRunCustomer = customerOptions && customerOptions.find ? customerOptions.find(c => String(c.id) === String(dryRunCustomerId)) : null;

    // When navigated from Directory's "Edit Assignment" action, auto-open the assign section
    useEffect(() => {
        if (autoAssign) {
            setAssignCustomer(true);
            setActionType('create'); // Navigate to "Create New Pricebook" section as requested
            if (onAutoAssignConsumed) onAutoAssignConsumed();
        }
    }, [autoAssign]);

    const [isDeploying, setIsDeploying] = useState(false);
    const [deployStatus, setDeployStatus] = useState({ success: false, message: '', details: [] });

    // Auto-generate XML output on render for payload size check
    const { priceBook } = state;
    const hasValidGroups = priceBook.ruleGroups.some(group => group.startDate);
    const generatedXml = hasValidGroups ? generateXML(priceBook) : '';

    const handleDeploy = async () => {
        setIsDeploying(true);
        setDeployStatus({ success: false, message: 'Starting deployment...', details: [] });

        const apiKey = getCredential('ch_api_key');
        const proxyUrl = getCredential('ch_proxy_url') || '';

        if (!apiKey) {
            setDeployStatus({ success: false, message: 'API Key is missing. Check your Settings.', details: [] });
            setIsDeploying(false);
            return;
        }

        if (!generatedXml) {
            setDeployStatus({ success: false, message: 'No valid Pricebook configuration found. Ensure you have valid active rules.', details: [] });
            setIsDeploying(false);
            return;
        }

        const confirmMsg = (() => {
            if (isDryRun) {
                const parts = dryRunStartDate.split('-');
                const monthName = new Date(parts[0], parseInt(parts[1]) - 1).toLocaleString('default', { month: 'short' });
                return `Are you sure you want to run a Dry Run spanning since ${monthName} ${parts[0]} (${dryRunStartDate})?\n\nThis will evaluate the payload against CloudHealth backend asynchronously.`;
            }
            if (actionType === 'create') {
                return `Are you sure you want to CREATE a new Price Book on CloudHealth?\n\nThis will provision a fresh resource on your account.`;
            }
            // For update: show pricebook name and assigned customer from directory data
            const pbName = selectedPriceBook?.book_name || state.priceBook.bookName || `Price Book ${priceBookId}`;
            const pbAssignment = priceBookAssignments.find(a => String(a.id) === String(priceBookId));
            const assignedTo = pbAssignment ? pbAssignment.customer_name : null;
            let msg = `Are you sure you want to OVERWRITE "${pbName}" (ID: ${priceBookId})`;
            if (assignedTo) msg += ` assigned to "${assignedTo}"?`;
            else msg += `?`;
            return msg;
        })();

        if (!(await confirm(confirmMsg))) {
            setDeployStatus({ success: false, message: 'Deployment cancelled.', details: [] });
            setIsDeploying(false);
            return;
        }

        try {
            let deployedBookId = priceBookId;
            let finalBookName = selectedPriceBook?.book_name || state.priceBook.bookName || `Price Book ${priceBookId}`;

            if (isDryRun) {
                const custName = dryRunCustomer?.name || `Customer ${dryRunCustomerId}`;
                const bookName = state.priceBook.bookName || 'Pricebook';
                let tempBookId = null;

                setDeployStatus(prev => ({ ...prev, message: 'Launching Dry Run Evaluation...', details: ['Connecting to CloudHealth...'] }));

                try {
                    // Step 1: create temp pricebook
                    setDeployStatus(prev => ({ ...prev, details: [...prev.details, `🔧 Creating temporary pricebook for evaluation...`] }));
                    const dryRunRes = await performDryRun(
                        null,              // priceBookId — null triggers temp book creation
                        generatedXml,      // XML spec
                        dryRunStartDate,   // start month date
                        dryRunCustomerId,  // target client ID
                        dryRunPayerId,     // payer account
                        apiKey,
                        proxyUrl,
                        false              // useExistingId = false
                    );
                    tempBookId = dryRunRes.tempPriceBookId;

                    setDeployStatus(prev => ({
                        ...prev,
                        details: [
                            ...prev.details,
                            `✅ Temp pricebook created (ID: ${tempBookId})`,
                            `🚀 Dry run job submitted (Job ID: ${dryRunRes.id || 'N/A'})`
                        ]
                    }));

                    // Log success
                    logDryRun(bookName, dryRunCustomerId, custName, dryRunPayerId, dryRunStartDate, dryRunRes.id || 'N/A', tempBookId, true);

                    setDeployStatus({
                        success: true,
                        message: `Dry Run Submitted! (Job ID: ${dryRunRes.id || 'N/A'})`,
                        details: [
                            `✅ Temp pricebook created (ID: ${tempBookId})`,
                            `✅ Dry run queued successfully.`,
                            `Customer: ${custName} | Month: ${dryRunStartDate.substring(0, 7)}`,
                            'Results will be available in the CloudHealth platform under "Price Books" → "Dry Run Status".'
                        ]
                    });
                } catch (dryRunErr) {
                    console.error('Dry Run failed:', dryRunErr);

                    // If the dry_run PUT failed after temp book was created, the ID is on the error
                    const effectiveTempBookId = tempBookId ?? dryRunErr.tempPriceBookId ?? null;

                    // Try to clean up the temp pricebook
                    let tempBookDeletedOk = false;
                    if (effectiveTempBookId) {
                        try {
                            await deletePriceBook(effectiveTempBookId, apiKey, proxyUrl);
                            tempBookDeletedOk = true;
                        } catch (_) { /* silent cleanup */ }
                    }

                    // Log the failure — include the temp ID and whether cleanup succeeded
                    logDryRun(bookName, dryRunCustomerId, custName, dryRunPayerId, dryRunStartDate, 'FAILED', effectiveTempBookId, false, dryRunErr.message, tempBookDeletedOk);

                    const cleanupMsg = effectiveTempBookId
                        ? (tempBookDeletedOk
                            ? `Temp pricebook (ID: ${effectiveTempBookId}) was created and deleted.`
                            : `Temp pricebook (ID: ${effectiveTempBookId}) was created — manual deletion may be required.`)
                        : 'Temp pricebook was not created.';

                    setDeployStatus({
                        success: false,
                        message: `Dry Run Failed: ${dryRunErr.message}`,
                        details: [
                            `❌ ${dryRunErr.message}`,
                            cleanupMsg
                        ]
                    });
                }
                return;
            }


            if (actionType === 'create') {
                setDeployStatus(prev => ({ ...prev, message: 'Creating new Price Book...', details: ['Sending XML payload...'] }));
                const createRes = await createPriceBook(newPricebookName, generatedXml, apiKey, proxyUrl);
                deployedBookId = createRes?.price_book?.id || createRes?.id;
                finalBookName = newPricebookName;
                setDeployStatus(prev => ({ ...prev, details: [...(prev?.details || []), `✅ Created Price Book (ID: ${deployedBookId})`] }));
                
                // Log pricebook creation
                logPricebookCreate(deployedBookId, newPricebookName, generatedXml);
                
                // If auto-assignment is requested
                if (assignCustomer) {
                    setDeployStatus(prev => ({ ...prev, message: 'Assigning to customer...', details: [...(prev?.details || []), `Mapping to Client ${customerId}...`] }));
                    const assignRes = await assignPriceBook(deployedBookId, customerId, billingAccountOwnerId, apiKey, proxyUrl);
                    setDeployStatus(prev => ({ ...prev, details: [...(prev?.details || []), `✅ Assigned to Customer (Assignment ID: ${assignRes.assignmentId})`] }));
                    
                    // Log assignment
                    const custName = customerOptions.find(c => String(c.id) === String(customerId))?.name || (String(state.priceBook.customerApiId) === String(customerId) && state.priceBook.customerName ? state.priceBook.customerName : 'Customer');
                    logAssignmentUpdate(deployedBookId, finalBookName, customerId, custName, assignRes.assignmentId, billingAccountOwnerId, null, null, true);
                }
            } else {
                setDeployStatus(prev => ({ ...prev, message: 'Fetching original spec for history...', details: ['Fetching before state...'] }));
                let originalXml = '';
                try {
                    originalXml = await getPriceBookSpecification(priceBookId, apiKey, proxyUrl);
                } catch (e) {
                    console.warn("Could not fetch old XML, history will only have after XML", e);
                }

                setDeployStatus(prev => ({ ...prev, message: 'Updating Price Book...', details: ['Overwriting existing specification...'] }));
                await updatePriceBook(priceBookId, generatedXml, apiKey, proxyUrl);
                setDeployStatus(prev => ({ ...prev, details: [...(prev?.details || []), `✅ Successfully updated Price Book ${priceBookId}`] }));
                
                // Log update
                logPricebookUpdate(deployedBookId, finalBookName, originalXml, generatedXml);
                
                // If user toggled assign to a NEW customer during an update action
                if (assignCustomer) {
                    setDeployStatus(prev => ({ ...prev, message: 'Updating assignment...', details: [...(prev?.details || []), `Mapping to Client ${customerId}...`] }));
                    const assignRes = await assignPriceBook(priceBookId, customerId, billingAccountOwnerId, apiKey, proxyUrl);
                    setDeployStatus(prev => ({ ...prev, details: [...(prev?.details || []), `✅ Re-assigned to Customer (Assignment ID: ${assignRes.assignmentId})`] }));
                    
                    // Log assignment
                    const custName = customerOptions.find(c => String(c.id) === String(customerId))?.name || (String(state.priceBook.customerApiId) === String(customerId) && state.priceBook.customerName ? state.priceBook.customerName : 'Customer');
                    logAssignmentUpdate(priceBookId, finalBookName, customerId, custName, assignRes.assignmentId, billingAccountOwnerId, null, null, true);
                }
            }

            setDeployStatus({ success: true, message: 'Deployment Successful!', details: ['✅ All actions completed successfully.', `Pricebook Name: ${finalBookName}`, `Pricebook ID: ${deployedBookId}`] });
        } catch (error) {
            console.error('Deployment Error:', error);
            const safeNameForError = actionType === 'create' ? newPricebookName : (selectedPriceBook?.book_name || state.priceBook.bookName || `Price Book ${priceBookId}`);

            // Log the failure to action history
            if (actionType === 'create') {
                logPricebookCreate('FAILED', safeNameForError, generatedXml, false, error.message);
            } else {
                logPricebookUpdate(priceBookId, safeNameForError, null, generatedXml, false, error.message);
            }
            
            if (assignCustomer) {
                const custName = customerOptions.find(c => String(c.id) === String(customerId))?.name;
                const safeCustomerName = custName || 'Customer';
                logAssignmentUpdate(deployedBookId || 'PENDING', safeNameForError, customerId, safeCustomerName, null, billingAccountOwnerId || null, null, null, false, error.message);
            }

            if (error instanceof ApiAuthError) {
                showToast && showToast({ type: 'error', title: 'API Key Error', message: error.message, duration: 10000, dedupeKey: 'api-auth-error' });
                setDeployStatus(prev => ({ success: false, inProgress: false, message: 'Authentication failed — check your API key in Settings.', details: [...(prev?.details || []), `❌ ERROR: ${error.message}`] }));
            } else {
                setDeployStatus(prev => ({ success: false, inProgress: false, message: error.message, details: [...(prev?.details || []), `❌ ERROR: ${error.message}`] }));
            }
        } finally {
            setIsDeploying(false);
        }
    };

    const isBrowser = !navigator.userAgent.toLowerCase().includes('electron') && (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1');

    return (
        <div className="output-section card" style={{ position: 'relative', display: 'flex', flexDirection: 'column', padding: '24px', flex: 1, minHeight: 0, marginTop: '2px', boxSizing: 'border-box' }}>

            {/* Live Tenant Warning */}
            <div className="tenant-warning" style={{ marginBottom: '20px' }}>
                <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>⚠️</span>
                <p>
                    <strong>Live Tenant — Be Cautious:</strong> All actions in this section run directly on your CloudHealth tenant and take effect immediately. Please review your selections carefully before confirming.
                </p>
            </div>

            <datalist id="customer-suggestions">
                {customerOptions.map(c => (
                    <option key={c.id} value={c.id}>{`${c.name} (${c.id})`}</option>
                ))}
            </datalist>

            {!getCredential('ch_api_key') ? (
                <div style={{ padding: '24px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed var(--border)', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🔑</div>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>Configure your API Key in settings to enable direct 1-click deployments.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ background: 'var(--bg-deep)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                        <h4 style={{ margin: '0 0 16px', color: 'var(--text-main)' }}>1. Action Type</h4>
                        <div style={{ display: 'flex', gap: '16px' }}>
                            <div
                                onClick={() => setActionType('update')}
                                style={{
                                    flex: 1,
                                    padding: '16px',
                                    borderRadius: '8px',
                                    border: `1px solid ${actionType === 'update' ? 'var(--primary)' : 'var(--border)'}`,
                                    background: actionType === 'update' ? 'rgba(56, 189, 248, 0.05)' : 'rgba(255,255,255,0.02)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div style={{ 
                                    width: '20px', height: '20px', borderRadius: '50%', 
                                    border: `2px solid ${actionType === 'update' ? 'var(--primary)' : 'var(--text-muted)'}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    {actionType === 'update' && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--primary)' }} />}
                                </div>
                                <span style={{ fontWeight: 600, color: actionType === 'update' ? 'var(--primary)' : 'var(--text-secondary)', fontSize: '0.9rem' }}>MODIFY EXISTING PRICEBOOK</span>
                            </div>

                            <div
                                onClick={() => setActionType('create')}
                                style={{
                                    flex: 1,
                                    padding: '16px',
                                    borderRadius: '8px',
                                    border: `1px solid ${actionType === 'create' ? 'var(--primary)' : 'var(--border)'}`,
                                    background: actionType === 'create' ? 'rgba(56, 189, 248, 0.05)' : 'rgba(255,255,255,0.02)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div style={{ 
                                    width: '20px', height: '20px', borderRadius: '50%', 
                                    border: `2px solid ${actionType === 'create' ? 'var(--primary)' : 'var(--text-muted)'}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    {actionType === 'create' && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--primary)' }} />}
                                </div>
                                <span style={{ fontWeight: 600, color: actionType === 'create' ? 'var(--primary)' : 'var(--text-secondary)', fontSize: '0.9rem' }}>CREATE NEW PRICEBOOK</span>
                            </div>
                        </div>
                    </div>

                    {actionType === 'update' && (
                        <div style={{ background: 'var(--bg-deep)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h4 style={{ margin: 0, color: 'var(--text-main)' }}>2. Target Price Book ID</h4>
                            </div>
                            <div className="input-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    Select Pricebook {(isLoadingPriceBooks || isFetchingInfo) && <span className="spin" style={{ display: 'inline-block', fontSize: '0.8em' }}>⏳</span>}
                                    {!isLoadingPriceBooks && (
                                        <Tooltip title="Refresh Pricebooks" content="Re-fetch the pricebook list from CloudHealth API" position="top">
                                            <button
                                                onClick={async () => {
                                                    const apiKey = getCredential('ch_api_key');
                                                    const proxyUrl = getCredential('ch_proxy_url') || '';
                                                    if (!apiKey) return;
                                                    setIsLoadingPriceBooks(true);
                                                    try {
                                                        const books = await fetchAllPriceBooks(apiKey, proxyUrl);
                                                        setPriceBookOptions(books || []);
                                                    } catch (e) { console.warn(e); }
                                                    finally { setIsLoadingPriceBooks(false); }
                                                }}
                                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
                                                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
                                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                                            >
                                                <FaSyncAlt size={10} />
                                            </button>
                                        </Tooltip>
                                    )}
                                </label>
                                <input
                                    type="text"
                                    list="pricebook-suggestions"
                                    value={priceBookId}
                                    onChange={(e) => setPriceBookId(e.target.value)}
                                    placeholder="Select or enter Price Book ID (e.g. 137438954493)"
                                    autoComplete="off"
                                />
                                <datalist id="pricebook-suggestions">
                                    {priceBookOptions.map(pb => (
                                        <option key={pb.id} value={pb.id}>{`${pb.book_name} (${pb.id})`}</option>
                                    ))}
                                </datalist>
                            </div>
                            {selectedPriceBook && (
                                <div style={{ marginTop: '8px', padding: '8px 12px', background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.85rem' }}>📖</span>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {selectedPriceBook.book_name}
                                    </span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                                        (ID: {selectedPriceBook.id})
                                    </span>
                                </div>
                            )}
                            <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                Select or enter the CloudHealth Price Book ID to overwrite with your current payload ({generatedXml ? (new Blob([generatedXml]).size / 1024).toFixed(2) + ' KB' : 'Empty'}).
                            </p>
                        </div>
                    )}

                    {actionType === 'create' && (() => {
                        const nameExists = priceBookOptions.some(
                            pb => pb.book_name?.toLowerCase() === newPricebookName.trim().toLowerCase()
                        );
                        return (
                            <div style={{ background: 'var(--bg-deep)', padding: '20px', borderRadius: '12px', border: `1px solid ${nameExists ? 'rgba(245,158,11,0.4)' : 'var(--border)'}` }}>
                                <h4 style={{ margin: '0 0 16px', color: 'var(--text-main)' }}>2. New Price Book Name</h4>
                                <div className="input-group">
                                    <input
                                        type="text"
                                        value={newPricebookName}
                                        onChange={(e) => setNewPricebookName(e.target.value)}
                                        placeholder="Desired Name..."
                                        style={nameExists ? { borderColor: 'rgba(245,158,11,0.6)' } : {}}
                                    />
                                </div>
                                {nameExists && (
                                    <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        ⚠️ A pricebook with this name already exists. Deploying will create a duplicate — consider changing the name.
                                    </p>
                                )}
                                <p style={{ margin: `${nameExists ? '4px' : '8px'} 0 0`, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    Payload size: {generatedXml ? (new Blob([generatedXml]).size / 1024).toFixed(2) + ' KB' : 'Empty'}.
                                </p>
                            </div>
                        );
                    })()}

                    <div style={{ background: 'var(--bg-deep)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                        <h4 style={{ margin: '0', color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <ToggleSwitch
                                label={`${actionType === 'update' ? '3.' : '2.'} ASSIGN PRICEBOOK TO CUSTOMER`}
                                checked={assignCustomer}
                                onChange={setAssignCustomer}
                            />
                        </h4>

                        {assignCustomer && (
                            <div className="input-row" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)', alignItems: 'flex-start' }}>
                                <div className="input-group">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        Customer API ID <span style={{ color: 'var(--danger)' }}>*</span>
                                        <Tooltip title="Refresh" content="Re-fetch the customer list from CloudHealth API" position="top">
                                            <button
                                                onClick={async () => {
                                                    const apiKey = getCredential('ch_api_key');
                                                    const proxyUrl = getCredential('ch_proxy_url') || '';
                                                    if (!apiKey) return;
                                                    setIsLoadingCustomers(true);
                                                    try {
                                                        const c = await fetchAllCustomers(apiKey, proxyUrl, true);
                                                        setCustomerOptions(c || []);
                                                    } catch (e) { console.warn(e); }
                                                    finally { setIsLoadingCustomers(false); }
                                                }}
                                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
                                                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
                                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                                            >
                                                {isLoadingCustomers ? <span style={{ fontSize: '0.7rem' }}>⏳</span> : <FaSyncAlt size={11} />}
                                            </button>
                                        </Tooltip>
                                    </label>
                                    <input
                                        type="text"
                                        list="customer-suggestions"
                                        value={customerId}
                                        onChange={(e) => setCustomerId(e.target.value)}
                                        placeholder="Target Customer ID (e.g. 42346)"
                                        autoComplete="off"
                                    />
                                    {selectedCustomer && (
                                        <div style={{ marginTop: '4px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            {selectedCustomer.name}
                                        </div>
                                    )}
                                </div>

                                <div className="input-group">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        Payer Account ID
                                        {isLoadingAssignPayers && <span className="spin" style={{ display: 'inline-block', fontSize: '0.8em' }}>⏳</span>}
                                        {!isLoadingAssignPayers && (
                                            <Tooltip title="Refresh Payers" content="Re-fetch the account assignments for this customer" position="top">
                                                <button
                                                    onClick={() => loadPayerOptions(customerId, setAssignPayerOptions, setIsLoadingAssignPayers, true)}
                                                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
                                                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                                                >
                                                    <FaSyncAlt size={10} />
                                                </button>
                                            </Tooltip>
                                        )}
                                    </label>
                                    <CustomSelect
                                        value={billingAccountOwnerId || 'ALL'}
                                        onChange={(e) => setBillingAccountOwnerId(e.target.value)}
                                        options={[
                                            { value: 'ALL', label: 'ALL (Global Assignment)' },
                                            ...assignPayerOptions.map(opt => ({ value: opt, label: opt }))
                                        ]}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', alignItems: 'flex-start' }}>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                            Leave empty or enter 'ALL' for global assignment.
                                        </p>
                                        <div style={{ minHeight: '18px', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                                            {assignPayerOptions.length > 0 ? `${assignPayerOptions.length} payer account(s) found.` : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ background: 'var(--bg-deep)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                        <h4 style={{ margin: '0', color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <ToggleSwitch
                                label={`${actionType === 'update' ? '4.' : '3.'} EVALUATE DRY RUN BEFORE DEPLOY`}
                                checked={isDryRun}
                                onChange={setIsDryRun}
                            />
                        </h4>

                        {isDryRun && (
                            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                                <p style={{ margin: '0 0 16px', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                    Launch a safe simulation of this payload's impact without overwriting live mapping tables. Dry Run jobs run in the background on CloudHealth and must be reviewed in the CH Portal.
                                </p>
                                <div className="input-row" style={{ alignItems: 'flex-start' }}>
                                    <div className="input-group">
                                        <label>Evaluation Start Date</label>
                                        <CustomSelect
                                            value={dryRunStartDate}
                                            onChange={(e) => setDryRunStartDate(e.target.value)}
                                            options={monthOptions.map(opt => ({ value: opt.value, label: opt.label }))}
                                        />
                                    </div>

                                    <div className="input-group">
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            Customer API ID <span style={{ color: 'var(--danger)' }}>*</span>
                                            <Tooltip title="Refresh" content="Re-fetch the customer list from CloudHealth API" position="top">
                                                <button
                                                    onClick={async () => {
                                                        const apiKey = getCredential('ch_api_key');
                                                        const proxyUrl = getCredential('ch_proxy_url') || '';
                                                        if (!apiKey) return;
                                                        setIsLoadingCustomers(true);
                                                        try {
                                                            const c = await fetchAllCustomers(apiKey, proxyUrl, true);
                                                            setCustomerOptions(c || []);
                                                        } catch (e) { console.warn(e); }
                                                        finally { setIsLoadingCustomers(false); }
                                                    }}
                                                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
                                                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                                                >
                                                    {isLoadingCustomers ? <span style={{ fontSize: '0.7rem' }}>⏳</span> : <FaSyncAlt size={11} />}
                                                </button>
                                            </Tooltip>
                                        </label>
                                        <input
                                            type="text"
                                            list="customer-suggestions"
                                            value={dryRunCustomerId}
                                            onChange={(e) => setDryRunCustomerId(e.target.value)}
                                            placeholder="Target Customer ID (e.g. 42346)"
                                            autoComplete="off"
                                        />
                                        {dryRunCustomer && (
                                            <div style={{ marginTop: '4px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                {dryRunCustomer.name}
                                            </div>
                                        )}
                                    </div>

                                    <div className="input-group">
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            Payer Account ID
                                            {isLoadingDryRunPayers && <span className="spin" style={{ display: 'inline-block', fontSize: '0.8em' }}>⏳</span>}
                                            {!isLoadingDryRunPayers && (
                                                <Tooltip title="Refresh Payers" content="Re-fetch the account assignments for this customer" position="top">
                                                    <button
                                                        onClick={() => loadPayerOptions(dryRunCustomerId, setDryRunPayerOptions, setIsLoadingDryRunPayers, true)}
                                                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
                                                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
                                                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                                                    >
                                                        <FaSyncAlt size={10} />
                                                    </button>
                                                </Tooltip>
                                            )}
                                        </label>
                                        <CustomSelect
                                            value={dryRunPayerId}
                                            onChange={(e) => setDryRunPayerId(e.target.value)}
                                            options={[
                                                { value: '', label: 'Select Payer ID' },
                                                ...dryRunPayerOptions.map(opt => ({ value: opt, label: opt }))
                                            ]}
                                        />
                                        <div style={{ minHeight: '18px', marginTop: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            {dryRunPayerOptions.length > 0 ? `${dryRunPayerOptions.length} payer account(s) found for this customer.` : ''}
                                        </div>
                                    </div>
                                </div>
                                <p style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', gap: '8px', lineHeight: '1.4' }}>
                                    <span style={{ color: 'var(--primary)' }}>ℹ️</span>
                                    <span>Dry runs typically take 5-10 minutes to process entirely. Results will be available in your mailbox from CloudHealth.</span>
                                </p>
                            </div>
                        )}
                    </div>

                    <button
                        className="action-button"
                        onClick={handleDeploy}
                        title={isDryRun ? 'Launch Dry Run Evaluation' : 'Commit and Deploy!'}
                        disabled={
                            isDeploying ||
                            (isDryRun
                                ? (!dryRunCustomerId || !dryRunPayerId || dryRunPayerId.trim().toUpperCase() === 'ALL')
                                : (actionType === 'update' ? !priceBookId : !newPricebookName)
                            )
                        }
                    >
                        {isDeploying ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <FaSyncAlt className="spin" /> {deployStatus.message}
                            </span>
                        ) : (
                            isDryRun ? 'Launch Dry Run Evaluation' : 'Commit and Deploy!'
                        )}
                    </button>

                    {deployStatus.message && createPortal(
                        <AnimatePresence>
                            <>
                                {/* Static blur layer */}
                                <div style={{
                                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                                    zIndex: 9998, backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', pointerEvents: 'none'
                                }} />
                                
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                    style={{
                                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                                        background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                                    }}
                                >
                                    <motion.div
                                        initial={{ scale: 0.95, y: 20 }}
                                        animate={{ scale: 1, y: 0 }}
                                        exit={{ scale: 0.95, y: 20 }}
                                        transition={{ type: 'spring', stiffness: 300, damping: 28, mass: 0.8 }}
                                        className="card"
                                        style={{
                                            position: 'relative', width: '100%', maxWidth: '600px', background: 'var(--bg-card)',
                                            border: `1px solid ${deployStatus.success ? 'var(--success-border)' : (isDeploying ? 'var(--border)' : 'var(--danger)')}`,
                                            borderRadius: '16px', boxShadow: 'var(--shadow-card)', overflow: 'hidden', zIndex: 1, willChange: 'transform',
                                            display: 'flex', flexDirection: 'column'
                                        }}
                                    >
                                        {/* Header */}
                                        <div style={{ padding: '24px 52px 8px 24px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                {deployStatus.success ? (
                                                    <FaCheckCircle color="var(--success)" size={24} />
                                                ) : isDeploying ? (
                                                    <FaSyncAlt color="var(--primary)" size={20} className="spin" />
                                                ) : (
                                                    <FaTimesCircle color="var(--danger)" size={24} />
                                                )}
                                                <h3 style={{ margin: 0, color: deployStatus.success ? 'var(--success)' : (isDeploying ? 'var(--primary)' : 'var(--danger)'), fontSize: '1.2rem', fontWeight: 600 }}>
                                                    {deployStatus.success ? 'SUCCESS' : (isDeploying ? 'DEPLOYING...' : 'DEPLOYMENT FAILED')}
                                                </h3>
                                            </div>
                                        </div>
                                        
                                        {!isDeploying && (
                                            <button
                                                onClick={() => setDeployStatus({ success: false, message: '', details: [] })}
                                                style={{ position: 'absolute', top: '20px', right: '20px', width: '28px', height: '28px', borderRadius: '7px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', transition: 'all 0.18s', zIndex: 2 }}
                                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)'; e.currentTarget.style.color = '#ef4444'; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                                                aria-label="Close"
                                            >✕</button>
                                        )}
                                        
                                        {/* Body */}
                                        <div style={{ padding: '16px 24px 24px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)' }}>{deployStatus.message}</p>
                                            <div style={{ maxHeight: '300px', overflowY: 'auto', padding: '16px', borderRadius: '8px', background: 'var(--bg-subtle)', border: '1px solid var(--border)', fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'monospace', lineHeight: 1.5 }}>
                                                {deployStatus.details.map((detail, i) => (
                                                    <div key={i} style={{ marginBottom: '6px' }}>{detail}</div>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            </>
                        </AnimatePresence>,
                        document.body
                    )}
                </div>
            )}
        </div>
    );
};

export default DeploySection;
