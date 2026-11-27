# BookmarkHub 0.0.4

BookmarkHub 是一款浏览器扩展，通过 GitHub Gist 在不同浏览器之间同步书签。作者 dudor，源码主页：https://www.github.com/dudor/BookmarkHub

当前目录是已打包的扩展产物（Manifest V3），面向 Chrome / Microsoft Edge。界面语言支持英文与简体中文（`default_locale` 为 `en`）。

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

弹出页会显示本地书签数量与远程书签数量。

## 使用前准备

1. 在 GitHub 创建一个具有 `gist` 权限的 Personal Access Token。
2. 新建一个 Gist（建议私有），记下 Gist ID，并确定文件名（默认 `BookmarkHub`）。
3. 在浏览器中加载本扩展（开发者模式 → 加载已解压的扩展程序，选择本目录）。
4. 打开扩展设置，填入 Token、Gist ID、文件名，并按需开启通知。

下载与清空会改写或删除本地书签，使用前请确认已有备份。

## 目录结构

```
BookmarkHub/
├── manifest.json                 # 扩展清单（MV3）
├── background.js                 # MV3 service worker 入口
├── package.json                  # 测试脚本（npm test）
├── popup.html                    # 工具栏弹出页
├── options.html                  # 设置页
├── duplicates.html               # 重复书签页
├── duplicate-bookmarks.js        # 重复书签查找逻辑（可单测）
├── duplicate-bookmarks-page.js   # 重复书签页交互
├── duplicate-bookmarks.css
├── duplicate-bookmarks-link.css
├── history.html                  # 书签历史页
├── history-page.js               # 书签历史页交互
├── backup.html                   # 备份/恢复页
├── backup-page.js                # 备份页交互
├── bookmark-data.js              # 导出/导入/Gist 文件解析逻辑（可单测）
├── settings.js                   # 读取后台设置（可单测）
├── tools.css                     # 工具页共用样式
├── icons/                        # 16 / 32 / 48 / 128 图标
├── _locales/en、zh_CN            # 文案
├── static/                       # 打包后的 React 页面与后台脚本
└── tests/                        # Node 内置测试
```

主界面与后台同步逻辑在 `static/js` 的 webpack 产物中；重复书签、书签历史、备份/恢复是本目录中的独立脚本，通过后台 `settings-bridge.js` 读取打包应用的设置。

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

也可以直接运行 `node --test`。覆盖重复书签分组、全选保留一条、批量删除与失败上报、备份导出/导入与 Gist 文件解析、设置读取，以及 MV3 fetch adapter 的请求/响应（含 `responseType: 'blob'`）。
