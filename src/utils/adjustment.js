/**
 * Formats a billing adjustment value safely without IEEE 754 floating-point precision corruption.
 * - Preserves exact user input (e.g. "-18895.29" remains "-18895.29").
 * - Cleans up existing float precision artifacts (e.g. "-18895.290000000001" -> "-18895.29").
 * - Expands scientific notation (e.g. "7.5e-7" -> "0.00000075") to avoid XML schema issues.
 * - Defaults empty/null/undefined to "0.00".
 */
export const formatAdjustment = (adj) => {
    if (adj === undefined || adj === null || adj === '') return '0.00';
    let str = String(adj).trim();
    if (!str) return '0.00';

    const num = parseFloat(str);
    if (isNaN(num)) return str;

    // 1. If in scientific notation (e.g. "7.5e-7"), expand to decimal format
    if (/[eE]/.test(str)) {
        const expMatch = str.match(/[eE]([-+]?\d+)/);
        const exp = expMatch ? parseInt(expMatch[1], 10) : 0;
        const decimals = exp < 0 ? Math.min(20, Math.abs(exp) + 4) : 0;
        return num.toFixed(decimals).replace(/\.?0+$/, '');
    }

    // 2. If it has floating-point precision artifacts from IEEE 754 conversions
    // (e.g. "-18895.290000000001", "1000.289999999999", "0.030000000000000002")
    if (/\.\d*(?:0{5,}\d+|9{5,}\d+)$/.test(str)) {
        const normalized = Number(num.toPrecision(12));
        let clean = normalized.toString();
        if (/[eE]/.test(clean)) {
            clean = normalized.toFixed(12).replace(/\.?0+$/, '');
        }
        return clean;
    }

    // 3. Otherwise, preserve the exact input string
    return str;
};
