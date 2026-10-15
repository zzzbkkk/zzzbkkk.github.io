const store = {
  get(key) { try { return sessionStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { sessionStorage.setItem(key, value); } catch {} },
  remove(key) { try { sessionStorage.removeItem(key); } catch {} },
};

export function setupBackground() {
  let canvas = document.querySelector('.background-canvas');
  const art = document.querySelector('.page-art');
  if (!canvas || !art) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = reduced.matches;
  const motion = document.querySelector('[data-motion-toggle]');
  const composition = document.body.dataset.slug || document.body.dataset.page === 'about' ? 'reading' : document.body.dataset.page;
  const currentComposition = () => document.documentElement.hasAttribute('data-intro') ? 'intro' : composition;
  const scene = 'dragonfly';
  let visual = null, loading = false, generation = 0, pageActive = true, controller = null, lastError = null;
  let introFrame = 0;
  const states = new Map();
  try {
    const saved = JSON.parse(store.get('bk-scene-transfer') || 'null');
    if (saved?.to === location.pathname && Date.now() - saved.at < 15000 && (saved.scene || 'dragonfly') === scene) states.set(scene, saved.state);
  } catch {}
  store.remove('bk-scene-transfer');
  let userPaused = store.get('bk-background-paused') === 'true';
  const allowed = () => pageActive && !reducedMotion && !navigator.connection?.saveData;
  const updateIntro = () => {
    cancelAnimationFrame(introFrame); introFrame = 0;
    if (!visual) return;
    const showing = document.documentElement.hasAttribute('data-intro');
    const started = window.__introStartedAt;
    const progress = showing ? (typeof started === 'number' ? Math.min(1, Math.max(0, (performance.now() - started) / 1500)) : 0) : 1;
    visual.setIntroProgress(progress);
    if (progress < 1 && allowed() && !userPaused && !document.hidden) introFrame = requestAnimationFrame(updateIntro);
  };
  const updateControl = () => {
    if (!motion) return;
    motion.hidden = !allowed() || (!visual && !userPaused && !loading);
    motion.textContent = userPaused ? motion.dataset.resume : motion.dataset.pause;
    motion.dataset.paused = String(userPaused);
  };
  const release = () => {
    cancelAnimationFrame(introFrame); introFrame = 0;
    if (visual) states.set(scene, visual.exportState());
    generation++;
    controller?.abort(); controller = null;
    visual?.dispose(); visual = null; loading = false;
    art.removeAttribute('data-live');
    // Stale async loads retain only their disconnected surface after teardown.
    const replacement = document.createElement('canvas');
    replacement.className = 'background-canvas';
    replacement.setAttribute('aria-hidden', 'true');
    canvas.replaceWith(replacement); canvas = replacement;
    updateControl();
  };
  async function mountBackground() {
    if (!allowed() || userPaused || loading || visual) return;
    loading = true; lastError = null;
    const current = ++generation, surface = canvas, mountingScene = scene;
    const abort = new AbortController(); controller = abort;
    updateControl();
    try {
      const mount = (await import('/visuals/interactive-dragonfly.js')).mountInteractiveDragonfly;
      if (current !== generation || !allowed() || userPaused || !surface.isConnected) return;
      surface.addEventListener('webglcontextlost', () => { if (current === generation) art.removeAttribute('data-live'); }, { once: true });
      const mountingComposition = currentComposition();
      const instance = await mount(surface, { signal: abort.signal, composition: mountingComposition, initialState: states.get(mountingScene), introStartedAt: window.__introStartedAt });
      if (current !== generation || !allowed() || !surface.isConnected) { instance.dispose(); return; }
      // A slow model load can finish after the cover. Set the right framing
      // before exposing its first frame, without replaying the intro movement.
      if (mountingComposition !== currentComposition()) instance.setComposition(currentComposition(), true);
      visual = instance; updateIntro(); art.dataset.live = 'true';
      if (userPaused) visual.pause();
      updateControl();
      window.dispatchEvent(new Event('background:ready'));
    } catch (error) {
      if (current === generation) { art.removeAttribute('data-live'); lastError = String(error?.message || error); }
    } finally {
      // A disposed renderer must never clear a newer renderer's loading flag.
      if (current === generation) { loading = false; updateControl(); }
    }
  }
  const sync = () => {
    if (!allowed() || (userPaused && loading)) {
      if (visual || loading) release();
    } else if (visual) {
      if (userPaused) visual.pause(); else visual.resume();
      updateIntro();
    } else mountBackground();
    updateControl();
  };
  motion?.addEventListener('click', () => {
    userPaused = !userPaused; store.set('bk-background-paused', String(userPaused)); sync();
  });
  window.addEventListener('intro:start', updateIntro);
  window.addEventListener('intro:end', () => { updateIntro(); visual?.setComposition(composition); });
  document.addEventListener('visibilitychange', updateIntro);
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target || link.hasAttribute('download')) return;
    const url = new URL(link.href);
    if (url.origin !== location.origin || url.pathname === location.pathname || !/^\/(zh|en)\//.test(url.pathname)) return;
    if (visual) store.set('bk-scene-transfer', JSON.stringify({ at: Date.now(), to: url.pathname, scene, state: visual.exportState(), frame: visual.captureFrame() }));
  });
  // Keep an event-driven preference snapshot. Repeated diagnostic reads of
  // MediaQueryList.matches can consume Chromium's pending match notification.
  reduced.addEventListener('change', event => { reducedMotion = event.matches; sync(); });
  navigator.connection?.addEventListener?.('change', sync);
  window.addEventListener('pagehide', () => { pageActive = false; release(); });
  window.addEventListener('pageshow', () => {
    pageActive = true;
    reducedMotion = reduced.matches;
    userPaused = store.get('bk-background-paused') === 'true';
    sync();
  });
  window.__backgroundState = () => ({ loaded: !!visual, loading, scene, reduced: reducedMotion, userPaused, pageActive, saveData: !!navigator.connection?.saveData, lastError, ...visual?.getState?.() });
  sync();
}
