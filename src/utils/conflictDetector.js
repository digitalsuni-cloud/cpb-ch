/**
 * conflictDetector.js
 * Analyses a priceBook state and returns a flat list of detected rule conflicts.
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Normalise a product name: empty / blank → 'ANY' */
const normProduct = (name) => (name || '').trim() || 'ANY';

/**
 * Categorise a property values array:
 *  'lineItem'  → objects like { matchType, value }  (LineItemDescription filter)
 *  'standard'  → plain strings  (Region, UsageType, InstanceType, etc.)
 *  'empty'     → no entries
 */
const classifyProp = (values) => {
    if (!Array.isArray(values) || values.length === 0) return 'empty';
    if (typeof values[0] === 'object' && values[0] !== null && 'value' in values[0]) return 'lineItem';
    return 'standard';
};

/**
 * Return true when two property filter objects overlap.
 *
 * Key design decisions:
 *  1. LineItemDescription filters are ORTHOGONAL to standard filters (Region, UsageType…).
 *     A rule scoped to a specific line-item string (e.g. "Enterprise Discount Program")
 *     never conflicts with a rule scoped by Region or UsageType — they target completely
 *     different cost-dimension axes.
 *  2. Two lineItem-only rules conflict only if they share the same description text.
 *  3. Standard filter comparison: if both have standard filters, they conflict only when
 *     they share at least one value in a shared dimension key.
 */
const filtersOverlap = (propsA, propsB) => {
    const entriesA = Object.entries(propsA || {}).filter(([, v]) => Array.isArray(v) && v.length > 0);
    const entriesB = Object.entries(propsB || {}).filter(([, v]) => Array.isArray(v) && v.length > 0);

    const lineItemA = entriesA.filter(([, v]) => classifyProp(v) === 'lineItem');
    const standardA = entriesA.filter(([, v]) => classifyProp(v) === 'standard');
    const lineItemB = entriesB.filter(([, v]) => classifyProp(v) === 'lineItem');
    const standardB = entriesB.filter(([, v]) => classifyProp(v) === 'standard');

    const hasLineItemA = lineItemA.length > 0;
    const hasLineItemB = lineItemB.length > 0;
    const hasStandardA = standardA.length > 0;
    const hasStandardB = standardB.length > 0;

    // ── Both sides use ONLY lineItem filters ─────────────────────────────────
    // Conflict only if they share the same description text
    if (hasLineItemA && !hasStandardA && hasLineItemB && !hasStandardB) {
        for (const [, valsA] of lineItemA) {
            for (const [, valsB] of lineItemB) {
                const textsA = new Set(valsA.map(x => (x.value || '').trim().toLowerCase()).filter(Boolean));
                const textsB = valsB.map(x => (x.value || '').trim().toLowerCase()).filter(Boolean);
                if (textsB.some(t => textsA.has(t))) return true;
            }
        }
        return false;
    }

    // ── One side uses ONLY lineItem, other uses standard (or nothing) ─────────
    // Orthogonal scopes → NO overlap
    if (hasLineItemA && !hasStandardA) return false;
    if (hasLineItemB && !hasStandardB) return false;

    // ── Standard filter comparison ────────────────────────────────────────────
    // If either side has no standard filters → it catches everything → overlaps
    if (standardA.length === 0 || standardB.length === 0) return true;

    const standardMapA = Object.fromEntries(standardA);
    const standardMapB = Object.fromEntries(standardB);
    const sharedKeys = Object.keys(standardMapA).filter(k => standardMapB[k]);

    // No shared filter dimension → different axes don't restrict each other → overlap
    if (sharedKeys.length === 0) return true;

    for (const key of sharedKeys) {
        const setA = new Set(standardMapA[key]);
        const intersection = (standardMapB[key] || []).filter(v => setA.has(v));
        if (intersection.length > 0) return true;
    }

    return false;
};

/**
 * Return true when two product entries from two rules can conflict.
 * Products conflict when their names match (or either is ANY) AND their
 * property filters overlap.
 */
const productsConflict = (prodA, prodB) => {
    const nameA = normProduct(prodA.productName);
    const nameB = normProduct(prodB.productName);

    const namesMatch = nameA === 'ANY' || nameB === 'ANY' || nameA === nameB;
    if (!namesMatch) return false;

    return filtersOverlap(prodA.properties, prodB.properties);
};

