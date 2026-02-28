import React, { useState } from 'react';
import { usePriceBook } from '../context/PriceBookContext';
import { motion } from 'framer-motion';
import { isElectronApp } from '../utils/env';

const PriceBookForm = () => {
    const { state, dispatch } = usePriceBook();
    const { priceBook } = state;
    const [errors, setErrors] = useState({});

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
                        title="Enter a unique name for this Price Book"
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
                        title="The name of the user or system creating this Price Book"
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
                        <label htmlFor="customerApiId">Customer API ID</label>
                        <input
                            type="text"
                            id="customerApiId"
                            name="customerApiId"
                            value={priceBook.customerApiId || ''}
                            onChange={handleChange}
                            placeholder="e.g. 42346"
                        />
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
