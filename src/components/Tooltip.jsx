import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

/**
 * Premium Tooltip component with glassmorphism and smooth animations
 * Handles viewport clipping automatically.
 */
const Tooltip = ({
    children,
    content,
    title,
    position = 'top',
    delay = 0.5,
    variant = 'glass',
    maxWidth = '280px',
    portal = true,
    style = {}
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ x: 0, y: 0 });
    const [adjustedCoords, setAdjustedCoords] = useState({ x: 0, y: 0 });
    const triggerRef = useRef(null);
    const tooltipRef = useRef(null);
    const timeoutRef = useRef(null);

    const updatePosition = () => {
        if (!triggerRef.current) return;

        const rect = triggerRef.current.getBoundingClientRect();

        let x = 0;
        let y = 0;

        switch (position) {
            case 'top':
                x = rect.left + rect.width / 2;
                y = rect.top - 8;
                break;
            case 'bottom':
                x = rect.left + rect.width / 2;
                y = rect.bottom + 8;
                break;
            case 'left':
                x = rect.left - 8;
                y = rect.top + rect.height / 2;
                break;
            case 'right':
                x = rect.right + 8;
                y = rect.top + rect.height / 2;
                break;
            default:
                x = rect.left + rect.width / 2;
                y = rect.top - 8;
        }

        setCoords({ x, y });
        setAdjustedCoords({ x, y });
    };

    // Refine position to avoid clipping
    useLayoutEffect(() => {
        if (isVisible && tooltipRef.current) {
            const tooltipRect = tooltipRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const padding = 12;

            let newX = coords.x;
            let newY = coords.y;

            // Get translation based on position to know where edges are
            let transX = -50; // as % default
            let transY = -50; // as % default

            switch (position) {
                case 'top': transX = -50; transY = -100; break;
                case 'bottom': transX = -50; transY = 0; break;
                case 'left': transX = -100; transY = -50; break;
                case 'right': transX = 0; transY = -50; break;
            }

            // Calculate actual edges based on translation
            const leftEdge = coords.x + (tooltipRect.width * (transX / 100));
            const rightEdge = leftEdge + tooltipRect.width;
            const topEdge = coords.y + (tooltipRect.height * (transY / 100));
            const bottomEdge = topEdge + tooltipRect.height;

            // Horizontal correction
            if (leftEdge < padding) {
                newX = coords.x + (padding - leftEdge);
            } else if (rightEdge > viewportWidth - padding) {
                newX = coords.x - (rightEdge - (viewportWidth - padding));
            }

            // Vertical correction
            if (topEdge < padding) {
                newY = coords.y + (padding - topEdge);
            } else if (bottomEdge > viewportHeight - padding) {
                newY = coords.y - (bottomEdge - (viewportHeight - padding));
            }

            if (Math.abs(newX - adjustedCoords.x) > 0.5 || Math.abs(newY - adjustedCoords.y) > 0.5) {
                setAdjustedCoords({ x: newX, y: newY });
            }
        }
    }, [isVisible, coords, position]);

    const handleMouseEnter = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            updatePosition();
            setIsVisible(true);
        }, delay * 1000);
    };

    const handleMouseLeave = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsVisible(false);
    };

    useEffect(() => {
        if (isVisible) {
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
        }
        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isVisible]);

    const renderTooltipContent = () => (
        <AnimatePresence>
            {isVisible && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        zIndex: 100000, // Very high z-index
                        pointerEvents: 'none',
                        transform: `translate(${position === 'top' || position === 'bottom' ? '-50%' : position === 'left' ? '-100%' : '0%'}, ${position === 'left' || position === 'right' ? '-50%' : position === 'top' ? '-100%' : '0%'}) translate(${adjustedCoords.x}px, ${adjustedCoords.y}px)`,
                    }}
                >
                    <motion.div
                        ref={tooltipRef}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        variants={variants}
                        style={{
                            ...getVariantStyles(),
                            padding: title ? '10px 14px' : '6px 12px',
                            borderRadius: '12px',
                            fontSize: '0.8rem',
                            fontWeight: 450,
                            whiteSpace: 'pre-wrap',
                            maxWidth: maxWidth,
                            width: 'max-content',
                            textAlign: 'left',
                            boxSizing: 'border-box',
                            willChange: 'transform',
                            overflow: 'visible'
                        }}
                    >
                        {title && (
                            <div style={{
                                fontWeight: 700,
                                marginBottom: '4px',
                                fontSize: '0.85rem',
                                color: (variant === 'glass' || variant === 'info') ? 'var(--secondary)' : (variant === 'warning') ? '#fff' : 'inherit',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                                {title}
                            </div>
                        )}
                        <div style={{ opacity: title ? 0.95 : 1, lineHeight: 1.4, fontWeight: variant === 'glass' ? 500 : 450 }}>
                            {content}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    const getVariantStyles = () => {
        switch (variant) {
            case 'primary':
                return {
                    background: 'rgba(99, 102, 241, 0.98)',
                    color: '#fff',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    boxShadow: '0 10px 30px rgba(99, 102, 241, 0.35)',
                };
            case 'secondary':
                return {
                    background: 'rgba(6, 182, 212, 0.98)',
                    color: '#fff',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    boxShadow: '0 10px 30px rgba(6, 182, 212, 0.25)',
                };
            case 'info':
                return {
                    background: 'var(--bg-card)',
                    backdropFilter: 'blur(16px) saturate(180%)',
                    color: 'var(--text-main)',
                    borderLeft: '4px solid var(--secondary)',
                    borderTop: '1px solid var(--border)',
                    borderRight: '1px solid var(--border)',
                    borderBottom: '1px solid var(--border)',
                    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.2)',
                };
            case 'danger':
                return {
                    background: 'rgba(239, 68, 68, 0.98)',
                    color: '#fff',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    boxShadow: '0 10px 30px rgba(239, 68, 68, 0.25)',
                };
            case 'warning':
                return {
                    background: 'rgba(245, 158, 11, 0.96)',
                    color: '#fff',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: '0 8px 16px rgba(245, 158, 11, 0.4)',
                };
            case 'glass':
            default:
                return {
                    background: 'var(--bg-card)',
                    backdropFilter: 'blur(16px) saturate(180%)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border)',
                    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.3)',
                    opacity: 0.99
                };
        }
    };

    const variants = {
        hidden: {
            opacity: 0,
            scale: 0.9,
            transition: { duration: 0.1 }
        },
        visible: {
            opacity: 1,
            scale: 1,
            transition: {
                type: 'spring',
                stiffness: 450,
                damping: 28
            }
        },
        exit: {
            opacity: 0,
            scale: 0.95,
            transition: { duration: 0.1 }
        }
    };

    if (!content && !title) return children;

    return (
        <div
            className="tooltip-wrapper"
            ref={triggerRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{ display: 'inline-block', ...style }}
        >
            {children}
            {portal ? createPortal(renderTooltipContent(), document.body) : renderTooltipContent()}
        </div>
    );
};

export default Tooltip;
