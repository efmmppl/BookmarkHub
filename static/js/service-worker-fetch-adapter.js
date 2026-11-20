/* Axios 0.18 adapter for Manifest V3 service workers, which do not expose XHR. */
self.bookmarkHubFetchAdapter = function (config) {
  var controller = new AbortController();
  var timeoutId;
  var headers = new Headers(config.headers || {});
  var url = config.url;

  if (config.baseURL && !/^([a-z][a-z\d+.-]*:)?\/\//i.test(url)) {
    url = config.baseURL.replace(/\/+$/, '') + '/' + url.replace(/^\/+/, '');
  }
  if (config.params) {
    var query = new URLSearchParams(config.params).toString();
    if (query) url += (url.indexOf('?') === -1 ? '?' : '&') + query;
  }
  if (config.timeout > 0) {
    timeoutId = setTimeout(function () { controller.abort(); }, config.timeout);
  }

  return fetch(url, {
    method: (config.method || 'get').toUpperCase(),
    headers: headers,
    body: /^(GET|HEAD)$/i.test(config.method || 'get') ? undefined : config.data,
    signal: controller.signal,
    credentials: config.withCredentials ? 'include' : 'same-origin'
  }).then(function (response) {
    if (timeoutId) clearTimeout(timeoutId);
    return response.text().then(function (data) {
      var responseHeaders = {};
      response.headers.forEach(function (value, name) {
        responseHeaders[name.toLowerCase()] = value;
      });
      var result = {
        data: data,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        config: config,
        request: null
      };
      if (!config.validateStatus || config.validateStatus(response.status)) return result;
      var error = new Error('Request failed with status code ' + response.status);
      error.config = config;
      error.response = result;
      throw error;
    });
  }).catch(function (error) {
    if (timeoutId) clearTimeout(timeoutId);
    if (!error.config) error.config = config;
    throw error;
  });
};
