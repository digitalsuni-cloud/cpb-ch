import { v4 as uuidv4 } from 'uuid';
import { propertyTypes } from '../constants/propertyTypes';
import { createBillingRule, createProduct, createRuleGroup } from '../context/PriceBookContext';

const getXmlTag = (key) => {
    switch (key) {
        case 'region': return 'Region';
        case 'usageType': return 'UsageType';
        case 'operation': return 'Operation';
        case 'recordType': return 'RecordType';
        case 'savingsPlanOfferingType': return 'SavingsPlanOfferingType';
        case 'instanceProperty': return 'InstanceProperties';
        case 'lineItemDescription': return 'LineItemDescription';
        default: return key;
    }
};

export const generateXML = (priceBook) => {
    const today = new Date().toISOString().split('T')[0];
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<CHTBillingRules createdBy="${priceBook.createdBy}" date="${today}">\n`;
    if (priceBook.comment) xml += `\t<Comment>${priceBook.comment}</Comment>\n`;

    priceBook.ruleGroups.forEach(group => {
        // Filter out groups without a start date
        if (!group.startDate) return;

        let startDate = group.startDate;

        // Filter out rules without a name
        const validRules = group.rules.filter(r => r.name && r.name.trim() !== '');

        // Optional: If a group ends up empty, do we skip it? User didn't strictly say so, but it makes sense.
        // However, user said "unless they have startDate OR Rule Name".
        // Actually, "unless they have startDate or Rule Name" might apply to respective objects.
        // Valid Group = has Start Date. Valid Rule = has Name.

        let groupXml = `\t<RuleGroup startDate="${startDate}"`;
        if (group.endDate) groupXml += ` endDate="${group.endDate}"`;
        if (group.payerAccounts && group.payerAccounts.trim()) groupXml += ` payerAccounts="${group.payerAccounts.trim()}"`;
        if (group.enabled === "false") groupXml += ` enabled="false"`;
        groupXml += `>\n`;

        let hasRules = false;
        validRules.forEach(rule => {
            hasRules = true;
            let ruleTag = `\t\t<BillingRule name="${rule.name}" includeDataTransfer="${rule.includeDataTransfer}"`;
            // Only toggle off if explicitly false, otherwise default (true) is assumed/omitted
            if (rule.includeRIPurchases === "false") ruleTag += ` includeRIPurchases="false"`;
            groupXml += ruleTag + `>\n`;

            const ruleAdjustment = rule.adjustment ? parseFloat(rule.adjustment).toFixed(12).replace(/\.?0+$/, '') : '0.00';
            groupXml += `\t\t\t<BasicBillingRule billingAdjustment="${ruleAdjustment}" billingRuleType="${rule.type || 'percentDiscount'}" />\n`;

            (rule.products || []).forEach(prod => {
                const productName = prod.productName || 'ANY';
                let prodTag = `\t\t\t<Product productName="${productName}"`;
                // Only include if value is NOT 'inherit'
                if (prod.includeDataTransfer && prod.includeDataTransfer !== 'inherit') prodTag += ` includeDataTransfer="${prod.includeDataTransfer}"`;
                if (prod.includeRIPurchases && prod.includeRIPurchases !== 'inherit') prodTag += ` includeRIPurchases="${prod.includeRIPurchases}"`;
                groupXml += prodTag;

                let subTags = '';
                if (prod.properties) {
                    // Order matters for XML validity/consistency in some systems, though standard XML doesn't care. 
                    // Following script.js order:
                    const propertyOrder = [
                        'region', 'usageType', 'operation', 'recordType',
                        'savingsPlanOfferingType', 'instanceProperty', 'lineItemDescription'
                    ];

                    propertyOrder.forEach(key => {
                        const values = prod.properties[key];
                        if (!values || values.length === 0) return;

                        const tag = getXmlTag(key);
                        const config = propertyTypes[key];

                        if (config.type === 'standard') {
                            values.forEach(val => {
                                if (val && typeof val === 'string' && val.trim() !== '') {
                                    subTags += `\n\t\t\t\t<${tag} name="${val.trim()}" />`;
                                }
                            });
                        } else if (config.type === 'instance') {
                            values.forEach(val => {
                                if (val.type || val.size || val.reserved) {
                                    let iTag = `\n\t\t\t\t<${tag}`;
                                    if (val.type) iTag += ` instanceType="${val.type.trim()}"`;
                                    if (val.size) iTag += ` instanceSize="${val.size.trim()}"`;
                                    iTag += ` reserved="${val.reserved === 'true'}" />`; // script.js Logic: reserved="${reserved}" where reserved is bool
                                    subTags += iTag;
                                }
                            });
                        } else if (config.type === 'lineItem') {
                            values.forEach(val => {
                                if (val.value && val.value.trim() !== '') {
                                    subTags += `\n\t\t\t\t<${tag} ${val.matchType}="${val.value.trim()}" />`;
                                }
                            });
                        }
                    });
                }

                if (subTags) {
                    groupXml += `>${subTags}\n\t\t\t</Product>\n`;
                } else {
                    groupXml += ` />\n`;
                }
            });
            groupXml += `\t\t</BillingRule>\n`;
        });
        groupXml += `\t</RuleGroup>\n`;

        // Append group only if it's valid (based on our filtering)
        xml += groupXml;
    });
    xml += `</CHTBillingRules>`;
    // Convert tabs to 2 spaces for compact indentation
    return xml.replace(/\t/g, '  ');
};

export const generateJSON = (priceBook) => {
    const xml = generateXML(priceBook);

    const jsonObj = {
        book_name: priceBook.bookName || '',
        specification: xml
    };

    return JSON.stringify(jsonObj, null, 2);
};

export const generateCURL = (priceBook) => {
    const jsonString = generateJSON(priceBook);
    const shellSafeJson = jsonString.replace(/'/g, "'\\''");
    return `curl -X POST https://chapi.cloudhealthtech.com/v1/price_books \\\n  -H "Authorization: Bearer <YOUR_API_TOKEN>" \\\n  -H "Content-Type: application/json" \\\n  -d '${shellSafeJson}'`;
};

