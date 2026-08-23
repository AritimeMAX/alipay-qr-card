# QR URL App — Design Spec

**Date:** 2026-08-23
**Status:** Approved (compressed flow per user request)
**Type:** Personal / learning project

## Goal

A minimal, dependency-free web app that converts a URL into a scannable QR code and lets the user download it as a PNG. The QR encoder is **hand-written** (no library) so the user can learn the algorithm by implementing it.

## Scope

### In scope
- Web app (single HTML page, vanilla JS, no build, no framework, no dependencies)
- URL → QR code (byte mode only, EC level M fixed)
- QR versions 1–10 (covers URLs up to ~228 bytes at level M)
- Download as PNG
- Inline error messages
- Browser-based test page that runs against ISO/IEC 18004 reference vectors

### Out of scope (YAGNI)
- Other content types (text, vCard, Wi-Fi, etc.)
- UI customization (color, size, error correction level, logo)
- SVG export
- History / persistence
- QR decoding (reverse direction)
- Mobile / desktop packaging
- CI / lint / format

## Architecture

Two-layer separation; encoder layer has no DOM dependencies so it can be tested in isolation.

```
UI Layer        index.html + app.js + render.js
  │              (events, canvas, download)
  │ boolean[][]
  ▼
Encoder Layer   encoder.js + data-encoding.js
                 + reed-solomon.js + matrix.js + mask.js
                 (pure logic, unit-testable)
```

## Components

```
qr-app/
├── index.html              # UI shell
├── styles.css              # minimal styles
├── js/
│   ├── app.js              # entry; binds UI events
│   ├── encoder.js          # main orchestrator
│   ├── data-encoding.js    # URL → bit stream (byte mode)
│   ├── reed-solomon.js     # GF(256) + polynomial division
│   ├── matrix.js           # build matrix: function patterns + data
│   ├── mask.js             # 8 mask patterns + penalty + best-pick
│   └── render.js           # matrix → canvas → PNG download
├── tests/
│   ├── test.html           # browser test runner page
│   ├── test-runner.mjs     # node test runner (same assertions)
│   └── cases.mjs           # ISO reference vector cases
└── README.md
```

## Data flow

```
User types URL
   ↓
app.js: input event, debounce 200ms
   ↓
encoder.encode(url) → { matrix: boolean[][], size: number, version: number }
   ↓
render.drawToCanvas(matrix, size, canvas)
   ↓
User clicks Download → canvas.toBlob() → <a download> triggers save
```

## Error handling

| Condition | UI |
|---|---|
| Empty input | No QR rendered; download button disabled |
| URL > 228 bytes | Red border + inline message: "URL 太长（当前 X 字符，最多 228 字节）" |
| Encoder throws (defensive) | Inline message: "生成失败，请重试" |

No alerts, no modals.

## Testing

Test runner is a small (~30 line) `assert` + `test` helper. Two execution modes:
- **Browser:** open `tests/test.html` — results printed inline, color-coded
- **Node:** `node tests/test-runner.mjs` — results printed to stdout

Mandatory test cases:
1. **Reed-Solomon math:** known generator → known codewords
2. **EC recovery:** corrupt 10% of codewords → decode still recovers original
3. **Data encoding:** known URL → known bit stream (byte mode header)
4. **Mask selection:** 8 patterns applied → lowest-penalty one chosen
5. **End-to-end ISO vector:** "HELLO WORLD" sample from ISO/IEC 18004 → full 21×21 matrix matches spec

ES Modules in the codebase require a local HTTP server (`file://` blocked by CORS). Documented in README.

## Key technical decisions

| Decision | Choice | Why |
|---|---|---|
| QR mode | Byte mode | URLs are ASCII, byte mode is simplest; no alphanumeric K-J compression needed |
| EC level | M (fixed) | ~15% recovery, best size/reliability trade-off for personal use |
| Versions | 1–10 | Covers any realistic URL; 40 versions adds too much edge-case code |
| Render | HTML5 Canvas | Simplest, gives PNG export for free via `toBlob` |
| Download | `<a download>` + `canvas.toBlob` | No third-party file-saver needed |
| Module system | ES Modules | Native, no bundler, works in browser and node |
| Test framework | Custom 30-line harness | Avoids adding vitest/jest which would require a build step |
| Styling | Plain CSS | No Tailwind, no preprocessor |

## Definition of done

1. `index.html` opens in a browser and accepts a URL
2. Generated QR scans correctly with any standard phone scanner
3. Downloaded PNG opens and is a valid scannable QR
4. All tests pass (browser + node)
5. Total project size < 1 MB
6. Zero runtime dependencies
