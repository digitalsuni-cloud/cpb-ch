import React, { useState } from 'react';
import { usePriceBook } from '../context/PriceBookContext';
import { generateXML, getDeploymentSteps } from '../utils/converter';
import { FaDownload, FaCopy, FaCheck, FaRocket, FaSmile, FaSlash } from 'react-icons/fa';
import { productIconMapping } from '../utils/awsIconMapping';
import { getIconForProduct } from '../utils/awsIcons';
import CalendarIcon from './CalendarIcon';
import { createPriceBook, updatePriceBook } from '../utils/chApi';
import { isElectronApp } from '../utils/env';
import { FaWindows, FaApple, FaLinux } from 'react-icons/fa';

const ExportSection = () => {
    const { state } = usePriceBook();
    const [outputs, setOutputs] = useState({ xml: '', steps: null });
    const [activeTab, setActiveTab] = useState('xml');
    const [copyStatus, setCopyStatus] = useState({});
    const [showEmojis, setShowEmojis] = useState(false);


    // Auto-generate outputs whenever relevant state changes
    React.useEffect(() => {
        const { priceBook } = state;
        // Dashboard logic: Only count groups with a start date
        const hasValidGroups = priceBook.ruleGroups.some(group => group.startDate);

        if (hasValidGroups) {
            const xml = generateXML(priceBook);
            const steps = getDeploymentSteps(priceBook);
            setOutputs({ xml, steps });
        } else {
            setOutputs({ xml: '', steps: null });
        }
    }, [state.priceBook]);

    const handleCopy = (content, id) => {
        if (!content) return;
        navigator.clipboard.writeText(content);
        setCopyStatus({ ...copyStatus, [id]: true });
        setTimeout(() => setCopyStatus({ ...copyStatus, [id]: false }), 2000);
    };

    const handleDownload = (content, filename) => {
        if (!content) return;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Helper function to get emoji for attributes
    const getAttributeEmoji = (attrName, attrValue) => {
        if (!showEmojis) return '';
        // Book name and comment  
        if (attrName === 'book_name') return '📚';

        // User and dates - extract day for custom calendar icon
        if (attrName === 'createdBy') return '👤';
        if (attrName === 'date' || attrName === 'startDate' || attrName === 'endDate') {
            // Extract day from date value (format: "YYYY-MM-DD")
            const dateMatch = attrValue.match(/\d{4}-\d{2}-(\d{2})/);
            if (dateMatch) {
                const day = parseInt(dateMatch[1], 10);
                // Return a special marker that includes the day
                return `__CALENDAR_ICON__${day}__`;
            }
            return '📅'; // Fallback to regular emoji if date format doesn't match
        }

        // Names and identifiers
        if (attrName === 'name') return '🏷️';

        // Product name - extract the actual product name and create a marker
        if (attrName === 'productName') {
            // Extract product name from value (remove quotes and HTML entities)
            const productName = attrValue
                .replace(/&quot;/g, '"')
                .replace(/\\"/g, '')
                .replace(/"/g, '')
                .trim();
            // Return a special marker that includes the product name
            return `__PRODUCT_ICON__${productName}__`;
        }

        // Instance properties
        if (attrName === 'instanceType') return '🖥️';
        if (attrName === 'instanceSize') return '📏';

        // Line item description
        if (attrName === 'contains' || attrName === 'matchesRegex') return '📝';

        // Billing
        if (attrName === 'billingAdjustment') return '🔢';
        if (attrName === 'billingRuleType') return '📋';
        if (attrName === 'payerAccounts') return '💳';

        // Booleans - dynamic based on value
        if (attrName === 'includeDataTransfer' || attrName === 'includeRIPurchases' || attrName === 'reserved') {
            const isTrueValue = attrValue.toLowerCase().includes('true');
            return isTrueValue ? '✅' : '❌';
        }

        return '';
    };

    const highlight = (code, type) => {
        if (!code) return '';

        // Helper to escape HTML characters
        const escapeHtml = (str) =>
            str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        if (type === 'json') {
            // For JSON output, we treat the entire content as XML since it contains embedded XML
            // First escape the HTML
            const escaped = escapeHtml(code);

            // First, highlight JSON structure elements (book_name, specification keys)
            let result = escaped.replace(/"book_name"\s*:\s*"([^"]+)"/g, (m, value) => {
                const emoji = showEmojis ? '<span class="attr-emoji">📚</span>' : '';
                return `${emoji}<span class="hl-json-key">"book_name"</span>:<span class="hl-value-bookname">"${value}"</span>`;
            });

            result = result.replace(/"specification"\s*:/g, () => {
                return `<span class="hl-json-key">"specification"</span>:`;
            });

            // Apply XML-style highlighting to the entire content
            result = result.replace(/(&lt;\/?[a-zA-Z0-9]+)(\s*.*?)(&gt;)/g, (m, p1, p2, p3) => {
                // Extract tag name (remove &lt; and optional /)
                const tagName = p1.replace(/&lt;\/?/, '');

                // Determine CSS class based on tag name for semantic coloring
                let tagClass = 'hl-tag';
                if (tagName === 'RuleGroup') {
                    tagClass = 'hl-tag-group';
                } else if (tagName === 'BillingRule' || tagName === 'BasicBillingRule') {
                    tagClass = 'hl-tag-rule';
                } else if (tagName === 'Product') {
                    tagClass = 'hl-tag-product';
                } else if (tagName === 'Comment' || tagName === 'CHTBillingRules') {
                    tagClass = 'hl-tag-meta';
                } else if (['UsageType', 'Operation', 'RecordType', 'SavingsPlanOfferingType', 'InstanceProperties', 'LineItemDescription'].includes(tagName)) {
                    tagClass = 'hl-tag-prop';
                }

                // Highlight attributes with specific colors for BOTH names AND values
                // Match: attrName="value" or attrName=&quot;value&quot; or attrName=\"value\"
                const attrs = p2.replace(/([a-zA-Z0-9]+)=((?:&quot;|\\"|")[^&"\\]*(?:&quot;|\\"|"))/g, (m2, attrName, attrValue) => {
                    // Special colors for specific attributes
                    let attrClass = 'hl-key';
                    let valueClass = 'hl-string';

                    if (attrName === 'createdBy') {
                        attrClass = 'hl-attr-creator';
                        valueClass = 'hl-value-creator';
                    } else if (attrName === 'date' || attrName === 'startDate' || attrName === 'endDate') {
                        attrClass = 'hl-attr-date';
                        valueClass = 'hl-value-date';
                    } else if (attrName === 'name') {
                        attrClass = 'hl-attr-name';
                        valueClass = 'hl-value-name';
                    } else if (attrName === 'productName') {
                        attrClass = 'hl-attr-product';
                        valueClass = 'hl-value-product';
                    } else if (attrName === 'instanceType' || attrName === 'instanceSize') {
                        attrClass = 'hl-attr-instance';
                        valueClass = 'hl-value-instance';
                    } else if (attrName === 'contains' || attrName === 'matchesRegex') {
                        attrClass = 'hl-attr-description';
                        valueClass = 'hl-value-description';
                    } else if (attrName === 'billingAdjustment') {
                        attrClass = 'hl-attr-number';
                        valueClass = 'hl-value-number';
                    } else if (attrName === 'billingRuleType') {
                        attrClass = 'hl-attr-type';
                        valueClass = 'hl-value-type';
                    } else if (attrName === 'includeDataTransfer' || attrName === 'includeRIPurchases' || attrName === 'reserved') {
                        attrClass = 'hl-attr-boolean';
                        valueClass = 'hl-value-boolean';
                    } else if (attrName === 'payerAccounts') {
                        attrClass = 'hl-attr-account';
                        valueClass = 'hl-value-account';
                    }

                    const emoji = getAttributeEmoji(attrName, attrValue);
                    const emojiSpan = emoji ? `<span class="attr-emoji">${emoji}</span>` : '';
                    return `${emojiSpan}<span class="${attrClass}">${attrName}</span>=<span class="${valueClass}">${attrValue}</span>`;
                });

                return `<span class="${tagClass}">${p1}</span>${attrs}<span class="${tagClass}">${p3}</span>`;
            });

            return result;
        }

        // Standard handling for non-JSON types
        const escaped = escapeHtml(code);

        if (type === 'xml') {
            const result = escaped.replace(/(&lt;\/?[a-zA-Z0-9]+)(\s*.*?)(&gt;)/g, (m, p1, p2, p3) => {
                // Extract tag name (remove &lt; and optional /)
                const tagName = p1.replace(/&lt;\/?/, '');

                // Determine CSS class based on tag name for semantic coloring
                let tagClass = 'hl-tag';
                if (tagName === 'RuleGroup') {
                    tagClass = 'hl-tag-group';
                } else if (tagName === 'BillingRule' || tagName === 'BasicBillingRule') {
                    tagClass = 'hl-tag-rule';
                } else if (tagName === 'Product') {
                    tagClass = 'hl-tag-product';
                } else if (tagName === 'Comment' || tagName === 'CHTBillingRules') {
                    tagClass = 'hl-tag-meta';
                } else if (['UsageType', 'Operation', 'RecordType', 'SavingsPlanOfferingType', 'InstanceProperties', 'LineItemDescription'].includes(tagName)) {
                    tagClass = 'hl-tag-prop';
                }

                // Highlight attributes with emojis
                const attrs = p2.replace(/([a-zA-Z0-9]+)=(&quot;[^&]*&quot;|"[^"]*")/g, (m2, attrName, attrValue) => {
                    const emoji = getAttributeEmoji(attrName, attrValue);
                    const emojiSpan = emoji ? `<span class="attr-emoji">${emoji}</span>` : '';
                    return `${emojiSpan}<span class="hl-key">${attrName}</span>=<span class="hl-string">${attrValue}</span>`;
                });

                return `<span class="${tagClass}">${p1}</span>${attrs}<span class="${tagClass}">${p3}</span>`;
            });

            return result;
        }

        if (type === 'curl') {
            return escaped
                .replace(/(&quot;[^&]*&quot;|"[^"]*"|'[^']*')/g, '<span class="hl-string">$1</span>')
                .replace(/\b(-[a-zA-Z]|\-\-[a-zA-Z-]+)\b/g, '<span class="hl-key">$1</span>');
        }

        return escaped;
    };

    // Render highlighted content with AWS product icons and custom calendar icons
    const renderHighlightedContent = (content, type) => {
        const highlighted = highlight(content, type);

        // Check if there are any custom icon markers
        const hasProductIcons = highlighted.includes('__PRODUCT_ICON__');
        const hasCalendarIcons = highlighted.includes('__CALENDAR_ICON__');

        if (!hasProductIcons && !hasCalendarIcons) {
            return <div dangerouslySetInnerHTML={{ __html: highlighted }} />;
        }

        // Split by both product and calendar icon markers
        const parts = highlighted.split(/(__PRODUCT_ICON__.*?__|__CALENDAR_ICON__.*?__)/g);

        return (
            <div>
                {parts.map((part, index) => {
                    if (part.startsWith('__PRODUCT_ICON__')) {
                        // Extract product name from marker
                        const productName = part.replace(/__PRODUCT_ICON__|__/g, '');
                        const Icon = getIconForProduct(productName);
                        return (
                            <span key={index} className="attr-emoji" style={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}>
                                {React.cloneElement(Icon, { size: 14 })}
                            </span>
                        );
                    } else if (part.startsWith('__CALENDAR_ICON__')) {
                        // Extract day from marker
                        const day = parseInt(part.replace(/__CALENDAR_ICON__|__/g, ''), 10);
                        return (
                            <span key={index} className="attr-emoji" style={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}>
                                <CalendarIcon day={day} size={16} />
                            </span>
                        );
                    }
                    return <span key={index} dangerouslySetInnerHTML={{ __html: part }} />;
                })}
            </div>
        );
    };

    const renderOutputBox = (content, id, title, filename, showEmojiToggle = true, flexShare = 1, minLines = 3) => {
        const outerMinHeight = `${65 + minLines * 20}px`;
        const innerMinHeight = `${32 + minLines * 16}px`;
        if (!content) return null;

        const buttonStyle = {
            padding: '6px 14px',
            fontSize: '0.75rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            borderRadius: '6px',
            border: '1px solid var(--border)',
            background: 'rgba(255, 255, 255, 0.03)',
            color: 'var(--text-main)',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            backdropFilter: 'blur(4px)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        };

        const emojiButtonStyle = {
            ...buttonStyle,
            color: showEmojis ? 'var(--primary)' : 'var(--text-muted)',
            borderColor: showEmojis ? 'rgba(139, 92, 246, 0.5)' : 'var(--border)',
            background: showEmojis ? 'rgba(139, 92, 246, 0.1)' : 'rgba(255, 255, 255, 0.03)'
        };

        return (
            <div key={id} style={{ display: 'flex', flexDirection: 'column', flexGrow: flexShare, flexShrink: 0, flexBasis: outerMinHeight, padding: '2px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexShrink: 0 }}>
                    <h5 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {title}
                    </h5>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {showEmojiToggle && (
                            <button
                                onClick={() => setShowEmojis(!showEmojis)}
                                style={emojiButtonStyle}
                                title="Don't worry, emojis are for display only and won't be included in your Price Book content."
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.background = showEmojis ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.08)';
                                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.background = showEmojis ? 'rgba(139, 92, 246, 0.1)' : 'rgba(255, 255, 255, 0.03)';
                                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                                }}
                            >
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <FaSmile size={11} color={showEmojis ? '#f6e05e' : 'inherit'} />
                                    {!showEmojis && <FaSlash size={9} style={{ position: 'absolute', top: 0, left: 1, opacity: 0.8 }} />}
                                </div>
                                {showEmojis ? 'Emojis On' : 'Emojis Off'}
                            </button>
                        )}
                        <button
                            onClick={() => handleCopy(content, id)}
                            style={buttonStyle}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                                e.currentTarget.style.borderColor = 'var(--primary)';
                                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                e.currentTarget.style.borderColor = 'var(--border)';
                                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                            }}
                        >
                            {copyStatus[id] ? <><FaCheck size={10} color="#10b981" /> Copied</> : <><FaCopy size={10} /> Copy</>}
                        </button>
                        <button
                            onClick={() => handleDownload(content, filename)}
                            style={buttonStyle}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                                e.currentTarget.style.borderColor = 'var(--primary)';
                                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                e.currentTarget.style.borderColor = 'var(--border)';
                                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                            }}
                        >
                            <FaDownload size={10} /> Download
                        </button>
                    </div>
                </div>
                <div
                    className="output-box"
                    style={{
                        background: 'var(--bg-deep)',
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                        padding: '16px',
                        fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                        fontSize: '0.85rem',
                        lineHeight: '1.6',
                        flexGrow: 1,
                        flexShrink: 0,
                        flexBasis: innerMinHeight,
                        minHeight: innerMinHeight,
                        overflow: 'auto',
                        whiteSpace: 'pre-wrap',
                        boxShadow: 'inset 0 2px 12px rgba(0,0,0,0.15)',
                        color: 'var(--text-main)',
                        resize: 'none' // disabled resize to prevent breaking flex layout
                    }}
                >
                    {renderHighlightedContent(content, activeTab)}
                </div>
            </div>
        );
    };

    const renderContent = () => {
        if (!outputs.xml && !outputs.steps) {
            return (
                <div style={{
                    padding: '60px 20px',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '12px',
                    border: '1px dashed var(--border)'
                }}>
                    <FaSlash size={32} style={{ marginBottom: '16px', opacity: 0.5 }} />
                    <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-secondary)' }}>Nothing to see here yet</h3>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>
                        Please ensure you have entered a <strong>Price Book Name</strong> and added at least one <strong>valid Billing Rule</strong> to generate deployment artifacts.
                    </p>
                </div>
            );
        }

        const dateStr = new Date().toISOString().split('T')[0];
        const safeBookName = state.priceBook.bookName ? state.priceBook.bookName.replace(/[^a-z0-9-_]/gi, '_') : 'pricebook';

        if (activeTab === 'xml') {
            return renderOutputBox(outputs.xml, 'xml', 'Specification XML', `${safeBookName}_${dateStr}_specification.xml`, true, 1, 10);
        }

        if (activeTab === 'curl') {
            const currentSteps = outputs.steps.curl;
            const stepTitles = [
                "Step 1: Create/Update Custom Price Book",
                "Step 2: Assign Price Book to Customer",
                "Step 3: Assign Price Book to Payer Account(s)"
            ];
            return (
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '12px', overflow: 'auto', padding: '4px' }}>
                    {renderOutputBox(currentSteps.step1, `curl-s1`, stepTitles[0], `${safeBookName}_${dateStr}_step1_create.txt`, false, 10, 3)}
                    {renderOutputBox(currentSteps.step2, `curl-s2`, stepTitles[1], `${safeBookName}_${dateStr}_step2_assign_customer.txt`, false, 1, 2)}
                    {renderOutputBox(currentSteps.step3, `curl-s3`, stepTitles[2], `${safeBookName}_${dateStr}_step3_assign_payer.txt`, false, 1, 2)}
                </div>
            );
        }

        const currentSteps = outputs.steps.json;
        const stepTitles = [
            "Step 1: Create/Update Custom Price Book",
            "Step 2: Assign Price Book to Customer",
            "Step 3: Assign Price Book to Payer Account(s)"
        ];

        return (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '12px', overflow: 'auto', padding: '4px' }}>
                {renderOutputBox(currentSteps.step1, `json-s1`, stepTitles[0], `${safeBookName}_${dateStr}_step1_create.json`, true, 10, 3)}
                {renderOutputBox(currentSteps.step2, `json-s2`, stepTitles[1], `${safeBookName}_${dateStr}_step2_assign_customer.json`, false, 1, 2)}
                {renderOutputBox(currentSteps.step3, `json-s3`, stepTitles[2], `${safeBookName}_${dateStr}_step3_assign_payer.json`, false, 1, 2)}
            </div>
        );
    };

    return (
        <div className="output-section card" style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, marginTop: '2px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexShrink: 0 }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.2rem' }}>📤</span> Export Center
                </h3>
            </div>

            <div className="tabs" style={{ background: 'var(--bg-deep)', padding: '4px', borderRadius: '8px', display: 'flex', gap: '4px', maxWidth: '300px', marginBottom: '24px', flexShrink: 0 }}>
                {['xml', 'json', 'curl'].map(type => (
                    <button
                        key={type}
                        onClick={() => setActiveTab(type)}
                        style={{
                            flex: 1,
                            padding: '8px',
                            borderRadius: '6px',
                            border: 'none',
                            background: activeTab === type ? 'var(--primary)' : 'transparent',
                            color: activeTab === type ? 'white' : 'var(--text-muted)',
                            cursor: 'pointer',
                            fontWeight: activeTab === type ? 'bold' : 'normal',
                            textTransform: 'uppercase',
                            fontSize: '0.75rem',
                            transition: 'all 0.2s'
                        }}
                    >
                        {type}
                    </button>
                ))}
            </div>

            <div style={{ padding: '0 4px 16px 4px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflowY: 'auto' }}>
                {renderContent()}

                {/* GH-Pages Standalone Promotion Block */}
                {!isElectronApp() && (
                    <div style={{
                        marginTop: '20px',
                        padding: '16px',
                        flexShrink: 0,
                        background: 'var(--bg-deep)',
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    background: 'var(--primary)',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: '1.2rem',
                                    boxShadow: '0 2px 8px rgba(79, 70, 229, 0.2)'
                                }}>
                                    <FaRocket />
                                </div>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)' }}>Install Standalone App</h4>
                                    <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        Full local API integration & 1-click deploys.
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {[
                                    { os: 'Win', icon: <FaWindows />, url: 'https://github.com/digitalsuni-cloud/cpb-ch/releases/download/v4.0.0/CloudHealth.Pricebook.Studio.4.0.0.exe' },
                                    { os: 'Mac (M-Series)', icon: <FaApple />, url: 'https://github.com/digitalsuni-cloud/cpb-ch/releases/download/v4.0.0/CloudHealth.Pricebook.Studio-4.0.0-arm64.dmg' },
                                    { os: 'Mac (Intel)', icon: <FaApple />, url: 'https://github.com/digitalsuni-cloud/cpb-ch/releases/download/v4.0.0/CloudHealth.Pricebook.Studio-4.0.0.dmg' },
                                    { os: 'Linux', icon: <FaLinux />, url: 'https://github.com/digitalsuni-cloud/cpb-ch/releases/download/v4.0.0/CloudHealth.Pricebook.Studio-4.0.0.AppImage' }
                                ].map((btn) => (
                                    <a
                                        key={btn.os}
                                        href={btn.url}
                                        title={`Download for ${btn.os}`}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            padding: '8px 12px',
                                            background: 'var(--bg-card)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '8px',
                                            color: 'var(--text-main)',
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                            textDecoration: 'none',
                                            transition: 'all 0.2s ease',
                                            cursor: 'pointer'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.borderColor = 'var(--primary)';
                                            e.currentTarget.style.background = 'var(--bg-hover)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.borderColor = 'var(--border)';
                                            e.currentTarget.style.background = 'var(--bg-card)';
                                        }}
                                    >
                                        <span style={{ fontSize: '1rem' }}>{btn.icon}</span>
                                        {btn.os}
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExportSection;
