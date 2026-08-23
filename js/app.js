// app.js
// UI wiring: input → debounced encode → canvas render; download button.

import { encode } from './encoder.js';
import { drawToCanvas, downloadPng } from './render.js';

const $ = (id) => document.getElementById(id);

const els = {
  input: $('url-input'),
  canvas: $('qr-canvas'),
  download: $('download-btn'),
  error: $('error-msg'),
  meta: $('meta'),
};

let currentMatrix = null;
let currentSize = 0;

function debounce(fn, ms) {
  let t = null;
  return (...args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function showError(msg) {
  els.error.textContent = msg;
  els.error.hidden = !msg;
  if (msg) els.input.classList.add('invalid');
  else els.input.classList.remove('invalid');
}

function update() {
  const url = els.input.value.trim();

  if (!url) {
    showError('');
    clearCanvas();
    els.download.disabled = true;
    els.meta.textContent = '';
    currentMatrix = null;
    return;
  }

  try {
    const { matrix, size, version } = encode(url);
    currentMatrix = matrix;
    currentSize = size;
    drawToCanvas(matrix, size, els.canvas, 8);
    els.download.disabled = false;
    els.meta.textContent = `Version ${version} · ${size}×${size} · ${url.length} 字符`;
    showError('');
  } catch (e) {
    showError(e.message);
    clearCanvas();
    els.download.disabled = true;
    els.meta.textContent = '';
    currentMatrix = null;
  }
}

function clearCanvas() {
  const ctx = els.canvas.getContext('2d');
  ctx.clearRect(0, 0, els.canvas.width, els.canvas.height);
}

els.input.addEventListener('input', debounce(update, 200));
els.download.addEventListener('click', () => {
  if (currentMatrix) {
    const filename = (els.input.value.trim() || 'qrcode').replace(/[^a-z0-9]/gi, '_') + '.png';
    downloadPng(els.canvas, filename);
  }
});

// Initial state
els.download.disabled = true;
