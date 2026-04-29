import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePriceBook } from '../context/PriceBookContext';
import { useConfirm } from '../context/ConfirmContext';
import CreatableSelect from 'react-select/creatable';
import CustomSelect from './CustomSelect';

import { AWSProducts } from '../constants/products';
import PropertySection from './PropertySection';
import { propertyTypes } from '../constants/propertyTypes';
import { getIconForProduct } from '../utils/awsIcons';
import { FaTrash, FaPlus } from 'react-icons/fa';
import Tooltip from './Tooltip';

const customStyles = {
    control: (base, state) => ({
        ...base,
        backgroundColor: 'var(--input-bg)',
        backgroundImage: 'linear-gradient(90deg, transparent, var(--border-glow), transparent)',
        backgroundSize: '100% 1px',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'top',
        border: `1px solid ${state.isFocused ? 'var(--primary)' : 'var(--border)'}`,
        borderRadius: '8px',                    // matches --radius-md
        boxShadow: state.isFocused
            ? '0 0 0 4px rgba(79, 70, 229, 0.1)'
            : 'none',
        color: 'var(--text-main)',
        fontSize: '0.9rem',
        minHeight: '36px',                      // matches the unified input height
        transition: 'all 0.2s',
        cursor: 'pointer',
        '&:hover': {
            borderColor: state.isFocused ? 'var(--primary)' : 'var(--border)',
        },
    }),
    valueContainer: (base) => ({
        ...base,
        padding: '0 8px 0 12px',
    }),
    indicatorsContainer: (base) => ({
        ...base,
        height: '36px',
    }),
    dropdownIndicator: (base) => ({
        ...base,
        color: 'var(--text-muted)',
        padding: '0 8px',
        '&:hover': { color: 'var(--text-main)' },
    }),
    indicatorSeparator: (base) => ({
        ...base,
        backgroundColor: 'var(--border)',
    }),
    clearIndicator: (base) => ({
        ...base,
        color: 'var(--text-muted)',
        padding: '0 4px',
        '&:hover': { color: 'var(--danger)' },
    }),
    menu: (base) => ({
        ...base,
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        boxShadow: '0 16px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.1)',
        overflow: 'hidden',
        zIndex: 99999,
    }),
    menuList: (base) => ({
        ...base,
        padding: '6px',
        maxHeight: '260px',
    }),
    option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected
            ? 'rgba(99,102,241,0.15)'
            : state.isFocused
                ? 'rgba(255,255,255,0.04)'
                : 'transparent',
        color: state.isSelected ? 'var(--primary)' : 'var(--text-main)',
        fontWeight: state.isSelected ? 600 : 400,
        borderRadius: '6px',
        fontSize: '0.9rem',
        cursor: 'pointer',
        padding: '9px 12px',
        transition: 'all 0.12s',
        '&:active': {
            backgroundColor: 'rgba(99,102,241,0.2)',
        },
    }),
    singleValue: (base) => ({
        ...base,
        color: 'var(--text-main)',
        fontSize: '0.9rem',
    }),
    placeholder: (base) => ({
        ...base,
        color: 'var(--text-muted)',
        fontSize: '0.9rem',
    }),
    input: (base) => ({
        ...base,
        color: 'var(--text-main)',
        fontSize: '0.9rem',
        margin: 0,
        padding: 0,
    }),
    multiValue: (base) => ({
        ...base,
        background: 'rgba(139, 92, 246, 0.2)',
        borderRadius: '4px',
    }),
    multiValueLabel: (base) => ({
        ...base,
        color: 'var(--primary)',
    }),
    multiValueRemove: (base) => ({
        ...base,
        color: 'var(--text-muted)',
        borderRadius: '0 4px 4px 0',
        ':hover': {
            background: 'rgba(239, 68, 68, 0.2)',
            color: 'var(--danger)',
        },
    }),
};



const productOptions = [
    { value: 'ANY', label: 'ANY' },
    ...AWSProducts.map(p => ({ value: p, label: p }))
];

