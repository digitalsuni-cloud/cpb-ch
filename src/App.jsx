import React, { useState } from 'react';
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
import DeploySection from './components/DeploySection';
import DirectorySection from './components/DirectorySection';
import { AWSProducts } from './constants/products';
import { isElectronApp } from './utils/env';

function App() {
  const { state, dispatch } = usePriceBook();
  const [activeView, setActiveView] = useState('dashboard');
  const [deployHint, setDeployHint] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const { toasts, showToast, removeToast } = useToast();

  return (
    <>
      <Toast toasts={toasts} removeToast={removeToast} />
      <DashboardLayout
        activeView={activeView}
        setActiveView={setActiveView}
        showHelp={showHelp}
        setShowHelp={setShowHelp}
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
            <div style={{ flex: '0 0 auto', width: '100%', overflowX: 'auto', paddingBottom: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'clamp(12px, 2vw, 20px)', minWidth: '850px' }}>
                <div className="card" style={{ padding: 'clamp(12px, 2vw, 20px) clamp(16px, 2vw, 24px)' }}>
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Rule Groups</h3>
                  <div style={{ fontSize: 'clamp(2rem, 4vw, 2.5rem)', fontWeight: 800, color: 'var(--primary)' }}>
                    {state.priceBook.ruleGroups.filter(g => g.startDate).length}
                  </div>
                  <div style={{ display: 'flex', gap: '24px', marginTop: '16px', fontSize: '0.85rem' }}>
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
                  <div style={{ display: 'flex', gap: '24px', marginTop: '16px', fontSize: '0.85rem' }}>
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
                    return <div style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', fontWeight: 800, color: 'var(--text-secondary)' }}>{dateText}</div>;
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
            gap: 'clamp(12px, 2vh, 20px)',
            height: 'calc(100vh - 75px - clamp(32px, 6vh, 64px))',
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '2px',
            margin: '-2px'
          }}>
            <div className="card" style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column' }}>
              <DirectorySection setActiveView={setActiveView} setDeployHint={setDeployHint} showToast={showToast} />
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
