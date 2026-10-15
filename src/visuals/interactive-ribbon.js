import { createRibbonRaster, rasterizeRibbon, ribbonFraming, ribbonGlyph, ribbonGray, RIBBON_COMPOSITIONS } from './ribbon-shape.mjs';

const FRAME_INTERVAL = 1000 / 30;
const TRAIL_LIFETIME = 0.7;
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const finite = (value, minimum, maximum, fallback) => typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum ? value : fallback;

/** Procedural, locally authored ASCII paper. No model, texture or font request. */
export async function mountInteractiveRibbon(canvas, { onReady, signal, composition = 'home', initialState } = {}) {
  if (!canvas || typeof canvas.getContext !== 'function') throw new TypeError('A canvas is required.');
  if (signal?.aborted) throw signal.reason || new DOMException('Ribbon loading was aborted.', 'AbortError');
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('Canvas2D is unavailable.');
  composition = Object.hasOwn(RIBBON_COMPOSITIONS, composition) ? composition : 'home';
  const restored = initialState?.version === 1 && initialState?.source === 'procedural-ascii-ribbon' ? initialState : {};
  let elapsed = finite(restored.elapsed, 0, 604800, 0);
  let disposed = false, ready = false, running = false, manualPaused = false;
  let focused = typeof document.hasFocus === 'function' ? document.hasFocus() : true;
  let width = 1, height = 1, left = 0, top = 0, dpr = 1, frames = 0, resizeCount = 0;
  let raf = 0, resizeRaf = 0, lastTime = 0, previousFrame = 0, raster, scatterX, scatterY;
  let cellX = 7.5, cellY = 9.5, framing, framingTarget;
  let trailDraws = 0, trailClears = 0, hadTrail = false;
  const created = performance.now();
  const introStarted = document.documentElement.hasAttribute('data-intro') && !restored.source ? elapsed : null;
  const pointer = { x: 0.5, y: 0.5, seen: false, moves: 0, at: -10, velocity: 0 };
  const trails = [];
  const gray = Array.from({ length: 256 }, (_, value) => `rgb(${value} ${value} ${value})`);

  function targetFraming() {
    const inOpening = introStarted !== null && composition === 'home' && width >= 768
      && document.documentElement.hasAttribute('data-intro') && performance.now() - created < 1450;
    return inOpening ? { x: 0.5, y: 0.48, scale: 0.3 } : ribbonFraming(width, composition);
  }

  function draw(dt = 0) {
    if (disposed || !raster) return;
    rasterizeRibbon(raster, { width, height, cellX, cellY, elapsed, framing });
    context.fillStyle = '#000';
    context.fillRect(0, 0, width, height);
    context.font = `${width < 768 ? 8.5 : 9}px "NaturalMono", "Courier New", monospace`;
    context.textAlign = 'center'; context.textBaseline = 'middle';
    const reveal = introStarted === null || !document.documentElement.hasAttribute('data-intro')
      ? 1 : clamp((performance.now() - created) / 1350, 0, 1);
    const assembly = (1 - reveal) ** 3;
    const pointerAge = elapsed - pointer.at;
    const energy = pointer.seen && pointerAge < 1.5 ? Math.exp(-pointerAge * 4) : 0;
    const radius = width < 768 ? 65 : 94;
    const blend = dt ? 1 - Math.exp(-dt * 12) : 1;
    const { columns, light, edge } = raster;
    for (let index = 0; index < light.length; index++) {
      const value = light[index];
      if (!value) { scatterX[index] *= 0.85; scatterY[index] *= 0.85; continue; }
      const x = (index % columns + 0.5) * cellX;
      const y = (Math.floor(index / columns) + 0.5) * cellY;
      const dx = x - pointer.x * width, dy = y - pointer.y * height;
      const distance = Math.hypot(dx, dy);
      const force = energy * Math.max(0, 1 - distance / radius) ** 2 * 19;
      const angle = index * 2.399963;
      const targetX = force * (dx / (distance || 1) * 0.6 + Math.cos(angle) * 0.4);
      const targetY = force * (dy / (distance || 1) * 0.6 + Math.sin(angle) * 0.4);
      scatterX[index] += (targetX - scatterX[index]) * blend;
      scatterY[index] += (targetY - scatterY[index]) * blend;
      const gather = assembly * (22 + index % 31);
      context.fillStyle = gray[ribbonGray(value, edge[index])];
      context.globalAlpha = 0.42 + reveal * 0.58;
      context.fillText(ribbonGlyph(value, index, edge[index]),
        x + scatterX[index] + Math.cos(angle) * gather,
        y + scatterY[index] + Math.sin(angle) * gather);
    }
    let active = 0;
    context.fillStyle = '#FA4C14';
    for (let index = trails.length - 1; index >= 0; index--) {
      const sample = trails[index];
      const age = elapsed - sample.at;
      if (age > TRAIL_LIFETIME) { trails.splice(index, 1); continue; }
      active++;
      const life = 1 - age / TRAIL_LIFETIME;
      const x = (Math.floor(sample.x * width / cellX) + 0.5) * cellX;
      const y = (Math.floor(sample.y * height / cellY) + 0.5) * cellY;
      context.globalAlpha = life * life * 0.95;
      context.fillText(index % 3 ? '+' : '*', x, y);
      if (sample.strength > 0.3) {
        context.globalAlpha *= 0.55;
        context.fillText(index % 2 ? ':' : '.', x + (index % 2 ? cellX : -cellX), y + cellY);
      }
    }
    if (active) trailDraws++;
    else if (hadTrail) trailClears++;
    hadTrail = active > 0;
    context.globalAlpha = 1;
    frames++;
  }

  function resize() {
    resizeRaf = 0;
    if (disposed) return;
    const bounds = canvas.getBoundingClientRect();
    const nextWidth = Math.max(1, Math.round(bounds.width));
    const nextHeight = Math.max(1, Math.round(bounds.height));
    const nextDpr = Math.min(window.devicePixelRatio || 1, 1.5);
    left = bounds.left; top = bounds.top;
    if (nextWidth === width && nextHeight === height && nextDpr === dpr && raster) return;
    width = nextWidth; height = nextHeight; dpr = nextDpr;
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    cellX = width < 768 ? 7 : 7.5; cellY = width < 768 ? 9 : 9.5;
    // Cap the sample grid on very large screens; glyphs scale with the grid.
    const budget = Math.sqrt(width * height / (cellX * cellY * 34000));
    if (budget > 1) { cellX *= budget; cellY *= budget; }
    raster = createRibbonRaster(Math.ceil(width / cellX), Math.ceil(height / cellY));
    scatterX = new Float32Array(raster.light.length); scatterY = new Float32Array(raster.light.length);
    framingTarget = targetFraming();
    framing = framing || {
      x: finite(restored.framing?.x, 0.2, 1.1, framingTarget.x),
      y: finite(restored.framing?.y, 0.4, 0.8, framingTarget.y),
      scale: finite(restored.framing?.scale, 0.25, 0.55, framingTarget.scale),
    };
    if (manualPaused && framing) framing = { ...framingTarget };
    resizeCount++;
    draw();
  }

  function scheduleResize() { if (!disposed && !resizeRaf) resizeRaf = requestAnimationFrame(resize); }
  function tick(now) {
    if (!running || disposed) return;
    raf = requestAnimationFrame(tick);
    if (now - previousFrame < FRAME_INTERVAL - 0.5) return;
    const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.08) : 0;
    previousFrame = now; lastTime = now; elapsed += dt;
    if (introStarted !== null) framingTarget = targetFraming();
    const settle = 1 - Math.exp(-dt * 2.7);
    for (const key of ['x', 'y', 'scale']) framing[key] += (framingTarget[key] - framing[key]) * settle;
    draw(dt);
  }
  function syncRunning() {
    const next = ready && !disposed && !manualPaused && !document.hidden && focused;
    if (next === running) return;
    running = next;
    cancelAnimationFrame(raf); raf = 0; lastTime = 0; previousFrame = 0;
    if (running) raf = requestAnimationFrame(tick);
  }
  function pause() { manualPaused = true; syncRunning(); }
  function resume() { manualPaused = false; syncRunning(); }
  function onFocus() { focused = true; syncRunning(); }
  function onBlur() { focused = false; syncRunning(); }
  function onPointer(event) {
    if (disposed || !running || event.pointerType === 'touch') return;
    const x = clamp((event.clientX - left) / width, 0, 1);
    const y = clamp((event.clientY - top) / height, 0, 1);
    const distance = pointer.seen ? Math.hypot((x - pointer.x) * width, (y - pointer.y) * height) : 0;
    if (pointer.seen && distance < 1.5) return;
    const oldX = pointer.x, oldY = pointer.y;
    const samples = pointer.seen ? Math.min(7, Math.max(1, Math.ceil(distance / 10))) : 1;
    pointer.x = x; pointer.y = y; pointer.at = elapsed; pointer.seen = true; pointer.moves++;
    pointer.velocity = Math.min(distance, 70);
    for (let n = 1; n <= samples; n++) {
      const portion = n / samples;
      trails.push({ x: samples === 1 ? x : oldX + (x - oldX) * portion,
        y: samples === 1 ? y : oldY + (y - oldY) * portion, at: elapsed, strength: Math.min(1, distance / 35) });
    }
    if (trails.length > 52) trails.splice(0, trails.length - 52);
  }
  function dispose() {
    if (disposed) return;
    disposed = true; running = false;
    cancelAnimationFrame(raf); cancelAnimationFrame(resizeRaf);
    observer?.disconnect();
    window.removeEventListener('resize', scheduleResize);
    window.removeEventListener('pointermove', onPointer);
    window.removeEventListener('focus', onFocus); window.removeEventListener('blur', onBlur);
    document.removeEventListener('visibilitychange', syncRunning);
    signal?.removeEventListener('abort', dispose);
    trails.length = 0; raster = null; scatterX = null; scatterY = null;
  }
  function getState() {
    const active = trails.filter(sample => elapsed - sample.at < TRAIL_LIFETIME).length;
    return { ready, disposed, running, paused: manualPaused, hidden: document.hidden, focused,
      source: 'procedural-ascii-ribbon', composition, framing: { ...framing }, frames,
      elapsed: Number(elapsed.toFixed(3)), fpsLimit: 30, resizeCount, width, height,
      pointer: { x: pointer.x, y: pointer.y, seen: pointer.seen, moves: pointer.moves },
      trail: { active, samples: 52, velocity: pointer.velocity }, trails: active, trailActive: active,
      trailDraws, trailClears, renderer: { type: 'Canvas2D', width, height, pixelRatio: dpr, cells: raster?.light.length || 0 } };
  }
  function exportState() {
    return { version: 1, source: 'procedural-ascii-ribbon', elapsed: elapsed % 604800,
      framing: { ...framing } };
  }
  function captureFrame() {
    if (!ready || disposed) return null;
    try { draw(); return canvas.toDataURL('image/webp', 0.7); } catch { return null; }
  }

  let observer;
  try {
    signal?.addEventListener('abort', dispose, { once: true });
    canvas.setAttribute('aria-hidden', 'true');
    resize(); ready = true;
    window.addEventListener('resize', scheduleResize, { passive: true });
    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('focus', onFocus); window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', syncRunning);
    if (typeof ResizeObserver === 'function') { observer = new ResizeObserver(scheduleResize); observer.observe(canvas); }
    syncRunning();
    canvas.dataset.ribbonReady = 'true';
    canvas.dataset.ribbonLoadMs = String(Math.round(performance.now() - created));
    const controller = { pause, resume, dispose, getState, exportState, captureFrame };
    onReady?.(controller);
    return controller;
  } catch (error) { dispose(); throw error; }
}
