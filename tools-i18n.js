(function (root) {
  function t(key, subs) {
    try {
      const msg = chrome.i18n.getMessage(key, subs);
      return msg || key;
    } catch (error) {
      return key;
    }
  }

  function apply() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const value = t(el.getAttribute('data-i18n'));
      if (value) el.textContent = value;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const value = t(el.getAttribute('data-i18n-placeholder'));
      if (value) el.setAttribute('placeholder', value);
    });
    document.querySelectorAll('title[data-i18n]').forEach((el) => {
      const value = t(el.getAttribute('data-i18n'));
      if (value) document.title = value;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }

  root.BookmarkHubI18n = { t, apply };
})(typeof globalThis !== 'undefined' ? globalThis : this);
