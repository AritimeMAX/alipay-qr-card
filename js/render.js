// render.js
// Draw a boolean[][] matrix to a canvas and provide a PNG-download helper.
// Optionally overlay a logo image in the center of the QR.

// Draw the matrix onto an existing canvas. `scale` modules per pixel;
// default 8 gives a 168-px QR for V1, 456-px for V10.
export function drawToCanvas(matrix, size, canvas, scale = 8) {
  const quiet = 4 * scale;  // 4-module quiet zone (standard)
  const px = (size + 8) * scale;
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, px, px);
  ctx.fillStyle = '#000000';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c]) {
        ctx.fillRect((c + 4) * scale, (r + 4) * scale, scale, scale);
      }
    }
  }
}

// Draw a logo image on top of an already-drawn QR. The image is centered,
// aspect-ratio-preserved (so non-square images don't get distorted), and
// surrounded by a white rounded background for contrast.
// `logoRatio` controls the logo size as a fraction of the QR side length;
// default 0.22 (22%) is safe with EC level H (~30% recovery).
export function drawLogo(canvas, img, logoRatio = 0.22) {
  const ctx = canvas.getContext('2d');
  const qrSide = canvas.width - 8 * 8;  // subtract 4-module quiet zone on each side
  const size = qrSide * logoRatio;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  // White rounded background (tight, just enough to keep the logo readable
  // against the QR modules around it)
  const padding = size * 0.04;
  const bgSize = size + padding * 2;
  const radius = size * 0.10;
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, cx - bgSize / 2, cy - bgSize / 2, bgSize, bgSize, radius);
  ctx.fill();

  // Logo: fit into a size×size box, preserve aspect ratio, center.
  const iw = img.width || img.naturalWidth;
  const ih = img.height || img.naturalHeight;
  const scale = Math.min(size / iw, size / ih);
  const drawW = iw * scale;
  const drawH = ih * scale;
  ctx.drawImage(img, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
}

// Fallback: when no image is available, draw a generic Alipay-style placeholder
// (blue rounded square + "支" character). This is not the real Alipay logo,
// just a similar-looking generic version.
export function drawFallbackLogo(canvas) {
  const ctx = canvas.getContext('2d');
  const qrSide = canvas.width - 8 * 8;
  const size = qrSide * 0.22;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = size * 0.18;

  ctx.fillStyle = '#1677ff';
  roundRect(ctx, cx - size / 2, cy - size / 2, size, size, radius);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(size * 0.6)}px -apple-system, "PingFang SC", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('支', cx, cy);
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
