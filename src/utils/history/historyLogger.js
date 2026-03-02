import { v4 as uuidv4 } from 'uuid';

// Key for local storage
const HISTORY_STORAGE_KEY = 'cpb_history_log';
const MAX_HISTORY_ITEMS = 200; // Keep the last 200 actions

/**
 * Structure of a history item:
 * {
 *   id: string (uuid),
 *   timestamp: number (Date.now()),
 *   type: 'PRICEBOOK_UPDATE' | 'PRICEBOOK_DELETE' | 'ASSIGNMENT_UPDATE' | 'ASSIGNMENT_DELETE' | 'CUSTOMER_UNASSIGN',
 *   title: string,
 *   details: {
 *     bookId?: number | string,
 *     bookName?: string,
 *     customerId?: number | string,
 *     customerName?: string,
 *     payerId?: string,
 *     beforeXml?: string,
 *     afterXml?: string,
 *     beforeAssignment?: any,
 *     afterAssignment?: any
 *   },
 *   status: 'SUCCESS' | 'ERROR',
 *   errorMessage?: string
 * }
 */

export const getHistoryOptions = () => {
    try {
        const data = localStorage.getItem(HISTORY_STORAGE_KEY);
        if (!data) return [];
        return JSON.parse(data);
    } catch (e) {
        console.error('Failed to load history:', e);
        return [];
    }
};

export const clearHistory = () => {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
};

export const logHistoryEvent = (event) => {
    try {
        const history = getHistoryOptions();

        const newEvent = {
            id: uuidv4(),
            timestamp: Date.now(),
            ...event
        };

        const updatedHistory = [newEvent, ...history].slice(0, MAX_HISTORY_ITEMS);
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));

        // Dispatch custom event so the UI can update automatically
        window.dispatchEvent(new CustomEvent('historyUpdated', { detail: newEvent }));

        return newEvent;
    } catch (e) {
        console.error('Failed to log history event:', e);
    }
};

// Helper wrappers for specific actions

export const logPricebookCreate = (bookId, bookName, afterXml, isSuccess = true, errorMsg = '') => {
    return logHistoryEvent({
        type: 'PRICEBOOK_CREATE',
        title: `Created Pricebook: ${bookName} (${bookId})`,
        status: isSuccess ? 'SUCCESS' : 'ERROR',
        errorMessage: errorMsg,
        details: { bookId, bookName, beforeXml: null, afterXml }
    });
};

export const logPricebookUpdate = (bookId, bookName, beforeXml, afterXml, isSuccess = true, errorMsg = '') => {
    return logHistoryEvent({
        type: 'PRICEBOOK_UPDATE',
        title: `Updated Pricebook: ${bookName} (${bookId})`,
        status: isSuccess ? 'SUCCESS' : 'ERROR',
        errorMessage: errorMsg,
        details: { bookId, bookName, beforeXml, afterXml }
    });
};

export const logPricebookDelete = (bookId, bookName, deletedXml, isSuccess = true, errorMsg = '') => {
    return logHistoryEvent({
        type: 'PRICEBOOK_DELETE',
        title: `Deleted Pricebook Globally: ${bookName} (${bookId})`,
        status: isSuccess ? 'SUCCESS' : 'ERROR',
        errorMessage: errorMsg,
        details: { bookId, bookName, beforeXml: deletedXml } // No afterXml since it's deleted
    });
};

export const logAssignmentUpdate = (bookId, bookName, customerId, customerName, assignmentId, payerAccountId, beforeAccounts, afterAccounts, isSuccess = true, errorMsg = '') => {
    const isNew = !beforeAccounts || beforeAccounts === 'None' || (!Array.isArray(beforeAccounts) && !beforeAccounts);
    return logHistoryEvent({
        type: isNew ? 'ASSIGNMENT_CREATE' : 'ASSIGNMENT_UPDATE',
        title: isNew ? `Assignment created for ${customerName} (${customerId})` : `Assignment updated for ${customerName} (${customerId})`,
        status: isSuccess ? 'SUCCESS' : 'ERROR',
        errorMessage: errorMsg,
        details: {
            bookId, bookName, customerId, customerName,
            assignmentId, payerAccountId,
            beforeAssignment: beforeAccounts,
            afterAssignment: afterAccounts
        }
    });
};

export const logAssignmentDelete = (bookId, bookName, customerId, customerName, assignmentId, payerAccountId, isSuccess = true, errorMsg = '') => {
    return logHistoryEvent({
        type: 'ASSIGNMENT_DELETE',
        title: `Assignment removed for ${customerName} (${customerId})`,
        status: isSuccess ? 'SUCCESS' : 'ERROR',
        errorMessage: errorMsg,
        details: { bookId, bookName, customerId, customerName, assignmentId, payerAccountId }
    });
};

export const logCustomerUnassign = (bookId, bookName, customerId, customerName, assignmentId, payerAccountId, isSuccess = true, errorMsg = '') => {
    return logHistoryEvent({
        type: 'CUSTOMER_UNASSIGN',
        title: `Unassigned Pricebook from Customer: ${customerName}`,
        status: isSuccess ? 'SUCCESS' : 'ERROR',
        errorMessage: errorMsg,
        details: { bookId, bookName, customerId, customerName, assignmentId, payerAccountId }
    });
};
