import React, { useState, useEffect } from 'react';
import { usePriceBook } from '../context/PriceBookContext';
import { generateXML } from '../utils/converter';
import { createPriceBook, updatePriceBook, assignPriceBook, performDryRun } from '../utils/chApi';
import ToggleSwitch from './ToggleSwitch';
import { FaWindows, FaApple, FaLinux, FaDownload } from 'react-icons/fa';

const DeploySection = ({ autoAssign = false, onAutoAssignConsumed }) => {
    const { state, dispatch } = usePriceBook();
    const [actionType, setActionType] = useState('update'); // 'update' or 'create'
    const [priceBookId, setPriceBookId] = useState(state.priceBook.cxAPIId || '');
    const [newPricebookName, setNewPricebookName] = useState('');
    const [assignCustomer, setAssignCustomer] = useState(false);
    const [customerId, setCustomerId] = useState(state.priceBook.customerApiId || '');
    const [billingAccountOwnerId, setBillingAccountOwnerId] = useState(state.priceBook.cxPayerId || 'ALL');

    // Dry Run States
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

    const [isDryRun, setIsDryRun] = useState(false);
    const [dryRunStartDate, setDryRunStartDate] = useState(monthOptions[0].value);

    // Auto-extract first numeric sequence from Context's Payer IDs, otherwise empty.
    const extractPayerId = (str) => {
        if (!str) return '';
        const match = str.match(/\d+/);
        return match ? match[0] : '';
    };
    const [dryRunPayerId, setDryRunPayerId] = useState(() => extractPayerId(state.priceBook.cxPayerId));
    const [dryRunCustomerId, setDryRunCustomerId] = useState(state.priceBook.customerApiId || '');

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

    // When navigated from Directory's "Edit Assignment" action, auto-open the assign section
    useEffect(() => {
        if (autoAssign) {
            setAssignCustomer(true);
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

        if (!window.confirm(confirmMsg)) {
            setIsDeploying(false);
            setDeployStatus({ success: false, message: 'Deployment canceled by user.', details: [] });
            return;
        }

        let deployedBookId = priceBookId;
        const detailsLog = [];

        try {
            if (isDryRun) {
                if (actionType === 'update' && !priceBookId) {
                    throw new Error("Price Book ID is requires to bind the Dry Run environment context.");
                }
                if (actionType === 'create' && !customerId) {
                    throw new Error("Customer API ID is required for running a Dry Run on an unprovisioned Pricebook.");
                }

                detailsLog.push(`Initiating Dry Run Job starting from: ${dryRunStartDate}`);

                if (!dryRunCustomerId || dryRunCustomerId.trim() === '') {
                    throw new Error("Client API ID is required for running a Dry Run Evaluation.");
                }

                if (!dryRunPayerId || dryRunPayerId === 'ALL' || dryRunPayerId.trim() === '') {
                    throw new Error("A specific Payer Account ID is explicitly required to run a Dry Run Evaluation. Please provide a valid Payer ID instead of 'ALL'.");
                }

                const dryRunResponse = await performDryRun(
                    actionType === 'update' ? priceBookId : null,
                    generatedXml,
                    dryRunStartDate,
                    dryRunCustomerId,
                    dryRunPayerId,
                    apiKey,
                    proxyUrl
                );

                detailsLog.push(`✅ Dry Run Queued successfully.`);
                if (dryRunResponse && dryRunResponse.id) {
                    detailsLog.push(`Job ID: ${dryRunResponse.id}`);
                }
                setDeployStatus({ success: true, message: 'Dry Run Submitted successfully!', details: detailsLog });
                setIsDeploying(false);
                return;
            }

            if (actionType === 'create') {
                const safeBookName = newPricebookName || 'New Pricebook';
                detailsLog.push(`Creating new pricebook: ${safeBookName}`);
                const response = await createPriceBook(safeBookName, generatedXml, apiKey, proxyUrl);
                deployedBookId = response.price_book ? response.price_book.id : response.id;
                detailsLog.push(`✅ Created successfully. New Price Book ID: ${deployedBookId}`);

                // Update local Context API structure
                dispatch({ type: 'UPDATE_METADATA', payload: { field: 'cxAPIId', value: deployedBookId.toString() } });
                setPriceBookId(deployedBookId.toString());

            } else {
                if (!deployedBookId) {
                    throw new Error("Price Book ID is required for updating an existing pricebook.");
                }
                detailsLog.push(`Updating existing pricebook ID: ${deployedBookId}`);
                await updatePriceBook(deployedBookId, generatedXml, apiKey, proxyUrl);
                detailsLog.push(`✅ Updated successfully.`);
            }

            if (assignCustomer) {
                if (!customerId) {
                    throw new Error("Customer ID is required for assignment.");
                }
                detailsLog.push(`Assigning PriceBook ID ${deployedBookId} to Customer ID: ${customerId}`);
                await assignPriceBook(deployedBookId, customerId, billingAccountOwnerId, apiKey, proxyUrl);
                detailsLog.push(`✅ Assigned successfully to Payer Account: ${billingAccountOwnerId || 'ALL'}`);
            }

            setDeployStatus({ success: true, message: 'Deployment completed successfully!', details: detailsLog });
        } catch (error) {
            console.error(error);
            setDeployStatus({ success: false, message: `Deployment Failed: ${error.message}`, details: detailsLog });
        } finally {
            setIsDeploying(false);
        }
    };

    const isBrowser = !navigator.userAgent.toLowerCase().includes('electron');

    return (
        <div className="output-section card" style={{ position: 'relative', display: 'flex', flexDirection: 'column', padding: '24px', flex: 1, minHeight: 0, marginTop: '2px', boxSizing: 'border-box' }}>
            {isBrowser && (
                <div style={{ padding: '20px', marginBottom: '24px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--danger)' }}>
                            <FaDownload size={16} />
                        </div>
                        <h4 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.05rem', fontWeight: 600 }}>Action Required: Install Standalone App</h4>
                    </div>
                    <p style={{ margin: '0 0 16px', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                        Standard web browsers enforce strict CORS policies that block direct API calls from the CloudHealth backend. To directly deploy your XML payloads instantly from your local device, you must download a standalone desktop companion app.
                    </p>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <a href="https://github.com/digitalsuni-cloud/cpb-ch/releases/download/v4.0.0/CloudHealth.PriceBook.Setup.4.0.0.exe" style={{ padding: '8px 16px', background: 'var(--bg-deep)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-main)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', transition: 'all 0.2s', fontWeight: 500 }} onMouseOver={(e) => e.currentTarget.style.borderColor = '#0ea5e9'} onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border)'}>
                            <FaWindows style={{ color: '#00a4ef' }} /> Windows
                        </a>
                        <a href="https://github.com/digitalsuni-cloud/cpb-ch/releases/download/v4.0.0/CloudHealth-PriceBook-4.0.0-arm64.dmg" style={{ padding: '8px 16px', background: 'var(--bg-deep)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-main)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', transition: 'all 0.2s', fontWeight: 500 }} onMouseOver={(e) => e.currentTarget.style.borderColor = '#0ea5e9'} onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border)'}>
                            <FaApple /> Mac (Silicon)
                        </a>
                        <a href="https://github.com/digitalsuni-cloud/cpb-ch/releases/download/v4.0.0/CloudHealth-PriceBook-4.0.0.dmg" style={{ padding: '8px 16px', background: 'var(--bg-deep)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-main)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', transition: 'all 0.2s', fontWeight: 500 }} onMouseOver={(e) => e.currentTarget.style.borderColor = '#0ea5e9'} onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border)'}>
                            <FaApple /> Mac (Intel)
                        </a>
                        <a href="https://github.com/digitalsuni-cloud/cpb-ch/releases/tag/v4.0.0" target="_blank" rel="noopener noreferrer" style={{ padding: '8px 16px', background: 'var(--bg-deep)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-main)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', transition: 'all 0.2s', fontWeight: 500 }} onMouseOver={(e) => e.currentTarget.style.borderColor = '#0ea5e9'} onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border)'}>
                            <FaLinux style={{ color: '#f5c000' }} /> Linux Binaries
                        </a>
                    </div>
                </div>
            )}

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
                                    <label>Customer API ID <span style={{ color: 'var(--danger)' }}>*</span></label>
                                    <input
                                        type="text"
                                        value={customerId}
                                        onChange={(e) => setCustomerId(e.target.value)}
                                        placeholder="Target Client ID (e.g. 42346)"
                                    />
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
                                <div className="input-row">
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
                                    </div>
                                    <div className="input-group">
                                        <label>Payer Account ID <span style={{ color: 'var(--danger)' }}>*</span></label>
                                        <input
                                            type="text"
                                            value={dryRunPayerId}
                                            onChange={(e) => setDryRunPayerId(e.target.value)}
                                            placeholder="Explicit Payer ID (e.g. 1234)"
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>Client API ID <span style={{ color: 'var(--danger)' }}>*</span></label>
                                        <input
                                            type="text"
                                            value={dryRunCustomerId}
                                            onChange={(e) => setDryRunCustomerId(e.target.value)}
                                            placeholder="Target Client ID (e.g. 42346)"
                                        />
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

                    {deployStatus.message && (
                        <div style={{
                            marginTop: '8px',
                            padding: '16px',
                            borderRadius: '8px',
                            background: deployStatus.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            border: `1px solid ${deployStatus.success ? 'var(--success)' : 'var(--danger)'}`
                        }}>
                            <h4 style={{ margin: '0 0 12px 0', color: deployStatus.success ? 'var(--success)' : 'var(--danger)' }}>
                                {deployStatus.message}
                            </h4>
                            {deployStatus.details.length > 0 && (
                                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                                    {deployStatus.details.map((detail, idx) => (
                                        <li key={idx} style={{ marginBottom: '4px' }}>{detail}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default DeploySection;
