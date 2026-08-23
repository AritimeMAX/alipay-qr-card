// render.js
// Compose the final card image: text on the left, QR code (with optional
// logo) on the right. Provides a PNG-download helper.

// Layout constants (in canvas pixels at 1× — caller scales by `scale`).
const PAD = 20;          // outer padding around the whole card
const GAP = 24;          // gap between text and QR
const TEXT_W = 180;      // fixed text-area width
const QR_PAD = 4;        // quiet-zone modules around the QR (ISO standard)

/**
 * Compose the card image onto an existing canvas.
 * @param {boolean[][]} matrix   QR matrix (square)
 * @param {number}      size     matrix dimension
 * @param {HTMLCanvasElement} canvas
 * @param {string}      title    main text (large)
 * @param {string}      subtitle secondary text (small)
 * @param {HTMLImageElement|null} logo
 * @param {number}      scale    pixels per module (default 8)
 */
export function drawCard(matrix, size, canvas, title, subtitle, logo, scale = 8) {
  const qrSide = (size + QR_PAD * 2) * scale;
  const totalW = PAD + TEXT_W + GAP + qrSide + PAD;
  const totalH = Math.max(qrSide, 80) + PAD * 2;

  canvas.width = totalW;
  canvas.height = totalH;
  const ctx = canvas.getContext('2d');

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, totalW, totalH);

  // Left: text block, right-aligned, vertically centered
  const textX = PAD + TEXT_W;
  const textCenterY = totalH / 2;
  drawTextBlock(ctx, title, subtitle, textX, textCenterY);

  // Right: QR code
  const qrX = PAD + TEXT_W + GAP;
  const qrY = (totalH - qrSide) / 2;
  drawQrRegion(ctx, matrix, size, qrX, qrY, scale, logo);
}

function drawTextBlock(ctx, title, subtitle, rightX, centerY) {
  const titleSize = 26;
  const subtitleSize = 15;
  const lineGap = 8;

  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  // Title
  ctx.fillStyle = '#1a1a1a';
  ctx.font = `600 ${titleSize}px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif`;
  const titleY = centerY - (titleSize + lineGap) / 2;
  ctx.fillText(title || '', rightX, titleY);

  // Subtitle
  ctx.fillStyle = '#6b6b6b';
  ctx.font = `${subtitleSize}px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif`;
  const subY = centerY + (subtitleSize + lineGap) / 2;
  ctx.fillText(subtitle || '', rightX, subY);
}

function drawQrRegion(ctx, matrix, size, ox, oy, scale, logo) {
  // Black QR modules
  ctx.fillStyle = '#000000';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c]) {
        ctx.fillRect(ox + (c + QR_PAD) * scale, oy + (r + QR_PAD) * scale, scale, scale);
      }
    }
  }

  // Optional centered logo
  if (logo) {
    const logoSize = (size * scale) * 0.22;
    const cx = ox + qrSidePx(size, scale) / 2;
    const cy = oy + qrSidePx(size, scale) / 2;

    const padding = logoSize * 0.025;
    const bgSize = logoSize + padding * 2;
    const radius = logoSize * 0.35;
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, cx - bgSize / 2, cy - bgSize / 2, bgSize, bgSize, radius);
    ctx.fill();

    const iw = logo.width || logo.naturalWidth;
    const ih = logo.height || logo.naturalHeight;
    const s = Math.min(logoSize / iw, logoSize / ih);
    const dw = iw * s;
    const dh = ih * s;
    ctx.drawImage(logo, cx - dw / 2, cy - dh / 2, dw, dh);
  }
}

function qrSidePx(size, scale) {
  return (size + QR_PAD * 2) * scale;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// Trigger a PNG download of the canvas content.
export function downloadPng(canvas, filename = 'qrcode.png') {
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
}
