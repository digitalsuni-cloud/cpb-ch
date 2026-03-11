import React, { useState } from 'react';
import Sidebar from './Sidebar';
import ThemeToggle from '../components/ThemeToggle';
import SettingsModal from '../components/SettingsModal';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCog, FaCloudDownloadAlt } from 'react-icons/fa';
import Tooltip from '../components/Tooltip';
import { isElectronApp } from '../utils/env';

const DashboardLayout = ({ children, activeView, setActiveView, showHelp, setShowHelp, onCheckUpdates }) => {
    const [showSettings, setShowSettings] = useState(false);

    return (
        <div style={{
            display: 'flex',
            minHeight: '100vh',
            background: 'var(--bg-deep)',
            color: 'var(--text-main)'
        }}>
            <Sidebar
                activeView={activeView}
                setActiveView={setActiveView}
                showHelp={showHelp}
                setShowHelp={setShowHelp}
            />

            <main style={{
                flex: 1,
                height: '100vh',
                overflowY: 'auto',
                position: 'relative'
            }}>
                {/* Top Bar / Header */}
                <header style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 90,
                    background: 'rgba(var(--bg-deep-rgb), 0.8)',
                    backdropFilter: 'blur(12px)',
                    borderBottom: '1px solid var(--border)',
                    padding: '16px 32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                        <h1 style={{
                            fontSize: '1.5rem',
                            margin: 0,
                            fontWeight: 700
                        }}>
                            {activeView === 'dashboard' && 'Price Book Dashboard'}
                            {activeView === 'builder' && 'Rules Builder'}
                            {activeView === 'preview' && 'Price Book Summary'}
                            {activeView === 'export' && 'Export Configuration'}
                            {activeView === 'deploy' && 'Deployment Center'}
                            {activeView === 'directory' && 'Pricebook Directory'}
                            {activeView === 'history' && 'Action History'}
                        </h1>
                        <p style={{
                            margin: '4px 0 0 0',
                            fontSize: '0.85rem',
                            color: 'var(--text-muted)'
                        }}>
                            {activeView === 'dashboard' && 'Manage metadata and global settings.'}
                            {activeView === 'builder' && 'Define custom rates, discounts logic, and product scopes.'}
                            {activeView === 'preview' && 'Review your configuration in a readable natural language format.'}
                            {activeView === 'export' && 'Download and deploy your price book.'}
                            {activeView === 'deploy' && 'Deploy live updates to CloudHealth.'}
                            {activeView === 'directory' && 'View, edit, unassign, and delete your existing CloudHealth Pricebooks.'}
                            {activeView === 'history' && 'A local record of all changes made through this app on this machine.'}
                        </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'absolute', right: '32px' }}>
                        {isElectronApp() && (
                            <>
                                <Tooltip title="Updates" content="Check for newer versions of the app on GitHub" position="bottom">
                                    <button
                                        onClick={onCheckUpdates}
                                        className="header-icon-btn"
                                        style={{ fontSize: '1.2rem', color: '#38bdf8' }}
                                    >
                                        <FaCloudDownloadAlt />
                                    </button>
                                </Tooltip>
                                <Tooltip title="Settings" content="Configure API keys and connection parameters" position="bottom">
                                    <button
                                        onClick={() => setShowSettings(true)}
                                        className="header-icon-btn"
                                        style={{ fontSize: '1.2rem', color: '#f59e0b' }}
                                    >
                                        <FaCog />
                                    </button>
                                </Tooltip>
                            </>
                        )}
                        <ThemeToggle />
                    </div>
                </header>

                {/* Content Area */}
                <div style={{
                    padding: (activeView === 'directory' || activeView === 'history')
                        ? 'clamp(16px, 3vh, 32px) clamp(16px, 3vh, 32px) 0 clamp(16px, 3vh, 32px)'
                        : 'clamp(16px, 3vh, 32px)',
                    maxWidth: (activeView === 'directory' || activeView === 'history') ? '100%' : '1200px',
                    margin: '0 auto',
                    transition: 'max-width 0.3s ease'
                }}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeView}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

            <SettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
            />
        </div>
    );
};

export default DashboardLayout;
