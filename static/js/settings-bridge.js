/* Bridge: expose the bundled app's sync settings to extension pages via a port. */
(this.webpackJsonpbookmarkhub = this.webpackJsonpbookmarkhub || []).push([
  [98],
  {
    998: function (module, exports, require) {
      var storage = require(24).a;
      chrome.runtime.onConnect.addListener(function (port) {
        if (port.name !== 'bookmarkhubSettings') return;
        storage.getAll().then(function (settings) {
          port.postMessage({
            githubToken: settings.githubToken || '',
            gistID: settings.gistID || '',
            gistFileName: settings.gistFileName || 'BookmarkHub',
            githubURL: (settings.githubURL || 'https://api.github.com').replace(/\/+$/, '')
          });
        }).catch(function (error) {
          port.postMessage({ error: error.message });
        });
      });
    }
  },
  [[998, 8]]
]);
