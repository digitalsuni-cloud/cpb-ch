import React, { useState, useEffect, useCallback } from 'react';
import { usePriceBook } from './context/PriceBookContext';
import DashboardLayout from './layouts/DashboardLayout';
import HelpSection from './components/HelpSection';
import Toast from './components/Toast';
import { useToast } from './hooks/useToast';

// Views
import PriceBookForm from './components/PriceBookForm';
import RuleSearch from './components/RuleSearch';
import ImportSection from './components/ImportSection';
import RuleGroupList from './components/RuleGroupList';
import NaturalLanguageSummary from './components/NaturalLanguageSummary';
import ExportSection from './components/ExportSection';
import HistoryLog from './components/HistoryLog';
import DeploySection from './components/DeploySection';
import DirectorySection from './components/DirectorySection';
import { AWSProducts } from './constants/products';
import { isElectronApp } from './utils/env';
import { FaChevronDown, FaChevronUp, FaWindows, FaApple, FaLinux, FaExternalLinkAlt } from 'react-icons/fa';

const ReleaseNotes = ({ body, assets }) => {
  const [expanded, setExpanded] = useState(false);
  if (!body) return null;

  // Simple Markdown-to-React renderer for common release note elements
  const renderInline = (text) => {
    if (!text) return '';
    if (!text.includes('**')) return text;
    const parts = text.split('**');
    return parts.map((part, i) => i % 2 === 1 ? <strong key={i} style={{ color: 'var(--text-main)' }}>{part}</strong> : part);
  };

  const getOSIcon = (text) => {
    const lower = text.toLowerCase();
    if (lower.includes('macos') || lower.includes('apple')) return <FaApple style={{ color: '#fff', fontSize: '0.9rem' }} />;
    if (lower.includes('windows')) return <FaWindows style={{ color: '#00a4ef', fontSize: '0.9rem' }} />;
    if (lower.includes('linux')) return <FaLinux style={{ color: '#fcc624', fontSize: '0.9rem' }} />;
    return null;
  };

  const wrapDownloadLink = (filename) => {
    if (!assets || !Array.isArray(assets)) return filename;
    const asset = assets.find(a => a.name === filename.trim());
    if (asset) {
      return (
        <a
          href={asset.browser_download_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: 'var(--primary)',
            textDecoration: 'none',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
          onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
        >
          {filename} <FaExternalLinkAlt size={8} />
        </a>
      );
    }
    return filename;
  };

  const formatBody = (text) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      const trimmed = line.trim();

      // Headers
      if (trimmed.startsWith('### ')) return <h4 key={i} style={{ margin: '14px 0 6px 0', fontSize: '0.85rem', color: 'var(--primary)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '2px' }}>{renderInline(trimmed.substring(4))}</h4>;
      if (trimmed.startsWith('## ')) return <h3 key={i} style={{ margin: '16px 0 8px 0', fontSize: '0.95rem', color: 'var(--primary)' }}>{renderInline(trimmed.substring(3))}</h3>;

      // Tables
      if (trimmed.includes('|') && /^[\s\-|]+$/.test(trimmed)) return null;
      if (trimmed.includes('|')) {
        const cells = trimmed.split('|').map(c => c.trim()).filter(c => c !== '');
        if (cells.length > 1) {
          const isHeader = i === 0 || (lines[i - 1] && /^[\s\-|]+$/.test(lines[i - 1].trim())) || (lines[i + 1] && /^[\s\-|]+$/.test(lines[i + 1].trim()));

          return (
            <div key={i} style={{
              display: 'grid',
              gridTemplateColumns: cells.length === 3 ? '1.2fr 1.5fr 3fr' : `repeat(${cells.length}, 1fr)`,
              gap: '8px',
              padding: '6px 8px',
              fontSize: '0.75rem',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              background: isHeader ? 'rgba(255,255,255,0.1)' : 'transparent',
              fontWeight: isHeader ? '700' : '400',
              borderRadius: isHeader ? '4px' : '0',
              alignItems: 'center'
            }}>
              {cells.map((cell, ci) => {
                const icon = ci === 0 ? getOSIcon(cell) : null;
                const content = ci === 2 ? wrapDownloadLink(cell) : renderInline(cell);
                return (
                  <span key={ci} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {icon} {content}
                  </span>
                );
              })}
            </div>
          );
        }
      }

      // Bullets
      const bulletMatch = trimmed.match(/^[*•-]\s*(.*)/);
      if (bulletMatch) {
        const content = bulletMatch[1];
        return (
          <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '4px', paddingLeft: '4px', alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--primary)', flexShrink: 0 }}>•</span>
            <span style={{ flex: 1 }}>{renderInline(content)}</span>
          </div>
        );
      }

      // Default text
      return trimmed ? <div key={i} style={{ marginBottom: '6px' }}>{renderInline(trimmed)}</div> : <div key={i} style={{ height: '6px' }} />;
    });
  };

  return (
    <div style={{ marginTop: '4px' }}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setExpanded(!expanded);
        }}
        style={{
          background: 'none',
          border: 'none',
          color: 'inherit',
          fontSize: '0.7rem',
          padding: '2px 0',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          opacity: 0.8,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}
      >
        {expanded ? <FaChevronUp size={8} /> : <FaChevronDown size={8} />}
        {expanded ? "Hide Details" : "What's New?"}
      </button>
      {expanded && (
        <div style={{
          marginTop: '6px',
          padding: '10px',
          background: 'rgba(0,0,0,0.15)',
          borderRadius: '8px',
          fontSize: '0.75rem',
          maxHeight: '180px',
          overflowY: 'auto',
          lineHeight: '1.4',
          color: 'var(--text-main)',
          borderLeft: '2px solid var(--primary)',
          boxShadow: 'inset 0 0 10px rgba(0,0,0,0.1)'
        }}>
          {formatBody(body)}
        </div>
      )}
    </div>
  );
};

