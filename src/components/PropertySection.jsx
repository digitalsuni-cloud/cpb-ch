import React from 'react';
import { propertyTypes } from '../constants/propertyTypes';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTrash, FaChevronDown, FaTimes, FaPlus } from 'react-icons/fa';
import Tooltip from './Tooltip';
import CustomSelect from './CustomSelect';


const PropertySection = ({ type, values, onChange, onRemove, expanded: controlledExpanded, onToggle }) => {
    const config = propertyTypes[type];
    const [internalExpanded, setInternalExpanded] = React.useState(true);

    const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

    const handleToggle = () => {
        if (isExpanded) {
            cleanupEmptyValues();
        }
        if (onToggle) {
            onToggle();
        } else {
            setInternalExpanded(!isExpanded);
        }
    };

    const addValue = () => {
        let newValue;
        if (config.type === 'standard') newValue = '';
        else if (config.type === 'instance') newValue = { type: '', size: '', reserved: 'false' };
        else if (config.type === 'lineItem') newValue = { matchType: 'contains', value: '' };

        onChange([...values, newValue]);
        // Auto-expand on add if controlled
        if (!isExpanded && onToggle) onToggle();
    };

    const removeValue = (index) => {
        const newValues = [...values];
        newValues.splice(index, 1);
        onChange(newValues);
    };

    const updateValue = (index, updates) => {
        const newValues = [...values];
        if (config.type === 'standard') {
            newValues[index] = updates;
        } else {
            newValues[index] = { ...newValues[index], ...updates };
        }
        onChange(newValues);
    };

    // Cleanup empty values
    const cleanupEmptyValues = () => {
        const cleanedValues = values.filter(val => {
            if (config.type === 'standard') {
                return val && val.trim() !== '';
            } else if (config.type === 'instance') {
                return val.type || val.size;
            } else if (config.type === 'lineItem') {
                return val.value && val.value.trim() !== '';
            }
            return true;
        });

        if (cleanedValues.length !== values.length) {
            onChange(cleanedValues);
        }
    };

    return (
        <div className="property-section" id={`${type}Section`} style={{ background: 'var(--bg-deep)', borderRadius: '8px', border: '1px solid var(--border)', overflow: 'hidden', marginBottom: '16px' }}>
            <div
                className="property-header"
                onClick={handleToggle}
                style={{
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: 'var(--bg-card-hover)',
                    borderBottom: isExpanded ? '1px solid var(--border)' : 'none'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h5 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)', fontFamily: 'var(--font-heading)' }}>{config.name}</h5>
                    <span style={{
                        fontSize: '0.8rem', color: (() => {
                            const nonEmptyCount = values.filter(val => {
                                if (config.type === 'standard') return val && val.trim() !== '';
                                if (config.type === 'instance') return val.type || val.size;
                                if (config.type === 'lineItem') return val.value && val.value.trim() !== '';
                                return true;
                            }).length;
                            return nonEmptyCount > 0 ? 'var(--success)' : 'var(--text-muted)';
                        })()
                    }}>
                        • {(() => {
                            const nonEmptyCount = values.filter(val => {
                                if (config.type === 'standard') return val && val.trim() !== '';
                                if (config.type === 'instance') return val.type || val.size;
                                if (config.type === 'lineItem') return val.value && val.value.trim() !== '';
                                return true;
                            }).length;
                            return `${nonEmptyCount} ${nonEmptyCount === 1 ? 'filter' : 'filters'}`;
                        })()}
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Tooltip title="Remove Filter" content={`Completely remove the ${config.name} filter type from this product scope`} variant="danger">
                        <motion.button
                            className="button-ghost"
                            onClick={(e) => { e.stopPropagation(); onRemove(); }}
                            whileHover={{ scale: 1.1, color: '#f43f5e', borderColor: '#f43f5e', background: 'rgba(244, 63, 94, 0.1)' }}
                            whileTap={{ scale: 0.95 }}
                            style={{
                                width: '24px',
                                height: '24px',
                                padding: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--text-muted)',
                                background: 'transparent',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxSizing: 'border-box'
                            }}
                        >
                            <FaTrash size={10} />
                        </motion.button>
                    </Tooltip>
                    <Tooltip title={isExpanded ? "Collapse" : "Expand"} content={isExpanded ? "Hide filter details" : "Show filter details"}>
                        <motion.button
                            className="button-ghost"
                            onClick={(e) => { e.stopPropagation(); handleToggle(); }}
                            whileHover={{ scale: 1.1, rotate: isExpanded ? 5 : 0, color: 'var(--primary)', borderColor: 'var(--primary)', background: 'rgba(139, 92, 246, 0.1)' }}
                            whileTap={{ scale: 0.95 }}
                            style={{
                                width: '24px',
                                height: '24px',
                                padding: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--text-muted)',
                                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(6, 182, 212, 0.1))',
                                border: '1px solid var(--border-glow)',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                boxSizing: 'border-box'
                            }}
                        >
                            <motion.span
                                animate={{ rotate: isExpanded ? 0 : -90 }}
                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                style={{ display: 'flex', fontSize: '0.6rem' }}
                            >
                                ▼
                            </motion.span>
                        </motion.button>
                    </Tooltip>
                </div>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ padding: '16px' }}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {values.map((val, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="sub-entry"
                                    style={{ display: 'flex', gap: '10px', alignItems: 'center', width: '100%' }}
                                >

                                    {config.type === 'standard' && (
                                        <input
                                            type="text"
                                            value={val}
                                            onChange={(e) => updateValue(index, e.target.value)}
                                            placeholder={`Enter ${config.name}`}
                                            style={{ flexGrow: 1, fontSize: '0.85rem' }}
                                        />
                                    )}

                                    {config.type === 'instance' && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', flexGrow: 1 }}>
                                            <input type="text" value={val.type} onChange={(e) => updateValue(index, { type: e.target.value })} placeholder="Type (e.g. t3)" style={{ fontSize: '0.85rem' }} />
                                            <input type="text" value={val.size} onChange={(e) => updateValue(index, { size: e.target.value })} placeholder="Size (e.g. large)" style={{ fontSize: '0.85rem' }} />
                                            <CustomSelect
                                                value={val.reserved}
                                                onChange={(e) => updateValue(index, { reserved: e.target.value })}
                                                options={[
                                                    { value: 'false', label: 'On-Demand' },
                                                    { value: 'true',  label: 'Reserved'  }
                                                ]}
                                                style={{ fontSize: '0.85rem' }}
                                            />
                                        </div>
                                    )}

                                    {config.type === 'lineItem' && (
                                        <div style={{ display: 'flex', gap: '8px', flexGrow: 1 }}>
                                            <CustomSelect
                                                value={val.matchType}
                                                onChange={(e) => updateValue(index, { matchType: e.target.value })}
                                                options={[
                                                    { value: 'contains',     label: 'Contains'    },
                                                    { value: 'startsWith',   label: 'Starts With' },
                                                    { value: 'matchesRegex', label: 'Regex'       }
                                                ]}
                                                style={{ width: '130px', fontSize: '0.85rem' }}
                                            />
                                            <input type="text" value={val.value} onChange={(e) => updateValue(index, { value: e.target.value })} placeholder="Pattern..." style={{ flexGrow: 1, fontSize: '0.85rem' }} />
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <Tooltip title="Remove Value" content="Delete this specific filter value" variant="danger">
                                            <button
                                                onClick={() => removeValue(index)}
                                                style={{
                                                    width: '32px',
                                                    height: '32px',
                                                    padding: 0,
                                                    borderRadius: '50%',
                                                    border: '1px solid var(--accent)',
                                                    background: 'rgba(244, 63, 94, 0.1)',
                                                    color: 'var(--accent)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    fontSize: '1.2rem',
                                                    fontWeight: 'bold',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = 'var(--accent)';
                                                    e.currentTarget.style.color = 'white';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = 'rgba(244, 63, 94, 0.1)';
                                                    e.currentTarget.style.color = 'var(--accent)';
                                                }}
                                            >
                                                <FaTimes size={14} />
                                            </button>
                                        </Tooltip>
                                        {index === values.length - 1 && (
                                            <Tooltip title="Add Value" content={`Add another ${config.name} filter`}>
                                                <button
                                                    onClick={addValue}
                                                    style={{
                                                        width: '32px',
                                                        height: '32px',
                                                        padding: 0,
                                                        borderRadius: '50%',
                                                        border: '1px solid var(--success)',
                                                        background: 'rgba(16, 185, 129, 0.1)',
                                                        color: 'var(--success)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        fontSize: '1.2rem',
                                                        fontWeight: 'bold',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = 'var(--success)';
                                                        e.currentTarget.style.color = 'white';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
                                                        e.currentTarget.style.color = 'var(--success)';
                                                    }}
                                                >
                                                    <FaPlus size={14} />
                                                </button>
                                            </Tooltip>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                            {values.length === 0 && (
                                <Tooltip title="Add Filter" content={`Begin adding ${config.name} filters`}>
                                    <button
                                        onClick={addValue}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            borderRadius: '8px',
                                            border: '2px dashed var(--success)',
                                            background: 'rgba(16, 185, 129, 0.05)',
                                            color: 'var(--success)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            fontSize: '0.9rem',
                                            fontWeight: 600,
                                            gap: '6px',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'rgba(16, 185, 129, 0.05)';
                                        }}
                                    >
                                        <span style={{ fontSize: '1.2rem' }}>+</span> Add Value
                                    </button>
                                </Tooltip>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
export default PropertySection;
