(function () {
  const groupsContainer = document.getElementById('duplicate-groups');
  const status = document.getElementById('status');
  const selectAllButton = document.getElementById('select-all');
  const deleteButton = document.getElementById('delete-selected');
  let duplicates = [];
  let allSelected = false;

  function updateSelectAllButton() {
    const checkboxes = Array.from(groupsContainer.querySelectorAll('input[type="checkbox"]'));
    allSelected = checkboxes.length > 0 && checkboxes.every((checkbox) => checkbox.checked);
    selectAllButton.textContent = allSelected ? '取消全选' : '全选（每组保留一个）';
  }

  function loadBookmarks(prefix = '') {
    status.textContent = '正在扫描书签…';
    chrome.bookmarks.getTree((tree) => {
      if (chrome.runtime.lastError) {
        status.textContent = `${prefix}读取书签失败：${chrome.runtime.lastError.message}`;
        return;
      }
      duplicates = BookmarkHubDuplicates.findDuplicateBookmarks(tree);
      renderGroups(prefix);
    });
  }

  function renderGroups(prefix = '') {
    groupsContainer.replaceChildren();
    if (!duplicates.length) {
      status.textContent = `${prefix}没有发现网址完全相同的重复书签。`;
      selectAllButton.disabled = true;
      deleteButton.disabled = true;
      return;
    }

    status.textContent = `${prefix}发现 ${duplicates.length} 组重复网址，共 ${duplicates.reduce((sum, group) => sum + group.bookmarks.length, 0)} 个书签。`;
    duplicates.forEach((group) => {
      const section = document.createElement('section');
      section.className = 'duplicate-group';
      const heading = document.createElement('h2');
      heading.textContent = `重复网址（${group.bookmarks.length} 个）`;
      const link = document.createElement('a');
      link.href = group.url;
      link.textContent = group.url;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.className = 'group-url';
      section.append(heading, link);

      group.bookmarks.forEach((bookmark) => {
        const label = document.createElement('label');
        label.className = 'bookmark-row';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = bookmark.id;
        checkbox.setAttribute('aria-label', `选择删除 ${bookmark.title}`);
        checkbox.addEventListener('change', updateSelectAllButton);
        const details = document.createElement('span');
        const title = document.createElement('strong');
        title.textContent = bookmark.title;
        const path = document.createElement('small');
        path.textContent = bookmark.path;
        details.append(title, path);
        label.append(checkbox, details);
        section.append(label);
      });
      groupsContainer.append(section);
    });

    selectAllButton.disabled = false;
    deleteButton.disabled = false;
    updateSelectAllButton();
  }

  selectAllButton.addEventListener('click', () => {
    const checkboxes = Array.from(groupsContainer.querySelectorAll('input[type="checkbox"]'));
    if (allSelected) {
      checkboxes.forEach((checkbox) => { checkbox.checked = false; });
    } else {
      const idsToDelete = new Set(BookmarkHubDuplicates.getSelectAllIds(duplicates));
      checkboxes.forEach((checkbox) => { checkbox.checked = idsToDelete.has(checkbox.value); });
    }
    updateSelectAllButton();
  });

  deleteButton.addEventListener('click', async () => {
    const selected = Array.from(groupsContainer.querySelectorAll('input[type="checkbox"]:checked'));
    if (!selected.length) {
      status.textContent = '请先勾选要删除的书签。';
      return;
    }
    if (!window.confirm(`确定删除选中的 ${selected.length} 个书签吗？此操作无法撤销。`)) return;

    deleteButton.disabled = true;
    try {
      const { removed, failed } = await BookmarkHubDuplicates.removeBookmarks(
        selected.map((checkbox) => checkbox.value),
        (id) => new Promise((resolve, reject) => {
          chrome.bookmarks.remove(id, () => {
            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
            else resolve();
          });
        })
      );
      const message = failed.length
        ? `已删除 ${removed} 个书签，${failed.length} 个删除失败：${failed[0].error.message}。`
        : `已删除 ${removed} 个书签。`;
      loadBookmarks(message);
    } catch (error) {
      status.textContent = `删除失败：${error.message}`;
      deleteButton.disabled = false;
    }
  });

  loadBookmarks();
})();
