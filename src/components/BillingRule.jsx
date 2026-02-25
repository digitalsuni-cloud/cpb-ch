import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { usePriceBook } from '../context/PriceBookContext';
import { propertyTypes } from '../constants/propertyTypes';
import { motion, AnimatePresence } from 'framer-motion';
import PropertySection from './PropertySection';
import { AWSProducts } from '../constants/products';
import { FaGripVertical, FaTrash, FaPlus, FaChevronDown } from 'react-icons/fa';
import CreatableSelect from 'react-select/creatable';
import ProductItem from './ProductItem';
import ToggleSwitch from './ToggleSwitch';

const BillingRule = ({ rule, groupId }) => {
    const { dispatch } = usePriceBook();
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: rule.id });
    const [selectedProp, setSelectedProp] = useState('');
    const [isHovered, setIsHovered] = useState(false);
    const [isProductListHovered, setIsProductListHovered] = useState(false);

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.9 : 1
    };

    const updateRule = (updates) => {
        dispatch({ type: 'UPDATE_BILLING_RULE', groupId, ruleId: rule.id, updates });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        updateRule({ [name]: value });
    };

    const addProperty = (type) => {
        if (!type) return;
        const newProps = { ...rule.properties };
        if (!newProps[type]) {
            newProps[type] = [];
            updateRule({ properties: newProps });
        }
        setSelectedProp('');
    };
    const renderAdjustmentTag = () => {
        if (!rule.adjustment || isNaN(parseFloat(rule.adjustment))) return null;
        let label = '';
        let color = '';
        let bgColor = '';
        switch (rule.type) {
            case 'percentDiscount':
                label = `-${rule.adjustment}%`;
                color = 'var(--success)';
                bgColor = 'rgba(16, 185, 129, 0.1)';
                break;
            case 'percentIncrease':
                label = `+${rule.adjustment}%`;
                color = 'var(--danger)';
                bgColor = 'rgba(239, 68, 68, 0.1)';
                break;
            case 'fixedRate':
                label = `$${rule.adjustment} Fixed`;
                color = 'var(--secondary)';
                bgColor = 'rgba(6, 182, 212, 0.1)';
                break;
            default: return null;
        }

        return (
            <span style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '12px',
                background: bgColor,
                color: color,
                border: `1px solid ${color}40`,
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                flexShrink: 0
            }}>
                {label}
            </span>
        );
    };

    return (
        <div ref={setNodeRef} style={style} id={rule.id}>
            <div className="rule">
                <div className="rule-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span {...attributes} {...listeners} className="drag-handle" style={{ cursor: 'grab', color: 'var(--text-secondary)', fontSize: '1.2rem', display: 'flex' }}>
                            ⋮⋮
                        </span>

                        <div style={{ flexGrow: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {rule.collapsed ? (
                                <div
                                    style={{
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        color: 'var(--text-main)',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        padding: '8px 0',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => updateRule({ collapsed: false })}
                                    title={rule.name ? `Rule: ${rule.name}` : "Click to expand and edit"}
                                >
                                    {rule.name || <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Untitled Rule</span>}
                                </div>
                            ) : (
                                <input
                                    type="text"
                                    name="name"
                                    value={rule.name}
                                    onChange={handleChange}
                                    placeholder="Billing Rule Name"
                                    title="Enter a name for this billing rule (e.g. Service Discount)"
                                    className="ruleName"
                                    style={{ flex: 1, minWidth: 0 }}
                                    startFocus={true}
                                />
                            )}
                            {renderAdjustmentTag()}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <motion.button
                                className="button-ghost"
                                onClick={() => {
                                    if (confirm('Delete this billing rule?')) {
                                        dispatch({ type: 'REMOVE_BILLING_RULE', groupId, ruleId: rule.id });
                                    }
                                }}
                                title="Delete Billing Rule"
                                whileHover={{ scale: 1.1, color: '#ef4444' }}
                                whileTap={{ scale: 0.9 }}
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    padding: '0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--text-secondary)',
                                    background: 'transparent',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    borderRadius: '6px',
                                    boxShadow: 'none'
                                }}
                            >
                                <FaTrash size={12} />
                            </motion.button>

                            <motion.button
                                className="button-ghost"
                                onClick={() => updateRule({ collapsed: !rule.collapsed })}
                                title={rule.collapsed ? "Expand Billing Rule" : "Collapse Billing Rule"}
                                whileHover={{ scale: 1.1, rotate: rule.collapsed ? 0 : 5 }}
                                whileTap={{ scale: 0.9 }}
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    padding: '0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(6, 182, 212, 0.1))',
                                    border: '1px solid var(--border-glow)',
                                    borderRadius: '6px',
                                    fontSize: '0.9rem'
                                }}
                            >
                                <motion.span
                                    animate={{ rotate: rule.collapsed ? -90 : 0 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                    style={{ display: 'flex' }}
                                >
                                    ▼
                                </motion.span>
                            </motion.button>
                        </div>
                    </div>
                </div>

                <AnimatePresence>
                    {!rule.collapsed && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="rule-content"
                            style={{ paddingTop: '16px' }}
                        >
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                                <div className="input-group">
                                    <label>Adjustment</label>
                                    <input type="number" name="adjustment" value={rule.adjustment} onChange={handleChange} placeholder="0.00" />
                                </div>
                                <div className="input-group">
                                    <label>Type</label>
                                    <select name="type" value={rule.type} onChange={handleChange}>
                                        <option value="percentDiscount">% Discount</option>
                                        <option value="percentIncrease">% Increase</option>
                                        <option value="fixedRate">Fixed Rate</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', gap: '24px', gridColumn: 'span 2' }}>
                                    <div className="input-group" style={{ margin: 0, flex: 1 }}>
                                        <label>Include Data Transfer</label>
                                        <div style={{ height: '38px', display: 'flex', alignItems: 'center' }}>
                                            <ToggleSwitch
                                                label={rule.includeDataTransfer === 'true' ? 'Yes' : 'No'}
                                                checked={rule.includeDataTransfer === 'true'}
                                                onChange={(checked) => updateRule({ includeDataTransfer: checked ? 'true' : 'false' })}
                                            />
                                        </div>
                                    </div>
                                    <div className="input-group" style={{ margin: 0, flex: 1 }}>
                                        <label>Include RI Purchases</label>
                                        <div style={{ height: '38px', display: 'flex', alignItems: 'center' }}>
                                            <ToggleSwitch
                                                label={rule.includeRIPurchases === 'true' ? 'Yes' : 'No'}
                                                checked={rule.includeRIPurchases === 'true'}
                                                onChange={(checked) => updateRule({ includeRIPurchases: checked ? 'true' : 'false' })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ background: 'var(--bg-subtle)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <h5 style={{ margin: 0, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.85rem' }}>Products Scope</h5>
                                </div>

                                <div
                                    style={{
                                        height: '16px',
                                        margin: '0 0 16px 0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        position: 'relative',
                                        cursor: 'pointer',
                                        width: '100%',
                                        zIndex: 20
                                    }}
                                    onMouseEnter={() => setIsProductListHovered(true)}
                                    onMouseLeave={() => setIsProductListHovered(false)}
                                    onClick={() => dispatch({ type: 'ADD_PRODUCT', groupId, ruleId: rule.id, prepend: true })}
                                >
                                    <div style={{
                                        width: '100%',
                                        height: '1px',
                                        background: isProductListHovered
                                            ? 'linear-gradient(90deg, transparent, var(--success), transparent)'
                                            : 'var(--border)',
                                        opacity: isProductListHovered ? 1 : 0.2,
                                        transition: 'all 0.3s'
                                    }} />

                                    <motion.div
                                        animate={{
                                            scale: isProductListHovered ? 1 : 0.8,
                                            opacity: isProductListHovered ? 1 : 0,
                                            y: isProductListHovered ? 0 : 3
                                        }}
                                        style={{
                                            position: 'absolute',
                                            background: 'var(--success)',
                                            color: 'white',
                                            padding: '3px 12px',
                                            borderRadius: '12px',
                                            fontSize: '0.7rem',
                                            fontWeight: 700,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '3px',
                                            boxShadow: '0 2px 6px rgba(16, 185, 129, 0.4)',
                                            pointerEvents: 'none',
                                            zIndex: 2
                                        }}
                                    >
                                        <FaPlus size={7} /> Insert Product
                                    </motion.div>

                                    {!isProductListHovered && (
                                        <div style={{
                                            position: 'absolute',
                                            width: '14px',
                                            height: '14px',
                                            borderRadius: '50%',
                                            border: '1px solid var(--success)',
                                            color: 'var(--success)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: 'var(--bg-deep)',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                            zIndex: 2,
                                            transition: 'all 0.3s'
                                        }}>
                                            <FaPlus size={8} />
                                        </div>
                                    )}
                                </div>

                                <div className="product-list">
                                    <AnimatePresence>
                                        {(rule.products || []).map((product, index) => (
                                            <ProductItem
                                                key={product.id}
                                                product={product}
                                                index={index}
                                                groupId={groupId}
                                                ruleId={rule.id}
                                            />
                                        ))}
                                    </AnimatePresence>
                                    {(rule.products || []).length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: '8px' }}>
                                            No products added. Hover above to add a product.
                                        </div>
                                    )}
                                </div>
                            </div>


                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Insertion Divider for Billing Rule */}
            <div
                style={{
                    height: '16px',
                    margin: '8px 0 16px 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    cursor: 'pointer',
                    width: '100%',
                    zIndex: 20
                }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={() => dispatch({ type: 'ADD_BILLING_RULE', groupId, afterId: rule.id })}
                title="Insert Billing Rule Here"
            >
                <div style={{
                    width: '100%',
                    height: '2px',
                    background: isHovered
                        ? 'linear-gradient(90deg, transparent, var(--secondary), transparent)'
                        : 'var(--border)',
                    opacity: isHovered ? 1 : 0.3, // Visible faint line by default now? No, kept invisible line or faint. User asked for small +, so faint line helps context.
                    transition: 'all 0.3s'
                }} />

                <motion.div
                    animate={{
                        scale: isHovered ? 1 : 0.8,
                        opacity: isHovered ? 1 : 0,
                        y: isHovered ? 0 : 5
                    }}
                    style={{
                        position: 'absolute',
                        background: 'var(--secondary)',
                        color: 'white',
                        padding: '4px 14px',
                        borderRadius: '14px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 8px rgba(6, 182, 212, 0.4)',
                        pointerEvents: 'none',
                        zIndex: 2
                    }}
                >
                    <FaPlus size={8} /> Insert Billing Rule
                </motion.div>

                {!isHovered && (
                    <div style={{
                        position: 'absolute',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        border: '1px solid var(--secondary)',
                        color: 'var(--secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--bg-deep)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        zIndex: 2,
                        transition: 'all 0.3s'
                    }}>
                        <FaPlus size={10} />
                    </div>
                )}
            </div>
        </div >
    );
};
export default BillingRule;