/**
 * Return an array of overlapping product names if there's a conflict, or null if there is no conflict.
 * If both rules lack products, or either targets ANY and overlaps, returns ['ANY'].
 */
const getOverlappingProducts = (ruleA, ruleB) => {
    const prodsA = ruleA.products || [];
    const prodsB = ruleB.products || [];

    if (prodsA.length === 0 || prodsB.length === 0) {
        return ['ANY'];
    }

    const overlapping = [];
    for (const pA of prodsA) {
        for (const pB of prodsB) {
            if (productsConflict(pA, pB)) {
                const nameA = normProduct(pA.productName);
                const nameB = normProduct(pB.productName);
                let overlapName = 'ANY';
                if (nameA !== 'ANY' && nameB !== 'ANY') {
                    overlapName = nameA; // they are equal
                } else if (nameA !== 'ANY') {
                    overlapName = nameA;
                } else if (nameB !== 'ANY') {
                    overlapName = nameB;
                }
                overlapping.push(overlapName);
            }
        }
    }

    return overlapping.length > 0 ? Array.from(new Set(overlapping)) : null;
};

/**
 * Format the overlapping product names nicely for English descriptions.
 */
const formatOverlappingProducts = (products) => {
    if (!products || products.length === 0) return 'overlapping products';
    
    // If it's just ['ANY'], return 'overlapping products'
    if (products.length === 1 && products[0] === 'ANY') {
        return 'overlapping products';
    }

    const cleaned = Array.from(new Set(products.filter(p => p !== 'ANY'))).map(p => `"${p}"`);
    if (cleaned.length === 0) {
        return 'overlapping products';
    }

    if (cleaned.length === 1) {
        return `overlapping product ${cleaned[0]}`;
    }
    if (cleaned.length === 2) {
        return `overlapping products ${cleaned[0]} and ${cleaned[1]}`;
    }
    return `overlapping products ${cleaned.slice(0, -1).join(', ')}, and ${cleaned[cleaned.length - 1]}`;
};

/**
 * Determine conflict type and severity for two rules:
 *  - DUPLICATE_RULE  → same name + overlapping scope (error, highest priority)
 *  - SAME_GROUP      → same rule type, overlapping scope in same group (error)
 *  - DATE_OVERLAP    → cross-group, overlapping dates + scope (error or warning)
 */
const getSeverity = (ruleA, ruleB) => (ruleA.type === ruleB.type ? 'error' : 'warning');

/** Return true when two rules are exact duplicates (same name, same rule type) */
const areDuplicates = (ruleA, ruleB) => {
    const nameA = (ruleA.name || '').trim().toLowerCase();
    const nameB = (ruleB.name || '').trim().toLowerCase();
    return nameA.length > 0 && nameA === nameB;
};

/** Parse a date string 'YYYY-MM-DD' → Date (returns far future for empty endDates) */
const parseDate = (str, fallback) => {
    if (!str || str.trim() === '') return fallback;
    const d = new Date(str);
    return isNaN(d) ? fallback : d;
};

const FAR_FUTURE = new Date('9999-12-31');
const FAR_PAST   = new Date('1970-01-01');

/** Return true when two date ranges overlap (inclusive) */
const dateRangesOverlap = (start1, end1, start2, end2) => {
    const s1 = parseDate(start1, FAR_PAST);
    const e1 = parseDate(end1,   FAR_FUTURE);
    const s2 = parseDate(start2, FAR_PAST);
    const e2 = parseDate(end2,   FAR_FUTURE);
    return s1 <= e2 && s2 <= e1;
};

/** Generate a stable id from rule ids */
const makeId = (...ids) => ids.sort().join('::');

/**
 * Return true if a rule is completely empty / default placeholder.
 * A rule is empty if:
 * 1. It has no name.
 * 2. It has no adjustment value (empty string, or null/undefined).
 * 3. Its products are either empty, or it has a single product with an empty name and no property filters.
 */
const isEmptyRule = (rule) => {
    if (!rule) return true;
    if ((rule.name || '').trim() !== '') return false;
    if ((rule.adjustment || '').trim() !== '') return false;

    const prods = rule.products || [];
    if (prods.length === 0) return true;
    if (prods.length === 1) {
        const p = prods[0];
        const hasProductName = (p.productName || '').trim() !== '';
        const hasFilters = Object.values(p.properties || {}).some(
            (v) => Array.isArray(v) && v.length > 0
        );
        if (!hasProductName && !hasFilters) return true;
    }
    return false;
};

