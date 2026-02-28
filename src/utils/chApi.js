export const CH_API_BASE = 'https://chapi.cloudhealthtech.com/v1';

const getUrl = (path, proxyConfig) => {
    // If a specific CORS proxy is configured by user, use it
    if (proxyConfig && proxyConfig.trim().length > 0) {
        return `${proxyConfig.trim()}${CH_API_BASE}${path}`;
    }

    // Auto-detect if running on local development server
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    // If local dev, use the Vite dev server proxy to bypass CORS
    if (isLocalhost) {
        return `/api/ch/v1${path}`;
    }

    // Default: Return direct CloudHealth URL (works with browser extensions or in same-origin environments)
    return `${CH_API_BASE}${path}`;
};

const getHeaders = (apiKey) => ({
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
});

export const getPriceBooks = async (apiKey, proxyUrl = '') => {
    const url = getUrl('/price_books', proxyUrl);
    const response = await fetch(url, {
        method: 'GET',
        headers: getHeaders(apiKey)
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch price books: ${response.status} ${response.statusText}`);
    }

    return await response.json();
};

export const getPriceBookSpecification = async (id, apiKey, proxyUrl = '') => {
    const url = getUrl(`/price_books/${id}/specification`, proxyUrl);
    const response = await fetch(url, {
        method: 'GET',
        headers: getHeaders(apiKey)
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch price book specification: ${response.status}`);
    }

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

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Failed to create price book: ${err}`);
    }

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

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Failed to update price book: ${err}`);
    }

    return await response.json();
};

export const assignPriceBook = async (priceBookId, targetClientApiId, billingAccountOwnerId, apiKey, proxyUrl = '') => {
    const pbId = parseInt(priceBookId, 10);
    const clientId = parseInt(targetClientApiId, 10);

    // Always arrayify the accounts, defaulting to ["ALL"] if empty or explicitly typed
    const isAll = !billingAccountOwnerId || billingAccountOwnerId.trim() === '' || billingAccountOwnerId.toUpperCase() === 'ALL';
    const accountsList = isAll ? ["ALL"] : billingAccountOwnerId.split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));

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

    if (!response.ok) {
        const err = await response.text();
        // If it naturally fails because it's *already* assigned, we need to recover the ID or throw.
        throw new Error(`Failed to assign price book to customer scope: ${err}`);
    } else {
        const assignData = await response.json();
        assignmentId = assignData.price_book_assignment ? assignData.price_book_assignment.id : assignData.id;
    }

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

        if (!accResponse.ok) {
            const err = await accResponse.text();
            throw new Error(`Failed to map Payer Account subsets: ${err}`);
        }
        return await accResponse.json();
    }
};

export const getAssignedPriceBooks = async (apiKey, proxyUrl = '') => {
    // Helper: gracefully fetch a single URL, returns JSON or null
    const safeFetch = async (endpoint) => {
        try {
            const url = getUrl(endpoint, proxyUrl);
            const res = await fetch(url, { headers: getHeaders(apiKey) });
            return res.ok ? await res.json() : null;
        } catch (e) {
            return null;
        }
    };

    // Helper: exhaust all pages of a paginated CloudHealth endpoint
    const fetchAllPages = async (basePath, resultKey) => {
        const perPage = 100;
        let page = 1;
        let allItems = [];
        while (true) {
            const data = await safeFetch(`${basePath}?per_page=${perPage}&page=${page}`);
            if (!data) break;
            const items = data[resultKey] || [];
            allItems = allItems.concat(items);
            if (items.length < perPage) break;
            page++;
        }
        return allItems;
    };

    // Normalize billing_account_owner_id: null/[] → 'N/A', array → joined string
    const normalizePayer = (val) => {
        if (val === null || val === undefined) return 'N/A';
        if (Array.isArray(val)) return val.length === 0 ? 'N/A' : val.map(v => String(v)).join(', ');
        const s = String(val).trim();
        return s === '' ? 'N/A' : s;
    };

    // 1. Fetch BOTH assignment endpoints in parallel
    //    /price_book_assignments       = base customer→pricebook links (the source of truth for assigned rows)
    //    /price_book_account_assignments = payer account level, linked by price_book_assignment_id → base.id
    const [baseAssignments, accountAssignments, allBooks] = await Promise.all([
        fetchAllPages('/price_book_assignments', 'price_book_assignments'),
        fetchAllPages('/price_book_account_assignments', 'price_book_account_assignments'),
        fetchAllPages('/price_books', 'price_books'),
    ]);

    // Build lookup: base_assignment_id → account assignment record
    const accountByBaseId = {};
    accountAssignments.forEach(aa => {
        accountByBaseId[aa.price_book_assignment_id] = aa;
    });

    // Build book map
    const bookMap = {};
    allBooks.forEach(b => bookMap[b.id] = b);

    // Fetch unique customers in parallel
    const uniqueCustomerIds = [...new Set(baseAssignments.map(a => a.target_client_api_id))];
    const customerResults = await Promise.all(
        uniqueCustomerIds.map(id => safeFetch(`/customers/${id}`).then(d => ({ id, data: d })))
    );
    const customerMap = {};
    customerResults.forEach(r => {
        if (r.data) customerMap[r.id] = r.data.customer || r.data;
    });

    // Fallback: individually fetch books missing from the bulk page
    const uniqueBookIds = [...new Set(baseAssignments.map(a => a.price_book_id))];
    const missingBookIds = uniqueBookIds.filter(id => !bookMap[id]);
    if (missingBookIds.length > 0) {
        const extra = await Promise.all(missingBookIds.map(id => safeFetch(`/price_books/${id}`).then(d => ({ id, data: d }))));
        extra.forEach(r => { if (r.data) bookMap[r.id] = r.data.price_book || r.data; });
    }

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
            updated_at: bookMap[a.price_book_id]?.updated_at,
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
            updated_at: b.updated_at,
            is_assigned: false
        }));

    return [...mappedAssignments, ...unassignedBooks]
        .sort((a, b) => a.customer_name.localeCompare(b.customer_name) || a.book_name.localeCompare(b.book_name));
};

