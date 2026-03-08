import React from 'react';
import { usePriceBook } from '../context/PriceBookContext';
import { motion } from 'framer-motion';
import { FaSun, FaMoon } from 'react-icons/fa';
import Tooltip from './Tooltip';

const ThemeToggle = () => {
    const { state, dispatch } = usePriceBook();
    const isDark = state.theme === 'dark';

    const toggleTheme = () => dispatch({ type: 'TOGGLE_THEME' });

    return (
        <Tooltip title="Theme" content={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"} position="bottom">
            <motion.button
                className="theme-toggle-btn"
                onClick={toggleTheme}
                initial={false}
                animate={{
                    backgroundColor: isDark ? '#0f172a' : '#e0f2fe',
                    borderColor: isDark ? '#334155' : '#7dd3fc'
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                    border: '2px solid',
                    borderRadius: '50px',
                    padding: '4px',
                    width: '64px',
                    height: '34px',
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
            >
                <motion.div
                    layout
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: isDark ? '#fbbf24' : '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}
                    animate={{ x: isDark ? 30 : 0 }}
                >
                    {isDark ? (
                        <FaMoon size={14} color="#0f172a" />
                    ) : (
                        <FaSun size={14} color="#f59e0b" />
                    )}
                </motion.div>
            </motion.button>
        </Tooltip>
    );
};
export default ThemeToggle;
