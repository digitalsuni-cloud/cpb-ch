import React from 'react';
import { motion } from 'framer-motion';

import {
    FaLayerGroup,
    FaCode,
    FaFileExport,
    FaCog,
    FaHome,
    FaMagic,
    FaRocket,
    FaQuestionCircle,
    FaDownload,
    FaFolderOpen,
    FaAlignLeft,
    FaHistory
} from 'react-icons/fa';
import { isElectronApp } from '../utils/env';

const Sidebar = ({ activeView, setActiveView, showHelp, setShowHelp }) => {

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: <FaHome /> },
        { id: 'builder', label: 'Rule Builder', icon: <FaLayerGroup /> },
        { id: 'preview', label: 'Price Book Summary', icon: <FaAlignLeft /> },
        { id: 'export', label: 'Export', icon: <FaFileExport /> },
        ...(isElectronApp() ? [
            { id: 'deploy', label: 'Deploy', icon: <FaRocket /> },
            { id: 'directory', label: 'Price Book Directory', icon: <FaFolderOpen /> },
            { id: 'history', label: 'Action History', icon: <FaHistory /> }
        ] : [])
    ];

    return (
        <div style={{
            width: '200px',
            background: 'var(--bg-card)',
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            padding: '24px 16px',
            height: '100vh',
            position: 'sticky',
            top: 0,
            zIndex: 100
        }}>
            {/* Logo Area */}
            <div style={{
                marginBottom: '40px',
                padding: '0 4px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
            }}>
                <div style={{
                    width: '36px',
                    height: '36px',
                    minWidth: '36px',
                    borderRadius: '6px',
                    background: '#1a1a1a',
                    border: '1px solid #333',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: '900',
                    fontSize: '14px',
                    fontFamily: 'system-ui, sans-serif',
                    letterSpacing: '1px'
                }}>
                    CH
                </div>
                <div>
                    <h2 style={{
                        fontSize: '0.95rem',
                        fontWeight: 700,
                        margin: 0,
                        color: 'var(--text-main)',
                        letterSpacing: '-0.01em',
                        lineHeight: 1.2
                    }}>
                        Custom Price Book
                    </h2>
                    <span style={{
                        fontSize: '0.65rem',
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        fontWeight: 600
                    }}>
                        Management Studio
                    </span>
                </div>
            </div>

            {/* Navigation */}
            <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {navItems.map(item => {
                    const isActive = activeView === item.id;
                    return (
                        <motion.button
                            key={item.id}
                            onClick={() => setActiveView(item.id)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px 12px',
                                borderRadius: '12px',
                                background: isActive ? 'linear-gradient(90deg, rgba(139, 92, 246, 0.15), transparent)' : 'transparent',
                                border: isActive ? '1px solid rgba(139, 92, 246, 0.2)' : '1px solid transparent',
                                color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                                fontSize: '0.9rem',
                                fontWeight: isActive ? 600 : 500,
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                            {item.label}
                            {isActive && (
                                <motion.div
                                    layoutId="active-pill"
                                    style={{
                                        marginLeft: 'auto',
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        background: 'var(--primary)'
                                    }}
                                />
                            )}
                        </motion.button>
                    );
                })}
            </nav>

            <div style={{
                marginTop: 'auto',
                marginBottom: '30px',
                paddingTop: '20px',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
            }}>
                {!isElectronApp() && (
                    <motion.a
                        href="https://github.com/digitalsuni-cloud/cpb-ch/releases/latest"
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Download the standalone app for an integrated local API experience without CORS or proxy limits!"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            background: 'linear-gradient(90deg, var(--primary), #a855f7)',
                            border: 'none',
                            color: '#ffffff',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            textDecoration: 'none',
                            boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)'
                        }}
                    >
                        <span style={{ fontSize: '1.1rem' }}><FaDownload /></span> Download App
                    </motion.a>
                )}

                <motion.button
                    onClick={() => setShowHelp(true)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        background: 'transparent',
                        border: '1px solid var(--border)',
                        color: 'var(--text-secondary)',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--bg-hover)';
                        e.currentTarget.style.color = 'var(--text-main)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                >
                    <span style={{ fontSize: '1.1rem' }}><FaQuestionCircle /></span> Help & Guide
                </motion.button>
            </div>
        </div>
    );
};

export default Sidebar;
