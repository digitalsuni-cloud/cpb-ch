import React, { useState } from 'react';
import { usePriceBook } from '../context/PriceBookContext';
import { propertyTypes } from '../constants/propertyTypes';
import { getIconForProduct } from '../utils/awsIcons';
import { FaSlash, FaClock, FaCheckCircle, FaTimesCircle, FaInfoCircle, FaArrowRight, FaTags, FaLayerGroup, FaUserEdit } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const NaturalLanguageSummary = () => {
    const { state } = usePriceBook();
    const { priceBook } = state;

    const toReadableAdjustment = (type, adj) => {
        if (!type) return { text: '', color: 'var(--text-muted)', bg: 'rgba(0,0,0,0.05)' };
        const val = parseFloat(adj);
        if (isNaN(val)) return { text: adj, color: 'var(--text-main)', bg: 'var(--bg-card-hover)' };

        if (type === 'percentDiscount') return { text: `-${val}% Discount`, color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)' };
        if (type === 'percentIncrease') return { text: `+${val}% Markup`, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' };
        if (type === 'fixedRate') return { text: `$${val} Fixed Rate`, color: '#38bdf8', bg: 'rgba(56,189,248,0.1)', border: 'rgba(56,189,248,0.3)' };
        return { text: `${adj} (${type})`, color: 'var(--text-main)', bg: 'var(--bg-card-hover)', border: 'var(--border)' };
    };

    const formatList = (items) => {
        if (!items || items.length === 0) return '';
        if (items.length === 1) return items[0];
        if (items.length === 2) return `${items[0]} and ${items[1]}`;
        return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
    };

    const renderSummary = () => {
        const hasValidGroups = priceBook.ruleGroups.some(group => group.startDate);

        if (!hasValidGroups) {
            return (
                <div style={{
                    padding: '80px 20px',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    background: 'var(--bg-card)',
                    borderRadius: '16px',
                    border: '1px dashed var(--border)'
                }}>
                    <FaSlash size={40} style={{ marginBottom: '20px', opacity: 0.3 }} />
                    <h3 style={{ margin: '0 0 12px 0', color: 'var(--text-main)', fontSize: '1.4rem' }}>Pricing Logic Not Configured</h3>
                    <p style={{ margin: '0 auto', fontSize: '0.95rem', maxWidth: '400px', lineHeight: 1.6 }}>
                        Add at least one <strong>Rule Group with a Start Date</strong> in the Builder to see the execution summary.
                    </p>
                </div>
            );
        }

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {/* GLOBAL OVERVIEW HEADER */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                    <div className="card" style={{ padding: '20px', margin: 0, background: 'var(--bg-card)' }}>
                        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.1em', fontWeight: 700 }}>Pricebook Name</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>{priceBook.bookName || 'N/A'}</div>
                    </div>
                    <div className="card" style={{ padding: '20px', margin: 0, background: 'var(--bg-card)' }}>
                        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.1em', fontWeight: 700 }}>Author / Team</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>{priceBook.createdBy || 'Unknown'}</div>
                    </div>
                    {priceBook.comment && (
                        <div className="card" style={{ padding: '20px', margin: 0, background: 'var(--bg-card)', gridColumn: '1 / -1' }}>
                            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.1em', fontWeight: 700 }}>Description / Purpose</div>
                            <div style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{priceBook.comment}</div>
                        </div>
                    )}
                </div>

                {/* EXECUTION TIMELINE */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', position: 'relative', paddingLeft: '24px' }}>
                    {/* Vertical execution line */}
                    <div style={{ position: 'absolute', left: '10px', top: '20px', bottom: '20px', width: '2px', background: 'linear-gradient(180deg, var(--primary) 0%, var(--border) 100%)', opacity: 0.3 }}></div>

                    {priceBook.ruleGroups.map((group, i) => {
                        const isDisabled = group.enabled === 'false';
                        const priorityLabel = i === 0 ? '1st Priority' : i === 1 ? '2nd Priority' : i === 2 ? '3rd Priority' : `${i + 1}th Priority`;

                        return (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                key={group.id}
                                style={{ position: 'relative', opacity: isDisabled ? 0.6 : 1 }}
                            >
                                {/* Priority Indicator Dot */}
                                <div style={{
                                    position: 'absolute',
                                    left: '-20px',
                                    top: '4px',
                                    width: '14px',
                                    height: '14px',
                                    borderRadius: '50%',
                                    background: isDisabled ? 'var(--text-muted)' : 'var(--primary)',
                                    border: '3px solid var(--bg-deep)',
                                    zIndex: 2,
                                    boxShadow: isDisabled ? 'none' : '0 0 10px var(--primary-glow)'
                                }}></div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: isDisabled ? 'var(--text-muted)' : 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {priorityLabel} Block
                                    </span>
                                    {isDisabled && <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>Disabled</span>}
                                </div>

                                <div className="card" style={{ padding: '0', margin: 0, overflow: 'hidden', border: isDisabled ? '1px dashed var(--border)' : '1px solid var(--border)' }}>
                                    {/* Group Header */}
                                    <div style={{ padding: '16px 20px', background: 'var(--bg-deep)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 600 }}>
                                                <FaClock size={14} style={{ color: 'var(--primary)', opacity: 0.8 }} />
                                                {group.startDate} {group.endDate ? ` → ${group.endDate}` : ' (Onwards)'}
                                            </div>
                                            {group.payerAccounts && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'rgba(56,189,248,0.1)', padding: '4px 10px', borderRadius: '20px', border: '1px solid rgba(56,189,248,0.2)' }}>
                                                    <FaUserEdit size={12} />
                                                    Payer(s): {group.payerAccounts}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Rules List */}
                                    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        {group.rules && group.rules.length > 0 ? (
                                            group.rules.map((rule, idx) => {
                                                const adj = toReadableAdjustment(rule.type, rule.adjustment);
                                                return (
                                                    <div key={rule.id} style={{ display: 'flex', gap: '20px' }}>
                                                        {/* Visual connection for top-down rules */}
                                                        <div style={{ width: '2px', background: 'var(--border)', margin: '10px 0', opacity: 0.5, position: 'relative' }}>
                                                            {idx < group.rules.length - 1 && <div style={{ position: 'absolute', bottom: '-15px', left: '-4px', color: 'var(--text-muted)' }}><FaArrowRight size={10} style={{ transform: 'rotate(90deg)' }} /></div>}
                                                        </div>

                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                                                                <div>
                                                                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                        {rule.name || `Billing Rule #${idx + 1}`}
                                                                    </div>
                                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                                        Includes: {rule.includeDataTransfer === 'true' ? 'Data Transfer' : ''}{rule.includeDataTransfer === 'true' && rule.includeRIPurchases === 'true' ? ', ' : ''}{rule.includeRIPurchases === 'true' ? 'RI Purchases' : ''}
                                                                        {rule.includeDataTransfer !== 'true' && rule.includeRIPurchases !== 'true' ? 'Base Usage only' : ''}
                                                                    </div>
                                                                </div>
                                                                <div style={{ padding: '6px 14px', borderRadius: '8px', background: adj.bg, border: `1px solid ${adj.border}`, color: adj.color, fontWeight: 800, fontSize: '0.9rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                                                                    {adj.text}
                                                                </div>
                                                            </div>

                                                            {/* Products Grid */}
                                                            {rule.products && rule.products.length > 0 && (
                                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px', padding: '12px', background: 'var(--bg-deep)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                                                                    {rule.products.map((prod, pIdx) => (
                                                                        <div key={prod.id || pIdx} style={{ padding: '12px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', color: 'var(--primary)' }}>
                                                                                {React.cloneElement(getIconForProduct(prod.productName), { size: 18 })}
                                                                                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{prod.productName === 'ANY' ? 'All AWS Services' : prod.productName}</span>
                                                                            </div>

                                                                            {prod.properties && Object.keys(prod.properties).length > 0 ? (
                                                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                                                    {Object.entries(prod.properties).map(([key, vals]) => {
                                                                                        if (!vals || vals.length === 0) return null;
                                                                                        const propConfig = propertyTypes[key];
                                                                                        const propName = propConfig?.name || key;

                                                                                        let details = '';
                                                                                        if (propConfig?.type === 'standard') details = vals.join(', ');
                                                                                        else if (propConfig?.type === 'instance') details = vals.map(v => `${v.type || '*'}.${v.size || '*'}`).join(', ');
                                                                                        else details = `${vals.length} filter(s)`;

                                                                                        return (
                                                                                            <div key={key} style={{ fontSize: '0.75rem', padding: '3px 8px', background: 'var(--bg-deep)', border: '1px solid var(--border)', borderRadius: '5px', color: 'var(--text-secondary)' }}>
                                                                                                <strong style={{ color: 'var(--text-main)' }}>{propName}:</strong> {details}
                                                                                            </div>
                                                                                        )
                                                                                    })}
                                                                                </div>
                                                                            ) : (
                                                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No specific filters applied (Global scope)</div>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        ) : (
                                            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                                                Empty block (no rules defined)
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>

                <div style={{ padding: '16px 20px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <FaInfoCircle size={18} style={{ color: '#38bdf8', flexShrink: 0 }} />
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        <strong>Note on Processing:</strong> Rules are evaluated top-down. Once a line item matches a billing rule and an adjustment is applied, it is <strong>automatically excluded</strong> from being modified by any subsequent rules in the list.
                    </p>
                </div>
            </div>
        );
    };


    return (
        <div className="output-section" id="nlOutputSection">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-main)' }}>
                    <FaLayerGroup style={{ color: 'var(--primary)' }} /> Pricing Execution Summary
                </h3>
            </div>

            <div style={{
                padding: '10px 0',
                maxHeight: 'calc(100vh - 250px)',
                overflowY: 'auto',
                paddingRight: '10px'
            }}>
                {renderSummary()}
            </div>
        </div>
    );
};

export default NaturalLanguageSummary;

