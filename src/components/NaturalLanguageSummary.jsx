import React, { useState } from 'react';
import { usePriceBook } from '../context/PriceBookContext';
import { propertyTypes } from '../constants/propertyTypes';
import { getIconForProduct } from '../utils/awsIcons';
import { FaSlash } from 'react-icons/fa';

const NaturalLanguageSummary = () => {
    const { state } = usePriceBook();
    const { priceBook } = state;
    const [visible, setVisible] = useState(false);

    const toReadableAdjustment = (type, adj) => {
        if (!type) return '';
        const val = parseFloat(adj);
        if (isNaN(val)) return `with adjustment ${adj}`;

        if (type === 'percentDiscount') return `a ${val}% discount`;
        if (type === 'percentIncrease') return `a ${val}% increase`;
        if (type === 'fixedRate') return `a fixed rate of ${val}`;
        return `adjustment ${adj} (${type})`;
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
                    padding: '60px 20px',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '12px',
                    border: '1px dashed var(--border)'
                }}>
                    <FaSlash size={32} style={{ marginBottom: '16px', opacity: 0.5 }} />
                    <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-secondary)' }}>Nothing to see here yet</h3>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>
                        Add at least one <strong>Rule Group with a Start Date</strong> to generate a summary.
                    </p>
                </div>
            );
        }

        const elements = [];

        elements.push(
            <div key="header" style={{ marginBottom: '10px' }}>
                <p>📖 Price Book Name is <strong>{priceBook.bookName || 'Unspecified'}</strong> and Created By <strong>{priceBook.createdBy || 'Unknown'}</strong>.</p>
                {priceBook.comment && <p>💡 Purpose: {priceBook.comment}</p>}
                <p>🛠 Rules are processed top-down — first match applies.</p>
            </div>
        );

        priceBook.ruleGroups.forEach((group, i) => {
            const enabled = group.enabled === 'false' ? 'Disabled' : 'Enabled';

            elements.push(
                <div key={`group-${group.id}`} style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                    <p><strong>RuleGroup #{i + 1}: ({enabled})</strong> — Effective from {group.startDate || 'unspecified'}
                        {group.endDate ? ` to ${group.endDate}` : ''}.
                        {group.payerAccounts ? ` Applies only to Payer Account(s): ${group.payerAccounts}` : ''}</p>
                </div>
            );

            if (group.rules && group.rules.length > 0) {
                group.rules.forEach((rule, j) => {
                    const adjPhrase = toReadableAdjustment(rule.type, rule.adjustment);
                    const neg = (parseFloat(rule.adjustment) < 0) ? ' (Negative rate)' : '';

                    elements.push(
                        <div key={`rule-${rule.id}`} style={{ marginLeft: '20px', marginTop: '10px', padding: '10px', background: 'var(--bg-card-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                            <p>• Billing Rule Name = "<strong>{rule.name || '(Unnamed)'}</strong>"</p>
                            <p>→ Applies {adjPhrase}{neg}</p>
                            <p>→ {rule.includeDataTransfer === 'true' ? 'Includes' : 'Excludes'} Data Transfer and {rule.includeRIPurchases === 'true' ? 'Includes' : 'Excludes'} RI Purchase line items.</p>

                            {(rule.products && rule.products.length > 0) && (
                                <div style={{ marginTop: '10px', paddingLeft: '10px', borderLeft: '2px solid var(--primary)' }}>
                                    <p style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>Products Scope:</p>
                                    {rule.products.map((prod, idx) => (
                                        <div key={prod.id || idx} style={{ marginTop: '5px', marginBottom: '10px' }}>
                                            <p style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {React.cloneElement(getIconForProduct(prod.productName), { size: 18 })}
                                                <span>{(prod.productName === 'ANY' || !prod.productName) ? '(All Products)' : prod.productName}</span>
                                            </p>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                Data Transfer: {prod.includeDataTransfer !== 'false' ? 'Yes' : 'No'} | RI Purchases: {prod.includeRIPurchases === 'true' ? 'Yes' : 'No'}
                                            </p>
                                            {(prod.properties && Object.keys(prod.properties).length > 0) && (
                                                <ul style={{ marginTop: '2px', paddingLeft: '20px', fontSize: '0.85rem' }}>
                                                    {Object.entries(prod.properties).map(([key, vals]) => {
                                                        if (!vals || vals.length === 0) return null;
                                                        const propConfig = propertyTypes[key];
                                                        const propName = propConfig?.name || key;

                                                        let details = '';
                                                        if (propConfig?.type === 'standard') {
                                                            details = formatList(vals);
                                                        } else if (propConfig?.type === 'instance') {
                                                            const instances = vals.map(v => {
                                                                const p = [];
                                                                if (v.type) p.push(`Type=${v.type}`);
                                                                if (v.size) p.push(`Size=${v.size}`);
                                                                if (v.reserved) p.push(`Reserved=${v.reserved === 'true' ? 'Yes' : 'No'}`);
                                                                return `Instance (${p.join(', ')})`;
                                                            });
                                                            details = formatList(instances);
                                                        } else if (propConfig?.type === 'lineItem') {
                                                            const items = vals.map(v => `${v.matchType} "${v.value}"`);
                                                            details = formatList(items);
                                                        } else {
                                                            details = `${vals.length} filter(s)`;
                                                        }

                                                        return (
                                                            <li key={key} style={{ marginBottom: '4px' }}>
                                                                <span style={{ fontWeight: 600 }}>{propName}:</span> <span style={{ color: 'var(--text-main)', fontStyle: 'italic' }}>{details}</span>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                });
            } else {
                elements.push(<p key={`group-${group.id}-empty`} style={{ marginLeft: '20px', color: 'var(--text-muted)' }}>(No rules)</p>);
            }
        });

        return elements;
    };


    return (
        <div className="output-section" id="nlOutputSection">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🤖 Your Custom Pricebook Summary
                </h3>
            </div>

            <div className="output-area" style={{
                padding: '24px',
                lineHeight: '1.7',
                background: 'var(--bg-card)',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
            }}>
                {renderSummary()}
            </div>
        </div>
    );
};
export default NaturalLanguageSummary;
