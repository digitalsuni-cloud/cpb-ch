import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaSyncAlt, FaExchangeAlt, FaAlignLeft, FaCode } from 'react-icons/fa';
import { fetchAllPriceBooks, getPriceBookSpecification, ApiAuthError } from '../utils/chApi';
import { parseXMLToState } from '../utils/converter';
import NaturalLanguageSummary from './NaturalLanguageSummary';
import { DiffViewer } from './HistoryLog';
import { getCredential } from "../utils/credentials";

const CompareSection = ({ showToast }) => {
    const [books, setBooks] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isComparing, setIsComparing] = useState(false);
    const [error, setError] = useState(null);

    const [bookAId, setBookAId] = useState('');
    const [bookBId, setBookBId] = useState('');

    const [bookAData, setBookAData] = useState(null);
    const [bookBData, setBookBData] = useState(null);

    const [viewMode, setViewMode] = useState('xml'); // 'xml' | 'nl'
    const [showDiff, setShowDiff] = useState(false);

    const loadBooks = async () => {
        const apiKey = getCredential('ch_api_key');
        const proxyUrl = getCredential('ch_proxy_url') || '';
        if (!apiKey) {
            setError('Please configure your API Key in Settings first.');
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const data = await fetchAllPriceBooks(apiKey, proxyUrl, true);
            const sorted = (data || []).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            setBooks(sorted);
        } catch (err) {
            if (err instanceof ApiAuthError) {
                showToast && showToast({ type: 'error', title: 'API Key Error', message: err.message, duration: 10000 });
            } else {
                setError(err.message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadBooks();
    }, []);

    const handleCompare = async () => {
        if (!bookAId || !bookBId) {
            showToast && showToast({ type: 'error', title: 'Selection Missing', message: 'Please select two pricebooks to compare.' });
            return;
        }

        if (bookAId === bookBId) {
            showToast && showToast({ type: 'warning', title: 'Same Pricebook', message: 'You selected the same pricebook for both sides.' });
        }

        const apiKey = getCredential('ch_api_key');
        const proxyUrl = getCredential('ch_proxy_url') || '';

        setIsComparing(true);
        setError(null);
        setShowDiff(false);

        try {
            const [xmlA, xmlB] = await Promise.all([
                getPriceBookSpecification(bookAId, apiKey, proxyUrl),
                getPriceBookSpecification(bookBId, apiKey, proxyUrl)
            ]);

            const nameA = books.find(b => b.id.toString() === bookAId.toString())?.name || bookAId;
            const nameB = books.find(b => b.id.toString() === bookBId.toString())?.name || bookBId;

            const stateA = parseXMLToState(xmlA, { book_name: nameA, cxAPIId: bookAId });
            const stateB = parseXMLToState(xmlB, { book_name: nameB, cxAPIId: bookBId });

            setBookAData({ xml: xmlA, state: stateA.priceBook, name: nameA });
            setBookBData({ xml: xmlB, state: stateB.priceBook, name: nameB });
            setShowDiff(true);

        } catch (err) {
            if (err instanceof ApiAuthError) {
                showToast && showToast({ type: 'error', title: 'API Key Error', message: err.message, duration: 10000 });
            } else {
                setError(`Failed to fetch specs: ${err.message}`);
            }
        } finally {
            setIsComparing(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '24px', padding: '0 16px' }}>
            {/* Header & Controls */}
            <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ margin: '0 0 8px 0', color: 'var(--text-main)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <FaExchangeAlt /> Pricebook Compare
                        </h2>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            Compare any two live CloudHealth pricebooks side-by-side.
                        </p>
                    </div>
                    <button onClick={loadBooks} disabled={isLoading} style={{ background: 'var(--bg-deep)', border: '1px solid var(--border)', color: 'var(--text-main)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                        <FaSyncAlt className={isLoading ? 'spin' : ''} /> Refresh List
                    </button>
                </div>

                {error && (
                    <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '8px', border: '1px solid var(--danger)', fontSize: '0.9rem' }}>
                        {error}
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)', gap: '24px', alignItems: 'end' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }}></span> Book A
                        </label>
                        <select 
                            value={bookAId} 
                            onChange={e => setBookAId(e.target.value)}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-deep)', border: '1px solid var(--border)', color: 'var(--text-main)', outline: 'none', fontSize: '0.95rem' }}
                        >
                            <option value="">-- Select Pricebook A --</option>
                            {books.map(b => (
                                <option key={b.id} value={b.id}>{b.name} (ID: {b.id})</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: '10px' }}>
                        <button 
                            onClick={handleCompare}
                            disabled={isComparing || !bookAId || !bookBId}
                            style={{ 
                                background: 'var(--primary)', 
                                border: 'none', 
                                color: '#fff', 
                                width: '44px',
                                height: '44px',
                                borderRadius: '50%', 
                                cursor: (isComparing || !bookAId || !bookBId) ? 'not-allowed' : 'pointer', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                fontWeight: 600,
                                opacity: (!bookAId || !bookBId) ? 0.5 : 1,
                                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                            }}
                        >
                            <FaExchangeAlt size={16} className={isComparing ? 'spin' : ''} />
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }}></span> Book B
                        </label>
                        <select 
                            value={bookBId} 
                            onChange={e => setBookBId(e.target.value)}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-deep)', border: '1px solid var(--border)', color: 'var(--text-main)', outline: 'none', fontSize: '0.95rem' }}
                        >
                            <option value="">-- Select Pricebook B --</option>
                            {books.map(b => (
                                <option key={b.id} value={b.id}>{b.name} (ID: {b.id})</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* View Mode Toggle */}
            {showDiff && (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <div style={{ display: 'inline-flex', background: 'var(--bg-deep)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border)', gap: '4px' }}>
                        <button
                            onClick={() => setViewMode('xml')}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s', border: 'none',
                                background: viewMode === 'xml' ? 'var(--bg-card)' : 'transparent',
                                color: viewMode === 'xml' ? 'var(--primary)' : 'var(--text-muted)',
                                boxShadow: viewMode === 'xml' ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'
                            }}
                        >
                            <FaCode /> Raw XML Diff
                        </button>
                        <button
                            onClick={() => setViewMode('nl')}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s', border: 'none',
                                background: viewMode === 'nl' ? 'var(--bg-card)' : 'transparent',
                                color: viewMode === 'nl' ? 'var(--primary)' : 'var(--text-muted)',
                                boxShadow: viewMode === 'nl' ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'
                            }}
                        >
                            <FaAlignLeft /> Natural Language Compare
                        </button>
                    </div>
                </div>
            )}

            {/* Content Area */}
            {showDiff && (
                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    {viewMode === 'xml' ? (
                        <div style={{ position: 'relative', flex: 1, background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                            <DiffViewer 
                                before={bookAData.xml} 
                                after={bookBData.xml} 
                                title="XML Comparison" 
                                onClose={() => setShowDiff(false)} 
                                sideTitleLeft={bookAData.name}
                                sideTitleRight={bookBData.name}
                            />
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', flex: 1, overflow: 'auto' }}>
                            <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', borderTop: '4px solid #ef4444', overflow: 'auto', padding: '20px' }}>
                                <h3 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', color: 'var(--text-main)', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                                    {bookAData.name}
                                </h3>
                                <div style={{ pointerEvents: 'none' }}>
                                    <NaturalLanguageSummary customBook={bookAData.state} />
                                </div>
                            </div>
                            <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', borderTop: '4px solid #10b981', overflow: 'auto', padding: '20px' }}>
                                <h3 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', color: 'var(--text-main)', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                                    {bookBData.name}
                                </h3>
                                <div style={{ pointerEvents: 'none' }}>
                                    <NaturalLanguageSummary customBook={bookBData.state} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CompareSection;
