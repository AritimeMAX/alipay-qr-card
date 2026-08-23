// matrix.js
// Build the QR code matrix: function patterns + interleaved data/EC codewords.
// Also build the "reserved" map indicating which cells are function patterns
// (and therefore should NOT be XORed by the mask).

import {
  matrixSize,
  ALIGNMENT_POSITIONS,
  encodeFormatInfo,
} from './qr-tables.js';

const FINDER = [
  [1,1,1,1,1,1,1],
  [1,0,0,0,0,0,1],
  [1,0,1,1,1,0,1],
  [1,0,1,1,1,0,1],
  [1,0,1,1,1,0,1],
  [1,0,0,0,0,0,1],
  [1,1,1,1,1,1,1],
];

const ALIGNMENT = [
  [1,1,1,1,1],
  [1,0,0,0,1],
  [1,0,1,0,1],
  [1,0,0,0,1],
  [1,1,1,1,1],
];

// Returns { matrix, reserved, size } where:
//   matrix:   (size x size) array, cells are `null` (unset) or `true/false`.
//   reserved: (size x size) boolean array, true = function pattern (do not mask).
export function buildMatrix(codewords, version) {
  const size = matrixSize(version);
  const m = Array.from({ length: size }, () => new Array(size).fill(null));
  const reserved = Array.from({ length: size }, () => new Array(size).fill(false));

  // 1) Finder patterns + 1-module white separator
  placeFinder(m, reserved, 0, 0, size);
  placeFinder(m, reserved, size - 7, 0, size);
  placeFinder(m, reserved, 0, size - 7, size);

  // 2) Timing patterns
  for (let i = 0; i < size; i++) {
    if (!reserved[6][i]) { m[6][i] = i % 2 === 0; reserved[6][i] = true; }
    if (!reserved[i][6]) { m[i][6] = i % 2 === 0; reserved[i][6] = true; }
  }

  // 3) Alignment patterns (V2+)
  if (version >= 2) {
    const positions = ALIGNMENT_POSITIONS[version];
    for (const ar of positions) {
      for (const ac of positions) {
        if ((ar === 6 && ac === 6) ||
            (ar === 6 && ac === size - 7) ||
            (ar === size - 7 && ac === 6)) continue;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            m[ar + dr][ac + dc] = ALIGNMENT[dr + 2][dc + 2] === 1;
            reserved[ar + dr][ac + dc] = true;
          }
        }
      }
    }
  }

  // 4) Dark module (always at (4*V + 9, 8))
  m[size - 8][8] = true;
  reserved[size - 8][8] = true;

  // 5) Format info area (15 bits, two copies). Reserved but not yet written.
  //    First copy (L-shape around top-left finder):
  //      row 8, cols 0-5, 7, 8   (skip col 6 = timing)
  //      col 8, rows 0-5, 7, 8   (skip row 6 = timing)
  for (let i = 0; i <= 5; i++) reserved[8][i] = true;
  reserved[8][7] = true;
  reserved[8][8] = true;
  reserved[7][8] = true;
  for (let i = 0; i <= 5; i++) reserved[i][8] = true;
  //    Second copy (split: top-right + bottom-left):
  //      row 8, cols size-1 down to size-8  (8 cells)
  //      col 8, rows size-7 down to size-1  (7 cells)
  for (let i = 0; i < 8; i++) reserved[8][size - 1 - i] = true;
  for (let i = 0; i < 7; i++) reserved[size - 7 + i][8] = true;

  // 6) Version info area (V7+)
  if (version >= 7) {
    for (let vr = 0; vr < 6; vr++) {
      for (let vc = 0; vc < 3; vc++) {
        reserved[vr][size - 11 + vc] = true;
        reserved[size - 11 + vc][vr] = true;
      }
    }
  }

  // 7) Place data codewords in zigzag
  placeData(m, reserved, codewords, size);

  return { matrix: m, reserved, size };
}

function placeFinder(m, reserved, row, col, size) {
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      m[row + r][col + c] = FINDER[r][c] === 1;
    }
  }
  // 1-module white separator around the finder (overwrites any pre-existing
  // reserved marks in those cells)
  for (let i = -1; i <= 7; i++) {
    setSep(m, reserved, row - 1, col + i, size);
    setSep(m, reserved, row + 7, col + i, size);
    setSep(m, reserved, row + i, col - 1, size);
    setSep(m, reserved, row + i, col + 7, size);
  }
  // Mark the 9x9 area as reserved
  for (let dr = -1; dr <= 7; dr++) {
    for (let dc = -1; dc <= 7; dc++) {
      const rr = row + dr, cc = col + dc;
      if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
      reserved[rr][cc] = true;
    }
  }
}

function setSep(m, reserved, r, c, size) {
  if (r < 0 || c < 0 || r >= size || c >= size) return;
  if (!reserved[r][c]) m[r][c] = false;
}

function placeData(m, reserved, codewords, size) {
  let bitIdx = 0;
  const totalBits = codewords.length * 8;
  let col = size - 1;
  let upward = true;

  while (col > 0) {
    if (col === 6) col--;
    for (let i = 0; i < size; i++) {
      const row = upward ? size - 1 - i : i;
      for (let dc = 0; dc < 2; dc++) {
        const c = col - dc;
        if (!reserved[row][c]) {
          if (bitIdx < totalBits) {
            const byte = codewords[bitIdx >> 3];
            const bit = (byte >> (7 - (bitIdx & 7))) & 1;
            m[row][c] = bit === 1;
          } else {
            m[row][c] = false;  // remainder bits per spec
          }
        }
      }
    }
    col -= 2;
    upward = !upward;
  }
}

// Apply mask `maskPattern` (0-7) to a finished matrix.
// `reserved` indicates cells that are function patterns and must not be masked.
export function applyMask(matrix, reserved, size, maskPattern) {
  const out = new Array(size);
  for (let r = 0; r < size; r++) {
    out[r] = new Array(size);
    for (let c = 0; c < size; c++) {
      let val = matrix[r][c];
      if (!reserved[r][c] && maskBit(maskPattern, r, c)) {
        val = !val;
      }
      out[r][c] = val;
    }
  }
  return out;
}

function maskBit(pattern, row, col) {
  switch (pattern) {
    case 0: return (row + col) % 2 === 0;
    case 1: return row % 2 === 0;
    case 2: return col % 3 === 0;
    case 3: return (row + col) % 3 === 0;
    case 4: return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
    case 5: return ((row * col) % 2) + ((row * col) % 3) === 0;
    case 6: return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
    case 7: return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0;
    default: return false;
  }
}

// Write the 15-bit format info into the (already-masked) matrix.
export function writeFormatInfo(matrix, size, ecLevel, maskPattern) {
  const bits = encodeFormatInfo(ecLevel, maskPattern);
  // Top-left finder area
  for (let i = 0; i < 6; i++) matrix[8][i] = ((bits >> i) & 1) === 1;
  matrix[8][7] = ((bits >> 6) & 1) === 1;
  matrix[8][8] = ((bits >> 7) & 1) === 1;
  matrix[7][8] = ((bits >> 8) & 1) === 1;
  for (let i = 9; i < 15; i++) matrix[14 - i][8] = ((bits >> i) & 1) === 1;
  // Top-right and bottom-left
  for (let i = 0; i < 8; i++) matrix[8][size - 1 - i] = ((bits >> i) & 1) === 1;
  for (let i = 8; i < 15; i++) matrix[size - 15 + i][8] = ((bits >> i) & 1) === 1;
  // Always-dark module
  matrix[size - 8][8] = true;
}
