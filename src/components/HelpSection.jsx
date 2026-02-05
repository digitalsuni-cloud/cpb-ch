import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaExternalLinkAlt, FaTimes, FaBook, FaPuzzlePiece, FaFilter, FaRocket, FaChevronDown, FaChevronUp, FaLightbulb, FaCode } from 'react-icons/fa';

const HelpAccordion = ({ title, icon, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', background: 'var(--bg-deep)' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: isOpen ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                    border: 'none',
                    color: isOpen ? 'var(--primary)' : 'var(--text-main)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    textAlign: 'left'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {icon}
                    <span>{title}</span>
                </div>
                {isOpen ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div style={{ padding: '16px', borderTop: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const HelpSection = ({ isOpen, onClose }) => {
    const [width, setWidth] = useState(500);
    const [isResizing, setIsResizing] = useState(false);

    React.useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isResizing) return;
            const newWidth = window.innerWidth - e.clientX;
            // Clamp width between 300px and 90% of screen
            if (newWidth > 300 && newWidth < window.innerWidth * 0.9) {
                setWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        }
    }, [isResizing]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        className="drawer-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 998 }}
                    />
                    <motion.div
                        className="drawer-panel"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        style={{
                            position: 'fixed', top: 0, right: 0, bottom: 0, width: `${width}px`,
                            background: 'var(--bg-card)', padding: '24px', zIndex: 999, overflowY: 'auto', boxShadow: '-5px 0 20px rgba(0,0,0,0.2)'
                        }}
                    >
                        {/* Resize Handle */}
                        <div
                            onMouseDown={() => setIsResizing(true)}
                            style={{
                                position: 'absolute',
                                top: 0,
                                bottom: 0,
                                left: 0,
                                width: '5px',
                                cursor: 'ew-resize',
                                background: 'transparent',
                                zIndex: 1000
                            }}
                            title="Drag to resize"
                        />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <FaBook className="text-primary" /> Documentation
                            </h2>
                            <button
                                onClick={onClose}
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', padding: '8px' }}
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                            <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                                <p style={{ margin: 0 }}>
                                    <strong>CloudHealth Custom Price Books</strong> allow CloudHealth Partners to override standard AWS pricing.
                                    Use this tool to build, edit, and export price book specifications easily.
                                </p>
                            </div>

                            <HelpAccordion title="Getting Started" icon={<FaRocket />} defaultOpen={true}>
                                <ol style={{ paddingLeft: '20px', margin: 0 }}>
                                    <li style={{ marginBottom: '8px' }}><strong>Enter Details:</strong> Fill in the "Book Name" and "Created By" fields.</li>
                                    <li style={{ marginBottom: '8px' }}><strong>Add Rule Group:</strong> Create a container for your rules (e.g., specific dates or accounts).</li>
                                    <li style={{ marginBottom: '8px' }}><strong>Add Rules:</strong> Insert specific billing rules (discounts, markups) into the group.</li>
                                    <li style={{ marginBottom: '8px' }}><strong>Apply Filters:</strong> Use "Property Filters" to target specific usage (e.g., Region, Instance Type).</li>
                                    <li><strong>Export:</strong> Generate XML or JSON to upload to CloudHealth.</li>
                                </ol>
                            </HelpAccordion>

                            <HelpAccordion title="Advanced Filtering" icon={<FaFilter />}>
                                <p>Refine exactly which charges your rule applies to using these properties:</p>
                                <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                                    <li style={{ marginBottom: '6px' }}><strong>Region:</strong> e.g., <code>us-east-1</code></li>
                                    <li style={{ marginBottom: '6px' }}><strong>Usage Type:</strong> Detailed usage category (e.g., <code>BoxUsage:t3.large</code>).</li>
                                    <li style={{ marginBottom: '6px' }}><strong>Instance Properties:</strong>
                                        <div style={{ fontSize: '0.85rem', marginTop: '4px', opacity: 0.9 }}>Filter by Type (e.g., <code>m5.large</code>), Size, or Reservation status.</div>
                                    </li>
                                    <li style={{ marginBottom: '6px' }}><strong>Line Item Description:</strong>
                                        <div style={{ fontSize: '0.85rem', marginTop: '4px', opacity: 0.9 }}>
                                            Use <code>contains</code>, <code>startsWith</code>, or <code>matchesRegex</code> for powerful pattern matching on descriptions.
                                        </div>
                                    </li>
                                </ul>
                            </HelpAccordion>

                            <HelpAccordion title="Importing & Editing" icon={<FaPuzzlePiece />}>
                                <p><strong>Three ways to import data:</strong></p>
                                <ul style={{ paddingLeft: '20px', marginTop: '8px', marginBottom: '16px' }}>
                                    <li style={{ marginBottom: '8px' }}><strong>Upload File:</strong> Click "Import Price Book" and select an existing XML or JSON file.</li>
                                    <li style={{ marginBottom: '8px' }}><strong>Paste JSON/XML:</strong> Paste content directly into the Import Text Area.</li>
                                    <li><strong>Read from Output:</strong>
                                        If you have edited the content in the "XML Output" or "JSON Output" tabs, click <strong>"Read from Output"</strong> to reload the visual builder with those changes.
                                    </li>
                                </ul>
                                <p style={{ fontSize: '0.85rem', fontStyle: 'italic' }}>
                                    Note: The tool attempts to auto-recover malformed JSON where possible.
                                </p>
                            </HelpAccordion>

                            <HelpAccordion title="Deployment" icon={<FaRocket />}>
                                <div style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                                    <p style={{ marginBottom: '10px' }}>Use the API to deploy your Price Book. Endpoints typically require an API Key.</p>

                                    <div style={{ marginBottom: '16px' }}>
                                        <strong>1. Create New Price Book</strong>
                                        <div style={{ background: 'var(--bg-deep)', padding: '8px', borderRadius: '4px', margin: '4px 0', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                            POST /v1/price_books
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Payload: <code>{`{"book_name": "...", "specification": "..."}`}</code></div>
                                    </div>

                                    <div style={{ marginBottom: '16px' }}>
                                        <strong>1a. Update Existing Price Book</strong>
                                        <div style={{ background: 'var(--bg-deep)', padding: '8px', borderRadius: '4px', margin: '4px 0', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                            PUT /v1/price_books/:price_book_id
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Payload: <code>{`{"specification": "..."}`}</code></div>
                                    </div>

                                    <div style={{ marginBottom: '16px' }}>
                                        <strong>2. Assign to Customer</strong>
                                        <div style={{ background: 'var(--bg-deep)', padding: '8px', borderRadius: '4px', margin: '4px 0', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                            POST /v1/price_book_assignments
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Payload: <code>{`{"price_book_id": "...", "target_client_api_id": "..."}`}</code></div>
                                    </div>

                                    <div>
                                        <strong>3. Assign to Payer Accounts</strong>
                                        <div style={{ background: 'var(--bg-deep)', padding: '8px', borderRadius: '4px', margin: '4px 0', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                            POST /v1/price_book_account_assignments
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Payload: <code>{`{"price_book_assignment_id": "...", "billing_account_owner_id": ["123456789012"], "target_client_api_id": "..."}`}</code></div>
                                    </div>
                                </div>
                            </HelpAccordion>

                            <HelpAccordion title="Test Run (Dry Run)" icon={<FaLightbulb />}>
                                <div style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                                    <p>Safe way to test a price book without impacting production data. Results are emailed or uploaded to S3.</p>

                                    <div style={{ background: 'var(--bg-deep)', padding: '8px', borderRadius: '4px', margin: '8px 0', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                        PUT /v1/price_books/dry_run
                                    </div>

                                    <div style={{ fontSize: '0.85rem' }}><strong>Required Payload:</strong></div>
                                    <pre style={{ background: 'var(--bg-deep)', padding: '8px', borderRadius: '4px', margin: '4px 0', overflowX: 'auto', fontSize: '0.75rem', color: 'var(--primary)' }}>
                                        {`{
  "price_book_id": "12345",
  "target_client_api_id": "00000",
  "month": "2023-01",
  "billing_account_owner_id": "123456789012"
}`}
                                    </pre>
                                </div>
                            </HelpAccordion>

                            <HelpAccordion title="API Reference & Specs" icon={<FaCode />}>
                                <div style={{ fontSize: '0.85rem' }}>
                                    <p style={{ marginBottom: '10px' }}>Based on <a href="https://apidocs.cloudhealthtech.com/#price-book_introduction-to-price-book-api" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>CloudHealth API Docs</a>:</p>

                                    <div style={{ marginBottom: '12px' }}>
                                        <code style={{ fontWeight: 'bold', color: 'var(--primary)' }}>&lt;CHTBillingRules&gt;</code>
                                        <div style={{ paddingLeft: '10px', marginTop: '4px' }}>Top-level element. Requires <code>date</code> and <code>createdBy</code>.</div>
                                    </div>

                                    <div style={{ marginBottom: '12px' }}>
                                        <code style={{ fontWeight: 'bold', color: 'var(--primary)' }}>&lt;RuleGroup&gt;</code>
                                        <div style={{ paddingLeft: '10px', marginTop: '4px' }}>
                                            Defines date range (<code>startDate</code>, <code>endDate</code>) and scope (<code>enabled</code>, <code>payerAccounts</code>).
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '12px' }}>
                                        <code style={{ fontWeight: 'bold', color: 'var(--primary)' }}>&lt;BillingRule&gt;</code>
                                        <div style={{ paddingLeft: '10px', marginTop: '4px' }}>
                                            Contains logic.
                                            <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
                                                <li><code>billingRuleType</code>: percentDiscount, percentIncrease, fixedRate</li>
                                                <li><code>billingAdjustment</code>: Numeric value (0-100)</li>
                                                <li><code>includeDataTransfer</code> / <code>includeRIPurchases</code>: Boolean flags.</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </HelpAccordion>

                            <HelpAccordion title="Best Practices" icon={<FaLightbulb />}>
                                <ul style={{ paddingLeft: '20px', margin: 0 }}>
                                    <li style={{ marginBottom: '8px' }}><strong>Organization:</strong> Group rules by customer or time period (e.g., "Q1 2025 Discount").</li>
                                    <li style={{ marginBottom: '8px' }}><strong>Naming:</strong> Use descriptive names for rules to make maintenance easier.</li>
                                    <li style={{ marginBottom: '8px' }}><strong>Performance:</strong> Keep rule counts under 500 per price book for optimal performance.</li>
                                    <li><strong>Validation:</strong> Always test your Price Book with a Dry Run to validate the outcome is as expected before assigning it to a customer or payer account.</li>
                                </ul>
                            </HelpAccordion>

                        </div>

                        <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            <p>
                                Need more help? Visit the <a href="https://apidocs.cloudhealthtech.com/#price-book_introduction-to-price-book-api" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>Official Documentation</a>.
                            </p>
                            <p style={{ marginTop: '8px' }}>
                                ✨Vibe Coded with ☕☕☕☕☕ & 🎧 by Sunil@CloudHealth 🚀
                            </p>
                        </div>
                        <div style={{ height: '30px', width: '100%', flexShrink: 0 }} />
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default HelpSection;
