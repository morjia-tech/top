// 古い保存データを読み込めるようにする互換レイヤー。サーバーは自動更新しません。
(() => {
  const categories = { TOOL: 'TOOL / APP', APP: 'TOOL / APP' };
  const statuses = { '制作中': 'MAKING', '公開済み': 'RELEASED', 'テストプレイ': 'TEST PLAY' };
  window.MorjiaSchema = {
    normalize(source) {
      const data = structuredClone(source);
      data.navigation = { ...data.navigation, gallery: 'GALLERY' };
      data.works = (data.works || []).map(work => ({ ...work,
        category: categories[work.category] || work.category || '',
        status: statuses[work.status] || work.status || ''
      }));
      data.gallery ??= [];
      const links = data.links || {};
      if (!Array.isArray(links.items)) {
        const names = { github: 'GitHub', itch: 'itch.io', x: 'X', steam: 'Steam' };
        links.items = Object.entries(names).filter(([key]) => links[key]).map(([key, name]) => ({ name, url: links[key], description: '' }));
        links.items.push(...(links.custom || []).map(item => ({ name: item.name || item.label || '', url: item.url || '', description: item.description || '' })));
      }
      data.links = links;
      return data;
    },
    validate(content) {
      const ids = new Set();
      for (const work of content.works || []) {
        if (!work.id || typeof work.id !== 'string' || ids.has(work.id)) throw new Error('作品IDは空欄にせず、重複しない値にしてください。');
        ids.add(work.id);
      }
      if (content.gallery !== undefined && (!Array.isArray(content.gallery) || content.gallery.some(item => !item || typeof item !== 'object'))) throw new Error('GALLERYの形式が違います。');
      if (content.links?.items !== undefined && !Array.isArray(content.links.items)) throw new Error('LINKSの形式が違います。');
      if (JSON.stringify(content).length > 8000000) throw new Error('画像を含む保存データが大きすぎます。画像を小さくするか画像URLを使ってください（合計約8MBまで）。');
    }
  };
})();
