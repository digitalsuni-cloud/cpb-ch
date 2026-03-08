import React, { useState, useEffect } from 'react';
import { usePriceBook } from '../context/PriceBookContext';
import { motion } from 'framer-motion';
import { isElectronApp } from '../utils/env';
import { fetchAllCustomers } from '../utils/chApi';
import Tooltip from './Tooltip';

const PriceBookForm = () => {
    const { state, dispatch } = usePriceBook();
    const { priceBook } = state;
    const [errors, setErrors] = useState({});
    const [customerOptions, setCustomerOptions] = useState([]);
    const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);

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
        if (isElectronApp()) {
            loadCustomers();
        }
        return () => { mounted = false; };
    }, []);



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
                <div className="input-row" style={{ display: 'flex', gap: '16px' }}>
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
                    </div>

                    <div className="input-group" style={{ flex: '0 0 30%' }}>
                        <label htmlFor="customerApiId">Customer API ID {isLoadingCustomers && <span className="spin" style={{ display: 'inline-block', fontSize: '0.8em' }}>⏳</span>}</label>
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

                    </div>

                    <div className="input-group" style={{ flex: 1 }}>
                        <label htmlFor="cxPayerId">Customer Payer ID(s)</label>
                        <input
                            type="text"
                            id="cxPayerId"
                            name="cxPayerId"
                            value={priceBook.cxPayerId}
                            onChange={handleChange}
                            placeholder="Comma separated or 'ALL'"
                        />
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default PriceBookForm;
