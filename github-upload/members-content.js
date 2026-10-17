/* 公開カタログと限定内容を分離。限定内容をSITE_DATAや管理者の保存対象へ入れません。 */
(() => {
  'use strict';
  const auth = window.MorjiaMembers;
  let entries = [], catalogAvailable = false;
  const contentCache = new Map(), urls = new Set();
  const el = (tag, text, cls) => { const e = document.createElement(tag); if (text) e.textContent = text; if (cls) e.className = cls; return e; };
  async function content(id) {
    if (!contentCache.has(id)) contentCache.set(id, auth.call({ action: 'content', id }).catch(error => { contentCache.delete(id); throw error; }));
    return contentCache.get(id);
  }
  function track(blob) { const url = URL.createObjectURL(blob); urls.add(url); return url; }
  function mount(parent, entry) {
    const slot = el('section', '', 'members-slot');
    const label = el('h2', entry.label || '限定コンテンツ');
    const hint = el('p', 'この項目の閲覧には共通パスワードが必要です。', 'meta');
    const open = el('button', '限定コンテンツを開く'); open.type = 'button';
    const status = el('p', '', 'members-status'); status.setAttribute('role', 'status');
    const protectedArea = el('div', '', 'members-private');
    let version = 0;
    slot.append(label, hint, open, status, protectedArea); parent.append(slot);
    slot.addEventListener('members-reset', () => { version++; protectedArea.replaceChildren(); status.textContent = '閲覧を終了しました。'; open.disabled = false; open.hidden = false; });
    open.onclick = async () => {
      const current = ++version; open.disabled = true; status.textContent = '';
      try {
        if (!await auth.ensure() || !slot.isConnected || current !== version) return;
        status.textContent = '読み込んでいます…';
        const data = await content(entry.id);
        if (!slot.isConnected || current !== version || !auth.valid()) return;
        protectedArea.replaceChildren();
        if (data.title) protectedArea.append(el('h3', data.title));
        if (data.body) protectedArea.append(el('p', data.body, 'copy'));
        for (const file of data.files || []) {
          if (file.kind === 'image') {
            const figure = el('figure'); const image = el('img'); image.alt = file.label || ''; figure.append(image); protectedArea.append(figure);
            try {
              const blob = await auth.call({ action: 'file', id: entry.id, fileId: file.id }, { blob: true });
              if (!slot.isConnected || current !== version || !auth.valid()) return;
              image.src = track(blob); if (file.label) figure.append(el('figcaption', file.label));
            } catch (error) { if (current === version) figure.replaceChildren(el('p', error.message)); }
          } else {
            const download = el('button', file.label || 'ダウンロード', 'secondary'); download.type = 'button'; protectedArea.append(download);
            download.onclick = async () => {
              download.disabled = true; status.textContent = 'ファイルを取得しています…';
              try {
                const blob = await auth.call({ action: 'file', id: entry.id, fileId: file.id }, { blob: true });
                if (!slot.isConnected || current !== version || !auth.valid()) return;
                const url = track(blob), anchor = el('a'); anchor.href = url; anchor.download = file.name || file.id; document.body.append(anchor); anchor.click(); anchor.remove();
                setTimeout(() => { URL.revokeObjectURL(url); urls.delete(url); }, 60000); status.textContent = 'ファイルを取得しました。';
              } catch (error) { if (current === version) status.textContent = error.message; }
              finally { download.disabled = false; }
            };
          }
        }
        if (current === version) { open.hidden = true; status.textContent = ''; }
      } catch (error) { if (current === version) status.textContent = error.message; }
      finally { if (current === version) open.disabled = false; }
    };
  }
  function forWork(id) { return entries.filter(e => e.placement === 'work' && e.workId === id); }
  function gallery(parent) {
    const list = entries.filter(e => e.placement === 'gallery');
    if (!list.length) return;
    const section = el('section', '', 'gallery-section members-gallery'); section.append(el('h2', '限定ギャラリー'));
    list.forEach(entry => mount(section, entry)); parent.append(section);
  }
  function page(parent, id) {
    const entry = entries.find(e => e.id === id);
    if (entry) mount(parent, entry);
    else parent.append(el('p', catalogAvailable ? 'この限定コンテンツは現在公開されていません。' : '限定コンテンツを確認できませんでした。時間をおいて開き直してください。', 'empty'));
  }
  addEventListener('morjia-members-session', () => {
    if (!auth.valid()) {
      contentCache.clear(); urls.forEach(URL.revokeObjectURL); urls.clear();
      document.querySelectorAll('.members-slot').forEach(slot => slot.dispatchEvent(new Event('members-reset')));
    }
    const exit = document.querySelector('.members-logout'); if (exit) exit.hidden = !auth.valid();
  });
  // A render clears detached content, even when navigating to another public page.
  function release() { urls.forEach(URL.revokeObjectURL); urls.clear(); }
  window.MorjiaMemberContent = { mount, forWork, gallery, page, release };
  window.SITE_READY.then(() => {
    const exit = el('button', '限定コンテンツの閲覧を終了', 'members-logout'); exit.type = 'button'; exit.hidden = !auth.valid(); exit.onclick = () => auth.logout(); document.body.append(exit);
  });
  auth.call({ action: 'catalog' }, { authenticated: false }).then(result => {
    entries = (Array.isArray(result.entries) ? result.entries : []).filter(e => typeof e.id === 'string'); catalogAvailable = true;
    dispatchEvent(new Event('morjia-members-catalog'));
  }).catch(() => { /* 通常ページ・管理者編集は接続障害時も通常どおり動かす。 */ });
  // Never revive a protected view from the back/forward cache after session expiry.
  addEventListener('pageshow', event => { if (event.persisted && !auth.valid()) auth.clear(); });
})();
