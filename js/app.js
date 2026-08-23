// app.js
// UI wiring: input → debounced encode → canvas render; download button.

import { encode } from './encoder.js';
import { drawToCanvas, drawLogo, drawDefaultAlipayLogo, downloadPng } from './render.js';

const $ = (id) => document.getElementById(id);

const els = {
  input: $('url-input'),
  canvas: $('qr-canvas'),
  download: $('download-btn'),
  error: $('error-msg'),
  meta: $('meta'),
  logoInput: $('logo-input'),
  clearLogo: $('clear-logo'),
  logoLabel: $('logo-label'),
};

let currentMatrix = null;
let currentSize = 0;
let customLogo = null;       // HTMLImageElement or null (= use default)
let useDefaultLogo = true;   // when no custom logo, show the placeholder

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

function renderLogo() {
  // Re-overlay the logo on the current canvas. Called after drawing QR
  // or after the user changes the logo.
  if (customLogo) {
    drawLogo(els.canvas, customLogo);
  } else if (useDefaultLogo) {
    drawDefaultAlipayLogo(els.canvas);
  }
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
    renderLogo();
    els.download.disabled = false;
    els.meta.textContent = `Version ${version} · ${size}×${size} · EC-H · ${url.length} 字符`;
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

// Logo file input
els.logoInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = () => {
      customLogo = img;
      useDefaultLogo = false;
      els.logoLabel.textContent = file.name;
      els.clearLogo.hidden = false;
      renderLogo();
    };
    img.onerror = () => showError('Logo 图片加载失败');
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

// Clear custom logo → revert to default placeholder
els.clearLogo.addEventListener('click', () => {
  customLogo = null;
  useDefaultLogo = true;
  els.logoInput.value = '';
  els.logoLabel.textContent = '选择 Logo';
  els.clearLogo.hidden = true;
  if (currentMatrix) renderLogo();
});

// Initial state
els.download.disabled = true;
els.clearLogo.hidden = true;
