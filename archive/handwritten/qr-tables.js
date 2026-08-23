// qr-tables.js
// Static tables from ISO/IEC 18004 for QR Code versions 1-10, all EC levels.

// EC level index used throughout this app.
// We only use level M (index 1) for the app's fixed behavior, but the table
// is provided for completeness and potential future extension.
export const EC_LEVELS = { L: 0, M: 1, Q: 2, H: 3 };

// EC codewords per block, number of blocks in group 1, data codewords per block
// in group 1, number of blocks in group 2, data codewords per block in group 2.
// Indexed as EC_INFO[ecLevel][version-1].
// Source: ISO/IEC 18004:2015 Table 9.
export const EC_INFO = {
  // L
  0: [
    [7, 1, 19, 0, 0],   [10, 1, 34, 0, 0],  [15, 1, 55, 0, 0],  [20, 1, 80, 0, 0],
    [26, 1, 108, 0, 0], [18, 2, 68, 0, 0],  [20, 2, 78, 0, 0],  [24, 2, 97, 0, 0],
    [30, 2, 116, 0, 0], [18, 2, 68, 2, 69],
  ],
  // M
  1: [
    [10, 1, 16, 0, 0],  [16, 1, 28, 0, 0],  [26, 1, 44, 0, 0],  [18, 2, 32, 0, 0],
    [24, 2, 43, 0, 0],  [16, 4, 27, 0, 0],  [18, 4, 31, 0, 0],  [22, 2, 38, 2, 39],
    [22, 3, 36, 2, 37],  [26, 4, 43, 1, 44],
  ],
  // Q
  2: [
    [13, 1, 13, 0, 0],  [22, 1, 22, 0, 0],  [18, 2, 17, 0, 0],  [26, 2, 24, 0, 0],
    [18, 2, 15, 2, 16], [24, 4, 19, 0, 0],  [18, 2, 14, 4, 15], [22, 4, 18, 2, 19],
    [20, 4, 16, 4, 17], [24, 6, 19, 2, 20],
  ],
  // H
  3: [
    [17, 1, 9, 0, 0],   [28, 1, 16, 0, 0],  [22, 2, 13, 0, 0],  [16, 4, 9, 0, 0],
    [22, 2, 11, 2, 12], [28, 4, 15, 0, 0],  [26, 4, 13, 1, 14], [26, 4, 14, 2, 15],
    [24, 4, 12, 4, 13], [28, 6, 15, 2, 16],
  ],
};

// Alignment pattern center positions per version (for V2+).
// Each entry is an array of x=y coordinates where 5x5 alignment patterns sit.
// The full pattern is placed at every pair of coordinates, except where it
// would overlap a finder pattern.
export const ALIGNMENT_POSITIONS = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
  9: [6, 26, 46],
  10: [6, 28, 50],
};

// Matrix size for a given version: 4*V + 17.
export function matrixSize(version) {
  return 4 * version + 17;
}

// Format information: 2-bit EC level indicator (L=01, M=00, Q=11, H=10)
// and 3-bit mask pattern are combined and BCH(15,5) encoded.
const EC_LEVEL_BITS = { 0: 0b01, 1: 0b00, 2: 0b11, 3: 0b10 };
const FORMAT_MASK = 0b101010000010010;  // 15-bit

export function encodeFormatInfo(ecLevel, maskPattern) {
  const data = (EC_LEVEL_BITS[ecLevel] << 3) | maskPattern;
  let bch = data << 10;
  // Generator polynomial for BCH(15,5) is x^10 + x^8 + x^5 + x^4 + x^2 + x + 1
  // = 0b10100110111
  const gen = 0b10100110111;
  let rem = bch;
  for (let i = 14; i >= 10; i--) {
    if (rem & (1 << i)) rem ^= gen << (i - 10);
  }
  const formatBits = ((data << 10) | rem) ^ FORMAT_MASK;
  return formatBits & 0x7fff;
}

// Helper: get total number of data codewords for a given (version, ecLevel).
export function totalDataCodewords(version, ecLevel) {
  const info = EC_INFO[ecLevel][version - 1];
  return info[1] * info[2] + info[3] * info[4];
}

// Helper: get total number of codewords (data + EC) for a given (version, ecLevel).
export function totalCodewords(version, ecLevel) {
  const info = EC_INFO[ecLevel][version - 1];
  const blocks = info[1] + info[3];
  return totalDataCodewords(version, ecLevel) + blocks * info[0];
}
