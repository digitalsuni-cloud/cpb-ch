import React, { useState, useEffect } from 'react';
import { usePriceBook } from '../context/PriceBookContext';
import { generateXML } from '../utils/converter';
import { createPriceBook, updatePriceBook, assignPriceBook, performDryRun, getPriceBookSpecification, getSingleCustomerAssignment, fetchAllCustomers, ApiAuthError } from '../utils/chApi';
import ToggleSwitch from './ToggleSwitch';
import { logPricebookCreate, logPricebookUpdate, logAssignmentUpdate, logDryRun } from '../utils/history/historyLogger';
import { FaWindows, FaApple, FaLinux, FaDownload, FaSyncAlt } from 'react-icons/fa';
import Tooltip from './Tooltip';
import { useConfirm } from '../context/ConfirmContext';

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

    // Fetch customers
    useEffect(() => {
        let mounted = true;
        const loadCustomers = async () => {
            const apiKey = localStorage.getItem('ch_api_key');
            if (!apiKey) return;
            setIsLoadingCustomers(true);
            try {
                const proxyUrl = localStorage.getItem('ch_proxy_url') || '';
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

    // Auto-generate incremented version name for "Create New" on mount or bookName change
    useEffect(() => {
        const currentName = state.priceBook.bookName || 'New Pricebook';
        const match = currentName.match(/_v(\d+)$/);

        let nextName;
        if (match) {
            const nextNum = parseInt(match[1], 10) + 1;
            nextName = currentName.replace(/_v\d+$/, `_v${nextNum}`);
        } else {
            nextName = `${currentName}_v2`;
        }
        setNewPricebookName(nextName);
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

        const apiKey = localStorage.getItem('ch_api_key');
        const proxyUrl = localStorage.getItem('ch_proxy_url') || '';

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
            return actionType === 'create'
                ? `Are you sure you want to CREATE a new Price Book on CloudHealth?\n\nThis will provision a fresh resource on your account.`
                : `Are you sure you want to OVERWRITE Price Book ID: ${priceBookId}?\n\nThis is a destructive action that will completely replace existing mapping rules for this ID.`;
        })();

        const isConfirmed = await confirm({
            title: isDryRun ? 'Confirm Dry Run' : 'Confirm Deployment',
            message: confirmMsg,
            variant: isDryRun ? 'info' : (actionType === 'update' ? 'danger' : 'warning'),
            confirmLabel: isDryRun ? 'Run Simulation' : (actionType === 'update' ? 'Overwrite & Deploy' : 'Create & Deploy'),
            cancelLabel: 'Review Settings'
        });

        if (!isConfirmed) {
            setIsDeploying(false);
            setDeployStatus({ success: false, message: 'Deployment canceled by user.', details: [] });
            return;
        }
        setIsDeploying(true);
        setDeployStatus(null);

        let deployedBookId = priceBookId;
        const addLog = (msg) => {
            setDeployStatus(prev => {
                const logs = prev?.details || [];
                return { success: false, inProgress: true, message: 'Deployment in progress...', details: [...logs, msg] };
            });
        };

        let pricebookActionDone = false;
        let assignmentActionDone = false;

        try {
            if (isDryRun) {
                // ... (Dry Run logic)
                if (actionType === 'update' && !priceBookId) {
                    throw new Error("Price Book ID is requires to bind the Dry Run environment context.");
                }
                if (actionType === 'create' && !customerId) {
                    throw new Error("Customer API ID is required for running a Dry Run on an unprovisioned Pricebook.");
                }

                addLog(`Initiating Dry Run Job starting from: ${dryRunStartDate}`);

                const safeCustomerId = String(dryRunCustomerId ?? '');
                const safePayerId = String(dryRunPayerId ?? '');

                if (!safeCustomerId || safeCustomerId.trim() === '') {
                    throw new Error("Client API ID is required for running a Dry Run Evaluation.");
                }

                if (!safePayerId || safePayerId.trim() === 'ALL' || safePayerId.trim() === '') {
                    throw new Error("A specific Payer Account ID is explicitly required to run a Dry Run Evaluation. Please provide a valid Payer ID instead of 'ALL'.");
                }

                const dryRunResponse = await performDryRun(
                    actionType === 'update' ? priceBookId : null,
                    generatedXml,
                    dryRunStartDate,
                    String(dryRunCustomerId),
                    String(dryRunPayerId),
                    apiKey,
                    proxyUrl
                );

                addLog(`✅ Dry Run Queued successfully.`);

                // Log to Action History
                logDryRun(
                    state.priceBook.bookName,
                    String(dryRunCustomerId),
                    dryRunCustomer?.name || String(dryRunCustomerId),
                    String(dryRunPayerId),
                    dryRunStartDate,
                    dryRunResponse?.id || null,
                    dryRunResponse?.tempPriceBookId || null,
                    true
                );

                setDeployStatus(prev => ({ success: true, inProgress: false, message: 'Dry Run Submitted successfully!', details: prev.details }));
                setIsDeploying(false);
                return;
            }

            if (actionType === 'create') {
                const safeBookName = newPricebookName || 'New Pricebook';
                addLog(`Creating new pricebook: ${safeBookName}...`);
                const response = await createPriceBook(safeBookName, generatedXml, apiKey, proxyUrl);
                deployedBookId = response.price_book ? response.price_book.id : response.id;
                addLog(`✅ Created successfully. New Price Book ID: ${deployedBookId}`);

                // Update local Context API structure
                dispatch({ type: 'UPDATE_METADATA', payload: { field: 'cxAPIId', value: deployedBookId.toString() } });
                setPriceBookId(deployedBookId.toString());

                logPricebookCreate(deployedBookId, safeBookName, generatedXml, true);
                pricebookActionDone = true;

            } else {
                if (!deployedBookId) {
                    throw new Error("Price Book ID is required for updating an existing pricebook.");
                }

                // Fetch previous XML for diff
                let previousXml = null;
                addLog(`Fetching prior specification to generate history diff...`);
                try { previousXml = await getPriceBookSpecification(deployedBookId, apiKey, proxyUrl); } catch (e) { }

                const isIdentical = previousXml && previousXml.trim() === generatedXml.trim();

                if (isIdentical) {
                    addLog(`ℹ️ Specification is identical to current version. Skipping API update and history log.`);
                    pricebookActionDone = true; // Mark as done since we explicitly skipped it
                } else {
                    addLog(`Updating existing pricebook ID: ${deployedBookId}...`);
                    await updatePriceBook(deployedBookId, generatedXml, apiKey, proxyUrl);
                    addLog(`✅ Updated successfully.`);

                    const safeBookName = state.priceBook.bookName || 'Pricebook';
                    logPricebookUpdate(deployedBookId, safeBookName, previousXml, generatedXml, true);
                    pricebookActionDone = true;
                }
            }

            if (assignCustomer) {
                if (!customerId) {
                    throw new Error("Customer ID is required for assignment.");
                }

                // Fetch previous assignment (to get assignmentId and payer account)
                let previousAssignmentAccounts = null;
                let previousAssignmentId = null;
                addLog(`Fetching prior assignments to generate history diff...`);
                try {
                    const prevAsgn = await getSingleCustomerAssignment(customerId, apiKey, proxyUrl);
                    if (prevAsgn) {
                        previousAssignmentAccounts = prevAsgn.billing_account_owner_id;
                        previousAssignmentId = prevAsgn.assignment_id;
                    }
                } catch (e) { }

                addLog(`Assigning PriceBook ID ${deployedBookId} to Customer ID: ${customerId}...`);
                const assignRes = await assignPriceBook(deployedBookId, customerId, billingAccountOwnerId, apiKey, proxyUrl);
                const finalAssignmentId = assignRes.assignmentId || previousAssignmentId;
                addLog(`✅ Assigned successfully to Payer Account: ${billingAccountOwnerId || 'ALL'}`);

                const custName = customerOptions.find(c => String(c.id) === String(customerId))?.name;
                const safeCustomerName = custName || 'Customer';
                const safeBookName = state.priceBook.bookName || 'Pricebook';
                logAssignmentUpdate(deployedBookId, safeBookName, customerId, safeCustomerName, finalAssignmentId, billingAccountOwnerId || 'ALL', previousAssignmentAccounts, billingAccountOwnerId || 'ALL', true);
                assignmentActionDone = true;
            }

            setDeployStatus(prev => ({ success: true, inProgress: false, message: 'Deployment completed successfully!', details: prev.details }));
        } catch (error) {
            console.error(error);

            // Log dry run failure to Action History
            if (isDryRun) {
                logDryRun(
                    state.priceBook.bookName,
                    String(dryRunCustomerId),
                    dryRunCustomer?.name || String(dryRunCustomerId),
                    String(dryRunPayerId),
                    dryRunStartDate,
                    null,
                    null,
                    false,
                    error.message
                );
            }

            // Log failures ONLY if they weren't already logged as success
            if (!isDryRun && !pricebookActionDone) {
                if (actionType === 'update' && priceBookId) {
                    logPricebookUpdate(priceBookId, state.priceBook.bookName || 'Pricebook', null, generatedXml, false, error.message);
                } else if (actionType === 'create') {
                    logPricebookCreate('PENDING', newPricebookName || 'New Pricebook', generatedXml, false, error.message);
                }
            }

            if (!isDryRun && assignCustomer && customerId && !assignmentActionDone) {
                const custName = customerOptions.find(c => String(c.id) === String(customerId))?.name;
                const safeCustomerName = custName || 'Customer';
                logAssignmentUpdate(deployedBookId || 'PENDING', state.priceBook.bookName || 'Pricebook', customerId, safeCustomerName, null, billingAccountOwnerId || null, null, null, false, error.message);
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


            {!localStorage.getItem('ch_api_key') ? (
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
                                    border: `2px solid ${actionType === 'update' ? 'var(--secondary)' : 'var(--border)'}`,
                                    background: actionType === 'update' ? 'rgba(6, 182, 212, 0.05)' : 'var(--bg-card)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div style={{
                                    width: '18px', height: '18px', borderRadius: '50%',
                                    border: `2px solid ${actionType === 'update' ? 'var(--secondary)' : 'var(--text-muted)'}`,
                                    display: 'flex', justifyContent: 'center', alignItems: 'center'
                                }}>
                                    {actionType === 'update' && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--secondary)' }} />}
                                </div>
                                <span style={{ fontWeight: 600, color: actionType === 'update' ? 'var(--secondary)' : 'var(--text-main)', fontSize: '0.85rem', letterSpacing: '0.05em' }}>MODIFY EXISTING PRICEBOOK</span>
                            </div>

                            <div
                                onClick={() => setActionType('create')}
                                style={{
                                    flex: 1,
                                    padding: '16px',
                                    borderRadius: '8px',
                                    border: `2px solid ${actionType === 'create' ? 'var(--secondary)' : 'var(--border)'}`,
                                    background: actionType === 'create' ? 'rgba(6, 182, 212, 0.05)' : 'var(--bg-card)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div style={{
                                    width: '18px', height: '18px', borderRadius: '50%',
                                    border: `2px solid ${actionType === 'create' ? 'var(--secondary)' : 'var(--text-muted)'}`,
                                    display: 'flex', justifyContent: 'center', alignItems: 'center'
                                }}>
                                    {actionType === 'create' && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--secondary)' }} />}
                                </div>
                                <span style={{ fontWeight: 600, color: actionType === 'create' ? 'var(--secondary)' : 'var(--text-main)', fontSize: '0.85rem', letterSpacing: '0.05em' }}>CREATE NEW PRICEBOOK</span>
                            </div>
                        </div>
                    </div>

                    {actionType === 'update' && (
                        <div style={{ background: 'var(--bg-deep)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            <h4 style={{ margin: '0 0 16px', color: 'var(--text-main)' }}>2. Target Price Book ID</h4>
                            <div className="input-group">
                                <input
                                    type="text"
                                    value={priceBookId}
                                    onChange={(e) => setPriceBookId(e.target.value)}
                                    placeholder="e.g. 137438954493"
                                />
                            </div>
                            <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                Enter the CloudHealth Price Book ID that you want to overwrite with your current payload ({generatedXml ? (new Blob([generatedXml]).size / 1024).toFixed(2) + ' KB' : 'Empty'}).
                            </p>
                        </div>
                    )}

                    {actionType === 'create' && (
                        <div style={{ background: 'var(--bg-deep)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            <h4 style={{ margin: '0 0 16px', color: 'var(--text-main)' }}>2. New Price Book Name</h4>
                            <div className="input-group">
                                <input
                                    type="text"
                                    value={newPricebookName}
                                    onChange={(e) => setNewPricebookName(e.target.value)}
                                    placeholder="Desired Name..."
                                />
                            </div>
                            <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                Payload size: {generatedXml ? (new Blob([generatedXml]).size / 1024).toFixed(2) + ' KB' : 'Empty'}.
                            </p>
                        </div>
                    )}

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
                                    <label>Customer API ID <span style={{ color: 'var(--danger)' }}>*</span> {isLoadingCustomers && <span className="spin" style={{ display: 'inline-block', fontSize: '0.8em' }}>⏳</span>}</label>
                                    <input
                                        type="text"
                                        list="customer-suggestions"
                                        value={customerId}
                                        onChange={(e) => setCustomerId(e.target.value)}
                                        placeholder="Target Client ID (e.g. 42346)"
                                        autoComplete="off"
                                    />
                                    <datalist id="customer-suggestions">
                                        {customerOptions.map(c => (
                                            <option key={c.id} value={c.id}>{`${c.name} (${c.id})`}</option>
                                        ))}
                                    </datalist>
                                    {selectedCustomer && (
                                        <div style={{ marginTop: '4px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            {selectedCustomer.name}
                                        </div>
                                    )}
                                </div>
                                <div className="input-group">
                                    <label>Payer Account ID</label>
                                    <input
                                        type="text"
                                        value={billingAccountOwnerId}
                                        onChange={(e) => setBillingAccountOwnerId(e.target.value)}
                                        placeholder="Enter 'ALL' or specific account string"
                                    />
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                        Default is 'ALL'. Specify a string if assigning to a distinct payer account instead of universal mapping.
                                    </span>
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
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                                <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    Launch a safe simulation of this payload's impact without overwriting live mapping tables.
                                    Dry Run jobs run in the background on CloudHealth and must be reviewed in the CH Portal.
                                </p>
                                <div className="input-row" style={{ alignItems: 'flex-start' }}>
                                    <div className="input-group">
                                        <label>Start Month <span style={{ color: 'var(--danger)' }}>*</span></label>
                                        <select
                                            value={dryRunStartDate}
                                            onChange={(e) => setDryRunStartDate(e.target.value)}
                                        >
                                            {monthOptions.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                        <div style={{ minHeight: '18px' }} />{/* spacer to match Client ID hint height */}
                                    </div>
                                    <div className="input-group">
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            Client API ID <span style={{ color: 'var(--danger)' }}>*</span>
                                            <Tooltip title="Refresh" content="Re-fetch the customer list from CloudHealth API" position="top">
                                                <button
                                                    onClick={async () => {
                                                        const apiKey = localStorage.getItem('ch_api_key');
                                                        const proxyUrl = localStorage.getItem('ch_proxy_url') || '';
                                                        if (!apiKey) return;
                                                        setIsLoadingCustomers(true);
                                                        try {
                                                            const { fetchAllCustomers: _fac } = await import('../utils/chApi');
                                                            const c = await _fac(apiKey, proxyUrl, true);
                                                            setCustomerOptions(c || []);
                                                        } catch (e) { console.warn(e); }
                                                        finally { setIsLoadingCustomers(false); }
                                                    }}
                                                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center', marginLeft: '2px' }}
                                                >
                                                    {isLoadingCustomers ? <span style={{ fontSize: '0.7rem' }}>⏳</span> : <FaSyncAlt size={10} />}
                                                </button>
                                            </Tooltip>
                                        </label>
                                        <input
                                            type="text"
                                            list="customer-suggestions"
                                            value={dryRunCustomerId}
                                            onChange={(e) => setDryRunCustomerId(e.target.value)}
                                            placeholder="Target Client ID (e.g. 42346)"
                                            autoComplete="off"
                                        />
                                        <div style={{ minHeight: '18px', marginTop: '4px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            {dryRunCustomer ? dryRunCustomer.name : ''}
                                        </div>
                                    </div>
                                    <div className="input-group">
                                        <label>Payer Account ID <span style={{ color: 'var(--danger)' }}>*</span></label>
                                        <input
                                            type="text"
                                            value={dryRunPayerId}
                                            onChange={(e) => setDryRunPayerId(e.target.value)}
                                            placeholder="Explicit Payer ID (e.g. 1234)"
                                        />
                                        <div style={{ minHeight: '18px' }} />{/* spacer */}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ marginTop: '12px' }}>
                        <button
                            onClick={handleDeploy}
                            disabled={isBrowser || isDeploying || (!isDryRun && actionType === 'update' && !priceBookId) || (!isDryRun && actionType === 'create' && !newPricebookName) || (!isDryRun && assignCustomer && !customerId) || (isDryRun && actionType === 'update' && !priceBookId) || (isDryRun && actionType === 'create' && !customerId) || !generatedXml}
                            style={{
                                width: '100%',
                                padding: '16px',
                                background: 'linear-gradient(135deg, var(--primary) 0%, rgb(99, 102, 241) 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: 700,
                                fontSize: '1.1rem',
                                justifyContent: 'center',
                                opacity: isBrowser || (isDeploying || (!isDryRun && actionType === 'update' && !priceBookId) || (!isDryRun && actionType === 'create' && !newPricebookName) || (!isDryRun && assignCustomer && !customerId) || (isDryRun && actionType === 'update' && !priceBookId) || (isDryRun && actionType === 'create' && !customerId) || !generatedXml) ? 0.5 : 1,
                                cursor: isBrowser ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {isDeploying ? 'Processing with CloudHealth...' : isDryRun ? 'Launch Dry Run Evaluation' : 'Commit and Deploy!'}
                        </button>
                    </div>

                    {deployStatus && deployStatus.message && (
                        <div style={{
                            marginTop: '8px',
                            padding: '16px',
                            borderRadius: '8px',
                            background: deployStatus.inProgress ? 'rgba(245, 158, 11, 0.1)' : (deployStatus.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'),
                            border: `1px solid ${deployStatus.inProgress ? '#f59e0b' : (deployStatus.success ? 'var(--success)' : 'var(--danger)')}`
                        }}>
                            <h4 style={{ margin: '0 0 12px 0', color: deployStatus.inProgress ? '#f59e0b' : (deployStatus.success ? 'var(--success)' : 'var(--danger)') }}>
                                {deployStatus.message}
                            </h4>
                            {deployStatus.details && deployStatus.details.length > 0 && (
                                <div style={{ marginTop: '12px', background: 'var(--bg-code)', padding: '12px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '0.8rem', fontFamily: 'monospace', maxHeight: '150px', overflowY: 'auto' }}>
                                    {deployStatus.details.map((detail, index) => (
                                        <div key={index} style={{ marginBottom: '4px', color: detail.startsWith('❌') ? 'var(--danger)' : (detail.startsWith('✅') ? 'var(--success)' : 'var(--text-main)') }}>
                                            {detail}
                                        </div>
                                    ))}
                                </div>
                            )}</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default DeploySection;
