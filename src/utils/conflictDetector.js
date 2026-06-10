/**
 * conflictDetector.js
 * Analyses a priceBook state and returns a flat list of detected rule conflicts.
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Normalise a product name: empty / blank → 'ANY' */
const normProduct = (name) => (name || '').trim() || 'ANY';

/**
 * Helper to convert glob/wildcard pattern (using '*') to regex
 */
const globToRegex = (pattern) => {
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    const regexStr = '^' + escaped.replace(/\*/g, '.*') + '$';
    return new RegExp(regexStr, 'i');
};

const patternMatches = (pattern, str) => {
    return globToRegex(pattern).test(str);
};

/**
 * Normalise a usage-type pattern so that trailing wildcard qualifiers
 * after a colon are collapsed.  This makes *SpotUsage:* equivalent to
 * *SpotUsage* because the colon is just a qualifier separator in CH usage
 * type names and `:*` matches any (or no) qualifier.
 *
 * Examples:
 *   *SpotUsage:*  → *SpotUsage*
 *   *SpotUsage:g4dn*  unchanged  (specific qualifier — keep it)
 *   BoxUsage:*  → BoxUsage*
 */
const normalizeUsagePattern = (pattern) => {
    // Replace any occurrence of :* (colon followed immediately by a wildcard)
    // with just * so the colon qualifier is treated as optional.
    return pattern.replace(/:(\*)/g, '$1');
};

/**
 * Check if two patterns (which may contain wildcards like '*') can overlap.
 */
const patternsOverlap = (patA, patB) => {
    const a = normalizeUsagePattern(patA.trim());
    const b = normalizeUsagePattern(patB.trim());
    if (a === '*' || b === '*') return true;

    const la = a.toLowerCase();
    const lb = b.toLowerCase();

    if (la === lb) return true;

    const hasWildA = la.includes('*');
    const hasWildB = lb.includes('*');

    if (!hasWildA && !hasWildB) {
        return la === lb;
    }

    if (!hasWildA) return patternMatches(b, la);
    if (!hasWildB) return patternMatches(a, lb);

    // Both have wildcards: check suffix wildcards (e.g. *suffix)
    if (la.startsWith('*') && !la.slice(1).includes('*') && lb.startsWith('*') && !lb.slice(1).includes('*')) {
        const sufA = la.slice(1);
        const sufB = lb.slice(1);
        return sufA.endsWith(sufB) || sufB.endsWith(sufA);
    }

    // Check prefix wildcards (e.g. prefix*)
    if (la.endsWith('*') && !la.slice(0, -1).includes('*') && lb.endsWith('*') && !lb.slice(0, -1).includes('*')) {
        const preA = la.slice(0, -1);
        const preB = lb.slice(0, -1);
        return preA.startsWith(preB) || preB.startsWith(preA);
    }

    // If one is prefix* and the other is *suffix, they overlap (e.g. prefix + suffix matches both)
    if (la.endsWith('*') && !la.slice(0, -1).includes('*') && lb.startsWith('*') && !lb.slice(1).includes('*')) {
        return true;
    }
    if (lb.endsWith('*') && !lb.slice(0, -1).includes('*') && la.startsWith('*') && !la.slice(1).includes('*')) {
        return true;
    }

    return true;
};

/**
 * Check if two values (either string or instanceProperty object) can overlap.
 */
const valuesOverlap = (valA, valB) => {
    if (typeof valA === 'string' && typeof valB === 'string') {
        return patternsOverlap(valA, valB);
    }
    if (typeof valA === 'object' && valA !== null && typeof valB === 'object' && valB !== null) {
        const typeMatch = !valA.type || !valB.type || valA.type.toLowerCase() === valB.type.toLowerCase();
        const sizeMatch = !valA.size || !valB.size || valA.size.toLowerCase() === valB.size.toLowerCase();
        const reservedMatch = !valA.reserved || !valB.reserved || valA.reserved === valB.reserved;
        return typeMatch && sizeMatch && reservedMatch;
    }
    return valA === valB;
};

