// encoder.js
// Wraps the qrcode-generator library (vendor/qrcode.js) and exposes
// the same API the UI expects: encode(url) → { matrix, size, version }.

/**
 * Encode a URL into a QR code matrix.
 * @param {string} url
 * @returns {{ matrix: boolean[][], size: number, version: number }}
 * @throws if the URL is empty or too long.
 */
export function encode(url) {
  if (typeof url !== 'string' || url.length === 0) {
    throw new Error('URL must be a non-empty string');
  }

  // typeNumber 0 = auto-detect smallest version that fits the data.
  // EC level H (≈30% recovery) — chosen for logo tolerance. M (15%) is too tight
  // once we overlay a centered logo in the middle of the QR.
  const qr = qrcode(0, 'H');
  qr.addData(url);           // default mode 'Byte' (UTF-8) — works for ASCII URLs
  qr.make();

  const size = qr.getModuleCount();
  const version = inferVersion(size);
  const matrix = new Array(size);
  for (let r = 0; r < size; r++) {
    matrix[r] = new Array(size);
    for (let c = 0; c < size; c++) {
      matrix[r][c] = qr.isDark(r, c);
    }
  }
  return { matrix, size, version };
}

// QR matrix size → version: size = 4V + 17  ⇒  V = (size - 17) / 4
function inferVersion(size) {
  return (size - 17) / 4;
}
