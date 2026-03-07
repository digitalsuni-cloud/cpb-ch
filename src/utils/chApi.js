export const CH_API_BASE = 'https://chapi.cloudhealthtech.com';

// Typed error classes — let callers distinguish auth failures from other errors
export class ApiAuthError extends Error {
    constructor(status, body = '') {
        const hint = status === 401
            ? 'Your API key is invalid or has expired. Please update it in Settings.'
            : 'Access denied. You may not have permission to perform this action.';
        super(hint);
        this.name = 'ApiAuthError';
        this.status = status;
        this.body = body;
    }
}

// Central response checker — throws typed errors
const checkResponse = async (response, label) => {
    if (response.ok) return;
    let body = '';
    try { body = await response.text(); } catch (_) { }
    if (response.status === 401 || response.status === 403) {
        throw new ApiAuthError(response.status, body);
    }
    throw new Error(`${label}: HTTP ${response.status} — ${body || response.statusText}`);
};

// Customer Cache System with persistence
let cachedCustomers = [];
let customerCacheExpiry = 0;
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

// Re-hydrate from session storage on module load
try {
    const saved = sessionStorage.getItem('ch_customer_cache');
    if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.expiry > Date.now()) {
            cachedCustomers = parsed.data || [];
            customerCacheExpiry = parsed.expiry;
        }
    }
} catch (e) {
    console.warn('Failed to restore customer cache from storage', e);
}

export const getCachedCustomers = () => cachedCustomers;
export const setCustomerCache = (customers) => {
    cachedCustomers = customers || [];
    customerCacheExpiry = Date.now() + CACHE_TTL;
    try {
        sessionStorage.setItem('ch_customer_cache', JSON.stringify({
            data: cachedCustomers,
            expiry: customerCacheExpiry
        }));
    } catch (e) {
        console.warn('Failed to save customer cache to storage', e);
    }
};
export const isCustomerCacheValid = () => cachedCustomers.length > 0 && Date.now() < customerCacheExpiry;

// Helper: gracefully fetch a single URL, returns JSON or null
const safeFetch = async (endpoint, apiKey, proxyUrl) => {
    try {
        const url = getUrl(endpoint, proxyUrl);
        const res = await fetch(url, { headers: getHeaders(apiKey) });
        if (res.status === 401 || res.status === 403) throw new ApiAuthError(res.status);
        return res.ok ? await res.json() : null;
    } catch (e) {
        if (e instanceof ApiAuthError) throw e;
        return null;
    }
};

// Helper: exhaust all pages using Promise.all for speed
const fetchAllPages = async (basePath, resultKey, apiKey, proxyUrl) => {
    const perPage = 100;
    const firstData = await safeFetch(`${basePath}?per_page=${perPage}&page=1`, apiKey, proxyUrl);
    if (!firstData) return [];

    let allItems = firstData[resultKey] || [];
    const totalPages = firstData.total_pages;

    if (totalPages && totalPages > 1) {
        const promises = [];
        for (let p = 2; p <= totalPages; p++) {
            promises.push(safeFetch(`${basePath}?per_page=${perPage}&page=${p}`, apiKey, proxyUrl));
        }
        const subsequentPages = await Promise.all(promises);
        subsequentPages.forEach(data => {
            if (data && data[resultKey]) allItems = allItems.concat(data[resultKey]);
        });
    } else {
        // Fallback if total_pages is missing but records still exist
        let page = 2;
        let lastBatchSize = allItems.length;
        while (lastBatchSize === perPage) {
            const data = await safeFetch(`${basePath}?per_page=${perPage}&page=${page}`, apiKey, proxyUrl);
            if (!data) break;
            const batch = data[resultKey] || [];
            allItems = allItems.concat(batch);
            lastBatchSize = batch.length;
            page++;
        }
    }
    return allItems;
};

export const fetchAllCustomers = async (apiKey, proxyUrl = '', forceRefresh = false) => {
    if (!forceRefresh && isCustomerCacheValid()) {
        return cachedCustomers;
    }

    const customers = await fetchAllPages('/customers', 'customers', apiKey, proxyUrl);
    setCustomerCache(customers);
    return customers;
};

// Normalize billing_account_owner_id: null/[] → 'N/A', array → joined string
export const normalizePayer = (val) => {
    if (val === null || val === undefined) return 'N/A';
    if (Array.isArray(val)) return val.length === 0 ? 'N/A' : val.map(v => String(v)).join(', ');
    const s = String(val).trim();
    return s === '' ? 'N/A' : s;
};

