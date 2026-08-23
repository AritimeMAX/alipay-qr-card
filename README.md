# URL → QR

一个零依赖（除一个本地 vendor 库外）的网页应用，把 URL 转成可扫描的二维码 PNG。

## 怎么跑

需要起一个本地 HTTP server（因为用 ES Module，`file://` 协议会被浏览器 CORS 拦）：

```bash
cd qr-app
python3 -m http.server 8000
# 浏览器打开 http://localhost:8000
```

## 用法

1. 在输入框粘贴 URL
2. 二维码自动生成
3. 点「下载 PNG」保存

## 文件结构

```
qr-app/
├── index.html              # UI 壳子
├── styles.css              # 样式
├── js/
│   ├── app.js              # 事件绑定、UI 状态
│   ├── encoder.js          # 包装 qrcode 库
│   └── render.js           # 矩阵 → canvas → PNG
├── vendor/
│   └── qrcode.js           # qrcode-generator@1.4.4 (本地)
├── tests/
│   └── test-runner.mjs     # 单元测试（node 跑）
├── archive/
│   └── handwritten/        # 早期手写 QR 编码器（学习用，已废弃）
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-08-23-qr-url-app-design.md
```

## 测试

```bash
# 单元测试
node tests/test-runner.mjs
```

扫端到端验证用 `jsQR`（在外部 `/tmp/qr-verify` 目录，依赖 node-canvas）：

```bash
cd /tmp/qr-verify
node verify.mjs
```

## 一些限制

- **依赖**：`vendor/qrcode.js`（MIT, qrcode-generator by Kazuhiko Arase, 2009）
- **版本**：库自动选择 V1–V40；EC 等级固定 M
- **离线可用**：vendor 库本地化，**无 CDN 依赖**
- **浏览器**：需要支持 ES Module 的现代浏览器