function App() {
  const { state, dispatch } = usePriceBook();
  const [activeView, setActiveView] = useState('dashboard');
  const [deployHint, setDeployHint] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const { toasts, showToast, removeToast } = useToast();

  const checkForUpdates = useCallback(async (manual = false) => {
    if (!isElectronApp()) return;

    try {
      const res = await fetch('https://api.github.com/repos/digitalsuni-cloud/cpb-ch/releases/latest');
      const data = await res.json();
      if (!data || !data.tag_name) throw new Error("Invalid response");

      const latestVersion = data.tag_name.replace(/^v/, '');
      const currentVersion = import.meta.env.VITE_APP_VERSION;

      if (latestVersion && currentVersion) {
        const isNewer = latestVersion.localeCompare(currentVersion, undefined, { numeric: true, sensitivity: 'base' }) > 0;
        if (isNewer) {
          showToast({
            type: 'info',
            title: 'Update Available',
            message: (
              <div>
                <div style={{ fontSize: '0.9rem', marginBottom: '4px', color: 'var(--text-main)' }}>
                  A newer version of the standalone app <strong style={{ color: 'var(--primary)', fontWeight: 800, textShadow: '0 0 10px rgba(139, 92, 246, 0.3)' }}>v{latestVersion}</strong> is available!
                </div>
                <ReleaseNotes body={data.body} assets={data.assets} />
              </div>
            ),
            duration: 0, // sticky
            dedupeKey: 'app-update',
            action: {
              label: 'Go to Downloads',
              icon: <span style={{ marginRight: '2px' }}>⬇️</span>,
              onClick: () => window.open(data.html_url, '_blank')
            }
          });
        } else if (manual) {
          showToast({ type: 'success', title: 'Up to Date', message: `You are running the latest version v${currentVersion}.` });
        }
      }
    } catch (e) {
      console.warn('Failed to check for updates:', e);
      if (manual) showToast({ type: 'error', title: 'Update Check Failed', message: 'Could not reach GitHub to check for updates.' });
    }
  }, [showToast, setActiveView]);

  useEffect(() => {
    checkForUpdates(false);
  }, [checkForUpdates]);

  return (
    <>
      <Toast toasts={toasts} removeToast={removeToast} />
      <DashboardLayout
        activeView={activeView}
        setActiveView={setActiveView}
        showHelp={showHelp}
        setShowHelp={setShowHelp}
        onCheckUpdates={() => checkForUpdates(true)}
      >
        <HelpSection isOpen={showHelp} onClose={() => setShowHelp(false)} />

        {/* Hidden Datalist for autocomplete */}
        <datalist id="productList">
          {AWSProducts.map(p => <option key={p} value={p} />)}
        </datalist>

        {/* VIEW: DASHBOARD */}
        {activeView === 'dashboard' && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'clamp(12px, 2vh, 20px)',
            height: 'calc(100vh - 75px - clamp(32px, 6vh, 64px))',
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '2px',
            margin: '-2px'
          }}>
            {/* Stats Cards Row */}
            <div style={{ flex: '0 0 auto', width: '100%', paddingBottom: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'clamp(12px, 1.5vw, 20px)', width: '100%' }}>
                <div className="card" style={{ padding: 'clamp(12px, 2vw, 20px) clamp(16px, 2vw, 24px)' }}>
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Rule Groups</h3>
                  <div style={{ fontSize: 'clamp(2rem, 4vw, 2.5rem)', fontWeight: 800, color: 'var(--primary)' }}>
                    {state.priceBook.ruleGroups.filter(g => g.startDate).length}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginTop: '16px', fontSize: '0.85rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', color: 'var(--text-muted)' }}>
                      <span style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--success)' }}>
                        {state.priceBook.ruleGroups.filter(g => {
                          if (!g.startDate) return false;
                          if (g.enabled === 'false') return false;
                          if (!g.endDate) return true;
                          const end = new Date(g.endDate);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          end.setHours(0, 0, 0, 0);
                          return end >= today;
                        }).length}
                      </span>
                      <span>Active</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', color: 'var(--text-muted)' }}>
                      <span style={{ fontWeight: 700, fontSize: '1.2rem', color: '#eab308' }}>
                        {state.priceBook.ruleGroups.filter(g => {
                          if (!g.endDate) return false;
                          const end = new Date(g.endDate);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          end.setHours(0, 0, 0, 0);
                          if (end >= today) return false; // Not ended yet
                          const monthsDiff = (today.getFullYear() - end.getFullYear()) * 12 + (today.getMonth() - end.getMonth());
                          return monthsDiff < 13; // Ended but less than 13 months ago
                        }).length}
                      </span>
                      <span>Inactive</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', color: 'var(--text-muted)' }}>
                      <span style={{ fontWeight: 700, fontSize: '1.2rem', color: '#f59e0b' }}>
                        {state.priceBook.ruleGroups.filter(g => {
                          if (!g.endDate) return false;
                          const end = new Date(g.endDate);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          end.setHours(0, 0, 0, 0);
                          if (end >= today) return false; // Not ended yet
                          const monthsDiff = (today.getFullYear() - end.getFullYear()) * 12 + (today.getMonth() - end.getMonth());
                          return monthsDiff >= 13;
                        }).length}
                      </span>
                      <span>Expired</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', color: 'var(--text-muted)' }}>
                      <span style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--danger)' }}>
                        {state.priceBook.ruleGroups.filter(g => g.enabled === 'false').length}
                      </span>
                      <span>Disabled</span>
                    </div>
                  </div>
                </div>
                <div className="card" style={{ padding: 'clamp(12px, 2vw, 20px) clamp(16px, 2vw, 24px)' }}>
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Rules</h3>
                  <div style={{ fontSize: 'clamp(2rem, 4vw, 2.5rem)', fontWeight: 800, color: 'var(--secondary)' }}>
                    {state.priceBook.ruleGroups.filter(g => g.enabled !== 'false').reduce((acc, g) => acc + g.rules.filter(r => r.adjustment).length, 0)}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginTop: '16px', fontSize: '0.85rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', color: 'var(--text-muted)' }}>
                      <span style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--success)' }}>
                        {state.priceBook.ruleGroups.filter(g => g.enabled !== 'false')
                          .reduce((acc, g) => acc + g.rules.filter(r => r.type === 'percentDiscount' && r.adjustment).length, 0)}
                      </span>
                      <span>Discounts</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', color: 'var(--text-muted)' }}>
                      <span style={{ fontWeight: 700, fontSize: '1.2rem', color: '#ec4899' }}>
                        {state.priceBook.ruleGroups.filter(g => g.enabled !== 'false')
                          .reduce((acc, g) => acc + g.rules.filter(r => r.type === 'percentIncrease' && r.adjustment).length, 0)}
                      </span>
                      <span>Markups</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', color: 'var(--text-muted)' }}>
                      <span style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--primary)' }}>
                        {state.priceBook.ruleGroups.filter(g => g.enabled !== 'false')
                          .reduce((acc, g) => acc + g.rules.filter(r => r.type === 'fixedRate' && r.adjustment).length, 0)}
                      </span>
                      <span>Fixed</span>
                    </div>
                  </div>
                </div>
                <div className="card" style={{ padding: 'clamp(12px, 2vw, 20px) clamp(16px, 2vw, 24px)' }}>
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Last Updated</h3>
                  {(() => {
                    const hasData = state.priceBook.ruleGroups.some(g => g.startDate || g.rules.some(r => r.name || r.adjustment));
                    if (!hasData) {
                      return <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-secondary)' }}>Pricebook Empty</div>;
                    }
                    const dateText = !state.priceBook.lastUpdated ? 'Not Set' : new Date(state.priceBook.lastUpdated).toLocaleDateString();
                    return <div style={{ fontSize: 'clamp(1.6rem, 3.2vw, 2.2rem)', fontWeight: 800, color: 'var(--text-secondary)' }}>{dateText}</div>;
                  })()}
                </div>
              </div>
            </div>

            <div className="card" style={{ flex: '0 0 auto', padding: '24px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>📝</span> Price Book Metadata
              </h3>
              <PriceBookForm />
            </div>

            <div style={{ flex: '1 1 auto', minHeight: '350px', display: 'flex', flexDirection: 'column' }}>
              <ImportSection />
            </div>

            <div style={{
              flex: '0 0 auto',
              marginTop: 'auto',
              paddingTop: '16px',
              borderTop: '1px solid var(--border)',
              background: 'var(--bg-deep)',
              paddingBottom: '0'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', margin: '0 0 4px 0' }}>Reset Price Book</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                    Permanently delete all rules and configurations to start fresh.
                  </p>
                </div>
                <button
                  onClick={() => {
                    const hasData = state.priceBook.ruleGroups.some(g => g.startDate || g.rules.some(r => r.name || r.adjustment));
                    if (!hasData || confirm("⚠️ This will permanently delete all your rules and configurations. Are you absolutely sure?"))
                      dispatch({ type: 'RESET_ALL' });
                  }}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--danger)',
                    color: 'var(--danger)',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  Start Over
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: BUILDER */}
        {activeView === 'builder' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <RuleSearch />
            </div>

            <RuleGroupList />

            {state.priceBook.ruleGroups.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '60px',
                border: '2px dashed var(--border)',
                borderRadius: '16px',
                background: 'rgba(0,0,0,0.02)'
              }}>
                <h3 style={{ color: 'var(--text-muted)' }}>No rules yet?</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Click the button above to start building your price book logic.</p>
              </div>
            )}
          </div>
        )}

        {/* VIEW: PREVIEW */}
        {activeView === 'preview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <NaturalLanguageSummary />
          </div>
        )}


        {/* VIEW: DEPLOY */}
        {activeView === 'deploy' && isElectronApp() && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'clamp(12px, 2vh, 20px)',
            height: 'calc(100vh - 75px - clamp(32px, 6vh, 64px))',
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '2px',
            margin: '-2px'
          }}>
            <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column' }}>
              <DeploySection autoAssign={deployHint} onAutoAssignConsumed={() => setDeployHint(false)} showToast={showToast} />
            </div>
          </div>
        )}

        {/* VIEW: DIRECTORY — kept mounted to preserve loaded data across navigation */}
        {isElectronApp() && (
          <div style={{
            display: activeView === 'directory' ? 'flex' : 'none',
            flexDirection: 'column',
            height: 'calc(100vh - 75px - clamp(32px, 6vh, 64px))',
            overflow: 'hidden',
            padding: '2px',
            margin: '-2px'
          }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <DirectorySection setActiveView={setActiveView} setDeployHint={setDeployHint} showToast={showToast} activeView={activeView} />
            </div>
          </div>
        )}

        {/* VIEW: HISTORY */}
        {activeView === 'history' && isElectronApp() && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 75px - clamp(32px, 6vh, 64px))',
            overflow: 'hidden',
            padding: '2px',
            margin: '-2px'
          }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <HistoryLog />
            </div>
          </div>
        )}

        {/* VIEW: EXPORT */}
        {activeView === 'export' && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'clamp(12px, 2vh, 20px)',
            height: 'calc(100vh - 75px - clamp(32px, 6vh, 64px))',
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '2px',
            margin: '-2px'
          }}>
            <div style={{ flex: '1 1 auto', minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
              <ExportSection />
            </div>

            <div style={{
              flex: '0 0 auto',
              marginTop: 'auto',
              marginBottom: '12px',
              paddingTop: '20px',
              borderTop: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', margin: '0 0 4px 0' }}>Reset Price Book</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                    Permanently delete all rules and configurations to start fresh.
                  </p>
                </div>
                <button
                  onClick={() => {
                    const hasData = state.priceBook.ruleGroups.some(g => g.startDate || g.rules.some(r => r.name || r.adjustment));
                    if (!hasData || confirm("⚠️ This will permanently delete all your rules and configurations. Are you absolutely sure?"))
                      dispatch({ type: 'RESET_ALL' });
                  }}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--danger)',
                    color: 'var(--danger)',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  Start Over
                </button>
              </div>
            </div>
          </div >
        )
        }

      </DashboardLayout >
    </>
  );
}

export default App;