export const searchCustomerByName = async (nameQuery, apiKey, proxyUrl = '') => {
    // CloudHealth provides search functionality via query param
    const url = getUrl(`/customers?name=${encodeURIComponent(nameQuery)}`, proxyUrl);
    const res = await fetch(url, { headers: getHeaders(apiKey) });
    if (!res.ok) throw new Error("Failed to search customers");
    const data = await res.json();
    return data.customers || [];
};

export const getSingleCustomerAssignment = async (targetClientId, apiKey, proxyUrl = '') => {
    // Browsers block GET requests with payloads.
    // CloudHealth supports converting the JSON body filter into a query param for GET.
    const url = getUrl(`/price_book_account_assignments?target_client_api_id=${targetClientId}`, proxyUrl);
    const res = await fetch(url, { headers: getHeaders(apiKey) });
    if (!res.ok) throw new Error("Failed to load assignments for specific customer");

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

export const performDryRun = async (priceBookId, generatedXml, startMonthDate, targetClientId, billingAccountId, apiKey, proxyUrl = '') => {
    // ALWAYS create a dummy pricebook for Dry Runs so we don't accidentally update live mapping rule tables.
    const createRes = await createPriceBook(`Temp Dry Run ${Date.now()}`, generatedXml, apiKey, proxyUrl);
    const tempPriceBookId = createRes.price_book ? createRes.price_book.id : createRes.id;

    // YYYY-MM
    const monthFormatted = startMonthDate.substring(0, 7);

    const url = getUrl(`/price_books/dry_run`, proxyUrl);
    const payload = {
        price_book_id: parseInt(tempPriceBookId, 10),
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

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Failed to initiate dry run: ${err}`);
    }

    return await response.json();
};

export const deletePriceBook = async (id, apiKey, proxyUrl = '') => {
    const url = getUrl(`/price_books/${id}`, proxyUrl);
    const response = await fetch(url, {
        method: 'DELETE',
        headers: getHeaders(apiKey)
    });
    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Failed to delete price book: ${err}`);
    }
    return true;
};

export const deletePriceBookAssignment = async (id, apiKey, proxyUrl = '') => {
    // Deletes a PAYER ACCOUNT assignment (price_book_account_assignments)
    const url = getUrl(`/price_book_account_assignments/${id}`, proxyUrl);
    const response = await fetch(url, {
        method: 'DELETE',
        headers: getHeaders(apiKey)
    });
    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Failed to unassign payer account link: ${err}`);
    }
    return true;
};

export const deleteBaseAssignment = async (id, apiKey, proxyUrl = '') => {
    // Deletes a BASE customer→pricebook assignment (price_book_assignments)
    const url = getUrl(`/price_book_assignments/${id}`, proxyUrl);
    const response = await fetch(url, {
        method: 'DELETE',
        headers: getHeaders(apiKey)
    });
    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Failed to unassign customer link: ${err}`);
    }
    return true;
};