// New deployment-focused output generators
export const getDeploymentSteps = (priceBook) => {
    const customerId = priceBook.customerApiId || '<CUSTOMER_API_ID>';
    const priceBookId = priceBook.cxAPIId || '<PRICE_BOOK_ID>';
    const rawPayer = priceBook.cxPayerId ? priceBook.cxPayerId.trim() : '';
    const payerIds = rawPayer ? rawPayer.split(',').map(id => id.trim()).filter(id => id) : [];

    // Resolve billing_account_owner_id:
    // - empty / "ALL" → use string "ALL"
    // - actual IDs → use array of IDs
    const billingOwner = (payerIds.length === 0 || (payerIds.length === 1 && payerIds[0].toUpperCase() === 'ALL'))
        ? 'ALL'
        : payerIds;

    const json = {
        step1: generateJSON(priceBook),
        step2: JSON.stringify({ price_book_id: priceBookId, client_api_id: customerId }, null, 2),
        step3: JSON.stringify({
            price_book_assignment_id: "<ASSIGNMENT_ID>",
            billing_account_owner_id: billingOwner,
            target_client_api_id: customerId
        }, null, 2)
    };

    const curl = {
        step1: generateCURL(priceBook),
        step2: `curl -X POST https://chapi.cloudhealthtech.com/v1/price_book_assignments \\\n  -H "Authorization: Bearer <YOUR_API_TOKEN>" \\\n  -H "Content-Type: application/json" \\\n  -d '{"price_book_id": "${priceBookId}", "client_api_id": "${customerId}"}'`,
        step3: `curl -X POST https://chapi.cloudhealthtech.com/v1/price_book_account_assignments \\\n  -H "Authorization: Bearer <YOUR_API_TOKEN>" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify({
            price_book_assignment_id: "<ASSIGNMENT_ID>",
            billing_account_owner_id: billingOwner,
            target_client_api_id: customerId
        })}'`
    };

    return { json, curl };
};

