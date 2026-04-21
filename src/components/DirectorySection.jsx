import React, { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSyncAlt, FaTrash, FaCheckCircle, FaTimesCircle, FaEdit, FaEye, FaTimes, FaBookOpen, FaPen, FaUserEdit, FaCheckSquare, FaRegSquare, FaChevronLeft, FaChevronRight, FaAlignLeft, FaExpand, FaCompress, FaDownload, FaCopy, FaCheck, FaSearch, FaPlay } from 'react-icons/fa';
import Tooltip from './Tooltip';
import { getAssignedPriceBooks, deletePriceBook, deletePriceBookAssignment, deleteBaseAssignment, getPriceBookSpecification, ApiAuthError, performDryRun, fetchAwsAccountAssignments, assignPriceBook, getCachedCustomers, fetchAllCustomers } from '../utils/chApi';
import { usePriceBook } from '../context/PriceBookContext';
import { parseXMLToState, generateXML } from '../utils/converter';
import ToggleSwitch from './ToggleSwitch';
import { logCustomerUnassign, logPricebookDelete, logAssignmentDelete, logDryRun, logAssignmentUpdate } from '../utils/history/historyLogger';
import { useConfirm } from '../context/ConfirmContext';
import { getCredential } from "../utils/credentials";

let specCache = new Map(); // bookId → xml string

