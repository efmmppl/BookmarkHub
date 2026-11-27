(function () {
  const BUTTON_ID = 'options-save-button';

  function message(key, fallback) {
    try {
      return chrome.i18n.getMessage(key) || fallback;
    } catch (error) {
      return fallback;
    }
  }

  function addHeader() {
    if (document.getElementById('options-page-header')) return;
    const root = document.getElementById('root');
    if (!root) return;

    const header = document.createElement('header');
    header.id = 'options-page-header';
    header.className = 'page-header';

    const title = document.createElement('h1');
    title.textContent = message('settingsTitle', '书签同步设置');
    const subtitle = document.createElement('p');
    subtitle.textContent = message('settingsSubtitle', '配置 GitHub Token 与 Gist，在不同浏览器之间同步书签');

    header.append(title, subtitle);
    root.before(header);
  }

  function addSaveButton() {
    if (document.getElementById(BUTTON_ID)) return;

    const form = document.getElementById('formOptions');
    if (!form) return;

    const wrap = document.createElement('div');
    wrap.className = 'd-flex align-items-center justify-content-center';
    wrap.style.padding = '16px 0 24px';

    const button = document.createElement('button');
    button.type = 'button';
    button.id = BUTTON_ID;
    button.className = 'btn btn-primary';
    button.textContent = message('saveSettings', '保存设置');

    const feedback = document.createElement('span');
    feedback.id = 'options-save-feedback';
    feedback.className = 'text-success';
    feedback.style.marginLeft = '10px';

    wrap.append(button, feedback);

    const root = document.getElementById('root');
    if (root && root.parentNode) {
      root.after(wrap);
    } else {
      document.body.append(wrap);
    }

    let pendingSave = false;

    button.addEventListener('click', () => {
      const named = form.querySelector('input[name]');
      if (!named) return;
      pendingSave = true;
      feedback.textContent = '';
      named.dispatchEvent(new Event('input', { bubbles: true }));
    });

    form.addEventListener('options-sync:form-synced', () => {
      if (!pendingSave) return;
      pendingSave = false;
      feedback.textContent = message('settingsSaved', '已保存');
      setTimeout(() => { feedback.textContent = ''; }, 2000);
    });
  }

  function init() {
    addHeader();
    addSaveButton();
  }

  window.addEventListener('DOMContentLoaded', init);
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  }
  setTimeout(init, 800);
})();
