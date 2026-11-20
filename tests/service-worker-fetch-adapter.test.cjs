const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadAdapter(fetch) {
  const context = { fetch, AbortController, URL, URLSearchParams, Headers, setTimeout, clearTimeout, self: {} };
  vm.runInNewContext(
    fs.readFileSync('static/js/service-worker-fetch-adapter.js', 'utf8'),
    context
  );
  return context.self.bookmarkHubFetchAdapter;
}

test('fetch adapter sends Axios request data and returns an Axios response', async () => {
  let request;
  const adapter = loadAdapter(async (url, options) => {
    request = { url, options };
    return {
      status: 200,
      statusText: 'OK',
      headers: new Map([['content-type', 'application/json']]),
      text: async () => '{"ok":true}'
    };
  });

  const config = {
    baseURL: 'https://api.github.com',
    url: '/gists/123',
    method: 'post',
    headers: { Authorization: 'token abc' },
    data: '{"files":{}}',
    timeout: 1000,
    validateStatus: status => status >= 200 && status < 300
  };
  const response = await adapter(config);

  assert.equal(request.url, 'https://api.github.com/gists/123');
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.body, config.data);
  assert.deepEqual(JSON.parse(response.data), { ok: true });
  assert.equal(response.status, 200);
  assert.equal(response.config, config);
});

test('fetch adapter rejects HTTP errors with the response attached', async () => {
  const adapter = loadAdapter(async () => ({
    status: 401,
    statusText: 'Unauthorized',
    headers: new Map(),
    text: async () => '{"message":"Bad credentials"}'
  }));

  await assert.rejects(
    adapter({
      url: 'https://api.github.com/gists/123',
      method: 'get',
      headers: {},
      validateStatus: status => status >= 200 && status < 300
    }),
    error => error.response.status === 401 && JSON.parse(error.response.data).message === 'Bad credentials'
  );
});

test('webpack installer sets the Axios adapter before loading the background app', () => {
  const context = { bookmarkHubFetchAdapter: function fetchAdapter() {} };
  context.self = context;
  let installer;
  context.webpackJsonpbookmarkhub = {
    push(chunk) { installer = chunk[1][999]; }
  };
  vm.runInNewContext(fs.readFileSync('static/js/install-service-worker-fetch-adapter.js', 'utf8'), context);

  const axiosDefaults = { defaults: {} };
  installer({}, {}, id => {
    assert.equal(id, 45);
    return axiosDefaults;
  });

  assert.equal(axiosDefaults.defaults.adapter, context.bookmarkHubFetchAdapter);
});