/**
 * Check if value a is more generic than or equal to value b.
 */
const valueIsMoreGenericOrEqual = (valA, valB) => {
    if (typeof valA === 'string' && typeof valB === 'string') {
        const a = normalizeUsagePattern(valA.trim());
        const b = normalizeUsagePattern(valB.trim());
        if (a === '*') return true;
        const la = a.toLowerCase();
        const lb = b.toLowerCase();
        if (la === lb) return true;

        const hasWildA = la.includes('*');
        const hasWildB = lb.includes('*');

        if (!hasWildA) return false;
        if (!hasWildB) return patternMatches(a, lb);

        if (la.startsWith('*') && !la.slice(1).includes('*') && lb.startsWith('*') && !lb.slice(1).includes('*')) {
            return lb.endsWith(la.slice(1));
        }

        if (la.endsWith('*') && !la.slice(0, -1).includes('*') && lb.endsWith('*') && !lb.slice(0, -1).includes('*')) {
            return lb.startsWith(la.slice(0, -1));
        }

        return globToRegex(la).test(lb.replace(/\*/g, ''));
    }
    
    if (typeof valA === 'object' && valA !== null && typeof valB === 'object' && valB !== null) {
        const typeCompatible = !valA.type || (valB.type && valA.type.toLowerCase() === valB.type.toLowerCase());
        const sizeCompatible = !valA.size || (valB.size && valA.size.toLowerCase() === valB.size.toLowerCase());
        const reservedCompatible = !valA.reserved || valA.reserved === valB.reserved;
        return typeCompatible && sizeCompatible && reservedCompatible;
    }
    
    return valA === valB;
};

/**
 * Check if two values are identical in content.
 */
const valuesIdentical = (valA, valB) => {
    if (typeof valA === 'string' && typeof valB === 'string') {
        return valA.toLowerCase() === valB.toLowerCase();
    }
    if (typeof valA === 'object' && valA !== null && typeof valB === 'object' && valB !== null) {
        return (valA.type || '') === (valB.type || '') &&
               (valA.size || '') === (valB.size || '') &&
               (valA.reserved || '') === (valB.reserved || '');
    }
    return valA === valB;
};

