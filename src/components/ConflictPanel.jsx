import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaCheckCircle, FaExclamationTriangle, FaExclamationCircle, FaCopy } from 'react-icons/fa';
import Tooltip from './Tooltip';

const ConflictPanel = ({ conflicts = [], onClose, onJumpToRule }) => {
    const errorCount   = conflicts.filter(c => c.severity === 'error').length;
    const warningCount = conflicts.filter(c => c.severity === 'warning').length;

    return (
        <AnimatePresence>
            {/* Backdrop */}
            <motion.div
                key="conflict-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9000,
                    background: 'rgba(0,0,0,0.35)',
                    backdropFilter: 'blur(2px)',
                }}
            />

            {/* Panel */}
            <motion.div
                key="conflict-panel"
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0,      opacity: 1 }}
                exit={{   x: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                style={{
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    width: '380px',
                    zIndex: 9001,
                    background: 'var(--bg-card)',
                    borderLeft: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '-8px 0 40px rgba(0,0,0,0.4)',
                }}
            >
                {/* ── Header ── */}
                <div style={{
                    padding: '20px 20px 16px 20px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--bg-deep)',
                    flexShrink: 0,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: conflicts.length > 0
                                ? 'rgba(239,68,68,0.12)'
                                : 'rgba(16,185,129,0.12)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            {conflicts.length > 0
                                ? <FaExclamationTriangle color="#ef4444" size={16} />
                                : <FaCheckCircle color="#10b981" size={16} />
                            }
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>
                                    Rule Conflicts
                                </div>
                                <span style={{
                                    fontSize: '0.62rem',
                                    fontWeight: 800,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    padding: '2px 6px',
                                    borderRadius: '6px',
                                    background: 'rgba(139,92,246,0.12)',
                                    color: 'var(--primary)',
                                    border: '1px solid rgba(139,92,246,0.3)',
                                    lineHeight: 1,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    marginTop: '1px',
                                }}>
                                    Beta
                                </span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                                {conflicts.length === 0
                                    ? 'All clear'
                                    : `${errorCount} error${errorCount !== 1 ? 's' : ''}, ${warningCount} warning${warningCount !== 1 ? 's' : ''}`
                                }
                            </div>
                        </div>
                    </div>
                    <Tooltip content="Close" position="left" delay={0.2}>
                        <button
                            onClick={onClose}
                            style={{
                                width: '30px',
                                height: '30px',
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                background: 'transparent',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                        >
                            <FaTimes size={13} />
                        </button>
                    </Tooltip>
                </div>

                {/* ── Legend pills ── */}
                {conflicts.length > 0 && (
                    <div style={{
                        display: 'flex',
                        gap: '6px',
                        flexWrap: 'wrap',
                        padding: '12px 20px',
                        borderBottom: '1px solid var(--border)',
                        flexShrink: 0,
                    }}>
                        {[
                            { label: 'Duplicate Rule', color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
                            { label: 'Rule Shadowing', color: '#ec4899', bg: 'rgba(236,72,153,0.1)' },
                            { label: 'Error — exact overlap', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
                            { label: 'Warning — type mismatch', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
                        ].map(({ label, color, bg }) => (
                            <span key={label} style={{
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                padding: '3px 10px',
                                borderRadius: '20px',
                                background: bg,
                                color,
                                border: `1px solid ${color}40`,
                            }}>
                                {label}
                            </span>
                        ))}
                    </div>
                )}

                {/* ── Conflict list ── */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
                    {conflicts.length === 0 ? (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            gap: '12px',
                            color: 'var(--text-muted)',
                        }}>
                            <div style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '50%',
                                background: 'rgba(16,185,129,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <FaCheckCircle size={28} color="#10b981" />
                            </div>
                            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>
                                No conflicts detected
                            </div>
                            <div style={{ fontSize: '0.82rem', textAlign: 'center', maxWidth: '260px', lineHeight: 1.5 }}>
                                All your rules have unique scopes. You're good to go! 🎉
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {conflicts.map((conflict, idx) => {
                                const isDupe   = conflict.type === 'DUPLICATE_RULE';
                                const isShadow = conflict.type === 'SHADOWING' || conflict.type === 'SEQUENTIAL_SHADOWING';
                                const isError  = conflict.severity === 'error';

                                let color = '#ef4444';
                                let bgColor = 'rgba(239,68,68,0.07)';
                                let borderColor = 'rgba(239,68,68,0.25)';

                                if (isShadow) {
                                    color = '#ec4899';
                                    bgColor = 'rgba(236,72,153,0.07)';
                                    borderColor = 'rgba(236,72,153,0.28)';
                                } else if (isDupe) {
                                    color = '#f97316';
                                    bgColor = 'rgba(249,115,22,0.07)';
                                    borderColor = 'rgba(249,115,22,0.28)';
                                } else if (isError) {
                                    color = '#ef4444';
                                    bgColor = 'rgba(239,68,68,0.07)';
                                    borderColor = 'rgba(239,68,68,0.25)';
                                } else {
                                    color = '#f59e0b';
                                    bgColor = 'rgba(245,158,11,0.07)';
                                    borderColor = 'rgba(245,158,11,0.25)';
                                }

                                const badgeLabel =
                                    isDupe   ? 'Duplicate Rule' :
                                    isShadow ? 'Rule Shadowing' :
                                    conflict.type === 'CHRONOLOGICAL_ERROR' ? 'Date Range Error' :
                                    conflict.type === 'COVERAGE_GAP' ? 'Coverage Gap' :
                                    conflict.type === 'REDUNDANT_PRODUCT_FILTER' ? 'Redundant Filter' :
                                    conflict.type === 'ADJUSTMENT_SANITY' ? 'Pricing Warning' :
                                    isError  ? 'Conflict' : 'Warning';

                                const badgeType =
                                    isDupe   ? 'Duplicate' :
                                    isShadow ? 'Shadowing' :
                                    conflict.type === 'SAME_GROUP' ? 'Same Group' :
                                    conflict.type === 'CHRONOLOGICAL_ERROR' ? 'Range Error' :
                                    conflict.type === 'COVERAGE_GAP' ? 'Coverage Gap' :
                                    conflict.type === 'REDUNDANT_PRODUCT_FILTER' ? 'Redundant Filter' :
                                    conflict.type === 'ADJUSTMENT_SANITY' ? 'Pricing Check' : 'Overlap';

                                const Icon = isDupe ? FaCopy : isError ? FaExclamationCircle : FaExclamationTriangle;

                                return (
                                    <motion.div
                                        key={conflict.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.04 }}
                                        style={{
                                            background: bgColor,
                                            border: `1px solid ${borderColor}`,
                                            borderRadius: '12px',
                                            padding: '14px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '8px',
                                        }}
                                    >
                                        {/* Row: icon + type badge */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Icon color={color} size={14} />
                                                <span style={{
                                                    fontSize: '0.7rem',
                                                    fontWeight: 700,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px',
                                                    color,
                                                }}>
                                                    {badgeLabel}
                                                </span>
                                            </div>
                                            <span style={{
                                                fontSize: '0.68rem',
                                                fontWeight: 600,
                                                padding: '2px 8px',
                                                borderRadius: '10px',
                                                background: 'var(--bg-deep)',
                                                color: 'var(--text-muted)',
                                                border: '1px solid var(--border)',
                                            }}>
                                                {badgeType}
                                            </span>
                                        </div>

                                        {/* Description */}
                                        <p style={{
                                            margin: 0,
                                            fontSize: '0.82rem',
                                            color: 'var(--text-main)',
                                            lineHeight: 1.5,
                                        }}>
                                            {conflict.description}
                                        </p>

                                        {/* Rules / Groups involved */}
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {conflict.ruleNames && conflict.ruleNames.length > 0 ? (
                                                conflict.ruleNames.map((name, i) => (
                                                    <Tooltip key={conflict.ruleIds[i]} content="Click to scroll to this rule" position="top" delay={0.3}>
                                                        <button
                                                            onClick={() => onJumpToRule && onJumpToRule(conflict.ruleIds[i])}
                                                            style={{
                                                                fontSize: '0.72rem',
                                                                fontWeight: 600,
                                                                padding: '3px 10px',
                                                                borderRadius: '20px',
                                                                background: 'var(--bg-subtle)',
                                                                color: 'var(--primary)',
                                                                border: '1px solid rgba(139,92,246,0.3)',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.15s',
                                                                maxWidth: '160px',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.15)'; }}
                                                            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-subtle)'; }}
                                                        >
                                                            ↗ {name}
                                                        </button>
                                                    </Tooltip>
                                                ))
                                            ) : (
                                                conflict.groupIds && conflict.groupIds.map((groupId) => (
                                                    <Tooltip key={groupId} content="Click to scroll to this rule group" position="top" delay={0.3}>
                                                        <button
                                                            onClick={() => onJumpToRule && onJumpToRule(groupId)}
                                                            style={{
                                                                fontSize: '0.72rem',
                                                                fontWeight: 600,
                                                                padding: '3px 10px',
                                                                borderRadius: '20px',
                                                                background: 'var(--bg-subtle)',
                                                                color: 'var(--primary)',
                                                                border: '1px solid rgba(139,92,246,0.3)',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.15s',
                                                                maxWidth: '160px',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.15)'; }}
                                                            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-subtle)'; }}
                                                        >
                                                            ↗ Scroll to Group
                                                        </button>
                                                    </Tooltip>
                                                ))
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ── Footer ── */}
                <div style={{
                    padding: '14px 20px',
                    borderTop: '1px solid var(--border)',
                    background: 'var(--bg-deep)',
                    flexShrink: 0,
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    lineHeight: 1.5,
                }}>
                    {conflicts.length > 0
                        ? '⚠️ Conflicts do not block deployment, but may lead to unpredictable pricing behaviour. Resolve before going live.'
                        : '✅ Run validation again after making changes to re-check for conflicts.'
                    }
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ConflictPanel;
