// render.js
// Draw a boolean[][] matrix to a canvas and provide a PNG-download helper.

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
