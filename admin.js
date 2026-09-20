(() => {
  'use strict';
  const cloud = window.MorjiaCloud;
  const el = (tag, text, cls) => {
    const node = document.createElement(tag); if (text) node.textContent = text; if (cls) node.className = cls; return node;
  };
  let dirty = false;
  let busy = false;
  let imageReads = 0;
  const launcher = el('button', '管理', 'admin-launcher');
  launcher.setAttribute('aria-label', '管理者ログイン');
  document.body.append(launcher);
  const dialog = el('dialog', '', 'admin-dialog');
  dialog.setAttribute('aria-label', 'サイトの編集'); document.body.append(dialog);
  const status = el('p', '', 'admin-status'); status.setAttribute('role', 'status');
  const close = el('button', '閉じる', 'secondary'); close.type = 'button';
  const closeEditor = () => {
    if (busy) return;
    if (dirty && !confirm('保存していない変更を破棄して閉じますか？')) return;
    dirty = false; dialog.close(); cloud.logout();
  };
  close.addEventListener('click', closeEditor);
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeEditor(); });
  addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
  function frame(title) {
    dialog.replaceChildren(); const header = el('div', '', 'admin-heading'); header.append(el('h2', title));
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
  function changed() { dirty = true; status.textContent = '未保存の変更があります。'; }
  function imageField(parent, label, item, key) {
    const field = input(parent, label + ' URL／パス', item[key], value => { item[key] = value; });
    const labelNode = el('label', label + 'をPC・スマホから選ぶ（1画像1MBまで）', 'admin-field');
    const upload = el('input'); upload.type = 'file'; upload.accept = 'image/png,image/jpeg,image/webp,image/gif'; labelNode.append(upload); parent.append(labelNode);
    upload.addEventListener('change', async () => {
      const file = upload.files[0]; if (!file) return;
      if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type) || file.size > 1024 * 1024) {
        status.textContent = 'PNG・JPEG・WebP・GIFの1MB以下の画像を選んでください。'; upload.value = ''; return;
      }
      const reader = new FileReader();
      imageReads++;
      reader.onloadend = () => { imageReads--; };
      reader.onload = () => { item[key] = String(reader.result); field.value = item[key]; changed(); };
      reader.onerror = () => { status.textContent = '画像を読み込めませんでした。'; };
      reader.readAsDataURL(file);
    });
  }
  function collection(parent, title, array, create, build) {
    const group = section(parent, title);
    const list = el('div'); const add = el('button', '＋ ' + title + 'を追加', 'secondary'); add.type = 'button';
    group.append(list, add);
    function draw(focusIndex = -1) {
      list.replaceChildren();
      array.forEach((item, index) => {
        const card = section(list, item.title || item.name || `${title} ${index + 1}`);
        if (index === focusIndex) card.open = true;
        const controls = el('div', '', 'collection-controls');
        const up = el('button', '↑ 上へ', 'secondary'); const down = el('button', '↓ 下へ', 'secondary'); const remove = el('button', '削除', 'secondary');
        for (const button of [up, down, remove]) button.type = 'button';
        up.disabled = index === 0; down.disabled = index === array.length - 1;
        up.addEventListener('click', () => { [array[index - 1], array[index]] = [array[index], array[index - 1]]; changed(); draw(index - 1); });
        down.addEventListener('click', () => { [array[index + 1], array[index]] = [array[index], array[index + 1]]; changed(); draw(index + 1); });
        remove.addEventListener('click', () => { if (confirm('この項目を削除しますか？保存するまでは公開内容は変わりません。')) { array.splice(index, 1); changed(); draw(); add.focus(); } });
        controls.append(up, down, remove); card.append(controls); build(card, item);
      });
      if (!array.length) list.append(el('p', '項目はまだありません。'));
      if (focusIndex >= 0) list.children[focusIndex]?.querySelector('input,textarea')?.focus();
    }
    add.addEventListener('click', () => { array.push(create()); changed(); draw(array.length - 1); });
    draw(); return group;
  }
  function choice(parent, labelText, value, options, change) {
    const label = el('label', labelText, 'admin-field'); const select = el('select');
    select.setAttribute('aria-label', labelText);
    const values = ['', ...options]; if (value && !values.includes(value)) values.push(value);
    values.forEach(value => { const option = el('option', value || '未設定'); option.value = value; select.append(option); });
    select.value = value || ''; select.addEventListener('change', () => { change(select.value); changed(); }); label.append(select); parent.append(label);
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
      ['contact', 'CONTACT', [['message', 'お問い合わせ案内', true], ['email', 'メールアドレス'], ['formUrl', 'お問い合わせフォームURL']]]
    ];
    for (const [key, title, fields] of groups) {
      const panel = section(form, title); if (key === 'home') panel.open = true;
      for (const [field, label, multiline] of fields) input(panel, label, draft[key][field], value => { draft[key][field] = value; }, { multiline });
    }
    collection(form, 'WORKS', draft.works, () => ({ id: 'work-' + crypto.randomUUID(), title: '', category: '', status: '', summary: '', description: '', thumbnail: '', testPlayUrl: '', linkUrl: '', externalUrl: '', downloadUrl: '' }), (panel, work) => {
      input(panel, '作品ID（公開後は変更非推奨）', work.id, value => { work.id = value; }, { required: true });
      choice(panel, 'カテゴリ', work.category, ['GAME', 'TOOL / APP', 'OTHER'], value => { work.category = value; });
      choice(panel, 'ステータス', work.status, ['MAKING', 'TEST PLAY', 'RELEASED'], value => { work.status = value; });
      imageField(panel, 'サムネイル画像', work, 'thumbnail');
      for (const [key, label, multiline] of [['title', '作品名'], ['summary', '短い説明', true], ['description', '詳しい説明', true], ['linkUrl', 'リンクURL'], ['testPlayUrl', 'TEST PLAY URL'], ['externalUrl', '外部サイトURL'], ['videoUrl', '動画URL'], ['downloadUrl', 'ダウンロードURL'], ['github', 'GitHub URL'], ['itch', 'itch.io URL'], ['steam', 'Steam URL']]) {
        input(panel, label, work[key], value => { work[key] = value; }, { multiline });
      }
    });
    collection(form, 'GALLERY', draft.gallery, () => ({ image: '', title: '', comment: '', category: '' }), (panel, item) => {
      imageField(panel, '画像', item, 'image');
      input(panel, 'タイトル', item.title, value => { item.title = value; });
      input(panel, '短いコメント', item.comment, value => { item.comment = value; }, { multiline: true });
      input(panel, 'カテゴリ', item.category, value => { item.category = value; });
    });
    collection(form, 'LINKS', draft.links.items, () => ({ name: '', url: '', description: '' }), (panel, item) => {
      input(panel, '名前', item.name, value => { item.name = value; });
      input(panel, 'URL', item.url, value => { item.url = value; });
      input(panel, '短い説明', item.description, value => { item.description = value; }, { multiline: true });
    });
    const actions = el('div', '', 'admin-save-bar');
    const publish = el('button', '保存して公開'); publish.type = 'submit'; actions.append(publish, close); form.append(actions);
    form.addEventListener('submit', async event => {
      event.preventDefault(); if (busy) return;
      if (imageReads) { status.textContent = '画像の読み込みが終わってから保存してください。'; return; }
      if (!confirm('この内容を公開サイトに反映しますか？')) return;
      busy = true; publish.disabled = true; close.disabled = true;
      const fields = [...form.querySelectorAll('input,textarea,select,button')];
      const disabled = fields.map(field => field.disabled); fields.forEach(field => { field.disabled = true; });
      status.textContent = '保存しています…';
      try { revision = await cloud.save(draft, revision); dirty = false; status.textContent = '保存しました。公開内容に反映済みです。'; }
      catch (error) { status.textContent = error.message; }
      finally { busy = false; fields.forEach((field, i) => { field.disabled = disabled[i]; }); publish.disabled = false; close.disabled = false; }
    });
  }
  function login() {
    frame('管理者ログイン');
    if (!cloud.configured) {
      dialog.append(el('p', 'オンライン編集は初回接続前です。Supabaseのログイン・保存先の設定が必要です。接続後はここから編集・公開できます。'));
      const guide = el('a', '初回設定の説明を開く'); guide.href = 'ONLINE-SETUP.md'; guide.target = '_blank'; guide.rel = 'noopener'; dialog.append(guide);
      const actions = el('div', '', 'admin-save-bar'); actions.append(close); dialog.append(actions); return;
    }
    const form = el('form'); dialog.append(form);
    let email = '', password = '';
    const emailInput = input(form, 'メールアドレス', '', value => { email = value; }, { type: 'email', required: true });
    const passwordInput = input(form, 'パスワード', '', value => { password = value; }, { type: 'password', required: true });
    emailInput.autocomplete = 'username'; passwordInput.autocomplete = 'current-password';
    // ログイン情報の入力を公開内容の未保存変更として扱わない。
    form.addEventListener('input', () => { dirty = false; status.textContent = ''; });
    const submit = el('button', 'ログイン'); submit.type = 'submit'; const actions = el('div', '', 'admin-save-bar'); actions.append(submit, close); form.append(actions);
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
