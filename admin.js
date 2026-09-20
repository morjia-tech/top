(() => {
  'use strict';
  const cloud = window.MorjiaCloud;
  const el = (tag, text, cls) => {
    const node = document.createElement(tag); if (text) node.textContent = text; if (cls) node.className = cls; return node;
  };
  let dirty = false;
  let busy = false;
  const launcher = el('button', '管理者ログイン', 'admin-launcher secondary');
  document.body.append(launcher);
  const dialog = el('dialog', '', 'admin-dialog');
  dialog.setAttribute('aria-label', 'サイトの編集'); document.body.append(dialog);
  const status = el('p', '', 'admin-status'); status.setAttribute('role', 'status');
  const close = el('button', '閉じる', 'secondary'); close.type = 'button';
  const closeEditor = () => {
    if (busy) return;
    if (dirty && !confirm('保存していない変更を破棄して閉じますか？')) return;
    dirty = false; dialog.close(); cloud.logout(); launcher.textContent = '管理者ログイン';
  };
  close.addEventListener('click', closeEditor);
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeEditor(); });
  addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
  function frame(title) {
    dialog.replaceChildren(); const header = el('div', '', 'admin-heading'); header.append(el('h2', title), close);
    dialog.append(header, status); status.textContent = '';
  }
  function input(parent, labelText, value, change, { multiline = false, type = 'text', required = false } = {}) {
    const label = el('label', labelText, 'admin-field');
    const field = el(multiline ? 'textarea' : 'input');
    if (!multiline) field.type = type; else field.rows = 3;
    field.value = value || ''; field.required = required;
    field.addEventListener('input', () => { change(field.value); dirty = true; status.textContent = '未保存の変更があります。'; });
    label.append(field); parent.append(label); return field;
  }
  function section(parent, title) {
    const details = el('details'); const summary = el('summary', title); details.append(summary); parent.append(details); return details;
  }
  function editor(row) {
    cloud.apply(row.content);
    let revision = row.revision;
    const draft = cloud.editableData();
    dirty = false; frame('サイトの編集');
    dialog.append(el('p', '保存すると公開内容に反映されます。空欄のURLは表示されません。'));
    const form = el('form'); dialog.append(form);
    const groups = [
      ['site', 'サイト名', [['name', 'サイト名'], ['description', 'サイト説明'], ['footer', 'フッター']]],
      ['home', 'HOME', [['title', '大見出し', true], ['tagline', 'バナー下のひとこと'], ['introduction', '紹介文', true], ['worksButton', '作品ボタンの文字']]],
      ['about', 'ABOUT', [['name', '名前'], ['biography', '自己紹介', true]]],
      ['links', 'LINKS', [['github', 'GitHub URL'], ['itch', 'itch.io URL'], ['x', 'X URL'], ['steam', 'Steam URL']]],
      ['contact', 'CONTACT', [['message', 'お問い合わせ案内', true], ['email', 'メールアドレス'], ['formUrl', 'お問い合わせフォームURL']]]
    ];
    for (const [key, title, fields] of groups) {
      const panel = section(form, title); if (key === 'home') panel.open = true;
      for (const [field, label, multiline] of fields) input(panel, label, draft[key][field], value => { draft[key][field] = value; }, { multiline });
    }
    const works = section(form, 'WORKS');
    draft.works.forEach((work, index) => {
      const panel = section(works, work.title || `作品 ${index + 1}`);
      for (const [key, label, multiline] of [['title', '作品名'], ['category', '種類'], ['status', '制作状況'], ['summary', '短い説明', true], ['description', '詳しい説明', true], ['videoUrl', '動画URL'], ['downloadUrl', 'ダウンロードURL'], ['github', 'GitHub URL'], ['itch', 'itch.io URL'], ['steam', 'Steam URL']]) {
        input(panel, label, work[key], value => { work[key] = value; }, { multiline });
      }
    });
    if (!draft.works.length) works.append(el('p', '登録されている作品はありません。'));
    if (draft.links.custom?.length) {
      const custom = section(form, 'その他のリンク');
      draft.links.custom.forEach(entry => { input(custom, '表示名', entry.label, value => { entry.label = value; }); input(custom, 'URL', entry.url, value => { entry.url = value; }); });
    }
    const actions = el('div', '', 'admin-save-bar');
    const publish = el('button', '保存して公開'); publish.type = 'submit'; actions.append(publish); form.append(actions);
    form.addEventListener('submit', async event => {
      event.preventDefault(); if (busy) return;
      if (!confirm('この内容を公開サイトに反映しますか？')) return;
      busy = true; publish.disabled = true; close.disabled = true;
      const fields = [...form.querySelectorAll('input,textarea')]; fields.forEach(field => { field.disabled = true; });
      status.textContent = '保存しています…';
      try { revision = await cloud.save(draft, revision); dirty = false; status.textContent = '保存しました。公開内容に反映済みです。'; }
      catch (error) { status.textContent = error.message; }
      finally { busy = false; publish.disabled = false; close.disabled = false; fields.forEach(field => { field.disabled = false; }); }
    });
  }
  function login() {
    frame('管理者ログイン');
    if (!cloud.configured) {
      dialog.append(el('p', 'オンライン編集は初回接続前です。Supabaseのログイン・保存先の設定が必要です。接続後はここから編集・公開できます。'));
      const guide = el('a', '初回設定の説明を開く'); guide.href = 'ONLINE-SETUP.md'; guide.target = '_blank'; guide.rel = 'noopener'; dialog.append(guide);
      return;
    }
    const form = el('form'); dialog.append(form);
    let email = '', password = '';
    const emailInput = input(form, 'メールアドレス', '', value => { email = value; }, { type: 'email', required: true });
    const passwordInput = input(form, 'パスワード', '', value => { password = value; }, { type: 'password', required: true });
    emailInput.autocomplete = 'username'; passwordInput.autocomplete = 'current-password';
    // ログイン情報の入力を公開内容の未保存変更として扱わない。
    form.addEventListener('input', () => { dirty = false; status.textContent = ''; });
    const submit = el('button', 'ログイン'); submit.type = 'submit'; form.append(submit);
    form.addEventListener('submit', async event => {
      event.preventDefault(); if (busy) return; busy = true; submit.disabled = true; close.disabled = true; status.textContent = '確認しています…';
      try { const row = await cloud.login(email.trim(), password); password = ''; passwordInput.value = ''; editor(row); }
      catch (error) { status.textContent = error.message; }
      finally { busy = false; submit.disabled = false; close.disabled = false; }
    });
  }
  launcher.addEventListener('click', () => { login(); dialog.showModal(); });
  window.SITE_READY.then(() => {
    if (cloud.loadError) { const notice = el('p', cloud.loadError, 'cloud-notice'); notice.setAttribute('role', 'status'); document.querySelector('.header').after(notice); }
  });
})();