const getUrl = (path, proxyConfig) => {
    // Ensure path starts with a version, default to /v1 if missing
    const versionedPath = path.startsWith('/v') ? path : `/v1${path}`;

    // If a specific CORS proxy is configured by user, prepend it before the full CH URL
    if (proxyConfig && proxyConfig.trim().length > 0) {
        return `${proxyConfig.trim()}${CH_API_BASE}${versionedPath}`;
    }

    // Auto-detect if running on local development server
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    // If local dev, use the Vite dev server proxy to bypass CORS (/api/ch → https://chapi.cloudhealthtech.com)
    if (isLocalhost) {
        return `/api/ch${versionedPath}`;
    }

    // Default: Return direct CloudHealth URL (bare host + versioned path)
    return `${CH_API_BASE}${versionedPath}`;
};

const getHeaders = (apiKey) => ({
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
});

export const fetchAwsAccountAssignments = async (targetClientId, apiKey, proxyUrl = '') => {
    // Note: This uses v2 API as requested
    const url = getUrl(`/v2/aws_account_assignments?target_client_api_id=${targetClientId}`, proxyUrl);
    const response = await fetch(url, {
        method: 'GET',
        headers: getHeaders(apiKey)
    });

    if (!response.ok) return [];
    const data = await response.json();
    return data.aws_account_assignments || [];
};

export const getPriceBooks = async (apiKey, proxyUrl = '') => {
    const url = getUrl('/price_books', proxyUrl);
    const response = await fetch(url, {
        method: 'GET',
        headers: getHeaders(apiKey)
    });

    await checkResponse(response, 'Fetch price books');
    return await response.json();
};

export const getPriceBookSpecification = async (id, apiKey, proxyUrl = '') => {
    const url = getUrl(`/price_books/${id}/specification`, proxyUrl);
    const response = await fetch(url, {
        method: 'GET',
        headers: getHeaders(apiKey)
    });

    await checkResponse(response, 'Fetch price book specification');
    const data = await response.json();
    return data.specification;
};

export const createPriceBook = async (bookName, xml, apiKey, proxyUrl = '') => {
    const url = getUrl(`/price_books`, proxyUrl);
    const payload = {
        book_name: bookName,
        specification: xml
    };

    // API docs specify api_key can be query param for POST, but also Authorization header works.
    const response = await fetch(url, {
        method: 'POST',
        headers: getHeaders(apiKey),
        body: JSON.stringify(payload)
    });

    await checkResponse(response, 'Create price book');
    return await response.json();
};

export const updatePriceBook = async (id, xml, apiKey, proxyUrl = '') => {
    const url = getUrl(`/price_books/${id}`, proxyUrl);
    const payload = {
        specification: xml
    };

    const response = await fetch(url, {
        method: 'PUT',
        headers: getHeaders(apiKey),
        body: JSON.stringify(payload)
    });

    await checkResponse(response, 'Update price book');
    return await response.json();
};

export const assignPriceBook = async (priceBookId, targetClientApiId, billingAccountOwnerId, apiKey, proxyUrl = '') => {
    const pbId = parseInt(priceBookId, 10);
    const clientId = parseInt(targetClientApiId, 10);

    // Coerce to string to avoid trim() crash when value is a number or array
    const rawOwner = Array.isArray(billingAccountOwnerId)
        ? billingAccountOwnerId.join(',')
        : String(billingAccountOwnerId ?? '');
    const isAll = !rawOwner || rawOwner.trim() === '' || rawOwner.trim().toUpperCase() === 'ALL';
    const accountsList = isAll ? ["ALL"] : rawOwner.split(',').map(s => s.trim().replace(/^['"']|['"']$/g, ''));

    // 1. Assign to Customer globally first
    const assignUrl = getUrl('/price_book_assignments', proxyUrl);
    const assignPayload = {
        price_book_id: pbId,
        target_client_api_id: clientId
    };

    let assignmentId;

    // Attempt the Customer assignment safely. If they are already assigned, parse and catch.
    const response = await fetch(assignUrl, {
        method: 'POST',
        headers: getHeaders(apiKey),
        body: JSON.stringify(assignPayload)
    });

    await checkResponse(response, 'Assign price book to customer');
    const assignData = await response.json();
    assignmentId = assignData.price_book_assignment ? assignData.price_book_assignment.id : assignData.id;

    // 2. Map explicitly required payer accounts by string parsing comma separations
    if (assignmentId) {
        const accUrl = getUrl('/price_book_account_assignments', proxyUrl);
        const accPayload = {
            price_book_assignment_id: assignmentId,
            billing_account_owner_id: accountsList
        };

        const accResponse = await fetch(accUrl, {
            method: 'POST',
            headers: getHeaders(apiKey),
            body: JSON.stringify(accPayload)
        });

        await checkResponse(accResponse, 'Map payer account subsets');
        const accData = await accResponse.json();
        return { assignmentId, ...accData };
    }
    return { assignmentId };
};

