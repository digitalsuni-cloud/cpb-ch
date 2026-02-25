import React, { useState } from 'react';
import Sidebar from './Sidebar';
import ThemeToggle from '../components/ThemeToggle';
import { motion, AnimatePresence } from 'framer-motion';

const DashboardLayout = ({ children, activeView, setActiveView, showHelp, setShowHelp }) => {
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
                        </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'absolute', right: '32px' }}>
                        <ThemeToggle />
                    </div>
                </header>

                {/* Content Area */}
                <div style={{ padding: 'clamp(16px, 3vh, 32px)', maxWidth: '1200px', margin: '0 auto' }}>
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
        </div>
    );
};

export default DashboardLayout;
