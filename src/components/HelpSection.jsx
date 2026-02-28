import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FaExternalLinkAlt, FaTimes, FaBook, FaPuzzlePiece, FaFilter, FaRocket,
    FaChevronDown, FaChevronUp, FaLightbulb, FaCode, FaMagic, FaFolderOpen,
    FaBookOpen, FaUserEdit, FaAlignLeft, FaEye, FaTrash, FaPen
} from 'react-icons/fa';

/* ── Helpers ─────────────────────────────────────────────────────────────── */

const Step = ({ n, children }) => (
    <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
        <span style={{
            minWidth: '22px', height: '22px', borderRadius: '50%',
            background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)',
            color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, marginTop: '1px'
        }}>{n}</span>
        <span style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>{children}</span>
    </div>
);

const Tag = ({ color = 'var(--primary)', children }) => (
    <code style={{
        background: `${color}22`, border: `1px solid ${color}44`,
        color, borderRadius: '4px', padding: '1px 6px', fontSize: '0.82rem'
    }}>{children}</code>
);

const HelpAccordion = ({ title, icon, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', background: 'var(--bg-deep)' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '100%', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', padding: '12px 16px',
                    background: isOpen ? 'rgba(139,92,246,0.1)' : 'transparent',
                    border: 'none', color: isOpen ? 'var(--primary)' : 'var(--text-main)',
                    fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s', textAlign: 'left'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>{icon}<span>{title}</span></div>
                {isOpen ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                    >
                        <div style={{
                            padding: '16px', borderTop: '1px solid var(--border)',
                            color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.6'
                        }}>
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

/* ── Main Panel ──────────────────────────────────────────────────────────── */

const HelpSection = ({ isOpen, onClose }) => {
    const [width, setWidth] = useState(520);
    const [isResizing, setIsResizing] = useState(false);

    React.useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isResizing) return;
            const newWidth = window.innerWidth - e.clientX;
            if (newWidth > 300 && newWidth < window.innerWidth * 0.9) setWidth(newWidth);
        };
        const handleMouseUp = () => setIsResizing(false);
        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        className="drawer-overlay"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 998 }}
                    />
                    <motion.div
                        className="drawer-panel"
                        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        style={{
                            position: 'fixed', top: 0, right: 0, bottom: 0, width: `${width}px`,
                            background: 'var(--bg-card)', padding: '24px', zIndex: 999,
                            overflowY: 'auto', boxShadow: '-5px 0 20px rgba(0,0,0,0.2)'
                        }}
                    >
                        {/* Resize handle */}
                        <div
                            onMouseDown={() => setIsResizing(true)}
                            style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '5px', cursor: 'ew-resize', zIndex: 1000 }}
                            title="Drag to resize"
                        />

                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <FaBook className="text-primary" /> Cloud Pricebook Studio — Help &amp; Guide
                            </h2>
                            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', padding: '8px' }}>
                                <FaTimes />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                            {/* Intro banner */}
                            <div style={{ padding: '12px 16px', background: 'rgba(139,92,246,0.08)', borderRadius: '8px', border: '1px solid rgba(139,92,246,0.2)', fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: '1.6' }}>
                                <strong>CloudHealth Pricebook Studio</strong> lets you build, import, edit, deploy, and manage CloudHealth Custom Price Books — all from one interface.
                                The <strong>Desktop App</strong> unlocks live CloudHealth API connectivity for direct deployments, Live Sync imports, and the full Price Book Directory.
                            </div>

                            {/* ── GETTING STARTED ─────────────────────────── */}
                            <HelpAccordion title="Getting Started" icon={<FaRocket />} defaultOpen={true}>
                                <Step n="1"><strong>Configure your API Key</strong> — Click the ⚙ Settings icon (top-right). Enter your CloudHealth API key and optional CORS proxy URL. These are stored locally and never sent anywhere except CloudHealth's API.</Step>
                                <Step n="2"><strong>Build or Import</strong> — Start fresh in the Builder, or use Import to load an existing XML/JSON spec from a file, pasted text, or live from CloudHealth.</Step>
                                <Step n="3"><strong>Review</strong> — Switch to the <em>Price Book Summary</em> tab to review your configuration in plain English before exporting.</Step>
                                <Step n="4"><strong>Export or Deploy</strong> — Download the XML/JSON payload, run a Dry Run to validate financial impact, or push live to CloudHealth.</Step>
                                <Step n="5"><strong>Manage</strong> — Use the <em>Price Book Directory</em> to view all pricebooks, edit rules, view summaries, manage customer/payer assignments, and delete books.</Step>
                            </HelpAccordion>

                            {/* ── BUILDER ─────────────────────────────────── */}
                            <HelpAccordion title="Builder — Creating Price Book Rules" icon={<FaBookOpen />}>
                                <p style={{ marginTop: 0 }}>The Builder is the main configuration surface. Every rule maps to a <Tag>{'<BillingRule>'}</Tag> element in the output XML.</p>
                                <div style={{ marginBottom: '10px' }}>
                                    <strong style={{ color: 'var(--text-main)' }}>Header Fields</strong>
                                    <ul style={{ paddingLeft: '18px', marginTop: '6px' }}>
                                        <li style={{ marginBottom: '5px' }}><strong>Book Name</strong> — Display name for this Price Book in CloudHealth.</li>
                                        <li style={{ marginBottom: '5px' }}><strong>Created By</strong> — Author name embedded in the XML spec.</li>
                                        <li style={{ marginBottom: '5px' }}><strong>Date</strong> — Effective date written into <Tag>{'<CHTBillingRules date="…">'}</Tag>.</li>
                                    </ul>
                                </div>
                                <div style={{ marginBottom: '10px' }}>
                                    <strong style={{ color: 'var(--text-main)' }}>Rule Groups</strong>
                                    <ul style={{ paddingLeft: '18px', marginTop: '6px' }}>
                                        <li style={{ marginBottom: '5px' }}>Each group maps to a <Tag>{'<RuleGroup>'}</Tag> with Start/End Date and optional Payer Account scope.</li>
                                        <li style={{ marginBottom: '5px' }}>Groups can be <strong>enabled or disabled</strong> independently.</li>
                                        <li>Drag rules within a group to reorder them.</li>
                                    </ul>
                                </div>
                                <div>
                                    <strong style={{ color: 'var(--text-main)' }}>Billing Rule Types</strong>
                                    <ul style={{ paddingLeft: '18px', marginTop: '6px' }}>
                                        <li style={{ marginBottom: '5px' }}><Tag color="#10b981">percentDiscount</Tag> — Reduce cost by a % (e.g., 10 = 10% off).</li>
                                        <li style={{ marginBottom: '5px' }}><Tag color="#f59e0b">percentIncrease</Tag> — Add a % surcharge.</li>
                                        <li style={{ marginBottom: '5px' }}><Tag color="#38bdf8">fixedRate</Tag> — Override usage price to a specific dollar rate.</li>
                                        <li style={{ marginBottom: '5px' }}>Toggle <strong>Include Data Transfer</strong> and <strong>Include RI Purchases</strong> per rule.</li>
                                        <li>Target any AWS product using the integrated product search.</li>
                                    </ul>
                                </div>
                            </HelpAccordion>

                            {/* ── PROPERTY FILTERS ────────────────────────── */}
                            <HelpAccordion title="Property Filters — Targeting Specific Usage" icon={<FaFilter />}>
                                <p style={{ marginTop: 0 }}>Add Property Filters inside a rule to restrict which line items it applies to. Combine multiple filters for precision targeting.</p>
                                <ul style={{ paddingLeft: '18px' }}>
                                    <li style={{ marginBottom: '6px' }}><strong>Region:</strong> e.g., <Tag>us-east-1</Tag>, <Tag>ap-southeast-1</Tag></li>
                                    <li style={{ marginBottom: '6px' }}><strong>Usage Type:</strong> e.g., <Tag>BoxUsage:t3.large</Tag>, <Tag>DataTransfer-Out-Bytes</Tag></li>
                                    <li style={{ marginBottom: '6px' }}><strong>Instance Type / Size:</strong> e.g., <Tag>m5.xlarge</Tag></li>
                                    <li style={{ marginBottom: '6px' }}><strong>Reservation Status:</strong> On-Demand, Reserved, Spot</li>
                                    <li style={{ marginBottom: '6px' }}><strong>Line Item Description:</strong> Match with <Tag>contains</Tag>, <Tag>startsWith</Tag>, or <Tag>matchesRegex</Tag> for flexible pattern matching.</li>
                                </ul>
                            </HelpAccordion>

                            {/* ── IMPORT ──────────────────────────────────── */}
                            <HelpAccordion title="Importing & Editing Existing Price Books" icon={<FaPuzzlePiece />}>
                                <p style={{ marginTop: 0 }}><strong>Three ways to import:</strong></p>
                                <Step n="1"><strong>Upload File</strong> — Click <em>Import Price Book</em> and select an existing XML or JSON file from your computer.</Step>
                                <Step n="2"><strong>Paste XML / JSON</strong> — Paste raw specification text directly into the import text area. The tool auto-recovers malformed JSON where possible.</Step>
                                <Step n="3">
                                    <div>
                                        <strong>CloudHealth Live Sync</strong> <em>(Desktop App only)</em> — Scan all pricebooks in your organisation and import any book directly into the Builder.
                                        <ul style={{ paddingLeft: '18px', marginTop: '8px' }}>
                                            <li style={{ marginBottom: '4px' }}>Click <strong>Scan All Connected Pricebooks</strong> to pull the full directory.</li>
                                            <li style={{ marginBottom: '4px' }}>Filter by <strong>Customer</strong>, <strong>Price Book</strong>, or <strong>Billing Account</strong> using the three cascading dropdowns.</li>
                                            <li>Click <strong>Import Selected Price Book</strong> to load it into the Builder.</li>
                                        </ul>
                                    </div>
                                </Step>
                                <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    ⚠️ Importing will prompt before overwriting any unsaved Builder data.
                                </div>
                            </HelpAccordion>

                            {/* ── EXPORT ──────────────────────────────────── */}
                            <HelpAccordion title="Export — Download Your Spec" icon={<FaCode />}>
                                <p style={{ marginTop: 0 }}>The <strong>Export & Deploy</strong> tab provides two download formats:</p>
                                <ul style={{ paddingLeft: '18px' }}>
                                    <li style={{ marginBottom: '6px' }}><strong>XML</strong> — The native CloudHealth price book specification format.</li>
                                    <li style={{ marginBottom: '6px' }}><strong>JSON</strong> — The API deployment payload format.</li>
                                    <li>Use the integrated <strong>Preview</strong> pane to inspect syntax-highlighted XML or JSON before downloading.</li>
                                </ul>
                            </HelpAccordion>

                            {/* ── DEPLOY ──────────────────────────────────── */}
                            <HelpAccordion title="Deploy — Push Live to CloudHealth" icon={<FaRocket />}>
                                <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Requires the Desktop App and a valid API Key.</p>

                                <div style={{ marginBottom: '12px' }}>
                                    <strong style={{ color: '#eab308' }}>1. Update or Create</strong>
                                    <p style={{ marginTop: '4px', marginBottom: 0, fontSize: '0.85rem' }}>Choose to <em>update</em> an existing book (enter its Price Book ID) or <em>create</em> a new one (auto-incremented name suggested).</p>
                                </div>

                                <div style={{ marginBottom: '12px' }}>
                                    <strong style={{ color: '#38bdf8' }}>2. Dry Run (Validate)</strong>
                                    <p style={{ marginTop: '4px', marginBottom: 0, fontSize: '0.85rem' }}>Provisions a temporary price book, simulates it against a payer account for a chosen month, and returns the financial variance — without touching any live assignments. Always recommended before a live push.</p>
                                </div>

                                <div style={{ marginBottom: '12px' }}>
                                    <strong style={{ color: 'var(--success)' }}>3. Assign Pricebook to Customer (toggle)</strong>
                                    <p style={{ marginTop: '4px', marginBottom: 0, fontSize: '0.85rem' }}>
                                        Enable this toggle to assign (or re-assign) the deployed book to a customer.
                                        Enter a <strong>Customer API ID</strong> and optionally a <strong>Payer Account ID</strong> (leave blank for <Tag>ALL</Tag>).
                                    </p>
                                    <div style={{ marginTop: '6px', padding: '8px 10px', background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '6px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                        💡 When you click <strong>Edit Assignment</strong> in the Price Book Directory, you are taken here with this toggle automatically checked and all fields pre-filled.
                                    </div>
                                </div>

                                <div style={{ padding: '8px 12px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '6px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                    💡 Enable <strong>Dev Tools</strong> in Settings to inspect raw API payloads at each step.
                                </div>
                            </HelpAccordion>

                            {/* ── DIRECTORY ───────────────────────────────── */}
                            <HelpAccordion title="Price Book Directory — Manage Existing Books" icon={<FaFolderOpen />}>
                                <p style={{ marginTop: 0 }}>
                                    The Directory pulls all pricebooks and their customer/payer assignments from CloudHealth into a searchable, paginated table.
                                    It stays loaded as you switch sections — no automatic reload. Click <strong>Refresh Directory</strong> to pull the latest data.
                                </p>

                                <div style={{ marginBottom: '12px' }}>
                                    <strong style={{ color: 'var(--text-main)' }}>Columns</strong>
                                    <ul style={{ paddingLeft: '18px', marginTop: '6px' }}>
                                        <li style={{ marginBottom: '4px' }}><strong>Customer Name</strong> — Assigned customer and their API ID.</li>
                                        <li style={{ marginBottom: '4px' }}><strong>Pricebook Name</strong> — Book name and internal Price Book ID.</li>
                                        <li style={{ marginBottom: '4px' }}><strong>Payer Mapping</strong> — The <Tag>billing_account_owner_id</Tag>. Displays <Tag color="#6b7280">N/A (not yet mapped)</Tag> when a book is assigned to a customer but has no payer account link yet.</li>
                                        <li><strong>Assignment ID</strong> — The internal base assignment ID, shown beneath the payer value.</li>
                                    </ul>
                                </div>

                                <div style={{ marginBottom: '12px' }}>
                                    <strong style={{ color: 'var(--text-main)' }}>Filtering &amp; Pagination</strong>
                                    <ul style={{ paddingLeft: '18px', marginTop: '6px' }}>
                                        <li style={{ marginBottom: '4px' }}>Each column has an inline filter — type to narrow results instantly.</li>
                                        <li style={{ marginBottom: '4px' }}>Toggle <strong>Show Unassigned</strong> to include books with no customer assignment.</li>
                                        <li>Choose 10 / 20 / 30 / 40 / 50 rows per page.</li>
                                    </ul>
                                </div>

                                <div>
                                    <strong style={{ color: 'var(--text-main)' }}>Action Buttons</strong>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                                        {[
                                            {
                                                icon: <FaEye size={11} />, color: '#38bdf8', bg: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.35)',
                                                label: 'View XML Spec',
                                                desc: 'Opens the raw XML specification in a syntax-highlighted overlay — no navigation required.'
                                            },
                                            {
                                                icon: <span style={{ position: 'relative', display: 'inline-flex', width: '13px', height: '13px' }}>
                                                    <FaBookOpen size={11} style={{ position: 'absolute' }} />
                                                    <FaPen size={6} style={{ position: 'absolute', bottom: '-1px', right: '-3px' }} />
                                                </span>,
                                                color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)',
                                                label: 'Edit Pricebook Rules',
                                                desc: 'Fetches the book from CloudHealth, loads it into the Builder, and navigates there. Prompts before overwriting unsaved Builder data.'
                                            },
                                            {
                                                icon: <FaAlignLeft size={11} />, color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.35)',
                                                label: 'View Summary',
                                                desc: 'Loads the pricebook into the Builder and navigates directly to the Price Book Summary tab — a human-readable, plain English view of all rules.'
                                            },
                                            {
                                                icon: <FaUserEdit size={11} />, color: '#38bdf8', bg: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.35)',
                                                label: 'Edit Assignment',
                                                desc: 'Loads the pricebook into Deploy and automatically opens the "Assign Pricebook to Customer" panel with all fields pre-filled, ready to update the Customer ID or Payer Account.'
                                            },
                                            {
                                                icon: <FaTimes size={11} />, color: '#eab308', bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.35)',
                                                label: 'Unassign from Customer',
                                                desc: 'Removes the customer-to-pricebook link (and payer account mapping if present). Shows a live progress window with both the customer name and pricebook name.'
                                            },
                                            {
                                                icon: <FaTrash size={11} />, color: 'var(--danger)', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)',
                                                label: 'Delete Global Pricebook',
                                                desc: 'Permanently deletes the pricebook. First unassigns all customer/payer links, then removes the global record. Step-by-step progress is shown. This cannot be undone.'
                                            },
                                        ].map(({ icon, color, bg, border, label, desc }) => (
                                            <div key={label} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                                <span style={{
                                                    minWidth: '26px', height: '26px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                    background: bg, border: `1px solid ${border}`, borderRadius: '5px', color, flexShrink: 0
                                                }}>{icon}</span>
                                                <div>
                                                    <strong style={{ color: 'var(--text-main)' }}>{label}</strong>
                                                    <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '2px' }}>{desc}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </HelpAccordion>

                            {/* ── WEB vs DESKTOP ──────────────────────────── */}
                            <HelpAccordion title="Web vs. Desktop Application" icon={<FaMagic />}>
                                <ul style={{ paddingLeft: '18px', marginTop: 0 }}>
                                    <li style={{ marginBottom: '10px' }}>
                                        <strong>
                                            <a href="https://github.com/digitalsuni-cloud/cpb-ch/releases/latest" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>
                                                Standalone Desktop App <FaExternalLinkAlt style={{ fontSize: '0.7rem' }} />
                                            </a>
                                        </strong> — <em>(Recommended)</em>
                                        <div style={{ marginTop: '4px', fontSize: '0.85rem' }}>Full CloudHealth API integration. Live Sync imports, one-click Deploy, Dry Run, and the full Price Book Directory all work natively without any CORS restrictions.</div>
                                    </li>
                                    <li>
                                        <strong>
                                            <a href="https://digitalsuni-cloud.github.io/cpb-ch/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>
                                                Web Interface <FaExternalLinkAlt style={{ fontSize: '0.7rem' }} />
                                            </a>
                                        </strong>
                                        <div style={{ marginTop: '4px', fontSize: '0.85rem' }}>Builder, file/paste Import, Preview, and Export work fully offline. API-connected features (Deploy, Directory, Live Sync) require a CORS proxy URL configured in Settings to function in-browser.</div>
                                    </li>
                                </ul>
                            </HelpAccordion>

                            {/* ── BEST PRACTICES ──────────────────────────── */}
                            <HelpAccordion title="Best Practices & Tips" icon={<FaLightbulb />}>
                                <ul style={{ paddingLeft: '18px', margin: 0 }}>
                                    <li style={{ marginBottom: '8px' }}><strong>Always dry run first</strong> — Validate the financial impact before pushing live to any customer.</li>
                                    <li style={{ marginBottom: '8px' }}><strong>Name rule groups clearly</strong> — e.g., "Q1 2025 EC2 Discount" makes future maintenance much easier.</li>
                                    <li style={{ marginBottom: '8px' }}><strong>Use filters precisely</strong> — Overly broad rules can accidentally affect unintended usage types.</li>
                                    <li style={{ marginBottom: '8px' }}><strong>Keep rule count manageable</strong> — Under 500 rules per price book is recommended for optimal CloudHealth performance.</li>
                                    <li style={{ marginBottom: '8px' }}><strong>Complete N/A payer mappings</strong> — Books showing <Tag color="#6b7280">N/A</Tag> in the directory are assigned to a customer but not yet linked to a payer account. Use <em>Edit Assignment</em> to complete the mapping.</li>
                                    <li style={{ marginBottom: '8px' }}><strong>Use View Summary before deployment</strong> — The plain English summary is a quick sanity check of your rules before going live.</li>
                                    <li><strong>Refresh Directory after changes</strong> — Hit the Refresh button after any deploy, unassign, or delete to pull the latest state from CloudHealth.</li>
                                </ul>
                            </HelpAccordion>

                            {/* ── API REFERENCE ───────────────────────────── */}
                            <HelpAccordion title="API Reference & XML Schema" icon={<FaCode />}>
                                <div style={{ fontSize: '0.85rem' }}>
                                    <p style={{ marginTop: 0 }}>
                                        Based on the <a href="https://apidocs.cloudhealthtech.com/#price-book_introduction-to-price-book-api" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>
                                            CloudHealth Price Book API Docs <FaExternalLinkAlt style={{ fontSize: '0.65rem' }} />
                                        </a>:
                                    </p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {[
                                            { tag: '<CHTBillingRules>', desc: 'Root element. Requires date and createdBy attributes.' },
                                            { tag: '<RuleGroup>', desc: 'Groups rules by date range (startDate, endDate) and optional payerAccounts scope. Can be enabled/disabled.' },
                                            { tag: '<BillingRule>', desc: 'A single pricing action. Key attributes: billingRuleType (percentDiscount | percentIncrease | fixedRate), billingAdjustment, includeDataTransfer, includeRIPurchases.' },
                                            { tag: '<PropertyFilter>', desc: 'Restricts which usage line items a BillingRule applies to (Region, UsageType, InstanceType, etc.).' },
                                        ].map(({ tag, desc }) => (
                                            <div key={tag}>
                                                <Tag color="var(--primary)">{tag}</Tag>
                                                <div style={{ marginTop: '4px', paddingLeft: '4px', color: 'var(--text-muted)' }}>{desc}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </HelpAccordion>

                        </div>

                        {/* Footer */}
                        <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            <p>Need more help? Visit the <a href="https://apidocs.cloudhealthtech.com/#price-book_introduction-to-price-book-api" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>Official Documentation</a>.</p>
                            <p style={{ marginTop: '8px' }}>✨ Vibe Coded with ☕☕☕☕☕ &amp; 🎧 by Sunil@CloudHealth 🚀</p>
                        </div>
                        <div style={{ height: '30px', width: '100%', flexShrink: 0 }} />
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default HelpSection;
