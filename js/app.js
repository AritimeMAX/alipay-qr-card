// app.js
// UI wiring: input → debounced encode → canvas render; download button.
// Two-canvas horizontal slider for previewing QR-only vs full card.

import { encode } from './encoder.js';
import { drawCard, drawQrOnly, downloadPng } from './render.js';

const $ = (id) => document.getElementById(id);

const els = {
  input: $('url-input'),
  title: $('title-input'),
  subtitle: $('subtitle-input'),
  textRow: $('text-row'),
  canvasQr: $('canvas-qr'),
  canvasCard: $('canvas-card'),
  slider: $('slider'),
  download: $('download-btn'),
  error: $('error-msg'),
  meta: $('meta'),
  logoInput: $('logo-input'),
  clearLogo: $('clear-logo'),
  logoLabel: $('logo-label'),
  removeWhite: $('remove-white'),
  navPrev: $('nav-prev'),
  navNext: $('nav-next'),
  dots: document.querySelectorAll('.dot'),
};

const REMOVE_WHITE_THRESHOLD = 240;

const DEFAULT_LOGO_URL = null;  // no bundled default — users provide their own
const TOTAL_SLIDES = 2;
const SCALE_QR = 8;     // big impact for the QR-only view
const SCALE_CARD = 6;   // smaller so the card fits in 480-px main

let currentMatrix = null;
let currentSize = 0;
let currentSlide = 1;
let customLogo = null;
let customLogoName = null;

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

function activeLogo() {
  return customLogo;  // only custom uploads; no bundled default
}

// Pre-process an uploaded image: turn near-white pixels transparent so the
// logo's own white background doesn't stack with our 1.5% white frame.
// Returns a Promise<HTMLImageElement>.
function processImage(img, removeWhite) {
  if (!removeWhite) return Promise.resolve(img);

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i] >= REMOVE_WHITE_THRESHOLD &&
        px[i + 1] >= REMOVE_WHITE_THRESHOLD &&
        px[i + 2] >= REMOVE_WHITE_THRESHOLD) {
      px[i + 3] = 0;
    }
  }
  ctx.putImageData(data, 0, 0);

  return new Promise((resolve, reject) => {
    const out = new Image();
    out.onload = () => resolve(out);
    out.onerror = reject;
    out.src = canvas.toDataURL('image/png');
  });
}

function activeCanvas() {
  return currentSlide === 1 ? els.canvasQr : els.canvasCard;
}

function updateChrome() {
  // Slider position
  els.slider.classList.toggle('on-slide-2', currentSlide === 2);

  // Dots
  els.dots.forEach(d => {
    d.classList.toggle('active', Number(d.dataset.slide) === currentSlide);
  });

  // Arrows
  els.navPrev.disabled = currentSlide <= 1;
  els.navNext.disabled = currentSlide >= TOTAL_SLIDES;

  // Text-row visibility: hidden on slide 1, visible on slide 2
  els.textRow.classList.toggle('hidden', currentSlide === 1);
}

function render() {
  if (!currentMatrix) return;
  // Always render both slides so switching is instant and animation is smooth
  drawQrOnly(currentMatrix, currentSize, els.canvasQr, activeLogo(), SCALE_QR);
  drawCard(currentMatrix, currentSize, els.canvasCard,
           els.title.value, els.subtitle.value, activeLogo(), SCALE_CARD);
  updateChrome();
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
    render();
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
  for (const c of [els.canvasQr, els.canvasCard]) {
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
  }
}

const debouncedUpdate = debounce(update, 200);
const debouncedRender = debounce(render, 100);

els.input.addEventListener('input', debouncedUpdate);
els.title.addEventListener('input', debouncedRender);
els.subtitle.addEventListener('input', debouncedRender);

els.download.addEventListener('click', () => {
  if (currentMatrix) {
    const safe = (els.input.value.trim() || 'qrcode').replace(/[^a-z0-9]/gi, '_');
    const suffix = currentSlide === 1 ? '' : '_card';
    downloadPng(activeCanvas(), safe + suffix + '.png');
  }
});

// Logo file input
els.logoInput.addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async ev => {
    const raw = new Image();
    raw.onload = async () => {
      try {
        const removeWhite = els.removeWhite.checked;
        const final = await processImage(raw, removeWhite);
        customLogo = final;
        customLogoName = file.name + (removeWhite ? ' · 白底已去' : '');
        els.logoLabel.textContent = customLogoName;
        els.clearLogo.hidden = false;
        if (currentMatrix) render();
      } catch (err) {
        console.error(err);
        showError('Logo 处理失败');
      }
    };
    raw.onerror = () => showError('Logo 图片加载失败');
    raw.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

els.clearLogo.addEventListener('click', () => {
  customLogo = null;
  customLogoName = null;
  els.logoInput.value = '';
  els.logoLabel.textContent = '选择 Logo';
  els.clearLogo.hidden = true;
  if (currentMatrix) render();
});

// Slider navigation
els.navPrev.addEventListener('click', () => {
  if (currentSlide > 1) { currentSlide--; render(); }
});
els.navNext.addEventListener('click', () => {
  if (currentSlide < TOTAL_SLIDES) { currentSlide++; render(); }
});
els.dots.forEach(dot => {
  dot.addEventListener('click', () => {
    const target = Number(dot.dataset.slide);
    if (target !== currentSlide) { currentSlide = target; render(); }
  });
});

function preloadDefaultLogo() {
  // No bundled default logo. Users upload their own via the file input.
  // Kept as a no-op for future restoration if a generic placeholder is wanted.
}

// Initial state
els.download.disabled = true;
els.clearLogo.hidden = true;
updateChrome();
preloadDefaultLogo();
