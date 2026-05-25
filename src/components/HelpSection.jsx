import React, { useState, useMemo } from 'react';
import { openExternal } from '../utils/desktopAPI';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FaExternalLinkAlt, FaTimes, FaBook, FaPuzzlePiece, FaFilter, FaRocket,
    FaChevronDown, FaChevronUp, FaLightbulb, FaCode, FaMagic, FaFolderOpen,
    FaBookOpen, FaUserEdit, FaAlignLeft, FaEye, FaTrash, FaPen, FaHistory, FaPlay,
    FaSearch, FaSyncAlt, FaLayerGroup, FaCog, FaCheckCircle, FaBookmark
} from 'react-icons/fa';
import Tooltip from './Tooltip';

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

const HighlightText = ({ text, highlight }) => {
    if (!highlight.trim()) return text;
    const parts = text.split(new RegExp(`(${highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
    return (
        <span>
            {parts.map((part, i) => (
                part.toLowerCase() === highlight.toLowerCase() ? (
                    <mark key={i} style={{ background: 'rgba(139,92,246,0.3)', color: 'var(--text-main)', borderRadius: '2px', padding: '0 2px' }}>{part}</mark>
                ) : part
            ))}
        </span>
    );
};

const HelpAccordion = ({ title, icon, children, isOpen, onToggle, highlight = '' }) => {
    return (
        <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', background: 'var(--bg-deep)' }}>
            <button
                onClick={onToggle}
                style={{
                    width: '100%', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', padding: '12px 16px',
                    background: isOpen ? 'rgba(139,92,246,0.1)' : 'transparent',
                    border: 'none', color: isOpen ? 'var(--primary)' : 'var(--text-main)',
                    fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s', textAlign: 'left'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {icon}
                    <span><HighlightText text={title} highlight={highlight} /></span>
                </div>
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
    const isBrowser = !navigator.userAgent.toLowerCase().includes('electron') && (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1');

    const [width, setWidth] = useState(520);
    const [isResizing, setIsResizing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedSections, setExpandedSections] = useState({ 'Getting Started': true });

    const toggleSection = (title) => {
        setExpandedSections(prev => ({
            ...prev,
            [title]: !prev[title]
        }));
    };

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

    const HELP_DATA = useMemo(() => [
        {
            title: "Getting Started",
            icon: <FaRocket />,
            searchable: "configure api key build import review export deploy manage",
            content: (
                <>
                    {!isBrowser && <Step n="1"><strong>Configure your API Key</strong> — Click the ⚙ Settings icon (top-right). Enter your CloudHealth API key. This is stored locally and never sent anywhere except CloudHealth's API.</Step>}
                    <Step n={isBrowser ? "1" : "2"}><strong>Build or Import</strong> — Start fresh in the Builder, or use Import to load an existing XML/JSON spec from a file, pasted text, or live from CloudHealth.</Step>
                    <Step n={isBrowser ? "2" : "3"}><strong>Review</strong> — Switch to the <em>Price Book Summary</em> tab to review your configuration in plain English before exporting.</Step>
                    <Step n={isBrowser ? "3" : "4"}><strong>Export or Deploy</strong> — Download the XML/JSON payload, run a Dry Run to validate financial impact, or push live to CloudHealth.</Step>
                    {!isBrowser && <Step n="5"><strong>Manage</strong> — Use the <em>Price Book Directory</em> to view all pricebooks, edit rules, view summaries, manage customer/payer assignments, and delete books.</Step>}
                </>
            )
        },
        {
            title: "Builder — Creating Price Book Rules",
            icon: <FaBookOpen />,
            searchable: "billingrule rule groups enabled disabled PercentDiscount PercentIncrease FixedRate product search",
            content: (
                <>
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
                            <li style={{ marginBottom: '5px' }}>Target any AWS product using the integrated product search.</li>
                            <li>Use the <strong>🔍 Rule Search</strong> at the top of the builder to quickly find rules in large configurations.</li>
                        </ul>
                    </div>
                </>
            )
        },
        {
            title: "Price Book Summary — English Overview",
            icon: <FaAlignLeft />,
            searchable: "natural language readable timeline logic color coding metadata pdf export validation",
            content: (
                <>
                    <p style={{ marginTop: 0 }}>The <strong>Price Book Summary</strong> tab converts your complex XML/JSON configuration into a human-readable "natural language" format.</p>
                    <ul style={{ paddingLeft: '18px' }}>
                        <li style={{ marginBottom: '8px' }}><strong>Execution Timeline</strong> — Rules are displayed in order of priority (Rule Groups).</li>
                        <li style={{ marginBottom: '8px' }}><strong>Visual Logic</strong> — Includes product icons, adjustment color-coding (+Markups, -Discounts), and clear filter descriptions.</li>
                        <li style={{ marginBottom: '8px' }}><strong>Metadata Overview</strong> — Displays the Pricebook Name, Author, and Comments for final review.</li>
                        <li style={{ marginBottom: '8px' }}><strong>PDF Export</strong> — Click <strong>Export PDF</strong> to capture the visual layout of your billing rules into a structured, multi-page PDF document for offline sharing.</li>
                        <li><strong>Validation Check</strong> — Highlights if required fields (like Group Start Dates) are missing before you export.</li>
                    </ul>
                </>
            )
        },
        {
            title: "Property Filters — Targeting Specific Usage",
            icon: <FaFilter />,
            searchable: "Region UsageType InstanceType Size Reservation Description contains startsWith matchesRegex",
            content: (
                <>
                    <p style={{ marginTop: 0 }}>Add Property Filters inside a rule to restrict which line items it applies to. Combine multiple filters for precision targeting.</p>
                    <ul style={{ paddingLeft: '18px' }}>
                        <li style={{ marginBottom: '6px' }}><strong>Region:</strong> e.g., <Tag>us-east-1</Tag>, <Tag>ap-southeast-1</Tag></li>
                        <li style={{ marginBottom: '6px' }}><strong>Usage Type:</strong> e.g., <Tag>BoxUsage:t3.large</Tag>, <Tag>DataTransfer-Out-Bytes</Tag></li>
                        <li style={{ marginBottom: '6px' }}><strong>Instance Type / Size:</strong> e.g., <Tag>m5.xlarge</Tag></li>
                        <li style={{ marginBottom: '6px' }}><strong>Reservation Status:</strong> On-Demand, Reserved, Spot</li>
                        <li style={{ marginBottom: '6px' }}><strong>Line Item Description:</strong> Match with <Tag>contains</Tag>, <Tag>startsWith</Tag>, or <Tag>matchesRegex</Tag>. Displayed as a neatly arranged vertical list in the Summary for easy reading.</li>
                    </ul>
                </>
            )
        },
        {
            title: "Template Library — Standardize Configurations",
            icon: <FaBookmark />,
            searchable: "Standards Reusable Best Practices Custom templates smart apply merge overwrite",
            content: (
                <>
                    <p style={{ marginTop: 0 }}>The <strong>Template Library</strong> allows you to save configurations as reusable standards, or apply pre-built best practices.</p>
                    <ul style={{ paddingLeft: '18px', marginTop: '6px' }}>
                        <li style={{ marginBottom: '8px' }}><strong>Custom Templates</strong> — Save your current builder state for quick reuse across different customers.</li>
                        <li style={{ marginBottom: '8px' }}><strong>Built-in Templates</strong> — Standardized markup rules provided out-of-the-box.</li>
                        <li><strong>Smart Apply</strong> — When loading templates, choose whether to <em>Merge</em> into your existing rules or <em>Overwrite</em> completely.</li>
                    </ul>
                </>
            )
        },
        {
            title: "Importing & Editing Existing Price Books",
            icon: <FaPuzzlePiece />,
            searchable: "Upload File XML JSON Paste Recover CloudHealth Live Sync Customer Search Directory",
            content: (
                <>
                    <p style={{ marginTop: 0 }}><strong>{isBrowser ? 'Two' : 'Three'} ways to import:</strong></p>
                    <Step n="1"><strong>Upload File</strong> — Click <em>Import Price Book</em> and select an existing XML or JSON file from your computer.</Step>
                    <Step n="2"><strong>Paste XML / JSON</strong> — Paste raw specification text directly into the import text area. The tool auto-recovers malformed JSON where possible.</Step>
                    {!isBrowser && (
                        <Step n="3">
                            <div>
                                <strong>CloudHealth Live Sync</strong> <em>(Desktop App only)</em> — Scan and search for pricebooks directly from your organization.
                                <ul style={{ paddingLeft: '18px', marginTop: '8px' }}>
                                    <li style={{ marginBottom: '8px' }}>
                                        <strong>🎯 Quick Customer Search</strong> — Instantly find a customer by name or API ID. The tool automatically finds their active custom pricebook and lets you import it with one click.
                                    </li>
                                    <li style={{ marginBottom: '8px' }}>
                                        <strong>🌍 Global Browser</strong> — Scan the entire organizational directory to browse all customer assignments, filter by Pricebook, and import any mapped specification.
                                    </li>
                                </ul>
                            </div>
                        </Step>
                    )}
                    <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        ⚠️ Importing will prompt before overwriting any unsaved Builder data.
                    </div>
                </>
            )
        },
        {
            title: "Export — Download Your Spec",
            icon: <FaCode />,
            searchable: "XML JSON CSV Download formats preview inspect syntax highlighted",
            content: (
                <>
                    <p style={{ marginTop: 0 }}>The <strong>Export & Deploy</strong> tab provides three download formats:</p>
                    <ul style={{ paddingLeft: '18px' }}>
                        <li style={{ marginBottom: '6px' }}><strong>XML</strong> — The native CloudHealth price book specification format.</li>
                        <li style={{ marginBottom: '6px' }}><strong>JSON</strong> — The API deployment payload format.</li>
                        <li style={{ marginBottom: '6px' }}><strong>CSV</strong> — Download all of your billing rules flattened out into a spreadsheet for offline analysis.</li>
                        <li>Use the integrated <strong>Preview</strong> pane to inspect syntax-highlighted XML or JSON before downloading.</li>
                    </ul>
                </>
            )
        },
        (!isBrowser ? {
            title: "Deploy — Push Live to CloudHealth",
            icon: <FaRocket />,
            searchable: "Desktop App API Key Update Create Dry Run Validate financial impact Assign Payer Account Dev Tools",
            content: (
                <>
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
                            Select a customer using the <strong>smart dropdown</strong> (which caches your tenant's customer list), and strictly select a <strong>Payer Account ID</strong> from the fetched list (or leave blank for <Tag>ALL</Tag>). Confirmation dialogs will explicitly verify the target customer name.
                        </p>
                        <div style={{ marginTop: '6px', padding: '8px 10px', background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '6px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            💡 When you click <strong>Edit Assignment</strong> in the Price Book Directory, you are taken here with this toggle automatically checked and all fields pre-filled.
                        </div>
                    </div>
                    <div style={{ padding: '8px 12px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '6px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        💡 Enable <strong>Dev Tools</strong> in Settings to inspect raw API payloads at each step.
                    </div>
                </>
            )
        } : null),
        (!isBrowser ? {
            title: "Price Book Directory — Manage Existing Books",
            icon: <FaFolderOpen />,
            searchable: "customer name pricebook mapping payer assignment filtering pagination actions delete unassign dry run",
            content: (
                <>
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
                                    icon: <FaPlay size={11} />, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.35)',
                                    label: 'Dry Run',
                                    desc: 'Initiate a financial impact evaluation for a specific month and payer account directly from the directory record.'
                                },
                                {
                                    icon: <FaUserEdit size={11} />, color: '#38bdf8', bg: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.35)',
                                    label: 'Edit Assignment',
                                    desc: 'Opens a quick-edit modal to update the Customer ID or Payer Account directly from the directory, without needing to navigate to the Deploy tab.'
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
                </>
            )
        } : null),
        (!isBrowser ? {
            title: "Action History & Audit Log",
            icon: <FaHistory />,
            searchable: "Action History Audit Log searchable trail logging Diff Viewer LCS rollback entry capacity",
            content: (
                <>
                    <p style={{ marginTop: 0 }}>
                        The <strong>Action History</strong> tab tracks every significant operation performed within the tool, providing a searchable audit trail of your changes.
                    </p>
                    <ul style={{ paddingLeft: '18px', marginTop: '6px' }}>
                        <li style={{ marginBottom: '8px' }}><strong>Automatic Logging</strong> — Every pricebook creation, update, deletion, and deployment is automatically timestamped and logged.</li>
                        <li style={{ marginBottom: '8px' }}><strong>Advanced Diff Viewer</strong> — Click the history row to see an XML diff between previous and current versions, featuring LCS (Longest Common Subsequence) tracking for <em>intra-line character highlighting</em> and synchronized scrolling.</li>
                        <li style={{ marginBottom: '8px' }}><strong>Instant Rollbacks</strong> — If you push a bad update or mistakenly create a pricebook, click the ↩️ <strong>Rollback</strong> button on the corresponding action to instantly revert it to its previous state in CloudHealth.</li>
                        <li style={{ marginBottom: '8px' }}><strong>2,000 Entry Capacity</strong> — The tool stores up to 2,000 persistent records in your local storage, ensuring a deep history is preserved between sessions.</li>
                        <li style={{ marginBottom: '8px' }}><strong>Search & Filter</strong> — Quickly find specific actions by searching for pricebook names or customer IDs.</li>
                    </ul>
                </>
            )
        } : null),
        {
            title: "Dashboard & Maintenance",
            icon: <FaLayerGroup />,
            searchable: "Quick Stats rule counts markup discount Dashboard Clear Rule Builder Start Over draft Update Notifications",
            content: (
                <ul style={{ paddingLeft: '18px', margin: 0 }}>
                    <li style={{ marginBottom: '8px' }}><strong>Quick Stats</strong> — Monitor rule counts, markups vs discounts, and last-updated timestamps from the Dashboard.</li>
                    <li style={{ marginBottom: '8px' }}><strong>Clear Rule Builder</strong> — Click <em>Start Over</em> on the dashboard to clear the current builder state and begin a fresh configuration.</li>
                    {!isBrowser && <li><strong>Update Notifications</strong> — The desktop app automatically checks GitHub for newer versions on startup and notifies you with a "What's New" release summary.</li>}
                </ul>
            )
        },
        {
            title: "Settings & Advanced Debugging",
            icon: <FaCog />,
            searchable: "API Credentials key session Developer Tools Network Inspector debug raw payloads",
            content: (
                <ul style={{ paddingLeft: '18px', margin: 0 }}>
                    <li style={{ marginBottom: '8px' }}><strong>API Credentials</strong> — Store your API key locally. Credentials never leave your machine except when talking to CloudHealth.</li>
                    {!isBrowser && <li><strong>Developer Tools</strong> — Enable the <em>Network Inspector</em> in Settings to debug raw CloudHealth API payloads and troubleshoot failed deployments.</li>}
                </ul>
            )
        },
        {
            title: "Best Practices & Tips",
            icon: <FaLightbulb />,
            searchable: "Dry run first Payer Account ID broad rules CloudHealth performance complete mappings Refresh Directory",
            content: (
                <ul style={{ paddingLeft: '18px', margin: 0 }}>
                    {!isBrowser && <li style={{ marginBottom: '8px' }}><strong>Always dry run first</strong> — Validate the financial impact before pushing live to any customer.</li>}
                    <li style={{ marginBottom: '8px' }}><strong>Name rule groups clearly</strong> — e.g., "Q1 2025 EC2 Discount" makes future maintenance much easier.</li>
                    <li style={{ marginBottom: '8px' }}><strong>Use filters precisely</strong> — Overly broad rules can accidentally affect unintended usage types.</li>
                    <li style={{ marginBottom: '8px' }}><strong>Keep rule count manageable</strong> — Under 500 rules per price book is recommended for optimal CloudHealth performance.</li>
                    {!isBrowser && <li style={{ marginBottom: '8px' }}><strong>Complete N/A payer mappings</strong> — Books showing <Tag color="#6b7280">N/A</Tag> in the directory are assigned to a customer but not yet linked to a payer account. Use <em>Edit Assignment</em> to complete the mapping.</li>}
                    <li style={{ marginBottom: '8px' }}><strong>Use View Summary before deployment</strong> — The plain English summary is a quick sanity check of your rules before going live.</li>
                    {!isBrowser && <li><strong>Refresh Directory after changes</strong> — Hit the Refresh button after any deploy, unassign, or delete to pull the latest state from CloudHealth.</li>}
                </ul>
            )
        },
        (!isBrowser ? {
            title: "API Reference & XML Schema",
            icon: <FaCode />,
            searchable: "BillingRules RuleGroup startDate endDate enabled disabled BillingRule percentDiscount PropertyFilter Region UsageType",
            content: (
                <div style={{ fontSize: '0.85rem' }}>
                    <p style={{ marginTop: 0 }}>
                        Based on the <a
                            href="https://apidocs.cloudhealthtech.com/#price-book_introduction-to-price-book-api"
                            style={{ color: 'var(--primary)', cursor: 'pointer' }}
                            onClick={(e) => { e.preventDefault(); openExternal('https://apidocs.cloudhealthtech.com/#price-book_introduction-to-price-book-api'); }}
                        >
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
            )
        } : null)
    ].filter(Boolean), [isBrowser]);

    const filteredTopics = useMemo(() => {
        if (!searchQuery.trim()) return HELP_DATA;
        const q = searchQuery.toLowerCase();
        return HELP_DATA.filter(topic =>
            topic.title.toLowerCase().includes(q) ||
            topic.searchable.toLowerCase().includes(q)
        );
    }, [searchQuery, HELP_DATA]);

    // Auto-expand matches when searching
    React.useEffect(() => {
        if (searchQuery.trim().length >= 2) {
            const newExpanded = {};
            filteredTopics.forEach(t => {
                newExpanded[t.title] = true;
            });
            setExpandedSections(newExpanded);
        }
    }, [filteredTopics, searchQuery]);

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
                        <Tooltip title="Resize" content="Drag to resize the help panel" position="left">
                            <div
                                onMouseDown={() => setIsResizing(true)}
                                style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '5px', cursor: 'ew-resize', zIndex: 1000 }}
                            />
                        </Tooltip>

                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', paddingRight: '32px' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <FaBook className="text-primary" /> Help &amp; Guide
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            style={{ position: 'absolute', top: '24px', right: '24px', width: '28px', height: '28px', borderRadius: '7px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', transition: 'all 0.18s', flexShrink: 0, zIndex: 2 }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)'; e.currentTarget.style.color = '#ef4444'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                            aria-label="Close"
                        >✕</button>

                        {/* Search Bar */}
                        <div style={{ position: 'relative', marginBottom: '20px' }}>
                            <FaSearch style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                            <input
                                type="text"
                                placeholder="Search help topics or keywords..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px 40px',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-deep)',
                                    color: 'var(--text-main)',
                                    fontSize: '0.95rem',
                                    outline: 'none',
                                    transition: 'border-color 0.2s',
                                }}
                                onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    style={{
                                        position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                        background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer'
                                    }}
                                >
                                    <FaTimes />
                                </button>
                            )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {filteredTopics.length > 0 ? (
                                filteredTopics.map(topic => (
                                    <HelpAccordion
                                        key={topic.title}
                                        title={topic.title}
                                        icon={topic.icon}
                                        isOpen={expandedSections[topic.title]}
                                        onToggle={() => toggleSection(topic.title)}
                                        highlight={searchQuery}
                                    >
                                        {topic.content}
                                    </HelpAccordion>
                                ))
                            ) : (
                                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                                    <FaSearch size={24} style={{ marginBottom: '12px', opacity: 0.3 }} />
                                    <div style={{ fontWeight: 600 }}>No results found for "{searchQuery}"</div>
                                    <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>Try a different keyword or browse categories.</div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {!searchQuery && (
                            <>
                                <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                    <p>
                                        <a
                                            href="https://github.com/digitalsuni-cloud/cpb-ch/issues"
                                            style={{ color: 'var(--primary)', marginRight: '15px', cursor: 'pointer' }}
                                            onClick={(e) => { e.preventDefault(); openExternal('https://github.com/digitalsuni-cloud/cpb-ch/issues'); }}
                                        >Report Issue on GitHub</a>
                                        <a
                                            href="mailto:sunil-ac.kumar@broadcom.com?subject=CloudHealth Pricebook Studio Feedback"
                                            style={{ color: 'var(--primary)', cursor: 'pointer' }}
                                            onClick={(e) => { e.preventDefault(); openExternal('mailto:sunil-ac.kumar@broadcom.com?subject=CloudHealth Pricebook Studio Feedback'); }}
                                        >Contact Developer</a>
                                    </p>
                                    <p style={{ marginTop: '12px' }}>Need more help? Visit the <a
                                        href="https://apidocs.cloudhealthtech.com/#price-book_introduction-to-price-book-api"
                                        style={{ color: 'var(--primary)', cursor: 'pointer' }}
                                        onClick={(e) => { e.preventDefault(); openExternal('https://apidocs.cloudhealthtech.com/#price-book_introduction-to-price-book-api'); }}
                                    >Official Documentation</a>.</p>
                                    <p style={{ marginTop: '12px', padding: '8px 12px', background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: '6px', color: 'var(--text-muted)', fontStyle: 'italic' }}>⚠️ This is not an official CloudHealth product. It is an internal tool built by Sunil @ CloudHealth to simplify Custom Price Book management.</p>
                                </div>
                            </>
                        )}
                        <div style={{ height: '30px', width: '100%', flexShrink: 0 }} />
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default HelpSection;
