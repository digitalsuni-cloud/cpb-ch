import React, { useRef, useState, useEffect } from 'react';
import { usePriceBook } from '../context/PriceBookContext';
import { parseXMLToState } from '../utils/converter';
import { motion, AnimatePresence } from 'framer-motion';

const ImportSection = () => {
    const { state, dispatch } = usePriceBook();
    const fileInput = useRef(null);
    const containerRef = useRef(null);
    const [activeTab, setActiveTab] = useState('file');
    const [isDragging, setIsDragging] = useState(false);
    const [textInput, setTextInput] = useState('');

    const processContent = (content) => {
        try {
            let newState;
            const trimmed = content.trim();

            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                let json;
                try {
                    // Try standard parse first
                    json = JSON.parse(trimmed);
                } catch (e) {
                    console.warn("Standard JSON parse failed, attempting loose parse...", e);
                    try {
                        // Try removing newlines
                        const loose = trimmed.replace(/[\r\n]+/g, ' ');
                        json = JSON.parse(loose);
                    } catch (e2) {
                        console.warn("Loose JSON parse failed, attempting manual extraction...", e2);

                        // Manual fallback similar to OG script.js
                        const bookNameMatch = trimmed.match(/"book_name"\s*:\s*"([^"]*)"/);
                        const specStart = trimmed.indexOf('"specification"');

                        if (specStart !== -1) {
                            const specColon = trimmed.indexOf(':', specStart);
                            const specQuoteStart = trimmed.indexOf('"', specColon + 1);

                            if (specQuoteStart !== -1) {
                                let specContent = trimmed.substring(specQuoteStart + 1);

                                // Find closing quote, respecting escapes
                                let specQuoteEnd = -1;
                                for (let i = 0; i < specContent.length; i++) {
                                    if (specContent[i] === '"' && (i === 0 || specContent[i - 1] !== '\\')) {
                                        specQuoteEnd = i;
                                        break;
                                    }
                                }

                                if (specQuoteEnd !== -1) {
                                    specContent = specContent.substring(0, specQuoteEnd);

                                    // Unescape the extracted content
                                    const xmlString = specContent
                                        .replace(/\\"/g, '"')
                                        .replace(/\\n/g, '\n')
                                        .replace(/\\r/g, '\r')
                                        .replace(/\\t/g, '\t')
                                        .replace(/\\\\/g, '\\');

                                    json = {
                                        book_name: bookNameMatch ? bookNameMatch[1] : 'Unknown',
                                        specification: xmlString
                                    };
                                }
                            }
                        }
                    }
                }

                if (json && json.specification) {
                    newState = parseXMLToState(json.specification, json);
                } else {
                    alert("Failed to parse JSON. Please ensure it contains a valid 'specification' field.");
                    return;
                }
            } else {
                newState = parseXMLToState(trimmed);
            }

            if (newState) {
                // Check if current state has meaningful data
                const hasData = state.priceBook.ruleGroups.some(g => g.startDate || g.rules.some(r => r.name || r.adjustment));

                if (!hasData || confirm("Importing will overwrite current data. Continue?")) {
                    dispatch({ type: 'IMPORT_DATA', payload: newState });
                    setTextInput('');
                }
            }
        } catch (err) {
            console.error(err);
            alert("Failed to import: " + err.message);
        }
    };

    const handleFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => processContent(ev.target.result);
        reader.readAsText(file);
        if (e.target.value) e.target.value = '';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => processContent(ev.target.result);
            reader.readAsText(file);
        }
    };

    return (
        <div ref={containerRef} style={{
            boxShadow: 'none',
            border: 'none',
            padding: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <div
                className="card"
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                    maxWidth: '100%',
                    padding: 0,
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                    margin: 0,
                    borderColor: 'var(--border)',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    background: 'var(--bg-card)'
                }}
            >
                {/* Header */}
                <div
                    style={{
                        flex: '0 0 auto',
                        padding: '10px 24px',
                        background: 'rgba(139, 92, 246, 0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid var(--border)'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.2rem' }}>📥</span>
                        <span style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-main)' }}>
                            Import Existing Pricebook...
                        </span>
                    </div>
                </div>

                {/* Body */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', minHeight: 0 }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 24px' }}>
                        <div style={{ flex: '0 0 auto', display: 'flex', gap: '16px', marginBottom: '24px', padding: '4px', background: 'var(--bg-deep)', borderRadius: '12px' }}>
                            <button
                                onClick={() => setActiveTab('file')}
                                style={{
                                    flex: 1,
                                    padding: '8px 12px',
                                    background: activeTab === 'file' ? 'var(--bg-card)' : 'transparent',
                                    color: activeTab === 'file' ? 'var(--primary)' : 'var(--text-muted)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    transition: 'all 0.2s',
                                    boxShadow: activeTab === 'file' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
                                }}
                            >
                                📂 Upload File
                            </button>
                            <button
                                onClick={() => setActiveTab('text')}
                                style={{
                                    flex: 1,
                                    padding: '8px 12px',
                                    background: activeTab === 'text' ? 'var(--bg-card)' : 'transparent',
                                    color: activeTab === 'text' ? 'var(--primary)' : 'var(--text-muted)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    transition: 'all 0.2s',
                                    boxShadow: activeTab === 'text' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
                                }}
                            >
                                📝 Paste Pricebook content
                            </button>
                        </div>

                        <AnimatePresence mode="wait">
                            {activeTab === 'file' ? (
                                <motion.div
                                    key="file"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    transition={{ duration: 0.2 }}
                                    style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100px' }}
                                >
                                    <div
                                        className={`drop-zone ${isDragging ? 'active' : ''}`}
                                        onDragEnter={handleDragOver}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        onClick={() => fileInput.current?.click()}
                                        style={{
                                            border: `2px dashed ${isDragging ? 'var(--primary)' : 'var(--border)'}`,
                                            borderRadius: '12px',
                                            flex: 1,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            padding: '16px',
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                            background: isDragging ? 'rgba(139, 92, 246, 0.05)' : 'transparent',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <input
                                            type="file"
                                            ref={fileInput}
                                            onChange={handleFile}
                                            style={{ display: 'none' }}
                                            accept=".json,.xml,.txt"
                                        />
                                        <div style={{ fontSize: '2.5rem', marginBottom: '12px', opacity: 0.8 }}>📂</div>
                                        <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: 'var(--text-main)' }}>Click or Drag File to Upload</h3>
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Supports .json, .xml, .txt</p>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="text"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ duration: 0.2 }}
                                    style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
                                >
                                    <textarea
                                        value={textInput}
                                        onChange={(e) => setTextInput(e.target.value)}
                                        placeholder="Paste your JSON or XML content here..."
                                        style={{
                                            flex: 1,
                                            width: '100%',
                                            padding: '16px',
                                            background: 'var(--bg-deep)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '12px',
                                            color: 'var(--text-main)',
                                            fontFamily: 'monospace',
                                            resize: 'vertical',
                                            marginBottom: '16px',
                                            fontSize: '0.9rem'
                                        }}
                                    />
                                    <div style={{ flex: '0 0 auto', textAlign: 'center' }}>
                                        <button
                                            className="button"
                                            onClick={() => processContent(textInput)}
                                            disabled={!textInput.trim()}
                                            style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                                        >
                                            Load Configuration
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}
export default ImportSection;
