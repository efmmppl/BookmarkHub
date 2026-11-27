(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BookmarkHubSettings = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const defaults = {
    githubToken: '',
    gistID: '',
    gistFileName: 'BookmarkHub',
    githubURL: 'https://api.github.com'
  };

  function normalize(settings) {
    if (typeof settings.githubURL === 'string') {
      settings.githubURL = settings.githubURL.replace(/\/+$/, '');
    }
    return settings;
  }

  function getSettings(timeoutMs) {
    return new Promise((resolve) => {
      let settled = false;
      let port = null;
      let timer = null;

      function finish(settings) {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        if (port) {
          try {
            port.disconnect();
          } catch (error) { /* ignore */ }
        }
        resolve(settings);
      }

      try {
        port = chrome.runtime.connect({ name: 'bookmarkhubSettings' });
      } catch (error) {
        finish({ ...defaults });
        return;
      }

      timer = setTimeout(() => finish({ ...defaults }), timeoutMs || 3000);

      port.onMessage.addListener((response) => {
        if (!response) {
          finish({ ...defaults });
          return;
        }
        if (response.error) {
          finish({ ...defaults, error: response.error });
          return;
        }
        finish(normalize({ ...defaults, ...response }));
      });

      port.onDisconnect.addListener(() => {
        finish({ ...defaults });
      });
    });
  }

  return { getSettings };
});
