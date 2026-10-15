/* Retire the comparison without allowing old ribbon links/preferences to win. */
(() => {
  document.documentElement.dataset.scene = 'dragonfly';
  try {
    sessionStorage.setItem('bk-background-shape', 'dragonfly');
    const saved = JSON.parse(sessionStorage.getItem('bk-scene-transfer') || 'null');
    if (saved?.scene && saved.scene !== 'dragonfly') sessionStorage.removeItem('bk-scene-transfer');
  } catch {}
  const url = new URL(location.href);
  if (url.searchParams.has('scene')) {
    url.searchParams.delete('scene');
    try { history.replaceState(history.state, '', url); } catch {}
  }
})();
