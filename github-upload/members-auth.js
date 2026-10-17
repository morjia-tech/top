/* 閲覧用のみ。MorjiaCloudの管理者セッションとは共有しません。 */
(() => {
  'use strict';
  const cfg = window.MORJIA_CLOUD;
  const endpoint = cfg.url + '/functions/v1/morjia-members';
  const storageKey = 'morjia-members:' + cfg.url + ':' + location.pathname;
  let session = null, timer, activePrompt = null, generation = 0;
  const changes = () => dispatchEvent(new Event('morjia-members-session'));
  function clear() {
    session = null; generation++; clearTimeout(timer);
    try { sessionStorage.removeItem(storageKey); } catch {}
    changes();
  }
  function remember(value) {
    if (!value || !/^[a-f0-9]{64}$/.test(value.token) || !Number.isFinite(value.expiresAt) || value.expiresAt * 1000 <= Date.now()) return false;
    session = { token: value.token, expiresAt: value.expiresAt };
    try { sessionStorage.setItem(storageKey, JSON.stringify(session)); } catch {}
    clearTimeout(timer); timer = setTimeout(clear, Math.max(0, session.expiresAt * 1000 - Date.now()));
    changes(); return true;
  }
  function valid() { return Boolean(session && session.expiresAt * 1000 > Date.now()); }
  try { if (!remember(JSON.parse(sessionStorage.getItem(storageKey) || 'null'))) sessionStorage.removeItem(storageKey); } catch {}
  const errorText = status => status === 401 ? 'パスワードが違うか、有効期限が切れています。もう一度お試しください。' : status === 429 ? '試行回数が多いため、1分ほど待ってお試しください。' : status === 404 ? 'この限定コンテンツは現在公開されていません。' : '限定コンテンツに接続できませんでした。時間をおいてお試しください。';
  async function call(body, { authenticated = true, blob = false } = {}) {
    if (authenticated && !valid()) { clear(); throw new Error('限定コンテンツを開き直して、パスワードを入力してください。'); }
    const token = authenticated ? session.token : '', currentGeneration = generation;
    let response;
    try {
      response = await fetch(endpoint, {
        method: 'POST', credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(blob ? 120000 : 30000),
        headers: { 'Content-Type': 'application/json', apikey: cfg.publishableKey, ...(token ? { 'X-Morjia-Viewer': token } : {}) }, body: JSON.stringify(body)
      });
    } catch { throw new Error('通信できませんでした。時間をおいてお試しください。'); }
    if (!response.ok) {
      if (response.status === 401 && authenticated && session?.token === token) clear();
      throw new Error(errorText(response.status));
    }
    const result = blob ? await response.blob() : await response.json();
    if (authenticated && (currentGeneration !== generation || !valid() || session.token !== token)) throw new Error('閲覧が終了しました。');
    return result;
  }
  function ensure() {
    if (valid()) return Promise.resolve(true);
    if (activePrompt) return activePrompt;
    activePrompt = new Promise(resolve => {
      const previous = document.activeElement;
      const dialog = document.createElement('dialog'); dialog.className = 'members-login'; dialog.setAttribute('aria-label', '作品の閲覧');
      const form = document.createElement('form');
      const heading = document.createElement('h2'); heading.textContent = 'パスワードを入力';
      const hint = document.createElement('p'); hint.textContent = '共通パスワードを入力してください。認証は2時間有効です。';
      const label = document.createElement('label'); label.textContent = '閲覧パスワード';
      const input = document.createElement('input'); input.type = 'password'; input.required = true; input.maxLength = 256; input.autocomplete = 'current-password'; label.append(input);
      const status = document.createElement('p'); status.className = 'error'; status.setAttribute('role', 'status');
      const actions = document.createElement('div'); actions.className = 'actions';
      const submit = document.createElement('button'); submit.type = 'submit'; submit.textContent = '開く';
      const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'secondary'; cancel.textContent = 'キャンセル';
      let finished = false, pending = false;
      const finish = result => { if (finished) return; finished = true; input.value = ''; dialog.close(); dialog.remove(); activePrompt = null; if (previous?.isConnected) previous.focus(); resolve(result); };
      cancel.onclick = () => finish(false);
      dialog.addEventListener('cancel', event => { event.preventDefault(); finish(false); });
      form.onsubmit = async event => {
        event.preventDefault(); if (pending) return; pending = true; submit.disabled = true; status.textContent = '確認しています…';
        try {
          const result = await call({ action: 'login', password: input.value }, { authenticated: false }); input.value = '';
          if (finished) return;
          if (!remember(result)) throw new Error('閲覧情報を取得できませんでした。');
          finish(true);
        } catch (error) { if (!finished) { status.textContent = error.message; input.value = ''; input.focus(); } }
        finally { pending = false; submit.disabled = false; }
      };
      actions.append(submit, cancel); form.append(heading, hint, label, status, actions); dialog.append(form); document.body.append(dialog); dialog.showModal(); input.focus();
    });
    return activePrompt;
  }
  async function logout() { const revocation = valid() ? call({ action: 'logout' }) : Promise.resolve(); clear(); try { await revocation; } catch {} }
  addEventListener('visibilitychange', () => { if (!document.hidden && session && !valid()) clear(); });
  window.MorjiaMembers = { valid, ensure, call, logout, clear };
})();
