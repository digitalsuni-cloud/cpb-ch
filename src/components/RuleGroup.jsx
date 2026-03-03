import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { usePriceBook } from '../context/PriceBookContext';
import { motion, AnimatePresence } from 'framer-motion';
import BillingRuleList from './BillingRuleList';
import { FaPlus, FaTrash } from 'react-icons/fa';

const RuleGroup = ({ group, index }) => {
    const { dispatch } = usePriceBook();
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: group.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 1000 : 1,
        opacity: isDragging ? 0.8 : 1,
    };

    const toggleCollapse = () => {
        dispatch({ type: 'UPDATE_RULE_GROUP', groupId: group.id, updates: { collapsed: !group.collapsed } });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        dispatch({
            type: 'UPDATE_RULE_GROUP',
            groupId: group.id,
            updates: { [name]: value }
        });
    }

    const [isHovered, setIsHovered] = React.useState(false);
    const [isListStartHovered, setIsListStartHovered] = React.useState(false);


    const getStatus = () => {
        if (group.endDate) {
            const end = new Date(group.endDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);

            // If end date is in the past
            if (end < today) {
                const monthsDiff = (today.getFullYear() - end.getFullYear()) * 12 + (today.getMonth() - end.getMonth());
                if (monthsDiff >= 13) return 'EXPIRED';
                return 'INACTIVE'; // End date is in the past but less than 13 months ago
            }
        }
        return group.enabled === 'true' ? 'ACTIVE' : 'DISABLED';
    };

    const getStatusTooltip = (status) => {
        switch (status) {
            case 'ACTIVE':
                return 'This rule group is currently active and will be applied';
            case 'DISABLED':
                return 'This rule group is disabled and will not be applied';
            case 'INACTIVE':
                return 'This rule group has ended (end date has passed)';
            case 'EXPIRED':
                return 'This rule group expired over 13 months ago';
            default:
                return '';
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'EXPIRED':
                return { backgroundColor: '#f59e0b', color: 'white', borderColor: '#f59e0b' };
            case 'INACTIVE':
                return { backgroundColor: '#64748b', color: 'white', borderColor: '#64748b' };
            default:
                return {};
        }
    };

    const status = getStatus();

    const renderAdjustmentTagForRule = (rule) => {
        if (!rule.adjustment || isNaN(parseFloat(rule.adjustment))) return null;
        let label = '';
        let color = '';
        switch (rule.type) {
            case 'percentDiscount': label = `-${rule.adjustment}%`; color = 'var(--success)'; break;
            case 'percentIncrease': label = `+${rule.adjustment}%`; color = '#ef4444'; break;
            case 'fixedRate': label = `$${rule.adjustment}`; color = 'var(--secondary)'; break;
            default: return null;
        }
        return (
            <span style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: color,
                background: `${color}15`,
                padding: '1px 6px',
                borderRadius: '4px',
                border: `1px solid ${color}30`,
                whiteSpace: 'nowrap'
            }}>
                {label}
            </span>
        );
    };

    const renderRulesSummary = () => {
        if (!group.collapsed || !group.rules || group.rules.length === 0) return null;

        const maxVisible = 2;
        const visibleRules = group.rules.slice(0, maxVisible);
        const remainingCount = group.rules.length - maxVisible;

        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px', flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    {visibleRules.map((rule, idx) => {
                        const name = rule.name || "Untitled Rule";
                        const truncatedName = name.length > 15 ? name.substring(0, 13) + '...' : name;

                        return (
                            <React.Fragment key={rule.id}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 500 }}>{truncatedName}</span>
                                    {renderAdjustmentTagForRule(rule)}
                                </div>
                                {(idx < visibleRules.length - 1 || remainingCount > 0) && <span style={{ color: 'var(--text-muted)' }}>|</span>}
                            </React.Fragment>
                        );
                    })}
                    {remainingCount > 0 && (
                        <span style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            fontStyle: 'italic',
                            whiteSpace: 'nowrap'
                        }}>
                            +{remainingCount} more
                        </span>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div ref={setNodeRef} style={style} id={group.id}>
            <div className={`rule-group ${group.collapsed ? 'collapsed' : ''}`}>
                <div className="rule-group-header" style={{ borderBottom: 'none', paddingBottom: group.collapsed ? '0' : '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0, overflow: 'hidden' }}>
                            <span {...attributes} {...listeners} className="drag-handle" style={{ cursor: 'grab', color: 'var(--text-muted)', fontSize: '1.5rem', lineHeight: 1 }} title="Drag to reorder">
                                ⋮⋮
                            </span>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                Rule Group {index + 1}
                            </h3>
                            <span
                                className={`status-badge ${status === 'ACTIVE' ? 'enabled' : 'disabled'}`}
                                style={{ ...getStatusStyle(status), padding: '2px 10px', fontSize: '0.7rem' }}
                                title={getStatusTooltip(status)}
                            >
                                {status}
                            </span>
                            {renderRulesSummary()}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <motion.button
                                className="button-ghost"
                                onClick={() => {
                                    if (confirm('Remove this entire rule group?')) {
                                        dispatch({ type: 'REMOVE_RULE_GROUP', id: group.id });
                                    }
                                }}
                                title="Delete Rule Group"
                                whileHover={{ scale: 1.1, color: '#ef4444' }}
                                whileTap={{ scale: 0.9 }}
                                style={{
                                    width: '36px',
                                    height: '36px',
                                    padding: '0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--text-muted)',
                                    marginRight: '8px',
                                    background: 'transparent',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    borderRadius: '8px',
                                    boxShadow: 'none'
                                }}
                            >
                                <FaTrash size={14} />
                            </motion.button>

                            <motion.button
                                className="button-ghost"
                                onClick={toggleCollapse}
                                title={group.collapsed ? "Expand Rule Group" : "Collapse Rule Group"}
                                whileHover={{ scale: 1.1, rotate: group.collapsed ? 0 : 5 }}
                                whileTap={{ scale: 0.9 }}
                                style={{
                                    width: '36px',
                                    height: '36px',
                                    padding: '0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(6, 182, 212, 0.1))',
                                    border: '1px solid var(--border-glow)',
                                    borderRadius: '8px',
                                    fontSize: '1rem'
                                }}
                            >
                                <motion.span
                                    animate={{ rotate: group.collapsed ? -90 : 0 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                    style={{ display: 'flex' }}
                                >
                                    ▼
                                </motion.span>
                            </motion.button>
                        </div>
                    </div>

                    <div className="input-row" style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: group.collapsed ? '0' : '15px' }}>
                        <div className="input-group" style={{ flex: '0 0 140px' }}>
                            <label style={{ marginLeft: '2px' }}>Start Date</label>
                            <input type="date" name="startDate" value={group.startDate} onChange={handleChange} style={{ width: '100%' }} />
                        </div>
                        <div className="input-group" style={{ flex: '0 0 140px' }}>
                            <label style={{ marginLeft: '2px' }}>End Date</label>
                            <input type="date" name="endDate" value={group.endDate} onChange={handleChange} style={{ width: '100%' }} />
                        </div>
                        <div className="input-group" style={{ flex: 1 }}>
                            <label>Payer Account IDs</label>
                            <input
                                type="text"
                                name="payerAccounts"
                                value={group.payerAccounts}
                                onChange={handleChange}
                                placeholder="Comma separated or empty for ALL"
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div className="input-group" style={{ flex: '0 0 120px', width: 'auto', minWidth: '120px' }}>
                            <label>Enabled</label>
                            <select name="enabled" value={group.enabled} onChange={handleChange} style={{ width: '100%' }}>
                                <option value="true">Yes</option>
                                <option value="false">No</option>
                            </select>
                        </div>
                    </div>

                </div>

                <AnimatePresence>
                    {!group.collapsed && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                        >
                            <div style={{ padding: '8px 0 0 32px', marginBottom: '-8px' }}>
                                <h4 style={{ color: 'var(--text-main)', margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Billing Rules</h4>
                            </div>

                            <div
                                style={{
                                    height: '16px',
                                    margin: '8px 0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    position: 'relative',
                                    cursor: 'pointer',
                                    width: '100%',
                                    zIndex: 20
                                }}
                                onMouseEnter={() => setIsListStartHovered(true)}
                                onMouseLeave={() => setIsListStartHovered(false)}
                                onClick={() => dispatch({ type: 'ADD_BILLING_RULE', groupId: group.id, prepend: true })}
                            >
                                <div style={{
                                    width: '100%',
                                    height: '2px', // Thin line
                                    background: isListStartHovered
                                        ? 'linear-gradient(90deg, transparent, var(--secondary), transparent)'
                                        : 'var(--border)',
                                    opacity: isListStartHovered ? 1 : 0.3,
                                    transition: 'all 0.3s'
                                }} />

                                <motion.div
                                    animate={{
                                        scale: isListStartHovered ? 1 : 0.8,
                                        opacity: isListStartHovered ? 1 : 0,
                                        y: isListStartHovered ? 0 : 5
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

                                {!isListStartHovered && (
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

                            <BillingRuleList groupId={group.id} rules={group.rules} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Minimal Insertion Divider */}
            <div
                style={{
                    height: '24px',
                    margin: '12px 0',
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
                onClick={() => dispatch({ type: 'ADD_RULE_GROUP', afterId: group.id })}
            >
                <div style={{
                    width: '100%',
                    height: '1px',
                    background: isHovered
                        ? 'linear-gradient(90deg, transparent, var(--primary), transparent)'
                        : 'var(--border)',
                    opacity: isHovered ? 1 : 0.4,
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
                        background: 'var(--primary)',
                        color: 'white',
                        padding: '5px 16px',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)',
                        pointerEvents: 'none',
                        zIndex: 2
                    }}
                >
                    <FaPlus size={10} /> Insert Rule Group
                </motion.div>

                {!isHovered && (
                    <div style={{
                        position: 'absolute',
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        border: '1px solid var(--primary)',
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--bg-deep)',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                        transition: 'all 0.3s',
                        zIndex: 2
                    }}>
                        <FaPlus size={12} />
                    </div>
                )}
            </div>
        </div>
    );
};
export default RuleGroup;
