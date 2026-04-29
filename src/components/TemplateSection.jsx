import React, { useState, useEffect, useRef, useMemo } from 'react';
import { usePriceBook } from '../context/PriceBookContext';
import { useConfirm } from '../context/ConfirmContext';
import { parseXMLToState } from '../utils/converter';
import { DEFAULT_TEMPLATES } from '../constants/defaultTemplates';
import { FaTrash, FaBookmark, FaSave, FaTimes, FaUpload, FaUser, FaTag, FaAlignLeft, FaStar, FaFileExport, FaFileImport } from 'react-icons/fa';
import Tooltip from './Tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';

const TEMPLATES_KEY = 'cpb_templates';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const cloneWithNewIds = (groups = []) => groups.map(g => ({
    ...g,
    id: uuidv4(),
    rules: (g.rules || []).map(r => ({
        ...r,
        id: uuidv4(),
        products: (r.products || []).map(p => ({ ...p, id: uuidv4() }))
    }))
}));

// Parse a raw JSON or XML string → { bookName, createdBy, comment, ruleGroups }
// Mirrors the multi-step fallback logic in ImportSection to handle malformed JSON
// where the 'specification' value contains literal (unescaped) newline characters.
const parseFileContent = (raw) => {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        let json = null;

        // Step 1: standard parse
        try { json = JSON.parse(trimmed); } catch (_) { /* try next */ }

        // Step 2: loose parse — collapse literal newlines inside the string
        if (!json) {
            try {
                const loose = trimmed.replace(/[\r\n]+/g, ' ');
                json = JSON.parse(loose);
            } catch (_) { /* try next */ }
        }

        // Step 3: manual regex extraction of specification field
        if (!json) {
            const bookNameMatch = trimmed.match(/"book_name"\s*:\s*"([^"]*)"/);
            const specStart = trimmed.indexOf('"specification"');
            if (specStart !== -1) {
                const specColon = trimmed.indexOf(':', specStart);
                const specQuoteStart = trimmed.indexOf('"', specColon + 1);
                if (specQuoteStart !== -1) {
                    let specContent = trimmed.substring(specQuoteStart + 1);
                    // find the closing quote, respecting backslash escapes
                    let specQuoteEnd = -1;
                    for (let i = 0; i < specContent.length; i++) {
                        if (specContent[i] === '"' && (i === 0 || specContent[i - 1] !== '\\')) {
                            specQuoteEnd = i;
                            break;
                        }
                    }
                    if (specQuoteEnd !== -1) {
                        const xmlString = specContent.substring(0, specQuoteEnd)
                            .replace(/\\"/g, '"')
                            .replace(/\\n/g, '\n')
                            .replace(/\\r/g, '\r')
                            .replace(/\\t/g, '\t')
                            .replace(/\\\\/g, '\\');
                        json = { book_name: bookNameMatch ? bookNameMatch[1] : '', specification: xmlString };
                    }
                }
            }
        }

        if (json && json.specification) {
            return parseXMLToState(json.specification, json);
        }
        throw new Error("Could not parse JSON file. Ensure it contains a valid 'specification' field with the XML content.");
    }
    // Assume raw XML
    return parseXMLToState(trimmed);
};

