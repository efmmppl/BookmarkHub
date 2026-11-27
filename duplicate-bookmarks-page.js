(function () {
  const t = BookmarkHubI18n.t;
  const groupsContainer = document.getElementById('duplicate-groups');
  const status = document.getElementById('status');
  const selectAllButton = document.getElementById('select-all');
  const deleteButton = document.getElementById('delete-selected');
  let duplicates = [];
  let allSelected = false;

  function updateSelectAllButton() {
    const checkboxes = Array.from(groupsContainer.querySelectorAll('input[type="checkbox"]'));
    allSelected = checkboxes.length > 0 && checkboxes.every((checkbox) => checkbox.checked);
    selectAllButton.textContent = allSelected ? t('deselectAll') : t('selectAll');
  }

  function loadBookmarks(prefix = '') {
    status.textContent = t('scanningBookmarks');
    chrome.bookmarks.getTree((tree) => {
      if (chrome.runtime.lastError) {
        status.textContent = `${prefix}${t('readBookmarksFailed')}${chrome.runtime.lastError.message}`;
        return;
      }
      duplicates = BookmarkHubDuplicates.findDuplicateBookmarks(tree);
      renderGroups(prefix);
    });
  }

  function renderGroups(prefix = '') {
    groupsContainer.replaceChildren();
    if (!duplicates.length) {
      status.textContent = `${prefix}${t('noDuplicates')}`;
      selectAllButton.disabled = true;
      deleteButton.disabled = true;
      return;
    }

    status.textContent = `${prefix}${t('foundDuplicates', [duplicates.length, duplicates.reduce((sum, group) => sum + group.bookmarks.length, 0)])}`;
    duplicates.forEach((group) => {
      const section = document.createElement('section');
      section.className = 'duplicate-group';
      const heading = document.createElement('h2');
      heading.textContent = t('duplicateGroupHeading', [group.bookmarks.length]);
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
        checkbox.setAttribute('aria-label', t('selectAriaLabel', [bookmark.title]));
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
      status.textContent = t('noSelection');
      return;
    }
    if (!window.confirm(t('confirmDeleteSelected', [selected.length]))) return;

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
        ? t('deletedSummary', [removed, failed.length, failed[0].error.message])
        : t('deletedSummaryOk', [removed]);
      loadBookmarks(message);
    } catch (error) {
      status.textContent = `${t('deleteFailed')}${error.message}`;
      deleteButton.disabled = false;
    }
  });

  loadBookmarks();
})();
