const test = require('node:test');
const assert = require('node:assert/strict');

function fakePort() {
  let messageListener = null;
  let disconnectListener = null;
  return {
    postMessage(message) {
      if (messageListener) messageListener(message);
    },
    disconnect() {},
    onMessage: {
      addListener(callback) { messageListener = callback; }
    },
    onDisconnect: {
      addListener(callback) { disconnectListener = callback; }
    },
    emitMessage(message) {
      if (messageListener) messageListener(message);
    },
    emitDisconnect() {
      if (disconnectListener) disconnectListener();
    }
  };
}

function loadSettings(connectImpl) {
  delete require.cache[require.resolve('../settings.js')];
  globalThis.chrome = {
    runtime: {
      lastError: undefined,
      connect(connectInfo) { return connectImpl(connectInfo); }
    }
  };
  return require('../settings.js');
}

test('getSettings resolves with settings from the background', async () => {
  let port;
  const api = loadSettings((connectInfo) => {
    assert.equal(connectInfo.name, 'bookmarkhubSettings');
    port = fakePort();
    return port;
  });

  const promise = api.getSettings();
  port.emitMessage({
    githubToken: 'tok',
    gistID: '123',
    gistFileName: 'BookmarkHub',
    githubURL: 'https://api.github.com'
  });

  const settings = await promise;
  assert.equal(settings.githubToken, 'tok');
  assert.equal(settings.gistID, '123');
  assert.equal(settings.gistFileName, 'BookmarkHub');
  assert.equal(settings.githubURL, 'https://api.github.com');
});

test('getSettings falls back to defaults when the port disconnects without a response', async () => {
  let port;
  const api = loadSettings(() => {
    port = fakePort();
    return port;
  });

  const promise = api.getSettings();
  port.emitDisconnect();

  const settings = await promise;
  assert.equal(settings.githubToken, '');
  assert.equal(settings.gistID, '');
  assert.equal(settings.gistFileName, 'BookmarkHub');
  assert.equal(settings.githubURL, 'https://api.github.com');
});

test('getSettings surfaces background errors', async () => {
  let port;
  const api = loadSettings(() => {
    port = fakePort();
    return port;
  });

  const promise = api.getSettings();
  port.emitMessage({ error: 'boom' });

  const settings = await promise;
  assert.equal(settings.error, 'boom');
});

test('getSettings falls back to defaults on timeout when nothing responds', async () => {
  const api = loadSettings(() => fakePort());

  const settings = await api.getSettings(30);

  assert.equal(settings.githubToken, '');
  assert.equal(settings.gistID, '');
  assert.equal(settings.gistFileName, 'BookmarkHub');
});

test('getSettings normalizes a trailing slash on githubURL', async () => {
  let port;
  const api = loadSettings(() => {
    port = fakePort();
    return port;
  });

  const promise = api.getSettings();
  port.emitMessage({
    githubToken: 'tok',
    gistID: '123',
    gistFileName: 'BookmarkHub',
    githubURL: 'https://api.github.com/'
  });

  const settings = await promise;
  assert.equal(settings.githubURL, 'https://api.github.com');
});