// ─── Shared card component ───────────────────────────────────────────────────
const TemplateCard = ({ template, onApply, onDelete, builtin = false }) => {
    const groups = template.priceBook?.ruleGroups?.length || 0;
    const rules = template.priceBook?.ruleGroups?.reduce((a, g) => a + (g.rules?.length || 0), 0) || 0;
    const createdBy = template.priceBook?.createdBy || template.createdBy || '';
    const description = template.priceBook?.comment || template.description || '';

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="card"
            style={{
                padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px',
                border: builtin ? '1px solid rgba(245,158,11,0.3)' : '1px solid var(--border)',
                background: builtin ? 'rgba(245,158,11,0.03)' : 'var(--bg-card)'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flex: 1, minWidth: 0 }}>
                    {builtin && <FaStar size={12} color="#f59e0b" style={{ flexShrink: 0, marginTop: '3px' }} />}
                    <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: 700, lineHeight: 1.3 }}>{template.name}</h4>
                </div>
                {!builtin && onDelete && (
                    <Tooltip title="Delete Template" content="Remove permanently">
                        <button onClick={() => onDelete(template.id, template.name)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px 4px', lineHeight: 1, flexShrink: 0 }}>
                            <FaTrash size={13} />
                        </button>
                    </Tooltip>
                )}
            </div>

            {description && (
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{description}</p>
            )}

            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {createdBy && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        <FaUser size={10} /> {createdBy}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ background: 'var(--bg-deep)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', border: '1px solid var(--border)' }}>
                        <strong style={{ color: 'var(--primary)' }}>{groups}</strong> {groups === 1 ? 'Group' : 'Groups'}
                    </span>
                    <span style={{ background: 'var(--bg-deep)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', border: '1px solid var(--border)' }}>
                        <strong style={{ color: 'var(--secondary)' }}>{rules}</strong> {rules === 1 ? 'Rule' : 'Rules'}
                    </span>
                    {!builtin && template.createdAt && (
                        <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                            {new Date(template.createdAt).toLocaleDateString()}
                        </span>
                    )}
                    {builtin && (
                        <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#f59e0b', fontWeight: 600, alignSelf: 'center' }}>Built-in</span>
                    )}
                </div>
            </div>

            <button onClick={() => onApply(template)}
                style={{ marginTop: '4px', width: '100%', padding: '9px', background: 'transparent', border: `1px solid ${builtin ? '#f59e0b' : 'var(--success)'}`, color: builtin ? '#f59e0b' : 'var(--success)', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = builtin ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                Apply Template
            </button>
        </motion.div>
    );
};