const ProductItem = ({ product, index, groupId, ruleId }) => {
    const { dispatch } = usePriceBook();
    const confirm = useConfirm();
    // Auto-expand only if the product has zero properties configured (ie brand new)
    const [expanded, setExpanded] = useState(() => Object.keys(product.properties || {}).length === 0);
    const [expandedSections, setExpandedSections] = useState({});
    const [isHovered, setIsHovered] = useState(false);

    const isSectionExpanded = (type) => expandedSections[type] !== false;

    const toggleSection = (type) => {
        setExpandedSections(prev => ({ ...prev, [type]: !isSectionExpanded(type) }));
    };

    const toggleAllFilters = () => {
        const allTypes = Object.keys(product.properties);
        const allExpanded = allTypes.every(t => isSectionExpanded(t));

        const newState = {};
        allTypes.forEach(t => {
            newState[t] = !allExpanded;
        });
        setExpandedSections(newState);
    };


    const handleChange = (field, value) => {
        dispatch({
            type: 'UPDATE_PRODUCT',
            groupId,
            ruleId,
            productId: product.id,
            updates: { [field]: value }
        });
    };

    const handlePropertyChange = (propType, newValues) => {
        const newProps = { ...product.properties, [propType]: newValues };
        handleChange('properties', newProps);
    };

    const removePropertyType = (propType) => {
        const newProps = { ...product.properties };
        delete newProps[propType];
        handleChange('properties', newProps);
    };

    const addPropertyType = (e) => {
        const type = e.target.value;
        if (type && !product.properties[type]) {
            // Auto-add an empty value so user can start typing immediately
            const config = propertyTypes[type];
            let newValue;
            if (config.type === 'standard') newValue = '';
            else if (config.type === 'instance') newValue = { type: '', size: '', reserved: 'false' };
            else if (config.type === 'lineItem') newValue = { matchType: 'contains', value: '' };

            handlePropertyChange(type, [newValue]);
            // Ensure expanded by default
            setExpandedSections(prev => ({ ...prev, [type]: true }));
        }
    };

    const cleanupProperties = () => {
        const newProps = { ...product.properties };
        let modified = false;

        Object.entries(newProps).forEach(([type, values]) => {
            const config = propertyTypes[type];
            if (!config) return;

            const cleaned = values.filter(val => {
                if (config.type === 'standard') return typeof val === 'string' && val.trim() !== '';
                if (config.type === 'instance') return val.type || val.size;
                if (config.type === 'lineItem') return val.value && val.value.trim() !== '';
                return true;
            });

            if (cleaned.length !== values.length) {
                newProps[type] = cleaned;
                modified = true;
            }

            if (cleaned.length === 0) {
                delete newProps[type];
                modified = true;
            }
        });

        if (modified) {
            handleChange('properties', newProps);
        }
    };

    return (
        <div style={{ marginBottom: '10px' }}>
            <div style={{
                background: 'var(--bg-deep)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                overflow: 'hidden',
                marginBottom: '4px' // Reduced margin since divider handles spacing
            }}>
                {/* Header */}
                <div
                    onClick={() => {
                        if (expanded) cleanupProperties();
                        setExpanded(!expanded);
                    }}
                    style={{
                        padding: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        background: 'var(--bg-card-hover)'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                        {getIconForProduct(product.productName)}
                        <strong style={{ color: 'var(--text-main)' }}>{product.productName || '(No Product Selected)'}</strong>

                        {/* Property Filter Tags */}
                        {!expanded && Object.keys(product.properties).length > 0 && (
                            <div
                                className="property-tags-scroll"
                                style={{
                                    display: 'flex',
                                    gap: '4px',
                                    flexWrap: 'nowrap',
                                    alignItems: 'center',
                                    overflowX: 'auto',
                                    scrollbarWidth: 'none',
                                    msOverflowStyle: 'none',
                                    paddingRight: '12px',
                                    marginLeft: '8px',
                                    minWidth: 0
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {Object.entries(product.properties).map(([propKey, values]) => {
                                    if (!values || values.length === 0) return null;
                                    const propName = propertyTypes[propKey]?.name || propKey;
                                    return (
                                        <Tooltip key={propKey} title={propName} content={`Specific filters applied for ${propName}`}>
                                            <span
                                                className="property-tag"
                                                style={{
                                                    background: 'rgba(139, 92, 246, 0.15)',
                                                    border: '1px solid rgba(139, 92, 246, 0.4)',
                                                    color: 'var(--primary)',
                                                    padding: '2px 8px',
                                                    borderRadius: '8px',
                                                    fontSize: '0.62rem',
                                                    fontWeight: 600,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setExpanded(true);
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = 'rgba(139, 92, 246, 0.25)';
                                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)';
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                }}
                                            >
                                                {propName}
                                                <span style={{
                                                    background: 'var(--primary)',
                                                    color: 'white',
                                                    padding: '1px 5px',
                                                    borderRadius: '4px',
                                                    fontSize: '0.6rem',
                                                    fontWeight: 700
                                                }}>
                                                    {values.length}
                                                </span>
                                            </span>
                                        </Tooltip>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Tooltip title="Delete Product" content="Remove this product scope and all its filters from the rule" variant="danger">
                            <motion.button
                                className="button-ghost"
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    if (await confirm({
                                        title: 'Remove Product',
                                        message: `Are you sure you want to remove the product scope "${product.productName || 'ANY'}"?`,
                                        variant: 'danger',
                                        confirmLabel: 'Remove Product'
                                    })) {
                                        dispatch({ type: 'REMOVE_PRODUCT', groupId, ruleId, productId: product.id });
                                    }
                                }}
                                whileHover={{ scale: 1.1, color: '#ef4444' }}
                                whileTap={{ scale: 0.9 }}
                                style={{
                                    color: 'var(--text-muted)',
                                    borderColor: 'rgba(239, 68, 68, 0.3)',
                                    padding: '0',
                                    background: 'transparent',
                                    width: '28px',
                                    height: '28px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                }}
                            >
                                <FaTrash size={12} />
                            </motion.button>
                        </Tooltip>

                        <Tooltip title={!expanded ? "Expand" : "Collapse"} content={!expanded ? "Configure filters for this product" : "Hide configuration"}>
                            <motion.button
                                className="button-ghost"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (expanded) cleanupProperties();
                                    setExpanded(!expanded);
                                }}
                                whileHover={{ scale: 1.1, rotate: !expanded ? 0 : 5 }}
                                whileTap={{ scale: 0.9 }}
                                style={{
                                    width: '28px',
                                    height: '28px',
                                    padding: '0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(6, 182, 212, 0.1))',
                                    border: '1px solid var(--border-glow)',
                                    borderRadius: '6px',
                                    fontSize: '0.8rem'
                                }}
                            >
                                <motion.span
                                    animate={{ rotate: !expanded ? -90 : 0 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                    style={{ display: 'flex' }}
                                >
                                    ▼
                                </motion.span>
                            </motion.button>
                        </Tooltip>
                    </div>
                </div>

                {/* Content */}
                <AnimatePresence>
                    {expanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            style={{ padding: '16px', borderTop: '1px solid var(--border)' }}
                        >
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap' }}>
                                <div className="input-group" style={{ flex: '1 1 300px', marginBottom: 0 }}>
                                    <label style={{ marginBottom: '8px', display: 'block' }}>Product Name</label>
                                    <CreatableSelect
                                        isClearable
                                        options={productOptions}
                                        value={product.productName ? { label: product.productName, value: product.productName } : null}
                                        onChange={(val) => handleChange('productName', val ? val.value : '')}
                                        styles={customStyles}
                                        placeholder="Select or type product or leave it empty for ANY"
                                        formatCreateLabel={(inputValue) => `Use "${inputValue}"`}
                                        formatOptionLabel={({ label }) => (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {React.cloneElement(getIconForProduct(label), { size: 16 })}
                                                <span>{label}</span>
                                            </div>
                                        )}
                                    />
                                </div>

                                <div className="input-group" style={{ flex: '0 0 auto', marginBottom: 0 }}>
                                    <label style={{ marginBottom: '8px', display: 'block', whiteSpace: 'nowrap' }}>Data Transfer</label>
                                    <CustomSelect
                                        value={product.includeDataTransfer || 'inherit'}
                                        onChange={(e) => handleChange('includeDataTransfer', e.target.value)}
                                        options={[
                                            { value: 'inherit', label: 'Inherit' },
                                            { value: 'true',    label: 'Yes' },
                                            { value: 'false',   label: 'No'  }
                                        ]}
                                        style={{ minWidth: '120px' }}
                                    />
                                </div>

                                <div className="input-group" style={{ flex: '0 0 auto', marginBottom: 0 }}>
                                    <label style={{ marginBottom: '8px', display: 'block', whiteSpace: 'nowrap' }}>RI Purchases</label>
                                    <CustomSelect
                                        value={product.includeRIPurchases || 'inherit'}
                                        onChange={(e) => handleChange('includeRIPurchases', e.target.value)}
                                        options={[
                                            { value: 'inherit', label: 'Inherit' },
                                            { value: 'true',    label: 'Yes' },
                                            { value: 'false',   label: 'No'  }
                                        ]}
                                        style={{ minWidth: '120px' }}
                                    />
                                </div>
                            </div>


                            <div style={{ marginTop: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '5px' }}>
                                    <h4 style={{ margin: 0 }}>Property Filters</h4>
                                    {Object.keys(product.properties).length > 0 && (
                                        <button
                                            className="button"
                                            onClick={toggleAllFilters}
                                            style={{
                                                fontSize: '0.75rem',
                                                padding: '4px 12px',
                                                height: '28px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                background: 'var(--primary)',
                                                border: 'none',
                                                color: '#fff',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                            }}
                                        >
                                            {Object.keys(product.properties).every(t => isSectionExpanded(t)) ? 'Collapse All' : 'Expand All'}
                                        </button>
                                    )}
                                </div>

                                <div style={{
                                    display: 'flex',
                                    gap: '8px',
                                    flexWrap: 'wrap',
                                    justifyContent: 'center',
                                    paddingBottom: '8px',
                                    marginBottom: '16px'
                                }}>
                                    {Object.keys(propertyTypes).map(key => {
                                        const isAdded = !!product.properties[key];
                                        return (
                                            <motion.button
                                                key={key}
                                                whileHover={!isAdded ? { scale: 1.05, backgroundColor: 'rgba(139, 92, 246, 0.1)' } : {}}
                                                whileTap={!isAdded ? { scale: 0.95 } : {}}
                                                onClick={() => !isAdded && addPropertyType({ target: { value: key } })}
                                                style={{
                                                    padding: '4px 10px',
                                                    borderRadius: '20px',
                                                    border: '1px solid',
                                                    borderColor: isAdded ? 'var(--primary)' : 'var(--border)',
                                                    background: isAdded ? 'rgba(139, 92, 246, 0.15)' : 'var(--bg-card)',
                                                    color: isAdded ? 'var(--primary)' : 'var(--text-main)',
                                                    fontSize: '0.68rem',
                                                    fontWeight: 600,
                                                    cursor: isAdded ? 'default' : 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    whiteSpace: 'nowrap',
                                                    opacity: isAdded ? 1 : 1,
                                                    transition: 'all 0.2s',
                                                    flexShrink: 0,
                                                    boxShadow: isAdded ? '0 0 10px rgba(139, 92, 246, 0.3)' : 'none',
                                                    transform: isAdded ? 'scale(1.02)' : 'scale(1)'
                                                }}
                                            >
                                                <span style={{ fontSize: '0.9rem' }}>{isAdded ? '✓' : '+'}</span>
                                                {propertyTypes[key].name}
                                            </motion.button>
                                        );
                                    })}
                                </div>

                                {Object.entries(product.properties).map(([type, values]) => (
                                    <PropertySection
                                        key={type}
                                        type={type}
                                        values={values}
                                        expanded={isSectionExpanded(type)}
                                        onToggle={() => toggleSection(type)}
                                        onChange={(newValues) => handlePropertyChange(type, newValues)}
                                        onRemove={() => removePropertyType(type)}
                                    />
                                ))}

                                {Object.keys(product.properties).length === 0 && (
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>No property filters added.</p>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div> {/* Closing the Card Container */}

            {/* Insertion Divider for Products */}
            <div
                style={{
                    height: '16px',
                    margin: '12px 0 16px 0',
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
                onClick={() => dispatch({ type: 'ADD_PRODUCT', groupId, ruleId, afterId: product.id })}
            >
                <div style={{
                    width: '100%',
                    height: '1px',
                    background: isHovered
                        ? 'linear-gradient(90deg, transparent, var(--success), transparent)'
                        : 'var(--border)',
                    opacity: isHovered ? 1 : 0.25,
                    transition: 'all 0.3s'
                }} />

                <motion.div
                    animate={{
                        scale: isHovered ? 1 : 0.8,
                        opacity: isHovered ? 1 : 0,
                        y: isHovered ? 0 : 3
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

                {!isHovered && (
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
        </div>
    );
};

export default ProductItem;
