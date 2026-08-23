// data-encoding.js
// Convert the input URL into a sequence of QR codewords (data only,
// before error correction).
//
// For URLs we use byte mode (mode indicator 0100). UTF-8 encoding is used
// to convert the URL string to bytes; for typical URLs (ASCII) this is
// a no-op, but it also handles internationalized domain names correctly.

import { EC_INFO, totalDataCodewords } from './qr-tables.js';

const MODE_BYTE = 0b0100;

// Character count bit length for byte mode:
//   V1-V9: 8 bits
//   V10+:  16 bits
function countIndicatorLength(version) {
  return version <= 9 ? 8 : 16;
}

// Maximum number of data bits available in `totalDataCodewords` after the
// mode indicator and character count are subtracted.
function availableDataBits(version, ecLevel) {
  const totalBits = totalDataCodewords(version, ecLevel) * 8;
  return totalBits - (4 + countIndicatorLength(version));
}

// Maximum number of UTF-8 bytes that fit in the chosen (version, ecLevel).
// One byte = 8 bits, and we have `availableDataBits` bits after overhead.
export function maxBytesForVersion(version, ecLevel) {
  return Math.floor(availableDataBits(version, ecLevel) / 8);
}

// Pick the smallest version (within [minVersion, maxVersion]) whose byte-mode
// capacity can hold the given number of bytes. Returns null if none fit.
export function chooseVersion(byteLength, ecLevel, minVersion = 1, maxVersion = 10) {
  for (let v = minVersion; v <= maxVersion; v++) {
    if (maxBytesForVersion(v, ecLevel) >= byteLength) return v;
  }
  return null;
}

// Encode the URL into a bit stream as a Uint8Array, padded to the exact
// number of data codewords required by (version, ecLevel). The returned
// array has length == totalDataCodewords(version, ecLevel).
export function encodeData(url, version, ecLevel) {
  const totalCodewords = totalDataCodewords(version, ecLevel);
  const totalBits = totalCodewords * 8;

  // 1) Convert URL to UTF-8 bytes
  const enc = new TextEncoder();
  const bytes = enc.encode(url);

  if (bytes.length * 8 > availableDataBits(version, ecLevel)) {
    throw new Error(`URL too long for version ${version}`);
  }

  // 2) Build bit stream
  //    Use a JS array of bits; we'll pack into a Uint8Array at the end.
  const bits = [];

  // Mode indicator: 0100
  pushBits(bits, MODE_BYTE, 4);

  // Character count
  pushBits(bits, bytes.length, countIndicatorLength(version));

  // Data
  for (const b of bytes) pushBits(bits, b, 8);

  // Terminator: up to 4 zero bits (or fewer if less space remains)
  const terminator = Math.min(4, totalBits - bits.length);
  for (let i = 0; i < terminator; i++) bits.push(0);

  // Pad to next byte boundary
  while (bits.length % 8 !== 0) bits.push(0);

  // Pad bytes: alternating 0xEC and 0x11 until we hit totalCodewords
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bits.length < totalBits) {
    pushBits(bits, padBytes[padIdx], 8);
    padIdx = 1 - padIdx;
  }

  // Pack bits into Uint8Array
  const out = new Uint8Array(totalCodewords);
  for (let i = 0; i < totalCodewords; i++) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i * 8 + j];
    out[i] = b;
  }
  return out;
}

function pushBits(arr, value, n) {
  for (let i = n - 1; i >= 0; i--) {
    arr.push((value >> i) & 1);
  }
}

// Split the linear data codeword array into blocks per the EC table for
// (version, ecLevel), and interleave data+EC codewords for final placement.
//
// Returns an array of codewords (data interleaved with EC, ready to be
// written into the matrix).
import { computeEC } from './reed-solomon.js';

export function buildCodewords(dataCodewords, version, ecLevel) {
  const info = EC_INFO[ecLevel][version - 1];
  const [ecPerBlock, numG1, sizeG1, numG2, sizeG2] = info;

  // Split into blocks
  const dataBlocks = [];
  let offset = 0;
  for (let i = 0; i < numG1; i++) {
    dataBlocks.push(dataCodewords.slice(offset, offset + sizeG1));
    offset += sizeG1;
  }
  for (let i = 0; i < numG2; i++) {
    dataBlocks.push(dataCodewords.slice(offset, offset + sizeG2));
    offset += sizeG2;
  }

  // Compute EC for each block
  const ecBlocks = dataBlocks.map(block => computeEC(block, ecPerBlock));

  // Interleave: take i-th codeword from each data block, then i-th from
  // each EC block. When blocks have different sizes, the longer blocks
  // contribute to one extra round.
  const maxDataSize = Math.max(sizeG1, sizeG2);
  const totalBlocks = dataBlocks.length;
  const out = [];

  for (let i = 0; i < maxDataSize; i++) {
    for (let b = 0; b < totalBlocks; b++) {
      if (i < dataBlocks[b].length) out.push(dataBlocks[b][i]);
    }
  }
  for (let i = 0; i < ecPerBlock; i++) {
    for (let b = 0; b < totalBlocks; b++) {
      out.push(ecBlocks[b][i]);
    }
  }
  return out;
}
