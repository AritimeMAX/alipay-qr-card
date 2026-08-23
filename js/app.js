// app.js
// UI wiring: input → debounced encode → canvas render; download button.

import { encode } from './encoder.js';
import { drawCard, drawQrOnly, downloadPng } from './render.js';

const $ = (id) => document.getElementById(id);

const els = {
  input: $('url-input'),
  title: $('title-input'),
  subtitle: $('subtitle-input'),
  canvas: $('qr-canvas'),
  download: $('download-btn'),
  error: $('error-msg'),
  meta: $('meta'),
  logoInput: $('logo-input'),
  clearLogo: $('clear-logo'),
  logoLabel: $('logo-label'),
  navPrev: $('nav-prev'),
  navNext: $('nav-next'),
  dots: document.querySelectorAll('.dot'),
};

const DEFAULT_LOGO_URL = 'assets/alipay-logo.png';
const TOTAL_SLIDES = 2;

let currentMatrix = null;
let currentSize = 0;
let currentSlide = 1;
let defaultLogo = null;
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
  return customLogo || defaultLogo;
}

function updateDots() {
  els.dots.forEach(d => {
    d.classList.toggle('active', Number(d.dataset.slide) === currentSlide);
  });
  els.navPrev.disabled = currentSlide <= 1;
  els.navNext.disabled = currentSlide >= TOTAL_SLIDES;
}

function render() {
  if (!currentMatrix) return;
  if (currentSlide === 1) {
    drawQrOnly(currentMatrix, currentSize, els.canvas, activeLogo(), 8);
  } else {
    drawCard(
      currentMatrix,
      currentSize,
      els.canvas,
      els.title.value,
      els.subtitle.value,
      activeLogo(),
      8,
    );
  }
  updateDots();
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
  const ctx = els.canvas.getContext('2d');
  ctx.clearRect(0, 0, els.canvas.width, els.canvas.height);
}

const debouncedUpdate = debounce(update, 200);
const debouncedRender = debounce(render, 100);

els.input.addEventListener('input', debouncedUpdate);
els.title.addEventListener('input', debouncedRender);
els.subtitle.addEventListener('input', debouncedRender);

els.download.addEventListener('click', () => {
  if (currentMatrix) {
    const safe = (els.input.value.trim() || 'qrcode').replace(/[^a-z0-9]/gi, '_');
    downloadPng(els.canvas, safe + '.png');
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
      customLogoName = file.name;
      els.logoLabel.textContent = file.name;
      els.clearLogo.hidden = false;
      if (currentMatrix) render();
    };
    img.onerror = () => showError('Logo 图片加载失败');
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

els.clearLogo.addEventListener('click', () => {
  customLogo = null;
  customLogoName = null;
  els.logoInput.value = '';
  els.logoLabel.textContent = '自定义 Logo';
  els.clearLogo.hidden = true;
  if (currentMatrix) render();
});

// Slider navigation
els.navPrev.addEventListener('click', () => {
  if (currentSlide > 1) {
    currentSlide--;
    render();
  }
});
els.navNext.addEventListener('click', () => {
  if (currentSlide < TOTAL_SLIDES) {
    currentSlide++;
    render();
  }
});
els.dots.forEach(dot => {
  dot.addEventListener('click', () => {
    const target = Number(dot.dataset.slide);
    if (target !== currentSlide) {
      currentSlide = target;
      render();
    }
  });
});

function preloadDefaultLogo() {
  const img = new Image();
  img.onload = () => {
    console.log(`[qr-app] default logo loaded: ${img.naturalWidth}×${img.naturalHeight}`);
    defaultLogo = img;
    if (currentMatrix) render();
  };
  img.onerror = (e) => {
    console.error('[qr-app] default logo FAILED to load:', DEFAULT_LOGO_URL, e);
    defaultLogo = null;
  };
  img.src = DEFAULT_LOGO_URL;
}

// Initial state
els.download.disabled = true;
els.clearLogo.hidden = true;
updateDots();
preloadDefaultLogo();
