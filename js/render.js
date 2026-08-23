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

// Draw a logo image (HTMLImageElement, HTMLCanvasElement, or ImageBitmap) on
// top of an already-drawn QR. The logo sits in the center with a white
// background for contrast. `logoRatio` controls logo size as a fraction of
// the QR side length; default 0.20 (20%) is safe with EC level H (~30%).
export function drawLogo(canvas, logo, logoRatio = 0.20) {
  const ctx = canvas.getContext('2d');
  const qrSide = canvas.width - 8 * 8;  // subtract quiet zone (4 modules * 2 sides * 8px scale)
  const size = qrSide * logoRatio;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  // White background with rounded corners
  const padding = size * 0.10;
  const bgSize = size + padding * 2;
  const radius = size * 0.15;
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, cx - bgSize / 2, cy - bgSize / 2, bgSize, bgSize, radius);
  ctx.fill();

  // Logo
  ctx.drawImage(logo, cx - size / 2, cy - size / 2, size, size);
}

// Draw the built-in Alipay-style default logo (blue rounded square + "支" character).
// This is a generic placeholder; users can upload their own logo to replace it.
export function drawDefaultAlipayLogo(canvas) {
  const ctx = canvas.getContext('2d');
  const qrSide = canvas.width - 8 * 8;
  const size = qrSide * 0.22;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = size * 0.18;

  // Blue rounded background (Alipay-style blue)
  ctx.fillStyle = '#1677ff';
  roundRect(ctx, cx - size / 2, cy - size / 2, size, size, radius);
  ctx.fill();

  // White "支" character
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
