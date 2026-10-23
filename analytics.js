/* アクセス集計は廃止しました。古いページが参照しても通信・記録しません。 */
(() => {
  'use strict';
  try { sessionStorage.removeItem('morjia-analytics-session:top'); } catch {}
  try { localStorage.removeItem('morjia-analytics-exclude'); } catch {}
})();
