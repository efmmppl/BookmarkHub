# AGENTS.md

BookmarkHub：通过 GitHub Gist 同步书签的 Chrome/Edge MV3 扩展。**本仓库是已打包产物**：主界面（popup / options / background）是 `static/` 里的 webpack 打包 chunk，根目录另有手写工具页。

## 测试

- `npm test`（即 `node --test`），Node >= 20，共 21 个用例。
- 测试文件是 `.cjs`，用 `node:test`，通过 require 根目录 UMD 模块 + 注入 fake `globalThis.chrome`。
- **必须从仓库根目录运行**：`tests/service-worker-fetch-adapter.test.cjs` 用相对路径 `fs.readFileSync('static/js/...')` 加载打包产物。
- 单个测试：`node --test tests/settings.test.cjs`。

## 架构要点

- **两类页面**：`static/` 下的 React 打包应用（popup/options/background）vs 根目录手写工具页（`duplicates.html`、`history.html`、`backup.html` + 对应 `*-page.js`）。
- 可单测的逻辑模块都是 UMD 双模式（浏览器暴露 `BookmarkHubSettings` / `BookmarkHubData` / `BookmarkHubDuplicates` 全局，CommonJS 走 `module.exports`）：`settings.js`、`bookmark-data.js`、`duplicate-bookmarks.js`。
- **设置读取**：打包应用把设置用 LZString 压缩存进 `chrome.storage.sync`，工具页读不了。工具页通过 `settings.js` 发起端口连接（端口名 `bookmarkhubSettings`），由 `static/js/settings-bridge.js` 在后台转发。
- **`static/` 与 webpack 模块 id 强耦合**：`background.js` 的 `importScripts` 顺序、`settings-bridge.js`、`install-service-worker-fetch-adapter.js`、fetch-adapter 测试都依赖 chunk 文件名和模块 id。重新打包后必须同步更新这些地方。
- **MV3 网络适配**：打包应用用 Axios 0.18，其 XHR adapter 在 MV3 service worker 不可用；`static/js/service-worker-fetch-adapter.js` 提供 fetch 版 adapter，由 `install-service-worker-fetch-adapter.js` 在后台应用加载前注入。
- **不要直接改 `static/` 里的 chunk**：没有打包源码/构建流程，改动应落在根目录手写文件上。

## 约定

- 提交信息用中文，前缀 `feat:` / `fix:` / `docs:`。
- 界面文案走 `_locales/{en,zh_CN}/messages.json`（`default_locale` 是 `en`）。工具页与弹出页工具入口已接入 i18n：HTML 静态文案用 `data-i18n` 属性，JS 动态文案用 `BookmarkHubI18n.t(key, subs)`（`tools-i18n.js`），占位符用 `$1`/`$2`，`subs` 传数组。新增文案需补 `_locales`。
- 工具页统一引用 `theme.css`（重构后替代旧的 `duplicate-bookmarks*.css` / `tools.css`）；popup 里三个工具入口链接用 `.tool-link` 类。
- `background.js` 顶部把 `chrome.browserAction` 映射到 `chrome.action`（打包代码按 WebExtension API 构建），保持该垫片。
- 无 lint / typecheck / 构建脚本，唯一验证手段是测试。
