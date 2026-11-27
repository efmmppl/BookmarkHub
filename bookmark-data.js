(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BookmarkHubData = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const ROOT_TITLES = {
    '1': 'ToolbarFolder',
    'toolbar_____': 'ToolbarFolder',
    '2': 'UnfiledFolder',
    'unfiled_____': 'UnfiledFolder',
    'menu________': 'MenuFolder',
    '3': 'MobileFolder',
    'mobile______': 'MobileFolder'
  };

  const ROOT_PARENTS = {
    ToolbarFolder: '1',
    UnfiledFolder: '2',
    MenuFolder: '2',
    MobileFolder: '3'
  };

  function cleanNode(node) {
    if (node.url) return { title: node.title || node.url, url: node.url };
    return {
      title: node.title || '未命名文件夹',
      children: (node.children || []).map(cleanNode)
    };
  }

  function exportBookmarks(tree, meta = {}) {
    const root = tree && tree[0];
    const bookmarks = ((root && root.children) || []).map((node) => {
      const title = ROOT_TITLES[node.id] || node.title;
      return cleanNode({ ...node, title });
    });
    return {
      version: meta.version || '1',
      browser: meta.browser || '',
      createDate: Date.now(),
      bookmarks
    };
  }

  function parseBackup(text) {
    let data;
    try {
      data = JSON.parse(text);
    } catch (error) {
      throw new Error('备份文件不是有效的 JSON');
    }
    if (!data || !Array.isArray(data.bookmarks)) {
      throw new Error('备份文件缺少 bookmarks 数组');
    }
    return data;
  }

  function countBookmarks(nodes) {
    let count = 0;
    for (const node of nodes || []) {
      if (node.url) count += 1;
      else count += countBookmarks(node.children);
    }
    return count;
  }

  function extractGistFile(gist, fileName) {
    const file = gist && gist.files && gist.files[fileName];
    if (!file) throw new Error(`Gist 中找不到文件 ${fileName}`);
    return {
      content: file.content,
      truncated: Boolean(file.truncated),
      rawUrl: file.raw_url
    };
  }

  function readLastError(chromeApi) {
    return chromeApi.runtime && chromeApi.runtime.lastError;
  }

  function getTree(chromeApi) {
    return new Promise((resolve, reject) => {
      chromeApi.bookmarks.getTree((tree) => {
        const lastError = readLastError(chromeApi);
        if (lastError) reject(new Error(lastError.message));
        else resolve(tree);
      });
    });
  }

  function removeTree(chromeApi, id) {
    return new Promise((resolve, reject) => {
      chromeApi.bookmarks.removeTree(id, () => {
        const lastError = readLastError(chromeApi);
        if (lastError) reject(new Error(lastError.message));
        else resolve();
      });
    });
  }

  function createBookmark(chromeApi, node) {
    return new Promise((resolve, reject) => {
      chromeApi.bookmarks.create(node, (created) => {
        const lastError = readLastError(chromeApi);
        if (lastError) reject(new Error(lastError.message));
        else resolve(created);
      });
    });
  }

  async function clearBookmarks(chromeApi) {
    const tree = await getTree(chromeApi);
    const root = tree && tree[0];
    for (const top of (root && root.children) || []) {
      for (const child of top.children || []) {
        await removeTree(chromeApi, child.id);
      }
    }
  }

  async function importBookmarks(nodes, chromeApi, options = {}) {
    if (options.clear) await clearBookmarks(chromeApi);

    let count = 0;

    async function visit(node, parentId) {
      if (node.url) {
        await createBookmark(chromeApi, {
          parentId: parentId || '2',
          title: node.title || node.url,
          url: node.url
        });
        count += 1;
        return;
      }

      if (!parentId && ROOT_PARENTS[node.title]) {
        for (const child of node.children || []) await visit(child, ROOT_PARENTS[node.title]);
        return;
      }

      const folder = await createBookmark(chromeApi, {
        parentId: parentId || '2',
        title: node.title || '未命名文件夹'
      });
      for (const child of node.children || []) await visit(child, folder.id);
    }

    for (const node of nodes || []) await visit(node, undefined);
    return count;
  }

  return {
    exportBookmarks,
    parseBackup,
    countBookmarks,
    extractGistFile,
    importBookmarks,
    clearBookmarks
  };
});
