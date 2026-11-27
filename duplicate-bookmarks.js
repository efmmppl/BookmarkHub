(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BookmarkHubDuplicates = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function findDuplicateBookmarks(tree) {
    const byUrl = new Map();

    function visit(nodes, folders) {
      for (const node of nodes || []) {
        if (node.url) {
          const bookmarks = byUrl.get(node.url) || [];
          bookmarks.push({
            id: node.id,
            title: node.title || node.url,
            url: node.url,
            path: folders.join(' / ') || '书签栏'
          });
          byUrl.set(node.url, bookmarks);
        } else if (node.children) {
          const isRoot = node.id === '0' || node.id === 'root________';
          const nextFolders = isRoot ? folders : folders.concat(node.title || '未命名文件夹');
          visit(node.children, nextFolders);
        }
      }
    }

    visit(tree, []);
    return Array.from(byUrl, ([url, bookmarks]) => ({ url, bookmarks }))
      .filter(({ bookmarks }) => bookmarks.length > 1)
      .sort((a, b) => a.url.localeCompare(b.url));
  }

  function getSelectAllIds(groups) {
    return groups.flatMap(({ bookmarks }) => bookmarks.slice(1).map(({ id }) => id));
  }

  async function removeBookmarks(ids, remove) {
    const results = await Promise.allSettled(ids.map((id) => Promise.resolve().then(() => remove(id))));
    const failed = [];
    results.forEach((result, index) => {
      if (result.status === 'rejected') failed.push({ id: ids[index], error: result.reason });
    });
    return { removed: ids.length - failed.length, failed };
  }

  return { findDuplicateBookmarks, getSelectAllIds, removeBookmarks };
});