export const parseXMLToState = (xmlString, fallbackJson = {}) => {
    // Sanitize common XML errors before parsing (like unescaped ampersands)
    const sanitizedXml = xmlString.replace(/&(?!amp;|lt;|gt;|apos;|quot;|#x?[0-9a-fA-F]+;|#\d+;)/g, '&amp;');

    const parser = new DOMParser();
    let xmlDoc = parser.parseFromString(sanitizedXml, 'application/xml');

    // If the strict XML parser fails (e.g. unclosed tags), fall back to the lenient
    // HTML parser which auto-recovers from structural errors. getElementsByTagName
    // still works correctly on the resulting document.
    if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
        const htmlDoc = parser.parseFromString(sanitizedXml, 'text/html');
        if (htmlDoc.getElementsByTagName('CHTBillingRules').length > 0) {
            xmlDoc = htmlDoc;
        } else {
            throw new Error('Invalid XML – could not find a valid CHTBillingRules document.');
        }
    }

    // Use getElementsByTagName so it works in both XML-doc and HTML-doc modes
    const root = xmlDoc.getElementsByTagName('CHTBillingRules')[0] || xmlDoc.documentElement;
    // HTML parser lowercases attribute names, so check both cases
    const createdBy = root.getAttribute('createdby') || root.getAttribute('createdBy') || fallbackJson.created_by || '';
    const bookName = root.getAttribute('name') || fallbackJson.book_name || '';
    const date = root.getAttribute('date') || '';
    const comment = root.getAttribute('comment') || root.querySelector('Comment,comment')?.textContent || '';

    const ruleGroups = Array.from(xmlDoc.getElementsByTagName('RuleGroup')).map(groupEl => {
        const group = createRuleGroup();
        group.startDate = groupEl.getAttribute('startDate') || '';
        group.endDate = groupEl.getAttribute('endDate') || '';
        group.payerAccounts = groupEl.getAttribute('payerAccounts') || '';
        group.enabled = groupEl.getAttribute('enabled') || 'true';
        group.collapsed = true;

        const billingRules = Array.from(groupEl.getElementsByTagName('BillingRule'));
        group.rules = billingRules.map(ruleEl => {
            const rule = createBillingRule();
            rule.name = ruleEl.getAttribute('name') || '';
            rule.includeDataTransfer = ruleEl.getAttribute('includeDataTransfer') || 'false';
            rule.includeRIPurchases = ruleEl.getAttribute('includeRIPurchases') || 'true';
            rule.collapsed = true;

            const basic = ruleEl.getElementsByTagName('BasicBillingRule')[0];
            if (basic) {
                rule.adjustment = basic.getAttribute('billingAdjustment') || '';
                rule.type = basic.getAttribute('billingRuleType') || 'percentDiscount';
            }

            const productEls = Array.from(ruleEl.getElementsByTagName('Product'));
            if (productEls.length > 0) {
                rule.products = productEls.map(product => {
                    const prod = createProduct();
                    prod.productName = product.getAttribute('productName') || '';
                    prod.includeDataTransfer = product.getAttribute('includeDataTransfer') || '';
                    prod.includeRIPurchases = product.getAttribute('includeRIPurchases') || 'inherit';

                    Object.keys(propertyTypes).forEach(key => {
                        const tag = getXmlTag(key);
                        const typeConfig = propertyTypes[key];
                        const elements = Array.from(product.getElementsByTagName(tag));

                        if (elements.length > 0) {
                            prod.properties[key] = [];
                            elements.forEach(el => {
                                if (typeConfig.type === 'standard') {
                                    prod.properties[key].push(el.getAttribute('name'));
                                } else if (typeConfig.type === 'instance') {
                                    prod.properties[key].push({
                                        type: el.getAttribute('instanceType') || '',
                                        size: el.getAttribute('instanceSize') || '',
                                        reserved: el.getAttribute('reserved') === 'true' ? 'true' : 'false'
                                    });
                                } else if (typeConfig.type === 'lineItem') {
                                    ['contains', 'startsWith', 'matchesRegex'].forEach(matchType => {
                                        if (el.hasAttribute(matchType)) {
                                            prod.properties[key].push({ matchType, value: el.getAttribute(matchType) });
                                        }
                                    });
                                }
                            });
                        }
                    });
                    return prod;
                });
            }
            return rule;
        });
        return group;
    });

    return {
        bookName,
        createdBy,
        lastUpdated: date,
        comment,
        cxAPIId: fallbackJson.cxAPIId || fallbackJson.client_api_id || '',
        customerApiId: fallbackJson.customerApiId || '',
        cxPayerId: fallbackJson.cxPayerId || '',
        ruleGroups
    };
};
