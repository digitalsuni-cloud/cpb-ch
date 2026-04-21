import React, { useState, useEffect } from 'react';
import { usePriceBook } from '../context/PriceBookContext';
import { motion } from 'framer-motion';
import { isElectronApp } from '../utils/env';
import { fetchAllCustomers, fetchAwsAccountAssignments, clearAwsCache } from '../utils/chApi';
import Tooltip from './Tooltip';
import { FaSyncAlt } from 'react-icons/fa';
import { getCredential } from "../utils/credentials";

const PriceBookForm = () => {
    const { state, dispatch } = usePriceBook();
    const { priceBook } = state;
    const [errors, setErrors] = useState({});
    const [customerOptions, setCustomerOptions] = useState([]);
    const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
    const [payerOptions, setPayerOptions] = useState([]);
    const [isLoadingPayers, setIsLoadingPayers] = useState(false);

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
        if (isElectronApp()) {
            loadCustomers();
        }
        return () => { mounted = false; };
    }, []);

    // Helper: load payer options for the current customer, with optional cache-bypass.
    // Only fires the API call if customerApiId exactly matches a known customer \u2014 ignores partial text input.
    const loadPayerOptions = async (forceRefresh = false) => {
        const cid = priceBook.customerApiId;
        if (!cid || String(cid).trim() === '') { setPayerOptions([]); return; }
        // Guard: only proceed if the entered value is a known customer ID (prevents per-keystroke calls)
        const isKnown = customerOptions.some(c => String(c.id) === String(cid).trim());
        if (!isKnown && !forceRefresh) { setPayerOptions([]); return; }
        const apiKey = getCredential('ch_api_key');
        const proxyUrl = getCredential('ch_proxy_url') || '';
        if (!apiKey) return;
        if (forceRefresh) clearAwsCache(String(cid).trim());
        setIsLoadingPayers(true);
        try {
            const assignments = await fetchAwsAccountAssignments(String(cid).trim(), apiKey, proxyUrl, forceRefresh);
            const opts = [...new Set(assignments.map(a => a.payer_account_owner_id).filter(Boolean))];
            setPayerOptions(opts);
        } catch (e) {
            console.warn('Failed to load payer options', e);
        } finally {
            setIsLoadingPayers(false);
        }
    };

    // Fetch payer accounts when customerApiId changes (uses cache automatically)
    useEffect(() => {
        loadPayerOptions();
    }, [priceBook.customerApiId, customerOptions]);
    const handleChange = (e) => {
        const { name, value } = e.target;
        dispatch({ type: 'UPDATE_BOOK_FIELD', field: name, value });
        if (value.trim()) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleBlur = (e) => {
        const { name, value, required } = e.target;
        if (required && !value.trim()) {
            setErrors(prev => ({ ...prev, [name]: 'This field is required.' }));
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
            <div className="input-row">
                <div className="input-group">
                    <label htmlFor="bookName">Price Book Name <span style={{ color: 'var(--accent)' }}>*</span></label>
                    <input
                        type="text"
                        id="bookName"
                        name="bookName"
                        value={priceBook.bookName}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        required
                        placeholder="e.g. Q1 Enterprise Pricing"
                        style={errors.bookName ? { borderColor: 'var(--accent)' } : {}}
                    />
                    {errors.bookName && <span style={{ color: 'var(--accent)', fontSize: '0.8rem' }}>{errors.bookName}</span>}
                </div>

                <div className="input-group">
                    <label htmlFor="createdBy">Created By <span style={{ color: 'var(--accent)' }}>*</span></label>
                    <input
                        type="text"
                        id="createdBy"
                        name="createdBy"
                        value={priceBook.createdBy}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        required
                        placeholder="John Doe"
                        style={errors.createdBy ? { borderColor: 'var(--accent)' } : {}}
                    />
                    {errors.createdBy && <span style={{ color: 'var(--accent)', fontSize: '0.8rem' }}>{errors.createdBy}</span>}
                </div>
            </div>

            <div className="input-row">
                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                    <label htmlFor="comment">Description</label>
                    <textarea
                        id="comment"
                        name="comment"
                        value={priceBook.comment}
                        onChange={handleChange}
                        placeholder="Brief description of this price book..."
                        rows={2}
                        style={{ resize: 'vertical' }}
                    />
                </div>
            </div>

            {isElectronApp() && (
                <div className="input-row" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <div className="input-group" style={{ flex: '0 0 30%' }}>
                        <label htmlFor="cxAPIId">Price Book ID</label>
                        <input
                            type="text"
                            id="cxAPIId"
                            name="cxAPIId"
                            value={priceBook.cxAPIId}
                            onChange={handleChange}
                            placeholder="e.g. 1374389"
                        />
                        <div style={{ minHeight: '18px', marginTop: '4px' }} />
                    </div>

                    <div className="input-group" style={{ flex: '0 0 30%' }}>
                        <label htmlFor="customerApiId" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            Customer API ID
                            {isLoadingCustomers
                                ? <span className="spin" style={{ display: 'inline-block', fontSize: '0.8em' }}>⏳</span>
                                : <Tooltip title="Refresh Customers" content="Re-fetch the customer list from CloudHealth API" position="top">
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
                                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center', marginLeft: '2px' }}
                                    >
                                        <FaSyncAlt size={10} />
                                    </button>
                                </Tooltip>
                            }
                        </label>
                        <input
                            type="text"
                            id="customerApiId"
                            name="customerApiId"
                            list="dashboard-customer-suggestions"
                            value={priceBook.customerApiId || ''}
                            onChange={handleChange}
                            placeholder="e.g. 42346"
                            autoComplete="off"
                        />
                        <datalist id="dashboard-customer-suggestions">
                            {customerOptions.map(c => (
                                <option key={c.id} value={c.id}>{`${c.name} (${c.id})`}</option>
                            ))}
                        </datalist>
                        <div style={{ minHeight: '18px', marginTop: '4px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {customerOptions.find(c => String(c.id) === String(priceBook.customerApiId))?.name || ''}
                        </div>
                    </div>

                    <div className="input-group" style={{ flex: 1 }}>
                        <label htmlFor="cxPayerId" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            Customer Payer ID(s)
                            {isLoadingPayers
                                ? <span className="spin" style={{ display: 'inline-block', fontSize: '0.8em' }}>⏳</span>
                                : <Tooltip title="Refresh Payers" content="Re-fetch payer accounts from CloudHealth (clears cache for this customer)" position="top">
                                    <button
                                        onClick={() => loadPayerOptions(true)}
                                        disabled={!priceBook.customerApiId}
                                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: priceBook.customerApiId ? 'pointer' : 'not-allowed', padding: '0', display: 'flex', alignItems: 'center', marginLeft: '2px', opacity: priceBook.customerApiId ? 1 : 0.4 }}
                                    >
                                        <FaSyncAlt size={10} />
                                    </button>
                                </Tooltip>
                            }
                        </label>
                        <input
                            type="text"
                            id="cxPayerId"
                            name="cxPayerId"
                            list="dashboard-payer-suggestions"
                            value={priceBook.cxPayerId}
                            onChange={handleChange}
                            placeholder="Comma separated or 'ALL'"
                            autoComplete="off"
                        />
                        <datalist id="dashboard-payer-suggestions">
                            {payerOptions.map(opt => (
                                <option key={opt} value={opt} />
                            ))}
                        </datalist>
                        <div style={{ minHeight: '18px', marginTop: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {payerOptions.length > 0 ? `${payerOptions.length} payer account(s) found for this customer.` : ''}
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default PriceBookForm;
