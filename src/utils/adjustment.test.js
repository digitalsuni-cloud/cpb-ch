import assert from 'node:assert';
import { formatAdjustment } from './adjustment.js';

// 1. Exact user issue: -18895.29 must NOT become -18895.290000000001
assert.strictEqual(formatAdjustment("-18895.29"), "-18895.29");
assert.strictEqual(formatAdjustment("-18895.290000000001"), "-18895.29");
assert.strictEqual(formatAdjustment("18895.290000000001"), "18895.29");

// 2. IEEE 754 precision artifacts from other float edge cases
assert.strictEqual(formatAdjustment("1000.289999999999"), "1000.29");
assert.strictEqual(formatAdjustment("0.030000000000000002"), "0.03");

// 3. Small decimals and scientific notation expansion
assert.strictEqual(formatAdjustment("0.00000075"), "0.00000075");
assert.strictEqual(formatAdjustment("7.5e-7"), "0.00000075");
assert.strictEqual(formatAdjustment("-7.5e-7"), "-0.00000075");
assert.strictEqual(formatAdjustment("1e-7"), "0.0000001");
assert.strictEqual(formatAdjustment("1e-14"), "0.00000000000001");

// 4. Standard numbers, decimals, and zeros
assert.strictEqual(formatAdjustment("0"), "0");
assert.strictEqual(formatAdjustment("0.00"), "0.00");
assert.strictEqual(formatAdjustment("0.50"), "0.50");
assert.strictEqual(formatAdjustment("10"), "10");
assert.strictEqual(formatAdjustment("-5.5"), "-5.5");
assert.strictEqual(formatAdjustment("123456789.12345"), "123456789.12345");
assert.strictEqual(formatAdjustment(""), "0.00");
assert.strictEqual(formatAdjustment(null), "0.00");
assert.strictEqual(formatAdjustment(undefined), "0.00");

// 5. Numeric inputs (not strings)
assert.strictEqual(formatAdjustment(-18895.29), "-18895.29");
assert.strictEqual(formatAdjustment(7.5e-7), "0.00000075");
assert.strictEqual(formatAdjustment(0.00000075), "0.00000075");
assert.strictEqual(formatAdjustment(0.03), "0.03");

console.log("All adjustment precision self-checks passed successfully!");
