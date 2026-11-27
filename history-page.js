(function () {
  const t = BookmarkHubI18n.t;
  const status = document.getElementById('status');
  const list = document.getElementById('revision-list');
  const refreshButton = document.getElementById('refresh');
  const loadMoreButton = document.getElementById('load-more');
  let settings = null;
  let page = 1;

  async function getSettings() {
    const result = await BookmarkHubSettings.getSettings();
    if (result.error) throw new Error(result.error);
    return result;
  }

  async function api(path) {
    const response = await fetch(`${settings.githubURL}${path}`, {
      headers: {
        Authorization: `token ${settings.githubToken}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`GitHub API ${response.status}: ${text.slice(0, 200)}`);
    }
    return response.json();
  }

  async function fetchRevision(version) {
    const gist = await api(`/gists/${settings.gistID}/${version}`);
    const file = BookmarkHubData.extractGistFile(gist, settings.gistFileName);
    if (!file.truncated) {
      if (typeof file.content !== 'string') throw new Error(t('revisionEmptyError'));
      return file.content;
    }
    if (!file.rawUrl) throw new Error(t('revisionTruncatedError'));
    const raw = await fetch(file.rawUrl, {
      headers: { Authorization: `token ${settings.githubToken}` }
    });
    if (!raw.ok) throw new Error(`${t('rawFetchFailed')}${raw.status}`);
    return raw.text();
  }

  function getTree() {
    return new Promise((resolve, reject) => {
      chrome.bookmarks.getTree((tree) => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(tree);
      });
    });
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }

  function renderRevisions(revisions, append) {
    if (!append) list.replaceChildren();
    if (!revisions.length) {
      status.textContent = append ? t('noMoreRevisions') : t('noRevisions');
      loadMoreButton.hidden = true;
      return;
    }

    revisions.forEach((revision) => {
      const row = document.createElement('section');
      row.className = 'revision-row';

      const info = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = formatDate(revision.committed_at);
      const sha = document.createElement('small');
      sha.textContent = revision.version;
      const change = revision.change_status || {};
      const changes = document.createElement('small');
      changes.textContent = t('revisionChanges', [change.additions || 0, change.deletions || 0]);
      info.append(title, sha, changes);

      const actions = document.createElement('div');
      actions.className = 'revision-actions';
      const download = document.createElement('button');
      download.type = 'button';
      download.textContent = t('downloadToLocal');
      download.addEventListener('click', () => restoreToLocal(revision, download));
      const restore = document.createElement('button');
      restore.type = 'button';
      restore.className = 'secondary';
      restore.textContent = t('restoreGist');
      restore.addEventListener('click', () => restoreGist(revision, restore));
      actions.append(download, restore);

      row.append(info, actions);
      list.append(row);
    });

    loadMoreButton.hidden = revisions.length < 100;
  }

  async function loadRevisions(append) {
    if (!append) page = 1;
    status.textContent = t('loadingHistory');
    refreshButton.disabled = true;
    try {
      const revisions = await api(`/gists/${settings.gistID}/commits?per_page=100&page=${page}`);
      renderRevisions(revisions, append);
      if (list.children.length) status.textContent = t('loadedCount', [list.children.length]);
    } catch (error) {
      status.textContent = `${t('loadFailed')}${error.message}`;
    } finally {
      refreshButton.disabled = false;
    }
  }

  async function restoreToLocal(revision, button) {
    if (!window.confirm(t('confirmRestoreLocal', [formatDate(revision.committed_at)]))) return;
    button.disabled = true;
    status.textContent = t('restoringLocal');
    let rollback = null;
    try {
      const tree = await getTree();
      rollback = BookmarkHubData.exportBookmarks(tree);
      const content = await fetchRevision(revision.version);
      const data = BookmarkHubData.parseBackup(content);
      const count = await BookmarkHubData.importBookmarks(data.bookmarks, chrome, { clear: true });
      status.textContent = t('restoredLocalCount', [count]);
    } catch (error) {
      if (rollback) {
        try {
          await BookmarkHubData.importBookmarks(rollback.bookmarks, chrome, { clear: true });
          status.textContent = `${t('historyRestoreFailed')}${error.message}（${t('historyRolledBack')}）`;
          return;
        } catch (rollbackError) {
          status.textContent = `${t('historyRestoreFailed')}${error.message}；${t('historyRollbackFailed')}${rollbackError.message}`;
          return;
        }
      }
      status.textContent = `${t('historyRestoreFailed')}${error.message}`;
    } finally {
      button.disabled = false;
    }
  }

  async function restoreGist(revision, button) {
    if (!window.confirm(t('confirmRestoreGist', [formatDate(revision.committed_at)]))) return;
    button.disabled = true;
    status.textContent = t('restoringGist');
    try {
      const content = await fetchRevision(revision.version);
      const response = await fetch(`${settings.githubURL}/gists/${settings.gistID}`, {
        method: 'PATCH',
        headers: {
          Authorization: `token ${settings.githubToken}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ files: { [settings.gistFileName]: { content } } })
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`GitHub API ${response.status}: ${text.slice(0, 200)}`);
      }
      status.textContent = t('gistRestored');
    } catch (error) {
      status.textContent = `${t('historyRestoreFailed')}${error.message}`;
    } finally {
      button.disabled = false;
    }
  }

  refreshButton.addEventListener('click', () => loadRevisions(false));
  loadMoreButton.addEventListener('click', () => {
    page += 1;
    loadRevisions(true);
  });

  (async () => {
    try {
      settings = await getSettings();
      if (!settings.githubToken || !settings.gistID) {
        status.textContent = t('historyNeedSettings');
        refreshButton.disabled = true;
        return;
      }
      await loadRevisions(false);
    } catch (error) {
      status.textContent = `${t('historyInitFailed')}${error.message}`;
    }
  })();
})();