export const getAssignedPriceBooks = async (apiKey, proxyUrl = '') => {
    // 1. Fetch BOTH assignment endpoints and pricebooks in parallel
    // Also fetch all customers to prime the cache and get proper names
    const [baseAssignments, accountAssignments, allBooks, allCustomers] = await Promise.all([
        fetchAllPages('/price_book_assignments', 'price_book_assignments', apiKey, proxyUrl),
        fetchAllPages('/price_book_account_assignments', 'price_book_account_assignments', apiKey, proxyUrl),
        fetchAllPages('/price_books', 'price_books', apiKey, proxyUrl),
        fetchAllCustomers(apiKey, proxyUrl, true) // PRIMES THE CACHE — force refresh to get latest
    ]);

    // Build lookup: base_assignment_id → account assignment record
    const accountByBaseId = {};
    accountAssignments.forEach(aa => {
        accountByBaseId[aa.price_book_assignment_id] = aa;
    });

    // Build book map
    const bookMap = {};
    allBooks.forEach(b => bookMap[b.id] = b);

    // Build customer map from the full fetched list
    const customerMap = {};
    allCustomers.forEach(c => {
        customerMap[c.id] = c;
    });

    // Fallback: individually fetch books missing from the bulk page
    const uniqueBookIds = [...new Set(baseAssignments.map(a => a.price_book_id))];
    const missingBookIds = uniqueBookIds.filter(id => !bookMap[id]);
    if (missingBookIds.length > 0) {
        const extra = await Promise.all(missingBookIds.map(id => safeFetch(`/price_books/${id}`, apiKey, proxyUrl).then(d => ({ id, data: d }))));
        extra.forEach(r => { if (r.data) bookMap[r.id] = r.data.price_book || r.data; });
    }

    const safeDate = (d) => {
        try { return d ? new Date(d).toISOString().split('T')[0] : 'N/A'; }
        catch (_) { return 'N/A'; }
    };

    // 2. Assemble one row per BASE assignment
    //    If a payer account assignment exists for it, use its billing_account_owner_id; otherwise N/A
    const mappedAssignments = baseAssignments.map(a => {
        const acct = accountByBaseId[a.id]; // match base.id → acct.price_book_assignment_id
        return {
            id: a.price_book_id,
            assignment_id: a.id,                    // base assignment id (shown as Assignment ID)
            account_assignment_id: acct?.id || null, // payer-account assignment id (used for payer delete)
            target_client_api_id: a.target_client_api_id,
            book_name: bookMap[a.price_book_id]?.book_name || `Price Book (ID: ${a.price_book_id})`,
            customer_name: customerMap[a.target_client_api_id]?.name
                ? `${customerMap[a.target_client_api_id].name} (${a.target_client_api_id})`
                : `Unknown Customer (${a.target_client_api_id})`,
            billing_account_owner_id: acct ? normalizePayer(acct.billing_account_owner_id) : 'N/A',
            created_at: safeDate(bookMap[a.price_book_id]?.created_at),
            updated_at: safeDate(bookMap[a.price_book_id]?.updated_at),
            is_assigned: true
        };
    });

    // 3. Add books that exist but have no assignment at all
    const assignedBookIds = new Set(baseAssignments.map(a => a.price_book_id));
    const unassignedBooks = Object.values(bookMap)
        .filter(b => !assignedBookIds.has(b.id))
        .map(b => ({
            id: b.id,
            assignment_id: null,
            account_assignment_id: null,
            target_client_api_id: null,
            book_name: b.book_name || `Price Book (ID: ${b.id})`,
            customer_name: 'Unassigned',
            billing_account_owner_id: 'N/A',
            created_at: safeDate(b.created_at),
            updated_at: safeDate(b.updated_at),
            is_assigned: false
        }));

    return [...mappedAssignments, ...unassignedBooks]
        .sort((a, b) => a.customer_name.localeCompare(b.customer_name) || a.book_name.localeCompare(b.book_name));
};

export const searchCustomerByName = async (nameQuery, apiKey, proxyUrl = '') => {
    // If we have a valid cache, search it locally for instant results
    if (isCustomerCacheValid()) {
        const query = nameQuery.toLowerCase();
        return cachedCustomers.filter(c =>
            c.name.toLowerCase().includes(query) ||
            String(c.id).includes(query)
        );
    }

    // Fallback to API if no cache (though fetchAllCustomers is preferred to seed it)
    const url = getUrl(`/customers?name=${encodeURIComponent(nameQuery)}`, proxyUrl);
    const res = await fetch(url, { headers: getHeaders(apiKey) });
    await checkResponse(res, 'Search customers');
    const data = await res.json();
    return data.customers || [];
};