// ─── Component ────────────────────────────────────────────────────────────────
const TemplateSection = ({ setActiveView }) => {
    const { state, dispatch } = usePriceBook();
    const confirm = useConfirm();
    const fileInputRef = useRef(null);
    const importFileRef = useRef(null);

    const [templates, setTemplates] = useState([]);

    // Parse built-in templates once on mount
    const builtinTemplates = useMemo(() =>
        DEFAULT_TEMPLATES.map(t => {
            try {
                const parsed = parseXMLToState(t.xml, {});
                return { ...t, priceBook: parsed, builtin: true };
            } catch (e) {
                console.error('Failed to parse built-in template:', t.name, e);
                return null;
            }
        }).filter(Boolean)
    , []);
    // modal state
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('save'); // 'save' | 'upload'
    const [templateName, setTemplateName] = useState('');
    const [templateDesc, setTemplateDesc] = useState('');
    const [templateCreatedBy, setTemplateCreatedBy] = useState('');
    // upload parse result
    const [parsedBook, setParsedBook] = useState(null);
    const [parseError, setParseError] = useState('');
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        try {
            const stored = localStorage.getItem(TEMPLATES_KEY);
            if (stored) setTemplates(JSON.parse(stored));
        } catch (e) { console.error('Failed to load templates', e); }
    }, []);

    const persist = (list) => {
        localStorage.setItem(TEMPLATES_KEY, JSON.stringify(list));
        setTemplates(list);
    };

    // ── Open "Save Current" modal ────────────────────────────────────────────
    const openSaveModal = () => {
        setModalMode('save');
        setTemplateName(state.priceBook.bookName || '');
        setTemplateDesc(state.priceBook.comment || '');
        setTemplateCreatedBy(state.priceBook.createdBy || '');
        setParsedBook(null);
        setParseError('');
        setShowModal(true);
    };

    // ── Open "Upload File" modal ─────────────────────────────────────────────
    const openUploadModal = () => {
        setModalMode('upload');
        setTemplateName('');
        setTemplateDesc('');
        setTemplateCreatedBy('');
        setParsedBook(null);
        setParseError('');
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setParsedBook(null);
        setParseError('');
    };

    // ── Handle file drop / select in upload modal ────────────────────────────
    const processFile = (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const result = parseFileContent(ev.target.result);
                setParsedBook(result);
                setParseError('');
                // Auto-fill from parsed metadata
                setTemplateName(result.bookName || file.name.replace(/\.(json|xml|txt)$/i, ''));
                setTemplateDesc(result.comment || '');
                setTemplateCreatedBy(result.createdBy || '');
            } catch (err) {
                setParsedBook(null);
                setParseError(err.message || 'Could not parse file. Make sure it is valid XML or JSON.');
            }
        };
        reader.readAsText(file);
    };

    const handleFilePick = (e) => {
        processFile(e.target.files[0]);
        if (e.target.value) e.target.value = '';
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        processFile(e.dataTransfer.files[0]);
    };

    // ── Save to library ──────────────────────────────────────────────────────
    const handleSave = () => {
        if (!templateName.trim()) return;

        const bookData = modalMode === 'upload' && parsedBook
            ? { ...parsedBook, bookName: templateName.trim(), createdBy: templateCreatedBy.trim(), comment: templateDesc.trim() }
            : { ...state.priceBook };

        const newTemplate = {
            id: Date.now().toString(),
            name: templateName.trim(),
            description: templateDesc.trim(),
            createdBy: templateCreatedBy.trim(),
            priceBook: JSON.parse(JSON.stringify(bookData)),
            createdAt: new Date().toISOString()
        };

        persist([newTemplate, ...templates]);
        closeModal();
    };

    // ── Apply template ───────────────────────────────────────────────────────
    const handleApply = async (template) => {
        // Check if there's any actual data typed in, not just the default empty rule group skeleton
        const hasExisting = state.priceBook.ruleGroups?.some(group => 
            group.startDate || group.endDate || group.rules?.some(r => r.name || r.adjustment)
        );
        let mode = 'overwrite'; // 'overwrite' | 'add'

        if (hasExisting) {
            const userChoice = await confirm({
                title: 'Apply Template',
                message: `You already have ${state.priceBook.ruleGroups.length} rule groups in your pricebook.\n\nDo you want to add this template to your existing rules, or overwrite everything?`,
                variant: 'warning',
                confirmLabel: 'Overwrite Everything',
                cancelLabel: 'Cancel',
                tertiaryLabel: 'Add to Existing Rules'
            });

            if (userChoice === false || userChoice === undefined || userChoice === null) return;
            mode = userChoice === 'tertiary' ? 'add' : 'overwrite';
        }

        // Name: "BookName - YYYYMMDD"
        const compact = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const baseName = template.priceBook.bookName || template.name;
        const newName = `${baseName} - ${compact}`;

        // Description: "Original comment - Template Name (template.name)"
        const baseComment = template.priceBook.comment || template.description || '';
        const newComment = baseComment
            ? `${baseComment} - Template Name (${template.name})`
            : `Template Name (${template.name})`;

        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const firstOfMonth = `${yyyy}-${mm}-01`;

        let clonedTemplateRules = cloneWithNewIds(template.priceBook.ruleGroups).map(group => ({
            ...group,
            startDate: firstOfMonth,
            endDate: ''
        }));

        let newRules = [];
        if (mode === 'add') {
            // Add to the top of the existing rules
            newRules = [
                ...clonedTemplateRules,
                ...state.priceBook.ruleGroups
            ];
        } else {
            // Overwrite
            newRules = clonedTemplateRules;
        }

        dispatch({
            type: 'IMPORT_DATA',
            payload: {
                ...state.priceBook,
                bookName: mode === 'add' ? state.priceBook.bookName : newName,
                createdBy: mode === 'add' ? state.priceBook.createdBy : (template.priceBook.createdBy || template.createdBy || state.priceBook.createdBy),
                comment: mode === 'add' ? state.priceBook.comment : newComment,
                ruleGroups: newRules
            }
        });

        // Navigate so the user can review the applied config
        if (setActiveView) {
            setActiveView(mode === 'add' ? 'builder' : 'dashboard');
        }
    };

    // ── Delete ───────────────────────────────────────────────────────────────
    const handleDelete = async (id, name) => {
        if (await confirm({ title: 'Delete Template', message: `Delete "${name}"?`, variant: 'danger', confirmLabel: 'Delete' })) {
            persist(templates.filter(t => t.id !== id));
        }
    };

    // ── Import / Export ──────────────────────────────────────────────────────
    const handleExportTemplates = () => {
        if (templates.length === 0) return;
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(templates, null, 2));
        const a = document.createElement('a');
        a.href = dataStr;
        a.download = `cpb_templates_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handleImportTemplates = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                if (!Array.isArray(importedData)) throw new Error("Invalid format: Must be a JSON array.");
                
                const isConfirmed = await confirm({
                    title: 'Import Templates',
                    message: `You are about to import ${importedData.length} templates. This will merge them with your current library. Continue?`,
                    confirmLabel: 'Import Templates'
                });

                if (isConfirmed) {
                    // Merge based on unique IDs
                    const currentMap = new Map(templates.map(item => [item.id, item]));
                    importedData.forEach(item => {
                        if (item.id) currentMap.set(item.id, item);
                    });
                    
                    const merged = Array.from(currentMap.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    persist(merged);
                }
            } catch(err) {
                console.error("Failed to import templates", err);
                await confirm({
                    title: 'Import Error',
                    message: 'Could not read the JSON file properly. Ensure it is a valid template export.',
                    variant: 'danger',
                    confirmLabel: 'Close',
                    hideCancel: true
                });
            } finally {
                // Clear the input
                if (e.target) e.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

            {/* Action Bar */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '20px 24px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div>
                    <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FaBookmark color="var(--primary)" /> Pricebook Template Library
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Save and reuse standard pricebook configurations. Upload from file or snapshot the current editor.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
                    <button
                        onClick={openUploadModal}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 18px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, border: '1px solid var(--secondary)', cursor: 'pointer', background: 'transparent', color: 'var(--secondary)', transition: 'all 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(6,182,212,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                        <FaUpload size={12} /> Upload File
                    </button>
                    <button
                        onClick={openSaveModal}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 18px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, border: 'none', cursor: 'pointer', background: 'var(--primary)', color: 'white' }}
                    >
                        <FaSave size={12} /> Save Current
                    </button>
                </div>
            </div>

            {/* ── Your Templates ── */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <FaBookmark size={12} color="var(--primary)" />
                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Templates</h4>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{templates.length} saved</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        💾 Stored locally on this device only — not synced to the cloud.
                    </p>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <input type="file" ref={importFileRef} accept=".json" style={{ display: 'none' }} onChange={handleImportTemplates} />
                        <button
                            onClick={() => importFileRef.current?.click()}
                            style={{ flexShrink: 0, background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s', fontSize: '0.8rem' }}
                            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-main)'; e.currentTarget.style.background = 'var(--bg-card)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
                        >
                            <FaFileImport size={10} /> Import
                        </button>
                        <button
                            onClick={handleExportTemplates}
                            disabled={templates.length === 0}
                            style={{ flexShrink: 0, background: 'transparent', color: templates.length === 0 ? 'var(--text-muted)' : 'var(--text-secondary)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px', cursor: templates.length === 0 ? 'not-allowed' : 'pointer', fontWeight: 600, transition: 'all 0.2s', fontSize: '0.8rem' }}
                            onMouseEnter={e => { if (templates.length) { e.currentTarget.style.color = 'var(--text-main)'; e.currentTarget.style.background = 'var(--bg-card)'; } }}
                            onMouseLeave={e => { if (templates.length) { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; } }}
                        >
                            <FaFileExport size={10} /> Export
                        </button>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
                    {templates.length === 0 ? (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '12px', opacity: 0.35 }}>📋</div>
                            <h4 style={{ margin: '0 0 6px 0', color: 'var(--text-main)' }}>No saved templates yet</h4>
                            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Use "Save Current" or "Upload File" to add your first template.</p>
                        </div>
                    ) : templates.map(template => (
                        <TemplateCard key={template.id} template={template} onApply={handleApply} onDelete={handleDelete} />
                    ))}
                </div>
            </div>

            {/* ── Built-in Templates ── */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <FaStar size={13} color="#f59e0b" />
                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Built-in Templates</h4>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Provided by CloudHealth</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
                    {builtinTemplates.map(template => (
                        <TemplateCard key={template.id} template={template} onApply={handleApply} builtin />
                    ))}
                </div>
            </div>



            {/* ── Modal ── */}
            <AnimatePresence>
                {showModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            style={{ position: 'relative', background: 'var(--bg-card)', borderRadius: '14px', width: '100%', maxWidth: '520px', border: '1px solid var(--border)', boxShadow: '0 24px 48px rgba(0,0,0,0.5)', overflow: 'hidden' }}
                        >
                            {/* Modal Header */}
                            <div style={{ display: 'flex', alignItems: 'center', padding: '18px 52px 18px 24px', borderBottom: '1px solid var(--border)', background: 'rgba(139,92,246,0.05)' }}>
                                <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {modalMode === 'upload' ? <><FaUpload color="var(--secondary)" /> Upload Pricebook File</> : <><FaSave color="var(--primary)" /> Save Current Configuration</>}
                                </h3>
                                <button
                                    onClick={closeModal}
                                    style={{ position: 'absolute', top: '14px', right: '14px', width: '28px', height: '28px', borderRadius: '7px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', transition: 'all 0.18s', flexShrink: 0, zIndex: 2 }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)'; e.currentTarget.style.color = '#ef4444'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                                    aria-label="Close"
                                >✕</button>

                            </div>

                            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                                {/* File Drop Zone — only in upload mode */}
                                {modalMode === 'upload' && (
                                    <div
                                        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                                        onDragLeave={() => setIsDragging(false)}
                                        onDrop={handleDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                        style={{
                                            border: `2px dashed ${parsedBook ? 'var(--success)' : isDragging ? 'var(--primary)' : 'var(--border)'}`,
                                            borderRadius: '10px', padding: '24px', textAlign: 'center', cursor: 'pointer',
                                            background: parsedBook ? 'rgba(16,185,129,0.05)' : isDragging ? 'rgba(139,92,246,0.05)' : 'var(--bg-deep)',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <input ref={fileInputRef} type="file" accept=".json,.xml,.txt" style={{ display: 'none' }} onChange={handleFilePick} />
                                        {parsedBook ? (
                                            <div style={{ color: 'var(--success)', fontWeight: 600 }}>
                                                <div style={{ fontSize: '1.5rem', marginBottom: '6px' }}>✓</div>
                                                Parsed successfully — metadata auto-filled below
                                            </div>
                                        ) : (
                                            <>
                                                <div style={{ fontSize: '1.8rem', marginBottom: '8px', opacity: 0.6 }}>📂</div>
                                                <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 600, marginBottom: '4px' }}>Click or drag a file here</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Supports .json, .xml, .txt</div>
                                            </>
                                        )}
                                    </div>
                                )}

                                {parseError && (
                                    <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', fontSize: '0.85rem' }}>
                                        ⚠️ {parseError}
                                    </div>
                                )}

                                {/* Fields — shown always for 'save', shown after parse for 'upload' */}
                                {(modalMode === 'save' || parsedBook) && (
                                    <>
                                        <div className="input-group" style={{ margin: 0 }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <FaTag size={10} /> Template Name <span style={{ color: 'var(--danger)' }}>*</span>
                                            </label>
                                            <input type="text" value={templateName} onChange={e => setTemplateName(e.target.value)}
                                                placeholder="e.g. Standard Enterprise Discount" autoFocus />
                                        </div>

                                        <div className="input-group" style={{ margin: 0 }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <FaUser size={10} /> Created By
                                            </label>
                                            <input type="text" value={templateCreatedBy} onChange={e => setTemplateCreatedBy(e.target.value)}
                                                placeholder="Auto-detected from file" />
                                        </div>

                                        <div className="input-group" style={{ margin: 0 }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <FaAlignLeft size={10} /> Description / Comment
                                            </label>
                                            <textarea value={templateDesc} onChange={e => setTemplateDesc(e.target.value)}
                                                placeholder="Auto-detected from file comments, or describe what this template is for..."
                                                style={{ width: '100%', minHeight: '70px', resize: 'vertical', boxSizing: 'border-box' }} />
                                        </div>

                                        {parsedBook && (
                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '10px 14px', background: 'var(--bg-deep)', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                <span><strong style={{ color: 'var(--primary)' }}>{parsedBook.ruleGroups?.length || 0}</strong> rule groups</span>
                                                <span>·</span>
                                                <span><strong style={{ color: 'var(--secondary)' }}>{parsedBook.ruleGroups?.reduce((a, g) => a + (g.rules?.length || 0), 0) || 0}</strong> billing rules</span>
                                                {parsedBook.bookName && <><span>·</span><span>Book: <em>{parsedBook.bookName}</em></span></>}
                                            </div>
                                        )}
                                    </>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px' }}>
                                    <button onClick={closeModal} style={{ padding: '8px 18px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem' }}>
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={!templateName.trim() || (modalMode === 'upload' && !parsedBook)}
                                        style={{
                                            padding: '8px 18px', background: (templateName.trim() && (modalMode === 'save' || parsedBook)) ? 'var(--primary)' : 'var(--border)',
                                            border: 'none', color: 'white', borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem',
                                            cursor: (templateName.trim() && (modalMode === 'save' || parsedBook)) ? 'pointer' : 'not-allowed'
                                        }}
                                    >
                                        Save to Library
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TemplateSection;