/**
 * Categorise a property values array:
 *  'lineItem'  → objects like { matchType, value }  (LineItemDescription filter)
 *  'standard'  → plain strings or objects  (Region, UsageType, InstanceType, etc.)
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
 *  3. Standard filter comparison: two rules only overlap if their filters overlap in EVERY
 *     shared dimension key. If ANY shared dimension key is completely disjoint, they do not overlap.
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

    const isUnrestrictedA = !hasLineItemA && !hasStandardA;
    const isUnrestrictedB = !hasLineItemB && !hasStandardB;

    if (isUnrestrictedA || isUnrestrictedB) return true;

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

    // ── One side uses ONLY lineItem, other uses standard ──────────────────────
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

    // Two rules only overlap if their filters overlap in EVERY shared dimension.
    // If ANY shared dimension is completely disjoint, they do not overlap.
    for (const key of sharedKeys) {
        const listA = standardMapA[key] || [];
        const listB = standardMapB[key] || [];
        
        let keyOverlaps = false;
        for (const a of listA) {
            for (const b of listB) {
                if (valuesOverlap(a, b)) {
                    keyOverlaps = true;
                    break;
                }
            }
            if (keyOverlaps) break;
        }
        
        if (!keyOverlaps) return false;
    }

    return true;
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

/** Return true when two rules are exact duplicates (same rule type and identical product scope, ignoring name) */
const areDuplicates = (ruleA, ruleB) => {
    if (ruleA.type !== ruleB.type) return false;
    return isRuleMoreGenericOrEqual(ruleA, ruleB) && isRuleMoreGenericOrEqual(ruleB, ruleA);
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

/**
 * Return true if prodA is more generic than or equal to prodB.
 */
const isProductMoreGenericOrEqual = (prodA, prodB) => {
    const nameA = normProduct(prodA.productName);
    const nameB = normProduct(prodB.productName);

    const nameCompatible = nameA === 'ANY' || nameA === nameB;
    if (!nameCompatible) return false;

    const propsA = prodA.properties || {};
    const propsB = prodB.properties || {};

    const keysA = Object.keys(propsA).filter(k => Array.isArray(propsA[k]) && propsA[k].length > 0);
    const keysB = Object.keys(propsB).filter(k => Array.isArray(propsB[k]) && propsB[k].length > 0);

    const allKeys = Array.from(new Set([...keysA, ...keysB]));

    for (const key of allKeys) {
        const valA = propsA[key];
        const valB = propsB[key];

        const classA = classifyProp(valA);
        const classB = classifyProp(valB);

        // If prodA has no filter on this key, it matches any value, so it is more generic on this key
        if (classA === 'empty') continue;

        // If prodA has a filter but prodB does not, prodA is more specific on this key
        if (classB === 'empty') return false;

        // If they filter differently, not more generic
        if (classA !== classB) return false;

        if (classA === 'standard') {
            const covered = valB.every(vB => valA.some(vA => valueIsMoreGenericOrEqual(vA, vB)));
            if (!covered) return false;
        } else if (classA === 'lineItem') {
            const setA = new Set(valA.map(x => (x.value || '').trim().toLowerCase()).filter(Boolean));
            const textsB = valB.map(x => (x.value || '').trim().toLowerCase()).filter(Boolean);
            if (textsB.some(t => !setA.has(t))) return false;
        }
    }

    return true;
};

/**
 * Return true if ruleA is more generic than or equal to ruleB.
 */
const isRuleMoreGenericOrEqual = (ruleA, ruleB) => {
    const prodsA = ruleA.products || [];
    const prodsB = ruleB.products || [];

    // If ruleA has no products, it targets everything (ANY)
    if (prodsA.length === 0) return true;
    // If ruleB has no products but ruleA does, ruleA is more specific
    if (prodsB.length === 0) return false;

    // ruleA is more generic than or equal to ruleB if every product filter in ruleB
    // is covered by a more generic or equal product filter in ruleA.
    return prodsB.every(pB => {
        return prodsA.some(pA => isProductMoreGenericOrEqual(pA, pB));
    });
};

/**
 * Return true if two property filter sets are identical in content.
 */
const arePropertiesIdentical = (propsA, propsB) => {
    const keysA = Object.keys(propsA || {}).filter(k => Array.isArray(propsA[k]) && propsA[k].length > 0).sort();
    const keysB = Object.keys(propsB || {}).filter(k => Array.isArray(propsB[k]) && propsB[k].length > 0).sort();

    if (keysA.length !== keysB.length) return false;
    for (let i = 0; i < keysA.length; i++) {
        if (keysA[i] !== keysB[i]) return false;
        const key = keysA[i];
        const valA = propsA[key];
        const valB = propsB[key];

        const classA = classifyProp(valA);
        const classB = classifyProp(valB);
        if (classA !== classB) return false;

        if (classA === 'standard') {
            if (valB.length !== valA.length) return false;
            const matchesAll = valB.every(vB => valA.some(vA => valuesIdentical(vA, vB)));
            if (!matchesAll) return false;
        } else if (classA === 'lineItem') {
            const setA = new Set(valA.map(x => (x.value || '').trim().toLowerCase()).filter(Boolean));
            const textsB = valB.map(x => (x.value || '').trim().toLowerCase()).filter(Boolean);
            if (textsB.length !== setA.size || textsB.some(t => !setA.has(t))) return false;
        }
    }
    return true;
};

/**
 * Return true if two product declarations have the identical name and identical properties filters.
 */
const areProductsIdentical = (pA, pB) => {
    if (normProduct(pA.productName) !== normProduct(pB.productName)) return false;
    return arePropertiesIdentical(pA.properties, pB.properties);
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

    // ── 1. Group Chronological & Date Sanity Checks ──────────────────────────
    for (const group of groups) {
        if (group.startDate && group.endDate) {
            const start = new Date(group.startDate);
            const end = new Date(group.endDate);
            if (!isNaN(start) && !isNaN(end) && start > end) {
                conflicts.push({
                    id: `date-error::${group.id}`,
                    severity: 'error',
                    type: 'CHRONOLOGICAL_ERROR',
                    description: `Rule Group "${group.name || 'Untitled Group'}" has an invalid range: start date (${group.startDate}) is after end date (${group.endDate}).`,
                    groupIds: [group.id],
                    ruleIds: [],
                    ruleNames: [],
                    groupIndex: groups.indexOf(group)
                });
            }
        }
    }

    // ── 2. Within-group conflicts & Sequential Shadowing ──────────────────────
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
                    const isShadowed = isRuleMoreGenericOrEqual(rA, rB);
                    const severity = getSeverity(rA, rB);

                    // ── Exclusion / carve-out pattern ─────────────────────────
                    // If one rule has a 0 adjustment and a strictly narrower scope
                    // than the other (it doesn't cover everything the other covers),
                    // it's an intentional override/exclusion — not a real conflict.
                    const adjA = parseFloat(rA.adjustment);
                    const adjB = parseFloat(rB.adjustment);
                    const aIsZeroCarveOut = adjA === 0 && !isRuleMoreGenericOrEqual(rA, rB);
                    const bIsZeroCarveOut = adjB === 0 && !isRuleMoreGenericOrEqual(rB, rA);
                    if (aIsZeroCarveOut || bIsZeroCarveOut) continue;
                    // ─────────────────────────────────────────────────────────

                    if (isShadowed) {
                        seen.add(id);
                        conflicts.push({
                            id,
                            severity,
                            type: 'SEQUENTIAL_SHADOWING',
                            description: `Rule "${rB.name || 'Untitled Rule'}" is shadowed by a broader rule "${rA.name || 'Untitled Rule'}" above it in Group "${group.name || 'Untitled Group'}". Since rules are evaluated top-down sequentially, "${rB.name || 'Untitled Rule'}" will never be reached for ${formatOverlappingProducts(overlapping)}.`,
                            groupIds: [group.id],
                            ruleIds:  [rA.id, rB.id],
                            ruleNames: [rA.name || 'Untitled Rule', rB.name || 'Untitled Rule'],
                            groupIndex: groups.indexOf(group),
                            overlappingProducts: overlapping
                        });
                    } else {
                        seen.add(id);
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
    }

    // ── 3. Redundant Product Filter Checks ──────────────────────────────────
    for (const group of groups) {
        const rules = (group.rules || []).filter(r => !isEmptyRule(r));
        for (const rule of rules) {
            const prods = rule.products || [];
            for (let i = 0; i < prods.length; i++) {
                for (let j = i + 1; j < prods.length; j++) {
                    if (areProductsIdentical(prods[i], prods[j])) {
                        const prodName = prods[i].productName || 'ANY';
                        const id = `redundant-prod::${rule.id}::${i}::${j}`;
                        if (!seen.has(id)) {
                            seen.add(id);
                            conflicts.push({
                                id,
                                severity: 'warning',
                                type: 'REDUNDANT_PRODUCT_FILTER',
                                description: `Rule "${rule.name || 'Untitled Rule'}" in Group "${group.name || 'Untitled Group'}" contains redundant duplicate product scope specifications for "${prodName}". Consider merging these duplicate scope blocks.`,
                                groupIds: [group.id],
                                ruleIds: [rule.id],
                                ruleNames: [rule.name || 'Untitled Rule'],
                                groupIndex: groups.indexOf(group)
                            });
                        }
                    }
                }
            }
        }
    }

    // ── 4. Billing Coverage Gap Detector (Pricing "Dead Zones") ──────────────
    const activeGroups = groups
        .filter(g => g.startDate && g.startDate.trim() !== '')
        .map((g, idx) => ({
            group: g,
            originalIndex: idx,
            start: new Date(g.startDate),
            end: g.endDate && g.endDate.trim() !== '' ? new Date(g.endDate) : FAR_FUTURE
        }))
        .sort((a, b) => a.start - b.start);

    for (let i = 0; i < activeGroups.length - 1; i++) {
        const curr = activeGroups[i];
        const next = activeGroups[i + 1];
        if (curr.group.endDate && curr.end < next.start) {
            const diffMs = next.start.getTime() - curr.end.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) - 1;
            if (diffDays >= 1) {
                const id = `coverage-gap::${curr.group.id}::${next.group.id}`;
                if (!seen.has(id)) {
                    seen.add(id);
                    conflicts.push({
                        id,
                        severity: 'warning',
                        type: 'COVERAGE_GAP',
                        description: `A billing coverage gap of ${diffDays} day(s) exists between Group "${curr.group.name || `Group ${curr.originalIndex + 1}`}" (ends ${curr.group.endDate}) and Group "${next.group.name || `Group ${next.originalIndex + 1}`}" (starts ${next.group.startDate}). Cost items in this gap will revert to standard retail prices.`,
                        groupIds: [curr.group.id, next.group.id],
                        ruleIds: [],
                        ruleNames: [],
                        groupIndex: curr.originalIndex
                    });
                }
            }
        }
    }

    // ── 5. Adjustment Sanity & Extreme Pricing Guardrails ────────────────────
    for (const group of groups) {
        const rules = (group.rules || []).filter(r => !isEmptyRule(r));
        for (const rule of rules) {
            const val = parseFloat(rule.adjustment);
            if (rule.adjustment && !isNaN(val)) {
                const idPrefix = `sanity::${rule.id}`;

                if (rule.type === 'percentDiscount') {
                    if (val === 100) {
                        const id = `${idPrefix}::100percent`;
                        if (!seen.has(id)) {
                            seen.add(id);
                            conflicts.push({
                                id,
                                severity: 'warning',
                                type: 'ADJUSTMENT_SANITY',
                                description: `Rule "${rule.name || 'Untitled Rule'}" in Group "${group.name || 'Untitled Group'}" specifies a 100% discount. This will zero out the matching billing line item (even if it is a credit or a negative charge). Ensure this is intended.`,
                                groupIds: [group.id],
                                ruleIds: [rule.id],
                                ruleNames: [rule.name || 'Untitled Rule'],
                                groupIndex: groups.indexOf(group)
                           });
                        }
                    } else if (val > 100) {
                        const id = `${idPrefix}::over100percent`;
                        if (!seen.has(id)) {
                            seen.add(id);
                            conflicts.push({
                                id,
                                severity: 'warning',
                                type: 'ADJUSTMENT_SANITY',
                                description: `Rule "${rule.name || 'Untitled Rule'}" in Group "${group.name || 'Untitled Group'}" has a discount of ${val}%, which is greater than 100%. Verify if this is correct.`,
                                groupIds: [group.id],
                                ruleIds: [rule.id],
                                ruleNames: [rule.name || 'Untitled Rule'],
                                groupIndex: groups.indexOf(group)
                            });
                        }
                    } else if (val < 0) {
                        const id = `${idPrefix}::negDiscount`;
                        if (!seen.has(id)) {
                            seen.add(id);
                            conflicts.push({
                                id,
                                severity: 'warning',
                                type: 'ADJUSTMENT_SANITY',
                                description: `Rule "${rule.name || 'Untitled Rule'}" has a negative discount of ${val}%. For markups, use a Percent Increase rule type instead.`,
                                groupIds: [group.id],
                                ruleIds: [rule.id],
                                ruleNames: [rule.name || 'Untitled Rule'],
                                groupIndex: groups.indexOf(group)
                            });
                        }
                    }
                } else if (rule.type === 'percentIncrease') {
                   if (val > 500) {
                       const id = `${idPrefix}::highIncrease`;
                       if (!seen.has(id)) {
                           seen.add(id);
                           conflicts.push({
                               id,
                               severity: 'warning',
                               type: 'ADJUSTMENT_SANITY',
                               description: `Rule "${rule.name || 'Untitled Rule'}" specifies an exceptionally high price increase of ${val}%. Verify if this markup is intended.`,
                               groupIds: [group.id],
                               ruleIds: [rule.id],
                               ruleNames: [rule.name || 'Untitled Rule'],
                               groupIndex: groups.indexOf(group)
                           });
                       }
                   } else if (val < 0) {
                       const id = `${idPrefix}::negIncrease`;
                       if (!seen.has(id)) {
                           seen.add(id);
                           conflicts.push({
                               id,
                               severity: 'warning',
                               type: 'ADJUSTMENT_SANITY',
                               description: `Rule "${rule.name || 'Untitled Rule'}" specifies a negative price increase of ${val}%. For discounts, use a Percent Discount rule type instead.`,
                               groupIds: [group.id],
                               ruleIds: [rule.id],
                               ruleNames: [rule.name || 'Untitled Rule'],
                               groupIndex: groups.indexOf(group)
                           });
                       }
                   }
                } else if (rule.type === 'fixedRate') {
                   if (val < 0) {
                       const id = `${idPrefix}::negFixed`;
                       if (!seen.has(id)) {
                           seen.add(id);
                           conflicts.push({
                               id,
                               severity: 'warning',
                               type: 'ADJUSTMENT_SANITY',
                               description: `Rule "${rule.name || 'Untitled Rule'}" specifies a negative Fixed Rate of $${val}. Verify if this is correct.`,
                               groupIds: [group.id],
                               ruleIds: [rule.id],
                               ruleNames: [rule.name || 'Untitled Rule'],
                               groupIndex: groups.indexOf(group)
                           });
                       }
                   } else if (val > 10000) {
                       const id = `${idPrefix}::highFixed`;
                       if (!seen.has(id)) {
                           seen.add(id);
                           conflicts.push({
                               id,
                               severity: 'warning',
                               type: 'ADJUSTMENT_SANITY',
                               description: `Rule "${rule.name || 'Untitled Rule'}" specifies a very high Fixed Rate of $${val}. Verify if this is correct.`,
                               groupIds: [group.id],
                               ruleIds: [rule.id],
                               ruleNames: [rule.name || 'Untitled Rule'],
                               groupIndex: groups.indexOf(group)
                           });
                       }
                   }
                }
            }
        }
    }

    // ── 6. Cross-group date-overlap conflicts ────────────────────────────────
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
                        const isDupe = areDuplicates(rA, rB);
                        const isShadowed = isRuleMoreGenericOrEqual(rA, rB);

                        if (isDupe || isShadowed) {
                            seen.add(id);

                            const areNamesEqual = rA.name && rB.name && rA.name.trim().toLowerCase() === rB.name.trim().toLowerCase();

                            conflicts.push({
                                id,
                                severity: 'error',
                                type: isDupe ? 'DUPLICATE_RULE' : 'SHADOWING',
                                description: isDupe
                                    ? (areNamesEqual
                                        ? `Duplicate rule "${rA.name || 'Untitled Rule'}" exists in Group ${gi + 1} and Group ${gj + 1} with identical product scope (${formatOverlappingProducts(overlapping).replace('overlapping ', '')}).`
                                        : `Duplicate rules "${rA.name || 'Untitled Rule'}" (Group ${gi + 1}) and "${rB.name || 'Untitled Rule'}" (Group ${gj + 1}) exist with identical product scope (${formatOverlappingProducts(overlapping).replace('overlapping ', '')}).`)
                                    : `Rule "${rB.name || 'Untitled Rule'}" (Group ${gj + 1}) is shadowed by a broader rule "${rA.name || 'Untitled Rule'}" (Group ${gi + 1}) above it. Since Group ${gi + 1} evaluates first, this rule will never be reached for ${formatOverlappingProducts(overlapping)}.`,
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
    }

    return conflicts;
}
