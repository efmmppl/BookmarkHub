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
BookmarkHub_0.0.4/
├── manifest.json                 # 扩展清单（MV3）
├── background.js / background.html
├── popup.html                    # 工具栏弹出页
├── options.html                  # 设置页
├── duplicates.html               # 重复书签页
├── duplicate-bookmarks.js        # 重复书签查找逻辑（可单测）
├── duplicate-bookmarks-page.js   # 重复书签页交互
├── duplicate-bookmarks.css
├── duplicate-bookmarks-link.css
├── icons/                        # 16 / 32 / 48 / 128 图标
├── _locales/en、zh_CN            # 文案
├── static/                       # 打包后的 React 页面与后台脚本
└── tests/duplicate-bookmarks.test.cjs
```

主界面与后台同步逻辑在 `static/js` 的 webpack 产物中；重复书签功能是本目录中的独立脚本。

## 权限

- `bookmarks`：读写本地书签
- `storage`：保存 Token、Gist 配置与通知开关
- `notifications`：操作结果通知
- `https://*.github.com/*`、`https://*.githubusercontent.com/*`：访问 GitHub API / Gist

后台通过 `https://api.github.com` 读写 Gist，请求头使用 `Authorization: token <GitHub Token>`。

## 测试

重复书签逻辑可用 Node 内置测试运行：

```powershell
node --test tests/duplicate-bookmarks.test.cjs
```

覆盖两点：仅当 URL 完全相同时归为一组；全选时每组保留第一条，其余标为待删除。
