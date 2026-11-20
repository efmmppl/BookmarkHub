// The bundled background code was built against the WebExtension browserAction API.
// Chrome MV3 exposes the equivalent API as chrome.action.
if (chrome.action && !chrome.browserAction) {
  Object.defineProperty(chrome, 'browserAction', {
    value: chrome.action,
    configurable: true
  });
}

importScripts(
  'static/js/runtime-background.8bf6f715.js',
  'static/js/0.21c7cb30.chunk.js',
  'static/js/8.8c0486d4.chunk.js',
  'static/js/background.db1159e9.chunk.js'
);
