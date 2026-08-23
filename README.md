# 支付宝挪车码生成

一个零依赖（除一个本地 vendor 库外）的网页应用，把 URL 转成可扫描的二维码 PNG，支持自定义中央 Logo。

## 怎么跑

需要起一个本地 HTTP server（因为用 ES Module，`file://` 协议会被浏览器 CORS 拦）：

```bash
cd qr-app
python3 -m http.server 8000
# 浏览器打开 http://localhost:8000
```

## 用法

1. 在输入框粘贴 URL
2. 二维码自动生成（slide 1：纯 QR；slide 2：带标题/副标题的卡片）
3. 可选：点「选择 Logo」上传自己的图片，嵌入 QR 中央
4. 点「下载 PNG」保存当前 slide

## 文件结构

```
qr-app/
├── index.html              # UI 壳子
├── styles.css              # 样式
├── js/
│   ├── app.js              # 事件绑定、UI 状态
│   ├── encoder.js          # 包装 qrcode 库
│   └── render.js           # 矩阵 + Logo → canvas → PNG
├── vendor/
│   └── qrcode.js           # qrcode-generator@1.4.4 (本地)
├── tests/
│   └── test-runner.mjs     # 单元测试（node 跑）
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-08-23-qr-url-app-design.md
```

## 测试

```bash
node tests/test-runner.mjs
```

## ⚠️ 商标 / Logo 使用说明

**本项目不内置任何品牌 logo**。如需在 QR 码中央嵌入第三方品牌标识（例如支付宝、微信等），请：

1. 自行**确保已获得该品牌方的使用授权**
2. 通过界面上的「选择 Logo」按钮上传你拥有的图片

工具作者不为用户上传的品牌资产承担任何法律责任。

## 一些限制

- **依赖**：`vendor/qrcode.js`（MIT, qrcode-generator by Kazuhiko Arase, 2009）
- **版本**：库自动选择 V1–V40；EC 等级固定 **H**（~30% 抗损，为中央 Logo 留冗余）
- **离线可用**：vendor 库本地化，**无 CDN 依赖**
- **浏览器**：需要支持 ES Module 的现代浏览器
