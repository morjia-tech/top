/* 公開データ取得・管理者ログイン・保存。資格情報はメモリー内のみ。 */
(() => {
  'use strict';
  const cfg = window.MORJIA_CLOUD;
  const defaults = window.MorjiaSchema.normalize(window.SITE_DATA);
  const sections = ['site', 'navigation', 'home', 'about', 'works', 'gallery', 'links', 'contact'];
  let session = null;
  let documentRow = null;
  let loadError = '';
  const configured = Boolean(cfg.url && cfg.publishableKey);
  const base = (cfg.url || '').replace(/\/$/, '');
  const resource = '/rest/v1/portfolio_content?id=eq.' + encodeURIComponent(cfg.documentId);
  function validate(content) {
    window.MorjiaSchema.validate(content);
    if (!content || typeof content !== 'object' || Array.isArray(content)) throw new Error('保存データの形式が違います。');
    for (const section of sections) {
      if (!(section in content)) continue;
      const value = content[section];
      if (section === 'gallery') {
        if (!Array.isArray(value)) throw new Error('GALLERYの形式が違います。');
      } else if (section === 'works') {
        if (!Array.isArray(value) || value.some(w => !w || typeof w.id !== 'string' || !w.id || typeof w.title !== 'string')) throw new Error('作品のIDと作品名を確認してください。');
        if (new Set(value.map(w => w.id)).size !== value.length) throw new Error('作品IDが重複しています。');
      } else if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('保存データの項目が不正です。');
    }
  }
  // 既知の設定キーのみ採用。認証・接続設定は公開コンテンツから変更させない。
  function mergeKnown(template, supplied) {
    if (Array.isArray(template)) return Array.isArray(supplied) ? structuredClone(supplied) : structuredClone(template);
    if (template && typeof template === 'object') {
      const result = {};
      for (const key of Object.keys(template)) result[key] = mergeKnown(template[key], supplied?.[key]);
      return result;
    }
    return typeof supplied === typeof template ? supplied : template;
  }
  function apply(content) {
    validate(content);
    content = window.MorjiaSchema.normalize({ ...defaults, ...content });
    for (const key of sections) window.SITE_DATA[key] = mergeKnown(defaults[key], content[key]);
    dispatchEvent(new Event('morjia-content-updated'));
  }
  async function api(path, { method = 'GET', body, token = '', headers = {} } = {}) {
    const response = await fetch(base + path, {
      method, cache: 'no-store', signal: AbortSignal.timeout(15000),
      headers: { apikey: cfg.publishableKey, 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    if (!response.ok) {
      if (response.status === 401) throw new Error('ログインできないか、有効期限が切れました。メールアドレスとパスワードを確認し、再ログインしてください。');
      if (response.status === 403) throw new Error('このアカウントには編集権限がありません。');
      throw new Error(`接続に失敗しました（${response.status}）。入力内容は残っています。接続設定・サーバー設定を確認してください。`);
    }
    if (response.status === 204) return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }
  async function load() {
    const rows = await api(resource + '&select=id,owner_id,content,revision');
    if (!rows?.length) throw new Error('保存先が未作成です。初回設定のSQLを実行してください。');
    validate(rows[0].content);
    documentRow = rows[0];
    return documentRow;
  }
  async function login(email, password) {
    const result = await api('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } });
    session = { ...result, expires_at: Date.now() + result.expires_in * 1000 };
    try {
      await load();
      if (session.user.id !== documentRow.owner_id) throw new Error('このアカウントはサイト管理者ではありません。');
      return structuredClone(documentRow);
    } catch (error) { session = null; throw error; }
  }
  async function accessToken() {
    if (!session) throw new Error('先に管理者ログインしてください。');
    if (Date.now() > session.expires_at - 60000) {
      const result = await api('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: session.refresh_token } });
      session = { ...result, expires_at: Date.now() + result.expires_in * 1000 };
    }
    return session.access_token;
  }
  async function save(content, revision) {
    validate(content);
    const allowed = {};
    for (const key of sections) allowed[key] = content[key];
    const rows = await api(resource + '&revision=eq.' + revision, {
      method: 'PATCH', token: await accessToken(),
      body: { content: allowed, revision: revision + 1 }, headers: { Prefer: 'return=representation' }
    });
    if (!rows?.length) throw new Error('別の画面で更新されたか、編集権限がありません。入力を控え、編集画面を閉じて再ログインし、最新内容を確認してください。');
    documentRow = rows[0]; apply(documentRow.content);
    return documentRow.revision;
  }
  async function logout() {
    const token = session?.access_token;
    session = null;
    if (token) { try { await api('/auth/v1/logout', { method: 'POST', token }); } catch { /* ローカル資格情報は常に破棄 */ } }
  }
  function editableData() {
    const result = {};
    for (const key of sections) result[key] = structuredClone(window.SITE_DATA[key]);
    return result;
  }
  window.MorjiaCloud = { configured, login, save, logout, editableData, apply, get loadError() { return loadError; } };
  apply(defaults);
  window.SITE_READY = configured ? load().then(row => apply(row.content)).catch(() => {
    loadError = '最新の内容を読み込めなかったため、同梱の内容を表示しています。';
  }) : Promise.resolve();
})();
