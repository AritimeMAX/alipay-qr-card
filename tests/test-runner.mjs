// tests/test-runner.mjs
// Tests for the QR URL app. Since we now use a vendored library for
// QR generation, the tests focus on the wrapper API and behavior
// (input validation, version inference, output shape).
//
// End-to-end "is the QR actually scannable?" verification is in
// /tmp/qr-verify/verify.mjs (uses jsQR + node-canvas).

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// The vendored library is a UMD bundle. In the browser, the `var qrcode = ...`
// at top level becomes a window global. In node, we eval it into the global
// scope so it's visible to encoder.js.
const __dirname = dirname(fileURLToPath(import.meta.url));
const libSrc = readFileSync(join(__dirname, '..', 'vendor', 'qrcode.js'), 'utf8');
// eslint-disable-next-line no-eval
(0, eval)(libSrc + '\n;globalThis.qrcode = qrcode;');

const { encode } = await import('../js/encoder.js');

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } catch (e) {
    failed++;
    failures.push({ name, error: e });
    console.log(`  \x1b[31m✗\x1b[0m ${name}`);
    console.log(`    ${e.message}`);
  }
}

function eq(actual, expected, msg = '') {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`${msg}\n      expected: ${e}\n      actual:   ${a}`);
  }
}

function truthy(v, msg) {
  if (!v) throw new Error(msg);
}

function deepEqualMatrix(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].length !== b[i].length) return false;
    for (let j = 0; j < a[i].length; j++) {
      if (a[i][j] !== b[i][j]) return false;
    }
  }
  return true;
}

// --- Tests ---------------------------------------------------------------

console.log('\n\x1b[1mEncoder\x1b[0m');

test('encode produces a square matrix with side = 4V + 17', () => {
  const { matrix, size, version } = encode('https://example.com');
  eq(size, 4 * version + 17);
  eq(matrix.length, size);
  matrix.forEach(row => eq(row.length, size));
});

test('encode output contains only booleans (no nulls)', () => {
  const { matrix, size } = encode('https://mavis.cn');
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (typeof matrix[r][c] !== 'boolean') {
        throw new Error(`cell (${r},${c}) is not boolean: ${matrix[r][c]}`);
      }
    }
  }
});

test('encode is deterministic (same input → same matrix)', () => {
  const a = encode('https://example.com/path?q=1');
  const b = encode('https://example.com/path?q=1');
  if (!deepEqualMatrix(a.matrix, b.matrix)) {
    throw new Error('encoder is non-deterministic!');
  }
});

test('encode picks a version that fits the URL', () => {
  // Short URL should be V1 or V2
  const { version: v1 } = encode('https://mavis.cn');
  truthy(v1 <= 3, `short URL should use V1-V3, got V${v1}`);

  // Long URL should be V5+
  const longUrl = 'https://example.com/' + 'a'.repeat(100);
  const { version: v2 } = encode(longUrl);
  truthy(v2 >= 5, `long URL should use V5+, got V${v2}`);
});

test('encode has finder patterns at all 3 corners', () => {
  const { matrix, size } = encode('https://example.com');
  // Top-left: matrix[0][0] should be true (corner of 7x7 finder)
  truthy(matrix[0][0] === true, 'top-left finder missing');
  truthy(matrix[0][size - 1] === true, 'top-right finder missing');
  truthy(matrix[size - 1][0] === true, 'bottom-left finder missing');
  // Center 3x3 of each finder should be all-black
  const m = size / 2 | 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      truthy(matrix[3 + dr][3 + dc] === true, 'top-left finder center');
      truthy(matrix[3 + dr][size - 4 + dc] === true, 'top-right finder center');
      truthy(matrix[size - 4 + dr][3 + dc] === true, 'bottom-left finder center');
    }
  }
});

test('encode throws on empty string', () => {
  let threw = false;
  try { encode(''); } catch (e) { threw = true; }
  eq(threw, true);
});

test('encode throws on non-string', () => {
  let threw = false;
  try { encode(123); } catch (e) { threw = true; }
  eq(threw, true);
});

test('encode handles UTF-8 URLs (IDN)', () => {
  const { size, version } = encode('https://例え.jp/path');
  eq(size, 4 * version + 17);
});

test('encode handles Chinese characters in URL', () => {
  // Should not throw and should produce valid matrix
  const { matrix, size } = encode('https://example.com/搜索?q=测试');
  eq(matrix.length, size);
});

// --- Summary --------------------------------------------------------------

console.log(`\n\x1b[1mSummary\x1b[0m`);
const total = passed + failed;
const color = failed === 0 ? '\x1b[32m' : '\x1b[31m';
console.log(`  ${color}${passed}/${total} passed\x1b[0m`);
if (failed > 0) {
  console.log(`\n  ${failed} test(s) failed.`);
  process.exit(1);
}
