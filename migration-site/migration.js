(function () {
  const base = 'https://maestrobeatz.servegame.com/cleanupcentr';
  function destination(pathname, search = '', hash = '') {
    const aliases = {'/shop':'/market/shop','/marketplace':'/market/listings','/recipes':'/market/blends'};
    const path = pathname.replace(/\/+$/, '') || '/';
    const supported = /^\/(market(?:\/(?:shop|listings|blends))?|exchange|guide|burn|farming|machines|collections)$/;
    return base + (aliases[path] || (supported.test(path) ? path : '/')) + search + hash;
  }
  if (typeof module !== 'undefined') module.exports = {destination};
  if (typeof window === 'undefined') return;
  const target = destination(window.location.pathname, window.location.search, window.location.hash);
  const link = document.getElementById('launch');
  if (link) link.href = target;
  // Keep the homepage notice visible; redirect only known bookmarks on the old public host.
  const route = window.location.pathname.replace(/\/+$/, '') || '/';
  if (window.location.hostname === 'waxcleanup.github.io' && route !== '/' && route !== '/index.html' && route !== '/404.html') window.location.replace(target);
})();