// ─── Main detector ───────────────────────────────────────────────────────────

/**
 * Detect all rule conflicts in a priceBook object.
 *
 * @param {object} priceBook – the full priceBook from state
 * @returns {Array} conflicts – array of conflict objects
 */
export function detectConflicts(priceBook) {
    if (!priceBook || !Array.isArray(priceBook.ruleGroups)) return [];

    const conflicts = [];
    const seen = new Set();
    const groups = priceBook.ruleGroups;

    // ── 1. Within-group conflicts ────────────────────────────────────────────
    for (const group of groups) {
        const rules = (group.rules || []).filter(r => !isEmptyRule(r));
        for (let i = 0; i < rules.length; i++) {
            for (let j = i + 1; j < rules.length; j++) {
                const rA = rules[i];
                const rB = rules[j];
                const id = makeId(rA.id, rB.id);
                if (seen.has(id)) continue;

                const overlapping = getOverlappingProducts(rA, rB);
                if (overlapping) {
                    seen.add(id);
                    const severity = getSeverity(rA, rB);
                    const typeLabel = severity === 'error'
                        ? 'Same rule type'
                        : 'Different rule types';

                    conflicts.push({
                        id,
                        severity,
                        type: 'SAME_GROUP',
                        description: `"${rA.name || 'Untitled Rule'}" and "${rB.name || 'Untitled Rule'}" in Rule Group target ${formatOverlappingProducts(overlapping)} with ${typeLabel.toLowerCase()}.`,
                        groupIds: [group.id],
                        ruleIds:  [rA.id, rB.id],
                        ruleNames: [rA.name || 'Untitled Rule', rB.name || 'Untitled Rule'],
                        groupIndex: groups.indexOf(group),
                        overlappingProducts: overlapping
                    });
                }
            }
        }
    }

    // ── 2. Cross-group date-overlap conflicts ────────────────────────────────
    for (let gi = 0; gi < groups.length; gi++) {
        for (let gj = gi + 1; gj < groups.length; gj++) {
            const gA = groups[gi];
            const gB = groups[gj];

            // Draft / incomplete groups without a defined start date cannot overlap
            if (!gA.startDate || gA.startDate.trim() === '' || !gB.startDate || gB.startDate.trim() === '') continue;

            if (!dateRangesOverlap(gA.startDate, gA.endDate, gB.startDate, gB.endDate)) continue;

            const rulesA = (gA.rules || []).filter(r => !isEmptyRule(r));
            const rulesB = (gB.rules || []).filter(r => !isEmptyRule(r));

            for (const rA of rulesA) {
                for (const rB of rulesB) {
                    const id = makeId(rA.id, rB.id);
                    if (seen.has(id)) continue;

                    const overlapping = getOverlappingProducts(rA, rB);
                    if (overlapping) {
                        seen.add(id);
                        const severity = getSeverity(rA, rB);

                        // Upgrade to DUPLICATE_RULE when names match
                        const isDupe = areDuplicates(rA, rB);

                        conflicts.push({
                            id,
                            severity: 'error',
                            type: isDupe ? 'DUPLICATE_RULE' : 'DATE_OVERLAP',
                            description: isDupe
                                ? `Duplicate rule "${rA.name || 'Untitled Rule'}" exists in Group ${gi + 1} and Group ${gj + 1} with identical name and overlapping product scope (${formatOverlappingProducts(overlapping).replace('overlapping ', '')}).`
                                : `"${rA.name || 'Untitled Rule'}" (Group ${gi + 1}) and "${rB.name || 'Untitled Rule'}" (Group ${gj + 1}) target ${formatOverlappingProducts(overlapping)} within overlapping date ranges.`,
                            groupIds:  [gA.id, gB.id],
                            ruleIds:   [rA.id, rB.id],
                            ruleNames: [rA.name || 'Untitled Rule', rB.name || 'Untitled Rule'],
                            groupIndices: [gi, gj],
                            overlappingProducts: overlapping,
                            ...(isDupe && { isDuplicate: true }),
                        });
                    }
                }
            }
        }
    }

    return conflicts;
}
