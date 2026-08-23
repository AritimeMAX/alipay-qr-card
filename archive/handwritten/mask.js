// mask.js
// Mask penalty calculation and best-mask selection.

const PENALTY_N1 = 3;
const PENALTY_N2 = 3;
const PENALTY_N3 = 40;
const PENALTY_N4 = 10;

// Compute the 4-rule penalty score for a fully-masked matrix.
export function penalty(matrix, size) {
  return rule1(matrix, size) + rule2(matrix, size) + rule3(matrix, size) + rule4(matrix, size);
}

// Rule 1: Adjacent modules in row/column with the same color.
// 5+ in a row → 3 + (count - 5).
function rule1(m, size) {
  let score = 0;
  for (let r = 0; r < size; r++) {
    let runColor = m[r][0];
    let runLen = 1;
    for (let c = 1; c < size; c++) {
      if (m[r][c] === runColor) {
        runLen++;
      } else {
        if (runLen >= 5) score += PENALTY_N1 + (runLen - 5);
        runColor = m[r][c];
        runLen = 1;
      }
    }
    if (runLen >= 5) score += PENALTY_N1 + (runLen - 5);
  }
  for (let c = 0; c < size; c++) {
    let runColor = m[0][c];
    let runLen = 1;
    for (let r = 1; r < size; r++) {
      if (m[r][c] === runColor) {
        runLen++;
      } else {
        if (runLen >= 5) score += PENALTY_N1 + (runLen - 5);
        runColor = m[r][c];
        runLen = 1;
      }
    }
    if (runLen >= 5) score += PENALTY_N1 + (runLen - 5);
  }
  return score;
}

// Rule 2: 2x2 blocks of the same color.
function rule2(m, size) {
  let score = 0;
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = m[r][c];
      if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) {
        score += PENALTY_N2;
      }
    }
  }
  return score;
}

// Rule 3: Finder-like pattern (B W B B B W B W B, with 4 W's on either side).
// Looks for the pattern anywhere in a row/column.
function rule3(m, size) {
  const pattern1 = [true, false, true, true, true, false, true, false, false, false, false];
  const pattern2 = [false, false, false, false, true, false, true, true, true, false, true];

  function matchesAt(arr, start, pat) {
    for (let i = 0; i < pat.length; i++) {
      if (arr[start + i] !== pat[i]) return false;
    }
    return true;
  }

  let score = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c <= size - 11; c++) {
      if (matchesAt(m[r], c, pattern1)) score += PENALTY_N3;
      if (matchesAt(m[r], c, pattern2)) score += PENALTY_N3;
    }
  }
  for (let c = 0; c < size; c++) {
    const col = new Array(size);
    for (let r = 0; r < size; r++) col[r] = m[r][c];
    for (let r = 0; r <= size - 11; r++) {
      if (matchesAt(col, r, pattern1)) score += PENALTY_N3;
      if (matchesAt(col, r, pattern2)) score += PENALTY_N3;
    }
  }
  return score;
}

// Rule 4: Proportion of dark vs light modules. The further from 50%, the higher the penalty.
// Score = 10 * floor(|dark/light - 1/2| / 5%)  → effectively steps of 10%.
function rule4(m, size) {
  let dark = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (m[r][c]) dark++;
    }
  }
  const total = size * size;
  const ratio = (dark * 100) / total;
  // Steps of 5%
  const dev = Math.floor(Math.abs(ratio - 50) / 5);
  return dev * PENALTY_N4;
}

// Try all 8 mask patterns and return the one with the lowest penalty score.
// Each pattern is {maskedMatrix, penaltyScore, maskPattern}.
export function chooseBestMask(rawMatrix, reserved, size, ecLevel) {
  let best = null;
  for (let p = 0; p < 8; p++) {
    const masked = applyMaskWithFormat(rawMatrix, reserved, size, p, ecLevel);
    const score = penalty(masked, size);
    if (best === null || score < best.score) {
      best = { matrix: masked, score, maskPattern: p };
    }
  }
  return best;
}

// Helper: apply mask then write format info for a given mask pattern.
import { applyMask, writeFormatInfo } from './matrix.js';

function applyMaskWithFormat(rawMatrix, reserved, size, maskPattern, ecLevel) {
  const masked = applyMask(rawMatrix, reserved, size, maskPattern);
  writeFormatInfo(masked, size, ecLevel, maskPattern);
  return masked;
}
