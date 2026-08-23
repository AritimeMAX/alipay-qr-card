# 支付宝挪车码生成

一个零依赖（除两个本地 vendor 库外）的网页应用，做两件事：

1. **生成**：输入 URL（任意文本），实时生成可扫描的二维码 PNG，支持加中央 Logo
2. **反向**：上传二维码图片，识别出里面的 URL/文本，回填到输入框

适合"挪车码"这种场景：快速生成可打印的二维码卡，也支持把已有的二维码图片反向识别。

## 在线使用

无需部署，直接打开：

- **GitHub Pages**（推荐）：https://aritimemax.github.io/alipay-qr-card/
- 本地：见下方"本地运行"

## 本地运行

需要起一个本地 HTTP server（因为用 ES Module，`file://` 协议会被浏览器 CORS 拦）：

```bash
cd qr-app
python3 -m http.server 8000
# 浏览器打开 http://localhost:8000
```

## 功能

### 生成二维码

1. 在输入框粘贴 URL（或任意文本）
2. 二维码实时生成（slide 1：纯 QR；slide 2：带标题/副标题的卡片）
3. 可选：点「选择 Logo」上传自己的图片嵌入中央（默认自动去除白色背景）
4. 点「下载 PNG」保存当前 slide

### 反向识别二维码

1. 点 URL 输入框右边的「扫二维码」按钮
2. 选一张包含二维码的图片（截图、拍照都行，PNG/JPG 都支持）
3. 识别成功后 URL 自动填入输入框，二维码立即重新生成

## 文件结构

```
qr-app/
├── index.html              # UI 壳子
├── styles.css              # 样式
├── js/
│   ├── app.js              # 事件绑定、UI 状态、扫描逻辑
│   ├── encoder.js          # 包装 qrcode 库（生成）
│   └── render.js           # 矩阵 + Logo → canvas → PNG
├── vendor/
│   ├── qrcode.js           # qrcode-generator@1.4.4（生成）
│   └── jsQR.js             # jsqr@1.4.0（识别）
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

- **依赖**：
  - `vendor/qrcode.js`（MIT, qrcode-generator by Kazuhiko Arase, 2009）
  - `vendor/jsQR.js`（Apache-2.0, Cosmo Wolfe, 2017）
- **版本**：库自动选择 V1–V40；EC 等级固定 **H**（~30% 抗损，为中央 Logo 留冗余）
- **离线可用**：vendor 库本地化，**无 CDN 依赖**
- **浏览器**：需要支持 ES Module 的现代浏览器