export const getSingleCustomerAssignment = async (targetClientId, apiKey, proxyUrl = '') => {
    // Browsers block GET requests with payloads.
    // CloudHealth supports converting the JSON body filter into a query param for GET.
    const url = getUrl(`/price_book_account_assignments?target_client_api_id=${targetClientId}`, proxyUrl);
    const res = await fetch(url, { headers: getHeaders(apiKey) });
    await checkResponse(res, 'Load assignments for customer');

    const data = await res.json();
    const assignments = data.price_book_account_assignments || [];

    if (assignments.length === 0) return null;

    // Fetch price book name for the first assignment
    const bookId = assignments[0].price_book_id;
    const bookUrl = getUrl(`/price_books/${bookId}`, proxyUrl);
    const bookRes = await fetch(bookUrl, { headers: getHeaders(apiKey) });

    let bookName = `Price Book (${bookId})`;
    if (bookRes.ok) {
        const bookData = await bookRes.json();
        bookName = bookData.price_book?.book_name || bookData.book_name || bookName;
    }

    // Fetch customer name
    let customerName = `Unknown Customer (${targetClientId})`;
    const custUrl = getUrl(`/customers/${targetClientId}`, proxyUrl);
    const custRes = await fetch(custUrl, { headers: getHeaders(apiKey) });
    if (custRes.ok) {
        const custData = await custRes.json();
        customerName = custData.customer?.name || custData.name || customerName;
    }

    return {
        assignment_id: assignments[0].id,
        price_book_id: bookId,
        book_name: bookName,
        target_client_api_id: targetClientId,
        customer_name: customerName,
        billing_account_owner_id: assignments[0].billing_account_owner_id || 'ALL'
    };
};

export const performDryRun = async (priceBookId, generatedXml, startMonthDate, targetClientId, billingAccountId, apiKey, proxyUrl = '', useExistingId = false) => {
    let effectivePriceBookId = priceBookId;
    let tempPriceBookId = null;

    // Only create a temporary pricebook if we are NOT using an existing one
    if (!useExistingId) {
        if (!generatedXml) throw new Error("Specification XML is required to create a temporary Dry Run environment.");
        const createRes = await createPriceBook(`Temp Dry Run ${Date.now()}`, generatedXml, apiKey, proxyUrl);
        effectivePriceBookId = createRes.price_book ? createRes.price_book.id : createRes.id;
        tempPriceBookId = effectivePriceBookId;
    }

    if (!effectivePriceBookId) throw new Error("Price Book ID is required for evaluation.");

    // YYYY-MM
    const monthFormatted = startMonthDate.substring(0, 7);

    const url = getUrl(`/price_books/dry_run`, proxyUrl);
    const payload = {
        price_book_id: parseInt(effectivePriceBookId, 10),
        target_client_api_id: parseInt(targetClientId, 10),
        month: monthFormatted,
        billing_account_owner_id: null
    };

    if (billingAccountId && typeof billingAccountId === 'string' && billingAccountId.trim() !== '' && billingAccountId.trim().toUpperCase() !== 'ALL') {
        const parsedPayerId = parseInt(billingAccountId.split(',')[0].trim(), 10);
        if (!isNaN(parsedPayerId)) {
            payload.billing_account_owner_id = parsedPayerId;
        } else {
            payload.billing_account_owner_id = billingAccountId.trim();
        }
    } else if (typeof billingAccountId === 'number') {
        payload.billing_account_owner_id = billingAccountId;
    } else {
        payload.billing_account_owner_id = "";
    }

    const response = await fetch(url, {
        method: 'PUT',
        headers: getHeaders(apiKey),
        body: JSON.stringify(payload)
    });

    await checkResponse(response, 'Initiate dry run');
    const data = await response.json();
    return { ...data, tempPriceBookId };
};

export const deletePriceBook = async (id, apiKey, proxyUrl = '') => {
    const url = getUrl(`/price_books/${id}`, proxyUrl);
    const response = await fetch(url, {
        method: 'DELETE',
        headers: getHeaders(apiKey)
    });
    await checkResponse(response, 'Delete price book');
    return true;
};

export const deletePriceBookAssignment = async (id, apiKey, proxyUrl = '') => {
    // Deletes a PAYER ACCOUNT assignment (price_book_account_assignments)
    const url = getUrl(`/price_book_account_assignments/${id}`, proxyUrl);
    const response = await fetch(url, {
        method: 'DELETE',
        headers: getHeaders(apiKey)
    });
    await checkResponse(response, 'Unassign payer account link');
    return true;
};

export const deleteBaseAssignment = async (id, apiKey, proxyUrl = '') => {
    // Deletes a BASE customer→pricebook assignment (price_book_assignments)
    const url = getUrl(`/price_book_assignments/${id}`, proxyUrl);
    const response = await fetch(url, {
        method: 'DELETE',
        headers: getHeaders(apiKey)
    });
    await checkResponse(response, 'Unassign customer link');
    return true;
};
