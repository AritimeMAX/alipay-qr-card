// reed-solomon.js
// Reed-Solomon error correction over GF(256) for QR codes.
// Primitive polynomial: x^8 + x^4 + x^3 + x^2 + 1 (0x11D)
// Primitive element (alpha): 2

// Pre-computed exponent and log tables for fast multiplication.
// exp is doubled (length 510) so we can use it without modular arithmetic
// at lookup time (log[a] + log[b] is always < 510 in this scheme).
const GF_EXP = new Uint8Array(510);
const GF_LOG = new Uint8Array(256);

(function initGF() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 510; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

// GF multiplication: a * b
function gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

// GF exponentiation: x^power
function gfPow(x, power) {
  if (x === 0) return 0;
  return GF_EXP[(GF_LOG[x] * power) % 255];
}

// Build the generator polynomial of given degree.
// gen(x) = (x - α^0)(x - α^1)...(x - α^(degree-1))
// In GF(2), -1 = 1, so (x - α^i) = (x + α^i).
// Returns an array of coefficients [g0, g1, ..., g_degree].
//
// Polynomial multiplication: (x + a) * g(x)
//   x*g(x) shifts g up by 1  → next[j+1] += g[j]
//   a*g(x) scales g by a     → next[j]   += a * g[j]
function buildGenerator(degree) {
  let gen = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(gen.length + 1).fill(0);
    for (let j = 0; j < gen.length; j++) {
      next[j]     ^= gfMul(gen[j], GF_EXP[i]);
      next[j + 1] ^= gen[j];
    }
    gen = next;
  }
  return gen;
}

// Compute `ecLength` error-correction codewords for the given data codewords.
// Returns a Uint8Array of length ecLength.
function computeEC(data, ecLength) {
  const gen = buildGenerator(ecLength);
  // result = data shifted left by ecLength (i.e., multiplied by x^ecLength)
  const result = new Uint8Array(data.length + ecLength);
  for (let i = 0; i < data.length; i++) result[i] = data[i];
  for (let i = 0; i < data.length; i++) {
    const coef = result[i];
    if (coef === 0) continue;
    for (let j = 0; j < gen.length; j++) {
      result[i + j] ^= gfMul(gen[j], coef);
    }
  }
  return result.slice(data.length);
}

export { GF_EXP, GF_LOG, gfMul, gfPow, buildGenerator, computeEC };
