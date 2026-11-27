# BookmarkHub

通过 GitHub Gist 在不同浏览器之间同步书签的浏览器扩展。作者 dudor，源码主页：https://www.github.com/dudor/BookmarkHub

本目录是已打包的扩展产物（Manifest V3），面向 Chrome / Microsoft Edge。界面语言支持英文与简体中文（`default_locale` 为 `en`）。

## 功能

| 功能 | 说明 |
| --- | --- |
| 上传书签 | 把本地浏览器书签全部上传到 Gist |
| 下载书签 | 先清空本地书签，再把 Gist 上的书签全部写入本地 |
| 同步书签 | 把 Gist 上的书签合并到本地，再上传回 Gist |
| 清空本地书签 | 删除本地全部书签，操作前请先备份 |
| 查找重复书签 | 按网址完全相同分组，可勾选删除，不删除文件夹 |
| 书签历史 | 浏览 Gist 的历史版本，可恢复到本地书签或回滚 Gist |
| 备份/恢复 | 把本地书签导出为 JSON 备份，或从备份文件导入（可选清空本地） |
| 设置 | 配置 GitHub Token、Gist ID、Gist 文件名、是否启用通知 |

弹出页会显示本地书签数量与远程书签数量，并可从「查找重复书签」「书签历史」「备份/恢复」三个入口打开工具页。

## 快速上手

1. 在 GitHub 创建一个具有 `gist` 权限的 Personal Access Token。
2. 新建一个 Gist（建议私有），记下 Gist ID，并确定文件名（默认 `BookmarkHub`）。
3. 在浏览器中加载本扩展：开发者模式 → 加载已解压的扩展程序 → 选择本目录。
4. 打开扩展设置，填入 Token、Gist ID、文件名，并按需开启通知。

> 下载、清空、书签历史恢复会改写或删除本地书签，操作前请先用「备份/恢复」导出备份。

## 目录结构

```
BookmarkHub/
├── manifest.json                 # 扩展清单（MV3）
├── background.js                 # MV3 service worker 入口
├── package.json                  # 测试脚本（npm test）
├── popup.html                    # 工具栏弹出页
├── options.html                  # 设置页
├── options-save.js               # 设置页保存按钮与头部注入
├── duplicates.html               # 重复书签页
├── duplicate-bookmarks.js        # 重复书签查找逻辑（可单测）
├── duplicate-bookmarks-page.js   # 重复书签页交互
├── theme.css                     # 全扩展统一主题样式
├── history.html                  # 书签历史页
├── history-page.js               # 书签历史页交互
├── backup.html                   # 备份/恢复页
├── backup-page.js                # 备份页交互
├── bookmark-data.js              # 导出/导入/Gist 文件解析逻辑（可单测）
├── settings.js                   # 通过端口读取后台设置（可单测）
├── icons/                        # 16 / 32 / 48 / 128 图标
├── _locales/en、zh_CN            # 文案
├── static/                       # 打包后的 React 页面与后台脚本
└── tests/                        # Node 内置测试
```

## 架构说明

- **主界面与后台同步逻辑**：`static/js` 下的 webpack 打包产物（popup / options / background）。
- **工具页**：重复书签、书签历史、备份/恢复是根目录下的独立手写页面，不依赖打包产物。
- **设置读取**：打包应用把设置用 LZString 压缩后存入 `chrome.storage.sync`，工具页无法直接读取。后台通过 `static/js/settings-bridge.js`（webpack 模块桥接）把设置以端口消息暴露给页面。
- **MV3 网络适配**：打包应用使用 Axios 0.18，其 XHR adapter 在 MV3 service worker 中不可用；`static/js/service-worker-fetch-adapter.js` 提供了基于 fetch 的替代 adapter。

## 权限

- `bookmarks`：读写本地书签
- `storage`：保存 Token、Gist 配置与通知开关
- `notifications`：操作结果通知
- `https://api.github.com/*`、`https://gist.githubusercontent.com/*`：访问 GitHub API / Gist

后台通过 `https://api.github.com` 读写 Gist，请求头使用 `Authorization: token <GitHub Token>`。

## 测试

测试使用 Node 内置测试运行器：

```powershell
npm test
```

也可以直接运行 `node --test`。共 21 个用例，覆盖：

- 重复书签分组、全选保留一条、批量删除与失败上报
- 备份导出/导入、Gist 文件解析
- 后台设置读取（含超时兜底）
- MV3 fetch adapter 的请求/响应（含 `responseType: 'blob'`）

## 注意事项

- 工具页与弹出页工具入口文案已接入 `_locales`，新增文案需补 `en` / `zh_CN` 的 key。
- `settings-bridge.js` 与 fetch adapter 依赖打包产物中的模块 id，重新打包后需同步更新。
- 书签历史的「下载到本地」会先清空本地书签再导入；恢复失败时会自动还原导入前的书签，但仍建议操作前先备份。
