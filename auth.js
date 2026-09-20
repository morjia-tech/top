/* 認証専用。将来はこのAPIの内部をサーバー認証に置き換えます。
 * isAllowed(work, scope): 同期の表示判定
 * request(work, scope): Promise<boolean>。scopeは details または download。
 * 本実装は公開データの簡易UIロックであり、アクセス制御ではありません。
 */
(() => {
  'use strict';
  let unlocked = false; // 再読み込みするとロック。パスワードは保存しない。
  let activeRequest = null;
  const config = () => window.SITE_DATA.auth;
  const isAllowed = (work, scope) => !config().enabled || !work.access?.[scope] || unlocked;

  function request(work, scope) {
    if (isAllowed(work, scope)) return Promise.resolve(true);
    if (activeRequest) return activeRequest;
    activeRequest = new Promise(resolve => {
      const ui = window.SITE_DATA.ui;
      const dialog = document.createElement('dialog');
      const form = document.createElement('form');
      const title = document.createElement('h2');
      title.id = 'auth-title'; title.textContent = ui.authTitle;
      dialog.setAttribute('aria-labelledby', title.id);
      const label = document.createElement('label');
      label.textContent = ui.passwordLabel;
      const input = document.createElement('input');
      input.type = 'password'; input.required = true; input.autocomplete = 'current-password';
      label.append(input);
      const error = document.createElement('p');
      error.className = 'error'; error.setAttribute('role', 'alert');
      const actions = document.createElement('div'); actions.className = 'actions';
      const submit = document.createElement('button'); submit.type = 'submit'; submit.textContent = ui.authSubmit;
      const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'secondary'; cancel.textContent = ui.cancel;
      actions.append(submit, cancel); form.append(title, label, error, actions); dialog.append(form);
      const finish = success => { dialog.close(); dialog.remove(); activeRequest = null; resolve(success); };
      cancel.addEventListener('click', () => finish(false));
      dialog.addEventListener('cancel', event => { event.preventDefault(); finish(false); });
      form.addEventListener('submit', event => {
        event.preventDefault();
        if (!config().password) { error.textContent = ui.authUnconfigured; return; }
        if (input.value !== config().password) { error.textContent = ui.authError; input.select(); return; }
        unlocked = true; finish(true);
      });
      document.body.append(dialog); dialog.showModal(); input.focus();
    });
    return activeRequest;
  }
  window.SiteAuth = { isAllowed, request };
})();
