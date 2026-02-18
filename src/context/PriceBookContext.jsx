import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

const PriceBookContext = createContext();

export const createProduct = (defaults = {}) => ({
    id: uuidv4(),
    productName: '',
    includeDataTransfer: defaults.includeDataTransfer || 'inherit',
    includeRIPurchases: defaults.includeRIPurchases || 'inherit',
    properties: {}
});

// Helper to create a new billing rule
const createBillingRule = () => ({
    id: uuidv4(),
    name: '',
    adjustment: '',
    type: 'percentDiscount',
    includeDataTransfer: 'true',
    includeRIPurchases: 'true',
    products: [createProduct()],
    collapsed: false
});

// Helper to create a new rule group
const createRuleGroup = () => ({
    id: uuidv4(),
    startDate: '',
    endDate: '',
    payerAccounts: '',
    enabled: 'true',
    rules: [createBillingRule()], // Initialize with 1 empty rule
    collapsed: false
});

const initialPriceBook = {
    bookName: '',
    createdBy: '',
    lastUpdated: '',
    comment: '',
    cxAPIId: '',
    cxPayerId: '',
    ruleGroups: [createRuleGroup()]
};

const initialState = {
    priceBook: initialPriceBook,
    theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
};

function priceBookReducer(state, action) {
    switch (action.type) {
        case 'SET_THEME':
            return { ...state, theme: action.payload };
        case 'TOGGLE_THEME':
            return { ...state, theme: state.theme === 'dark' ? 'light' : 'dark' };
        case 'UPDATE_BOOK_FIELD':
            return {
                ...state,
                priceBook: {
                    ...state.priceBook,
                    [action.field]: action.value,
                    lastUpdated: new Date().toISOString().split('T')[0]
                }
            };
        case 'RESET_ALL':
            return {
                ...state,
                priceBook: { ...initialPriceBook, ruleGroups: [createRuleGroup()] }
            };
        case 'IMPORT_DATA':
            return {
                ...state,
                priceBook: action.payload
            };
        // Rule Group Actions
        case 'ADD_RULE_GROUP':
            if (action.afterId) {
                const index = state.priceBook.ruleGroups.findIndex(g => g.id === action.afterId);
                const newGroups = [...state.priceBook.ruleGroups];
                newGroups.splice(index + 1, 0, createRuleGroup());
                return {
                    ...state,
                    priceBook: { ...state.priceBook, ruleGroups: newGroups, lastUpdated: new Date().toISOString().split('T')[0] }
                };
            }
            if (action.prepend) {
                return {
                    ...state,
                    priceBook: {
                        ...state.priceBook,
                        ruleGroups: [createRuleGroup(), ...state.priceBook.ruleGroups],
                        lastUpdated: new Date().toISOString().split('T')[0]
                    }
                };
            }
            return {
                ...state,
                priceBook: {
                    ...state.priceBook,
                    ruleGroups: [createRuleGroup(), ...state.priceBook.ruleGroups], // Default behavior was already prepend? check original code
                    lastUpdated: new Date().toISOString().split('T')[0]
                }
            };
        case 'REMOVE_RULE_GROUP':
            return {
                ...state,
                priceBook: {
                    ...state.priceBook,
                    ruleGroups: state.priceBook.ruleGroups.filter(g => g.id !== action.id),
                    lastUpdated: new Date().toISOString().split('T')[0]
                }
            };
        case 'UPDATE_RULE_GROUP':
            return {
                ...state,
                priceBook: {
                    ...state.priceBook,
                    ruleGroups: state.priceBook.ruleGroups.map(g =>
                        g.id === (action.groupId || action.id) ? { ...g, ...action.updates } : g
                    ),
                    lastUpdated: new Date().toISOString().split('T')[0]
                }
            };
        case 'REORDER_RULE_GROUPS':
            {
                const { activeId, overId } = action;
                const oldIndex = state.priceBook.ruleGroups.findIndex(g => g.id === activeId);
                const newIndex = state.priceBook.ruleGroups.findIndex(g => g.id === overId);
                const newGroups = [...state.priceBook.ruleGroups];
                const [movedGroup] = newGroups.splice(oldIndex, 1);
                newGroups.splice(newIndex, 0, movedGroup);
                return {
                    ...state,
                    priceBook: { ...state.priceBook, ruleGroups: newGroups }
                };
            }

        // Billing Rule Actions
        case 'ADD_BILLING_RULE':
            return {
                ...state,
                priceBook: {
                    ...state.priceBook,
                    ruleGroups: state.priceBook.ruleGroups.map(g => {
                        if (g.id === action.groupId) {
                            if (action.afterId) {
                                const index = g.rules.findIndex(r => r.id === action.afterId);
                                const newRules = [...g.rules];
                                newRules.splice(index + 1, 0, createBillingRule());
                                return { ...g, rules: newRules };
                            }
                            if (action.prepend) {
                                return { ...g, rules: [createBillingRule(), ...g.rules] };
                            }
                            return { ...g, rules: [...g.rules, createBillingRule()] };
                        }
                        return g;
                    }),
                    lastUpdated: new Date().toISOString().split('T')[0]
                }
            };
        case 'REMOVE_BILLING_RULE':
            return {
                ...state,
                priceBook: {
                    ...state.priceBook,
                    ruleGroups: state.priceBook.ruleGroups.map(g => {
                        if (g.id === action.groupId) {
                            return { ...g, rules: g.rules.filter(r => r.id !== action.ruleId) };
                        }
                        return g;
                    }),
                    lastUpdated: new Date().toISOString().split('T')[0]
                }
            };
        case 'UPDATE_BILLING_RULE':
            return {
                ...state,
                priceBook: {
                    ...state.priceBook,
                    ruleGroups: state.priceBook.ruleGroups.map(g => {
                        if (g.id === action.groupId) {
                            return {
                                ...g,
                                rules: g.rules.map(r =>
                                    r.id === action.ruleId ? { ...r, ...action.updates } : r
                                )
                            };
                        }
                        return g;
                    }),
                    lastUpdated: new Date().toISOString().split('T')[0]
                }
            };
        case 'REORDER_BILLING_RULES':
            {
                const { groupId, activeId, overId } = action;
                return {
                    ...state,
                    priceBook: {
                        ...state.priceBook,
                        ruleGroups: state.priceBook.ruleGroups.map(g => {
                            if (g.id === groupId) {
                                const oldIndex = g.rules.findIndex(r => r.id === activeId);
                                const newIndex = g.rules.findIndex(r => r.id === overId);
                                const newRules = [...g.rules];
                                const [movedRule] = newRules.splice(oldIndex, 1);
                                newRules.splice(newIndex, 0, movedRule);
                                return { ...g, rules: newRules };
                            }
                            return g;
                        })
                    }
                };
            }

        // Product Actions
        case 'ADD_PRODUCT':
            return {
                ...state,
                priceBook: {
                    ...state.priceBook,
                    ruleGroups: state.priceBook.ruleGroups.map(g => {
                        if (g.id === action.groupId) {
                            return {
                                ...g,
                                rules: g.rules.map(r => {
                                    if (r.id === action.ruleId) {
                                        const newProduct = createProduct({
                                            includeDataTransfer: r.includeDataTransfer,
                                            includeRIPurchases: r.includeRIPurchases
                                        });

                                        if (action.afterId) {
                                            const index = (r.products || []).findIndex(p => p.id === action.afterId);
                                            const newProducts = [...(r.products || [])];
                                            newProducts.splice(index + 1, 0, newProduct);
                                            return { ...r, products: newProducts };
                                        }
                                        if (action.prepend) {
                                            return { ...r, products: [newProduct, ...(r.products || [])] };
                                        }
                                        return {
                                            ...r, products: [...(r.products || []), newProduct]
                                        };
                                    }
                                    return r;
                                })
                            };
                        }
                        return g;
                    })
                }
            };
        case 'REMOVE_PRODUCT':
            return {
                ...state,
                priceBook: {
                    ...state.priceBook,
                    ruleGroups: state.priceBook.ruleGroups.map(g => {
                        if (g.id === action.groupId) {
                            return {
                                ...g,
                                rules: g.rules.map(r => {
                                    if (r.id === action.ruleId) {
                                        return { ...r, products: (r.products || []).filter(p => p.id !== action.productId) };
                                    }
                                    return r;
                                })
                            };
                        }
                        return g;
                    })
                }
            };
        case 'UPDATE_PRODUCT':
            return {
                ...state,
                priceBook: {
                    ...state.priceBook,
                    ruleGroups: state.priceBook.ruleGroups.map(g => {
                        if (g.id === action.groupId) {
                            return {
                                ...g,
                                rules: g.rules.map(r => {
                                    if (r.id === action.ruleId) {
                                        return {
                                            ...r,
                                            products: (r.products || []).map(p =>
                                                p.id === action.productId ? { ...p, ...action.updates } : p
                                            )
                                        };
                                    }
                                    return r;
                                })
                            };
                        }
                        return g;
                    })
                }
            };

        default:
            return state;
    }
}

const STORAGE_KEY = 'cpb_app_state';

const init = (defaultState) => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (error) {
        console.error('Failed to load state from localStorage:', error);
    }
    return defaultState;
};

export const PriceBookProvider = ({ children }) => {
    const [state, dispatch] = useReducer(priceBookReducer, initialState, init);

    // Persist state changes to localStorage
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }, [state]);
    const initialized = React.useRef(false);

    // Initial load: 1 rule group
    useEffect(() => {
        if (!initialized.current && state.priceBook.ruleGroups.length === 0) {
            dispatch({ type: 'ADD_RULE_GROUP' });
            initialized.current = true;
        }
    }, [state.priceBook.ruleGroups.length]);

    // Theme effect
    useEffect(() => {
        document.body.setAttribute('data-theme', state.theme);
    }, [state.theme]);

    return (
        <PriceBookContext.Provider value={{ state, dispatch }}>
            {children}
        </PriceBookContext.Provider>
    );
};

export const usePriceBook = () => useContext(PriceBookContext);
export { createRuleGroup, createBillingRule };
