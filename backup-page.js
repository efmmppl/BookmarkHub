(function () {
  const status = document.getElementById('status');
  const count = document.getElementById('local-count');
  const exportButton = document.getElementById('export');
  const importButton = document.getElementById('import');
  const clearCheckbox = document.getElementById('clear-first');
  const fileInput = document.getElementById('backup-file');

  function getTree() {
    return new Promise((resolve, reject) => {
      chrome.bookmarks.getTree((tree) => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(tree);
      });
    });
  }

  async function refreshCount() {
    try {
      const tree = await getTree();
      const payload = BookmarkHubData.exportBookmarks(tree);
      count.textContent = `本地书签：${BookmarkHubData.countBookmarks(payload.bookmarks)} 个`;
    } catch (error) {
      count.textContent = `读取本地书签失败：${error.message}`;
    }
  }

  exportButton.addEventListener('click', async () => {
    exportButton.disabled = true;
    try {
      const tree = await getTree();
      const payload = BookmarkHubData.exportBookmarks(tree, {
        version: chrome.runtime.getManifest().version,
        browser: navigator.userAgent
      });
      const text = JSON.stringify(payload, null, 2);
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      link.href = url;
      link.download = `bookmarkhub-backup-${stamp}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      status.textContent = `已导出 ${BookmarkHubData.countBookmarks(payload.bookmarks)} 个书签。`;
    } catch (error) {
      status.textContent = `导出失败：${error.message}`;
    } finally {
      exportButton.disabled = false;
    }
  });

  importButton.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    importButton.disabled = true;
    try {
      const text = await file.text();
      const data = BookmarkHubData.parseBackup(text);
      const total = BookmarkHubData.countBookmarks(data.bookmarks);
      const clear = clearCheckbox.checked;
      const prompt = clear
        ? `将清空本地书签，并导入 ${total} 个书签，确定吗？`
        : `将把 ${total} 个书签合并到本地，确定吗？`;
      if (!window.confirm(prompt)) return;
      status.textContent = '正在导入…';
      const created = await BookmarkHubData.importBookmarks(data.bookmarks, chrome, { clear });
      status.textContent = `已导入 ${created} 个书签。`;
      await refreshCount();
    } catch (error) {
      status.textContent = `导入失败：${error.message}`;
    } finally {
      importButton.disabled = false;
      fileInput.value = '';
    }
  });

  refreshCount();
})();
