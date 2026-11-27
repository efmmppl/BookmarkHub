(function () {
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
      if (typeof file.content !== 'string') throw new Error('Gist 文件内容为空');
      return file.content;
    }
    if (!file.rawUrl) throw new Error('Gist 文件被截断且缺少 raw 地址');
    const raw = await fetch(file.rawUrl, {
      headers: { Authorization: `token ${settings.githubToken}` }
    });
    if (!raw.ok) throw new Error(`读取 raw 内容失败：${raw.status}`);
    return raw.text();
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }

  function renderRevisions(revisions, append) {
    if (!append) list.replaceChildren();
    if (!revisions.length) {
      status.textContent = append ? '没有更多版本了。' : '没有历史版本。';
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
      changes.textContent = `+${change.additions || 0} / -${change.deletions || 0}`;
      info.append(title, sha, changes);

      const actions = document.createElement('div');
      actions.className = 'revision-actions';
      const download = document.createElement('button');
      download.type = 'button';
      download.textContent = '下载到本地';
      download.addEventListener('click', () => restoreToLocal(revision, download));
      const restore = document.createElement('button');
      restore.type = 'button';
      restore.className = 'secondary';
      restore.textContent = '恢复 Gist';
      restore.addEventListener('click', () => restoreGist(revision, restore));
      actions.append(download, restore);

      row.append(info, actions);
      list.append(row);
    });

    loadMoreButton.hidden = revisions.length < 100;
  }

  async function loadRevisions(append) {
    if (!append) page = 1;
    status.textContent = '正在读取 Gist 历史…';
    refreshButton.disabled = true;
    try {
      const revisions = await api(`/gists/${settings.gistID}/commits?per_page=100&page=${page}`);
      renderRevisions(revisions, append);
      if (list.children.length) status.textContent = `共加载 ${list.children.length} 个版本。`;
    } catch (error) {
      status.textContent = `读取失败：${error.message}`;
    } finally {
      refreshButton.disabled = false;
    }
  }

  async function restoreToLocal(revision, button) {
    if (!window.confirm(`将清空本地书签并写入 ${formatDate(revision.committed_at)} 的版本，确定吗？`)) return;
    button.disabled = true;
    status.textContent = '正在恢复本地书签…';
    try {
      const content = await fetchRevision(revision.version);
      const data = BookmarkHubData.parseBackup(content);
      const count = await BookmarkHubData.importBookmarks(data.bookmarks, chrome, { clear: true });
      status.textContent = `已恢复 ${count} 个书签到本地。`;
    } catch (error) {
      status.textContent = `恢复失败：${error.message}`;
    } finally {
      button.disabled = false;
    }
  }

  async function restoreGist(revision, button) {
    if (!window.confirm(`把 Gist 回滚到 ${formatDate(revision.committed_at)} 的版本，确定吗？`)) return;
    button.disabled = true;
    status.textContent = '正在恢复 Gist…';
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
      status.textContent = 'Gist 已回滚到所选版本。';
    } catch (error) {
      status.textContent = `恢复失败：${error.message}`;
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
        status.textContent = '请先在设置中填写 GitHub Token 和 Gist ID。';
        refreshButton.disabled = true;
        return;
      }
      await loadRevisions(false);
    } catch (error) {
      status.textContent = `初始化失败：${error.message}`;
    }
  })();
})();
