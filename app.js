/* 表示担当。内容は site-data.js、認証は auth.js を参照します。 */
(async () => {
  'use strict';
  await window.SITE_READY;
  const data = window.SITE_DATA;
  const ui = data.ui;
  const main = document.querySelector('#main');
  const pages = ['home', 'works', 'about', 'links', 'contact'];
  const node = (tag, text, className) => {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (className) el.className = className;
    return el;
  };
  // 入力をHTMLとして解釈せず、安全なURLだけリンクにします。
  function safeUrl(value) {
    if (typeof value !== 'string' || !value.trim()) return '';
    try {
      const url = new URL(value, location.href);
      if (['http:', 'https:'].includes(url.protocol)) return url.href;
      if (location.protocol === 'file:' && url.protocol === 'file:') return url.href;
    } catch { /* 不正なURLは非表示 */ }
    return '';
  }
  function link(label, url, className) {
    const href = safeUrl(url);
    if (!href) return null;
    const el = node('a', label, className); el.href = href;
    return el;
  }
  function image(path, alt, className) {
    const src = safeUrl(path);
    if (!src) return null;
    const img = node('img', undefined, className);
    img.src = src; img.alt = alt || ''; img.loading = 'lazy';
    img.addEventListener('error', () => img.replaceWith(node('p', ui.imageUnavailable, 'meta')), { once: true });
    return img;
  }
  function append(parent, child) { if (child) parent.append(child); }
  function copy(parent, text) { if (text) parent.append(node('p', text, 'copy')); }
  function tags(parent, items) {
    if (!items?.length) return;
    const list = node('ul', undefined, 'tags');
    items.forEach(text => list.append(node('li', text))); parent.append(list);
  }
  function empty(text) { main.append(node('p', text, 'empty')); }
  function heading(title) { main.append(node('h1', title)); }
  function workHref(work) { return '#work/' + encodeURIComponent(work.id); }
  function renderHome() {
    append(main, image(data.home.banner, data.home.bannerAlt, 'brand-banner'));
    if (data.home.tagline) main.append(node('p', data.home.tagline, 'tagline'));
    const section = node('section', undefined, 'home');
    section.append(node('h1', data.home.title || data.site.name));
    copy(section, data.home.introduction);
    append(section, image(data.home.image, data.home.imageAlt, 'feature-image'));
    const button = node('a', data.home.worksButton, 'button'); button.href = '#works';
    if (data.home.worksButton) section.append(button);
    main.append(section);
  }
  function renderWorks() {
    heading(data.navigation.works);
    if (!data.works.length) return empty(ui.emptyWorks);
    const grid = node('div', undefined, 'grid');
    data.works.forEach(work => {
      const card = node('a', undefined, 'card'); card.href = workHref(work);
      append(card, image(work.thumbnail, work.title));
      const body = node('div', undefined, 'card-content');
      if (work.category) body.append(node('p', work.category, 'meta'));
      body.append(node('h2', work.title || ui.noTitle));
      copy(body, work.summary);
      if (work.status) body.append(node('p', work.status, 'meta'));
      card.append(body); grid.append(card);
    });
    main.append(grid);
  }
  function renderAbout() {
    heading(data.navigation.about);
    if (data.about.name) main.append(node('h2', data.about.name));
    append(main, image(data.about.image, data.about.imageAlt, 'feature-image'));
    copy(main, data.about.biography);
    tags(main, data.about.skills);
    if (!data.about.biography && !data.about.image && !data.about.skills.length) empty(ui.emptyAbout);
  }
  function renderLinks() {
    heading(data.navigation.links);
    const list = node('ul', undefined, 'link-list');
    const entries = ['github', 'itch', 'x', 'steam'].map(key => ({ label: ui[key], url: data.links[key] }));
    entries.push(...data.links.custom);
    entries.forEach(entry => {
      const anchor = link(entry.label, entry.url);
      if (anchor) { const item = node('li'); item.append(anchor); list.append(item); }
    });
    if (list.children.length) main.append(list); else empty(ui.emptyLinks);
  }
  function renderContact() {
    heading(data.navigation.contact);
    copy(main, data.contact.message);
    const actions = node('div', undefined, 'actions');
    if (data.contact.email) {
      const mail = node('a', data.contact.email, 'button');
      mail.href = 'mailto:' + encodeURIComponent(data.contact.email);
      actions.append(mail);
    }
    append(actions, link(ui.form, data.contact.formUrl, 'button secondary'));
    if (actions.children.length) main.append(actions); else empty(ui.emptyContact);
  }
  function renderDetail(id) {
    const work = data.works.find(item => item.id === id);
    if (!work) return notFound();
    const back = node('a', ui.backToWorks, 'back'); back.href = '#works'; main.append(back);
    heading(work.title || ui.noTitle);
    document.title = `${work.title || ui.noTitle} | ${data.site.name}`;
    if (!window.SiteAuth.isAllowed(work, 'details')) {
      copy(main, ui.locked);
      const button = node('button', ui.unlock);
      button.addEventListener('click', async () => {
        const route = location.hash;
        if (await window.SiteAuth.request(work, 'details')) {
          if (location.hash === route) render();
        }
      });
      main.append(button); return;
    }
    copy(main, work.description || work.summary);
    append(main, image(work.thumbnail, work.title, 'feature-image'));
    if (work.technologies?.length) { main.append(node('h2', ui.technologies)); tags(main, work.technologies); }
    if (work.screenshots?.length) {
      const gallery = node('div', undefined, 'gallery');
      work.screenshots.forEach(shot => {
        const img = image(typeof shot === 'string' ? shot : shot.src, shot.alt || '');
        if (!img) return;
        const figure = node('figure'); figure.append(img);
        if (shot.caption) figure.append(node('figcaption', shot.caption));
        gallery.append(figure);
      });
      if (gallery.children.length) { main.append(node('h2', ui.screenshots), gallery); }
    }
    const actions = node('div', undefined, 'actions');
    append(actions, link(ui.video, work.videoUrl, 'button secondary'));
    ['github', 'itch', 'steam'].forEach(key => append(actions, link(ui[key], work[key], 'button secondary')));
    if (safeUrl(work.downloadUrl)) {
      if (window.SiteAuth.isAllowed(work, 'download')) append(actions, link(ui.download, work.downloadUrl, 'button'));
      else {
        const button = node('button', ui.download);
        button.addEventListener('click', async () => {
          const route = location.hash;
          if (await window.SiteAuth.request(work, 'download')) {
            if (location.hash === route) render(); // 解除後に実リンクを表示。自動ダウンロードしない。
          }
        });
        actions.append(button);
      }
    }
    if (actions.children.length) main.append(actions);
  }
  function notFound() {
    heading(ui.notFound);
    const back = node('a', ui.homeLink); back.href = '#home'; main.append(back);
  }
  function render(focus = true) {
    let route;
    try { route = decodeURIComponent(location.hash.slice(1)) || 'home'; } catch { route = ''; }
    main.replaceChildren();
    document.title = `${data.navigation[route] || ui.detail} | ${data.site.name}`;
    const active = route.startsWith('work/') ? 'works' : route;
    document.querySelectorAll('nav a').forEach(anchor => {
      if (anchor.hash === '#' + active) anchor.setAttribute('aria-current', 'page');
      else anchor.removeAttribute('aria-current');
    });
    const views = { home: renderHome, works: renderWorks, about: renderAbout, links: renderLinks, contact: renderContact };
    if (views[route]) views[route]();
    else if (route.startsWith('work/')) renderDetail(route.slice(5));
    else notFound();
    if (focus) { main.focus({ preventScroll: true }); window.scrollTo(0, 0); }
  }
  function renderChrome() {
  document.querySelector('meta[name="description"]').content = data.site.description;
  const favicon = safeUrl(data.site.favicon);
  if (favicon) document.querySelector('link[rel="icon"]').href = favicon;
  const brand = document.querySelector('#brand');
  brand.replaceChildren();
  const logo = image(data.site.logo, data.site.name);
  if (logo) brand.append(logo); else brand.textContent = data.site.name;
  document.querySelector('#footer').textContent = data.site.footer;
  document.querySelector('.skip-link').textContent = ui.skip;
  const navigation = document.querySelector('#navigation'); navigation.setAttribute('aria-label', ui.navigationLabel);
  navigation.replaceChildren();
  pages.forEach(page => { const anchor = node('a', data.navigation[page]); anchor.href = '#' + page; navigation.append(anchor); });
  }
  renderChrome();
  addEventListener('morjia-content-updated', () => { renderChrome(); render(false); });
  document.querySelector('.skip-link').addEventListener('click', event => { event.preventDefault(); main.focus(); });
  addEventListener('hashchange', () => render());
  render(false);
})();
