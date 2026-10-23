/* 小さな匿名アクセス集計。通常コンテンツ・認証・編集から独立し、失敗しても表示を止めません。 */
(() => {
  'use strict';
  const preferenceKey = 'morjia-analytics-exclude';
  const sessionKey = 'morjia-analytics-session:top';
  const adminMode = new URLSearchParams(location.search).get('admin') === '1';
  const privacySignal = () => navigator.globalPrivacyControl === true || navigator.doNotTrack === '1' || window.doNotTrack === '1';
  function excluded() { try { return localStorage.getItem(preferenceKey) === '1'; } catch { return false; } }
  function setExcluded(value) {
    try { if (value) localStorage.setItem(preferenceKey, '1'); else localStorage.removeItem(preferenceKey); } catch { return false; }
    return true;
  }
  // 管理用入口を使ったブラウザは、それ以降の通常閲覧も初期状態では除外します。
  if (adminMode) setExcluded(true);
  window.MorjiaAnalytics = { excluded, setExcluded };
  const privacyChoice = document.querySelector('[data-analytics-exclude]');
  if (privacyChoice) {
    privacyChoice.checked = excluded();
    privacyChoice.addEventListener('change', () => {
      const ok = setExcluded(privacyChoice.checked);
      document.querySelector('[data-analytics-status]').textContent = ok ? 'このブラウザの設定を保存しました。' : 'ブラウザの保存設定により変更できませんでした。';
    });
  }
  const cfg = window.MORJIA_CLOUD;
  // ローカルの試作・管理画面・別サイトは数えません。追加設定や秘密鍵は不要です。
  if (!cfg?.url || !cfg.publishableKey || adminMode || location.hostname !== 'morjia-tech.github.io' || !['/top/', '/top/index.html'].includes(location.pathname)) return;
  function pageName() {
    let route;
    try { route = decodeURIComponent(location.hash.slice(1)) || 'home'; } catch { return ''; }
    if (['home', 'works', 'gallery', 'about', 'links', 'contact'].includes(route)) return route;
    if (/^(work|play)\//.test(route) && route.length <= 160 && window.SITE_DATA?.works.some(work => route === 'work/' + work.id || route === 'play/' + work.id)) return route;
    return '';
  }
  function sourceName() {
    let host;
    try { host = new URL(document.referrer).hostname.toLowerCase(); } catch { return 'direct'; }
    if (host === location.hostname) return 'direct';
    if (/(^|\.)(google\.[a-z.]+|googleusercontent\.com)$/.test(host)) return 'google';
    for (const [name, hosts] of Object.entries({ bing: ['bing.com'], x: ['x.com', 'twitter.com', 't.co'], instagram: ['instagram.com'], facebook: ['facebook.com', 'fb.com'], github: ['github.com'] })) {
      if (hosts.some(value => host === value || host.endsWith('.' + value))) return name;
    }
    return 'other';
  }
  let memorySession;
  function visitSession() {
    let value = memorySession;
    try { value = JSON.parse(sessionStorage.getItem(sessionKey)) || value; } catch {}
    const now = Date.now();
    if (!value || !/^[a-f0-9-]{36}$/.test(value.id) || !Number.isFinite(value.last) || now - value.last > 30 * 60 * 1000) value = { id: crypto.randomUUID(), last: now, source: sourceName() };
    value.last = now; memorySession = value;
    try { sessionStorage.setItem(sessionKey, JSON.stringify(value)); } catch {}
    return value;
  }
  let lastPage = '', lastAt = 0;
  async function track() {
    if (excluded() || privacySignal() || document.visibilityState === 'hidden') return;
    const page = pageName(), now = Date.now();
    if (!page || (page === lastPage && now - lastAt < 10000)) return;
    lastPage = page; lastAt = now;
    try {
      const session = visitSession();
      await fetch(cfg.url.replace(/\/$/, '') + '/rest/v1/rpc/morjia_track_page', {
        method: 'POST', credentials: 'omit', cache: 'no-store', keepalive: true, signal: AbortSignal.timeout(5000),
        headers: { apikey: cfg.publishableKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_document_id: cfg.documentId, p_page: page, p_session: session.id, p_source: session.source, p_device: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent)) ? 'mobile' : 'desktop' })
      });
    } catch { /* 解析の未設定・通信障害でもサイトとゲームはそのまま使えます。 */ }
  }
  window.SITE_READY.then(() => {
    track(); addEventListener('hashchange', track);
    addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') track(); });
  });
})();
