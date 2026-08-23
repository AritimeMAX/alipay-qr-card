// app.js
// UI wiring: input → debounced encode → canvas render; download button.

import { encode } from './encoder.js';
import { drawToCanvas, drawLogo, drawFallbackLogo, downloadPng } from './render.js';

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

const DEFAULT_LOGO_URL = 'assets/alipay-logo.png';

let currentMatrix = null;
let currentSize = 0;
let defaultLogo = null;       // preloaded default Alipay image
let customLogo = null;        // user-uploaded image, takes priority
let customLogoName = null;    // filename of the custom logo (for UI label)

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

// Pick the active logo image: custom upload first, else default, else none.
function activeLogo() {
  return customLogo || defaultLogo;
}

function renderLogo() {
  const img = activeLogo();
  if (img) {
    drawLogo(els.canvas, img);
  }
  // No fallback drawing: if no logo at all, leave the QR clean.
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

// Logo file input — custom image takes priority over the default
els.logoInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = () => {
      customLogo = img;
      customLogoName = file.name;
      els.logoLabel.textContent = file.name;
      els.clearLogo.hidden = false;
      if (currentMatrix) renderLogo();
    };
    img.onerror = () => showError('Logo 图片加载失败');
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

// Clear custom logo → revert to the default Alipay image
els.clearLogo.addEventListener('click', () => {
  customLogo = null;
  customLogoName = null;
  els.logoInput.value = '';
  els.logoLabel.textContent = '自定义 Logo';
  els.clearLogo.hidden = true;
  if (currentMatrix) renderLogo();
});

// Preload the default Alipay logo on startup
function preloadDefaultLogo() {
  const img = new Image();
  img.onload = () => {
    console.log(`[qr-app] default logo loaded: ${img.naturalWidth}×${img.naturalHeight}`);
    defaultLogo = img;
    if (currentMatrix) renderLogo();
  };
  img.onerror = (e) => {
    console.error('[qr-app] default logo FAILED to load:', DEFAULT_LOGO_URL, e);
    defaultLogo = null;
  };
  img.src = DEFAULT_LOGO_URL;
  console.log('[qr-app] preloading default logo from', DEFAULT_LOGO_URL);
}

// Initial state
els.download.disabled = true;
els.clearLogo.hidden = true;
preloadDefaultLogo();