const DirectorySection = ({ setActiveView, setDeployHint, showToast, activeView }) => {
    const { dispatch, state } = usePriceBook();
    const confirm = useConfirm();
    const [apiData, setApiData] = useState(state.directoryCache || { customers: [], books: [], assignments: [] });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showUnassigned, setShowUnassigned] = useState(false);

    // Filter states
    const [filterCustomer, setFilterCustomer] = useState('');
    const [filterBook, setFilterBook] = useState('');
    const [filterPayer, setFilterPayer] = useState('');

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    // Modal state for viewing XML
    const [viewingXml, setViewingXml] = useState(null);
    const [viewingXmlTitle, setViewingXmlTitle] = useState('');
    const [viewingXmlBookId, setViewingXmlBookId] = useState(null);
    const [xmlExpanded, setXmlExpanded] = useState(false);
    const [xmlCopied, setXmlCopied] = useState(false);
    const [xmlRefreshing, setXmlRefreshing] = useState(false);
    const [legendOpen, setLegendOpen] = useState(false);
    const [openFilter, setOpenFilter] = useState(null); // 'customer' | 'book' | 'payer'

    // Dry Run state
    const [dryRunData, setDryRunData] = useState(null); // { assignment, month, payerId, payerOptions, isLoadingOptions }
    const [isDryRunExecuting, setIsDryRunExecuting] = useState(false);

    // Quick Assignment Edit state
    const [assignmentEditData, setAssignmentEditData] = useState(null); // { bookId, bookName, customerId, payerId, customerOptions, payerOptions, isLoadingOptions }

    // Overlay state for destructive actions
    const [actionProgress, setActionProgress] = useState({ active: false, title: '', status: '', logs: [], done: false, error: false });

    const loadDirectory = async () => {
        const apiKey = getCredential('ch_api_key');
        const proxyUrl = getCredential('ch_proxy_url') || '';

        if (!apiKey) {
            setError('Please configure your API Key in Settings first.');
            return;
        }

        setIsLoading(true);
        setError(null);
        specCache.clear(); // Invalidate spec cache on directory refresh
        try {
            const data = await getAssignedPriceBooks(apiKey, proxyUrl);

            const customersMap = new Map();
            const booksMap = new Map();

            data.forEach(item => {
                if (!customersMap.has(item.target_client_api_id)) {
                    customersMap.set(item.target_client_api_id, { id: item.target_client_api_id, name: item.customer_name });
                }
                if (!booksMap.has(item.id)) {
                    booksMap.set(item.id, { id: item.id, name: item.book_name });
                }
            });

            const newCacheState = {
                assignments: data,
                customers: Array.from(customersMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
                books: Array.from(booksMap.values()).sort((a, b) => a.name.localeCompare(b.name))
            };

            dispatch({ type: 'SET_DIRECTORY_CACHE', payload: newCacheState });
            setApiData(newCacheState);
        } catch (err) {
            if (err instanceof ApiAuthError) {
                showToast && showToast({ type: 'error', title: 'API Key Error', message: err.message, duration: 10000, dedupeKey: 'api-auth-error' });
            } else {
                setError(err.message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch XML spec — returns from cache if already loaded, fetches otherwise
    const getSpec = async (bookId) => {
        if (specCache.has(bookId)) return specCache.get(bookId);
        const apiKey = getCredential('ch_api_key');
        const proxyUrl = getCredential('ch_proxy_url') || '';
        const xml = await getPriceBookSpecification(bookId, apiKey, proxyUrl);
        specCache.set(bookId, xml);
        return xml;
    };

    useEffect(() => {
        const cacheEmpty = !state.directoryCache || state.directoryCache.assignments.length === 0;
        // Only auto-load if cache is empty AND we are looking at the directory — otherwise stick to cache
        if (activeView === 'directory' && cacheEmpty) {
            loadDirectory();
        } else if (state.directoryCache) {
            setApiData(state.directoryCache);
        }
    }, [activeView, state.directoryCache]);

    const handleUnassign = async (assignmentId, customerName, bookName) => {
        // Strip the trailing " (ID)" portion from the display name for the title
        const cleanName = customerName ? customerName.replace(/\s*\(\d+\)$/, '') : customerName;
        const shortBook = bookName && bookName.length > 25 ? `${bookName.substring(0, 23)}…` : (bookName || 'Pricebook');

        const isConfirmed = await confirm({
            title: 'Unassign Pricebook',
            message: `Are you sure you want to unassign this Pricebook from ${cleanName}?`,
            variant: 'warning',
            confirmLabel: 'Unassign'
        });

        if (!isConfirmed) return;
        const apiKey = getCredential('ch_api_key');
        const proxyUrl = getCredential('ch_proxy_url') || '';
        try {
            setActionProgress({ active: true, title: `Unassigning Pricebook for ${cleanName}`, status: `Removing assignment from ${cleanName}...`, logs: [], done: false, error: false });
            // Delete the BASE assignment (price_book_assignments) — this removes the customer link entirely
            await deleteBaseAssignment(assignmentId, apiKey, proxyUrl);
            setActionProgress(prev => ({ ...prev, status: 'Reloading directory...', logs: [...prev.logs, `✅ Unassigned “${shortBook}” from ${cleanName}`] }));

            // Log History — pass assignmentId and payerAccountId from the assignment record
            const asgn = apiData.assignments.find(a => a.assignment_id === assignmentId);
            logCustomerUnassign(
                asgn?.id || null,
                bookName,
                asgn?.target_client_api_id || null,
                cleanName,
                assignmentId, // Use direct parameter
                asgn?.billing_account_owner_id || null,
                true
            );

            await loadDirectory();
            setActionProgress(prev => ({ ...prev, status: 'Successfully completed.', done: true }));
        } catch (err) {
            const asgn = apiData.assignments.find(a => a.assignment_id === assignmentId);
            logCustomerUnassign(
                asgn?.id || null,
                bookName,
                asgn?.target_client_api_id || null,
                cleanName,
                assignmentId,
                asgn?.billing_account_owner_id || null,
                false,
                err.message
            );
            setActionProgress(prev => ({ ...prev, status: `Failed: ${err.message}`, logs: [...prev.logs, `❌ Error: ${err.message}`], done: true, error: true }));
        }
    };

    const handleDeleteBook = async (bookId, bookName) => {
        const isConfirmed = await confirm({
            title: 'CRITICAL: Delete Pricebook',
            message: `Are you completely sure you want to delete Pricebook "${bookName}" globally? This cannot be undone.`,
            variant: 'danger',
            confirmLabel: 'Delete Globally'
        });

        if (!isConfirmed) return;
        const apiKey = getCredential('ch_api_key');
        const proxyUrl = getCredential('ch_proxy_url') || '';

        // Truncate long pricebook names for the modal title
        const truncatedName = bookName.length > 30 ? `${bookName.substring(0, 28)}…` : bookName;
        const assignmentsToRemove = apiData.assignments.filter(a => a.id === bookId && a.is_assigned);

        try {
            setActionProgress({ active: true, title: `Deleting Pricebook — ${truncatedName}`, status: `Starting deletion...`, logs: [], done: false, error: false });

            for (let i = 0; i < assignmentsToRemove.length; i++) {
                const asgn = assignmentsToRemove[i];
                const cleanCust = asgn.customer_name ? asgn.customer_name.replace(/\s*\(\d+\)$/, '') : asgn.customer_name;

                // Step A: Remove payer account link first if one exists
                if (asgn.account_assignment_id) {
                    setActionProgress(prev => ({ ...prev, status: `Removing payer link for ${cleanCust}...`, logs: [...prev.logs, `Removing payer account link for ${cleanCust}...`] }));
                    await deletePriceBookAssignment(asgn.account_assignment_id, apiKey, proxyUrl);
                    setActionProgress(prev => ({ ...prev, logs: [...prev.logs, `✅ Payer account link removed for ${cleanCust}`] }));
                }

                // Step B: Remove the base customer assignment
                setActionProgress(prev => ({ ...prev, status: `Unassigning from ${cleanCust}...`, logs: [...prev.logs, `Unassigning from customer ${cleanCust}...`] }));
                await deleteBaseAssignment(asgn.assignment_id, apiKey, proxyUrl);
                setActionProgress(prev => ({ ...prev, logs: [...prev.logs, `✅ Unassigned from ${cleanCust}`] }));

                // Log the assignment removal in history
                const cleanCustomerId = asgn.target_client_api_id;
                logAssignmentDelete(
                    bookId, bookName,
                    cleanCustomerId, cleanCust,
                    asgn.assignment_id,
                    asgn.billing_account_owner_id || null,
                    true
                );
            }

            setActionProgress(prev => ({ ...prev, status: `Deleting pricebook from CloudHealth...`, logs: [...prev.logs, `Executing global deletion request...`] }));

            // Capture XML before deletion for history
            let deletedXml = "Failed to fetch XML prior to deletion.";
            try { deletedXml = await getSpec(bookId); } catch (e) { }

            await deletePriceBook(bookId, apiKey, proxyUrl);

            logPricebookDelete(bookId, bookName, deletedXml, true);

            setActionProgress(prev => ({ ...prev, status: `Successfully deleted.`, logs: [...prev.logs, `✅ Permanently deleted ${bookName}`], done: true }));

            const updated = {
                ...apiData,
                assignments: apiData.assignments.filter(a => a.id !== bookId),
                books: apiData.books.filter(b => b.id !== bookId)
            };
            dispatch({ type: 'SET_DIRECTORY_CACHE', payload: updated });
        } catch (err) {
            setActionProgress(prev => ({ ...prev, status: `Failed: ${err.message}`, logs: [...prev.logs, `❌ Fatal Error: ${err.message}`], done: true, error: true }));
        }
    };

    const handleModify = async (bookId, bookName, customerId, payerId) => {
        // Check for existing data in the builder and warn before overwriting
        const hasExistingData = state.priceBook.ruleGroups.some(g => g.startDate || g.rules.some(r => r.name || r.adjustment));

        if (hasExistingData) {
            const isConfirmed = await confirm({
                title: 'Unsaved Changes',
                message: `You have unsaved configuration in the builder.\n\nLoading "${bookName}" will overwrite it. Continue?`,
                variant: 'danger',
                confirmLabel: 'Overwrite'
            });
            if (!isConfirmed) return;
        }

        const apiKey = getCredential('ch_api_key');
        const proxyUrl = getCredential('ch_proxy_url') || '';
        try {
            const xml = await getSpec(bookId);
            const syntheticJsonPayload = {
                book_name: bookName,
                specification: xml,
                cxAPIId: bookId,
                customerApiId: customerId,
                cxPayerId: payerId === 'ALL' ? '' : (payerId === 'N/A' ? '' : payerId)
            };
            const newState = parseXMLToState(xml, syntheticJsonPayload);
            dispatch({ type: 'IMPORT_DATA', payload: newState });
            setActiveView('builder');
        } catch (err) {
            if (err instanceof ApiAuthError) {
                showToast && showToast({ type: 'error', title: 'API Key Error', message: err.message, duration: 10000, dedupeKey: 'api-auth-error' });
            } else {
                console.error(err);
                confirm({ title: 'Error', message: `Failed to fetch and parse pricebook: ${err.message}`, type: 'alert', variant: 'danger' });
            }
        }
    };

    const handleEditAssignment = async (bookId, bookName, customerId, payerId, assignmentId) => {
        // Find existing customer name for prefill logging
        const allCust = getCachedCustomers();
        const customer = allCust.find(c => String(c.id) === String(customerId));
        setAssignmentEditData({
            bookId,
            bookName,
            customerId: customerId || '',
            customerName: customer?.name || '',
            payerId: (payerId === 'ALL' || payerId === 'N/A' || !payerId) ? '' : payerId,
            originalAssignmentId: assignmentId,
            originalCustomerId: customerId,
            originalPayerId: payerId,
            payerOptions: [],
            customerOptions: allCust,
            isLoadingOptions: !!customerId,
            isLoadingCustomers: false
        });

        // If customer exists, pre-fetch their payer account mappings
        if (customerId) {
            const apiKey = getCredential('ch_api_key');
            const proxyUrl = getCredential('ch_proxy_url') || '';
            try {
                const results = await fetchAwsAccountAssignments(customerId, apiKey, proxyUrl);
                const options = [...new Set(results.map(a => a.payer_account_owner_id).filter(Boolean))];
                setAssignmentEditData(prev => prev ? { ...prev, payerOptions: options, isLoadingOptions: false } : null);
            } catch (e) {
                console.error('Failed to fetch payer options for assignment edit', e);
                setAssignmentEditData(prev => prev ? { ...prev, isLoadingOptions: false } : null);
            }
        }
    };

    // Debounced fetch for payer options to avoid spamming 404s on every keystroke
    useEffect(() => {
        if (!assignmentEditData?.customerId) return;
        
        const timer = setTimeout(async () => {
            const val = assignmentEditData.customerId;
            const allCust = getCachedCustomers();
            const exists = allCust.some(c => String(c.id) === String(val));
            
            if (exists) {
                const apiKey = getCredential('ch_api_key');
                const proxyUrl = getCredential('ch_proxy_url') || '';
                try {
                    const res = await fetchAwsAccountAssignments(val, apiKey, proxyUrl);
                    const opts = [...new Set(res.map(a => a.payer_account_owner_id).filter(Boolean))];
                    setAssignmentEditData(prev => (prev && prev.customerId === val) ? { ...prev, payerOptions: opts, isLoadingOptions: false } : prev);
                } catch (err) {
                    setAssignmentEditData(prev => (prev && prev.customerId === val) ? { ...prev, isLoadingOptions: false } : prev);
                }
            } else {
                setAssignmentEditData(prev => ({ ...prev, isLoadingOptions: false, payerOptions: [] }));
            }
        }, 600);

        return () => clearTimeout(timer);
    }, [assignmentEditData?.customerId]);

    const handleAssignmentSubmit = async () => {
        const { bookId, bookName, customerId, payerId, originalAssignmentId, originalCustomerId, originalPayerId, keepExisting } = assignmentEditData;
        
        if (!customerId) {
            confirm({ title: 'Customer Required', message: 'You must select a customer to link this pricebook to.', type: 'alert', variant: 'warning' });
            return;
        }

        const apiKey = getCredential('ch_api_key');
        const proxyUrl = getCredential('ch_proxy_url') || '';
        
        setIsDryRunExecuting(true); // Reusing dry run spinner state for overall UI lock
        setActionProgress({
            active: true,
            title: 'Updating Assignment',
            status: 'Processing...',
            logs: [`Starting clean reconfiguration for "${bookName}"...`],
            done: false,
            error: false
        });

        let disconnected = false;

        // Resolve names BEFORE the try block so they are accessible in the catch block for the restore dialog
        // apiData.customers only contains customers with existing assignments, so new/unassigned customers won't be there.
        // assignmentEditData.customerName holds the ORIGINAL customer's name, not the newly selected one.
        // Use customerOptions (full list) to correctly resolve the currently selected customer.
        const customer = apiData.customers.find(c => String(c.id) === String(customerId));
        const selectedFromOptions = assignmentEditData.customerOptions?.find(c => String(c.id) === String(customerId));
        const customerName = customer?.name || selectedFromOptions?.name || String(customerId);
        const effectivePayer = (!payerId || payerId.trim() === '' || payerId.trim().toUpperCase() === 'ALL') ? 'ALL' : payerId;
        const origCust = apiData.customers.find(c => String(c.id) === String(originalCustomerId));
        const origFromOptions = assignmentEditData.customerOptions?.find(c => String(c.id) === String(originalCustomerId));
        const origCustName = origCust?.name || origFromOptions?.name || 'Previous Customer';

        try {

            // 1. Disconnect existing if it exists AND user did not choose to keep it
            if (originalAssignmentId && !keepExisting) {
                setActionProgress(prev => ({ ...prev, status: 'Disconnecting current assignment...', logs: [...prev.logs, `Deleting assignment ID: ${originalAssignmentId}...`] }));
                try {
                    await deleteBaseAssignment(originalAssignmentId, apiKey, proxyUrl);
                    disconnected = true;
                    setActionProgress(prev => ({ ...prev, logs: [...prev.logs, '✅ Previous assignment disconnected.'] }));
                    // Only log a "Customer Unassign" if the customer is actually changing.
                    // If same customer, different payer — we'll log a single "Assignment Updated" at the end.
                    if (String(customerId) !== String(originalCustomerId)) {
                        logCustomerUnassign(bookId, bookName, originalCustomerId, origCustName, originalAssignmentId, originalPayerId, true);
                    }
                } catch (e) {
                    setActionProgress(prev => ({ ...prev, logs: [...prev.logs, `⚠️ Notice: Could not delete old assignment (may have been moved): ${e.message}`] }));
                    disconnected = true;
                    if (String(customerId) !== String(originalCustomerId)) {
                        logCustomerUnassign(bookId, bookName, originalCustomerId, origCustName, originalAssignmentId, originalPayerId, false, e.message);
                    }
                }
            } else if (keepExisting) {
                setActionProgress(prev => ({ ...prev, logs: [...prev.logs, `ℹ️ Keeping existing assignment for ${origCustName}.`] }));
            }

            // 2. Re-assign
            setActionProgress(prev => ({ ...prev, status: `Linking ${bookName} to ${customerName}...`, logs: [...prev.logs, 'Creating new assignment...'] }));
            
            const response = await assignPriceBook(bookId, customerId, effectivePayer, apiKey, proxyUrl);
            const finalAssignmentId = response.assignmentId || '(new)';

            setActionProgress(prev => ({ ...prev, status: 'Finalizing...', logs: [...prev.logs, `✅ New assignment successful (ID: ${finalAssignmentId})`] }));
            
            // Same customer + new payer → ASSIGNMENT_UPDATE
            // Different customer → ASSIGNMENT_CREATE (customer truly changed)
            const isSameCustomer = String(customerId) === String(originalCustomerId);
            logAssignmentUpdate(bookId, bookName, customerId, customerName, finalAssignmentId, effectivePayer, isSameCustomer ? originalPayerId : null, effectivePayer, true);
            
            setActionProgress(prev => ({
                ...prev,
                title: 'Assignment Updated',
                status: `"${bookName}" has been successfully reconfigured for "${customerName}".`,
                done: true
            }));

            // Refresh directory after small delay to reflect new mapping
            setTimeout(loadDirectory, 1000);
            setAssignmentEditData(null);

        } catch (err) {
            console.error(err);

            // Always log the failed reassignment attempt, regardless of whether the user restores
            const isSameCustomerErr = String(customerId) === String(originalCustomerId);
            logAssignmentUpdate(bookId, bookName, customerId, customerName, null, effectivePayer, isSameCustomerErr ? originalPayerId : null, effectivePayer, false, err.message);

            if (disconnected) {
                const restore = await confirm({
                    title: 'Restoration Required?',
                    message: `The new assignment failed: "${err.message}".\n\nSince the previous assignment was already deleted, would you like to restore the mapping back to "${origCustName}"?`,
                    variant: 'warning',
                    confirmLabel: 'Restore Previous',
                    cancelLabel: 'Leave Unassigned'
                });

                if (restore) {
                    try {
                        const restorePayer = (!originalPayerId || originalPayerId === 'N/A' || originalPayerId === 'ALL') ? 'ALL' : originalPayerId;
                        setActionProgress(prev => ({ 
                            ...prev, 
                            active: true, 
                            title: 'Restoring Previous Assignment', 
                            status: 'Reconnecting...', 
                            logs: [...prev.logs, `Attempting to restore mapping to "${origCustName}"...`], 
                            done: false, 
                            error: false 
                        }));
                        
                        const res = await assignPriceBook(bookId, originalCustomerId, restorePayer, apiKey, proxyUrl);
                        const restAssignmentId = res.assignmentId || '(restored)';
                        
                        // Log successful restoration
                        logAssignmentUpdate(bookId, bookName, originalCustomerId, origCustName, restAssignmentId, restorePayer, null, restorePayer, true);
                        
                        setActionProgress(prev => ({ 
                            ...prev, 
                            title: 'Restored Successfully', 
                            status: `Pricebook has been restored back to "${origCustName}".`,
                            logs: [...prev.logs, '✅ Restoration complete.'],
                            done: true 
                        }));
                        
                        setTimeout(loadDirectory, 1000);
                        setAssignmentEditData(null);
                        return;
                    } catch (restError) {
                        // Log failed restoration attempt
                        logAssignmentUpdate(bookId, bookName, originalCustomerId, origCustName, null, originalPayerId, null, originalPayerId, false, `Restore failed: ${restError.message}`);
                        
                        setActionProgress(prev => ({ 
                            ...prev, 
                            title: 'Critical Failure', 
                            status: `Could not restore older assignment: ${restError.message}`, 
                            done: true, 
                            error: true,
                            logs: [...prev.logs, `❌ Final Error: ${restError.message}`]
                        }));
                        return;
                    }
                }
                // User chose "Leave Unassigned" — no additional logging needed, failure already logged above
            }

            setActionProgress(prev => ({
                ...prev,
                title: 'Operation Failed',
                status: err.message,
                done: true,
                error: true,
                logs: [...prev.logs, `❌ Error: ${err.message}`]
            }));
        } finally {
            setIsDryRunExecuting(false);
        }
    };

    const handleViewSummary = async (bookId, bookName, customerId, payerId) => {
        const hasExistingData = state.priceBook.ruleGroups.some(g => g.startDate || g.rules.some(r => r.name || r.adjustment));
        const isConfirmed = !hasExistingData || await confirm({
            title: 'Overwrite Builder Content',
            message: `You have unsaved configuration in the builder. Loading "${bookName}" will overwrite it. Continue?`,
            variant: 'warning',
            confirmLabel: 'Overwrite & Load'
        });

        if (!isConfirmed) return;

        try {
            const xml = await getSpec(bookId);
            const syntheticJsonPayload = {
                book_name: bookName,
                specification: xml,
                cxAPIId: bookId,
                customerApiId: customerId,
                cxPayerId: payerId === 'ALL' || payerId === 'N/A' ? '' : payerId
            };
            const newState = parseXMLToState(xml, syntheticJsonPayload);
            dispatch({ type: 'IMPORT_DATA', payload: newState });
            setActiveView('preview');
        } catch (err) {
            if (err instanceof ApiAuthError) {
                showToast && showToast({ type: 'error', title: 'API Key Error', message: err.message, duration: 10000, dedupeKey: 'api-auth-error' });
            } else {
                console.error(err);
                confirm({ title: 'Error', message: `Failed to load pricebook summary: ${err.message}`, type: 'alert', variant: 'danger' });
            }
        }
    };

    const handleViewXml = async (bookId, bookName) => {
        try {
            const xml = await getSpec(bookId);
            setViewingXml(xml);
            setViewingXmlTitle(`Specification: ${bookName}`);
            setViewingXmlBookId(bookId);
        } catch (err) {
            if (err instanceof ApiAuthError) {
                showToast && showToast({ type: 'error', title: 'API Key Error', message: err.message, duration: 10000, dedupeKey: 'api-auth-error' });
            } else {
                console.error(err);
                confirm({ title: 'Error', message: `Failed to view XML: ${err.message}`, type: 'alert', variant: 'danger' });
            }
        }
    };

    const handleRefreshXml = async () => {
        if (!viewingXmlBookId) return;
        setXmlRefreshing(true);
        try {
            specCache.delete(viewingXmlBookId); // bust only this entry
            const xml = await getSpec(viewingXmlBookId);
            setViewingXml(xml);
        } catch (err) {
            if (err instanceof ApiAuthError) {
                showToast && showToast({ type: 'error', title: 'API Key Error', message: err.message, duration: 10000, dedupeKey: 'api-auth-error' });
            } else {
                console.error(err);
                confirm({ title: 'Error', message: `Failed to refresh XML: ${err.message}`, type: 'alert', variant: 'danger' });
            }
        } finally {
            setXmlRefreshing(false);
        }
    };

    const handleDryRunOpen = async (item) => {
        const isAllOrNone = !item.billing_account_owner_id ||
            item.billing_account_owner_id === 'ALL' ||
            item.billing_account_owner_id === 'None' ||
            item.billing_account_owner_id === 'N/A';

        // Set initial modal state
        setDryRunData({
            assignment: item,
            month: getMonthOptions(13)[0].value,
            payerId: (isAllOrNone ? '' : item.billing_account_owner_id),
            payerOptions: [],
            isLoadingOptions: true,
            isAllOrNone: isAllOrNone
        });

        // Fetch payer account assignments asynchronously
        const apiKey = getCredential('ch_api_key');
        const proxyUrl = getCredential('ch_proxy_url') || '';
        try {
            const assignments = await fetchAwsAccountAssignments(item.target_client_api_id, apiKey, proxyUrl);
            const options = [...new Set(assignments.map(a => a.payer_account_owner_id).filter(Boolean))];
            setDryRunData(prev => prev ? { 
                ...prev, 
                payerOptions: options, 
                payerId: prev.payerId || (options.length > 0 ? options[0] : ''),
                isLoadingOptions: false 
            } : null);
        } catch (e) {
            console.error('Failed to fetch payer options', e);
            setDryRunData(prev => prev ? { ...prev, isLoadingOptions: false } : null);
        }
    };

    const handleDryRunSubmit = async () => {
        if (!dryRunData.payerId || dryRunData.payerId.trim() === '') {
            confirm({
                title: 'Payer Account ID Required',
                message: 'A specific Payer Account ID is required for a Dry Run.',
                type: 'alert',
                variant: 'warning'
            });
            return;
        }

        const { assignment, month, payerId } = dryRunData;
        const apiKey = getCredential('ch_api_key');
        const proxyUrl = getCredential('ch_proxy_url') || '';

        setIsDryRunExecuting(true);
        setActionProgress({
            active: true,
            title: 'Initiating Dry Run',
            status: `Connecting to CloudHealth...`,
            logs: [`Starting dry run for ${assignment.book_name}...`],
            done: false,
            error: false
        });

        try {
            // No need to fetch specification XML if we are using the existing pricebook ID
            setActionProgress(prev => ({ ...prev, status: 'Submitting dry run request...' }));
            const response = await performDryRun(
                assignment.id,
                null, // No XML required for existing ID
                month,
                assignment.target_client_api_id,
                payerId,
                apiKey,
                proxyUrl,
                true // useExistingId
            );

            setActionProgress(prev => ({
                ...prev,
                status: 'Dry Run Queued Successfully!',
                logs: [...prev.logs, `✅ The dry run evaluation has been initiated.`, `Please check the CloudHealth portal for results.`],
                done: true
            }));

            logDryRun(
                assignment.book_name,
                assignment.target_client_api_id,
                assignment.customer_name,
                payerId,
                month,
                null, // jobId removed as per request
                null, // tempBookId removed as per request
                true
            );

            setDryRunData(null);
        } catch (err) {
            setActionProgress(prev => ({
                ...prev,
                status: `Dry Run Failed`,
                logs: [...prev.logs, `❌ Error: ${err.message}`],
                done: true,
                error: true
            }));

            logDryRun(
                assignment.book_name,
                assignment.target_client_api_id,
                assignment.customer_name,
                payerId,
                month,
                null,
                null,
                false,
                err.message
            );
        } finally {
            setIsDryRunExecuting(false);
        }
    };

    const getMonthOptions = (count = 12) => {
        const options = [];
        const d = new Date();
        for (let i = 0; i < count; i++) {
            const label = d.toLocaleString('default', { month: 'short' }) + ' ' + d.getFullYear();
            const yearStr = d.getFullYear();
            const monthStr = String(d.getMonth() + 1).padStart(2, '0');
            options.push({ label, value: `${yearStr}-${monthStr}-01` });
            d.setMonth(d.getMonth() - 1);
        }
        return options;
    };

    // Lightweight syntax highlighter for XML viewer
    const highlightXml = (code) => {
        if (!code) return '';
        const escapeHtml = (str) =>
            str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        const escaped = escapeHtml(code);
        return escaped.replace(/(&lt;\/?[a-zA-Z0-9]+)(\s*.*?)(&gt;)/g, (m, p1, p2, p3) => {
            const tagName = p1.replace(/&lt;\/?/, '');

            let tagClass = 'hl-tag';
            if (tagName === 'RuleGroup') tagClass = 'hl-tag-group';
            else if (tagName === 'BillingRule' || tagName === 'BasicBillingRule') tagClass = 'hl-tag-rule';
            else if (tagName === 'Product') tagClass = 'hl-tag-product';
            else if (tagName === 'Comment' || tagName === 'CHTBillingRules') tagClass = 'hl-tag-meta';
            else if (['UsageType', 'Operation', 'RecordType', 'SavingsPlanOfferingType', 'InstanceProperties', 'LineItemDescription'].includes(tagName)) tagClass = 'hl-tag-prop';

            const attrs = p2.replace(/([a-zA-Z0-9]+)=(&quot;[^&]*&quot;|"[^"]*")/g, (m2, attrName, attrValue) => {
                return `<span class="hl-key">${attrName}</span>=<span class="hl-string">${attrValue}</span>`;
            });

            return `<span class="${tagClass}">${p1}</span>${attrs}<span class="${tagClass}">${p3}</span>`;
        });
    };

    const filteredData = apiData.assignments.filter(a => {
        if (!showUnassigned && !a.is_assigned) return false;
        if (filterCustomer && !(a.customer_name.toLowerCase().includes(filterCustomer.toLowerCase()) || (a.target_client_api_id && a.target_client_api_id.toString().includes(filterCustomer)))) return false;
        if (filterBook && !(a.book_name.toLowerCase().includes(filterBook.toLowerCase()) || a.id.toString().includes(filterBook))) return false;
        if (filterPayer && !(a.billing_account_owner_id && a.billing_account_owner_id.toString().toLowerCase().includes(filterPayer.toLowerCase()))) return false;
        return true;
    });

    const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
    const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    useEffect(() => {
        if (currentPage > totalPages) setCurrentPage(1);
    }, [filteredData.length, totalPages, currentPage]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0' }}>
            {/* Scrollable Content Area */}
            <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', padding: '0' }}>

                {/* Live Tenant Warning */}
                <div className="tenant-warning" style={{ margin: '0 16px' }}>
                    <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>⚠️</span>
                    <p>
                        <strong>Live Tenant — Be Cautious:</strong> All actions in this section run directly on your CloudHealth tenant and take effect immediately. Please review your selections carefully before confirming.
                    </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', background: 'var(--bg-card)', padding: '16px 24px', borderRadius: '12px', border: '1px solid var(--border)', margin: '0 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <ToggleSwitch
                            label="Show Unassigned"
                            checked={showUnassigned}
                            onChange={setShowUnassigned}
                        />
                        <button
                            onClick={loadDirectory}
                            disabled={isLoading}
                            style={{
                                padding: '10px 16px', borderRadius: '8px', background: 'var(--primary)', color: '#fff', border: 'none',
                                display: 'flex', alignItems: 'center', gap: '8px', cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: 600
                            }}
                        >
                            <FaSyncAlt className={isLoading ? 'spin' : ''} /> Refresh Directory
                        </button>
                    </div>
                </div>

                {error && (
                    <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '8px', border: '1px solid var(--danger)', margin: '0 16px' }}>
                        {error}
                    </div>
                )}

                {/* Table Container */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', margin: '0 16px' }}>
                    <div className="card" style={{ padding: '0', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', marginBottom: '0' }}>
                        <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                                <thead>
                                    <tr style={{ background: 'var(--bg-deep)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 10 }}>
                                        <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    Assigned Customer
                                                    <Tooltip title="Filter Customer" content="Search assignments by customer name or API ID" position="top">
                                                        <button onClick={() => { setOpenFilter(f => f === 'customer' ? null : 'customer'); if (openFilter === 'customer') setFilterCustomer(''); }} style={{ background: 'none', border: 'none', color: filterCustomer ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}><FaSearch size={11} /></button>
                                                    </Tooltip>
                                                </div>
                                                {openFilter === 'customer' && (
                                                    <input autoFocus type="text" placeholder="Search..." value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)} style={{ width: '100%', padding: '4px 8px', fontSize: '0.8rem', boxSizing: 'border-box', borderRadius: '6px', background: 'var(--bg-deep)', color: 'var(--text-main)', border: '1px solid var(--border)' }} />
                                                )}
                                            </div>
                                        </th>
                                        <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    Pricebook Name
                                                    <Tooltip title="Filter Pricebook" content="Search assignments by pricebook name or book ID" position="top">
                                                        <button onClick={() => { setOpenFilter(f => f === 'book' ? null : 'book'); if (openFilter === 'book') setFilterBook(''); }} style={{ background: 'none', border: 'none', color: filterBook ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}><FaSearch size={11} /></button>
                                                    </Tooltip>
                                                </div>
                                                {openFilter === 'book' && (
                                                    <input autoFocus type="text" placeholder="Search..." value={filterBook} onChange={e => setFilterBook(e.target.value)} style={{ width: '100%', padding: '4px 8px', fontSize: '0.8rem', boxSizing: 'border-box', borderRadius: '6px', background: 'var(--bg-deep)', color: 'var(--text-main)', border: '1px solid var(--border)' }} />
                                                )}
                                            </div>
                                        </th>
                                        <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    Payer Mapping
                                                    <Tooltip title="Filter Payer" content="Search assignments by payer account ID" position="top">
                                                        <button onClick={() => { setOpenFilter(f => f === 'payer' ? null : 'payer'); if (openFilter === 'payer') setFilterPayer(''); }} style={{ background: 'none', border: 'none', color: filterPayer ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}><FaSearch size={11} /></button>
                                                    </Tooltip>
                                                </div>
                                                {openFilter === 'payer' && (
                                                    <input autoFocus type="text" placeholder="Search..." value={filterPayer} onChange={e => setFilterPayer(e.target.value)} style={{ width: '100%', padding: '4px 8px', fontSize: '0.8rem', boxSizing: 'border-box', borderRadius: '6px', background: 'var(--bg-deep)', color: 'var(--text-main)', border: '1px solid var(--border)' }} />
                                                )}
                                            </div>
                                        </th>
                                        <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)', minWidth: '180px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span>Actions</span>
                                                <div style={{ position: 'relative', display: 'inline-block' }}
                                                    onMouseEnter={() => setLegendOpen(true)}
                                                    onMouseLeave={() => setLegendOpen(false)}
                                                >
                                                    <Tooltip title="Action Legend" content="View what each icon in the action column represents" position="top">
                                                        <button
                                                            onClick={() => setLegendOpen(v => !v)}
                                                            style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.4)', color: '#a78bfa', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, lineHeight: 1, padding: 0 }}
                                                        >?</button>
                                                    </Tooltip>
                                                    {legendOpen && (
                                                        <div style={{ position: 'absolute', top: '24px', right: 0, zIndex: 9999, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 16px', boxShadow: '0 16px 40px rgba(0,0,0,0.55)', minWidth: '215px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '2px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Action Legend</div>
                                                            {[
                                                                { icon: <FaEye size={10} />, color: '#38bdf8', bg: 'rgba(56,189,248,0.1)', border: 'rgba(56,189,248,0.3)', label: 'View XML Spec' },
                                                                { icon: <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '12px', height: '12px' }}><FaBookOpen size={10} style={{ position: 'absolute' }} /><FaPen size={6} style={{ position: 'absolute', bottom: '-1px', right: '-2px' }} /></span>, color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)', label: 'Edit Pricebook Rules' },
                                                                { icon: <FaAlignLeft size={10} />, color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.3)', label: 'View Summary' },
                                                                { icon: <FaPlay size={10} />, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', label: 'Pricebook Dry Run' },
                                                                { icon: <FaUserEdit size={10} />, color: '#38bdf8', bg: 'rgba(56,189,248,0.1)', border: 'rgba(56,189,248,0.3)', label: 'Edit Assignment' },
                                                                { icon: <FaTimes size={10} />, color: '#eab308', bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.3)', label: 'Unassign from Customer' },
                                                                { icon: <FaTrash size={10} />, color: 'var(--danger)', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', label: 'Delete Assignment & Pricebook' },
                                                            ].map(({ icon, color, bg, border, label }) => (
                                                                <span key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                                                    <span style={{ width: '22px', height: '22px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: bg, border: `1px solid ${border}`, borderRadius: '5px', color, flexShrink: 0 }}>{icon}</span>
                                                                    {label}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedData.length === 0 && !isLoading ? (
                                        <tr>
                                            <td colSpan="4" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                No matching global assignments found.
                                            </td>
                                        </tr>
                                    ) : paginatedData.map((item, idx) => (
                                        <tr key={`${item.id}-${item.assignment_id || 'none'}-${idx}`} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s', opacity: item.is_assigned ? 1 : 0.65, background: idx % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'transparent' }}>
                                            <td style={{ padding: '16px' }}>
                                                <div style={{ fontWeight: item.is_assigned ? 500 : 'normal', color: 'var(--text-main)' }}>{item.customer_name ? item.customer_name.replace(/\s*\(\d+\)$/, '') : ''}</div>
                                                {item.target_client_api_id && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>API ID: {item.target_client_api_id}</div>}
                                            </td>
                                            <td style={{ padding: '16px' }}>
                                                <div
                                                    onClick={() => handleViewXml(item.id, item.book_name)}
                                                    style={{ fontWeight: 500, color: 'var(--text-main)', cursor: 'pointer', display: 'inline-block', transition: 'color 0.2s' }}
                                                    onMouseEnter={(e) => { e.target.style.textDecoration = 'underline'; e.target.style.color = 'var(--primary)'; }}
                                                    onMouseLeave={(e) => { e.target.style.textDecoration = 'none'; e.target.style.color = 'var(--text-main)'; }}
                                                >
                                                    {item.book_name} ( {item.id} )
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', whiteSpace: 'nowrap' }}>
                                                    Created: {item.created_at} &nbsp; LastUpdated: {item.updated_at}
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px', color: (item.billing_account_owner_id === 'ALL' || item.billing_account_owner_id === 'N/A' || !item.is_assigned) ? 'var(--text-secondary)' : 'var(--accent)' }}>
                                                <div style={{ fontWeight: 600 }}>
                                                    {item.billing_account_owner_id}
                                                    {item.billing_account_owner_id === 'N/A' && (
                                                        <Tooltip title="Unmapped" content="Assigned to customer but no specific payer account mapping yet" position="top">
                                                            <span style={{ marginLeft: '6px', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'normal', fontStyle: 'italic', cursor: 'help' }}>(not yet mapped)</span>
                                                        </Tooltip>
                                                    )}
                                                </div>
                                                {item.assignment_id && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Assignment ID: {item.assignment_id}</div>}
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ display: 'flex', gap: 'clamp(3px, 0.5vw, 6px)', flexWrap: 'wrap', alignItems: 'center' }}>
                                                    <Tooltip title="View XML" content="View raw XML specification" position="top">
                                                        <button
                                                            onClick={() => handleViewXml(item.id, item.book_name)}
                                                            style={{ width: 'clamp(24px, 2.2vw, 32px)', height: 'clamp(24px, 2.2vw, 32px)', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', borderRadius: '6px', cursor: 'pointer', flexShrink: 0 }}
                                                        >
                                                            <FaEye size={11} />
                                                        </button>
                                                    </Tooltip>
                                                    <Tooltip title="Edit Rules" content="Import this pricebook into the builder to modify rules" position="top">
                                                        <button
                                                            onClick={() => handleModify(item.id, item.book_name, item.target_client_api_id || '', item.billing_account_owner_id)}
                                                            style={{ width: 'clamp(24px, 2.2vw, 32px)', height: 'clamp(24px, 2.2vw, 32px)', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', borderRadius: '6px', cursor: 'pointer', flexShrink: 0, position: 'relative', overflow: 'visible' }}
                                                        >
                                                            <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '14px', height: '14px' }}>
                                                                <FaBookOpen size={12} style={{ position: 'absolute' }} />
                                                                <FaPen size={6} style={{ position: 'absolute', bottom: '-2px', right: '-4px', filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.6))' }} />
                                                            </span>
                                                        </button>
                                                    </Tooltip>
                                                    <Tooltip title="View Summary" content="View a simplified summary of all rules in this pricebook" position="top">
                                                        <button
                                                            onClick={() => handleViewSummary(item.id, item.book_name, item.target_client_api_id || '', item.billing_account_owner_id)}
                                                            style={{ width: 'clamp(24px, 2.2vw, 32px)', height: 'clamp(24px, 2.2vw, 32px)', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)', color: '#a78bfa', borderRadius: '6px', cursor: 'pointer', flexShrink: 0 }}
                                                        >
                                                            <FaAlignLeft size={11} />
                                                        </button>
                                                    </Tooltip>
                                                    <Tooltip title="Dry Run" content="Simulate applying this pricebook to a specific month and payer" position="top">
                                                        <button
                                                            onClick={() => handleDryRunOpen(item)}
                                                            style={{ width: 'clamp(24px, 2.2vw, 32px)', height: 'clamp(24px, 2.2vw, 32px)', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#f59e0b', borderRadius: '6px', cursor: 'pointer', flexShrink: 0 }}
                                                        >
                                                            <FaPlay size={11} style={{ marginLeft: '2px' }} />
                                                        </button>
                                                    </Tooltip>
                                                    <Tooltip title="Edit Assignment" content="Modify the customer or payer mapping for this pricebook" position="top">
                                                        <button
                                                            onClick={() => handleEditAssignment(item.id, item.book_name, item.target_client_api_id || '', item.billing_account_owner_id, item.assignment_id)}
                                                            style={{ width: 'clamp(24px, 2.2vw, 32px)', height: 'clamp(24px, 2.2vw, 32px)', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', borderRadius: '6px', cursor: 'pointer', flexShrink: 0 }}
                                                        >
                                                            <FaUserEdit size={11} />
                                                        </button>
                                                    </Tooltip>
                                                    {item.is_assigned && (
                                                        <Tooltip title="Unassign Pricebook" content="Remove this pricebook mapping from the customer" variant="warning" position="top">
                                                            <button
                                                                onClick={() => handleUnassign(item.assignment_id, item.customer_name, item.book_name)}
                                                                style={{ width: 'clamp(24px, 2.2vw, 32px)', height: 'clamp(24px, 2.2vw, 32px)', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', color: '#eab308', borderRadius: '6px', cursor: 'pointer', flexShrink: 0 }}
                                                            >
                                                                <FaTimes size={11} />
                                                            </button>
                                                        </Tooltip>
                                                    )}
                                                    <Tooltip title="Delete Pricebook" content="Permanently delete this assignment and the pricebook from CloudHealth" variant="danger" position="top">
                                                        <button
                                                            onClick={() => handleDeleteBook(item.id, item.book_name)}
                                                            style={{ width: 'clamp(24px, 2.2vw, 32px)', height: 'clamp(24px, 2.2vw, 32px)', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--danger)', borderRadius: '6px', cursor: 'pointer', flexShrink: 0 }}
                                                        >
                                                            <FaTrash size={11} />
                                                        </button>
                                                    </Tooltip>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Fixed Pagination Bar at Bottom */}
            {filteredData.length > 0 && (
                <div style={{
                    flex: '0 0 auto',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--bg-deep)',
                    padding: '24px 24px 8px 24px',
                    borderTop: '1px solid var(--border)',
                    marginTop: '38px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)', fontSize: '0.9rem', flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
                        <span>Rows per page:</span>
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            style={{ padding: '6px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none' }}
                        >
                            {[10, 20, 30, 40, 50].map(size => (
                                <option key={size} value={size}>{size}</option>
                            ))}
                        </select>
                        <span style={{ marginLeft: '12px' }}>
                            Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} records
                        </span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: currentPage === 1 ? 'var(--bg-deep)' : 'var(--bg-card)', color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-main)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            <FaChevronLeft /> Prev
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>
                            Page {currentPage} of {totalPages}
                        </div>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: currentPage === totalPages ? 'var(--bg-deep)' : 'var(--bg-card)', color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-main)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            Next <FaChevronRight />
                        </button>
                    </div>
                </div>
            )}

            {/* View/Progress Modals attached to body so transformed layouts don't capture position fixed */}
            {typeof document !== 'undefined' ? createPortal(
                <>
                    {/* XML View Modal */}
                    <AnimatePresence>
                        {viewingXml && (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: xmlExpanded ? '2vh 2vw' : '10vh 24px', overflowY: 'auto' }}
                                onClick={() => setViewingXml(null)}
                            >
                                <motion.div
                                    initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', width: '100%', maxWidth: xmlExpanded ? '100%' : '800px', height: xmlExpanded ? '100%' : 'auto', maxHeight: xmlExpanded ? '100%' : '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', transition: 'all 0.3s ease-in-out' }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-deep)' }}>
                                        <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.2rem', fontWeight: 600 }}>{viewingXmlTitle}</h3>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <Tooltip title="Download XML" content="Save local copy of this specification">
                                                <button onClick={() => {
                                                    const blob = new Blob([viewingXml], { type: 'application/xml' });
                                                    const url = URL.createObjectURL(blob);
                                                    const a = document.createElement('a');
                                                    a.href = url;
                                                    a.download = `${viewingXmlTitle.replace('Specification: ', '')}.xml`;
                                                    document.body.appendChild(a);
                                                    a.click();
                                                    document.body.removeChild(a);
                                                    URL.revokeObjectURL(url);
                                                }} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}>
                                                    <FaDownload />
                                                </button>
                                            </Tooltip>
                                            <Tooltip title={xmlCopied ? "Copied!" : "Copy XML"} content="Copy the entire XML specification to clipboard">
                                                <button onClick={() => {
                                                    navigator.clipboard.writeText(viewingXml);
                                                    setXmlCopied(true);
                                                    setTimeout(() => setXmlCopied(false), 2000);
                                                }} style={{ background: xmlCopied ? 'rgba(16,185,129,0.2)' : 'var(--bg-card)', border: `1px solid ${xmlCopied ? 'rgba(16,185,129,0.5)' : 'var(--border)'}`, color: xmlCopied ? '#10b981' : 'var(--text-muted)', cursor: 'pointer', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}>
                                                    {xmlCopied ? <FaCheck /> : <FaCopy />}
                                                </button>
                                            </Tooltip>
                                            <Tooltip title="Refresh Specification" content="Bypass cache and re-fetch latest data from CloudHealth API">
                                                <button onClick={handleRefreshXml} disabled={xmlRefreshing} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: xmlRefreshing ? 'not-allowed' : 'pointer', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', transition: 'all 0.2s', opacity: xmlRefreshing ? 0.6 : 1 }}>
                                                    <FaSyncAlt style={{ animation: xmlRefreshing ? 'spin 0.8s linear infinite' : 'none' }} />
                                                </button>
                                            </Tooltip>
                                            <Tooltip title={xmlExpanded ? "Restore" : "Maximize"} content={xmlExpanded ? "Return to standard view" : "Expand to fit entire screen"}>
                                                <button onClick={() => setXmlExpanded(!xmlExpanded)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}>
                                                    {xmlExpanded ? <FaCompress /> : <FaExpand />}
                                                </button>
                                            </Tooltip>
                                            <Tooltip title="Close" content="Dismiss this view">
                                                <button onClick={() => setViewingXml(null)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}>
                                                    <FaTimes />
                                                </button>
                                            </Tooltip>
                                        </div>
                                    </div>
                                    <div style={{ padding: '24px', overflowX: 'auto', overflowY: 'auto', flexGrow: 1, background: 'var(--bg-code)' }}>
                                        <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: '1.5' }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(highlightXml(viewingXml)) }} />
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Dry Run Modal */}
                    <AnimatePresence>
                        {dryRunData && (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
                                onClick={() => !isDryRunExecuting && setDryRunData(null)}
                            >
                                <motion.div
                                    initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-deep)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ padding: '8px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px', color: '#f59e0b', display: 'flex' }}>
                                                <FaPlay size={14} />
                                            </div>
                                            <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.2rem', fontWeight: 600 }}>Pricebook Dry Run</h3>
                                        </div>
                                        <button onClick={() => setDryRunData(null)} disabled={isDryRunExecuting} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                            <FaTimes />
                                        </button>
                                    </div>

                                    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                                            You're test running the <strong style={{ color: 'var(--primary)' }}>{dryRunData.assignment.book_name}</strong> for the <strong style={{ color: 'var(--primary)' }}>{dryRunData.assignment.customer_name.replace(/\s*\(\d+\)$/, '')}</strong>.
                                        </p>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            <div className="input-group">
                                                <label style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.85rem', marginBottom: '8px', display: 'block' }}>Select Month</label>
                                                <select
                                                    value={dryRunData.month}
                                                    onChange={(e) => setDryRunData({ ...dryRunData, month: e.target.value })}
                                                >
                                                    {getMonthOptions(13).map(opt => (
                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="input-group">
                                                <label style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.85rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    Payer Account ID
                                                    {dryRunData.isLoadingOptions && (
                                                        <span className="spin" style={{ display: 'inline-block', fontSize: '0.7rem' }}>⏳</span>
                                                    )}
                                                </label>
                                                <select
                                                    value={dryRunData.payerId}
                                                    onChange={(e) => setDryRunData({ ...dryRunData, payerId: e.target.value })}
                                                    disabled={isDryRunExecuting}
                                                >
                                                    <option value="" disabled>Select Payer ID</option>
                                                    {dryRunData.payerOptions.map(opt => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                                {!dryRunData.isAllOrNone && (
                                                    <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                        Pre-populated from assignment (Editable).
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div style={{ marginTop: '12px', display: 'flex', gap: '12px' }}>
                                            <button
                                                onClick={() => setDryRunData(null)}
                                                disabled={isDryRunExecuting}
                                                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600 }}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleDryRunSubmit}
                                                disabled={isDryRunExecuting || !dryRunData.payerId}
                                                style={{
                                                    flex: 2, padding: '12px', borderRadius: '8px', border: 'none',
                                                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                                    color: 'white', cursor: (isDryRunExecuting || !dryRunData.payerId) ? 'not-allowed' : 'pointer',
                                                    fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                                    opacity: (isDryRunExecuting || !dryRunData.payerId) ? 0.6 : 1
                                                }}
                                            >
                                                {isDryRunExecuting ? <><FaSyncAlt className="spin" /> Submitting...</> : <><FaPlay size={10} /> Launch Dry Run</>}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Quick Assignment Edit Modal */}
                    <AnimatePresence>
                        {assignmentEditData && (() => {
                            const origCust = assignmentEditData.customerOptions?.find(c => String(c.id) === String(assignmentEditData.originalCustomerId));
                            const origCustName = origCust?.name || `Customer ${assignmentEditData.originalCustomerId}`;
                            const selectedCust = assignmentEditData.customerOptions?.find(c => String(c.id) === String(assignmentEditData.customerId));
                            const isChangingCustomer = String(assignmentEditData.customerId) !== String(assignmentEditData.originalCustomerId) && assignmentEditData.originalCustomerId;

                            return (
                                <motion.div
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', zIndex: 9005, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
                                >
                                    <motion.div
                                        initial={{ scale: 0.92, opacity: 0, y: 24 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0, y: 24 }}
                                        style={{ background: 'var(--bg-card)', padding: '28px', borderRadius: '16px', border: '1px solid var(--border)', maxWidth: '480px', width: '100%', boxShadow: '0 32px 64px -16px rgba(0,0,0,0.8)' }}
                                    >
                                        {/* Header */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
                                                    <FaUserEdit size={18} />
                                                </div>
                                                <div>
                                                    <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: 700 }}>Quick Edit Assignment</h3>
                                                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>Update mapping for &quot;{assignmentEditData.bookName}&quot;</p>
                                                </div>
                                            </div>
                                            <button onClick={() => setAssignmentEditData(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--text-main)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}><FaTimes /></button>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            {/* Target Customer — type-and-search via datalist */}
                                            <div className="input-group">
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    Target Customer
                                                    <button
                                                        onClick={async () => {
                                                            setAssignmentEditData(prev => ({ ...prev, isLoadingCustomers: true }));
                                                            const apiKey = getCredential('ch_api_key');
                                                            const proxyUrl = getCredential('ch_proxy_url') || '';
                                                            try {
                                                                const full = await fetchAllCustomers(apiKey, proxyUrl, true);
                                                                setAssignmentEditData(prev => ({ ...prev, customerOptions: full, isLoadingCustomers: false }));
                                                            } catch (e) { setAssignmentEditData(prev => ({ ...prev, isLoadingCustomers: false })); }
                                                        }}
                                                        title="Refresh customer list"
                                                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center' }}
                                                        onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
                                                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                                                    >
                                                        <FaSyncAlt className={assignmentEditData.isLoadingCustomers ? 'spin' : ''} size={10} />
                                                    </button>
                                                </label>
                                                <input
                                                    type="text"
                                                    list="edit-customer-suggestions"
                                                    value={assignmentEditData.customerSearch ?? (selectedCust ? `${selectedCust.name} (${selectedCust.id})` : assignmentEditData.customerId)}
                                                    onChange={e => {
                                                        const raw = e.target.value;
                                                        // Try to pick a real match from the option value pattern "Name (id)"
                                                        const match = assignmentEditData.customerOptions.find(
                                                            c => raw === `${c.name} (${c.id})` || raw === String(c.id)
                                                        );
                                                        setAssignmentEditData(prev => ({
                                                            ...prev,
                                                            customerSearch: raw,
                                                            customerId: match ? String(match.id) : '',
                                                            payerId: match ? '' : prev.payerId,           // (b) clear payer on customer change
                                                            payerOptions: match ? [] : prev.payerOptions,
                                                            keepExisting: match && isChangingCustomer ? true : prev.keepExisting  // (a) auto-check
                                                        }));
                                                    }}
                                                    placeholder="Search by name or ID..."
                                                />
                                                <datalist id="edit-customer-suggestions">
                                                    {assignmentEditData.customerOptions.map(c => (
                                                        <option key={c.id} value={`${c.name} (${c.id})`} />
                                                    ))}
                                                </datalist>
                                                {selectedCust && <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {selectedCust.id}</p>}
                                            </div>

                                            {/* Keep Existing checkbox — auto-checked, shown only when changing customer */}
                                            {isChangingCustomer && (
                                                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px', borderRadius: '8px', background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)', cursor: 'pointer' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={!!assignmentEditData.keepExisting}
                                                        onChange={e => setAssignmentEditData(prev => ({ ...prev, keepExisting: e.target.checked }))}
                                                        style={{ marginTop: '2px', accentColor: 'var(--primary)', width: '14px', height: '14px', flexShrink: 0, cursor: 'pointer' }}
                                                    />
                                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                                        Also keep existing assignment for <strong style={{ color: 'var(--text-main)' }}>{origCustName}</strong>
                                                        <span style={{ display: 'block', fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>The pricebook will be linked to both customers simultaneously.</span>
                                                    </span>
                                                </label>
                                            )}

                                            {/* Payer Account ID */}
                                            <div className="input-group">
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    Payer Account ID
                                                    <button
                                                        onClick={async () => {
                                                            if (!assignmentEditData.customerId) return;
                                                            setAssignmentEditData(prev => ({ ...prev, isLoadingOptions: true }));
                                                            const apiKey = getCredential('ch_api_key');
                                                            const proxyUrl = getCredential('ch_proxy_url') || '';
                                                            try {
                                                                const res = await fetchAwsAccountAssignments(assignmentEditData.customerId, apiKey, proxyUrl, true);
                                                                const opts = [...new Set(res.map(a => a.payer_account_owner_id).filter(Boolean))];
                                                                setAssignmentEditData(prev => ({ ...prev, payerOptions: opts, isLoadingOptions: false }));
                                                            } catch (e) { setAssignmentEditData(prev => ({ ...prev, isLoadingOptions: false })); }
                                                        }}
                                                        title="Refresh payer options"
                                                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center' }}
                                                        onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
                                                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                                                    >
                                                        <FaSyncAlt className={assignmentEditData.isLoadingOptions ? 'spin' : ''} size={10} />
                                                    </button>
                                                </label>
                                                <input
                                                    type="text"
                                                    list="edit-payer-suggestions"
                                                    value={assignmentEditData.payerId}
                                                    onChange={e => setAssignmentEditData(prev => ({ ...prev, payerId: e.target.value }))}
                                                    placeholder="Enter Payer ID or 'ALL'..."
                                                />
                                                <datalist id="edit-payer-suggestions">
                                                    <option value="ALL" />
                                                    {assignmentEditData.payerOptions.map(opt => (
                                                        <option key={opt} value={opt} />
                                                    ))}
                                                </datalist>
                                                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Leave empty or enter 'ALL' for global assignment.</p>
                                            </div>

                                            {/* Action buttons */}
                                            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                                                <button
                                                    onClick={() => setAssignmentEditData(null)}
                                                    style={{ flex: 1, padding: '11px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-deep)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-deep)'}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleAssignmentSubmit}
                                                    disabled={isDryRunExecuting || !assignmentEditData.customerId}
                                                    style={{
                                                        flex: 2, padding: '11px', borderRadius: '8px', border: 'none',
                                                        background: (isDryRunExecuting || !assignmentEditData.customerId) ? 'var(--bg-deep)' : 'var(--primary)',
                                                        color: 'white', cursor: (isDryRunExecuting || !assignmentEditData.customerId) ? 'not-allowed' : 'pointer',
                                                        fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                                        opacity: (isDryRunExecuting || !assignmentEditData.customerId) ? 0.5 : 1, transition: 'opacity 0.2s'
                                                    }}
                                                >
                                                    {isDryRunExecuting ? <><FaSyncAlt className="spin" /> Updating...</> : <><FaCheckCircle size={14} /> Update Assignment</>}
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            );
                        })()}
                    </AnimatePresence>

                    {/* Action Progress Overlay Modal */}
                    <AnimatePresence>
                        {actionProgress.active && (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
                            >
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                                    style={{ background: 'var(--bg-card)', padding: '32px', borderRadius: '16px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', maxWidth: '400px', width: '100%', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}
                                >
                                    <div className={!actionProgress.done ? "spin" : ""} style={{ fontSize: '3rem', color: actionProgress.error ? 'var(--danger)' : (actionProgress.done ? 'var(--success)' : 'var(--primary)'), display: 'flex' }}>
                                        {actionProgress.done ? (actionProgress.error ? <FaTimesCircle /> : <FaCheckCircle />) : <FaSyncAlt />}
                                    </div>
                                    <div style={{ textAlign: 'center', width: '100%' }}>
                                        <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-main)', fontSize: '1.2rem', fontWeight: 600 }}>{actionProgress.title}</h3>
                                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{actionProgress.status}</p>
                                    </div>
                                    {actionProgress.logs.length > 0 && (
                                        <div style={{ width: '100%', background: 'var(--bg-subtle)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', maxHeight: '150px', overflowY: 'auto' }}>
                                            {actionProgress.logs.map((L, i) => (
                                                <div key={i} style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', fontFamily: 'monospace' }}>{L}</div>
                                            ))}
                                        </div>
                                    )}
                                    {actionProgress.done && (
                                        <button
                                            onClick={() => setActionProgress({ active: false, title: '', status: '', logs: [], done: false, error: false })}
                                            style={{ width: '100%', padding: '12px', background: 'var(--bg-deep)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                                        >
                                            Close
                                        </button>
                                    )}
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </>,
                document.body
            ) : null}
        </div>
    );
};

export default DirectorySection;
